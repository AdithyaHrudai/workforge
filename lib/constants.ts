// Domain constants for the contract-manpower marketplace.

export type Option = { value: string; label: string };

// Trades relevant to greenfield / construction / EPC sites in India.
export const TRADES: Option[] = [
  { value: "mason", label: "Mason" },
  { value: "shuttering_carpenter", label: "Shuttering / RCC Carpenter" },
  { value: "bar_bender", label: "Bar Bender / Steel Fixer" },
  { value: "electrician", label: "Electrician" },
  { value: "plumber", label: "Plumber" },
  { value: "welder", label: "Welder" },
  { value: "fitter", label: "Fitter / Fabricator" },
  { value: "scaffolder", label: "Scaffolder" },
  { value: "painter", label: "Painter" },
  { value: "plasterer", label: "Plasterer" },
  { value: "tiles_flooring", label: "Tiles / Flooring" },
  { value: "crane_operator", label: "Crane / Equipment Operator" },
  { value: "driver", label: "Driver" },
  { value: "surveyor", label: "Surveyor" },
  { value: "safety_steward", label: "Safety Steward" },
  { value: "housekeeping", label: "Housekeeping / Sanitation" },
  { value: "security", label: "Security / Watch & Ward" },
  { value: "helper", label: "Helper / Unskilled" },
];

export const TRADE_LABELS: Record<string, string> = Object.fromEntries(
  TRADES.map((t) => [t.value, t.label]),
);

export function tradeLabel(value: string): string {
  return TRADE_LABELS[value] ?? value;
}

export const SKILL_LEVELS: Option[] = [
  { value: "SKILLED", label: "Skilled" },
  { value: "SEMI", label: "Semi-skilled" },
  { value: "UNSKILLED", label: "Unskilled" },
];

export const URGENCY: Option[] = [
  { value: "URGENT", label: "Urgent (within 3 days)" },
  { value: "NORMAL", label: "Normal (1-2 weeks)" },
  { value: "PLANNED", label: "Planned (future)" },
];

/**
 * How long a posting stays live, by urgency. An "urgent" requirement that is
 * still in contractors' feeds two months later destroys trust in the feed, so
 * every job gets an expiry derived from how urgent the company said it was.
 */
export const JOB_LIFETIME_DAYS: Record<string, number> = {
  URGENT: 14,
  NORMAL: 45,
  PLANNED: 120,
};

export function jobExpiryFrom(urgency: string, startDate?: Date | null): Date {
  const days = JOB_LIFETIME_DAYS[urgency] ?? JOB_LIFETIME_DAYS.NORMAL;
  const fromNow = Date.now() + days * 86400_000;
  // A posting shouldn't expire before the work is due to start.
  const floor = startDate ? startDate.getTime() + 7 * 86400_000 : 0;
  return new Date(Math.max(fromNow, floor));
}

export const ENTITY_TYPES: Option[] = [
  { value: "Proprietorship", label: "Proprietorship" },
  { value: "Partnership", label: "Partnership" },
  { value: "Pvt Ltd", label: "Private Limited" },
  { value: "LLP", label: "LLP" },
  { value: "PSU/Govt", label: "PSU / Government" },
];

// South-India-first ordering, then the rest of India.
export const STATES: string[] = [
  "Andhra Pradesh",
  "Telangana",
  "Karnataka",
  "Tamil Nadu",
  "Kerala",
  "Odisha",
  "Maharashtra",
  "Chhattisgarh",
  "Bihar",
  "Jharkhand",
  "West Bengal",
  "Uttar Pradesh",
  "Madhya Pradesh",
  "Gujarat",
  "Rajasthan",
  "Other",
];

export const DOCUMENT_TYPES: Option[] = [
  { value: "LABOUR_LICENCE", label: "Labour Licence (CLRA)" },
  { value: "GST", label: "GST Certificate" },
  { value: "PAN", label: "PAN Card" },
  { value: "ID", label: "Owner ID Proof" },
  { value: "OTHER", label: "Other" },
];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.value, d.label]),
);

export const ALLOWED_UPLOAD_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
