"use client";

import { useState } from "react";

/**
 * A "do you hold this registration?" question that reveals its number field.
 *
 * Indian contractors hold an inconsistent mix of GST, Udyam, EPF, ESIC and CLRA
 * depending on size and trade, and a flat grid of optional boxes gives no way to
 * tell "not registered" from "didn't get round to filling it in". Asking first
 * makes the answer explicit and hides five fields most firms will not use.
 *
 * A blank field means the same thing to the server either way, so the toggle
 * needs no state of its own in the schema: answering No simply submits nothing.
 */
export function RegistrationField({
  question,
  label,
  name,
  defaultValue = "",
  placeholder,
  hint,
  error,
  required = false,
}: {
  question: string;
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Mandatory registrations skip the question and always show the field. */
  required?: boolean;
}) {
  // Start open when a value already exists, so editing an existing profile
  // never appears to have lost data.
  const [has, setHas] = useState(required || Boolean(defaultValue));

  if (required) {
    return (
      <div className="rounded-lg border border-slate-200 p-3">
        <label className="label" htmlFor={name}>
          {label} <span className="text-red-500">*</span>
        </label>
        <input
          id={name}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="input"
          aria-invalid={error ? true : undefined}
        />
        {hint && !error && <p className="hint">{hint}</p>}
        {error && <p className="field-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">{question}</legend>
        <div className="mt-2 flex gap-2">
          {[
            { v: true, t: "Yes" },
            { v: false, t: "No" },
          ].map((o) => (
            <label
              key={o.t}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
                has === o.v
                  ? "bg-brand-50 text-brand-800 ring-brand-500"
                  : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name={`${name}__has`}
                checked={has === o.v}
                onChange={() => setHas(o.v)}
                className="sr-only"
              />
              {o.t}
            </label>
          ))}
        </div>
      </fieldset>

      {has && (
        <div className="mt-3">
          <label className="label" htmlFor={name}>
            {label}
          </label>
          <input
            id={name}
            name={name}
            defaultValue={defaultValue}
            placeholder={placeholder}
            className="input"
            aria-invalid={error ? true : undefined}
          />
          {hint && !error && <p className="hint">{hint}</p>}
          {error && <p className="field-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
