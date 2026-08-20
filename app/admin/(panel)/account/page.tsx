import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { adminRevokeOwnSessionAction } from "@/app/actions/admin-auth";
import { DefinitionList, InfoRow, PageHeader } from "@/components/ui";
import { formatDateTime, timeAgo, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My account" };

/**
 * An admin's own account.
 *
 * The live session list is the useful part: an ops console signed in on a
 * machine somebody no longer has is exactly the exposure this table makes
 * visible, and the button beside each row is the fix.
 */
export default async function AdminAccountPage() {
  const admin = await requireAdmin();

  const [record, sessions] = await Promise.all([
    prisma.adminUser.findUnique({
      where: { id: admin.id },
      select: {
        adminCode: true,
        username: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdBy: { select: { name: true, adminCode: true } },
      },
    }),
    prisma.adminSession.findMany({
      where: { adminId: admin.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, ip: true, userAgent: true, createdAt: true, lastSeenAt: true, expiresAt: true },
    }),
  ]);

  if (!record) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My account"
        subtitle="Your identity in this console, your password, and every browser currently signed in as you."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-900">Identity</h2>
          <DefinitionList>
            <InfoRow label="Name">{record.name}</InfoRow>
            <InfoRow label="Admin ID">{record.adminCode}</InfoRow>
            <InfoRow label="Username">{record.username}</InfoRow>
            <InfoRow label="Email">
              <span className="break-all">{record.email}</span>
            </InfoRow>
            <InfoRow label="Access level">
              {record.role === "SUPER_ADMIN" ? "Super admin" : "Verifier"}
            </InfoRow>
            <InfoRow label="Account created">{formatDateTime(record.createdAt)}</InfoRow>
            {record.createdBy && (
              <InfoRow label="Issued by">
                {record.createdBy.name} ({record.createdBy.adminCode})
              </InfoRow>
            )}
            <InfoRow label="Last sign-in">
              {record.lastLoginAt ? formatDateTime(record.lastLoginAt) : "—"}
              {record.lastLoginIp ? ` · ${record.lastLoginIp}` : ""}
            </InfoRow>
          </DefinitionList>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Your name, admin ID, username, email and access level can only be
            changed by a super admin.
          </p>
        </section>

        <section className="card">
          <h2 className="mb-2 font-semibold text-slate-900">Password</h2>
          <p className="mb-4 text-sm text-slate-500">
            Changing it signs out every other browser you are signed in on.
          </p>
          <Link href="/admin/account/password" className="btn-primary w-full">
            Change password
          </Link>
        </section>
      </div>

      <section className="card-flush overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="font-semibold text-slate-900">Signed-in devices ({sessions.length})</h2>
          <p className="text-sm text-slate-500">
            Anything here you do not recognise should be signed out now, and then
            reported — your password may be known to somebody else.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="table min-w-[42rem]">
            <thead>
              <tr>
                <th>Device</th>
                <th>Signed in</th>
                <th>Last active</th>
                <th>Expires</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const current = s.id === admin.sessionId;
                return (
                  <tr key={s.id} className={current ? "bg-brand-50/40" : undefined}>
                    <td>
                      <span className="font-medium text-slate-800">{s.ip ?? "unknown address"}</span>
                      {current && <span className="ml-2 chip">this browser</span>}
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {s.userAgent ? truncate(s.userAgent, 70) : "unknown browser"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-600">
                      {formatDateTime(s.createdAt)}
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-600">
                      {timeAgo(s.lastSeenAt)}
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-600">
                      {formatDateTime(s.expiresAt)}
                    </td>
                    <td className="text-right">
                      <form action={adminRevokeOwnSessionAction}>
                        <input type="hidden" name="sessionId" value={s.id} />
                        <button type="submit" className="btn-secondary btn-sm">
                          {current ? "Sign out here" : "Sign out"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
