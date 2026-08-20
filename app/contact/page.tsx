import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, Ph, Section } from "@/components/Legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Contact and grievances",
  description:
    "How to reach WorkForge support, and how to raise a formal grievance with our Grievance Officer.",
};

/**
 * Publishing the Grievance Officer's name and contact is a requirement for an
 * intermediary under the IT Rules, 2021 — not a courtesy page. It is kept
 * separate from the policies so it can be linked to directly, which is what a
 * complainant (or a regulator) will look for.
 */
export default function ContactPage() {
  return (
    <LegalPage
      title="Contact and grievances"
      intro="Ordinary questions go to support. Formal complaints about content, conduct or your personal data go to our Grievance Officer, who is named below as the law requires."
    >
      <Section heading="Support">
        <p>
          Email <Ph>{LEGAL.supportEmail}</Ph> for help with your account, a profile that will not
          save, a document rejected in verification, or anything else about using the platform.
          Write from the address your account is registered with — it is how we know it is you.
        </p>
        <p>
          Two things support can do that the app cannot: change the email address on an account, and
          close an account and delete its data.
        </p>
      </Section>

      <Section heading="Grievance Officer">
        <p>
          Appointed under the Information Technology (Intermediary Guidelines and Digital Media
          Ethics Code) Rules, 2021 and the Digital Personal Data Protection Act, 2023.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-900">
            <Ph>{LEGAL.grievanceOfficer.name}</Ph>
          </p>
          <p>{LEGAL.grievanceOfficer.designation}</p>
          <p>
            <Ph>{LEGAL.grievanceOfficer.email}</Ph>
          </p>
          <p>
            <Ph>{LEGAL.grievanceOfficer.phone}</Ph>
          </p>
          <p className="mt-2 text-slate-600">
            <Ph>{LEGAL.entityName}</Ph>
            <br />
            <Ph>{LEGAL.registeredAddress}</Ph>
          </p>
        </div>
      </Section>

      <Section heading="What happens to a complaint">
        <Bullets
          items={[
            "We acknowledge it within 24 hours of receipt.",
            "We aim to dispose of it within 15 days, and will tell you what we decided and why.",
            "Where the complaint concerns content that is unlawful on its face, we act sooner.",
            <>
              If you are not satisfied with the outcome of a data-protection complaint, you may
              approach the Data Protection Board of India.
            </>,
          ]}
        />
      </Section>

      <Section heading="What to include">
        <Bullets
          items={[
            "your name and the firm you represent, and the email address on the account",
            "what the complaint is about — a profile, a requirement, a proposal, a rating or a message — with a link or the exact wording",
            "what you would like us to do, and why",
            "for a data-protection request: whether you want access, correction, erasure, or to withdraw consent",
          ]}
        />
      </Section>

      <Section heading="The policies">
        <p>
          <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
            Privacy policy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="font-medium text-brand-700 hover:underline">
            Terms of use
          </Link>
        </p>
      </Section>
    </LegalPage>
  );
}
