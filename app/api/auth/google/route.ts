import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  authorizeUrl,
  createState,
  googleEnabled,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

/**
 * Starts the Google handshake.
 *
 * The chosen role rides along in the signed `state`, because Google will not
 * carry arbitrary data for us and a new account has to be created as one thing
 * or the other. For someone who already has an account the role is read from
 * that account instead, and this value is ignored — see the callback.
 */
export async function GET(req: NextRequest) {
  if (!googleEnabled()) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", req.url));
  }

  const raw = req.nextUrl.searchParams.get("role");
  const role = raw === "CONTRACTOR" ? "CONTRACTOR" : "COMPANY";

  const { state, nonce } = createState(role);
  const res = NextResponse.redirect(authorizeUrl(state));

  res.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax, not Strict: the browser arrives back here from accounts.google.com,
    // and a Strict cookie is withheld on that cross-site navigation — which
    // would make every sign-in fail the nonce check.
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
