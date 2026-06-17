import "server-only";
import { prisma } from "@/lib/db";

/**
 * Loads an engagement and resolves the two participant user ids.
 * Returns null if the engagement does not exist.
 */
export async function getEngagementWithParties(id: string) {
  return prisma.engagement.findUnique({
    where: { id },
    include: {
      job: { include: { lines: true } },
      bid: true,
      company: { include: { user: { select: { id: true, name: true, email: true, mobile: true } } } },
      contractor: { include: { user: { select: { id: true, name: true, email: true, mobile: true } } } },
    },
  });
}

export type EngagementWithParties = NonNullable<Awaited<ReturnType<typeof getEngagementWithParties>>>;

/** True if the given user is the company or contractor on this engagement. */
export function isParticipant(eng: EngagementWithParties, userId: string): boolean {
  return eng.company.user.id === userId || eng.contractor.user.id === userId;
}
