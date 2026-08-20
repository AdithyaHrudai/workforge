import type { Option } from "@/lib/constants";

type Common = {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  hint?: string;
};

function Label({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="label" htmlFor={name}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function Meta({ hint, error }: { hint?: string; error?: string }) {
  return (
    <>
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </>
  );
}

export function Field({
  label,
  name,
  error,
  required,
  hint,
  type = "text",
  defaultValue,
  placeholder,
  ...rest
}: Common & {
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label label={label} name={name} required={required} />
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="input"
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      <Meta hint={hint} error={error} />
    </div>
  );
}

export function NumberField(
  props: Common & {
    defaultValue?: number | string | null;
    min?: number;
    max?: number;
    placeholder?: string;
    prefix?: string;
    suffix?: string;
  },
) {
  const { prefix, suffix, defaultValue, ...rest } = props;
  return (
    <div>
      <Label label={props.label} name={props.name} required={props.required} />
      <div className="flex items-stretch">
        {prefix && (
          <span className="inline-flex items-center rounded-l-lg bg-slate-100 px-3 text-sm text-slate-500 ring-1 ring-inset ring-slate-300">
            {prefix}
          </span>
        )}
        <input
          id={props.name}
          name={props.name}
          type="number"
          inputMode="numeric"
          min={rest.min}
          max={rest.max}
          defaultValue={defaultValue ?? ""}
          placeholder={rest.placeholder}
          className={`input ${prefix ? "rounded-l-none" : ""} ${suffix ? "rounded-r-none" : ""}`}
          aria-invalid={props.error ? true : undefined}
        />
        {suffix && (
          <span className="inline-flex items-center whitespace-nowrap rounded-r-lg bg-slate-100 px-3 text-sm text-slate-500 ring-1 ring-inset ring-slate-300">
            {suffix}
          </span>
        )}
      </div>
      <Meta hint={props.hint} error={props.error} />
    </div>
  );
}

export function TextArea({
  label,
  name,
  error,
  required,
  hint,
  defaultValue,
  rows = 3,
  placeholder,
}: Common & { defaultValue?: string; rows?: number; placeholder?: string }) {
  return (
    <div>
      <Label label={label} name={name} required={required} />
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="input"
        aria-invalid={error ? true : undefined}
      />
      <Meta hint={hint} error={error} />
    </div>
  );
}

export function Select({
  label,
  name,
  error,
  required,
  hint,
  options,
  defaultValue,
  placeholder,
  onChange,
  value,
}: Common & {
  options: Option[];
  defaultValue?: string;
  placeholder?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  value?: string;
}) {
  // `value`/`onChange` are only supplied by the client forms that need to react
  // to a change; everything else stays uncontrolled.
  const controlled = value !== undefined;
  return (
    <div>
      <Label label={label} name={name} required={required} />
      <select
        id={name}
        name={name}
        className="input"
        aria-invalid={error ? true : undefined}
        {...(controlled
          ? { value, onChange }
          : { defaultValue: defaultValue ?? "", onChange })}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Meta hint={hint} error={error} />
    </div>
  );
}

export function StatesSelect(
  props: Common & { states: string[]; defaultValue?: string },
) {
  const { states, ...rest } = props;
  return (
    <Select
      {...rest}
      options={states.map((s) => ({ value: s, label: s }))}
      placeholder="Select state"
    />
  );
}

export function CheckboxField({
  label,
  name,
  hint,
  defaultChecked,
}: {
  label: string;
  name: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
      />
      <span>
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

/**
 * A multi-select rendered as toggleable chips.
 *
 * Implemented with real checkboxes and styled entirely with CSS (`:has`), so it
 * works without JavaScript, submits as repeated form keys, and stays keyboard-
 * and screen-reader-navigable. That also lets it be used from server components.
 */
export function ChipGroup({
  label,
  name,
  options,
  selected = [],
  error,
  hint,
  required,
  columns,
  scroll,
  hideLabel,
}: Common & {
  options: Option[];
  selected?: string[];
  columns?: boolean;
  /** Caps the height for long lists (the 34 states, the role catalogues). */
  scroll?: boolean;
  /**
   * Keeps the legend for screen readers but hides it visually — used when an
   * enclosing FilterSection already shows the same label.
   */
  hideLabel?: boolean;
}) {
  const chosen = new Set(selected);
  const layout = columns ? "grid gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2";
  return (
    <fieldset>
      <legend className={hideLabel ? "sr-only" : "label"}>
        {label} {required && <span className="text-red-500">*</span>}
      </legend>
      <div
        className={
          scroll
            ? `${layout} max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3`
            : layout
        }
      >
        {options.map((o) => (
          <label key={o.value} className="chip-option">
            <input
              type="checkbox"
              name={name}
              value={o.value}
              defaultChecked={chosen.has(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      <Meta hint={hint} error={error} />
    </fieldset>
  );
}

/** ChipGroup over the state list — always scrolled, since there are 34. */
export function StatesChipGroup(
  props: Common & { states: string[]; selected?: string[]; hideLabel?: boolean },
) {
  const { states, ...rest } = props;
  return (
    <ChipGroup
      {...rest}
      scroll
      options={states.map((s) => ({ value: s, label: s }))}
    />
  );
}

/**
 * A collapsible filter group.
 *
 * Built on <details> rather than React state so it works in a server component
 * and costs no JavaScript. Groups that already have a selection start open, so
 * an active filter is never hidden behind a closed summary.
 */
export function FilterSection({
  label,
  count = 0,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <details open={count > 0} className="group border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm font-medium text-slate-700 hover:text-slate-900">
        <span className="flex items-center gap-2">
          {label}
          {count > 0 && (
            <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-800">
              {count}
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 fill-none stroke-slate-400 transition group-open:rotate-180"
          strokeWidth={1.75}
          aria-hidden
        >
          <path d="M5.5 7.5 10 12l4.5-4.5" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="pb-1 pt-2">{children}</div>
    </details>
  );
}
