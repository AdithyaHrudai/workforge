"use client";

import { useFormState } from "react-dom";
import {
  changePassword,
  confirmEmail,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  updateAccount,
} from "@/app/actions/auth";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";

/**
 * The account-lifecycle forms: reset, confirm, change password, edit details.
 *
 * They live in one file because they are the same twenty lines four times over
 * — a form, a state hook, an Alert and two fields — and splitting them into
 * four modules would only spread that shape thinner.
 */

const PASSWORD_HINT = "At least 8 characters, with a letter and a number";

export function ForgotPasswordForm() {
  const [state, action] = useFormState(requestPasswordReset, null);
  const errs = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="card space-y-4">
      <FormErrorFocus state={state} />
      <Alert state={state} />
      <Field
        label="Email"
        name="email"
        type="email"
        required
        error={errs.email}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <SubmitButton className="btn-primary w-full" pendingText="Sending…">
        Email me a reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useFormState(resetPassword, null);
  const errs = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="card space-y-4">
      <FormErrorFocus state={state} />
      <Alert state={state} />
      <input type="hidden" name="token" value={token} />
      <Field
        label="New password"
        name="password"
        type="password"
        required
        error={errs.password}
        hint={PASSWORD_HINT}
        autoComplete="new-password"
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        required
        error={errs.confirm}
        autoComplete="new-password"
      />
      <SubmitButton className="btn-primary w-full" pendingText="Saving…">
        Set my new password
      </SubmitButton>
    </form>
  );
}

export function ConfirmEmailForm({ token }: { token: string }) {
  const [state, action] = useFormState(confirmEmail, null);

  return (
    <form action={action} className="card space-y-4">
      <Alert state={state} />
      <input type="hidden" name="token" value={token} />
      {/* A success never renders here — the action redirects on the way out. */}
      <SubmitButton className="btn-primary w-full" pendingText="Confirming…">
        Confirm my email address
      </SubmitButton>
    </form>
  );
}

export function ResendVerificationForm({ compact = false }: { compact?: boolean }) {
  const [state, action] = useFormState(resendVerification, null);

  return (
    <form action={action} className={compact ? "" : "space-y-3"}>
      {!compact && <Alert state={state} />}
      <SubmitButton
        className={compact ? "btn-secondary btn-sm" : "btn-secondary"}
        pendingText="Sending…"
      >
        {state && state.ok ? "Sent — check your inbox" : "Resend confirmation email"}
      </SubmitButton>
    </form>
  );
}

export function AccountDetailsForm({
  name,
  mobile,
}: {
  name: string;
  mobile: string | null;
}) {
  const [state, action] = useFormState(updateAccount, null);
  const errs = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="space-y-4">
      <FormErrorFocus state={state} />
      <Alert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" required error={errs.name} defaultValue={name} />
        <Field
          label="Mobile"
          name="mobile"
          required
          error={errs.mobile}
          defaultValue={mobile ?? ""}
          inputMode="numeric"
          placeholder="10-digit mobile"
        />
      </div>
      <SubmitButton pendingText="Saving…">Save details</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useFormState(changePassword, null);
  const errs = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="space-y-4">
      <FormErrorFocus state={state} />
      <Alert state={state} />
      {hasPassword && (
        <Field
          label="Current password"
          name="current"
          type="password"
          required
          error={errs.current}
          autoComplete="current-password"
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={hasPassword ? "New password" : "Password"}
          name="password"
          type="password"
          required
          error={errs.password}
          hint={PASSWORD_HINT}
          autoComplete="new-password"
        />
        <Field
          label="Confirm password"
          name="confirm"
          type="password"
          required
          error={errs.confirm}
          autoComplete="new-password"
        />
      </div>
      <SubmitButton pendingText="Saving…">
        {hasPassword ? "Change password" : "Set a password"}
      </SubmitButton>
    </form>
  );
}
