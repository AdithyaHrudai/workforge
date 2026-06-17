"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { notify, audit } from "@/lib/notify";

export async function setContractorStatus(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")); // APPROVED | REJECTED | PENDING
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) return;

  const profile = await prisma.contractorProfile.update({
    where: { id },
    data: { status, moderationNotes: notes },
    include: { user: true },
  });
  await audit(admin.id, "CONTRACTOR_STATUS", `${id}=${status}`);
  await notify({
    userId: profile.userId,
    type: "MODERATION",
    body:
      status === "APPROVED"
        ? "Your firm has been approved — you can now bid on jobs."
        : status === "REJECTED"
          ? `Your firm registration needs changes${notes ? `: ${notes}` : "."}`
          : "Your firm is under review.",
    link: "/contractor",
  });
  revalidatePath(`/admin/contractors/${id}`);
  revalidatePath("/admin/contractors");
}

export async function setContractorVerified(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const verified = String(formData.get("verified")) === "true";
  const profile = await prisma.contractorProfile.update({
    where: { id },
    data: { verified },
    include: { user: true },
  });
  await audit(admin.id, "CONTRACTOR_VERIFY", `${id}=${verified}`);
  if (verified) {
    await notify({
      userId: profile.userId,
      type: "VERIFIED",
      body: "Your firm is now verified ✓ — verified contractors win more work.",
      link: "/contractor",
    });
  }
  revalidatePath(`/admin/contractors/${id}`);
  revalidatePath("/admin/contractors");
}

export async function reviewDocument(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")); // APPROVED | REJECTED
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!["APPROVED", "REJECTED"].includes(decision)) return;

  const doc = await prisma.document.update({
    where: { id },
    data: { status: decision, reviewNotes: notes },
    include: { contractor: true },
  });
  await audit(admin.id, "DOC_REVIEW", `${id}=${decision}`);
  revalidatePath(`/admin/contractors/${doc.contractorId}`);
}

export async function setCompanyVerified(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const verified = String(formData.get("verified")) === "true";
  await prisma.companyProfile.update({ where: { id }, data: { verified } });
  await audit(admin.id, "COMPANY_VERIFY", `${id}=${verified}`);
  revalidatePath("/admin/companies");
}

export async function setUserSuspended(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const suspend = String(formData.get("suspend")) === "true";
  if (id === admin.id) return; // don't suspend self
  await prisma.user.update({ where: { id }, data: { status: suspend ? "SUSPENDED" : "ACTIVE" } });
  await audit(admin.id, "USER_SUSPEND", `${id}=${suspend}`);
  revalidatePath("/admin/contractors");
  revalidatePath("/admin/companies");
}

export async function updateSettings(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const platformName = String(formData.get("platformName") || "ShramSetu").trim() || "ShramSetu";
  const fee = Math.max(0, Math.min(30, Number(formData.get("platformFeePercent")) || 0));
  const paymentsEnabled = String(formData.get("paymentsEnabled")) === "on";
  await prisma.setting.upsert({
    where: { id: 1 },
    update: { platformName, platformFeePercent: fee, paymentsEnabled },
    create: { id: 1, platformName, platformFeePercent: fee, paymentsEnabled },
  });
  await audit(admin.id, "SETTINGS_UPDATE", `fee=${fee};payments=${paymentsEnabled}`);
  revalidatePath("/admin/settings");
}
