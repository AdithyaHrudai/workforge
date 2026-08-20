import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/forms/LoginForm";
import { Notice } from "@/components/Badge";
import { googleEnabled } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Log in" };

/** Errors handed back by the Google callback, which cannot render a form state. */
const OAUTH_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't configured yet. Use your email and password.",
  cancelled: "Google sign-in was cancelled.",
  invalid_state: "That sign-in link expired. Please try again.",
  no_code: "Google didn't complete the sign-in. Please try again.",
  google_failed: "We couldn't reach Google. Please try again.",
  email_unverified: "Your Google email isn't verified, so we can't create an account with it.",
  suspended: "This account has been suspended. Contact support.",
  not_allowed: "This account can't sign in here.",
  rate_limited: "Too many attempts. Please wait a few minutes.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { role?: string; error?: string; next?: string; reset?: string };
}) {
  const role = searchParams.role === "CONTRACTOR" ? "CONTRACTOR" : "COMPANY";
  const oauthError = searchParams.error ? OAUTH_ERRORS[searchParams.error] : undefined;
  // Only a same-site path is ever carried forward — see safeNext in the action.
  const next =
    searchParams.next?.startsWith("/") && !searchParams.next.startsWith("//")
      ? searchParams.next
      : undefined;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mb-6 text-sm text-slate-500">Log in to your WorkForge account.</p>

      {searchParams.reset === "1" && (
        <div className="mb-4">
          <Notice tone="success">
            Your password has been changed. Sign in with your new one.
          </Notice>
        </div>
      )}

      <LoginForm
        role={role}
        googleEnabled={googleEnabled()}
        oauthError={oauthError}
        next={next}
      />

      <p className="mt-4 text-center text-sm text-slate-500">
        New to WorkForge?{" "}
        <Link href="/register" className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
