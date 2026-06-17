import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DocumentUploadForm } from "@/components/forms/DocumentUploadForm";
import { deleteDocument } from "@/app/actions/contractor";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { StatusBadge, VerifiedBadge } from "@/components/Badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: user.id },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });

  if (!profile) {
    return (
      <div className="card">
        <p className="text-sm text-slate-600">
          Please{" "}
          <Link href="/contractor/profile" className="font-medium text-brand-600 hover:underline">
            complete your firm profile
          </Link>{" "}
          before uploading documents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verification</h1>
          <p className="text-sm text-slate-500">
            Upload your CLRA labour licence, GST, PAN and ID. Our team reviews these to issue your
            verified badge.
          </p>
        </div>
        {profile.verified && <VerifiedBadge />}
      </div>

      <DocumentUploadForm />

      {profile.documents.length > 0 ? (
        <div className="space-y-2">
          {profile.documents.map((d) => (
            <div key={d.id} className="card flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {DOCUMENT_TYPE_LABELS[d.type] ?? d.type}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {d.fileName} · {formatDate(d.createdAt)}
                  {d.reviewNotes ? ` · note: ${d.reviewNotes}` : ""}
                </p>
              </div>
              <div className="flex flex-none items-center gap-3">
                <StatusBadge status={d.status} />
                <a href={`/api/documents/${d.id}`} target="_blank" className="text-xs font-medium text-brand-600 hover:underline">
                  View
                </a>
                <form action={deleteDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No documents uploaded yet.</p>
      )}
    </div>
  );
}
