import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ALLOWED_UPLOAD_MIME } from "@/lib/constants";
import { sanitizeFileName } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    select: {
      data: true,
      mimeType: true,
      fileName: true,
      contractor: { select: { userId: true } },
    },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const isOwner = doc.contractor.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) return new NextResponse("Forbidden", { status: 403 });

  // Uploads are sniffed at write time, but rows created before that was enforced
  // may carry a browser-supplied type. Anything unrecognised is downgraded to an
  // opaque download rather than rendered.
  const trusted = ALLOWED_UPLOAD_MIME.includes(doc.mimeType);
  const contentType = trusted ? doc.mimeType : "application/octet-stream";
  const disposition = trusted ? "inline" : "attachment";
  const fileName = sanitizeFileName(doc.fileName);

  return new NextResponse(Buffer.from(doc.data) as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "Content-Length": String(doc.data.byteLength),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      // Renders the document in a fully sandboxed context, so an embedded
      // script in a crafted PDF has no origin to act against.
      "Content-Security-Policy": "sandbox; default-src 'none'; object-src 'none'",
    },
  });
}
