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

/** Route prefixes that must never be crawled or indexed. */
export const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/company",
  "/contractor",
  "/engagements",
  "/notifications",
  "/dashboard",
  "/api",
] as const;
