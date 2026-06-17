import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge, VerifiedBadge } from "@/components/Badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Stat({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <Link href={href} className="card transition hover:border-brand-400 hover:shadow">
      <p className="text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </Link>
  );
}

export default async function CompanyHome() {
  const user = await requireRole("COMPANY");
  const company = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
    include: {
      jobs: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { bids: true } } },
      },
      _count: { select: { engagements: true } },
    },
  });

  if (!company) {
    return (
      <div className="card text-center">
        <h1 className="text-xl font-bold text-slate-900">Welcome to ShramSetu 🏗️</h1>
        <p className="mt-2 text-sm text-slate-600">Set up your company profile to start posting requirements.</p>
        <Link href="/company/profile" className="btn-primary mt-4">
          Set up company profile
        </Link>
      </div>
    );
  }

  const openJobs = company.jobs.filter((j) => j.status === "OPEN").length;
  const totalBids = company.jobs.reduce((s, j) => s + j._count.bids, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{company.companyName}</h1>
          <p className="text-sm text-slate-500">
            {company.city}, {company.state}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {company.verified && <VerifiedBadge />}
          <Link href="/company/jobs/new" className="btn-primary">
            + Post a job
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Open jobs" value={openJobs} href="/company/jobs" />
        <Stat label="Bids received" value={totalBids} href="/company/jobs" />
        <Stat label="Engagements" value={company._count.engagements} href="/engagements" />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent jobs</h2>
          <Link href="/company/jobs" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {company.jobs.length === 0 ? (
          <p className="text-sm text-slate-500">
            No jobs yet.{" "}
            <Link href="/company/jobs/new" className="font-medium text-brand-600 hover:underline">
              Post your first requirement.
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {company.jobs.slice(0, 6).map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/company/jobs/${job.id}`} className="truncate font-medium text-slate-800 hover:text-brand-700">
                    {job.title}
                  </Link>
                  <p className="truncate text-xs text-slate-500">
                    {job.city}, {job.state} · posted {formatDate(job.createdAt)}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-3">
                  <span className="text-sm text-slate-500">{job._count.bids} bids</span>
                  <StatusBadge status={job.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
