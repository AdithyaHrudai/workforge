/**
 * Canonical public origin for the deployment. Used for metadataBase, robots and
 * sitemap, all of which need absolute URLs.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_SITE_URL — set this to the custom domain in production.
 *  2. Vercel's production URL, so preview/prod work with no configuration.
 *  3. localhost for development.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_NAME = "WorkForge";

/**
 * Route prefixes that must never be crawled or indexed.
 *
 * The firm directory (`/contractors`) is in this list. It was briefly public as
 * an SEO surface, but a contractor's client list, plant locations, deployed
 * headcount and statutory position are commercially sensitive, and publishing
 * them to anyone who happens by gives away the value of registering. Both sides
 * are now visible only to signed-in members.
 */
export const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/account",
  "/company",
  "/contractor",
  "/contractors",
  "/engagements",
  "/notifications",
  "/dashboard",
  "/api",
  // Signed out, but nothing here should ever be indexed: the URLs carry
  // single-use credentials in the query string.
  "/reset-password",
  "/verify-email",
] as const;

/** Public marketing routes, listed in the sitemap. */
export const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/for-companies",
  "/for-contractors",
  "/login",
  "/register",
  "/privacy",
  "/terms",
  "/contact",
] as const;
