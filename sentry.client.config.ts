import * as Sentry from "@sentry/nuxt";

Sentry.init({
  dsn: useRuntimeConfig().public.sentryDsn as string,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});

// Forward all console.error calls to Sentry
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  originalConsoleError.apply(console, args);
  const error = args.find((arg) => arg instanceof Error);
  if (error) {
    Sentry.captureException(error);
  } else {
    Sentry.captureMessage(args.map(String).join(" "), "error");
  }
  originalConsoleError.call(console, "%c[Sent to Sentry]", "color: #6c5ce7; font-weight: bold;");
};
