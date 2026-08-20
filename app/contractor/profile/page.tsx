import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContractorProfileForm } from "@/components/forms/ContractorProfileForm";
import { Notice, StatusBadge } from "@/components/Badge";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Firm profile" };

export default async function ContractorProfilePage() {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: user.id },
    include: { capacities: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={profile ? "Firm profile" : "Set up your firm"}
        subtitle={
          profile
            ? "This is what companies see when they search. Keep your capacity and coverage current."
            : "Tell us what you take on and where you operate — this is what gets you found."
        }
        action={profile ? <StatusBadge status={profile.status} /> : undefined}
      />

      {profile?.status === "PENDING" && (
        <div className="mb-6">
          <Notice tone="warning">
            Your firm is awaiting approval, so it isn&apos;t in company searches yet and you
            can&apos;t submit proposals.{" "}
            <Link href="/contractor/documents" className="font-semibold underline">
              Upload your licence and registration documents
            </Link>{" "}
            to speed this up.
          </Notice>
        </div>
      )}

      {profile?.status === "REJECTED" && (
        <div className="mb-6">
          <Notice tone="warning">
            <strong className="font-semibold">Your registration needs changes:</strong>{" "}
            {profile.moderationNotes ?? "Please review your details and resubmit."}
          </Notice>
        </div>
      )}

      {profile && (
        <div className="mb-6">
          <Notice>
            Your track record is the single biggest factor companies weigh.{" "}
            <Link href="/contractor/clients" className="font-semibold underline">
              Add the clients you serve
            </Link>{" "}
            — company, plant, state and manpower deployed.
          </Notice>
        </div>
      )}

      <ContractorProfileForm
        defaults={{
          firmName: profile?.firmName,
          entityType: profile?.entityType,
          ownerName: profile?.ownerName ?? user.name,
          ownerDesignation: profile?.ownerDesignation,
          yearEstablished: profile?.yearEstablished,
          website: profile?.website,
          address: profile?.address,
          city: profile?.city,
          district: profile?.district,
          state: profile?.state,
          pincode: profile?.pincode,
          presenceStates: profile?.presenceStates ?? [],
          workerSourceStates: profile?.workerSourceStates ?? [],
          categories: profile?.categories ?? [],
          industries: profile?.industries ?? [],
          roles: profile?.roles ?? [],
          willingOutstation: profile?.willingOutstation,
          pan: profile?.pan,
          gstin: profile?.gstin,
          udyamNo: profile?.udyamNo,
          labourLicenceNo: profile?.labourLicenceNo,
          esicNo: profile?.esicNo,
          epfNo: profile?.epfNo,
          totalWorkforce: profile?.totalWorkforce,
          availableNow: profile?.availableNow,
          mobilizationDays: profile?.mobilizationDays,
          about: profile?.about,
          capacities: profile?.capacities.map((c) => ({
            category: c.category,
            strength: c.strength,
          })),
        }}
      />
    </div>
  );
}
