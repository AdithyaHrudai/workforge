#!/usr/bin/env node
/**
 * Provision or rotate the platform admin account. NON-DESTRUCTIVE — safe to run
 * against production. Touches exactly one User row and nothing else.
 *
 *   npm run admin:create                          # prompts for email, generates a password
 *   ADMIN_EMAIL=you@co.in npm run admin:create    # generate a password for this address
 *   ADMIN_EMAIL=you@co.in ADMIN_PASSWORD=... npm run admin:create
 *
 * If the account already exists its password is reset and it is re-activated —
 * which is how you rotate a leaked credential.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;

function generatePassword() {
  return randomBytes(18).toString("base64url");
}

async function prompt(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("\n  ✖ DATABASE_URL is not set. Put it in .env first.\n");
    process.exit(1);
  }

  const host = process.env.DATABASE_URL.replace(/^.*@/, "").replace(/[/?].*$/, "");

  let email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.log(`\n  Target database: ${host}\n`);
    email = (await prompt("  Admin email address: ")).toLowerCase();
  }

  if (!EMAIL_RE.test(email)) {
    console.error(`\n  ✖ "${email}" is not a valid email address.\n`);
    process.exit(1);
  }

  const supplied = process.env.ADMIN_PASSWORD;
  if (supplied && supplied.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `\n  ✖ ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.\n`,
    );
    process.exit(1);
  }
  const password = supplied || generatePassword();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && existing.role !== "ADMIN") {
    console.error(
      `\n  ✖ ${email} already exists as a ${existing.role} account.` +
        `\n    Refusing to escalate it to ADMIN. Use a different address.\n`,
    );
    process.exit(1);
  }

  const name = process.env.ADMIN_NAME?.trim() || existing?.name || "Platform Admin";

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      status: "ACTIVE",
      role: "ADMIN",
      // Revokes every session already issued for this account.
      tokenVersion: { increment: 1 },
    },
    create: { email, name, role: "ADMIN", passwordHash, mobileVerified: false },
  });

  console.log(`\n  ✓ Admin ${existing ? "password rotated" : "account created"} on ${host}\n`);
  console.log(`      Email:    ${email}`);
  if (supplied) {
    console.log("      Password: (the ADMIN_PASSWORD you supplied)");
  } else {
    console.log(`      Password: ${password}`);
    console.log(
      "\n  ⚠ This password is shown once and is not stored anywhere in plaintext.\n" +
        "    Save it to a password manager now, then clear your shell history.\n",
    );
  }

  if (existing) {
    console.log("  All existing sessions for this account have been revoked.\n");
  }
}

main()
  .catch((e) => {
    console.error("\n  ✖ Failed:", e.message, "\n");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
