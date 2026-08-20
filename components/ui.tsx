import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="stat-label">{label}</p>
      <p className="stat-value mt-1">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="card card-hover block">
        {body}
      </Link>
    );
  }
  return <div className="card">{body}</div>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth={1.8} aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Label/value pair used throughout the detail panels. */
export function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}

export function DefinitionList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-slate-100">{children}</dl>;
}

/**
 * Pagination that preserves the current query string. Takes the already-parsed
 * params rather than reading them, so it works from a server component.
 */
export function Pagination({
  page,
  pageCount,
  baseHref,
  params,
}: {
  page: number;
  pageCount: number;
  baseHref: string;
  params: URLSearchParams;
}) {
  if (pageCount <= 1) return null;

  const hrefFor = (p: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    return `${baseHref}?${next.toString()}`;
  };

  // A window around the current page, so 40 pages doesn't render 40 links.
  const from = Math.max(1, page - 2);
  const to = Math.min(pageCount, from + 4);
  const pages = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  return (
    <nav className="mt-6 flex items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className="btn-secondary btn-sm">
          Previous
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === page ? "page" : undefined}
          className={
            p === page
              ? "btn btn-sm bg-brand-700 text-white"
              : "btn btn-sm text-slate-600 hover:bg-slate-100"
          }
        >
          {p}
        </Link>
      ))}
      {page < pageCount && (
        <Link href={hrefFor(page + 1)} className="btn-secondary btn-sm">
          Next
        </Link>
      )}
    </nav>
  );
}
