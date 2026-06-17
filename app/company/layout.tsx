import { requireRole } from "@/lib/auth";
import { SubNav } from "@/components/SubNav";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/company", label: "Dashboard" },
  { href: "/company/jobs", label: "My Jobs" },
  { href: "/company/jobs/new", label: "Post a Job" },
  { href: "/company/contractors", label: "Find Contractors" },
  { href: "/company/profile", label: "Company Profile" },
];

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  await requireRole("COMPANY");
  return (
    <div>
      <SubNav links={LINKS} />
      {children}
    </div>
  );
}
