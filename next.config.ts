import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the Next.js "N" badge during local development so it doesn't cover buttons on a phone-sized screen.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
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
