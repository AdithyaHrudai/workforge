import type { MetadataRoute } from "next";
import { siteUrl, PRIVATE_ROUTE_PREFIXES } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated areas. Also sent as X-Robots-Tag from next.config.mjs,
        // since robots.txt is a request not to crawl, not an access control.
        //
        // No trailing slash: a rule ending in "/" matches only deeper paths, so
        // "/reset-password?token=…" — the one URL here that carries a secret —
        // would have slipped past it. No public route shares a prefix with any
        // of these, so the broader match costs nothing.
        disallow: [...PRIVATE_ROUTE_PREFIXES],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
