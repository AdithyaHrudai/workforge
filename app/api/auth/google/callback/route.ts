import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/notify";
import { OAUTH_STATE_COOKIE, exchangeCode, googleEnabled, readState } from "@/lib/google-oauth";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const fail = (req: NextRequest, reason: string) =>
  NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));

/**
 * Completes the Google handshake and issues a marketplace session.
 *
 * Account resolution goes in a deliberate order:
 *   1. by `googleId` — the stable subject, unaffected by an email change;
 *   2. by verified email — links Google to an account that already signed up
 *      with a password, so nobody ends up with two accounts;
 *   3. otherwise create one, with the role chosen on the sign-in page.
 *
 * Step 2 only runs when Google says the address is verified. Without that check
 * anyone able to create a Google account on an unverified address could claim
 * an existing WorkForge account by signing in "as" its owner.
 */
export async function GET(req: NextRequest) {
  if (!googleEnabled()) return fail(req, "google_unavailable");

  // The callback is unauthenticated and hits the database, so it gets the same
  // treatment as the login form.
  const limit = await rateLimit(`oauth:ip:${clientIp()}`, { limit: 20, windowSeconds: 600 });
  if (!limit.ok) return fail(req, "rate_limited");

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail(req, "cancelled");

  const parsed = readState(params.get("state"), req.cookies.get(OAUTH_STATE_COOKIE)?.value);
  if (!parsed) return fail(req, "invalid_state");

  const code = params.get("code");
  if (!code) return fail(req, "no_code");

  const profile = await exchangeCode(code);
  if (!profile) return fail(req, "google_failed");

  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

  if (!user && profile.emailVerified) {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      if (byEmail.role !== "COMPANY" && byEmail.role !== "CONTRACTOR") {
        return fail(req, "not_allowed");
      }
      user = await prisma.user.update({
        where: { id: byEmail.id },
        // Google has proven the address, which is all our own link does.
        data: { googleId: profile.sub, emailVerified: true },
      });
    }
  }

  if (!user) {
    if (!profile.emailVerified) return fail(req, "email_unverified");
    user = await prisma.user.create({
      data: {
        role: parsed.role,
        name: profile.name,
        email: profile.email,
        emailVerified: true,
        googleId: profile.sub,
        // No password: this account can only be entered through Google until
        // its owner sets one. `passwordHash` is nullable for exactly this.
        passwordHash: null,
      },
    });
    await audit(user.id, "REGISTER", `google:${parsed.role}`);
  }

  if (user.status === "SUSPENDED") return fail(req, "suspended");
  if (user.role !== "COMPANY" && user.role !== "CONTRACTOR") return fail(req, "not_allowed");

  await createSession({
    uid: user.id,
    role: user.role,
    name: user.name,
    tv: user.tokenVersion,
  });

  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
