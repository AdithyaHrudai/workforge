import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  await requireRole("CONTRACTOR");
  return <>{children}</>;
}
