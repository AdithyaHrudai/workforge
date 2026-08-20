"use client";

import { useFormState } from "react-dom";
import { adminLoginAction } from "@/app/actions/admin-auth";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * Styled for the dark sign-in page rather than reusing `Field` and `Alert`,
 * which are built for the light marketplace forms. The field errors are only
 * ever "this is required" — the action never reveals which half of a credential
 * was wrong.
 */
export function AdminLoginForm() {
  const [state, action] = useFormState(adminLoginAction, null);
  const error = state && !state.ok ? state.error : null;

  return (
    <form action={action} className="space-y-4 rounded-xl bg-white p-6 shadow-lg">
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200"
        >
          {error}
        </div>
      )}

      <div>
        <label className="label" htmlFor="identifier">
          Username or email
        </label>
        <input
          id="identifier"
          name="identifier"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="input"
          placeholder="your.username"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
        />
      </div>

      <SubmitButton className="btn-primary w-full" pendingText="Checking…">
        Sign in
      </SubmitButton>
    </form>
  );
}
