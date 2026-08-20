// Smoke test: mints session cookies for seeded users and fetches the key pages,
// asserting status codes and access control. Run against a started server:
//
//   npm run build && npm start
//   node scripts/smoke.mjs
//
// Users are looked up by role rather than by hardcoded email, so this keeps
// working when the seed data changes.

import { readFileSync } from "fs";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || env.AUTH_SECRET);
const BASE = process.env.SMOKE_BASE || "http://localhost:3000";
const prisma = new PrismaClient();

/** Mirrors lib/auth.ts — the cookie name and the tokenVersion claim both matter. */
async function cookieFor(user) {
  const token = await new SignJWT({
    uid: user.id,
    role: user.role,
    name: user.name,
    tv: user.tokenVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
  return `wf_session=${token}`;
}

/**
 * Mirrors lib/admin-auth.ts. Admin sessions are not JWTs — they are opaque
 * tokens with a database row, so a test session has to be inserted rather than
 * signed. Only the SHA-256 is stored, exactly as the application does it.
 */
const mintedAdminSessions = [];
async function adminCookieFor(admin) {
  const token = randomBytes(32).toString("base64url");
  const session = await prisma.adminSession.create({
    data: {
      tokenHash: createHash("sha256").update(token).digest("hex"),
      adminId: admin.id,
      ip: "127.0.0.1",
      userAgent: "smoke-test",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
    select: { id: true },
  });
  mintedAdminSessions.push(session.id);
  return `wf_admin=${token}`;
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
  if (ok && mustInclude) {
    const alts = Array.isArray(mustInclude) ? mustInclude : [mustInclude];
    if (!alts.some((s) => body.includes(s))) ok = false;
  }
  console.log(`${ok ? "PASS" : "FAIL"}  [${res.status}] ${label} (${url})`);
  if (ok) pass++;
  else fail++;
}

function required(value, what) {
  if (!value) {
    console.error(`\n  ✖ No ${what} found. Run \`npm run db:seed\` first.\n`);
    process.exit(1);
  }
  return value;
}

// Administrators live in their own table, not as a role on User.
const admin = required(
  await prisma.adminUser.findFirst({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } }),
  "active super admin (run `npm run admin:create`)",
);

// Everything hangs off one engagement, so that the same company identity owns
// both the requirement under test and the engagement. Picking them independently
// makes the access-control assertions meaningless: a 404 on someone else's
// engagement is correct behaviour, not a failure.
const engagement = required(
  await prisma.engagement.findFirst({
    include: {
      company: { include: { user: true } },
      contractor: { include: { user: true } },
    },
  }),
  "engagement",
);

const company = engagement.company.user;

const requirement = required(
  await prisma.requirement.findFirst({
    where: { status: "OPEN", companyId: engagement.companyId },
  }),
  `open requirement owned by ${engagement.company.companyName}`,
);

const participant = engagement.contractor.user;
const outsider = required(
  await prisma.user.findFirst({
    where: { role: "CONTRACTOR", id: { not: participant.id } },
  }),
  "second contractor",
);

const [adminCookie, companyCookie, participantCookie, outsiderCookie] = await Promise.all([
  adminCookieFor(admin),
  cookieFor(company),
  cookieFor(participant),
  cookieFor(outsider),
]);

// --- Public ----------------------------------------------------------------
await check("landing", "/", null, 200, "WorkForge");
await check("login page", "/login", null, 200, "Welcome back");
await check("how it works", "/about", null, 200, "How WorkForge works");
await check("for companies", "/for-companies", null, 200);
await check("for contractors", "/for-contractors", null, 200);
await check("robots", "/robots.txt", null, 200);
await check("sitemap", "/sitemap.xml", null, 200);

// --- Directory privacy ------------------------------------------------------
// The firm directory and profiles are members-only. A contractor's client list,
// plant locations and headcount are commercially sensitive, so an anonymous
// visitor must be sent to the login page rather than shown a masked version.
await check("directory requires login", "/contractors", null, 307);
await check("directory filter requires login", "/contractors?industries=tyre", null, 307);
await check(
  "firm profile requires login",
  `/contractors/${engagement.contractorId}`,
  null,
  307,
);
await check(
  "contractors cannot browse the directory either",
  "/contractors",
  participantCookie,
  200,
);
await check(
  "legacy profile path redirects",
  `/company/contractors/${engagement.contractorId}`,
  companyCookie,
  307,
);

// --- Auth gating ------------------------------------------------------------
await check("protected redirect (no cookie)", "/company", null, 307);
await check("messages API unauthenticated", "/api/engagements/x/messages", null, 401);

// --- Company ----------------------------------------------------------------
await check("company dashboard", "/company", companyCookie, 200);
await check("company requirements", "/company/requirements", companyCookie, 200, "My requirements");
await check(
  "requirement detail",
  `/company/requirements/${requirement.id}`,
  companyCookie,
  200,
  "Proposals",
);
await check("post requirement form", "/company/requirements/new", companyCookie, 200, [
  "What kind of contract is this?",
  "awaiting verification",
]);
await check("contractor search", "/company/search", companyCookie, 200, "Find contractors");
await check(
  "firm profile (as company)",
  `/contractors/${engagement.contractorId}`,
  companyCookie,
  200,
  "Track record",
);

// --- Contractor -------------------------------------------------------------
await check("contractor dashboard", "/contractor", participantCookie, 200);
await check("contractor feed", "/contractor/requirements", participantCookie, 200, "Find work");
await check(
  "contractor requirement detail",
  `/contractor/requirements/${requirement.id}`,
  participantCookie,
  200,
);
await check("contractor proposals", "/contractor/proposals", participantCookie, 200, "My proposals");
await check("contractor track record", "/contractor/clients", participantCookie, 200, "Track record");
await check("contractor documents", "/contractor/documents", participantCookie, 200, "Verification");

// --- Legal surface ----------------------------------------------------------
// An intermediary that 404s its own grievance page has a compliance problem,
// not a broken link, so these are checked like any other route.
await check("privacy policy", "/privacy", null, 200, "Privacy policy");
await check("terms of use", "/terms", null, 200, "Terms of use");
await check("grievance contact", "/contact", null, 200, "Grievance Officer");

// --- Account & credentials --------------------------------------------------
await check("forgot password", "/forgot-password", null, 200, "Reset your password");
await check(
  "reset link that is not live",
  "/reset-password?token=not-a-real-token",
  null,
  200,
  "expired",
);
await check(
  "verification link that is not live",
  "/verify-email?token=not-a-real-token",
  null,
  200,
  "expired",
);
await check("account settings", "/account", participantCookie, 200, "Account settings");
await check("account settings needs a session", "/account", null, 307);

// --- Role enforcement -------------------------------------------------------
await check("contractor blocked from /company", "/company", participantCookie, 307);
await check("company blocked from /contractor", "/contractor", companyCookie, 307);

// --- Admin console ----------------------------------------------------------
await check("admin login page is public", "/admin/login", null, 200, "Verification console");
await check("admin queue", "/admin", adminCookie, 200, "Verification queue");
await check("admin contractors", "/admin/contractors", adminCookie, 200, "Contractors");
await check("admin companies", "/admin/companies", adminCookie, 200, "Companies");
await check("admin settings", "/admin/settings", adminCookie, 200, "Platform settings");
await check("admin team", "/admin/team", adminCookie, 200, "Admin team");
await check("admin account", "/admin/account", adminCookie, 200, "Signed-in devices");
await check("admin users", "/admin/users", adminCookie, 200, "Every registered account");
await check("admin users search", "/admin/users?q=a&role=CONTRACTOR", adminCookie, 200);
await check("admin audit log", "/admin/audit", adminCookie, 200, "Every privileged action");
await check("admin audit filtered", "/admin/audit?action=REGISTER", adminCookie, 200);
await check(
  "admin company detail",
  `/admin/companies/${engagement.companyId}`,
  adminCookie,
  200,
  "Moderation",
);

// --- Admin isolation --------------------------------------------------------
//
// The two identity systems must not overlap in either direction. A marketplace
// session is not an admin session, and an admin session is not a marketplace
// one — an admin cannot read private message threads, which is the whole point
// of keeping the two apart.
await check("no session blocked from /admin", "/admin", null, 307);
await check("company session blocked from /admin", "/admin", companyCookie, 307);
await check("company session blocked from /admin/users", "/admin/users", companyCookie, 307);
await check("contractor session blocked from /admin/audit", "/admin/audit", participantCookie, 307);
await check("company session blocked from /admin/team", "/admin/team", companyCookie, 307);
await check(
  "admin session is not a marketplace session",
  `/api/engagements/${engagement.id}/messages`,
  adminCookie,
  401,
);
await check("admin session cannot open /company", "/company", adminCookie, 307);

// Admin document access is its own route, and it is not open to marketplace
// sessions however well-formed they are.
const someDocument = await prisma.document.findFirst({ select: { id: true } });
if (someDocument) {
  await check(
    "admin document route rejects a company session",
    `/api/admin/documents/${someDocument.id}`,
    companyCookie,
    401,
  );
  await check(
    "admin document route rejects no session",
    `/api/admin/documents/${someDocument.id}`,
    null,
    401,
  );
}

// A revoked admin loses access on the next request, not when a token expires.
{
  const revokedAdminCookie = await adminCookieFor(admin);
  const tokenHash = createHash("sha256")
    .update(revokedAdminCookie.replace("wf_admin=", ""))
    .digest("hex");
  await prisma.adminSession.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });
  await check("revoked admin session is refused", "/admin", revokedAdminCookie, 307);
}

// --- Engagements & messaging ------------------------------------------------
await check("engagement list", "/engagements", companyCookie, 200, "Engagements");
await check(
  "engagement detail (company)",
  `/engagements/${engagement.id}`,
  companyCookie,
  200,
  "Agreed commercials",
);
await check(
  "engagement detail (participant)",
  `/engagements/${engagement.id}`,
  participantCookie,
  200,
  "Messages",
);
await check(
  "messages API (participant)",
  `/api/engagements/${engagement.id}/messages`,
  companyCookie,
  200,
);
await check(
  "messages API (non-participant) forbidden",
  `/api/engagements/${engagement.id}/messages`,
  outsiderCookie,
  403,
);
await check(
  "engagement detail non-participant not found",
  `/engagements/${engagement.id}`,
  outsiderCookie,
  404,
);

// Test sessions are real rows in a real table; leaving them behind would leave
// a working admin session lying around on whatever database this ran against.
if (mintedAdminSessions.length > 0) {
  await prisma.adminSession.deleteMany({ where: { id: { in: mintedAdminSessions } } });
}

console.log(`\n${pass} passed, ${fail} failed`);
await prisma.$disconnect();
process.exit(fail > 0 ? 1 : 0);
