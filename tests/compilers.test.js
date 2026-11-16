// Public runners and their compiler versions (src/compilers.js): the version
// family rules, the self-updater (with the service lists and the self-test
// faked: no network here), pins, resets and services turned off.
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const c = require('../src/compilers');
const remote = require('../src/remote-exec');

test.before(async () => {
  await db.initDb();
});

test('a family keeps the name and leaves the version open', () => {
  assert.ok(c.family('gcc-13.2.0-c').test('gcc-16.1.0-c'));
  assert.ok(!c.family('gcc-13.2.0-c').test('gcc-16.1.0'), 'C stays C, not C++');
  assert.ok(c.family('g142').test('g162'));
  assert.ok(!c.family('g142').test('cg162'));
  assert.ok(c.family('julia_1_11_2').test('julia_1_12_5'));
  assert.ok(c.family('dotnet90csharpcoreclr').test('dotnet100csharpcoreclr'));
  assert.ok(!c.family('dotnet90csharpcoreclr').test('dotnet100fsharpcoreclr'));
  assert.ok(c.family('openjdk-jdk-22+36').test('openjdk-jdk-25+36'));
});

test('versions compare as numbers, and careful languages stay in their series', () => {
  assert.ok(c.compareVersions('1.10.0', '1.9.9') > 0);
  assert.ok(c.compareVersions('22+36', '22') > 0);
  assert.equal(c.compareVersions('3.12', '3.12.0'), 0);
  assert.equal(c.versionOf({ id: 'dotnet90csharpcoreclr', name: '.NET 9.0 CoreCLR', semver: '' }), '9.0');
  assert.equal(c.sameSeries('scala', '2.13.15', '3.5.1'), false);
  assert.equal(c.sameSeries('zig', '0.14.0', '0.17.0'), false);
  assert.equal(c.sameSeries('python', '3.12.7', '3.14.0'), true);
  assert.equal(c.sameSeries('cpp', '14.2', '16.2'), true, 'compilers of steady languages may jump');
});

const found = {
  godbolt: { count: 3, out: { cpp: { id: 'g162', version: '16.2', currentVersion: '14.2' }, rust: { id: 'r1990', version: '1.99.0', currentVersion: '1.82.0' } } },
  wandbox: { count: 2, out: { scala: { id: 'scala-3.5.1', version: '3.5.1', currentVersion: '2.13.15' }, python: { id: 'cpython-3.12.7', version: '3.12.7', currentVersion: '3.12.7' } } },
  kotlin: { count: 1, out: { kotlin: { id: '2.4.21', version: '2.4.21', currentVersion: '2.1.20' } } },
};
const deps = (failing = []) => ({
  newestOn: async (engine) => found[engine],
  selfTest: async (engine, lang) => (failing.includes(lang) ? { ok: false, detail: 'CE: broken' } : { ok: true, detail: '40 ms' }),
});

test('the updater uses a newer version only when it passes the test, and holds big jumps', async () => {
  const s = await c.sync({ by: 'test', deps: deps(['rust']) });
  assert.equal(remote.compilerFor('godbolt', 'cpp'), 'g162', 'passed: used');
  assert.equal(remote.compilerFor('godbolt', 'rust'), 'r1820', 'failed: the old one stays');
  assert.equal(remote.compilerFor('wandbox', 'scala'), 'scala-2.13.15', 'Scala 2 → 3 waits for an admin');
  assert.equal(remote.compilerFor('kotlin', 'kotlin'), '2.4.21');
  const by = Object.fromEntries(s.sync.results.map((r) => [r.lang, r]));
  assert.equal(by.rust.ok, false);
  assert.equal(by.scala.held, true);
  assert.equal(by.python, undefined, 'already the newest: nothing to do');
  assert.equal(s.catalog.godbolt.ok, true);
});

test('a kept version never changes; reset goes back to the built-in one', async () => {
  await c.setPin('godbolt', 'cpp', 'g142', 'admin');
  assert.equal(remote.compilerFor('godbolt', 'cpp'), 'g142');
  await c.sync({ by: 'test', deps: deps() });
  assert.equal(remote.compilerFor('godbolt', 'cpp'), 'g142', 'the pin wins over the updater');
  await c.reset('godbolt', 'cpp', 'admin');
  await c.reset('kotlin', 'kotlin', 'admin');
  assert.equal(remote.compilerFor('godbolt', 'cpp'), 'g142', 'built-in');
  assert.equal(remote.compilerFor('kotlin', 'kotlin'), remote.KOTLIN_VERSION);
});

test('a service turned off leaves every chain, and a list that cannot be read is reported', async () => {
  assert.ok(remote.engineChain('cpp').includes('paiza'));
  await c.setService('paiza', false, 'admin');
  assert.ok(!remote.engineChain('cpp').includes('paiza'));
  assert.deepEqual(remote.engineChain('elixir'), [], 'Paiza was the only runner for Elixir');
  await c.setService('paiza', true, 'admin');
  assert.ok(remote.engineChain('cpp').includes('paiza'));

  const s = await c.sync({ by: 'test', deps: { newestOn: async () => { throw new Error('HTTP 500'); }, selfTest: async () => ({ ok: true }) } });
  assert.equal(s.catalog.wandbox.ok, false);
  assert.match(s.catalog.wandbox.error, /500/);
  const v = await c.view();
  const cpp = v.languages.find((l) => l.lang === 'cpp');
  assert.deepEqual(cpp.chain, remote.engineChain('cpp'));
  assert.ok(cpp.compilers.some((x) => x.engine === 'godbolt' && x.builtin === 'g142'));
  assert.equal(v.services.length, 4);
});
