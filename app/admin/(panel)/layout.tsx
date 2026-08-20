import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

const PASSWORD_PATH = "/admin/account/password";

/**
 * The gate for the whole console.
 *
 * `requireAdmin` is called here *and* again inside every page and every server
 * action. That is not redundancy for its own sake: a layout in the App Router
 * does not re-run for a server action invoked from a page it wrapped, so a
 * layout check alone would leave the actions unguarded. The layout decides what
 * gets rendered; each action decides for itself what it will do.
 *
 * The password-rotation redirect is handled here rather than inside
 * `requireAdmin` so that the password page itself — which is inside this
 * layout — does not redirect to itself forever.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin({ allowPasswordChange: true });

  const pathname = headers().get("x-pathname") ?? "";
  if (admin.mustChangePassword && pathname !== PASSWORD_PATH) {
    redirect(PASSWORD_PATH);
  }

  // Queue badges in the sidebar. Cheap indexed counts, and they are the whole
  // reason an admin opens this console — knowing there is nothing waiting is as
  // useful as knowing there is.
  const [pendingContractors, pendingCompanies, pendingDocs] = await Promise.all([
    prisma.contractorProfile.count({ where: { status: "PENDING" } }),
    prisma.companyProfile.count({ where: { status: "PENDING" } }),
    prisma.document.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <AdminShell
      admin={admin}
      pendingCounts={{
        "/admin": pendingContractors + pendingCompanies + pendingDocs,
        "/admin/contractors": pendingContractors,
        "/admin/companies": pendingCompanies,
      }}
    >
      {children}
    </AdminShell>
  );
}
