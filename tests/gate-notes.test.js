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

test('internal planning notes (_outline.md, _plan.md) are skipped; other stray files still fail', async () => {
  const r = await build({ content: scratch(LESSON, { '_outline.md': '# map', '01-basics/_plan.md': '# plan' }) });
  assert.deepEqual(r.errors, []);
  assert.ok(!r.outputs.get('tst.json').includes('# plan'));
  const e = await errorsFor(LESSON, { '01-basics/notes.md': 'x', 'stray.md': 'y' });
  assert.match(e, /chapters hold NN-lesson-slug\.md lessons/);
  assert.match(e, /expected _meta\.json, viz\/ or NN-chapter-slug\/ directories only/);
});

test(':::lab embeds a known Live Lab; unknown labs, tabs and content are reported', async () => {
  const r = await build({ content: scratch(`${LESSON}\n:::lab{#lab-bench lab="gate-bench" tab="sets" depth="standard"}\n:::\n`) });
  assert.deepEqual(r.errors, []);
  const body = JSON.parse(r.outputs.get('tst.json')).lessons.alpha.body;
  const lab = body.find((n) => n.t === 'block' && n.name === 'lab');
  assert.deepEqual([lab.id, lab.attrs], ['lab-bench', { lab: 'gate-bench', tab: 'sets' }]);
  assert.match(await errorsFor(`${LESSON}\n:::lab{lab="kmap-solver"}\n:::\n`), /lab must be gate-bench/);
  assert.match(await errorsFor(`${LESSON}\n:::lab{lab="gate-bench" tab="draw"}\n:::\n`), /tab must be bench \| challenge \| sets/);
  assert.match(await errorsFor(`${LESSON}\n:::lab{tab="bench"}\n:::\n`), /:::lab needs lab=/);
  assert.match(await errorsFor(`${LESSON}\n:::lab{lab="gate-bench"}\nText.\n:::\n`), /:::lab takes no content/);
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

/* ── Viz: the arc (sector) primitive — schema and geometry ── */

test('viz arc: valid sectors pass, bad sweeps and radii are reported, geometry is exact', async () => {
  const { pathToFileURL } = require('node:url');
  const viz = (f) => import(pathToFileURL(path.join(ROOT, 'client', 'src', 'viz', f)).href);
  const { validateVizSpec } = await viz('schema.ts');
  const { arcPath, arcLabelPoint, polar } = await viz('geometry.ts');
  const spec = (el, steps = []) => ({ version: 1, title: 'Wheel', width: 200, height: 200, elements: [el], steps });
  const ok = { id: 'a', type: 'arc', cx: 100, cy: 100, r: 80, r0: 40, start: 0, end: 90, fill: 'subject', label: '01' };

  assert.deepEqual(validateVizSpec(spec(ok)), []);
  const { r0: _r0, ...pie } = ok;
  assert.deepEqual(validateVizSpec(spec({ ...pie, start: -90, end: 270 })), [], 'a full pie is allowed');
  assert.deepEqual(validateVizSpec(spec(ok, [{ caption: 'Turn the band', patches: [{ id: 'a', set: { start: 90, end: 180 } }] }])), []);
  assert.match(validateVizSpec(spec({ ...ok, end: 0 })).join('\n'), /elements\[0\]\.end: must be after start/);
  assert.match(validateVizSpec(spec({ ...ok, end: 400 })).join('\n'), /at most one full turn/);
  assert.match(validateVizSpec(spec({ ...ok, r0: 80 })).join('\n'), /r0: inner radius must be smaller than r/);
  const { start: _s, ...noStart } = ok;
  assert.match(validateVizSpec(spec(noStart)).join('\n'), /start: is required for a arc/);
  assert.match(validateVizSpec(spec(ok, [{ caption: 'Bad', patches: [{ id: 'a', set: { end: -10 } }] }])).join('\n'), /steps\[0\]\.patches\[0\]\.set\.end: must be after start/);

  // 0° is 12 o'clock and angles run clockwise.
  assert.deepEqual(polar(100, 100, 50, 0), [100, 50]);
  assert.deepEqual(polar(100, 100, 50, 90), [150, 100]);
  assert.deepEqual(polar(100, 100, 50, 180), [100, 150]);
  // Quarter band: outer arc to 3 o'clock, inner arc back.
  assert.equal(arcPath(100, 100, 80, 40, 0, 90), 'M100 20 A80 80 0 0 1 180 100 L140 100 A40 40 0 0 0 100 60 Z');
  // A sweep over 180° sets the large-arc flag; a pie slice starts at the centre.
  assert.match(arcPath(100, 100, 80, 0, 0, 270), /^M100 100 L100 20 A80 80 0 1 1 20 100 Z$/);
  // A full ring is two half arcs plus the inner hole.
  const ring = arcPath(100, 100, 80, 40, 0, 360);
  assert.equal((ring.match(/A80 80/g) || []).length, 2);
  assert.equal((ring.match(/A40 40/g) || []).length, 2);
  assert.deepEqual(arcLabelPoint(100, 100, 80, 40, 0, 90), polar(100, 100, 60, 45));
});

/* ── Viz: the gate (logic symbol) primitive — schema and geometry ── */

test('viz gate: kinds, inputs and bubbles are validated; pins and bubbles are placed exactly', async () => {
  const { pathToFileURL } = require('node:url');
  const viz = (f) => import(pathToFileURL(path.join(ROOT, 'client', 'src', 'viz', f)).href);
  const { validateVizSpec } = await viz('schema.ts');
  const { gateShape, gateBubbleR } = await viz('geometry.ts');
  const spec = (el, steps = []) => ({ version: 1, title: 'Gates', width: 300, height: 200, elements: [el], steps });
  const ok = { id: 'g1', type: 'gate', x: 100, y: 50, w: 60, h: 40, kind: 'nor', bubbles: [0], label: 'G1' };

  assert.deepEqual(validateVizSpec(spec(ok)), []);
  assert.deepEqual(validateVizSpec(spec({ ...ok, kind: 'xor', inputs: 4, bubbles: [3] })), []);
  assert.deepEqual(validateVizSpec(spec(ok, [{ caption: 'It becomes a NAND', patches: [{ id: 'g1', set: { kind: 'nand', tone: 'success' } }] }])), []);
  assert.match(validateVizSpec(spec({ ...ok, kind: 'mux' })).join('\n'), /elements\[0\]\.kind: must be one of and \| or/);
  assert.match(validateVizSpec(spec({ ...ok, kind: 'not', inputs: 2, bubbles: [] })).join('\n'), /a not gate has exactly one input/);
  assert.match(validateVizSpec(spec({ ...ok, bubbles: [2] })).join('\n'), /bubbles: an index is not an input of this gate \(it has 2\)/);
  const { kind: _k, ...noKind } = ok;
  assert.match(validateVizSpec(spec(noKind)).join('\n'), /kind: is required for a gate/);
  assert.match(validateVizSpec(spec(ok, [{ caption: 'Bad', patches: [{ id: 'g1', set: { inputs: 9 } }] }])).join('\n'), /set\.inputs: must be an integer in \[1, 8\]/);

  // AND: flat back, half-disc front; pins evenly spaced on the back; no bubbles.
  const and = gateShape('and', 0, 0, 60, 40);
  assert.equal(and.body, 'M0 0 H40 A20 20 0 0 1 40 40 H0 Z');
  assert.deepEqual(and.pins, [[0, 13.33], [0, 26.67]]);
  assert.deepEqual(and.out, [60, 20]);
  assert.equal(and.outBubble, undefined);
  // NOR with a bubbled top input: the pins follow the curved back (x + 0.5·w·t(1 − t)),
  // the bubbled pin moves left by one diameter, and the output bubble fits inside w.
  const r = gateBubbleR(40);
  assert.equal(r, 4.8);
  const nor = gateShape('nor', 100, 50, 60, 40, 2, [0]);
  assert.deepEqual(nor.pins, [[96, 63.33], [105.6, 76.67]]);
  assert.deepEqual(nor.inBubbles, [{ cx: 100.8, cy: 63.33, r: 4.8 }]);
  assert.deepEqual(nor.outBubble, { cx: 155.2, cy: 70, r: 4.8 });
  assert.deepEqual(nor.out, [160, 70]);
  // XOR has the extra back curve; NOT is a triangle with one input.
  assert.match(gateShape('xor', 0, 0, 60, 40).extra, /^M0 0 Q/);
  const not = gateShape('not', 0, 0, 40, 30, 3);
  assert.equal(not.pins.length, 1);
  assert.deepEqual(not.out, [40, 15]);
});

/* ── Live Lab: Gate Bench logic against the Python-verified vectors ── */

test('gate bench: evaluation, truth tables, challenges and minterm sets match the checks', async () => {
  const { pathToFileURL } = require('node:url');
  const lab = await import(pathToFileURL(path.join(ROOT, 'client', 'src', 'gate', 'notes', 'labs', 'benchLogic.ts')).href);
  const vec = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'gate-notes', '_checks', 'dl', 'lab_vectors_ch2.json'), 'utf8'));

  // Every challenge: same target column and the same proven minimum counts.
  assert.deepEqual(lab.CHALLENGES.map((c) => c.id), vec.challenges.map((c) => c.id));
  for (const want of vec.challenges) {
    const c = lab.CHALLENGES.find((x) => x.id === want.id);
    assert.deepEqual(c.inputs, want.inputs, want.id);
    assert.deepEqual(c.table, want.table, `${want.id} table`);
    assert.deepEqual(c.min, want.min, `${want.id} minimum`);
  }
  // Presets compute the functions they are named after.
  for (const p of lab.PRESETS) {
    assert.deepEqual(lab.benchErrors(p.bench), [], p.id);
    assert.deepEqual(lab.truthTable(p.bench), vec.presets[p.id], p.id);
  }
  // Minterm-set operations.
  for (const s of vec.sets) {
    const r = lab.setOps(s.f, s.g, s.n);
    for (const k of ['and', 'or', 'xor', 'notF']) assert.deepEqual(r[k], s[k], `${k} of ${s.f} / ${s.g}`);
  }
  // The proven-minimum XOR passes the challenge check at the minimum; a wrong bench is reported row by row.
  const xor = lab.CHALLENGES.find((c) => c.id === 'xor');
  const four = lab.PRESETS.find((p) => p.id === 'xor4').bench;
  assert.deepEqual(lab.checkChallenge(four, xor, 'NAND'), { match: true, wrongRows: [], count: 4, foreign: [], min: 4 });
  const one = { inputs: ['A', 'B'], gates: [{ id: 'G1', type: 'NAND', in: ['A', 'B'] }], output: 'G1' };
  assert.deepEqual(lab.checkChallenge(one, xor, 'NAND').wrongRows, ['00']);
  // Editing: bad wiring is reported, removal rewires readers, ids are reused, lists parse with ranges.
  assert.match(lab.benchErrors({ inputs: ['A'], gates: [{ id: 'G1', type: 'AND', in: ['A', 'G2'] }], output: 'G1' }).join(), /G2/);
  assert.deepEqual(lab.removeGate(four, 'G1').gates[0].in, ['A', 'A']);
  assert.equal(lab.nextGateId(lab.removeGate(four, 'G2')), 'G2');
  assert.deepEqual(lab.parseIndexList('7, 1 3-5', 3), { list: [1, 3, 4, 5, 7] });
  assert.match(lab.parseIndexList('9', 3).error, /not a row of a 3-variable table/);
  assert.equal(lab.formatSigma([1, 2]), 'Σm(1, 2)');
  assert.deepEqual(lab.usedGates({ ...four, output: 'G2' }).map((g) => g.id), ['G1', 'G2']);
});

/* ── Viz: the narrow (phone) layout — schema and frames ── */

test('viz narrow layout: a second canvas, per-element geometry and wide/narrow-only elements', async () => {
  const { pathToFileURL } = require('node:url');
  const viz = (f) => import(pathToFileURL(path.join(ROOT, 'client', 'src', 'viz', f)).href);
  const { validateVizSpec } = await viz('schema.ts');
  const { buildFrames, canvasSize, pickLayout } = await viz('frames.ts');
  const spec = {
    version: 1,
    title: 'Bit layout',
    width: 640,
    height: 120,
    narrow: { width: 360, height: 240 },
    elements: [
      { id: 'row', type: 'bits', x: 10, y: 40, bits: '10000001', cell: 20, only: 'wide' },
      { id: 'hi', type: 'bits', x: 20, y: 40, bits: '1000', cell: 40, only: 'narrow' },
      { id: 'lo', type: 'bits', x: 20, y: 140, bits: '0001', cell: 40, only: 'narrow' },
      { id: 'cap', type: 'text', x: 320, y: 20, text: 'exponent', size: 14, narrow: { x: 180, size: 18 } },
      { id: 'pt', type: 'arrow', from: 'cap', to: 'hi', only: 'narrow' },
    ],
    steps: [
      {
        caption: 'Light the exponent',
        patches: [
          { id: 'row', set: { highlight: [0] } },
          { id: 'hi', set: { highlight: [0] } },
          { id: 'cap', set: { tone: 'accent', x: 300 } },
        ],
      },
    ],
  };
  assert.deepEqual(validateVizSpec(spec), []);

  // Wide: the narrow-only elements are absent and the authored geometry is used.
  const wide = buildFrames(spec, 'wide');
  assert.deepEqual(wide[0].elements.map((e) => e.id), ['row', 'cap']);
  assert.deepEqual([...wide[1].changed].sort(), ['cap', 'row']);
  assert.equal(wide[1].elements.find((e) => e.id === 'cap').x, 300);
  assert.deepEqual(buildFrames(spec), wide, 'wide is the default layout');
  // Narrow: wide-only elements are dropped; the layout geometry wins over a patch for the keys it names.
  const narrow = buildFrames(spec, 'narrow');
  assert.deepEqual(narrow[0].elements.map((e) => e.id), ['hi', 'lo', 'cap', 'pt']);
  const cap = narrow[1].elements.find((e) => e.id === 'cap');
  assert.deepEqual([cap.x, cap.size, cap.tone], [180, 18, 'accent']);
  assert.deepEqual([...narrow[1].changed].sort(), ['cap', 'hi']);
  assert.deepEqual(narrow[1].elements.find((e) => e.id === 'hi').highlight, [0]);
  // The text alternative is the same in both layouts.
  assert.deepEqual(wide.map((f) => f.caption), narrow.map((f) => f.caption));
  // Canvas and layout choice.
  assert.deepEqual(canvasSize(spec, 'narrow'), { width: 360, height: 240 });
  assert.deepEqual(canvasSize(spec, 'wide'), { width: 640, height: 120 });
  assert.equal(pickLayout(spec, 343), 'narrow');
  assert.equal(pickLayout(spec, 700), 'wide');
  assert.equal(pickLayout({ ...spec, narrow: { ...spec.narrow, below: 300 } }, 343), 'wide');
  assert.equal(pickLayout({}, 200), 'wide', 'no narrow canvas: always wide');
  assert.equal(pickLayout(spec, 0), 'wide', 'unmeasured: wide');

  // Errors.
  const errs = (patch) => validateVizSpec({ ...spec, ...patch }).join('\n');
  const { narrow: _n, ...noCanvas } = spec;
  assert.match(validateVizSpec(noCanvas).join('\n'), /"only" and "narrow" need a top-level narrow canvas/);
  assert.match(errs({ narrow: { width: 10, height: 240 } }), /narrow\.width: must be a number/);
  assert.match(errs({ narrow: { width: 360, height: 240, below: 50 } }), /narrow\.below: must be an integer/);
  assert.match(errs({ narrow: { width: 360, height: 240, zoom: 2 } }), /narrow\.zoom: unknown property/);
  const withEl = (el) => errs({ elements: [...spec.elements.slice(0, 4), el] });
  const t = { id: 'x', type: 'text', x: 1, y: 1, text: 'a' };
  assert.match(withEl({ ...t, narrow: { text: 'b' } }), /narrow\.text: only geometry can change per layout/);
  assert.match(withEl({ ...t, narrow: { cell: 30 } }), /narrow\.cell: unknown property for a text/);
  assert.match(withEl({ ...t, narrow: { size: 99 } }), /narrow\.size: must be a number in \[8, 48\]/);
  assert.match(withEl({ ...t, only: 'wide', narrow: { x: 2 } }), /an element drawn only in the wide layout has no narrow geometry/);
  assert.match(withEl({ ...t, only: 'tablet' }), /only: must be one of wide \| narrow/);
  assert.match(withEl({ id: 'x', type: 'arrow', from: 'cap', to: 'row' }), /elements\[4\]\.to: "row" is not drawn in the narrow layout/);
  assert.match(errs({ steps: [{ caption: 'Move', patches: [{ id: 'cap', set: { only: 'wide' } }] }] }), /cannot change the layout \(only, narrow\)/);
});
