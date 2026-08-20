import type { Metadata } from "next";
import { WorkflowDiagram, CONTRACTOR_WORKFLOW } from "@/components/WorkflowDiagram";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For contractors",
  description:
    "Publish your track record, get matched to contract manpower requirements across India, and quote on the right commercial basis.",
};


export default function ForContractorsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10 py-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Get found by the plants you want to work with
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-600">
          You already do good work for the clients you have. WorkForge puts that record in front of
          every company looking for a contractor in your region and your sector.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Your journey, end to end</h2>
        <p className="mt-2 text-slate-600">From registering to winning work and building a rating. Hover any step for detail.</p>
        <div className="mt-5">
          <WorkflowDiagram steps={CONTRACTOR_WORKFLOW} />
        </div>
      </section>

      <section className="rounded-xl bg-slate-50 p-6 ring-1 ring-slate-200">
        <h2 className="font-bold text-slate-900">What it costs you</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Nothing. There is no listing fee, no commission on contracts you win here, and no payment
          flows through the platform — you invoice your client exactly as you do today.
        </p>
        <Link href="/register" className="btn-primary mt-4">
          Register your firm
        </Link>
      </section>
    </article>
  );
}
