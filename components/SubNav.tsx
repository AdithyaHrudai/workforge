"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
      {links.map((l) => {
        const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href + "/"));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
