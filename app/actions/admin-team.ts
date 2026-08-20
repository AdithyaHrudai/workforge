"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  adminRequestIp,
  hashAdminPassword,
  requireSuperAdmin,
  revokeAllAdminSessions,
} from "@/lib/admin-auth";
import { adminCreateSchema, adminResetPasswordSchema } from "@/lib/validation";
import { checkbox, text } from "@/lib/forms";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { adminAudit } from "@/lib/notify";

/**
 * Managing the administrator team.
 *
 * Every action here is SUPER_ADMIN-only and every one of them is written to the
 * audit log, because this is the file that decides who can read other people's
 * statutory documents.
 *
 * Two invariants are enforced on every destructive path, in a transaction
 * rather than by reading first and writing second:
 *
 *   1. Nobody can revoke, demote or delete themselves. An admin who locks
 *      themselves out has not improved anybody's security.
 *   2. The platform always retains at least one active super admin. Without
 *      this, the last one leaving takes the ability to appoint a replacement
 *      with them, and the only remedy is shell access to the database.
 */

const LAST_SUPER_ADMIN =
  "This is the last active super admin. Appoint another one first — otherwise nobody can manage the admin team.";

/** Counts active super admins excluding `exceptId`, inside the caller's transaction. */
async function otherActiveSuperAdmins(
  tx: Prisma.TransactionClient,
  exceptId: string,
): Promise<number> {
  return tx.adminUser.count({
    where: { role: "SUPER_ADMIN", status: "ACTIVE", id: { not: exceptId } },
  });
}

/** Maps a unique-constraint violation onto the field the person actually typed. */
function duplicateFieldError(err: unknown): ActionState | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return null;
  const target = (err.meta?.target as string[] | string | undefined) ?? "";
  const fields = Array.isArray(target) ? target.join(",") : String(target);

  if (fields.includes("username")) {
    return {
      ok: false,
      error: "That username is already taken.",
      fieldErrors: { username: "Already in use" },
    };
  }
  if (fields.includes("adminCode")) {
    return {
      ok: false,
      error: "That admin ID is already assigned.",
      fieldErrors: { adminCode: "Already in use" },
    };
  }
  if (fields.includes("email")) {
    return {
      ok: false,
      error: "That email is already registered to an admin.",
      fieldErrors: { email: "Already in use" },
    };
  }
  return { ok: false, error: "Those details are already in use by another admin." };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createAdminAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireSuperAdmin();

  const parsed = adminCreateSchema.safeParse({
    adminCode: formData.get("adminCode"),
    username: formData.get("username"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
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

  const d = parsed.data;
  // Default on, and shown as a ticked box: whoever creates the account has just
  // typed the password themselves, so until it is changed, two people know it.
  const mustChangePassword = checkbox(formData, "mustChangePassword");

  try {
    const created = await prisma.adminUser.create({
      data: {
        adminCode: d.adminCode,
        username: d.username,
        name: d.name,
        email: d.email,
        role: d.role,
        passwordHash: await hashAdminPassword(d.password),
        mustChangePassword,
        createdById: actor.id,
      },
      select: { id: true, adminCode: true, username: true, role: true },
    });

    await adminAudit(
      actor,
      "ADMIN_CREATE",
      `${created.adminCode} (${created.username}) as ${created.role}`,
      adminRequestIp(),
    );
  } catch (err) {
    const duplicate = duplicateFieldError(err);
    if (duplicate) return duplicate;
    throw err;
  }

  revalidatePath("/admin/team");
  return {
    ok: true,
    message: `${d.name} can now sign in as ${d.username}. Give them the password in person or over a channel you trust — it is not stored anywhere in readable form and cannot be shown again.`,
  };
}

// ---------------------------------------------------------------------------
// Access: revoke and restore
// ---------------------------------------------------------------------------

export async function setAdminAccessAction(formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const revoke = text(formData, "revoke") === "true";
  if (!id || id === actor.id) return; // no self-revocation

  const result = await prisma.$transaction(async (tx) => {
    const target = await tx.adminUser.findUnique({
      where: { id },
      select: { id: true, adminCode: true, username: true, role: true, status: true },
    });
    if (!target) return null;

    if (revoke && target.role === "SUPER_ADMIN") {
      if ((await otherActiveSuperAdmins(tx, target.id)) === 0) return null;
    }

    await tx.adminUser.update({
      where: { id: target.id },
      data: {
        status: revoke ? "REVOKED" : "ACTIVE",
        // Restoring also clears a lockout — otherwise a reinstated admin may
        // still be unable to sign in for reasons nobody remembers.
        ...(revoke ? {} : { failedAttempts: 0, lockedUntil: null }),
      },
    });
    return target;
  });

  if (!result) return;

  // Revocation only means anything if the sessions they already hold die with
  // it. Done outside the transaction so a slow sweep cannot hold the row lock.
  if (revoke) await revokeAllAdminSessions(result.id);

  await adminAudit(
    actor,
    revoke ? "ADMIN_REVOKE" : "ADMIN_RESTORE",
    `${result.adminCode} (${result.username})`,
    adminRequestIp(),
  );
  revalidatePath("/admin/team");
}

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

export async function setAdminRoleAction(formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const role = text(formData, "role");
  if (!id || id === actor.id) return; // no self-demotion
  if (role !== "SUPER_ADMIN" && role !== "VERIFIER") return;

  const target = await prisma.$transaction(async (tx) => {
    const found = await tx.adminUser.findUnique({
      where: { id },
      select: { id: true, adminCode: true, username: true, role: true, status: true },
    });
    if (!found || found.role === role) return null;

    if (found.role === "SUPER_ADMIN" && found.status === "ACTIVE") {
      if ((await otherActiveSuperAdmins(tx, found.id)) === 0) return null;
    }

    await tx.adminUser.update({ where: { id: found.id }, data: { role } });
    return found;
  });

  if (!target) return;

  await adminAudit(
    actor,
    "ADMIN_ROLE_CHANGE",
    `${target.adminCode} (${target.username}) ${target.role} → ${role}`,
    adminRequestIp(),
  );
  revalidatePath("/admin/team");
}

// ---------------------------------------------------------------------------
// Password reset by a super admin
// ---------------------------------------------------------------------------

export async function resetAdminPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireSuperAdmin();

  const parsed = adminResetPasswordSchema.safeParse({
    adminId: formData.get("adminId"),
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

  const target = await prisma.adminUser.findUnique({
    where: { id: parsed.data.adminId },
    select: { id: true, name: true, adminCode: true, username: true },
  });
  if (!target) return { ok: false, error: "That admin no longer exists." };

  // Resetting your own password through this path would skip the current-password
  // check on the account page, so it is refused outright.
  if (target.id === actor.id) {
    return { ok: false, error: "Change your own password from your account page." };
  }

  await prisma.adminUser.update({
    where: { id: target.id },
    data: {
      passwordHash: await hashAdminPassword(parsed.data.password),
      // Somebody other than the account holder now knows this password.
      mustChangePassword: true,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });
  await revokeAllAdminSessions(target.id);

  await adminAudit(
    actor,
    "ADMIN_PASSWORD_RESET",
    `${target.adminCode} (${target.username})`,
    adminRequestIp(),
  );
  revalidatePath("/admin/team");
  return {
    ok: true,
    message: `New password set for ${target.name}. Their existing sessions have been ended and they must change it when they next sign in.`,
  };
}

// ---------------------------------------------------------------------------
// Force sign-out
// ---------------------------------------------------------------------------

export async function forceAdminLogoutAction(formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  if (!id) return;

  const target = await prisma.adminUser.findUnique({
    where: { id },
    select: { adminCode: true, username: true },
  });
  if (!target) return;

  const count = await revokeAllAdminSessions(id);
  await adminAudit(
    actor,
    "ADMIN_SESSION_REVOKE",
    `${target.adminCode} (${target.username}) — ${count} session${count === 1 ? "" : "s"} ended`,
    adminRequestIp(),
  );
  revalidatePath("/admin/team");
}

// ---------------------------------------------------------------------------
// Deletion
// ---------------------------------------------------------------------------

/**
 * Permanently removes an admin account.
 *
 * Only a revoked account can be deleted. Revocation is instant and complete, so
 * there is no situation where deletion is the urgent option — requiring the
 * revoke first makes an irreversible action deliberate, and gives the platform
 * a record that access ended before the account did.
 *
 * The audit trail survives: AuditLog.adminId is SetNull and every admin entry
 * carries the actor's name and code frozen at write time.
 */
export async function deleteAdminAction(formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  if (!id || id === actor.id) return;

  const target = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, adminCode: true, username: true, name: true, status: true },
  });
  if (!target || target.status !== "REVOKED") return;

  await prisma.adminUser.delete({ where: { id: target.id } });
  await adminAudit(
    actor,
    "ADMIN_DELETE",
    `${target.adminCode} (${target.username}) — ${target.name}`,
    adminRequestIp(),
  );
  revalidatePath("/admin/team");
}
