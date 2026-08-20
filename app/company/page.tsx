import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Notice } from "@/components/Badge";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { RequirementCard } from "@/components/RequirementCard";
import { CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

export default async function CompanyDashboard() {
  const user = await requireRole("COMPANY");
  const company = await prisma.companyProfile.findUnique({ where: { userId: user.id } });
  if (!company) redirect("/company/profile");

  const settings = await getSettings();
  const now = new Date();

  const [openCount, proposalCount, activeEngagements, awaitingReview, recent] = await Promise.all([
    prisma.requirement.count({
      where: {
        companyId: company.id,
        status: "OPEN",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    prisma.proposal.count({
      where: { requirement: { companyId: company.id }, status: "SUBMITTED" },
    }),
    prisma.engagement.count({ where: { companyId: company.id, status: "ACTIVE" } }),
    prisma.engagement.count({
      where: { companyId: company.id, status: "COMPLETED", review: null },
    }),
    prisma.requirement.findMany({
      where: { companyId: company.id },
      include: { roles: true, _count: { select: { proposals: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const awaitingApproval = settings.requireCompanyApproval && company.status !== "APPROVED";

  return (
    <div className="space-y-8">
      <PageHeader
        title={company.companyName}
        subtitle={`${company.city}, ${company.state}`}
        action={
          <Link href="/company/requirements/new" className="btn-primary">
            Post a requirement
          </Link>
        }
      />

      {awaitingApproval && (
        <Notice tone="warning">
          {company.status === "REJECTED"
            ? "Your company registration was not approved. Please review your profile or contact support."
            : "Your company is awaiting verification. You'll be able to post requirements once it's approved."}
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open requirements" value={openCount} href="/company/requirements" />
        <StatCard
          label="New proposals"
          value={proposalCount}
          hint="Awaiting your review"
          href="/company/requirements"
        />
        <StatCard label="Active engagements" value={activeEngagements} href="/engagements" />
        <StatCard
          label="Ratings pending"
          value={awaitingReview}
          hint="Completed work you haven't rated"
          href="/engagements"
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Recent requirements</h2>
          <Link href="/company/requirements" className="text-sm font-medium text-brand-700 hover:underline">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="You haven't posted anything yet"
            description="Post your first requirement and matching contractors will see it straight away."
            action={
              <Link href="/company/requirements/new" className="btn-primary">
                Post a requirement
              </Link>
            }
          />
        ) : (
          // Two up on wide screens — one requirement card per full 1440px row
          // left most of the viewport empty.
          <div className="grid gap-4 xl:grid-cols-2">
            {recent.map((requirement) => (
              <RequirementCard
                key={requirement.id}
                requirement={requirement}
                href={`/company/requirements/${requirement.id}`}
                showCompany={false}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-3">Start a new requirement</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={`/company/requirements/new?category=${c.value}`}
              className="card card-hover"
            >
              <p className="font-semibold text-slate-900">{c.short}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{c.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
