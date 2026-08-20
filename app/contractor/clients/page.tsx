import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteClient } from "@/app/actions/contractor";
import { ClientForm } from "@/components/forms/ClientForm";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { Notice } from "@/components/Badge";
import { categoryShort, industryLabel } from "@/lib/constants";
import { formatNumber, yearRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Track record" };

export default async function ContractorClientsPage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) redirect("/contractor/profile");

  const clients = await prisma.contractorClient.findMany({
    where: { contractorId: profile.id },
    orderBy: [{ ongoing: "desc" }, { headcount: "desc" }, { startedYear: "desc" }],
  });

  const editing = searchParams.edit
    ? clients.find((c) => c.id === searchParams.edit)
    : undefined;

  const ongoing = clients.filter((c) => c.ongoing);
  const deployed = ongoing.reduce((sum, c) => sum + c.headcount, 0);
  const states = new Set(clients.map((c) => c.siteState));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Track record"
        subtitle="The clients you serve — which plants, which states, how many people. This is what companies look at first."
      />

      <Notice>
        A plant head hiring in Chhattisgarh wants a firm with people already on the ground there.
        Listing your sites is the fastest way to be that firm. Our team verifies entries against work
        orders and marks them with a tick.
      </Notice>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Clients listed" value={clients.length} />
        <StatCard label="Currently deployed" value={formatNumber(deployed)} hint="Across ongoing contracts" />
        <StatCard label="States covered" value={states.size} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        {/* min-w-0: a grid item defaults to min-width:auto, so without this the
            table's intrinsic width pushes the whole page wider than the phone. */}
        <section className="min-w-0">
          {clients.length === 0 ? (
            <EmptyState
              title="No clients listed yet"
              description="Add the companies you currently supply, and the ones you have supplied in the past. Both count."
            />
          ) : (
            <div className="card-flush overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Site</th>
                      <th>Manpower</th>
                      <th>Period</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id}>
                        <td>
                          <span className="font-medium text-slate-800">{client.clientName}</span>
                          {client.verified && (
                            <span className="ml-1 text-brand-600" title="Verified by WorkForge">
                              ✓
                            </span>
                          )}
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {client.industry ? industryLabel(client.industry) : ""}
                            {client.industry && client.category ? " · " : ""}
                            {client.category ? categoryShort(client.category) : ""}
                          </span>
                          {client.scope && (
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {client.scope}
                            </span>
                          )}
                        </td>
                        <td className="text-slate-600">
                          {client.siteCity}, {client.siteState}
                        </td>
                        <td className="font-semibold text-slate-900">
                          {client.headcount > 0 ? formatNumber(client.headcount) : "—"}
                        </td>
                        <td className="whitespace-nowrap text-slate-600">
                          {yearRange(client.startedYear, client.endedYear, client.ongoing)}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/contractor/clients?edit=${client.id}`}
                              className="btn-ghost btn-sm"
                            >
                              Edit
                            </Link>
                            <form action={deleteClient}>
                              <input type="hidden" name="id" value={client.id} />
                              <button
                                type="submit"
                                className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">
                {editing ? "Edit client" : "Add a client"}
              </h2>
              {editing && (
                <Link href="/contractor/clients" className="text-sm text-brand-700 hover:underline">
                  Cancel
                </Link>
              )}
            </div>

            <ClientForm
              key={editing?.id ?? "new"}
              defaults={
                editing
                  ? {
                      id: editing.id,
                      clientName: editing.clientName,
                      industry: editing.industry,
                      siteCity: editing.siteCity,
                      siteState: editing.siteState,
                      category: editing.category,
                      scope: editing.scope,
                      headcount: editing.headcount,
                      startedYear: editing.startedYear,
                      endedYear: editing.endedYear,
                      ongoing: editing.ongoing,
                    }
                  : {}
              }
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
