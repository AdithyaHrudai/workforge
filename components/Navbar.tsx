import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AccountMenu, MobileMenu, NavLinks } from "@/components/NavMenu";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ACCOUNT_NAV, PRIMARY_ACTION, PRIMARY_NAV } from "@/lib/nav";
import { logoutAction } from "@/app/actions/auth";

export async function Navbar() {
  const session = await getSession();

  const primary = session ? PRIMARY_NAV[session.role] ?? [] : [];
  const account = session ? ACCOUNT_NAV[session.role] ?? [] : [];
  const action = session ? PRIMARY_ACTION[session.role] : undefined;

  let unread = 0;
  if (session) {
    unread = await prisma.notification.count({
      where: { userId: session.uid, read: false },
    });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Logo href={session ? "/dashboard" : "/"} />

        {primary.length > 0 && <NavLinks links={primary} />}

        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <>
              {action && (
                <Link href={action.href} className="btn-primary btn-sm hidden sm:inline-flex">
                  {action.label}
                </Link>
              )}

              <Link
                href="/notifications"
                className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100"
                aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none stroke-current"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-forge-600 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>

              <AccountMenu name={session.name} links={account} logoutAction={logoutAction} />
              <MobileMenu
                primary={primary}
                account={account}
                action={action}
                logoutAction={logoutAction}
              />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary btn-sm">
                Log in
              </Link>
              <Link href="/register" className="btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
