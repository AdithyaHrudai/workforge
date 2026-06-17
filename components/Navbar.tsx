import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";

const NAV: Record<string, { href: string; label: string }[]> = {
  COMPANY: [
    { href: "/company", label: "Dashboard" },
    { href: "/company/jobs", label: "My Jobs" },
    { href: "/company/contractors", label: "Find Contractors" },
    { href: "/engagements", label: "Engagements" },
  ],
  CONTRACTOR: [
    { href: "/contractor", label: "Dashboard" },
    { href: "/contractor/jobs", label: "Find Work" },
    { href: "/contractor/bids", label: "My Bids" },
    { href: "/engagements", label: "Engagements" },
  ],
  ADMIN: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/contractors", label: "Contractors" },
    { href: "/admin/companies", label: "Companies" },
    { href: "/admin/settings", label: "Settings" },
  ],
};

export async function Navbar() {
  const session = await getSession();
  const links = session ? NAV[session.role] ?? [] : [];

  let unread = 0;
  if (session) {
    unread = await prisma.notification.count({
      where: { userId: session.uid, read: false },
    });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo href={session ? "/dashboard" : "/"} />

        {links.length > 0 && (
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Link
                href="/notifications"
                className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <span className="hidden text-sm text-slate-500 sm:inline">{session.name}</span>
              <form action={logoutAction}>
                <button className="btn-secondary" type="submit">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
