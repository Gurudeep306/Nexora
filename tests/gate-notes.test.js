/*
  GATE Notes: the content pipeline (scripts/build-gate-notes.js) and the
  reader API (src/routes/gate-notes.js).

  - The committed content builds cleanly and src/gate/notes is up to date
    (the same --check CI relies on).
  - The validator reports authoring mistakes with file:line.
  - The API serves subjects / trees / lessons / search from the compiled
    JSON, hides the staff-only demo, never exposes `sources`, and keeps
    per-user progress private to its owner.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('../scripts/build-gate-notes');

const ROOT = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-notes-'));

test('the committed notes build and src/gate/notes is up to date (--check)', () => {
  const r = spawnSync(process.execPath, ['scripts/build-gate-notes.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
});

test('compiled notes never contain lesson sources', () => {
  const dir = path.join(ROOT, 'src', 'gate', 'notes');
  for (const f of fs.readdirSync(dir)) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!/"sources"/.test(text), `${f} contains sources`);
  }
});

/* ── Validator: a scratch content tree with one mistake at a time ── */

const LESSON = `---
id: alpha
subject: tst
chapter: basics
title: Alpha
order: 1
prerequisites: []
pyq_topics: [dl/number]
est_minutes: 5
difficulty: basic
status: published
needs_review: false
sources: ["internal"]
updated: "2026-10-16"
---

## Start

:::definition{#def-a term="A"}
Text with $x^2$.
:::

::::check
Question?
:::answer
Yes.
:::
::::
`;

function scratch(lesson = LESSON, extra = {}) {
  const dir = fs.mkdtempSync(path.join(tmp, 'content-'));
  const subj = path.join(dir, 'tst');
  fs.mkdirSync(path.join(subj, '01-basics'), { recursive: true });
  fs.writeFileSync(
    path.join(subj, '_meta.json'),
    JSON.stringify({ title: 'Test', order: 1, icon: 'binary', color: 'info', description: 'Scratch subject.' }),
  );
  fs.writeFileSync(path.join(subj, '01-basics', '01-alpha.md'), lesson);
  for (const [rel, text] of Object.entries(extra)) {
    fs.mkdirSync(path.dirname(path.join(subj, rel)), { recursive: true });
    fs.writeFileSync(path.join(subj, rel), text);
  }
  return dir;
}

async function errorsFor(lesson, extra, opts = {}) {
  const r = await build({ content: scratch(lesson, extra), ...opts });
  return r.errors.join('\n');
}

test('a valid scratch lesson builds with no errors', async () => {
  const r = await build({ content: scratch() });
  assert.deepEqual(r.errors, []);
  const doc = JSON.parse(r.outputs.get('tst.json'));
  const lesson = doc.lessons.alpha;
  assert.deepEqual(lesson.blocks.map((b) => [b.id, b.name, b.depth]), [
    ['def-a', 'definition', 'standard'],
    ['answer-1', 'answer', 'standard'],
    ['check-1', 'check', 'standard'],
  ]);
  assert.equal(lesson.outline[0].id, 'start');
  assert.ok(!('sources' in lesson));
});

test('the validator reports mistakes with file:line', async () => {
  const at = (n) => new RegExp(`01-alpha\\.md:${n}: `);
  const swap = (from, to) => LESSON.replace(from, to);

  let e = await errorsFor(swap('difficulty: basic', 'difficulty: easy'));
  assert.match(e, at(10));
  assert.match(e, /difficulty must be basic \| core \| advanced/);

  e = await errorsFor(swap(':::definition{#def-a term="A"}', ':::defn{#def-a}'));
  assert.match(e, at(19));
  assert.match(e, /unknown block :::defn/);

  e = await errorsFor(swap('term="A"', 'term="A" colour="red"'));
  assert.match(e, /unknown attribute "colour"/);

  e = await errorsFor(swap(':::definition{#def-a term="A"}', ':::definition{#def-a depth=huge}'));
  assert.match(e, /depth must be quick \| standard \| deep/);

  e = await errorsFor(swap('Text with $x^2$.\n:::', 'Text with $x^2$.'));
  assert.match(e, /:::definition is never closed/);

  e = await errorsFor(swap('::::check', ':::check').replace(/::::\n$/, ':::\n'));
  assert.match(e, /nested inside :::check .* same length/);

  e = await errorsFor(swap('Text with $x^2$.', 'Bad $\\frac{1}{$ maths.'));
  assert.match(e, at(20));
  assert.match(e, /KaTeX cannot parse/);

  e = await errorsFor(`${LESSON}\n:::pyq{id="no-such-question"}\n:::\n`);
  assert.match(e, /:::pyq id "no-such-question" is not in src\/gate\/questions.json/);

  e = await errorsFor(`${LESSON}\n:::practice{id="nx-tst-01-01-q09"}\n:::\n`);
  assert.match(e, /:::practice id "nx-tst-01-01-q09" is not in any practice.json/);

  e = await errorsFor(`${LESSON}\n:::viz{spec="missing"}\n:::\n`);
  assert.match(e, /no file content\/gate-notes\/tst\/viz\/missing.json/);

  e = await errorsFor(`${LESSON}\n:::viz{spec="bad"}\n:::\n`, {
    'viz/bad.json': JSON.stringify({ version: 1, title: 'x', width: 100, height: 100, elements: [{ id: 'a', type: 'blob' }], steps: [] }),
  });
  assert.match(e, /viz\/bad.json:1: viz: elements\[0\].type: must be one of/);

  e = await errorsFor(`${LESSON}\nSee [the other one](lesson:beta).\n`);
  assert.match(e, /link "lesson:beta" points at no lesson/);

  e = await errorsFor(`${LESSON}\nSee [there](#nowhere).\n`);
  assert.match(e, /no heading or block "nowhere"/);

  e = await errorsFor(swap('prerequisites: []', 'prerequisites: [beta]'));
  assert.match(e, at(7));
  assert.match(e, /prerequisite "beta" is not a lesson/);

  e = await errorsFor(swap('pyq_topics: [dl/number]', 'pyq_topics: [dl/nonsense]'));
  assert.match(e, /pyq topic "dl\/nonsense" is not a subject\/topic/);

  e = await errorsFor(`${LESSON}\n:::step{why="x"}\nOrphan.\n:::\n`);
  assert.match(e, /:::step belongs inside an :::example block/);

  e = await errorsFor(`${LESSON}\n::::example\nProblem.\n:::step{why="because"}\nDo it.\n:::\n::::\n`);
  assert.match(e, /:::example with steps needs a final :::answer/);

  assert.equal(await errorsFor(`${LESSON}\n::::example{level="easy"}\nProblem.\n:::step{why="because"}\nDo it.\n:::\n:::answer\n42\n:::\n::::\n`), '');

  e = await errorsFor(`${LESSON}\n<div>raw</div>\n`);
  assert.match(e, /raw HTML is not allowed/);

  e = await errorsFor(LESSON, {
    '01-basics/practice.json': JSON.stringify([{ id: 'nx-tst-01-01-q01', type: 'MCQ', text: 'Q', options: [{ l: 'A', t: '1' }, { l: 'B', t: '2' }], answer: 'C', solution: ['s'], concept: 'c', common_wrong: [], blocks: ['nope'], source: 'nexora' }]),
  });
  assert.match(e, /answer must be one option letter/);
  assert.match(e, /block "nope" is not in alpha/);
});

test('drafts and needs_review fail a production build but pass with --drafts', async () => {
  const draft = LESSON.replace('status: published', 'status: draft').replace('needs_review: false', 'needs_review: true');
  const e = await errorsFor(draft);
  assert.match(e, /01-alpha\.md:11: status is "draft" — only published lessons ship/);
  assert.match(e, /01-alpha\.md:12: needs_review is true/);
  assert.equal(await errorsFor(draft, {}, { drafts: true }), '');
});

test('PYQ coverage: published subjects must map every PYQ in scope to real blocks; drafts only warn', async () => {
  // A two-question bank for subject "tst".
  const bankFile = path.join(fs.mkdtempSync(path.join(tmp, 'bank-')), 'questions.json');
  const q = (id, topic) => ({ id, paper: 'cse-2020', exam: 'CSE', year: 2020, subject: 'tst', topic, type: 'MCQ', marks: 1, text: 'Q', options: [], answer: 'A' });
  fs.writeFileSync(bankFile, JSON.stringify({ version: 1, papers: [], subjects: {}, questions: [q('tst-1', 'number'), q('tst-2', 'number')] }));
  const lesson = LESSON.replace('pyq_topics: [dl/number]', 'pyq_topics: [tst/number]') + '\n:::pyq{id="tst-1" tests="def-a"}\n:::\n';
  const meta = (status) => JSON.stringify({ title: 'Test', order: 1, icon: 'binary', color: 'info', description: 'Scratch subject.', status });
  const run = async (status, extra = {}) => {
    const content = scratch(lesson, extra);
    fs.writeFileSync(path.join(content, 'tst', '_meta.json'), meta(status));
    return build({ content, questions: bankFile });
  };

  // tst-2 is not mapped: an error when published, a warning in draft.
  let r = await run('published');
  assert.match(r.errors.join('\n'), /1 of 2 PYQs in scope \(tst\) are not mapped to any lesson block/);
  r = await run('draft');
  assert.deepEqual(r.errors, []);
  assert.match(r.warnings.join('\n'), /1 of 2 PYQs in scope/);

  // Mapping tst-2 through pyq-map.json makes the published build pass and fills the coverage map.
  const map = (tests) => ({ '01-basics/pyq-map.json': JSON.stringify([{ id: 'tst-2', lesson: 'alpha', tests }]) });
  r = await run('published', map(['start']));
  assert.deepEqual(r.errors, []);
  const cov = JSON.parse(r.outputs.get('_coverage.json')).subjects.tst;
  assert.equal(cov.total, 2);
  assert.equal(cov.covered, 2);
  assert.deepEqual(cov.byPyq['tst-1'][0].blocks.map((b) => b.id), ['def-a']);
  assert.deepEqual(JSON.parse(r.outputs.get('tst.json')).lessons.alpha.pyqLinks.map((x) => [x.id, x.embedded]), [['tst-1', true], ['tst-2', false]]);
  assert.match([...r.reports.values()][0], /Covered: \*\*2 \/ 2\*\* PYQs/);

  // A mapping to a block that does not exist fails a published subject.
  r = await run('published', map(['no-such-block']));
  assert.match(r.errors.join('\n'), /pyq-map\.json:1: PYQ tst-2: block "no-such-block" is not in alpha/);
});

/* ── API ── */

let proc;
let base;
let serverLog = '';
const OWNER = `nown${Date.now().toString(36)}`;

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready: ${serverLog}`);
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
  const r = await fetch(`${base}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, password: 'secret123' }),
  });
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}

test('API', async (t) => {
  const port = 28000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      DB_PATH: path.join(tmp, 'test.db'),
      TURSO_DATABASE_URL: '',
      TURSO_AUTH_TOKEN: '',
      OWNER_USERNAME: OWNER,
      DISABLE_PUPPETEER: '1',
      DISABLE_SCRAPER: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => (serverLog += d));
  proc.stderr.on('data', (d) => (serverLog += d));
  t.after(async () => {
    const done = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await done;
  });
  await waitFor(`${base}/api/health`);
  const owner = await signup(OWNER);
  const ana = await signup(`nana${Date.now().toString(36)}`);
  const ben = await signup(`nben${Date.now().toString(36)}`);

  await t.test('the demo subject is staff-only', async () => {
    const pub = await call('GET', '/api/gate/notes', ana);
    assert.equal(pub.status, 200);
    assert.ok(!pub.body.subjects.some((s) => s.id === 'demo'));
    assert.equal((await call('GET', '/api/gate/notes/demo', ana)).status, 404);
    assert.equal((await call('GET', '/api/gate/notes/demo/place-value', ana)).status, 404);
    assert.deepEqual((await call('GET', '/api/gate/notes/search?q=radix', ana)).body.results, []);

    const staff = await call('GET', '/api/gate/notes', owner);
    const demo = staff.body.subjects.find((s) => s.id === 'demo');
    assert.ok(demo && demo.hidden && demo.lessonCount === 1);
  });

  await t.test('tree, lesson and search for staff', async () => {
    const tree = await call('GET', '/api/gate/notes/demo', owner);
    assert.equal(tree.status, 200);
    assert.equal(tree.body.chapters[0].lessons[0].id, 'place-value');

    const r = await call('GET', '/api/gate/notes/demo/place-value', owner);
    assert.equal(r.status, 200);
    assert.equal(r.body.lesson.title, 'Place value and changing bases');
    assert.ok(Array.isArray(r.body.lesson.body) && r.body.lesson.body.length > 5);
    assert.ok(r.body.practice['nx-demo-01-01-q01']);
    assert.ok(r.body.viz['binary-place-values']);
    assert.ok(!JSON.stringify(r.body).includes('"sources"'));
    assert.equal((await call('GET', '/api/gate/notes/demo/nope', owner)).status, 404);

    const s = await call('GET', '/api/gate/notes/search?q=radix', owner);
    assert.equal(s.body.results[0].lesson, 'place-value');

    // The coverage map: which blocks teach a PYQ (staff-only demo here).
    const teach = await call('GET', '/api/gate/questions/cse-2023-cs-22/teaching', owner);
    assert.deepEqual(teach.body.teaching[0].blocks.map((b) => b.id), ['place-value-def', 'expansion']);
    assert.deepEqual((await call('GET', '/api/gate/questions/cse-2023-cs-22/teaching', ana)).body.teaching, []);
    assert.ok(tree.body.subject.coverage.total >= tree.body.subject.coverage.covered);
  });

  await t.test('progress needs auth, validates input and stays per user', async () => {
    assert.equal((await call('GET', '/api/gate/me/notes-progress')).status, 401);
    assert.equal((await call('PUT', '/api/gate/me/notes-progress/demo/place-value', null, { completed: true })).status, 401);
    // Members cannot write to the hidden demo.
    assert.equal((await call('PUT', '/api/gate/me/notes-progress/demo/place-value', ana, { completed: true })).status, 404);
    assert.equal((await call('PUT', '/api/gate/me/notes-progress/demo/place-value', owner, { scrollPct: 140 })).status, 400);
    assert.equal((await call('PUT', '/api/gate/me/notes-progress/demo/place-value', owner, { completed: 'yes' })).status, 400);
    assert.equal((await call('PUT', '/api/gate/me/notes-progress/demo/place-value', owner, {})).status, 400);

    assert.equal((await call('PUT', '/api/gate/me/notes-progress/demo/place-value', owner, { scrollPct: 42.4 })).status, 200);
    assert.equal((await call('PUT', '/api/gate/me/notes-progress/demo/place-value', owner, { completed: true, bookmarked: true })).status, 200);
    const mine = await call('GET', '/api/gate/me/notes-progress?subject=demo', owner);
    assert.deepEqual(
      { ...mine.body.progress['demo/place-value'], updatedAt: 0 },
      { completed: true, scrollPct: 42, bookmarked: true, updatedAt: 0 },
    );
    assert.deepEqual((await call('GET', '/api/gate/me/notes-progress', ben)).body.progress, {});
  });
});

/* ── Colour: every ink the reader uses meets WCAG AA in every palette ── */

test('notes inks (subject accents, asides, traps, maths, sticky notes) are AA on the page in every palette', async () => {
  const { pathToFileURL } = require('node:url');
  const theme = (f) => import(pathToFileURL(path.join(ROOT, 'client', 'src', 'theme', f)).href);
  const { PALETTES } = await theme('palettes.ts');
  const { contrast, mixOklab } = await theme('color.ts');
  // Mirrors client/src/gate/notes/notes.css and SUBJECT_COLOR_VAR in api.ts.
  const token = (t, k) => (k === 'accent' ? t.accent : k.startsWith('syntax-') ? t.syntax[k.slice(7)] : t[k]);
  const SUBJECT = ['accent', 'info', 'success', 'warning', 'danger', 'syntax-keyword', 'syntax-function', 'syntax-type', 'syntax-string', 'syntax-number'];
  const failures = [];
  const check = (what, a, b) => {
    const r = contrast(a, b);
    if (r < 4.5) failures.push(`${what}: ${r.toFixed(2)}`);
  };
  for (const p of PALETTES) {
    for (const mode of ['light', 'dark']) {
      const t = p[mode];
      if (!t) continue;
      const fg = t.fg[0];
      for (const [name, bg] of Object.entries({ app: t.bg[0], paper: t.bg[1] })) {
        for (const k of SUBJECT) check(`${p.id}/${mode} subject ink ${k} on ${name}`, mixOklab(token(t, k), fg, 0.5), bg);
        check(`${p.id}/${mode} aside ink on ${name}`, mixOklab(t.info, fg, 0.8), bg);
        check(`${p.id}/${mode} trap ink on ${name}`, mixOklab(t.danger, fg, 0.8), bg);
        check(`${p.id}/${mode} maths ink on ${name}`, mixOklab(fg, t.info, 0.8), bg);
      }
      for (const k of SUBJECT) check(`${p.id}/${mode} theorem tab label (${k})`, t.bg[1], mixOklab(token(t, k), fg, 0.5));
      check(`${p.id}/${mode} text on sticky note`, fg, mixOklab(t.warning, t.bg[1], mode === 'dark' ? 0.15 : 0.22));
    }
  }
  assert.deepEqual(failures, [], `\n${failures.join('\n')}`);
});
