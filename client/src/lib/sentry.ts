/**
 * Optional browser error reporting. Only when the build sets VITE_SENTRY_DSN
 * is the Sentry SDK fetched (as its own lazy chunk); with it unset the branch
 * below is a compile-time `if ("")`, so the SDK never enters the bundle.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  void import('@sentry/browser')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
        // Errors only — no performance tracing or replays.
        tracesSampleRate: 0,
      })
    })
    .catch(() => {
      /* reporting is best-effort */
    })
}
