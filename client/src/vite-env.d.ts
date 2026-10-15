/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin for the split deploy, e.g. https://api.nexoraguru.in. Empty = same origin. */
  readonly VITE_API_URL?: string
  /** Browser Sentry DSN. Unset = the Sentry SDK is left out of the bundle. */
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
