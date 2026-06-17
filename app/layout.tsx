import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ShramSetu — Verified contract manpower for project sites",
  description:
    "ShramSetu connects companies on greenfield & EPC sites with verified labour contractors across Andhra Pradesh and South India. Post requirements, compare bids, and engage securely.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-6xl px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500">
            <p>
              © {new Date().getFullYear()} ShramSetu — a marketplace for verified contract
              manpower. Built for greenfield & EPC projects in South India.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
