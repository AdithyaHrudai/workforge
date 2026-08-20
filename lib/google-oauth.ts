import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { siteUrl } from "@/lib/site";

/**
 * Google sign-in, spoken directly to Google's OAuth 2.0 endpoints.
 *
 * No SDK and no Auth.js: the app already owns its session format, its own
 * `tokenVersion` revocation and a separate admin identity store. Dropping a
 * framework in beside that would mean two systems disagreeing about who is
 * signed in. This is three HTTP calls and a signature check.
 *
 * The whole module is inert until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are
 * set, so development and the test suites need no credentials and the button
 * simply does not render.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export const OAUTH_STATE_COOKIE = "wf_oauth_state";

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(): string {
  return `${siteUrl()}/api/auth/google/callback`;
}

/**
 * The `state` parameter carries the chosen role across the round trip *and*
 * proves the callback belongs to a request this app started.
 *
 * It is signed rather than merely random because it carries a payload: an
 * attacker who could forge state could pick the role a new account is created
 * with. The nonce inside is compared against a cookie, which is what actually
 * defeats CSRF; the signature stops the role being edited in transit.
 */
function stateSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for Google sign-in");
  return secret;
}

export function createState(role: "COMPANY" | "CONTRACTOR"): { state: string; nonce: string } {
  const nonce = randomBytes(16).toString("hex");
  const payload = `${role}.${nonce}`;
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("hex");
  return { state: `${payload}.${sig}`, nonce };
}

export function readState(
  state: string | null,
  cookieNonce: string | undefined,
): { role: "COMPANY" | "CONTRACTOR" } | null {
  if (!state || !cookieNonce) return null;
  const [role, nonce, sig] = state.split(".");
  if (!role || !nonce || !sig) return null;
  if (role !== "COMPANY" && role !== "CONTRACTOR") return null;

  const expected = createHmac("sha256", stateSecret()).update(`${role}.${nonce}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  // The signature proves we minted it; this proves it was minted for *this*
  // browser, which is the part that stops a login-CSRF.
  const c = Buffer.from(nonce);
  const d = Buffer.from(cookieNonce);
  if (c.length !== d.length || !timingSafeEqual(c, d)) return null;

  return { role };
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    // Google returns no refresh token and we never need one — the session is
    // ours once issued. `select_account` stops a silent sign-in as whoever the
    // browser last used, which on a shared plant machine matters.
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

/**
 * Exchanges the one-time code for a profile. Returns null on any failure —
 * callers turn that into a generic sign-in error rather than leaking which step
 * of the handshake went wrong.
 */
export async function exchangeCode(code: string): Promise<GoogleProfile | null> {
  try {
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenRes.ok) {
      console.error("[google] token exchange failed:", tokenRes.status);
      return null;
    }
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) return null;

    const userRes = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!userRes.ok) {
      console.error("[google] userinfo failed:", userRes.status);
      return null;
    }
    const info = (await userRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!info.sub || !info.email) return null;

    return {
      sub: info.sub,
      email: info.email.trim().toLowerCase(),
      emailVerified: info.email_verified === true,
      name: (info.name ?? info.email.split("@")[0]).slice(0, 80),
    };
  } catch (err) {
    console.error("[google] sign-in failed:", err);
    return null;
  }
}
