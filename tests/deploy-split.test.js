// Split deploy: website on https://nexoraguru.in (Cloudflare Pages), API on
// https://api.nexoraguru.in. CORS / socket.io allowlist from CLIENT_ORIGINS,
// credentialed preflight, session cookie flags, OAuth redirect targets.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const {
  parseOrigins,
  deployConfig,
  isOriginAllowed,
  sessionCookie,
  publicRedirect,
} = require('../src/deploy-config');

const SITE = 'https://nexoraguru.in';
const EVIL = 'https://evil.example';

/* ───────────── pure config ───────────── */

test('parseOrigins trims spaces and trailing slashes', () => {
  assert.deepEqual(parseOrigins(' https://nexoraguru.in/, https://www.nexoraguru.in ,,'), [
    'https://nexoraguru.in',
    'https://www.nexoraguru.in',
  ]);
});

test('no CLIENT_ORIGINS keeps the old behaviour', () => {
  const dev = deployConfig({ NODE_ENV: 'development' });
  assert.equal(dev.enforceOrigins, false);
  assert.equal(isOriginAllowed(dev, EVIL), true);
  const prod = deployConfig({ NODE_ENV: 'production', APP_URL: 'https://nexora.onrender.com' });
  assert.equal(prod.enforceOrigins, true);
  assert.equal(isOriginAllowed(prod, 'https://nexora.onrender.com'), true);
  assert.equal(isOriginAllowed(prod, 'http://localhost:3000'), true);
  assert.equal(isOriginAllowed(prod, EVIL), false);
  assert.equal(prod.trustProxy, 1);
  assert.equal(dev.trustProxy, false);
  assert.equal(prod.apiUrl, 'https://nexora.onrender.com');
  assert.equal(publicRedirect(prod, '/?auth=github'), '/?auth=github');
});

test('CLIENT_ORIGINS allows nexoraguru.in and rejects others', () => {
  const cfg = deployConfig({
    NODE_ENV: 'production',
    CLIENT_ORIGINS: 'https://nexoraguru.in,https://www.nexoraguru.in',
    API_URL: 'https://api.nexoraguru.in/',
    PUBLIC_URL: 'https://nexoraguru.in',
  });
  assert.equal(isOriginAllowed(cfg, SITE), true);
  assert.equal(isOriginAllowed(cfg, 'https://www.nexoraguru.in'), true);
  assert.equal(isOriginAllowed(cfg, EVIL), false);
  assert.equal(isOriginAllowed(cfg, 'https://nexoraguru.in.evil.example'), false);
  assert.equal(isOriginAllowed(cfg, 'http://nexoraguru.in'), false);
  assert.equal(isOriginAllowed(cfg, undefined), true, 'no Origin header (curl, same-origin GET)');
  assert.equal(cfg.apiUrl, 'https://api.nexoraguru.in');
  assert.equal(publicRedirect(cfg, '/?auth=google'), 'https://nexoraguru.in/?auth=google');
});

test('session cookie flags: secure + lax in production, optional domain', () => {
  const prod = sessionCookie(deployConfig({ NODE_ENV: 'production', COOKIE_DOMAIN: '.nexoraguru.in' }));
  assert.equal(prod.secure, true);
  assert.equal(prod.httpOnly, true);
  assert.equal(prod.sameSite, 'lax');
  assert.equal(prod.domain, '.nexoraguru.in');
  const dev = sessionCookie(deployConfig({ NODE_ENV: 'development' }));
  assert.equal(dev.secure, false);
  assert.equal('domain' in dev, false);
});

test('TRUST_PROXY override', () => {
  assert.equal(deployConfig({ NODE_ENV: 'production', TRUST_PROXY: '2' }).trustProxy, 2);
  assert.equal(deployConfig({ TRUST_PROXY: 'loopback' }).trustProxy, 'loopback');
  assert.equal(deployConfig({ NODE_ENV: 'production', TRUST_PROXY: 'false' }).trustProxy, false);
});

/* ───────────── live server ───────────── */

async function startServer(extraEnv) {
  const port = 23000 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  let log = '';
  const proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      DB_PATH: ':memory:',
      DISABLE_PUPPETEER: '1',
      DISABLE_SCRAPER: '1',
      TURSO_DATABASE_URL: '',
      SENTRY_DSN: '',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { log += d; });
  proc.stderr.on('data', (d) => { log += d; });
  const start = Date.now();
  for (;;) {
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      if (r.ok) break;
    } catch {}
    if (proc.exitCode !== null) throw new Error(`server exited (${proc.exitCode}): ${log}`);
    if (Date.now() - start > 50000) throw new Error(`server not ready: ${log}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  const stop = async () => {
    proc.kill('SIGTERM');
    if (proc.exitCode === null) await new Promise((r) => proc.once('exit', r));
  };
  return { baseUrl, stop };
}

test('server: credentialed CORS preflight + socket.io origin check', async (t) => {
  const srv = await startServer({ CLIENT_ORIGINS: `${SITE},https://www.nexoraguru.in` });
  t.after(srv.stop);

  const pre = await fetch(`${srv.baseUrl}/api/user/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: SITE,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-origin'), SITE);
  assert.equal(pre.headers.get('access-control-allow-credentials'), 'true');
  assert.match(pre.headers.get('access-control-allow-methods') || '', /POST/);
  assert.match(pre.headers.get('access-control-allow-headers') || '', /Content-Type/i);

  const get = await fetch(`${srv.baseUrl}/api/health`, { headers: { Origin: SITE } });
  assert.equal(get.headers.get('access-control-allow-origin'), SITE);
  assert.equal(get.headers.get('access-control-allow-credentials'), 'true');
  // /uploads images are embedded cross-origin (same-site) on the Pages site.
  assert.equal(get.headers.get('cross-origin-resource-policy'), 'same-site');

  const bad = await fetch(`${srv.baseUrl}/api/user/login`, {
    method: 'OPTIONS',
    headers: { Origin: EVIL, 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
  const badGet = await fetch(`${srv.baseUrl}/api/health`, { headers: { Origin: EVIL } });
  assert.equal(badGet.headers.get('access-control-allow-origin'), null);

  // socket.io handshake: allowed origin gets CORS headers, a foreign one is refused.
  const ok = await fetch(`${srv.baseUrl}/socket.io/?EIO=4&transport=polling`, { headers: { Origin: SITE } });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), SITE);
  assert.equal(ok.headers.get('access-control-allow-credentials'), 'true');
  const evil = await fetch(`${srv.baseUrl}/socket.io/?EIO=4&transport=polling`, { headers: { Origin: EVIL } });
  assert.notEqual(evil.headers.get('access-control-allow-origin'), EVIL);
});

test('server (production mode): cookie flags, OAuth redirect to PUBLIC_URL', async (t) => {
  const srv = await startServer({
    NODE_ENV: 'production',
    SESSION_SECRET: 'x'.repeat(48),
    STUDIO_PASSWORD: 'test-only-studio-password',
    CLIENT_ORIGINS: SITE,
    PUBLIC_URL: SITE,
    API_URL: 'https://api.nexoraguru.in',
    COOKIE_DOMAIN: '.nexoraguru.in',
    GITHUB_CLIENT_ID: '',
    GOOGLE_CLIENT_ID: '',
    JUDGE_MODE: 'remote',
  });
  t.after(srv.stop);

  const username = `dp${Date.now().toString(36).slice(-6)}`;
  const res = await fetch(`${srv.baseUrl}/api/user/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: SITE,
      // Caddy / Render terminate TLS and forward the scheme.
      'X-Forwarded-Proto': 'https',
    },
    body: JSON.stringify({ username, display_name: 'Deploy', password: 'pass1234', avatar: 'coder' }),
  });
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal(res.headers.get('access-control-allow-origin'), SITE);
  const cookie = res.headers.get('set-cookie') || '';
  assert.match(cookie, /nx\.sid=/);
  assert.match(cookie, /;\s*Secure/i);
  assert.match(cookie, /;\s*HttpOnly/i);
  assert.match(cookie, /;\s*SameSite=Lax/i);
  assert.match(cookie, /;\s*Domain=\.nexoraguru\.in/i);

  // OAuth not configured → readable error, sent back to the website.
  const gh = await fetch(`${srv.baseUrl}/auth/github`, { redirect: 'manual' });
  assert.equal(gh.status, 302);
  assert.equal(gh.headers.get('location'), `${SITE}/?auth_error=github_not_configured`);
});
