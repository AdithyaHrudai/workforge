"use client";

import Image from "next/image";

export type Role = "COMPANY" | "CONTRACTOR";

const TILES: { v: Role; t: string; d: string; img: string }[] = [
  {
    v: "COMPANY",
    t: "Company",
    d: "I engage contract manpower",
    img: "/roles/company.webp",
  },
  {
    v: "CONTRACTOR",
    t: "Contractor",
    d: "I supply contract manpower",
    img: "/roles/contractor.webp",
  },
];

/**
 * Role chooser shared by login and registration so the two entry points cannot
 * drift apart visually.
 *
 * Buttons, not radios: on login the tiles sit outside the `<form>` element, so
 * a real radio would never be submitted. Both callers post the choice through a
 * hidden field instead, which keeps one shape for both pages.
 */
export function RoleTiles({
  value,
  onChange,
  label = "Account type",
}: {
  value: Role;
  onChange: (r: Role) => void;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
      {TILES.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.v)}
            className={`group relative overflow-hidden rounded-xl text-left transition ${
              active
                ? "ring-2 ring-brand-600 ring-offset-1"
                : "ring-1 ring-slate-300 hover:ring-slate-400"
            }`}
          >
            {/* Served from /public, so `img-src 'self'` in the nonce CSP covers
                it with no exception. `object-top` keeps the face in frame as the
                tile crops; the artwork is on white, which is why the panel
                behind it is white rather than tinted. */}
            <span className="block h-32 w-full overflow-hidden bg-white sm:h-36">
              <Image
                src={o.img}
                alt=""
                width={760}
                height={600}
                priority
                className={`h-full w-full object-cover object-top transition duration-200 ${
                  active
                    ? "scale-105"
                    : "opacity-75 grayscale group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
                }`}
              />
            </span>

            <span
              className={`block border-t px-3 py-2.5 ${
                active ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white"
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">{o.t}</span>
              <span className="block text-xs leading-snug text-slate-500">{o.d}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
