import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEngagementWithParties, isParticipant } from "@/lib/engagements";
import {
  cancelEngagement,
  completeEngagement,
  rateCompany,
  updateDeployedHeadcount,
} from "@/app/actions/engagement";
import { MessageThread } from "@/components/MessageThread";
import { ReviewForm } from "@/components/forms/ReviewForm";
import { CategoryBadge, Notice, Stars, StatusBadge } from "@/components/Badge";
import { DefinitionList, InfoRow, PageHeader } from "@/components/ui";
import {
  CATEGORY,
  RATING_PARAMETERS,
  isHeadcountCategory,
  rateBasisLabel,
  roleLabel,
} from "@/lib/constants";
import { formatDate, formatINR, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Engagement" };

/** A party's contact block. Both sides are entitled to these on an engagement. */
function PartyCard({
  role,
  name,
  org,
  location,
  mobile,
  email,
}: {
  role: string;
  name: string;
  org: string;
  location: string;
  mobile: string | null;
  email: string;
}) {
  return (
    <section className="card">
      <p className="stat-label">{role}</p>
      <p className="mt-1 font-semibold text-slate-900">{org}</p>
      <p className="text-sm text-slate-500">
        {name} · {location}
      </p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Mobile</dt>
          <dd>
            {mobile ? (
              <a href={`tel:${mobile}`} className="font-medium text-brand-700 hover:underline">
                {mobile}
              </a>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="shrink-0 text-slate-500">Email</dt>
          <dd className="min-w-0">
            <a
              href={`mailto:${email}`}
              className="block truncate font-medium text-brand-700 hover:underline"
            >
              {email}
            </a>
          </dd>
        </div>
      </dl>
    </section>
  );
}

export default async function EngagementDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const engagement = await getEngagementWithParties(params.id);
  if (!engagement) notFound();

  // Participants only. An engagement is a private commercial arrangement
  // between two parties; nobody else has business on this page.
  if (!isParticipant(engagement, user.id)) notFound();

  const isCompany = engagement.company.user.id === user.id;
  const isContractor = engagement.contractor.user.id === user.id;
  const { requirement } = engagement;
  const jobContract = requirement.category === CATEGORY.JOB_CONTRACT;
  const active = engagement.status === "ACTIVE";
  const completed = engagement.status === "COMPLETED";

  const otherName = isCompany
    ? engagement.contractor.firmName
    : engagement.company.companyName;

  return (
    <div className="space-y-6">
      <PageHeader
        title={requirement.title}
        subtitle={`${requirement.city}, ${requirement.state} · awarded ${formatDate(engagement.startedAt)}`}
        action={
          <div className="flex flex-wrap gap-2">
            {active && (
              <>
                <form action={completeEngagement}>
                  <input type="hidden" name="id" value={engagement.id} />
                  <button className="btn-primary" type="submit">
                    Mark complete
                  </button>
                </form>
                <form action={cancelEngagement}>
                  <input type="hidden" name="id" value={engagement.id} />
                  <button className="btn-ghost text-red-600 hover:bg-red-50" type="submit">
                    Cancel
                  </button>
                </form>
              </>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={requirement.category} full />
        <StatusBadge status={engagement.status} />
      </div>

      {engagement.status === "CANCELLED" && (
        <Notice tone="warning">
          This engagement was cancelled. The requirement was reopened for other proposals.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* --- Commercials ------------------------------------------------ */}
          <section className="card">
            <h2 className="mb-3 font-semibold text-slate-900">Agreed commercials</h2>
            <DefinitionList>
              <InfoRow label="Rate">
                <span className="text-base font-bold text-slate-900">
                  {formatINR(engagement.rateAmount)}
                </span>{" "}
                <span className="font-normal text-slate-500">
                  {rateBasisLabel(engagement.rateBasis)}
                </span>
              </InfoRow>
              {engagement.headcount != null && (
                <InfoRow label="Manpower deployed">{formatNumber(engagement.headcount)}</InfoRow>
              )}
              {engagement.estimatedValue > 0 && (
                <InfoRow label="Estimated contract value">
                  {formatINR(engagement.estimatedValue)}
                </InfoRow>
              )}
              <InfoRow label="Mobilisation quoted">
                {engagement.proposal.mobilizationDays} days
              </InfoRow>
              <InfoRow label="Started">{formatDate(engagement.startedAt)}</InfoRow>
              {engagement.completedAt && (
                <InfoRow label="Completed">{formatDate(engagement.completedAt)}</InfoRow>
              )}
            </DefinitionList>

            {engagement.proposal.coverNote && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="stat-label mb-1">Contractor&apos;s covering note</p>
                <p className="prose-note">{engagement.proposal.coverNote}</p>
              </div>
            )}

            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
              WorkForge records the agreed terms but does not process payments. Invoice your
              counterparty directly.
            </p>
          </section>

          {/* --- What was contracted ---------------------------------------- */}
          <section className="card">
            <h2 className="mb-3 font-semibold text-slate-900">
              {jobContract ? "Scope of work" : "Roles contracted"}
            </h2>
            {jobContract ? (
              <>
                {requirement.scopeKey && (
                  <p className="mb-2 font-medium text-slate-800">{roleLabel(requirement.scopeKey)}</p>
                )}
                {requirement.outputQuantity != null && (
                  <p className="mb-2 text-sm text-slate-600">
                    Output: {formatNumber(requirement.outputQuantity)} {requirement.outputUnit}
                    {requirement.outputPeriod ? ` ${requirement.outputPeriod}` : ""}
                  </p>
                )}
                {requirement.description && <p className="prose-note">{requirement.description}</p>}
              </>
            ) : (
              <ul className="space-y-1.5">
                {requirement.roles.map((role) => (
                  <li key={role.id} className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-700">{roleLabel(role.role)}</span>
                    <span className="font-semibold text-slate-900">{role.headcount}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* --- Deployed headcount (live staffing engagements) -------------- */}
          {active && isHeadcountCategory(requirement.category) && (
            <form action={updateDeployedHeadcount} className="card">
              <h2 className="mb-2 font-semibold text-slate-900">Update deployed headcount</h2>
              <p className="mb-3 text-sm text-slate-500">
                Keep the record in step with what is actually on site.
              </p>
              <input type="hidden" name="id" value={engagement.id} />
              <div className="flex items-end gap-3">
                <div className="max-w-[10rem] flex-1">
                  <label className="label" htmlFor="headcount">
                    People on site
                  </label>
                  <input
                    id="headcount"
                    name="headcount"
                    type="number"
                    min={0}
                    defaultValue={engagement.headcount ?? 0}
                    className="input"
                  />
                </div>
                <button type="submit" className="btn-secondary">
                  Update
                </button>
              </div>
            </form>
          )}

          {/* --- Rating ------------------------------------------------------ */}
          {completed && isCompany && !engagement.review && (
            <ReviewForm
              engagementId={engagement.id}
              contractorName={engagement.contractor.firmName}
            />
          )}

          {engagement.review && (
            <section className="card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">
                  Rating for {engagement.contractor.firmName}
                </h2>
                <Stars value={engagement.review.overall} size="md" />
              </div>
              <div className="space-y-2">
                {RATING_PARAMETERS.map((p) => {
                  const value = engagement.review![p.key as keyof typeof engagement.review] as number;
                  return (
                    <div key={p.key} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-600">{p.label}</span>
                      <Stars value={value} />
                    </div>
                  );
                })}
              </div>
              {engagement.review.comment && (
                <p className="prose-note mt-3 border-t border-slate-100 pt-3">
                  {engagement.review.comment}
                </p>
              )}
            </section>
          )}

          {completed && isContractor && engagement.companyRating === null && (
            <form action={rateCompany} className="card">
              <h2 className="mb-1 font-semibold text-slate-900">
                Rate {engagement.company.companyName}
              </h2>
              <p className="mb-3 text-sm text-slate-500">
                Was the site ready, were approvals and payments on time?
              </p>
              <input type="hidden" name="id" value={engagement.id} />
              <div className="flex flex-wrap items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="submit"
                    name="rating"
                    value={n}
                    className="btn-secondary btn-sm"
                  >
                    {n} ★
                  </button>
                ))}
              </div>
            </form>
          )}

          {engagement.companyRating !== null && (
            <section className="card">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">
                  Contractor&apos;s rating of {engagement.company.companyName}
                </h2>
                <Stars value={engagement.companyRating} />
              </div>
            </section>
          )}

          <MessageThread
            engagementId={engagement.id}
            meId={user.id}
            otherName={otherName}
            active={engagement.status !== "CANCELLED"}
          />
        </div>

        {/* --- Sidebar ------------------------------------------------------- */}
        <aside className="space-y-4">
          <PartyCard
            role="Company"
            org={engagement.company.companyName}
            name={engagement.company.contactName}
            location={`${engagement.company.city}, ${engagement.company.state}`}
            mobile={engagement.company.contactMobile}
            email={engagement.company.contactEmail}
          />

          <PartyCard
            role="Contractor"
            org={engagement.contractor.firmName}
            name={engagement.contractor.ownerName}
            location={`${engagement.contractor.city}, ${engagement.contractor.state}`}
            mobile={engagement.contractor.user.mobile}
            email={engagement.contractor.user.email}
          />

          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Source requirement</h2>
            <Link
              href={
                isCompany
                  ? `/company/requirements/${requirement.id}`
                  : `/contractor/requirements/${requirement.id}`
              }
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              {requirement.title}
            </Link>
            <p className="mt-1 text-xs text-slate-500">
              {requirement.city}, {requirement.state}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
