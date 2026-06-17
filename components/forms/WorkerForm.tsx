"use client";

import { useRef, useEffect } from "react";
import { useFormState } from "react-dom";
import { addWorker } from "@/app/actions/contractor";
import { Field, Select } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { TRADES, SKILL_LEVELS, STATES } from "@/lib/constants";

export function WorkerForm() {
  const [state, action] = useFormState(addWorker, null);
  const formRef = useRef<HTMLFormElement>(null);
  const e = (state && !state.ok && state.fieldErrors) || {};

  useEffect(() => {
    if (state && state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-4">
      <h2 className="font-semibold text-slate-900">Add a worker</h2>
      <Alert state={state} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name" name="name" required error={e.name} />
        <Select label="Trade" name="trade" required options={TRADES} placeholder="Select trade" error={e.trade} />
        <Select label="Skill level" name="skillLevel" required options={SKILL_LEVELS} defaultValue="SEMI" error={e.skillLevel} />
        <Select
          label="Gender"
          name="gender"
          options={[
            { value: "M", label: "Male" },
            { value: "F", label: "Female" },
            { value: "O", label: "Other" },
          ]}
          placeholder="—"
          error={e.gender}
        />
        <Field label="Age" name="age" type="number" error={e.age} />
        <Field label="Years experience" name="yearsExperience" type="number" error={e.yearsExperience} />
        <Select label="Native state" name="nativeState" options={STATES.map((s) => ({ value: s, label: s }))} placeholder="—" error={e.nativeState} />
        <Field label="Expected daily wage (₹)" name="expectedDailyWage" type="number" error={e.expectedDailyWage} />
      </div>
      <SubmitButton pendingText="Adding…">Add worker</SubmitButton>
    </form>
  );
}
