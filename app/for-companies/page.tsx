import type { Metadata } from "next";
import { WorkflowDiagram, COMPANY_WORKFLOW } from "@/components/WorkflowDiagram";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For companies",
  description:
    "Post contract manpower requirements and compare verified contractors on track record, regional presence, capacity and statutory compliance.",
};


export default function ForCompaniesPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10 py-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Find contractors who can actually staff your plant
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-600">
          Whether you need twelve fitters on rotating shift, a mould change contract, or two hundred
          helpers for a dispatch season — post it once and see who can genuinely serve you.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Your journey, end to end</h2>
        <p className="mt-2 text-slate-600">From registering to rating the firm you hired. Hover any step for detail.</p>
        <div className="mt-5">
          <WorkflowDiagram steps={COMPANY_WORKFLOW} />
        </div>
      </section>

      <section className="rounded-xl bg-slate-50 p-6 ring-1 ring-slate-200">
        <h2 className="font-bold text-slate-900">Registration takes two minutes</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Company name, location, what you make, and the kinds of contract manpower you engage. GST,
          PAN and CIN are optional — you only need them when a contractor raises an invoice.
        </p>
        <Link href="/register" className="btn-primary mt-4">
          Create a company account
        </Link>
      </section>
    </article>
  );
}
