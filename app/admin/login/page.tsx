import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The admin console sign-in.
 *
 * Note what is *not* here: no link to register, no "forgot password", no hint
 * about who the administrators are. Admin accounts are issued by another
 * administrator and recovered by one — there is no self-service path into this
 * console by design, so there is no self-service path to attack.
 */
export default async function AdminLoginPage() {
  // Already signed in: send them on rather than presenting a form that would
  // only mint a second session for the same person.
  const admin = await getAdminIdentity();
  if (admin) redirect(admin.mustChangePassword ? "/admin/account/password" : "/admin");

  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-sm font-black text-white">
              WF
            </span>
            <h1 className="mt-4 text-xl font-bold text-white">Verification console</h1>
            <p className="mt-1 text-sm text-slate-400">
              Restricted to WorkForge verification staff.
            </p>
          </div>

          <AdminLoginForm />

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            Accounts are issued by a super admin. There is no self-service
            sign-up or password reset — if you are locked out, ask another
            administrator.
          </p>
          <p className="mt-3 text-center text-xs text-slate-600">
            Sign-in attempts are logged, successful or not.
          </p>
        </div>
      </div>
    </div>
  );
}
