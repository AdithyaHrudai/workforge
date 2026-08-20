import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, Ph, Section } from "@/components/Legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The rules for using WorkForge: what the platform is, what it is not, and what each side is responsible for.",
};

/**
 * The clause that matters most here is the second one. A manpower marketplace
 * that is vague about whether it is a party to the contract, or about what its
 * verified badge actually means, is the kind of vagueness that ends up in front
 * of a labour court.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro="These terms govern your use of the platform. By registering you agree to them, on your own behalf and on behalf of the firm you represent."
    >
      <Section heading="1. Who may use this">
        <p>
          You must be at least 18 and authorised to act for the company or contracting firm you
          register. One account represents one firm; do not share credentials. You are responsible
          for everything done through your account, which is why we give you the ability to change
          your password and sign out of every device from{" "}
          <Link href="/account" className="font-medium text-brand-700 hover:underline">
            account settings
          </Link>
          .
        </p>
      </Section>

      <Section heading="2. What WorkForge is — and is not">
        <p>
          <Ph>{LEGAL.tradingName}</Ph> is a discovery and communication platform. Companies describe
          contract manpower requirements; contractors respond. That is the whole of our role.
        </p>
        <Bullets
          items={[
            <>
              We are <strong>not a party</strong> to any contract you conclude with the other side.
              Scope, rates, payment terms, deployment and disputes are entirely between you.
            </>,
            <>
              We are <strong>not an employer</strong>, a contractor, a staffing agency or a
              principal employer, and nothing here creates an employment, agency or partnership
              relationship between us and you or the workers deployed.
            </>,
            <>
              We do not guarantee that any requirement will attract proposals, that any contractor
              will perform, or that any company will pay.
            </>,
            <>
              Statutory compliance — CLRA registration and licensing, PF, ESI, wages, safety,
              returns — remains the responsibility of the company and the contractor concerned. We
              neither discharge nor supervise those obligations.
            </>,
          ]}
        />
      </Section>

      <Section heading="3. What verification means">
        <p>
          A verified badge means a member of our team looked at the certificate uploaded by the firm
          and found it consistent with the details on its profile. It means nothing more than that.
          In particular, we do <strong>not</strong> check PAN, GSTIN, or licence numbers against any
          government registry; those are validated for format only. A badge is not a credit rating,
          not an endorsement, and not a warranty of performance or compliance. Do your own due
          diligence before you contract.
        </p>
      </Section>

      <Section heading="4. What you publish">
        <p>
          You are responsible for the accuracy of everything you put on the platform — profile
          details, published client lists, headcounts, rates and requirements. Do not publish a
          client relationship you cannot evidence, or a certificate that is not yours. You grant us
          the right to display the business information you publish to other signed-in users, and to
          show your firm in search results and directory pages.
        </p>
      </Section>

      <Section heading="5. Ratings and reviews">
        <p>
          Ratings may be filed only by a company that actually engaged the contractor, against the
          five published parameters, and must reflect a genuine experience. We may remove a rating
          that is abusive, defamatory, contains personal data, or appears to be traded for
          consideration. We do not remove a rating merely because it is unfavourable.
        </p>
      </Section>

      <Section heading="6. Contact details and acceptable use">
        <p>
          Contact details revealed on the platform are for pursuing a genuine engagement. You may
          not scrape, bulk-export, resell or add them to a marketing list. Every reveal is recorded
          against your account.
        </p>
        <p>You also agree not to:</p>
        <Bullets
          items={[
            "post anything unlawful, misleading, obscene, defamatory or infringing, or anything that impersonates another firm",
            "advertise a requirement or a capability you do not have, or post the same requirement repeatedly to occupy the feed",
            "attempt to access another user's account, documents or messages, or probe, scan or overload the platform",
            "use automated means to register accounts or submit proposals",
          ]}
        />
        <p>
          We may remove content and suspend or close an account that breaches these terms, ordinarily
          with notice and immediately where the breach is serious.
        </p>
      </Section>

      <Section heading="7. Fees">
        <p>
          Registering, posting requirements and submitting proposals are free today. If we introduce
          paid features we will say so clearly in advance; nothing will be charged to you without
          your agreement.
        </p>
      </Section>

      <Section heading="8. Availability">
        <p>
          We work to keep the platform available but do not promise uninterrupted service. We may
          change, suspend or withdraw features, and we may take the platform down for maintenance.
        </p>
      </Section>

      <Section heading="9. Liability">
        <p>
          To the extent permitted by law, we are not liable for loss of profit, loss of contract,
          loss of data, or any indirect or consequential loss arising from your use of the platform
          or from any dealing with another user. Our total liability to you for any claim is limited
          to the amounts you have paid us in the twelve months before the claim — which, while the
          platform is free, is nil. Nothing here excludes liability that cannot lawfully be
          excluded.
        </p>
      </Section>

      <Section heading="10. Closing your account">
        <p>
          You can ask us to close your account at any time by writing to <Ph>{LEGAL.supportEmail}</Ph>{" "}
          from your registered address. Some records — audit entries and ratings other firms relied
          on — survive closure, as explained in the{" "}
          <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </Section>

      <Section heading="11. Governing law">
        <p>
          These terms are governed by the laws of India, and the courts at{" "}
          <Ph>{LEGAL.jurisdictionCity}</Ph>, <Ph>{LEGAL.jurisdictionState}</Ph> have exclusive
          jurisdiction.
        </p>
      </Section>

      <Section heading="12. Grievances">
        <p>
          Complaints about content or conduct on the platform go to our Grievance Officer,{" "}
          <Ph>{LEGAL.grievanceOfficer.name}</Ph>, at <Ph>{LEGAL.grievanceOfficer.email}</Ph>. We
          acknowledge within 24 hours and aim to resolve within 15 days — see{" "}
          <Link href="/contact" className="font-medium text-brand-700 hover:underline">
            contact and grievances
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
