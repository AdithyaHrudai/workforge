import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { googleEnabled } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mb-6 text-sm text-slate-500">Join WorkForge in under a minute.</p>

      <RegisterForm googleEnabled={googleEnabled()} />

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
