import Link from "next/link";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";
import { ADMIN_NAV, ADMIN_NAV_SECONDARY, visibleAdminLinks } from "@/lib/admin-nav";
import type { AdminIdentity } from "@/lib/admin-auth";

/**
 * Chrome for the admin console.
 *
 * Visually distinct from the marketplace on purpose — dark header, no brand
 * colour, the signed-in admin's staff code always on screen. Somebody working
 * two tabs should never be in doubt about which one has other people's ID
 * documents in it.
 */
export function AdminShell({
  admin,
  pendingCounts,
  children,
}: {
  admin: AdminIdentity;
  pendingCounts: Record<string, number>;
  children: React.ReactNode;
}) {
  const isSuper = admin.role === "SUPER_ADMIN";
  const primary = visibleAdminLinks(ADMIN_NAV, isSuper);
  const secondary = visibleAdminLinks(ADMIN_NAV_SECONDARY, isSuper);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-xs font-black">
              WF
            </span>
            <span>
              Verification console
              <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                Admin
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right text-xs leading-tight sm:block">
              <p className="font-semibold">{admin.name}</p>
              <p className="text-slate-400">
                {admin.adminCode} · {isSuper ? "Super admin" : "Verifier"}
              </p>
            </div>
            <form action={adminLogoutAction}>
              <button
                type="submit"
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        <nav aria-label="Admin sections" className="w-full shrink-0 lg:w-64">
          <div className="space-y-4 lg:sticky lg:top-20">
            <AdminNavLinks links={primary} counts={pendingCounts} />
            <div className="border-t border-slate-200 pt-4">
              <AdminNavLinks links={secondary} />
            </div>

            <p className="rounded-lg bg-slate-200/60 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
              Opening a profile or a document is recorded against your name in
              the audit log. Verify what you are asked to verify and nothing
              else.
            </p>
          </div>
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-slate-500">
          Signed in as {admin.username} ({admin.adminCode}). Sessions end after 8
          hours, or 30 minutes idle.
        </div>
      </footer>
    </div>
  );
}
