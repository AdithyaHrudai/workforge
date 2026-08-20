"use client";

import { useFormState } from "react-dom";
import { adminChangePasswordAction } from "@/app/actions/admin-auth";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import { ADMIN_PASSWORD_MIN } from "@/lib/validation";

export function ChangeAdminPasswordForm() {
  const [state, action] = useFormState(adminChangePasswordAction, null);
  const errs = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="card space-y-4">
      <FormErrorFocus state={state} />
      <Alert state={state} />

      <Field
        label="Current password"
        name="currentPassword"
        type="password"
        required
        error={errs.currentPassword}
        autoComplete="current-password"
      />
      <Field
        label="New password"
        name="password"
        type="password"
        required
        error={errs.password}
        autoComplete="new-password"
        hint={`At least ${ADMIN_PASSWORD_MIN} characters, with upper case, lower case and a number.`}
      />
      <Field
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        required
        error={errs.confirmPassword}
        autoComplete="new-password"
      />

      <SubmitButton className="btn-primary w-full" pendingText="Saving…">
        Change password
      </SubmitButton>
    </form>
  );
}
