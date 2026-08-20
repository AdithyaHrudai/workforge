"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { loginAction } from "@/app/actions/auth";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Notice } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import { GoogleButton } from "@/components/GoogleButton";
import { RoleTiles, type Role } from "@/components/RoleTiles";

export function LoginForm({
  role: initialRole,
  googleEnabled,
  oauthError,
  next,
}: {
  role: Role;
  googleEnabled: boolean;
  oauthError?: string;
  /** Where the middleware wanted to send them before the sign-in gate. */
  next?: string;
}) {
  const [state, action] = useFormState(loginAction, null);
  const [role, setRole] = useState<Role>(initialRole);
  const errs = (state && !state.ok && state.fieldErrors) || {};

  return (
    <div className="space-y-4">
      {oauthError && <Notice tone="warning">{oauthError}</Notice>}

      <RoleTiles value={role} onChange={setRole} />

      <form action={action} className="card space-y-4">
        <FormErrorFocus state={state} />
        <Alert state={state} />

        {next && <input type="hidden" name="next" value={next} />}

        <Field
          label="Email"
          name="email"
          type="email"
          required
          error={errs.email}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          error={errs.password}
          autoComplete="current-password"
        />
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        {/* Not "Log in as a company": the account's own role decides where the
            session lands, so promising otherwise would be a lie for anyone who
            picked the other tile. The tiles drive Google sign-up below. */}
        <SubmitButton className="btn-primary w-full" pendingText="Logging in…">
          Log in
        </SubmitButton>

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <GoogleButton role={role} />
            <p className="text-center text-xs text-slate-400">
              New here? Signing in with Google creates a{" "}
              {role === "COMPANY" ? "company" : "contractor"} account.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
