import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% of errors; for performance tracing lower this once traffic grows
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Replay 10% of sessions normally, 100% when an error occurs
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media to protect user privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
