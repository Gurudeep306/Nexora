// Admin → AI models: add an OpenAI-compatible provider with a key, test it,
// list its models, choose a model per slot and per feature, and check that
// AI calls really go to the chosen provider and model (src/ai/settings.js,
// /api/admin/ai/*). A fake provider runs on localhost.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-ai-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36).slice(-5);
const OWNER = `own${stamp}`;
const KEY = `sk-test-${stamp}-abcd`;
let proc, base, fake, fakeUrl;
let serverLog = '';
const seen = []; // { path, auth, model }

function startFake() {
  return new Promise((resolve) => {
    fake = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        const auth = req.headers.authorization || '';
        let json = {};
        try { json = JSON.parse(body || '{}'); } catch {}
        seen.push({ path: req.url, auth, model: json.model });
        if (auth !== `Bearer ${KEY}`) {
          res.writeHead(401, { 'content-type': 'application/json' });
          return res.end(JSON.stringify({ error: { message: 'bad key' } }));
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        if (req.url.endsWith('/models')) return res.end(JSON.stringify({ data: [{ id: 'tiny-1' }, { id: 'big-2' }] }));
        return res.end(JSON.stringify({ model: json.model, choices: [{ message: { content: `ok from ${json.model}` }, finish_reason: 'stop' }], usage: { total_tokens: 7 } }));
      });
    });
    fake.listen(0, '127.0.0.1', () => {
      fakeUrl = `http://127.0.0.1:${fake.address().port}/v1`;
      resolve();
    });
  });
}

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready: ${serverLog}`);
}
const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, body: json, headers: r.headers };
};
const cookieOf = (r) => (r.headers.get('set-cookie') || '').split(';')[0];

let owner, member;

test.before(async () => {
  await startFake();
  const port = 27000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB, OWNER_USERNAME: OWNER, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' };
  delete env.GROQ_API_KEY;
  proc = spawn(process.execPath, ['src/server.js'], { cwd: path.join(__dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  owner = cookieOf(await call('POST', '/api/user/register', null, { username: OWNER, password: 'secret123' }));
  // Private mode is on at first boot; let a second account in to check permissions.
  await call('PUT', '/api/admin/site/private-mode', owner, { enabled: false });
  member = cookieOf(await call('POST', '/api/user/register', null, { username: `mem${stamp}`, password: 'secret123' }));
});

test.after(async () => {
  if (proc) {
    const done = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await done;
  }
  fake?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('only the owner (site.settings) sees AI settings', async () => {
  assert.equal((await call('GET', '/api/admin/ai', member)).status, 404);
  const r = await call('GET', '/api/admin/ai', owner);
  assert.equal(r.status, 200);
  assert.ok(r.body.presets.some((p) => p.kind === 'groq'));
  assert.ok(r.body.features.some((f) => f.id === 'coach'));
  assert.equal(r.body.active, 'none');
  // AI is off until something is configured.
  assert.equal((await call('GET', '/api/agent/status', owner)).body.configured, false);
});

test('a wrong key is reported, never stored in the clear and never returned', async () => {
  const r = await call('POST', '/api/admin/ai/providers', owner, { kind: 'custom', name: 'Bad', baseUrl: fakeUrl, apiKey: 'sk-wrong-9999' });
  assert.equal(r.status, 200);
  assert.equal(r.body.provider.test.ok, false);
  assert.match(r.body.provider.test.error, /refused/);
  assert.equal(r.body.provider.last4, '9999');
  assert.ok(!JSON.stringify(r.body).includes('sk-wrong'), 'the key never comes back');
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB);
  const row = db.prepare("SELECT value FROM site_settings WHERE key='ai_config'").get();
  db.close();
  assert.ok(row && !row.value.includes('sk-wrong'), 'the key is sealed at rest');
  await call('DELETE', `/api/admin/ai/providers/${r.body.provider.id}`, owner);
});

test('add a provider, list its models, assign them and route AI calls there', async () => {
  const add = await call('POST', '/api/admin/ai/providers', owner, { kind: 'custom', name: 'Fake', baseUrl: fakeUrl, apiKey: KEY });
  assert.equal(add.body.provider.test.ok, true);
  assert.deepEqual(add.body.provider.models, ['big-2', 'tiny-1']);
  const id = add.body.provider.id;

  const tried = await call('POST', `/api/admin/ai/providers/${id}/try`, owner, { model: 'tiny-1' });
  assert.equal(tried.body.result.ok, true);

  // Bad assignments are refused.
  assert.equal((await call('PUT', '/api/admin/ai/assignments', owner, { slots: { main: { provider: 'nope', model: 'x' } } })).status, 400);
  assert.equal((await call('PUT', '/api/admin/ai/assignments', owner, { budget: { dailyTokens: 5 } })).status, 400);

  const set = await call('PUT', '/api/admin/ai/assignments', owner, {
    slots: { main: { provider: id, model: 'big-2' }, fast: { provider: id, model: 'tiny-1' } },
    features: { tutor: { provider: id, model: 'tiny-1' } },
    budget: { dailyTokens: 50000 },
  });
  assert.equal(set.status, 200);
  assert.equal(set.body.active, 'admin');
  assert.equal(set.body.budget.dailyTokens, 50000);

  const status = await call('GET', '/api/agent/status', owner);
  assert.equal(status.body.configured, true);
  assert.equal(status.body.limit, 50000);

  // The tutor feature uses its own choice; the rest use the main slot.
  seen.length = 0;
  const t = await call('POST', '/api/agent/task', owner, { mode: 'tutor', question: 'What is a heap?', statement: 'x' });
  assert.equal(t.status, 200, JSON.stringify(t.body));
  assert.equal(t.body.result, 'ok from tiny-1');
  const chatCall = seen.find((s) => s.path.endsWith('/chat/completions'));
  assert.equal(chatCall.model, 'tiny-1');
  assert.equal(chatCall.auth, `Bearer ${KEY}`);

  // Removing the provider clears what pointed at it, and AI is off again.
  const del = await call('DELETE', `/api/admin/ai/providers/${id}`, owner);
  assert.deepEqual(del.body.slots, {});
  assert.equal(del.body.active, 'none');
});

test('site default style and the new section switches', async () => {
  assert.equal((await call('PUT', '/api/admin/site/default-style', member, { style: 'editorial' })).status, 404);
  assert.equal((await call('PUT', '/api/admin/site/default-style', owner, { style: '<x>' })).status, 400);
  assert.equal((await call('PUT', '/api/admin/site/default-style', owner, { style: 'editorial' })).status, 200);
  assert.equal((await call('GET', '/api/site/status', member)).body.defaultStyle, 'editorial');
  await call('PUT', '/api/admin/site/default-style', owner, { style: null });
  assert.equal((await call('GET', '/api/site/status', member)).body.defaultStyle, null);

  // GATE notes can be switched off without switching off GATE practice.
  assert.equal((await call('PUT', '/api/admin/site/flags', owner, { notes: false })).status, 200);
  const notes = await call('GET', '/api/gate/notes', member);
  assert.equal(notes.status, 403);
  assert.equal(notes.body.feature, 'notes');
  assert.notEqual((await call('GET', '/api/gate/subjects', member)).body.feature, 'notes');
  await call('PUT', '/api/admin/site/flags', owner, { notes: true });
});
