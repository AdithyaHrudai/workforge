"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Applies a facet the moment it is toggled, via a client-side navigation.
 *
 * Sits inside the filter <form> and finds it with `closest`, so the form itself
 * stays a server-rendered GET form: without JavaScript the submit button still
 * works and every search remains a shareable URL.
 *
 * Only checkboxes and selects auto-apply. The free-text box deliberately does
 * not — re-rendering mid-keystroke costs the input its focus, so it submits on
 * Enter like a normal form field.
 */
export function AutoSubmit() {
  const anchor = useRef<HTMLSpanElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;

    const onChange = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      if (target instanceof HTMLInputElement && target.type === "text") return;

      const params = new URLSearchParams();
      for (const [key, value] of new FormData(form).entries()) {
        if (typeof value === "string" && value !== "") params.append(key, value);
      }
      // Any facet change invalidates the current page number.
      params.delete("page");

      const action = form.getAttribute("action") || pathname;
      const query = params.toString();
      router.push(query ? `${action}?${query}` : action, { scroll: false });
    };

    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, [router, pathname]);

  return <span ref={anchor} className="hidden" aria-hidden />;
}

/**
 * Positions the filter panel: inline on desktop, a slide-over on phones.
 *
 * The panel is rendered exactly once and only repositioned, rather than
 * duplicated for each breakpoint — two copies would mean two sets of the same
 * input `id`s and two competing forms.
 */
export function FilterShell({
  activeCount,
  resultCount,
  children,
}: {
  activeCount: number;
  resultCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary mb-4 w-full justify-between lg:hidden"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth={2} aria-hidden>
            <path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" />
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-800">
              {activeCount}
            </span>
          )}
        </span>
        <span className="text-xs font-normal text-slate-500">
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </span>
      </button>

      {/* Mobile: a fixed slide-over. Desktop: reverts to a normal sticky column. */}
      <div
        className={`${
          open
            ? "fixed inset-0 z-50 flex bg-slate-900/40"
            : "hidden"
        } lg:static lg:z-auto lg:block lg:bg-transparent`}
      >
        <div
          className={`${
            open ? "ml-auto flex h-full w-[21rem] max-w-[90vw] flex-col overflow-y-auto bg-white shadow-xl" : ""
          } lg:ml-0 lg:h-auto lg:w-auto lg:max-w-none lg:overflow-visible lg:bg-transparent lg:shadow-none`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 lg:hidden">
            <span className="text-sm font-semibold text-slate-900">Filters</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2} aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="p-4 lg:p-0">{children}</div>
        </div>
      </div>
    </>
  );
}
