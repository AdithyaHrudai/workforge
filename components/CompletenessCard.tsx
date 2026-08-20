import Link from "next/link";
import type { Completeness } from "@/lib/completeness";

/**
 * Profile completeness with the next best actions attached.
 *
 * A bare percentage tells a contractor they are behind without telling them
 * what to do, so each remaining item links straight to the page that fixes it
 * and says what it is worth.
 */
export function CompletenessCard({ completeness }: { completeness: Completeness }) {
  const { percent, next } = completeness;
  const complete = percent >= 100;

  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-slate-900">
          {complete ? "Your profile is complete" : "Complete your profile"}
        </h2>
        <span className={`text-lg font-bold ${complete ? "text-emerald-600" : "text-brand-700"}`}>
          {percent}%
        </span>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <div
          className={`h-full rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-brand-600"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {complete ? (
        <p className="mt-3 text-sm text-slate-600">
          Everything buyers filter on is filled in. Keep your client list current and you will keep
          ranking well.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-slate-600">
            A fuller profile ranks higher in search and wins more invitations to quote.
          </p>
          <ul className="mt-3 space-y-2">
            {next.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group flex items-start gap-2.5 rounded-lg p-2 -mx-2 hover:bg-slate-50"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-slate-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800 group-hover:text-brand-700">
                      {item.label}
                    </span>
                    <span className="block text-xs text-slate-500">{item.hint}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-brand-700">
                    +{item.weight}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
