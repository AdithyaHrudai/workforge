/**
 * Navigation for the admin console.
 *
 * `import type` is erased at compile time, so this file stays safe to pull into
 * a client component — no server module is dragged along with it.
 *
 * The order is the order of the work: the queue first, then the two sides being
 * verified, then everything that supports that job. Administration of the admin
 * team sits apart, because most admins never see it.
 */

export type AdminNavLink = {
  href: string;
  label: string;
  /** Shown under the label in the sidebar — this console is used by people who don't live in it. */
  hint?: string;
  /** Restricts the link to super admins. */
  superOnly?: boolean;
};

export const ADMIN_NAV: AdminNavLink[] = [
  { href: "/admin", label: "Verification queue", hint: "What is waiting on you" },
  { href: "/admin/contractors", label: "Contractors", hint: "Firms and their documents" },
  { href: "/admin/companies", label: "Companies", hint: "Employers and their documents" },
  { href: "/admin/users", label: "Accounts", hint: "Every registered account" },
];

export const ADMIN_NAV_SECONDARY: AdminNavLink[] = [
  { href: "/admin/team", label: "Admin team", hint: "Who has access here", superOnly: true },
  { href: "/admin/audit", label: "Audit log", hint: "Every privileged action" },
  { href: "/admin/settings", label: "Platform settings", hint: "Approval and contact rules", superOnly: true },
  { href: "/admin/account", label: "My account", hint: "Password and sessions" },
];

/** True when `href` is the section the current path belongs to. */
export function isAdminSectionActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // "/admin" is the queue and must not light up on every child route; deeper
  // links should stay lit on their own children (/admin/contractors/<id>).
  if (href === "/admin") return false;
  return pathname.startsWith(href + "/");
}

export function visibleAdminLinks(links: AdminNavLink[], isSuperAdmin: boolean): AdminNavLink[] {
  return links.filter((l) => !l.superOnly || isSuperAdmin);
}
