/**
 * Chart palette and scales.
 *
 * The categorical slots are the same hues the category badges already wear
 * across the product, taken to mark strength. That is deliberate: a reader who
 * has learned that a job contract is amber sees the same amber in the chart.
 * Colour follows the entity, never its rank — filtering or reordering never
 * repaints a category.
 *
 * Validated against the white card surface before use (OKLab ΔE ×100):
 *   lightness band  PASS   chroma floor    PASS
 *   CVD separation  PASS   worst adjacent 8.8 protan (emerald↔forge)
 *   normal vision   PASS   worst adjacent 16.1 (sky↔indigo)
 *   contrast        PASS   all ≥ 3:1
 *
 * The emerald↔forge pair separates by only 3.0 under tritanopia, which is the
 * classic green/orange confusion. Every chart here therefore names its
 * categories in text beside the mark — identity is never carried by hue alone.
 */

/** Categorical slots, keyed by contract category. Fixed assignment. */
export const CATEGORY_COLORS: Record<string, string> = {
  WHITE_COLLAR_STAFFING: "#4f46e5",
  BLUE_COLLAR_STAFFING: "#0284c7",
  JOB_CONTRACT: "#ea6408",
  UNSKILLED_SUPPLY: "#059669",
};

/**
 * Ordinal ramp for ordered stages (the marketplace funnel). One hue, monotone
 * lightness, light end clearing 2:1 against white — validated with `--ordinal`.
 * Never used for nominal categories, which would double-encode length as hue.
 */
export const STAGE_RAMP = ["#8fb5e0", "#5b90cd", "#3872b5", "#265a99", "#20487b"];

/** Single series hue, for charts where colour carries no identity. */
export const SERIES_1 = "#3872b5";

/** Chart chrome. Text always wears an ink token, never a series colour. */
export const CHART_INK = {
  gridline: "#e2e8f0",
  axis: "#cbd5e1",
  primary: "#0f172a",
  secondary: "#475569",
  muted: "#94a3b8",
  surface: "#ffffff",
};

/**
 * Axis ticks rounded to clean numbers. Returns the tick values and the maximum
 * the scale should run to, so bars are measured against a rounded ceiling
 * rather than the largest datum.
 */
export function niceScale(max: number, targetTicks = 4): { max: number; ticks: number[] } {
  if (max <= 0) return { max: 1, ticks: [0, 1] };

  const rawStep = max / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalised = rawStep / magnitude;

  // Snap to 1, 2, 5 or 10 × a power of ten, so ticks land on numbers a person
  // would actually write down.
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude;

  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return { max: top, ticks };
}

/** Percentage width for a value on a 0..max scale, clamped. */
export function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}
