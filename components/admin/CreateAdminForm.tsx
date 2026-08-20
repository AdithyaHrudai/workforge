"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { createAdminAction } from "@/app/actions/admin-team";
import { Field, Select } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import { ADMIN_PASSWORD_MIN } from "@/lib/validation";

const ROLE_OPTIONS = [
  { value: "VERIFIER", label: "Verifier — review and decide on submissions" },
  { value: "SUPER_ADMIN", label: "Super admin — that, plus manage this team" },
];

/**
 * Issues an admin account.
 *
 * The password is typed here by the person creating the account and shown to
 * them once, on screen, as they type it — it is hashed on arrival and there is
 * no path in the application that can ever display it again. That is why the
 * "must change at first sign-in" box is ticked by default: until the new admin
 * changes it, two people know their credential.
 */
export function CreateAdminForm({ suggestedCode }: { suggestedCode: string }) {
  const [state, action] = useFormState(createAdminAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const errs = (state && !state.ok && state.fieldErrors) || {};

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900">Add an administrator</h2>
        <p className="mt-1 text-sm text-slate-500">
          Assign them a staff ID, a username and a password. Hand the password
          over in person or through a channel you trust — it cannot be shown
          again.
        </p>
      </div>

      <FormErrorFocus state={state} />
      <Alert state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Admin ID"
          name="adminCode"
          required
          error={errs.adminCode}
          defaultValue={suggestedCode}
          hint="Their staff identifier. Appears against every action they take."
          autoCapitalize="characters"
          spellCheck={false}
        />
        <Field
          label="Username"
          name="username"
          required
          error={errs.username}
          hint="What they type to sign in. Lowercase, no spaces."
          autoCapitalize="none"
          spellCheck={false}
        />
        <Field label="Full name" name="name" required error={errs.name} />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          error={errs.email}
          hint="For contacting them. Also accepted at sign-in."
        />
      </div>

      <Select
        label="Access level"
        name="role"
        required
        error={errs.role}
        options={ROLE_OPTIONS}
        defaultValue="VERIFIER"
        hint="Only a super admin can add, revoke or remove administrators."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Password"
          name="password"
          type="password"
          required
          error={errs.password}
          autoComplete="new-password"
          hint={`At least ${ADMIN_PASSWORD_MIN} characters, with upper case, lower case and a number.`}
        />
        <Field
          label="Confirm password"
          name="confirmPassword"
          type="password"
          required
          error={errs.confirmPassword}
          autoComplete="new-password"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          name="mustChangePassword"
          defaultChecked
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
        />
        <span>
          <span className="text-sm font-medium text-slate-700">
            Require them to change this password when they first sign in
          </span>
          <span className="block text-xs text-slate-500">
            Recommended. Until they do, you know their password as well as they
            do, and nothing they approve can be attributed to them alone.
          </span>
        </span>
      </label>

      <SubmitButton pendingText="Creating…">Create administrator</SubmitButton>
    </form>
  );
}
