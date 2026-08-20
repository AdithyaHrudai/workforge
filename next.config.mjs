/** @type {import('next').NextConfig} */

// Vercel caps serverless request bodies at ~4.5 MB, so accepting more than that
// here fails at the platform edge instead of surfacing a useful error to the
// user. Keep this under the cap, above MAX_UPLOAD_BYTES + multipart overhead.
const BODY_SIZE_LIMIT = "4mb";

/**
 * Headers that don't vary per request. Content-Security-Policy is set in
 * middleware.ts instead, because it carries a per-request nonce.
 */
const securityHeaders = [
  // Stop MIME sniffing — matters because uploaded documents are served back to
  // admins and the browser-supplied Content-Type can't be fully trusted.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Defence in depth alongside the CSP frame-ancestors directive.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Two years, subdomains included, preload-eligible. Only meaningful over
  // HTTPS, which Vercel terminates for us.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const noIndexNoStore = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  experimental: {
    serverActions: {
      bodySizeLimit: BODY_SIZE_LIMIT,
      // Server actions are only accepted from the app's own origin. Vercel
      // populates VERCEL_PROJECT_PRODUCTION_URL; DEPLOY_HOST covers a custom
      // domain. Deliberately no wildcards — a wildcard entry lets any matching
      // origin POST server actions to this app.
      allowedOrigins: [
        ...(process.env.DEPLOY_HOST ? [process.env.DEPLOY_HOST] : []),
        ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? [process.env.VERCEL_PROJECT_PRODUCTION_URL]
          : []),
        ...(process.env.NODE_ENV !== "production" ? ["localhost:3000"] : []),
      ],
    },
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Authenticated areas must never be indexed or cached by shared proxies.
      {
        source:
          "/:section(admin|account|company|contractor|engagements|notifications|dashboard)/:path*",
        headers: noIndexNoStore,
      },
      { source: "/api/:path*", headers: noIndexNoStore },
    ];
  },
};

export default nextConfig;
