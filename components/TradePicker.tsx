"use client";

import { useState } from "react";
import { TRADES } from "@/lib/constants";

export function TradePicker({
  name = "trades",
  defaultValue = [],
  error,
}: {
  name?: string;
  defaultValue?: string[];
  error?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultValue));

  function toggle(v: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  return (
    <div>
      <span className="label">Trades supplied *</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TRADES.map((t) => {
          const on = selected.has(t.value);
          return (
            <label
              key={t.value}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                on ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-300 text-slate-600"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() => toggle(t.value)}
              />
              {on && <span aria-hidden>✓ </span>}
              {t.label}
            </label>
          );
        })}
      </div>
      {Array.from(selected).map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
