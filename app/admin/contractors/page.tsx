import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge, VerifiedBadge } from "@/components/Badge";
import { parseTrades } from "@/lib/utils";
import { tradeLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"];

export default async function AdminContractors({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireRole("ADMIN");
  const status = (searchParams.status || "ALL").toUpperCase();

  const contractors = await prisma.contractorProfile.findMany({
    where: status !== "ALL" ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: { user: { select: { status: true } }, _count: { select: { documents: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Contractors</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/contractors" : `/admin/contractors?status=${f}`}
            className={`badge ${status === f ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {f.toLowerCase()}
          </Link>
        ))}
      </div>

      {contractors.length === 0 ? (
        <div className="card text-sm text-slate-500">No contractors in this view.</div>
      ) : (
        <div className="space-y-3">
          {contractors.map((c) => (
            <Link key={c.id} href={`/admin/contractors/${c.id}`} className="card block transition hover:border-brand-400 hover:shadow">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{c.firmName}</p>
                    {c.verified && <VerifiedBadge />}
                  </div>
                  <p className="text-xs text-slate-500">
                    {c.ownerName} · {c.city}, {c.state} · {c._count.documents} doc(s)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {parseTrades(c.trades).slice(0, 6).map((t) => (
                      <span key={t} className="badge bg-slate-100 text-slate-600">
                        {tradeLabel(t)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.user.status === "SUSPENDED" && <StatusBadge status="SUSPENDED" />}
                  <StatusBadge status={c.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
