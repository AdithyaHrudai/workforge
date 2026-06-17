const STYLES: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700",
  ACTIVE: "bg-green-100 text-green-700",
  OPEN: "bg-green-100 text-green-700",
  ACCEPTED: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  SUBMITTED: "bg-sky-100 text-sky-700",
  SHORTLISTED: "bg-indigo-100 text-indigo-700",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-200 text-slate-600",
  CLOSED: "bg-slate-200 text-slate-600",
  FILLED: "bg-slate-200 text-slate-600",
  COMPLETED: "bg-slate-200 text-slate-600",
  URGENT: "bg-red-100 text-red-700",
  NORMAL: "bg-sky-100 text-sky-700",
  PLANNED: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? "bg-slate-100 text-slate-600";
  return <span className={`badge ${cls}`}>{status.toLowerCase()}</span>;
}

export function VerifiedBadge() {
  return (
    <span className="badge bg-brand-100 text-brand-700">
      <svg viewBox="0 0 20 20" className="h-3 w-3 fill-current" aria-hidden>
        <path d="M10 1l2.39 1.74 2.95-.02 1.0 2.8 2.39 1.74-1.0 2.8 1.0 2.8-2.39 1.74-1.0 2.8-2.95-.02L10 19l-2.39-1.74-2.95.02-1.0-2.8L1.27 12.96l1.0-2.8-1.0-2.8 2.39-1.74 1.0-2.8 2.95.02L10 1z" />
      </svg>
      Verified
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
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
        {state.error}
      </div>
    );
  }
  return null;
}
