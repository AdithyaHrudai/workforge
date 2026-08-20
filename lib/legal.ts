/**
 * The details a lawyer or a founder has to fill in before launch.
 *
 * Every legal page reads from here, so the entity name, the grievance officer
 * and the governing-law city are set once rather than pasted into three
 * documents that then drift apart.
 *
 * Unfilled values are wrapped in guillemets. `hasUnfilledDetails()` finds them,
 * and the pages render a warning while any remain — a placeholder that ships
 * quietly is worse than no page at all, because it looks like a real policy.
 */

export const LEGAL = {
  /** The company that actually operates the platform, as registered. */
  entityName: "«Registered entity name, e.g. WorkForge Technologies Pvt Ltd»",
  tradingName: "WorkForge",
  cin: "«CIN or firm registration number»",
  gstin: "«GSTIN, if registered»",
  registeredAddress: "«Registered office address, including city, state and PIN»",

  supportEmail: "«support@yourdomain.in»",

  /**
   * The IT Rules require an intermediary to publish this person's name and
   * contact, and to acknowledge a complaint within 24 hours and dispose of it
   * within 15 days.
   */
  grievanceOfficer: {
    name: "«Full name»",
    designation: "Grievance Officer",
    email: "«grievance@yourdomain.in»",
    phone: "«+91 XXXXX XXXXX»",
  },

  /** Courts named in the governing-law clause. */
  jurisdictionCity: "«City»",
  jurisdictionState: "«State»",

  /** Fixed dates, not today's date — a policy states when it took effect. */
  effectiveDate: "«DD Month YYYY»",
  lastUpdated: "«DD Month YYYY»",

  /**
   * Where the data physically sits. Stated because a transfer outside India is
   * something a notice has to disclose, and the managed Postgres this runs on
   * is not in India by default.
   */
  hostingRegion: "Singapore (ap-southeast-1)",
} as const;

const PLACEHOLDER = "«";

export function isUnfilled(value: string): boolean {
  return value.includes(PLACEHOLDER);
}

/** True while any legal detail is still a placeholder. */
export function hasUnfilledDetails(): boolean {
  const flat = [
    LEGAL.entityName,
    LEGAL.cin,
    LEGAL.gstin,
    LEGAL.registeredAddress,
    LEGAL.supportEmail,
    LEGAL.grievanceOfficer.name,
    LEGAL.grievanceOfficer.email,
    LEGAL.grievanceOfficer.phone,
    LEGAL.jurisdictionCity,
    LEGAL.jurisdictionState,
    LEGAL.effectiveDate,
    LEGAL.lastUpdated,
  ];
  return flat.some(isUnfilled);
}
