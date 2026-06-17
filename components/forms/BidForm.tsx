"use client";

import { useFormState } from "react-dom";
import { submitBid } from "@/app/actions/bidding";
import { Field, TextArea } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";

type ExistingBid = {
  ratePerWorkerPerDay: number;
  headcountOffered: number;
  mobilizationDays: number;
  notes: string | null;
} | null;

export function BidForm({
  jobId,
  existing,
  canBid,
}: {
  jobId: string;
  existing: ExistingBid;
  canBid: boolean;
}) {
  const [state, action] = useFormState(submitBid, null);
  const e = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="card space-y-4">
      <h2 className="font-semibold text-slate-900">{existing ? "Update your bid" : "Place a bid"}</h2>
      <Alert state={state} />
      <input type="hidden" name="jobId" value={jobId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Rate / worker / day (₹)"
          name="ratePerWorkerPerDay"
          type="number"
          required
          error={e.ratePerWorkerPerDay}
          defaultValue={existing?.ratePerWorkerPerDay ?? ""}
        />
        <Field
          label="Headcount you can supply"
          name="headcountOffered"
          type="number"
          required
          error={e.headcountOffered}
          defaultValue={existing?.headcountOffered ?? ""}
        />
        <Field
          label="Mobilisation (days)"
          name="mobilizationDays"
          type="number"
          required
          error={e.mobilizationDays}
          defaultValue={existing?.mobilizationDays ?? ""}
        />
      </div>
      <TextArea
        label="Notes to the company"
        name="notes"
        rows={3}
        error={e.notes}
        defaultValue={existing?.notes ?? ""}
        placeholder="What you can commit to, any conditions, references…"
      />
      {canBid ? (
        <SubmitButton pendingText="Submitting…">{existing ? "Update bid" : "Submit bid"}</SubmitButton>
      ) : (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your firm must be approved before you can bid. Upload your verification documents to get
          approved.
        </p>
      )}
    </form>
  );
}
