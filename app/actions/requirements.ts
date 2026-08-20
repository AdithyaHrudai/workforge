"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { requirementSchema, inviteSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { checkbox, json, text } from "@/lib/forms";
import { notify, audit } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { CATEGORY, postingExpiryFrom } from "@/lib/constants";
import { RATE_LIMITS, rateLimit, retryMessage } from "@/lib/ratelimit";

type RoleRow = {
  role: string;
  headcount: number | string;
  experienceBand?: string;
  qualification?: string;
  indicativeWage?: number | string;
  notes?: string;
};

async function companyFor(userId: string) {
  return prisma.companyProfile.findUnique({ where: { userId } });
}

export async function createRequirement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("COMPANY");
  const company = await companyFor(user.id);
  if (!company) {
    return { ok: false, error: "Complete your company profile before posting a requirement." };
  }

  const settings = await getSettings();
  if (settings.requireCompanyApproval && company.status !== "APPROVED") {
    return {
      ok: false,
      error:
        company.status === "REJECTED"
          ? "Your company registration was not approved. Please contact support."
          : "Your company is awaiting verification. You can post once it's approved.",
    };
  }

  const limit = await rateLimit(`posting:user:${user.id}`, RATE_LIMITS.posting);
  if (!limit.ok) {
    return { ok: false, error: `You've posted a lot of requirements recently. ${retryMessage(limit.retryAfter)}` };
  }

  const category = text(formData, "category");
  // Role rows are meaningless for a job contract, so they are dropped before
  // validation rather than being rejected — switching category mid-form is a
  // normal thing to do and shouldn't produce a confusing error.
  const rawRoles =
    category === CATEGORY.JOB_CONTRACT ? [] : json<RoleRow[]>(formData, "rolesJson", []);

  const parsed = requirementSchema.safeParse({
    category,
    title: text(formData, "title"),
    industry: text(formData, "industry"),
    description: text(formData, "description"),
    scopeKey: text(formData, "scopeKey"),
    outputQuantity: text(formData, "outputQuantity"),
    outputUnit: text(formData, "outputUnit"),
    outputPeriod: text(formData, "outputPeriod"),
    deliverables: text(formData, "deliverables"),
    siteName: text(formData, "siteName"),
    city: text(formData, "city"),
    district: text(formData, "district"),
    state: text(formData, "state"),
    pincode: text(formData, "pincode"),
    startDate: text(formData, "startDate"),
    durationType: text(formData, "durationType"),
    durationMonths: text(formData, "durationMonths"),
    shift: text(formData, "shift"),
    urgency: text(formData, "urgency"),
    accommodationProvided: checkbox(formData, "accommodationProvided"),
    transportProvided: checkbox(formData, "transportProvided"),
    foodProvided: checkbox(formData, "foodProvided"),
    ppeProvided: checkbox(formData, "ppeProvided"),
    preferredRateBasis: text(formData, "preferredRateBasis"),
    indicativeBudget: text(formData, "indicativeBudget"),
    roles: Array.isArray(rawRoles) ? rawRoles : [],
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const startDate = d.startDate ? new Date(d.startDate) : null;
  const isJobContract = d.category === CATEGORY.JOB_CONTRACT;

  const requirement = await prisma.requirement.create({
    data: {
      companyId: company.id,
      category: d.category,
      title: d.title,
      industry: d.industry ?? null,
      description: d.description ?? null,

      // Output fields belong to job contracts only; nulled otherwise so a
      // category switch can't leave orphaned values on the record.
      scopeKey: isJobContract ? d.scopeKey ?? null : null,
      outputQuantity: isJobContract ? d.outputQuantity ?? null : null,
      outputUnit: isJobContract ? d.outputUnit ?? null : null,
      outputPeriod: isJobContract ? d.outputPeriod ?? null : null,
      deliverables: isJobContract ? d.deliverables ?? null : null,

      siteName: d.siteName ?? null,
      city: d.city,
      district: d.district ?? null,
      state: d.state,
      pincode: d.pincode ?? null,

      startDate,
      durationType: d.durationType ?? null,
      durationMonths: d.durationMonths ?? null,
      shift: d.shift ?? null,
      urgency: d.urgency,
      expiresAt: postingExpiryFrom(d.urgency, startDate),

      accommodationProvided: d.accommodationProvided,
      transportProvided: d.transportProvided,
      foodProvided: d.foodProvided,
      ppeProvided: d.ppeProvided,

      preferredRateBasis: d.preferredRateBasis ?? null,
      indicativeBudget: d.indicativeBudget ?? null,

      roles: isJobContract
        ? undefined
        : {
            create: d.roles.map((r) => ({
              role: r.role,
              headcount: r.headcount,
              experienceBand: r.experienceBand ?? null,
              qualification: r.qualification ?? null,
              indicativeWage: r.indicativeWage ?? null,
              notes: r.notes ?? null,
            })),
          },
    },
  });

  await audit(user.id, "REQUIREMENT_CREATE", requirement.id);
  revalidatePath("/company/requirements");
  redirect(`/company/requirements/${requirement.id}`);
}

async function ownedRequirement(userId: string, id: string) {
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    include: { company: { select: { userId: true, companyName: true } } },
  });
  if (!requirement || requirement.company.userId !== userId) return null;
  return requirement;
}

export async function closeRequirement(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const id = text(formData, "id");
  const requirement = await ownedRequirement(user.id, id);
  if (!requirement || requirement.status !== "OPEN") return;

  await prisma.requirement.update({ where: { id }, data: { status: "CLOSED" } });
  await audit(user.id, "REQUIREMENT_CLOSE", id);
  revalidatePath(`/company/requirements/${id}`);
  revalidatePath("/company/requirements");
}

export async function reopenRequirement(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const id = text(formData, "id");
  const requirement = await ownedRequirement(user.id, id);
  if (!requirement || requirement.status === "OPEN") return;

  // Reopening a posting whose expiry has passed would put a stale listing back
  // in every contractor's feed, so the clock is restarted too.
  await prisma.requirement.update({
    where: { id },
    data: {
      status: "OPEN",
      expiresAt: postingExpiryFrom(requirement.urgency, requirement.startDate),
    },
  });
  await audit(user.id, "REQUIREMENT_REOPEN", id);
  revalidatePath(`/company/requirements/${id}`);
  revalidatePath("/company/requirements");
}

export async function deleteRequirement(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const id = text(formData, "id");
  const requirement = await ownedRequirement(user.id, id);
  if (!requirement) return;

  // Contractors have spent effort on a posting that has proposals against it,
  // and an awarded posting is referenced by an engagement. Neither may vanish;
  // closing is the correct end state for both.
  const proposals = await prisma.proposal.count({ where: { requirementId: id } });
  if (proposals > 0) return;

  await prisma.requirement.delete({ where: { id } });
  await audit(user.id, "REQUIREMENT_DELETE", id);
  revalidatePath("/company/requirements");
  redirect("/company/requirements");
}

/**
 * Invites a contractor found through search to quote on a specific requirement.
 * This is what turns the directory into a two-way marketplace: the company
 * doesn't have to wait for the right firm to notice the posting.
 */
export async function inviteContractor(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("COMPANY");
  const company = await companyFor(user.id);
  if (!company) return { ok: false, error: "Complete your company profile first." };

  const parsed = inviteSchema.safeParse({
    requirementId: text(formData, "requirementId"),
    contractorId: text(formData, "contractorId"),
    message: text(formData, "message"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const limit = await rateLimit(`invite:user:${user.id}`, RATE_LIMITS.invite);
  if (!limit.ok) {
    return { ok: false, error: `You've sent a lot of invitations recently. ${retryMessage(limit.retryAfter)}` };
  }

  const [requirement, contractor] = await Promise.all([
    prisma.requirement.findUnique({
      where: { id: d.requirementId },
      select: { id: true, companyId: true, status: true, title: true, expiresAt: true },
    }),
    prisma.contractorProfile.findFirst({
      where: { id: d.contractorId, status: "APPROVED" },
      select: { id: true, userId: true, firmName: true },
    }),
  ]);

  if (!requirement || requirement.companyId !== company.id) {
    return { ok: false, error: "That requirement doesn't belong to your company." };
  }
  if (requirement.status !== "OPEN") {
    return { ok: false, error: "That requirement is no longer open." };
  }
  if (requirement.expiresAt && requirement.expiresAt <= new Date()) {
    return { ok: false, error: "That requirement has expired. Reopen it before inviting contractors." };
  }
  if (!contractor) {
    return { ok: false, error: "That contractor is not available." };
  }

  try {
    await prisma.requirementInvite.create({
      data: {
        requirementId: requirement.id,
        contractorId: contractor.id,
        message: d.message ?? null,
      },
    });
  } catch (err) {
    // Unique on (requirementId, contractorId): inviting twice is a no-op, not
    // an error the company needs to think about.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: true, message: `${contractor.firmName} has already been invited to this requirement.` };
    }
    throw err;
  }

  await notify({
    userId: contractor.userId,
    type: "INVITE_RECEIVED",
    body: `${company.companyName} invited you to quote on "${requirement.title}".`,
    link: `/contractor/requirements/${requirement.id}`,
  });
  await audit(user.id, "INVITE_SEND", `${requirement.id}->${contractor.id}`);
  revalidatePath(`/company/requirements/${requirement.id}`);

  return { ok: true, message: `Invitation sent to ${contractor.firmName}.` };
}
