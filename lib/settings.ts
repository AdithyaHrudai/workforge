import { cache } from "react";
import { prisma } from "@/lib/db";

const PLATFORM_NAME = process.env.PLATFORM_NAME ?? "WorkForge";

export type PlatformSettings = Awaited<ReturnType<typeof getSettings>>;

/**
 * Returns the singleton Setting row, creating it on first access.
 *
 * Wrapped in React's `cache()`, which deduplicates it for the lifetime of a
 * single render. Several pages ask for settings two or three times — once in a
 * layout, again in the page, again inside a helper — and against a database
 * roughly 450ms away each of those was a separate round trip. Now the first
 * call pays, the rest are free. This is per-request memoisation, not a cache
 * with a TTL: an admin changing a setting still takes effect on the next
 * request.
 *
 * The defaults here encode the client's launch posture: nothing is charged,
 * contact details are open so the network can grow by word of mouth, companies
 * can post without waiting on manual approval, but contractors must be vetted
 * before they can quote on live requirements.
 */
export const getSettings = cache(async function getSettings() {
  const existing = await prisma.setting.findUnique({ where: { id: 1 } });
  if (existing) return existing;

  // upsert rather than create: two cold-start requests can reach this at once.
  return prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, platformName: PLATFORM_NAME },
  });
});
