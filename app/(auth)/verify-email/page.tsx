import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmEmailForm } from "@/components/forms/AuthForms";
import { Notice } from "@/components/Badge";
import { TOKEN_PURPOSE, tokenIsLive } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string; done?: string };
}) {
  const token = searchParams.token ?? "";
  const done = searchParams.done === "1";
  const live = !done && (await tokenIsLive(token, TOKEN_PURPOSE.VERIFY));

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Confirm your email</h1>

      {done ? (
        <div className="mt-6 space-y-4">
          <Notice tone="success">Your email address is confirmed. Thank you.</Notice>
          <Link href="/dashboard" className="btn-primary inline-flex">
            Go to your dashboard
          </Link>
        </div>
      ) : live ? (
        <>
          <p className="mb-6 text-sm text-slate-500">
            One click and we will mark this address as confirmed.
          </p>
          <ConfirmEmailForm token={token} />
          <p className="mt-4 text-center text-sm text-slate-500">
            <Link href="/dashboard" className="font-medium text-brand-700 hover:underline">
              Go to your dashboard
            </Link>
          </p>
        </>
      ) : (
        <div className="mt-6 space-y-4">
          <Notice tone="warning">
            This confirmation link has expired or has already been used.
          </Notice>
          <p className="text-sm text-slate-500">
            Sign in and use <span className="font-medium">Account settings</span> to send a fresh one.
          </p>
          <Link href="/account" className="btn-primary inline-flex">
            Go to account settings
          </Link>
        </div>
      )}
    </div>
  );
}
