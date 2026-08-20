import { CATEGORY_MAP, categoryShort } from "@/lib/constants";

const STATUS_STYLES: Record<string, string> = {
  // healthy / live
  APPROVED: "bg-green-100 text-green-700",
  ACTIVE: "bg-green-100 text-green-700",
  OPEN: "bg-green-100 text-green-700",
  ACCEPTED: "bg-green-100 text-green-700",
  RESPONDED: "bg-green-100 text-green-700",
  // in flight
  PENDING: "bg-amber-100 text-amber-700",
  SUBMITTED: "bg-sky-100 text-sky-700",
  SENT: "bg-sky-100 text-sky-700",
  VIEWED: "bg-sky-100 text-sky-700",
  SHORTLISTED: "bg-indigo-100 text-indigo-700",
  // ended badly
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-red-100 text-red-700",
  DECLINED: "bg-red-100 text-red-700",
  // ended neutrally
  CANCELLED: "bg-slate-200 text-slate-600",
  CLOSED: "bg-slate-200 text-slate-600",
  WITHDRAWN: "bg-slate-200 text-slate-600",
  EXPIRED: "bg-slate-200 text-slate-600",
  COMPLETED: "bg-slate-200 text-slate-600",
  AWARDED: "bg-brand-100 text-brand-800",
  // urgency
  URGENT: "bg-red-100 text-red-700",
  NORMAL: "bg-sky-100 text-sky-700",
  PLANNED: "bg-slate-100 text-slate-600",
};

const STATUS_LABELS: Record<string, string> = {
  URGENT: "Immediate",
  NORMAL: "Normal",
  PLANNED: "Planned",
  AWARDED: "Awarded",
  EXPIRED: "Expired",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";
  const text = label ?? STATUS_LABELS[status] ?? status.toLowerCase();
  return <span className={`badge ${cls}`}>{text}</span>;
}

/**
 * Tailwind can't see class names built at runtime, so the four category
 * accents are spelled out rather than interpolated from CategoryMeta.accent.
 */
const CATEGORY_STYLES: Record<string, string> = {
  WHITE_COLLAR_STAFFING: "bg-indigo-100 text-indigo-800",
  BLUE_COLLAR_STAFFING: "bg-sky-100 text-sky-800",
  JOB_CONTRACT: "bg-forge-100 text-forge-800",
  UNSKILLED_SUPPLY: "bg-emerald-100 text-emerald-800",
};

export function CategoryBadge({
  category,
  full = false,
}: {
  category: string;
  full?: boolean;
}) {
  const cls = CATEGORY_STYLES[category] ?? "bg-slate-100 text-slate-600";
  const meta = CATEGORY_MAP[category];
  return (
    <span className={`badge ${cls}`} title={meta?.summary}>
      {full ? meta?.label ?? category : categoryShort(category)}
    </span>
  );
}

export function VerifiedBadge({ label = "Verified" }: { label?: string }) {
  return (
    <span className="badge bg-brand-100 text-brand-800">
      <svg viewBox="0 0 20 20" className="h-3 w-3 fill-current" aria-hidden>
        <path d="M10 1l2.39 1.74 2.95-.02 1.0 2.8 2.39 1.74-1.0 2.8 1.0 2.8-2.39 1.74-1.0 2.8-2.95-.02L10 19l-2.39-1.74-2.95.02-1.0-2.8L1.27 12.96l1.0-2.8-1.0-2.8 2.39-1.74 1.0-2.8 2.95.02L10 1z" />
      </svg>
      {label}
    </span>
  );
}

/** Star rating display. `count` of 0 renders "not yet rated" rather than 0 stars. */
export function Stars({
  value,
  count,
  size = "sm",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
}) {
  if (count === 0) {
    return <span className="text-xs text-slate-400">Not yet rated</span>;
  }
  const dim = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            viewBox="0 0 20 20"
            className={`${dim} ${i <= Math.round(value) ? "fill-forge-500" : "fill-slate-200"}`}
          >
            <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
        ))}
      </span>
      <span className="text-xs font-medium text-slate-600">
        {value.toFixed(1)}
        {count != null && <span className="font-normal text-slate-400"> ({count})</span>}
      </span>
      <span className="sr-only">
        {value.toFixed(1)} out of 5{count != null ? ` from ${count} reviews` : ""}
      </span>
    </span>
  );
}

export function Alert({
  state,
}: {
  state: { ok: boolean; error?: string; message?: string } | null;
}) {
  if (!state) return null;
  if (state.ok && state.message) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
        {state.message}
      </div>
    );
  }
  if (!state.ok && state.error) {
    return (
      <div
        role="alert"
        data-form-alert
        className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200"
      >
        {state.error}
      </div>
    );
  }
  return null;
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-brand-50 text-brand-900 ring-brand-200",
    warning: "bg-amber-50 text-amber-900 ring-amber-200",
    success: "bg-green-50 text-green-900 ring-green-200",
  }[tone];
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ring-1 ${styles}`}>{children}</div>
  );
}
