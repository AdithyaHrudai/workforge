import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getContractorPublicProfile } from "@/lib/search";
import { hasContactEntitlement, resolveContractorContact } from "@/lib/contacts";
import { CategoryBadge, Stars, StatusBadge, VerifiedBadge } from "@/components/Badge";
import { ContactPanel } from "@/components/ContactPanel";
import { InviteForm } from "@/components/forms/InviteForm";
import { DefinitionList, InfoRow, PageHeader } from "@/components/ui";
import {
  DOCUMENT_TYPE_LABELS,
  categoryShort,
  industryLabel,
  roleLabel,
} from "@/lib/constants";
import { siteUrl } from "@/lib/site";
import { formatDate, formatNumber, initials, timeAgo, yearRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PARAMETER_COLUMNS = [
  { key: "ratingDeployment", label: "Timely deployment" },
  { key: "ratingCompliance", label: "Statutory compliance" },
  { key: "ratingWorkerPayment", label: "Worker payment" },
  { key: "ratingManpowerQuality", label: "Manpower quality" },
  { key: "ratingResponsiveness", label: "Responsiveness" },
] as const;

/**
 * The canonical firm profile, and the platform's main public surface.
 *
 * It is deliberately readable without an account: this is the page a contractor
 * sends a prospect and the page search engines index, which is what makes the
 * directory worth being listed in. Phone and email are still gated — that
 * decision belongs to `resolveContractorContact`, which masks whenever there is
 * no company viewing.
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const contractor = await getContractorPublicProfile(params.id);
  if (!contractor) return { title: "Contractor not found" };

  const where = [contractor.city, contractor.state].filter(Boolean).join(", ");
  const sectors = contractor.industries.slice(0, 3).map(industryLabel).join(", ");
  const description =
    `${contractor.firmName} is a contract manpower supplier based in ${where}` +
    (sectors ? `, working across ${sectors}` : "") +
    (contractor.totalWorkforce > 0
      ? `, with a declared workforce of ${formatNumber(contractor.totalWorkforce)}`
      : "") +
    ". See their client list, regional presence and compliance record on WorkForge.";

  return {
    title: `${contractor.firmName} — contract manpower in ${where}`,
    description,
    alternates: { canonical: `${siteUrl()}/contractors/${contractor.id}` },
    openGraph: {
      type: "profile",
      title: `${contractor.firmName} · WorkForge`,
      description,
      url: `${siteUrl()}/contractors/${contractor.id}`,
    },
  };
}

export default async function ContractorProfilePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { requirement?: string };
}) {
  const contractor = await getContractorPublicProfile(params.id);
  if (!contractor) notFound();

  const session = await getSession();

  // Only a company gets contact details and the invite form. Everyone else —
  // logged out, another contractor, an admin browsing — sees the public profile.
  const company =
    session?.role === "COMPANY"
      ? await prisma.companyProfile.findUnique({
          where: { userId: session.uid },
          select: { id: true },
        })
      : null;

  const [entitled, openRequirements] = company
    ? await Promise.all([
        hasContactEntitlement(company.id, contractor.id),
        prisma.requirement.findMany({
          where: {
            companyId: company.id,
            status: "OPEN",
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: { id: true, title: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ])
    : [false, [] as { id: string; title: string }[]];

  const contact = await resolveContractorContact({
    companyId: company?.id ?? null,
    contractorId: contractor.id,
    contact: {
      name: contractor.ownerName,
      mobile: contractor.user.mobile,
      email: contractor.user.email,
    },
    source: "SEARCH",
    alreadyEntitled: entitled,
  });

  const ongoing = contractor.clients.filter((c) => c.ongoing);
  const past = contractor.clients.filter((c) => !c.ongoing);
  const totalDeployed = ongoing.reduce((sum, c) => sum + c.headcount, 0);

  // Structured data so the firm can surface as an organisation in search
  // results. Only public facts go in — never the gated contact details.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: contractor.firmName,
    url: `${siteUrl()}/contractors/${contractor.id}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: contractor.city,
      addressRegion: contractor.state,
      addressCountry: "IN",
    },
    ...(contractor.yearEstablished ? { foundingDate: String(contractor.yearEstablished) } : {}),
    ...(contractor.about ? { description: contractor.about } : {}),
    ...(contractor.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: contractor.rating.toFixed(1),
            reviewCount: contractor.ratingCount,
            bestRating: 5,
          },
        }
      : {}),
  };

  const backHref = company ? "/company/search" : "/contractors";

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        title={contractor.firmName}
        subtitle={`${contractor.city}, ${contractor.state}${contractor.yearEstablished ? ` · Established ${contractor.yearEstablished}` : ""}`}
        action={
          <Link href={backHref} className="btn-secondary">
            Back to directory
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* min-w-0 keeps the track-record table's intrinsic width from widening
            the whole grid — a grid item is min-width:auto by default. */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* --- Header card ------------------------------------------------ */}
          <section className="card">
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-lg font-bold text-brand-800">
                {initials(contractor.firmName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{contractor.firmName}</h2>
                  {contractor.verified && <VerifiedBadge />}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {contractor.entityType ?? "Contractor"} · {contractor.ownerName}
                  {contractor.ownerDesignation ? `, ${contractor.ownerDesignation}` : ""}
                </p>
                <div className="mt-2">
                  <Stars value={contractor.rating} count={contractor.ratingCount} size="md" />
                </div>
              </div>
            </div>

            {contractor.about && <p className="prose-note mt-4">{contractor.about}</p>}

            <div className="mt-4 flex flex-wrap gap-1.5">
              {contractor.categories.map((c) => (
                <CategoryBadge key={c} category={c} full />
              ))}
            </div>
          </section>

          {/* --- Track record ------------------------------------------------ */}
          <section className="card-flush overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">Track record</h2>
                <p className="text-sm text-slate-500">
                  {contractor._count.clients} client{contractor._count.clients === 1 ? "" : "s"}
                  {totalDeployed > 0 && ` · ${formatNumber(totalDeployed)} manpower currently deployed`}
                </p>
              </div>
            </div>

            {contractor.clients.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-500">
                This firm hasn&apos;t published a client list yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-[40rem]">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Site</th>
                      <th>Scope</th>
                      <th>Manpower</th>
                      <th>Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...ongoing, ...past].map((client) => (
                      <tr key={client.id}>
                        <td>
                          <span className="font-medium text-slate-800">{client.clientName}</span>
                          {client.verified && (
                            <span
                              className="ml-1 text-brand-600"
                              title="Verified by WorkForge against a work order"
                            >
                              ✓
                            </span>
                          )}
                          {client.industry && (
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {industryLabel(client.industry)}
                            </span>
                          )}
                        </td>
                        <td className="text-slate-600">
                          {client.siteCity}, {client.siteState}
                        </td>
                        <td className="max-w-xs text-slate-600">
                          {client.category && (
                            <span className="block text-xs font-medium text-slate-500">
                              {categoryShort(client.category)}
                            </span>
                          )}
                          {client.scope ?? "—"}
                        </td>
                        <td className="font-semibold text-slate-900">
                          {client.headcount > 0 ? formatNumber(client.headcount) : "—"}
                        </td>
                        <td className="whitespace-nowrap text-slate-600">
                          {yearRange(client.startedYear, client.endedYear, client.ongoing)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
              Entries marked ✓ have been verified by our team against a work order. The rest are
              self-declared.
            </p>
          </section>

          {/* --- Ratings breakdown ------------------------------------------- */}
          {contractor.ratingCount > 0 && (
            <section className="card">
              <h2 className="mb-3 font-semibold text-slate-900">
                Ratings from {contractor.ratingCount} engagement
                {contractor.ratingCount === 1 ? "" : "s"}
              </h2>

              <div className="space-y-2.5">
                {PARAMETER_COLUMNS.map((col) => {
                  const value = contractor[col.key];
                  return (
                    <div key={col.key} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm text-slate-600 sm:w-44">{col.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-forge-500"
                          style={{ width: `${(value / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-sm font-semibold text-slate-800">
                        {value.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {contractor.reviews.length > 0 && (
                <ul className="mt-5 space-y-4 border-t border-slate-100 pt-4">
                  {contractor.reviews
                    .filter((r) => r.comment)
                    .slice(0, 5)
                    .map((review) => (
                      <li key={review.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-800">
                            {review.company.companyName}
                          </span>
                          <Stars value={review.overall} />
                        </div>
                        <p className="prose-note mt-1">{review.comment}</p>
                        <p className="mt-1 text-xs text-slate-400">{timeAgo(review.createdAt)}</p>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* --- Sidebar ------------------------------------------------------- */}
        <aside className="space-y-4">
          <ContactPanel
            title="Contact"
            contact={contact}
            note={
              entitled
                ? "You already work with this firm, so contact details are always visible to you."
                : undefined
            }
          />

          {!session && (
            <div className="card bg-brand-50 ring-1 ring-brand-200">
              <h2 className="font-semibold text-slate-900">Hiring contract manpower?</h2>
              <p className="mt-1 text-sm text-slate-600">
                Register as a company to see this firm&apos;s phone and email, and to invite them to
                quote on your requirement. It is free.
              </p>
              <Link href="/register" className="btn-primary mt-3 w-full">
                Create a company account
              </Link>
              <p className="mt-2 text-center text-xs text-slate-500">
                Already registered?{" "}
                <Link href={`/login?next=/contractors/${contractor.id}`} className="font-medium text-brand-700 hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          )}

          {company && (
            <InviteForm
              contractorId={contractor.id}
              contractorName={contractor.firmName}
              requirements={openRequirements}
              defaultRequirementId={searchParams.requirement}
            />
          )}

          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Capacity</h2>
            <DefinitionList>
              <InfoRow label="Total workforce">{formatNumber(contractor.totalWorkforce)}</InfoRow>
              <InfoRow label="Available now">{formatNumber(contractor.availableNow)}</InfoRow>
              <InfoRow label="Mobilisation">{contractor.mobilizationDays} days</InfoRow>
              <InfoRow label="Engagements here">{contractor._count.engagements}</InfoRow>
            </DefinitionList>

            {contractor.capacities.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                {contractor.capacities.map((cap) => (
                  <div key={cap.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-600">{categoryShort(cap.category)}</span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(cap.strength)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Coverage</h2>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Operates in
            </p>
            <div className="flex flex-wrap gap-1.5">
              {contractor.presenceStates.map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
            </div>

            {contractor.workerSourceStates.length > 0 && (
              <>
                <p className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Workers sourced from
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {contractor.workerSourceStates.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}

            {contractor.willingOutstation && (
              <p className="mt-3 text-xs text-slate-500">Willing to mobilise outstation.</p>
            )}
          </section>

          {contractor.industries.length > 0 && (
            <section className="card">
              <h2 className="mb-2 font-semibold text-slate-900">Sector experience</h2>
              <div className="flex flex-wrap gap-1.5">
                {contractor.industries.map((i) => (
                  <span key={i} className="chip">
                    {industryLabel(i)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {contractor.roles.length > 0 && (
            <section className="card">
              <h2 className="mb-2 font-semibold text-slate-900">Roles &amp; scopes supplied</h2>
              <div className="flex flex-wrap gap-1.5">
                {contractor.roles.map((r) => (
                  <span key={r} className="chip">
                    {roleLabel(r)}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Compliance</h2>
            <DefinitionList>
              <InfoRow label="CLRA licence">
                {contractor.labourLicenceNo ? "On record" : "Not provided"}
              </InfoRow>
              <InfoRow label="GSTIN">{contractor.gstin ? "On record" : "Not provided"}</InfoRow>
              <InfoRow label="EPF">{contractor.epfNo ? "On record" : "Not provided"}</InfoRow>
              <InfoRow label="ESIC">{contractor.esicNo ? "On record" : "Not provided"}</InfoRow>
              <InfoRow label="Joined">{formatDate(contractor.createdAt)}</InfoRow>
            </DefinitionList>

            {contractor.documents.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Verified documents
                </p>
                <ul className="space-y-1">
                  {contractor.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-600">
                        {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                      </span>
                      <StatusBadge status={doc.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">
              Statutory numbers are shown as held-on-record rather than in full. Ask the contractor
              directly for certificates.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
