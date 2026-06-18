import "server-only";
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES } from "@/lib/constants";

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
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "File is larger than 5 MB." };
  if (!ALLOWED_UPLOAD_MIME.includes(file.type)) {
    return { ok: false, error: "Only PDF, JPG, PNG or WEBP files are allowed." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return { ok: true, buffer, size: file.size, mimeType: file.type, fileName: file.name.slice(0, 200) };
}
