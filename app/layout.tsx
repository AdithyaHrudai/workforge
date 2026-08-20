import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "WorkForge — India's contract manpower marketplace",
    template: "%s · WorkForge",
  },
  description:
    "WorkForge connects plants and project sites with verified manpower contractors across India. Post white-collar and blue-collar staffing requirements, job contracts and unskilled supply — then compare contractors on their track record, regional presence and compliance record.",
  openGraph: {
    type: "website",
    siteName: "WorkForge",
    title: "WorkForge — India's contract manpower marketplace",
    description:
      "Post a requirement, compare verified contractors on track record and regional presence, and award the work.",
  },
};

const FOOTER_LINKS = [
  { href: "/about", label: "How it works" },
  { href: "/for-companies", label: "For companies" },
  { href: "/for-contractors", label: "For contractors" },
  // Reachable from every page, which is what makes them findable by a user
  // with a complaint — and what the IT Rules expect of an intermediary.
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The admin console is a separate application that happens to share an
  // origin: different sign-in, different session, different audience. It brings
  // its own header and must not render the marketplace navbar — which, having
  // no marketplace session to read, would otherwise invite a signed-in admin to
  // "Log in" or "Get started".
  //
  // `x-pathname` is set by the middleware; a server layout has no other way to
  // see the path. This costs no extra dynamism: Navbar already reads cookies,
  // so every route in this app was dynamic before this line existed.
  const pathname = headers().get("x-pathname") ?? "";
  const isAdminConsole = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminConsole) {
    return (
      <html lang="en">
        <body className="flex min-h-screen flex-col bg-slate-100">{children}</body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Navbar />
        <VerifyEmailBanner />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} WorkForge — the contract manpower marketplace for
              Indian industry.
            </p>
            <nav className="flex flex-wrap gap-4">
              {FOOTER_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-slate-800">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
