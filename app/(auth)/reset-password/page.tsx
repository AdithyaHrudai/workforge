import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/forms/AuthForms";
import { Notice } from "@/components/Badge";
import { TOKEN_PURPOSE, tokenIsLive } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * The link is checked before the form is drawn, so an expired one says so
 * immediately instead of after the user has typed a password twice. Checking is
 * not consuming — the token is only spent when the form is submitted.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";
  const live = await tokenIsLive(token, TOKEN_PURPOSE.RESET);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Choose a new password</h1>

      {live ? (
        <>
          <p className="mb-6 text-sm text-slate-500">
            Setting a new password signs you out everywhere else.
          </p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <div className="mt-6 space-y-4">
          <Notice tone="warning">
            This reset link has expired or has already been used. Links last an hour and work once.
          </Notice>
          <Link href="/forgot-password" className="btn-primary inline-flex">
            Send me a new link
          </Link>
        </div>
      )}
    </div>
  );
}
