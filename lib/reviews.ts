import "server-only";
import type { Prisma } from "@prisma/client";
import { RATING_PARAMETERS } from "@/lib/constants";

/**
 * Recomputes a contractor's denormalised rating columns from their reviews.
 *
 * The averages are computed in the database rather than by pulling every review
 * into memory, and the whole thing runs inside the caller's transaction so a
 * review and the aggregate it feeds can never be observed out of step.
 */
export async function recomputeContractorRatings(
  tx: Prisma.TransactionClient,
  contractorId: string,
): Promise<void> {
  const agg = await tx.contractorReview.aggregate({
    where: { contractorId },
    _avg: {
      overall: true,
      deployment: true,
      compliance: true,
      workerPayment: true,
      manpowerQuality: true,
      responsiveness: true,
    },
    _count: { _all: true },
  });

  const round1 = (n: number | null | undefined) => Math.round((n ?? 0) * 10) / 10;

  await tx.contractorProfile.update({
    where: { id: contractorId },
    data: {
      rating: round1(agg._avg.overall),
      ratingCount: agg._count._all,
      ratingDeployment: round1(agg._avg.deployment),
      ratingCompliance: round1(agg._avg.compliance),
      ratingWorkerPayment: round1(agg._avg.workerPayment),
      ratingManpowerQuality: round1(agg._avg.manpowerQuality),
      ratingResponsiveness: round1(agg._avg.responsiveness),
    },
  });
}

/** Mean of the five parameter scores, to one decimal place. */
export function overallOf(scores: Record<string, number>): number {
  const values = RATING_PARAMETERS.map((p) => scores[p.key] ?? 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(mean * 10) / 10;
}
