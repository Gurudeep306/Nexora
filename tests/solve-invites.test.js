// Invite to solve (src/solve-invites.js, POST /api/chat/invite-solve) and
// shared solutions as spoilers (chat and feed): who gets the card, real
// solve times from the judge, notifications, forwarding, and who sees code.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-invites-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36).slice(-5);
const [OWNER, ALI, BOB, CAT] = ['iow', 'ial', 'ibo', 'ica'].map((p) => `${p}${stamp}`);
let proc, base;
let serverLog = '';
const c = {};
let pid, hidden;
const CONTEST = 90000 + (parseInt(stamp, 36) % 9000); // a made-up contest number for this run

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within 40s: ${serverLog}`);
}
const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, body: json };
};
const ok = (r, msg) => assert.equal(r.status, 200, `${msg || ''} ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
function db(fn) {
  const { DatabaseSync } = require('node:sqlite');
  const d = new DatabaseSync(DB, { timeout: 10000 });
  try { return fn(d); } finally { d.close(); }
}
const DOUBLE = "const n=+require('fs').readFileSync(0,'utf8');console.log(n*2)";
const judge = (who, code) => call('POST', '/api/judge', c[who], { problem_id: pid, language: 'javascript', code, testcases: [] });
const messagesIn = async (who, conv) => (await call('GET', `/api/chat/conversations/${conv}/messages`, c[who])).body.messages;
const notifications = async (who) => (await call('GET', '/api/social/notifications', c[who])).body;

test.before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', JUDGE_MODE: 'local', DB_PATH: DB, OWNER_USERNAME: OWNER, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1', TOPICS_STARTUP: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  for (const n of [OWNER, ALI, BOB, CAT]) {
    const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: n, password: 'secret123' }) });
    assert.equal(r.status, 200, `register ${n}`);
    c[n] = r.headers.get('set-cookie').split(';')[0];
  }
  ok(await call('PUT', '/api/admin/site/private-mode', c[OWNER], { enabled: false }));
  db((d) => {
    const add = d.prepare("INSERT INTO problems(platform, problem_id, title, url, rating, tags, category) VALUES(?,?,?,?,?,?,?)");
    add.run('codeforces', `${CONTEST}A`, 'Double It', 'https://x', 1200, '[]', null);
    add.run('codeforces', `${CONTEST}B`, 'Unpublished', 'https://x', 1200, '[]', '__hidden');
    pid = Number(d.prepare('SELECT id FROM problems WHERE problem_id=?').get(`${CONTEST}A`).id);
    hidden = Number(d.prepare('SELECT id FROM problems WHERE problem_id=?').get(`${CONTEST}B`).id);
    d.prepare("INSERT INTO problem_statements(problem_rowid, samples, scraped_at) VALUES(?,?,datetime('now'))").run(pid, JSON.stringify([{ input: '4\n', output: '8\n' }]));
    // The official tests, so an Accepted is a full check (solved), as on the live site.
    d.exec('CREATE TABLE IF NOT EXISTS cf_dataset_tests (id TEXT PRIMARY KEY, tests TEXT NOT NULL, exact INTEGER NOT NULL, fetched_at INTEGER NOT NULL)');
    d.prepare('INSERT OR REPLACE INTO cf_dataset_tests(id, tests, exact, fetched_at) VALUES(?,?,1,?)').run(`${CONTEST}/A`, JSON.stringify([{ input: '4\n', output: '8\n' }, { input: '7\n', output: '14\n' }]), Date.now());
  });
});
test.after(async () => {
  if (proc) {
    const done = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await done;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

let conv, inviteMsg;

test('an invite needs someone to invite and a problem everyone can open', async () => {
  assert.equal((await call('POST', '/api/chat/invite-solve', null, { problemId: pid, usernames: [BOB] })).status, 401);
  assert.equal((await call('POST', '/api/chat/invite-solve', c[ALI], { problemId: pid, usernames: [] })).status, 400);
  assert.equal((await call('POST', '/api/chat/invite-solve', c[ALI], { problemId: pid, usernames: [ALI] })).status, 400, 'not yourself');
  assert.equal((await call('POST', '/api/chat/invite-solve', c[ALI], { problemId: hidden, usernames: [BOB] })).status, 404, 'not an unpublished problem');
  assert.equal((await call('POST', '/api/chat/invite-solve', c[ALI], { problemId: 999999, usernames: [BOB] })).status, 404);
});

test('the invite lands in the direct chat as a card, and the friend gets a notification that opens it', async () => {
  const r = await call('POST', '/api/chat/invite-solve', c[ALI], { problemId: pid, usernames: [BOB], race: true, note: 'first one wins' });
  ok(r);
  assert.equal(r.body.sent, 1);
  conv = r.body.conversationIds[0];
  const msgs = await messagesIn(BOB, conv);
  inviteMsg = msgs.find((m) => m.share?.type === 'invite');
  assert.ok(inviteMsg, 'the card is there');
  assert.equal(inviteMsg.body, 'first one wins');
  assert.equal(inviteMsg.share.race, true);
  assert.equal(inviteMsg.share.problemId, pid);
  assert.deepEqual(inviteMsg.share.people.map((p) => [p.username, p.solvedAt]).sort(), [[ALI, null], [BOB, null]]);
  const n = await notifications(BOB);
  const g = (n.groups || n.notifications || []).find((x) => x.type === 'invite_solve');
  assert.ok(g, JSON.stringify(n).slice(0, 300));
  assert.equal(g.link, `/social?tab=messages&c=${conv}`);
  assert.equal(g.snippet, 'Double It');
});

test('a full Accepted marks the friend solved on the card, with the real time, and tells the inviter', async () => {
  assert.equal((await judge(BOB, 'console.log(0)')).body.verdict, 'WA');
  const ac = await judge(BOB, DOUBLE);
  assert.equal(ac.body.verdict, 'AC', JSON.stringify(ac.body).slice(0, 200));
  const card = (await messagesIn(ALI, conv)).find((m) => m.id === inviteMsg.id).share;
  const bob = card.people.find((p) => p.username === BOB);
  assert.equal(bob.how, 'solved');
  assert.ok(bob.solvedAt && new Date(bob.solvedAt) >= new Date(card.startedAt), 'a real time, after the invite');
  assert.equal(card.people[0].username, BOB, 'who solved first comes first');
  assert.equal(card.people.find((p) => p.username === ALI).solvedAt, null);
  const n = await notifications(ALI);
  assert.ok((n.groups || n.notifications || []).some((x) => x.type === 'invite_solved'));
});

test('someone who solved it before the invite shows as "earlier", not as winning the race', async () => {
  const r = await call('POST', '/api/chat/invite-solve', c[ALI], { problemId: pid, usernames: [BOB] });
  ok(r);
  const card = (await messagesIn(ALI, r.body.conversationIds[0])).find((m) => m.share?.inviteId === r.body.inviteId).share;
  assert.equal(card.people.find((p) => p.username === BOB).how, 'earlier');
});

test('forwarded, an invite is just the problem: the race stays with the people invited', async () => {
  const dm = await call('POST', '/api/chat/dm', c[ALI], { username: CAT });
  ok(dm);
  ok(await call('POST', `/api/chat/messages/${inviteMsg.id}/forward`, c[ALI], { conversationIds: [dm.body.id] }));
  const fwd = (await messagesIn(CAT, dm.body.id)).find((m) => m.forwarded);
  assert.equal(fwd.share.type, 'problem');
  assert.equal(fwd.share.people, undefined);
});

test('a shared solution in chat: code for its writer and those who solved it; others choose Reveal', async () => {
  const sub = db((d) => d.prepare("SELECT id FROM submissions WHERE username=? AND verdict='AC' ORDER BY id DESC").get(BOB));
  const sent = await call('POST', `/api/chat/conversations/${conv}/messages`, c[BOB], { body: 'mine', share: { type: 'submission', id: sub.id } });
  ok(sent);
  assert.ok(sent.body.message.share.code.includes('readFileSync'), 'the writer sees the code');
  const forAli = (await messagesIn(ALI, conv)).find((m) => m.id === sent.body.message.id).share;
  assert.equal(forAli.code, null, 'hidden from someone who has not solved it');
  assert.equal(forAli.locked, true);
  assert.equal(forAli.lines, 1);
  const rev = await call('POST', `/api/chat/messages/${sent.body.message.id}/reveal`, c[ALI]);
  ok(rev);
  assert.ok(rev.body.code.includes('readFileSync'));
  assert.notEqual((await call('POST', `/api/chat/messages/${sent.body.message.id}/reveal`, c[CAT])).status, 200, 'not for someone outside the chat');
  // Once Ali solves it, the code shows straight away.
  assert.equal((await judge(ALI, DOUBLE)).body.verdict, 'AC');
  assert.ok((await messagesIn(ALI, conv)).find((m) => m.id === sent.body.message.id).share.code.includes('readFileSync'));
});

test('a shared solution on the feed: offered to share, hidden from people who have not solved it', async () => {
  const sh = await call('GET', '/api/social/shareables', c[BOB]);
  ok(sh);
  const sol = sh.body.solutions.find((s) => s.title === 'Double It');
  assert.ok(sol, 'an Accepted solution is offered');
  const post = await call('POST', '/api/social/posts', c[BOB], { body: 'clean one', share: { type: 'submission', id: sol.id } });
  ok(post);
  const id = post.body.post?.id ?? post.body.id;
  const seen = async (who) => {
    const r = await call('GET', `/api/social/posts/${id}`, c[who]);
    return (r.body.post ?? r.body).share;
  };
  assert.ok((await seen(BOB)).code.includes('readFileSync'));
  assert.ok((await seen(ALI)).code, 'Ali solved it in the test above');
  const forCat = await seen(CAT);
  assert.equal(forCat.code, null);
  assert.equal(forCat.locked, true);
  const rev = await call('POST', `/api/social/posts/${id}/reveal`, c[CAT]);
  ok(rev);
  assert.ok(rev.body.code.includes('readFileSync'));
  // Only Accepted solutions can be shared.
  const wa = db((d) => d.prepare("SELECT id FROM submissions WHERE username=? AND verdict='WA'").get(BOB));
  assert.equal((await call('POST', '/api/social/posts', c[BOB], { body: 'x', share: { type: 'submission', id: wa.id } })).status, 400);
});
