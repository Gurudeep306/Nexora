// Tests for scripts/seed-problem-sets.js: verified public series are upserted
// idempotently, items matched to our catalog by LeetCode id, unknown list entries
// skipped (never invented — the set links the original).
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "seed-sets-"));
process.env.DB_PATH = path.join(tmp, "test.db");
process.env.NODE_ENV = "test";

const { all, get, run } = require("../src/db");
const { init } = require("../src/routes/problem-sets");
const { seedProblemSets } = require("../scripts/seed-problem-sets");

test.before(async () => {
  await run(`CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    problem_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    rating INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    category TEXT DEFAULT '',
    UNIQUE(platform, problem_id)
  )`);
  await init();
  const add = await run; // placeholder to keep lint quiet about unused
  void add;
  const ins = "INSERT INTO problems(platform, problem_id, title, url, rating, tags, category) VALUES(?,?,?,?,?,?,?)";
  await run(ins, ["leetcode", "LC1", "Two Sum", "https://leetcode.com/problems/two-sum/", 1200, "[]", "easy"]);
  await run(ins, ["leetcode", "LC217", "Contains Duplicate", "https://leetcode.com/problems/contains-duplicate/", 1100, "[]", "easy"]);
  await run(ins, ["codeforces", "X1", "Other Platform", "https://x", 1300, "[]", ""]);
});

test.after(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const data = {
  series: [
    {
      title: "NeetCode 150",
      sourceUrl: "https://neetcode.io/practice/practice/neetcode150",
      description: "The public list.",
      items: [
        { lc: 217, title: "Contains Duplicate", section: "Arrays & Hashing" },
        { lc: 1, title: "Two Sum", section: "Arrays & Hashing" },
        { lc: 9999, title: "Not in our catalog", section: "Arrays & Hashing" },
      ],
    },
    { title: "Grind 75", sourceUrl: "https://www.techinterviewhandbook.org/grind75/", description: "Card only.", items: [] },
  ],
};

test("seeds series sets, matches catalog problems by LeetCode id, skips unknown entries", async () => {
  const s = await seedProblemSets({ all, get, run }, data, "owner");
  assert.equal(s.sets.length, 2);
  assert.equal(s.sets[0].created, true);
  assert.equal(s.sets[0].added, 2, "two of the three items are in the catalog");
  assert.equal(s.skippedItems, 1, "the unknown list entry is skipped, not invented");
  const set = await get("SELECT * FROM problem_sets WHERE kind='series' AND title='NeetCode 150'");
  assert.ok(set);
  assert.equal(set.visibility, "public");
  assert.equal(set.source_url, "https://neetcode.io/practice/practice/neetcode150");
  assert.equal(set.owner, "owner");
  const items = await all("SELECT position, problem_rowid, section FROM problem_set_items WHERE set_id=? ORDER BY position", [set.id]);
  assert.deepEqual(
    items.map((i) => [i.position, i.problem_rowid, i.section]),
    [
      [0, 2, "Arrays & Hashing"],
      [1, 1, "Arrays & Hashing"],
    ],
    "items in list order, with their sections",
  );
  const card = await get("SELECT title FROM problem_sets WHERE kind='series' AND title='Grind 75'");
  assert.ok(card, "a source-only series card is created too");
});

test("idempotent: a second run reuses the set and adds nothing new", async () => {
  const s = await seedProblemSets({ all, get, run }, data, "owner");
  assert.equal(s.sets[0].created, false);
  assert.equal(s.sets[0].added, 0);
  const n = await get("SELECT COUNT(*) AS n FROM problem_sets WHERE kind='series' AND title='NeetCode 150'");
  assert.equal(Number(n.n), 1, "no duplicate set");
  const items = await all("SELECT * FROM problem_set_items WHERE set_id=(SELECT id FROM problem_sets WHERE title='NeetCode 150')");
  assert.equal(items.length, 2, "no duplicate items");
});

test("a seed entry without a public source is rejected", async () => {
  await assert.rejects(() => seedProblemSets({ all, get, run }, { series: [{ title: "No source", items: [] }] }, "owner"), /source/);
});
