// Live rooms (src/routes/live-rooms.js, src/live/*): opening rooms, joining over
// the "/live" socket namespace, chat, the direct-connection relay, the waiting
// room, the host's controls, tablets joined by a one-time code, and calls that
// ring only people you know.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { io } = require('../client/node_modules/socket.io-client');

const ROOT = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-live-'));
const stamp = Date.now().toString(36);
const OWNER = `lowner${stamp}`;

let proc;
let base;
let log = '';
const sockets = [];

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
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, password: 'secret123' }) });
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}
/** A connected "/live" socket, signed in by cookie or by a tablet's token. */
function connect({ cookie, device } = {}) {
  return new Promise((resolve, reject) => {
    const s = io(`${base}/live`, { transports: ['websocket'], extraHeaders: cookie ? { Cookie: cookie } : {}, auth: device ? { device } : {}, forceNew: true, reconnection: false });
    sockets.push(s);
    s.once('connect', () => resolve(s));
    s.once('connect_error', (e) => reject(e));
  });
}
const emit = (s, ev, payload) => new Promise((r) => s.emit(ev, payload, r));
const next = (s, ev, ms = 3000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`no "${ev}" within ${ms} ms`)), ms);
    s.once(ev, (d) => {
      clearTimeout(t);
      resolve(d);
    });
  });

test('live rooms', async (t) => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: path.join(tmp, 'test.db'), TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '', OWNER_USERNAME: OWNER, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1', LIVEKIT_URL: '', LIVEKIT_API_KEY: '', LIVEKIT_API_SECRET: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  t.after(async () => {
    for (const s of sockets) s.disconnect();
    const done = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await done;
  });
  await waitFor(`${base}/api/health`);
  await signup(OWNER);
  const ana = await signup(`lana${stamp}`);
  const ben = await signup(`lben${stamp}`);
  const cal = await signup(`lcal${stamp}`);

  let code;
  await t.test('a room is opened by a signed-in member; without a video server it is a small direct room', async () => {
    assert.equal((await call('POST', '/api/live/rooms', null, { title: 'x' })).status, 401);
    const cfg = await call('GET', '/api/live/config', ana);
    assert.equal(cfg.body.transport, 'mesh');
    assert.equal(cfg.body.maxDevices, 5);
    const r = await call('POST', '/api/live/rooms', ana, { title: '  Graphs   together ', mode: 'video', visibility: 'link' });
    assert.equal(r.status, 200);
    code = r.body.room.code;
    assert.match(code, /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
    assert.equal(r.body.room.title, 'Graphs together');
    const one = await call('GET', `/api/live/rooms/${code}`, ben);
    assert.equal(one.body.room.enter, 'free');
    assert.equal(one.body.room.people, 0);
    assert.equal((await call('GET', '/api/live/rooms/abc-defg-hij', ben)).status, 404);
  });

  let a, b, aJoin, bJoin;
  await t.test('two people join; each sees the other; chat, hands and the direct relay work', async () => {
    a = await connect({ cookie: ana });
    b = await connect({ cookie: ben });
    aJoin = await emit(a, 'join', { code });
    assert.equal(aJoin.ok, true);
    assert.equal(aJoin.self.role, 'host');
    assert.equal(aJoin.transport.kind, 'mesh');
    assert.ok(aJoin.transport.iceServers.length >= 1);
    const joined = next(a, 'peer-joined');
    bJoin = await emit(b, 'join', { code });
    assert.equal(bJoin.ok, true);
    assert.equal(bJoin.self.role, 'member');
    assert.deepEqual(bJoin.peers.map((p) => p.peerId), [aJoin.self.peerId]);
    assert.equal((await joined).peerId, bJoin.self.peerId);

    const got = next(a, 'chat');
    const sent = await emit(b, 'chat', { body: '  try BFS from 0 ' });
    assert.equal(sent.ok, true);
    const msg = await got;
    assert.equal(msg.body, 'try BFS from 0');
    assert.equal(msg.username, `lben${stamp}`);

    const sig = next(b, 'signal');
    a.emit('signal', { to: bJoin.self.peerId, data: { description: { type: 'offer', sdp: 'v=0' } } });
    const s1 = await sig;
    assert.equal(s1.from, aJoin.self.peerId);
    assert.equal(s1.data.description.type, 'offer');

    const hand = next(a, 'hand');
    b.emit('hand', { up: true });
    assert.equal((await hand).up, true);

    const st = next(a, 'peer-state');
    b.emit('state', { mic: true, cam: false, screens: [{ id: 's1', label: 'Window', kind: 'screen' }, { id: 'b', kind: 'board' }] });
    const ps = await st;
    assert.equal(ps.mic, true);
    assert.equal(ps.screens.length, 2);
    assert.equal(ps.screens[1].kind, 'board');

    // A late joiner gets the chat so far.
    const c = await connect({ cookie: cal });
    const cJoin = await emit(c, 'join', { code });
    assert.equal(cJoin.messages.at(-1).body, 'try BFS from 0');
    assert.equal(cJoin.peers.length, 2);
    const left = next(a, 'peer-left');
    c.emit('leave');
    assert.equal((await left).peerId, cJoin.self.peerId);
  });

  await t.test('only the host controls the room; locking sends newcomers to the waiting room', async () => {
    // A member's host actions do nothing.
    b.emit('lock', { locked: true });
    await new Promise((r) => setTimeout(r, 200));
    assert.equal((await call('GET', `/api/live/rooms/${code}`, cal)).body.room.locked, false);

    const roomEv = next(b, 'room');
    a.emit('lock', { locked: true });
    assert.equal((await roomEv).locked, true);

    const c = await connect({ cookie: cal });
    const knock = next(a, 'knock');
    const wait = await emit(c, 'join', { code });
    assert.equal(wait.ok, false);
    assert.equal(wait.waiting, true);
    const k = await knock;
    assert.equal(k.username, `lcal${stamp}`);
    const admitted = next(c, 'admitted');
    a.emit('admit', { id: k.id, allow: true });
    const adm = await admitted;
    assert.equal(adm.ok, true);
    assert.equal(adm.peers.length, 2);

    const removed = next(c, 'removed');
    a.emit('remove', { peerId: adm.self.peerId });
    assert.match((await removed).reason, /removed you/);
    a.emit('lock', { locked: false });
  });

  await t.test('a tablet joins by a one-time code, without signing in, only to its own room', async () => {
    assert.equal((await call('POST', `/api/live/rooms/${code}/device`, cal)).status, 403); // not in the room
    const d = await call('POST', `/api/live/rooms/${code}/device`, ana);
    assert.equal(d.status, 200);
    assert.match(d.body.path, /^\/live\/d\/[A-Za-z0-9_-]{22}$/);
    const info = await call('GET', `/api/live/device/${d.body.token}`);
    assert.equal(info.status, 200);
    assert.equal(info.body.code, code);
    assert.equal((await call('GET', '/api/live/device/not-a-real-token-at-all-xx')).status, 404);

    const tab = await connect({ device: d.body.token });
    const joined = next(b, 'peer-joined');
    const tj = await emit(tab, 'join', { code });
    assert.equal(tj.ok, true);
    assert.equal(tj.self.device, 'tablet');
    assert.match(tj.self.name, /· Tablet$/);
    assert.equal((await joined).device, 'tablet');

    const other = await call('POST', '/api/live/rooms', ben, { title: 'Other' });
    const nope = await emit(tab, 'join', { code: other.body.room.code });
    assert.equal(nope.ok, false);
    await assert.rejects(connect({ device: 'not-a-real-token-at-all-xx' }));
  });

  await t.test('invite-only rooms and calls: only people you know can be rung', async () => {
    const r = await call('POST', '/api/live/call', ana, { to: [`lcal${stamp}`], mode: 'voice' });
    assert.equal(r.status, 403);
    await call('POST', '/api/chat/dm', ana, { username: `lcal${stamp}` });
    const ok = await call('POST', '/api/live/call', ana, { to: [`lcal${stamp}`], mode: 'voice' });
    assert.equal(ok.status, 200);
    const callCode = ok.body.room.code;
    assert.equal(ok.body.room.visibility, 'invite');
    assert.equal(ok.body.room.isCall, true);
    // The invited person walks in; anyone else knocks.
    assert.equal((await call('GET', `/api/live/rooms/${callCode}`, cal)).body.room.enter, 'free');
    assert.equal((await call('GET', `/api/live/rooms/${callCode}`, ben)).body.room.enter, 'knock');
    const c = await connect({ cookie: cal });
    assert.equal((await emit(c, 'join', { code: callCode })).ok, true);
    const bb = await connect({ cookie: ben });
    assert.equal((await emit(bb, 'join', { code: callCode })).waiting, true);
    assert.equal((await call('POST', `/api/live/rooms/${callCode}/decline`, ben)).status, 404);
  });

  await t.test('study tools: polls, a shared timer and a shared code pad', async () => {
    const Y = require('yjs');
    const nextWhere = (sock, ev, pred, ms = 3000) =>
      new Promise((resolve, reject) => {
        const tm = setTimeout(() => reject(new Error(`no matching "${ev}"`)), ms);
        const h = (d) => {
          if (!pred(d)) return;
          clearTimeout(tm);
          sock.off(ev, h);
          resolve(d);
        };
        sock.on(ev, h);
      });
    // A member cannot start a poll; the host can; everyone sees the counts.
    b.emit('poll:start', { question: 'x', options: ['A', 'B'] });
    await new Promise((r) => setTimeout(r, 200));
    const seen = next(b, 'poll');
    a.emit('poll:start', { question: '  Which  is right? ', options: ['A', 'B', 'C', 'D', ''] });
    const poll = await seen;
    assert.equal(poll.question, 'Which is right?');
    assert.deepEqual(poll.options, ['A', 'B', 'C', 'D']);
    const voted = nextWhere(a, 'poll', (p) => p.voters === 1);
    b.emit('poll:vote', { id: poll.id, option: 2 });
    assert.deepEqual((await voted).counts, [0, 0, 1, 0]);
    const changed = nextWhere(a, 'poll', (p) => p.counts[3] === 1);
    b.emit('poll:vote', { id: poll.id, option: 3 }); // changing your answer counts once
    assert.equal((await changed).voters, 1);
    const closed = nextWhere(b, 'poll', (p) => p && p.open === false);
    a.emit('poll:close', {});
    await closed;

    const timer = next(b, 'timer');
    a.emit('timer', { action: 'start', minutes: 500, label: 'Solve alone' });
    const tm = await timer;
    assert.equal(tm.minutes, 180);
    assert.ok(tm.endsAt > Date.now());

    // Code typed by one person reaches the other, and a late joiner gets it all.
    const doc = new Y.Doc();
    const update = new Promise((resolve) => doc.on('update', (u) => resolve(u)));
    doc.getText('code').insert(0, 'int main() { return 0; }');
    const u = await update;
    const got = next(b, 'code:update');
    a.emit('code:update', { update: Buffer.from(u).toString('base64') });
    const other = new Y.Doc();
    Y.applyUpdate(other, Buffer.from((await got).update, 'base64'));
    assert.equal(other.getText('code').toString(), 'int main() { return 0; }');
    const late = await connect({ cookie: cal });
    const lj = await emit(late, 'join', { code });
    const ld = new Y.Doc();
    Y.applyUpdate(ld, Buffer.from(lj.code.state, 'base64'));
    assert.equal(ld.getText('code').toString(), 'int main() { return 0; }');
    assert.equal(lj.poll.open, false);
    assert.equal(lj.timer.label, 'Solve alone');
    late.emit('leave');
  });

  await t.test('the host ends the room for everyone', async () => {
    assert.equal((await call('POST', `/api/live/rooms/${code}/end`, ben)).status, 403);
    const ended = next(b, 'ended');
    const r = await call('POST', `/api/live/rooms/${code}/end`, ana);
    assert.equal(r.status, 200);
    assert.match((await ended).reason, /ended/);
    assert.ok((await call('GET', `/api/live/rooms/${code}`, ben)).body.room.endedAt);
    const again = await emit(b, 'join', { code });
    assert.equal(again.ok, false);
    const mine = await call('GET', '/api/live/rooms', ana);
    assert.ok(mine.body.mine.some((x) => x.code === code && x.mineHost));
  });

  await t.test('a direct room is capped so it stays smooth', async () => {
    const r = await call('POST', '/api/live/rooms', ana, { title: 'Cap', visibility: 'public' });
    const c2 = r.body.room.code;
    const results = [];
    for (let i = 0; i < 6; i++) {
      const s = await connect({ cookie: ana });
      results.push(await emit(s, 'join', { code: c2 }));
    }
    assert.equal(results.filter((x) => x.ok).length, 5);
    assert.match(results[5].error, /full/);
    const list = await call('GET', '/api/live/rooms', ben);
    assert.ok(list.body.live.some((x) => x.code === c2 && x.people === 1));
  });
});
