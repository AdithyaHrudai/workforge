"use client";

import { useFormState } from "react-dom";
import { saveCompanyProfile } from "@/app/actions/company";
import { Field, TextArea, Select, StatesSelect } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { ENTITY_TYPES, STATES } from "@/lib/constants";

type Defaults = {
  companyName?: string;
  entityType?: string | null;
  industry?: string | null;
  contactName?: string;
  contactMobile?: string;
  contactEmail?: string;
  city?: string;
  district?: string | null;
  state?: string;
  pincode?: string | null;
  gstin?: string | null;
  about?: string | null;
};

export function CompanyProfileForm({ defaults, email }: { defaults: Defaults; email: string }) {
  const [state, action] = useFormState(saveCompanyProfile, null);
  const e = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="space-y-6">
      <Alert state={state} />
      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Company details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" name="companyName" required error={e.companyName} defaultValue={defaults.companyName} />
          <Select label="Entity type" name="entityType" options={ENTITY_TYPES} placeholder="Select" defaultValue={defaults.entityType ?? ""} error={e.entityType} />
          <Field label="Industry" name="industry" error={e.industry} defaultValue={defaults.industry ?? ""} placeholder="EPC / Infrastructure / Manufacturing…" />
          <Field label="GSTIN" name="gstin" error={e.gstin} defaultValue={defaults.gstin ?? ""} />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Primary contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact name" name="contactName" required error={e.contactName} defaultValue={defaults.contactName} />
          <Field label="Contact mobile" name="contactMobile" required error={e.contactMobile} defaultValue={defaults.contactMobile} inputMode="numeric" />
          <Field label="Contact email" name="contactEmail" type="email" required error={e.contactEmail} defaultValue={defaults.contactEmail ?? email} />
        </div>
        <p className="text-xs text-slate-500">
          Contact details stay private until you accept a contractor&apos;s bid.
        </p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="city" required error={e.city} defaultValue={defaults.city} />
          <Field label="District" name="district" error={e.district} defaultValue={defaults.district ?? ""} />
          <StatesSelect label="State" name="state" required states={STATES} defaultValue={defaults.state ?? ""} error={e.state} />
          <Field label="Pincode" name="pincode" error={e.pincode} defaultValue={defaults.pincode ?? ""} inputMode="numeric" />
        </div>
        <TextArea label="About the company" name="about" rows={3} defaultValue={defaults.about ?? ""} error={e.about} />
      </div>

      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
