import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, Ph, Section } from "@/components/Legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What WorkForge collects from companies and contractors, who can see it, and how to have it corrected or erased.",
};

/**
 * Written against the Digital Personal Data Protection Act, 2023: a notice in
 * plain language, the purpose for each category, and a route to correction and
 * erasure. The section on who can see what describes the product's actual
 * behaviour rather than boilerplate — that section is the one users care about
 * and the one that must be kept true if the gating logic ever changes.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="This explains what we collect from companies and contractors, why we hold it, who is able to see it, and what you can ask us to do with it."
    >
      <Section heading="Who we are">
        <p>
          <Ph>{LEGAL.tradingName}</Ph> is operated by <Ph>{LEGAL.entityName}</Ph>
          {" ("}CIN <Ph>{LEGAL.cin}</Ph>
          {"), "}
          registered at <Ph>{LEGAL.registeredAddress}</Ph>. For the purposes of the Digital Personal
          Data Protection Act, 2023, we are the Data Fiduciary for the personal data described
          below. You can reach us at <Ph>{LEGAL.supportEmail}</Ph>.
        </p>
      </Section>

      <Section heading="What we collect">
        <Bullets
          items={[
            <>
              <strong>Account details</strong> — your name, email address, mobile number and
              password. Passwords are stored only as a bcrypt hash; we never hold the password
              itself and cannot tell you what it is.
            </>,
            <>
              <strong>Business profile</strong> — company or firm name, entity type, addresses,
              the sectors and states you work in, workforce numbers, and the contact person you
              nominate. This is the information other users search on.
            </>,
            <>
              <strong>Statutory identifiers</strong> — GSTIN, PAN and, for companies, the CLRA
              registration number, together with the certificates you upload.
            </>,
            <>
              <strong>Your activity on the platform</strong> — requirements posted, proposals
              submitted, messages exchanged inside an engagement, and the ratings filed after one.
            </>,
            <>
              <strong>Access records</strong> — an append-only log of privileged actions, including
              every occasion on which a member of our verification staff opens one of your
              documents. We keep this precisely so that access to your documents can be accounted
              for.
            </>,
            <>
              <strong>Session cookies</strong> — one cookie to keep you signed in. There is no
              advertising, no analytics and no third-party tracking on this platform, which is why
              you have not been asked to accept cookies.
            </>,
          ]}
        />
      </Section>

      <Section heading="Why we hold it">
        <p>
          To operate the marketplace you signed up for: to match requirements with contractors, to
          let the two sides evaluate and contact each other, to verify that a firm is real before
          granting it a verified badge, and to keep the platform free of fraud and abuse. We do not
          sell personal data, and we do not share it for anyone else&apos;s advertising.
        </p>
      </Section>

      <Section heading="Who can see what">
        <p>This is the part worth reading carefully. The platform is deliberately asymmetric:</p>
        <Bullets
          items={[
            <>
              <strong>A contractor&apos;s business profile</strong> — firm name, coverage, sectors,
              published client list, ratings — is visible to signed-in companies. That is the point
              of the directory.
            </>,
            <>
              <strong>A contractor&apos;s contact details</strong> are shown to signed-in companies,
              and each reveal is recorded against that company. Contractors: assume the phone number
              and email on your profile will be seen by buyers.
            </>,
            <>
              <strong>A company&apos;s contact details</strong> are shown to a contractor only once
              the two of you are in an awarded engagement. Before that, a contractor sees the
              requirement, not the person who posted it.
            </>,
            <>
              <strong>Uploaded documents are never shown to the other side.</strong> Only you and
              our verification staff can open them, and every staff view is logged against a named
              person. Other users see the verified badge, never the certificate behind it.
            </>,
            <>
              <strong>Messages</strong> are readable only by the two parties to that engagement.
              Administrators cannot read them.
            </>,
          ]}
        />
      </Section>

      <Section heading="Where it is processed">
        <p>
          The application and its database are hosted with our infrastructure providers in{" "}
          {LEGAL.hostingRegion}, which means your data is processed outside India. Sign-in with
          Google is optional and, if you use it, Google confirms your email address to us. Email is
          delivered through a transactional email provider. These providers act on our instructions
          and may not use your data for their own purposes.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          Your profile and account data are kept while your account is open. Verification documents
          are kept while the badge they support is current. Access and audit records are kept for as
          long as we may need to answer a question about who saw what — this log is append-only by
          design and cannot be edited. When you close your account we delete your profile and
          documents; we keep the minimum needed for legal and tax obligations and to preserve the
          integrity of ratings other firms relied on.
        </p>
      </Section>

      <Section heading="How we protect it">
        <p>
          Passwords are hashed, sessions are signed and can be revoked from every device at once,
          documents are served only to their owner over an authenticated request, uploads are
          checked by their actual file signature rather than the name they arrive with, and
          administrator access is a separate system with its own credentials and its own audit
          trail. No system is perfect; if we ever become aware of a breach affecting your data we
          will inform you and the Data Protection Board as the law requires.
        </p>
        <p>
          One thing we will not overstate: statutory identifiers you give us are checked for format
          only. We do not verify PAN, GSTIN or licence numbers against any government registry.
        </p>
      </Section>

      <Section heading="Your rights">
        <Bullets
          items={[
            <>
              <strong>Access</strong> — ask for a copy of the personal data we hold about you.
            </>,
            <>
              <strong>Correction</strong> — most of it you can edit yourself in{" "}
              <Link href="/account" className="font-medium text-brand-700 hover:underline">
                account settings
              </Link>{" "}
              and your profile pages. Email us for anything you cannot.
            </>,
            <>
              <strong>Erasure</strong> — ask us to close your account and delete your data. Write to{" "}
              <Ph>{LEGAL.supportEmail}</Ph> from your registered address and we will action it.
            </>,
            <>
              <strong>Withdraw consent</strong> — you can withdraw consent for optional processing
              at any time; where the processing is necessary to run your account, withdrawing it
              means closing the account.
            </>,
            <>
              <strong>Nominate</strong> — you may nominate someone to exercise these rights on your
              behalf in the event of death or incapacity.
            </>,
            <>
              <strong>Complain</strong> — to our Grievance Officer below, and after that to the Data
              Protection Board of India.
            </>,
          ]}
        />
      </Section>

      <Section heading="Children">
        <p>
          This is a business platform and is not intended for anyone under 18. We do not knowingly
          collect data from children.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If we change this policy materially we will tell registered users by email and update the
          date at the top. Continuing to use the platform after a change means you accept the
          updated policy.
        </p>
      </Section>

      <Section heading="Grievances">
        <p>
          Our Grievance Officer under the Information Technology (Intermediary Guidelines and
          Digital Media Ethics Code) Rules, 2021 and the DPDP Act is:
        </p>
        <p className="rounded-lg border border-slate-200 bg-white p-4">
          <span className="block font-semibold text-slate-900">
            <Ph>{LEGAL.grievanceOfficer.name}</Ph>
          </span>
          <span className="block">{LEGAL.grievanceOfficer.designation}</span>
          <span className="block">
            <Ph>{LEGAL.grievanceOfficer.email}</Ph> · <Ph>{LEGAL.grievanceOfficer.phone}</Ph>
          </span>
          <span className="block">
            <Ph>{LEGAL.registeredAddress}</Ph>
          </span>
        </p>
        <p>
          We acknowledge complaints within 24 hours and aim to resolve them within 15 days. See{" "}
          <Link href="/contact" className="font-medium text-brand-700 hover:underline">
            contact and grievances
          </Link>{" "}
          for what to include.
        </p>
      </Section>
    </LegalPage>
  );
}
