import { CHART_INK, SERIES_1, STAGE_RAMP, niceScale, pct } from "@/lib/charts";
import { formatNumber } from "@/lib/utils";

/**
 * Charts, built in plain HTML and CSS.
 *
 * No charting library and no client JavaScript: the marks are div widths and
 * heights, so they stay responsive at any container size, the text renders at
 * real size rather than being scaled by a viewBox, and nothing has to be
 * exempted from the app's nonce CSP. Hover is CSS-only.
 *
 * Shared conventions, applied by every chart here:
 *   · marks capped at 24px thick, square at the baseline, 4px rounded data-end
 *   · a 2px surface gap separating adjacent marks — never a stroke around them
 *   · hairline solid gridlines one step off the surface, never dashed
 *   · values labelled selectively; axis ticks carry the rest
 *   · text in ink tokens, never the series colour
 *   · every chart ships a table view, so no value is reachable only by hover
 */

function TableView({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="mt-4 border-t border-slate-100 pt-3">
      <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
        {caption}
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={c} className={i > 0 ? "text-right" : undefined}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])}>
                {row.map((cell, i) => (
                  <td
                    key={i}
                    className={i > 0 ? "text-right tabular-nums text-slate-700" : "text-slate-700"}
                  >
                    {typeof cell === "number" ? formatNumber(cell) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export type BarDatum = { key: string; label: string; value: number; color: string };

/**
 * Horizontal bars for a small set of named categories.
 *
 * Each bar carries its category's own colour because that identity is
 * established product-wide in the badges — but the category is also named in
 * text at the start of every row, so the chart never depends on hue being
 * distinguishable.
 */
export function BarChart({
  data,
  valueLabel = "Requirements",
  tableCaption = "View as table",
}: {
  data: BarDatum[];
  valueLabel?: string;
  tableCaption?: string;
}) {
  const { max, ticks } = niceScale(Math.max(...data.map((d) => d.value), 0));
  const empty = data.every((d) => d.value === 0);

  return (
    <div>
      <div className="relative">
        {/* Gridlines sit behind the marks, inset to match the label gutter. */}
        <div className="pointer-events-none absolute inset-y-0 left-[9.5rem] right-12 hidden sm:block">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0 bottom-6 w-px"
              style={{ left: `${pct(t, max)}%`, background: CHART_INK.gridline }}
              aria-hidden
            />
          ))}
        </div>

        <ul className="relative flex flex-col gap-2">
          {data.map((d) => (
            <li key={d.key} className="group flex items-center gap-3">
              <span className="w-[8.5rem] shrink-0 text-right text-xs text-slate-600">
                {d.label}
              </span>
              <span className="relative h-6 min-w-0 flex-1">
                <span
                  className="absolute inset-y-0 left-0 block rounded-r transition-[filter] group-hover:brightness-110"
                  style={{
                    width: `${pct(d.value, max)}%`,
                    background: d.color,
                    borderRadius: "0 4px 4px 0",
                  }}
                />
                {/* Zero still needs a visible row, so the track reads as empty
                    rather than as a missing bar. */}
                {d.value === 0 && (
                  <span className="absolute inset-y-0 left-0 w-px bg-slate-200" aria-hidden />
                )}
              </span>
              <span className="w-10 shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                {formatNumber(d.value)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-1 hidden sm:block">
          <div className="relative ml-[9.5rem] mr-12 h-5 border-t" style={{ borderColor: CHART_INK.axis }}>
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-1 -translate-x-1/2 text-[10px] tabular-nums text-slate-400"
                style={{ left: `${pct(t, max)}%` }}
              >
                {formatNumber(t)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {empty && (
        <p className="mt-3 text-sm text-slate-500">Nothing posted yet in any contract type.</p>
      )}

      <TableView
        caption={tableCaption}
        columns={["Contract type", valueLabel]}
        rows={data.map((d) => [d.label, d.value])}
      />
    </div>
  );
}

export type StageDatum = { key: string; label: string; value: number; hint?: string };

/**
 * The marketplace funnel — ordered stages, so this is the one place an ordinal
 * ramp is correct: a single hue darkening along the sequence. Nominal
 * categories never get this treatment.
 *
 * Each stage shows its own count and, from the second stage on, what share of
 * the previous stage it represents.
 */
export function FunnelChart({
  data,
  tableCaption = "View as table",
}: {
  data: StageDatum[];
  tableCaption?: string;
}) {
  const top = Math.max(...data.map((d) => d.value), 0);

  return (
    <div>
      <ul className="flex flex-col gap-2.5">
        {data.map((d, i) => {
          const previous = i > 0 ? data[i - 1].value : null;
          const share = previous && previous > 0 ? Math.round((d.value / previous) * 100) : null;
          return (
            <li key={d.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-slate-600">{d.label}</span>
                <span className="flex items-baseline gap-2">
                  {share !== null && (
                    <span className="text-[10px] tabular-nums text-slate-400">
                      {share}% of previous
                    </span>
                  )}
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatNumber(d.value)}
                  </span>
                </span>
              </div>
              <div className="mt-1 h-5 w-full rounded-sm bg-slate-100">
                <div
                  className="h-full"
                  style={{
                    width: `${pct(d.value, top)}%`,
                    background: STAGE_RAMP[Math.min(i, STAGE_RAMP.length - 1)],
                    borderRadius: "2px 4px 4px 2px",
                  }}
                />
              </div>
              {d.hint && <p className="mt-0.5 text-[11px] text-slate-400">{d.hint}</p>}
            </li>
          );
        })}
      </ul>

      <TableView
        caption={tableCaption}
        columns={["Stage", "Count"]}
        rows={data.map((d) => [d.label, d.value])}
      />
    </div>
  );
}

export type DayDatum = { date: string; label: string; value: number };

/**
 * Daily activity as columns rather than a line: these are discrete per-day
 * counts, not a continuous quantity sampled over time, and columns also give
 * each day its own hover target without any JavaScript.
 *
 * One series, so one colour and no legend — the heading says what is plotted.
 */
export function ActivityChart({
  data,
  tableCaption = "View as table",
}: {
  data: DayDatum[];
  tableCaption?: string;
}) {
  const { max, ticks } = niceScale(Math.max(...data.map((d) => d.value), 0), 3);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const busiest = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{formatNumber(total)}</span>
        <span className="text-xs text-slate-500">
          actions in {data.length} days
          {busiest && busiest.value > 0 && ` · busiest ${busiest.label} (${busiest.value})`}
        </span>
      </div>

      <div className="relative mt-4 flex" style={{ height: "8rem" }}>
        <div className="relative w-8 shrink-0">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-slate-400"
              style={{ bottom: `${pct(t, max)}%` }}
            >
              {formatNumber(t)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {ticks.map((t) => (
            <span
              key={t}
              className="pointer-events-none absolute inset-x-0 h-px"
              style={{ bottom: `${pct(t, max)}%`, background: CHART_INK.gridline }}
              aria-hidden
            />
          ))}

          {/* 2px gap between columns is the separator — no stroke on the marks. */}
          <ul className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d) => (
              <li
                key={d.date}
                className="group relative flex h-full flex-1 items-end"
                title={`${d.label}: ${d.value} action${d.value === 1 ? "" : "s"}`}
              >
                <span
                  className="block w-full transition-[filter] group-hover:brightness-110"
                  style={{
                    height: `${Math.max(pct(d.value, max), d.value > 0 ? 2 : 0)}%`,
                    background: SERIES_1,
                    borderRadius: "3px 3px 0 0",
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="ml-8 mt-1.5 flex justify-between text-[10px] text-slate-400">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>

      <TableView
        caption={tableCaption}
        columns={["Day", "Actions"]}
        rows={data.filter((d) => d.value > 0).map((d) => [d.label, d.value])}
      />
    </div>
  );
}
