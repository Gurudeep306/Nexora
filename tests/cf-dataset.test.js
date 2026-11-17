// The open Codeforces dataset (open-r1/codeforces, CC BY 4.0) fills in
// statements Codeforces won't serve to our server, and supplies official
// tests — but only for problems whose answer can be judged by exact match.
const test = require("node:test");
const assert = require("node:assert/strict");
const ds = require("../src/sources/cf-dataset");

test("problem ids map to the dataset's contest/index ids", () => {
  assert.equal(ds.datasetId("1850G"), "1850/G");
  assert.equal(ds.datasetId("1910B1"), "1910/B1");
  assert.equal(ds.datasetId("4a"), "4/A");
  assert.equal(ds.datasetId("abc300_a"), null);
});

test("dataset text becomes paragraphs; HTML is escaped; maths is left for the renderer", () => {
  assert.equal(ds.toHtml("First line\nsame paragraph\n\nSecond $$$a<b$$$"), "<p>First line<br>same paragraph</p><p>Second $$$a&lt;b$$$</p>");
  assert.equal(ds.toHtml("<script>x</script>"), "<p>&lt;script&gt;x&lt;/script&gt;</p>");
  assert.equal(ds.toHtml(""), "");
});

test("official tests only where the answer is exact", () => {
  const base = { description: "Find the sum.", output_format: "Print one integer.", input_mode: "stdio", generated_checker: null, interaction_format: null };
  assert.equal(ds.exactAnswer(base), true);
  assert.equal(ds.exactAnswer({ ...base, output_format: "If there are multiple answers, print any of them." }), false);
  assert.equal(ds.exactAnswer({ ...base, generated_checker: "def check(): ..." }), false, "a special checker means many answers are right");
  assert.equal(ds.exactAnswer({ ...base, interaction_format: "Ask queries." }), false);
  assert.equal(ds.exactAnswer({ ...base, input_mode: "file" }), false);
});

test("the attribution names the dataset and its licence", () => {
  assert.equal(ds.ATTRIBUTION.license, "CC BY 4.0");
  assert.match(ds.ATTRIBUTION.url, /huggingface\.co\/datasets\/open-r1\/codeforces$/);
});

test('a failed test download is remembered, so the page never says "being fetched" for ever', async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_PATH = process.env.DB_PATH || ':memory:';
  const db = require('../src/db');
  await db.initDb();
  ds.setFetch(async () => { throw new Error('network down'); });
  try {
    assert.equal(ds.testsState('9993A'), null, 'nothing known yet');
    const p = ds.fetchTests('9993A');
    assert.equal(ds.testsState('9993A'), 'fetching', 'a download is running');
    assert.equal(await p, null);
    assert.equal(ds.testsState('9993A'), 'failed', 'it failed lately: no "being fetched now"');
    assert.equal(await ds.fetchTests('9993A'), null, 'not tried again at once');
    assert.equal(ds.testsState('9993A'), 'failed');
  } finally {
    ds.setFetch(null);
  }
});
