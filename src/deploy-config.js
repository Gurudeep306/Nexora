/**
 * Settings for running the website and the API on different hosts
 * (e.g. https://nexoraguru.in on Cloudflare Pages + https://api.nexoraguru.in
 * on a VM). Every value is optional: with none set, the server behaves exactly
 * as the single-host deploy (Render, local dev, tests) always has.
 *
 *   CLIENT_ORIGINS  comma-separated browser origins allowed to call the API
 *                   with cookies (CORS + socket.io). Legacy name: ALLOWED_ORIGINS.
 *   PUBLIC_URL      where the website lives; OAuth logins land back here.
 *   API_URL         where this server is reachable; OAuth callback base.
 *   COOKIE_DOMAIN   e.g. ".nexoraguru.in" to share the session cookie.
 *   TRUST_PROXY     express "trust proxy" (hop count or list); default 1 in production.
 */

const trimSlash = (s) => String(s || '').trim().replace(/\/+$/, '');

/** "https://a.com/, http://b.com" → ["https://a.com", "http://b.com"] */
function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map(trimSlash)
    .filter(Boolean);
}

function deployConfig(env = process.env) {
  const isProd = env.NODE_ENV === 'production';
  const appUrl = trimSlash(
    env.APP_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${env.PORT || 3000}`,
  );
  const apiUrl = trimSlash(env.API_URL) || appUrl;
  const publicUrl = trimSlash(env.PUBLIC_URL);
  const configured = parseOrigins(env.CLIENT_ORIGINS || env.ALLOWED_ORIGINS);
  // Explicit list → enforced in every NODE_ENV (so the split setup can be
  // tested locally). No list → today's behaviour: any origin outside
  // production, APP_URL + localhost:3000 in production.
  const enforce = configured.length > 0 || isProd;
  const base = configured.length
    ? configured
    : [appUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'];
  const allowedOrigins = [...new Set([...base, publicUrl, apiUrl].filter(Boolean))];

  let trustProxy = isProd ? 1 : false;
  if (env.TRUST_PROXY !== undefined && env.TRUST_PROXY !== '') {
    const t = env.TRUST_PROXY.trim();
    trustProxy = /^\d+$/.test(t) ? Number(t) : t === 'true' ? true : t === 'false' ? false : t;
  }

  return {
    isProd,
    appUrl,
    apiUrl,
    publicUrl,
    allowedOrigins,
    enforceOrigins: enforce,
    cookieDomain: String(env.COOKIE_DOMAIN || '').trim() || undefined,
    trustProxy,
  };
}

/** Is a browser Origin allowed to make credentialed calls? */
function isOriginAllowed(cfg, origin) {
  if (!origin) return true; // same-origin navigations, curl, server-to-server
  if (!cfg.enforceOrigins) return true;
  return cfg.allowedOrigins.includes(trimSlash(origin));
}

/** `origin` option for the cors package and socket.io. */
function corsOrigin(cfg) {
  if (!cfg.enforceOrigins) return true;
  return (origin, cb) => cb(null, isOriginAllowed(cfg, origin));
}

/** express-session cookie options. */
function sessionCookie(cfg) {
  return {
    secure: cfg.isProd, // HTTPS only in production
    httpOnly: true, // Not accessible via JS
    // "lax" (not "strict") so the session cookie is sent when GitHub/Google
    // redirect back to /auth/*/callback — strict drops it on that hop. The
    // site and the API (nexoraguru.in / api.nexoraguru.in) are same-site, so
    // lax cookies still ride along on the site's credentialed API calls.
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    ...(cfg.cookieDomain ? { domain: cfg.cookieDomain } : {}),
  };
}

/** Where to send the browser after OAuth: PUBLIC_URL + path, or the bare path. */
function publicRedirect(cfg, pathAndQuery) {
  return `${cfg.publicUrl}${pathAndQuery}`;
}

module.exports = {
  parseOrigins,
  deployConfig,
  isOriginAllowed,
  corsOrigin,
  sessionCookie,
  publicRedirect,
};
