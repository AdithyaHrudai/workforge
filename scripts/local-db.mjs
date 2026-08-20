// One-shot switch to a local Postgres in Docker.
//
// The hosted database sits in Singapore, roughly 450ms per round trip, which
// makes every page that touches it feel broken during a demo. This points the
// app at a container on localhost instead — sub-millisecond queries — and seeds
// it with passwords you actually know, which is the other thing that blocks
// signing in.
//
//   npm run db:local                      # default passwords, printed at the end
//   npm run db:local -- mypass adminpass  # choose your own
//   npm run db:local -- --restore         # switch back to the hosted database
//
// Your original .env is copied to .env.hosted.bak on the first run and is never
// overwritten after that, so restoring always finds the real thing.

import { execSync } from "node:child_process";
import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";

/** Blocking sleep — this script is strictly sequential, so async buys nothing. */
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const CONTAINER = "wf-pg";
const IMAGE = "postgres:16";
const PORT = 5432;
const DB = "workforge";
const PASS = "workforge";
const URL = `postgresql://postgres:${PASS}@localhost:${PORT}/${DB}`;
const BACKUP = ".env.hosted.bak";

const args = process.argv.slice(2);
const restore = args.includes("--restore");
const [demoPass = "demo12345", adminPass = "admin12345"] = args.filter((a) => !a.startsWith("--"));

const say = (m) => console.log(m);
const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });
const quiet = (cmd) => {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};

/** Rewrites just the two connection URLs, leaving every other line untouched. */
function setEnvUrls(url) {
  let env = readFileSync(".env", "utf8");
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const line = `${key}="${url}"`;
    env = new RegExp(`^${key}=.*$`, "m").test(env)
      ? env.replace(new RegExp(`^${key}=.*$`, "m"), line)
      : `${line}\n${env}`;
  }
  writeFileSync(".env", env, "utf8");
}

if (!existsSync(".env")) {
  console.error("No .env found. Copy .env.example to .env first.");
  process.exit(1);
}

// --- restore ---------------------------------------------------------------
if (restore) {
  if (!existsSync(BACKUP)) {
    console.error(`No ${BACKUP} found — nothing to restore.`);
    process.exit(1);
  }
  copyFileSync(BACKUP, ".env");
  say(`Restored .env from ${BACKUP}. Restart the server to pick it up.`);
  process.exit(0);
}

// --- docker ----------------------------------------------------------------
// `docker --version` only proves the CLI is installed; `docker info` is what
// proves the daemon is actually reachable. Checking the former gives a stack
// trace forty lines later instead of a useful message here.
if (!quiet("docker --version")) {
  console.error("Docker is not installed. Install Docker Desktop, or keep using the hosted database.");
  process.exit(1);
}
if (!quiet("docker info")) {
  console.error(
    "Docker is installed but the engine is not running.\n" +
      "Start Docker Desktop, wait for the whale icon to stop animating, then run this again.",
  );
  process.exit(1);
}

const state = quiet(`docker inspect -f "{{.State.Running}}" ${CONTAINER}`);
if (state === "true") {
  say(`✓ ${CONTAINER} already running`);
} else if (state === "false") {
  say(`Starting existing ${CONTAINER}…`);
  run(`docker start ${CONTAINER}`);
} else {
  say(`Creating ${CONTAINER} (${IMAGE})…`);
  // `--restart unless-stopped` matters more than it looks: Docker Desktop on
  // Windows stops and restarts fairly often, and without a restart policy the
  // database silently disappears mid-session and every page 500s.
  run(
    `docker run -d --name ${CONTAINER} --restart unless-stopped ` +
      `-e POSTGRES_PASSWORD=${PASS} -e POSTGRES_DB=${DB} -p ${PORT}:${PORT} ${IMAGE}`,
  );
}

// Applies to containers created before the policy existed, too.
quiet(`docker update --restart unless-stopped ${CONTAINER}`);

// Postgres accepts TCP before it is ready to answer queries, so wait on
// pg_isready rather than on the container being "up".
process.stdout.write("Waiting for Postgres");
let ready = false;
for (let i = 0; i < 40; i++) {
  if (quiet(`docker exec ${CONTAINER} pg_isready -U postgres`).includes("accepting connections")) {
    ready = true;
    break;
  }
  process.stdout.write(".");
  sleep(500);
}
say(ready ? " ready" : " timed out");
if (!ready) {
  console.error(`Postgres did not come up. Check: docker logs ${CONTAINER}`);
  process.exit(1);
}

// --- env -------------------------------------------------------------------
if (!existsSync(BACKUP)) {
  copyFileSync(".env", BACKUP);
  say(`✓ Saved your hosted config to ${BACKUP}`);
}
setEnvUrls(URL);
say("✓ .env now points at localhost");

// --- schema + data ---------------------------------------------------------
say("\nApplying migrations…");
run("npx prisma migrate deploy");

say("\nSeeding demo data…");
run("npx tsx prisma/seed.ts", {
  env: { ...process.env, SEED_DEMO_PASSWORD: demoPass, SEED_ADMIN_PASSWORD: adminPass },
});

say(`
──────────────────────────────────────────────
 Local database ready.

   Admin password       ${adminPass}
   Company / contractor ${demoPass}

 The seed printed each account's email above.

 Next:  npm run start        (restart to pick up .env)
 Back:  npm run db:local -- --restore
──────────────────────────────────────────────`);
