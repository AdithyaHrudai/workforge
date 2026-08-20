import Link from "next/link";
import { CategoryBadge, StatusBadge, VerifiedBadge } from "@/components/Badge";
import {
  CATEGORY,
  categoryShort,
  industryLabel,
  rateBasisLabel,
  roleLabel,
} from "@/lib/constants";
import { formatINRCompact, formatNumber, timeAgo } from "@/lib/utils";

export type RequirementCardData = {
  id: string;
  category: string;
  title: string;
  industry: string | null;
  city: string;
  state: string;
  siteName: string | null;
  urgency: string;
  status: string;
  createdAt: Date;
  expiresAt: Date | null;
  outputQuantity: number | null;
  outputUnit: string | null;
  outputPeriod: string | null;
  preferredRateBasis: string | null;
  indicativeBudget: number | null;
  roles: { role: string; headcount: number }[];
  company?: { companyName: string; verified: boolean } | null;
  _count?: { proposals: number };
};

/** "300 tonne per day" or "12 Fitter, 8 Welder". */
function DemandLine({ requirement }: { requirement: RequirementCardData }) {
  if (requirement.category === CATEGORY.JOB_CONTRACT) {
    if (requirement.outputQuantity && requirement.outputUnit) {
      return (
        <span>
          <strong className="font-semibold text-slate-800">
            {formatNumber(requirement.outputQuantity)} {requirement.outputUnit}
          </strong>
          {requirement.outputPeriod ? ` ${requirement.outputPeriod}` : ""}
        </span>
      );
    }
    return <span className="text-slate-500">Output-based scope — contractor decides deployment</span>;
  }

  const total = requirement.roles.reduce((s, r) => s + r.headcount, 0);
  const shown = requirement.roles.slice(0, 3);
  return (
    <span>
      <strong className="font-semibold text-slate-800">{total}</strong> total —{" "}
      {shown.map((r, i) => (
        <span key={`${r.role}-${i}`}>
          {i > 0 && ", "}
          {r.headcount} {roleLabel(r.role)}
        </span>
      ))}
      {requirement.roles.length > shown.length && ` +${requirement.roles.length - shown.length} more`}
    </span>
  );
}

export function RequirementCard({
  requirement,
  href,
  match,
  proposalStatus,
  showCompany = true,
}: {
  requirement: RequirementCardData;
  href: string;
  match?: { score: number; reasons: string[] };
  proposalStatus?: string | null;
  showCompany?: boolean;
}) {
  const expired = requirement.expiresAt != null && requirement.expiresAt <= new Date();

  return (
    <article className="card card-hover">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={requirement.category} />
            {requirement.urgency === "URGENT" && <StatusBadge status="URGENT" />}
            {requirement.status !== "OPEN" && <StatusBadge status={requirement.status} />}
            {expired && requirement.status === "OPEN" && <StatusBadge status="EXPIRED" />}
            {proposalStatus && (
              <StatusBadge status={proposalStatus} label={`Your proposal: ${proposalStatus.toLowerCase()}`} />
            )}
          </div>

          <h3 className="truncate text-base font-semibold text-slate-900">
            <Link href={href} className="hover:text-brand-700">
              {requirement.title}
            </Link>
          </h3>

          {showCompany && requirement.company && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
              {requirement.company.companyName}
              {requirement.company.verified && <VerifiedBadge />}
            </p>
          )}

          <p className="mt-2 text-sm text-slate-600">
            <DemandLine requirement={requirement} />
          </p>
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

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth={2} aria-hidden>
            <path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {requirement.siteName ? `${requirement.siteName}, ` : ""}
          {requirement.city}, {requirement.state}
        </span>
        {requirement.industry && <span>{industryLabel(requirement.industry)}</span>}
        {requirement.indicativeBudget != null && (
          <span>
            Budget {formatINRCompact(requirement.indicativeBudget)}
            {requirement.preferredRateBasis
              ? ` ${rateBasisLabel(requirement.preferredRateBasis).toLowerCase()}`
              : ""}
          </span>
        )}
        {requirement._count && (
          <span>
            {requirement._count.proposals} proposal{requirement._count.proposals === 1 ? "" : "s"}
          </span>
        )}
        <span>Posted {timeAgo(requirement.createdAt)}</span>
      </div>

      {match && match.reasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {match.reasons.slice(0, 3).map((reason) => (
            <li key={reason} className="chip bg-brand-50 text-brand-700">
              {reason}
            </li>
          ))}
        </ul>
      )}

      <p className="sr-only">Contract type: {categoryShort(requirement.category)}</p>
    </article>
  );
}
