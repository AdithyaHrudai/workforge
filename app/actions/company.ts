"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { companyProfileSchema, jobSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { audit } from "@/lib/notify";

function str(v: FormDataEntryValue | null): string | undefined {
  const s = (v ?? "").toString().trim();
  return s === "" ? undefined : s;
}

export async function saveCompanyProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("COMPANY");

  const parsed = companyProfileSchema.safeParse({
    companyName: formData.get("companyName"),
    entityType: str(formData.get("entityType")),
    industry: formData.get("industry") || "",
    contactName: formData.get("contactName"),
    contactMobile: formData.get("contactMobile"),
    contactEmail: formData.get("contactEmail"),
    city: formData.get("city"),
    district: formData.get("district") || "",
    state: formData.get("state"),
    pincode: formData.get("pincode") || "",
    gstin: formData.get("gstin") || "",
    about: formData.get("about") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }
  const d = parsed.data;

  const data = {
    companyName: d.companyName,
    entityType: d.entityType || null,
    industry: d.industry || null,
    contactName: d.contactName,
    contactMobile: d.contactMobile,
    contactEmail: d.contactEmail,
    city: d.city,
    district: d.district || null,
    state: d.state,
    pincode: d.pincode || null,
    gstin: d.gstin || null,
    about: d.about || null,
  };

  const existing = await prisma.companyProfile.findUnique({ where: { userId: user.id } });
  if (existing) {
    await prisma.companyProfile.update({ where: { userId: user.id }, data });
  } else {
    // Companies are active immediately; admin can issue a "verified" badge later.
    await prisma.companyProfile.create({ data: { ...data, userId: user.id, status: "APPROVED" } });
  }

  await audit(user.id, existing ? "COMPANY_PROFILE_UPDATE" : "COMPANY_PROFILE_CREATE");
  revalidatePath("/company");
  return { ok: true, message: "Company profile saved." };
}

export async function createJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("COMPANY");
  const company = await prisma.companyProfile.findUnique({ where: { userId: user.id } });
  if (!company) return { ok: false, error: "Complete your company profile first." };

  let lines: unknown = [];
  try {
    lines = JSON.parse(String(formData.get("linesJson") || "[]"));
  } catch {
    lines = [];
  }

  const parsed = jobSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    city: formData.get("city"),
    district: formData.get("district") || "",
    state: formData.get("state"),
    pincode: formData.get("pincode") || "",
    startDate: formData.get("startDate") || "",
    durationDays: formData.get("durationDays") || "",
    shift: formData.get("shift") || "",
    accommodationProvided: formData.get("accommodationProvided") === "on",
    foodProvided: formData.get("foodProvided") === "on",
    urgency: formData.get("urgency"),
    wageOffered: formData.get("wageOffered") || "",
    lines,
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }
  const d = parsed.data;

  const job = await prisma.job.create({
    data: {
      companyId: company.id,
      title: d.title,
      description: d.description || null,
      city: d.city,
      district: d.district || null,
      state: d.state,
      pincode: d.pincode || null,
      startDate: d.startDate ? new Date(d.startDate) : null,
      durationDays: d.durationDays ? Number(d.durationDays) : null,
      shift: d.shift || null,
      accommodationProvided: Boolean(d.accommodationProvided),
      foodProvided: Boolean(d.foodProvided),
      urgency: d.urgency,
      wageOffered: d.wageOffered ? Number(d.wageOffered) : null,
      lines: {
        create: d.lines.map((l) => ({
          trade: l.trade,
          headcount: Number(l.headcount),
          skillLevel: l.skillLevel,
          wageOffered: l.wageOffered ? Number(l.wageOffered) : null,
        })),
      },
    },
  });

  await audit(user.id, "JOB_CREATE", job.id);
  redirect(`/company/jobs/${job.id}`);
}

export async function closeJob(formData: FormData): Promise<void> {
  const user = await requireRole("COMPANY");
  const id = String(formData.get("id"));
  const job = await prisma.job.findUnique({ where: { id }, include: { company: true } });
  if (job && job.company.userId === user.id && job.status === "OPEN") {
    await prisma.job.update({ where: { id }, data: { status: "CLOSED" } });
    revalidatePath(`/company/jobs/${id}`);
    revalidatePath("/company/jobs");
  }
}
