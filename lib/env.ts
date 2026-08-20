/**
 * Environment checks, run once when the server starts.
 *
 * The failure this prevents is the quiet one: a deploy with no AUTH_SECRET
 * boots fine, serves the marketing pages, and only falls over when the first
 * person tries to sign in — by which time the deploy looks successful. Failing
 * at import time turns that into an obvious, immediate error.
 *
 * Development is warned rather than stopped, so a fresh clone can still run the
 * public pages before its .env is filled in.
 */

type Check = { name: string; ok: (v: string | undefined) => boolean; why: string };

const CHECKS: Check[] = [
  {
    name: "DATABASE_URL",
    ok: (v) => Boolean(v && v.startsWith("post")),
    why: "a PostgreSQL connection string",
  },
  {
    name: "AUTH_SECRET",
    // 32 hex characters is the floor for an HS256 signing key that is not worth
    // attacking. lib/auth.ts refuses anything under 16 outright.
    ok: (v) => Boolean(v && v.length >= 32),
    why: "at least 32 characters — generate with: openssl rand -hex 32",
  },
];

/** Optional integrations. Absent is fine; half-configured is not. */
const PAIRS: [string, string][] = [
  ["RESEND_API_KEY", "EMAIL_FROM"],
  ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
];

export function checkEnv(): string[] {
  const problems: string[] = [];

  for (const c of CHECKS) {
    if (!c.ok(process.env[c.name])) problems.push(`${c.name} is missing or invalid — needs ${c.why}.`);
  }

  for (const [a, b] of PAIRS) {
    const has = (n: string) => Boolean(process.env[n]);
    if (has(a) !== has(b)) {
      problems.push(`${a} and ${b} must be set together — one without the other does nothing.`);
    }
  }

  return problems;
}

let checked = false;

export function assertEnv(): void {
  if (checked) return;
  checked = true;

  const problems = checkEnv();
  if (problems.length === 0) return;

  const message = `Environment is not configured:\n  - ${problems.join("\n  - ")}`;
  if (process.env.NODE_ENV === "production") throw new Error(message);
  console.warn(`[env] ${message}`);
}
