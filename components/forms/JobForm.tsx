"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createJob } from "@/app/actions/company";
import { Field, TextArea, Select, StatesSelect } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { TRADES, SKILL_LEVELS, STATES, URGENCY } from "@/lib/constants";

type Line = { trade: string; headcount: string; skillLevel: string; wageOffered: string };

const EMPTY_LINE: Line = { trade: "", headcount: "1", skillLevel: "SEMI", wageOffered: "" };

export function JobForm() {
  const [state, action] = useFormState(createJob, null);
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const e = (state && !state.ok && state.fieldErrors) || {};

  function update(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function add() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }
  function remove(i: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const linesJson = JSON.stringify(
    lines
      .filter((l) => l.trade)
      .map((l) => ({
        trade: l.trade,
        headcount: Number(l.headcount) || 0,
        skillLevel: l.skillLevel,
        wageOffered: l.wageOffered === "" ? "" : Number(l.wageOffered),
      })),
  );

  return (
    <form action={action} className="space-y-6">
      <Alert state={state} />
      <input type="hidden" name="linesJson" value={linesJson} />

      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Requirement</h2>
        <Field label="Title" name="title" required error={e.title} placeholder="e.g. RCC crew for plant foundation works" />
        <TextArea label="Description" name="description" rows={3} error={e.description} placeholder="Scope, site conditions, safety/PPE requirements…" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Urgency" name="urgency" required options={URGENCY} defaultValue="NORMAL" error={e.urgency} />
          <Field label="Duration (days)" name="durationDays" type="number" error={e.durationDays} />
          <Field label="Start date" name="startDate" type="date" error={e.startDate} />
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Trades needed</h2>
          <button type="button" onClick={add} className="btn-secondary text-xs">
            + Add trade
          </button>
        </div>
        {e.lines && <p className="field-error">{e.lines}</p>}
        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="grid items-end gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <label className="label">Trade</label>
                <select className="input" value={l.trade} onChange={(ev) => update(i, { trade: ev.target.value })}>
                  <option value="">Select trade</option>
                  {TRADES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Headcount</label>
                <input type="number" min={1} className="input" value={l.headcount} onChange={(ev) => update(i, { headcount: ev.target.value })} />
              </div>
              <div className="sm:col-span-3">
                <label className="label">Skill</label>
                <select className="input" value={l.skillLevel} onChange={(ev) => update(i, { skillLevel: ev.target.value })}>
                  {SKILL_LEVELS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Wage/day (₹)</label>
                <input type="number" min={0} className="input" value={l.wageOffered} onChange={(ev) => update(i, { wageOffered: ev.target.value })} />
              </div>
              <div className="sm:col-span-1">
                <button type="button" onClick={() => remove(i)} className="btn-secondary w-full" aria-label="Remove line">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Site & terms</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="city" required error={e.city} />
          <Field label="District" name="district" error={e.district} />
          <StatesSelect label="State" name="state" required states={STATES} defaultValue="Andhra Pradesh" error={e.state} />
          <Field label="Pincode" name="pincode" error={e.pincode} inputMode="numeric" />
          <Select
            label="Shift"
            name="shift"
            options={[
              { value: "DAY", label: "Day" },
              { value: "NIGHT", label: "Night" },
              { value: "ROTATING", label: "Rotating" },
            ]}
            placeholder="—"
            error={e.shift}
          />
          <Field label="Indicative budget/worker/day (₹)" name="wageOffered" type="number" error={e.wageOffered} />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="accommodationProvided" className="h-4 w-4 rounded border-slate-300" />
            Accommodation provided
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="foodProvided" className="h-4 w-4 rounded border-slate-300" />
            Food provided
          </label>
        </div>
      </div>

      <SubmitButton pendingText="Publishing…">Publish requirement</SubmitButton>
    </form>
  );
}
