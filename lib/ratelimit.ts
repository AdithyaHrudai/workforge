import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Fixed-window rate limiting backed by Postgres.
 *
 * Serverless instances are ephemeral and don't share memory, so an in-process
 * Map would reset on every cold start and be trivially bypassable. The counter
 * lives in the database and is incremented with a single atomic upsert, so
 * concurrent requests can't race past the limit.
 */

export type RateLimitResult = {
  ok: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

export type RateLimitRule = {
  /** Maximum requests permitted per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

/** Tuned for a marketplace: strict on credentials, looser on ordinary writes. */
export const RATE_LIMITS = {
  /** Per-IP login attempts — blunts credential stuffing from one source. */
  loginByIp: { limit: 10, windowSeconds: 300 },
  /** Per-account login attempts — blunts distributed guessing at one account. */
  loginByEmail: { limit: 5, windowSeconds: 900 },
  /**
   * The admin console, held tighter than the marketplace login. There is no
   * self-service admin account, so a sustained burst against it is never a
   * forgetful user.
   *
   * The per-IP bucket is the looser of the two on purpose: an ops team shares
   * one office address, and several people signing in at the start of a shift
   * must not lock the whole floor out of the console. The real protection is
   * the per-username bucket plus the per-account lockout in lib/admin-auth.ts,
   * neither of which a second admin's sign-in can consume.
   */
  adminLoginByIp: { limit: 20, windowSeconds: 900 },
  adminLoginByUsername: { limit: 5, windowSeconds: 900 },
  /** Signups per IP — stops automated account farming. */
  register: { limit: 5, windowSeconds: 3600 },
  /**
   * Password-reset requests. The per-address bucket matters more than the
   * per-IP one: without it, anyone can have a stranger's inbox filled with
   * reset mail, and every send retires the link that person may be mid-way
   * through using.
   */
  resetByIp: { limit: 10, windowSeconds: 900 },
  resetByEmail: { limit: 3, windowSeconds: 3600 },
  /** Verification mail a signed-in user can ask to have re-sent. */
  emailVerify: { limit: 5, windowSeconds: 3600 },
  /** Password changes and account edits by a signed-in user. */
  accountUpdate: { limit: 10, windowSeconds: 3600 },
  /** Proposal submissions per contractor. */
  proposal: { limit: 30, windowSeconds: 3600 },
  /** Requirement postings per company — stops listing spam. */
  posting: { limit: 20, windowSeconds: 3600 },
  /** Invitations sent to contractors from search. */
  invite: { limit: 50, windowSeconds: 3600 },
  /** Chat messages per user. */
  message: { limit: 60, windowSeconds: 300 },
  /** Document uploads per contractor. */
  upload: { limit: 20, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Best-effort client IP. On Vercel `x-forwarded-for` is set by the edge and the
 * left-most entry is the real client. Falls back to a constant so a missing
 * header degrades to a shared bucket rather than to no limit at all.
 */
export function clientIp(): string {
  const h = headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Consumes one unit against `key`. Returns `ok: false` once the limit is hit.
 *
 * Fails **open** on a database error: a marketplace that locks everybody out
 * because the limiter is down is worse than one that briefly stops limiting.
 * The trade-off is deliberate — rate limiting is defence in depth here, not the
 * primary access control.
 */
export async function rateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const windowMs = rule.windowSeconds * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const retryAfter = Math.ceil((windowStart.getTime() + windowMs - now) / 1000);

  try {
    // Single atomic statement: concurrent callers each get a distinct count.
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "windowStart", "count")
      VALUES (${key}, ${windowStart}, 1)
      ON CONFLICT ("key", "windowStart")
      DO UPDATE SET "count" = "RateLimit"."count" + 1
      RETURNING "count"
    `;

    const count = Number(rows[0]?.count ?? 1);
    return {
      ok: count <= rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfter,
    };
  } catch (err) {
    console.error("[ratelimit] check failed, allowing request:", err);
    return { ok: true, remaining: rule.limit, retryAfter };
  }
}

/** Human-readable "try again in …" for user-facing error messages. */
export function retryMessage(retryAfter: number): string {
  if (retryAfter <= 60) return "Please try again in a minute.";
  const minutes = Math.ceil(retryAfter / 60);
  return `Please try again in ${minutes} minutes.`;
}

/**
 * Deletes counters from windows that can no longer be active. Safe to call
 * opportunistically; intended to be driven by a scheduled job in production.
 */
export async function pruneRateLimits(olderThanHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 3600 * 1000);
  const { count } = await prisma.rateLimit.deleteMany({
    where: { windowStart: { lt: cutoff } },
  });
  return count;
}
