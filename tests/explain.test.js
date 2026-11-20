// Video explanations (src/routes/explain.js): resumable uploads in pieces,
// file checks, privacy, helpful votes, views counted once, reports that hide
// a video, byte-range playback, and deleting.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-explain-'));
const stamp = Date.now().toString(36);
const Q = 'cse-2023-cs-22';
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
const call = async (method, p, cookie, body, headers = {}) => {
  const raw = Buffer.isBuffer(body);
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { ...(raw ? { 'Content-Type': 'application/octet-stream' } : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const type = r.headers.get('content-type') || '';
  return { status: r.status, headers: r.headers, body: type.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, password: 'secret123' }) });
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}
// A "WebM" file: the EBML header, then filler.
const webm = (n) => {
  const b = Buffer.alloc(n, 7);
  b.set([0x1a, 0x45, 0xdf, 0xa3], 0);
  return b;
};
const JPG = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 0xff, 0xd9]).toString('base64');

test('video explanations', async (t) => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: path.join(tmp, 'test.db'), EXPLAIN_DIR: path.join(tmp, 'videos'), TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '', OWNER_USERNAME: `eowner${stamp}`, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' },
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
  const ana = await signup(`eana${stamp}`);
  const ben = await signup(`eben${stamp}`);
  const cal = await signup(`ecal${stamp}`);
  const dee = await signup(`edee${stamp}`);

  const start = (cookie, extra = {}) =>
    call('POST', '/api/explain/videos', cookie, { kind: 'gate', target: Q, title: '  Why BFS works here ', mime: 'video/webm;codecs=vp9,opus', size: 20_000, durationMs: 65_000, source: 'screen+camera', chapters: [{ at: 30_000, title: 'The trick' }, { at: 1000, title: 'Setup' }, { at: 5, title: '' }], ...extra });

  let id;
  await t.test('an upload starts only for a real question, a video type, a sane size and length', async () => {
    assert.equal((await start(null)).status, 401);
    assert.equal((await start(ana, { target: 'nope' })).status, 404);
    assert.equal((await start(ana, { mime: 'image/png' })).status, 400);
    assert.equal((await start(ana, { size: 400 * 1024 * 1024 })).status, 400);
    assert.equal((await start(ana, { durationMs: 1000 })).status, 400);
    assert.equal((await start(ana, { title: '   ' })).status, 400);
    const r = await start(ana);
    assert.equal(r.status, 200);
    id = r.body.id;
    assert.match(id, /^[A-Za-z0-9_-]{16}$/);
  });

  await t.test('pieces are appended in order; a wrong offset tells the browser where to resume', async () => {
    const file = webm(20_000);
    assert.equal((await call('PUT', `/api/explain/videos/${id}/data?at=0`, ben, file.subarray(0, 8000))).status, 403);
    let r = await call('PUT', `/api/explain/videos/${id}/data?at=0`, ana, file.subarray(0, 8000));
    assert.equal(r.status, 200);
    assert.equal(r.body.have, 8000);
    // The connection dropped and the browser sends the same piece again.
    r = await call('PUT', `/api/explain/videos/${id}/data?at=0`, ana, file.subarray(0, 8000));
    assert.equal(r.status, 409);
    assert.equal(r.body.have, 8000);
    assert.equal((await call('POST', `/api/explain/videos/${id}/finish`, ana, {})).status, 409); // not complete
    r = await call('PUT', `/api/explain/videos/${id}/data?at=8000`, ana, file.subarray(8000));
    assert.equal(r.body.have, 20_000);
    r = await call('POST', `/api/explain/videos/${id}/finish`, ana, { poster: JPG });
    assert.equal(r.status, 200);
    const v = r.body.video;
    assert.equal(v.title, 'Why BFS works here');
    assert.deepEqual(v.chapters.map((c) => c.title), ['Setup', 'The trick']);
    assert.match(v.src, new RegExp(`/api/explain/media/${id}\\.webm$`));
    assert.ok(v.poster);
  });

  await t.test('a file that is not a video is refused and removed', async () => {
    const r = await start(ana, { size: 100 });
    await call('PUT', `/api/explain/videos/${r.body.id}/data?at=0`, ana, Buffer.alloc(100, 1));
    assert.equal((await call('POST', `/api/explain/videos/${r.body.id}/finish`, ana, {})).status, 400);
    assert.equal((await call('GET', `/api/explain/videos/${r.body.id}`, ana)).status, 404);
  });

  await t.test('others see it, can play it with byte ranges, mark it helpful once, and views count once', async () => {
    const list = await call('GET', `/api/explain/videos?kind=gate&target=${Q}`, ben);
    assert.equal(list.body.videos.length, 1);
    assert.equal(list.body.videos[0].mine, false);
    const part = await call('GET', `/api/explain/media/${id}.webm`, ben, undefined, { Range: 'bytes=0-3' });
    assert.equal(part.status, 206);
    assert.deepEqual([...part.body], [0x1a, 0x45, 0xdf, 0xa3]);
    assert.equal((await call('GET', `/api/explain/media/${id}.webm`)).status, 401);
    assert.equal((await call('GET', `/api/explain/media/${id}.jpg`, ben)).status, 200);

    assert.equal((await call('PUT', `/api/explain/videos/${id}/vote`, ana)).status, 400); // not your own
    assert.equal((await call('PUT', `/api/explain/videos/${id}/vote`, ben)).body.votes, 1);
    assert.equal((await call('PUT', `/api/explain/videos/${id}/vote`, ben)).body.votes, 1);
    await call('POST', `/api/explain/videos/${id}/view`, ben);
    await call('POST', `/api/explain/videos/${id}/view`, ben);
    await call('POST', `/api/explain/videos/${id}/view`, ana); // the author's own views don't count
    assert.equal((await call('GET', `/api/explain/videos/${id}`, cal)).body.video.views, 1);
  });

  await t.test('only the author edits it; private videos are theirs alone', async () => {
    assert.equal((await call('PATCH', `/api/explain/videos/${id}`, ben, { title: 'x' })).status, 403);
    const r = await call('PATCH', `/api/explain/videos/${id}`, ana, { visibility: 'private', trimStartMs: 2000, trimEndMs: 60_000 });
    assert.equal(r.body.video.trimStartMs, 2000);
    assert.equal(r.body.video.trimEndMs, 60_000);
    assert.equal((await call('GET', `/api/explain/videos?kind=gate&target=${Q}`, ben)).body.videos.length, 0);
    assert.equal((await call('GET', `/api/explain/media/${id}.webm`, ben)).status, 404);
    assert.equal((await call('GET', `/api/explain/videos?kind=gate&target=${Q}`, ana)).body.videos.length, 1);
    await call('PATCH', `/api/explain/videos/${id}`, ana, { visibility: 'public' });
  });

  await t.test('three reports hide a video until staff look', async () => {
    for (const c of [ben, cal, dee]) assert.equal((await call('POST', `/api/explain/videos/${id}/report`, c, { reason: 'off topic' })).status, 200);
    assert.equal((await call('GET', `/api/explain/videos?kind=gate&target=${Q}`, ben)).body.videos.length, 0);
    const mine = await call('GET', '/api/explain/mine', ana);
    assert.equal(mine.body.videos[0].status, 'hidden');
    assert.ok(mine.body.used >= 20_000);
  });

  await t.test('a part of a lesson (a subtopic) and a DSA lesson take videos; counts are per part', async () => {
    const L = 'dl/place-value';
    const upload = async (cookie, extra) => {
      const r = await start(cookie, extra);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      await call('PUT', `/api/explain/videos/${r.body.id}/data?at=0`, cookie, webm(20_000));
      const f = await call('POST', `/api/explain/videos/${r.body.id}/finish`, cookie, {});
      assert.equal(f.status, 200);
      return f.body.video;
    };
    assert.equal((await start(ana, { kind: 'lesson', target: `${L}#no-such-heading` })).status, 404);
    assert.equal((await start(ana, { kind: 'lesson', target: `${L}#bad id!` })).status, 404);
    assert.equal((await start(ana, { kind: 'gate', target: `${Q}#where-this-fits` })).status, 404);
    await upload(ana, { kind: 'lesson', target: `${L}#where-this-fits` });
    await upload(ben, { kind: 'lesson', target: `${L}#where-this-fits`, visibility: 'private' });
    await upload(ben, { kind: 'lesson', target: L });
    let c = await call('GET', `/api/explain/counts?kind=lesson&target=${encodeURIComponent(L)}`, cal);
    assert.deepEqual(c.body.counts, { '': 1, 'where-this-fits': 1 });
    c = await call('GET', `/api/explain/counts?kind=lesson&target=${encodeURIComponent(L)}`, ben);
    assert.deepEqual(c.body.counts, { '': 1, 'where-this-fits': 2 });
    assert.equal((await call('GET', `/api/explain/counts?kind=lesson&target=${encodeURIComponent(`${L}#x`)}`, ben)).status, 404);
    const list = await call('GET', `/api/explain/videos?kind=lesson&target=${encodeURIComponent(`${L}#where-this-fits`)}`, cal);
    assert.equal(list.body.videos.length, 1);

    assert.equal((await start(ana, { kind: 'learn', target: 'Arrays/Intro' })).status, 404);
    const d = await upload(ana, { kind: 'learn', target: 'arrays/prefix-sums#s-why-it-works', about: 'Arrays · Prefix sums · Why it works' });
    const one = await call('GET', `/api/explain/videos/${d.id}`, cal);
    assert.deepEqual(one.body.video.about, { title: 'Arrays · Prefix sums · Why it works', link: '/learn/dsa/arrays/prefix-sums#s-why-it-works' });
  });

  await t.test('a tablet link records for its owner without signing in, and only for its lesson', async () => {
    const L = 'dl/place-value#where-this-fits';
    assert.equal((await call('POST', '/api/explain/links', null, { kind: 'lesson', target: L })).status, 401);
    assert.equal((await call('POST', '/api/explain/links', dee, { kind: 'lesson', target: 'dl/nope' })).status, 404);
    const link = await call('POST', '/api/explain/links', dee, { kind: 'lesson', target: L });
    assert.equal(link.status, 200);
    assert.match(link.body.path, /^\/explain\/pad\/[A-Za-z0-9_-]{20,64}$/);
    const tok = link.body.token;
    assert.equal((await call('GET', `/api/explain/links/${tok}`, ana)).status, 404); // someone else's link
    let st = await call('GET', `/api/explain/links/${tok}`, dee);
    assert.equal(st.body.opened, false);

    const info = await call('GET', `/api/explain/device/${tok}`, null);
    assert.equal(info.status, 200);
    assert.match(info.body.about, /Where this fits$/);
    assert.equal((await call('GET', '/api/explain/device/not-a-real-token-at-all-xx', null)).status, 404);

    // The tablet cannot change what it explains.
    const r = await call('POST', `/api/explain/device/${tok}/videos`, null, { kind: 'gate', target: Q, title: 'On my iPad', mime: 'video/quicktime', size: 12_000, durationMs: 9000, source: 'board' });
    assert.equal(r.status, 200);
    const mov = Buffer.alloc(12_000, 3);
    mov.write('ftypqt  ', 4, 'ascii');
    assert.equal((await call('PUT', `/api/explain/device/${tok}/videos/${id}/data?at=0`, null, mov)).status, 404); // not this link's video
    assert.equal((await call('PUT', `/api/explain/device/${tok}/videos/${r.body.id}/data?at=0`, null, mov)).status, 200);
    st = await call('GET', `/api/explain/links/${tok}`, dee);
    assert.equal(st.body.opened, true);
    assert.equal(st.body.video, null);
    const f = await call('POST', `/api/explain/device/${tok}/videos/${r.body.id}/finish`, null, {});
    assert.equal(f.status, 200);
    st = await call('GET', `/api/explain/links/${tok}`, dee);
    assert.equal(st.body.video.id, r.body.id);
    assert.equal(st.body.video.kind, 'lesson');
    assert.equal(st.body.video.target, L);
    assert.ok(st.body.video.mine);
    assert.match(st.body.video.src, /\.mp4$/);
  });

  await t.test('the author deletes it and the file goes', async () => {
    assert.equal((await call('DELETE', `/api/explain/videos/${id}`, ben)).status, 403);
    assert.equal((await call('DELETE', `/api/explain/videos/${id}`, ana)).status, 200);
    assert.equal(fs.existsSync(path.join(tmp, 'videos', `${id}.webm`)), false);
  });
});
