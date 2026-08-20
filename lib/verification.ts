import "server-only";
import { prisma } from "@/lib/db";
import { readUploadFile } from "@/lib/uploads";
import { verificationItem, verificationItemsFor, type Side, type VerificationItem } from "@/lib/constants";
import { verificationAnswerSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { text } from "@/lib/forms";

/**
 * The verification checklist, shared by both sides of the marketplace.
 *
 * A company answers three questions (GST, PAN, CLRA registration) and a
 * contractor two (GST, PAN). Each answer is yes or no; a yes has to be backed
 * by the registration number *and* the certificate, because either one alone
 * is unverifiable — the reviewer's whole job is comparing the two.
 *
 * The number lands on the profile rather than on the Document row so there is
 * one place a GSTIN lives, whether it was typed on the profile form or here.
 */

/** The profile columns the checklist reads and writes. CLRA is company-only. */
export type VerificationProfile = {
  gstin: string | null;
  pan: string | null;
  hasGst: boolean | null;
  hasPan: boolean | null;
  clraRegNo?: string | null;
  hasClra?: boolean | null;
};

export type ChecklistDocument = {
  id: string;
  fileName: string;
  status: string;
  reviewNotes: string | null;
  createdAt: Date;
};

export type ChecklistRow = {
  item: VerificationItem;
  /** null until the question has been answered. */
  answer: boolean | null;
  idNumber: string | null;
  document: ChecklistDocument | null;
};

function readAnswer(
  type: string,
  p: VerificationProfile,
): { answer: boolean | null; idNumber: string | null } {
  switch (type) {
    case "GST":
      return { answer: p.hasGst, idNumber: p.gstin };
    case "PAN":
      return { answer: p.hasPan, idNumber: p.pan };
    case "CLRA":
      return { answer: p.hasClra ?? null, idNumber: p.clraRegNo ?? null };
    default:
      return { answer: null, idNumber: null };
  }
}

/**
 * The checklist as the owner's page renders it: one row per question, carrying
 * the answer, the number and the most recent certificate for that question.
 */
export function checklistRows(
  side: Side,
  profile: VerificationProfile,
  documents: (ChecklistDocument & { type: string })[],
): ChecklistRow[] {
  return verificationItemsFor(side).map((item) => ({
    item,
    ...readAnswer(item.value, profile),
    document: documents.find((d) => d.type === item.value) ?? null,
  }));
}

/** Documents left over from the older, longer list — shown, never asked for. */
export function otherDocuments<T extends { type: string }>(side: Side, documents: T[]): T[] {
  const asked = new Set(verificationItemsFor(side).map((i) => i.value));
  return documents.filter((d) => !asked.has(d.type));
}

function companyData(type: string, answer: boolean, idNumber: string | null) {
  switch (type) {
    case "GST":
      return { hasGst: answer, gstin: idNumber };
    case "PAN":
      return { hasPan: answer, pan: idNumber };
    default:
      return { hasClra: answer, clraRegNo: idNumber };
  }
}

function contractorData(type: string, answer: boolean, idNumber: string | null) {
  return type === "GST"
    ? { hasGst: answer, gstin: idNumber }
    : { hasPan: answer, pan: idNumber };
}

/**
 * Records one answer.
 *
 * Callers have already proved who the user is and that the profile is theirs;
 * this only decides what the answer means for the stored record.
 */
export async function saveVerificationAnswer(
  side: Side,
  profileId: string,
  formData: FormData,
): Promise<{ state: ActionState; type?: string; uploaded?: boolean }> {
  const type = text(formData, "type");
  if (!verificationItem(side, type)) {
    return { state: { ok: false, error: "Unknown verification item." } };
  }

  const parsed = verificationAnswerSchema.safeParse({
    type,
    answer: text(formData, "answer"),
    idNumber: text(formData, "idNumber"),
  });
  if (!parsed.success) {
    return {
      state: {
        ok: false,
        error: "Please fix the errors below.",
        fieldErrors: fieldErrors(parsed.error),
      },
    };
  }
  const { answer, idNumber } = parsed.data;

  const owner = side === "COMPANY" ? { companyId: profileId } : { contractorId: profileId };
  const existing = await prisma.document.findFirst({
    where: { ...owner, type },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (answer === "NO") {
    // Refusing rather than deleting: a certificate on file contradicts the
    // answer, and quietly destroying the uploaded file to resolve that is not
    // this action's decision to make.
    if (existing) {
      return {
        state: {
          ok: false,
          error: "Remove the uploaded certificate before answering no.",
        },
      };
    }
    // The number goes with the answer: a firm that holds no GST registration
    // cannot have a GSTIN, and leaving a stale one behind would leave the
    // reviewer looking at a record that contradicts itself.
    await writeProfile(side, profileId, type, false, null);
    return { state: { ok: true, message: "Answer saved." }, type };
  }

  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !existing) {
    return { state: { ok: false, error: "Attach the certificate to finish this item." } };
  }

  if (hasFile) {
    // Sniffs the real format from the bytes rather than trusting file.type,
    // which is attacker-controlled — see lib/uploads.ts.
    const saved = await readUploadFile(file);
    if (!saved.ok) return { state: { ok: false, error: saved.error } };

    // One certificate per question: a replacement supersedes what was there,
    // and the new row starts PENDING so a replaced file is reviewed again.
    await prisma.$transaction([
      prisma.document.deleteMany({ where: { ...owner, type } }),
      prisma.document.create({
        data: {
          ...owner,
          type,
          fileName: saved.fileName,
          data: saved.buffer,
          mimeType: saved.mimeType,
          size: saved.size,
        },
      }),
    ]);
  }

  await writeProfile(side, profileId, type, true, idNumber);
  return {
    state: { ok: true, message: hasFile ? "Saved for review." : "Details updated." },
    type,
    uploaded: hasFile,
  };
}

async function writeProfile(
  side: Side,
  profileId: string,
  type: string,
  answer: boolean,
  idNumber: string | null,
) {
  if (side === "COMPANY") {
    await prisma.companyProfile.update({
      where: { id: profileId },
      data: companyData(type, answer, idNumber),
    });
  } else {
    await prisma.contractorProfile.update({
      where: { id: profileId },
      data: contractorData(type, answer, idNumber),
    });
  }
}
