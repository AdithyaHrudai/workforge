"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { registerAction } from "@/app/actions/auth";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { GoogleButton } from "@/components/GoogleButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import { RoleTiles, type Role } from "@/components/RoleTiles";

/**
 * Registration.
 *
 * `googleEnabled` is threaded in from the page rather than read here: whether
 * credentials are configured is a server fact, and this component is client-side
 * so it cannot see the environment. Passing it down keeps one source of truth
 * and avoids rendering a button that would only fail.
 */
export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action] = useFormState(registerAction, null);
  const [role, setRole] = useState<Role>("COMPANY");
  const errs = (state && !state.ok && state.fieldErrors) || {};

  return (
    <div className="space-y-4">
      <RoleTiles value={role} onChange={setRole} label="I am a…" />

      <form action={action} className="card space-y-4">
        <FormErrorFocus state={state} />
        <Alert state={state} />

        {/* The tiles sit outside the form, so the choice travels in a hidden field. */}
        <input type="hidden" name="role" value={role} />

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
          Create account as {role === "COMPANY" ? "a company" : "a contractor"}
        </SubmitButton>

        {/* Consent is recorded at the moment of collection, in sight of the
            button that submits the data — not buried in a footer link. */}
        <p className="text-center text-xs leading-relaxed text-slate-500">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="font-medium text-brand-700 hover:underline">
            terms of use
          </Link>{" "}
          and to the processing of your details as described in our{" "}
          <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
            privacy policy
          </Link>
          .
        </p>

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            {/* Returns an existing account if there is one; otherwise creates it
                as the role selected above. */}
            <GoogleButton role={role} label="Sign up with Google" />
          </>
        )}
      </form>
    </div>
  );
}
