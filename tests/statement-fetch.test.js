/*
  Statements from slow judges (src/statement-fetch.js): the page never waits
  past the budget (so it never times out into an error), the fetch carries on
  and is saved for next time, and everyone opening one problem shares a fetch.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeStatementFetcher, STILL_FETCHING } = require('../src/statement-fetch');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const GOOD = { statement: '<p>Given an array of n integers, find the largest sum.</p>', samples: [] };

test('a fast judge: the statement comes back and is saved', async () => {
  const saved = [];
  const f = makeStatementFetcher({ fetch: async () => GOOD, save: async (id, d) => saved.push([id, d]), budgetMs: 200 });
  assert.equal(await f.within({ id: 7 }), GOOD);
  assert.deepEqual(saved, [[7, GOOD]]);
});

test('a slow judge: the page hears "still fetching" in time, and the statement is saved when it comes', async () => {
  const saved = [];
  const f = makeStatementFetcher({ fetch: async () => (await wait(300), GOOD), save: async (id, d) => saved.push(id), budgetMs: 60 });
  const t0 = Date.now();
  assert.equal(await f.within({ id: 1 }), STILL_FETCHING);
  assert.ok(Date.now() - t0 < 250, 'answered within the budget');
  assert.equal(saved.length, 0);
  await wait(400);
  assert.deepEqual(saved, [1], 'saved for the next visit');
  assert.equal(f.inflight.size, 0);
});

test('many students opening one slow problem share one fetch', async () => {
  let calls = 0;
  const f = makeStatementFetcher({ fetch: async () => (calls++, await wait(150), GOOD), save: async () => {}, budgetMs: 30 });
  const r = await Promise.all([1, 2, 3, 4, 5].map(() => f.within({ id: 9 })));
  assert.ok(r.every((x) => x === STILL_FETCHING));
  assert.equal(calls, 1);
  await wait(200);
  assert.equal(f.inflight.size, 0, 'nothing left waiting');
});

test('a judge that fails or sends almost nothing: null, nothing saved, no crash', async () => {
  const saved = [];
  for (const fetch of [async () => { throw new Error('blocked by a bot check'); }, async () => null, async () => ({ statement: '<p> </p>' })]) {
    const f = makeStatementFetcher({ fetch, save: async (id) => saved.push(id), budgetMs: 100 });
    assert.equal(await f.within({ id: 3 }), null);
  }
  assert.equal(saved.length, 0);
});

test('a slow judge that fails after the page stopped waiting does not crash anything', async () => {
  const logged = [];
  const f = makeStatementFetcher({ fetch: async () => { await wait(80); throw new Error('timed out'); }, save: async () => {}, budgetMs: 20, log: (p, e) => logged.push(e.message) });
  assert.equal(await f.within({ id: 4 }), STILL_FETCHING);
  await wait(150);
  assert.deepEqual(logged, ['timed out']);
});
