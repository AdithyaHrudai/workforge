import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CompanyProfileForm } from "@/components/forms/CompanyProfileForm";
import { VerifiedBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function CompanyProfilePage() {
  const user = await requireRole("COMPANY");
  const profile = await prisma.companyProfile.findUnique({ where: { userId: user.id } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company profile</h1>
          <p className="text-sm text-slate-500">
            {profile ? "Update your company information." : "Set up your company to start posting jobs."}
          </p>
        </div>
        {profile?.verified && <VerifiedBadge />}
      </div>
      <CompanyProfileForm defaults={profile ?? {}} email={user.email} />
    </div>
  );
}
