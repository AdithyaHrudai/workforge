import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { CategoryBadge, Stars, StatusBadge, VerifiedBadge } from "@/components/Badge";
import { EmptyState, PageHeader } from "@/components/ui";
import { industryLabel } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Contractors" };

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"];

export default async function AdminContractors({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireAdmin();
  const status = (searchParams.status || "ALL").toUpperCase();
  const filtered = FILTERS.includes(status) ? status : "ALL";

  const contractors = await prisma.contractorProfile.findMany({
    where: filtered !== "ALL" ? { status: filtered } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      user: { select: { status: true, email: true } },
      _count: { select: { documents: true, clients: true, engagements: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contractors"
        subtitle="Approve firms, verify documents and corroborate their track record."
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/contractors" : `/admin/contractors?status=${f}`}
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

      {contractors.length === 0 ? (
        <EmptyState title="No contractors in this view" />
      ) : (
        <div className="space-y-3">
          {contractors.map((c) => (
            <Link key={c.id} href={`/admin/contractors/${c.id}`} className="card card-hover block">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{c.firmName}</p>
                    {c.verified && <VerifiedBadge />}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.ownerName} · {c.user.email} · {c.city}, {c.state} · joined{" "}
                    {formatDate(c.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatNumber(c.totalWorkforce)} workforce · {c._count.clients} client
                    {c._count.clients === 1 ? "" : "s"} · {c._count.documents} document
                    {c._count.documents === 1 ? "" : "s"} · {c._count.engagements} engagement
                    {c._count.engagements === 1 ? "" : "s"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.categories.map((cat) => (
                      <CategoryBadge key={cat} category={cat} />
                    ))}
                    {c.industries.slice(0, 3).map((i) => (
                      <span key={i} className="chip">
                        {industryLabel(i)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex items-center gap-2">
                    {c.user.status === "SUSPENDED" && <StatusBadge status="SUSPENDED" />}
                    <StatusBadge status={c.status} />
                  </div>
                  <Stars value={c.rating} count={c.ratingCount} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
