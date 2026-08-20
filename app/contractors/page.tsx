import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { PAGE_SIZE, parseSearchParams, searchContractors } from "@/lib/search";
import { contractorSearchSchema } from "@/lib/validation";
import { countActiveFilters, SearchFilters } from "@/components/SearchFilters";
import { FilterShell } from "@/components/FilterShell";
import { ContractorCard } from "@/components/ContractorCard";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";
import { Notice } from "@/components/Badge";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contract manpower contractors in India",
  description:
    "Browse verified contract manpower contractors across India — white-collar and blue-collar staffing, output-based job contracts and unskilled supply. Compare firms on client list, regional presence, workforce strength and compliance record.",
  alternates: { canonical: `${siteUrl()}/contractors` },
};

/**
 * The public firm directory.
 *
 * Same search engine and same cards as the company-side `/company/search`; the
 * difference is that this one needs no account, so it can be indexed and
 * linked. Contact details stay behind registration — the profile page gates
 * those, not this list.
 */
export default async function PublicContractorsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();

  const parsed = contractorSearchSchema.safeParse(parseSearchParams(searchParams));
  const input = parsed.success
    ? parsed.data
    : contractorSearchSchema.parse(parseSearchParams({}));

  const { contractors, total, page, pageCount } = await searchContractors(input);

  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value == null) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v) urlParams.append(key, v);
    }
  }

  const highlightState = input.hasClientsInState || input.states[0];
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      <PageHeader
        title="Contract manpower contractors"
        subtitle="Verified firms supplying contract manpower across Indian plants, project sites and warehouses. Filter by contract type, sector, region and capacity."
        action={
          session?.role === "COMPANY" ? (
            <Link href="/company/requirements/new" className="btn-primary">
              Post a requirement
            </Link>
          ) : !session ? (
            <Link href="/register" className="btn-primary">
              Get started
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <FilterShell activeCount={countActiveFilters(input)} resultCount={total}>
            <SearchFilters input={input} action="/contractors" resultCount={total} />
          </FilterShell>
        </div>

        <div className="min-w-0">
          {!parsed.success && (
            <div className="mb-4">
              <Notice tone="warning">
                We couldn&apos;t read those filters, so we&apos;ve shown all contractors instead.
              </Notice>
            </div>
          )}

          <p className="mb-4 text-sm text-slate-500">
            {total === 0
              ? "No contractors matched"
              : `Showing ${from}–${to} of ${total} contractor${total === 1 ? "" : "s"}`}
          </p>

          {contractors.length === 0 ? (
            <EmptyState
              title="No contractors matched your filters"
              description="Try widening the region — a zone instead of a single state — or removing the sector filter."
              action={
                <Link href="/contractors" className="btn-secondary">
                  Clear filters
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {contractors.map((contractor) => (
                <ContractorCard
                  key={contractor.id}
                  contractor={contractor}
                  href={`/contractors/${contractor.id}`}
                  highlightState={highlightState}
                  footer={
                    <Link
                      href={`/contractors/${contractor.id}`}
                      className="btn-secondary btn-sm w-full"
                    >
                      View profile
                    </Link>
                  }
                />
              ))}
            </div>
          )}

          <Pagination page={page} pageCount={pageCount} baseHref="/contractors" params={urlParams} />
        </div>
      </div>
    </div>
  );
}
