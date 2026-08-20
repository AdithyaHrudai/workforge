import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEngagementWithParties, isParticipant } from "@/lib/engagements";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eng = await getEngagementWithParties(params.id);
  if (!eng) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Participants only. Administrators used to be admitted here; they are not,
  // because verifying a firm's paperwork never requires reading what two
  // parties said to each other in private.
  if (!isParticipant(eng, user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { engagementId: eng.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, senderId: true, body: true, createdAt: true },
  });

  return NextResponse.json({ messages, me: user.id });
}
