import * as Sentry from "@sentry/nuxt";

const IGNORED_ERRORS = [
  "Failed to fetch dynamically imported module",
  "Unable to preload CSS",
  "Load failed",
  "Importing a module script failed",
];

Sentry.init({
  dsn: useRuntimeConfig().public.sentryDsn as string,
  tracesSampleRate: 0.2,
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value || event.message || "";
    if (IGNORED_ERRORS.some((ignored) => message.includes(ignored))) {
      return null;
    }
    return event;
  },
});

// Forward all console.error calls to Sentry
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  originalConsoleError.apply(console, args);

  const message = args.map(String).join(" ");
  if (IGNORED_ERRORS.some((ignored) => message.includes(ignored))) return;

  const error = args.find((arg) => arg instanceof Error);
  if (error) {
    Sentry.captureException(error);
  } else {
    Sentry.captureMessage(message, "error");
  }
  originalConsoleError.call(console, "%c[Sent to Sentry]", "color: #6c5ce7; font-weight: bold;");
};
