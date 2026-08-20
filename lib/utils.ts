import { rateBasisLabel } from "@/lib/constants";

export function formatINR(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Compact money for dense tables: ₹1.2 Cr, ₹4.5 L, ₹18,500. */
export function formatINRCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} L`;
  return formatINR(n);
}

/** "₹18,500 per person / month" — the canonical way a quote is written. */
export function formatRate(
  amount: number | null | undefined,
  basis: string | null | undefined,
): string {
  if (amount == null) return "—";
  const label = rateBasisLabel(basis);
  return label === "—" ? formatINR(amount) : `${formatINR(amount)} ${label.toLowerCase()}`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Date *and* time, for the audit log — "who did what" is not useful without
 * knowing when to the minute. Rendered in IST, which is where every user is.
 */
export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export function timeAgo(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/** "2019 – present" / "2019 – 2023" / "since 2019". */
export function yearRange(
  started: number | null | undefined,
  ended: number | null | undefined,
  ongoing: boolean,
): string {
  if (!started && !ended) return ongoing ? "Ongoing" : "—";
  if (ongoing) return started ? `Since ${started}` : "Ongoing";
  if (started && ended) return `${started} – ${ended}`;
  return String(started ?? ended);
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : plural ?? `${singular}s`;
}

/** Two-letter monogram for avatar tiles. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Masks a mobile number for display when contact gating is on: 98******10.
 * Enough to confirm a number exists without being dialable.
 */
export function maskMobile(mobile: string | null | undefined): string {
  if (!mobile) return "—";
  const digits = mobile.replace(/\D/g, "");
  if (digits.length < 6) return "••••••";
  return `${digits.slice(0, 2)}${"•".repeat(digits.length - 4)}${digits.slice(-2)}`;
}

/** Masks an email for display: ra•••••@•••.com */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "•••••";
  const tld = domain.slice(domain.lastIndexOf("."));
  return `${local.slice(0, 2)}${"•".repeat(Math.max(3, local.length - 2))}@•••${tld}`;
}

// Flatten a Zod error into a { field: message } map for form display.
export function fieldErrors(error: {
  issues: { path: (string | number)[]; message: string }[];
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type ActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;
