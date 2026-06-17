import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContractorProfileForm } from "@/components/forms/ContractorProfileForm";
import { parseTrades } from "@/lib/utils";
import { StatusBadge, VerifiedBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function ContractorProfilePage() {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Firm profile</h1>
          <p className="text-sm text-slate-500">
            {profile ? "Keep your details current to win more work." : "Set up your firm to start bidding."}
          </p>
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            {profile.verified && <VerifiedBadge />}
            <StatusBadge status={profile.status} />
          </div>
        )}
      </div>

      {profile && profile.status === "PENDING" && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          Your firm is awaiting admin approval. You can complete your profile and upload documents
          now; you&apos;ll be able to bid once approved.
        </div>
      )}

      <ContractorProfileForm
        defaults={{
          ...profile,
          trades: parseTrades(profile?.trades),
        }}
      />
    </div>
  );
}
