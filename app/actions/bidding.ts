"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { bidSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { notify, audit } from "@/lib/notify";
import { getSettings } from "@/lib/settings";

export async function submitBid(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return { ok: false, error: "Complete your firm profile first." };
  if (profile.status !== "APPROVED") {
    return { ok: false, error: "Your firm must be approved before you can bid. Upload your documents to get verified." };
  }

  const parsed = bidSchema.safeParse({
    jobId: formData.get("jobId"),
    ratePerWorkerPerDay: formData.get("ratePerWorkerPerDay"),
    headcountOffered: formData.get("headcountOffered"),
    mobilizationDays: formData.get("mobilizationDays"),
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }
  const d = parsed.data;

  const job = await prisma.job.findUnique({ where: { id: d.jobId }, include: { company: true } });
  if (!job || job.status !== "OPEN") {
    return { ok: false, error: "This job is no longer open for bids." };
  }

  const existing = await prisma.bid.findUnique({
    where: { jobId_contractorId: { jobId: d.jobId, contractorId: profile.id } },
  });

  if (existing) {
    await prisma.bid.update({
      where: { id: existing.id },
      data: {
        ratePerWorkerPerDay: d.ratePerWorkerPerDay,
        headcountOffered: d.headcountOffered,
        mobilizationDays: d.mobilizationDays,
        notes: d.notes || null,
        status: "SUBMITTED",
      },
    });
  } else {
    await prisma.bid.create({
      data: {
        jobId: d.jobId,
        contractorId: profile.id,
        ratePerWorkerPerDay: d.ratePerWorkerPerDay,
        headcountOffered: d.headcountOffered,
        mobilizationDays: d.mobilizationDays,
        notes: d.notes || null,
      },
    });
    await notify({
      userId: job.company.userId,
      type: "BID_RECEIVED",
      body: `${profile.firmName} placed a bid on "${job.title}".`,
      link: `/company/jobs/${job.id}`,
    });
  }

  await audit(user.id, "BID_SUBMIT", job.id);
  revalidatePath(`/contractor/jobs/${d.jobId}`);
  revalidatePath("/contractor/bids");
  return { ok: true, message: existing ? "Bid updated." : "Bid submitted!" };
}

async function ownsJobBid(userId: string, bidId: string) {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: { job: { include: { company: true } }, contractor: true },
  });
  if (!bid || bid.job.company.userId !== userId) return null;
  return bid;
}

export async function shortlistBid(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const bidId = String(formData.get("bidId"));
  const bid = await ownsJobBid(user.id, bidId);
  if (!bid || bid.status !== "SUBMITTED") return;
  await prisma.bid.update({ where: { id: bidId }, data: { status: "SHORTLISTED" } });
  await notify({
    userId: bid.contractor.userId,
    type: "BID_SHORTLISTED",
    body: `Your bid for "${bid.job.title}" was shortlisted.`,
    link: `/contractor/bids`,
  });
  revalidatePath(`/company/jobs/${bid.jobId}`);
}

export async function rejectBid(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const bidId = String(formData.get("bidId"));
  const bid = await ownsJobBid(user.id, bidId);
  if (!bid || bid.status === "ACCEPTED") return;
  await prisma.bid.update({ where: { id: bidId }, data: { status: "REJECTED" } });
  await notify({
    userId: bid.contractor.userId,
    type: "BID_REJECTED",
    body: `Your bid for "${bid.job.title}" was not selected.`,
    link: `/contractor/bids`,
  });
  revalidatePath(`/company/jobs/${bid.jobId}`);
}

export async function acceptBid(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const bidId = String(formData.get("bidId"));
  const bid = await ownsJobBid(user.id, bidId);
  if (!bid || bid.job.status !== "OPEN") return;

  // Idempotency: if already accepted with an engagement, just go there.
  const existingEng = await prisma.engagement.findUnique({ where: { bidId } });
  if (existingEng) {
    redirect(`/engagements/${existingEng.id}`);
  }

  const settings = await getSettings();
  const duration = bid.job.durationDays ?? 1;
  const estimatedValue = bid.ratePerWorkerPerDay * bid.headcountOffered * duration;
  const estimatedFee = Math.round((estimatedValue * settings.platformFeePercent) / 100);

  const engagement = await prisma.engagement.create({
    data: {
      jobId: bid.jobId,
      companyId: bid.job.companyId,
      contractorId: bid.contractorId,
      bidId: bid.id,
      platformFeePercent: settings.platformFeePercent,
      estimatedValue,
      estimatedFee,
    },
  });

  await prisma.bid.update({ where: { id: bidId }, data: { status: "ACCEPTED" } });

  await notify({
    userId: bid.contractor.userId,
    type: "BID_ACCEPTED",
    body: `Your bid for "${bid.job.title}" was accepted! Contact details are unlocked — open the engagement to chat.`,
    link: `/engagements/${engagement.id}`,
  });
  await audit(user.id, "BID_ACCEPT", bid.id);

  redirect(`/engagements/${engagement.id}`);
}
