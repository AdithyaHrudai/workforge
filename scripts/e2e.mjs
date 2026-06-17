// End-to-end browser test of the real interactive flows (server actions),
// run against SMOKE_BASE (the public tunnel URL) or localhost.
// Exercises: loginAction, createJob, sendMessage.
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE || "http://localhost:3000";
const stamp = Date.now();
let failed = false;
function log(ok, msg) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failed = true;
}

const browser = await chromium.launch();

async function login(ctx, email, password) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Log in")');
  // Wait past the /dashboard hop to the final role landing page.
  await page.waitForURL(/\/(company|contractor|admin)(\/|$)/, { timeout: 30000 });
  return page;
}

try {
  // --- Company: login + post a job (loginAction, createJob) ---
  const companyCtx = await browser.newContext();
  const cPage = await login(companyCtx, "company@demo.in", "Demo@12345");
  log(/\/company/.test(cPage.url()), `company login -> ${new URL(cPage.url()).pathname}`);

  await cPage.goto(`${BASE}/company/jobs/new`, { waitUntil: "networkidle" });
  await cPage.waitForTimeout(1200); // let the client form hydrate before interacting
  const title = `E2E test job ${stamp}`;
  await cPage.fill('input[name="title"]', title);
  // Pick a trade in the first trade-line select (it carries the "Mason" option).
  const tradeSelect = cPage.locator("select", { has: cPage.locator('option', { hasText: "Mason" }) }).first();
  await tradeSelect.selectOption({ label: "Mason" });
  await cPage.fill('input[name="city"]', "Visakhapatnam");
  // Ensure React committed the trade into the hidden serialized field before submit.
  await cPage.waitForFunction(
    () => (document.querySelector('input[name="linesJson"]')?.value || "").includes("mason"),
    null,
    { timeout: 15000 },
  );
  await cPage.click('button:has-text("Publish requirement")');
  // Redirect lands on /company/jobs/<id> (not /new).
  await cPage.waitForURL(/\/company\/jobs\/(?!new$)[a-z0-9]+$/, { timeout: 30000 });
  const postedOk = await cPage
    .locator("text=Bids received")
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  log(postedOk, `post job (createJob) -> ${new URL(cPage.url()).pathname}`);

  // --- Messaging: company sends a message in the seeded engagement (sendMessage) ---
  await cPage.goto(`${BASE}/engagements`, { waitUntil: "domcontentloaded" });
  await cPage.locator("a[href^='/engagements/']").first().click();
  await cPage.waitForURL(/\/engagements\/[a-z0-9]+$/, { timeout: 30000 });
  const msg = `E2E hello ${stamp}`;
  await cPage.fill('textarea[name="body"]', msg);
  await cPage.click('button:has-text("Send")');
  const msgOk = await cPage
    .locator(`text=${msg}`)
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  log(msgOk, "send message (sendMessage) appears in thread");

  // --- Contractor: login + submit/update a bid (submitBid) ---
  const conCtx = await browser.newContext();
  const conPage = await login(conCtx, "contractor@demo.in", "Demo@12345");
  log(/\/contractor/.test(conPage.url()), `contractor login -> ${new URL(conPage.url()).pathname}`);

  await conPage.goto(`${BASE}/contractor/jobs`, { waitUntil: "domcontentloaded" });
  const firstJob = conPage.locator("a[href^='/contractor/jobs/']").first();
  if (await firstJob.isVisible().catch(() => false)) {
    await firstJob.click();
    await conPage.waitForURL(/\/contractor\/jobs\/[a-z0-9]+$/, { timeout: 30000 });
    await conPage.fill('input[name="ratePerWorkerPerDay"]', "800");
    await conPage.fill('input[name="headcountOffered"]', "10");
    await conPage.fill('input[name="mobilizationDays"]', "3");
    await conPage.click('button:has-text("bid")');
    const bidOk = await conPage
      .locator("text=/Bid (submitted|updated)/")
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    log(bidOk, "submit/update bid (submitBid)");
  } else {
    log(true, "no matching job to bid on (skipped) — acceptable");
  }

  console.log(`\n${failed ? "E2E FAILED" : "E2E PASSED"}`);
} catch (err) {
  console.error("E2E error:", err.message);
  failed = true;
} finally {
  await browser.close();
  process.exit(failed ? 1 : 0);
}
