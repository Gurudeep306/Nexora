/*
  Guru training data (scripts/voice/make-guru-data.js): only open-licence
  teachers, leaked hints dropped, our AI-drafted solutions never sent.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { freePort } = require('./helpers/free-port');
const { allowedTeacher, parseTeacher, toExamples, teacherMessages } = require('../scripts/voice/make-guru-data');

test('only open-licence teachers are allowed', () => {
  for (const m of ['Qwen/Qwen3-32B', 'qwen2.5-72b-instruct', 'deepseek-ai/DeepSeek-R1', 'openai/gpt-oss-120b', 'mistralai/Mistral-Small-3.1-24B-Instruct']) assert.ok(allowedTeacher(m), m);
  for (const m of ['claude-sonnet', 'gpt-4o', 'gemini-2.5-pro', 'meta-llama/Llama-3.3-70B', 'sarvam-m', 'google/gemma-3-27b', '']) assert.ok(!allowedTeacher(m), m);
});

test('the teacher sees the question and key, never our written solution', () => {
  const q = { id: 'q1', type: 'MCQ', subject: 'cn', text: 'Baud rate question', options: [{ l: 'A', t: '109' }, { l: 'C', t: '218' }], answer: 'C', solution: 'SECRET-WRITTEN-SOLUTION' };
  const msgs = teacherMessages(q);
  const text = msgs.map((m) => m.content).join('\n');
  assert.ok(text.includes('Baud rate question') && msgs[1].content.includes('Answer key (do not reveal): "C"'));
  assert.ok(!text.includes('SECRET-WRITTEN-SOLUTION'));
  const t = parseTeacher('sure: {"student":"kaise karu?","hints":["a","b","c"]}');
  const ex = toExamples(q, t);
  assert.equal(ex.length, 3);
  assert.equal(ex[2].messages.at(-1).content, 'c');
  assert.equal(ex[2].messages.filter((m) => m.role === 'assistant').length, 3, 'later hints carry the earlier ones');
  assert.equal(parseTeacher('no json here'), null);
});

test('a run keeps clean hints and drops leaked ones', async () => {
  let n = 0;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      const key = (JSON.parse(body).messages[1].content.match(/Answer key \(do not reveal\): (.+)/) || [])[1];
      n++;
      const hints = n % 2 ? ['Pehle socho: ek character mein kitne bits jaate hain?', 'Start bit aur stop bits bhi gino.', 'Ab baud rate ko bits per character se divide karo.'] : [`The answer is ${String(key).replace(/"/g, '')}.`, 'x', 'y'];
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ student: 'help', hints }) } }] }));
    });
  });
  const port = await freePort();
  await new Promise((r) => server.listen(port, r));
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'guru-')), 'hints.jsonl');
  const stdout = await new Promise((resolve, reject) =>
    execFile(process.execPath, [path.join(__dirname, '../scripts/voice/make-guru-data.js'), '--limit', '4', '--out', out, '--subject', 'cn'], { env: { ...process.env, TEACHER_BASE_URL: `http://127.0.0.1:${port}/v1`, TEACHER_MODEL: 'Qwen/Qwen3-32B' } }, (e, so, se) => (e ? reject(new Error(se || e.message)) : resolve(so))),
  );
  server.close();
  const stats = JSON.parse(stdout.trim().split('\n').pop());
  assert.equal(stats.asked, 4);
  assert.equal(stats.kept, 2);
  assert.equal(stats.leaked, 2);
  const lines = fs.readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines.length, 6);
  assert.ok(lines.every((l) => l.meta.teacher === 'Qwen/Qwen3-32B'));
});

test('a closed model as teacher is refused before anything is sent', async () => {
  const code = await new Promise((resolve) => execFile(process.execPath, [path.join(__dirname, '../scripts/voice/make-guru-data.js'), '--limit', '1'], { env: { ...process.env, TEACHER_BASE_URL: 'http://127.0.0.1:9/v1', TEACHER_MODEL: 'gpt-4o' } }, (e) => resolve(e ? e.code : 0)));
  assert.equal(code, 2);
});
