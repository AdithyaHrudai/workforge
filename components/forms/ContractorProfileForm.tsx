"use client";

import { useFormState } from "react-dom";
import { saveContractorProfile } from "@/app/actions/contractor";
import { Field, TextArea, Select, StatesSelect } from "@/components/Field";
import { TradePicker } from "@/components/TradePicker";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { ENTITY_TYPES, STATES } from "@/lib/constants";

type Defaults = {
  firmName?: string;
  entityType?: string | null;
  ownerName?: string;
  yearEstablished?: number | null;
  address?: string | null;
  city?: string;
  district?: string | null;
  state?: string;
  pincode?: string | null;
  serviceAreas?: string | null;
  willingOutstation?: boolean;
  pan?: string | null;
  gstin?: string | null;
  labourLicenceNo?: string | null;
  esicNo?: string | null;
  epfNo?: string | null;
  trades?: string[];
  totalWorkforce?: number;
  available?: number;
  mobilizationDays?: number;
  about?: string | null;
};

export function ContractorProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, action] = useFormState(saveContractorProfile, null);
  const e = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="space-y-6">
      <Alert state={state} />

      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Firm details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Firm name" name="firmName" required error={e.firmName} defaultValue={defaults.firmName} />
          <Field label="Owner / proprietor name" name="ownerName" required error={e.ownerName} defaultValue={defaults.ownerName} />
          <Select label="Entity type" name="entityType" options={ENTITY_TYPES} placeholder="Select" defaultValue={defaults.entityType ?? ""} error={e.entityType} />
          <Field label="Year established" name="yearEstablished" type="number" defaultValue={defaults.yearEstablished ?? ""} error={e.yearEstablished} />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Location & coverage</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="city" required error={e.city} defaultValue={defaults.city} />
          <Field label="District" name="district" error={e.district} defaultValue={defaults.district ?? ""} />
          <StatesSelect label="State" name="state" required states={STATES} defaultValue={defaults.state ?? ""} error={e.state} />
          <Field label="Pincode" name="pincode" error={e.pincode} defaultValue={defaults.pincode ?? ""} inputMode="numeric" />
        </div>
        <Field label="Address" name="address" error={e.address} defaultValue={defaults.address ?? ""} />
        <Field
          label="Service areas"
          name="serviceAreas"
          hint="Comma-separated cities/states you can supply to"
          defaultValue={defaults.serviceAreas ?? ""}
          error={e.serviceAreas}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="willingOutstation" defaultChecked={defaults.willingOutstation} className="h-4 w-4 rounded border-slate-300" />
          Willing to mobilise to outstation sites
        </label>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Trades & capacity</h2>
        <TradePicker defaultValue={defaults.trades ?? []} error={e.trades} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Total workforce" name="totalWorkforce" type="number" defaultValue={defaults.totalWorkforce ?? 0} error={e.totalWorkforce} />
          <Field label="Currently available" name="available" type="number" defaultValue={defaults.available ?? 0} error={e.available} />
          <Field label="Mobilisation (days)" name="mobilizationDays" type="number" defaultValue={defaults.mobilizationDays ?? 3} error={e.mobilizationDays} />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Statutory details</h2>
        <p className="text-xs text-slate-500">
          Self-declared. Upload the matching documents under <strong>Verification</strong> so our
          team can issue your verified badge.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Labour licence no. (CLRA)" name="labourLicenceNo" defaultValue={defaults.labourLicenceNo ?? ""} error={e.labourLicenceNo} />
          <Field label="GSTIN" name="gstin" defaultValue={defaults.gstin ?? ""} error={e.gstin} />
          <Field label="PAN" name="pan" defaultValue={defaults.pan ?? ""} error={e.pan} />
          <Field label="ESIC no." name="esicNo" defaultValue={defaults.esicNo ?? ""} error={e.esicNo} />
          <Field label="EPF no." name="epfNo" defaultValue={defaults.epfNo ?? ""} error={e.epfNo} />
        </div>
      </div>

      <div className="card space-y-4">
        <TextArea label="About your firm" name="about" rows={4} defaultValue={defaults.about ?? ""} error={e.about} />
      </div>

      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
