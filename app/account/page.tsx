import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logoutAction, signOutEverywhere } from "@/app/actions/auth";
import {
  AccountDetailsForm,
  ChangePasswordForm,
  ResendVerificationForm,
} from "@/components/forms/AuthForms";
import { Notice } from "@/components/Badge";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Account settings" };

/**
 * The sign-in half of a user's account, kept apart from the company or firm
 * profile on purpose: this page is about the person and their credentials,
 * the profile pages are about the business other people search for.
 */
export default async function AccountPage() {
  const user = await requireUser();
  const profileHref = user.role === "COMPANY" ? "/company/profile" : "/contractor/profile";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Account settings"
        subtitle="Your sign-in details. Your public business profile lives separately."
        action={
          <Link href={profileHref} className="btn-secondary btn-sm">
            {user.role === "COMPANY" ? "Company profile" : "Firm profile"}
          </Link>
        }
      />

      {!user.emailVerified && (
        <Notice tone="warning">
          <span className="block font-medium">Your email address is not confirmed.</span>
          Confirming it is how the firms you deal with know the address reaches you — and it is
          the address a password reset would be sent to.
        </Notice>
      )}

      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Your details</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Signed in as <span className="font-medium text-slate-700">{user.email}</span>
            {user.emailVerified ? " · confirmed" : " · not confirmed"}. Email addresses cannot be
            changed here yet — contact support if you need one moved.
          </p>
        </div>

        <AccountDetailsForm name={user.name} mobile={user.mobile} />

        {!user.emailVerified && (
          <div className="border-t border-slate-100 pt-4">
            <ResendVerificationForm />
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">
            {user.passwordHash ? "Password" : "Set a password"}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {user.passwordHash
              ? "Changing your password signs out every other device."
              : "You sign in with Google. Setting a password lets you sign in with your email as well."}
          </p>
        </div>
        <ChangePasswordForm hasPassword={Boolean(user.passwordHash)} />
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Sessions</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Signing out everywhere revokes every device you are signed in on, including this one.
            Use it if you have lost a phone or shared a machine.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <form action={logoutAction}>
            <button className="btn-secondary">Log out of this device</button>
          </form>
          <form action={signOutEverywhere}>
            <button className="btn-danger">Sign out everywhere</button>
          </form>
        </div>
      </section>
    </div>
  );
}
