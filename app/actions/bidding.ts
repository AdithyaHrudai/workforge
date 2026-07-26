"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { bidSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { notify, audit } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { RATE_LIMITS, rateLimit, retryMessage } from "@/lib/ratelimit";

export async function submitBid(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return { ok: false, error: "Complete your firm profile first." };
  if (profile.status !== "APPROVED") {
    return { ok: false, error: "Your firm must be approved before you can bid. Upload your documents to get verified." };
  }

  const limit = await rateLimit(`bid:user:${user.id}`, RATE_LIMITS.bid);
  if (!limit.ok) {
    return { ok: false, error: `You've submitted a lot of bids recently. ${retryMessage(limit.retryAfter)}` };
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
  // Expiry doesn't change `status`, so it has to be checked separately — an
  // expired posting is reachable by direct URL even once it leaves the feed.
  if (job.expiresAt && job.expiresAt <= new Date()) {
    return { ok: false, error: "This job posting has expired." };
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

  const settings = await getSettings();
  const duration = bid.job.durationDays ?? 1;
  const estimatedValue = bid.ratePerWorkerPerDay * bid.headcountOffered * duration;
  const estimatedFee = Math.round((estimatedValue * settings.platformFeePercent) / 100);

  let engagementId: string;

  try {
    // A job may legitimately need several contractors (different trades), so
    // accepting one bid doesn't close the job outright. What must not happen is
    // a bid producing two engagements, or the job staying OPEN after its
    // headcount is met — so the whole award runs in one transaction.
    engagementId = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction: the job may have been closed or filled
      // between the check above and here.
      const fresh = await tx.job.findUnique({
        where: { id: bid.jobId },
        select: { status: true, lines: { select: { headcount: true } } },
      });
      if (!fresh || fresh.status !== "OPEN") {
        throw new JobNoLongerOpenError();
      }

      const engagement = await tx.engagement.create({
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

      await tx.bid.update({ where: { id: bid.id }, data: { status: "ACCEPTED" } });

      // Close the job once the awarded headcount covers what was requested.
      const required = fresh.lines.reduce((sum, l) => sum + l.headcount, 0);
      const awarded = await tx.bid.aggregate({
        where: { jobId: bid.jobId, status: "ACCEPTED" },
        _sum: { headcountOffered: true },
      });
      if (required > 0 && (awarded._sum.headcountOffered ?? 0) >= required) {
        await tx.job.update({ where: { id: bid.jobId }, data: { status: "FILLED" } });
      }

      return engagement.id;
    });
  } catch (err) {
    // Unique constraint on Engagement.bidId — this bid was already awarded by a
    // concurrent request. Treat as idempotent and go to the existing engagement.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.engagement.findUnique({ where: { bidId } });
      if (existing) redirect(`/engagements/${existing.id}`);
      return;
    }
    if (err instanceof JobNoLongerOpenError) return;
    throw err;
  }

  await notify({
    userId: bid.contractor.userId,
    type: "BID_ACCEPTED",
    body: `Your bid for "${bid.job.title}" was accepted! Contact details are unlocked — open the engagement to chat.`,
    link: `/engagements/${engagementId}`,
  });
  await audit(user.id, "BID_ACCEPT", bid.id);

  revalidatePath(`/company/jobs/${bid.jobId}`);
  redirect(`/engagements/${engagementId}`);
}

/** Signals a lost race on job state; unwinds the transaction without a 500. */
class JobNoLongerOpenError extends Error {}

export async function reopenJob(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const id = String(formData.get("id"));
  const job = await prisma.job.findUnique({ where: { id }, include: { company: true } });
  if (!job || job.company.userId !== user.id) return;
  if (job.status === "OPEN") return;

  await prisma.job.update({ where: { id }, data: { status: "OPEN" } });
  await audit(user.id, "JOB_REOPEN", id);
  revalidatePath(`/company/jobs/${id}`);
  revalidatePath("/company/jobs");
}
