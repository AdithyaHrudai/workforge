import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { RequirementForm } from "@/components/forms/RequirementForm";
import { PageHeader } from "@/components/ui";
import { Notice } from "@/components/Badge";
import { isValidCategory } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Post a requirement" };

export default async function NewRequirementPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const user = await requireRole("COMPANY");
  const company = await prisma.companyProfile.findUnique({ where: { userId: user.id } });
  if (!company) redirect("/company/profile");

  const settings = await getSettings();
  if (settings.requireCompanyApproval && company.status !== "APPROVED") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Post a requirement" />
        <Notice tone="warning">
          {company.status === "REJECTED" ? (
            <>
              Your company registration was not approved
              {company.moderationNotes ? `: ${company.moderationNotes}` : "."}{" "}
              <Link href="/company/profile" className="font-semibold underline">
                Update your profile
              </Link>
              .
            </>
          ) : (
            "Your company is awaiting verification. You'll be able to post requirements as soon as it's approved — usually within a working day."
          )}
        </Notice>
      </div>
    );
  }

  // The category can be pre-selected from the dashboard tiles; anything else
  // falls back to whatever the company said it engages.
  const fromQuery =
    searchParams.category && isValidCategory(searchParams.category)
      ? searchParams.category
      : undefined;
  const defaultCategory = fromQuery ?? company.categoriesUsed[0];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Post a requirement"
        subtitle="Contractors matching your contract type, sector and region will see this immediately."
      />
      <RequirementForm
        defaultCategory={defaultCategory}
        companyIndustries={company.industries}
      />
    </div>
  );
}
