import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { updateSettings } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  await requireRole("ADMIN");
  const s = await getSettings();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Platform settings</h1>

      <form action={updateSettings} className="card space-y-4">
        <div>
          <label className="label">Platform name</label>
          <input name="platformName" defaultValue={s.platformName} className="input" />
        </div>
        <div>
          <label className="label">Platform fee (%)</label>
          <input
            name="platformFeePercent"
            type="number"
            step="0.5"
            min={0}
            max={30}
            defaultValue={s.platformFeePercent}
            className="input"
          />
          <p className="mt-1 text-xs text-slate-500">
            Shown on engagements as an estimate. Applied to new engagements created after saving.
          </p>
        </div>
        <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm">
          <input type="checkbox" name="paymentsEnabled" defaultChecked={s.paymentsEnabled} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
          <span>
            <span className="font-medium text-slate-800">Enable online fee collection</span>
            <span className="block text-xs text-slate-500">
              Leave OFF until a payment-aggregator merchant account (Razorpay/Cashfree) with business
              KYC is connected. This flag only controls display copy today — no live payment code is
              wired yet.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm">
          <input
            type="checkbox"
            name="requireCompanyApproval"
            defaultChecked={s.requireCompanyApproval}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="font-medium text-slate-800">Require admin approval before a company can post jobs</span>
            <span className="block text-xs text-slate-500">
              Turn ON to vet every company before its requirements reach contractors — this stops
              unverified buyers harvesting bids, but you must work the queue under Companies. Leave
              OFF to let companies post as soon as they complete a profile.
            </span>
          </span>
        </label>
        <button className="btn-primary">Save settings</button>
      </form>

      <div className="card text-sm text-slate-600">
        <h2 className="font-semibold text-slate-900">Going live with payments — checklist</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-500">
          <li>Register the platform business entity (Pvt Ltd / LLP) and get GST.</li>
          <li>Open a payment-aggregator account (Razorpay Route / Cashfree Easy Split) for marketplace settlements.</li>
          <li>Complete KYC and accept the RBI PA-compliance terms.</li>
          <li>Add API keys as environment variables and wire the checkout in the engagement flow.</li>
        </ul>
      </div>
    </div>
  );
}
