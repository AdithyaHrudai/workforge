"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";

export default function RegisterPage() {
  const [state, action] = useFormState(registerAction, null);
  const [role, setRole] = useState<"COMPANY" | "CONTRACTOR">("COMPANY");
  const errs = (state && !state.ok && state.fieldErrors) || {};

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mb-6 text-sm text-slate-500">Join ShramSetu in under a minute.</p>

      <form action={action} className="card space-y-4">
        <Alert state={state} />

        <div>
          <span className="label">I am a…</span>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { v: "COMPANY", t: "Company", d: "I need manpower for my site" },
                { v: "CONTRACTOR", t: "Contractor", d: "I supply labour / manpower" },
              ] as const
            ).map((o) => (
              <label
                key={o.v}
                className={`cursor-pointer rounded-lg border p-3 text-sm ${
                  role === o.v
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                    : "border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={o.v}
                  checked={role === o.v}
                  onChange={() => setRole(o.v)}
                  className="sr-only"
                />
                <span className="block font-semibold text-slate-900">{o.t}</span>
                <span className="block text-xs text-slate-500">{o.d}</span>
              </label>
            ))}
          </div>
        </div>

        <Field label="Full name" name="name" required error={errs.name} placeholder="Your name" />
        <Field label="Email" name="email" type="email" required error={errs.email} placeholder="you@example.com" />
        <Field
          label="Mobile"
          name="mobile"
          required
          error={errs.mobile}
          placeholder="10-digit mobile"
          inputMode="numeric"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          error={errs.password}
          hint="At least 8 characters"
        />

        <SubmitButton className="btn-primary w-full" pendingText="Creating account…">
          Create account
        </SubmitButton>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
