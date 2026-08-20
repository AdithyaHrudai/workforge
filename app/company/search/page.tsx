import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PAGE_SIZE, parseSearchParams, searchContractors } from "@/lib/search";
import { contractorSearchSchema } from "@/lib/validation";
import { countActiveFilters, SearchFilters } from "@/components/SearchFilters";
import { FilterShell } from "@/components/FilterShell";
import { ContractorCard } from "@/components/ContractorCard";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";
import { Notice } from "@/components/Badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Find contractors" };

export default async function ContractorSearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireRole("COMPANY");
  const company = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!company) redirect("/company/profile");

  // An unparseable query string shouldn't 500 the page — fall back to a plain
  // browse of the directory.
  const parsed = contractorSearchSchema.safeParse(parseSearchParams(searchParams));
  const input = parsed.success
    ? parsed.data
    : contractorSearchSchema.parse(parseSearchParams({}));

  const { contractors, total, page, pageCount } = await searchContractors(input);

  // Preserved on pagination links so a filtered search survives paging.
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
        title="Find contractors"
        subtitle="Search the directory by contract type, sector experience, regional presence and capacity — then invite the right firms to quote."
      />

      <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <FilterShell activeCount={countActiveFilters(input)} resultCount={total}>
            <SearchFilters input={input} resultCount={total} />
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
                <Link href="/company/search" className="btn-secondary">
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
                      View profile &amp; contact
                    </Link>
                  }
                />
              ))}
            </div>
          )}

          <Pagination
            page={page}
            pageCount={pageCount}
            baseHref="/company/search"
            params={urlParams}
          />
        </div>
      </div>
    </div>
  );
}
