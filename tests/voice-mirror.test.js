/*
  Voice Phase 3, Mirror Run (lane D): the student's pseudocode runs exactly as
  written, bugs included, beside the lesson's own run, and the first
  difference is found (docs/voice/BLUEPRINT.md §4.3).
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');
const { registerHooks } = require('node:module');

// Lesson files import without extensions ("../engine/tracer"), as Vite allows.
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('.') && ctx.parentURL?.endsWith('.ts') && !/\.\w+$/.test(spec)) {
      const base = path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec);
      for (const c of [`${base}.ts`, path.join(base, 'index.ts')]) if (fs.existsSync(c)) return next(pathToFileURL(c).href, ctx);
    }
    return next(spec, ctx);
  },
});

const { runPseudo, parseExpr, evaluate } = require('../client/src/voice/mirror/pseudo.ts');
const { compareRuns, lessonName } = require('../client/src/voice/mirror/compare.ts');
const { arrSortedSearch } = require('../client/src/learn/content/dsa/arrays/algorithms1.ts');
const { SYSTEM } = require('../src/voice/pseudo.js');

const input = { arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91, 95], x: 16 };
const frames = arrSortedSearch.run(input);
const verdict = (src) => compareRuns(runPseudo(src, input), frames);

test('expressions: pseudocode operators, whole-number division, errors in words', () => {
  const env = { a: [1, 2, 3], lo: 0, hi: 7 };
  assert.equal(evaluate(parseExpr('(lo + hi) / 2'), env), 3);
  assert.equal(evaluate(parseExpr('lo + (hi − lo) ÷ 2'), env), 3);
  assert.equal(evaluate(parseExpr('a[2] = 3 and not lo ≥ 1'), env), true);
  assert.equal(evaluate(parseExpr('⌊7 / 2⌋ + 7 mod 3'), env), 4);
  assert.throws(() => evaluate(parseExpr('a[5]'), env), /outside the array/);
  assert.throws(() => evaluate(parseExpr('hgh + 1'), env), /before it has a value/);
});

test('the lesson’s own pseudocode, and a Python-style version, match the lesson step for step', () => {
  assert.equal(verdict(arrSortedSearch.code.pseudo).kind, 'same');
  const py = 'low = 0\nhigh = n - 1\nwhile low <= high:\n    mid = (low + high) // 2\n    if a[mid] == x:\n        return mid\n    elif a[mid] < x:\n        low = mid + 1\n    else:\n        high = mid - 1\nreturn -1';
  const r = runPseudo(py, input);
  assert.equal(r.returned, 4);
  assert.equal(compareRuns(r, frames).kind, 'same');
});

test('bugs are kept and the first difference is found, with one question about it', () => {
  // "while lo < hi" stops one round early.
  const early = verdict('lo ← 0; hi ← n − 1\nwhile lo < hi\n  mid ← (lo + hi) / 2\n  if a[mid] = x: return mid\n  if a[mid] < x: lo ← mid + 1\n  else hi ← mid − 1\nreturn −1');
  assert.equal(early.kind, 'differ');
  assert.equal(early.name, 'mid');
  assert.equal(early.line, 2, 'points at the loop that stopped');
  assert.match(early.question, /loop on line 2 stops when lo = 4, hi = 4/);
  // "lo ← mid" never moves past mid: found at the first wrong value, before the endless loop.
  const stuck = verdict('lo ← 0; hi ← n − 1\nwhile lo ≤ hi\n  mid ← (lo + hi) / 2\n  if a[mid] = x: return mid\n  if a[mid] < x: lo ← mid\n  else hi ← mid − 1\nreturn −1');
  assert.equal(stuck.kind, 'differ');
  assert.deepEqual([stuck.name, stuck.mine, stuck.lesson, stuck.line], ['lo', 2, 3, 5]);
  assert.match(stuck.question, /never finishes/);
});

test('mistakes stop the run with a line number, and endless loops are caught', () => {
  const bad = verdict('lo ← 0\nwhile lo <= :\n  lo ← lo + 1');
  assert.equal(bad.kind, 'error');
  assert.equal(bad.line, 2);
  const endless = runPseudo('i ← 0\nwhile i < n\n  x ← x + 1', input);
  assert.equal(endless.error.endless, true);
  assert.equal(compareRuns(endless, frames).kind, 'differ', 'i never changes, but x does — reported as the difference');
});

test('names line up with the lesson’s (low → lo), and a wrong return is caught', () => {
  assert.equal(lessonName('low', new Set(['lo', 'hi'])), 'lo');
  assert.equal(lessonName('zzz', new Set(['lo'])), null);
  const v = verdict(arrSortedSearch.code.pseudo.replace('return mid', 'return mid + 1'));
  assert.equal(v.kind, 'result');
});

test('the approach-to-pseudocode prompt forbids fixing the student’s idea', () => {
  assert.match(SYSTEM, /EXACTLY as they said it/);
  assert.match(SYSTEM, /Do NOT fix, improve, complete or optimise/);
});
