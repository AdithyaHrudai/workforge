"use client";

import { useFormState } from "react-dom";
import { submitProposal } from "@/app/actions/proposals";
import { NumberField, Select, TextArea } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import { isHeadcountCategory, rateBasisFor } from "@/lib/constants";

type Existing = {
  rateBasis: string;
  rateAmount: number;
  headcountOffered: number | null;
  indicativeCrewSize: number | null;
  mobilizationDays: number;
  validityDays: number;
  coverNote: string | null;
} | null;

/**
 * The contractor's quote. Its shape follows the requirement's contract type:
 * staffing asks for a per-person rate and a headcount commitment, while a job
 * contract asks for a rate against output and deliberately does not ask how
 * many people will be deployed — that is the contractor's commercial call, and
 * asking for it would quietly turn an output contract into a supply contract.
 */
export function ProposalForm({
  requirementId,
  category,
  preferredRateBasis,
  existing,
}: {
  requirementId: string;
  category: string;
  preferredRateBasis: string | null;
  existing: Existing;
}) {
  const [state, action] = useFormState(submitProposal, null);
  const e = (state && !state.ok && state.fieldErrors) || {};
  const headcountBased = isHeadcountCategory(category);
  const bases = rateBasisFor(category);

  return (
    <form action={action} className="card space-y-4">
      <input type="hidden" name="requirementId" value={requirementId} />

      <div>
        <h2 className="font-semibold text-slate-900">
          {existing ? "Revise your proposal" : "Submit a proposal"}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {headcountBased
            ? "Quote your all-inclusive rate per person and confirm how many you can deploy."
            : "Quote against the output. You decide the deployment."}
        </p>
      </div>

      <FormErrorFocus state={state} />

      <Alert state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Rate basis"
          name="rateBasis"
          required
          options={bases}
          placeholder="Select basis"
          defaultValue={existing?.rateBasis ?? preferredRateBasis ?? ""}
          error={e.rateBasis}
          hint={preferredRateBasis ? "The company asked to be quoted on this basis." : undefined}
        />
        <NumberField
          label="Your rate"
          name="rateAmount"
          required
          min={1}
          prefix="₹"
          defaultValue={existing?.rateAmount ?? ""}
          error={e.rateAmount}
        />

        {headcountBased ? (
          <NumberField
            label="Manpower you can deploy"
            name="headcountOffered"
            required
            min={1}
            defaultValue={existing?.headcountOffered ?? ""}
            error={e.headcountOffered}
            hint="You can offer part of the requirement — companies often split across contractors."
          />
        ) : (
          <NumberField
            label="Indicative crew size"
            name="indicativeCrewSize"
            min={1}
            defaultValue={existing?.indicativeCrewSize ?? ""}
            error={e.indicativeCrewSize}
            hint="Optional and non-binding. You remain free to deploy whatever the output needs."
          />
        )}

        <NumberField
          label="Mobilisation time"
          name="mobilizationDays"
          required
          min={0}
          max={365}
          suffix="days"
          defaultValue={existing?.mobilizationDays ?? 7}
          error={e.mobilizationDays}
        />
        <NumberField
          label="Quote valid for"
          name="validityDays"
          required
          min={1}
          max={365}
          suffix="days"
          defaultValue={existing?.validityDays ?? 30}
          error={e.validityDays}
        />
      </div>

      <TextArea
        label="Covering note"
        name="coverNote"
        rows={5}
        defaultValue={existing?.coverNote ?? ""}
        error={e.coverNote}
        placeholder={
          headcountBased
            ? "Similar deployments you are running, supervision you will provide, statutory compliance you cover, and anything excluded from your rate…"
            : "Your method of working, equipment you will bring, supervision, similar output contracts you run, and anything excluded from your rate…"
        }
        hint="What the rate includes and excludes matters as much as the number itself."
      />

      <SubmitButton pendingText="Submitting…">
        {existing ? "Update proposal" : "Submit proposal"}
      </SubmitButton>
    </form>
  );
}
