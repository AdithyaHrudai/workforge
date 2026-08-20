import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requirementsForContractor } from "@/lib/matching";
import { RequirementCard } from "@/components/RequirementCard";
import { EmptyState, PageHeader } from "@/components/ui";
import { Notice } from "@/components/Badge";
import { CATEGORY_MAP, categoryShort, isValidCategory } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Find work" };

export default async function ContractorRequirementsPage({
  searchParams,
}: {
  searchParams: { category?: string; state?: string };
}) {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, categories: true, presenceStates: true },
  });
  if (!profile) redirect("/contractor/profile");

  const matches = await requirementsForContractor(profile.id, 60);

  const category =
    searchParams.category && isValidCategory(searchParams.category)
      ? searchParams.category
      : undefined;
  const state = searchParams.state;

  const filtered = matches.filter(
    (m) =>
      (!category || m.requirement.category === category) &&
      (!state || m.requirement.state === state),
  );

  // Only offer filters for values actually present in the feed — a filter that
  // always returns nothing is worse than no filter.
  const availableCategories = Array.from(
    new Set(matches.map((m) => m.requirement.category)),
  );
  const availableStates = Array.from(new Set(matches.map((m) => m.requirement.state))).sort();

  const linkFor = (next: { category?: string; state?: string }) => {
    const params = new URLSearchParams();
    const c = next.category ?? category;
    const s = next.state ?? state;
    if (c) params.set("category", c);
    if (s) params.set("state", s);
    const qs = params.toString();
    return qs ? `/contractor/requirements?${qs}` : "/contractor/requirements";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find work"
        subtitle="Live requirements matching the contract types, sectors and regions on your profile — best fit first."
      />

      {profile.categories.length === 0 && (
        <Notice tone="warning">
          You haven&apos;t selected which contract types you take on, so nothing can be matched to
          you.{" "}
          <Link href="/contractor/profile" className="font-semibold underline">
            Update your profile
          </Link>
          .
        </Notice>
      )}

      {matches.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={linkFor({ category: "" })}
              className={!category ? "chip bg-brand-100 text-brand-800" : "chip hover:bg-slate-200"}
            >
              All types
            </Link>
            {availableCategories.map((c) => (
              <Link
                key={c}
                href={linkFor({ category: c })}
                className={
                  category === c ? "chip bg-brand-100 text-brand-800" : "chip hover:bg-slate-200"
                }
                title={CATEGORY_MAP[c]?.summary}
              >
                {categoryShort(c)}
              </Link>
            ))}
          </div>

          {availableStates.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <Link
                href={linkFor({ state: "" })}
                className={!state ? "chip bg-brand-100 text-brand-800" : "chip hover:bg-slate-200"}
              >
                All states
              </Link>
              {availableStates.map((s) => (
                <Link
                  key={s}
                  href={linkFor({ state: s })}
                  className={
                    state === s ? "chip bg-brand-100 text-brand-800" : "chip hover:bg-slate-200"
                  }
                >
                  {s}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={matches.length === 0 ? "No matching requirements right now" : "Nothing matches this filter"}
          description={
            matches.length === 0
              ? "New requirements arrive daily. Widening the states and sectors on your profile is the quickest way to see more."
              : "Try clearing the filter to see everything matched to your firm."
          }
          action={
            matches.length === 0 ? (
              <Link href="/contractor/profile" className="btn-primary">
                Update your profile
              </Link>
            ) : (
              <Link href="/contractor/requirements" className="btn-secondary">
                Clear filters
              </Link>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {filtered.length} requirement{filtered.length === 1 ? "" : "s"} matched
          </p>
          <div className="grid gap-4">
            {filtered.map(({ requirement, match, alreadyProposed }) => (
              <RequirementCard
                key={requirement.id}
                requirement={requirement}
                href={`/contractor/requirements/${requirement.id}`}
                match={match}
                proposalStatus={alreadyProposed?.status}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
