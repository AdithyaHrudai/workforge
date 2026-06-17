"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, null);
  const errs = (state && !state.ok && state.fieldErrors) || {};

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mb-6 text-sm text-slate-500">Log in to your ShramSetu account.</p>

      <form action={action} className="card space-y-4">
        <Alert state={state} />
        <Field label="Email" name="email" type="email" required error={errs.email} placeholder="you@example.com" />
        <Field label="Password" name="password" type="password" required error={errs.password} />
        <SubmitButton className="btn-primary w-full" pendingText="Logging in…">
          Log in
        </SubmitButton>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        New to ShramSetu?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-6 rounded-lg bg-slate-100 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-600">Demo logins</p>
        <p>Company — company@demo.in / Demo@12345</p>
        <p>Contractor — contractor@demo.in / Demo@12345</p>
        <p>Admin — admin@shramsetu.in / Admin@12345</p>
      </div>
    </div>
  );
}
