import "server-only";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

/**
 * Single-use links for password reset and email verification.
 *
 * Three decisions are worth stating:
 *
 *  • The raw token exists only in the email. What the database holds is its
 *    SHA-256, so a read of the table yields nothing redeemable. A fast hash is
 *    correct here where bcrypt is correct for passwords: this secret has 256
 *    bits of entropy and cannot be guessed, so slowing an attacker down buys
 *    nothing and would only make every click cost 100ms.
 *
 *  • Issuing a link retires any earlier one for the same purpose. "I clicked
 *    the old email" is otherwise an unbounded window on the account.
 *
 *  • Consuming is a conditional update, not a read-then-write. Two tabs, a
 *    double click or a retried POST cannot both claim the same token.
 */

export const TOKEN_PURPOSE = {
  RESET: "PASSWORD_RESET",
  VERIFY: "EMAIL_VERIFY",
} as const;

export type TokenPurpose = (typeof TOKEN_PURPOSE)[keyof typeof TOKEN_PURPOSE];

/** A reset link is a key to the account, so it lives an hour. */
const TTL_SECONDS: Record<TokenPurpose, number> = {
  PASSWORD_RESET: 60 * 60,
  EMAIL_VERIFY: 60 * 60 * 24 * 3,
};

function digest(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueToken(userId: string, purpose: TokenPurpose): Promise<string> {
  const raw = randomBytes(32).toString("base64url");

  await prisma.authToken.deleteMany({
    where: {
      OR: [
        { userId, purpose, usedAt: null },
        // Nothing else sweeps this table, and issuing is exactly the moment a
        // row is being written anyway. Spent and expired rows have no further
        // use: the token they refer to can never be redeemed again.
        { expiresAt: { lt: new Date(Date.now() - 7 * 86400_000) } },
      ],
    },
  });
  await prisma.authToken.create({
    data: {
      userId,
      purpose,
      tokenHash: digest(raw),
      expiresAt: new Date(Date.now() + TTL_SECONDS[purpose] * 1000),
    },
  });

  return raw;
}

/** True if the link is still redeemable. Used to show a form or an apology. */
export async function tokenIsLive(raw: string, purpose: TokenPurpose): Promise<boolean> {
  if (!raw) return false;
  const row = await prisma.authToken.findUnique({
    where: { tokenHash: digest(raw) },
    select: { purpose: true, usedAt: true, expiresAt: true },
  });
  return Boolean(row && row.purpose === purpose && !row.usedAt && row.expiresAt > new Date());
}

/** Redeems the link and returns whose it was, or null if it is not redeemable. */
export async function consumeToken(raw: string, purpose: TokenPurpose) {
  if (!raw) return null;

  const row = await prisma.authToken.findUnique({
    where: { tokenHash: digest(raw) },
    select: { id: true, userId: true, purpose: true, usedAt: true, expiresAt: true },
  });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt <= new Date()) return null;

  const claimed = await prisma.authToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  return prisma.user.findUnique({ where: { id: row.userId } });
}
