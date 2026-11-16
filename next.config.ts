import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prototype: every page is dynamic (reads the gift store / catalog on request),
  // so the cache-components model only adds Suspense boilerplate. Keep it off.
  cacheComponents: false,
  images: {
    // Product images come from arbitrary Shopify merchant CDNs.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
