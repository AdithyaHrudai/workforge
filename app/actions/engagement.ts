"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { contractorReviewSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { text } from "@/lib/forms";
import {
  counterpartyUserId,
  getEngagementWithParties,
  isParticipant,
} from "@/lib/engagements";
import { notify, audit } from "@/lib/notify";
import { overallOf, recomputeContractorRatings } from "@/lib/reviews";
import { isHeadcountCategory } from "@/lib/constants";

async function loadOwned(userId: string, engagementId: string) {
  const eng = await getEngagementWithParties(engagementId);
  if (!eng || !isParticipant(eng, userId)) return null;
  return eng;
}

export async function completeEngagement(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eng = await loadOwned(user.id, text(formData, "id"));
  if (!eng || eng.status !== "ACTIVE") return;

  await prisma.engagement.update({
    where: { id: eng.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await audit(user.id, "ENGAGEMENT_COMPLETE", eng.id);
  await notify({
    userId: counterpartyUserId(eng, user.id),
    type: "ENGAGEMENT_COMPLETED",
    body: `The engagement for "${eng.requirement.title}" was marked complete. Please leave a rating.`,
    link: `/engagements/${eng.id}`,
  });
  revalidatePath(`/engagements/${eng.id}`);
}

export async function cancelEngagement(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eng = await loadOwned(user.id, text(formData, "id"));
  // Only an in-flight engagement can be cancelled. Completed work stays
  // completed, and cancelling twice is a no-op.
  if (!eng || eng.status !== "ACTIVE") return;

  await prisma.$transaction(async (tx) => {
    await tx.engagement.update({ where: { id: eng.id }, data: { status: "CANCELLED" } });

    // The awarded commitment is released, so a requirement that was marked
    // AWARDED purely because this proposal settled it should take proposals
    // again. Left alone if the company closed it deliberately.
    const requirement = await tx.requirement.findUnique({
      where: { id: eng.requirementId },
      select: { status: true },
    });
    if (requirement?.status === "AWARDED") {
      await tx.requirement.update({
        where: { id: eng.requirementId },
        data: { status: "OPEN" },
      });
    }

    // The proposal is no longer the winning one either.
    await tx.proposal.update({
      where: { id: eng.proposalId },
      data: { status: "WITHDRAWN" },
    });
  });

  await audit(user.id, "ENGAGEMENT_CANCEL", eng.id);
  await notify({
    userId: counterpartyUserId(eng, user.id),
    type: "ENGAGEMENT_CANCELLED",
    body: `The engagement for "${eng.requirement.title}" was cancelled.`,
    link: `/engagements/${eng.id}`,
  });
  revalidatePath(`/engagements/${eng.id}`);
  revalidatePath(`/company/requirements/${eng.requirementId}`);
}

/**
 * The company's multi-parameter review of the contractor.
 *
 * A single star rating was never going to be enough here: the client was
 * explicit that companies judge a contractor on whether manpower arrived on
 * time, whether statutory compliance was clean, and — the one that matters most
 * to the workers themselves — whether the contractor actually paid them.
 */
export async function reviewContractor(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const engagementId = text(formData, "engagementId");
  const eng = await loadOwned(user.id, engagementId);

  if (!eng || eng.company.user.id !== user.id) {
    return { ok: false, error: "Only the engaging company can review a contractor." };
  }
  // Reviews feed the contractor's public averages, so they are accepted only on
  // completed work and only once. The UI hides the form, but this action is
  // directly invocable — the check has to live here.
  if (eng.status !== "COMPLETED") {
    return { ok: false, error: "You can review a contractor once the engagement is complete." };
  }
  if (eng.review) {
    return { ok: false, error: "You have already reviewed this engagement." };
  }

  const parsed = contractorReviewSchema.safeParse({
    engagementId,
    deployment: text(formData, "deployment"),
    compliance: text(formData, "compliance"),
    workerPayment: text(formData, "workerPayment"),
    manpowerQuality: text(formData, "manpowerQuality"),
    responsiveness: text(formData, "responsiveness"),
    comment: text(formData, "comment"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please rate every parameter from 1 to 5.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const overall = overallOf({
    deployment: d.deployment,
    compliance: d.compliance,
    workerPayment: d.workerPayment,
    manpowerQuality: d.manpowerQuality,
    responsiveness: d.responsiveness,
  });

  // The review and the aggregate it feeds move together, so a contractor's
  // headline rating can never be observed out of step with its reviews.
  await prisma.$transaction(async (tx) => {
    await tx.contractorReview.create({
      data: {
        engagementId: eng.id,
        contractorId: eng.contractorId,
        companyId: eng.companyId,
        deployment: d.deployment,
        compliance: d.compliance,
        workerPayment: d.workerPayment,
        manpowerQuality: d.manpowerQuality,
        responsiveness: d.responsiveness,
        overall,
        comment: d.comment ?? null,
      },
    });
    await recomputeContractorRatings(tx, eng.contractorId);
  });

  await audit(user.id, "CONTRACTOR_REVIEW", `${eng.id}=${overall}`);
  await notify({
    userId: eng.contractor.user.id,
    type: "REVIEW_RECEIVED",
    body: `${eng.company.companyName} rated your work on "${eng.requirement.title}" ${overall.toFixed(1)}/5.`,
    link: "/contractor",
  });

  revalidatePath(`/engagements/${eng.id}`);
  revalidatePath(`/contractors/${eng.contractorId}`);
  return { ok: true, message: "Thank you — your rating helps other companies choose well." };
}

/** The contractor's simpler rating of the company. */
export async function rateCompany(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eng = await loadOwned(user.id, text(formData, "id"));
  if (!eng || eng.contractor.user.id !== user.id) return;
  if (eng.status !== "COMPLETED" || eng.companyRating !== null) return;

  const rating = Number(text(formData, "rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;

  await prisma.engagement.update({
    where: { id: eng.id },
    data: { companyRating: rating },
  });
  await audit(user.id, "RATE_COMPANY", `${eng.id}=${rating}`);
  revalidatePath(`/engagements/${eng.id}`);
}

/**
 * Updates the deployed headcount on a live staffing engagement — the number
 * actually on site drifts from the number quoted, and the company's records
 * should follow reality.
 */
export async function updateDeployedHeadcount(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eng = await loadOwned(user.id, text(formData, "id"));
  if (!eng || eng.status !== "ACTIVE") return;
  if (!isHeadcountCategory(eng.requirement.category)) return;

  const headcount = Number(text(formData, "headcount"));
  if (!Number.isInteger(headcount) || headcount < 0 || headcount > 100000) return;

  await prisma.engagement.update({ where: { id: eng.id }, data: { headcount } });
  await audit(user.id, "ENGAGEMENT_HEADCOUNT", `${eng.id}=${headcount}`);
  revalidatePath(`/engagements/${eng.id}`);
}
