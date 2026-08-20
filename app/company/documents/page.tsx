import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VerificationChecklist } from "@/components/forms/VerificationChecklist";
import { deleteCompanyDocument } from "@/app/actions/company";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { checklistRows, otherDocuments } from "@/lib/verification";
import { StatusBadge, VerifiedBadge, Notice } from "@/components/Badge";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Verification" };

/**
 * The company-side counterpart to /contractor/documents.
 *
 * A company answers one question the contractor is not asked: its CLRA
 * principal-employer registration. Under the Act the plant registers and the
 * contractor licences, so the two sides genuinely hold different papers.
 */
export default async function CompanyDocumentsPage() {
  const user = await requireRole("COMPANY");
  const profile = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          fileName: true,
          status: true,
          reviewNotes: true,
          createdAt: true,
        },
      },
    },
  });

  if (!profile) {
    return (
      <div className="card">
        <p className="text-sm text-slate-600">
          Please{" "}
          <Link href="/company/profile" className="font-medium text-brand-600 hover:underline">
            complete your company profile
          </Link>{" "}
          before uploading documents.
        </p>
      </div>
    );
  }

  const rows = checklistRows("COMPANY", profile, profile.documents);
  const legacy = otherDocuments("COMPANY", profile.documents);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification"
        subtitle="Three questions. Answer each one, and where the answer is yes give us the number and the certificate. Contractors see the verified badge, never the documents."
        action={profile.verified ? <VerifiedBadge /> : <StatusBadge status={profile.status} />}
      />

      <Notice>
        These files are visible only to WorkForge verification staff, and every
        time one of them opens a document it is recorded against their name.
        Contractors and other companies never see them.
      </Notice>

      <VerificationChecklist
        side="COMPANY"
        items={rows.map((r) => ({
          type: r.item.value,
          label: r.item.label,
          question: r.item.question,
          idLabel: r.item.idLabel,
          idPlaceholder: r.item.idPlaceholder,
          answer: r.answer,
          idNumber: r.idNumber,
          document: r.document,
        }))}
      />

      {legacy.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Other documents on file</h2>
          {legacy.map((d) => (
            <div key={d.id} className="card flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {DOCUMENT_TYPE_LABELS[d.type] ?? d.type}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {d.fileName} · {formatDate(d.createdAt)}
                </p>
              </div>
              <div className="flex flex-none items-center gap-3">
                <StatusBadge status={d.status} />
                <a
                  href={`/api/documents/${d.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  View
                </a>
                <form action={deleteCompanyDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="text-xs font-medium text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
