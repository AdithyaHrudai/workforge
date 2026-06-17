import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEngagementWithParties, isParticipant } from "@/lib/engagements";
import { MessageThread } from "@/components/MessageThread";
import { StatusBadge } from "@/components/Badge";
import { JobSummary } from "@/components/JobSummary";
import { formatINR } from "@/lib/utils";
import {
  completeEngagement,
  cancelEngagement,
  rateContractor,
  rateCompany,
} from "@/app/actions/engagement";

export const dynamic = "force-dynamic";

function ContactCard({
  title,
  name,
  org,
  mobile,
  email,
}: {
  title: string;
  name: string;
  org: string;
  mobile: string | null;
  email: string;
}) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 font-semibold text-slate-900">{org}</p>
      <p className="text-sm text-slate-600">{name}</p>
      <div className="mt-2 space-y-1 text-sm">
        <p>
          📞{" "}
          <a href={`tel:${mobile ?? ""}`} className="text-brand-700 hover:underline">
            {mobile ?? "—"}
          </a>
        </p>
        <p>
          ✉️{" "}
          <a href={`mailto:${email}`} className="text-brand-700 hover:underline">
            {email}
          </a>
        </p>
      </div>
    </div>
  );
}

function RatingForm({
  id,
  action,
  label,
}: {
  id: string;
  action: (formData: FormData) => void;
  label: string;
}) {
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-slate-600">{label}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          name="rating"
          value={n}
          className="text-xl text-amber-400 hover:scale-110"
          title={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </form>
  );
}

export default async function EngagementDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const eng = await getEngagementWithParties(params.id);
  if (!eng) notFound();
  if (!isParticipant(eng, user.id) && user.role !== "ADMIN") redirect("/engagements");

  const meId = user.id;
  const isCompany = eng.company.user.id === meId;
  const otherName = isCompany ? eng.contractor.firmName : eng.company.companyName;
  const active = eng.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/engagements" className="text-sm text-slate-500 hover:text-slate-800">
            ← Engagements
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{eng.job.title}</h1>
        </div>
        <StatusBadge status={eng.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ContactCard
          title="Company"
          org={eng.company.companyName}
          name={eng.company.user.name}
          mobile={eng.company.contactMobile ?? eng.company.user.mobile}
          email={eng.company.contactEmail ?? eng.company.user.email}
        />
        <ContactCard
          title="Contractor"
          org={eng.contractor.firmName}
          name={eng.contractor.user.name}
          mobile={eng.contractor.user.mobile}
          email={eng.contractor.user.email}
        />
      </div>

      {/* Agreed terms + platform fee */}
      <div className="card">
        <h2 className="font-semibold text-slate-900">Agreed terms</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-500">Rate / worker / day</dt>
            <dd className="font-medium">{formatINR(eng.bid.ratePerWorkerPerDay)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Headcount</dt>
            <dd className="font-medium">{eng.bid.headcountOffered}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Est. contract value</dt>
            <dd className="font-medium">{formatINR(eng.estimatedValue)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Platform fee ({eng.platformFeePercent}%)</dt>
            <dd className="font-medium">{formatINR(eng.estimatedFee)}</dd>
          </div>
        </dl>
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Platform fee is an estimate shown for transparency. Online fee collection is disabled until
          a payment-aggregator merchant account is connected — no money moves through ShramSetu yet.
        </p>
      </div>

      {/* Messaging */}
      <MessageThread engagementId={eng.id} meId={meId} otherName={otherName} active={active} />

      {/* Lifecycle + ratings */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-slate-900">Manage engagement</h2>
        {active && (
          <div className="flex flex-wrap gap-2">
            <form action={completeEngagement}>
              <input type="hidden" name="id" value={eng.id} />
              <button className="btn-primary text-sm">Mark as completed</button>
            </form>
            <form action={cancelEngagement}>
              <input type="hidden" name="id" value={eng.id} />
              <button className="btn-secondary text-sm text-red-600">Cancel engagement</button>
            </form>
          </div>
        )}

        {eng.status === "COMPLETED" && (
          <div className="space-y-2">
            {isCompany ? (
              eng.contractorRating ? (
                <p className="text-sm text-slate-600">You rated this contractor {eng.contractorRating}★.</p>
              ) : (
                <RatingForm id={eng.id} action={rateContractor} label="Rate this contractor:" />
              )
            ) : eng.companyRating ? (
              <p className="text-sm text-slate-600">You rated this company {eng.companyRating}★.</p>
            ) : (
              <RatingForm id={eng.id} action={rateCompany} label="Rate this company:" />
            )}
          </div>
        )}
      </div>

      <details className="text-sm text-slate-500">
        <summary className="cursor-pointer">View full job details</summary>
        <div className="mt-3">
          <JobSummary job={eng.job} />
        </div>
      </details>
    </div>
  );
}
