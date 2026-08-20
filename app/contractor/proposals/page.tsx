import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withdrawProposal } from "@/app/actions/proposals";
import { CategoryBadge, StatusBadge } from "@/components/Badge";
import { EmptyState, PageHeader } from "@/components/ui";
import { rateBasisLabel } from "@/lib/constants";
import { formatINR, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My proposals" };

const TABS = [
  { value: "", label: "All" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "ACCEPTED", label: "Won" },
  { value: "REJECTED", label: "Not selected" },
];

export default async function ContractorProposalsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) redirect("/contractor/profile");

  const status = TABS.some((t) => t.value === searchParams.status) ? searchParams.status : "";

  const proposals = await prisma.proposal.findMany({
    where: { contractorId: profile.id, ...(status ? { status } : {}) },
    include: {
      requirement: {
        select: {
          id: true,
          title: true,
          category: true,
          city: true,
          state: true,
          status: true,
          company: { select: { companyName: true } },
        },
      },
      engagement: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My proposals"
        subtitle="Every quote you've submitted, and where it stands."
      />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <Link
            key={tab.value || "all"}
            href={tab.value ? `/contractor/proposals?status=${tab.value}` : "/contractor/proposals"}
            className={
              tab.value === status
                ? "btn btn-sm bg-brand-700 text-white"
                : "btn btn-sm bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          title={status ? "Nothing in this state" : "You haven't quoted on anything yet"}
          description="Requirements matching your firm appear in your feed — quoting early on a good fit is the surest way to win work."
          action={
            <Link href="/contractor/requirements" className="btn-primary">
              Find work
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4">
          {proposals.map((proposal) => (
            <article key={proposal.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={proposal.requirement.category} />
                    <StatusBadge status={proposal.status} />
                  </div>
                  <h3 className="font-semibold text-slate-900">
                    <Link
                      href={`/contractor/requirements/${proposal.requirement.id}`}
                      className="hover:text-brand-700"
                    >
                      {proposal.requirement.title}
                    </Link>
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {proposal.requirement.company.companyName} · {proposal.requirement.city},{" "}
                    {proposal.requirement.state}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">
                    {formatINR(proposal.rateAmount)}
                  </p>
                  <p className="text-xs text-slate-500">{rateBasisLabel(proposal.rateBasis)}</p>
                  {proposal.headcountOffered != null && (
                    <p className="mt-1 text-sm text-slate-700">
                      {proposal.headcountOffered} people offered
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="mr-auto text-xs text-slate-400">
                  Submitted {timeAgo(proposal.createdAt)} · mobilises in {proposal.mobilizationDays}{" "}
                  days
                </span>

                {proposal.engagement && (
                  <Link href={`/engagements/${proposal.engagement.id}`} className="btn-primary btn-sm">
                    Open engagement
                  </Link>
                )}

                {(proposal.status === "SUBMITTED" || proposal.status === "SHORTLISTED") && (
                  <>
                    <Link
                      href={`/contractor/requirements/${proposal.requirement.id}`}
                      className="btn-secondary btn-sm"
                    >
                      Revise
                    </Link>
                    <form action={withdrawProposal}>
                      <input type="hidden" name="id" value={proposal.id} />
                      <button
                        type="submit"
                        className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                      >
                        Withdraw
                      </button>
                    </form>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
