import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  acceptProposal,
  rejectProposal,
  shortlistProposal,
} from "@/app/actions/proposals";
import { closeRequirement, deleteRequirement, reopenRequirement } from "@/app/actions/requirements";
import { getOwnedRequirement, isLive, totalHeadcount } from "@/lib/requirements";
import { contractorsForRequirement } from "@/lib/matching";
import { CategoryBadge, StatusBadge, Stars, VerifiedBadge } from "@/components/Badge";
import { ContractorCard } from "@/components/ContractorCard";
import { DefinitionList, EmptyState, InfoRow, PageHeader } from "@/components/ui";
import {
  CATEGORY,
  DURATION_LABELS,
  EXPERIENCE_LABELS,
  QUALIFICATION_LABELS,
  SHIFT_LABELS,
  URGENCY_LABELS,
  industryLabel,
  isHeadcountCategory,
  rateBasisLabel,
  roleLabel,
} from "@/lib/constants";
import { formatDate, formatINR, formatNumber, formatRate, timeAgo, yearRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Requirement" };

const PROPOSAL_ORDER: Record<string, number> = {
  SHORTLISTED: 0,
  SUBMITTED: 1,
  ACCEPTED: 2,
  REJECTED: 3,
  WITHDRAWN: 4,
};

export default async function CompanyRequirementDetail({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("COMPANY");
  const company = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!company) redirect("/company/profile");

  const requirement = await getOwnedRequirement(params.id, user.id);
  if (!requirement) notFound();

  const jobContract = requirement.category === CATEGORY.JOB_CONTRACT;
  const live = isLive(requirement);
  const required = totalHeadcount(requirement.roles);

  const awarded = requirement.proposals
    .filter((p) => p.status === "ACCEPTED")
    .reduce((sum, p) => sum + (p.headcountOffered ?? 0), 0);

  const proposals = [...requirement.proposals].sort(
    (a, b) =>
      (PROPOSAL_ORDER[a.status] ?? 9) - (PROPOSAL_ORDER[b.status] ?? 9) ||
      a.rateAmount - b.rateAmount,
  );

  // Only worth suggesting contractors while the posting can still be filled.
  const invitedIds = new Set(requirement.invites.map((i) => i.contractorId));
  const proposedIds = new Set(requirement.proposals.map((p) => p.contractorId));
  const suggestions = live
    ? (await contractorsForRequirement(requirement.id, 12))
        .filter((s) => !invitedIds.has(s.contractor.id) && !proposedIds.has(s.contractor.id))
        .slice(0, 3)
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={requirement.title}
        subtitle={`${requirement.siteName ? `${requirement.siteName}, ` : ""}${requirement.city}, ${requirement.state} · posted ${timeAgo(requirement.createdAt)}`}
        action={
          <div className="flex flex-wrap gap-2">
            {requirement.status === "OPEN" ? (
              <form action={closeRequirement}>
                <input type="hidden" name="id" value={requirement.id} />
                <button className="btn-secondary" type="submit">
                  Close requirement
                </button>
              </form>
            ) : (
              <form action={reopenRequirement}>
                <input type="hidden" name="id" value={requirement.id} />
                <button className="btn-secondary" type="submit">
                  Reopen
                </button>
              </form>
            )}
            {requirement.proposals.length === 0 && (
              <form action={deleteRequirement}>
                <input type="hidden" name="id" value={requirement.id} />
                <button className="btn-ghost text-red-600 hover:bg-red-50" type="submit">
                  Delete
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={requirement.category} full />
        <StatusBadge status={requirement.status} />
        <StatusBadge status={requirement.urgency} />
        {!live && requirement.status === "OPEN" && <StatusBadge status="EXPIRED" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* --- Left: the requirement ---------------------------------------- */}
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
                Contractors decide their own deployment on this contract and are paid against output.
              </p>
            </section>
          ) : (
            <section className="card-flush overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-semibold text-slate-900">Roles & headcount</h2>
                <span className="badge bg-slate-100 text-slate-600">
                  {required} total · {awarded} awarded
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

          {/* --- Proposals ------------------------------------------------- */}
          <section>
            <h2 className="mb-3 section-title">
              Proposals ({requirement.proposals.length})
            </h2>

            {proposals.length === 0 ? (
              <EmptyState
                title="No proposals yet"
                description="Matching contractors can see this requirement. You can also invite specific firms from the contractor search."
                action={
                  <Link href="/company/search" className="btn-primary">
                    Find contractors
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal) => {
                  const c = proposal.contractor;
                  const decided =
                    proposal.status === "ACCEPTED" ||
                    proposal.status === "REJECTED" ||
                    proposal.status === "WITHDRAWN";

                  return (
                    <article key={proposal.id} className="card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              <Link
                                href={`/contractors/${c.id}`}
                                className="hover:text-brand-700"
                              >
                                {c.firmName}
                              </Link>
                            </h3>
                            {c.verified && <VerifiedBadge />}
                            <StatusBadge status={proposal.status} />
                          </div>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {c.city}, {c.state} · {formatNumber(c.totalWorkforce)} workforce ·
                            mobilises in {c.mobilizationDays}d
                          </p>
                          <div className="mt-1.5">
                            <Stars value={c.rating} count={c.ratingCount} />
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">
                            {formatINR(proposal.rateAmount)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {rateBasisLabel(proposal.rateBasis)}
                          </p>
                          {proposal.headcountOffered != null && (
                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {proposal.headcountOffered} people offered
                            </p>
                          )}
                          {proposal.indicativeCrewSize != null && (
                            <p className="mt-1 text-xs text-slate-500">
                              ~{proposal.indicativeCrewSize} crew (indicative)
                            </p>
                          )}
                        </div>
                      </div>

                      {c.clients.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                          {c.clients.map((client) => (
                            <li
                              key={client.id}
                              className={`flex items-baseline justify-between gap-2 text-xs ${
                                client.siteState === requirement.state
                                  ? "font-semibold text-brand-800"
                                  : "text-slate-600"
                              }`}
                            >
                              <span className="truncate">
                                {client.clientName}
                                <span className="font-normal text-slate-400">
                                  {" · "}
                                  {client.siteCity}, {client.siteState}
                                </span>
                              </span>
                              <span className="shrink-0 text-slate-500">
                                {client.headcount > 0 && `${formatNumber(client.headcount)} pax · `}
                                {yearRange(client.startedYear, client.endedYear, client.ongoing)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {proposal.coverNote && (
                        <p className="prose-note mt-3 rounded-lg bg-slate-50 p-3">
                          {proposal.coverNote}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                        <span className="mr-auto text-xs text-slate-400">
                          Mobilises in {proposal.mobilizationDays} days · quote valid{" "}
                          {proposal.validityDays} days · {timeAgo(proposal.createdAt)}
                        </span>

                        {proposal.engagement && (
                          <Link
                            href={`/engagements/${proposal.engagement.id}`}
                            className="btn-primary btn-sm"
                          >
                            Open engagement
                          </Link>
                        )}

                        {!decided && live && (
                          <>
                            {proposal.status === "SUBMITTED" && (
                              <form action={shortlistProposal}>
                                <input type="hidden" name="proposalId" value={proposal.id} />
                                <button className="btn-secondary btn-sm" type="submit">
                                  Shortlist
                                </button>
                              </form>
                            )}
                            <form action={rejectProposal}>
                              <input type="hidden" name="proposalId" value={proposal.id} />
                              <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" type="submit">
                                Reject
                              </button>
                            </form>
                            <form action={acceptProposal}>
                              <input type="hidden" name="proposalId" value={proposal.id} />
                              <button className="btn-primary btn-sm" type="submit">
                                Accept & award
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* --- Suggested contractors -------------------------------------- */}
          {suggestions.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="section-title">Contractors who fit this requirement</h2>
                <Link
                  href={`/company/search?states=${encodeURIComponent(requirement.state)}&categories=${requirement.category}`}
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  See all
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {suggestions.map(({ contractor, match }) => (
                  <ContractorCard
                    key={contractor.id}
                    contractor={contractor}
                    href={`/contractors/${contractor.id}?requirement=${requirement.id}`}
                    match={match}
                    highlightState={requirement.state}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* --- Right: summary ------------------------------------------------ */}
        <aside className="space-y-4">
          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">At a glance</h2>
            <DefinitionList>
              <InfoRow label="Contract type">{<CategoryBadge category={requirement.category} />}</InfoRow>
              {requirement.industry && (
                <InfoRow label="Sector">{industryLabel(requirement.industry)}</InfoRow>
              )}
              <InfoRow label="Site">
                {requirement.city}, {requirement.state}
              </InfoRow>
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
                <InfoRow label="Listing expires">{formatDate(requirement.expiresAt)}</InfoRow>
              )}
              <InfoRow label="Views">{requirement.viewCount}</InfoRow>
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

          {isHeadcountCategory(requirement.category) && required > 0 && (
            <section className="card">
              <h2 className="mb-2 font-semibold text-slate-900">Coverage</h2>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${Math.min(100, Math.round((awarded / required) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {awarded} of {required} awarded
                {awarded < required && ` · ${required - awarded} still open`}
              </p>
            </section>
          )}

          {requirement.invites.length > 0 && (
            <section className="card">
              <h2 className="mb-2 font-semibold text-slate-900">
                Invitations ({requirement.invites.length})
              </h2>
              <ul className="space-y-2">
                {requirement.invites.map((invite) => (
                  <li key={invite.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/contractors/${invite.contractor.id}`}
                      className="truncate text-slate-700 hover:text-brand-700"
                    >
                      {invite.contractor.firmName}
                    </Link>
                    <StatusBadge status={invite.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
