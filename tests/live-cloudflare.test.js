// Live rooms through Cloudflare Realtime, and Admin → Live. A stand-in for
// Cloudflare's API (CF_REALTIME_API) records what the site sends: keys are
// tested before they are saved and never shown again, only the owner side of
// Admin can change them, each device works only on its own session and pulls
// only from devices in its room, usage is counted, and over the monthly
// limit new rooms connect directly.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { io } = require('../client/node_modules/socket.io-client');

const ROOT = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-livecf-'));
const stamp = Date.now().toString(36);
const OWNER = `cowner${stamp}`;
const APP = 'app0123456789abcdef';
const TOKEN = 'cf-token-correct-horse-battery';

let proc;
let base;
let log = '';
const sockets = [];
const seen = [];

function fakeCloudflare() {
  let n = 0;
  return http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      const json = body ? JSON.parse(body) : {};
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: json });
      const send = (code, obj) => {
        res.writeHead(code, { 'content-type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      // A stand-in LiveKit too (Admin tests LiveKit keys by listing rooms).
      if (req.url === '/twirp/livekit.RoomService/ListRooms') return send(/^Bearer ey/.test(req.headers.authorization || '') ? 200 : 401, { rooms: [] });
      if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { errorCode: 'unauthorized', errorDescription: 'bad token' });
      const m = req.url.match(/^\/apps\/([^/]+)\/sessions\/(new|[^/]+\/(tracks\/new|tracks\/close|tracks\/update|renegotiate))$/);
      if (!m || m[1] !== APP) return send(404, { errorCode: 'not-found' });
      if (m[2] === 'new') return send(201, { sessionId: `S${++n}` });
      if (m[3] === 'tracks/new' && json.sessionDescription) return send(200, { sessionDescription: { type: 'answer', sdp: 'v=0 answer' }, tracks: json.tracks.map((t) => ({ mid: t.mid, trackName: t.trackName })) });
      if (m[3] === 'tracks/new') return send(200, { requiresImmediateRenegotiation: true, sessionDescription: { type: 'offer', sdp: 'v=0 offer' }, tracks: json.tracks.map((t, i) => ({ mid: String(10 + i), trackName: t.trackName, sessionId: t.sessionId })) });
      if (m[3] === 'tracks/close') return send(200, { sessionDescription: { type: 'answer', sdp: 'v=0 closed' } });
      return send(200, {});
    });
  });
}

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
  const r = await fetch(`${base}${p}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, password: 'secret123' }) });
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}
function connect(cookie) {
  return new Promise((resolve, reject) => {
    const s = io(`${base}/live`, { transports: ['websocket'], extraHeaders: { Cookie: cookie }, forceNew: true, reconnection: false });
    sockets.push(s);
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
}
const emit = (s, ev, payload) => new Promise((r) => s.emit(ev, payload, r));
const next = (s, ev, pred = () => true, ms = 3000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`no "${ev}"`)), ms);
    const h = (d) => {
      if (!pred(d)) return;
      clearTimeout(t);
      s.off(ev, h);
      resolve(d);
    };
    s.on(ev, h);
  });

test('live rooms through Cloudflare, and Admin → Live', async (t) => {
  const cf = fakeCloudflare();
  const cfPort = await freePort();
  await new Promise((r) => cf.listen(cfPort, '127.0.0.1', r));
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: path.join(tmp, 'test.db'), TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '', OWNER_USERNAME: OWNER, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1', LIVEKIT_URL: '', LIVEKIT_API_KEY: '', LIVEKIT_API_SECRET: '', CF_REALTIME_API: `http://127.0.0.1:${cfPort}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  t.after(async () => {
    for (const s of sockets) s.disconnect();
    const done = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await done;
    cf.close();
  });
  await waitFor(`${base}/api/health`);
  const owner = await signup(OWNER);
  const ana = await signup(`cana${stamp}`);
  const ben = await signup(`cben${stamp}`);

  await t.test('only the owner side of Admin sees and changes Live', async () => {
    // Admin hides itself from members (404), or refuses (403).
    assert.ok([403, 404].includes((await call('GET', '/api/admin/live', ana)).status));
    const r = await call('GET', '/api/admin/live', owner);
    assert.equal(r.status, 200);
    assert.equal(r.body.provider, 'auto');
    assert.equal(r.body.active, 'mesh');
    assert.equal(r.body.cloudflare, null);
    assert.ok([403, 404].includes((await call('PUT', '/api/admin/live/cloudflare', ana, { appId: APP, secret: TOKEN })).status));
  });

  await t.test('a wrong token is refused and nothing is saved; the right one is kept sealed', async () => {
    const bad = await call('PUT', '/api/admin/live/cloudflare', owner, { appId: APP, secret: 'wrong-token-1234' });
    assert.equal(bad.status, 400);
    assert.match(bad.body.error, /did not accept/);
    assert.equal((await call('GET', '/api/admin/live', owner)).body.cloudflare, null);
    const ok = await call('PUT', '/api/admin/live/cloudflare', owner, { appId: APP, secret: TOKEN });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.cloudflare.appId, APP);
    assert.equal(ok.body.cloudflare.last4, TOKEN.slice(-4));
    assert.equal(ok.body.cloudflare.test.ok, true);
    assert.equal(JSON.stringify(ok.body).includes(TOKEN), false);
    assert.equal(ok.body.active, 'cf');
    const cfg = await call('GET', '/api/live/config', ana);
    assert.equal(cfg.body.transport, 'cf');
    assert.equal(cfg.body.maxDevices, 50);
  });

  let code;
  let a;
  let b;
  let aSession;
  await t.test('a room uses Cloudflare; each device opens its own session and pushes its tracks', async () => {
    code = (await call('POST', '/api/live/rooms', ana, { title: 'CF room' })).body.room.code;
    a = await connect(ana);
    b = await connect(ben);
    const aj = await emit(a, 'join', { code });
    assert.equal(aj.transport.kind, 'cf');
    assert.match(JSON.stringify(aj.transport.iceServers), /stun\.cloudflare\.com/);
    await emit(b, 'join', { code });
    const announce = next(b, 'peer-state', (d) => !!d.cf);
    const s1 = await emit(a, 'cf:session', {});
    aSession = s1.sessionId;
    assert.match(aSession, /^S\d+$/);
    assert.equal((await announce).cf, aSession);
    // Asking again keeps the same session.
    assert.equal((await emit(a, 'cf:session', {})).sessionId, aSession);

    const before = seen.length;
    const push = await emit(a, 'cf:push', { sdp: 'v=0 offer-from-a', tracks: [{ mid: '0', trackName: 'mic' }, { mid: '1', trackName: 'cam' }] });
    assert.equal(push.sessionDescription.type, 'answer');
    const req = seen[before];
    assert.equal(req.url, `/apps/${APP}/sessions/${aSession}/tracks/new`);
    assert.equal(req.auth, `Bearer ${TOKEN}`);
    assert.deepEqual(req.body.tracks.map((x) => x.location), ['local', 'local']);

    const st = next(b, 'peer-state', (d) => d.pubs?.length === 2);
    a.emit('state', { mic: true, cam: true, screens: [], pubs: ['mic', 'cam', 'bad name!'] });
    assert.deepEqual((await st).pubs, ['mic', 'cam']);
  });

  await t.test('pulls reach only sessions in the same room; answers and closes are passed on', async () => {
    const bs = await emit(b, 'cf:session', {});
    const before = seen.length;
    const pull = await emit(b, 'cf:pull', { tracks: [{ sessionId: aSession, trackName: 'cam', rid: 'h' }, { sessionId: 'S999', trackName: 'cam' }] });
    assert.equal(pull.requiresImmediateRenegotiation, true);
    const req = seen[before];
    assert.equal(req.url, `/apps/${APP}/sessions/${bs.sessionId}/tracks/new`);
    assert.equal(req.body.tracks.length, 1); // S999 is not in this room
    assert.deepEqual(req.body.tracks[0], { location: 'remote', sessionId: aSession, trackName: 'cam', simulcast: { preferredRid: 'h' } });
    assert.equal((await emit(b, 'cf:pull', { tracks: [{ sessionId: 'S999', trackName: 'cam' }] })).errorCode, 'no-tracks');
    assert.equal((await emit(b, 'cf:pull', { tracks: [{ sessionId: bs.sessionId, trackName: 'cam' }] })).errorCode, 'no-tracks'); // not your own

    assert.equal((await emit(b, 'cf:answer', { sdp: 'v=0 answer-from-b' })).errorCode, undefined);
    assert.equal(seen.at(-1).url, `/apps/${APP}/sessions/${bs.sessionId}/renegotiate`);
    assert.equal(seen.at(-1).body.sessionDescription.type, 'answer');
    const closed = await emit(b, 'cf:close', { sdp: 'v=0 offer-close', mids: ['10'] });
    assert.equal(closed.sessionDescription.sdp, 'v=0 closed');
    await emit(b, 'cf:quality', { sessionId: aSession, trackName: 'cam', mid: '10', rid: 'l' });
    assert.deepEqual(seen.at(-1).body.tracks[0].simulcast, { preferredRid: 'l' });
    assert.equal((await emit(b, 'cf:push', { sdp: 'not sdp', tracks: [] })).errorCode, 'bad');
  });

  await t.test('usage is counted, and over the monthly limit new rooms connect directly', async () => {
    a.emit('usage', { bytes: 2_000_000, ms: 30_000 });
    await new Promise((r) => setTimeout(r, 300));
    let v = await call('GET', '/api/admin/live', owner);
    assert.ok(v.body.usage.bytes >= 2_000_000);
    // A report larger than a connection can carry is cut down to what is believable.
    a.emit('usage', { bytes: 1e15, ms: 120_000 });
    await new Promise((r) => setTimeout(r, 300));
    v = await call('GET', '/api/admin/live', owner);
    assert.ok(v.body.usage.bytes < 1e9);
    assert.equal((await call('PUT', '/api/admin/live', owner, { monthlyGb: 0 })).body.active, 'cf'); // 0 = no limit
    a.emit('usage', { bytes: 1e12, ms: 120_000 });
    a.emit('usage', { bytes: 1e12, ms: 120_000 });
    await new Promise((r) => setTimeout(r, 300));
    const capped = await call('PUT', '/api/admin/live', owner, { monthlyGb: 1 });
    assert.equal(capped.body.overLimit, true);
    assert.equal(capped.body.active, 'mesh');
    assert.equal((await call('GET', '/api/live/config', ana)).body.transport, 'mesh');
    // Both together: with LiveKit set up too, rooms move to LiveKit when Cloudflare's limit is reached.
    const lk = await call('PUT', '/api/admin/live/livekit', owner, { url: `ws://127.0.0.1:${cfPort}`, key: 'APIkey', secret: 'livekit-secret-xyz' });
    assert.equal(lk.status, 200);
    assert.equal(lk.body.livekit.last4, '-xyz');
    assert.equal(lk.body.active, 'sfu');
    assert.equal((await call('GET', '/api/live/config', ana)).body.transport, 'sfu');
    assert.equal((await call('PUT', '/api/admin/live', owner, { monthlyGb: 0 })).body.active, 'cf'); // under the limit: Cloudflare first
    await call('DELETE', '/api/admin/live/livekit', owner);
    await call('PUT', '/api/admin/live', owner, { monthlyGb: 900 });
  });

  await t.test('the owner chooses the way rooms connect and switches parts off', async () => {
    assert.equal((await call('PUT', '/api/admin/live', owner, { provider: 'direct' })).body.active, 'mesh');
    assert.equal((await call('PUT', '/api/admin/live', owner, { provider: 'nonsense' })).status, 400);
    assert.equal((await call('PUT', '/api/admin/live', owner, { provider: 'cloudflare', maxPeople: 500 })).body.maxPeople, 200);
    await call('PUT', '/api/admin/live', owner, { calls: false, tablets: false });
    await call('POST', '/api/chat/dm', ana, { username: `cben${stamp}` });
    assert.equal((await call('POST', '/api/live/call', ana, { to: [`cben${stamp}`] })).status, 403);
    assert.equal((await call('POST', `/api/live/rooms/${code}/device`, ana)).status, 403);
    const removed = await call('DELETE', '/api/admin/live/cloudflare', owner);
    assert.equal(removed.body.cloudflare, null);
    assert.equal(removed.body.active, 'mesh');
  });
});
