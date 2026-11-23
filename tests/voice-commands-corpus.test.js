/*
  Voice commands at scale (docs/voice/BLUEPRINT.md §4.1):
  - every page, teacher and site action said the many ways students say it
    (English, Hinglish, Devanagari, polite words, a teacher's name, small
    recognition slips) must reach that action;
  - questions about real CS topics that contain command words ("bottom up
    parser", "next fit", "light weight process") must never fire a command
    (they go to Guru);
  - every sentence of every real GATE question, read aloud, must never fire a
    command (a page name said alone, like "Note:", is not a sentence).
  The matcher (client/src/voice/actions/match.ts) has no AI; it must never
  guess. Release bar: ≥ 98% of positives right, no false command, and never a
  wrong irreversible action.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const mod = (f) => import(pathToFileURL(path.join(ROOT, 'client', 'src', 'voice', 'actions', f)).href);

const NAV = [
  ['/hub', 'Home'], ['/problems', 'Problems'], ['/contests', 'Contests'], ['/workshop', 'Workshop'], ['/nexus', 'Nexus'],
  ['/analytics', 'Analytics'], ['/achievements', 'Achievements'], ['/learn', 'Learn'], ['/social', 'Social'],
  ['/submissions', 'Submissions'], ['/bookmarks', 'Bookmarks'], ['/profile', 'Profile'], ['/theme', 'Appearance'], ['/settings', 'Settings'],
].map(([to, label]) => ({ to, label }));

let ctx;
async function setup() {
  if (ctx) return ctx;
  const M = await mod('match.ts');
  const G = await mod('globalSpecs.ts');
  const T = await mod('teacherSpecs.ts');
  const places = [...NAV, ...G.EXTRA_PLACES];
  // Everything the mic knows on an ordinary page with the teacher on (the whiteboard's own words join only while it is open).
  const specs = [G.placeSpec(places), ...G.GLOBAL_SPECS, ...T.TEACHER_SPECS];
  const boardSpecs = [...specs, ...T.BOARD_SPECS];
  const exp = (list) => new Map(list.map((s) => [s.id, M.expand(s)]));
  ctx = { M, G, T, places, specs, boardSpecs, expanded: exp(specs), boardExpanded: exp(boardSpecs) };
  return ctx;
}

/** Run a list of [said, expected id or null, expected args?, alsoOk ids?] and report every miss. */
async function judge(t, label, cases, { board = false, bar = 0.98 } = {}) {
  const { M, specs, boardSpecs, expanded, boardExpanded } = await setup();
  const list = board ? boardSpecs : specs;
  const byId = new Map(list.map((s) => [s.id, s]));
  const wrong = [];
  const falseFires = [];
  for (const [said, want, args, alsoOk = []] of cases) {
    const { best } = M.matchCommand(said, list, board ? boardExpanded : expanded);
    const got = best ? best.id : null;
    const ok = (got === want && (!args || JSON.stringify(best.args) === JSON.stringify(args))) || alsoOk.includes(got);
    if (!ok) wrong.push(`"${said}" → ${got ?? 'nothing'} ${best ? JSON.stringify(best.args) : ''} (want ${want ?? 'nothing'} ${args ? JSON.stringify(args) : ''})`);
    if (want === null && got) falseFires.push(`"${said}" → ${got}`);
    if (got && byId.get(got)?.risk === 'irreversible' && got !== want) assert.fail(`wrong irreversible action: "${said}" → ${got}`);
  }
  const acc = 1 - wrong.length / cases.length;
  t.diagnostic(`${label}: ${cases.length} sentences, ${(acc * 100).toFixed(2)}% right`);
  assert.equal(falseFires.length, 0, `${falseFires.length} questions fired a command:\n${falseFires.slice(0, 30).join('\n')}`);
  assert.ok(acc >= bar, `${label}: ${(acc * 100).toFixed(2)}% < ${bar * 100}%:\n${wrong.slice(0, 40).join('\n')}`);
  return wrong;
}

/* ── pages ── */

const OPEN_EN = ['open {p}', 'go to {p}', 'take me to {p}', 'show {p}', 'show me {p}', '{p} page', 'open the {p} page', 'go to the {p} page', 'please open {p}', 'can you open {p}', 'open {p} please', 'take me to the {p} page', 'open my {p}'];
const OPEN_HG = ['{p} kholo', '{p} khol do', '{p} pe jao', '{p} page kholo', '{p} dikhao', 'mujhe {p} dikhao', '{p} pe le chalo', 'zara {p} kholo', '{p} open karo', 'bhai {p} kholo', '{p} page pe jao', '{p} kholiye', 'jaldi {p} kholo'];
const OPEN_HI = ['{p} खोलो', '{p} पर जाओ', '{p} दिखाओ', '{p} पेज खोलो', '{p} खोलिए'];

test('every page, by every name it has, opened the ways students ask', async (t) => {
  const { G, places } = await setup();
  const cases = [];
  for (const p of places) {
    const names = [...p.label.split('|'), ...(G.PAGE_ALIASES[p.to] ?? [])];
    for (const name of names) {
      const isHindiName = /[ऀ-ॿ]/.test(name);
      const templates = isHindiName ? OPEN_HI : [...OPEN_EN, ...OPEN_HG, ...OPEN_HI];
      for (const tpl of templates) {
        if (tpl.includes('my {p}') && !/profile|submissions/i.test(name)) continue;
        // "Show my profile" is its own action; it does the same.
        const alsoOk = p.to === '/profile' ? ['profile.open'] : [];
        cases.push([tpl.replace('{p}', name), 'nav.open', { page: p.to }, alsoOk]);
      }
    }
  }
  await judge(t, 'pages', cases);
});

/* ── the teacher and the site's own actions ── */

const WRAP = [(x) => x, (x) => `please ${x}`, (x) => `${x} please`, (x) => `zara ${x}`, (x) => `can you ${x}`, (x) => `${x} na`, (x) => `bhai ${x}`, (x) => `ok ${x}`, (x) => `guru ${x}`, (x) => `${x} yaar`];

test('every teacher and site action, said each listed way, wrapped in polite words', async (t) => {
  const { G, T } = await setup();
  const cases = [];
  for (const s of [...G.GLOBAL_SPECS, ...T.TEACHER_SPECS]) {
    if (s.parse) continue; // checked with their own parsers (voice-teacher.test.js)
    for (const phrase of [...s.say.en, ...(s.say.hi ?? [])]) {
      if (phrase.includes('{')) continue;
      for (const w of WRAP) cases.push([w(phrase), s.id]);
    }
  }
  await judge(t, 'actions', cases);
});

test('whiteboard controls while the board is open', async (t) => {
  const { T } = await setup();
  const cases = [];
  for (const s of T.BOARD_SPECS) for (const phrase of [...s.say.en, ...(s.say.hi ?? [])]) for (const w of WRAP) cases.push([w(phrase), s.id]);
  await judge(t, 'whiteboard', cases, { board: true });
});

test('"what is on your left/right", in both languages', async (t) => {
  const cases = [];
  for (const side of ['left', 'right']) {
    for (const s of [`what is on your ${side}`, `whats on your ${side}`, `what do you see on your ${side}`, `tumhare ${side} mein kya hai`, `aapke ${side} mein kya hai`, `please tell me what is on your ${side}`]) cases.push([s, 'teacher.side']);
  }
  await judge(t, 'sides', cases);
});

/* ── small speech-recognition slips ── */

test('a one-letter slip in a long command word is still understood', async (t) => {
  const { G, places } = await setup();
  const { REAL_WORDS } = await mod('realWords.ts');
  const cases = [];
  // Drop the 4th letter; a slip that makes another real word ("learning" → "leaning") is not a slip, so it isn't guessed.
  const slip = (w) => {
    const s = w.length >= 6 ? w.slice(0, 3) + w.slice(4) : null;
    return s && !REAL_WORDS.has(s) ? s : null;
  };
  for (const p of places) {
    for (const name of [...p.label.split('|'), ...(G.PAGE_ALIASES[p.to] ?? [])]) {
      if (/[ऀ-ॿ ]/.test(name)) continue;
      const s = slip(name.toLowerCase());
      if (!s) continue;
      for (const tpl of ['open {p}', '{p} kholo', 'go to {p}']) cases.push([tpl.replace('{p}', s), 'nav.open', { page: p.to }, p.to === '/profile' ? ['profile.open'] : []]);
    }
  }
  await judge(t, 'slips', cases);
});

/* ── questions that must reach Guru, not a command ── */

const TOPICS = [
  'binary search', 'binary search tree', 'bottom up parser', 'top down parsing', 'next fit allocation', 'first fit', 'light weight process', 'back propagation',
  'backtracking', 'dark silicon', 'stack', 'queue', 'heap', 'linked list', 'merge sort', 'quick sort', 'dynamic programming', 'depth first search', 'breadth first search',
  'page table', 'page fault', 'paging', 'virtual memory', 'cache memory', 'pipeline hazards', 'deadlock', 'semaphore', 'mutex', 'process scheduling', 'round robin',
  'normal forms', 'third normal form', 'b plus tree', 'hashing', 'open addressing', 'graph coloring', 'minimum spanning tree', 'dijkstra algorithm', 'bellman ford',
  'turing machine', 'regular expression', 'context free grammar', 'pumping lemma', 'finite automata', 'lexical analysis', 'syntax analysis', 'semantic analysis',
  'tcp handshake', 'sliding window protocol', 'subnetting', 'routing algorithms', 'ip address', 'home network', 'test and set', 'test driven development', 'theme of the chapter',
  'search engine', 'search space', 'review of sorting', 'practice problems on recursion', 'live variables', 'live variable analysis', 'profile of a function',
  'settings of a register', 'learning rate', 'social network graph', 'top of the stack', 'bottom of the heap', 'up counter', 'down counter', 'previous pointer', 'next pointer',
  'back edge', 'forward edge', 'contents of a register', 'scrolling in os', 'notes on hashing', 'daily routine scheduling', 'contest problem', 'submission order',
  'bookmark in a b tree', 'nexus of control', 'workshop scheduling', 'achievement of goals', 'shortcut evaluation', 'random variables', 'random access memory',
  'logout process', 'sign of a number', 'point to point link', 'pointer arithmetic', 'turn around time', 'waiting time', 'stand alone system', 'spin lock', 'thumb rule',
  'click stream', 'wave form', 'middle element', 'centre of a tree', 'left rotation', 'right rotation', 'left child', 'right shift operator', 'left shift', 'sit and wait',
  'hide the details abstraction', 'tour of a graph', 'euler tour', 'talk about recursion',
];
const ASK = [
  (x) => `what is ${x}`, (x) => `explain ${x}`, (x) => `${x} kya hai`, (x) => `${x} samjhao`, (x) => `how does ${x} work`, (x) => `why do we use ${x}`,
  (x) => `can you explain ${x} to me`, (x) => `${x} ke baare mein batao`, (x) => `what is the time complexity of ${x}`, (x) => `give an example of ${x}`,
  (x) => `मुझे ${x} समझ नहीं आया`, (x) => `${x} क्या है`,
];

test('questions about CS topics never fire a command, even with command words in them', async (t) => {
  const cases = [];
  for (const topic of TOPICS) for (const a of ASK) cases.push([a(topic), null]);
  await judge(t, 'topic questions', cases, { bar: 1 });
});

test('every sentence of every real GATE question, read aloud, fires no command', async (t) => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'gate', 'questions.json'), 'utf8'));
  const sentences = new Set();
  for (const q of Array.isArray(raw) ? raw : raw.questions) {
    for (const s of String(q.text || '').replace(/\$[^$]*\$/g, ' ').split(/(?<=[.?!])\s+|\n+/)) {
      const x = s.replace(/\s+/g, ' ').trim();
      // A page name said alone ("Note:") is a command; a sentence is three words or more.
      if ((x.match(/\p{L}+/gu) || []).length >= 3 && x.length < 160) sentences.add(x);
    }
  }
  assert.ok(sentences.size > 10000, `only ${sentences.size} sentences`);
  await judge(t, 'GATE sentences', [...sentences].map((s) => [s, null]), { bar: 1 });
});

/* ── the list of real words is current ── */

test('the real-words list covers the study material (reported, not failed: new notes must not block other work)', async (t) => {
  const B = await import(pathToFileURL(path.join(ROOT, 'scripts', 'voice', 'build-real-words.mjs')).href);
  const { REAL_WORDS } = await mod('realWords.ts');
  const missing = (await B.build()).filter((w) => !REAL_WORDS.has(w));
  if (missing.length) t.diagnostic(`realWords.ts is missing ${missing.length} words (${missing.slice(0, 10).join(', ')}): run node scripts/voice/build-real-words.mjs`);
  for (const w of ['contents', 'analysis', 'parse', 'print']) assert.ok(REAL_WORDS.has(w), w);
});

test('a real word is never forgiven into a command; a slip is', async () => {
  const { M } = await setup();
  assert.equal(M.sameWord('contents', 'contests'), false);
  assert.equal(M.sameWord('analysis', 'analytics'), false);
  assert.equal(M.sameWord('parse', 'pause'), false);
  assert.equal(M.sameWord('problms', 'problems'), true);
  assert.equal(M.sameWord('contsts', 'contests'), true);
});
