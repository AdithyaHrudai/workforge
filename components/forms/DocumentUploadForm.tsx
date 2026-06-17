"use client";

import { useRef, useEffect } from "react";
import { useFormState } from "react-dom";
import { uploadDocument } from "@/app/actions/contractor";
import { Select } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Badge";
import { DOCUMENT_TYPES } from "@/lib/constants";

export function DocumentUploadForm() {
  const [state, action] = useFormState(uploadDocument, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-4">
      <h2 className="font-semibold text-slate-900">Upload a document</h2>
      <Alert state={state} />
      <Select label="Document type" name="type" required options={DOCUMENT_TYPES} placeholder="Select type" />
      <div>
        <label className="label" htmlFor="file">
          File <span className="text-red-500">*</span>
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          required
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
        />
        <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG or WEBP. Max 5 MB.</p>
      </div>
      <SubmitButton pendingText="Uploading…">Upload for review</SubmitButton>
    </form>
  );
}
