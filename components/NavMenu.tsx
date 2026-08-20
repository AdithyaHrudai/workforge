"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, type NavLink } from "@/lib/nav";

/** Desktop-only inline nav. Hidden below `lg`, where the drawer takes over. */
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {links.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-brand-50 text-brand-800"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Closes the popup on route change, outside click and Escape. */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement>) {
  const pathname = usePathname();
  useEffect(() => close(), [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, close, ref]);
}

/**
 * Account dropdown — profile and setup pages, plus log out. Desktop only; the
 * mobile drawer lists the same links inline rather than nesting a menu.
 */
export function AccountMenu({
  name,
  links,
  logoutAction,
}: {
  name: string;
  links: NavLink[];
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
          {initials || "?"}
        </span>
        <span className="max-w-[9rem] truncate">{name}</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current text-slate-400" aria-hidden>
          <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="pop-in absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lift"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {l.label}
            </Link>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * Mobile navigation. A drawer rather than the old horizontally-scrolling strip:
 * the strip pushed the document past the viewport (every page scrolled sideways
 * on a 390px phone) and hid its own overflowing links with no affordance.
 */
export function MobileMenu({
  primary,
  account,
  action,
  logoutAction,
}: {
  primary: NavLink[];
  account: NavLink[];
  action?: NavLink;
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);

  // The drawer is a fixed overlay, so the page behind it must not scroll.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const item = (l: NavLink) => {
    const active = isActive(pathname, l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={active ? "page" : undefined}
        className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
          active ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        {l.label}
      </Link>
    );
  };

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2} aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40" aria-hidden={false}>
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="ml-auto flex h-full w-[17rem] max-w-[85vw] flex-col overflow-y-auto bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2} aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1 p-3">
              {action && (
                <Link href={action.href} className="btn-primary mb-2 w-full">
                  {action.label}
                </Link>
              )}
              {primary.map(item)}
              {account.length > 0 && (
                <>
                  <div className="!mt-4 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Account
                  </div>
                  {account.map(item)}
                </>
              )}
            </nav>

            <form action={logoutAction} className="border-t border-slate-200 p-3">
              <button type="submit" className="btn-secondary w-full">
                Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
