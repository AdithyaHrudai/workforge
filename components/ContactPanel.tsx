import type { ContactView } from "@/lib/contacts";

/**
 * Renders a party's contact details, honouring whatever the server decided
 * about visibility. When gating is off — which is how the platform ships — this
 * is simply a contact card; the masked branch is what turns on later.
 */
export function ContactPanel({
  title = "Contact",
  contact,
  note,
}: {
  title?: string;
  contact: ContactView;
  note?: string;
}) {
  return (
    <div className="card">
      <h2 className="mb-3 font-semibold text-slate-900">{title}</h2>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Name</dt>
          <dd className="text-right font-medium text-slate-800">{contact.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Mobile</dt>
          <dd className="text-right font-medium text-slate-800">
            {contact.revealed ? (
              <a href={`tel:${contact.mobile}`} className="text-brand-700 hover:underline">
                {contact.mobile}
              </a>
            ) : (
              <span className="font-mono tracking-wide text-slate-400">{contact.mobile}</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Email</dt>
          <dd className="min-w-0 text-right font-medium text-slate-800">
            {contact.revealed ? (
              <a
                href={`mailto:${contact.email}`}
                className="block truncate text-brand-700 hover:underline"
              >
                {contact.email}
              </a>
            ) : (
              <span className="font-mono text-slate-400">{contact.email}</span>
            )}
          </dd>
        </div>
      </dl>

      {!contact.revealed && (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          {contact.reason === "QUOTA_EXHAUSTED"
            ? "You've used all your contact reveals for this month. Contact details unlock automatically once this contractor proposes on one of your requirements."
            : "Contact details are visible to registered companies."}
        </div>
      )}

      {contact.revealed && contact.remaining != null && (
        <p className="mt-3 text-xs text-slate-500">
          {contact.remaining} contact {contact.remaining === 1 ? "reveal" : "reveals"} left this
          month.
        </p>
      )}

      {note && <p className="mt-3 text-xs text-slate-500">{note}</p>}
    </div>
  );
}
