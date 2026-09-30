// Client-facing error messages.
//
// Route handlers catch exceptions and return a JSON `error` field. Forwarding
// `e.message` verbatim leaks internals (SQL text, file paths, stack details) to
// callers. In production we return a generic message and log the real one; in
// development we keep the detail so debugging stays usable.
const IS_PROD = process.env.NODE_ENV === "production";

const GENERIC = "Something went wrong on our end. Please try again.";

/** Sanitise an caught error into a message safe to send to a client. */
function errMessage(e) {
  if (!IS_PROD) return (e && e.message) || String(e);
  // Expected, user-facing errors may opt into being shown by setting `public`.
  if (e && e.public && e.message) return e.message;
  return GENERIC;
}

/** Log the real error server-side (call alongside errMessage in production). */
function logError(scope, e) {
  const detail = (e && (e.stack || e.message)) || e;
  console.error(`[error] ${scope}:`, detail);
}

module.exports = { errMessage, logError, GENERIC };
