// Nexora Hive end to end: staff-only access (HTTP + socket namespace), the
// encrypted key vault, a GitHub project, a Claude agent editing the repo
// through tools, review, and commit + PR — against local mock GitHub and mock
// Claude servers (the Claude SDK is pointed at the mock via the key's base URL).
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const zlib = require('node:zlib');
const { spawn } = require('node:child_process');
const path = require('node:path');

const OWNER = `hiveowner${Date.now().toString(36).slice(-4)}`;
const SECRET_KEY = 'sk-ant-test-SECRET-1234567890abcd';
const GH_TOKEN = 'ghp_testtoken_ABCDEFGHIJ';

let proc;
let base;
let serverLog = '';
let mock;
let mockUrl;
const ghCalls = [];
let claudeTurn = 0;
let teamLeadSawReports = '';
const claudeBodies = [];

/* ── tiny tar.gz writer for the mock tarball ── */
function tarGz(files) {
  const blocks = [];
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const h = Buffer.alloc(512);
    h.write(name, 0, 100, 'utf8');
    h.write('0000644\0', 100);
    h.write('0000000\0', 108);
    h.write('0000000\0', 116);
    h.write(data.length.toString(8).padStart(11, '0') + '\0', 124);
    h.write('00000000000\0', 136);
    h.write('        ', 148);
    h.write('0', 156);
    h.write('ustar\0', 257);
    h.write('00', 263);
    let sum = 0;
    for (const b of h) sum += b;
    h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    blocks.push(h, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(blocks));
}

const REPO_FILES = {
  'README.md': '# Demo\n\nHello world.\n',
  'src/app.js': "function greet(name) {\n  return 'Hello ' + name;\n}\n\nmodule.exports = { greet };\n",
};

/* ── Claude SSE helper ── */
function sse(res, blocks, stop) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'anthropic-ratelimit-tokens-remaining': '777000', 'anthropic-ratelimit-tokens-limit': '800000' });
  const send = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  send('message_start', { message: { id: `msg_${claudeTurn}`, type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 1 } } });
  blocks.forEach((b, index) => {
    if (b.type === 'text') {
      send('content_block_start', { index, content_block: { type: 'text', text: '' } });
      send('content_block_delta', { index, delta: { type: 'text_delta', text: b.text } });
    } else {
      send('content_block_start', { index, content_block: { type: 'tool_use', id: b.id, name: b.name, input: {} } });
      send('content_block_delta', { index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(b.input) } });
    }
    send('content_block_stop', { index });
  });
  send('message_delta', { delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 300 } });
  send('message_stop', {});
  res.end();
}

function startMock() {
  return new Promise((resolve) => {
    mock = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        const url = new URL(req.url, 'http://x');
        const p = url.pathname;
        const json = (code, data) => {
          res.writeHead(code, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        };
        // ── Claude ──
        if (p === '/v1/models') {
          if (req.headers['x-api-key'] !== SECRET_KEY && req.headers.authorization !== `Bearer ${SECRET_KEY}`) return json(401, { type: 'error', error: { type: 'authentication_error', message: 'bad key' } });
          return json(200, { data: [{ type: 'model', id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5', created_at: '2026-01-01T00:00:00Z' }, { type: 'model', id: 'claude-sonnet-5-5', display_name: 'Sonnet', created_at: '2026-01-01T00:00:00Z' }], has_more: false, first_id: 'claude-opus-5-5', last_id: 'claude-sonnet-5-5' });
        }
        if (p === '/v1/messages') {
          const b = JSON.parse(body);
          const lastMsg = b.messages[b.messages.length - 1];
          const afterTools = Array.isArray(lastMsg.content) && lastMsg.content.some((c) => c.type === 'tool_result');
          if (/You are the LEAD/.test(b.system)) {
            if (!afterTools) {
              return sse(res, [{ type: 'tool_use', id: 'lead_1', name: 'delegate', input: { tasks: [
                { title: 'Docs', instructions: 'Create docs/a.md', files: ['docs/a.md'] },
                { title: 'Code', instructions: 'Create src/b.js', files: ['src/b.js'] },
              ] } }], 'tool_use');
            }
            teamLeadSawReports = JSON.stringify(lastMsg.content);
            return sse(res, [{ type: 'tool_use', id: 'lead_2', name: 'finish', input: { summary: 'Team finished docs and code.' } }], 'tool_use');
          }
          if (/team member/.test(b.system)) {
            const file = /docs\/a\.md/.test(b.messages[0].content) ? 'docs/a.md' : 'src/b.js';
            if (!afterTools) return sse(res, [{ type: 'tool_use', id: `w_${file}`, name: 'write_file', input: { path: file, content: `// ${file}\n` } }], 'tool_use');
            return sse(res, [{ type: 'tool_use', id: `wf_${file}`, name: 'finish', input: { summary: `Wrote ${file}` } }], 'tool_use');
          }
          claudeBodies.push(b);
          claudeTurn++;
          if (claudeTurn === 1) {
            return sse(res, [
              { type: 'text', text: 'I will read the app first.' },
              { type: 'tool_use', id: 'tu_1', name: 'read_file', input: { path: 'src/app.js' } },
              { type: 'tool_use', id: 'tu_2', name: 'search', input: { query: 'greet' } },
            ], 'tool_use');
          }
          if (claudeTurn === 2) {
            return sse(res, [
              { type: 'tool_use', id: 'tu_3', name: 'edit_file', input: { path: 'src/app.js', old_string: "return 'Hello ' + name;", new_string: 'return `Hello, ${name}!`;' } },
              { type: 'tool_use', id: 'tu_4', name: 'write_file', input: { path: 'src/new.js', content: 'module.exports = 42;\n' } },
              { type: 'tool_use', id: 'tu_5', name: 'read_file', input: { path: '../etc/passwd' } },
            ], 'tool_use');
          }
          return sse(res, [{ type: 'tool_use', id: 'tu_6', name: 'finish', input: { summary: 'Switched greet to a template literal and added src/new.js.' } }], 'tool_use');
        }
        // ── GitHub ──
        ghCalls.push(`${req.method} ${p}`);
        if ((p.startsWith('/user') || p.startsWith('/repos')) && req.headers.authorization !== `Bearer ${GH_TOKEN}`) return json(401, { message: 'Bad credentials' });
        if (p === '/user') return json(200, { login: 'octo' });
        if (p === '/repos/octo/demo') return json(200, { name: 'demo', owner: { login: 'octo' }, default_branch: 'main', description: 'Demo repo' });
        if (p.startsWith('/repos/octo/demo/commits/')) return json(200, { sha: 'a'.repeat(40), commit: { tree: { sha: 't'.repeat(40) } } });
        if (p.startsWith('/repos/octo/demo/git/trees/') && req.method === 'GET') {
          return json(200, { truncated: false, tree: Object.keys(REPO_FILES).map((f) => ({ path: f, type: 'blob', mode: '100644', size: REPO_FILES[f].length })) });
        }
        if (p.startsWith('/repos/octo/demo/tarball/')) {
          res.writeHead(200, { 'Content-Type': 'application/gzip' });
          return res.end(tarGz(Object.fromEntries(Object.entries(REPO_FILES).map(([k, v]) => [`octo-demo-aaaa/${k}`, v]))));
        }
        if (p.startsWith('/repos/octo/demo/git/ref/heads/')) return json(404, { message: 'Not Found' });
        if (p === '/repos/octo/demo/git/blobs') return json(201, { sha: `b${ghCalls.length}`.padEnd(40, '0') });
        if (p === '/repos/octo/demo/git/trees') return json(201, { sha: 'n'.repeat(40) });
        if (p === '/repos/octo/demo/git/commits') return json(201, { sha: 'c'.repeat(40), html_url: 'https://github.com/octo/demo/commit/ccc' });
        if (p === '/repos/octo/demo/git/refs') return json(201, { ref: JSON.parse(body).ref });
        if (p === '/repos/octo/demo/pulls') return json(201, { html_url: 'https://github.com/octo/demo/pull/7', number: 7 });
        json(404, { message: `mock: no route ${req.method} ${p}` });
      });
    });
    mock.listen(0, '127.0.0.1', () => {
      mockUrl = `http://127.0.0.1:${mock.address().port}`;
      resolve();
    });
  });
}

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early: ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready: ${serverLog}`);
}

async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, password: 'secret123' }) });
  assert.equal(r.status, 200, `register ${name}: ${await r.clone().text()}`);
  return r.headers.get('set-cookie').split(';')[0];
}
const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, data, text };
};

async function hiveSocket(cookie) {
  const headers = cookie ? { Cookie: cookie } : {};
  const open = await fetch(`${base}/socket.io/?EIO=4&transport=polling`, { headers });
  const { sid } = JSON.parse((await open.text()).slice(1));
  const url = `${base}/socket.io/?EIO=4&transport=polling&sid=${sid}`;
  await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'text/plain' }, body: '40/hive,' });
  for (let i = 0; i < 10; i++) {
    const text = await (await fetch(url, { headers })).text();
    for (const pkt of text.split('\x1e')) {
      if (pkt.startsWith('40/hive,')) return { connected: true, reply: pkt };
      if (pkt.startsWith('44/hive,')) return { connected: false, reply: pkt };
    }
  }
  return { connected: false, reply: 'timeout' };
}

let owner;
let member;

test.before(async () => {
  await startMock();
  const port = 23000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1', OWNER_USERNAME: OWNER, HIVE_GITHUB_API: mockUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => (serverLog += d));
  proc.stderr.on('data', (d) => (serverLog += d));
  await waitFor(`${base}/api/health`);
  owner = await signup(OWNER);
  member = await signup(`mem${Date.now().toString(36).slice(-5)}`);
});

test.after(async () => {
  mock?.close();
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});

test('Hive is invisible to anyone who is not staff (HTTP and socket)', async () => {
  for (const p of ['/api/hive/bootstrap', '/API/hive/bootstrap', '/api/hive/bootstrap/', '/api/hive/keys']) {
    assert.equal((await call('GET', p)).status, 404, `anon ${p}`);
    assert.equal((await call('GET', p, member)).status, 404, `member ${p}`);
  }
  assert.equal((await call('POST', '/api/hive/keys', member, { provider: 'anthropic', label: 'x', apiKey: 'sk-ant-xxxxxxxxxxxx' })).status, 404);
  const anon = await hiveSocket('');
  assert.equal(anon.connected, false, anon.reply);
  const mem = await hiveSocket(member);
  assert.equal(mem.connected, false, mem.reply);
  const own = await hiveSocket(owner);
  assert.equal(own.connected, true, own.reply);
  const boot = await call('GET', '/api/hive/bootstrap', owner);
  assert.equal(boot.status, 200, boot.text);
  assert.equal(boot.data.me.username, OWNER);
  assert.ok(boot.data.catalogue.providers.some((p) => p.id === 'anthropic'));
});

let keyId;
let projectId;
let taskId;

test('keys are stored encrypted, verified, and never returned', async () => {
  const r = await call('POST', '/api/hive/keys', owner, { provider: 'anthropic', label: 'Team Claude', apiKey: SECRET_KEY, baseUrl: mockUrl, tokenLimit: 1000000, limitPeriod: 'month' });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.data.check.ok, true, JSON.stringify(r.data.check));
  keyId = r.data.id;
  const boot = await call('GET', '/api/hive/bootstrap', owner);
  assert.ok(!boot.text.includes(SECRET_KEY), 'the API key must never be sent to the browser');
  const k = boot.data.keys.find((x) => x.id === keyId);
  assert.equal(k.last4, 'abcd');
  assert.equal(k.status, 'ok');
  assert.deepEqual(k.models, ['claude-opus-5-5', 'claude-sonnet-5-5']);
  assert.equal(k.defaultModel, 'claude-opus-5-5');
  assert.equal(k.remaining, 1000000);
  const bad = await call('POST', '/api/hive/keys', owner, { provider: 'anthropic', label: 'x', apiKey: 'short' });
  assert.equal(bad.status, 400);
});

test('a GitHub connection and a project can be added', async () => {
  const g = await call('POST', '/api/hive/github', owner, { token: GH_TOKEN });
  assert.equal(g.status, 200, g.text);
  assert.equal(g.data.login, 'octo');
  const p = await call('POST', '/api/hive/projects', owner, { githubId: g.data.id, owner: 'octo', repo: 'demo', instructions: 'Use template literals.' });
  assert.equal(p.status, 200, p.text);
  projectId = p.data.project.id;
  assert.equal(p.data.project.default_branch, 'main');
  const boot = await call('GET', '/api/hive/bootstrap', owner);
  assert.ok(!boot.text.includes(GH_TOKEN), 'GitHub token must never be sent to the browser');
});

test('a Claude agent explores, edits through tools and finishes; changes are reviewable', async () => {
  const r = await call('POST', `/api/hive/projects/${projectId}/tasks`, owner, {
    prompt: 'Make greet use a template literal and add src/new.js',
    mode: 'solo',
    agents: [{ provider: 'anthropic', keyId: 'auto', model: 'claude-opus-5-5', effort: 'high' }],
  });
  assert.equal(r.status, 200, r.text);
  taskId = r.data.task.id;
  let task;
  for (let i = 0; i < 80; i++) {
    task = (await call('GET', `/api/hive/tasks/${taskId}`, owner)).data;
    if (task.task.status !== 'running' && task.task.status !== 'queued') break;
    await new Promise((res) => setTimeout(res, 150));
  }
  assert.equal(task.task.status, 'review', `${JSON.stringify(task.task)}\n${serverLog.slice(-2000)}`);
  const agent = task.agents[0];
  assert.equal(agent.status, 'done', agent.error || '');
  assert.match(agent.result, /template literal/);
  assert.equal(agent.input_tokens, 3600);
  assert.equal(agent.output_tokens, 900);

  // Request shape: adaptive thinking, effort, fallbacks, cached system, tools.
  const first = claudeBodies[0];
  assert.equal(first.model, 'claude-opus-5-5');
  assert.deepEqual(first.thinking, { type: 'adaptive', display: 'summarized' });
  assert.deepEqual(first.output_config, { effort: 'high' });
  assert.equal(first.fallbacks, 'default');
  assert.ok(first.tools.some((t) => t.name === 'edit_file' && t.eager_input_streaming === true));
  assert.match(first.system, /Use template literals/);
  // Parallel tool calls come back as tool_results in ONE user message.
  const second = claudeBodies[1];
  const last = second.messages[second.messages.length - 1];
  assert.equal(last.role, 'user');
  assert.deepEqual(last.content.map((c) => c.tool_use_id), ['tu_1', 'tu_2']);
  assert.match(last.content[0].content, /return 'Hello ' \+ name;/);
  assert.match(last.content[1].content, /src\/app\.js:1:/);
  // Path traversal is refused as a tool error, not executed.
  const third = claudeBodies[2];
  const tr = third.messages[third.messages.length - 1].content.find((c) => c.tool_use_id === 'tu_5');
  assert.equal(tr.is_error, true);
  assert.match(tr.content, /\.\./);

  const ch = await call('GET', `/api/hive/tasks/${taskId}/changes`, owner);
  assert.deepEqual(ch.data.changes.map((c) => [c.path, c.status]), [['src/app.js', 'modified'], ['src/new.js', 'added']]);
  const f = await call('GET', `/api/hive/tasks/${taskId}/file?path=src/app.js`, owner);
  assert.match(f.data.current, /`Hello, \$\{name\}!`/);
  assert.match(f.data.base, /'Hello ' \+ name/);

  // Usage is metered against the key, with the provider's live rate limit.
  const boot = await call('GET', '/api/hive/bootstrap', owner);
  const k = boot.data.keys.find((x) => x.id === keyId);
  assert.equal(k.used, 4500);
  assert.equal(k.remaining, 1000000 - 4500);
  assert.equal(k.rateLimit.tokensRemaining, 777000);
  assert.ok(task.events.some((e) => e.kind === 'tool_call' && e.data.name === 'edit_file'));
});

test('humans can edit and revert files in the working copy', async () => {
  const put = await call('PUT', `/api/hive/tasks/${taskId}/file`, owner, { path: 'README.md', content: '# Demo\n\nEdited by a human.\n' });
  assert.equal(put.status, 200, put.text);
  let ch = await call('GET', `/api/hive/tasks/${taskId}/changes`, owner);
  assert.ok(ch.data.changes.some((c) => c.path === 'README.md' && c.author === `@${OWNER}`));
  await call('DELETE', `/api/hive/tasks/${taskId}/file?path=README.md`, owner);
  ch = await call('GET', `/api/hive/tasks/${taskId}/changes`, owner);
  assert.ok(!ch.data.changes.some((c) => c.path === 'README.md'));
});

test('committing creates a branch commit and opens a pull request', async () => {
  const bad = await call('POST', `/api/hive/tasks/${taskId}/commit`, owner, { message: 'x', branch: 'main' });
  assert.equal(bad.status, 400, 'never commits straight to the default branch');
  const r = await call('POST', `/api/hive/tasks/${taskId}/commit`, owner, { message: 'Greet with a template literal', openPr: true, prTitle: 'Greet with a template literal' });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.data.pr.number, 7);
  assert.equal(r.data.files, 2);
  assert.ok(ghCalls.includes('POST /repos/octo/demo/git/commits'));
  assert.ok(ghCalls.includes('POST /repos/octo/demo/pulls'));
  const t = await call('GET', `/api/hive/tasks/${taskId}`, owner);
  assert.equal(t.data.task.status, 'pr_open');
  assert.equal(t.data.task.pr_url, 'https://github.com/octo/demo/pull/7');
});

test('team mode: the lead delegates parallel sub-tasks to workers that share one working copy', async () => {
  const r = await call('POST', `/api/hive/projects/${projectId}/tasks`, owner, {
    prompt: 'Add docs and code',
    mode: 'team',
    lead: { provider: 'anthropic', model: 'claude-opus-5-5' },
    agents: [{ provider: 'anthropic', model: 'claude-sonnet-5-5', name: 'w1' }, { provider: 'anthropic', model: 'claude-haiku-5-5', name: 'w2' }],
  });
  assert.equal(r.status, 200, r.text);
  let t;
  for (let i = 0; i < 100; i++) {
    t = (await call('GET', `/api/hive/tasks/${r.data.task.id}`, owner)).data;
    if (!['running', 'queued'].includes(t.task.status)) break;
    await new Promise((res) => setTimeout(res, 150));
  }
  assert.equal(t.task.status, 'review', JSON.stringify(t.agents.map((a) => [a.name, a.status, a.error])));
  const lead = t.agents.find((a) => a.role === 'lead');
  const workers = t.agents.filter((a) => a.role === 'worker');
  assert.equal(workers.length, 2);
  assert.ok(workers.every((w) => w.parent_id === lead.id && w.status === 'done'));
  assert.deepEqual(workers.map((w) => w.model).sort(), ['claude-haiku-5-5', 'claude-sonnet-5-5'], 'work spreads across the pool');
  assert.match(teamLeadSawReports, /Wrote docs\/a\.md/);
  assert.match(teamLeadSawReports, /Wrote src\/b\.js/);
  const ch = await call('GET', `/api/hive/tasks/${r.data.task.id}/changes`, owner);
  assert.deepEqual(ch.data.changes.map((c) => c.path), ['docs/a.md', 'src/b.js']);
});

test('only the key owner or an admin can change a key; non-staff cannot even see it', async () => {
  assert.equal((await call('DELETE', `/api/hive/keys/${keyId}`, member)).status, 404);
  const usage = await call('GET', `/api/hive/keys/${keyId}/usage`, owner);
  assert.equal(usage.status, 200);
  assert.equal(usage.data.byUser[0].username, OWNER);
  const used = (await call('GET', '/api/hive/bootstrap', owner)).data.keys.find((x) => x.id === keyId).used;
  const upd = await call('PATCH', `/api/hive/keys/${keyId}`, owner, { tokenLimit: used });
  assert.equal(upd.status, 200);
  // Budget exhausted → new tasks on that provider are refused up front.
  const r = await call('POST', `/api/hive/projects/${projectId}/tasks`, owner, { prompt: 'more', mode: 'solo', agents: [{ provider: 'anthropic', keyId: 'auto' }] });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /budget/);
});
