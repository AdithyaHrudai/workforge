import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge, VerifiedBadge } from "@/components/Badge";
import { setCompanyVerified, setUserSuspended } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCompanies() {
  await requireRole("ADMIN");
  const companies = await prisma.companyProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, _count: { select: { jobs: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
      {companies.length === 0 ? (
        <div className="card text-sm text-slate-500">No companies yet.</div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <div key={c.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{c.companyName}</p>
                    {c.verified && <VerifiedBadge />}
                    {c.user.status === "SUSPENDED" && <StatusBadge status="SUSPENDED" />}
                  </div>
                  <p className="text-xs text-slate-500">
                    {c.contactName} · {c.user.mobile ?? "—"} · {c.user.email} · {c.city}, {c.state} ·{" "}
                    {c._count.jobs} job(s) · joined {formatDate(c.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={setCompanyVerified}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="verified" value={(!c.verified).toString()} />
                    <button className="btn-secondary text-xs">
                      {c.verified ? "Remove verified" : "Grant verified"}
                    </button>
                  </form>
                  <form action={setUserSuspended}>
                    <input type="hidden" name="id" value={c.user.id} />
                    <input type="hidden" name="suspend" value={(c.user.status !== "SUSPENDED").toString()} />
                    <button className="btn-secondary text-xs text-red-600">
                      {c.user.status === "SUSPENDED" ? "Unsuspend" : "Suspend"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
