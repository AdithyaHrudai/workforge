"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { saveContractorProfile } from "@/app/actions/contractor";
import {
  ChipGroup,
  CheckboxField,
  Field,
  NumberField,
  Select,
  StatesChipGroup,
  StatesSelect,
  TextArea,
} from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import { RegistrationField } from "@/components/RegistrationField";
import {
  CATEGORIES,
  CATEGORY,
  ENTITY_TYPES,
  INDUSTRIES,
  JOB_CONTRACT_SCOPES,
  STATES,
  rolesFor,
} from "@/lib/constants";

/**
 * The chip list excludes the catalogue's own "Other" entry — here it is a
 * checkbox that reveals a text box, so selecting it would submit the literal
 * code "other" alongside whatever was typed.
 */
const LISTED_INDUSTRIES = INDUSTRIES.filter((i) => i.value !== "other");
const LISTED_INDUSTRY_VALUES = new Set(LISTED_INDUSTRIES.map((i) => i.value));

type Defaults = {
  firmName?: string;
  entityType?: string | null;
  ownerName?: string;
  ownerDesignation?: string | null;
  yearEstablished?: number | null;
  website?: string | null;
  address?: string | null;
  city?: string;
  district?: string | null;
  state?: string;
  pincode?: string | null;
  presenceStates?: string[];
  workerSourceStates?: string[];
  categories?: string[];
  industries?: string[];
  roles?: string[];
  willingOutstation?: boolean;
  pan?: string | null;
  gstin?: string | null;
  udyamNo?: string | null;
  labourLicenceNo?: string | null;
  esicNo?: string | null;
  epfNo?: string | null;
  totalWorkforce?: number;
  availableNow?: number;
  mobilizationDays?: number;
  about?: string | null;
  capacities?: { category: string; strength: number }[];
};

export function ContractorProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, action] = useFormState(saveContractorProfile, null);
  const e = (state && !state.ok && state.fieldErrors) || {};

  const [categories, setCategories] = useState<string[]>(defaults.categories ?? []);

  // Anything saved that isn't a catalogue code was typed into the "Other" box,
  // so the box reopens with it rather than appearing to have dropped the value.
  const otherIndustryDefault = useMemo(
    () => (defaults.industries ?? []).find((i) => !LISTED_INDUSTRY_VALUES.has(i)) ?? "",
    [defaults.industries],
  );
  const [showOtherIndustry, setShowOtherIndustry] = useState(Boolean(otherIndustryDefault));

  const capacityByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of defaults.capacities ?? []) map.set(c.category, c.strength);
    return map;
  }, [defaults.capacities]);

  // The role catalogue is the union of whatever the firm says it takes on, so a
  // firm doing both blue-collar staffing and job contracts sees both lists and
  // nothing it couldn't actually supply.
  const roleOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    for (const category of categories) {
      const source =
        category === CATEGORY.JOB_CONTRACT ? JOB_CONTRACT_SCOPES : rolesFor(category);
      for (const option of source) {
        if (!seen.has(option.value)) {
          seen.add(option.value);
          out.push(option);
        }
      }
    }
    return out;
  }, [categories]);

  function toggleCategory(value: string, checked: boolean) {
    setCategories((prev) => (checked ? [...prev, value] : prev.filter((c) => c !== value)));
  }

  return (
    <form action={action} className="space-y-6">
      <FormErrorFocus state={state} />
      <Alert state={state} />

      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Firm details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Firm name"
            name="firmName"
            required
            error={e.firmName}
            defaultValue={defaults.firmName}
          />
          <Select
            label="Entity type"
            name="entityType"
            options={ENTITY_TYPES}
            placeholder="Select"
            defaultValue={defaults.entityType ?? ""}
            error={e.entityType}
          />
          <Field
            label="Owner / proprietor"
            name="ownerName"
            required
            error={e.ownerName}
            defaultValue={defaults.ownerName}
          />
          <Field
            label="Designation"
            name="ownerDesignation"
            error={e.ownerDesignation}
            defaultValue={defaults.ownerDesignation ?? ""}
            placeholder="Proprietor / Director"
          />
          <NumberField
            label="Year established"
            name="yearEstablished"
            min={1900}
            defaultValue={defaults.yearEstablished ?? ""}
            error={e.yearEstablished}
          />
          <Field
            label="Website"
            name="website"
            error={e.website}
            defaultValue={defaults.website ?? ""}
            placeholder="www.example.com"
          />
        </div>
        <TextArea
          label="About your firm"
          name="about"
          rows={4}
          defaultValue={defaults.about ?? ""}
          error={e.about}
          placeholder="What you specialise in, the kind of plants you work in, your supervision structure and compliance practices."
        />
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Registered address</h2>
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
          label="Address"
          name="address"
          rows={2}
          defaultValue={defaults.address ?? ""}
          error={e.address}
        />
      </section>

      {/* --- What they take on, and at what strength ------------------------- */}
      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">What contracts do you take on?</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Tick each one and tell us how many people you currently have deployed in it.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="sr-only">Contract categories offered</legend>
          {CATEGORIES.map((c) => {
            const checked = categories.includes(c.value);
            return (
              <div
                key={c.value}
                className={`rounded-xl border-2 p-4 transition ${
                  checked ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white"
                }`}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name="categories"
                    value={c.value}
                    checked={checked}
                    onChange={(ev) => toggleCategory(c.value, ev.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                  />
                  <span className="flex-1">
                    <span className="block font-semibold text-slate-900">{c.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      {c.summary}
                    </span>
                  </span>
                </label>

                {checked && (
                  <div className="mt-3 max-w-xs pl-7">
                    <label className="label" htmlFor={`capacity:${c.value}`}>
                      Manpower currently deployed in this category
                    </label>
                    <input
                      id={`capacity:${c.value}`}
                      name={`capacity:${c.value}`}
                      type="number"
                      min={0}
                      defaultValue={capacityByCategory.get(c.value) ?? ""}
                      className="input"
                      placeholder="e.g. 450"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </fieldset>
        {e.categories && <p className="field-error">{e.categories}</p>}

        <div>
          <ChipGroup
            label="Industries you have worked in"
            name="industries"
            required
            options={LISTED_INDUSTRIES}
            selected={defaults.industries ?? []}
            error={e.industries}
            hint="Companies filter by sector experience — a tyre plant looks for firms who have run tyre plants."
            scroll
          />

          {/* The catalogue cannot name every sector. The typed value is
              submitted under the same `industries` key, so it lands in the
              array beside the coded ones and needs no special handling on the
              server — `industryLabel` falls back to the raw string. */}
          <label className="mt-3 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={showOtherIndustry}
              onChange={(ev) => setShowOtherIndustry(ev.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-slate-700">
              Other — not in the list above
            </span>
          </label>

          {showOtherIndustry && (
            <div className="mt-2">
              <label className="sr-only" htmlFor="otherIndustry">
                Other industry
              </label>
              <input
                id="otherIndustry"
                name="industries"
                className="input"
                placeholder="Type the industry, e.g. Rubber Reclaim"
                defaultValue={otherIndustryDefault}
              />
            </div>
          )}
        </div>

        {roleOptions.length > 0 && (
          <ChipGroup
            label="Roles & scopes you can supply"
            name="roles"
            options={roleOptions}
            selected={defaults.roles ?? []}
            error={e.roles}
            hint="Drawn from the contract types you selected above. This is what puts you at the top of a matching requirement."
            scroll
          />
        )}
      </section>

      {/* --- Capacity -------------------------------------------------------- */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Capacity</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Total workforce"
            name="totalWorkforce"
            required
            min={0}
            defaultValue={defaults.totalWorkforce ?? 0}
            error={e.totalWorkforce}
          />
          <NumberField
            label="Ready to deploy manpower strength"
            name="availableNow"
            required
            min={0}
            defaultValue={defaults.availableNow ?? 0}
            error={e.availableNow}
            hint="People you could put on site this month."
          />
          <NumberField
            label="Mobilisation time"
            name="mobilizationDays"
            required
            min={0}
            max={365}
            suffix="days"
            defaultValue={defaults.mobilizationDays ?? 7}
            error={e.mobilizationDays}
          />
        </div>
      </section>

      {/* --- Where they operate ---------------------------------------------- */}
      <section className="card space-y-5">
        <div>
          <h2 className="font-semibold text-slate-900">Where do you operate?</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Regional presence is the single biggest factor companies weigh — a plant in
            Chhattisgarh wants a firm with people on the ground there.
          </p>
        </div>

        <StatesChipGroup
          label="States you operate in"
          name="presenceStates"
          required
          states={STATES}
          selected={defaults.presenceStates ?? []}
          error={e.presenceStates}
        />

        <StatesChipGroup
          label="States your workers come from"
          name="workerSourceStates"
          states={STATES}
          selected={defaults.workerSourceStates ?? []}
          error={e.workerSourceStates}
        />

        <CheckboxField
          label="Willing to mobilise outstation"
          name="willingOutstation"
          hint="You will travel outside your usual footprint for the right contract."
          defaultChecked={defaults.willingOutstation}
        />
      </section>


      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Statutory registrations</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Answer only what applies to you. Companies weigh compliance heavily — upload the
            certificates on the Documents page to earn a verified badge.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <RegistrationField
            required
            question=""
            label="PAN"
            name="pan"
            defaultValue={defaults.pan ?? ""}
            placeholder="ABCDE1234F"
            hint="Required. Every firm raising an invoice has one."
            error={e.pan}
          />
          <RegistrationField
            question="Are you registered under GST?"
            label="GSTIN"
            name="gstin"
            defaultValue={defaults.gstin ?? ""}
            placeholder="27ABCDE1234F1Z5"
            error={e.gstin}
          />
          <RegistrationField
            question="Are you registered under Udyam (MSME)?"
            label="Udyam registration number"
            name="udyamNo"
            defaultValue={defaults.udyamNo ?? ""}
            placeholder="UDYAM-MH-26-0012345"
            error={e.udyamNo}
          />
          <RegistrationField
            question="Do you hold a CLRA labour licence?"
            label="Labour Licence (CLRA) number"
            name="labourLicenceNo"
            defaultValue={defaults.labourLicenceNo ?? ""}
            error={e.labourLicenceNo}
          />
          <RegistrationField
            question="Are you registered with EPFO?"
            label="EPF establishment code"
            name="epfNo"
            defaultValue={defaults.epfNo ?? ""}
            error={e.epfNo}
          />
          <RegistrationField
            question="Are you registered with ESIC?"
            label="ESIC code"
            name="esicNo"
            defaultValue={defaults.esicNo ?? ""}
            error={e.esicNo}
          />
        </div>
      </section>

      <SubmitButton pendingText="Saving…">Save firm profile</SubmitButton>
    </form>
  );
}
