import { requireRole } from "@/lib/auth";
import { SubNav } from "@/components/SubNav";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/contractor", label: "Dashboard" },
  { href: "/contractor/profile", label: "Firm Profile" },
  { href: "/contractor/workforce", label: "Workforce" },
  { href: "/contractor/documents", label: "Verification" },
  { href: "/contractor/jobs", label: "Find Work" },
  { href: "/contractor/bids", label: "My Bids" },
];

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  await requireRole("CONTRACTOR");
  return (
    <div>
      <SubNav links={LINKS} />
      {children}
    </div>
  );
}
