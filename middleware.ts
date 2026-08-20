import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "wf_session";
const ADMIN_SESSION_COOKIE = "wf_admin";

// `/contractors` (the firm directory) sits here alongside `/contractor` (a
// contractor's own area): both are members-only. Matching is on `prefix + "/"`
// or an exact hit, so the two never shadow each other.
const PROTECTED = [
  "/account",
  "/dashboard",
  "/company",
  "/contractor",
  "/contractors",
  "/engagements",
  "/notifications",
];

/** The one page under /admin that an unauthenticated request may reach. */
const ADMIN_LOGIN_PATH = "/admin/login";

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

/**
 * Headers applied to everything under /admin.
 *
 * The console lists people's names, contact numbers and statutory identifiers.
 * None of it should be indexed, cached by an intermediary, or leaked as a
 * referrer to whatever an admin clicks through to next.
 */
function applyAdminHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  // Next reads x-nonce off the *request* headers to nonce its script tags.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  // Lets the root layout tell the admin console apart from the marketplace and
  // pick the right chrome. Server components cannot otherwise see the path.
  requestHeaders.set("x-pathname", pathname);

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminArea) {
    const isLoginPage = pathname === ADMIN_LOGIN_PATH;
    // Presence only. Admin sessions are opaque tokens validated against the
    // database, which the edge runtime cannot reach — `getAdminIdentity()` in
    // the panel layout is the authority. This just spares the app a render for
    // requests that plainly have no session.
    const hasAdminCookie = Boolean(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);

    if (!isLoginPage && !hasAdminCookie) {
      const url = req.nextUrl.clone();
      url.pathname = ADMIN_LOGIN_PATH;
      url.search = "";
      // Only same-site paths are ever echoed back, and only under /admin, so
      // the post-login redirect cannot be pointed at another origin.
      if (pathname.startsWith("/admin/")) url.searchParams.set("next", pathname);
      const redirectRes = NextResponse.redirect(url);
      redirectRes.headers.set("Content-Security-Policy", csp);
      return applyAdminHeaders(redirectRes);
    }

    const adminRes = NextResponse.next({ request: { headers: requestHeaders } });
    adminRes.headers.set("Content-Security-Policy", csp);
    return applyAdminHeaders(adminRes);
  }

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
