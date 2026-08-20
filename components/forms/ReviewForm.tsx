"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { reviewContractor } from "@/app/actions/engagement";
import { TextArea } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import { RATING_PARAMETERS } from "@/lib/constants";

function StarInput({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value || ""} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} out of 5`}
          aria-pressed={value === n}
          className="rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <svg
            viewBox="0 0 20 20"
            className={`h-6 w-6 transition ${n <= value ? "fill-forge-500" : "fill-slate-200 hover:fill-slate-300"}`}
          >
            <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

/**
 * The company's rating of a contractor, across the parameters that actually
 * decide whether a firm gets hired again — not one undifferentiated star count.
 */
export function ReviewForm({
  engagementId,
  contractorName,
}: {
  engagementId: string;
  contractorName: string;
}) {
  const [state, action] = useFormState(reviewContractor, null);
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(RATING_PARAMETERS.map((p) => [p.key, 0])),
  );

  const e = (state && !state.ok && state.fieldErrors) || {};
  const rated = Object.values(scores).filter(Boolean).length;
  const average =
    rated === RATING_PARAMETERS.length
      ? Object.values(scores).reduce((a, b) => a + b, 0) / RATING_PARAMETERS.length
      : null;

  if (state?.ok) {
    return (
      <div className="card">
        <FormErrorFocus state={state} />
        <Alert state={state} />
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-5">
      <input type="hidden" name="engagementId" value={engagementId} />

      <div>
        <h2 className="font-semibold text-slate-900">Rate {contractorName}</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Your rating is published on their profile and helps other companies choose well.
        </p>
      </div>

      <Alert state={state} />

      <div className="space-y-4">
        {RATING_PARAMETERS.map((p) => (
          <div
            key={p.key}
            className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{p.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{p.help}</p>
              {e[p.key] && <p className="field-error">{e[p.key]}</p>}
            </div>
            <StarInput
              name={p.key}
              value={scores[p.key]}
              onChange={(v) => setScores((prev) => ({ ...prev, [p.key]: v }))}
            />
          </div>
        ))}
      </div>

      {average != null && (
        <p className="rounded-lg bg-brand-50 px-4 py-2 text-sm text-brand-900">
          Overall rating: <strong className="font-semibold">{average.toFixed(1)} / 5</strong>
        </p>
      )}

      <TextArea
        label="Comments"
        name="comment"
        rows={4}
        error={e.comment}
        placeholder="How did the deployment actually go? Anything another company should know before engaging them."
      />

      <SubmitButton pendingText="Submitting…">Submit rating</SubmitButton>
    </form>
  );
}
