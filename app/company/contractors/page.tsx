import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TRADES, STATES, tradeLabel } from "@/lib/constants";
import { parseTrades } from "@/lib/utils";
import { VerifiedBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function FindContractorsPage({
  searchParams,
}: {
  searchParams: { trade?: string; state?: string };
}) {
  await requireRole("COMPANY");
  const { trade, state } = searchParams;

  const all = await prisma.contractorProfile.findMany({
    where: {
      status: "APPROVED",
      ...(state ? { state } : {}),
    },
    orderBy: [{ verified: "desc" }, { rating: "desc" }],
  });

  const contractors = trade
    ? all.filter((c) => parseTrades(c.trades).includes(trade))
    : all;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Find contractors</h1>
        <p className="text-sm text-slate-500">
          Verified manpower contractors. Contact details unlock when you accept a bid on one of your
          jobs.
        </p>
      </div>

      <form className="card flex flex-wrap items-end gap-3" method="get">
        <div className="min-w-[180px]">
          <label className="label">Trade</label>
          <select name="trade" defaultValue={trade ?? ""} className="input">
            <option value="">All trades</option>
            {TRADES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="label">State</label>
          <select name="state" defaultValue={state ?? ""} className="input">
            <option value="">All states</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" type="submit">
          Filter
        </button>
      </form>

      {contractors.length === 0 ? (
        <div className="card text-sm text-slate-500">No contractors match these filters yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {contractors.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{c.firmName}</p>
                  <p className="text-xs text-slate-500">
                    {c.city}, {c.state}
                  </p>
                </div>
                {c.verified && <VerifiedBadge />}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {parseTrades(c.trades).slice(0, 6).map((t) => (
                  <span key={t} className="badge bg-slate-100 text-slate-600">
                    {tradeLabel(t)}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>{c.totalWorkforce} workers</span>
                <span>{c.available} available</span>
                <span>Mobilise in {c.mobilizationDays}d</span>
                {c.rating > 0 && <span>★ {c.rating.toFixed(1)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
