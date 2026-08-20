import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, siteUrl } from "@/lib/site";

/**
 * The public marketing routes, and only those.
 *
 * Contractor profiles used to be listed here as an SEO surface. They are now
 * members-only — a firm's client list, plant locations and deployed headcount
 * are commercially sensitive — so the sitemap no longer enumerates them, and no
 * database query is needed to build it. See PRIVATE_ROUTE_PREFIXES in lib/site.
 */
const PRIORITY: Record<string, number> = {
  "/": 1,
  "/about": 0.8,
  "/for-companies": 0.8,
  "/for-contractors": 0.8,
  "/register": 0.7,
  "/login": 0.4,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: route === "/" ? base : `${base}${route}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: PRIORITY[route] ?? 0.5,
  }));
}
