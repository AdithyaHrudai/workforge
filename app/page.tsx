import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";


/**
 * Headline numbers for the hero. Real counts rather than invented ones — an
 * empty directory should read as empty, not as fabricated traction.
 */
async function getStats() {
  try {
    // Aggregated in Postgres, not in JS. This used to load every approved
    // contractor row — presence states and all — purely to sum two numbers,
    // which grew linearly with the directory on the app's most-visited page.
    // The state count needs the array column unnested, which Prisma cannot
    // express, so that one drops to raw SQL.
    const [counts, states] = await Promise.all([
      prisma.$queryRaw<{ contractors: bigint; workforce: bigint; requirements: bigint }[]>`
        SELECT
          (SELECT COUNT(*) FROM "ContractorProfile" cp
             JOIN "User" u ON u.id = cp."userId"
            WHERE cp.status = 'APPROVED' AND u.status = 'ACTIVE')          AS contractors,
          (SELECT COALESCE(SUM(cp."totalWorkforce"), 0) FROM "ContractorProfile" cp
             JOIN "User" u ON u.id = cp."userId"
            WHERE cp.status = 'APPROVED' AND u.status = 'ACTIVE')          AS workforce,
          (SELECT COUNT(*) FROM "Requirement")                             AS requirements
      `,
      prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(DISTINCT s) AS n
          FROM "ContractorProfile" cp
          JOIN "User" u ON u.id = cp."userId"
          CROSS JOIN LATERAL unnest(cp."presenceStates") AS s
         WHERE cp.status = 'APPROVED' AND u.status = 'ACTIVE'
      `,
    ]);

    const row = counts[0];
    if (!row) return null;
    return {
      contractors: Number(row.contractors),
      requirements: Number(row.requirements),
      workforce: Number(row.workforce),
      states: Number(states[0]?.n ?? 0),
    };
  } catch (err) {
    // The landing page must render even if the stats query fails.
    console.error("[home] stats query failed:", err);
    return null;
  }
}

/**
 * One accent rule per category instead of four tinted panels.
 *
 * The tints were doing the same job four times over — a pastel fill, a matching
 * border and a heading — which made the row read as four unrelated boxes rather
 * than as one set of four choices. A 3px top rule distinguishes them just as
 * well on a white card and leaves the type as the loudest thing on the page.
 */
const CATEGORY_ACCENT: Record<string, string> = {
  WHITE_COLLAR_STAFFING: "bg-indigo-500",
  BLUE_COLLAR_STAFFING: "bg-sky-500",
  JOB_CONTRACT: "bg-forge-500",
  UNSKILLED_SUPPLY: "bg-emerald-500",
};



export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const stats = await getStats();

  return (
    <div className="space-y-20 py-6">
      {/* --- Hero ------------------------------------------------------------ */}
      <section className="mx-auto max-w-3xl text-center">
        <p className="reveal mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
          For plants, project sites and manpower contractors across India
        </p>
        <h1 className="reveal reveal-1 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Industry finds its workforce.
        </h1>
        <p className="reveal reveal-2 mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          Post a contract manpower requirement and compare verified contractors on the plants they
          already run, the states they cover and how they are rated.
        </p>

        <div className="reveal reveal-3 mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="btn-primary">
            Post a requirement
          </Link>
          <Link href="/register" className="btn-secondary">
            Register as a contractor
          </Link>
        </div>
        <p className="reveal reveal-3 mt-4 text-sm text-slate-500">
          Free to join. Verified firms only.
        </p>

        {stats && stats.contractors > 0 && (
          <dl className="reveal reveal-4 mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-y-6 border-t border-slate-200 pt-8 sm:grid-cols-4">
            {[
              { label: "Verified firms", value: formatNumber(stats.contractors) },
              { label: "States covered", value: formatNumber(stats.states) },
              { label: "Manpower listed", value: formatNumber(stats.workforce) },
              { label: "Requirements posted", value: formatNumber(stats.requirements) },
            ].map((s) => (
              <div key={s.label}>
                <dt className="stat-label">{s.label}</dt>
                <dd className="stat-value mt-0.5">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* --- The four contract types ----------------------------------------- */}
      <section>
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Four kinds of contract, handled properly
          </h2>
          <p className="mt-2 text-slate-600">
            Each one is bought differently — so each one is posted, quoted and compared differently.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c, i) => (
            <div
              key={c.value}
              className={`reveal reveal-${i + 1} card-hover overflow-hidden rounded-xl border border-slate-200 bg-white`}
            >
              <span
                className={`block h-1 w-full ${CATEGORY_ACCENT[c.value] ?? "bg-slate-300"}`}
                aria-hidden
              />
              <div className="p-5">
                <h3 className="font-semibold text-slate-900">{c.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.summary}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {c.billing === "PER_MANPOWER" ? "Charged per person" : "Charged against output"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Why track record beats a directory ------------------------------- */}
      <section className="rounded-2xl bg-slate-900 px-6 py-12 text-white sm:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Judge a contractor on what they actually run
          </h2>
          <p className="mt-3 text-slate-300">
            Anyone can claim national coverage. On WorkForge every contractor publishes their client
            list — which companies, which plants, which states, how many people, since when. If you
            are hiring in Chhattisgarh, you can see at a glance who already has people on the ground
            there.
          </p>
        </div>

        {/* Three facts, not three panels. Inside a dark band a bordered box on
            every item is one container too many — a rule above each one groups
            them just as clearly. */}
        <dl className="mx-auto mt-10 grid max-w-4xl gap-8 sm:grid-cols-3">
          {[
            {
              stat: "Client list",
              label: "Sites, states and headcount, published on every profile",
            },
            {
              stat: "5 parameters",
              label: "Deployment, compliance, worker payment, quality, responsiveness",
            },
            {
              stat: "Verified docs",
              label: "GST and PAN certificates checked by our team",
            },
          ].map((item) => (
            <div key={item.stat} className="border-t border-white/15 pt-4">
              <dt className="text-lg font-bold text-forge-400">{item.stat}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-300">{item.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* --- Close ------------------------------------------------------------ */}
      <section className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Start with one requirement
        </h2>
        <p className="mt-3 text-slate-600">
          Post it, see who responds, and decide from there. Nothing to pay, and no contract to sign
          with us.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn-primary">
            Create your account
          </Link>
          <Link href="/about" className="btn-secondary">
            See how it works
          </Link>
        </div>
      </section>
    </div>
  );
}
