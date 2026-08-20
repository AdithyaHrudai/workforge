"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { deleteDocument, saveVerification } from "@/app/actions/contractor";
import { deleteCompanyDocument, saveCompanyVerification } from "@/app/actions/company";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, StatusBadge } from "@/components/Badge";
import { FormErrorFocus } from "@/components/FormErrorFocus";
import type { Side } from "@/lib/constants";

export type ChecklistItemView = {
  type: string;
  label: string;
  question: string;
  idLabel: string;
  idPlaceholder: string;
  /** null until the question has been answered. */
  answer: boolean | null;
  idNumber: string | null;
  document: {
    id: string;
    fileName: string;
    status: string;
    reviewNotes: string | null;
  } | null;
};

/**
 * The verification checklist.
 *
 * Every item is the same three steps — answer the question, and if the answer
 * is yes, give the number and the certificate. Firms were previously handed a
 * dropdown of a dozen document types and left to work out which ones applied
 * to them; a fixed list of questions cannot be half-understood in that way, and
 * an unanswered question is visibly unanswered rather than silently absent.
 */
export function VerificationChecklist({
  side,
  items,
}: {
  side: Side;
  items: ChecklistItemView[];
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <ChecklistCard key={item.type} side={side} item={item} />
      ))}
    </div>
  );
}

function ChecklistCard({ side, item }: { side: Side; item: ChecklistItemView }) {
  const isCompany = side === "COMPANY";
  const [state, action] = useFormState(
    isCompany ? saveCompanyVerification : saveVerification,
    null,
  );
  const [answer, setAnswer] = useState<"YES" | "NO" | "">(
    item.answer === null ? "" : item.answer ? "YES" : "NO",
  );
  const errs = (state && !state.ok && state.fieldErrors) || {};
  const removeDocument = isCompany ? deleteCompanyDocument : deleteDocument;

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold text-slate-900">{item.label}</h2>
        <ItemStatus item={item} />
      </div>

      <form action={action} className="space-y-4">
        <FormErrorFocus state={state} />
        <Alert state={state} />
        <input type="hidden" name="type" value={item.type} />

        <fieldset>
          <legend className="label">{item.question}</legend>
          <div className="flex gap-3">
            {(["YES", "NO"] as const).map((v) => (
              <label
                key={v}
                // Same yes/no control as the profile form's RegistrationField,
                // so the two places that ask this question look like one product.
                className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
                  answer === v
                    ? "bg-brand-50 text-brand-800 ring-brand-500"
                    : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={v}
                  checked={answer === v}
                  onChange={() => setAnswer(v)}
                  className="sr-only"
                />
                {v === "YES" ? "Yes" : "No"}
              </label>
            ))}
          </div>
        </fieldset>

        {answer === "YES" && (
          <>
            <Field
              label={item.idLabel}
              name="idNumber"
              required
              error={errs.idNumber}
              defaultValue={item.idNumber ?? ""}
              placeholder={item.idPlaceholder}
              autoCapitalize="characters"
            />

            <div>
              <label className="label" htmlFor={`file-${item.type}`}>
                Certificate {!item.document && <span className="text-red-500">*</span>}
              </label>
              <input
                id={`file-${item.type}`}
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                required={!item.document}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
              />
              <p className="mt-1 text-xs text-slate-500">
                PDF, JPG, PNG or WEBP. Max 5 MB.
                {item.document && " Uploading again replaces the file on record."}
              </p>
            </div>
          </>
        )}

        {answer === "NO" && (
          <p className="text-sm text-slate-500">
            We will record that your firm holds no {item.label}. Nothing to upload.
          </p>
        )}

        {answer !== "" && <SubmitButton pendingText="Saving…">Save</SubmitButton>}
      </form>

      {item.document && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs">
          <span className="truncate font-medium text-slate-700">{item.document.fileName}</span>
          <a
            href={`/api/documents/${item.document.id}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-600 hover:underline"
          >
            View
          </a>
          {/* Its own form: a nested one would be invalid HTML, and removing the
              file is a different decision from answering the question. */}
          <form action={removeDocument}>
            <input type="hidden" name="id" value={item.document.id} />
            <button className="font-medium text-red-600 hover:underline">Remove</button>
          </form>
          {item.document.reviewNotes && (
            <span className="basis-full text-slate-500">
              Reviewer note: {item.document.reviewNotes}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function ItemStatus({ item }: { item: ChecklistItemView }) {
  if (item.document) return <StatusBadge status={item.document.status} />;
  if (item.answer === false) {
    return <span className="text-xs font-medium text-slate-500">Declared: not registered</span>;
  }
  if (item.answer === true) {
    return <span className="text-xs font-medium text-amber-700">Certificate pending</span>;
  }
  return <span className="text-xs font-medium text-slate-400">Not answered</span>;
}
