import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "ss_session";

const PROTECTED = ["/dashboard", "/company", "/contractor", "/admin", "/engagements", "/notifications"];

/**
 * Edge-side gate. This only proves the session token is well-formed and signed;
 * it deliberately does no database work, so it cannot check suspension or token
 * revocation. `getCurrentUser()` is the real authority and every protected page
 * and layout goes through requireUser()/requireRole(). This is a cheap first
 * filter, not the access control itself.
 */
async function hasValidSignature(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

/**
 * Per-request nonce CSP. Next injects this nonce into its own script tags when
 * it sees the `x-nonce` request header, which is what lets us avoid
 * 'unsafe-inline' for scripts. `strict-dynamic` then allows those nonced
 * scripts to load the chunks they need without whitelisting URLs.
 *
 * style-src still needs 'unsafe-inline': React inlines style attributes and
 * Tailwind's injected <style> tags aren't nonced.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    // Dev needs 'unsafe-eval' for React Refresh / HMR. Production does not.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Same-origin only — the browser makes no third-party calls.
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  // Next reads x-nonce off the *request* headers to nonce its script tags.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (needsAuth && !(await hasValidSignature(req.cookies.get(SESSION_COOKIE)?.value))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirectRes = NextResponse.redirect(url);
    redirectRes.headers.set("Content-Security-Policy", csp);
    return redirectRes;
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  // Runs on every page so the CSP is always applied, but skips static assets and
  // image optimisation, which need no policy and shouldn't pay the cost.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)",
  ],
};
