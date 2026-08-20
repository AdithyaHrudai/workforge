"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdminSectionActive, type AdminNavLink } from "@/lib/admin-nav";

/**
 * The sidebar links. A client component purely so the active section can be
 * derived from the live pathname — everything it renders is otherwise static,
 * and the counts beside each link are passed in from the server.
 */
export function AdminNavLinks({
  links,
  counts,
}: {
  links: AdminNavLink[];
  /** Optional pending-work badge per href. */
  counts?: Record<string, number>;
}) {
  const pathname = usePathname() ?? "";

  return (
    <ul className="space-y-0.5">
      {links.map((link) => {
        const active = isAdminSectionActive(pathname, link.href);
        const count = counts?.[link.href] ?? 0;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{link.label}</span>
                {link.hint && (
                  <span
                    className={`block text-xs ${active ? "text-slate-300" : "text-slate-500"}`}
                  >
                    {link.hint}
                  </span>
                )}
              </span>
              {count > 0 && (
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    active ? "bg-white text-slate-900" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
