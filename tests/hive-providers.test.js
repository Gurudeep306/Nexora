// Hive provider adapters (OpenAI-compatible and Gemini streaming with tool
// calls), the tar reader and the team-mode delegation path, against local mocks.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

function server(handler) {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => handler(req, res, body ? JSON.parse(body) : null));
    });
    s.listen(0, '127.0.0.1', () => resolve({ s, url: `http://127.0.0.1:${s.address().port}` }));
  });
}

const tools = [{ name: 'read_file', description: 'Read', schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } }];

test('OpenAI-compatible: streamed text + tool call arguments are reassembled', async () => {
  let seen;
  const { s, url } = await server((req, res, body) => {
    seen = { body, auth: req.headers.authorization };
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'x-ratelimit-remaining-tokens': '9000', 'x-ratelimit-limit-tokens': '10000', 'x-ratelimit-reset-tokens': '6m0s' });
    const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
    send({ choices: [{ delta: { content: 'Look' } }] });
    send({ choices: [{ delta: { content: 'ing.' } }] });
    send({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_a', function: { name: 'read_file', arguments: '{"pa' } }] } }] });
    send({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'th":"src/a.js"}' } }] }, finish_reason: 'tool_calls' }] });
    send({ choices: [], usage: { prompt_tokens: 50, completion_tokens: 7 } });
    res.end('data: [DONE]\n\n');
  });
  const openai = require('../src/hive/providers/openai');
  let streamed = '';
  const r = await openai.turn({
    secret: 'sk-test',
    baseUrl: url,
    model: 'gpt-5',
    official: true,
    effort: 'high',
    system: 'sys',
    messages: [{ role: 'user', text: 'hi' }, { role: 'assistant', text: '', toolCalls: [{ id: 'c0', name: 'read_file', input: { path: 'x' } }] }, { role: 'tool', results: [{ id: 'c0', name: 'read_file', content: 'ok' }] }],
    tools,
    onText: (d) => (streamed += d),
  });
  s.close();
  assert.equal(seen.auth, 'Bearer sk-test');
  assert.equal(seen.body.reasoning_effort, 'high');
  assert.equal(seen.body.messages[0].role, 'system');
  assert.equal(seen.body.messages[2].tool_calls[0].function.name, 'read_file');
  assert.equal(seen.body.messages[3].role, 'tool');
  assert.equal(streamed, 'Looking.');
  assert.equal(r.stop, 'tool');
  assert.deepEqual(r.toolCalls[0].input, { path: 'src/a.js' });
  assert.deepEqual(r.usage, { input: 50, output: 7, cacheRead: 0 });
  assert.equal(r.rateLimit.tokensRemaining, 9000);
});

test('Gemini: function calls parsed, model parts replayed, schemas cleaned', async () => {
  let seen;
  const { s, url } = await server((req, res, body) => {
    seen = { body, key: req.headers['x-goog-api-key'], url: req.url };
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write(`data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: 'thinking', thought: true }, { text: 'Reading' }] } }] })}\n\n`);
    res.write(`data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'read_file', args: { path: 'b.py' } }, thoughtSignature: 'sig123' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 5, thoughtsTokenCount: 3 } })}\n\n`);
    res.end();
  });
  // Point the adapter at the mock by swapping the module's base URL.
  const mod = require('../src/hive/providers/gemini');
  const realFetch = global.fetch;
  global.fetch = (u, o) => realFetch(String(u).replace('https://generativelanguage.googleapis.com/v1beta', url), o);
  let thoughts = '';
  try {
    const r = await mod.turn({ secret: 'AIzaTEST', model: 'gemini-2.5-pro', system: 'sys', messages: [{ role: 'user', text: 'go' }], tools, onThinking: (d) => (thoughts += d) });
    assert.equal(seen.key, 'AIzaTEST');
    assert.match(seen.url, /gemini-2\.5-pro:streamGenerateContent\?alt=sse/);
    assert.equal(seen.body.tools[0].functionDeclarations[0].parameters.additionalProperties, undefined);
    assert.equal(thoughts, 'thinking');
    assert.equal(r.text, 'Reading');
    assert.equal(r.stop, 'tool');
    assert.deepEqual(r.toolCalls[0].input, { path: 'b.py' });
    assert.equal(r.usage.output, 8);
    // Replay keeps the thought signature on the functionCall part.
    const r2 = await mod.turn({
      secret: 'AIzaTEST',
      model: 'gemini-2.5-pro',
      system: 'sys',
      messages: [{ role: 'user', text: 'go' }, { role: 'assistant', ...r }, { role: 'tool', results: [{ id: r.toolCalls[0].id, name: 'read_file', content: 'print(1)' }] }],
      tools,
    });
    assert.ok(r2);
    const model = seen.body.contents[1];
    assert.equal(model.role, 'model');
    assert.ok(model.parts.some((p) => p.functionCall && p.thoughtSignature === 'sig123'));
    assert.deepEqual(seen.body.contents[2].parts[0].functionResponse, { name: 'read_file', response: { result: 'print(1)' } });
  } finally {
    global.fetch = realFetch;
    s.close();
  }
});

test('tar reader handles long (pax) paths and skips unwanted files', async () => {
  const zlib = require('node:zlib');
  const { readTarGz } = require('../src/hive/tar');
  const header = (name, size, type = '0') => {
    const h = Buffer.alloc(512);
    h.write(name.slice(0, 99), 0);
    h.write('0000644\0', 100);
    h.write(size.toString(8).padStart(11, '0') + '\0', 124);
    h.write(type, 156);
    h.write('ustar\0', 257);
    return h;
  };
  const pad = (n) => Buffer.alloc((512 - (n % 512)) % 512);
  const longPath = `root/${'deep/'.repeat(30)}file.txt`;
  const paxRec = (k, v) => {
    const body = ` ${k}=${v}\n`;
    let len = body.length + 1;
    while (String(len).length + body.length !== len) len = String(len).length + body.length;
    return `${len}${body}`;
  };
  const pax = Buffer.from(paxRec('path', longPath));
  const parts = [header('root/PaxHeader', pax.length, 'x'), pax, pad(pax.length), header('root/short', 5), Buffer.from('hello'), pad(5)];
  parts.push(header('root/skip.bin', 3), Buffer.from('abc'), pad(3), header('root/b.txt', 2), Buffer.from('hi'), pad(2), Buffer.alloc(1024));
  const gz = zlib.gzipSync(Buffer.concat(parts));
  const got = [];
  const { Readable } = require('node:stream');
  await readTarGz(Readable.from([gz.subarray(0, 100), gz.subarray(100)]), {
    want: (p) => !p.endsWith('.bin'),
    onEntry: (e) => got.push([e.path, e.data ? e.data.toString() : null]),
  });
  assert.deepEqual(got, [[longPath.slice(5), 'hello'], ['skip.bin', null], ['b.txt', 'hi']]);
});

test('workspace edits are serialized per file, so concurrent agents never lose writes', async () => {
  process.env.NODE_ENV = 'test';
  const { initHiveDb } = require('../src/hive/db');
  const { initDb } = require('../src/db');
  await initDb();
  await initHiveDb();
  const { workspace } = require('../src/hive/workspace');
  const snap = { entries: new Map([['a.txt', { mode: '100644', size: 3 }]]), files: new Map([['a.txt', Buffer.from('x=0\ny=0\nz=0\n')]]), status: 'ready', rawCache: new Map() };
  const ws = workspace({ task: { id: `t_${Date.now()}` }, snap });
  await Promise.all([
    ws.edit('a.txt', 'x=0', 'x=1', { author: 'agent:A' }),
    ws.edit('a.txt', 'y=0', 'y=2', { author: 'agent:B' }),
    ws.edit('a.txt', 'z=0', 'z=3', { author: 'agent:C' }),
  ]);
  assert.equal(await ws.read('a.txt'), 'x=1\ny=2\nz=3\n');
  await assert.rejects(ws.edit('a.txt', 'nope', 'x'), /not found/);
  await assert.rejects(ws.read('../secret'), /\.\./);
  await assert.rejects(ws.write('.git/config', 'x'), /off limits/);
  const ch = await ws.changes();
  assert.deepEqual([ch[0].path, ch[0].status, ch[0].additions, ch[0].deletions], ['a.txt', 'modified', 3, 3]);
  // Writing the base text back drops the change.
  await ws.write('a.txt', 'x=0\ny=0\nz=0\n', 'agent:A');
  assert.equal((await ws.changes()).length, 0);
});
