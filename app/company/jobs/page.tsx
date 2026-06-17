import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/Badge";
import { tradeLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CompanyJobsPage() {
  const user = await requireRole("COMPANY");
  const company = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
    include: {
      jobs: {
        orderBy: { createdAt: "desc" },
        include: { lines: true, _count: { select: { bids: true } } },
      },
    },
  });

  if (!company) {
    return (
      <div className="card">
        <Link href="/company/profile" className="font-medium text-brand-600 hover:underline">
          Complete your company profile
        </Link>{" "}
        to post jobs.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My jobs</h1>
        <Link href="/company/jobs/new" className="btn-primary">
          + Post a job
        </Link>
      </div>

      {company.jobs.length === 0 ? (
        <div className="card text-sm text-slate-500">No jobs yet.</div>
      ) : (
        <div className="space-y-3">
          {company.jobs.map((job) => (
            <Link key={job.id} href={`/company/jobs/${job.id}`} className="card block transition hover:border-brand-400 hover:shadow">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{job.title}</p>
                  <p className="text-xs text-slate-500">
                    {job.city}, {job.state} · posted {formatDate(job.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-brand-700">{job._count.bids} bids</span>
                  <StatusBadge status={job.status} />
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
