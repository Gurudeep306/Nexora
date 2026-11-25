// DbSessionStore: a read of a session waits for a write to it still in flight.
//
// express-session sends the response headers (with the new cookie) before the
// store has finished writing the session row. A client that acts on the
// headers alone (fetch() resolves on headers) used to be able to reach the
// server first and be treated as signed out: the 401 that made
// tests/agent-route.test.js flaky on busy CI runners. Session writes are made
// slow here so the race always happens.
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');

// Slow down only the session-row writes. Patched before the store is loaded,
// since it takes `run` from the db module when it loads.
const SLOW_MS = 150;
const realRun = db.run;
db.run = (sql, ...rest) =>
  /INTO sessions\(|DELETE FROM sessions WHERE sid/.test(sql)
    ? new Promise((r) => setTimeout(r, SLOW_MS)).then(() => realRun(sql, ...rest))
    : realRun(sql, ...rest);
const { DbSessionStore } = require('../src/session-store');

const store = new DbSessionStore({ cacheTtlMs: 0 });
const sess = (username) => ({
  cookie: { expires: new Date(Date.now() + 60_000).toISOString(), originalMaxAge: 60_000 },
  user: { username },
});
const read = (sid) => new Promise((res, rej) => store.get(sid, (e, s) => (e ? rej(e) : res(s))));
const write = (sid, s) => new Promise((res, rej) => store.set(sid, s, (e) => (e ? rej(e) : res())));
const destroy = (sid) => new Promise((res, rej) => store.destroy(sid, (e) => (e ? rej(e) : res())));

test.before(async () => {
  await db.initDb();
  await store.ready;
});

test.after(() => clearInterval(store.pruneTimer));

test('a session read right after sign-in sees the new session', async () => {
  // set() is not awaited: the next request arrives while the row is being written.
  const written = write('sid-new', sess('carol'));
  const got = await read('sid-new');
  assert.equal(got?.user?.username, 'carol');
  await written;
});

test('a read during a change sees the changed session, not the old one', async () => {
  await write('sid-change', sess('dave'));
  const written = write('sid-change', { ...sess('dave'), note: 'changed' });
  assert.equal((await read('sid-change'))?.note, 'changed');
  await written;
});

test('a read right after sign-out finds no session', async () => {
  await write('sid-out', sess('erin'));
  const gone = destroy('sid-out');
  assert.equal(await read('sid-out'), null);
  await gone;
});

test('reads of other sessions do not wait, and nothing is left pending', async () => {
  await write('sid-other', sess('frank'));
  const written = write('sid-busy', sess('grace'));
  const t0 = Date.now();
  assert.equal((await read('sid-other'))?.user?.username, 'frank');
  assert.ok(Date.now() - t0 < SLOW_MS, 'an unrelated session is read at once');
  await written;
  await new Promise((r) => setImmediate(r));
  assert.equal(store.pending.size, 0);
});

test('a failed write still lets reads through and reports the error', async () => {
  const failing = new DbSessionStore({ cacheTtlMs: 0 });
  clearInterval(failing.pruneTimer);
  await failing.ready;
  failing.ready = Promise.reject(new Error('db down'));
  failing.ready.catch(() => {});
  const err = await new Promise((res) => failing.set('sid-x', sess('heidi'), res));
  assert.match(String(err?.message), /db down/);
  failing.ready = Promise.resolve();
  assert.equal(await new Promise((res, rej) => failing.get('sid-x', (e, s) => (e ? rej(e) : res(s)))), null);
});
