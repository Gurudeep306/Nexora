// The live syntax check (client/src/lib/syntaxCheck.ts): finds unclosed,
// extra and mismatched brackets, unclosed strings and Python's mixed
// indentation — and never cries wolf on brackets inside strings, comments,
// character literals, regex literals, raw strings or Lisp characters.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

let checkSyntax, formatCode, formatKind;
test.before(async () => {
  ({ checkSyntax, formatCode, formatKind } = await import(path.join(__dirname, '..', 'client', 'src', 'lib', 'syntaxCheck.ts')));
});
const first = (code, lang) => checkSyntax(code, lang)[0];
const clean = (code, lang) => assert.deepEqual(checkSyntax(code, lang), [], `${lang}: ${code}`);

test('an unclosed bracket is marked where it opens', () => {
  const d = first('int main() {\n  if (x) {\n    y();\n}\n', 'cpp');
  assert.equal(d.line, 1);
  assert.match(d.message, /brace \{ is never closed/);
  assert.equal(d.hint.label, 'Brackets');
});

test('an extra closing bracket, and one of the wrong kind', () => {
  assert.match(first('print(1))\n', 'python').message, /parenthesis \) has nothing to close/);
  const d = first('let a = [1, 2);\n', 'javascript');
  assert.equal(d.line, 1);
  assert.match(d.message, /closes the bracket \[ from line 1/);
});

test('an unclosed string is marked on its line', () => {
  const d = checkSyntax('x = 1\nprint("hello)\ny = 2\n', 'python').find((x) => /string/.test(x.message));
  assert.equal(d.line, 2);
  assert.equal(d.hint.label, 'String not closed');
  assert.ok(checkSyntax('const s = `a ${b}\n', 'javascript').some((x) => /template string/.test(x.message)));
});

test('Python: tabs and spaces mixed in the indentation', () => {
  const d = first('if x:\n    a = 1\n\tb = 2\n', 'python');
  assert.equal(d.line, 3);
  assert.equal(d.hint.label, 'Indentation');
  clean('if x:\n    a = 1\n    b = 2\n', 'python');
});

test('brackets inside strings, comments and characters are ignored', () => {
  clean('int main() { char c = \'{\'; printf("(%d]", 1); /* ) */ // }\n return 0; }\n', 'c');
  clean('s = "(" + \'[\'  # )\nprint(s)\n', 'python');
  clean('x = """\n(((\n"""\ny = 1\n', 'python');
  clean('String t = """\n  )]}\n  """;\n', 'java');
});

test('regex literals, template literals and raw strings', () => {
  clean('const r = /[(]/; const t = `${a.map((x) => x)}`; f(r, t)\n', 'javascript');
  clean('let a = x / y; let b = (a) / 2;\n', 'javascript');
  clean('fn f<\'a>(x: &\'a str) -> &\'a str { let r = r"(("; let q = r#"x"(y"#; x }\n', 'rust');
  clean('auto s = R"x(())))x"; int big = 1\'000\'000;\n', 'cpp');
  clean('var p = @"C:\\dir\\"""; var q = $"{x}";\n', 'csharp');
  clean('s := `raw (\n string`\nfmt.Println(s)\n', 'go');
});

test('each family: Lisp characters, Haskell operators, Lua long strings, Pascal comments', () => {
  clean('(print #\\( )\n', 'commonlisp');
  clean('(println \\( "x")\n', 'clojure');
  clean("main = print (x --> y)\n  where f x' = x' -- comment )\n", 'haskell');
  clean('local s = [[ ( ]] -- )\nprint(s)\n', 'lua');
  clean("begin { ) comment } writeln('it''s ('); end.\n", 'pascal');
  assert.match(first('(defun f (x)\n  (+ x 1)\n', 'commonlisp').message, /never closed/);
});

test('languages too irregular to scan safely are left alone', () => {
  assert.deepEqual(checkSyntax('case $x in\n a) echo "(";;\nesac\n', 'shell'), []);
  assert.deepEqual(checkSyntax('my @a = (1, 2;\n', 'perl'), []);
});

test('Format re-indents brace languages by their brackets, never inside strings or comments', () => {
  const messy = 'int main(){\nint n;\n  for(int i=0;i<n;i++){\nif(i){\nputs("{");\n}\n}\n/* a\n   comment */\nreturn 0;\n}';
  assert.equal(
    formatCode(messy, 'c'),
    'int main(){\n    int n;\n    for(int i=0;i<n;i++){\n        if(i){\n            puts("{");\n        }\n    }\n    /* a\n   comment */\n    return 0;\n}\n',
  );
  assert.equal(formatCode(formatCode(messy, 'c'), 'c'), formatCode(messy, 'c'), 'formatting twice changes nothing more');
});

test('Format: case bodies, Go tabs and gofmt-style cases, chains, preprocessor lines', () => {
  assert.equal(formatCode('switch(x){\ncase 1:\nf();\nbreak;\n}', 'java'), 'switch(x){\n    case 1:\n        f();\n        break;\n}\n');
  assert.equal(formatCode('func f() {\nswitch x {\ncase 1:\ng()\n}\n}', 'go'), 'func f() {\n\tswitch x {\n\tcase 1:\n\t\tg()\n\t}\n}\n');
  assert.equal(formatCode('a.stream()\n.map(x)\n.count();', 'java'), 'a.stream()\n    .map(x)\n    .count();\n');
  assert.equal(formatCode('int f(){\n  #define N 5\nreturn N;\n}', 'cpp'), 'int f(){\n#define N 5\n    return N;\n}\n');
});

test('Format leaves Python indentation alone and keeps text inside multi-line strings exactly', () => {
  assert.equal(formatKind('python'), 'trim');
  assert.equal(formatCode('if x:   \n        y = 1  \n\n\n', 'python'), 'if x:\n        y = 1\n');
  assert.equal(formatCode('s = """\nkeep   \n"""\n', 'python'), 's = """\nkeep   \n"""\n', 'trailing spaces inside the string stay');
  assert.equal(formatCode('s := `a\n  keep   \n`', 'go'), 's := `a\n  keep   \n`\n');
});
