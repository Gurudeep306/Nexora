// Error lines and plain-English explanations (client/src/lib/diagnostics.ts),
// checked against real output collected from Wandbox, Compiler Explorer,
// Paiza.io and the Kotlin Playground (tests/fixtures/diagnostics-real.json).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const real = require('./fixtures/diagnostics-real.json');

let parseDiagnostics, explainError, isStudentFile;
test.before(async () => {
  ({ parseDiagnostics, explainError, isStudentFile } = await import(path.join(__dirname, '..', 'client', 'src', 'lib', 'diagnostics.ts')));
});

// language, kind → [line, explanation label]
const EXPECT = {
  cpp: { compile: [4, 'Missing ;'] },
  c: { compile: [3, 'Unknown name'] },
  java: { compile: [3, 'Wrong type'], runtime: [4, 'Index out of range'] },
  python: { compile: [1, 'Syntax'], runtime: [2, 'Index out of range'] },
  javascript: { compile: [1, 'Syntax'], runtime: [2, 'Empty value'] },
  typescript: { compile: [1, 'Wrong type'], runtime: [2, 'Empty value'] },
  go: { compile: [4, 'Unknown name'], runtime: [6, 'Index out of range'] },
  rust: { compile: [2, 'Wrong type'], runtime: [4, 'Index out of range'] },
  csharp: { compile: [2, 'Wrong type'], runtime: [2, 'Index out of range'] },
  kotlin: { compile: [2, 'Wrong type'], runtime: [3, 'Index out of range'] },
  swift: { compile: [1, 'Wrong type'], runtime: [3, 'Index out of range'] },
  ruby: { runtime: [2, 'Empty value'] },
  php: { compile: [2, 'Syntax'] },
  perl: { compile: [1, 'Syntax'], runtime: [2, 'Division by zero'] },
  lua: { compile: [2, 'Brackets'], runtime: [2, 'Empty value'] },
  haskell: { compile: [1, 'Wrong type'], runtime: [1, 'Empty list'] },
};

for (const [lang, kinds] of Object.entries(EXPECT)) {
  for (const [kind, [line, label]] of Object.entries(kinds)) {
    test(`${lang} ${kind} error (${real[lang][kind].engine}): line ${line}, "${label}"`, () => {
      const d = parseDiagnostics(real[lang][kind].stderr, lang);
      assert.ok(d.length > 0, 'found');
      assert.equal(d[0].line, line);
      assert.equal(d[0].hint?.label, label);
      assert.ok(d[0].message && !/0x[0-9a-f]{6}|libc\.so/.test(d[0].message), `a readable message: ${d[0].message}`);
    });
  }
}

test('only the student’s own file counts, never a library or system header', () => {
  for (const f of ['<source>', 'prog.cc', 'Main.java', 'main.py', '/app/example.rs', '/workspace/Main.js', 'File.kt', '/tmp/arena_ab12.cpp', './example.go'])
    assert.ok(isStudentFile(f), f);
  for (const f of ['/usr/include/c++/13/bits/stl_vector.h', 'node:internal/modules/cjs/loader', '/usr/lib/python3.12/json/__init__.py', 'vector.h', '/opt/compiler-explorer/lua-5.4.7/bin/lua'])
    assert.ok(!isStudentFile(f), f);
  const gcc = "In file included from /usr/include/c++/13/vector:66,\n/usr/include/c++/13/bits/stl_vector.h:1125:7: error: something deep\nprog.cc:7:9: error: 'x' was not declared in this scope";
  assert.deepEqual(parseDiagnostics(gcc, 'cpp').map((d) => d.line), [7], 'the header line is not marked');
});

test('more formats: OCaml, PHP runtime, Perl, D, Crystal, Groovy, Node stack, Python indentation', () => {
  const cases = [
    ['File "example.ml", line 3, characters 8-9:\nError: Unbound value x', 3, 'Unknown name'],
    ['PHP Fatal error:  Uncaught DivisionByZeroError: Division by zero in /workspace/Main.php on line 4', 4, 'Division by zero'],
    ['Use of uninitialized value $x in addition (+) at prog.pl line 5.', 5, null],
    ['prog.d(6): Error: undefined identifier `y`', 6, 'Unknown name'],
    ['In prog.cr:2:3\n\n 2 | puts z\n       ^\nError: undefined local variable or method \'z\' for top-level', 2, 'Unknown name'],
    ['startup failed:\nprog.groovy: 3: unexpected token: } @ line 3, column 1.', 3, 'Syntax'],
    ['  File "<source>", line 3\n    print(1)\nIndentationError: unexpected indent', 3, 'Indentation'],
    ['Traceback (most recent call last):\n  File "<source>", line 1, in <module>\n    n = int(input())\nEOFError: EOF when reading a line', 1, 'Read past the input'],
    ['Exception in thread "main" java.util.NoSuchElementException\n\tat java.base/java.util.Scanner.throwFor(Scanner.java:945)\n\tat Main.main(Main.java:5)', 5, 'Read past the input'],
    ['prog.java:1: error: class Solution is public, should be declared in a file named Solution.java', 1, 'Java public class'],
    ['prog.cc:3:5: error: \'cout\' was not declared in this scope', 3, 'Missing import'],
    ['Traceback (most recent call last):\n  File "<source>", line 2, in f\nRecursionError: maximum recursion depth exceeded', 2, 'Recursion too deep'],
    ['prog.cc:5:1: warning: control reaches end of non-void function [-Wreturn-type]', 5, 'Missing return'],
  ];
  for (const [text, line, label] of cases) {
    const d = parseDiagnostics(text);
    assert.equal(d[0]?.line, line, text);
    assert.equal(d[0]?.hint?.label ?? null, label, text);
  }
  assert.equal(parseDiagnostics('prog.cc:5:1: warning: control reaches end of non-void function')[0].severity, 'warning');
});

test('an error with no line still gets "what it means"', () => {
  assert.equal(explainError(real.cpp.runtime.stderr)?.label, 'Index out of range');
  assert.equal(explainError('Floating point exception (core dumped)')?.label, 'Division by zero');
  assert.equal(explainError('Killed: out of memory')?.label, 'Out of memory');
  assert.equal(explainError('all good'), null);
});
