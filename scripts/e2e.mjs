// End-to-end browser test of the real interactive flows (server actions),
// run against SMOKE_BASE or localhost.
//
//   npm run build && npm start
//   SEED_DEMO_PASSWORD='...' node scripts/e2e.mjs
//
// Exercises loginAction, createRequirement (both the staffing and the
// job-contract shapes), submitProposal and sendMessage. Credentials come from
// the environment — the seed prints them and nothing is hardcoded here.

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.SMOKE_BASE || "http://localhost:3000";
const PASSWORD = process.env.SEED_DEMO_PASSWORD;
const stamp = Date.now();

/** Values no catalogue contains — they only reach the database via "Other". */
const TYPED_INDUSTRY = "Rubber Reclaim";
const TYPED_ROLE = "Bandomatic Operator";

if (!PASSWORD) {
  console.error("\n  ✖ Set SEED_DEMO_PASSWORD to the password printed by `npm run db:seed`.\n");
  process.exit(1);
}

const prisma = new PrismaClient();
let failed = false;

function log(ok, msg) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failed = true;
}

/**
 * The category tiles hide their radio with `sr-only` and style a sibling span,
 * which is the right pattern for accessibility but leaves Playwright nothing
 * clickable — and the sticky header intercepts a click on the label. Setting
 * the input directly and dispatching the event is the honest equivalent of a
 * user selecting the tile.
 */
async function selectCategory(page, value) {
  await page.locator(`input[name="category"][value="${value}"]`).check({ force: true });
  await page.waitForTimeout(300); // let the form re-render for the new category
}

async function visible(page, selector, timeout = 15000) {
  return page
    .locator(selector)
    .first()
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false);
}

const browser = await chromium.launch();

try {
  // Real accounts out of the database rather than assumed seed emails.
  const companyUser = await prisma.user.findFirst({
    where: { role: "COMPANY", companyProfile: { status: "APPROVED" } },
  });
  const contractorUser = await prisma.user.findFirst({
    where: { role: "CONTRACTOR", contractorProfile: { status: "APPROVED" } },
  });

  if (!companyUser || !contractorUser) {
    console.error("\n  ✖ No approved company/contractor found. Run `npm run db:seed`.\n");
    process.exit(1);
  }

  async function login(ctx, email) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button:has-text("Log in")');
    await page.waitForURL(/\/(company|contractor|admin)(\/|$)/, { timeout: 30000 });
    return page;
  }

  // --- Company: login -------------------------------------------------------
  const companyCtx = await browser.newContext();
  const cPage = await login(companyCtx, companyUser.email);
  log(/\/company/.test(cPage.url()), `company login -> ${new URL(cPage.url()).pathname}`);

  // --- Post a BLUE-COLLAR STAFFING requirement (roles + headcount) ----------
  await cPage.goto(`${BASE}/company/requirements/new`, { waitUntil: "networkidle" });
  await cPage.waitForTimeout(1200); // let the client form hydrate

  await selectCategory(cPage, "BLUE_COLLAR_STAFFING");
  await cPage.fill('input[name="title"]', `E2E staffing requirement ${stamp}`);
  await cPage.fill('input[name="city"]', "Visakhapatnam");
  await cPage.selectOption('select[name="state"]', "Andhra Pradesh");

  await cPage.selectOption("#role-0", "fitter");
  await cPage.fill("#headcount-0", "12");

  // The "Other" escape hatch, end to end: no catalogue covers every sector or
  // every plant's job titles, so both pickers offer "Other" and submit the
  // typed text in place of the code (see components/FieldWithOther.tsx).
  await cPage.selectOption("#industry-choice", "__other__");
  await cPage.fill("#industry-other", TYPED_INDUSTRY);
  await cPage.click('button:has-text("Add another role")');
  await cPage.selectOption("#role-1", "__other__");
  await cPage.fill("#role-1-other", TYPED_ROLE);
  await cPage.fill("#headcount-1", "4");

  // Role rows are serialised into a hidden field; wait for React to commit it.
  await cPage.waitForFunction(
    (typedRole) => {
      const value = document.querySelector('input[name="rolesJson"]')?.value || "";
      return value.includes("fitter") && value.includes(typedRole);
    },
    TYPED_ROLE,
    { timeout: 15000 },
  );
  await cPage.click('button:has-text("Publish requirement")');
  await cPage.waitForURL(/\/company\/requirements\/(?!new$)[a-z0-9]+$/, { timeout: 30000 });
  log(
    await visible(cPage, "text=Roles & headcount"),
    `post staffing requirement -> ${new URL(cPage.url()).pathname}`,
  );
  log(await visible(cPage, `text=${TYPED_ROLE}`), "typed role survives the round trip");
  log(await visible(cPage, `text=${TYPED_INDUSTRY}`), "typed sector survives the round trip");

  // --- Post a JOB CONTRACT (scope + output, no headcount anywhere) ----------
  await cPage.goto(`${BASE}/company/requirements/new`, { waitUntil: "networkidle" });
  await cPage.waitForTimeout(1200);

  await selectCategory(cPage, "JOB_CONTRACT");
  log(
    await visible(cPage, "text=No headcount needed"),
    "job contract form drops the headcount section",
  );

  await cPage.fill('input[name="title"]', `E2E job contract ${stamp}`);
  await cPage.selectOption("#scopeKey-choice", "material_handling");
  await cPage.fill(
    'textarea[name="description"]',
    "Material handling across the dispatch bay on a per-tonne basis. Contractor supplies manpower, supervision and pallet trucks, and decides deployment.",
  );
  await cPage.fill('input[name="outputQuantity"]', "250");
  await cPage.selectOption("#outputUnit-choice", "tonne");
  await cPage.fill('input[name="city"]', "Visakhapatnam");
  await cPage.selectOption('select[name="state"]', "Andhra Pradesh");
  await cPage.click('button:has-text("Publish requirement")');
  await cPage.waitForURL(/\/company\/requirements\/(?!new$)[a-z0-9]+$/, { timeout: 30000 });
  log(
    await visible(cPage, "text=Output & deliverables"),
    `post job contract -> ${new URL(cPage.url()).pathname}`,
  );

  // --- Messaging on the seeded engagement (sendMessage) ---------------------
  await cPage.goto(`${BASE}/engagements`, { waitUntil: "domcontentloaded" });
  const engagementLink = cPage.locator("a[href^='/engagements/']").first();
  if (await engagementLink.isVisible().catch(() => false)) {
    await engagementLink.click();
    await cPage.waitForURL(/\/engagements\/[a-z0-9]+$/, { timeout: 30000 });
    const msg = `E2E hello ${stamp}`;
    await cPage.fill('textarea[name="body"]', msg);
    await cPage.click('button:has-text("Send")');
    log(await visible(cPage, `text=${msg}`), "send message appears in thread");
  } else {
    log(true, "no engagement to message on (skipped)");
  }

  // --- Contractor: login and submit a proposal ------------------------------
  const conCtx = await browser.newContext();
  const conPage = await login(conCtx, contractorUser.email);
  log(/\/contractor/.test(conPage.url()), `contractor login -> ${new URL(conPage.url()).pathname}`);

  await conPage.goto(`${BASE}/contractor/requirements`, { waitUntil: "domcontentloaded" });
  const firstRequirement = conPage.locator("a[href^='/contractor/requirements/']").first();

  if (await firstRequirement.isVisible().catch(() => false)) {
    await firstRequirement.click();
    await conPage.waitForURL(/\/contractor\/requirements\/[a-z0-9]+$/, { timeout: 30000 });
    await conPage.waitForTimeout(800);

    const hasForm = await conPage
      .locator('input[name="rateAmount"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (hasForm) {
      // Rate-basis options differ by category, so take whichever is offered.
      const basis = conPage.locator('select[name="rateBasis"]');
      const firstBasis = await basis.locator("option:not([value=''])").first().getAttribute("value");
      await basis.selectOption(firstBasis);
      await conPage.fill('input[name="rateAmount"]', "24000");

      const headcount = conPage.locator('input[name="headcountOffered"]');
      if (await headcount.isVisible().catch(() => false)) {
        await headcount.fill("8");
      }
      await conPage.fill('input[name="mobilizationDays"]', "5");
      await conPage.fill('input[name="validityDays"]', "30");
      await conPage.click('button:has-text("proposal")');

      log(await visible(conPage, "text=/Proposal (submitted|updated)/"), "submit/update proposal");
    } else {
      log(true, "no proposal form on this requirement (awarded/expired) — skipped");
    }
  } else {
    log(true, "no matching requirement to quote on (skipped)");
  }

  console.log(`\n${failed ? "E2E FAILED" : "E2E PASSED"}`);
} catch (err) {
  console.error("E2E error:", err.message);
  failed = true;
} finally {
  await browser.close();
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}
