"use client";

import { useFormState } from "react-dom";
import { inviteContractor } from "@/app/actions/requirements";
import { Select, TextArea } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";

/**
 * Invites a contractor found through search to quote on an open requirement.
 * Without this, the directory is just a phone book — this is what turns a
 * search result into a proposal.
 */
export function InviteForm({
  contractorId,
  contractorName,
  requirements,
  defaultRequirementId,
}: {
  contractorId: string;
  contractorName: string;
  requirements: { id: string; title: string }[];
  defaultRequirementId?: string;
}) {
  const [state, action] = useFormState(inviteContractor, null);
  const e = (state && !state.ok && state.fieldErrors) || {};

  if (requirements.length === 0) {
    return (
      <div className="card">
        <h2 className="font-semibold text-slate-900">Invite to quote</h2>
        <p className="mt-1 text-sm text-slate-500">
          You have no open requirements right now. Post one and you can invite {contractorName}{" "}
          directly.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4">
      <input type="hidden" name="contractorId" value={contractorId} />

      <div>
        <h2 className="font-semibold text-slate-900">Invite to quote</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {contractorName} will be notified and can respond with a proposal.
        </p>
      </div>

      <FormErrorFocus state={state} />

      <Alert state={state} />

      <Select
        label="Requirement"
        name="requirementId"
        required
        options={requirements.map((r) => ({ value: r.id, label: r.title }))}
        placeholder="Select a requirement"
        defaultValue={defaultRequirementId ?? ""}
        error={e.requirementId}
      />

      <TextArea
        label="Message"
        name="message"
        rows={3}
        error={e.message}
        placeholder="We're looking for a firm with people already in this region. Would you be able to quote?"
      />

      <SubmitButton pendingText="Sending…">Send invitation</SubmitButton>
    </form>
  );
}
