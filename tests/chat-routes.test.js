// Messages over HTTP (src/routes/chat.js): sign-in required, share cards
// built from the server's own data, uploads checked by their bytes, and
// messages sent the old way still arrive in the new conversations.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-chat-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36);
const A = `al${stamp}`;
const B = `bo${stamp}`;
const C = `cy${stamp}`;
let proc, base, a, b, c;
let serverLog = '';

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within 40s: ${serverLog}`);
}
const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, email: `${name}@t.io`, password: 'secret123' }) });
  assert.equal(r.status, 200, `register ${name}`);
  return r.headers.get('set-cookie').split(';')[0];
}
function withDb(fn) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { timeout: 10000 });
  try { return fn(db); } finally { db.close(); }
}
async function upload(cookie, bytes, name, type) {
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type }), name);
  const r = await fetch(`${base}/api/chat/upload`, { method: 'POST', headers: { Cookie: cookie }, body: fd });
  return { status: r.status, body: await r.json() };
}

test.before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', JUDGE_MODE: 'local', DB_PATH: DB, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  a = await signup(A);
  b = await signup(B);
  c = await signup(C);
  // b follows a, so a's messages reach b directly.
  withDb((db) => db.prepare("INSERT INTO social_follows(follower, followee, status, created_at) VALUES(?,?, 'accepted', 0)").run(B, A));
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});

test('messages need a session', async () => {
  assert.equal((await call('GET', '/api/chat/conversations')).status, 401);
  assert.equal((await call('POST', '/api/chat/dm', null, { username: B })).status, 401);
  assert.equal((await call('GET', '/api/chat/conversations', a)).status, 200);
});

test('a direct message with a share card built by the server', async () => {
  const pid = withDb((db) => {
    db.prepare("INSERT INTO problems(platform, problem_id, title, url, rating, tags, category) VALUES('codeforces','CHAT1','Chat problem','https://x',1400,'[]','math')").run();
    return Number(db.prepare("SELECT id FROM problems WHERE problem_id='CHAT1'").get().id);
  });
  const dm = await call('POST', '/api/chat/dm', a, { username: B });
  assert.equal(dm.status, 200);
  const sent = await call('POST', `/api/chat/conversations/${dm.body.id}/messages`, a, { body: 'try this', share: { type: 'problem', id: pid } });
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.deepEqual(sent.body.message.share, { type: 'problem', id: pid, title: 'Chat problem', platform: 'codeforces', rating: 1400, link: `/solve/${pid}` });
  const forged = await call('POST', `/api/chat/conversations/${dm.body.id}/messages`, a, { share: { type: 'problem', id: pid, title: 'FREE MONEY' } });
  assert.equal(forged.body.message.share.title, 'Chat problem', 'the client cannot write the card');
  const theirs = await call('POST', `/api/chat/conversations/${dm.body.id}/messages`, a, { share: { type: 'submission', id: 1 } });
  assert.equal(theirs.status, 404);
  assert.equal((await call('GET', `/api/chat/conversations/${dm.body.id}/messages`, c)).status, 404, 'an outsider gets not found');
  const unread = await call('GET', '/api/chat/unread', b);
  assert.equal(unread.body.total, 2);
});

test('uploads are checked by their bytes', async () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000201a5ad9c5c0000000049454e44ae426082', 'hex');
  const ok = await upload(a, png, 'dot.png', 'image/png');
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.match(ok.body.attachment.url, /^\/uploads\/chat\/[a-f0-9]{24}\.png$/);
  assert.equal(ok.body.attachment.kind, 'image');
  const code = await upload(a, Buffer.from('int main(){return 0;}\n'), 'main.cpp', 'text/x-c');
  assert.equal(code.body.attachment.kind, 'file');
  assert.match(code.body.attachment.url, /\.txt$/, 'code is stored as plain text');
  const svg = await upload(a, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), 'x.svg', 'image/svg+xml');
  assert.equal(svg.status, 400);
  const html = await upload(a, Buffer.from('<script>alert(1)</script>'), 'x.html', 'text/html');
  assert.equal(html.status, 400);
  const fakePng = await upload(a, Buffer.from('<script>alert(1)</script>'), 'x.png', 'image/png');
  assert.equal(fakePng.status, 400, 'the name does not decide');
});

test('a message sent the old way arrives in the new conversation', async () => {
  const r = await call('POST', '/api/messages', a, { from: A, to: B, content: 'old way' });
  assert.equal(r.status, 200);
  const list = await call('GET', '/api/chat/conversations', b);
  const conv = list.body.conversations.find((x) => x.kind === 'dm' && x.members.some((m) => m.username === A));
  assert.equal(conv.last.body, 'old way');
});

test('a group invite link works for someone new, and stops when switched off', async () => {
  const g = await call('POST', '/api/chat/groups', a, { title: 'Graphs', members: [B] });
  assert.equal(g.status, 200, JSON.stringify(g.body));
  const inv = await call('PUT', `/api/chat/conversations/${g.body.id}/invite`, a, { on: true });
  const token = inv.body.inviteToken;
  assert.equal((await call('GET', `/api/chat/invite/${token}`, c)).body.group.title, 'Graphs');
  assert.equal((await call('POST', `/api/chat/invite/${token}`, c)).body.id, g.body.id);
  assert.equal((await call('GET', `/api/chat/conversations/${g.body.id}`, c)).status, 200);
  await call('PUT', `/api/chat/conversations/${g.body.id}/invite`, a, { on: false });
  assert.equal((await call('GET', `/api/chat/invite/${token}`, c)).status, 404);
});
