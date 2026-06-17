import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge, VerifiedBadge } from "@/components/Badge";
import { parseTrades, formatDate } from "@/lib/utils";
import { tradeLabel, DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import {
  setContractorStatus,
  setContractorVerified,
  reviewDocument,
  setUserSuspended,
} from "@/app/actions/admin";

export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export default async function AdminContractorDetail({ params }: { params: { id: string } }) {
  await requireRole("ADMIN");
  const c = await prisma.contractorProfile.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      documents: { orderBy: { createdAt: "desc" } },
      _count: { select: { workers: true, bids: true, engagements: true } },
    },
  });
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/contractors" className="text-sm text-slate-500 hover:text-slate-800">
        ← All contractors
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{c.firmName}</h1>
            {c.verified && <VerifiedBadge />}
          </div>
          <p className="text-sm text-slate-500">
            {c.ownerName} · {c.city}, {c.state}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {c.user.status === "SUSPENDED" && <StatusBadge status="SUSPENDED" />}
          <StatusBadge status={c.status} />
        </div>
      </div>

      {/* Moderation actions */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Moderation</h2>
        <div className="flex flex-wrap gap-2">
          <form action={setContractorStatus}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="status" value="APPROVED" />
            <button className="btn-primary text-xs">Approve firm</button>
          </form>
          <form action={setContractorVerified}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="verified" value={(!c.verified).toString()} />
            <button className="btn-secondary text-xs">{c.verified ? "Remove verified badge" : "Grant verified badge"}</button>
          </form>
          <form action={setUserSuspended}>
            <input type="hidden" name="id" value={c.user.id} />
            <input type="hidden" name="suspend" value={(c.user.status !== "SUSPENDED").toString()} />
            <button className="btn-secondary text-xs text-red-600">
              {c.user.status === "SUSPENDED" ? "Unsuspend account" : "Suspend account"}
            </button>
          </form>
        </div>
        <form action={setContractorStatus} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="status" value="REJECTED" />
          <div className="flex-1">
            <label className="label">Reject / request changes — reason</label>
            <input name="notes" className="input" placeholder="What needs fixing?" />
          </div>
          <button className="btn-secondary text-xs text-red-600">Reject</button>
        </form>
        {c.moderationNotes && (
          <p className="text-xs text-slate-500">Last note: {c.moderationNotes}</p>
        )}
      </div>

      {/* Documents */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-slate-900">Verification documents</h2>
        {c.documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents uploaded.</p>
        ) : (
          c.documents.map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800">{DOCUMENT_TYPE_LABELS[d.type] ?? d.type}</p>
                  <p className="text-xs text-slate-500">
                    {d.fileName} · {formatDate(d.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={d.status} />
                  <a href={`/api/documents/${d.id}`} target="_blank" className="text-xs font-medium text-brand-600 hover:underline">
                    View file
                  </a>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <form action={reviewDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="decision" value="APPROVED" />
                  <button className="btn-secondary text-xs">Approve</button>
                </form>
                <form action={reviewDocument} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="decision" value="REJECTED" />
                  <input name="notes" className="input py-1 text-xs" placeholder="Reason (optional)" />
                  <button className="btn-secondary text-xs text-red-600">Reject</button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Profile detail */}
      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">Firm details</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Detail label="Entity type" value={c.entityType} />
          <Detail label="Year established" value={c.yearEstablished} />
          <Detail label="Contact" value={`${c.user.mobile ?? "—"} · ${c.user.email}`} />
          <Detail label="Service areas" value={c.serviceAreas} />
          <Detail label="Outstation" value={c.willingOutstation ? "Yes" : "No"} />
          <Detail label="Workforce" value={`${c.totalWorkforce} (${c.available} available)`} />
          <Detail label="Labour licence (CLRA)" value={c.labourLicenceNo} />
          <Detail label="GSTIN" value={c.gstin} />
          <Detail label="PAN" value={c.pan} />
          <Detail label="ESIC" value={c.esicNo} />
          <Detail label="EPF" value={c.epfNo} />
          <Detail label="Rating" value={c.rating > 0 ? `★ ${c.rating.toFixed(1)} (${c.ratingCount})` : "—"} />
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {parseTrades(c.trades).map((t) => (
            <span key={t} className="badge bg-slate-100 text-slate-600">
              {tradeLabel(t)}
            </span>
          ))}
        </div>
        {c.about && <p className="mt-3 text-sm text-slate-600">{c.about}</p>}
      </div>
    </div>
  );
}
