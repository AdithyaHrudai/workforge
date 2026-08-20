import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminRequestIp, getAdminIdentity } from "@/lib/admin-auth";
import { adminAudit } from "@/lib/notify";
import { ALLOWED_UPLOAD_MIME } from "@/lib/constants";
import { sanitizeFileName } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * Serves a verification document to an administrator.
 *
 * This is the single most sensitive endpoint on the platform: a PAN card, a
 * labour licence, an owner's photo ID. Three things follow from that, and all
 * three are the reason this route exists separately from the owner-facing one.
 *
 *  1. It authenticates against the admin session, never a marketplace session.
 *
 *  2. Every view is written to the audit log *before* the bytes go out. Opening
 *     a document is the access; recording it afterwards would mean a request
 *     that failed midway left no trace of what was already read. The trail is
 *     what makes "admins can see your ID" a controlled statement rather than an
 *     open-ended one — an admin cannot look at somebody's papers without the
 *     platform knowing which admin, which document and when.
 *
 *  3. An admin whose password is pending rotation is refused. Until they change
 *     it, somebody else knows their credential, so this is not yet a session
 *     that can be attributed to one person.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminIdentity();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });
  if (admin.mustChangePassword) {
    return new NextResponse("Change your password before reviewing documents", { status: 403 });
  }

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      type: true,
      data: true,
      mimeType: true,
      fileName: true,
      contractor: { select: { id: true, firmName: true } },
      company: { select: { id: true, companyName: true } },
    },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const subject = doc.contractor
    ? `contractor=${doc.contractor.id} (${doc.contractor.firmName})`
    : doc.company
      ? `company=${doc.company.id} (${doc.company.companyName})`
      : "orphaned document";

  await adminAudit(
    admin,
    "ADMIN_DOC_VIEW",
    `${doc.type} ${doc.id} · ${subject}`,
    adminRequestIp(),
  );

  const trusted = ALLOWED_UPLOAD_MIME.includes(doc.mimeType);
  const contentType = trusted ? doc.mimeType : "application/octet-stream";
  const disposition = trusted ? "inline" : "attachment";
  const fileName = sanitizeFileName(doc.fileName);

  return new NextResponse(Buffer.from(doc.data) as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "Content-Length": String(doc.data.byteLength),
      // no-store, not merely private: somebody else's ID document must not sit
      // in a shared ops machine's disk cache after the tab is closed.
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; object-src 'none'",
      "Referrer-Policy": "no-referrer",
    },
  });
}
