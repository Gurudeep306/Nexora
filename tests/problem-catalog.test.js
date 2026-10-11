// The in-memory problem catalog replaces ~100 `tags LIKE` scans per Nexus
// request. It must match the SQL it replaced and reload after any write.
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
const test = require('node:test');
const assert = require('node:assert/strict');
const { run, all } = require('../src/db');
const { getCatalog, topicPool, PROBLEM_WRITE } = require('../src/problem-catalog');

test.before(async () => {
  await run(`CREATE TABLE problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT, platform TEXT NOT NULL, problem_id TEXT NOT NULL,
    title TEXT NOT NULL, url TEXT NOT NULL, rating INTEGER DEFAULT 0, tags TEXT DEFAULT '[]',
    category TEXT DEFAULT '', UNIQUE(platform, problem_id))`);
  await run('CREATE INDEX idx_problems_rating ON problems(rating)');
  const tags = ['["greedy"]', '["Greedy","math"]', '["dp"]', '["brute force","greedy"]', null, '[]'];
  for (let i = 1; i <= 60; i++) {
    await run('INSERT INTO problems(platform,problem_id,title,url,rating,tags) VALUES(?,?,?,?,?,?)', [
      'codeforces', `P${i}`, `Problem ${i}`, `https://x/${i}`, i % 7 === 0 ? 0 : 800 + (i % 5) * 100, tags[i % tags.length],
    ]);
  }
});

async function sqlPool(tags, minR, maxR) {
  const cond = tags.map(() => 'p.tags LIKE ?').join(' OR ');
  const rows = await all(
    `SELECT p.id FROM problems p WHERE (${cond}) AND p.rating >= ? AND p.rating <= ? AND p.rating > 0 ORDER BY p.rating DESC`,
    [...tags.map((t) => `%${t}%`), minR, maxR],
  );
  return rows.map((r) => r.id);
}

test('topic pools match the SQL LIKE query, including order', async () => {
  const catalog = await getCatalog();
  for (const [tags, lo, hi] of [
    [['greedy'], 800, 1199],
    [['greedy', 'dp'], 0, 99999],
    [['math'], 900, 1000],
    [['brute force'], 800, 1200],
    [['nothing'], 0, 5000],
  ]) {
    const mine = topicPool(catalog, tags, lo, hi).map((i) => catalog.rows[i].id);
    assert.deepEqual(mine, await sqlPool(tags, lo, hi), `pool for ${tags} ${lo}-${hi}`);
  }
});

test('a write to problems reloads the catalog; writes elsewhere do not', async () => {
  const before = await getCatalog();
  assert.equal(await getCatalog(), before, 'cached between reads');
  await run("UPDATE daily_activity_like_table_that_does_not_exist SET x=1").catch(() => {});
  assert.equal(await getCatalog(), before);
  await run("INSERT INTO problems(platform,problem_id,title,url,rating,tags) VALUES('codeforces','NEW','New','u',1000,'[\"greedy\"]')");
  const after = await getCatalog();
  assert.notEqual(after, before);
  assert.equal(after.rows.length, before.rows.length + 1);
  assert.ok(topicPool(after, ['greedy'], 1000, 1000).some((i) => after.rows[i].problem_id === 'NEW'));
});

test('only statements that modify the problems table count as writes', () => {
  for (const sql of [
    'INSERT INTO problems(a) VALUES(1)',
    'INSERT OR IGNORE INTO problems(a) VALUES(1)',
    '  UPDATE problems SET title=? WHERE id=?',
    'DELETE FROM problems WHERE id=1',
    'REPLACE INTO problems VALUES(1)',
  ]) assert.ok(PROBLEM_WRITE.test(sql), sql);
  for (const sql of [
    'INSERT INTO ai_problems(a) VALUES(1)',
    'INSERT INTO custom_problems(a) VALUES(1)',
    'UPDATE daily_activity SET problems_solved=1',
    'SELECT * FROM problems',
  ]) assert.ok(!PROBLEM_WRITE.test(sql), sql);
});
