/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
      // Allow form submissions (server actions) through tunnels / proxies.
      // Set DEPLOY_HOST to your final domain in production.
      allowedOrigins: [
        "localhost:3000",
        "*.trycloudflare.com",
        ...(process.env.DEPLOY_HOST ? [process.env.DEPLOY_HOST] : []),
      ],
    },
  },
};

export default nextConfig;
