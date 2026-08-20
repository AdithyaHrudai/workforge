import { reviewDocument } from "@/app/actions/admin";
import { StatusBadge } from "@/components/Badge";
import { documentTypeLabel } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

export type ReviewableDocument = {
  id: string;
  type: string;
  fileName: string;
  size: number;
  status: string;
  reviewNotes: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: { name: string; adminCode: string } | null;
};

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The document review list — the core of the console.
 *
 * Three things about it are deliberate:
 *
 *  • "Open document" points at /api/admin/documents/…, not the owner-facing
 *    route, and every click writes an ADMIN_DOC_VIEW entry naming the admin and
 *    the document. Looking is an action here, not a free one.
 *
 *  • The note travels with the decision in the same form submission, so a
 *    rejection cannot be recorded without the reason reaching the person who
 *    has to act on it. A firm told only "rejected" has been told nothing.
 *
 *  • A decided document keeps its Approve and Reject buttons. Reviewers make
 *    mistakes and documents get replaced; a decision that can only be made once
 *    just moves the correction into somebody's inbox.
 */
export function DocumentReviewList({
  documents,
  side,
}: {
  documents: ReviewableDocument[];
  side: "CONTRACTOR" | "COMPANY";
}) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nothing uploaded yet. {side === "COMPANY" ? "Company" : "Contractor"} documents
        are optional at registration, so an empty list is not itself a reason to
        reject — but it is a reason not to grant the verified badge.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="rounded-lg border border-slate-200 p-4 last:mb-0"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-slate-800">{documentTypeLabel(doc.type)}</p>
              <p className="truncate text-xs text-slate-500">
                {doc.fileName} · {fileSize(doc.size)} · uploaded {formatDate(doc.createdAt)}
              </p>
              {doc.reviewedAt && (
                <p className="mt-0.5 text-xs text-slate-400">
                  Last decided {formatDateTime(doc.reviewedAt)}
                  {doc.reviewedBy
                    ? ` by ${doc.reviewedBy.name} (${doc.reviewedBy.adminCode})`
                    : ""}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={doc.status} />
              <a
                href={`/api/admin/documents/${doc.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary btn-sm"
              >
                Open document
              </a>
            </div>
          </div>

          <form action={reviewDocument} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={doc.id} />
            <div className="min-w-[14rem] flex-1">
              <label className="label" htmlFor={`notes-${doc.id}`}>
                Note to the uploader
              </label>
              <input
                id={`notes-${doc.id}`}
                name="notes"
                defaultValue={doc.reviewNotes ?? ""}
                className="input"
                placeholder="Required for a rejection — say exactly what is wrong."
              />
            </div>
            <button className="btn-primary btn-sm" name="decision" value="APPROVED" type="submit">
              Verify
            </button>
            <button
              className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
              name="decision"
              value="REJECTED"
              type="submit"
            >
              Reject
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
