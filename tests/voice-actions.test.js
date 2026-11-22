/*
  Voice Action Graph: the fast command matcher (client/src/voice/actions/match.ts)
  against the spoken test set (docs/voice/tests/commands.json) and the
  site-wide phrases (globalSpecs.ts). Release bar (blueprint §5): at least 95%
  correct, no false command on a question, and never a wrong irreversible
  action.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const mod = (f) => import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'voice', 'actions', f)).href);

// The nav labels as the shell offers them (config/nav.ts), plus the voice-only places.
const NAV = [
  ['/hub', 'Home'], ['/problems', 'Problems'], ['/contests', 'Contests'], ['/workshop', 'Workshop'], ['/nexus', 'Nexus'],
  ['/analytics', 'Analytics'], ['/achievements', 'Achievements'], ['/learn', 'Learn'], ['/social', 'Social'],
  ['/submissions', 'Submissions'], ['/bookmarks', 'Bookmarks'], ['/profile', 'Profile'], ['/theme', 'Appearance'], ['/settings', 'Settings'],
].map(([to, label]) => ({ to, label }));

async function specs() {
  const G = await mod('globalSpecs.ts');
  return [G.placeSpec([...NAV, ...G.EXTRA_PLACES]), ...G.GLOBAL_SPECS];
}

test('normalize folds Hindi, Hinglish and English into one form', async () => {
  const { normalize } = await mod('match.ts');
  assert.equal(normalize('Notes kholo please!'), 'notes open');
  assert.equal(normalize('नोट्स खोलो'), 'notes open');
  assert.equal(normalize('wapas jao'), 'back');
  assert.equal(normalize('sabse upar'), 'top');
  assert.equal(normalize('  Ruko  yaar '), 'pause');
});

test('every spoken test case reaches the right action (≥ 95%, no false commands)', async () => {
  const { matchCommand, expand } = await mod('match.ts');
  const all = await specs();
  const expanded = new Map(all.map((s) => [s.id, expand(s)]));
  const { cases } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'voice', 'tests', 'commands.json'), 'utf8'));
  assert.ok(cases.length >= 80, 'the test set keeps growing, never shrinking');
  const wrong = [];
  for (const c of cases) {
    const { best } = matchCommand(c.say, all, expanded);
    const got = best ? best.id : null;
    const ok = got === c.expect && (!c.args || JSON.stringify(best.args) === JSON.stringify(c.args));
    if (!ok) wrong.push(`"${c.say}" → ${got ?? 'nothing'} ${best ? JSON.stringify(best.args) : ''} (expected ${c.expect ?? 'nothing'} ${c.args ? JSON.stringify(c.args) : ''})`);
    // A question must never fire a command, and an irreversible action must never fire by mistake.
    if (c.expect === null) assert.equal(got, null, `question fired a command: "${c.say}" → ${got}`);
    if (got && all.find((s) => s.id === got).risk === 'irreversible') assert.equal(got, c.expect, `wrong irreversible action for "${c.say}"`);
  }
  const accuracy = 1 - wrong.length / cases.length;
  assert.ok(accuracy >= 0.95, `accuracy ${(accuracy * 100).toFixed(1)}% < 95%:\n${wrong.join('\n')}`);
});

test('unclear commands ask instead of guessing', async () => {
  const { matchCommand } = await mod('match.ts');
  const specsList = [
    { id: 'a.next', risk: 'safe', say: { en: ['next question'] } },
    { id: 'b.next', risk: 'safe', say: { en: ['next step'] } },
  ];
  const r = matchCommand('next', specsList);
  assert.equal(r.best, null, 'two equally good actions → no guess');
  assert.equal(r.candidates.length, 2, 'both are offered');
  assert.equal(matchCommand('next step', specsList).best.id, 'b.next');
});

test('slot values must be heard: "option" alone does not pick an option', async () => {
  const { matchCommand } = await mod('match.ts');
  const choose = { id: 'gate.answer.choose', risk: 'reversible', args: { x: ['A|a|ए', 'B|b|bee|बी', 'C|c|see|सी', 'D|d|dee|डी'] }, say: { en: ['option {x}', 'choose {x}', 'answer {x}'], hi: ['{x} choose', 'option {x} choose'] } };
  assert.equal(matchCommand('option', [choose]).best, null);
  assert.deepEqual(matchCommand('option B chuno', [choose]).best.args, { x: 'B' });
  assert.deepEqual(matchCommand('बी चुनो', [choose]).best.args, { x: 'B' });
  assert.deepEqual(matchCommand('answer is d', [choose]).best.args, { x: 'D' });
});

test('the registry: latest registration wins, and removing it restores the earlier one', async () => {
  const R = await mod('registry.ts');
  const base = { id: 'test.thing', title: 'Base', say: { en: ['thing'] }, risk: 'safe', run: () => 'base' };
  const page = { ...base, title: 'Page', run: () => 'page' };
  const off1 = R.registerAction(base);
  const off2 = R.registerAction(page);
  assert.equal(R.getAction('test.thing').title, 'Page');
  off2();
  assert.equal(R.getAction('test.thing').title, 'Base');
  off1();
  assert.equal(R.getAction('test.thing'), undefined);
  const hidden = R.registerAction({ ...base, when: () => false });
  assert.equal(R.getAction('test.thing'), undefined, 'when() hides an action');
  hidden();
});

test('"light mode" is not "night mode" (dark): a slip never changes the first letter', () => {
  const { matchCommand, expand, sameWord } = require('../client/src/voice/actions/match.ts');
  const { GLOBAL_SPECS } = require('../client/src/voice/actions/globalSpecs.ts');
  const index = new Map(GLOBAL_SPECS.map((a) => [a.id, expand(a)]));
  assert.equal(sameWord('light', 'night'), false);
  assert.equal(sameWord('problms', 'problems'), true);
  assert.equal(matchCommand('light mode', GLOBAL_SPECS, index).best?.id, 'look.mode.light');
  assert.equal(matchCommand('night mode', GLOBAL_SPECS, index).best?.id, 'look.mode.dark');
  assert.equal(matchCommand('dark mode', GLOBAL_SPECS, index).best?.id, 'look.mode.dark');
});
