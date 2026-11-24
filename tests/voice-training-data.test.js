/*
  Guru training data (scripts/voice/guru-data.js, make-guru-data.js;
  docs/voice/TRAINING.md): only open-licence teachers; the teacher sees public
  exam content (question, options, official key) and topic names, never our
  written solutions; every reply is checked (Leak Guard on hints, the key in
  reviews, spoken style, the right script); examples use the server's own
  prompt builder; train / val / test split by question.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { freePort } = require('./helpers/free-port');
const D = require('../scripts/voice/guru-data');
const G = require('../src/voice/guru');

const Q = { id: 'cse-x-1', type: 'MCQ', subject: 'cn', text: 'Baud rate question: how many characters a second at 9600 baud with 8N1 framing?', options: [{ l: 'A', t: '1200' }, { l: 'B', t: '960' }, { l: 'C', t: '9600' }, { l: 'D', t: '800' }], answer: 'B', solution: 'SECRET-WRITTEN-SOLUTION' };
const N = { id: 'cse-x-2', type: 'NAT', subject: 'os', text: 'How many page faults with LRU for this reference string and 3 frames?', answer: '42' };
const T = { id: 'os/paging', name: 'Paging', subject: 'Operating Systems', page: '/learn/os/paging' };

test('only open-licence teachers are allowed', () => {
  for (const m of ['Qwen/Qwen3-32B', 'qwen2.5-72b-instruct', 'deepseek-ai/DeepSeek-R1', 'openai/gpt-oss-120b', 'mistralai/Mistral-Small-3.1-24B-Instruct']) assert.ok(D.allowedTeacher(m), m);
  for (const m of ['claude-sonnet', 'gpt-4o', 'gemini-2.5-pro', 'meta-llama/Llama-3.3-70B', 'sarvam-m', 'google/gemma-3-27b', '']) assert.ok(!D.allowedTeacher(m), m);
});

test('the teacher sees the question, options and official key — never our written solution', () => {
  for (const kind of ['hint', 'review']) {
    const text = D.teacherMessages(kind, Q, 'en', null).map((m) => m.content).join('\n');
    assert.ok(text.includes('Baud rate question') && text.includes('(B) 960') && /key[^:]*: B/.test(text), kind);
    assert.ok(!text.includes('SECRET-WRITTEN-SOLUTION'), kind);
  }
  assert.match(D.teacherMessages('hint', Q, 'en', null)[0].content, /NEVER reveal/);
  assert.match(D.teacherMessages('concept', T, 'hi', null)[0].content, /Devanagari/);
});

test('replies are checked: leaks, the key in reviews, spoken style, length and script', () => {
  const ok = (kind, item, lang, r) => D.rejectReason(kind, item, lang, r);
  assert.equal(ok('hint', Q, 'en', 'How many bits does one character really take on the wire, counting start and stop?'), '');
  assert.equal(ok('hint', Q, 'en', 'The answer is B, 960 characters.'), 'leaks the answer');
  assert.equal(ok('hint', Q, 'hg', 'Jawab B hai, simple.'), 'leaks the answer');
  assert.equal(ok('hint', N, 'en', 'It comes to forty two faults in all.'), 'leaks the answer');
  assert.equal(ok('review', Q, 'en', 'Option B is right: each character takes ten bits, so 9600 over 10 is 960.'), '');
  assert.equal(ok('review', Q, 'en', 'Each character takes ten bits on the wire, so you divide by ten.'), "doesn't state the key");
  assert.equal(ok('review', N, 'en', 'LRU replaces the least recently used page; counting carefully gives 42 faults.'), '');
  assert.equal(ok('concept', T, 'en', '```\ncode\n```'), 'not spoken style');
  assert.equal(ok('concept', T, 'en', '- a list item'), 'not spoken style');
  assert.equal(ok('concept', T, 'en', 'word '.repeat(130)), 'too long');
  assert.equal(ok('concept', T, 'hi', 'Paging splits memory into equal frames and pages.'), 'not Hindi');
  assert.equal(ok('concept', T, 'hi', 'पेजिंग में मेमोरी को बराबर फ्रेम में बाँटा जाता है, और हर पेज किसी भी फ्रेम में जा सकता है।'), '');
  assert.equal(ok('concept', T, 'hg', 'पेजिंग में मेमोरी को बराबर फ्रेम में बाँटा जाता है।'), 'not Roman script');
});

test('examples are built with the server’s own prompt builder: the model learns the format it is given on the site', () => {
  const t = { student: 'mujhe hint do', replies: ['Ek character mein kitne bits jaate hain?', 'Start aur stop bits bhi gino.', 'Ab 9600 ko bits per character se divide karo.'] };
  const ex = D.toExamples('hint', Q, 'hg', 'priya', t, 'Qwen/Qwen3-32B');
  assert.equal(ex.length, 3);
  const last = ex[2];
  const expected = G.buildMessages({ pageText: last.messages.find((m) => m.content.startsWith("On the student's screen"))?.content.replace("On the student's screen:\n", ''), verified: null, step: 3, examActive: false, lang: 'en-IN', text: 'abhi bhi samajh nahi aaya', unsolved: true, persona: G.personaFor('priya', D.trainingName('priya', Q.id)), talk: false, history: [{ role: 'user', content: 'mujhe hint do' }, { role: 'assistant', content: t.replies[0] }, { role: 'user', content: 'aur hint do' }, { role: 'assistant', content: t.replies[1] }] });
  assert.deepEqual(last.messages.slice(0, -1), expected);
  assert.equal(last.messages.at(-1).content, t.replies[2]);
  const nm = D.trainingName('priya', Q.id);
  assert.match(last.messages[0].content, nm ? new RegExp(nm) : /the student's teacher/, 'the persona (by the name it was given) is in the system prompt');
  assert.ok(last.messages.some((m) => /NOT solved|NOT answered/.test(m.content)));
  assert.ok(!JSON.stringify(last).includes('SECRET-WRITTEN-SOLUTION'));
  assert.deepEqual(ex.map((e) => e.meta.step), [1, 2, 3]);
  // Talk mode carries the conversation-mode instructions; Hindi uses the Hindi system prompt.
  const talk = D.toExamples('talk', T, 'hi', '', { student: 'बहुत थक गया हूँ', replies: ['थोड़ा पानी पी लो, फिर पेजिंग का एक छोटा सवाल साथ में करते हैं।'] }, 'Qwen/Qwen3-32B')[0];
  assert.ok(talk.messages.filter((m) => m.role === 'system').length >= 3);
});

test('train / val / test is split by question, so test questions are never trained on', () => {
  const ids = Array.from({ length: 4000 }, (_, i) => `q${i}`);
  const by = { train: 0, val: 0, test: 0 };
  for (const id of ids) by[D.splitOf(id)]++;
  assert.ok(by.train > 3400 && by.val > 120 && by.test > 120, JSON.stringify(by));
  const t = { student: 's', replies: ['How many bits per character?', 'Count start and stop bits.', 'Divide the baud rate by that.'] };
  const ex = D.toExamples('hint', Q, 'en', '', t, 'm');
  assert.equal(new Set(ex.map((e) => e.split)).size, 1, 'every turn of one question lands in one split');
  assert.equal(D.splitOf('q1'), D.splitOf('q1'));
});

test('the plan mixes kinds, languages and teachers, the same way every run', () => {
  const qs = Array.from({ length: 300 }, (_, i) => ({ ...Q, id: `q${i}` }));
  const ts = Array.from({ length: 300 }, (_, i) => ({ ...T, id: `t${i}` }));
  const p1 = D.plan({ questions: qs, topics: ts, perKind: { hint: 100, review: 50, concept: 80, talk: 20 }, seed: 3 });
  const p2 = D.plan({ questions: qs, topics: ts, perKind: { hint: 100, review: 50, concept: 80, talk: 20 }, seed: 3 });
  assert.equal(p1.length, 250);
  assert.deepEqual(p1.map((j) => `${j.kind}${j.item.id}${j.lang}${j.teacher}`), p2.map((j) => `${j.kind}${j.item.id}${j.lang}${j.teacher}`));
  const langs = new Set(p1.map((j) => j.lang));
  assert.deepEqual([...langs].sort(), ['en', 'hg', 'hi']);
  assert.ok(new Set(p1.map((j) => j.teacher)).size >= 5);
});

test('a full run against a stand-in teacher: clean replies kept, leaks and wrong scripts dropped, files split', async () => {
  let n = 0;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      const msgs = JSON.parse(body).messages;
      const sys = msgs[0].content;
      const key = ((msgs[1]?.content || '').match(/Answer key \(never reveal\): (.+)/) || [])[1] || 'B';
      const hindi = /Devanagari/.test(sys);
      n++;
      let content;
      if (/three hints|replies": \["hint 1"/.test(sys) || /"hint 1"/.test(sys)) {
        content = n % 3 === 0 ? { student: 'help', replies: [`The answer is ${key.split(/[;,]/)[0]}.`, 'x y z', 'p q r'] } : { student: 'help', replies: hindi ? ['पहले सोचो, एक अक्षर में कितने बिट जाते हैं?', 'स्टार्ट और स्टॉप बिट भी गिनो।', 'अब बॉड रेट को उतने बिट से भाग दो।'] : ['How many bits go into one character?', 'Count the start and stop bits too.', 'Now divide the rate by that number.'] };
      } else {
        content = { student: 'doubt', replies: [hindi ? 'यह विषय छोटे उदाहरण से समझो: एक सरल उदाहरण लेकर हर कदम देखो।' : 'Think of it with a tiny example and follow each step slowly.'] };
      }
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }));
    });
  });
  const port = await freePort();
  await new Promise((r) => server.listen(port, r));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guru-'));
  const stdout = await new Promise((resolve, reject) =>
    execFile(process.execPath, [path.join(__dirname, '../scripts/voice/make-guru-data.js'), '--hint', '12', '--concept', '6', '--talk', '3', '--out-dir', dir, '--subject', 'cn', '--concurrency', '2'], { env: { ...process.env, TEACHER_BASE_URL: `http://127.0.0.1:${port}/v1`, TEACHER_MODEL: 'Qwen/Qwen3-32B' } }, (e, so, se) => (e ? reject(new Error(se || e.message)) : resolve(so))),
  );
  server.close();
  const stats = JSON.parse(stdout.trim().split('\n').pop());
  assert.ok(stats.asked > 0 && stats.kept > 0, JSON.stringify(stats));
  assert.ok((stats.rejected['leaks the answer'] || 0) > 0, 'leaked hints were dropped');
  const all = ['train', 'val', 'test'].flatMap((s) => (fs.existsSync(path.join(dir, `${s}.jsonl`)) ? fs.readFileSync(path.join(dir, `${s}.jsonl`), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []));
  assert.equal(all.length, stats.examples.train + stats.examples.val + stats.examples.test);
  for (const ex of all) {
    assert.equal(ex.meta.teacherModel, 'Qwen/Qwen3-32B');
    assert.equal(ex.messages.at(-1).role, 'assistant');
    assert.equal(D.rejectReason(ex.meta.kind, ex.meta.kind === 'hint' ? { answer: 'x', options: [] } : {}, ex.meta.lang, ex.messages.at(-1).content) === 'not spoken style', false);
  }
  assert.ok(fs.existsSync(path.join(dir, 'stats.json')));
});

test('a closed model as teacher is refused before anything is sent', async () => {
  const code = await new Promise((resolve) => execFile(process.execPath, [path.join(__dirname, '../scripts/voice/make-guru-data.js'), '--hint', '1'], { env: { ...process.env, TEACHER_BASE_URL: 'http://127.0.0.1:9/v1', TEACHER_MODEL: 'gpt-4o' } }, (e) => resolve(e ? e.code : 0)));
  assert.equal(code, 2);
});

test('the quality gates: leaks over 2% of hints, reviews without the key, or unclean replies fail a model', () => {
  const { score } = require('../scripts/voice/eval-guru');
  const hint = (reply) => ({ meta: { kind: 'hint', lang: 'en', key: 'B', options: Q.options }, reply });
  const good = Array.from({ length: 98 }, () => hint('How many bits does one character take on the wire?'));
  assert.equal(score([...good, hint('The answer is B.'), hint('Think about start and stop bits too.')]).pass, true, '1 leak in 100 passes');
  assert.equal(score([...good.slice(0, 90), ...Array.from({ length: 5 }, () => hint('The answer is B.'))]).pass, false, '5 leaks in 95 fail');
  const review = (reply) => ({ meta: { kind: 'review', lang: 'en', key: 'B', options: Q.options }, reply });
  assert.equal(score([review('Each character is ten bits, so divide by ten.')]).pass, false, 'a review must name the key');
  assert.equal(score([review('Option B is right: ten bits per character gives 960.')]).pass, true);
});

test('batch mode for a GPU that cannot be reached: export the questions, ingest the answers with the same checks, score from a file', () => {
  const { execFileSync } = require('node:child_process');
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guru-batch-'));
  const script = path.join(__dirname, '..', 'scripts', 'voice', 'make-guru-data.js');
  const jobsFile = path.join(dir, 'jobs.jsonl');
  execFileSync(process.execPath, [script, '--export-jobs', jobsFile, '--hint', '2', '--concept', '1', '--seeds', '1,2']);
  const jobs = fs.readFileSync(jobsFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(jobs.length, 5, 'seed 2 asks the hints again');
  assert.ok(jobs.every((j, i) => j.i === i && Array.isArray(j.messages) && j.messages.length === 2));
  const hint = jobs.find((j) => j.kind === 'hint');
  const good = JSON.stringify({ student: 'how do I start?', replies: ['Okay, look at what the question really asks first.', 'Right, think about the rule that connects these quantities.', 'Write down the first quantity you can compute from the data given.'] });
  const leak = JSON.stringify({ student: 'help', replies: [`The answer is ${String(hint.item.answer)}.`, 'b c d e f', 'c d e f g'] });
  const answers = path.join(dir, 'answers.jsonl');
  fs.writeFileSync(answers, [{ i: hint.i, content: good }, { i: jobs.find((j) => j.kind === 'hint' && j.i !== hint.i).i, content: leak }, { i: 99, content: 'ignored' }].map((x) => JSON.stringify(x)).join('\n'));
  const out = path.join(dir, 'data');
  const stats = JSON.parse(execFileSync(process.execPath, [script, '--ingest', answers, '--jobs', jobsFile, '--out-dir', out], { env: { ...process.env, TEACHER_MODEL: 'Qwen/Qwen3-14B-AWQ' } }).toString());
  assert.equal(stats.kept, 1, 'the good conversation is kept');
  assert.equal(stats.asked, 2, 'unknown job numbers are skipped');
  const all = ['train', 'val', 'test'].flatMap((s) => fs.readFileSync(path.join(out, `${s}.jsonl`), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)));
  assert.equal(all.length, 3, 'three hints → three examples');
  // Score from a file of answers.
  const test = path.join(dir, 'test.jsonl');
  fs.writeFileSync(test, all.map((e) => JSON.stringify(e)).join('\n'));
  const ans = path.join(dir, 'test_answers.jsonl');
  fs.writeFileSync(ans, all.map((e) => JSON.stringify({ id: e.id, reply: e.messages.at(-1).content })).join('\n'));
  const eval_ = path.join(__dirname, '..', 'scripts', 'voice', 'eval-guru.js');
  const s = JSON.parse(execFileSync(process.execPath, [eval_, '--test', test, '--answers', ans]).toString());
  assert.equal(s.pass, true);
  assert.equal(s.missing, 0);
  // Refuses a closed teacher on ingest.
  assert.throws(() => execFileSync(process.execPath, [script, '--ingest', answers, '--jobs', jobsFile, '--out-dir', out], { env: { ...process.env, TEACHER_MODEL: 'gpt-4o' }, stdio: 'pipe' }));
});

test('teacher answers that echo the instructions or stop half-way are thrown away (seen from real teacher models)', () => {
  const ok = JSON.stringify({ student: 'sir kahan se start karun?', replies: ['a b c', 'b c d', 'c d e'] });
  assert.ok(D.parseTeacher(ok, 3));
  for (const student of ['how the student asks for help on this question', "Today's topic: Data per service", 'Question (MCQ, dl):\nConsider a 4-bit Johnson counter', 'x'.repeat(301)]) {
    assert.equal(D.parseTeacher(JSON.stringify({ student, replies: ['a b c', 'b c d', 'c d e'] }), 3), null, student.slice(0, 40));
  }
  const item = { answer: 'B', options: [] };
  for (const reply of ['Start at s and read a, then s→? and so on.', 'Read the first symbol … then decide.', 'Then apply [step two] to it.']) {
    assert.equal(D.rejectReason('concept', item, 'en', reply), 'unfinished', reply);
  }
  assert.equal(D.rejectReason('concept', item, 'en', 'A stack keeps the last item on top, so pop gives it back first.'), '');
  assert.match(D.teacherMessages('hint', { text: 'q', options: [], answer: 'A', type: 'MCQ' }, 'hg', null)[0].content, /never these instructions/);
});

test('maths written as code is not spoken style: Guru says it in words', () => {
  const item = { answer: '0.25', options: [] };
  for (const reply of ['So P(\\bar T) is 0.6 here.', 'Multiply 0.3*0.4 first.', 'The cost grows like $n^2$.']) assert.equal(D.rejectReason('concept', item, 'en', reply), 'not spoken style', reply);
  assert.equal(D.rejectReason('concept', item, 'en', 'Multiply zero point three by zero point four first.'), '');
});
