import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/AuthForms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Reset your password</h1>
      <p className="mb-6 text-sm text-slate-500">
        Give us the address you signed up with and we will send a link to set a new password.
      </p>

      <ForgotPasswordForm />

      <p className="mt-4 text-center text-sm text-slate-500">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
