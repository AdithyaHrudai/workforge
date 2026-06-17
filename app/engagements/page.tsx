import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/Badge";
import { formatINR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EngagementsPage() {
  const user = await requireUser();

  const where =
    user.role === "COMPANY"
      ? { company: { userId: user.id } }
      : user.role === "CONTRACTOR"
        ? { contractor: { userId: user.id } }
        : {}; // admin sees all

  const engagements = await prisma.engagement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      job: { select: { title: true, city: true, state: true } },
      company: { select: { companyName: true } },
      contractor: { select: { firmName: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Engagements</h1>
      <p className="text-sm text-slate-500">
        When a bid is accepted, an engagement is created with contact details unlocked and a private
        chat.
      </p>

      {engagements.length === 0 ? (
        <div className="card text-sm text-slate-500">No engagements yet.</div>
      ) : (
        <div className="space-y-3">
          {engagements.map((e) => (
            <Link key={e.id} href={`/engagements/${e.id}`} className="card block transition hover:border-brand-400 hover:shadow">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{e.job.title}</p>
                  <p className="text-xs text-slate-500">
                    {user.role === "CONTRACTOR" ? e.company.companyName : e.contractor.firmName} ·{" "}
                    {e.job.city}, {e.job.state} · {formatDate(e.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={e.status} />
                  <p className="mt-1 text-xs text-slate-500">Est. {formatINR(e.estimatedValue)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
