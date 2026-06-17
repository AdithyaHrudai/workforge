import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatINR, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Stat({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const inner = (
    <div className="card">
      <p className="text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminHome() {
  await requireRole("ADMIN");
  const settings = await getSettings();

  const [
    contractors,
    pendingContractors,
    companies,
    openJobs,
    bids,
    activeEng,
    completedEng,
    feeAgg,
    recentAudit,
  ] = await Promise.all([
    prisma.contractorProfile.count(),
    prisma.contractorProfile.count({ where: { status: "PENDING" } }),
    prisma.companyProfile.count(),
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.bid.count(),
    prisma.engagement.count({ where: { status: "ACTIVE" } }),
    prisma.engagement.count({ where: { status: "COMPLETED" } }),
    prisma.engagement.aggregate({ _sum: { estimatedFee: true, estimatedValue: true } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { actor: { select: { name: true, role: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Platform overview</h1>

      {pendingContractors > 0 && (
        <Link
          href="/admin/contractors?status=PENDING"
          className="block rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
        >
          {pendingContractors} contractor(s) awaiting approval →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Contractors" value={contractors} href="/admin/contractors" />
        <Stat label="Companies" value={companies} href="/admin/companies" />
        <Stat label="Open jobs" value={openJobs} />
        <Stat label="Total bids" value={bids} />
        <Stat label="Active engagements" value={activeEng} />
        <Stat label="Completed engagements" value={completedEng} />
        <Stat label="GMV (est.)" value={formatINR(feeAgg._sum.estimatedValue ?? 0)} />
        <Stat label={`Platform fees (est. @ ${settings.platformFeePercent}%)`} value={formatINR(feeAgg._sum.estimatedFee ?? 0)} />
      </div>

      <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
        GMV and fee figures are <strong>estimates</strong> from accepted engagements. Online fee
        collection is {settings.paymentsEnabled ? "enabled" : "disabled"} — connect a payment
        aggregator and flip the switch in Settings to start charging.
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">Recent activity</h2>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {recentAudit.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span className="text-slate-700">
                  <span className="font-medium">{a.actor.name}</span>{" "}
                  <span className="text-slate-400">({a.actor.role.toLowerCase()})</span> — {a.action}
                  {a.detail ? <span className="text-slate-400"> · {a.detail}</span> : null}
                </span>
                <span className="text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
