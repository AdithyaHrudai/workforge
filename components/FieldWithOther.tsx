"use client";

import { useMemo, useState } from "react";
import { ChipGroup, FieldLabel, FieldMeta } from "@/components/Field";
import type { Option } from "@/lib/constants";

/**
 * The two pickers that refuse to be a dead end.
 *
 * Every catalogue in `lib/constants` is a convenience, not a constraint — a
 * plant may run a sector, a job title or a scope no list anticipated. These
 * components are the single way that escape hatch is offered, so it behaves
 * the same everywhere: choose "Other", type the real thing, and the typed text
 * is submitted *in place of* the code. The literal "other" never reaches the
 * database; the label lookups all fall back to the raw string, so a typed
 * value renders and matches exactly like a catalogue one.
 */

/** Sentinel for the select's own "Other" row — never submitted. */
const OTHER = "__other__";

type Base = {
  label: string;
  name: string;
  options: Option[];
  error?: string;
  hint?: string;
  required?: boolean;
  /** Caps how long a typed value may be; keep in step with the Zod schema. */
  maxLength?: number;
  otherLabel?: string;
  otherPlaceholder?: string;
};

export function SelectWithOther({
  label,
  name,
  options,
  defaultValue = "",
  placeholder,
  required,
  error,
  hint,
  maxLength = 60,
  otherLabel = "Other — not listed",
  otherPlaceholder = "Type it in",
}: Base & { defaultValue?: string; placeholder?: string }) {
  const known = useMemo(() => new Set(options.map((o) => o.value)), [options]);

  // A saved value that is not a catalogue code was typed here before, so the
  // box reopens holding it rather than appearing to have dropped it.
  const typedDefault = defaultValue && !known.has(defaultValue) ? defaultValue : "";
  const [choice, setChoice] = useState(typedDefault ? OTHER : defaultValue);
  const [typed, setTyped] = useState(typedDefault);

  const isOther = choice === OTHER;
  const selectId = `${name}-choice`;

  return (
    <div>
      <FieldLabel label={label} name={selectId} required={required} />
      <select
        id={selectId}
        className="input"
        required={required}
        value={choice}
        onChange={(ev) => setChoice(ev.target.value)}
        aria-invalid={error ? true : undefined}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value={OTHER}>{otherLabel}</option>
      </select>

      {isOther && (
        <input
          id={`${name}-other`}
          className="input mt-2"
          aria-label={otherLabel}
          placeholder={otherPlaceholder}
          maxLength={maxLength}
          // Required whenever the box is open: choosing "Other" and typing
          // nothing would otherwise submit an empty field with no explanation.
          required
          autoFocus
          value={typed}
          onChange={(ev) => setTyped(ev.target.value)}
        />
      )}

      {/* The select carries the UI state; this is what the server reads. */}
      <input type="hidden" name={name} value={isOther ? typed.trim() : choice} />
      <FieldMeta hint={hint} error={error} />
    </div>
  );
}

export function ChipGroupWithOther({
  label,
  name,
  options,
  selected = [],
  error,
  hint,
  required,
  scroll,
  maxLength = 60,
  otherLabel = "Other — not in the list above",
  otherPlaceholder = "Type it in",
  isKnown,
}: Base & {
  selected?: string[];
  scroll?: boolean;
  /**
   * Overrides "is this a catalogue value?" for lists whose visible options are
   * narrower than the catalogue — the contractor's role chips shrink to the
   * contract types the firm ticked, and a role hidden that way is still not a
   * typed one.
   */
  isKnown?: (value: string) => boolean;
}) {
  const recognised = useMemo(() => {
    if (isKnown) return isKnown;
    const values = new Set(options.map((o) => o.value));
    return (v: string) => values.has(v);
  }, [isKnown, options]);

  const typedDefault = useMemo(
    () => selected.find((v) => !recognised(v)) ?? "",
    [selected, recognised],
  );
  const [open, setOpen] = useState(Boolean(typedDefault));

  return (
    <div>
      <ChipGroup
        label={label}
        name={name}
        options={options}
        selected={selected}
        error={error}
        hint={hint}
        required={required}
        scroll={scroll}
      />

      {/* Submitted under the same repeated key as the chips, so the typed value
          lands in the array beside the codes and needs no server-side handling. */}
      <label className="mt-3 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={open}
          onChange={(ev) => setOpen(ev.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
        />
        <span className="text-sm font-medium text-slate-700">{otherLabel}</span>
      </label>

      {open && (
        <input
          id={`${name}-other`}
          name={name}
          className="input mt-2"
          aria-label={otherLabel}
          placeholder={otherPlaceholder}
          maxLength={maxLength}
          defaultValue={typedDefault}
        />
      )}
    </div>
  );
}
