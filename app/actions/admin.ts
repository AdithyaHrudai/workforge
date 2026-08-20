"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { adminRequestIp, requireAdmin, requireSuperAdmin } from "@/lib/admin-auth";
import { checkbox, text } from "@/lib/forms";
import { notify, adminAudit } from "@/lib/notify";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";

/**
 * The verification actions — the whole of what an administrator is here to do.
 *
 * Every one of them re-authenticates. A layout check does not cover a server
 * action: the action is its own entry point into the application, reachable by
 * anyone who can construct the request, so it must decide for itself.
 *
 * Every one of them also records who decided, and stamps the decision onto the
 * row being decided. "Approved" with no name and no timestamp against it is not
 * something anybody can be asked to stand behind six months later.
 */

const MODERATION_STATUSES = ["APPROVED", "REJECTED", "PENDING"];

export async function setContractorStatus(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status");
  const notes = text(formData, "notes") || null;
  if (!id || !MODERATION_STATUSES.includes(status)) return;

  const profile = await prisma.contractorProfile.update({
    where: { id },
    data: {
      status,
      moderationNotes: notes,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
    select: { userId: true, firmName: true },
  });

  await adminAudit(
    admin,
    "CONTRACTOR_STATUS",
    `${profile.firmName} (${id}) → ${status}${notes ? ` · "${notes}"` : ""}`,
    adminRequestIp(),
  );
  await notify({
    userId: profile.userId,
    type: "MODERATION",
    body:
      status === "APPROVED"
        ? "Your firm has been approved. You can now quote on live requirements and appear in company searches."
        : status === "REJECTED"
          ? `Your firm registration needs changes${notes ? `: ${notes}` : "."}`
          : "Your firm is under review.",
    link: "/contractor",
  });
  revalidatePath(`/admin/contractors/${id}`);
  revalidatePath("/admin/contractors");
  revalidatePath("/admin");
}

export async function setContractorVerified(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const verified = text(formData, "verified") === "true";
  if (!id) return;

  const profile = await prisma.contractorProfile.update({
    where: { id },
    data: { verified, reviewedAt: new Date(), reviewedById: admin.id },
    select: { userId: true, firmName: true },
  });
  await adminAudit(
    admin,
    "CONTRACTOR_VERIFY",
    `${profile.firmName} (${id}) → ${verified ? "verified" : "badge removed"}`,
    adminRequestIp(),
  );
  if (verified) {
    await notify({
      userId: profile.userId,
      type: "VERIFIED",
      body: "Your firm is now verified. Verified firms rank higher in company searches.",
      link: "/contractor",
    });
  }
  revalidatePath(`/admin/contractors/${id}`);
  revalidatePath("/admin/contractors");
}

/**
 * Rules on one uploaded document, from either side of the marketplace.
 *
 * The uploader is told the outcome. A rejection that nobody is told about
 * leaves a firm waiting on a verification that is never coming.
 */
export async function reviewDocument(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const decision = text(formData, "decision");
  const notes = text(formData, "notes") || null;
  if (!id || !["APPROVED", "REJECTED", "PENDING"].includes(decision)) return;

  const doc = await prisma.document.update({
    where: { id },
    data: {
      status: decision,
      reviewNotes: notes,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
    select: {
      type: true,
      contractorId: true,
      companyId: true,
      contractor: { select: { userId: true, firmName: true } },
      company: { select: { userId: true, companyName: true } },
    },
  });

  const label = DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type;
  const owner = doc.contractor
    ? { userId: doc.contractor.userId, name: doc.contractor.firmName, link: "/contractor/documents" }
    : doc.company
      ? { userId: doc.company.userId, name: doc.company.companyName, link: "/company/documents" }
      : null;

  await adminAudit(
    admin,
    "DOC_REVIEW",
    `${label} ${id} → ${decision}${owner ? ` · ${owner.name}` : ""}${notes ? ` · "${notes}"` : ""}`,
    adminRequestIp(),
  );

  if (owner && decision !== "PENDING") {
    await notify({
      userId: owner.userId,
      type: "MODERATION",
      body:
        decision === "APPROVED"
          ? `Your ${label} has been verified.`
          : `Your ${label} could not be verified${notes ? `: ${notes}` : ". Please upload a clearer or more current copy."}`,
      link: owner.link,
    });
  }

  if (doc.contractorId) revalidatePath(`/admin/contractors/${doc.contractorId}`);
  if (doc.companyId) revalidatePath(`/admin/companies/${doc.companyId}`);
  revalidatePath("/admin");
}

/**
 * Marks a client-list entry as corroborated. This is the platform's main
 * defence against an inflated track record: anybody can claim 200 people at a
 * plant, and the tick says somebody checked the work order.
 */
export async function setClientVerified(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const verified = text(formData, "verified") === "true";
  if (!id) return;

  const client = await prisma.contractorClient.update({
    where: { id },
    data: { verified },
    select: { contractorId: true, clientName: true },
  });
  await adminAudit(
    admin,
    "CLIENT_VERIFY",
    `${client.clientName} (${id}) → ${verified ? "corroborated" : "unverified"}`,
    adminRequestIp(),
  );
  revalidatePath(`/admin/contractors/${client.contractorId}`);
}

export async function setCompanyVerified(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const verified = text(formData, "verified") === "true";
  if (!id) return;

  const company = await prisma.companyProfile.update({
    where: { id },
    data: { verified, reviewedAt: new Date(), reviewedById: admin.id },
    select: { companyName: true },
  });
  await adminAudit(
    admin,
    "COMPANY_VERIFY",
    `${company.companyName} (${id}) → ${verified ? "verified" : "badge removed"}`,
    adminRequestIp(),
  );
  revalidatePath(`/admin/companies/${id}`);
  revalidatePath("/admin/companies");
}

/** Gates requirement posting when requireCompanyApproval is on. */
export async function setCompanyStatus(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status");
  const notes = text(formData, "notes") || null;
  if (!id || !MODERATION_STATUSES.includes(status)) return;

  const profile = await prisma.companyProfile.update({
    where: { id },
    data: {
      status,
      moderationNotes: notes,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
    select: { userId: true, companyName: true },
  });
  await adminAudit(
    admin,
    "COMPANY_STATUS",
    `${profile.companyName} (${id}) → ${status}${notes ? ` · "${notes}"` : ""}`,
    adminRequestIp(),
  );
  await notify({
    userId: profile.userId,
    type: "MODERATION",
    body:
      status === "APPROVED"
        ? "Your company has been approved. You can now post requirements and search contractors."
        : status === "REJECTED"
          ? `Your company registration needs changes${notes ? `: ${notes}` : "."}`
          : "Your company is under review.",
    link: "/company",
  });
  revalidatePath(`/admin/companies/${id}`);
  revalidatePath("/admin/companies");
  revalidatePath("/admin");
}

/**
 * Suspends or reactivates a marketplace account.
 *
 * Note what this cannot touch: an administrator. Admin accounts are a different
 * table and are managed from /admin/team, which is super-admin-only. An id
 * passed here that is not a User is simply not found.
 */
export async function setUserSuspended(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const suspend = text(formData, "suspend") === "true";
  if (!id) return;

  const user = await prisma.user.update({
    where: { id },
    data: {
      status: suspend ? "SUSPENDED" : "ACTIVE",
      // Bumping the token version kills any session the suspended user already
      // holds, rather than waiting for their cookie to expire.
      ...(suspend ? { tokenVersion: { increment: 1 } } : {}),
    },
    select: { name: true, email: true, role: true },
  });
  await adminAudit(
    admin,
    "USER_SUSPEND",
    `${user.name} <${user.email}> (${user.role.toLowerCase()}) → ${suspend ? "suspended" : "reactivated"}`,
    adminRequestIp(),
  );
  revalidatePath("/admin/contractors");
  revalidatePath("/admin/companies");
  revalidatePath("/admin/users");
}

/**
 * Platform-wide settings. Super admin only: these switches decide whether
 * verification gates anything at all, so they are not a verifier's to flip.
 */
export async function updateSettings(formData: FormData): Promise<void> {
  const admin = await requireSuperAdmin();

  const platformName = text(formData, "platformName") || "WorkForge";
  const reveals = Math.max(0, Math.min(1000, Number(text(formData, "freeContactRevealsPerMonth")) || 0));

  const data = {
    platformName,
    requireCompanyApproval: checkbox(formData, "requireCompanyApproval"),
    requireContractorApproval: checkbox(formData, "requireContractorApproval"),
    contactMaskingEnabled: checkbox(formData, "contactMaskingEnabled"),
    freeContactRevealsPerMonth: reveals,
  };

  await prisma.setting.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  await adminAudit(
    admin,
    "SETTINGS_UPDATE",
    `masking=${data.contactMaskingEnabled};reveals=${reveals};companyApproval=${data.requireCompanyApproval};contractorApproval=${data.requireContractorApproval}`,
    adminRequestIp(),
  );
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}
