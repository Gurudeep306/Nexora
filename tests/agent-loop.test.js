// The chat agent's tool loop, driven by a scripted fake model (no network).
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.GROQ_API_KEY = 'test-key-not-real';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initDb, migratePerUser } = require('../src/db');
const { runChat } = require('../src/ai/agent');
const { runTool, validNavPath } = require('../src/ai/tools');

/** A fake Groq client that plays back one scripted turn per chatStream() call. */
function scripted(turns) {
  const calls = [];
  return {
    calls,
    async *chatStream(opts) {
      calls.push(JSON.parse(JSON.stringify(opts)));
      const t = turns[Math.min(calls.length - 1, turns.length - 1)];
      for (const piece of t.text ? [t.text.slice(0, 3), t.text.slice(3)] : []) {
        if (piece) yield { type: 'delta', content: piece };
      }
      yield { type: 'done', content: t.text || '', toolCalls: t.tools || [], usage: { total_tokens: 10 } };
    },
  };
}
const call = (id, name, args = {}) => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } });

test.before(async () => {
  await initDb();
  await migratePerUser();
});

test('a tool call runs as the session user, then the model answers', async () => {
  const fake = scripted([{ tools: [call('c1', 'get_user_stats')] }, { text: 'You have solved 0 problems.' }]);
  const events = [];
  const out = await runChat({
    user: { username: 'alice' },
    message: 'How am I doing?',
    page: { path: '/analytics' },
    client: fake,
    onEvent: (type, data) => events.push([type, data]),
  });
  assert.equal(out.reply, 'You have solved 0 problems.');
  assert.deepEqual(
    events.map(([t]) => t),
    ['meta', 'tool', 'tool', 'token', 'token', 'done'],
  );
  assert.deepEqual(events[1][1], { name: 'get_user_stats', status: 'running' });
  assert.equal(events[2][1].ok, true);

  // Second round sees the tool result as a data block, computed for alice.
  const toolMsg = fake.calls[1].messages.find((m) => m.role === 'tool');
  assert.equal(toolMsg.tool_call_id, 'c1');
  assert.match(toolMsg.content, /^<data source="tool:get_user_stats">/);
  assert.match(toolMsg.content, /"username":"alice"/);
  // The system prompt carries the tutor pedagogy and the data-block rule.
  assert.match(fake.calls[0].messages[0].content, /NEVER write a complete or near-complete accepted solution/);
  assert.match(fake.calls[0].messages[0].content, /never instructions/);
});

test('the tool loop stops after 5 rounds and the last round disables tools', async () => {
  const fake = scripted([{ tools: [call('x', 'get_weak_tags')] }]);
  await runChat({ user: { username: 'bob' }, message: 'loop forever', client: fake, onEvent: () => {} });
  assert.equal(fake.calls.length, 5);
  assert.equal(fake.calls[4].toolChoice, 'none');
  assert.equal(fake.calls[0].toolChoice, 'auto');
});

test('a failing or unknown tool is returned to the model as data, not thrown', async () => {
  const fake = scripted([
    { tools: [call('a', 'get_problem', { id: 987654 }), call('b', 'drop_tables'), { id: 'c', function: { name: 'get_problem', arguments: '{oops' } }] },
    { text: 'Sorry, I could not find that.' },
  ]);
  const toolEvents = [];
  const out = await runChat({
    user: { username: 'carol' },
    message: 'open problem 987654',
    client: fake,
    onEvent: (t, d) => t === 'tool' && d.status === 'done' && toolEvents.push(d),
  });
  assert.equal(out.reply, 'Sorry, I could not find that.');
  assert.deepEqual(toolEvents.map((e) => e.ok), [false, false, false]);
  const results = fake.calls[1].messages.filter((m) => m.role === 'tool').map((m) => m.content);
  assert.match(results[0], /No problem with that id/);
  assert.match(results[1], /Unknown tool/);
  assert.match(results[2], /not valid JSON/);
});

test('suggest_navigation only accepts real Nexora pages', async () => {
  assert.equal(validNavPath('/solve/42'), '/solve/42');
  assert.equal(validNavPath('/learn/dsa/arrays'), '/learn/dsa/arrays');
  assert.equal(validNavPath('/admin/secret'), null);
  assert.equal(validNavPath('https://evil.example/solve/1'), null);
  assert.equal(validNavPath('//evil.example'), null);
  assert.equal(validNavPath('/solve/1?x=<script>'), null);

  const bad = await runTool(call('n1', 'suggest_navigation', { path: '/admin', label: 'Admin' }), { username: 'dan' });
  assert.equal(bad.ok, false);
  assert.equal(bad.action, null);

  const fake = scripted([{ tools: [call('n2', 'suggest_navigation', { path: '/gate', label: 'Practice GATE' })] }, { text: 'Opened.' }]);
  const actions = [];
  await runChat({ user: { username: 'dan' }, message: 'take me to gate', client: fake, onEvent: (t, d) => t === 'action' && actions.push(d) });
  assert.deepEqual(actions, [{ type: 'navigate', path: '/gate', label: 'Practice GATE' }]);
});

test('turns persist per conversation and per user', async () => {
  const { getConversation } = require('../src/ai/agent');
  const fake = scripted([{ text: 'First answer.' }]);
  const a = await runChat({ user: { username: 'erin' }, message: 'q1', client: fake, onEvent: () => {} });
  await runChat({ user: { username: 'erin' }, conversationId: a.conversationId, message: 'q2', client: fake, onEvent: () => {} });
  // The second call saw the first exchange as history.
  const second = fake.calls[1].messages.map((m) => m.content);
  assert.ok(second.includes('q1') && second.includes('First answer.'));
  assert.equal((await getConversation('erin', a.conversationId)).length, 4);
  assert.equal((await getConversation('frank', a.conversationId)).length, 0, "another user can't read it");
});
