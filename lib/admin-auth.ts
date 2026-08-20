import "server-only";
import { cache } from "react";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { AdminUser } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Administrator authentication.
 *
 * Deliberately a separate system from lib/auth.ts, not a role inside it:
 *
 *  • Different cookie, different table, different code path. Nothing reachable
 *    from public registration, login or password handling touches AdminUser, so
 *    a bug on the marketplace side cannot mint or escalate an administrator.
 *
 *  • Sessions are opaque random tokens backed by a database row, not JWTs. A
 *    JWT is valid until it expires; the whole point of an admin session is that
 *    "revoke this person" must take effect on their next request. The row also
 *    lets an admin see and terminate their own live sessions.
 *
 *  • Only the SHA-256 of the token is stored. The token exists in the cookie
 *    and nowhere else.
 *
 *  • Short absolute lifetime plus an idle timeout, because an unattended
 *    browser on a shared desk is the realistic threat for an ops console, not
 *    cryptanalysis.
 */

export const ADMIN_SESSION_COOKIE = "wf_admin";

/** Hard ceiling on a session, however active it is. */
const ABSOLUTE_LIFETIME_MS = 8 * 60 * 60 * 1000; // 8 hours

/** A session untouched for this long is dead. */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * lastSeenAt is only written when it is at least this stale. Without the
 * throttle every page render — and the admin panel renders several server
 * components per page — would be a write.
 */
const LAST_SEEN_WRITE_INTERVAL_MS = 60 * 1000;

/** Failed sign-ins before an account locks, and for how long. */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Cost 12 rather than the 10 used for marketplace accounts. An admin hash is a
 * far more valuable target and admins sign in rarely, so the extra ~4x work per
 * verification costs nothing anybody will notice.
 */
const BCRYPT_ROUNDS = 12;

export type AdminRole = "SUPER_ADMIN" | "VERIFIER";

export type AdminIdentity = Pick<
  AdminUser,
  "id" | "adminCode" | "username" | "name" | "email" | "role" | "status" | "mustChangePassword"
> & { sessionId: string };

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export async function hashAdminPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyAdminPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A real bcrypt hash of a value nobody can supply. Compared against when the
 * username does not exist, so a miss costs the same time as a hit and response
 * latency does not enumerate admin usernames.
 */
export const DUMMY_ADMIN_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEe.9pFrPFTyHmY7zZ4kR0iVXPqTBFa7bta";

// ---------------------------------------------------------------------------
// Tokens & sessions
// ---------------------------------------------------------------------------

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time compare for two same-length hex digests. */
export function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function requestIp(): string | undefined {
  const h = headers();
  const forwarded = h.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || h.get("x-real-ip")?.trim() || undefined;
}

function requestUserAgent(): string | undefined {
  return headers().get("user-agent")?.slice(0, 300) || undefined;
}

/**
 * Issues a session and sets the cookie.
 *
 * SameSite=Strict, not Lax: the admin panel is never legitimately entered by
 * following a link from another site, so the cookie has no reason to travel on
 * a cross-site navigation.
 */
export async function createAdminSession(adminId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ABSOLUTE_LIFETIME_MS);

  await prisma.adminSession.create({
    data: {
      tokenHash: hashToken(token),
      adminId,
      ip: requestIp(),
      userAgent: requestUserAgent(),
      expiresAt,
    },
  });

  cookies().set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

function clearAdminCookie(): void {
  cookies().set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

/** Ends the current session — both the row and the cookie. */
export async function destroyAdminSession(): Promise<void> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await prisma.adminSession
      .updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }
  clearAdminCookie();
}

/** Kills every live session for an admin. Used on revoke, reset and lockout. */
export async function revokeAllAdminSessions(adminId: string): Promise<number> {
  const { count } = await prisma.adminSession.updateMany({
    where: { adminId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count;
}

/**
 * The current administrator, or null.
 *
 * Memoised for the render pass with React's `cache()`, exactly as
 * getCurrentUser is: a page's layout, the shell and the page body each ask, and
 * without this each ask is a query. The scope is one request, so a revocation
 * is still picked up on the next one.
 */
export const getAdminIdentity = cache(async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: true },
  });

  if (!session || session.revokedAt) return null;

  const now = Date.now();

  // Absolute expiry, then idle expiry. An idled-out session is revoked rather
  // than merely ignored, so it can never be resurrected by a later request.
  if (session.expiresAt.getTime() <= now) return null;
  if (now - session.lastSeenAt.getTime() > IDLE_TIMEOUT_MS) {
    await prisma.adminSession
      .update({ where: { id: session.id }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
    return null;
  }

  // The account itself is the authority, not the session: revoking an admin
  // takes effect here even for a session row that has not yet been swept.
  if (session.admin.status !== "ACTIVE") return null;

  if (now - session.lastSeenAt.getTime() > LAST_SEEN_WRITE_INTERVAL_MS) {
    await prisma.adminSession
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  const { admin } = session;
  return {
    id: admin.id,
    adminCode: admin.adminCode,
    username: admin.username,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    mustChangePassword: admin.mustChangePassword,
    sessionId: session.id,
  };
});

/**
 * Gate for every admin page and action.
 *
 * An admin carrying `mustChangePassword` is allowed exactly one destination —
 * the password page — because until they change it, somebody else knows their
 * credential.
 */
export async function requireAdmin(options?: { allowPasswordChange?: boolean }): Promise<AdminIdentity> {
  const admin = await getAdminIdentity();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword && !options?.allowPasswordChange) {
    redirect("/admin/account/password");
  }
  return admin;
}

/** Gate for the admin-team pages: managing administrators is SUPER_ADMIN only. */
export async function requireSuperAdmin(): Promise<AdminIdentity> {
  const admin = await requireAdmin();
  if (admin.role !== "SUPER_ADMIN") redirect("/admin?denied=team");
  return admin;
}

export function isSuperAdmin(admin: { role: string } | null | undefined): boolean {
  return admin?.role === "SUPER_ADMIN";
}

// ---------------------------------------------------------------------------
// Sign-in bookkeeping
// ---------------------------------------------------------------------------

export function lockRemainingMs(admin: { lockedUntil: Date | null }): number {
  if (!admin.lockedUntil) return 0;
  return Math.max(0, admin.lockedUntil.getTime() - Date.now());
}

/** Records a failed attempt and locks the account once the threshold is hit. */
export async function recordFailedAdminLogin(adminId: string): Promise<void> {
  const admin = await prisma.adminUser.update({
    where: { id: adminId },
    data: { failedAttempts: { increment: 1 } },
    select: { failedAttempts: true },
  });
  if (admin.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    await prisma.adminUser.update({
      where: { id: adminId },
      data: { lockedUntil: new Date(Date.now() + LOCKOUT_MS) },
    });
  }
}

/** Clears the failure counter and stamps the successful sign-in. */
export async function recordSuccessfulAdminLogin(adminId: string): Promise<void> {
  await prisma.adminUser.update({
    where: { id: adminId },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: requestIp() ?? null,
    },
  });
}

/**
 * Deletes session rows that can no longer authenticate anybody. Safe to call
 * opportunistically; meant to be driven by a scheduled job in production.
 */
export async function pruneAdminSessions(olderThanDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 3600 * 1000);
  const { count } = await prisma.adminSession.deleteMany({
    where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] },
  });
  return count;
}

export { requestIp as adminRequestIp };
