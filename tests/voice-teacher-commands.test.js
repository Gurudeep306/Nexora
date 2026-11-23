/*
  The teacher's own readers (client/src/voice/actions/teacherSpecs.ts):
  "point at X", "click X", "point at line N", "explain X on the whiteboard",
  in English, Hinglish and Hindi, over many real button names, every line
  number 1–500 and many topics; and questions that only mention these words
  must never become a click or a point (the matcher sends them to Guru).
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const T = () => import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'voice', 'actions', 'teacherSpecs.ts')).href);

const TARGETS = ['Run', 'Submit', 'Settings', 'Next', 'Notes', 'Save and next', 'Mark for review', 'Hint', 'Reset', 'Dark mode', 'Download Guru S', 'Start now',
  'Practice', 'Tests', 'Explore', 'Messages', 'Community', 'Live', 'Profile', 'Bookmarks', 'Clear response', 'Previous', 'Show solution', 'Add a test', 'Language',
  'Dry run', 'How it runs', 'Copy', 'Share', 'Invite', 'Whiteboard', 'Record', 'Upload', 'Open in chat', 'Reply', 'Fix', 'Remove from this device', 'Talk with Priya'];

function check(t, label, cases, fn) {
  const bad = [];
  for (const [said, want] of cases) {
    const got = fn(said);
    if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`"${said}" → ${JSON.stringify(got)} (want ${JSON.stringify(want)})`);
  }
  t.diagnostic(`${label}: ${cases.length}`);
  assert.equal(bad.length, 0, bad.slice(0, 25).join('\n'));
}

test('point at any named thing, in English, Hinglish and Hindi', async (t) => {
  const { parsePoint } = await T();
  const cases = [];
  for (const x of TARGETS) {
    for (const s of [`point at ${x}`, `point at the ${x}`, `point at the ${x} button`, `please point at ${x}`, `point to ${x}.`, `${x} kahan hai`, `${x} kahan hai?`, `${x} kidhar hai`, `${x} pe point karo`, `${x} ki taraf ishara karo`]) cases.push([s, { target: x }]);
  }
  for (const x of ['नोट्स', 'सेटिंग्स', 'रन बटन']) cases.push([`${x} कहाँ है`, { target: x }], [`${x} कहां है?`, { target: x }]);
  check(t, 'point', cases, parsePoint);
});

test('click any named thing, in English, Hinglish and Hindi', async (t) => {
  const { parseClick } = await T();
  const cases = [];
  for (const x of TARGETS) {
    for (const s of [`click ${x}`, `click on ${x}`, `click the ${x} button`, `press ${x}`, `press the ${x} tab`, `tap ${x}`, `please click ${x}`, `${x} dabao`, `${x} daba do`, `${x} pe click karo`, `${x} par click karo`, `${x} click karo`, `click ${x}!`]) cases.push([s, { target: x }]);
  }
  for (const x of ['रन', 'सबमिट', 'अगला']) cases.push([`${x} दबाओ`, { target: x }], [`${x} पर क्लिक करो`, { target: x }]);
  check(t, 'click', cases, parseClick);
});

test('point at every line 1–500, in English and Hinglish', async (t) => {
  const { parseLine } = await T();
  const cases = [];
  for (let n = 1; n <= 500; n++) {
    for (const s of [`point at line ${n}`, `highlight line ${n}`, `show me line number ${n}`, `line ${n} pe point karo`, `line number ${n} highlight karo`, `line ${n} ki taraf ishara karo`]) cases.push([s, { line: String(n) }]);
  }
  check(t, 'lines', cases, parseLine);
});

const TOPICS = ['binary search', 'merge sort', 'quick sort', 'a stack', 'BFS', 'DFS', 'dijkstra', 'heaps', 'hashing', 'linked lists', 'recursion', 'page replacement', 'deadlock', 'paging',
  'normal forms', 'B trees', 'TCP handshake', 'subnetting', 'DFA minimisation', 'pumping lemma', 'two pointers', 'sliding window', 'dynamic programming', 'knapsack', 'LRU cache'];

test('explain any topic on the whiteboard, in English, Hinglish and Hindi', async (t) => {
  const { parseBoard } = await T();
  const cases = [];
  for (const x of TOPICS) {
    for (const s of [`explain ${x} on the whiteboard`, `explain ${x} on the board`, `teach ${x} using the whiteboard`, `draw ${x} on the board`, `show me ${x} on the whiteboard`, `please explain ${x} on the whiteboard.`, `board pe ${x} samjhao`, `whiteboard par ${x} padhao`, `${x} board pe samjhao`, `${x} whiteboard pe explain karo`]) cases.push([s, { topic: x }]);
  }
  for (const x of ['बाइनरी सर्च', 'स्टैक']) cases.push([`बोर्ड पर ${x} समझाओ`, { topic: x }], [`${x} व्हाइटबोर्ड पर समझाओ`, { topic: x }]);
  for (const s of ['open the whiteboard', 'show the board', 'whiteboard kholo', 'explain this on the board', 'isko board pe samjhao']) cases.push([s, { topic: '' }]);
  check(t, 'board', cases, parseBoard);
});

test('questions that only mention these words never become a click or a point', async (t) => {
  const { parsePoint, parseClick, parseLine } = await T();
  const said = [];
  for (const x of TARGETS) said.push(`what does ${x} do`, `how do I click ${x}`, `why should I press ${x}`, `${x} kya karta hai`, `${x} button kya hai`, `explain the ${x} button`, `what happens if I click on ${x}`);
  said.push('point to point link kya hai', 'click stream samjhao', 'what is a pointer', 'what does line 12 do', 'line 5 kya kar rahi hai', 'press release kya hota hai');
  const bad = said.filter((s) => parseClick(s) || parsePoint(s) || parseLine(s)).map((s) => `"${s}" → ${JSON.stringify(parseClick(s) || parsePoint(s) || parseLine(s))}`);
  t.diagnostic(`questions: ${said.length}`);
  assert.equal(bad.length, 0, bad.join('\n'));
});
