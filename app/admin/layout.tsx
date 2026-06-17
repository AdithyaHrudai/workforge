import { requireRole } from "@/lib/auth";
import { SubNav } from "@/components/SubNav";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/contractors", label: "Contractors" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");
  return (
    <div>
      <div className="mb-2">
        <span className="badge bg-slate-900 text-white">Admin</span>
      </div>
      <SubNav links={LINKS} />
      {children}
    </div>
  );
}
