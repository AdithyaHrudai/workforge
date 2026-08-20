import Link from "next/link";
import { ChipGroup, FilterSection, Select, StatesChipGroup } from "@/components/Field";
import { AutoSubmit } from "@/components/FilterShell";
import {
  CATEGORY_OPTIONS,
  INDUSTRIES,
  JOB_CONTRACT_SCOPES,
  MANPOWER_BANDS,
  STATES,
  ZONE_OPTIONS,
} from "@/lib/constants";
import type { ContractorSearchInput } from "@/lib/validation";

const MIN_WORKFORCE_OPTIONS = [
  { value: "50", label: "50+" },
  { value: "100", label: "100+" },
  { value: "250", label: "250+" },
  { value: "500", label: "500+" },
  { value: "1000", label: "1,000+" },
];

const MIN_RATING_OPTIONS = [
  { value: "3", label: "3.0 and above" },
  { value: "3.5", label: "3.5 and above" },
  { value: "4", label: "4.0 and above" },
  { value: "4.5", label: "4.5 and above" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Best match" },
  { value: "rating", label: "Highest rated" },
  { value: "workforce", label: "Largest workforce" },
  { value: "recent", label: "Recently joined" },
];

/** Number of facets the viewer has actually chosen — drives the "clear" link. */
export function countActiveFilters(input: ContractorSearchInput): number {
  return (
    input.categories.length +
    input.industries.length +
    input.states.length +
    input.workerSourceStates.length +
    input.roles.length +
    (input.zone ? 1 : 0) +
    (input.minWorkforce ? 1 : 0) +
    (input.minRating ? 1 : 0) +
    (input.verifiedOnly ? 1 : 0)
  );
}

/**
 * The contractor search panel — the company-side counterpart to a resume
 * database. Still a plain GET form, so every search is a shareable URL, the
 * back button behaves, and it degrades to a submit button without JavaScript.
 *
 * The long facets (36 states, twice, plus the industry and scope catalogues)
 * are collapsed by default. Expanded, they made the rail roughly 1,900px tall —
 * six times the height of the results beside it.
 */
export function SearchFilters({
  input,
  action = "/company/search",
  resultCount,
}: {
  input: ContractorSearchInput;
  action?: string;
  resultCount?: number;
}) {
  const activeFilters = countActiveFilters(input);

  return (
    <form method="get" action={action} className="card space-y-3">
      <AutoSubmit />

      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Filters</h2>
        {activeFilters > 0 && (
          <Link href={action} className="text-xs font-medium text-brand-700 hover:underline">
            Clear all ({activeFilters})
          </Link>
        )}
      </div>

      <div>
        <label className="sr-only" htmlFor="q">
          Search
        </label>
        <input
          id="q"
          name="q"
          defaultValue={input.q ?? ""}
          className="input"
          placeholder="Firm, city, or a client they serve"
        />
        <p className="hint">A client&apos;s name works too — try &ldquo;Yokohama&rdquo;.</p>
      </div>

      <FilterSection label="Contract type" count={input.categories.length}>
        <ChipGroup
          label="Contract type"
          name="categories"
          options={CATEGORY_OPTIONS}
          selected={input.categories}
          hideLabel
        />
      </FilterSection>

      <FilterSection label="Industry experience" count={input.industries.length}>
        <ChipGroup
          label="Industry experience"
          name="industries"
          options={INDUSTRIES}
          selected={input.industries}
          hideLabel
          scroll
        />
      </FilterSection>

      <FilterSection
        label="Region"
        count={input.states.length + (input.zone ? 1 : 0)}
      >
        <div className="space-y-3">
          <Select
            label="Zone"
            name="zone"
            options={ZONE_OPTIONS}
            placeholder="Anywhere in India"
            defaultValue={input.zone ?? ""}
            hint="A quick way to widen the state filter."
          />
          <StatesChipGroup
            label="Present in states"
            name="states"
            states={STATES}
            selected={input.states}
          />
        </div>
      </FilterSection>

      <FilterSection label="Workers sourced from" count={input.workerSourceStates.length}>
        <StatesChipGroup
          label="Workers sourced from"
          name="workerSourceStates"
          states={STATES}
          selected={input.workerSourceStates}
          hideLabel
        />
      </FilterSection>

      <FilterSection label="Specialised scope" count={input.roles.length}>
        <ChipGroup
          label="Specialised scope"
          name="roles"
          options={JOB_CONTRACT_SCOPES}
          selected={input.roles}
          hint="For job contracts that are hard to source — mould change, refractory, shutdown maintenance."
          hideLabel
          scroll
        />
      </FilterSection>

      <FilterSection
        label="Capacity & rating"
        count={(input.minWorkforce ? 1 : 0) + (input.minRating ? 1 : 0) + (input.verifiedOnly ? 1 : 0)}
      >
        <div className="space-y-3">
          <Select
            label="Minimum workforce"
            name="minWorkforce"
            options={MIN_WORKFORCE_OPTIONS}
            placeholder="Any size"
            defaultValue={input.minWorkforce ? String(input.minWorkforce) : ""}
          />
          <Select
            label="Minimum rating"
            name="minRating"
            options={MIN_RATING_OPTIONS}
            placeholder="Any rating"
            defaultValue={input.minRating ? String(input.minRating) : ""}
          />
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              name="verifiedOnly"
              defaultChecked={input.verifiedOnly}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-slate-700">Verified firms only</span>
          </label>
          <p className="text-xs text-slate-400">
            Firms self-declare strength in bands of {MANPOWER_BANDS[0].label.toLowerCase()} to{" "}
            {MANPOWER_BANDS[MANPOWER_BANDS.length - 1].label.toLowerCase()}.
          </p>
        </div>
      </FilterSection>

      <div className="border-t border-slate-100 pt-3">
        <Select label="Sort by" name="sort" options={SORT_OPTIONS} defaultValue={input.sort} />
      </div>

      {/* Facets apply on change once JavaScript is running; this is the no-JS
          fallback and the explicit action for the free-text box. */}
      <button type="submit" className="btn-primary w-full">
        {resultCount != null ? `Show ${resultCount} contractor${resultCount === 1 ? "" : "s"}` : "Apply filters"}
      </button>
    </form>
  );
}
