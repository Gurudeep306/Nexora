// Hive v2: cross-provider handoff when a key runs out, shared project memory,
// custom instruction plugins, manual assignment to chosen agents, live-code
// field extraction, chat with uploaded files, and image generation — against
// local mock Claude / OpenAI-compatible / GitHub servers.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const zlib = require('node:zlib');
const { spawn } = require('node:child_process');
const path = require('node:path');

const OWNER = `hv2owner${Date.now().toString(36).slice(-4)}`;
let proc;
let base;
let mockUrl;
let mock;
let serverLog = '';
const claudeBodies = [];
const compatBodies = [];
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function tarGz(files) {
  const blocks = [];
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const h = Buffer.alloc(512);
    h.write(`root/${name}`, 0, 100);
    h.write('0000644\0', 100);
    h.write(data.length.toString(8).padStart(11, '0') + '\0', 124);
    h.write('0', 156);
    h.write('ustar\0', 257);
    blocks.push(h, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(blocks));
}
const REPO = { 'app.js': "console.log('hi')\n", 'lib/util.js': 'module.exports = 1\n' };

function claudeSSE(res, blocks, stop) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  const send = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  send('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 1 } } });
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

function compatSSE(res, { text, tool }) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
  if (text) send({ choices: [{ delta: { content: text } }] });
  if (tool) send({ choices: [{ delta: { tool_calls: [{ index: 0, id: `c${Date.now()}`, function: { name: tool.name, arguments: JSON.stringify(tool.args) } }] }, finish_reason: 'tool_calls' }] });
  else send({ choices: [{ delta: {}, finish_reason: 'stop' }] });
  send({ choices: [], usage: { prompt_tokens: 500, completion_tokens: 50 } });
  res.end('data: [DONE]\n\n');
}

function startMock() {
  return new Promise((resolve) => {
    mock = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        const p = new URL(req.url, 'http://x').pathname;
        const json = (c, d) => {
          res.writeHead(c, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(d));
        };
        if (p === '/v1/models' && req.headers['anthropic-version']) return json(200, { data: [{ type: 'model', id: 'claude-opus-5-5', display_name: 'x', created_at: '2026-01-01T00:00:00Z' }], has_more: false, first_id: 'a', last_id: 'a' });
        if (p === '/v1/models') return json(200, { data: [{ id: 'deepseek-chat' }, { id: 'gpt-5' }] });
        if (p === '/v1/messages') {
          const b = JSON.parse(body);
          claudeBodies.push(b);
          const assistantTurns = b.messages.filter((m) => m.role === 'assistant').length;
          if (assistantTurns === 0) {
            return claudeSSE(res, [
              { type: 'text', text: 'Saving a convention, then reading app.js.' },
              { type: 'tool_use', id: 'tu1', name: 'remember', input: { title: 'Logging', note: 'Use the logger module, never console.log.' } },
              { type: 'tool_use', id: 'tu2', name: 'read_file', input: { path: 'app.js' } },
            ], 'tool_use');
          }
          return claudeSSE(res, [{ type: 'tool_use', id: 'tu9', name: 'finish', input: { summary: 'claude finished' } }], 'tool_use');
        }
        if (p === '/v1/chat/completions') {
          const b = JSON.parse(body);
          compatBodies.push(b);
          // Chat (no tools, or the chat tool set) answers plainly; agents get tool calls.
          if (!b.tools || b.tools.some((t) => t.function?.name === 'web_search')) return compatSSE(res, { text: `chat reply via ${b.model}` });
          const turns = b.messages.filter((m) => m.role === 'assistant').length;
          // Turn 1 of the takeover is the old conversation (1 assistant turn) + this one.
          if (/Assigned|takeover-test/.test(JSON.stringify(b.messages[1])) && turns === 0) {
            return compatSSE(res, { tool: { name: 'write_file', args: { path: 'lib/new.js', content: 'module.exports = 2\n' } } });
          }
          if (turns <= 1 && !JSON.stringify(b.messages).includes('lib/new.js')) {
            return compatSSE(res, { text: 'Taking over.', tool: { name: 'edit_file', args: { path: 'app.js', old_string: "console.log('hi')", new_string: "logger.info('hi')" } } });
          }
          return compatSSE(res, { tool: { name: 'finish', args: { summary: 'deepseek finished the job' } } });
        }
        if (p === '/v1/images/generations') return json(200, { data: [{ b64_json: PNG_1PX, revised_prompt: 'a tiny pixel' }] });
        // GitHub
        if (p === '/user') return json(200, { login: 'octo' });
        if (p === '/repos/octo/demo') return json(200, { name: 'demo', owner: { login: 'octo' }, default_branch: 'main' });
        if (p.startsWith('/repos/octo/demo/commits/')) return json(200, { sha: 'a'.repeat(40), commit: { tree: { sha: 't'.repeat(40) } } });
        if (p.startsWith('/repos/octo/demo/git/trees/')) return json(200, { tree: Object.keys(REPO).map((f) => ({ path: f, type: 'blob', mode: '100644', size: REPO[f].length })) });
        if (p.startsWith('/repos/octo/demo/tarball/')) {
          res.writeHead(200);
          return res.end(tarGz(REPO));
        }
        json(404, { message: 'no route ' + p });
      });
    });
    mock.listen(0, '127.0.0.1', () => {
      mockUrl = `http://127.0.0.1:${mock.address().port}`;
      resolve();
    });
  });
}

const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, { method, headers: { ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), Cookie: cookie }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, data, text, headers: r.headers };
};
const until = async (fn, ms = 15000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out\n${serverLog.slice(-1500)}`);
    await new Promise((r) => setTimeout(r, 150));
  }
};

let owner;
let projectId;

test.before(async () => {
  await startMock();
  const port = 24000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1', OWNER_USERNAME: OWNER, HIVE_GITHUB_API: mockUrl, HIVE_RETRY_DELAY_MS: '200' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => (serverLog += d));
  proc.stderr.on('data', (d) => (serverLog += d));
  await until(async () => (await fetch(`${base}/api/health`).catch(() => null))?.ok, 40000);
  const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: OWNER, password: 'secret123' }) });
  owner = r.headers.get('set-cookie').split(';')[0];
  const gh = await call('POST', '/api/hive/github', owner, { token: 'ghp_x_123456789' });
  projectId = (await call('POST', '/api/hive/projects', owner, { githubId: gh.data.id, owner: 'octo', repo: 'demo' })).data.project.id;
});
test.after(async () => {
  mock?.close();
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});

test('the catalogue lists many providers with capabilities', async () => {
  const boot = (await call('GET', '/api/hive/bootstrap', owner)).data;
  const ids = boot.catalogue.providers.map((p) => p.id);
  for (const id of ['anthropic', 'openai', 'gemini', 'deepseek', 'xai', 'mistral', 'openrouter', 'groq', 'together', 'qwen', 'custom']) assert.ok(ids.includes(id), id);
  assert.equal(boot.catalogue.providers.find((p) => p.id === 'openai').caps.images, true);
});

test('when a Claude key runs out mid-task, DeepSeek takes over with the full context and shared memory', async () => {
  await call('POST', `/api/hive/projects/${projectId}/memory`, owner, { title: 'Style', body: 'Two-space indentation.', pinned: true });
  await call('POST', '/api/hive/plugins/custom', owner, { scope: projectId, name: 'House rules', instructions: 'HOUSE-RULES-MARKER: keep functions under 40 lines.' });
  const claude = await call('POST', '/api/hive/keys', owner, { provider: 'anthropic', label: 'tiny claude', apiKey: 'sk-ant-aaaaaaaaaaaa', baseUrl: mockUrl, tokenLimit: 1000 });
  assert.equal(claude.data.check.ok, true, claude.text);
  const ds = await call('POST', '/api/hive/keys', owner, { provider: 'deepseek', label: 'deepseek', apiKey: 'sk-dddddddddddd', baseUrl: `${mockUrl}/v1` });
  assert.equal(ds.data.check.ok, true, ds.text);

  const t = await call('POST', `/api/hive/projects/${projectId}/tasks`, owner, { prompt: 'Replace console.log with the logger', mode: 'solo', agents: [{ provider: 'anthropic', keyId: 'auto', model: 'claude-opus-5-5' }] });
  assert.equal(t.status, 200, t.text);
  const d = await until(async () => {
    const r = (await call('GET', `/api/hive/tasks/${t.data.task.id}`, owner)).data;
    return r.task.status !== 'running' && r.task.status !== 'queued' ? r : null;
  });
  const agent = d.agents[0];
  assert.equal(agent.status, 'done', agent.error || '');
  assert.equal(agent.provider, 'deepseek', 'the agent moved to DeepSeek');
  assert.equal(agent.handoffs, 1);
  assert.match(agent.result, /deepseek finished/);
  const ho = d.events.find((e) => e.kind === 'handoff');
  assert.equal(ho.data.from.provider, 'anthropic');
  assert.equal(ho.data.to.provider, 'deepseek');

  // Claude saw memory + custom plugin; DeepSeek received the whole conversation.
  assert.match(claudeBodies[0].system, /Two-space indentation/);
  assert.match(claudeBodies[0].system, /HOUSE-RULES-MARKER/);
  assert.match(claudeBodies[0].system, /Repository map/);
  const dsReq = compatBodies.find((b) => b.tools);
  const toolMsg = dsReq.messages.find((m) => m.role === 'tool' && /console\.log/.test(m.content));
  assert.ok(toolMsg, 'DeepSeek saw the read_file result Claude got');
  assert.match(dsReq.messages[0].content, /HOUSE-RULES-MARKER/);
  // The agent's remember call reached the shared memory.
  const mem = (await call('GET', `/api/hive/projects/${projectId}/memory`, owner)).data.memory;
  assert.ok(mem.some((m) => m.title === 'Logging' && m.author.startsWith('agent:')));
  const ch = (await call('GET', `/api/hive/tasks/${t.data.task.id}/changes`, owner)).data.changes;
  assert.deepEqual(ch.map((c) => c.path), ['app.js']);
});

test('work can be assigned to chosen agents on the same working copy', async () => {
  const t = (await call('GET', `/api/hive/projects/${projectId}/tasks`, owner)).data.tasks[0];
  const r = await call('POST', `/api/hive/tasks/${t.id}/assign`, owner, { title: 'Assigned helper', instructions: 'takeover-test: add lib/new.js', agents: [{ provider: 'deepseek', keyId: 'auto', model: 'deepseek-chat', name: 'helper' }] });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.data.agents[0].name, 'helper');
  await until(async () => (await call('GET', `/api/hive/tasks/${t.id}`, owner)).data.agents.find((a) => a.name === 'helper' && a.status === 'done'));
  const ch = (await call('GET', `/api/hive/tasks/${t.id}/changes`, owner)).data.changes.map((c) => c.path);
  assert.deepEqual(ch, ['app.js', 'lib/new.js'], 'both agents edit one working copy');
  const ov = (await call('GET', '/api/hive/overview', owner)).data;
  assert.ok(ov.tasks.some((x) => x.id === t.id && x.project_name === 'demo'));
});

test('plugins: built-ins per project, custom ones listed', async () => {
  const r = await call('PUT', '/api/hive/plugins/builtin/terse', owner, { scope: projectId, enabled: true });
  assert.equal(r.status, 200, r.text);
  const list = (await call('GET', `/api/hive/plugins?projectId=${projectId}`, owner)).data;
  assert.equal(list.builtins.find((b) => b.id === 'terse').enabled, true);
  assert.equal(list.builtins.find((b) => b.id === 'never_stop').enabled, true);
  assert.ok(list.custom.some((c) => c.name === 'House rules'));
  const global = (await call('GET', '/api/hive/plugins', owner)).data;
  assert.equal(global.builtins.find((b) => b.id === 'terse').enabled, false, 'project override does not leak');
});

test('chat: upload a file, ask any model, and generate an image', async () => {
  const form = new FormData();
  form.append('file', new Blob(['SECRET-NOTES: the deadline is Friday'], { type: 'text/plain' }), 'notes.txt');
  const up = await call('POST', '/api/hive/files', owner, form);
  assert.equal(up.status, 200, up.text);
  const c = (await call('POST', '/api/hive/convos', owner, {})).data.convo;
  const send = await call('POST', `/api/hive/convos/${c.id}/messages`, owner, { text: 'When is the deadline?', refs: [{ fileId: up.data.file.id }, { projectId, path: 'lib/util.js' }], agent: { provider: 'deepseek', model: 'deepseek-chat' } });
  assert.equal(send.status, 200, send.text);
  const msgs = await until(async () => {
    const r = (await call('GET', `/api/hive/convos/${c.id}`, owner)).data;
    return r.messages.length >= 2 ? r : null;
  });
  assert.equal(msgs.convo.title, 'When is the deadline?');
  assert.match(msgs.messages[1].content, /chat reply via deepseek-chat/);
  const chatReq = compatBodies.filter((b) => !b.tools || b.tools.some((t) => t.function?.name === 'web_search')).pop();
  const parts = JSON.stringify(chatReq.messages);
  assert.match(parts, /SECRET-NOTES/, 'uploaded file content reached the model');
  assert.match(parts, /module\.exports = 1/, 'repo file reached the model');

  await call('POST', '/api/hive/keys', owner, { provider: 'openai', label: 'gpt', apiKey: 'sk-oooooooooooo', baseUrl: `${mockUrl}/v1` });
  await call('POST', `/api/hive/convos/${c.id}/messages`, owner, { text: 'a tiny pixel', mode: 'image', agent: { provider: 'openai' } });
  const img = await until(async () => {
    const r = (await call('GET', `/api/hive/convos/${c.id}`, owner)).data;
    return r.messages.length >= 4 ? r.messages[3] : null;
  });
  assert.equal(img.error, null, img.error);
  assert.equal(img.attachments[0].mime, 'image/png');
  const file = await fetch(`${base}/api/hive/files/${img.attachments[0].id}`, { headers: { Cookie: owner } });
  assert.equal(file.headers.get('content-type'), 'image/png');
  assert.match(file.headers.get('content-security-policy'), /sandbox/);
  // Non-image uploads are never served inline.
  const txt = await fetch(`${base}/api/hive/files/${up.data.file.id}`, { headers: { Cookie: owner } });
  assert.equal(txt.headers.get('content-type'), 'application/octet-stream');
});

test('live code: path and content are read out of a half-streamed tool call', () => {
  const { partialField } = require('../src/hive/runner');
  const json = '{"path":"src/a.js","content":"line 1\\nconst s = \\"hi\\";\\nline 3 \\u00e9 and more';
  assert.equal(partialField(json, 'path'), 'src/a.js');
  assert.equal(partialField(json, 'content'), 'line 1\nconst s = "hi";\nline 3 é and more');
  assert.equal(partialField('{"path":"x","content":"abc\\', 'content'), 'abc');
  assert.equal(partialField('{"pa', 'path'), null);
});
