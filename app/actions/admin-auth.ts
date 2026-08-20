"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  DUMMY_ADMIN_HASH,
  LOCKOUT_MS,
  MAX_FAILED_ATTEMPTS,
  adminRequestIp,
  createAdminSession,
  destroyAdminSession,
  getAdminIdentity,
  hashAdminPassword,
  lockRemainingMs,
  recordFailedAdminLogin,
  recordSuccessfulAdminLogin,
  requireAdmin,
  revokeAllAdminSessions,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { adminChangePasswordSchema, adminLoginSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { adminAudit, systemAudit } from "@/lib/notify";
import { RATE_LIMITS, clientIp, rateLimit, retryMessage } from "@/lib/ratelimit";

/**
 * Sign-in, sign-out and password change for the admin console.
 *
 * One rule runs through all of it: the form never explains *why* a sign-in
 * failed. Wrong username, wrong password, revoked account and locked account
 * all produce the same sentence, because each distinct message is a free answer
 * to somebody who does not have the credential. The real reason goes to the
 * audit log, where an administrator can read it and the person at the keyboard
 * cannot.
 */

const GENERIC_FAILURE = "Those credentials were not accepted.";

function minutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60000));
}

export async function adminLoginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = adminLoginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Enter your username and password.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const { identifier, password } = parsed.data;
  const ip = adminRequestIp() ?? null;

  // Two buckets, as on the marketplace login: one stops a single source
  // grinding through usernames, the other stops many sources grinding at one.
  const [byIp, byName] = await Promise.all([
    rateLimit(`admin-login:ip:${clientIp()}`, RATE_LIMITS.adminLoginByIp),
    rateLimit(`admin-login:user:${identifier}`, RATE_LIMITS.adminLoginByUsername),
  ]);
  if (!byIp.ok || !byName.ok) {
    await systemAudit("ADMIN_LOGIN_THROTTLED", `identifier=${identifier}`, ip);
    return {
      ok: false,
      error: `Too many sign-in attempts. ${retryMessage(Math.max(byIp.retryAfter, byName.retryAfter))}`,
    };
  }

  // Username or email. Both columns are unique and a username cannot contain
  // '@', so this matches at most one row.
  const admin = await prisma.adminUser.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });

  // Always verify a hash, even when there is no such account, so that a miss
  // and a hit take the same time.
  const passwordOk = await verifyAdminPassword(password, admin?.passwordHash ?? DUMMY_ADMIN_HASH);

  if (!admin) {
    await systemAudit("ADMIN_LOGIN_FAILED", `unknown identifier=${identifier}`, ip);
    return { ok: false, error: GENERIC_FAILURE };
  }

  const lockedFor = lockRemainingMs(admin);
  if (lockedFor > 0) {
    await systemAudit(
      "ADMIN_LOGIN_BLOCKED",
      `${admin.username} locked for a further ${minutes(lockedFor)}m`,
      ip,
    );
    return { ok: false, error: GENERIC_FAILURE };
  }

  if (admin.status !== "ACTIVE") {
    await systemAudit("ADMIN_LOGIN_BLOCKED", `${admin.username} is ${admin.status}`, ip);
    return { ok: false, error: GENERIC_FAILURE };
  }

  if (!passwordOk) {
    await recordFailedAdminLogin(admin.id);
    const attempts = admin.failedAttempts + 1;
    await systemAudit(
      "ADMIN_LOGIN_FAILED",
      attempts >= MAX_FAILED_ATTEMPTS
        ? `${admin.username} — wrong password, account locked for ${minutes(LOCKOUT_MS)}m`
        : `${admin.username} — wrong password (${attempts}/${MAX_FAILED_ATTEMPTS})`,
      ip,
    );
    return { ok: false, error: GENERIC_FAILURE };
  }

  // A password that was correct at some point during a lockout still does not
  // get in; the checks above have already returned. From here it is a genuine
  // success, so the failure counter resets and any stale sessions are left
  // alone — an admin may legitimately be signed in on two machines.
  await recordSuccessfulAdminLogin(admin.id);
  await createAdminSession(admin.id);
  await adminAudit(admin, "ADMIN_LOGIN", `username=${admin.username}`, ip);

  redirect(admin.mustChangePassword ? "/admin/account/password" : "/admin");
}

export async function adminLogoutAction(): Promise<void> {
  const admin = await getAdminIdentity();
  if (admin) {
    await adminAudit(admin, "ADMIN_LOGOUT", `username=${admin.username}`, adminRequestIp());
  }
  await destroyAdminSession();
  redirect("/admin/login");
}

/**
 * An admin changing their own password.
 *
 * Every other session for the account is terminated. If the reason for the
 * change is that the credential leaked, leaving the other sessions alive would
 * defeat the whole exercise.
 */
export async function adminChangePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // allowPasswordChange, or an admin forced to rotate could never reach the one
  // page they are permitted to use.
  const identity = await requireAdmin({ allowPasswordChange: true });

  const parsed = adminChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const admin = await prisma.adminUser.findUnique({ where: { id: identity.id } });
  if (!admin) redirect("/admin/login");

  const ok = await verifyAdminPassword(parsed.data.currentPassword, admin.passwordHash);
  if (!ok) {
    await systemAudit(
      "ADMIN_PASSWORD_CHANGE_FAILED",
      `${admin.username} — wrong current password`,
      adminRequestIp(),
    );
    return {
      ok: false,
      error: "That is not your current password.",
      fieldErrors: { currentPassword: "Incorrect" },
    };
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      passwordHash: await hashAdminPassword(parsed.data.password),
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  // Kill everything, then re-issue for the browser doing the changing, so the
  // admin is not signed out of the very session they are working in.
  await revokeAllAdminSessions(admin.id);
  await createAdminSession(admin.id);
  await adminAudit(admin, "ADMIN_PASSWORD_CHANGE", "self", adminRequestIp());

  revalidatePath("/admin/account");
  redirect("/admin?passwordChanged=1");
}

/** Ends one of the admin's own live sessions from the account page. */
export async function adminRevokeOwnSessionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return;

  // Scoped to the caller's own sessions — an id from another account is simply
  // not matched rather than being an error worth reporting.
  const { count } = await prisma.adminSession.updateMany({
    where: { id: sessionId, adminId: admin.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) return;

  await adminAudit(admin, "ADMIN_SESSION_REVOKE", "self", adminRequestIp());

  // Signing out the session you are currently using is a legitimate thing to
  // ask for; honour it by clearing the cookie too.
  if (sessionId === admin.sessionId) {
    await destroyAdminSession();
    redirect("/admin/login");
  }
  revalidatePath("/admin/account");
}
