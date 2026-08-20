import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

/**
 * A single line under the header for accounts that have not confirmed their
 * address.
 *
 * It nags rather than blocks. Verification exists so the party on the other
 * side of a deal knows the contact details are real; making it a gate would
 * stop a plant browsing contractors on a Sunday because nobody read the inbox,
 * which costs the marketplace more than it protects it.
 */
export async function VerifyEmailBanner() {
  const user = await getCurrentUser();
  if (!user || user.emailVerified) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-sm text-amber-900">
        <span>Confirm your email address so firms know it reaches you.</span>
        <Link href="/account" className="font-semibold underline underline-offset-2">
          Send the link again
        </Link>
      </div>
    </div>
  );
}
