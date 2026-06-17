import Link from "next/link";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    who: "Companies",
    items: [
      "Post a manpower requirement — trades, headcount, location, start date.",
      "Receive bids from verified contractors and compare side-by-side.",
      "Accept a bid to unlock contact details and a secure chat.",
    ],
  },
  {
    who: "Contractors",
    items: [
      "Register your firm, workforce and statutory licences.",
      "Get matched to jobs in your trades and region — bid in seconds.",
      "Win work, chat with the company, and build a verified track record.",
    ],
  },
];

const FEATURES = [
  { t: "Verified contractors", d: "Labour licence (CLRA), GST & PAN reviewed by our team before a firm goes live." },
  { t: "Structured bidding", d: "Compare rate, headcount and mobilisation time — not just phone numbers." },
  { t: "Secure 2-way chat", d: "Contact details stay private until both sides commit to an engagement." },
  { t: "Built for South India", d: "Trades, states and workflows tuned for greenfield & EPC sites in Andhra Pradesh." },
];

export default async function Home() {
  const session = await getSession();
  const primaryHref = session ? "/dashboard" : "/register";

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="grid items-center gap-8 pt-6 md:grid-cols-2">
        <div>
          <span className="badge bg-brand-100 text-brand-700">For greenfield & EPC project sites</span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Verified contract manpower, without the middlemen.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            ShramSetu connects companies that need labour fast with verified contractors across
            Andhra Pradesh and South India. Post a requirement, compare real bids, and engage
            securely — all in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={primaryHref} className="btn-primary px-6 py-3 text-base">
              Get started — it&apos;s free
            </Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">
              Log in
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            No platform fees to start. Verification keeps both sides safe.
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white shadow-lg">
          <p className="text-sm uppercase tracking-wide text-brand-100">Time-to-fill</p>
          <p className="mt-1 text-5xl font-extrabold">Hours, not weeks</p>
          <ul className="mt-6 space-y-3 text-sm text-brand-50">
            <li>✓ One requirement → many verified bids</li>
            <li>✓ Trade, location & capacity matching</li>
            <li>✓ Private chat unlocked on engagement</li>
            <li>✓ Ratings build a trusted network over time</li>
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-center text-2xl font-bold text-slate-900">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.who} className="card">
              <h3 className="text-lg font-semibold text-brand-700">{s.who}</h3>
              <ol className="mt-3 space-y-3">
                {s.items.map((it, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-600">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {i + 1}
                    </span>
                    {it}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-center text-2xl font-bold text-slate-900">Why ShramSetu</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.t} className="card">
              <h3 className="font-semibold text-slate-900">{f.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-slate-900 px-8 py-12 text-center text-white">
        <h2 className="text-2xl font-bold">Ready to find — or supply — verified manpower?</h2>
        <p className="mx-auto mt-2 max-w-xl text-slate-300">
          Join companies and contractors building South India&apos;s next generation of projects.
        </p>
        <Link href={primaryHref} className="btn-primary mt-6 px-6 py-3 text-base">
          Create your free account
        </Link>
      </section>
    </div>
  );
}
