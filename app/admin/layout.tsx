import type { Metadata } from "next";

/**
 * Bare wrapper for everything under /admin.
 *
 * It deliberately holds no authentication. The sign-in page lives under this
 * path too, and a layout that guarded here could never render it. The gate is
 * one level down, in (panel)/layout.tsx, which wraps every route except the
 * login form.
 */
export const metadata: Metadata = {
  title: { default: "Verification console", template: "%s · WorkForge Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
