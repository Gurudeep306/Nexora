// /api/agent/* end to end: a real Nexora server talking to a stub Groq server
// (GROQ_BASE_URL) — no real key, no network.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-agent-'));
const servers = [];
let stub;
let stubRequests = [];
let base;
let baseNoKey;

/* ── stub Groq: OpenAI-compatible /chat/completions ── */
function startStub() {
  return new Promise((resolve) => {
    stub = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', () => {
        const body = JSON.parse(raw || '{}');
        stubRequests.push({ auth: req.headers.authorization, body });
        const lastUser = [...body.messages].reverse().find((m) => m.role === 'user')?.content || '';
        const hadTool = body.messages.some((m) => m.role === 'tool');
        const usage = { prompt_tokens: 3, completion_tokens: 2, total_tokens: /expensive/.test(lastUser) ? 80 : 5 };
        if (!body.stream) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ choices: [{ message: { content: '```cpp\nint x = 0;\n```' } }], usage }));
        }
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
        if (/use a tool/.test(lastUser) && !hadTool) {
          send({ choices: [{ delta: { tool_calls: [{ index: 0, id: 't1', function: { name: 'get_user_stats', arguments: '{}' } }] } }] });
        } else {
          for (const w of ['Try ', 'two ', 'pointers.']) send({ choices: [{ delta: { content: w } }] });
        }
        send({ choices: [], usage });
        res.end('data: [DONE]\n\n');
      });
    });
    stub.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${stub.address().port}`));
  });
}

async function startServer(extraEnv, name) {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  let log = '';
  const proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      GROQ_API_KEY: '',
      PORT: String(port),
      NODE_ENV: 'test',
      DB_PATH: path.join(tmp, `${name}.db`),
      DISABLE_PUPPETEER: '1',
      DISABLE_SCRAPER: '1',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  servers.push({ proc, log: () => log });
  for (let i = 0; i < 160; i++) {
    try {
      if ((await fetch(`${url}/api/health`)).ok) return url;
    } catch {}
    if (proc.exitCode !== null) throw new Error(`server exited early: ${log}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready: ${log}`);
}

const call = async (b, method, p, cookie, body) => {
  const r = await fetch(`${b}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: r.status, body: json, text, type: r.headers.get('content-type') || '' };
};
async function signup(b, name) {
  const r = await call(b, 'POST', '/api/user/register', null, { username: name, email: `${name}@t.io`, password: 'secret123' });
  assert.equal(r.status, 200, r.text);
  const res = await fetch(`${b}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, password: 'secret123' }),
  });
  return res.headers.get('set-cookie').split(';')[0];
}
function parseSse(text) {
  return text
    .split('\n\n')
    .filter((b) => b.startsWith('event:'))
    .map((b) => {
      const [ev, data] = b.split('\n');
      return { event: ev.slice(7), data: JSON.parse(data.slice(6)) };
    });
}

const stamp = Date.now().toString(36).slice(-5);
let alice;
let bob;

test.before(async () => {
  const stubUrl = await startStub();
  [base, baseNoKey] = await Promise.all([
    startServer({ GROQ_API_KEY: 'stub-key-123', GROQ_BASE_URL: stubUrl, AI_DAILY_TOKENS: '100' }, 'withkey'),
    startServer({}, 'nokey'),
  ]);
  alice = await signup(base, `al${stamp}`);
  bob = await signup(base, `bo${stamp}`);
});

test.after(async () => {
  for (const s of servers) {
    const done = new Promise((r) => s.proc.once('exit', r));
    s.proc.kill('SIGKILL');
    await done;
  }
  stub?.close();
});

test('logged-out requests get 401', async () => {
  assert.equal((await call(base, 'POST', '/api/agent/chat', null, { message: 'hi' })).status, 401);
  assert.equal((await call(base, 'POST', '/api/agent/task', null, { mode: 'complete' })).status, 401);
  assert.equal((await call(base, 'GET', '/api/agent/conversations')).status, 401);
});

test('chat streams SSE events in order and runs tools', async () => {
  const r = await call(base, 'POST', '/api/agent/chat', alice, { message: 'please use a tool', page: { path: '/analytics' } });
  assert.equal(r.status, 200);
  assert.match(r.type, /text\/event-stream/);
  const events = parseSse(r.text);
  assert.deepEqual(
    events.map((e) => e.event),
    ['meta', 'tool', 'tool', 'token', 'token', 'token', 'done'],
  );
  assert.equal(events.filter((e) => e.event === 'token').map((e) => e.data.text).join(''), 'Try two pointers.');
  assert.equal(events.at(-1).data.conversationId, events[0].data.conversationId);
  // The key went to Groq only as a bearer token; the tool result went back as data.
  const second = stubRequests.at(-1);
  assert.equal(second.auth, 'Bearer stub-key-123');
  const toolMsg = second.body.messages.find((m) => m.role === 'tool');
  assert.match(toolMsg.content, new RegExp(`"username":"al${stamp}"`));
});

test('conversations persist by id and are private to their owner', async () => {
  const first = parseSse((await call(base, 'POST', '/api/agent/chat', alice, { message: 'hello' })).text);
  const conv = first[0].data.conversationId;
  await call(base, 'POST', '/api/agent/chat', alice, { message: 'and again', conversationId: conv });
  const mine = await call(base, 'GET', `/api/agent/conversations/${conv}`, alice);
  assert.equal(mine.status, 200);
  assert.deepEqual(
    mine.body.messages.map((m) => [m.role, m.content]),
    [
      ['user', 'hello'],
      ['assistant', 'Try two pointers.'],
      ['user', 'and again'],
      ['assistant', 'Try two pointers.'],
    ],
  );
  const list = await call(base, 'GET', '/api/agent/conversations', alice);
  assert.ok(list.body.conversations.some((c) => c.id === conv));

  assert.equal((await call(base, 'GET', `/api/agent/conversations/${conv}`, bob)).status, 404);
  assert.equal((await call(base, 'DELETE', `/api/agent/conversations/${conv}`, bob)).status, 404);
  assert.equal((await call(base, 'GET', `/api/agent/conversations/${conv}`, alice)).status, 200, 'still there');
  assert.equal((await call(base, 'DELETE', `/api/agent/conversations/${conv}`, alice)).status, 200);
  assert.equal((await call(base, 'GET', `/api/agent/conversations/${conv}`, alice)).status, 404);
});

test('one-shot tasks return results; unknown modes are refused', async () => {
  const r = await call(base, 'POST', '/api/agent/task', alice, { mode: 'complete', prefix: 'int main() {\n  int', suffix: '', language: 'cpp' });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.body, { ok: true, result: { text: 'int x = 0;' } });
  assert.equal((await call(base, 'POST', '/api/agent/task', alice, { mode: 'translate' })).status, 400, 'internal modes are not public');
  assert.equal((await call(base, 'POST', '/api/agent/task', alice, { mode: 'nope' })).status, 400);
  // Studio authoring also needs studio rights.
  assert.equal((await call(base, 'POST', '/api/agent/task', alice, { mode: 'studio_author', prompt: 'x' })).status, 401);
});

test('the daily token budget is enforced per user', async () => {
  const carol = await signup(base, `ca${stamp}`);
  const spend = () => call(base, 'POST', '/api/agent/chat', carol, { message: 'expensive question' });
  assert.equal((await spend()).status, 200); // 80 of 100
  assert.equal((await spend()).status, 200); // 160 — over, but it was allowed to start
  const third = await spend();
  assert.equal(third.status, 429);
  assert.match(third.body.error, /daily AI budget used/);
  // Others are unaffected.
  assert.equal((await call(base, 'POST', '/api/agent/chat', bob, { message: 'hi' })).status, 200);
  const st = await call(base, 'GET', '/api/agent/status', carol);
  assert.ok(st.body.used >= 160 && st.body.limit === 100);
});

test('without GROQ_API_KEY AI answers 503 and the rest of the site works', async () => {
  const dave = await signup(baseNoKey, `da${stamp}`);
  const chat = await call(baseNoKey, 'POST', '/api/agent/chat', dave, { message: 'hi' });
  assert.equal(chat.status, 503);
  assert.deepEqual([chat.body.ok, chat.body.error], [false, 'AI is not configured']);
  const task = await call(baseNoKey, 'POST', '/api/agent/task', dave, { mode: 'fix', code: 'x', language: 'cpp' });
  assert.equal(task.status, 503);
  const status = await call(baseNoKey, 'GET', '/api/agent/status', dave);
  assert.equal(status.body.configured, false);
  assert.equal((await call(baseNoKey, 'GET', '/api/stats', dave)).status, 200);
  for (const s of servers) assert.ok(!s.log().includes('stub-key-123'), 'the key never reaches the logs');
});
