"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { proposalSchemaFor } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { text } from "@/lib/forms";
import { notify, audit } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { isHeadcountCategory } from "@/lib/constants";
import { isFullyAwarded, totalHeadcount } from "@/lib/requirements";
import { RATE_LIMITS, rateLimit, retryMessage } from "@/lib/ratelimit";

/** Signals a lost race on requirement state; unwinds without a 500. */
class RequirementNoLongerOpenError extends Error {}

/**
 * Submits or updates a contractor's proposal.
 *
 * The validation schema is chosen from the requirement's category, which is
 * what makes the two commercial models distinct rather than cosmetic: a
 * staffing proposal must carry a headcount, and a job-contract proposal cannot
 * carry one at all — deciding how many people to deploy is the contractor's
 * commercial judgement, not something the company buys.
 */
export async function submitProposal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return { ok: false, error: "Complete your firm profile first." };

  const settings = await getSettings();
  if (settings.requireContractorApproval && profile.status !== "APPROVED") {
    return {
      ok: false,
      error:
        profile.status === "REJECTED"
          ? "Your firm was not approved. Please contact support."
          : "Your firm is awaiting verification. Upload your licence and registration documents to get approved.",
    };
  }

  const limit = await rateLimit(`proposal:user:${user.id}`, RATE_LIMITS.proposal);
  if (!limit.ok) {
    return { ok: false, error: `You've submitted a lot of proposals recently. ${retryMessage(limit.retryAfter)}` };
  }

  const requirementId = text(formData, "requirementId");
  const requirement = await prisma.requirement.findUnique({
    where: { id: requirementId },
    include: { company: { select: { userId: true, companyName: true } } },
  });
  if (!requirement) return { ok: false, error: "That requirement no longer exists." };
  if (requirement.status !== "OPEN") {
    return { ok: false, error: "This requirement is no longer accepting proposals." };
  }
  // Expiry doesn't change `status`, so it has to be checked separately — an
  // expired posting is still reachable by direct URL once it leaves the feed.
  if (requirement.expiresAt && requirement.expiresAt <= new Date()) {
    return { ok: false, error: "This requirement has expired." };
  }

  const headcountBased = isHeadcountCategory(requirement.category);
  const parsed = proposalSchemaFor(requirement.category).safeParse({
    requirementId,
    rateBasis: text(formData, "rateBasis"),
    rateAmount: text(formData, "rateAmount"),
    mobilizationDays: text(formData, "mobilizationDays") || "0",
    validityDays: text(formData, "validityDays") || "30",
    coverNote: text(formData, "coverNote"),
    headcountOffered: headcountBased ? text(formData, "headcountOffered") : undefined,
    indicativeCrewSize: headcountBased ? undefined : text(formData, "indicativeCrewSize"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const data = {
    rateBasis: d.rateBasis,
    rateAmount: d.rateAmount,
    headcountOffered: headcountBased ? (d.headcountOffered as number) : null,
    indicativeCrewSize: headcountBased ? null : (d.indicativeCrewSize as number | undefined) ?? null,
    mobilizationDays: d.mobilizationDays,
    validityDays: d.validityDays,
    coverNote: d.coverNote ?? null,
  };

  const existing = await prisma.proposal.findUnique({
    where: { requirementId_contractorId: { requirementId, contractorId: profile.id } },
  });

  if (existing) {
    // A proposal already accepted is a contract; revising it would rewrite
    // agreed commercials behind the company's back.
    if (existing.status === "ACCEPTED") {
      return { ok: false, error: "This proposal has already been accepted and can't be changed." };
    }
    await prisma.proposal.update({
      where: { id: existing.id },
      // Revising resets the company's triage: a shortlisted quote that changed
      // price has to be looked at again.
      data: { ...data, status: "SUBMITTED" },
    });
  } else {
    await prisma.proposal.create({
      data: { ...data, requirementId, contractorId: profile.id },
    });
    await notify({
      userId: requirement.company.userId,
      type: "PROPOSAL_RECEIVED",
      body: `${profile.firmName} submitted a proposal for "${requirement.title}".`,
      link: `/company/requirements/${requirement.id}`,
    });

    // An invited contractor responding closes the loop on the invitation.
    await prisma.requirementInvite.updateMany({
      where: { requirementId, contractorId: profile.id, status: { not: "RESPONDED" } },
      data: { status: "RESPONDED" },
    });
  }

  await audit(user.id, "PROPOSAL_SUBMIT", requirement.id);
  revalidatePath(`/contractor/requirements/${requirementId}`);
  revalidatePath("/contractor/proposals");
  return { ok: true, message: existing ? "Proposal updated." : "Proposal submitted." };
}

export async function withdrawProposal(formData: FormData): Promise<void> {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) return;

  const id = text(formData, "id");
  const { count } = await prisma.proposal.updateMany({
    // An accepted proposal is already an engagement and can't be withdrawn
    // unilaterally — that route is cancelling the engagement.
    where: { id, contractorId: profile.id, status: { in: ["SUBMITTED", "SHORTLISTED"] } },
    data: { status: "WITHDRAWN" },
  });
  if (count === 0) return;

  await audit(user.id, "PROPOSAL_WITHDRAW", id);
  revalidatePath("/contractor/proposals");
}

// ---------------------------------------------------------------------------
// Company-side triage
// ---------------------------------------------------------------------------

async function ownedProposal(userId: string, proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      requirement: {
        include: { company: true, roles: true },
      },
      contractor: { select: { id: true, userId: true, firmName: true } },
    },
  });
  if (!proposal || proposal.requirement.company.userId !== userId) return null;
  return proposal;
}

export async function shortlistProposal(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const proposal = await ownedProposal(user.id, text(formData, "proposalId"));
  if (!proposal || proposal.status !== "SUBMITTED") return;

  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: "SHORTLISTED" },
  });
  await notify({
    userId: proposal.contractor.userId,
    type: "PROPOSAL_SHORTLISTED",
    body: `Your proposal for "${proposal.requirement.title}" was shortlisted.`,
    link: "/contractor/proposals",
  });
  revalidatePath(`/company/requirements/${proposal.requirementId}`);
}

export async function rejectProposal(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const proposal = await ownedProposal(user.id, text(formData, "proposalId"));
  if (!proposal || proposal.status === "ACCEPTED" || proposal.status === "WITHDRAWN") return;

  await prisma.proposal.update({ where: { id: proposal.id }, data: { status: "REJECTED" } });
  await notify({
    userId: proposal.contractor.userId,
    type: "PROPOSAL_REJECTED",
    body: `Your proposal for "${proposal.requirement.title}" was not selected.`,
    link: "/contractor/proposals",
  });
  revalidatePath(`/company/requirements/${proposal.requirementId}`);
}

/**
 * Awards a proposal and opens the engagement.
 *
 * A requirement may legitimately need several contractors — different roles, or
 * a shortfall topped up by a second firm — so accepting one proposal does not
 * close the posting outright. What must not happen is one proposal producing
 * two engagements, or a posting staying OPEN once its headcount is fully
 * covered, so the whole award runs in a single transaction.
 */
export async function acceptProposal(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const proposal = await ownedProposal(user.id, text(formData, "proposalId"));
  if (!proposal) return;
  if (proposal.status === "WITHDRAWN" || proposal.status === "REJECTED") return;
  if (proposal.requirement.status !== "OPEN") return;

  const settings = await getSettings();
  const requirement = proposal.requirement;

  // Snapshot of the contract value, for the company's own records. Nothing is
  // charged on it — see Setting.paymentsEnabled.
  const months = requirement.durationMonths ?? 1;
  const estimatedValue = isHeadcountCategory(requirement.category)
    ? proposal.rateAmount * (proposal.headcountOffered ?? 0) * months
    : proposal.rateAmount;
  const estimatedFee = Math.round((estimatedValue * settings.platformFeePercent) / 100);

  let engagementId: string;

  try {
    engagementId = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction: the requirement may have been closed or
      // fully awarded between the check above and here.
      const fresh = await tx.requirement.findUnique({
        where: { id: requirement.id },
        select: { status: true, category: true, roles: { select: { headcount: true } } },
      });
      if (!fresh || fresh.status !== "OPEN") throw new RequirementNoLongerOpenError();

      const engagement = await tx.engagement.create({
        data: {
          requirementId: requirement.id,
          companyId: requirement.companyId,
          contractorId: proposal.contractorId,
          proposalId: proposal.id,
          rateBasis: proposal.rateBasis,
          rateAmount: proposal.rateAmount,
          headcount: proposal.headcountOffered,
          estimatedValue,
          platformFeePercent: settings.platformFeePercent,
          estimatedFee,
        },
      });

      await tx.proposal.update({ where: { id: proposal.id }, data: { status: "ACCEPTED" } });

      const awarded = await tx.proposal.aggregate({
        where: { requirementId: requirement.id, status: "ACCEPTED" },
        _sum: { headcountOffered: true },
      });

      // A job contract has no headcount to satisfy, so awarding it settles the
      // whole posting. A staffing posting only closes once it is fully covered.
      const settled = isHeadcountCategory(fresh.category)
        ? isFullyAwarded(fresh, awarded._sum.headcountOffered ?? 0)
        : true;

      if (settled) {
        await tx.requirement.update({
          where: { id: requirement.id },
          data: { status: "AWARDED" },
        });
      }

      return engagement.id;
    });
  } catch (err) {
    // Unique constraint on Engagement.proposalId — this proposal was already
    // awarded by a concurrent request. Treat as idempotent.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.engagement.findUnique({
        where: { proposalId: proposal.id },
        select: { id: true },
      });
      if (existing) redirect(`/engagements/${existing.id}`);
      return;
    }
    if (err instanceof RequirementNoLongerOpenError) return;
    throw err;
  }

  await notify({
    userId: proposal.contractor.userId,
    type: "PROPOSAL_ACCEPTED",
    body: `Your proposal for "${requirement.title}" was accepted. Open the engagement to coordinate mobilisation.`,
    link: `/engagements/${engagementId}`,
  });
  await audit(user.id, "PROPOSAL_ACCEPT", proposal.id);

  revalidatePath(`/company/requirements/${requirement.id}`);
  revalidatePath("/engagements");
  redirect(`/engagements/${engagementId}`);
}

/** Headcount still unawarded on a staffing requirement, for the company view. */
export async function remainingHeadcount(requirementId: string): Promise<number> {
  const requirement = await prisma.requirement.findUnique({
    where: { id: requirementId },
    select: { category: true, roles: { select: { headcount: true } } },
  });
  if (!requirement || !isHeadcountCategory(requirement.category)) return 0;

  const awarded = await prisma.proposal.aggregate({
    where: { requirementId, status: "ACCEPTED" },
    _sum: { headcountOffered: true },
  });
  return Math.max(0, totalHeadcount(requirement.roles) - (awarded._sum.headcountOffered ?? 0));
}
