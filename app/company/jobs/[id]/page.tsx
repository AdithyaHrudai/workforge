import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { JobSummary } from "@/components/JobSummary";
import { StatusBadge, VerifiedBadge } from "@/components/Badge";
import { closeJob } from "@/app/actions/company";
import { shortlistBid, rejectBid, acceptBid } from "@/app/actions/bidding";
import { formatINR, parseTrades } from "@/lib/utils";
import { tradeLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CompanyJobDetail({ params }: { params: { id: string } }) {
  const user = await requireRole("COMPANY");
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      lines: true,
      company: true,
      bids: {
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        include: {
          contractor: true,
          engagement: { select: { id: true } },
        },
      },
    },
  });
  if (!job || job.company.userId !== user.id) notFound();

  const order: Record<string, number> = { ACCEPTED: 0, SHORTLISTED: 1, SUBMITTED: 2, REJECTED: 3 };
  const bids = [...job.bids].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/company/jobs" className="text-sm text-slate-500 hover:text-slate-800">
          ← All jobs
        </Link>
        {job.status === "OPEN" && (
          <form action={closeJob}>
            <input type="hidden" name="id" value={job.id} />
            <button className="btn-secondary text-xs">Close job</button>
          </form>
        )}
      </div>

      <JobSummary job={job} />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Bids received ({bids.length})
        </h2>
        {bids.length === 0 ? (
          <div className="card text-sm text-slate-500">
            No bids yet. Verified contractors in the area have been notified.
          </div>
        ) : (
          <div className="space-y-3">
            {bids.map((bid) => {
              const accepted = bid.status === "ACCEPTED";
              return (
                <div
                  key={bid.id}
                  className={`card ${accepted ? "ring-2 ring-brand-400" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{bid.contractor.firmName}</p>
                        {bid.contractor.verified && <VerifiedBadge />}
                        <StatusBadge status={bid.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {bid.contractor.city}, {bid.contractor.state}
                        {bid.contractor.rating > 0 && ` · ★ ${bid.contractor.rating.toFixed(1)}`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {parseTrades(bid.contractor.trades).slice(0, 6).map((t) => (
                          <span key={t} className="badge bg-slate-100 text-slate-600">
                            {tradeLabel(t)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-lg font-bold text-slate-900">
                        {formatINR(bid.ratePerWorkerPerDay)}
                        <span className="text-xs font-normal text-slate-500">/worker/day</span>
                      </p>
                      <p className="text-slate-500">{bid.headcountOffered} workers</p>
                      <p className="text-slate-500">Mobilise in {bid.mobilizationDays}d</p>
                    </div>
                  </div>

                  {bid.notes && (
                    <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{bid.notes}</p>
                  )}

                  {/* Contact details only visible after acceptance (engagement). */}
                  {accepted ? (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50 p-3 text-sm">
                      <span className="text-brand-800">Engaged — contact details unlocked.</span>
                      {bid.engagement && (
                        <Link href={`/engagements/${bid.engagement.id}`} className="btn-primary text-xs">
                          Open chat & details
                        </Link>
                      )}
                    </div>
                  ) : (
                    job.status === "OPEN" &&
                    bid.status !== "REJECTED" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <form action={acceptBid}>
                          <input type="hidden" name="bidId" value={bid.id} />
                          <button className="btn-primary text-xs">Accept &amp; engage</button>
                        </form>
                        {bid.status === "SUBMITTED" && (
                          <form action={shortlistBid}>
                            <input type="hidden" name="bidId" value={bid.id} />
                            <button className="btn-secondary text-xs">Shortlist</button>
                          </form>
                        )}
                        <form action={rejectBid}>
                          <input type="hidden" name="bidId" value={bid.id} />
                          <button className="btn-secondary text-xs text-red-600">Reject</button>
                        </form>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
