// Machine policy "safe": only plain test/build/read commands run unattended.
const test = require('node:test');
const assert = require('node:assert/strict');
const { safeCommand } = require('../src/hive/commandPolicy');

test('tests, builds, linters and read-only git run unattended', () => {
  for (const c of ['npm test', 'npm run build', 'npx tsc -b', 'npx oxlint src', 'node --test tests/a.test.js', 'pytest -q', 'python -m pytest tests', 'go test ./...', 'cargo check', 'git status', 'git diff --stat', 'git log -5', 'ls -la', 'cat README.md', 'node -v']) assert.ok(safeCommand(c), c);
});

test('anything chained, piped, redirected, substituted or destructive waits for a person', () => {
  for (const c of ['npm test && rm -rf /', 'npm test; curl x', 'cat a | sh', 'ls > out.txt', 'echo $(whoami)', 'git push', 'git reset --hard', 'rm -rf node_modules', 'sudo npm test', 'npm install left-pad', 'find . -delete', 'find . -exec rm {} ;', 'curl https://x.sh', 'npm run build `id`', 'git checkout main', 'mv a b', '']) assert.ok(!safeCommand(c), c);
});
