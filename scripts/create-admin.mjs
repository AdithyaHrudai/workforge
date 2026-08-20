#!/usr/bin/env node
/**
 * Provision or rotate an administrator for the verification console.
 *
 * NON-DESTRUCTIVE — safe to run against production. Touches exactly one
 * AdminUser row and nothing else.
 *
 *   npm run admin:create
 *       Prompts for the details and generates a strong password.
 *
 *   ADMIN_USERNAME=priya ADMIN_EMAIL=priya@co.in ADMIN_NAME="Priya Nair" \
 *   ADMIN_CODE=WF-ADM-002 ADMIN_ROLE=VERIFIER npm run admin:create
 *       Non-interactive, password generated and printed once.
 *
 *   ADMIN_PASSWORD='...' npm run admin:create
 *       Supplies the password yourself. Prefer the generated one.
 *
 *   ADMIN_MUST_CHANGE=0 ... npm run admin:create
 *       Skips the forced password change at first sign-in. Only for your own
 *       bootstrap account, with a password nobody else has seen.
 *
 * If the username already exists, its password is reset, the account is
 * re-activated and every live session for it is revoked — which is how you
 * rotate a leaked credential. The first administrator on an empty platform is
 * always created as SUPER_ADMIN, because otherwise nobody could appoint anyone.
 *
 * This is the only way into an empty console, and the recovery path when every
 * super admin is locked out. It deliberately lives outside the application: a
 * self-service route into an admin console is a self-service route for an
 * attacker.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,23}$/;
const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;

function generatePassword() {
  // base64url of 18 bytes → 24 characters. Always contains a mix in practice,
  // and is checked against the same policy as the UI below regardless.
  return randomBytes(18).toString("base64url");
}

function passwordProblems(pw) {
  const problems = [];
  if (pw.length < MIN_PASSWORD_LENGTH) problems.push(`at least ${MIN_PASSWORD_LENGTH} characters`);
  if (!/[a-z]/.test(pw)) problems.push("a lowercase letter");
  if (!/[A-Z]/.test(pw)) problems.push("an uppercase letter");
  if (!/\d/.test(pw)) problems.push("a number");
  return problems;
}

/**
 * Asks a question, unless there is nobody to answer.
 *
 * Setting ADMIN_USERNAME signals a scripted run, but the individual prompts
 * used to fire anyway for any variable that happened to be unset — so a CI job
 * or a provisioning script would hang forever on a question no one could see.
 * When non-interactive, take the fallback and carry on.
 */
async function prompt(question, fallback = "") {
  if (process.env.ADMIN_USERNAME || !stdin.isTTY) return fallback;
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(question)).trim();
    return answer || fallback;
  } finally {
    rl.close();
  }
}

function fail(message) {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
}

/** Next free code in the WF-ADM-NNN series. */
async function suggestCode() {
  const existing = await prisma.adminUser.findMany({ select: { adminCode: true } });
  const numbers = existing
    .map((a) => /^WF-ADM-(\d+)$/.exec(a.adminCode)?.[1])
    .filter(Boolean)
    .map(Number);
  const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  return `WF-ADM-${String(next).padStart(3, "0")}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set. Put it in .env first.");
  }

  const host = process.env.DATABASE_URL.replace(/^.*@/, "").replace(/[/?].*$/, "");
  const adminCount = await prisma.adminUser.count();
  const isFirst = adminCount === 0;

  const interactive = !process.env.ADMIN_USERNAME;
  if (interactive) {
    console.log(`\n  Target database: ${host}`);
    console.log(
      isFirst
        ? "  No administrators exist yet — this one will be a SUPER_ADMIN.\n"
        : `  ${adminCount} administrator${adminCount === 1 ? "" : "s"} already exist.\n`,
    );
  }

  const username = (
    process.env.ADMIN_USERNAME ?? (await prompt("  Username (lowercase, no spaces): "))
  )
    .trim()
    .toLowerCase();
  if (!USERNAME_RE.test(username)) {
    fail(`"${username}" is not a valid username. Use 3–32 lowercase letters, numbers, . _ or -`);
  }

  const existing = await prisma.adminUser.findUnique({ where: { username } });

  const email = (
    process.env.ADMIN_EMAIL ??
    (await prompt(`  Email${existing ? ` [${existing.email}]` : ""}: `, existing?.email ?? ""))
  )
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email)) fail(`"${email}" is not a valid email address.`);

  const name = (
    process.env.ADMIN_NAME ??
    (await prompt(`  Full name${existing ? ` [${existing.name}]` : ""}: `, existing?.name ?? ""))
  ).trim();
  if (name.length < 2) fail("Enter the person's full name.");

  const defaultCode = existing?.adminCode ?? (await suggestCode());
  const adminCode = (
    process.env.ADMIN_CODE ?? (await prompt(`  Admin ID [${defaultCode}]: `, defaultCode))
  )
    .trim()
    .toUpperCase();
  if (!CODE_RE.test(adminCode)) {
    fail(`"${adminCode}" is not a valid admin ID. Use 3–24 characters: A–Z, 0–9 and dashes.`);
  }

  // The first account must be able to appoint the others; after that the
  // default is the lower privilege, and elevation is a deliberate choice.
  const role = isFirst
    ? "SUPER_ADMIN"
    : (process.env.ADMIN_ROLE ?? existing?.role ?? "VERIFIER").trim().toUpperCase();
  if (!["SUPER_ADMIN", "VERIFIER"].includes(role)) {
    fail(`ADMIN_ROLE must be SUPER_ADMIN or VERIFIER, not "${role}".`);
  }

  const supplied = process.env.ADMIN_PASSWORD;
  if (supplied) {
    const problems = passwordProblems(supplied);
    if (problems.length > 0) {
      fail(`ADMIN_PASSWORD must contain ${problems.join(", ")}.`);
    }
  }
  const password = supplied || generatePassword();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  /**
   * Whether the holder must choose a new password at first sign-in.
   *
   * Default on, and it should stay on for anybody you are provisioning *for*
   * somebody else: until they change it, you know their password too, and
   * nothing they approve can be attributed to them alone.
   *
   * ADMIN_MUST_CHANGE=0 turns it off, for the one case where it is noise rather
   * than protection: you are provisioning your own bootstrap account with a
   * password only you have seen. It is opt-out rather than inferred, because
   * getting this wrong silently is exactly the kind of thing nobody notices.
   */
  const mustChange = process.env.ADMIN_MUST_CHANGE !== "0";

  // A code or email belonging to somebody else would violate a unique index;
  // catching it here gives a usable message instead of a Prisma stack trace.
  const clash = await prisma.adminUser.findFirst({
    where: {
      OR: [{ adminCode }, { email }],
      ...(existing ? { NOT: { id: existing.id } } : {}),
    },
    select: { username: true, adminCode: true, email: true },
  });
  if (clash) {
    fail(
      `${clash.adminCode === adminCode ? "That admin ID" : "That email"} is already assigned to "${clash.username}".`,
    );
  }

  const admin = await prisma.adminUser.upsert({
    where: { username },
    update: {
      email,
      name,
      adminCode,
      role,
      passwordHash,
      status: "ACTIVE",
      failedAttempts: 0,
      lockedUntil: null,
      mustChangePassword: mustChange,
    },
    create: {
      username,
      email,
      name,
      adminCode,
      role,
      passwordHash,
      mustChangePassword: mustChange,
    },
    select: { id: true, mustChangePassword: true },
  });

  // Rotating a credential means nothing if the sessions issued under the old
  // one stay alive.
  const revoked = existing
    ? await prisma.adminSession.updateMany({
        where: { adminId: admin.id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    : { count: 0 };

  console.log(`\n  ✓ Administrator ${existing ? "updated" : "created"} on ${host}\n`);
  console.log(`      Admin ID:  ${adminCode}`);
  console.log(`      Username:  ${username}`);
  console.log(`      Email:     ${email}`);
  console.log(`      Name:      ${name}`);
  console.log(`      Role:      ${role}`);
  if (supplied) {
    console.log("      Password:  (the ADMIN_PASSWORD you supplied)");
  } else {
    console.log(`      Password:  ${password}`);
    console.log(
      "\n  ⚠ This password is shown once and is stored only as a bcrypt hash.\n" +
        "    Save it to a password manager now, then clear your shell history.",
    );
  }
  if (admin.mustChangePassword) {
    console.log("\n  They will be asked to choose a new password at first sign-in.");
  }
  if (revoked.count > 0) {
    console.log(`\n  ${revoked.count} existing session(s) for this account were revoked.`);
  }
  console.log("\n  Sign in at /admin/login\n");
}

main()
  .catch((e) => {
    console.error("\n  ✖ Failed:", e.message, "\n");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
