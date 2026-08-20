import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequirementCard } from "@/components/RequirementCard";
import { EmptyState, PageHeader } from "@/components/ui";
import { CATEGORY_OPTIONS, isValidCategory } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My requirements" };

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "AWARDED", label: "Awarded" },
  { value: "CLOSED", label: "Closed" },
];

export default async function CompanyRequirementsPage({
  searchParams,
}: {
  searchParams: { status?: string; category?: string };
}) {
  const user = await requireRole("COMPANY");
  const company = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!company) redirect("/company/profile");

  const status = STATUS_TABS.some((t) => t.value === searchParams.status)
    ? searchParams.status
    : "";
  const category =
    searchParams.category && isValidCategory(searchParams.category)
      ? searchParams.category
      : undefined;

  const requirements = await prisma.requirement.findMany({
    where: {
      companyId: company.id,
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
    },
    include: { roles: true, _count: { select: { proposals: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const linkFor = (next: { status?: string; category?: string }) => {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    const c = next.category ?? category;
    if (s) params.set("status", s);
    if (c) params.set("category", c);
    const qs = params.toString();
    return qs ? `/company/requirements?${qs}` : "/company/requirements";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My requirements"
        subtitle="Everything you've posted, with the proposals against each."
        action={
          <Link href="/company/requirements/new" className="btn-primary">
            Post a requirement
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value || "all"}
              href={linkFor({ status: tab.value })}
              className={
                tab.value === status
                  ? "btn btn-sm bg-brand-700 text-white"
                  : "btn btn-sm bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
              }
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Link
            href={linkFor({ category: "" })}
            className={
              !category
                ? "chip bg-brand-100 text-brand-800"
                : "chip hover:bg-slate-200"
            }
          >
            All types
          </Link>
          {CATEGORY_OPTIONS.map((c) => (
            <Link
              key={c.value}
              href={linkFor({ category: c.value })}
              className={
                category === c.value
                  ? "chip bg-brand-100 text-brand-800"
                  : "chip hover:bg-slate-200"
              }
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {requirements.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description={
            status || category
              ? "No requirements match this filter."
              : "Post your first requirement and matching contractors will see it straight away."
          }
          action={
            <Link href="/company/requirements/new" className="btn-primary">
              Post a requirement
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4">
          {requirements.map((requirement) => (
            <RequirementCard
              key={requirement.id}
              requirement={requirement}
              href={`/company/requirements/${requirement.id}`}
              showCompany={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
