import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CategoryBadge, StatusBadge } from "@/components/Badge";
import { EmptyState, PageHeader } from "@/components/ui";
import { rateBasisLabel } from "@/lib/constants";
import { formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Engagements" };

export default async function EngagementsPage() {
  const user = await requireUser();

  // An engagement is reachable from whichever side you are on; admins see all.
  const where: Prisma.EngagementWhereInput =
    user.role === "COMPANY"
      ? { company: { userId: user.id } }
      : user.role === "CONTRACTOR"
        ? { contractor: { userId: user.id } }
        : {};

  const engagements = await prisma.engagement.findMany({
    where,
    include: {
      requirement: { select: { id: true, title: true, category: true, city: true, state: true } },
      company: { select: { companyName: true } },
      contractor: { select: { firmName: true } },
      review: { select: { id: true } },
      _count: { select: { messages: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const isCompany = user.role === "COMPANY";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Engagements"
        subtitle="Awarded contracts — the commercials, the contact details and the conversation."
      />

      {engagements.length === 0 ? (
        <EmptyState
          title="No engagements yet"
          description={
            isCompany
              ? "Accept a proposal on one of your requirements and the engagement will open here."
              : "When a company accepts your proposal, the engagement appears here with their contact details."
          }
          action={
            <Link
              href={isCompany ? "/company/requirements" : "/contractor/requirements"}
              className="btn-primary"
            >
              {isCompany ? "My requirements" : "Find work"}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4">
          {engagements.map((engagement) => (
            <article key={engagement.id} className="card card-hover">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={engagement.requirement.category} />
                    <StatusBadge status={engagement.status} />
                    {engagement.status === "COMPLETED" && !engagement.review && isCompany && (
                      <span className="badge bg-forge-100 text-forge-800">Rating pending</span>
                    )}
                  </div>

                  <h3 className="font-semibold text-slate-900">
                    <Link href={`/engagements/${engagement.id}`} className="hover:text-brand-700">
                      {engagement.requirement.title}
                    </Link>
                  </h3>

                  <p className="mt-0.5 text-sm text-slate-500">
                    {isCompany ? engagement.contractor.firmName : engagement.company.companyName} ·{" "}
                    {engagement.requirement.city}, {engagement.requirement.state}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-slate-900">{formatINR(engagement.rateAmount)}</p>
                  <p className="text-xs text-slate-500">{rateBasisLabel(engagement.rateBasis)}</p>
                  {engagement.headcount != null && (
                    <p className="mt-1 text-sm text-slate-700">{engagement.headcount} deployed</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>Started {formatDate(engagement.startedAt)}</span>
                {engagement.completedAt && (
                  <span>Completed {formatDate(engagement.completedAt)}</span>
                )}
                <span>
                  {engagement._count.messages} message
                  {engagement._count.messages === 1 ? "" : "s"}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
