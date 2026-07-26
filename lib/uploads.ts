import "server-only";
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES } from "@/lib/constants";

/**
 * Magic-number signatures for the formats we accept. `file.type` comes from the
 * browser and is attacker-controlled, so it can't decide what we store or what
 * Content-Type we later serve. We sniff the real format from the bytes and use
 * that instead — which is what makes serving these documents back safe.
 */
const SIGNATURES: { mime: string; test: (b: Buffer) => boolean }[] = [
  { mime: "application/pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: "image/webp",
    test: (b) =>
      b.subarray(0, 4).toString("latin1") === "RIFF" &&
      b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

/** Detects the true format from the file's leading bytes, or null if unknown. */
function sniffMimeType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  return SIGNATURES.find((s) => s.test(buffer))?.mime ?? null;
}

/**
 * Strips directory components and anything outside a conservative character set,
 * so a crafted filename can't influence headers or paths downstream.
 */
export function sanitizeFileName(name: string): string {
  const base = name.replace(/^.*[\\/]/, "");
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "");
  return cleaned.slice(0, 100) || "document";
}

/**
 * Validates an uploaded file and returns its bytes. Files are stored in the
 * database (Document.data) so the app works on serverless hosts with no disk.
 */
export async function readUploadFile(
  file: File,
): Promise<
  | { ok: true; buffer: Buffer; size: number; mimeType: string; fileName: string }
  | { ok: false; error: string }
> {
  if (!file || file.size === 0) return { ok: false, error: "No file selected." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File is larger than 5 MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Re-check the real length: file.size is client-reported metadata.
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File is larger than 5 MB." };
  }

  const detected = sniffMimeType(buffer);
  if (!detected || !ALLOWED_UPLOAD_MIME.includes(detected)) {
    return {
      ok: false,
      error: "Only PDF, JPG, PNG or WEBP files are allowed.",
    };
  }

  return {
    ok: true,
    buffer,
    size: buffer.byteLength,
    // The sniffed type, never file.type.
    mimeType: detected,
    fileName: sanitizeFileName(file.name),
  };
}
