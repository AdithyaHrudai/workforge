import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jobsForContractor } from "@/lib/matching";
import { StatusBadge, VerifiedBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

function Stat({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <Link href={href} className="card transition hover:border-brand-400 hover:shadow">
      <p className="text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </Link>
  );
}

export default async function ContractorHome() {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: user.id },
    include: { _count: { select: { workers: true, bids: true, engagements: true } } },
  });

  if (!profile) {
    return (
      <div className="card text-center">
        <h1 className="text-xl font-bold text-slate-900">Welcome to ShramSetu 👷</h1>
        <p className="mt-2 text-sm text-slate-600">
          Set up your firm profile to start receiving job matches and bidding.
        </p>
        <Link href="/contractor/profile" className="btn-primary mt-4">
          Set up firm profile
        </Link>
      </div>
    );
  }

  const matches = await jobsForContractor(profile.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{profile.firmName}</h1>
          <p className="text-sm text-slate-500">
            {profile.city}, {profile.state}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profile.verified && <VerifiedBadge />}
          <StatusBadge status={profile.status} />
        </div>
      </div>

      {profile.status === "PENDING" && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          Your firm is pending approval. Upload your verification documents to speed this up — you
          can bid on jobs once approved.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Matching jobs" value={matches.length} href="/contractor/jobs" />
        <Stat label="My bids" value={profile._count.bids} href="/contractor/bids" />
        <Stat label="Engagements" value={profile._count.engagements} href="/engagements" />
        <Stat label="Workers" value={profile._count.workers} href="/contractor/workforce" />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Top job matches</h2>
          <Link href="/contractor/jobs" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {matches.length === 0 ? (
          <p className="text-sm text-slate-500">No matching open jobs right now. Check back soon.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {matches.slice(0, 5).map(({ job, match }) => (
              <li key={job.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/contractor/jobs/${job.id}`} className="truncate font-medium text-slate-800 hover:text-brand-700">
                    {job.title}
                  </Link>
                  <p className="truncate text-xs text-slate-500">
                    {job.city}, {job.state} · {job.company.companyName}
                  </p>
                </div>
                <span className="badge bg-brand-100 text-brand-700">{match.score}% match</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
