"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { messageSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { getEngagementWithParties, isParticipant } from "@/lib/engagements";
import { notify } from "@/lib/notify";
import { RATE_LIMITS, rateLimit, retryMessage } from "@/lib/ratelimit";

export async function sendMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const limit = await rateLimit(`message:user:${user.id}`, RATE_LIMITS.message);
  if (!limit.ok) {
    return { ok: false, error: `You're sending messages too quickly. ${retryMessage(limit.retryAfter)}` };
  }

  const parsed = messageSchema.safeParse({
    engagementId: formData.get("engagementId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Message cannot be empty.", fieldErrors: fieldErrors(parsed.error) };
  }

  const eng = await getEngagementWithParties(parsed.data.engagementId);
  if (!eng || !isParticipant(eng, user.id)) {
    return { ok: false, error: "You are not part of this conversation." };
  }
  if (eng.status === "CANCELLED") {
    return { ok: false, error: "This engagement has been cancelled." };
  }

  await prisma.message.create({
    data: { engagementId: eng.id, senderId: user.id, body: parsed.data.body },
  });

  const otherUserId = eng.company.user.id === user.id ? eng.contractor.user.id : eng.company.user.id;
  await notify({
    userId: otherUserId,
    type: "MESSAGE",
    body: `New message from ${user.name} about "${eng.job.title}".`,
    link: `/engagements/${eng.id}`,
  });

  revalidatePath(`/engagements/${eng.id}`);
  return { ok: true };
}
