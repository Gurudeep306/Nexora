/*
  Scene Voice: the spoken animation commands (client/src/voice/scene/parse.ts)
  against docs/voice/tests/scene.json, and the trace resolver (resolve.ts) on
  a real lesson trace. Bar: ≥ 95% of commands right, questions never drive
  the player, and every "why" answer comes from the recorded trace.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const mod = (...p) => import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', ...p)).href);

test('scene commands: the spoken test set (≥ 95%, questions never drive the player)', async () => {
  const { parseScene } = await mod('voice', 'scene', 'parse.ts');
  const { cases } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'voice', 'tests', 'scene.json'), 'utf8'));
  const wrong = [];
  for (const c of cases) {
    const got = parseScene(c.say);
    if (JSON.stringify(got) !== JSON.stringify(c.expect)) wrong.push(`"${c.say}" → ${JSON.stringify(got)} (expected ${JSON.stringify(c.expect)})`);
    if (c.expect === null) assert.equal(got, null, `a question drove the player: "${c.say}"`);
  }
  const acc = 1 - wrong.length / cases.length;
  assert.ok(acc >= 0.95, `accuracy ${(acc * 100).toFixed(1)}%:\n${wrong.join('\n')}`);
});

/* Real traces, built with the lessons' own tracer. */
async function binarySearch(arr, target) {
  const { trace } = await mod('learn', 'engine', 'tracer.ts');
  return trace((t) => {
    const a = t.array('a', arr);
    let lo = 0;
    let hi = arr.length - 1;
    t.step('init', `Search ${target} between lo and hi.`, { lo, hi });
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      a.ptr('lo', lo).ptr('hi', hi).ptr('mid', mid);
      t.step('cmp', `Compare a[mid] = ${arr[mid]} with ${target}.`, { lo, hi, mid });
      if (arr[mid] === target) {
        t.step('found', `Found ${target} at index ${mid}.`, { lo, hi, mid });
        return;
      }
      if (arr[mid] < target) lo = mid + 1;
      else hi = mid - 1;
      t.step('shrink', `Keep the half that can still hold ${target}.`, { lo, hi, mid });
    }
    t.step('done', `${target} is not in the array.`, { lo, hi });
  });
}

async function insertionSort(arr) {
  const { trace } = await mod('learn', 'engine', 'tracer.ts');
  return trace((t) => {
    const a = t.array('a', arr);
    const v = [...arr];
    t.step('init', 'Start insertion sort.', { i: 1 });
    for (let i = 1; i < v.length; i++) {
      let j = i;
      t.step('pick', `Pick ${v[i]} at i = ${i}.`, { i, j });
      while (j > 0 && v[j - 1] > v[j]) {
        t.step('cmp', `${v[j - 1]} > ${v[j]}, so they swap.`, { i, j });
        [v[j - 1], v[j]] = [v[j], v[j - 1]];
        a.swap(j - 1, j);
        j--;
        t.step('swap', `Swapped; ${v[j]} moves left to ${j}.`, { i, j });
      }
    }
    t.step('done', 'Sorted.', { i: v.length });
  });
}

test('scene resolver: jumps, rewinds and conditions land on the real steps', async () => {
  const { resolveScene, valuesAt } = await mod('voice', 'scene', 'resolve.ts');
  const { parseScene } = await mod('voice', 'scene', 'parse.ts');
  const frames = await binarySearch([1, 3, 5, 7, 9, 11, 13], 11);
  const run = (say, at = 0) => resolveScene(parseScene(say), frames, at);

  const found = run('pause at the found step');
  assert.equal(found.kind, 'go');
  assert.equal(frames[found.index].step, 'found');

  const cond = run('go to when low equals 4'); // the student says "low", the lesson says "lo"
  assert.equal(cond.kind, 'go');
  assert.equal(valuesAt(frames[cond.index]).lo, 4);

  const jump = run('step 3 pe jao');
  assert.equal(jump.index, 2);
  assert.match(jump.say, /^Step 3 of \d+:/);

  assert.equal(run('go to step 99').kind, 'none', 'a step that does not exist is reported, not invented');
  assert.match(run('jab zeta 2 ho jaye').say, /no zeta/);
  const back = run('ek step peeche', 3);
  assert.equal(back.index, 2);
});

test('scene resolver: "why" and "what is" answer only from the trace', async () => {
  const { resolveScene, valuesAt } = await mod('voice', 'scene', 'resolve.ts');
  const { parseScene } = await mod('voice', 'scene', 'parse.ts');
  const frames = await insertionSort([5, 2, 4, 1]);
  const at = frames.length - 2;
  const why = resolveScene(parseScene('why did j become 0'), frames, at);
  assert.equal(why.kind, 'answer');
  // The step it names really is where j changed, to the value it reports.
  const k = why.index;
  assert.notEqual(String(valuesAt(frames[k]).j), String(valuesAt(frames[k - 1]).j));
  assert.ok(why.say.includes(`to ${valuesAt(frames[k]).j}`));
  assert.ok(why.say.includes(frames[k].note), 'quotes the lesson’s own note');

  const val = resolveScene(parseScene('i kya hai'), frames, 5);
  assert.equal(val.say, `i is ${valuesAt(frames[5]).i} at step 6.`);

  const lastSwap = resolveScene(parseScene('replay the last swap'), frames, frames.length - 1);
  assert.equal(frames[lastSwap.index].step, 'swap');
  const firstCmp = resolveScene(parseScene('pause at the first compare'), frames, 6);
  assert.equal(firstCmp.index, frames.findIndex((f) => f.step === 'cmp'));
});

test('what if: inputs change as asked, and impossible asks are explained', async () => {
  const { whatIfInputs } = await mod('voice', 'scene', 'resolve.ts');
  const fields = [
    { name: 'arr', label: 'Array', type: 'array', default: '5 2 4 1', maxLen: 8 },
    { name: 'target', label: 'Target', type: 'number', default: '4' },
  ];
  const cur = { arr: '5 2 4 1', target: '4' };
  assert.equal(whatIfInputs(fields, cur, 'sorted').raw.arr, '1 2 4 5');
  assert.equal(whatIfInputs(fields, cur, 'reversed').raw.arr, '5 4 2 1');
  assert.equal(whatIfInputs(fields, cur, { target: 9 }).raw.target, '9');
  assert.equal(whatIfInputs(fields, cur, { array: [7, 3] }).raw.arr, '7 3');
  assert.equal(whatIfInputs(fields, cur, { n: 2 }).raw.arr, '5 2');
  assert.ok(whatIfInputs(fields, cur, { array: [1, 2, 3, 4, 5, 6, 7, 8, 9] }).error);
  assert.ok(whatIfInputs([{ name: 's', label: 'Text', type: 'string', default: 'x' }], { s: 'x' }, 'sorted').error);
});
