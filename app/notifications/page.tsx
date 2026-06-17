import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { markAllRead } from "@/app/actions/notifications";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const hasUnread = items.some((i) => !i.read);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        {hasUnread && (
          <form action={markAllRead}>
            <button className="btn-secondary text-xs">Mark all as read</button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card text-sm text-slate-500">No notifications yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const inner = (
              <div className={`card flex items-start gap-3 ${n.read ? "" : "border-brand-300 bg-brand-50/40"}`}>
                {!n.read && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-brand-500" />}
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">{n.body}</p>
                  <p className="text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
