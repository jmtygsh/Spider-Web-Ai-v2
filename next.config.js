/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { withSentryConfig } from "@sentry/nextjs";
import "./src/env.js";

const isLowMemoryBuild = process.env.LOW_MEMORY_BUILD === "1";

/** @type {import("next").NextConfig} */
const config = {
  ...(isLowMemoryBuild
    ? {
        // Use a single worker so `next build` fits on small VPS instances.
        experimental: { cpus: 1 },
      }
    : {}),
};

export default withSentryConfig(config, {
  org: "ygjm",
  project: "javascript-nextjs",
  silent: true,
  // Full client uploads are memory-heavy; skip on VPS deploy builds.
  widenClientFileUpload: !isLowMemoryBuild,
  ...(isLowMemoryBuild
    ? {
        sourcemaps: { disable: true },
      }
    : {}),
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
