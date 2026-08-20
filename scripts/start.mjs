// One command to get WorkForge running: `npm start` (or `npm run go`).
//
//   npm run go            dev server, hot reload — the quick way to look at it
//   npm run go -- --prod  production build, then serve it
//   npm run go -- --seed  reseed the database first (destroys existing rows)
//   npm run go -- --no-open   don't launch a browser
//
// Everything is idempotent and safe to re-run. Each step is skipped when it is
// already true, so the second run is much faster than the first.
//
// This exists because starting the app by hand means remembering four separate
// things, every one of which has bitten us: Docker Desktop stops on its own, the
// container needs starting after it, Postgres accepts TCP a second before it can
// answer queries, and a stray `next` process holds both port 3000 and the Prisma
// query-engine DLL — which makes `prisma generate` fail with EPERM on Windows.

import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CONTAINER = "wf-pg";
const IMAGE = "postgres:16";
const PORT = 3000;
const DB_PORT = 5432;

const args = process.argv.slice(2);
const PROD = args.includes("--prod");
const SEED = args.includes("--seed");
const OPEN = !args.includes("--no-open");

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });
const quiet = (cmd) => {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};

/** Frees port 3000, killing the whole tree behind whatever holds it. */
function freePort() {
  if (process.platform === "win32") {
    const pids = quiet(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue).OwningProcess"`,
    )
      .split(/\s+/)
      .filter(Boolean);
    for (const pid of new Set(pids)) quiet(`taskkill /PID ${pid} /T /F`);
    return [...new Set(pids)];
  }
  const pids = quiet(`lsof -ti tcp:${PORT}`).split("\n").filter(Boolean);
  for (const pid of pids) quiet(`kill -9 ${pid}`);
  return pids;
}

// --- `npm run stop` ---------------------------------------------------------
// Shuts down cleanly without hunting for process ids by hand. Runs before any
// of the startup steps, so it never waits on Docker just to stop things.
if (args.includes("--stop")) {
  const killed = freePort();
  console.log(killed.length ? `  ✓ stopped the server (PID ${killed.join(", ")})` : "  ✓ server was not running");
  if (quiet("docker info")) {
    quiet(`docker stop ${CONTAINER}`);
    console.log(`  ✓ stopped ${CONTAINER}`);
  } else {
    console.log("  ✓ docker engine already down");
  }
  console.log("\n  Start again with: npm run go\n");
  process.exit(0);
}

let step = 0;
const say = (m) => console.log(`\n[${++step}] ${m}`);
const ok = (m) => console.log(`    ✓ ${m}`);
const die = (m) => {
  console.error(`\n    ✖ ${m}\n`);
  process.exit(1);
};

// --- 1. Docker engine -------------------------------------------------------
say("Docker");
if (!quiet("docker --version")) {
  die("Docker is not installed. Install Docker Desktop and run this again.");
}

if (!quiet("docker info")) {
  console.log("    engine is down, starting Docker Desktop…");
  if (process.platform === "win32") {
    const candidates = [
      `${process.env.ProgramFiles}\\Docker\\Docker\\Docker Desktop.exe`,
      `${process.env.LOCALAPPDATA}\\Docker\\Docker Desktop.exe`,
    ];
    const exe = candidates.find((p) => existsSync(p));
    if (!exe) die("Could not find Docker Desktop. Start it yourself, then re-run.");
    spawn(exe, { detached: true, stdio: "ignore" }).unref();
  } else {
    quiet("open -a Docker");
  }

  // The engine takes a while on a cold boot; two minutes is generous but this
  // is the difference between "it worked" and a wall of confusing errors.
  let up = false;
  for (let i = 0; i < 60; i++) {
    if (quiet("docker info")) {
      up = true;
      break;
    }
    process.stdout.write(".");
    sleep(2000);
  }
  console.log("");
  if (!up) die("Docker did not come up in two minutes. Start it manually, then re-run.");
}
ok("engine running");

// --- 2. Postgres container --------------------------------------------------
say("Database");
const state = quiet(`docker inspect -f "{{.State.Running}}" ${CONTAINER}`);
if (state === "true") {
  ok(`${CONTAINER} already running`);
} else if (state === "false") {
  run(`docker start ${CONTAINER}`, { stdio: "ignore" });
  ok(`${CONTAINER} started`);
} else {
  console.log(`    creating ${CONTAINER}…`);
  run(
    `docker run -d --name ${CONTAINER} --restart unless-stopped ` +
      `-e POSTGRES_PASSWORD=workforge -e POSTGRES_DB=workforge ` +
      `-p ${DB_PORT}:${DB_PORT} ${IMAGE}`,
    { stdio: "ignore" },
  );
  ok("container created");
}

// Accepting TCP is not the same as being ready to answer a query, and
// `migrate deploy` will fail against the gap.
let ready = false;
for (let i = 0; i < 45; i++) {
  if (quiet(`docker exec ${CONTAINER} pg_isready -U postgres`).includes("accepting")) {
    ready = true;
    break;
  }
  process.stdout.write(".");
  sleep(1000);
}
if (!ready) die(`Postgres never became ready. Check: docker logs ${CONTAINER}`);
ok("postgres accepting connections");

// --- 3. Free the port -------------------------------------------------------
// A leftover `next` process holds both port 3000 and the Prisma engine DLL. Only
// the listener is killed — never every node process, which would take this
// script (and anything else you have running) with it.
say("Port");
const freed = freePort();
ok(freed.length ? `freed port ${PORT} (was PID ${freed.join(", ")})` : `port ${PORT} free`);

// Windows releases the handle a beat after the process dies.
sleep(1200);

// --- 4. Schema --------------------------------------------------------------
say("Schema");
try {
  const out = execSync("npx prisma migrate deploy", { stdio: ["ignore", "pipe", "pipe"] }).toString();
  ok(/No pending migrations/i.test(out) ? "already up to date" : "migrations applied");
} catch (err) {
  console.error(err.stdout?.toString() ?? "");
  die("Migrations failed. Fix the error above, then re-run.");
}

// `prisma generate` only needs to run when the schema is newer than the client
// it produced. Skipping it saves several seconds and avoids the EPERM race
// entirely on an unchanged schema.
const clientStamp = "node_modules/.prisma/client/index.js";
const schemaNewer =
  !existsSync(clientStamp) ||
  statSync("prisma/schema.prisma").mtimeMs > statSync(clientStamp).mtimeMs;
if (schemaNewer) {
  run("npx prisma generate", { stdio: ["ignore", "ignore", "inherit"] });
  ok("prisma client regenerated");
} else {
  ok("prisma client current");
}

if (SEED) {
  console.log("    seeding (this wipes existing rows)…");
  run("npx tsx prisma/seed.ts", {
    env: { ...process.env, SEED_DEMO_PASSWORD: "demo12345", SEED_ADMIN_PASSWORD: "admin12345" },
  });
}

// --- 5. Serve ---------------------------------------------------------------
say(PROD ? "Build & serve" : "Dev server");

if (PROD) {
  // Only rebuild when something that ends up in the bundle actually changed.
  const stamp = ".next/BUILD_ID";
  let newest = 0;
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else newest = Math.max(newest, statSync(full).mtimeMs);
    }
  };
  for (const dir of ["app", "components", "lib", "public"]) walk(dir);
  for (const f of ["package.json", "next.config.mjs", "tailwind.config.ts", "prisma/schema.prisma"]) {
    if (existsSync(f)) newest = Math.max(newest, statSync(f).mtimeMs);
  }

  if (!existsSync(stamp) || newest > statSync(stamp).mtimeMs) {
    run("npx next build");
  } else {
    ok("build is current, skipping");
  }
}

// Run Next's own entry script under this same Node binary, rather than going
// through `npx`.
//
// Going through npx needs `shell: true` on Windows (Node 20 refuses to spawn a
// .cmd shim directly — CVE-2024-27980), and that shell is the whole problem:
// cmd.exe becomes the child and the server becomes a *grandchild*. Ctrl-C then
// reaches the shell, the shell exits, and the server survives holding port 3000.
// Spawning the script directly puts the server in this console's own process
// group, so Ctrl-C reaches it the way the user expects.
const NEXT_BIN = join("node_modules", "next", "dist", "bin", "next");
if (!existsSync(NEXT_BIN)) die("Next is not installed. Run `npm install` first.");

const child = spawn(process.execPath, [NEXT_BIN, PROD ? "start" : "dev"], {
  stdio: "inherit",
  env: process.env,
});

/**
 * Tears down the whole child tree, not just the child.
 *
 * On Windows `shell: true` means the direct child is cmd.exe and the Next server
 * is its *grandchild*. Ctrl-C reaches the shell, the shell exits, and the server
 * keeps the port — which is exactly the orphan this script exists to clean up at
 * the next start. `taskkill /T` walks the tree; POSIX gets a process-group kill
 * via the negative pid.
 *
 * Guarded so a second Ctrl-C, or the exit handler firing after a signal, cannot
 * run it twice.
 */
let stopping = false;
function stopChild() {
  if (stopping || child.exitCode !== null || child.killed) return;
  stopping = true;
  try {
    if (process.platform === "win32") {
      // /T covers anything Next itself forked (it spawns render workers).
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  } catch {
    // Already gone, or never started. Either way there is nothing to stop.
  }
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(signal, () => {
    console.log("\n  stopping…");
    stopChild();
    process.exit(0);
  });
}
// Covers the paths a signal handler misses: an uncaught throw, or the wait loop
// below finishing and the script falling off the end.
process.on("exit", stopChild);

child.on("exit", (code) => {
  stopping = true; // it is already down; don't taskkill a recycled pid
  process.exit(code ?? 0);
});

// --- 6. Wait, then report ---------------------------------------------------
// Native fetch rather than shelling out to curl: curl is not guaranteed to be
// on PATH on Windows, and a blocking sleep between synchronous child processes
// starves the very server we are waiting for.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let live = false;
for (let i = 0; i < 120; i++) {
  try {
    const res = await fetch(`http://localhost:${PORT}/`, {
      signal: AbortSignal.timeout(4000),
      redirect: "manual",
    });
    if (res.status < 500) {
      live = true;
      break;
    }
  } catch {
    /* not listening yet */
  }
  await wait(1000);
}

const base = `http://localhost:${PORT}`;
const google = /^GOOGLE_CLIENT_ID=".+"/m.test(
  existsSync(".env") ? readFileSync(".env", "utf8") : "",
);

console.log(`
──────────────────────────────────────────────────────────
 WorkForge is ${live ? "running" : "starting (taking longer than usual)"}   ${PROD ? "[production]" : "[dev — hot reload]"}

   App            ${base}
   Admin console  ${base}/admin/login

   Company        rajesh@meridiantyres.in     demo12345
   Contractor     vikram@navyaindustrial.in   demo12345
   Admin          admin                       AdminDemo12345

   Google sign-in ${google ? "configured" : "not configured (button hidden)"}

 Stop with Ctrl-C. The database keeps running in Docker.
──────────────────────────────────────────────────────────
`);

if (OPEN && live) {
  const cmd =
    process.platform === "win32" ? `start "" "${base}"` : process.platform === "darwin" ? `open ${base}` : `xdg-open ${base}`;
  quiet(cmd);
}
