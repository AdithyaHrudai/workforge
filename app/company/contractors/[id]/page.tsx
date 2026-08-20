import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * The firm profile moved to the public `/contractors/[id]`, which is the same
 * page for every viewer and is indexable. This keeps older links — and the
 * "invite to quote" deep link from a requirement — working.
 */
export default function LegacyContractorProfileRedirect({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { requirement?: string };
}) {
  const query = searchParams.requirement
    ? `?requirement=${encodeURIComponent(searchParams.requirement)}`
    : "";
  redirect(`/contractors/${params.id}${query}`);
}
