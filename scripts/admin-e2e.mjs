// End-to-end browser test of the verification console, run against SMOKE_BASE
// or localhost.
//
//   npm run build && npm start
//   ADMIN_USERNAME=admin ADMIN_PASSWORD='...' node scripts/admin-e2e.mjs
//
// Exercises the things that are only true if the whole stack is wired up: the
// separate sign-in, the forced password rotation, the super-admin boundary,
// immediate revocation of a live session, and the audit trail outliving a
// deleted account. Credentials come from the environment — nothing is
// hardcoded here.
//
// The test creates and then deletes a throwaway administrator (WF-ADM-E2E). It
// refuses to run against anything that is not obviously a local database, for
// the same reason the seed does.

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.SMOKE_BASE || "http://localhost:3000";
const USERNAME = process.env.ADMIN_USERNAME;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.error(
    "\n  ✖ Set ADMIN_USERNAME and ADMIN_PASSWORD to a SUPER_ADMIN account" +
      "\n    (`npm run admin:create` prints them).\n",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

if (
  !/@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(process.env.DATABASE_URL ?? "") &&
  process.env.ALLOW_DESTRUCTIVE_SEED !== "1"
) {
  console.error(
    "\n  ✖ Refusing to run: this creates and deletes an admin account and does" +
      "\n    not look like a local database. Set ALLOW_DESTRUCTIVE_SEED=1 to override.\n",
  );
  process.exit(1);
}

// Distinctive enough that it cannot collide with a real staff member.
const TEMP = {
  code: "WF-ADM-E2E",
  username: "e2e.verifier",
  email: "e2e.verifier@example.invalid",
  name: "E2E Verifier",
  issued: "IssuedByAdmin2026",
  chosen: "ChosenByThem2026",
};

let pass = 0;
let fail = 0;
function check(label, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !extra ? "" : ` — ${extra}`}`);
  if (ok) pass++;
  else fail++;
}

/** Server actions are a form POST plus a re-render; give both a moment. */
const settle = (page, ms = 2000) => page.waitForTimeout(ms);

/**
 * Waits for a condition rather than for a duration.
 *
 * A server action is a POST, a revalidate and a re-render, and how long that
 * takes depends on the machine. Sleeping a fixed 2.5s and then asserting is how
 * a suite acquires flakes that look like real failures — this polls instead.
 */
// 20s, not 10: against `next dev` the first hit on a route compiles it, and a
// cold /admin/team or /admin/account/password can take most of ten seconds on
// its own. A run against a production build never comes close to this.
async function eventually(fn, { timeout = 20000, interval = 250 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await fn()) return true;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, interval));
  }
}

async function signIn(page, identifier, password) {
  await page.goto(`${BASE}/admin/login`);
  await page.fill("#identifier", identifier);
  await page.fill("#password", password);
  await page.click("button[type=submit]");

  // Wait for the outcome, not for a fixed interval. This used to sleep 2.5s and
  // then read the URL, which is long enough on a warm server and not long
  // enough when `next dev` is compiling the console for the first time — a
  // slow redirect was being reported as a failed sign-in. The sign-ins that are
  // *meant* to fail stay on /admin/login and simply spend the timeout.
  await page
    .waitForURL((url) => !url.pathname.startsWith("/admin/login"), { timeout: 10000 })
    .catch(() => {});
  await settle(page, 400);
}

// Leftovers from an interrupted run would make the create step fail on a
// unique index rather than on anything meaningful.
await prisma.adminUser.deleteMany({
  where: { OR: [{ adminCode: TEMP.code }, { username: TEMP.username }, { email: TEMP.email }] },
});

// This suite signs in half a dozen times from one address, including on purpose
// with a wrong password. Left alone, a second run inside the same window would
// fail against the sign-in throttle rather than against anything under test.
// Clearing only the admin-login counters keeps the throttle itself honest —
// every other limiter is untouched, and the throttle is exercised directly by
// the smoke suite instead.
await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "admin-login:" } } });

const browser = await chromium.launch();
const superCtx = await browser.newContext();
const superPage = await superCtx.newPage();

try {
  // --- Sign-in ------------------------------------------------------------
  await superPage.goto(`${BASE}/admin`);
  check("unauthenticated request is sent to the login page", superPage.url().includes("/admin/login"));

  await signIn(superPage, USERNAME, "definitely-not-the-password");
  check("wrong password is rejected", superPage.url().includes("/admin/login"));
  const errorText = await superPage.textContent("[role=alert]").catch(() => "");
  check(
    "failure message does not say which half was wrong",
    (errorText ?? "").includes("not accepted"),
    errorText ?? "no alert rendered",
  );

  await signIn(superPage, USERNAME, PASSWORD);
  check("super admin signs in", superPage.url().replace(/\?.*$/, "") === `${BASE}/admin`, superPage.url());

  const cookies = await superCtx.cookies();
  const adminCookie = cookies.find((c) => c.name === "wf_admin");
  check("admin session cookie is set", Boolean(adminCookie));
  check("admin cookie is httpOnly", adminCookie?.httpOnly === true);
  check("admin cookie is SameSite=Strict", adminCookie?.sameSite === "Strict", adminCookie?.sameSite);
  check(
    "signing in here does not mint a marketplace session",
    !cookies.some((c) => c.name === "wf_session"),
  );

  // --- Issue an administrator ---------------------------------------------
  await superPage.goto(`${BASE}/admin/team`);
  check("team page is reachable by a super admin", (await superPage.textContent("body")).includes("Admin team"));

  await superPage.fill("#adminCode", TEMP.code);
  await superPage.fill("#username", TEMP.username);
  await superPage.fill("#name", TEMP.name);
  await superPage.fill("#email", TEMP.email);
  await superPage.selectOption("#role", "VERIFIER");
  await superPage.fill("#password", TEMP.issued);
  await superPage.fill("#confirmPassword", TEMP.issued);
  await superPage.click('button:has-text("Create administrator")');

  const created = await eventually(async () =>
    (await superPage.textContent("body")).includes(`can now sign in as ${TEMP.username}`),
  );
  const teamBody = await superPage.textContent("body");
  check("verifier is created", created, teamBody.match(/Please fix[^<]*/)?.[0] ?? "");
  check("verifier appears in the team list", teamBody.includes(TEMP.code));

  // A duplicate must be refused by the unique index, not by a pre-check.
  await superPage.fill("#adminCode", "WF-ADM-E2E-DUP");
  await superPage.fill("#username", TEMP.username);
  await superPage.fill("#name", "Somebody Else");
  await superPage.fill("#email", "dup@example.invalid");
  await superPage.fill("#password", "SomeOtherPass2026");
  await superPage.fill("#confirmPassword", "SomeOtherPass2026");
  await superPage.click('button:has-text("Create administrator")');
  check(
    "a duplicate username is refused",
    await eventually(async () => (await superPage.textContent("body")).includes("already taken")),
  );

  // --- The new verifier ----------------------------------------------------
  const verifierCtx = await browser.newContext();
  const verifierPage = await verifierCtx.newPage();

  await signIn(verifierPage, TEMP.username, TEMP.issued);
  check(
    "a newly issued admin must rotate the password first",
    verifierPage.url().includes("/admin/account/password"),
    verifierPage.url(),
  );

  await verifierPage.goto(`${BASE}/admin/team`);
  await settle(verifierPage, 800);
  check(
    "no other page is reachable until they do",
    verifierPage.url().includes("/admin/account/password"),
    verifierPage.url(),
  );

  await verifierPage.fill("#currentPassword", TEMP.issued);
  await verifierPage.fill("#password", TEMP.chosen);
  await verifierPage.fill("#confirmPassword", TEMP.chosen);
  await verifierPage.click('button:has-text("Change password")');
  await settle(verifierPage, 2500);
  check("the password change succeeds", verifierPage.url().includes("/admin"), verifierPage.url());

  // --- The super-admin boundary -------------------------------------------
  await verifierPage.goto(`${BASE}/admin/team`);
  await settle(verifierPage, 800);
  check(
    "a verifier cannot reach the team page",
    verifierPage.url().includes("denied=team"),
    verifierPage.url(),
  );
  check(
    "and is told why",
    (await verifierPage.textContent("body")).includes("restricted to super admins"),
  );

  await verifierPage.goto(`${BASE}/admin/settings`);
  await settle(verifierPage, 800);
  check(
    "a verifier cannot reach platform settings",
    verifierPage.url().includes("denied=team"),
    verifierPage.url(),
  );

  await verifierPage.goto(`${BASE}/admin/contractors`);
  await settle(verifierPage, 800);
  check(
    "a verifier can do verification work",
    (await verifierPage.textContent("body")).includes("Contractors"),
  );

  // --- Revocation ----------------------------------------------------------
  await superPage.goto(`${BASE}/admin/team`);
  await superPage.click(`tr:has-text("${TEMP.code}") button:has-text("Revoke access")`);
  check(
    "access is revoked",
    await eventually(() =>
      superPage.locator(`tr:has-text("${TEMP.code}") button:has-text("Restore access")`).count().then((n) => n > 0),
    ),
  );

  await verifierPage.goto(`${BASE}/admin/contractors`);
  check(
    "the revoked admin's live session dies on the next request",
    await eventually(() => verifierPage.url().includes("/admin/login")),
    verifierPage.url(),
  );

  await signIn(verifierPage, TEMP.username, TEMP.chosen);
  check(
    "and they cannot sign back in",
    verifierPage.url().includes("/admin/login"),
    verifierPage.url(),
  );

  // --- Deletion ------------------------------------------------------------
  await superPage.goto(`${BASE}/admin/team`);
  await superPage.click(`tr:has-text("${TEMP.code}") button:has-text("Delete permanently")`);
  check(
    "a revoked admin can be deleted",
    await eventually(() => superPage.locator(`tr:has-text("${TEMP.code}")`).count().then((n) => n === 0)),
  );

  // --- The audit trail -----------------------------------------------------
  await superPage.goto(`${BASE}/admin/audit`);
  await settle(superPage, 1000);
  const audit = await superPage.textContent("body");
  check("sign-ins are recorded", audit.includes("ADMIN_LOGIN"));
  check("failed sign-ins are recorded", audit.includes("ADMIN_LOGIN_FAILED"));
  check("entries name the administrator", audit.includes("ADMIN_CREATE"));
  check(
    "the trail outlives the deleted account",
    audit.includes("ADMIN_DELETE") && audit.includes(TEMP.name),
  );

  // --- Sign out -------------------------------------------------------------
  await superPage.goto(`${BASE}/admin`);
  await superPage.click('button:has-text("Sign out")');
  await settle(superPage, 1500);
  check("sign out returns to the login page", superPage.url().includes("/admin/login"));
  await superPage.goto(`${BASE}/admin`);
  await settle(superPage, 800);
  check("the session is dead afterwards", superPage.url().includes("/admin/login"), superPage.url());
} finally {
  await browser.close();
  await prisma.adminUser.deleteMany({
    where: { OR: [{ adminCode: TEMP.code }, { username: TEMP.username }, { email: TEMP.email }] },
  });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
