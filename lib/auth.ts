import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "wf_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Marketplace roles only.
 *
 * Administrators are not users and have no role here — they live in AdminUser
 * and authenticate through lib/admin-auth.ts against a different cookie. That
 * means no session minted by this module can ever satisfy an admin check, no
 * matter what a payload claims.
 */
export type Role = "COMPANY" | "CONTRACTOR";
/** `tv` mirrors User.tokenVersion so revoked sessions can be detected. */
export type SessionPayload = { uid: string; role: Role; name: string; tv: number };

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set it in .env");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function destroySession(): void {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.uid || !payload.role) return null;
    return {
      uid: String(payload.uid),
      role: payload.role as Role,
      name: String(payload.name ?? ""),
      tv: Number(payload.tv ?? 0),
    };
  } catch {
    return null;
  }
}

/**
 * Full user record for the current session, or null.
 *
 * Memoised per request with React's `cache()`. Every protected route resolves
 * the user at least twice — the segment layout calls `requireRole()` and the
 * page then calls it again — and each of those was a separate query with the
 * profile relations joined. Against a database ~450ms away that doubled the
 * cost of loading any signed-in page for no benefit.
 *
 * The scope is one render pass, so this is not a stale-session risk: a
 * suspension or password change is still picked up on the very next request.
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    include: { companyProfile: true, contractorProfile: true },
  });
  if (!user || user.status === "SUSPENDED") return null;
  // Reject sessions issued before the last credential change / forced logout.
  if (user.tokenVersion !== session.tv) return null;
  // Belt and braces against legacy rows: administrators were once a role on
  // this table. Such an account can no longer sign in (the migration suspended
  // them), but if one were ever reactivated by hand it must still not resolve
  // to a marketplace user with an unhandled role.
  if (user.role !== "COMPANY" && user.role !== "CONTRACTOR") return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) redirect("/dashboard");
  return user;
}
