import { prisma } from "@/lib/db";
import { sendEmail, shouldEmail, subjectFor } from "@/lib/email";

/**
 * Creates a notification and, for the types worth interrupting someone over,
 * emails it as well.
 *
 * Both concerns live here because every caller already funnels through this one
 * function — putting delivery at the twelve call sites would guarantee they
 * drift apart. The in-app row is the durable record; the email is best-effort
 * and its failure is logged, never thrown, so a provider outage cannot roll back
 * the action that triggered it.
 */
export async function notify(params: {
  userId: string;
  type: string;
  body: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      body: params.body,
      link: params.link,
    },
  });

  // Skipped entirely when no provider is configured, so this costs nothing —
  // not even the user lookup — in development and in the test suites.
  if (!shouldEmail(params.type)) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") return;

    await sendEmail({
      to: user.email,
      subject: subjectFor(params.type),
      body: params.body,
      link: params.link,
    });
  } catch (err) {
    console.error("[notify] email delivery failed:", err);
  }
}

/** Records an action taken by a marketplace user (company or contractor). */
export async function audit(actorId: string, action: string, detail?: string) {
  await prisma.auditLog.create({
    data: { actorId, actorType: "USER", action, detail },
  });
}

/**
 * Records an action taken by an administrator.
 *
 * The actor's name and staff code are frozen into `actorLabel` at write time
 * rather than left to a join. An admin account can be deleted; the record of
 * what they approved, rejected or looked at must survive them, and must still
 * name them.
 *
 * Failures are swallowed. That is the right trade for this call site
 * specifically: the audit row is written *after* the action it describes has
 * already committed, so throwing here would surface as an error on an
 * operation that in fact succeeded, and would tell the admin to retry something
 * they should not repeat. A dropped row is logged loudly instead.
 */
export async function adminAudit(
  admin: { id: string; name: string; adminCode: string },
  action: string,
  detail?: string,
  ip?: string | null,
) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        actorType: "ADMIN",
        actorLabel: `${admin.name} (${admin.adminCode})`,
        action,
        detail,
        ip: ip ?? undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record admin action", action, err);
  }
}

/**
 * Records something that happened with no signed-in actor — a failed sign-in
 * at the admin console, most importantly, which by definition has no session.
 */
export async function systemAudit(
  action: string,
  detail?: string,
  ip?: string | null,
) {
  try {
    await prisma.auditLog.create({
      data: { actorType: "SYSTEM", action, detail, ip: ip ?? undefined },
    });
  } catch (err) {
    console.error("[audit] failed to record system action", action, err);
  }
}
