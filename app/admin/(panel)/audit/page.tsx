import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import {
  AUDIT_ACTION_GROUPS,
  AUDIT_PAGE_SIZE,
  PRIVACY_SENSITIVE_ACTIONS,
  SECURITY_ACTIONS,
  auditActivitySummary,
  describeAuditActor,
  parseAuditQuery,
  searchAuditLog,
} from "@/lib/audit";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Audit log" };

/**
 * The audit trail.
 *
 * Everything privileged that happens on the platform is written here by
 * `audit()`; until now nothing read it back beyond a ten-row preview on the
 * overview. This is the page you open when someone asks "who approved this
 * firm", "who looked at that person's record", or "what changed last Tuesday".
 *
 * Entries are append-only and there is deliberately no delete: a log an admin
 * can edit is not evidence of anything.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requireAdmin();

  const query = parseAuditQuery(searchParams);
  const [{ entries, total, page, pageCount }, summary] = await Promise.all([
    searchAuditLog(query),
    auditActivitySummary(7),
  ]);

  // Preserved across pagination so a filtered investigation survives paging.
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value == null) continue;
    for (const v of Array.isArray(value) ? value : [value]) if (v) urlParams.append(key, v);
  }

  const activeFilters =
    (query.action ? 1 : 0) +
    (query.role ? 1 : 0) +
    (query.q ? 1 : 0) +
    (query.from ? 1 : 0) +
    (query.to ? 1 : 0) +
    (query.actorId ? 1 : 0) +
    (query.adminId ? 1 : 0);

  const from = total === 0 ? 0 : (page - 1) * AUDIT_PAGE_SIZE + 1;
  const to = Math.min(page * AUDIT_PAGE_SIZE, total);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        subtitle="Every privileged action on the platform, append-only. Filter by who did it, what they did, or when."
      />

      {summary.length > 0 && (
        <section className="card">
          <h2 className="section-title mb-3">Last 7 days</h2>
          <div className="flex flex-wrap gap-2">
            {summary.map((s) => (
              <Link
                key={s.action}
                href={`/admin/audit?action=${encodeURIComponent(s.action)}`}
                className={`chip hover:bg-slate-200 ${
                  PRIVACY_SENSITIVE_ACTIONS.includes(s.action)
                    ? "bg-forge-100 text-forge-800 hover:bg-forge-200"
                    : ""
                }`}
              >
                {s.action}
                <span className="ml-1 font-bold">{formatNumber(s.count)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <form method="get" action="/admin/audit" className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={query.q ?? ""}
              className="input"
              placeholder="Person, email, or record id"
            />
          </div>

          <div>
            <label className="label" htmlFor="action">
              Action
            </label>
            <select id="action" name="action" className="input" defaultValue={query.action ?? ""}>
              <option value="">Any action</option>
              {AUDIT_ACTION_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.actions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="from">
              From
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={query.from ?? ""}
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="to">
              To
            </label>
            <input id="to" name="to" type="date" defaultValue={query.to ?? ""} className="input" />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-48">
            <label className="label" htmlFor="role">
              Actor role
            </label>
            <select id="role" name="role" className="input" defaultValue={query.role ?? ""}>
              <option value="">Anyone</option>
              <option value="ADMIN">Administrator</option>
              <option value="COMPANY">Company</option>
              <option value="CONTRACTOR">Contractor</option>
              <option value="SYSTEM">Unauthenticated / system</option>
            </select>
          </div>

          {query.actorId && <input type="hidden" name="actorId" value={query.actorId} />}
          {query.adminId && <input type="hidden" name="adminId" value={query.adminId} />}

          <button type="submit" className="btn-primary">
            Apply
          </button>
          {activeFilters > 0 && (
            <Link href="/admin/audit" className="btn-secondary">
              Clear ({activeFilters})
            </Link>
          )}
        </div>
      </form>

      <p className="text-sm text-slate-500">
        {total === 0
          ? "No entries match"
          : `Showing ${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)} entr${total === 1 ? "y" : "ies"}`}
      </p>

      {entries.length === 0 ? (
        <EmptyState
          title="No audit entries match"
          description="Widen the date range, or clear the action filter."
          action={
            <Link href="/admin/audit" className="btn-secondary">
              Clear filters
            </Link>
          }
        />
      ) : (
        <div className="card-flush overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table min-w-[46rem]">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const sensitive = PRIVACY_SENSITIVE_ACTIONS.includes(entry.action);
                  const security = SECURITY_ACTIONS.includes(entry.action);
                  const who = describeAuditActor(entry);
                  return (
                    <tr
                      key={entry.id}
                      className={
                        security ? "bg-red-50/50" : sensitive ? "bg-forge-50/50" : undefined
                      }
                    >
                      <td className="whitespace-nowrap text-slate-600">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td>
                        {who.filterHref ? (
                          <Link
                            href={who.filterHref}
                            className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
                          >
                            {who.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-800">{who.name}</span>
                        )}
                        <span className="mt-0.5 block text-xs text-slate-500">{who.detail}</span>
                        {entry.ip && (
                          <span className="block text-xs text-slate-400">{entry.ip}</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            security
                              ? "bg-red-100 text-red-800"
                              : sensitive
                                ? "bg-forge-100 text-forge-800"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="max-w-md break-words text-slate-600">
                        {entry.detail ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} baseHref="/admin/audit" params={urlParams} />

      <p className="text-xs text-slate-400">
        Amber rows record an administrator reading someone&apos;s personal data or
        opening a document; red rows record access that was refused. The log is
        append-only — there is no edit or delete path from anywhere in this
        application, by design, and deleting an account does not remove what it
        did.
      </p>
    </div>
  );
}
