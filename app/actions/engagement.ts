"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getEngagementWithParties, isParticipant } from "@/lib/engagements";
import { notify, audit } from "@/lib/notify";

async function loadOwned(userId: string, engagementId: string) {
  const eng = await getEngagementWithParties(engagementId);
  if (!eng || !isParticipant(eng, userId)) return null;
  return eng;
}

/** Parses a 1–5 star value, rejecting anything else rather than clamping it. */
function parseRating(raw: FormDataEntryValue | null): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export async function completeEngagement(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eng = await loadOwned(user.id, String(formData.get("id")));
  if (!eng || eng.status !== "ACTIVE") return;
  await prisma.engagement.update({ where: { id: eng.id }, data: { status: "COMPLETED" } });
  await audit(user.id, "ENGAGEMENT_COMPLETE", eng.id);
  const other = eng.company.user.id === user.id ? eng.contractor.user.id : eng.company.user.id;
  await notify({
    userId: other,
    type: "ENGAGEMENT_COMPLETED",
    body: `The engagement for "${eng.job.title}" was marked complete. Leave a rating.`,
    link: `/engagements/${eng.id}`,
  });
  revalidatePath(`/engagements/${eng.id}`);
}

export async function cancelEngagement(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eng = await loadOwned(user.id, String(formData.get("id")));
  // Only an in-flight engagement can be cancelled. Completed work stays
  // completed, and cancelling twice is a no-op.
  if (!eng || eng.status !== "ACTIVE") return;

  await prisma.$transaction(async (tx) => {
    await tx.engagement.update({ where: { id: eng.id }, data: { status: "CANCELLED" } });

    // The awarded headcount is no longer committed, so a job that was closed
    // purely because this bid filled it should accept bids again. Left CLOSED if
    // the company closed it deliberately.
    const job = await tx.job.findUnique({
      where: { id: eng.jobId },
      select: { status: true },
    });
    if (job?.status === "FILLED") {
      await tx.job.update({ where: { id: eng.jobId }, data: { status: "OPEN" } });
    }
  });

  await audit(user.id, "ENGAGEMENT_CANCEL", eng.id);
  const other = eng.company.user.id === user.id ? eng.contractor.user.id : eng.company.user.id;
  await notify({
    userId: other,
    type: "ENGAGEMENT_CANCELLED",
    body: `The engagement for "${eng.job.title}" was cancelled.`,
    link: `/engagements/${eng.id}`,
  });
  revalidatePath(`/engagements/${eng.id}`);
  revalidatePath(`/company/jobs/${eng.jobId}`);
}

/** Company rates the contractor (1-5). Recomputes the contractor's average. */
export async function rateContractor(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eng = await loadOwned(user.id, String(formData.get("id")));
  if (!eng || eng.company.user.id !== user.id) return;
  // Ratings feed the contractor's public average, so they're only accepted on
  // completed work and only once. The UI hides the form, but this action is
  // directly invocable — the check has to live here.
  if (eng.status !== "COMPLETED" || eng.contractorRating !== null) return;

  const rating = parseRating(formData.get("rating"));
  if (rating === null) return;

  await prisma.$transaction(async (tx) => {
    await tx.engagement.update({
      where: { id: eng.id },
      data: { contractorRating: rating },
    });

    // Recompute in the database rather than pulling every rating into memory.
    const agg = await tx.engagement.aggregate({
      where: { contractorId: eng.contractorId, contractorRating: { not: null } },
      _avg: { contractorRating: true },
      _count: { contractorRating: true },
    });

    await tx.contractorProfile.update({
      where: { id: eng.contractorId },
      data: {
        rating: Math.round((agg._avg.contractorRating ?? 0) * 10) / 10,
        ratingCount: agg._count.contractorRating,
      },
    });
  });

  await audit(user.id, "RATE_CONTRACTOR", `${eng.id}=${rating}`);
  revalidatePath(`/engagements/${eng.id}`);
}

/** Contractor rates the company (1-5). */
export async function rateCompany(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eng = await loadOwned(user.id, String(formData.get("id")));
  if (!eng || eng.contractor.user.id !== user.id) return;
  if (eng.status !== "COMPLETED" || eng.companyRating !== null) return;

  const rating = parseRating(formData.get("rating"));
  if (rating === null) return;

  await prisma.engagement.update({
    where: { id: eng.id },
    data: { companyRating: rating },
  });
  await audit(user.id, "RATE_COMPANY", `${eng.id}=${rating}`);
  revalidatePath(`/engagements/${eng.id}`);
}
