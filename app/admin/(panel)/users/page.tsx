import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { adminRequestIp, requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { adminAudit } from "@/lib/notify";
import { setUserSuspended } from "@/app/actions/admin";
import { StatusBadge, VerifiedBadge } from "@/components/Badge";
import { EmptyState, PageHeader, Pagination, StatCard } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Users" };

const PAGE_SIZE = 50;
// Marketplace roles only. Administrators are not users and are listed on
// /admin/team, which is super-admin-only — an ops tool that quietly mixed staff
// accounts in with customers would let any verifier enumerate the admin team.
const ROLES = ["ALL", "COMPANY", "CONTRACTOR"];
const STATUSES = ["ALL", "ACTIVE", "SUSPENDED"];

/**
 * Every account on the platform, in one place.
 *
 * The moderation queues are organised by *profile* — pending contractors,
 * pending companies — which means an account with no profile yet, or one whose
 * profile was rejected, was effectively invisible. This is the account-level
 * view: it always lists the user row, and links to the profile when one exists.
 *
 * Searching here is itself recorded in the audit log. An oversight tool that
 * exposes everyone's contact details should leave a trail of its own use — see
 * the ADMIN_VIEW_USER entries on /admin/audit.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const admin = await requireAdmin();

  const one = (key: string): string => {
    const v = searchParams[key];
    const s = Array.isArray(v) ? v[0] : v;
    return s?.trim() ?? "";
  };

  const q = one("q");
  const role = ROLES.includes(one("role").toUpperCase()) ? one("role").toUpperCase() : "ALL";
  const status = STATUSES.includes(one("status").toUpperCase())
    ? one("status").toUpperCase()
    : "ALL";
  const pageRaw = Number(one("page") || 1);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const and: Prisma.UserWhereInput[] = [
    // Never surface a legacy role=ADMIN row here, whatever the filter says.
    { role: { in: ["COMPANY", "CONTRACTOR"] } },
  ];
  if (role !== "ALL") and.push({ role });
  if (status !== "ALL") and.push({ status });
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { mobile: { contains: q } },
        { companyProfile: { companyName: { contains: q, mode: "insensitive" } } },
        { contractorProfile: { firmName: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  const where: Prisma.UserWhereInput = and.length > 0 ? { AND: and } : {};

  const [total, users, counts] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        mobileVerified: true,
        role: true,
        status: true,
        createdAt: true,
        companyProfile: { select: { id: true, companyName: true, status: true, verified: true } },
        contractorProfile: {
          select: { id: true, firmName: true, status: true, verified: true },
        },
      },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
  ]);

  // A search that returns people is a personal-data access. Browsing the
  // unfiltered first page is not, so it isn't logged — that would bury the
  // meaningful entries in noise.
  if (q) {
    await adminAudit(admin, "ADMIN_VIEW_USER", `search="${q}" matched=${total}`, adminRequestIp());
  }

  const byRole = Object.fromEntries(counts.map((c) => [c.role, c._count.role]));
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value == null) continue;
    for (const v of Array.isArray(value) ? value : [value]) if (v) urlParams.append(key, v);
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        subtitle="Every registered account, including those without a completed profile. Searches here are recorded in the audit log."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total accounts" value={formatNumber(total)} />
        <StatCard
          label="Companies"
          value={formatNumber(byRole.COMPANY ?? 0)}
          href="/admin/users?role=COMPANY"
        />
        <StatCard
          label="Contractors"
          value={formatNumber(byRole.CONTRACTOR ?? 0)}
          href="/admin/users?role=CONTRACTOR"
        />
        <StatCard
          label="With a profile"
          value={formatNumber((byRole.COMPANY ?? 0) + (byRole.CONTRACTOR ?? 0))}
          hint="Administrators are listed separately"
        />
      </div>

      <form method="get" action="/admin/users" className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_10rem_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              className="input"
              placeholder="Name, email, mobile, firm or company"
            />
          </div>
          <div>
            <label className="label" htmlFor="role">
              Role
            </label>
            <select id="role" name="role" className="input" defaultValue={role}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r === "ALL" ? "Any role" : r.charAt(0) + r.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" className="input" defaultValue={status}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "Any status" : s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </div>
      </form>

      <p className="text-sm text-slate-500">
        {total === 0
          ? "No accounts match"
          : `Showing ${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)} account${total === 1 ? "" : "s"}`}
      </p>

      {users.length === 0 ? (
        <EmptyState
          title="No accounts match"
          description="Try a different search, or clear the role and status filters."
          action={
            <Link href="/admin/users" className="btn-secondary">
              Clear filters
            </Link>
          }
        />
      ) : (
        <div className="card-flush overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table min-w-[52rem]">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Contact</th>
                  <th>Profile</th>
                  <th>Joined</th>
                  <th className="text-right">Access</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const profile = user.companyProfile ?? user.contractorProfile;
                  const profileName =
                    user.companyProfile?.companyName ?? user.contractorProfile?.firmName;
                  const profileHref = user.contractorProfile
                    ? `/admin/contractors/${user.contractorProfile.id}`
                    : user.companyProfile
                      ? `/admin/companies/${user.companyProfile.id}`
                      : null;
                  const suspended = user.status === "SUSPENDED";

                  return (
                    <tr key={user.id} className={suspended ? "bg-red-50/50" : undefined}>
                      <td>
                        <span className="font-medium text-slate-800">{user.name}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="chip">{user.role.toLowerCase()}</span>
                          {suspended && (
                            <span className="badge bg-red-100 text-red-800">Suspended</span>
                          )}
                        </span>
                      </td>
                      <td className="text-slate-600">
                        <span className="block break-all">{user.email}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {user.mobile ?? "no mobile"}
                          {user.mobile && !user.mobileVerified && " · unverified"}
                        </span>
                      </td>
                      <td>
                        {profile ? (
                          <>
                            {profileHref ? (
                              <Link
                                href={profileHref}
                                className="font-medium text-brand-700 hover:underline"
                              >
                                {profileName}
                              </Link>
                            ) : (
                              <span className="text-slate-700">{profileName}</span>
                            )}
                            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <StatusBadge status={profile.status} />
                              {profile.verified && <VerifiedBadge />}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400">No profile yet</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-slate-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="text-right">
                        <form action={setUserSuspended}>
                          <input type="hidden" name="id" value={user.id} />
                          <input
                            type="hidden"
                            name="suspend"
                            value={suspended ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className={suspended ? "btn-secondary btn-sm" : "btn-danger btn-sm"}
                          >
                            {suspended ? "Reactivate" : "Suspend"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} pageCount={pageCount(total)} baseHref="/admin/users" params={urlParams} />

      <p className="text-xs text-slate-400">
        Suspending an account bumps its token version, which invalidates every session it already
        holds rather than waiting for the cookie to expire.
      </p>
    </div>
  );
}

function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
