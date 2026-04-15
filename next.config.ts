import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow user avatar images from Google
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // Ensure server-only packages aren't bundled for client
  serverExternalPackages: ["sharp", "cheerio"],
};

export default nextConfig;
