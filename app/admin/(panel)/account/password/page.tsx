import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { ChangeAdminPasswordForm } from "@/components/admin/ChangeAdminPasswordForm";
import { PageHeader } from "@/components/ui";
import { Notice } from "@/components/Badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Change password" };

/**
 * The one page an admin with a pending rotation is allowed to reach — hence
 * `allowPasswordChange`. The panel layout sends them here and, until they
 * change it, sends them back here from anywhere else.
 */
export default async function AdminPasswordPage() {
  const admin = await requireAdmin({ allowPasswordChange: true });

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <PageHeader
        title="Change your password"
        subtitle={`Signed in as ${admin.username} (${admin.adminCode}).`}
      />

      {admin.mustChangePassword && (
        <Notice tone="warning">
          You must set a new password before using the console. The one you have
          was chosen by whoever issued your account, so until you change it, they
          know it too — and nothing you approve can be attributed to you alone.
        </Notice>
      )}

      <ChangeAdminPasswordForm />

      <p className="text-xs text-slate-500">
        Every other browser signed in as you will be signed out. This one stays
        signed in.
      </p>
    </div>
  );
}
