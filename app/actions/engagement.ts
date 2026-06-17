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
  if (!eng || eng.status === "COMPLETED") return;
  await prisma.engagement.update({ where: { id: eng.id }, data: { status: "CANCELLED" } });
  await audit(user.id, "ENGAGEMENT_CANCEL", eng.id);
  revalidatePath(`/engagements/${eng.id}`);
}

/** Company rates the contractor (1-5). Recomputes the contractor's average. */
export async function rateContractor(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eng = await loadOwned(user.id, String(formData.get("id")));
  if (!eng || eng.company.user.id !== user.id) return;
  const rating = Math.max(1, Math.min(5, Number(formData.get("rating")) || 0));
  await prisma.engagement.update({ where: { id: eng.id }, data: { contractorRating: rating } });

  const rated = await prisma.engagement.findMany({
    where: { contractorId: eng.contractorId, contractorRating: { not: null } },
    select: { contractorRating: true },
  });
  const vals = rated.map((r) => r.contractorRating ?? 0).filter((n) => n > 0);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  await prisma.contractorProfile.update({
    where: { id: eng.contractorId },
    data: { rating: Math.round(avg * 10) / 10, ratingCount: vals.length },
  });
  revalidatePath(`/engagements/${eng.id}`);
}

/** Contractor rates the company (1-5). */
export async function rateCompany(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eng = await loadOwned(user.id, String(formData.get("id")));
  if (!eng || eng.contractor.user.id !== user.id) return;
  const rating = Math.max(1, Math.min(5, Number(formData.get("rating")) || 0));
  await prisma.engagement.update({ where: { id: eng.id }, data: { companyRating: rating } });
  revalidatePath(`/engagements/${eng.id}`);
}
