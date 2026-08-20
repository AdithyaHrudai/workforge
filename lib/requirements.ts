import "server-only";
import { prisma } from "@/lib/db";
import { CATEGORY, isHeadcountCategory } from "@/lib/constants";

/** Total people wanted across a staffing requirement's role lines. */
export function totalHeadcount(roles: { headcount: number }[]): number {
  return roles.reduce((sum, r) => sum + r.headcount, 0);
}

/** A posting is live only while it is OPEN *and* unexpired. */
export function isLive(requirement: {
  status: string;
  expiresAt: Date | null;
}): boolean {
  if (requirement.status !== "OPEN") return false;
  return !requirement.expiresAt || requirement.expiresAt > new Date();
}

/**
 * One-line summary of what is being asked for. Job contracts describe an
 * output; staffing requirements describe a headcount.
 */
export function demandSummary(requirement: {
  category: string;
  outputQuantity: number | null;
  outputUnit: string | null;
  outputPeriod: string | null;
  roles: { headcount: number }[];
}): string {
  if (requirement.category === CATEGORY.JOB_CONTRACT) {
    if (requirement.outputQuantity && requirement.outputUnit) {
      const period = requirement.outputPeriod ? ` ${requirement.outputPeriod}` : "";
      return `${requirement.outputQuantity} ${requirement.outputUnit}${period}`;
    }
    return "Output-based scope";
  }
  const total = totalHeadcount(requirement.roles);
  return total === 1 ? "1 person" : `${total} people`;
}

const requirementInclude = {
  roles: true,
  company: {
    select: {
      id: true,
      companyName: true,
      city: true,
      state: true,
      industries: true,
      natureOfBusiness: true,
      verified: true,
      about: true,
      userId: true,
    },
  },
} as const;

/** A requirement with everything a detail page needs, or null. */
export async function getRequirement(id: string) {
  return prisma.requirement.findUnique({
    where: { id },
    include: requirementInclude,
  });
}

/** Loads a requirement only if it belongs to the given company user. */
export async function getOwnedRequirement(id: string, userId: string) {
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    include: {
      ...requirementInclude,
      proposals: {
        include: {
          contractor: {
            include: {
              user: { select: { name: true, email: true, mobile: true } },
              clients: {
                orderBy: [{ ongoing: "desc" }, { headcount: "desc" }],
                take: 3,
              },
              _count: { select: { clients: true, engagements: true, reviews: true } },
            },
          },
          engagement: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      invites: {
        include: { contractor: { select: { id: true, firmName: true, city: true, state: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!requirement || requirement.company.userId !== userId) return null;
  return requirement;
}

export type OwnedRequirement = NonNullable<Awaited<ReturnType<typeof getOwnedRequirement>>>;

/**
 * Awarded coverage for a staffing requirement, used to decide whether a
 * posting is fully served. Job contracts have no headcount to satisfy, so they
 * are never auto-closed on coverage.
 */
export async function awardedHeadcount(requirementId: string): Promise<number> {
  const agg = await prisma.proposal.aggregate({
    where: { requirementId, status: "ACCEPTED" },
    _sum: { headcountOffered: true },
  });
  return agg._sum.headcountOffered ?? 0;
}

/** True when accepted proposals cover everything the company asked for. */
export function isFullyAwarded(
  requirement: { category: string; roles: { headcount: number }[] },
  awarded: number,
): boolean {
  if (!isHeadcountCategory(requirement.category)) return false;
  const required = totalHeadcount(requirement.roles);
  return required > 0 && awarded >= required;
}
