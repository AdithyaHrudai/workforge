import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WorkerForm } from "@/components/forms/WorkerForm";
import { deleteWorker } from "@/app/actions/contractor";
import { tradeLabel } from "@/lib/constants";
import { formatINR } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WorkforcePage() {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: user.id },
    include: { workers: { orderBy: { createdAt: "desc" } } },
  });

  if (!profile) {
    return (
      <div className="card">
        <p className="text-sm text-slate-600">
          Please{" "}
          <Link href="/contractor/profile" className="font-medium text-brand-600 hover:underline">
            complete your firm profile
          </Link>{" "}
          before adding workforce.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Workforce</h1>
        <p className="text-sm text-slate-500">
          {profile.workers.length} worker record(s). These help companies see your real capacity.
        </p>
      </div>

      <WorkerForm />

      {profile.workers.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Trade</th>
                <th className="px-4 py-3">Skill</th>
                <th className="px-4 py-3">Exp.</th>
                <th className="px-4 py-3">Wage</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profile.workers.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{w.name}</td>
                  <td className="px-4 py-3">{tradeLabel(w.trade)}</td>
                  <td className="px-4 py-3 capitalize">{w.skillLevel.toLowerCase()}</td>
                  <td className="px-4 py-3">{w.yearsExperience ?? "—"} yr</td>
                  <td className="px-4 py-3">{formatINR(w.expectedDailyWage)}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteWorker}>
                      <input type="hidden" name="id" value={w.id} />
                      <button className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
