"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { resetAdminPasswordAction } from "@/app/actions/admin-team";
import { Field, Select } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import { ADMIN_PASSWORD_MIN } from "@/lib/validation";
import { EmptyState } from "@/components/ui";

/**
 * Sets a new password for another administrator — the recovery path for this
 * console, since there is no self-service reset.
 *
 * It ends every session the account holds and forces a change at next sign-in,
 * both for the same reason: from the moment this form is submitted, two people
 * know the password.
 */
export function ResetAdminPasswordForm({
  admins,
}: {
  admins: { id: string; label: string }[];
}) {
  const [state, action] = useFormState(resetAdminPasswordAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const errs = (state && !state.ok && state.fieldErrors) || {};

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  if (admins.length === 0) {
    return (
      <EmptyState
        title="No other administrators yet"
        description="Once you have added someone, you can reset their password here if they are locked out."
      />
    );
  }

  return (
    <form ref={formRef} action={action} className="card space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900">Reset someone&apos;s password</h2>
        <p className="mt-1 text-sm text-slate-500">
          For an administrator who is locked out. Their live sessions end
          immediately and they must choose a new password when they next sign in.
        </p>
      </div>

      <FormErrorFocus state={state} />
      <Alert state={state} />

      <Select
        label="Administrator"
        name="adminId"
        required
        error={errs.adminId}
        options={admins.map((a) => ({ value: a.id, label: a.label }))}
        placeholder="Select an administrator"
      />

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <SubmitButton className="btn-danger" pendingText="Resetting…">
        Reset password
      </SubmitButton>
    </form>
  );
}
