"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { createRequirement } from "@/app/actions/requirements";
import { Field, NumberField, Select, StatesSelect, TextArea, CheckboxField } from "@/components/Field";
import { SelectWithOther } from "@/components/FieldWithOther";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import {
  CATEGORIES,
  CATEGORY,
  CONTRACT_DURATIONS,
  EXPERIENCE_BANDS,
  LISTED_INDUSTRIES,
  LISTED_JOB_CONTRACT_SCOPES,
  OUTPUT_UNITS,
  QUALIFICATIONS,
  SHIFTS,
  STATES,
  URGENCY,
  isHeadcountCategory,
  rateBasisFor,
  rolesFor,
} from "@/lib/constants";

/** Sentinel for the role select's "Other" row — never submitted. */
const OTHER_ROLE = "__other__";

type RoleRow = {
  role: string;
  /** True once "Other" is chosen, so an empty typed role stays in that mode. */
  custom: boolean;
  headcount: string;
  experienceBand: string;
  qualification: string;
  indicativeWage: string;
  notes: string;
};

const emptyRow = (): RoleRow => ({
  role: "",
  custom: false,
  headcount: "",
  experienceBand: "",
  qualification: "",
  indicativeWage: "",
  notes: "",
});

const CATEGORY_TILE_STYLES: Record<string, string> = {
  WHITE_COLLAR_STAFFING: "peer-checked:border-indigo-500 peer-checked:bg-indigo-50",
  BLUE_COLLAR_STAFFING: "peer-checked:border-sky-500 peer-checked:bg-sky-50",
  JOB_CONTRACT: "peer-checked:border-forge-500 peer-checked:bg-forge-50",
  UNSKILLED_SUPPLY: "peer-checked:border-emerald-500 peer-checked:bg-emerald-50",
};

export function RequirementForm({
  defaultCategory,
  companyIndustries = [],
}: {
  defaultCategory?: string;
  companyIndustries?: string[];
}) {
  const [state, action] = useFormState(createRequirement, null);
  const [category, setCategory] = useState(defaultCategory ?? CATEGORY.BLUE_COLLAR);
  const [rows, setRows] = useState<RoleRow[]>([emptyRow()]);

  const e = (state && !state.ok && state.fieldErrors) || {};
  const isJobContract = category === CATEGORY.JOB_CONTRACT;
  const roleOptions = useMemo(() => rolesFor(category), [category]);
  const rateBases = useMemo(() => rateBasisFor(category), [category]);

  // Switching between staffing categories invalidates any role already chosen,
  // because each category has its own catalogue.
  function changeCategory(next: string) {
    setCategory(next);
    setRows((prev) => prev.map((r) => ({ ...r, role: "", custom: false })));
  }

  function updateRow(index: number, patch: Partial<RoleRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  const rolesPayload = rows
    .filter((r) => r.role.trim() && r.headcount)
    .map((r) => ({
      role: r.role.trim(),
      headcount: Number(r.headcount),
      experienceBand: r.experienceBand || undefined,
      qualification: r.qualification || undefined,
      indicativeWage: r.indicativeWage ? Number(r.indicativeWage) : undefined,
      notes: r.notes || undefined,
    }));

  const totalHeadcount = rolesPayload.reduce((s, r) => s + r.headcount, 0);

  return (
    <form action={action} className="space-y-6">
      <FormErrorFocus state={state} />
      <Alert state={state} />
      <input type="hidden" name="rolesJson" value={JSON.stringify(rolesPayload)} />

      {/* --- 1. Contract type ------------------------------------------------ */}
      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">What kind of contract is this?</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            This decides what you specify and how contractors quote.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <label key={c.value} className="relative block cursor-pointer">
              <input
                type="radio"
                name="category"
                value={c.value}
                checked={category === c.value}
                onChange={() => changeCategory(c.value)}
                className="peer sr-only"
              />
              <span
                className={`block h-full rounded-xl border-2 border-slate-200 bg-white p-4 transition hover:border-slate-300 ${
                  CATEGORY_TILE_STYLES[c.value] ?? ""
                }`}
              >
                <span className="block font-semibold text-slate-900">{c.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                  {c.summary}
                </span>
              </span>
            </label>
          ))}
        </div>
        {e.category && <p className="field-error">{e.category}</p>}

        {isJobContract && (
          <div className="rounded-lg bg-forge-50 px-4 py-3 text-sm text-forge-900 ring-1 ring-forge-200">
            <strong className="font-semibold">No headcount needed.</strong> On a job contract you
            specify the scope and the output you need. How many people or machines to deploy is the
            contractor&apos;s decision, and they are paid against output.
          </div>
        )}
      </section>

      {/* --- 2. The requirement itself --------------------------------------- */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">
          {isJobContract ? "Scope of work" : "Requirement details"}
        </h2>

        <Field
          label="Title"
          name="title"
          required
          error={e.title}
          placeholder={
            isJobContract
              ? "Mould change & drum change contract — Halol plant"
              : "Maintenance fitters for 3-shift operation"
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectWithOther
            label="Industry / sector"
            name="industry"
            options={LISTED_INDUSTRIES}
            placeholder="Select sector"
            defaultValue={companyIndustries[0] ?? ""}
            error={e.industry}
            hint="Contractors filter work by the sectors they know."
            otherLabel="Other — my sector isn't listed"
            otherPlaceholder="Type your sector, e.g. Rubber Reclaim"
          />
          {isJobContract && (
            <SelectWithOther
              label="Nature of the job contract"
              name="scopeKey"
              required
              options={LISTED_JOB_CONTRACT_SCOPES}
              placeholder="Select the type of work"
              error={e.scopeKey}
              otherLabel="Other — not listed"
              otherPlaceholder="Type the nature of the work"
            />
          )}
        </div>

        <TextArea
          label={isJobContract ? "Scope of work" : "Job description"}
          name="description"
          rows={isJobContract ? 7 : 5}
          required={isJobContract}
          error={e.description}
          placeholder={
            isJobContract
              ? "Describe the work, the plant conditions, the output expected, quality standards, working hours, and anything the contractor must supply (tools, consumables, supervision)…"
              : "Describe the role, reporting line, plant conditions and what the person will be doing day to day…"
          }
          hint={
            isJobContract
              ? "This is what contractors price against — the more precise it is, the more comparable the quotes."
              : undefined
          }
        />

        {isJobContract && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                label="Output required"
                name="outputQuantity"
                min={0}
                placeholder="300"
                error={e.outputQuantity}
              />
              <SelectWithOther
                label="Measured in"
                name="outputUnit"
                options={OUTPUT_UNITS}
                placeholder="Select unit"
                error={e.outputUnit}
                maxLength={20}
                otherLabel="Other unit"
                otherPlaceholder="e.g. kilolitre"
              />
              <Field
                label="Per period"
                name="outputPeriod"
                placeholder="per day"
                error={e.outputPeriod}
              />
            </div>
            <TextArea
              label="Deliverables & standards"
              name="deliverables"
              rows={3}
              error={e.deliverables}
              placeholder="Zero damage to tyres, 99% dispatch adherence, daily MIS, statutory compliance for all deployed manpower…"
            />
          </>
        )}
      </section>

      {/* --- 3. Roles & headcount (staffing only) ---------------------------- */}
      {!isJobContract && (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-slate-900">Roles & headcount</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Add each role you need and how many people.
              </p>
            </div>
            {totalHeadcount > 0 && (
              <span className="badge bg-brand-100 text-brand-800">
                {totalHeadcount} total {totalHeadcount === 1 ? "person" : "people"}
              </span>
            )}
          </div>

          {e.roles && <p className="field-error">{e.roles}</p>}

          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <label className="label" htmlFor={`role-${i}`}>
                      Role <span className="text-red-500">*</span>
                    </label>
                    {/* The catalogue covers the common trades, but no fixed list
                        covers every plant's job titles — hence "Other". A role
                        typed there is stored verbatim: the schema takes any
                        non-empty string and roleLabel() falls back to the raw
                        value. A catalogue pick must store its *code*, not its
                        label, because contractor profiles record roles by code
                        and lib/matching.ts scores the overlap between them. */}
                    <select
                      id={`role-${i}`}
                      className="input"
                      value={row.custom ? OTHER_ROLE : row.role}
                      onChange={(ev) => {
                        const picked = ev.target.value;
                        updateRow(
                          i,
                          picked === OTHER_ROLE
                            ? { custom: true, role: "" }
                            : { custom: false, role: picked },
                        );
                      }}
                    >
                      <option value="">Select a role</option>
                      {roleOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      <option value={OTHER_ROLE}>Other — not listed</option>
                    </select>
                    {row.custom && (
                      <input
                        id={`role-${i}-other`}
                        className="input mt-2"
                        aria-label="Role title"
                        placeholder="Type the role, e.g. Bandomatic Operator"
                        maxLength={80}
                        required
                        autoFocus
                        value={row.role}
                        onChange={(ev) => updateRow(i, { role: ev.target.value })}
                      />
                    )}
                    {e[`roles.${i}.role`] ? (
                      <p className="field-error">{e[`roles.${i}.role`]}</p>
                    ) : (
                      <p className="hint">Not listed? Pick &ldquo;Other&rdquo; and type it in.</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="label" htmlFor={`headcount-${i}`}>
                      Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`headcount-${i}`}
                      type="number"
                      min={1}
                      className="input"
                      value={row.headcount}
                      onChange={(ev) => updateRow(i, { headcount: ev.target.value })}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="label" htmlFor={`exp-${i}`}>
                      Experience
                    </label>
                    <select
                      id={`exp-${i}`}
                      className="input"
                      value={row.experienceBand}
                      onChange={(ev) => updateRow(i, { experienceBand: ev.target.value })}
                    >
                      <option value="">Any</option>
                      {EXPERIENCE_BANDS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="label" htmlFor={`qual-${i}`}>
                      Qualification
                    </label>
                    <select
                      id={`qual-${i}`}
                      className="input"
                      value={row.qualification}
                      onChange={(ev) => updateRow(i, { qualification: ev.target.value })}
                    >
                      <option value="">Any</option>
                      {QUALIFICATIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex items-end gap-3">
                  <div className="flex-1">
                    <label className="label" htmlFor={`notes-${i}`}>
                      Notes for this role
                    </label>
                    <input
                      id={`notes-${i}`}
                      className="input"
                      placeholder="Must have worked on Bandomatic machines"
                      value={row.notes}
                      onChange={(ev) => updateRow(i, { notes: ev.target.value })}
                    />
                  </div>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                      className="btn-secondary btn-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
            className="btn-secondary btn-sm"
          >
            + Add another role
          </button>
        </section>
      )}

      {/* --- 4. Site & timing ------------------------------------------------ */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Site & timing</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Plant / site name"
            name="siteName"
            error={e.siteName}
            placeholder="Dahej Plant — Unit II"
          />
          <Field label="City" name="city" required error={e.city} />
          <StatesSelect label="State" name="state" required states={STATES} error={e.state} />
          <Field label="District" name="district" error={e.district} />
          <Field label="Pincode" name="pincode" error={e.pincode} inputMode="numeric" />
          <Field label="Expected start date" name="startDate" type="date" error={e.startDate} />
          <Select
            label="Contract duration"
            name="durationType"
            options={CONTRACT_DURATIONS}
            placeholder="Select duration"
            error={e.durationType}
          />
          <NumberField
            label="Duration"
            name="durationMonths"
            min={0}
            max={600}
            suffix="months"
            error={e.durationMonths}
            hint="Used to estimate contract value."
          />
          <Select label="Shift pattern" name="shift" options={SHIFTS} placeholder="Select shift" error={e.shift} />
          <Select label="How soon do you need this?" name="urgency" required options={URGENCY} defaultValue="NORMAL" error={e.urgency} />
        </div>

        <fieldset>
          <legend className="label">What does the company provide?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <CheckboxField label="Accommodation" name="accommodationProvided" />
            <CheckboxField label="Transport" name="transportProvided" />
            <CheckboxField label="Canteen / food" name="foodProvided" />
            <CheckboxField label="PPE & safety gear" name="ppeProvided" />
          </div>
        </fieldset>
      </section>

      {/* --- 5. Commercials --------------------------------------------------- */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Commercials</h2>
        <p className="-mt-2 text-sm text-slate-500">
          Optional, but a stated basis makes quotes directly comparable.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Quote me on"
            name="preferredRateBasis"
            options={rateBases}
            placeholder="Let contractors choose"
            error={e.preferredRateBasis}
            hint={
              isHeadcountCategory(category)
                ? "Term staffing is usually priced per person per month."
                : "Output contracts are usually priced per tonne, per unit or as a lump sum."
            }
          />
          <NumberField
            label="Indicative budget"
            name="indicativeBudget"
            min={0}
            prefix="₹"
            error={e.indicativeBudget}
            hint="Only shown as guidance. You can leave this blank."
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Publishing…">Publish requirement</SubmitButton>
        <p className="text-sm text-slate-500">
          Contractors matching your sector and region will see this immediately.
        </p>
      </div>
    </form>
  );
}
