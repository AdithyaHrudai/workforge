import { prisma } from "@/lib/db";

/**
 * In-app notification. (Email/SMS/WhatsApp delivery is a Phase-2 add-on; wire a
 * provider like MSG91/Resend here when those credentials are configured.)
 */
export async function notify(params: {
  userId: string;
  type: string;
  body: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      body: params.body,
      link: params.link,
    },
  });
}

export async function audit(actorId: string, action: string, detail?: string) {
  await prisma.auditLog.create({ data: { actorId, action, detail } });
}
