import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminRequestIp, requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { adminAudit } from "@/lib/notify";
import {
  setClientVerified,
  setContractorStatus,
  setContractorVerified,
  setUserSuspended,
} from "@/app/actions/admin";
import { DocumentReviewList } from "@/components/admin/DocumentReviewList";
import { CategoryBadge, Notice, Stars, StatusBadge, VerifiedBadge } from "@/components/Badge";
import { DefinitionList, InfoRow, PageHeader } from "@/components/ui";
import {
  RATING_PARAMETERS,
  categoryShort,
  industryLabel,
  roleLabel,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatNumber, yearRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Contractor review" };

const RATING_COLUMNS = [
  { key: "ratingDeployment", param: RATING_PARAMETERS[0] },
  { key: "ratingCompliance", param: RATING_PARAMETERS[1] },
  { key: "ratingWorkerPayment", param: RATING_PARAMETERS[2] },
  { key: "ratingManpowerQuality", param: RATING_PARAMETERS[3] },
  { key: "ratingResponsiveness", param: RATING_PARAMETERS[4] },
] as const;

/** As on the company page: "declared none" and "never answered" are not the same. */
function statutory(value: string | null, declared: boolean | null): string {
  if (value) return value;
  return declared === false ? "Declared: not registered" : "—";
}

export default async function AdminContractorDetail({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();

  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true, status: true } },
      documents: {
        orderBy: { createdAt: "desc" },
        // `data` is deliberately not selected. The bytes belong on the document
        // route, which logs each view; pulling every file into this page would
        // load megabytes nobody asked for and would put them on screen without
        // a record of who looked.
        select: {
          id: true,
          type: true,
          fileName: true,
          size: true,
          status: true,
          reviewNotes: true,
          createdAt: true,
          reviewedAt: true,
          reviewedBy: { select: { name: true, adminCode: true } },
        },
      },
      clients: { orderBy: [{ ongoing: "desc" }, { headcount: "desc" }] },
      capacities: true,
      reviewedBy: { select: { name: true, adminCode: true } },
      _count: { select: { proposals: true, engagements: true, reviews: true } },
    },
  });
  if (!contractor) notFound();

  // This page shows the owner's direct mobile and email plus the list of every
  // statutory document they have filed — the most sensitive view an admin has.
  // Reading it is itself recorded, and surfaces in amber on /admin/audit.
  await adminAudit(
    admin,
    "ADMIN_VIEW_USER",
    `contractor=${contractor.id} (${contractor.firmName})`,
    adminRequestIp(),
  );

  const pendingDocs = contractor.documents.filter((d) => d.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={contractor.firmName}
        subtitle={`${contractor.ownerName} · ${contractor.city}, ${contractor.state} · joined ${formatDate(contractor.createdAt)}`}
        action={
          <div className="flex items-center gap-2">
            {contractor.verified && <VerifiedBadge />}
            <StatusBadge status={contractor.status} />
            {contractor.user.status === "SUSPENDED" && <StatusBadge status="SUSPENDED" />}
          </div>
        }
      />

      {contractor.reviewedAt && (
        <p className="text-xs text-slate-500">
          Last decided {formatDateTime(contractor.reviewedAt)}
          {contractor.reviewedBy
            ? ` by ${contractor.reviewedBy.name} (${contractor.reviewedBy.adminCode})`
            : ""}
          .
        </p>
      )}

      {pendingDocs > 0 && contractor.status !== "APPROVED" && (
        <Notice tone="warning">
          {pendingDocs} document{pendingDocs === 1 ? " is" : "s are"} still
          unchecked. Work through them before approving the firm — the statutory
          record is the whole basis of the decision.
        </Notice>
      )}

      {/* --- Moderation ------------------------------------------------------ */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Moderation</h2>

        <form action={setContractorStatus} className="space-y-3">
          <input type="hidden" name="id" value={contractor.id} />
          <div>
            <label className="label" htmlFor="notes">
              Notes to the contractor
            </label>
            <input
              id="notes"
              name="notes"
              defaultValue={contractor.moderationNotes ?? ""}
              className="input"
              placeholder="Shown to the firm when you reject — say what needs fixing."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary btn-sm" name="status" value="APPROVED" type="submit">
              Approve
            </button>
            <button className="btn-secondary btn-sm" name="status" value="PENDING" type="submit">
              Move to pending
            </button>
            <button
              className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
              name="status"
              value="REJECTED"
              type="submit"
            >
              Reject
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <form action={setContractorVerified}>
            <input type="hidden" name="id" value={contractor.id} />
            <input type="hidden" name="verified" value={(!contractor.verified).toString()} />
            <button className="btn-secondary btn-sm" type="submit">
              {contractor.verified ? "Remove verified badge" : "Grant verified badge"}
            </button>
          </form>
          <form action={setUserSuspended}>
            <input type="hidden" name="id" value={contractor.user.id} />
            <input
              type="hidden"
              name="suspend"
              value={(contractor.user.status !== "SUSPENDED").toString()}
            />
            <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" type="submit">
              {contractor.user.status === "SUSPENDED" ? "Unsuspend account" : "Suspend account"}
            </button>
          </form>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* --- Documents -------------------------------------------------- */}
          <section className="card">
            <div className="mb-3">
              <h2 className="font-semibold text-slate-900">
                Verification documents ({contractor.documents.length})
              </h2>
              <p className="text-sm text-slate-500">
                Check each one against the statutory numbers declared in the
                sidebar. Opening a document is recorded against your name.
              </p>
            </div>
            <DocumentReviewList documents={contractor.documents} side="CONTRACTOR" />
          </section>

          {/* --- Client list ------------------------------------------------ */}
          <section className="card-flush overflow-hidden">
            <div className="px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                Track record ({contractor.clients.length})
              </h2>
              <p className="text-sm text-slate-500">
                Verify entries against a work order — this is the claim companies rely on most.
              </p>
            </div>

            {contractor.clients.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-500">No clients listed.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Site</th>
                      <th>Manpower</th>
                      <th>Period</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractor.clients.map((client) => (
                      <tr key={client.id}>
                        <td>
                          <span className="font-medium text-slate-800">{client.clientName}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {client.industry ? industryLabel(client.industry) : ""}
                            {client.industry && client.category ? " · " : ""}
                            {client.category ? categoryShort(client.category) : ""}
                          </span>
                          {client.scope && (
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {client.scope}
                            </span>
                          )}
                        </td>
                        <td className="text-slate-600">
                          {client.siteCity}, {client.siteState}
                        </td>
                        <td className="font-semibold text-slate-900">
                          {formatNumber(client.headcount)}
                        </td>
                        <td className="whitespace-nowrap text-slate-600">
                          {yearRange(client.startedYear, client.endedYear, client.ongoing)}
                        </td>
                        <td>
                          <form action={setClientVerified} className="flex justify-end">
                            <input type="hidden" name="id" value={client.id} />
                            <input
                              type="hidden"
                              name="verified"
                              value={(!client.verified).toString()}
                            />
                            <button
                              className={
                                client.verified
                                  ? "btn-ghost btn-sm text-brand-700"
                                  : "btn-secondary btn-sm"
                              }
                              type="submit"
                            >
                              {client.verified ? "✓ Verified" : "Mark verified"}
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {contractor.about && (
            <section className="card">
              <h2 className="mb-2 font-semibold text-slate-900">About</h2>
              <p className="prose-note">{contractor.about}</p>
            </section>
          )}
        </div>

        {/* --- Sidebar ------------------------------------------------------- */}
        <aside className="space-y-4">
          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Firm</h2>
            <DefinitionList>
              <InfoRow label="Owner">{contractor.ownerName}</InfoRow>
              <InfoRow label="Email">{contractor.user.email}</InfoRow>
              <InfoRow label="Mobile">{contractor.user.mobile ?? "—"}</InfoRow>
              <InfoRow label="Entity">{contractor.entityType ?? "—"}</InfoRow>
              <InfoRow label="Established">{contractor.yearEstablished ?? "—"}</InfoRow>
              <InfoRow label="Workforce">{formatNumber(contractor.totalWorkforce)}</InfoRow>
              <InfoRow label="Available">{formatNumber(contractor.availableNow)}</InfoRow>
              <InfoRow label="Mobilisation">{contractor.mobilizationDays} days</InfoRow>
              <InfoRow label="Proposals">{contractor._count.proposals}</InfoRow>
              <InfoRow label="Engagements">{contractor._count.engagements}</InfoRow>
            </DefinitionList>
          </section>

          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Statutory</h2>
            <DefinitionList>
              <InfoRow label="CLRA licence">{contractor.labourLicenceNo ?? "—"}</InfoRow>
              <InfoRow label="GSTIN">{statutory(contractor.gstin, contractor.hasGst)}</InfoRow>
              <InfoRow label="PAN">{statutory(contractor.pan, contractor.hasPan)}</InfoRow>
              <InfoRow label="EPF">{contractor.epfNo ?? "—"}</InfoRow>
              <InfoRow label="ESIC">{contractor.esicNo ?? "—"}</InfoRow>
            </DefinitionList>
          </section>

          {contractor.ratingCount > 0 && (
            <section className="card">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">Ratings</h2>
                <Stars value={contractor.rating} count={contractor.ratingCount} />
              </div>
              <DefinitionList>
                {RATING_COLUMNS.map(({ key, param }) => (
                  <InfoRow key={key} label={param.label}>
                    {contractor[key].toFixed(1)}
                  </InfoRow>
                ))}
              </DefinitionList>
            </section>
          )}

          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Offering</h2>
            <div className="flex flex-wrap gap-1.5">
              {contractor.categories.map((c) => (
                <CategoryBadge key={c} category={c} />
              ))}
            </div>

            {contractor.capacities.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
                {contractor.capacities.map((cap) => (
                  <div key={cap.id} className="flex justify-between gap-2">
                    <span className="text-slate-600">{categoryShort(cap.category)}</span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(cap.strength)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="mb-1 mt-3 stat-label">Sectors</p>
            <div className="flex flex-wrap gap-1.5">
              {contractor.industries.map((i) => (
                <span key={i} className="chip">
                  {industryLabel(i)}
                </span>
              ))}
            </div>

            {contractor.roles.length > 0 && (
              <>
                <p className="mb-1 mt-3 stat-label">Roles & scopes</p>
                <div className="flex flex-wrap gap-1.5">
                  {contractor.roles.map((r) => (
                    <span key={r} className="chip">
                      {roleLabel(r)}
                    </span>
                  ))}
                </div>
              </>
            )}

            <p className="mb-1 mt-3 stat-label">Presence</p>
            <div className="flex flex-wrap gap-1.5">
              {contractor.presenceStates.map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
