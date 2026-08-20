// WorkForge — domain vocabulary for industrial contract staffing.
//
// The whole product hangs off ONE idea: a requirement belongs to exactly one of
// four contract categories, and that category decides what the company must
// specify, what the contractor quotes, and how the commercials are expressed.
// Everything below is organised around that split.

export type Option = { value: string; label: string };

// ---------------------------------------------------------------------------
// The four contract categories
// ---------------------------------------------------------------------------

export const CATEGORY = {
  WHITE_COLLAR: "WHITE_COLLAR_STAFFING",
  BLUE_COLLAR: "BLUE_COLLAR_STAFFING",
  JOB_CONTRACT: "JOB_CONTRACT",
  UNSKILLED: "UNSKILLED_SUPPLY",
} as const;

export type CategoryKey = (typeof CATEGORY)[keyof typeof CATEGORY];

export type CategoryMeta = {
  value: CategoryKey;
  label: string;
  short: string;
  /** One line a first-time visitor can understand. */
  summary: string;
  /** What the company is buying — drives the posting form. */
  billing: "PER_MANPOWER" | "PER_OUTPUT";
  accent: string;
};

export const CATEGORIES: CategoryMeta[] = [
  {
    value: CATEGORY.WHITE_COLLAR,
    label: "White-collar temp staffing",
    short: "White-collar",
    summary:
      "Engineers, supervisors and executives placed on the company's rolls-equivalent contract. Charged per person deployed.",
    billing: "PER_MANPOWER",
    accent: "indigo",
  },
  {
    value: CATEGORY.BLUE_COLLAR,
    label: "Blue-collar temp staffing",
    short: "Blue-collar",
    summary:
      "Skilled operators, technicians and tradesmen deployed against a sanctioned headcount. Charged per person deployed.",
    billing: "PER_MANPOWER",
    accent: "sky",
  },
  {
    value: CATEGORY.JOB_CONTRACT,
    label: "Job contract (output-based)",
    short: "Job contract",
    summary:
      "The company specifies the scope and the output it needs — not the headcount. The contractor decides how many people or machines to deploy and is paid against output.",
    billing: "PER_OUTPUT",
    accent: "amber",
  },
  {
    value: CATEGORY.UNSKILLED,
    label: "Unskilled and semi-skilled manpower supply",
    short: "Unskilled & semi-skilled",
    summary:
      "Helpers, loaders, housekeeping and semi-skilled hands supporting operators and machines. Supplied on a per-person basis.",
    billing: "PER_MANPOWER",
    accent: "emerald",
  },
];

export const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c]),
);

export function categoryLabel(value: string): string {
  return CATEGORY_MAP[value]?.label ?? value;
}

export function categoryShort(value: string): string {
  return CATEGORY_MAP[value]?.short ?? value;
}

export function isValidCategory(value: string): value is CategoryKey {
  return value in CATEGORY_MAP;
}

/** True when the category is billed per person rather than per unit of output. */
export function isHeadcountCategory(value: string): boolean {
  return CATEGORY_MAP[value]?.billing === "PER_MANPOWER";
}

export const CATEGORY_OPTIONS: Option[] = CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
}));

// ---------------------------------------------------------------------------
// Commercial basis
//
// Staffing categories are quoted per person per month (the industry norm for
// term staffing) or per person per day. A job contract is quoted against
// whatever the output is measured in — tonnage for warehousing, pieces for
// machine-shop work, a lump sum for a shutdown.
// ---------------------------------------------------------------------------

export const MANPOWER_RATE_BASIS: Option[] = [
  { value: "PER_PERSON_MONTH", label: "Per person / month" },
  { value: "PER_PERSON_DAY", label: "Per person / day" },
  { value: "PER_PERSON_SHIFT", label: "Per person / shift" },
];

export const OUTPUT_RATE_BASIS: Option[] = [
  { value: "PER_TONNE", label: "Per tonne" },
  { value: "PER_UNIT", label: "Per unit / piece" },
  { value: "PER_TRIP", label: "Per trip / load" },
  { value: "PER_SQM", label: "Per sq. metre" },
  { value: "LUMPSUM_MONTH", label: "Lump sum / month" },
  { value: "LUMPSUM_PROJECT", label: "Lump sum / whole job" },
];

export const RATE_BASIS_LABELS: Record<string, string> = Object.fromEntries(
  [...MANPOWER_RATE_BASIS, ...OUTPUT_RATE_BASIS].map((o) => [o.value, o.label]),
);

export function rateBasisLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return RATE_BASIS_LABELS[value] ?? value;
}

/** The rate-basis choices valid for a given contract category. */
export function rateBasisFor(category: string): Option[] {
  return isHeadcountCategory(category) ? MANPOWER_RATE_BASIS : OUTPUT_RATE_BASIS;
}

/** Units an output-based scope is measured in. */
export const OUTPUT_UNITS: Option[] = [
  { value: "tonne", label: "Tonne" },
  { value: "unit", label: "Unit / piece" },
  { value: "trip", label: "Trip / load" },
  { value: "sqm", label: "Sq. metre" },
  { value: "shift", label: "Shift" },
  { value: "month", label: "Month" },
];

// ---------------------------------------------------------------------------
// Industry sectors
//
// The call log makes this a first-class filter: a company hiring for a tyre
// plant wants contractors who have actually worked in tyre plants.
// ---------------------------------------------------------------------------

export const INDUSTRIES: Option[] = [
  { value: "tyre", label: "Tyre & Rubber" },
  { value: "steel", label: "Steel & Metals" },
  { value: "power", label: "Power & Energy" },
  { value: "cement", label: "Cement" },
  { value: "auto", label: "Automobile & Auto Components" },
  { value: "chemicals", label: "Chemicals & Petrochemicals" },
  { value: "pharma", label: "Pharmaceuticals" },
  { value: "fmcg", label: "FMCG & Food Processing" },
  { value: "textiles", label: "Textiles & Apparel" },
  { value: "warehousing", label: "Warehousing & Logistics" },
  { value: "epc", label: "Engineering, Procurement & Construction" },
  { value: "infra", label: "Infrastructure & Construction" },
  { value: "mining", label: "Mining & Minerals" },
  { value: "oil_gas", label: "Oil & Gas" },
  { value: "renewables", label: "Renewable Energy" },
  { value: "ports", label: "Ports & Shipping" },
  { value: "paper", label: "Paper & Packaging" },
  { value: "glass", label: "Glass & Ceramics" },
  { value: "electronics", label: "Electronics & Electricals" },
  { value: "general_mfg", label: "General Manufacturing" },
  // Selecting this reveals a free-text box on the profile form. The typed value
  // is stored alongside the codes, and `industryLabel` falls back to the raw
  // string, so an unlisted sector displays and searches like any other.
  { value: "other", label: "Other" },
];

export const INDUSTRY_LABELS: Record<string, string> = Object.fromEntries(
  INDUSTRIES.map((i) => [i.value, i.label]),
);

export function industryLabel(value: string): string {
  return INDUSTRY_LABELS[value] ?? value;
}

export const NATURE_OF_BUSINESS: Option[] = [
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "SERVICE", label: "Service" },
  { value: "BOTH", label: "Manufacturing & Service" },
];

export const NATURE_LABELS: Record<string, string> = Object.fromEntries(
  NATURE_OF_BUSINESS.map((n) => [n.value, n.label]),
);

// ---------------------------------------------------------------------------
// Role catalogues, one per staffing category
//
// Kept separate rather than as one flat list because a company posting a
// white-collar requirement should never be offered "Loader / Unloader".
// ---------------------------------------------------------------------------

export const WHITE_COLLAR_ROLES: Option[] = [
  { value: "production_engineer", label: "Production Engineer" },
  { value: "maintenance_engineer", label: "Maintenance Engineer" },
  { value: "quality_engineer", label: "Quality / QA Engineer" },
  { value: "process_engineer", label: "Process Engineer" },
  { value: "project_engineer", label: "Project Engineer" },
  { value: "shift_incharge", label: "Shift In-charge / Supervisor" },
  { value: "safety_officer", label: "Safety / EHS Officer" },
  { value: "ppc_planner", label: "Production Planning (PPC)" },
  { value: "stores_officer", label: "Stores & Inventory Officer" },
  { value: "hr_ir_executive", label: "HR & IR Executive" },
  { value: "accounts_executive", label: "Accounts / Finance Executive" },
  { value: "purchase_executive", label: "Purchase / Procurement Executive" },
  { value: "sales_executive", label: "Sales & Commercial Executive" },
  { value: "design_draughtsman", label: "Design Engineer / Draughtsman" },
  { value: "it_support", label: "IT Support Executive" },
  { value: "lab_chemist", label: "Lab Chemist / Analyst" },
  { value: "admin_executive", label: "Admin Executive" },
];

export const BLUE_COLLAR_ROLES: Option[] = [
  { value: "machine_operator", label: "Machine Operator" },
  { value: "cnc_operator", label: "CNC / VMC Operator" },
  { value: "fitter", label: "Fitter" },
  { value: "welder", label: "Welder" },
  { value: "electrician", label: "Electrician" },
  { value: "instrumentation_tech", label: "Instrumentation Technician" },
  { value: "mechanical_tech", label: "Mechanical Technician" },
  { value: "electrical_tech", label: "Electrical Technician" },
  { value: "boiler_operator", label: "Boiler Operator" },
  { value: "utility_operator", label: "Utility / Compressor Operator" },
  { value: "crane_operator", label: "Crane / Hoist Operator" },
  { value: "forklift_operator", label: "Forklift Operator" },
  { value: "rigger", label: "Rigger" },
  { value: "turner_machinist", label: "Turner / Machinist" },
  { value: "millwright", label: "Millwright" },
  { value: "mould_technician", label: "Mould / Die Technician" },
  { value: "tyre_builder", label: "Tyre Building / Curing Operator" },
  { value: "packing_operator", label: "Packing Machine Operator" },
  { value: "fabricator", label: "Fabricator / Sheet Metal" },
  { value: "painter_industrial", label: "Industrial Painter" },
  { value: "lab_technician", label: "Lab Technician" },
  { value: "diesel_mechanic", label: "Diesel Mechanic" },
  { value: "driver_hmv", label: "Driver (HMV / LMV)" },
  { value: "storekeeper", label: "Storekeeper" },
  { value: "qc_inspector", label: "QC Inspector" },
];

export const UNSKILLED_ROLES: Option[] = [
  { value: "production_helper", label: "Production Helper" },
  { value: "maintenance_helper", label: "Maintenance Helper" },
  { value: "machine_helper", label: "Machine / Operator Assistant" },
  { value: "loader_unloader", label: "Loader / Unloader" },
  { value: "material_handler", label: "Material Handler" },
  { value: "packing_helper", label: "Packing & Palletising Helper" },
  { value: "warehouse_helper", label: "Warehouse Helper" },
  { value: "housekeeping", label: "Housekeeping / Sanitation" },
  { value: "security_guard", label: "Security Guard" },
  { value: "canteen_staff", label: "Canteen Staff" },
  { value: "gardener", label: "Gardening / Horticulture" },
  { value: "scrap_handler", label: "Scrap Segregation & Handling" },
  { value: "general_helper", label: "General Helper" },
];

/** Typical job-contract scopes, offered as suggestions when posting. */
export const JOB_CONTRACT_SCOPES: Option[] = [
  { value: "mould_drum_change", label: "Mould / Drum Change" },
  { value: "material_handling", label: "Material Handling" },
  { value: "loading_unloading", label: "Loading & Unloading" },
  { value: "warehouse_ops", label: "Warehouse Operations" },
  { value: "packing_palletising", label: "Packing & Palletising" },
  { value: "bagging", label: "Bagging & Dispatch" },
  { value: "machine_shop", label: "Machine Shop Job Work" },
  { value: "fabrication", label: "Fabrication & Structural Work" },
  { value: "painting_coating", label: "Painting & Coating" },
  { value: "insulation", label: "Insulation & Lagging" },
  { value: "refractory", label: "Refractory Work" },
  { value: "shutdown_maintenance", label: "Shutdown / Turnaround Maintenance" },
  { value: "amc_maintenance", label: "Annual Maintenance Contract" },
  { value: "housekeeping_contract", label: "Housekeeping Contract" },
  { value: "scrap_management", label: "Scrap Management" },
  { value: "civil_works", label: "Civil & Site Works" },
  { value: "other_scope", label: "Other (describe below)" },
];

/** The role list a given category should offer. Empty for job contracts. */
export function rolesFor(category: string): Option[] {
  switch (category) {
    case CATEGORY.WHITE_COLLAR:
      return WHITE_COLLAR_ROLES;
    case CATEGORY.BLUE_COLLAR:
      return BLUE_COLLAR_ROLES;
    case CATEGORY.UNSKILLED:
      return UNSKILLED_ROLES;
    default:
      return [];
  }
}

const ALL_ROLE_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...WHITE_COLLAR_ROLES,
    ...BLUE_COLLAR_ROLES,
    ...UNSKILLED_ROLES,
    ...JOB_CONTRACT_SCOPES,
  ].map((r) => [r.value, r.label]),
);

/** Every catalogue role code, for telling a known code from a typed-in title. */
const ALL_ROLE_VALUES = new Set(Object.keys(ALL_ROLE_LABELS));

export function roleLabel(value: string): string {
  return ALL_ROLE_LABELS[value] ?? value;
}

/** True if `role` is a member of `category`'s catalogue. */
export function roleBelongsTo(category: string, role: string): boolean {
  return rolesFor(category).some((r) => r.value === role);
}

/**
 * True when `role` is a catalogue entry belonging to some *other* category.
 *
 * A role typed by hand is not in any catalogue, so this returns false for it —
 * which is what lets a company post a job title the catalogue never anticipated.
 * It only catches the real error case: a code from the wrong catalogue, meaning
 * the category was switched after the roles were filled in.
 */
export function roleIsInAnotherCatalogue(category: string, role: string): boolean {
  if (roleBelongsTo(category, role)) return false;
  return ALL_ROLE_VALUES.has(role);
}

// ---------------------------------------------------------------------------
// Requirement attributes
// ---------------------------------------------------------------------------

export const EXPERIENCE_BANDS: Option[] = [
  { value: "FRESHER", label: "Fresher" },
  { value: "0_2", label: "0 – 2 years" },
  { value: "2_5", label: "2 – 5 years" },
  { value: "5_10", label: "5 – 10 years" },
  { value: "10_PLUS", label: "10+ years" },
];

export const EXPERIENCE_LABELS: Record<string, string> = Object.fromEntries(
  EXPERIENCE_BANDS.map((e) => [e.value, e.label]),
);

export const QUALIFICATIONS: Option[] = [
  { value: "NONE", label: "No formal qualification" },
  { value: "SSC", label: "10th / SSC" },
  { value: "HSC", label: "12th / HSC" },
  { value: "ITI", label: "ITI" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "GRADUATE", label: "Graduate" },
  { value: "ENGINEERING", label: "B.E. / B.Tech" },
  { value: "POSTGRADUATE", label: "Post Graduate" },
];

export const QUALIFICATION_LABELS: Record<string, string> = Object.fromEntries(
  QUALIFICATIONS.map((q) => [q.value, q.label]),
);

export const SHIFTS: Option[] = [
  { value: "GENERAL", label: "General shift" },
  { value: "DAY", label: "Day shift" },
  { value: "NIGHT", label: "Night shift" },
  { value: "ROTATING", label: "Rotating / 3-shift" },
];

export const SHIFT_LABELS: Record<string, string> = Object.fromEntries(
  SHIFTS.map((s) => [s.value, s.label]),
);

export const URGENCY: Option[] = [
  { value: "URGENT", label: "Immediate (within a week)" },
  { value: "NORMAL", label: "Normal (2 – 4 weeks)" },
  { value: "PLANNED", label: "Planned (future requirement)" },
];

export const URGENCY_LABELS: Record<string, string> = Object.fromEntries(
  URGENCY.map((u) => [u.value, u.label]),
);

export const CONTRACT_DURATIONS: Option[] = [
  { value: "SHORT", label: "Short term (under 3 months)" },
  { value: "MEDIUM", label: "Medium term (3 – 12 months)" },
  { value: "LONG", label: "Long term (1 year+)" },
  { value: "ONGOING", label: "Ongoing / renewable" },
];

export const DURATION_LABELS: Record<string, string> = Object.fromEntries(
  CONTRACT_DURATIONS.map((d) => [d.value, d.label]),
);

/**
 * How long a posting stays live, by urgency. An "immediate" requirement still
 * sitting in contractors' feeds two months later destroys trust in the feed, so
 * every posting gets an expiry derived from how urgent the company said it was.
 */
export const POSTING_LIFETIME_DAYS: Record<string, number> = {
  URGENT: 21,
  NORMAL: 45,
  PLANNED: 120,
};

export function postingExpiryFrom(urgency: string, startDate?: Date | null): Date {
  const days = POSTING_LIFETIME_DAYS[urgency] ?? POSTING_LIFETIME_DAYS.NORMAL;
  const fromNow = Date.now() + days * 86400_000;
  // A posting shouldn't expire before the work is due to start.
  const floor = startDate ? startDate.getTime() + 7 * 86400_000 : 0;
  return new Date(Math.max(fromNow, floor));
}

// ---------------------------------------------------------------------------
// Contractor rating parameters
//
// The client was explicit that a single star rating is not enough: companies
// judge a contractor on whether manpower arrives on time, whether statutory
// compliance is clean, and whether the contractor's own workers get paid.
// ---------------------------------------------------------------------------

export type RatingParameter = {
  key: string;
  label: string;
  help: string;
};

export const RATING_PARAMETERS: RatingParameter[] = [
  {
    key: "deployment",
    label: "Timely manpower deployment",
    help: "Were people mobilised on the promised date, and were shortfalls covered quickly?",
  },
  {
    key: "compliance",
    label: "Statutory compliance",
    help: "PF, ESI, CLRA licence, wage registers and returns filed correctly and on time.",
  },
  {
    key: "workerPayment",
    label: "Timely payment to workers",
    help: "Were the contractor's own workers paid in full, on schedule, every month?",
  },
  {
    key: "manpowerQuality",
    label: "Manpower quality & retention",
    help: "Skill level as promised, low absenteeism, low attrition.",
  },
  {
    key: "responsiveness",
    label: "Supervision & responsiveness",
    help: "Site supervision, escalation handling and general responsiveness.",
  },
];

export const RATING_KEYS = RATING_PARAMETERS.map((p) => p.key);

// ---------------------------------------------------------------------------
// Organisation & geography
// ---------------------------------------------------------------------------

export const ENTITY_TYPES: Option[] = [
  { value: "Proprietorship", label: "Proprietorship" },
  { value: "Partnership", label: "Partnership" },
  { value: "Pvt Ltd", label: "Private Limited" },
  { value: "Public Ltd", label: "Public Limited" },
  { value: "LLP", label: "LLP" },
  { value: "PSU/Govt", label: "PSU / Government" },
  { value: "MNC", label: "Multinational" },
];

/** Bands used for both a company's own strength and a contractor's bench. */
export const MANPOWER_BANDS: Option[] = [
  { value: "UNDER_50", label: "Under 50" },
  { value: "50_200", label: "50 – 200" },
  { value: "200_500", label: "200 – 500" },
  { value: "500_1000", label: "500 – 1,000" },
  { value: "1000_5000", label: "1,000 – 5,000" },
  { value: "5000_PLUS", label: "5,000+" },
];

export const MANPOWER_BAND_LABELS: Record<string, string> = Object.fromEntries(
  MANPOWER_BANDS.map((m) => [m.value, m.label]),
);

/** All states and union territories, alphabetical — this is a national platform. */
export const STATES: string[] = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

/**
 * Zones, used by the contractor search so a company can ask for "presence in
 * East India" without naming every state.
 */
export const ZONES: Record<string, string[]> = {
  North: [
    "Delhi",
    "Haryana",
    "Punjab",
    "Rajasthan",
    "Uttar Pradesh",
    "Uttarakhand",
    "Himachal Pradesh",
    "Jammu & Kashmir",
    "Ladakh",
    "Chandigarh",
  ],
  South: ["Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Kerala", "Puducherry"],
  East: ["West Bengal", "Odisha", "Bihar", "Jharkhand", "Sikkim"],
  West: ["Maharashtra", "Gujarat", "Goa", "Dadra & Nagar Haveli and Daman & Diu"],
  Central: ["Madhya Pradesh", "Chhattisgarh"],
  "North East": ["Assam", "Arunachal Pradesh", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Tripura"],
};

export const ZONE_OPTIONS: Option[] = Object.keys(ZONES).map((z) => ({
  value: z,
  label: `${z} India`,
}));

/** The zone a state sits in, or null for anything unmapped. */
export function zoneOf(state: string): string | null {
  for (const [zone, states] of Object.entries(ZONES)) {
    if (states.includes(state)) return zone;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Verification documents
// ---------------------------------------------------------------------------

/**
 * Verification is a short checklist, not a filing cabinet.
 *
 * Each entry is one question the firm answers yes or no. "Yes" means it holds
 * that registration, and it must then produce both the number and the
 * certificate — the number alone is a claim, the certificate alone cannot be
 * cross-checked against anything. "No" is a recorded answer too: a reviewer
 * needs to tell "this firm has no GST registration" from "this firm has not
 * got round to answering".
 */
export type VerificationItem = {
  /** Stored on Document.type, and the field name the answer submits under. */
  value: string;
  label: string;
  question: string;
  /** Label for the number that comes with a "yes". */
  idLabel: string;
  idPlaceholder: string;
};

const GST_ITEM: VerificationItem = {
  value: "GST",
  label: "GST registration",
  question: "Are you registered under GST?",
  idLabel: "GSTIN",
  idPlaceholder: "22AAAAA0000A1Z5",
};

const PAN_ITEM: VerificationItem = {
  value: "PAN",
  label: "PAN",
  question: "Do you have a PAN in the firm's name?",
  idLabel: "PAN",
  idPlaceholder: "ABCDE1234F",
};

/**
 * The CLRA cuts both ways but not symmetrically: a company engaging contract
 * labour registers as the principal employer, while the contractor supplying it
 * holds a licence. Only the company's registration is asked for here.
 */
const CLRA_ITEM: VerificationItem = {
  value: "CLRA",
  label: "CLRA registration",
  question: "Are you registered under the Contract Labour (R&A) Act as a principal employer?",
  idLabel: "CLRA registration number",
  idPlaceholder: "As printed on the certificate",
};

export const COMPANY_VERIFICATION_ITEMS: VerificationItem[] = [GST_ITEM, PAN_ITEM, CLRA_ITEM];

export const CONTRACTOR_VERIFICATION_ITEMS: VerificationItem[] = [GST_ITEM, PAN_ITEM];

export type Side = "CONTRACTOR" | "COMPANY";

export function verificationItemsFor(side: Side): VerificationItem[] {
  return side === "COMPANY" ? COMPANY_VERIFICATION_ITEMS : CONTRACTOR_VERIFICATION_ITEMS;
}

export function verificationItem(side: Side, type: string): VerificationItem | undefined {
  return verificationItemsFor(side).find((i) => i.value === type);
}

/**
 * Labels for document types that are no longer asked for. The checklist above
 * replaced a longer list, but rows uploaded under the old types are still in
 * the database and still have to render with a name in the admin console.
 */
const LEGACY_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  LABOUR_LICENCE: "Labour Licence (CLRA)",
  EPF: "EPF Registration",
  ESIC: "ESIC Registration",
  INCORPORATION: "Incorporation / Registration Certificate",
  ADDRESS_PROOF: "Registered address proof",
  AUTHORISATION: "Authorisation letter for the contact person",
  WORK_ORDER: "Sample Work Order",
  ID: "ID proof",
  OTHER: "Other",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ...LEGACY_DOCUMENT_TYPE_LABELS,
  ...Object.fromEntries(
    [...COMPANY_VERIFICATION_ITEMS, ...CONTRACTOR_VERIFICATION_ITEMS].map((d) => [
      d.value,
      d.label,
    ]),
  ),
};

export function documentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] ?? type;
}

export const ALLOWED_UPLOAD_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
