"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { saveClient } from "@/app/actions/contractor";
import { Field, NumberField, Select, StatesSelect, TextArea } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import { CATEGORY_OPTIONS, INDUSTRIES, STATES } from "@/lib/constants";

export type ClientDefaults = {
  id?: string;
  clientName?: string;
  industry?: string | null;
  siteCity?: string;
  siteState?: string;
  category?: string | null;
  scope?: string | null;
  headcount?: number;
  startedYear?: number | null;
  endedYear?: number | null;
  ongoing?: boolean;
};

/**
 * One entry in the contractor's track record.
 *
 * This form is the reason companies trust the platform: "Yokohama, Dahej — 200
 * people since 2019" is the evidence a plant in Gujarat actually acts on, far
 * more than a self-declared service area.
 */
export function ClientForm({
  defaults = {},
  onDone,
}: {
  defaults?: ClientDefaults;
  onDone?: () => void;
}) {
  const [state, action] = useFormState(saveClient, null);
  const [ongoing, setOngoing] = useState(defaults.ongoing ?? true);
  const formRef = useRef<HTMLFormElement>(null);
  const e = (state && !state.ok && state.fieldErrors) || {};

  useEffect(() => {
    if (state?.ok) {
      if (!defaults.id) formRef.current?.reset();
      onDone?.();
    }
    // `onDone` is a stable callback from the parent; re-running on its identity
    // would close the panel on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <FormErrorFocus state={state} />
      <Alert state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Client company"
          name="clientName"
          required
          error={e.clientName}
          defaultValue={defaults.clientName}
          placeholder="Yokohama India Pvt Ltd"
        />
        <Select
          label="Their industry"
          name="industry"
          options={INDUSTRIES}
          placeholder="Select sector"
          defaultValue={defaults.industry ?? ""}
          error={e.industry}
        />
        <Field
          label="Site / plant city"
          name="siteCity"
          required
          error={e.siteCity}
          defaultValue={defaults.siteCity}
          placeholder="Dahej"
        />
        <StatesSelect
          label="Site state"
          name="siteState"
          required
          states={STATES}
          defaultValue={defaults.siteState ?? ""}
          error={e.siteState}
        />
        <Select
          label="Contract type supplied"
          name="category"
          options={CATEGORY_OPTIONS}
          placeholder="Select type"
          defaultValue={defaults.category ?? ""}
          error={e.category}
        />
        <NumberField
          label="Manpower deployed"
          name="headcount"
          required
          min={0}
          defaultValue={defaults.headcount ?? ""}
          error={e.headcount}
          hint="Peak or current strength at this site."
        />
        <NumberField
          label="Started in"
          name="startedYear"
          min={1950}
          defaultValue={defaults.startedYear ?? ""}
          error={e.startedYear}
          placeholder="2019"
        />
        <NumberField
          label="Ended in"
          name="endedYear"
          min={1950}
          defaultValue={defaults.endedYear ?? ""}
          error={e.endedYear}
          hint={ongoing ? "Not needed while the contract is ongoing." : undefined}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          name="ongoing"
          checked={ongoing}
          onChange={(ev) => setOngoing(ev.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
        />
        <span className="text-sm font-medium text-slate-700">This contract is ongoing</span>
      </label>

      <TextArea
        label="Scope supplied"
        name="scope"
        rows={2}
        defaultValue={defaults.scope ?? ""}
        error={e.scope}
        placeholder="Mould change & drum change, 3 shifts, 200 manpower with own supervision"
      />

      <SubmitButton pendingText="Saving…">
        {defaults.id ? "Update client" : "Add to track record"}
      </SubmitButton>
    </form>
  );
}
