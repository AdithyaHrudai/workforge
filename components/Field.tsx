import type { Option } from "@/lib/constants";

type Common = {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  hint?: string;
};

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
      <label className="label" htmlFor={name}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="input"
        {...rest}
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
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
      <label className="label" htmlFor={name}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="input"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
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
}: Common & {
  options: Option[];
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select id={name} name={name} defaultValue={defaultValue ?? ""} className="input">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function StatesSelect(props: Common & { states: string[]; defaultValue?: string }) {
  return (
    <Select
      {...props}
      options={props.states.map((s) => ({ value: s, label: s }))}
      placeholder="Select state"
    />
  );
}
