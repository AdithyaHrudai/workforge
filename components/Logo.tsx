import Link from "next/link";

/**
 * The WorkForge mark: an anvil silhouette struck by a spark. Reads as industry
 * at 24px, which is the only size that really matters in a navbar.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`${className} flex items-center justify-center rounded-lg bg-brand-700 text-white`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        {/* spark */}
        <path
          d="M16.2 2.5l-1.1 3.2 2.4-.5-2.3 3.6"
          stroke="#fb9c38"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* anvil */}
        <path
          d="M4 11h11.2c1.6 0 2.6-.9 3.3-2.1l.9 .5c-.5 2.4-2 4-4 4.5l.9 2.6H8.2l.9-2.6C6.6 13.4 5 12.5 4 11z"
          fill="currentColor"
        />
        <path d="M7 19.5h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="WorkForge home">
      <LogoMark />
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight text-slate-900">
          Work<span className="text-forge-600">Forge</span>
        </span>
      )}
    </Link>
  );
}
