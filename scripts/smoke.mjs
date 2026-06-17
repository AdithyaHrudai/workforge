// Smoke test: mint session cookies for seeded users and fetch key pages,
// asserting status codes + access control. Run after `npm start`.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

// Load AUTH_SECRET from .env
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);
const secret = new TextEncoder().encode(env.AUTH_SECRET);
const BASE = process.env.SMOKE_BASE || "http://localhost:3000";
const prisma = new PrismaClient();

async function cookieFor(user) {
  const token = await new SignJWT({ uid: user.id, role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
  return `ss_session=${token}`;
}

let pass = 0;
let fail = 0;
async function check(label, url, cookie, expectStatus, mustInclude) {
  const res = await fetch(BASE + url, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  const body = res.status === 200 ? await res.text() : "";
  let ok = res.status === expectStatus;
  // mustInclude may be a string or array of acceptable alternatives.
  if (ok && mustInclude) {
    const alts = Array.isArray(mustInclude) ? mustInclude : [mustInclude];
    if (!alts.some((s) => body.includes(s))) ok = false;
  }
  console.log(`${ok ? "PASS" : "FAIL"}  [${res.status}] ${label} (${url})`);
  if (ok) pass++;
  else fail++;
}

const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
const company = await prisma.user.findFirst({ where: { role: "COMPANY" } });
const contractor = await prisma.user.findFirst({ where: { email: "contractor@demo.in" } });
const contractor2 = await prisma.user.findFirst({ where: { email: "contractor2@demo.in" } });
const job = await prisma.job.findFirst({ where: { status: "OPEN" } });
const engagement = await prisma.engagement.findFirst();

const adminCookie = await cookieFor(admin);
const companyCookie = await cookieFor(company);
const contractorCookie = await cookieFor(contractor);
const contractor2Cookie = await cookieFor(contractor2);

// Public
await check("landing", "/", null, 200, "ShramSetu");
await check("login page", "/login", null, 200, "Welcome back");

// Auth gating
await check("protected redirect (no cookie)", "/company", null, 307);
await check("api messages unauth", "/api/engagements/x/messages", null, 401);

// Company
await check("company dashboard", "/company", companyCookie, 200, "Greenfield Projects");
await check("company jobs", "/company/jobs", companyCookie, 200);
await check("company job detail", `/company/jobs/${job.id}`, companyCookie, 200, "Bids received");
await check("post job form", "/company/jobs/new", companyCookie, 200, "Post a requirement");
await check("find contractors", "/company/contractors", companyCookie, 200);

// Contractor
await check("contractor dashboard", "/contractor", contractorCookie, 200);
await check("contractor find work", "/contractor/jobs", contractorCookie, 200, "Find work");
await check("contractor job detail", `/contractor/jobs/${job.id}`, contractorCookie, 200, ["Place a bid", "Update your bid"]);
await check("contractor documents", "/contractor/documents", contractorCookie, 200, "Verification");

// Role enforcement: contractor hitting /company should redirect away
await check("contractor blocked from /company", "/company", contractorCookie, 307);

// Admin
await check("admin overview", "/admin", adminCookie, 200, "Platform overview");
await check("admin contractors", "/admin/contractors", adminCookie, 200);
await check("admin settings", "/admin/settings", adminCookie, 200, "Platform settings");
await check("company blocked from /admin", "/admin", companyCookie, 307);

// Engagement + messaging (contractor2 is the participant; contractor1 is not)
await check("engagement detail (company)", `/engagements/${engagement.id}`, companyCookie, 200, "Agreed terms");
await check("engagement detail (participant contractor)", `/engagements/${engagement.id}`, contractor2Cookie, 200, "Messages");
await check("engagement list (contractor)", "/engagements", contractor2Cookie, 200, "Engagements");
await check("messages API (participant)", `/api/engagements/${engagement.id}/messages`, companyCookie, 200, "PPE sizes");
await check("messages API (non-participant) forbidden", `/api/engagements/${engagement.id}/messages`, contractorCookie, 403);
await check("engagement detail non-participant redirect", `/engagements/${engagement.id}`, contractorCookie, 307);

console.log(`\n${pass} passed, ${fail} failed`);
await prisma.$disconnect();
process.exit(fail > 0 ? 1 : 0);
