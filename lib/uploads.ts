import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES } from "@/lib/constants";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

function resolveDir(): string {
  return path.isAbsolute(UPLOAD_DIR) ? UPLOAD_DIR : path.join(process.cwd(), UPLOAD_DIR);
}

export async function saveUpload(
  file: File,
): Promise<{ ok: true; storedName: string; size: number; mimeType: string } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: "No file selected." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "File is larger than 5 MB." };
  if (!ALLOWED_UPLOAD_MIME.includes(file.type)) {
    return { ok: false, error: "Only PDF, JPG, PNG or WEBP files are allowed." };
  }

  const dir = resolveDir();
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(file.name).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, "");
  const storedName = `${crypto.randomUUID()}${ext || ""}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, storedName), buffer);

  return { ok: true, storedName, size: file.size, mimeType: file.type };
}

export async function readUpload(storedName: string): Promise<Buffer | null> {
  // Guard against path traversal — only a bare filename is allowed.
  if (!storedName || storedName.includes("/") || storedName.includes("\\") || storedName.includes("..")) {
    return null;
  }
  try {
    return await fs.readFile(path.join(resolveDir(), storedName));
  } catch {
    return null;
  }
}

export async function deleteUpload(storedName: string): Promise<void> {
  if (!storedName || storedName.includes("/") || storedName.includes("\\") || storedName.includes("..")) return;
  try {
    await fs.unlink(path.join(resolveDir(), storedName));
  } catch {
    /* ignore */
  }
}
