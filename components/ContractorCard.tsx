import Link from "next/link";
import { CategoryBadge, Stars, VerifiedBadge } from "@/components/Badge";
import { categoryShort, industryLabel } from "@/lib/constants";
import { formatNumber, initials, yearRange } from "@/lib/utils";

export type ContractorCardData = {
  id: string;
  firmName: string;
  city: string;
  state: string;
  presenceStates: string[];
  workerSourceStates: string[];
  categories: string[];
  industries: string[];
  totalWorkforce: number;
  availableNow: number;
  mobilizationDays: number;
  verified: boolean;
  rating: number;
  ratingCount: number;
  yearEstablished: number | null;
  clients: {
    id: string;
    clientName: string;
    siteCity: string;
    siteState: string;
    headcount: number;
    startedYear: number | null;
    endedYear: number | null;
    ongoing: boolean;
    verified: boolean;
  }[];
  /** Only the client count is read, so callers needn't over-select. */
  _count?: { clients: number };
};

export function ContractorCard({
  contractor,
  href,
  match,
  highlightState,
  footer,
}: {
  contractor: ContractorCardData;
  href: string;
  match?: { score: number; reasons: string[] };
  /** Bolds client sites in the state the company is hiring for. */
  highlightState?: string;
  footer?: React.ReactNode;
}) {
  // The card shows the three largest deployments, whatever it was handed —
  // an established firm with 200 clients must not swamp a results grid.
  const shownClients = contractor.clients.slice(0, 3);
  const totalClients = contractor._count?.clients ?? contractor.clients.length;
  const moreClients = totalClients - shownClients.length;

  return (
    <article className="card card-hover flex flex-col">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-800">
          {initials(contractor.firmName)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-slate-900">
              <Link href={href} className="hover:text-brand-700">
                {contractor.firmName}
              </Link>
            </h3>
            {contractor.verified && <VerifiedBadge />}
          </div>

          <p className="mt-0.5 text-sm text-slate-500">
            {contractor.city}, {contractor.state}
            {contractor.yearEstablished ? ` · Est. ${contractor.yearEstablished}` : ""}
          </p>

          <div className="mt-1.5">
            <Stars value={contractor.rating} count={contractor.ratingCount} />
          </div>
        </div>

        {match && match.score > 0 && (
          <div className="shrink-0 rounded-lg bg-brand-50 px-3 py-2 text-center">
            <p className="text-lg font-bold leading-none text-brand-800">{match.score}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-600">
              match
            </p>
          </div>
        )}
      </div>

      {/* Capacity strip */}
      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Workforce
          </dt>
          <dd className="text-sm font-bold text-slate-900">
            {formatNumber(contractor.totalWorkforce)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Available
          </dt>
          <dd className="text-sm font-bold text-slate-900">
            {formatNumber(contractor.availableNow)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Mobilises in
          </dt>
          <dd className="text-sm font-bold text-slate-900">{contractor.mobilizationDays}d</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {contractor.categories.map((c) => (
          <CategoryBadge key={c} category={c} />
        ))}
      </div>

      {contractor.industries.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Sectors:</span>{" "}
          {contractor.industries.slice(0, 4).map(industryLabel).join(", ")}
          {contractor.industries.length > 4 && ` +${contractor.industries.length - 4}`}
        </p>
      )}

      {/*
        The client list is the whole reason this card exists. A buyer decides on
        "who are they already running, and where" long before they look at a
        star rating, so it gets real estate rather than a link.
      */}
      {shownClients.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Current & past clients
          </p>
          <ul className="space-y-1">
            {shownClients.map((client) => {
              const inState = highlightState && client.siteState === highlightState;
              return (
                <li
                  key={client.id}
                  className={`flex items-baseline justify-between gap-2 text-xs ${
                    inState ? "font-semibold text-brand-800" : "text-slate-600"
                  }`}
                >
                  <span className="truncate">
                    {client.clientName}
                    <span className="font-normal text-slate-400">
                      {" · "}
                      {client.siteCity}, {client.siteState}
                    </span>
                    {client.verified && (
                      <span className="ml-1 text-brand-600" title="Verified by WorkForge">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-slate-500">
                    {client.headcount > 0 && `${formatNumber(client.headcount)} pax · `}
                    {yearRange(client.startedYear, client.endedYear, client.ongoing)}
                  </span>
                </li>
              );
            })}
          </ul>
          {moreClients > 0 && (
            <Link href={href} className="mt-1.5 inline-block text-xs font-medium text-brand-700 hover:underline">
              +{moreClients} more {moreClients === 1 ? "client" : "clients"}
            </Link>
          )}
        </div>
      )}

      {match && match.reasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {match.reasons.slice(0, 3).map((reason) => (
            <li key={reason} className="chip bg-brand-50 text-brand-700">
              {reason}
            </li>
          ))}
        </ul>
      )}

      {footer && <div className="mt-4 border-t border-slate-100 pt-3">{footer}</div>}

      <p className="sr-only">
        Takes on: {contractor.categories.map(categoryShort).join(", ")}
      </p>
    </article>
  );
}
