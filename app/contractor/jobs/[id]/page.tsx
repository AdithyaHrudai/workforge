import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { JobSummary } from "@/components/JobSummary";
import { BidForm } from "@/components/forms/BidForm";
import { scoreContractorForJob } from "@/lib/matching";

export const dynamic = "force-dynamic";

export default async function ContractorJobDetail({ params }: { params: { id: string } }) {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) notFound();

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      lines: true,
      company: { select: { companyName: true, city: true, state: true, verified: true } },
    },
  });
  if (!job) notFound();

  const existing = await prisma.bid.findUnique({
    where: { jobId_contractorId: { jobId: job.id, contractorId: profile.id } },
  });

  const match = scoreContractorForJob(profile, job);

  return (
    <div className="space-y-6">
      <JobSummary job={job} />

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{job.company.companyName}</p>
            <p className="text-xs text-slate-500">Company details unlock when your bid is accepted.</p>
          </div>
          <span className="badge bg-brand-100 text-brand-700">{match.score}% match</span>
        </div>
        {match.reasons.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {match.reasons.map((r, i) => (
              <li key={i} className="badge bg-slate-100 text-slate-600">
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      {job.status === "OPEN" ? (
        <BidForm jobId={job.id} existing={existing} canBid={profile.status === "APPROVED"} />
      ) : (
        <div className="card text-sm text-slate-500">This job is no longer open for bids.</div>
      )}
    </div>
  );
}
