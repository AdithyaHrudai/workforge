// `import type` is erased at compile time, so this stays safe to pull into the
// client nav components — no server module is dragged along with it.
import type { Role } from "@/lib/auth";

/**
 * The single definition of in-app navigation.
 *
 * There used to be two lists — one in the header, one in a per-section SubNav —
 * which duplicated most destinations and stacked three navigation rows deep on a
 * phone. Everything now comes from here: `PRIMARY` goes in the header, `ACCOUNT`
 * goes behind the account menu, and the mobile drawer renders both.
 *
 * The admin console is not in these lists. It is a separate application with a
 * separate sign-in and its own chrome — see lib/admin-nav.ts.
 */

export type NavLink = { href: string; label: string };

/** Frequently-used destinations. Kept to four so the header never wraps. */
export const PRIMARY_NAV: Record<Role, NavLink[]> = {
  COMPANY: [
    { href: "/company", label: "Dashboard" },
    { href: "/company/requirements", label: "Requirements" },
    { href: "/company/search", label: "Find contractors" },
    { href: "/engagements", label: "Engagements" },
  ],
  CONTRACTOR: [
    { href: "/contractor", label: "Dashboard" },
    { href: "/contractor/requirements", label: "Find work" },
    { href: "/contractor/proposals", label: "My proposals" },
    { href: "/engagements", label: "Engagements" },
  ],
};

/** Profile and setup pages — visited during onboarding, rarely after. */
export const ACCOUNT_NAV: Record<Role, NavLink[]> = {
  COMPANY: [
    { href: "/company/profile", label: "Company profile" },
    { href: "/company/documents", label: "Verification" },
    { href: "/account", label: "Account settings" },
  ],
  CONTRACTOR: [
    { href: "/contractor/profile", label: "Firm profile" },
    { href: "/contractor/clients", label: "Track record" },
    { href: "/contractor/documents", label: "Verification" },
    { href: "/account", label: "Account settings" },
  ],
};

/**
 * The one action worth a button in the header. Only companies have a single
 * dominant action; a contractor's equivalent is browsing the feed, which is
 * already a primary link.
 */
export const PRIMARY_ACTION: Partial<Record<Role, NavLink>> = {
  COMPANY: { href: "/company/requirements/new", label: "Post a requirement" },
};

/** True when `href` is the section the current path belongs to. */
export function isActive(pathname: string, href: string): boolean {
  if (href === pathname) return true;
  // "/company" must not light up on "/company/search", but "/company/requirements"
  // should light up on "/company/requirements/new".
  const isRoot = href.split("/").filter(Boolean).length <= 1;
  return !isRoot && pathname.startsWith(href + "/");
}
