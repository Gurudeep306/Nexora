'use strict';
/*
  The AI course lessons (client/src/learn/content/ai): every written topic is
  checked here, so a broken scene, a missing question or a book that is not in
  the verified sources never ships.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const base = path.join(root, 'client/src/learn/content/ai');
const load = (p) => import(pathToFileURL(p).href);

function writtenTopics() {
  const out = [];
  for (const c of fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()))
    for (const t of fs.readdirSync(path.join(base, c.name), { withFileTypes: true }).filter((d) => d.isDirectory()))
      if (fs.existsSync(path.join(base, c.name, t.name, 'index.ts'))) out.push(path.join(base, c.name, t.name));
  return out;
}

test('generated course web and search index are up to date', () => {
  execFileSync('node', [path.join(root, 'scripts/ai-courses/build-client-web.mjs'), '--check'], { stdio: 'pipe' });
  execFileSync('node', [path.join(root, 'scripts/ai-courses/build-search.mjs'), '--check'], { stdio: 'pipe' });
});

test('every written AI topic is complete and consistent', async () => {
  const S = await load(path.join(root, 'client/src/ai/stage/spec.ts'));
  const cur = JSON.parse(fs.readFileSync(path.join(root, 'docs/ai-courses/curriculum.json'), 'utf8'));
  const topicIds = new Set(cur.courses.flatMap((c) => c.chapters.flatMap((ch) => ch.topics.map((t) => t.id))));
  const booksJson = JSON.parse(fs.readFileSync(path.join(root, 'docs/ai-courses/sources/books.json'), 'utf8'));
  const coursesJson = JSON.parse(fs.readFileSync(path.join(root, 'docs/ai-courses/sources/courses.json'), 'utf8'));
  const books = new Set([...(Array.isArray(booksJson) ? booksJson : booksJson.books).map((b) => b.id), ...coursesJson.courses.map((c) => c.id)]);
  const dirs = writtenTopics();
  assert.ok(dirs.length > 0);
  for (const dir of dirs) {
    const topic = (await load(path.join(dir, 'index.ts'))).default;
    const meta = (await load(path.join(dir, 'meta.ts'))).default;
    const at = topic.id;
    assert.ok(topicIds.has(topic.id), `${at}: not a curriculum topic`);
    assert.equal(path.basename(dir), topic.id, `${at}: folder name must be the topic id`);
    assert.equal(meta.pages, topic.pages.length, `${at}: meta.pages must match the pages`);
    const pageIds = new Set(topic.pages.map((p) => p.id));
    assert.equal(pageIds.size, topic.pages.length, `${at}: page ids must be unique`);
    const qIds = new Set(topic.questions.map((q) => q.id));
    assert.equal(qIds.size, topic.questions.length, `${at}: question ids must be unique`);
    for (const q of topic.questions) {
      assert.ok(pageIds.has(q.page), `${at}: question ${q.id} points to missing page ${q.page}`);
      assert.ok(q.explain && q.explain.length > 20, `${at}: question ${q.id} needs an explanation`);
      if (q.kind === 'mcq') assert.ok(q.answer >= 0 && q.answer < q.options.length, `${at}: ${q.id} answer out of range`);
      if (q.kind === 'multi') assert.ok(q.answers.every((a) => a >= 0 && a < q.options.length), `${at}: ${q.id} answers out of range`);
    }
    let checked = 0;
    for (const p of topic.pages) {
      assert.ok(p.title && p.summary && p.minutes > 0, `${at}/${p.id}: title, summary and minutes are required`);
      for (const b of p.blocks) {
        if (b.t === 'stage') {
          assert.deepEqual(S.validateStage(b.scene), [], `${at}/${p.id}: scene "${b.scene.title}"`);
          const frames = S.buildFrames(b.scene);
          for (let t = 0; t < frames.length; t += 0.5) assert.ok(S.frameAt(frames, t).elements.size > 0);
        }
        if (b.t === 'check') for (const id of b.ids) {
          assert.ok(qIds.has(id), `${at}/${p.id}: check names missing question ${id}`);
          checked++;
        }
        if (b.t === 'readmore') for (const it of b.items) assert.ok(books.has(it.book), `${at}/${p.id}: book "${it.book}" is not in sources/books.json or courses.json`);
        if (b.t === 'derive') assert.ok(b.lines.every((l) => l.tex && l.why), `${at}/${p.id}: every derivation line needs maths and a reason`);
      }
    }
    assert.equal(checked, topic.questions.length, `${at}: every question should appear on a page`);
  }
});

test('every Python example has a recorded output, and only intended errors fail', async () => {
  execFileSync('node', [path.join(root, 'scripts/ai-courses/record-python.mjs'), '--check'], { stdio: 'pipe' });
  const { codeHash } = await load(path.join(root, 'client/src/learn/python/hash.ts'));
  const { PY_RECORDINGS, RECORDED_WITH } = await load(path.join(base, 'python.gen.ts'));
  assert.match(RECORDED_WITH.python, /^3\.15\./, 'outputs are recorded with Python 3.15');
  for (const dir of writtenTopics()) {
    const topic = (await load(path.join(dir, 'index.ts'))).default;
    for (const p of topic.pages) for (const b of p.blocks) if (b.t === 'python') {
      const r = PY_RECORDINGS[codeHash(b.code, b.stdin ?? '')];
      assert.ok(r, `${topic.id}/${p.id}: "${b.title ?? b.code.slice(0, 30)}" has no recording`);
      assert.equal(r.ok, !b.error, `${topic.id}/${p.id}: "${b.title}" ${r.ok ? 'was meant to fail' : `failed:\n${r.out}`}`);
    }
  }
});

test('numbers in the foundations lessons are right', async () => {
  const N = await load(path.join(base, 'foundations/f-numbers/scenes.ts'));
  const fr = N.sqrt2Fractions(10);
  for (const f of fr) assert.equal(Math.abs(f.pell), 1, `${f.p}/${f.q}: p² − 2q² = ±1`);
  for (let i = 1; i < fr.length; i++) assert.ok(fr[i].err < fr[i - 1].err, 'each fraction is closer to √2');
  const A = new Set(N.PASSED_MATHS);
  const B = new Set(N.PASSED_PHYSICS);
  const union = N.CLASS.filter((x) => A.has(x) || B.has(x)).length;
  const both = N.CLASS.filter((x) => A.has(x) && B.has(x)).length;
  assert.equal(union, A.size + B.size - both, 'inclusion and exclusion');
  const F = await load(path.join(base, 'foundations/f-functions/scenes.ts'));
  assert.equal(F.fare(5), 125);
  assert.equal((185 - 50) / 15, 9, 'the inverse taxi question');
});
