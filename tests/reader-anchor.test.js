// Highlights are found again by their quote and a little text around it, so a
// repeated phrase lands on the right copy and a removed one is reported gone.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () => import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'components', 'reader', 'anchor.ts')).href);

test('a quote is found again, and repeats are told apart by their context', async () => {
  const { locate, describe } = await load();
  const text = 'p and q is true. Later: p and q is false only when one side is false. Again p and q.';
  const second = text.indexOf('p and q', 10);
  const saved = describe(text, second, second + 'p and q'.length);
  assert.equal(saved.quote, 'p and q');
  assert.equal(locate(text, saved.quote, saved.prefix, saved.suffix), second);
  const third = text.lastIndexOf('p and q');
  const s3 = describe(text, third, third + 7);
  assert.equal(locate(text, s3.quote, s3.prefix, s3.suffix), third);
  // The lesson gained a sentence in front: the context still finds the same copy.
  const edited = 'A new opening line. ' + text;
  assert.equal(locate(edited, saved.quote, saved.prefix, saved.suffix), second + 20);
  // Gone from the lesson.
  assert.equal(locate(text, 'not in the text', '', ''), -1);
  assert.equal(locate(text, '', '', ''), -1);
});
