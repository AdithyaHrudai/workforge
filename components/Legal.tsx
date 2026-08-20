import { LEGAL, hasUnfilledDetails, isUnfilled } from "@/lib/legal";

/**
 * Shared chrome for the policy pages.
 *
 * They are long documents rather than app screens, so they get a single narrow
 * measure, generous leading and no cards — a policy broken into panels is
 * harder to read and harder to cite.
 */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl py-4">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-3 text-lg leading-relaxed text-slate-600">{intro}</p>
      <p className="mt-4 text-sm text-slate-500">
        Effective <Ph>{LEGAL.effectiveDate}</Ph> · last updated <Ph>{LEGAL.lastUpdated}</Ph>
      </p>

      {hasUnfilledDetails() && (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="block font-semibold">This document is a draft.</span>
          The highlighted values are placeholders in <code>lib/legal.ts</code>. Fill them in and
          have the text reviewed by a lawyer before you take this live.
        </div>
      )}

      <div className="mt-10 space-y-8">{children}</div>
    </article>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold tracking-tight text-slate-900">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Marks an unfilled value so it cannot be mistaken for finished text. */
export function Ph({ children }: { children: string }) {
  if (!isUnfilled(children)) return <>{children}</>;
  return (
    <span className="rounded bg-amber-100 px-1 font-medium text-amber-900 ring-1 ring-amber-300">
      {children}
    </span>
  );
}
