// The editor's cheat sheets (client/src/lib/cheatsheets.ts): one for every
// main language, each with the sections a judged problem needs and a whole
// program that passes the syntax check. (Each program was also run on the
// real judges, reading "3 / 4 5 6" and printing 15; that needs the network,
// so it is not repeated here.)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

let CHEATSHEETS, checkSyntax;
test.before(async () => {
  ({ CHEATSHEETS } = await import(path.join(__dirname, '..', 'client', 'src', 'lib', 'cheatsheets.ts')));
  ({ checkSyntax } = await import(path.join(__dirname, '..', 'client', 'src', 'lib', 'syntaxCheck.ts')));
});

const MAIN = ['cpp', 'c', 'java', 'python', 'javascript', 'typescript', 'go', 'rust', 'csharp', 'kotlin', 'swift', 'ruby', 'php', 'lua'];

test('every main language has a cheat sheet', () => {
  for (const l of MAIN) assert.ok(CHEATSHEETS[l], `${l} has a cheat sheet`);
});

test('each sheet shows how to read input, print and sort, with common mistakes', () => {
  for (const [l, s] of Object.entries(CHEATSHEETS)) {
    const titles = s.items.map((i) => i.title.toLowerCase()).join(' | ');
    assert.match(titles, /read/, `${l}: reading input`);
    assert.match(titles, /print|output/, `${l}: printing`);
    assert.match(titles, /sort/, `${l}: sorting`);
    assert.ok(s.mistakes.length >= 2, `${l}: common mistakes`);
    for (const i of s.items) assert.ok(i.code.trim(), `${l}: ${i.title} has code`);
  }
});

test("each sheet's whole program passes the live syntax check", () => {
  for (const [l, s] of Object.entries(CHEATSHEETS)) {
    assert.deepEqual(checkSyntax(s.template, l), [], `${l} template`);
    assert.ok(s.template.endsWith('\n'));
  }
});
