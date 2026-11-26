// Pratibimb (src/routes/pratibimb.js, docs/pratibimb/SPEC.md): consent first, staff only until the
// owner opens it, files private to their owner, the build worker's flow with its key, and one-tap
// delete that removes every file.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-pratibimb-'));
const DIR = path.join(tmp, 'pratibimb');
const stamp = Date.now().toString(36);
const OWNER = `powner${stamp}`;
const KEY = 'test-worker-key-0123456789abcdef';
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
const call = async (method, p, { cookie, body, type, headers = {} } = {}) => {
  const raw = Buffer.isBuffer(body);
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': type || (raw ? 'application/octet-stream' : 'application/json') }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, body: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, password: 'secret123' }) });
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 0xff, 0xd9]);

test('pratibimb models', async (t) => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: path.join(tmp, 'test.db'), PRATIBIMB_DIR: DIR, PRATIBIMB_WORKER_KEY: KEY, PRATIBIMB_OPEN: '', TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '', OWNER_USERNAME: OWNER, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' },
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
  const student = await signup(`pstu${stamp}`);

  // Staff only while it is being built.
  assert.equal((await call('GET', '/api/pratibimb/models', { cookie: student })).status, 403);

  // Consent first.
  const noConsent = await call('POST', '/api/pratibimb/models', { cookie: owner, body: { consent: { adult: true } } });
  assert.equal(noConsent.status, 400);
  // Someone else's model needs their permission confirmed (and their own consent video, below).
  assert.equal((await call('POST', '/api/pratibimb/models', { cookie: owner, body: { consent: { subject: 'other', adult: true, ownFace: true, understood: true } } })).status, 400);
  const theirs = await call('POST', '/api/pratibimb/models', { cookie: owner, body: { consent: { subject: 'other', name: 'Asha', adult: true, permission: true, understood: true, sentence: 'I agree' } } });
  assert.equal(theirs.status, 200);
  assert.deepEqual(theirs.body.model.subject, { kind: 'other', name: 'Asha' });
  assert.equal((await call('DELETE', `/api/pratibimb/models/${theirs.body.model.id}`, { cookie: owner })).status, 200);
  const made = await call('POST', '/api/pratibimb/models', { cookie: owner, body: { consent: { adult: true, ownFace: true, understood: true, sentence: 'I agree' } } });
  assert.equal(made.status, 200);
  const id = made.body.model.id;
  assert.match(id, /^[a-f0-9]{24}$/);

  // Files: types checked, kept on disk in the model's folder.
  assert.equal((await call('PUT', `/api/pratibimb/models/${id}/files/photo`, { cookie: owner, body: Buffer.from('x'), type: 'text/plain' })).status, 400);
  const shots = ['front', 'left', 'right'];
  for (let i = 0; i < 3; i++) assert.equal((await call('PUT', `/api/pratibimb/models/${id}/files/photo?shot=${shots[i]}`, { cookie: owner, body: jpg, type: 'image/jpeg' })).status, 200);
  // Size limits hold even when streamed.
  assert.equal((await call('PUT', `/api/pratibimb/models/${id}/files/photo`, { cookie: owner, body: Buffer.alloc(16 * 1024 * 1024, 1), type: 'image/jpeg' })).status, 400);
  assert.equal(fs.readdirSync(path.join(DIR, id)).filter((f) => f.endsWith('.part')).length, 0);

  // A phone link: not signed in, the token stands for this one model; photos and videos only.
  const link = await call('POST', `/api/pratibimb/models/${id}/link`, { cookie: owner });
  assert.equal(link.status, 200);
  assert.match(link.body.path, /^\/pratibimb\/capture\/[A-Za-z0-9_-]{22,}$/);
  const tok = link.body.token;
  assert.equal((await call('GET', `/api/pratibimb/device/${tok}`)).body.model.photos, 3);
  assert.equal((await call('PUT', `/api/pratibimb/device/${tok}/files/video`, { body: Buffer.alloc(2048, 3), type: 'video/mp4' })).status, 200);
  assert.equal((await call('PUT', `/api/pratibimb/device/${tok}/files/consent`, { body: Buffer.alloc(64, 1), type: 'video/webm' })).status, 403);
  assert.equal((await call('GET', `/api/pratibimb/device/${'x'.repeat(30)}`)).status, 404);
  const withShots = await call('GET', `/api/pratibimb/models/${id}`, { cookie: owner });
  assert.deepEqual(Object.values(withShots.body.model.shots).sort(), ['front', 'left', 'right']);
  assert.equal(withShots.body.model.videos.length, 1);
  // Building needs the consent video.
  assert.equal((await call('POST', `/api/pratibimb/models/${id}/build`, { cookie: owner, body: {} })).status, 400);
  assert.equal((await call('PUT', `/api/pratibimb/models/${id}/files/consent`, { cookie: owner, body: Buffer.alloc(64, 1), type: 'video/webm' })).status, 200);
  assert.equal((await call('PUT', `/api/pratibimb/models/${id}/files/voice`, { cookie: owner, body: Buffer.alloc(64, 2), type: 'audio/webm' })).status, 200);
  const seen = await call('GET', `/api/pratibimb/models/${id}`, { cookie: owner });
  assert.equal(seen.body.model.photos.length, 3);
  assert.equal(seen.body.model.voices.length, 1);
  assert.equal(seen.body.model.consentVideo, true);
  assert.equal(fs.readdirSync(path.join(DIR, id)).filter((f) => f !== 'shots.json').length, 6);

  const built = await call('POST', `/api/pratibimb/models/${id}/build`, { cookie: owner, body: { body: 'female', heightCm: 160, style: 'painted' } });
  assert.equal(built.body.model.status, 'queued');

  // The worker: its key is required.
  assert.equal((await call('POST', '/api/pratibimb/worker/next')).status, 401);
  const auth = { Authorization: `Bearer ${KEY}` };
  const job = await call('POST', '/api/pratibimb/worker/next', { headers: auth });
  assert.equal(job.body.job.id, id);
  assert.equal(job.body.job.options.heightCm, 160);
  assert.equal(Object.keys(job.body.job.shots).length, 3);
  const name = job.body.job.files.find((f) => f.startsWith('photo-'));
  const file = await call('GET', `/api/pratibimb/worker/${id}/files/${name}`, { headers: auth });
  assert.deepEqual(file.body, jpg);
  assert.equal((await call('PUT', `/api/pratibimb/worker/${id}/result/model.vrm`, { headers: auth, body: Buffer.from('glTF-model') })).status, 200);
  assert.equal((await call('PUT', `/api/pratibimb/worker/${id}/result/evil.sh`, { headers: auth, body: Buffer.from('x') })).status, 404);
  await call('POST', `/api/pratibimb/worker/${id}/status`, { headers: auth, body: { status: 'done', stage: 'done', likeness: 53 } });
  const done = await call('GET', `/api/pratibimb/models/${id}`, { cookie: owner });
  assert.equal(done.body.model.status, 'done');
  assert.equal(done.body.model.likeness, 53);
  assert.equal(done.body.model.hasModel, true);
  assert.deepEqual((await call('GET', `/api/pratibimb/models/${id}/model.vrm`, { cookie: owner })).body, Buffer.from('glTF-model'));

  // Nobody else can see it (even staff see only their own).
  assert.equal((await call('GET', `/api/pratibimb/models/${id}`, { cookie: student })).status, 403);

  // One-tap delete removes every file and the row.
  assert.equal((await call('DELETE', `/api/pratibimb/models/${id}`, { cookie: owner })).status, 200);
  assert.equal(fs.existsSync(path.join(DIR, id)), false);
  assert.equal((await call('GET', `/api/pratibimb/models/${id}`, { cookie: owner })).status, 404);
});
