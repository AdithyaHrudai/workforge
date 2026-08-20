import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { CategoryBadge, StatusBadge, VerifiedBadge } from "@/components/Badge";
import { setCompanyStatus, setCompanyVerified, setUserSuspended } from "@/app/actions/admin";
import { EmptyState, PageHeader } from "@/components/ui";
import { NATURE_LABELS, industryLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Companies" };

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"];

export default async function AdminCompanies({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireAdmin();
  const status = (searchParams.status || "ALL").toUpperCase();
  const filtered = FILTERS.includes(status) ? status : "ALL";

  const companies = await prisma.companyProfile.findMany({
    where: filtered !== "ALL" ? { status: filtered } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      user: { select: { id: true, status: true, email: true, mobile: true } },
      _count: { select: { requirements: true, engagements: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Companies"
        subtitle="Review registrations and grant the verified badge."
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/companies" : `/admin/companies?status=${f}`}
            className={
              filtered === f
                ? "btn btn-sm bg-brand-700 text-white"
                : "btn btn-sm bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            }
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {companies.length === 0 ? (
        <EmptyState title="No companies in this view" />
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <div key={c.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/companies/${c.id}`}
                      className="font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                    >
                      {c.companyName}
                    </Link>
                    {c.verified && <VerifiedBadge />}
                    {c.user.status === "SUSPENDED" && <StatusBadge status="SUSPENDED" />}
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.contactName}
                    {c.contactDesignation ? `, ${c.contactDesignation}` : ""} · {c.user.email} ·{" "}
                    {c.contactMobile} · {c.city}, {c.state}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.natureOfBusiness ? NATURE_LABELS[c.natureOfBusiness] : "—"} ·{" "}
                    {c._count.requirements} requirement{c._count.requirements === 1 ? "" : "s"} ·{" "}
                    {c._count.engagements} engagement{c._count.engagements === 1 ? "" : "s"} · joined{" "}
                    {formatDate(c.createdAt)}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.categoriesUsed.map((cat) => (
                      <CategoryBadge key={cat} category={cat} />
                    ))}
                    {c.industries.slice(0, 3).map((i) => (
                      <span key={i} className="chip">
                        {industryLabel(i)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {c.status !== "APPROVED" && (
                    <form action={setCompanyStatus}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value="APPROVED" />
                      <button className="btn-primary btn-sm" type="submit">
                        Approve
                      </button>
                    </form>
                  )}
                  {c.status !== "REJECTED" && (
                    <form action={setCompanyStatus}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value="REJECTED" />
                      <button className="btn-secondary btn-sm" type="submit">
                        Reject
                      </button>
                    </form>
                  )}
                  <form action={setCompanyVerified}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="verified" value={(!c.verified).toString()} />
                    <button className="btn-secondary btn-sm" type="submit">
                      {c.verified ? "Remove verified" : "Grant verified"}
                    </button>
                  </form>
                  <form action={setUserSuspended}>
                    <input type="hidden" name="id" value={c.user.id} />
                    <input
                      type="hidden"
                      name="suspend"
                      value={(c.user.status !== "SUSPENDED").toString()}
                    />
                    <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" type="submit">
                      {c.user.status === "SUSPENDED" ? "Unsuspend" : "Suspend"}
                    </button>
                  </form>
                </div>
              </div>

              {c.moderationNotes && (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Note: {c.moderationNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
