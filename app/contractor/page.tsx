import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirementsForContractor } from "@/lib/matching";
import { getSettings } from "@/lib/settings";
import { getContractorCompleteness } from "@/lib/completeness";
import { Notice, Stars, StatusBadge, VerifiedBadge } from "@/components/Badge";
import { CompletenessCard } from "@/components/CompletenessCard";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { RequirementCard } from "@/components/RequirementCard";
import { RATING_PARAMETERS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

const RATING_COLUMNS = [
  { key: "ratingDeployment", param: RATING_PARAMETERS[0] },
  { key: "ratingCompliance", param: RATING_PARAMETERS[1] },
  { key: "ratingWorkerPayment", param: RATING_PARAMETERS[2] },
  { key: "ratingManpowerQuality", param: RATING_PARAMETERS[3] },
  { key: "ratingResponsiveness", param: RATING_PARAMETERS[4] },
] as const;

export default async function ContractorDashboard() {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: user.id },
    include: { _count: { select: { clients: true, engagements: true, reviews: true } } },
  });
  if (!profile) redirect("/contractor/profile");

  const settings = await getSettings();

  const [openProposals, activeEngagements, pendingInvites, matches, completeness] = await Promise.all([
    prisma.proposal.count({
      where: { contractorId: profile.id, status: { in: ["SUBMITTED", "SHORTLISTED"] } },
    }),
    prisma.engagement.count({ where: { contractorId: profile.id, status: "ACTIVE" } }),
    prisma.requirementInvite.findMany({
      where: { contractorId: profile.id, status: { in: ["SENT", "VIEWED"] } },
      include: {
        requirement: {
          include: { roles: true, company: { select: { companyName: true, verified: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    requirementsForContractor(profile.id, 5),
    getContractorCompleteness(profile.id),
  ]);

  const blocked = settings.requireContractorApproval && profile.status !== "APPROVED";

  return (
    <div className="space-y-8">
      <PageHeader
        title={profile.firmName}
        subtitle={`${profile.city}, ${profile.state}`}
        action={
          <div className="flex items-center gap-2">
            {profile.verified && <VerifiedBadge />}
            <StatusBadge status={profile.status} />
          </div>
        }
      />

      {blocked && (
        <Notice tone="warning">
          {profile.status === "REJECTED" ? (
            <>
              Your firm registration needs changes
              {profile.moderationNotes ? `: ${profile.moderationNotes}` : "."}{" "}
              <Link href="/contractor/profile" className="font-semibold underline">
                Update your profile
              </Link>
              .
            </>
          ) : (
            <>
              Your firm is awaiting approval, so you can&apos;t submit proposals yet.{" "}
              <Link href="/contractor/documents" className="font-semibold underline">
                Upload your verification documents
              </Link>{" "}
              to get approved faster.
            </>
          )}
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open proposals"
          value={openProposals}
          href="/contractor/proposals"
        />
        <StatCard label="Active engagements" value={activeEngagements} href="/engagements" />
        <StatCard
          label="Clients listed"
          value={profile._count.clients}
          href="/contractor/clients"
        />
        <StatCard
          label="Available manpower"
          value={formatNumber(profile.availableNow)}
          hint={`of ${formatNumber(profile.totalWorkforce)} total`}
          href="/contractor/profile"
        />
      </div>

      {/* Work on the left, profile health on the right — the two things a
          contractor opens this page for, side by side instead of stacked. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          {pendingInvites.length > 0 && (
            <section>
              <h2 className="section-title mb-3">You&apos;ve been invited to quote</h2>
              <div className="grid gap-4">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="space-y-2">
                    <RequirementCard
                      requirement={invite.requirement}
                      href={`/contractor/requirements/${invite.requirementId}`}
                    />
                    {invite.message && (
                      <p className="rounded-lg bg-brand-50 px-4 py-2 text-sm text-brand-900">
                        <span className="font-medium">
                          {invite.requirement.company.companyName}:
                        </span>{" "}
                        {invite.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Requirements that match your firm</h2>
              <Link
                href="/contractor/requirements"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                View all
              </Link>
            </div>

            {matches.length === 0 ? (
              <EmptyState
                title="Nothing matching just yet"
                description="Widen the contract types, sectors or states on your profile and new requirements will start appearing here."
                action={
                  <Link href="/contractor/profile" className="btn-primary">
                    Update your profile
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4">
                {matches.map(({ requirement, match, alreadyProposed }) => (
                  <RequirementCard
                    key={requirement.id}
                    requirement={requirement}
                    href={`/contractor/requirements/${requirement.id}`}
                    match={match}
                    proposalStatus={alreadyProposed?.status}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {completeness && <CompletenessCard completeness={completeness} />}

          {profile.ratingCount > 0 && (
            <section className="card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">How companies rate you</h2>
                <Stars value={profile.rating} count={profile.ratingCount} size="md" />
              </div>
              {/* Label above the bar rather than beside it — the sidebar is too
                  narrow for a label column without truncating every parameter. */}
              <div className="space-y-3">
                {RATING_COLUMNS.map(({ key, param }) => (
                  <div key={key}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-slate-600">{param.label}</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {profile[key].toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-forge-500"
                        style={{ width: `${(profile[key] / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
