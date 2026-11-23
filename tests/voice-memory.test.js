/*
  The teacher remembers the student (src/voice/memory.js): what she learns
  from what they say and the page they are on, a welcome that shows it, and
  the privacy rule — their name never goes into a prompt for an AI service.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/voice/memory');
const G = require('../src/voice/guru');

test('she learns a name only when the student clearly says it', () => {
  for (const [said, name] of [['my name is Rahul', 'Rahul'], ['Hi, mera naam Priyanka hai', 'Priyanka'], ['call me Adi', 'Adi'], ["I'm Karan, preparing for GATE", 'Karan']]) assert.equal(M.nameFrom(said), name, said);
  for (const said of ["I'm tired", 'I am stuck on this', 'i am fine', 'what is a stack', "I'm preparing for GATE"]) assert.equal(M.nameFrom(said), '', said);
});

test('she learns a goal, recent topics and what felt hard', () => {
  let m = M.learn(null, { heard: 'I am preparing for GATE 2027', page: { title: 'Paging' } });
  assert.equal(m.goal, 'GATE 2027');
  assert.deepEqual(m.topics, ['Paging']);
  m = M.learn(m, { heard: 'recursion samajh nahi aa raha', page: { learnTopic: 'Recursion' } });
  assert.deepEqual(m.topics, ['Recursion', 'Paging']);
  assert.deepEqual(m.hard, ['Recursion']);
  m = M.learn(m, { heard: 'ok next', page: { title: 'Paging' } });
  assert.deepEqual(m.topics, ['Paging', 'Recursion'], 'a topic studied again moves to the front, no duplicates');
  for (let i = 0; i < 10; i++) m = M.learn(m, { heard: 'x', page: { title: `T${i}` } });
  assert.ok(m.topics.length <= 6);
  assert.equal(m.turns, 13);
  assert.equal(M.goalFrom('placements ke liye padh raha hoon'), 'placements and interviews');
});

test('the AI gets study facts only — never the name', () => {
  const m = M.learn(M.learn(null, { heard: 'my name is Rahul and I am preparing for GATE 2027', page: { title: 'Paging' } }), { heard: 'DP is hard', page: { title: 'Dynamic programming' } });
  const facts = M.promptFacts(m);
  assert.match(facts, /GATE 2027/);
  assert.match(facts, /Dynamic programming/);
  assert.doesNotMatch(facts, /Rahul/);
  const msgs = G.buildMessages({ lang: 'en-IN', text: 'hi', talk: true, persona: G.personaFor('priya'), memory: facts });
  assert.ok(msgs.some((x) => x.content === facts));
  assert.ok(!JSON.stringify(msgs).includes('Rahul'));
  assert.equal(M.promptFacts(null), '');
  assert.equal(M.promptFacts(M.EMPTY), '');
});

test('her welcome shows she remembers (built here, no AI), in English and Hindi', () => {
  const m = M.learn(M.learn(null, { heard: 'my name is Rahul', page: {} }), { heard: 'ok', page: { title: 'Paging' } });
  assert.match(M.greeting(m, 'en-IN'), /Welcome back, Rahul! Last time we were on Paging/);
  assert.match(M.greeting(m, 'hi-IN'), /Rahul.*Paging/);
  assert.match(M.greeting(null, 'en-IN'), /What shall we study today/);
});
