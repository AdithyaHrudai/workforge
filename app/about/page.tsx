import type { Metadata } from "next";
import { WorkflowDiagram, FULL_WORKFLOW } from "@/components/WorkflowDiagram";
import Link from "next/link";
import { CATEGORIES, RATING_PARAMETERS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "How WorkForge works",
  description:
    "How the WorkForge contract manpower marketplace works: the four contract categories, how contractors are evaluated on track record and compliance, and how requirements are awarded.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-12 py-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          How WorkForge works
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-600">
          Sourcing contract manpower in Indian industry runs on personal networks. If you need
          someone to do mould change at a tyre plant, you probably know two or three names — and if
          none of them cover your region, you are stuck. WorkForge turns that network into a market.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          The four contract categories
        </h2>
        <p className="mt-2 text-slate-600">
          Contract manpower is not one thing. These four are bought on completely different terms,
          so the platform treats them separately end to end.
        </p>
        <dl className="mt-5 space-y-4">
          {CATEGORIES.map((c) => (
            <div key={c.value} className="rounded-xl border border-slate-200 bg-white p-5">
              <dt className="font-semibold text-slate-900">{c.label}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-600">{c.summary}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          The distinction that matters most is the job contract. There, the company specifies the
          output — 300 tonnes loaded per day, a mould change cycle, a shutdown completed — and the
          contractor decides how many people or machines to deploy against it. Asking for a headcount
          on a job contract quietly turns it into a supply contract, so WorkForge does not ask for
          one.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          How contractors are evaluated
        </h2>
        <p className="mt-2 text-slate-600">
          Two things decide whether a contractor can actually serve you, and neither is a headline
          star rating.
        </p>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">Their client list</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Every contractor publishes the companies they serve, the plants, the states and the
              manpower deployed at each. That tells you where they genuinely have people — and
              therefore who can cover a shortfall next week rather than next quarter. Our team
              verifies entries against work orders and marks them with a tick.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">Ratings, on the things that matter</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              After every completed engagement the company rates the contractor on five separate
              parameters, so a firm that mobilises fast but files returns late has nowhere to hide.
            </p>
            <ul className="mt-3 space-y-2">
              {RATING_PARAMETERS.map((p) => (
                <li key={p.key} className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{p.label}</span> — {p.help}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">How WorkForge works</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Both sides register, then the platform matches them in both directions — a company finds
          firms, and work finds contractors. Hover any step below to see what happens there.
        </p>
        <div className="mt-5">
          <WorkflowDiagram
            steps={FULL_WORKFLOW}
            caption="Colour marks who acts at each step. Steps in amber involve both sides."
          />
        </div>
      </section>

      <section className="rounded-xl bg-slate-50 p-6 ring-1 ring-slate-200">
        <h2 className="font-bold text-slate-900">What it costs</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Nothing. WorkForge does not take a commission on your contracts and does not process
          payments — invoicing between a company and its contractor happens exactly as it does today,
          through the GST system. We may introduce paid features later; if we do, everything you have
          already posted stays yours.
        </p>
        <Link href="/register" className="btn-primary mt-4">
          Get started
        </Link>
      </section>
    </article>
  );
}
