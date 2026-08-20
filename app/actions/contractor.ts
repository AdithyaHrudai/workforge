"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { contractorProfileSchema, contractorClientSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { checkbox, list, text } from "@/lib/forms";
import { audit } from "@/lib/notify";
import { saveVerificationAnswer } from "@/lib/verification";
import { RATE_LIMITS, rateLimit, retryMessage } from "@/lib/ratelimit";

async function profileFor(userId: string) {
  return prisma.contractorProfile.findUnique({ where: { userId } });
}

export async function saveContractorProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("CONTRACTOR");

  const parsed = contractorProfileSchema.safeParse({
    firmName: text(formData, "firmName"),
    entityType: text(formData, "entityType"),
    ownerName: text(formData, "ownerName"),
    ownerDesignation: text(formData, "ownerDesignation"),
    yearEstablished: text(formData, "yearEstablished"),
    website: text(formData, "website"),
    address: text(formData, "address"),
    city: text(formData, "city"),
    district: text(formData, "district"),
    state: text(formData, "state"),
    pincode: text(formData, "pincode"),
    presenceStates: list(formData, "presenceStates"),
    workerSourceStates: list(formData, "workerSourceStates"),
    categories: list(formData, "categories"),
    industries: list(formData, "industries"),
    roles: list(formData, "roles"),
    willingOutstation: checkbox(formData, "willingOutstation"),
    pan: text(formData, "pan"),
    gstin: text(formData, "gstin"),
    udyamNo: text(formData, "udyamNo"),
    labourLicenceNo: text(formData, "labourLicenceNo"),
    esicNo: text(formData, "esicNo"),
    epfNo: text(formData, "epfNo"),
    totalWorkforce: text(formData, "totalWorkforce") || "0",
    availableNow: text(formData, "availableNow") || "0",
    mobilizationDays: text(formData, "mobilizationDays") || "0",
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

  // Per-category strength is captured alongside the category checkboxes, as
  // `capacity:<CATEGORY>`. Anything for an unselected category is ignored.
  const capacities = d.categories.map((category) => {
    const raw = Number(text(formData, `capacity:${category}`));
    return {
      category,
      strength: Number.isFinite(raw) && raw > 0 ? Math.min(Math.trunc(raw), 200000) : 0,
    };
  });

  const data = {
    firmName: d.firmName,
    entityType: d.entityType ?? null,
    ownerName: d.ownerName,
    ownerDesignation: d.ownerDesignation ?? null,
    yearEstablished: d.yearEstablished ?? null,
    website: d.website ?? null,
    address: d.address ?? null,
    city: d.city,
    district: d.district ?? null,
    state: d.state,
    pincode: d.pincode ?? null,
    presenceStates: d.presenceStates,
    workerSourceStates: d.workerSourceStates,
    categories: d.categories,
    industries: d.industries,
    roles: d.roles,
    willingOutstation: d.willingOutstation,
    pan: d.pan ?? null,
    gstin: d.gstin ?? null,
    udyamNo: d.udyamNo ?? null,
    labourLicenceNo: d.labourLicenceNo ?? null,
    esicNo: d.esicNo ?? null,
    epfNo: d.epfNo ?? null,
    totalWorkforce: d.totalWorkforce,
    availableNow: d.availableNow,
    mobilizationDays: d.mobilizationDays,
    about: d.about ?? null,
  };

  const existing = await profileFor(user.id);

  // Profile and capacity rows move together: a half-applied save would leave
  // the firm advertising a category with no declared strength behind it.
  await prisma.$transaction(async (tx) => {
    const profile = existing
      ? await tx.contractorProfile.update({ where: { userId: user.id }, data })
      : await tx.contractorProfile.create({ data: { ...data, userId: user.id } });

    await tx.contractorCapacity.deleteMany({
      where: { contractorId: profile.id, category: { notIn: d.categories } },
    });
    for (const cap of capacities) {
      await tx.contractorCapacity.upsert({
        where: {
          contractorId_category: { contractorId: profile.id, category: cap.category },
        },
        update: { strength: cap.strength },
        create: { contractorId: profile.id, category: cap.category, strength: cap.strength },
      });
    }
  });

  await audit(user.id, existing ? "CONTRACTOR_PROFILE_UPDATE" : "CONTRACTOR_PROFILE_CREATE");
  revalidatePath("/contractor");
  revalidatePath("/contractor/profile");
  return {
    ok: true,
    message: existing
      ? "Profile updated."
      : "Profile saved. Upload your licence and registration documents to get verified.",
  };
}

// ---------------------------------------------------------------------------
// Client list — the contractor's track record
// ---------------------------------------------------------------------------

export async function saveClient(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("CONTRACTOR");
  const profile = await profileFor(user.id);
  if (!profile) return { ok: false, error: "Complete your firm profile first." };

  const parsed = contractorClientSchema.safeParse({
    clientName: text(formData, "clientName"),
    industry: text(formData, "industry"),
    siteCity: text(formData, "siteCity"),
    siteState: text(formData, "siteState"),
    category: text(formData, "category"),
    scope: text(formData, "scope"),
    headcount: text(formData, "headcount") || "0",
    startedYear: text(formData, "startedYear"),
    endedYear: text(formData, "endedYear"),
    ongoing: checkbox(formData, "ongoing"),
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
    clientName: d.clientName,
    industry: d.industry ?? null,
    siteCity: d.siteCity,
    siteState: d.siteState,
    category: d.category ?? null,
    scope: d.scope ?? null,
    headcount: d.headcount,
    startedYear: d.startedYear ?? null,
    endedYear: d.ongoing ? null : d.endedYear ?? null,
    ongoing: d.ongoing,
  };

  const id = text(formData, "id");
  if (id) {
    // Scoped to the owner: an id from another firm's list must not be editable.
    const { count } = await prisma.contractorClient.updateMany({
      where: { id, contractorId: profile.id },
      // Editing an entry drops any prior admin verification — the details it
      // was verified against have changed.
      data: { ...data, verified: false },
    });
    if (count === 0) return { ok: false, error: "That client entry no longer exists." };
    await audit(user.id, "CLIENT_UPDATE", id);
  } else {
    await prisma.contractorClient.create({ data: { ...data, contractorId: profile.id } });
    await audit(user.id, "CLIENT_ADD", d.clientName);
  }

  revalidatePath("/contractor/clients");
  revalidatePath("/contractor");
  return { ok: true, message: id ? "Client updated." : "Client added to your track record." };
}

export async function deleteClient(formData: FormData): Promise<void> {
  const user = await requireRole("CONTRACTOR");
  const profile = await profileFor(user.id);
  if (!profile) return;

  await prisma.contractorClient.deleteMany({
    where: { id: text(formData, "id"), contractorId: profile.id },
  });
  revalidatePath("/contractor/clients");
}

// ---------------------------------------------------------------------------
// Verification documents
// ---------------------------------------------------------------------------

/** One answer on the contractor's verification checklist — GST or PAN. */
export async function saveVerification(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("CONTRACTOR");
  const profile = await profileFor(user.id);
  if (!profile) return { ok: false, error: "Complete your firm profile first." };

  const limit = await rateLimit(`upload:user:${user.id}`, RATE_LIMITS.upload);
  if (!limit.ok) {
    return { ok: false, error: `Too many changes. ${retryMessage(limit.retryAfter)}` };
  }

  const { state, type, uploaded } = await saveVerificationAnswer(
    "CONTRACTOR",
    profile.id,
    formData,
  );
  if (state?.ok && type) {
    await audit(user.id, uploaded ? "DOCUMENT_UPLOAD" : "VERIFICATION_ANSWER", type);
    revalidatePath("/contractor/documents");
    revalidatePath("/contractor");
  }
  return state;
}

export async function deleteDocument(formData: FormData): Promise<void> {
  const user = await requireRole("CONTRACTOR");
  const profile = await profileFor(user.id);
  if (!profile) return;

  await prisma.document.deleteMany({
    where: { id: text(formData, "id"), contractorId: profile.id },
  });
  revalidatePath("/contractor/documents");
}
