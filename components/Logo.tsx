import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
        श
      </span>
      <span className="text-lg font-extrabold tracking-tight text-slate-900">
        Shram<span className="text-brand-600">Setu</span>
      </span>
    </Link>
  );
}
