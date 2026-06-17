import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/Badge";
import { formatINR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MyBidsPage() {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return (
      <div className="card text-sm text-slate-600">
        <Link href="/contractor/profile" className="font-medium text-brand-600 hover:underline">
          Complete your firm profile
        </Link>{" "}
        first.
      </div>
    );
  }

  const bids = await prisma.bid.findMany({
    where: { contractorId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      job: { select: { id: true, title: true, city: true, state: true, status: true } },
      engagement: { select: { id: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">My bids</h1>
      {bids.length === 0 ? (
        <div className="card text-sm text-slate-500">
          You haven&apos;t bid on any jobs yet.{" "}
          <Link href="/contractor/jobs" className="font-medium text-brand-600 hover:underline">
            Find work →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map((bid) => (
            <div key={bid.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/contractor/jobs/${bid.job.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                  {bid.job.title}
                </Link>
                <p className="text-xs text-slate-500">
                  {bid.job.city}, {bid.job.state} · {formatINR(bid.ratePerWorkerPerDay)}/worker/day ·{" "}
                  {bid.headcountOffered} workers · placed {formatDate(bid.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={bid.status} />
                {bid.engagement && (
                  <Link href={`/engagements/${bid.engagement.id}`} className="btn-secondary text-xs">
                    Open chat
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
