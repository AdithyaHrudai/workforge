import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-auth";
import {
  deleteAdminAction,
  forceAdminLogoutAction,
  setAdminAccessAction,
  setAdminRoleAction,
} from "@/app/actions/admin-team";
import { CreateAdminForm } from "@/components/admin/CreateAdminForm";
import { ResetAdminPasswordForm } from "@/components/admin/ResetAdminPasswordForm";
import { PageHeader, StatCard } from "@/components/ui";
import { Notice } from "@/components/Badge";
import { formatDateTime, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin team" };

/**
 * Who can get into this console.
 *
 * Super admin only, and the single place where admin accounts are created,
 * suspended, re-enabled or removed. The guardrails that matter are enforced in
 * the actions, not here — this page only declines to *offer* what the actions
 * would refuse, so the UI never dangles a button that does nothing.
 */

/** Suggests the next free code in the WF-ADM-NNN series. */
function nextAdminCode(existing: string[]): string {
  const numbers = existing
    .map((code) => /^WF-ADM-(\d+)$/.exec(code)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  return `WF-ADM-${String(next).padStart(3, "0")}`;
}

export default async function AdminTeamPage() {
  const actor = await requireSuperAdmin();

  const admins = await prisma.adminUser.findMany({
    orderBy: [{ status: "asc" }, { adminCode: "asc" }],
    select: {
      id: true,
      adminCode: true,
      username: true,
      name: true,
      email: true,
      role: true,
      status: true,
      mustChangePassword: true,
      lastLoginAt: true,
      lastLoginIp: true,
      lockedUntil: true,
      createdAt: true,
      createdBy: { select: { name: true, adminCode: true } },
      _count: { select: { sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } } } },
    },
  });

  const activeSupers = admins.filter((a) => a.role === "SUPER_ADMIN" && a.status === "ACTIVE");
  const activeCount = admins.filter((a) => a.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin team"
        subtitle="Every account that can sign in to this console. Creating, revoking and removing administrators is restricted to super admins, and every change here is written to the audit log."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Administrators" value={admins.length} />
        <StatCard label="Active" value={activeCount} hint="Able to sign in right now" />
        <StatCard
          label="Super admins"
          value={activeSupers.length}
          hint="Can manage this team"
        />
      </div>

      {activeSupers.length === 1 && (
        <Notice tone="warning">
          <strong>{activeSupers[0].name}</strong> is the only active super admin.
          If that account is lost, nobody can appoint administrators without
          direct database access. Appoint a second one.
        </Notice>
      )}

      <CreateAdminForm suggestedCode={nextAdminCode(admins.map((a) => a.adminCode))} />

      <section className="card-flush overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="font-semibold text-slate-900">Current administrators</h2>
          <p className="text-sm text-slate-500">
            Revoking access ends every session the person is holding, immediately.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="table min-w-[60rem]">
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Access</th>
                <th>Last sign-in</th>
                <th>Added</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const isSelf = a.id === actor.id;
                const revoked = a.status === "REVOKED";
                const locked = a.lockedUntil != null && a.lockedUntil.getTime() > Date.now();
                // Offering these on the last active super admin would be
                // offering a button the action refuses to honour.
                const isLastSuper =
                  a.role === "SUPER_ADMIN" && a.status === "ACTIVE" && activeSupers.length === 1;

                return (
                  <tr key={a.id} className={revoked ? "bg-slate-50" : undefined}>
                    <td>
                      <span className="font-medium text-slate-800">{a.name}</span>
                      {isSelf && <span className="ml-2 chip">you</span>}
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {a.adminCode} · {a.username}
                      </span>
                      <span className="block break-all text-xs text-slate-400">{a.email}</span>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          a.role === "SUPER_ADMIN"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {a.role === "SUPER_ADMIN" ? "Super admin" : "Verifier"}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <span
                          className={`badge ${
                            revoked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          }`}
                        >
                          {revoked ? "Revoked" : "Active"}
                        </span>
                        {locked && (
                          <span className="badge bg-amber-100 text-amber-800">Locked out</span>
                        )}
                        {a.mustChangePassword && (
                          <span className="badge bg-amber-100 text-amber-800">
                            Password change due
                          </span>
                        )}
                        {a._count.sessions > 0 && (
                          <span className="badge bg-sky-100 text-sky-700">
                            {a._count.sessions} live session
                            {a._count.sessions === 1 ? "" : "s"}
                          </span>
                        )}
                      </span>
                    </td>

                    <td className="text-xs text-slate-600">
                      {a.lastLoginAt ? (
                        <>
                          <span className="block">{formatDateTime(a.lastLoginAt)}</span>
                          <span className="block text-slate-400">
                            {timeAgo(a.lastLoginAt)}
                            {a.lastLoginIp ? ` · ${a.lastLoginIp}` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">Never signed in</span>
                      )}
                    </td>

                    <td className="text-xs text-slate-600">
                      <span className="block">{formatDateTime(a.createdAt)}</span>
                      {a.createdBy && (
                        <span className="block text-slate-400">by {a.createdBy.name}</span>
                      )}
                    </td>

                    <td>
                      {isSelf ? (
                        <p className="text-right text-xs text-slate-400">
                          Manage your own account from
                          <br />
                          My account
                        </p>
                      ) : (
                        <div className="flex flex-col items-end gap-1.5">
                          <form action={setAdminAccessAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="revoke" value={revoked ? "false" : "true"} />
                            <button
                              type="submit"
                              disabled={isLastSuper}
                              title={
                                isLastSuper
                                  ? "Appoint another super admin before revoking this one"
                                  : undefined
                              }
                              className={revoked ? "btn-secondary btn-sm" : "btn-danger btn-sm"}
                            >
                              {revoked ? "Restore access" : "Revoke access"}
                            </button>
                          </form>

                          {!revoked && (
                            <>
                              <form action={setAdminRoleAction}>
                                <input type="hidden" name="id" value={a.id} />
                                <input
                                  type="hidden"
                                  name="role"
                                  value={a.role === "SUPER_ADMIN" ? "VERIFIER" : "SUPER_ADMIN"}
                                />
                                <button
                                  type="submit"
                                  disabled={isLastSuper}
                                  className="btn-secondary btn-sm"
                                >
                                  {a.role === "SUPER_ADMIN"
                                    ? "Make verifier"
                                    : "Make super admin"}
                                </button>
                              </form>

                              {a._count.sessions > 0 && (
                                <form action={forceAdminLogoutAction}>
                                  <input type="hidden" name="id" value={a.id} />
                                  <button type="submit" className="btn-ghost btn-sm">
                                    Sign them out
                                  </button>
                                </form>
                              )}
                            </>
                          )}

                          {revoked && (
                            <form action={deleteAdminAction}>
                              <input type="hidden" name="id" value={a.id} />
                              <button
                                type="submit"
                                className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                              >
                                Delete permanently
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ResetAdminPasswordForm
        admins={admins
          .filter((a) => a.id !== actor.id)
          .map((a) => ({
            id: a.id,
            label: `${a.name} — ${a.adminCode} (${a.username})`,
          }))}
      />

      <p className="text-xs text-slate-400">
        An account must be revoked before it can be deleted, so that access always
        ends before the record does. Deleting an administrator never deletes what
        they did: audit entries keep their name and staff ID, recorded at the time
        of each action.
      </p>
    </div>
  );
}
