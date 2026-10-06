"use client";

import { useFormState } from "react-dom";
import { saveCompanyProfile } from "@/app/actions/company";
import { Field, Select, StatesSelect, TextArea } from "@/components/Field";
import { ChipGroupWithOther, SelectWithOther } from "@/components/FieldWithOther";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import {
  CATEGORIES,
  ENTITY_TYPES,
  LISTED_INDUSTRIES,
  MANPOWER_BANDS,
  NATURE_OF_BUSINESS,
  STATES,
  isCatalogueIndustry,
} from "@/lib/constants";

type Defaults = {
  companyName?: string;
  natureOfBusiness?: string | null;
  industries?: string[];
  manpowerBand?: string | null;
  categoriesUsed?: string[];
  entityType?: string | null;
  website?: string | null;
  contactName?: string;
  contactDesignation?: string | null;
  contactMobile?: string;
  contactEmail?: string;
  city?: string;
  district?: string | null;
  state?: string;
  pincode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  cin?: string | null;
  about?: string | null;
};

/**
 * Company registration is deliberately short. The client was explicit that a
 * plant shouldn't have to hand over GST and PAN just to look around — those
 * only matter once invoices are raised — so the required fields are the ones
 * that make a company findable and its requirements meaningful.
 */
export function CompanyProfileForm({
  defaults,
  email,
}: {
  defaults: Defaults;
  email: string;
}) {
  const [state, action] = useFormState(saveCompanyProfile, null);
  const e = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="space-y-6">
      <FormErrorFocus state={state} />
      <Alert state={state} />

      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">About your company</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Company name"
            name="companyName"
            required
            error={e.companyName}
            defaultValue={defaults.companyName}
          />
          <Select
            label="Nature of business"
            name="natureOfBusiness"
            required
            options={NATURE_OF_BUSINESS}
            placeholder="Select"
            defaultValue={defaults.natureOfBusiness ?? ""}
            error={e.natureOfBusiness}
            hint="Are you into manufacturing or service?"
          />
          <SelectWithOther
            label="Entity type"
            name="entityType"
            options={ENTITY_TYPES}
            placeholder="Select"
            defaultValue={defaults.entityType ?? ""}
            error={e.entityType}
            maxLength={40}
            otherLabel="Other"
            otherPlaceholder="e.g. Society / Trust"
          />
          <Select
            label="Manpower strength"
            name="manpowerBand"
            options={MANPOWER_BANDS}
            placeholder="Select range"
            defaultValue={defaults.manpowerBand ?? ""}
            error={e.manpowerBand}
            hint="Total people on site, own plus contract."
          />
        </div>

        <ChipGroupWithOther
          label="Industry / sector"
          name="industries"
          required
          options={LISTED_INDUSTRIES}
          selected={defaults.industries ?? []}
          error={e.industries}
          hint="Contractors with experience in your sector will be matched first."
          scroll
          isKnown={isCatalogueIndustry}
          otherPlaceholder="Type your sector, e.g. Rubber Reclaim"
        />

        <Field
          label="Website"
          name="website"
          error={e.website}
          defaultValue={defaults.website ?? ""}
          placeholder="www.example.com"
        />
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">What contract manpower do you engage?</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Pick everything that applies — it pre-selects your posting form and shapes the
            contractors we surface to you.
          </p>
        </div>

        <fieldset>
          <legend className="sr-only">Contract categories engaged</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <label key={c.value} className="relative block cursor-pointer">
                <input
                  type="checkbox"
                  name="categoriesUsed"
                  value={c.value}
                  defaultChecked={(defaults.categoriesUsed ?? []).includes(c.value)}
                  className="peer sr-only"
                />
                <span className="block h-full rounded-xl border-2 border-slate-200 bg-white p-4 transition hover:border-slate-300 peer-checked:border-brand-600 peer-checked:bg-brand-50">
                  <span className="block font-semibold text-slate-900">{c.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                    {c.summary}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {e.categoriesUsed && <p className="field-error">{e.categoriesUsed}</p>}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="city" required error={e.city} defaultValue={defaults.city} />
          <StatesSelect
            label="State"
            name="state"
            required
            states={STATES}
            defaultValue={defaults.state ?? ""}
            error={e.state}
          />
          <Field
            label="District"
            name="district"
            error={e.district}
            defaultValue={defaults.district ?? ""}
          />
          <Field
            label="Pincode"
            name="pincode"
            error={e.pincode}
            defaultValue={defaults.pincode ?? ""}
            inputMode="numeric"
          />
        </div>
        <TextArea
          label="About the company"
          name="about"
          rows={3}
          defaultValue={defaults.about ?? ""}
          error={e.about}
          placeholder="What you make, plant size, shifts run, and anything a contractor should know before quoting."
        />
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Contact person</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            name="contactName"
            required
            error={e.contactName}
            defaultValue={defaults.contactName}
          />
          <Field
            label="Designation"
            name="contactDesignation"
            error={e.contactDesignation}
            defaultValue={defaults.contactDesignation ?? ""}
            placeholder="HR Manager / Plant Head"
          />
          <Field
            label="Mobile"
            name="contactMobile"
            required
            error={e.contactMobile}
            defaultValue={defaults.contactMobile}
            inputMode="numeric"
          />
          <Field
            label="Email"
            name="contactEmail"
            type="email"
            required
            error={e.contactEmail}
            defaultValue={defaults.contactEmail ?? email}
          />
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Statutory details</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            All optional. These are only needed when a contractor raises an invoice against you.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="GSTIN" name="gstin" error={e.gstin} defaultValue={defaults.gstin ?? ""} />
          <Field label="PAN" name="pan" error={e.pan} defaultValue={defaults.pan ?? ""} />
          <Field label="CIN" name="cin" error={e.cin} defaultValue={defaults.cin ?? ""} />
        </div>
      </section>

      <SubmitButton pendingText="Saving…">Save company profile</SubmitButton>
    </form>
  );
}
