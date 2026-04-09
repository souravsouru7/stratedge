import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Upload source maps so Sentry shows original TypeScript lines, not minified JS
  sourcemaps: { uploadLegacySourcemaps: false },
  // Suppress verbose Sentry build output
  silent: !process.env.CI,
  // Disable server/edge wrapping — this is a static export, client-only
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware: false,
  autoInstrumentAppDirectory: false,
});
