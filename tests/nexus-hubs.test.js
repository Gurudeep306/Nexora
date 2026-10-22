// Learn and GATE hubs ↔ the Nexus: every Nexus subject has one reachable
// page, every Learn course and GATE subject maps back to exactly one Nexus
// subject, and the client routes really serve those pages.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const subjects = require('../src/nexus/subjects');
const { NEXUS_NODES } = require('../src/nexus/dsa-nodes');
const { loadGateBank } = require('../src/routes/gate');

const reg = subjects.loadRegistry(NEXUS_NODES);
const hubs = subjects.readHubs();
const app = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'App.tsx'), 'utf8');

test('the hub map exists and is served with the structure', () => {
  assert.ok(hubs && hubs.gate && Array.isArray(hubs.learn));
  const st = subjects.webStructure(reg, { zones: [] });
  assert.deepEqual(st.hubs, hubs);
});

test('every GATE bank subject maps to exactly one Nexus subject (or is a documented exception)', () => {
  const bank = loadGateBank();
  const bankSubjects = new Set(bank.questions.map((q) => q.subject));
  const mapped = new Map();
  for (const exam of ['CSE', 'DA']) {
    assert.ok(hubs.gate[exam]?.length, exam);
    const seen = new Set();
    for (const e of hubs.gate[exam]) {
      assert.ok(reg.subjects.has(e.nexus), `${exam}/${e.bank} → unknown Nexus subject ${e.nexus}`);
      assert.ok(bankSubjects.has(e.bank), `${exam}/${e.bank} is not a bank subject`);
      assert.ok(!seen.has(e.bank), `${exam}/${e.bank} listed twice`);
      seen.add(e.bank);
      if (mapped.has(e.bank)) assert.equal(mapped.get(e.bank), e.nexus, `${e.bank} maps to one subject in both papers`);
      mapped.set(e.bank, e.nexus);
    }
  }
  for (const s of bankSubjects) assert.ok(mapped.has(s) || hubs.gate.exceptions?.[s], `bank subject ${s} has no Nexus home`);
  // A Nexus subject that names a PYQ subject is where that subject maps.
  for (const [id, s] of reg.subjects) {
    const pyq = s.meta.pyqSubject;
    if (pyq && mapped.has(pyq)) assert.ok(mapped.get(pyq) === id || reg.subjects.get(mapped.get(pyq))?.meta.pyqSubject === pyq, `${id} (${pyq})`);
  }
});

test('every Learn course maps to a Nexus subject', () => {
  for (const c of hubs.learn) {
    assert.ok(reg.subjects.has(c.nexus), `${c.course} → ${c.nexus}`);
    assert.match(c.href, /^\/learn(\?tab=[a-z]+)?$/);
  }
});

test('every Nexus subject resolves to a reachable route, one page each', () => {
  // The routes the client serves for a subject page and a node's lesson.
  for (const r of ['/learn/dsa', '/learn/dsa/skill/:node', '/learn/:subject', '/learn/:subject/:node', '/gate/subjects/:subject', '/gate/subjects/:subject/:node']) {
    assert.ok(app.includes(`path="${r}"`), `App.tsx serves ${r}`);
  }
  // A static /learn/<x> route would shadow a subject page.
  const statics = [...app.matchAll(/path="\/learn\/([a-z0-9-]+)"/g)].map((m) => m[1]);
  const pages = new Set();
  for (const [id, s] of reg.subjects) {
    const href = s.engine === 'dsa' ? '/learn/dsa' : `/learn/${id}`;
    assert.ok(!pages.has(href), href);
    pages.add(href);
    if (s.engine !== 'dsa') assert.ok(!statics.includes(id), `/learn/${id} is shadowed by a static route`);
  }
  assert.equal(pages.size, reg.subjects.size);
});
