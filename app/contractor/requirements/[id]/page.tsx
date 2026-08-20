import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getRequirement, isLive, totalHeadcount } from "@/lib/requirements";
import { withdrawProposal } from "@/app/actions/proposals";
import { ProposalForm } from "@/components/forms/ProposalForm";
import { CategoryBadge, Notice, StatusBadge, VerifiedBadge } from "@/components/Badge";
import { DefinitionList, InfoRow, PageHeader } from "@/components/ui";
import {
  CATEGORY,
  DURATION_LABELS,
  EXPERIENCE_LABELS,
  QUALIFICATION_LABELS,
  SHIFT_LABELS,
  URGENCY_LABELS,
  industryLabel,
  rateBasisLabel,
  roleLabel,
} from "@/lib/constants";
import { formatDate, formatINR, formatNumber, formatRate, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Requirement" };

export default async function ContractorRequirementDetail({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/contractor/profile");

  const requirement = await getRequirement(params.id);
  if (!requirement) notFound();

  const settings = await getSettings();
  const live = isLive(requirement);
  const jobContract = requirement.category === CATEGORY.JOB_CONTRACT;

  const [proposal, invite] = await Promise.all([
    prisma.proposal.findUnique({
      where: {
        requirementId_contractorId: { requirementId: requirement.id, contractorId: profile.id },
      },
    }),
    prisma.requirementInvite.findUnique({
      where: {
        requirementId_contractorId: { requirementId: requirement.id, contractorId: profile.id },
      },
    }),
  ]);

  // Opening the posting counts as a view, and marks an invitation as seen. A
  // failure here must never break the page, so both are best-effort.
  await Promise.all([
    prisma.requirement
      .update({ where: { id: requirement.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined),
    invite?.status === "SENT"
      ? prisma.requirementInvite
          .update({ where: { id: invite.id }, data: { status: "VIEWED" } })
          .catch(() => undefined)
      : Promise.resolve(),
  ]);

  const approved = !settings.requireContractorApproval || profile.status === "APPROVED";
  const canPropose = live && approved && proposal?.status !== "ACCEPTED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={requirement.title}
        subtitle={`${requirement.company.companyName} · ${requirement.city}, ${requirement.state} · posted ${timeAgo(requirement.createdAt)}`}
        action={
          <Link href="/contractor/requirements" className="btn-secondary">
            Back to feed
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={requirement.category} full />
        <StatusBadge status={requirement.urgency} />
        {!live && <StatusBadge status={requirement.status === "OPEN" ? "EXPIRED" : requirement.status} />}
        {proposal && <StatusBadge status={proposal.status} label={`Your proposal: ${proposal.status.toLowerCase()}`} />}
        {invite && <span className="badge bg-brand-100 text-brand-800">You were invited</span>}
      </div>

      {invite?.message && (
        <Notice>
          <span className="font-medium">{requirement.company.companyName} wrote:</span>{" "}
          {invite.message}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {requirement.description && (
            <section className="card">
              <h2 className="mb-2 font-semibold text-slate-900">
                {jobContract ? "Scope of work" : "Job description"}
              </h2>
              <p className="prose-note">{requirement.description}</p>
            </section>
          )}

          {jobContract ? (
            <section className="card">
              <h2 className="mb-3 font-semibold text-slate-900">Output & deliverables</h2>
              <DefinitionList>
                {requirement.scopeKey && (
                  <InfoRow label="Nature of work">{roleLabel(requirement.scopeKey)}</InfoRow>
                )}
                {requirement.outputQuantity != null && (
                  <InfoRow label="Output required">
                    {formatNumber(requirement.outputQuantity)} {requirement.outputUnit}
                    {requirement.outputPeriod ? ` ${requirement.outputPeriod}` : ""}
                  </InfoRow>
                )}
              </DefinitionList>
              {requirement.deliverables && (
                <p className="prose-note mt-3 border-t border-slate-100 pt-3">
                  {requirement.deliverables}
                </p>
              )}
              <p className="mt-3 rounded-lg bg-forge-50 px-3 py-2 text-xs text-forge-900">
                You decide how many people and machines to deploy. Quote against the output.
              </p>
            </section>
          ) : (
            <section className="card-flush overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-semibold text-slate-900">Roles & headcount</h2>
                <span className="badge bg-slate-100 text-slate-600">
                  {totalHeadcount(requirement.roles)} people
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Number</th>
                      <th>Experience</th>
                      <th>Qualification</th>
                      <th>Indicative wage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requirement.roles.map((role) => (
                      <tr key={role.id}>
                        <td>
                          <span className="font-medium text-slate-800">{roleLabel(role.role)}</span>
                          {role.notes && (
                            <span className="mt-0.5 block text-xs text-slate-500">{role.notes}</span>
                          )}
                        </td>
                        <td className="font-semibold text-slate-900">{role.headcount}</td>
                        <td className="text-slate-600">
                          {role.experienceBand ? EXPERIENCE_LABELS[role.experienceBand] : "Any"}
                        </td>
                        <td className="text-slate-600">
                          {role.qualification ? QUALIFICATION_LABELS[role.qualification] : "Any"}
                        </td>
                        <td className="text-slate-600">
                          {role.indicativeWage ? formatINR(role.indicativeWage) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* --- Proposal --------------------------------------------------- */}
          {canPropose ? (
            <ProposalForm
              requirementId={requirement.id}
              category={requirement.category}
              preferredRateBasis={requirement.preferredRateBasis}
              existing={
                proposal
                  ? {
                      rateBasis: proposal.rateBasis,
                      rateAmount: proposal.rateAmount,
                      headcountOffered: proposal.headcountOffered,
                      indicativeCrewSize: proposal.indicativeCrewSize,
                      mobilizationDays: proposal.mobilizationDays,
                      validityDays: proposal.validityDays,
                      coverNote: proposal.coverNote,
                    }
                  : null
              }
            />
          ) : (
            <section className="card">
              <h2 className="mb-2 font-semibold text-slate-900">Proposal</h2>
              {!approved ? (
                <p className="text-sm text-slate-600">
                  Your firm needs to be approved before you can quote.{" "}
                  <Link href="/contractor/documents" className="font-medium text-brand-700 hover:underline">
                    Upload your verification documents
                  </Link>{" "}
                  to get approved.
                </p>
              ) : proposal?.status === "ACCEPTED" ? (
                <p className="text-sm text-slate-600">
                  Your proposal was accepted. Coordinate mobilisation from the engagement.
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  This requirement is no longer accepting proposals.
                </p>
              )}
            </section>
          )}

          {proposal && proposal.status !== "ACCEPTED" && proposal.status !== "WITHDRAWN" && (
            <form action={withdrawProposal}>
              <input type="hidden" name="id" value={proposal.id} />
              <button type="submit" className="btn-ghost btn-sm text-red-600 hover:bg-red-50">
                Withdraw my proposal
              </button>
            </form>
          )}
        </div>

        {/* --- Sidebar ------------------------------------------------------- */}
        <aside className="space-y-4">
          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">The company</h2>
            <p className="flex items-center gap-2 font-medium text-slate-800">
              {requirement.company.companyName}
              {requirement.company.verified && <VerifiedBadge />}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {requirement.company.city}, {requirement.company.state}
            </p>
            {requirement.company.industries.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {requirement.company.industries.map((i) => (
                  <span key={i} className="chip">
                    {industryLabel(i)}
                  </span>
                ))}
              </div>
            )}
            {requirement.company.about && (
              <p className="prose-note mt-3">{requirement.company.about}</p>
            )}
            <p className="mt-3 text-xs text-slate-400">
              Contact details are shared once your proposal is accepted.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">At a glance</h2>
            <DefinitionList>
              <InfoRow label="Site">
                {requirement.siteName ? `${requirement.siteName}, ` : ""}
                {requirement.city}, {requirement.state}
              </InfoRow>
              {requirement.industry && (
                <InfoRow label="Sector">{industryLabel(requirement.industry)}</InfoRow>
              )}
              {requirement.startDate && (
                <InfoRow label="Start date">{formatDate(requirement.startDate)}</InfoRow>
              )}
              {requirement.durationType && (
                <InfoRow label="Duration">
                  {DURATION_LABELS[requirement.durationType] ?? requirement.durationType}
                  {requirement.durationMonths ? ` · ${requirement.durationMonths} months` : ""}
                </InfoRow>
              )}
              {requirement.shift && (
                <InfoRow label="Shift">{SHIFT_LABELS[requirement.shift] ?? requirement.shift}</InfoRow>
              )}
              <InfoRow label="Urgency">
                {URGENCY_LABELS[requirement.urgency] ?? requirement.urgency}
              </InfoRow>
              {requirement.preferredRateBasis && (
                <InfoRow label="Quote basis">
                  {rateBasisLabel(requirement.preferredRateBasis)}
                </InfoRow>
              )}
              {requirement.indicativeBudget != null && (
                <InfoRow label="Indicative budget">
                  {formatRate(requirement.indicativeBudget, requirement.preferredRateBasis)}
                </InfoRow>
              )}
              {requirement.expiresAt && (
                <InfoRow label="Closes on">{formatDate(requirement.expiresAt)}</InfoRow>
              )}
            </DefinitionList>
          </section>

          {(requirement.accommodationProvided ||
            requirement.transportProvided ||
            requirement.foodProvided ||
            requirement.ppeProvided) && (
            <section className="card">
              <h2 className="mb-2 font-semibold text-slate-900">Company provides</h2>
              <div className="flex flex-wrap gap-1.5">
                {requirement.accommodationProvided && <span className="chip">Accommodation</span>}
                {requirement.transportProvided && <span className="chip">Transport</span>}
                {requirement.foodProvided && <span className="chip">Canteen / food</span>}
                {requirement.ppeProvided && <span className="chip">PPE</span>}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
