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
        disallow: PRIVATE_ROUTE_PREFIXES.map((p) => `${p}/`),
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
