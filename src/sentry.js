/**
 * Optional server error reporting. Sentry is loaded and initialised only when
 * SENTRY_DSN is set; otherwise every export is a no-op and @sentry/node is
 * never required, so it costs nothing at startup.
 */
let Sentry = null;

if (process.env.SENTRY_DSN) {
  try {
    Sentry = require("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      release: process.env.GIT_COMMIT || process.env.RENDER_GIT_COMMIT || undefined,
      // Errors only — no performance tracing, no personal data.
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
    console.log("✓ Sentry error reporting on");
  } catch (e) {
    Sentry = null;
    console.warn("[sentry] not started:", e.message);
  }
}

/** Report an error (no-op without SENTRY_DSN). */
function captureException(err, context) {
  if (!Sentry) return;
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    /* reporting is best-effort */
  }
}

/** Flush pending events before the process exits. */
async function flush(timeoutMs = 2000) {
  if (!Sentry) return;
  try {
    await Sentry.flush(timeoutMs);
  } catch {
    /* ignore */
  }
}

module.exports = { enabled: () => !!Sentry, captureException, flush };
