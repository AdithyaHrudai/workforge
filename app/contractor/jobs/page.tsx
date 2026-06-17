import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jobsForContractor } from "@/lib/matching";
import { tradeLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function ContractorJobsPage() {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });

  if (!profile) {
    return (
      <div className="card text-sm text-slate-600">
        <Link href="/contractor/profile" className="font-medium text-brand-600 hover:underline">
          Complete your firm profile
        </Link>{" "}
        to see matching jobs.
      </div>
    );
  }

  const matches = await jobsForContractor(profile.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Find work</h1>
        <p className="text-sm text-slate-500">
          Open jobs matched to your trades and region, best matches first.
        </p>
      </div>

      {profile.status !== "APPROVED" && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          You can browse jobs now, but bidding unlocks once your firm is approved.
        </div>
      )}

      {matches.length === 0 ? (
        <div className="card text-sm text-slate-500">No matching open jobs right now.</div>
      ) : (
        <div className="space-y-3">
          {matches.map(({ job, match, alreadyBid }) => (
            <Link key={job.id} href={`/contractor/jobs/${job.id}`} className="card block transition hover:border-brand-400 hover:shadow">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{job.title}</p>
                  <p className="text-xs text-slate-500">
                    {job.city}, {job.state} · {job.company.companyName} · posted {formatDate(job.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {alreadyBid && <StatusBadge status={alreadyBid.status} />}
                  <span className="badge bg-brand-100 text-brand-700">{match.score}% match</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.lines.map((l) => (
                  <span key={l.id} className="badge bg-slate-100 text-slate-600">
                    {l.headcount}× {tradeLabel(l.trade)}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
