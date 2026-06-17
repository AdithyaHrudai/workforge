import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { JobForm } from "@/components/forms/JobForm";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const user = await requireRole("COMPANY");
  const company = await prisma.companyProfile.findUnique({ where: { userId: user.id } });

  if (!company) {
    return (
      <div className="card">
        <p className="text-sm text-slate-600">
          Please{" "}
          <Link href="/company/profile" className="font-medium text-brand-600 hover:underline">
            complete your company profile
          </Link>{" "}
          before posting a job.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Post a requirement</h1>
        <p className="text-sm text-slate-500">
          Describe the manpower you need. Verified contractors in the area will be matched and can bid.
        </p>
      </div>
      <JobForm />
    </div>
  );
}
