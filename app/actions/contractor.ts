"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { contractorProfileSchema, workerSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { saveUpload, deleteUpload } from "@/lib/uploads";
import { audit } from "@/lib/notify";
import { DOCUMENT_TYPES } from "@/lib/constants";

function str(v: FormDataEntryValue | null): string | undefined {
  const s = (v ?? "").toString().trim();
  return s === "" ? undefined : s;
}

export async function saveContractorProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("CONTRACTOR");

  const parsed = contractorProfileSchema.safeParse({
    firmName: formData.get("firmName"),
    entityType: str(formData.get("entityType")),
    ownerName: formData.get("ownerName"),
    yearEstablished: formData.get("yearEstablished") || "",
    address: formData.get("address") || "",
    city: formData.get("city"),
    district: formData.get("district") || "",
    state: formData.get("state"),
    pincode: formData.get("pincode") || "",
    serviceAreas: formData.get("serviceAreas") || "",
    willingOutstation: formData.get("willingOutstation") === "on",
    pan: formData.get("pan") || "",
    gstin: formData.get("gstin") || "",
    labourLicenceNo: formData.get("labourLicenceNo") || "",
    esicNo: formData.get("esicNo") || "",
    epfNo: formData.get("epfNo") || "",
    trades: formData.getAll("trades").map(String),
    totalWorkforce: formData.get("totalWorkforce") || "0",
    available: formData.get("available") || "0",
    mobilizationDays: formData.get("mobilizationDays") || "0",
    about: formData.get("about") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }
  const d = parsed.data;

  const data = {
    firmName: d.firmName,
    entityType: d.entityType || null,
    ownerName: d.ownerName,
    yearEstablished: d.yearEstablished ? Number(d.yearEstablished) : null,
    address: d.address || null,
    city: d.city,
    district: d.district || null,
    state: d.state,
    pincode: d.pincode || null,
    serviceAreas: d.serviceAreas || null,
    willingOutstation: Boolean(d.willingOutstation),
    pan: d.pan || null,
    gstin: d.gstin || null,
    labourLicenceNo: d.labourLicenceNo || null,
    esicNo: d.esicNo || null,
    epfNo: d.epfNo || null,
    trades: JSON.stringify(d.trades),
    totalWorkforce: d.totalWorkforce,
    available: d.available,
    mobilizationDays: d.mobilizationDays,
    about: d.about || null,
  };

  const existing = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });
  if (existing) {
    await prisma.contractorProfile.update({ where: { userId: user.id }, data });
  } else {
    await prisma.contractorProfile.create({ data: { ...data, userId: user.id } });
  }

  await audit(user.id, existing ? "CONTRACTOR_PROFILE_UPDATE" : "CONTRACTOR_PROFILE_CREATE");
  revalidatePath("/contractor");
  revalidatePath("/contractor/profile");
  return { ok: true, message: "Profile saved. Our team will review your verification documents." };
}

export async function addWorker(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return { ok: false, error: "Complete your firm profile first." };

  const parsed = workerSchema.safeParse({
    name: formData.get("name"),
    gender: formData.get("gender") || "",
    age: formData.get("age") || "",
    trade: formData.get("trade"),
    skillLevel: formData.get("skillLevel"),
    yearsExperience: formData.get("yearsExperience") || "",
    nativeState: formData.get("nativeState") || "",
    expectedDailyWage: formData.get("expectedDailyWage") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }
  const d = parsed.data;
  await prisma.worker.create({
    data: {
      contractorId: profile.id,
      name: d.name,
      gender: d.gender || null,
      age: d.age ? Number(d.age) : null,
      trade: d.trade,
      skillLevel: d.skillLevel,
      yearsExperience: d.yearsExperience ? Number(d.yearsExperience) : null,
      nativeState: d.nativeState || null,
      expectedDailyWage: d.expectedDailyWage ? Number(d.expectedDailyWage) : null,
    },
  });
  revalidatePath("/contractor/workforce");
  return { ok: true, message: "Worker added." };
}

export async function deleteWorker(formData: FormData): Promise<void> {
  const user = await requireRole("CONTRACTOR");
  const id = String(formData.get("id"));
  const worker = await prisma.worker.findUnique({ where: { id }, include: { contractor: true } });
  if (worker && worker.contractor.userId === user.id) {
    await prisma.worker.delete({ where: { id } });
    revalidatePath("/contractor/workforce");
  }
}

export async function uploadDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("CONTRACTOR");
  const profile = await prisma.contractorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return { ok: false, error: "Complete your firm profile first." };

  const type = String(formData.get("type") || "");
  if (!DOCUMENT_TYPES.some((t) => t.value === type)) {
    return { ok: false, error: "Choose a valid document type." };
  }
  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "Choose a file to upload." };

  const saved = await saveUpload(file);
  if (!saved.ok) return { ok: false, error: saved.error };

  await prisma.document.create({
    data: {
      contractorId: profile.id,
      type,
      fileName: file.name.slice(0, 200),
      storedName: saved.storedName,
      mimeType: saved.mimeType,
      size: saved.size,
    },
  });
  await audit(user.id, "DOCUMENT_UPLOAD", type);
  revalidatePath("/contractor/documents");
  return { ok: true, message: "Document uploaded for review." };
}

export async function deleteDocument(formData: FormData): Promise<void> {
  const user = await requireRole("CONTRACTOR");
  const id = String(formData.get("id"));
  const doc = await prisma.document.findUnique({ where: { id }, include: { contractor: true } });
  if (doc && doc.contractor.userId === user.id) {
    await deleteUpload(doc.storedName);
    await prisma.document.delete({ where: { id } });
    revalidatePath("/contractor/documents");
  }
}
