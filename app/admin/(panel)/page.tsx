import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import { Notice, StatusBadge } from "@/components/Badge";
import { formatNumber, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Verification queue" };

/**
 * The console's home: what is waiting on a human, oldest first.
 *
 * This used to be a platform-analytics dashboard — charts of postings, a
 * marketplace funnel, engagement counts. None of that is an administrator's
 * job here. Their job is to decide whether the firms on both sides are who they
 * say they are, and a screen that opens on a bar chart buries the four
 * registrations that have been waiting a week.
 *
 * Oldest first is deliberate for the same reason: newest-first quietly starves
 * whatever somebody once skipped.
 */
export default async function AdminQueue({
  searchParams,
}: {
  searchParams: { denied?: string; passwordChanged?: string };
}) {
  const admin = await requireAdmin();
  const settings = await getSettings();

  const [
    pendingContractors,
    pendingCompanies,
    pendingDocs,
    unverifiedClients,
    contractorQueue,
    companyQueue,
    docQueue,
    totals,
    recentDecisions,
  ] = await Promise.all([
    prisma.contractorProfile.count({ where: { status: "PENDING" } }),
    prisma.companyProfile.count({ where: { status: "PENDING" } }),
    prisma.document.count({ where: { status: "PENDING" } }),
    prisma.contractorClient.count({ where: { verified: false } }),

    prisma.contractorProfile.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 8,
      select: {
        id: true,
        firmName: true,
        city: true,
        state: true,
        createdAt: true,
        _count: { select: { documents: true } },
      },
    }),
    prisma.companyProfile.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 8,
      select: {
        id: true,
        companyName: true,
        city: true,
        state: true,
        createdAt: true,
        _count: { select: { documents: true } },
      },
    }),
    prisma.document.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        id: true,
        type: true,
        createdAt: true,
        contractor: { select: { id: true, firmName: true } },
        company: { select: { id: true, companyName: true } },
      },
    }),

    Promise.all([
      prisma.contractorProfile.count(),
      prisma.companyProfile.count(),
      prisma.contractorProfile.count({ where: { verified: true } }),
      prisma.companyProfile.count({ where: { verified: true } }),
    ]),

    prisma.auditLog.findMany({
      where: {
        actorType: "ADMIN",
        action: {
          in: [
            "CONTRACTOR_STATUS",
            "COMPANY_STATUS",
            "CONTRACTOR_VERIFY",
            "COMPANY_VERIFY",
            "DOC_REVIEW",
            "CLIENT_VERIFY",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, detail: true, actorLabel: true, createdAt: true },
    }),
  ]);

  const [totalContractors, totalCompanies, verifiedContractors, verifiedCompanies] = totals;
  const outstanding = pendingContractors + pendingCompanies + pendingDocs;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good to see you, ${admin.name.split(" ")[0]}`}
        subtitle={
          outstanding === 0
            ? "Nothing is waiting for a decision. The queues below are empty."
            : `${formatNumber(outstanding)} item${outstanding === 1 ? "" : "s"} waiting for a decision, oldest first.`
        }
      />

      {searchParams.passwordChanged === "1" && (
        <Notice tone="success">
          Your password has been changed and every other browser signed in as you
          has been signed out.
        </Notice>
      )}

      {searchParams.denied === "team" && (
        <Notice tone="warning">
          That page is restricted to super admins — managing the admin team and
          changing platform settings both are. Ask one of them if you need
          something changed. Your own verification work is unaffected.
        </Notice>
      )}

      {!settings.requireContractorApproval && (
        <Notice tone="warning">
          Contractor approval is currently switched off, so unverified firms can
          quote on live requirements without passing through this queue. A super
          admin can change that under Platform settings.
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Contractors awaiting review"
          value={formatNumber(pendingContractors)}
          hint={`${formatNumber(verifiedContractors)} of ${formatNumber(totalContractors)} verified`}
          href="/admin/contractors?status=PENDING"
        />
        <StatCard
          label="Companies awaiting review"
          value={formatNumber(pendingCompanies)}
          hint={`${formatNumber(verifiedCompanies)} of ${formatNumber(totalCompanies)} verified`}
          href="/admin/companies?status=PENDING"
        />
        <StatCard
          label="Documents to check"
          value={formatNumber(pendingDocs)}
          hint="Across both sides"
        />
        <StatCard
          label="Track-record entries"
          value={formatNumber(unverifiedClients)}
          hint="Self-declared, not yet corroborated"
        />
      </div>

      {/* --- Contractors ---------------------------------------------------- */}
      <section className="card-flush overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Contractors awaiting review</h2>
            <p className="text-sm text-slate-500">
              Check the firm&apos;s statutory documents against the details it declared.
            </p>
          </div>
          <Link href="/admin/contractors?status=PENDING" className="btn-secondary btn-sm">
            See all
          </Link>
        </div>

        {contractorQueue.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Nothing waiting.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {contractorQueue.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/contractors/${c.id}`}
                    className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
                  >
                    {c.firmName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {c.city}, {c.state} · {c._count.documents} document
                    {c._count.documents === 1 ? "" : "s"} · waiting {timeAgo(c.createdAt)}
                  </p>
                </div>
                <Link href={`/admin/contractors/${c.id}`} className="btn-primary btn-sm">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --- Companies ------------------------------------------------------ */}
      <section className="card-flush overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Companies awaiting review</h2>
            <p className="text-sm text-slate-500">
              Confirm the firm exists and that the contact is entitled to act for it.
            </p>
          </div>
          <Link href="/admin/companies?status=PENDING" className="btn-secondary btn-sm">
            See all
          </Link>
        </div>

        {companyQueue.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Nothing waiting.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {companyQueue.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/companies/${c.id}`}
                    className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
                  >
                    {c.companyName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {c.city}, {c.state} · {c._count.documents} document
                    {c._count.documents === 1 ? "" : "s"} · waiting {timeAgo(c.createdAt)}
                  </p>
                </div>
                <Link href={`/admin/companies/${c.id}`} className="btn-primary btn-sm">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --- Documents ------------------------------------------------------ */}
      <section className="card-flush overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="font-semibold text-slate-900">Documents to check</h2>
          <p className="text-sm text-slate-500">
            Each one opens on the profile it belongs to, where you can see it
            against what was declared.
          </p>
        </div>

        {docQueue.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Nothing waiting.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docQueue.map((d) => {
              const href = d.contractor
                ? `/admin/contractors/${d.contractor.id}`
                : d.company
                  ? `/admin/companies/${d.company.id}`
                  : null;
              const owner = d.contractor?.firmName ?? d.company?.companyName ?? "Unattached";
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{owner}</p>
                    <p className="text-xs text-slate-500">
                      {d.contractor ? "Contractor" : "Company"} · {d.type.replace(/_/g, " ").toLowerCase()} ·
                      uploaded {timeAgo(d.createdAt)}
                    </p>
                  </div>
                  {href && (
                    <Link href={href} className="btn-secondary btn-sm">
                      Open profile
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* --- Recent decisions ----------------------------------------------- */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Recent decisions</h2>
          <Link href="/admin/audit" className="text-sm font-medium text-brand-700 hover:underline">
            Full audit log
          </Link>
        </div>

        {recentDecisions.length === 0 ? (
          <EmptyState
            title="No decisions recorded yet"
            description="Approvals, rejections and document checks appear here as they happen."
          />
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {recentDecisions.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-4 py-2">
                <span className="min-w-0">
                  <StatusBadge status="APPROVED" label={entry.action} />
                  <span className="ml-2 text-slate-600">{entry.detail ?? "—"}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {entry.actorLabel ?? "Unknown admin"}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Notice>
        You see what you need to verify a registration and nothing more. Private
        message threads between a company and a contractor, and their agreed
        commercial terms, are not visible from this console to anybody.
      </Notice>
    </div>
  );
}
