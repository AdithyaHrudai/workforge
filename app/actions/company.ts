"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { companyProfileSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { list, text } from "@/lib/forms";
import { audit } from "@/lib/notify";
import { saveVerificationAnswer } from "@/lib/verification";
import { RATE_LIMITS, rateLimit, retryMessage } from "@/lib/ratelimit";

export async function saveCompanyProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("COMPANY");

  const parsed = companyProfileSchema.safeParse({
    companyName: text(formData, "companyName"),
    natureOfBusiness: text(formData, "natureOfBusiness"),
    industries: list(formData, "industries"),
    manpowerBand: text(formData, "manpowerBand"),
    categoriesUsed: list(formData, "categoriesUsed"),
    entityType: text(formData, "entityType"),
    website: text(formData, "website"),
    contactName: text(formData, "contactName"),
    contactDesignation: text(formData, "contactDesignation"),
    contactMobile: text(formData, "contactMobile"),
    contactEmail: text(formData, "contactEmail"),
    city: text(formData, "city"),
    district: text(formData, "district"),
    state: text(formData, "state"),
    pincode: text(formData, "pincode"),
    gstin: text(formData, "gstin"),
    pan: text(formData, "pan"),
    cin: text(formData, "cin"),
    about: text(formData, "about"),
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
    companyName: d.companyName,
    natureOfBusiness: d.natureOfBusiness,
    industries: d.industries,
    manpowerBand: d.manpowerBand ?? null,
    categoriesUsed: d.categoriesUsed,
    entityType: d.entityType ?? null,
    website: d.website ?? null,
    contactName: d.contactName,
    contactDesignation: d.contactDesignation ?? null,
    contactMobile: d.contactMobile,
    contactEmail: d.contactEmail,
    city: d.city,
    district: d.district ?? null,
    state: d.state,
    pincode: d.pincode ?? null,
    gstin: d.gstin ?? null,
    pan: d.pan ?? null,
    cin: d.cin ?? null,
    about: d.about ?? null,
  };

  const existing = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existing) {
    await prisma.companyProfile.update({ where: { userId: user.id }, data });
  } else {
    // Starts PENDING so the field means something. Whether PENDING blocks
    // posting is controlled by Setting.requireCompanyApproval.
    await prisma.companyProfile.create({
      data: { ...data, userId: user.id, status: "PENDING" },
    });
  }

  await audit(user.id, existing ? "COMPANY_PROFILE_UPDATE" : "COMPANY_PROFILE_CREATE");
  revalidatePath("/company");
  revalidatePath("/company/profile");
  return { ok: true, message: "Company profile saved." };
}

// ---------------------------------------------------------------------------
// Verification checklist
//
// Mirrors the contractor side in app/actions/contractor.ts; the questions
// themselves live in lib/verification.ts. A company answers one extra question
// — its CLRA principal-employer registration — because engaging contract labour
// is what the Act registers it for.
// ---------------------------------------------------------------------------

/** One answer on the company's checklist — GST, PAN or CLRA registration. */
export async function saveCompanyVerification(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("COMPANY");
  const profile = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) return { ok: false, error: "Complete your company profile first." };

  const limit = await rateLimit(`upload:user:${user.id}`, RATE_LIMITS.upload);
  if (!limit.ok) {
    return { ok: false, error: `Too many changes. ${retryMessage(limit.retryAfter)}` };
  }

  const { state, type, uploaded } = await saveVerificationAnswer(
    "COMPANY",
    profile.id,
    formData,
  );
  if (state?.ok && type) {
    await audit(
      user.id,
      uploaded ? "DOCUMENT_UPLOAD" : "VERIFICATION_ANSWER",
      `company ${type}`,
    );
    revalidatePath("/company/documents");
    revalidatePath("/company/profile");
  }
  return state;
}

export async function deleteCompanyDocument(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const profile = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) return;

  // Scoped by companyId as well as id, so an id belonging to somebody else
  // simply matches nothing.
  await prisma.document.deleteMany({
    where: { id: text(formData, "id"), companyId: profile.id },
  });
  revalidatePath("/company/documents");
}
