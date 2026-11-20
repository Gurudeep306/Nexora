// Handwritten solutions (src/routes/hand.js): a one-time link lets a tablet or
// a phone that is not signed in add solutions for one member and one question;
// images must be real; solutions are private until shared; only the author (or
// staff, for a public one) removes them; the device pages pass private mode.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-hand-'));
const OWNER = `howner${Date.now().toString(36)}`;
const Q = 'cse-2023-cs-22';
// A real 1×1 PNG.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let proc;
let base;
let log = '';

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    if (proc.exitCode !== null) throw new Error(`server exited early: ${log}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready: ${log}`);
}
const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})), text: r.headers.get('content-type') };
};
async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, password: 'secret123' }) });
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}

test('handwritten solutions', async (t) => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: path.join(tmp, 'test.db'), TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '', OWNER_USERNAME: OWNER, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  t.after(async () => {
    const done = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await done;
  });
  await waitFor(`${base}/api/health`);
  const owner = await signup(OWNER);
  const ana = await signup(`hana${Date.now().toString(36)}`);
  const ben = await signup(`hben${Date.now().toString(36)}`);

  await t.test('links need sign-in, a real question and a known mode', async () => {
    assert.equal((await call('POST', '/api/hand/links', null, { kind: 'gate', target: Q, mode: 'pad' })).status, 401);
    assert.equal((await call('POST', '/api/hand/links', ana, { kind: 'gate', target: 'nope', mode: 'pad' })).status, 404);
    assert.equal((await call('POST', '/api/hand/links', ana, { kind: 'gate', target: Q, mode: 'fax' })).status, 400);
    assert.equal((await call('POST', '/api/hand/links', ana, { kind: 'other', target: Q, mode: 'pad' })).status, 404);
  });

  let solId;
  await t.test('a tablet with the link adds a solution; the computer sees it', async () => {
    const link = await call('POST', '/api/hand/links', ana, { kind: 'gate', target: Q, mode: 'pad' });
    assert.equal(link.status, 200);
    const { token } = link.body;
    assert.match(link.body.path, /^\/pad\/[A-Za-z0-9_-]{20,}$/);
    assert.equal((await call('GET', `/api/hand/links/${token}`, ana)).body.state, 'waiting');
    // Another member can't watch it.
    assert.equal((await call('GET', `/api/hand/links/${token}`, ben)).status, 404);

    // The tablet is not signed in.
    const dev = await call('GET', `/api/hand/device/${token}`);
    assert.equal(dev.status, 200);
    assert.equal(dev.body.mode, 'pad');
    assert.match(dev.body.title, /^GATE /);
    // The question itself travels to the tablet, so it is in view while writing.
    assert.match(dev.body.question.text, /radix-4/);

    // Live view: the tablet sends a small picture; only the link's owner reads it.
    assert.equal((await call('PUT', `/api/hand/device/${token}/preview`, null, { image: 'data:text/plain;base64,aGk=' })).status, 400);
    assert.equal((await call('PUT', `/api/hand/device/${token}/preview`, null, { image: PNG })).status, 200);
    assert.equal((await call('GET', `/api/hand/links/${token}/preview`, ana)).body.image, PNG);
    assert.equal((await call('GET', `/api/hand/links/${token}/preview`, ben)).status, 404);
    assert.equal((await call('GET', `/api/hand/links/${token}`, ana)).body.state, 'opened');

    // Only real images go through.
    assert.equal((await call('POST', `/api/hand/device/${token}`, null, { images: [] })).status, 400);
    assert.equal((await call('POST', `/api/hand/device/${token}`, null, { images: ['data:image/png;base64,aGVsbG8='] })).status, 400);
    assert.equal((await call('POST', `/api/hand/device/${token}`, null, { images: ['data:text/html;base64,aGVsbG8='] })).status, 400);
    assert.equal((await call('POST', `/api/hand/device/${token}`, null, { images: Array(13).fill(PNG) })).status, 400);

    const sent = await call('POST', `/api/hand/device/${token}`, null, { images: [PNG, PNG] });
    assert.equal(sent.status, 200);
    solId = sent.body.id;
    const watch = await call('GET', `/api/hand/links/${token}`, ana);
    assert.deepEqual([watch.body.state, watch.body.solutionId], ['sent', solId]);

    const list = await call('GET', `/api/hand/solutions?kind=gate&target=${Q}`, ana);
    assert.equal(list.body.mine.length, 1);
    assert.equal(list.body.mine[0].source, 'pad');
    assert.equal(list.body.mine[0].visibility, 'private');
    assert.equal(list.body.mine[0].images.length, 2);
    const img = await fetch(`${base}${list.body.mine[0].images[0]}`, { headers: { Cookie: ana } });
    assert.equal(img.status, 200);
  });

  await t.test('a bad or unknown token is refused', async () => {
    assert.equal((await call('GET', '/api/hand/device/short')).status, 410);
    assert.equal((await call('GET', `/api/hand/device/${'x'.repeat(32)}`)).status, 410);
    assert.equal((await call('POST', `/api/hand/device/${'x'.repeat(32)}`, null, { images: [PNG] })).status, 410);
  });

  await t.test('private until shared; others see only public ones; only the author changes them', async () => {
    assert.deepEqual((await call('GET', `/api/hand/solutions?kind=gate&target=${Q}`, ben)).body.community, []);
    assert.equal((await call('PATCH', `/api/hand/solutions/${solId}`, ben, { visibility: 'public' })).status, 404);
    assert.equal((await call('PATCH', `/api/hand/solutions/${solId}`, ana, { visibility: 'everyone' })).status, 400);
    assert.equal((await call('PATCH', `/api/hand/solutions/${solId}`, ana, { visibility: 'public', note: 'Used the contrapositive.' })).status, 200);
    const seen = (await call('GET', `/api/hand/solutions?kind=gate&target=${Q}`, ben)).body.community;
    assert.equal(seen.length, 1);
    assert.equal(seen[0].note, 'Used the contrapositive.');
    assert.ok(seen[0].author.username.startsWith('hana'));
    assert.equal((await call('DELETE', `/api/hand/solutions/${solId}`, ben)).status, 404);

    // Helpful votes: once per member, never your own.
    assert.equal((await call('PUT', `/api/hand/solutions/${solId}/vote`, ana)).status, 400);
    assert.equal((await call('PUT', `/api/hand/solutions/${solId}/vote`, ben)).body.votes, 1);
    assert.equal((await call('PUT', `/api/hand/solutions/${solId}/vote`, ben)).body.votes, 1);
    const voted = (await call('GET', `/api/hand/solutions?kind=gate&target=${Q}`, ben)).body.community[0];
    assert.deepEqual([voted.votes, voted.voted], [1, true]);
    assert.equal((await call('DELETE', `/api/hand/solutions/${solId}/vote`, ben)).body.votes, 0);

    // Every one of mine, with the question's title.
    const mineAll = (await call('GET', '/api/hand/mine', ana)).body.solutions;
    assert.equal(mineAll.length, 1);
    assert.match(mineAll[0].title, /^GATE /);

    // An upload from the computer.
    const up = await call('POST', '/api/hand/solutions', ben, { kind: 'gate', target: Q, images: [PNG] });
    assert.equal(up.status, 200);
    assert.equal(up.body.solution.source, 'upload');

    // Staff can remove a public one; the author can remove their own.
    assert.equal((await call('DELETE', `/api/hand/solutions/${solId}`, owner)).status, 200);
    assert.equal((await call('DELETE', `/api/hand/solutions/${up.body.solution.id}`, ben)).status, 200);
    assert.equal((await call('GET', `/api/hand/solutions?kind=gate&target=${Q}`, ana)).body.mine.length, 0);
  });

  await t.test('the device pages and API pass private mode; the rest stays closed', async () => {
    const link = await call('POST', '/api/hand/links', ana, { kind: 'gate', target: Q, mode: 'photo' });
    const r = await call('PUT', '/api/admin/site/private-mode', owner, { enabled: true });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    try {
      assert.equal((await call('GET', `/api/hand/device/${link.body.token}`)).status, 200);
      assert.notEqual((await fetch(`${base}/snap/${link.body.token}`, { headers: { Accept: 'text/html' } })).status, 403);
      // Signed out, everything else is still closed.
      assert.equal((await call('GET', `/api/hand/solutions?kind=gate&target=${Q}`)).status, 403);
      assert.equal((await fetch(`${base}/gate`, { headers: { Accept: 'text/html' } })).status, 403);
    } finally {
      await call('PUT', '/api/admin/site/private-mode', owner, { enabled: false });
    }
  });
});
