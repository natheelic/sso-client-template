import type { NextConfig } from "next";

/**
 * Hostnames allowed to request Next.js dev resources (/_next/*, HMR).
 *
 * When dev is reached through a remote proxy rather than localhost — a Coder
 * workspace, a tunnel, a staging hostname — those requests are cross-origin and
 * Next blocks them by default, which silently kills hot reload. Set
 * ALLOWED_DEV_ORIGINS in .env to a comma-separated list of hostnames for your
 * own environment; it has no effect on production builds.
 *
 * Entries are matched hostname-only (ports are ignored). A leading `*.` matches
 * exactly one label, so it does not cover the bare domain — list that
 * separately if you reach the app through a path-based proxy too.
 */
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,

  // Allow avatar images from SSO identity providers
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "profile.line-scdn.net" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
