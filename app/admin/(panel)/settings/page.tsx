import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/settings";
import { updateSettings } from "@/app/actions/admin";
import { PageHeader } from "@/components/ui";
import { Notice } from "@/components/Badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Platform settings" };

function Toggle({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-slate-50 p-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
      </span>
    </label>
  );
}

export default async function AdminSettings() {
  await requireSuperAdmin();
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Platform settings"
        subtitle="Moderation gates and contact visibility."
      />

      <form action={updateSettings} className="card space-y-4">
        <div>
          <label className="label" htmlFor="platformName">
            Platform name
          </label>
          <input
            id="platformName"
            name="platformName"
            defaultValue={settings.platformName}
            className="input"
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="section-title mb-1">Moderation</legend>

          <Toggle
            name="requireContractorApproval"
            title="Require approval before a contractor can submit proposals"
            defaultChecked={settings.requireContractorApproval}
            description="Recommended ON. An unvetted firm quoting on live requirements is the first thing companies complain about. Work the queue under Contractors."
          />

          <Toggle
            name="requireCompanyApproval"
            title="Require approval before a company can post requirements"
            defaultChecked={settings.requireCompanyApproval}
            description="OFF by default so the marketplace isn't gated on manual review from day one. Turn ON once there is an ops team to work the Companies queue."
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="section-title mb-1">Contact visibility</legend>

          <Toggle
            name="contactMaskingEnabled"
            title="Mask contractor contact details in search"
            defaultChecked={settings.contactMaskingEnabled}
            description="OFF today, by design — the platform is deliberately open while the network grows. Turning it ON masks phone and email in search and meters reveals against the quota below. Reveals are already being recorded either way, so switching this on needs no migration."
          />

          <div>
            <label className="label" htmlFor="freeContactRevealsPerMonth">
              Free contact reveals per company, per month
            </label>
            <input
              id="freeContactRevealsPerMonth"
              name="freeContactRevealsPerMonth"
              type="number"
              min={0}
              max={1000}
              defaultValue={settings.freeContactRevealsPerMonth}
              className="input max-w-[10rem]"
            />
            <p className="hint">
              Only applies when masking is on. Set 0 for unlimited. Contractors who have proposed on
              a company&apos;s own requirement are never metered.
            </p>
          </div>
        </fieldset>

        <button className="btn-primary" type="submit">
          Save settings
        </button>
      </form>

      <Notice>
        <strong className="font-semibold">No payments are integrated.</strong> WorkForge takes no
        commission and processes no money — companies and contractors invoice each other directly
        through the GST system. If a paid tier is introduced later, the contact-reveal history
        recorded today is what it will meter against.
      </Notice>
    </div>
  );
}
