import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminRequestIp, requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { adminAudit } from "@/lib/notify";
import { setCompanyStatus, setCompanyVerified, setUserSuspended } from "@/app/actions/admin";
import { DocumentReviewList } from "@/components/admin/DocumentReviewList";
import { CategoryBadge, Notice, StatusBadge, VerifiedBadge } from "@/components/Badge";
import { DefinitionList, InfoRow, PageHeader } from "@/components/ui";
import { categoryShort, industryLabel } from "@/lib/constants";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Company review" };

/**
 * Admin view of one company — the counterpart to the contractor review page,
 * which existed while companies only ever had a list. Without this, an admin
 * could approve or reject a company without ever seeing what it had posted.
 *
 * Opening this page records an ADMIN_VIEW_USER entry: it shows a named person's
 * direct mobile and email, which is exactly the kind of access that ought to
 * leave a trace.
 */
/**
 * A blank identifier means two different things on the checklist: the firm said
 * it holds no such registration, or it never answered. A reviewer chasing
 * missing papers needs to know which.
 */
function statutory(value: string | null, declared: boolean | null): string {
  if (value) return value;
  return declared === false ? "Declared: not registered" : "Not provided";
}

export default async function AdminCompanyDetail({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();

  const company = await prisma.companyProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true, status: true } },
      reviewedBy: { select: { name: true, adminCode: true } },
      documents: {
        orderBy: { createdAt: "desc" },
        // `data` deliberately omitted — see the contractor page for why.
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
      requirements: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          createdAt: true,
          _count: { select: { proposals: true } },
        },
      },
      _count: { select: { requirements: true, engagements: true, reviewsGiven: true } },
    },
  });
  if (!company) notFound();

  await adminAudit(
    admin,
    "ADMIN_VIEW_USER",
    `company=${company.id} (${company.companyName})`,
    adminRequestIp(),
  );

  const pendingDocs = company.documents.filter((d) => d.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.companyName}
        subtitle={`${company.city}, ${company.state} · joined ${formatDate(company.createdAt)}`}
        action={
          <div className="flex items-center gap-2">
            {company.verified && <VerifiedBadge />}
            <StatusBadge status={company.status} />
            {company.user.status === "SUSPENDED" && <StatusBadge status="SUSPENDED" />}
          </div>
        }
      />

      {company.reviewedAt && (
        <p className="text-xs text-slate-500">
          Last decided {formatDateTime(company.reviewedAt)}
          {company.reviewedBy
            ? ` by ${company.reviewedBy.name} (${company.reviewedBy.adminCode})`
            : ""}
          .
        </p>
      )}

      {pendingDocs > 0 && (
        <Notice tone="warning">
          {pendingDocs} document{pendingDocs === 1 ? " is" : "s are"} still
          unchecked.
        </Notice>
      )}

      {/* --- Moderation ------------------------------------------------------ */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Moderation</h2>

        <form action={setCompanyStatus} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={company.id} />
          <div className="min-w-[12rem] flex-1">
            <label className="label" htmlFor="notes">
              Notes to the company
            </label>
            <input
              id="notes"
              name="notes"
              className="input"
              defaultValue={company.moderationNotes ?? ""}
              placeholder="Shown to them when you reject — say what needs fixing."
            />
          </div>
          <button name="status" value="APPROVED" className="btn-primary" type="submit">
            Approve
          </button>
          <button name="status" value="REJECTED" className="btn-danger" type="submit">
            Reject
          </button>
        </form>

        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <form action={setCompanyVerified}>
            <input type="hidden" name="id" value={company.id} />
            <input type="hidden" name="verified" value={company.verified ? "false" : "true"} />
            <button type="submit" className="btn-secondary btn-sm">
              {company.verified ? "Remove verified badge" : "Grant verified badge"}
            </button>
          </form>

          <form action={setUserSuspended}>
            <input type="hidden" name="id" value={company.user.id} />
            <input
              type="hidden"
              name="suspend"
              value={company.user.status === "SUSPENDED" ? "false" : "true"}
            />
            <button
              type="submit"
              className={
                company.user.status === "SUSPENDED" ? "btn-secondary btn-sm" : "btn-danger btn-sm"
              }
            >
              {company.user.status === "SUSPENDED" ? "Reactivate account" : "Suspend account"}
            </button>
          </form>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section className="card">
            <div className="mb-3">
              <h2 className="font-semibold text-slate-900">
                Verification documents ({company.documents.length})
              </h2>
              <p className="text-sm text-slate-500">
                Check the registered name and identifiers against what is
                declared in the sidebar, and that the authorisation letter names
                the contact on record. Opening a document is recorded against
                your name.
              </p>
            </div>
            <DocumentReviewList documents={company.documents} side="COMPANY" />
          </section>

          {company.about && (
            <section className="card">
              <h2 className="mb-2 font-semibold text-slate-900">About</h2>
              <p className="prose-note">{company.about}</p>
            </section>
          )}

          <section className="card-flush overflow-hidden">
            <div className="px-5 py-4">
              <h2 className="font-semibold text-slate-900">Requirements posted</h2>
              <p className="text-sm text-slate-500">
                {formatNumber(company._count.requirements)} total ·{" "}
                {formatNumber(company._count.engagements)} engagement
                {company._count.engagements === 1 ? "" : "s"}
              </p>
            </div>

            {company.requirements.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-500">
                This company hasn&apos;t posted anything yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-[36rem]">
                  <thead>
                    <tr>
                      <th>Requirement</th>
                      <th>Type</th>
                      <th>Proposals</th>
                      <th>Status</th>
                      <th>Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.requirements.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium text-slate-800">{r.title}</td>
                        <td>
                          <CategoryBadge category={r.category} />
                        </td>
                        <td className="text-slate-600">{formatNumber(r._count.proposals)}</td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="whitespace-nowrap text-slate-600">
                          {formatDate(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Contact on record</h2>
            <DefinitionList>
              <InfoRow label="Contact">{company.contactName}</InfoRow>
              {company.contactDesignation && (
                <InfoRow label="Designation">{company.contactDesignation}</InfoRow>
              )}
              <InfoRow label="Mobile">{company.contactMobile}</InfoRow>
              <InfoRow label="Email">
                <span className="break-all">{company.contactEmail}</span>
              </InfoRow>
              <InfoRow label="Account">
                <span className="break-all">{company.user.email}</span>
              </InfoRow>
            </DefinitionList>
            <p className="mt-3 text-xs text-slate-400">
              Viewing this page is recorded in the audit log.
            </p>
          </section>

          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Firm details</h2>
            <DefinitionList>
              <InfoRow label="Entity">{company.entityType ?? "—"}</InfoRow>
              <InfoRow label="Nature">{company.natureOfBusiness ?? "—"}</InfoRow>
              <InfoRow label="Own strength">{company.manpowerBand ?? "—"}</InfoRow>
              <InfoRow label="Location">
                {company.city}, {company.state}
                {company.pincode ? ` ${company.pincode}` : ""}
              </InfoRow>
              <InfoRow label="Ratings given">{formatNumber(company._count.reviewsGiven)}</InfoRow>
            </DefinitionList>
          </section>

          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Statutory</h2>
            <DefinitionList>
              <InfoRow label="GSTIN">{statutory(company.gstin, company.hasGst)}</InfoRow>
              <InfoRow label="PAN">{statutory(company.pan, company.hasPan)}</InfoRow>
              <InfoRow label="CLRA registration">
                {statutory(company.clraRegNo, company.hasClra)}
              </InfoRow>
              <InfoRow label="CIN">{company.cin ?? "Not provided"}</InfoRow>
            </DefinitionList>
          </section>

          {company.industries.length > 0 && (
            <section className="card">
              <h2 className="mb-2 font-semibold text-slate-900">Sectors</h2>
              <div className="flex flex-wrap gap-1.5">
                {company.industries.map((i) => (
                  <span key={i} className="chip">
                    {industryLabel(i)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {company.categoriesUsed.length > 0 && (
            <section className="card">
              <h2 className="mb-2 font-semibold text-slate-900">Contract types engaged</h2>
              <div className="flex flex-wrap gap-1.5">
                {company.categoriesUsed.map((c) => (
                  <span key={c} className="chip">
                    {categoryShort(c)}
                  </span>
                ))}
              </div>
            </section>
          )}

          <Link href="/admin/companies" className="btn-secondary w-full">
            Back to companies
          </Link>
        </aside>
      </div>
    </div>
  );
}
