import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: { contractor: true },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const isOwner = doc.contractor.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) return new NextResponse("Forbidden", { status: 403 });

  const buf = await readUpload(doc.storedName);
  if (!buf) return new NextResponse("File missing", { status: 404 });

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
