import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CompanyProfileForm } from "@/components/forms/CompanyProfileForm";
import { PageHeader } from "@/components/ui";
import { Notice } from "@/components/Badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Company profile" };

export default async function CompanyProfilePage() {
  const user = await requireRole("COMPANY");
  const profile = await prisma.companyProfile.findUnique({ where: { userId: user.id } });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={profile ? "Company profile" : "Set up your company"}
        subtitle={
          profile
            ? "Keep this current — contractors read it before deciding whether to quote."
            : "Just the basics. You can post your first requirement as soon as this is saved."
        }
      />

      {profile?.status === "REJECTED" && profile.moderationNotes && (
        <div className="mb-6">
          <Notice tone="warning">
            <strong className="font-semibold">Registration needs changes:</strong>{" "}
            {profile.moderationNotes}
          </Notice>
        </div>
      )}

      <CompanyProfileForm
        email={user.email}
        defaults={{
          companyName: profile?.companyName,
          natureOfBusiness: profile?.natureOfBusiness,
          industries: profile?.industries ?? [],
          manpowerBand: profile?.manpowerBand,
          categoriesUsed: profile?.categoriesUsed ?? [],
          entityType: profile?.entityType,
          website: profile?.website,
          contactName: profile?.contactName ?? user.name,
          contactDesignation: profile?.contactDesignation,
          contactMobile: profile?.contactMobile ?? user.mobile ?? "",
          contactEmail: profile?.contactEmail,
          city: profile?.city,
          district: profile?.district,
          state: profile?.state,
          pincode: profile?.pincode,
          gstin: profile?.gstin,
          pan: profile?.pan,
          cin: profile?.cin,
          about: profile?.about,
        }}
      />
    </div>
  );
}
