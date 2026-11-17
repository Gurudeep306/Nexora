// Problem sources: every parser against fixtures shaped like the judges'
// real pages and APIs, the math rewrite, and the limits normalisation.
// (Live checks run from the admin page: Problem sources → Test.)
const test = require("node:test");
const assert = require("node:assert/strict");

const common = require("../src/sources/common");
const { mathify } = require("../src/sources/math");
const cf = require("../src/sources/codeforces");
const cc = require("../src/sources/codechef");
const ac = require("../src/sources/atcoder");
const lc = require("../src/sources/leetcode");
const spoj = require("../src/sources/spoj");
const euler = require("../src/sources/euler");
const cses = require("../src/sources/cses");
const dmoj = require("../src/sources/dmoj");
const timus = require("../src/sources/timus");
const kattis = require("../src/sources/kattis");
const uva = require("../src/sources/uva");
const { normalizeStatement } = require("../src/statement-media");

test("limits are normalised the same way for every judge", () => {
  assert.equal(common.normalizeTime("2 seconds"), "2 s");
  assert.equal(common.normalizeTime("1.00 s"), "1 s");
  assert.equal(common.normalizeTime("2500 ms"), "2.5 s");
  assert.equal(common.normalizeMemory("256 megabytes"), "256 MB");
  assert.equal(common.normalizeMemory("1024 MiB"), "1024 MB");
  assert.equal(common.normalizeMemory("262144 KB"), "256 MB");
  assert.equal(common.normalizeMemory("1 GB"), "1024 MB");
  assert.equal(common.tidySample("1 2  \r\n3\n\n"), "1 2\n3\n");
});

test("Codeforces: limits, sections and per-line sample blocks keep their newlines", () => {
  const html = `<div class="problem-statement">
    <div class="header"><div class="title">A. Watermelon</div>
      <div class="time-limit"><div class="property-title">time limit per test</div>1 second</div>
      <div class="memory-limit"><div class="property-title">memory limit per test</div>64 megabytes</div>
      <div class="input-file"><div class="property-title">input</div>standard input</div>
      <div class="output-file"><div class="property-title">output</div>standard output</div></div>
    <div><p>Pete and Billy bought a watermelon of $$$w$$$ kilos.</p></div>
    <div class="input-specification"><div class="section-title">Input</div><p>One integer $$$w$$$.</p></div>
    <div class="output-specification"><div class="section-title">Output</div><p>YES or NO.</p></div>
    <div class="sample-tests"><div class="section-title">Example</div><div class="sample-test">
      <div class="input"><div class="title">Input</div><pre><div class="test-example-line test-example-line-even test-example-line-0">2</div><div class="test-example-line test-example-line-odd test-example-line-1">8</div><div class="test-example-line test-example-line-odd test-example-line-1">1 2 3</div></pre></div>
      <div class="output"><div class="title">Output</div><pre>NO
YES
</pre></div></div></div>
    <div class="note"><div class="section-title">Note</div><p>Eight splits as 2 and 6.</p></div></div>`;
  const s = cf.parse(html);
  assert.equal(s.timeLimit, "1 s");
  assert.equal(s.memLimit, "64 MB");
  assert.deepEqual(s.samples, [{ input: "2\n8\n1 2 3\n", output: "NO\nYES\n" }]);
  assert.match(s.statement, /watermelon/);
  assert.doesNotMatch(s.statement, /time limit per test|sample-tests|Eight splits/);
  assert.match(s.inputSpec, /One integer/);
  assert.match(s.note, /Eight splits/);
  assert.equal(s.extra.interactive, undefined);
  assert.deepEqual(cf.splitId("1850G"), { contest: "1850", index: "G" });
  assert.deepEqual(cf.splitId("1912B1"), { contest: "1912", index: "B1" });
});

test("Codeforces: <br> line breaks and interactive problems", () => {
  const html = `<div class="problem-statement"><div class="header"><div class="time-limit"><div class="property-title">time limit per test</div>2 seconds</div></div>
    <div><p>Guess the number.</p></div><div><div class="section-title">Interaction</div><p>Ask queries.</p></div>
    <div class="sample-tests"><div class="sample-test"><div class="input"><pre>1<br>2<br></pre></div><div class="output"><pre>? 1<br>! 2</pre></div></div></div></div>`;
  const s = cf.parse(html);
  assert.deepEqual(s.samples, [{ input: "1\n2\n", output: "? 1\n! 2\n" }]);
  assert.equal(s.extra.interactive, true);
});

test("CodeChef: markdown components become HTML, math survives, explanations go to the note", () => {
  const s = cc.parse({
    status: "success",
    max_timelimit: "1",
    problemComponents: {
      statement: "Chef has $N$ apples and **likes** $a_i$ values.",
      inputFormat: "- The first line contains $T$.",
      outputFormat: "Print the answer.",
      constraints: "- $1 \\leq N \\leq 10^5$",
      sampleTestCases: [
        { id: 1, input: "2\n3\n4", output: "3\n4", explanation: "**Test 1:** easy.", isDeleted: false },
        { id: 2, input: "x", output: "y", isDeleted: true },
      ],
    },
  });
  assert.match(s.statement, /<strong>likes<\/strong>/);
  assert.match(s.statement, /\$a_i\$/, "TeX is not turned into italics");
  assert.match(s.statement, /Constraints/);
  assert.match(s.inputSpec, /<li>The first line contains \$T\$/);
  assert.deepEqual(s.samples, [{ input: "2\n3\n4\n", output: "3\n4\n" }]);
  assert.match(s.note, /Test 1:/);
  assert.equal(s.timeLimit, "1 s");
  assert.equal(s.memLimit, "", "CodeChef publishes no memory limit; never show the source-size limit as one");
  const html = normalizeStatement(s, { platform: "codechef" }).statement;
  assert.match(html, /\$\$\$a_i\$\$\$/);
  assert.match(normalizeStatement(s, { platform: "codechef" }).statement, /\$\$\$1 \\leq N \\leq 10\^5\$\$\$/);
});

test("CodeChef statements cached as raw markdown by the old scraper are rendered when served", () => {
  const out = normalizeStatement({ statement: "Find **max** of $x$.\n\n- one", inputSpec: '<div class="section-title">Input</div>The first line has $N$.', outputSpec: "", note: "" }, { platform: "codechef" });
  assert.match(out.statement, /<strong>max<\/strong>/);
  assert.match(out.statement, /\$\$\$x\$\$\$/);
  assert.match(out.inputSpec, /^<div class="section-title">Input<\/div><p>The first line has \$\$\$N\$\$\$/);
});

test("AtCoder: English section, MiB limits, numbered samples and <var> math", () => {
  const html = `<html><head><title>A - Sum</title></head><body><p>Time Limit: 2 sec / Memory Limit: 1024 MiB</p>
  <div id="task-statement"><span class="lang"><span class="lang-ja"><div class="part"><section><h3>問題文</h3><p>日本語</p></section></div></span>
  <span class="lang-en">
    <div class="part"><section><h3>Problem Statement</h3><p>Given <var>N</var> integers, print the sum.</p></section></div>
    <div class="part"><section><h3>Constraints</h3><ul><li><var>1 \\leq N \\leq 100</var></li></ul></section></div>
    <div class="io-style"><div class="part"><section><h3>Input</h3><pre><var>N</var></pre></section></div>
    <div class="part"><section><h3>Output</h3><p>Print the sum.</p></section></div></div>
    <div class="part"><section><h3>Sample Input 1</h3><pre id="pre-sample0">3
1 2 3
</pre></section></div>
    <div class="part"><section><h3>Sample Output 1</h3><pre id="pre-sample1">6
</pre><p>1+2+3 = 6.</p></section></div>
    <div class="part"><section><h3>Sample Input 2</h3><pre>1
5
</pre></section></div>
    <div class="part"><section><h3>Sample Output 2</h3><pre>5
</pre></section></div>
  </span></span></div></body></html>`;
  const s = ac.parse(html);
  assert.equal(s.timeLimit, "2 s");
  assert.equal(s.memLimit, "1024 MB");
  assert.deepEqual(s.samples, [
    { input: "3\n1 2 3\n", output: "6\n" },
    { input: "1\n5\n", output: "5\n" },
  ]);
  assert.doesNotMatch(s.statement, /日本語/);
  assert.match(s.statement, /Constraints/);
  assert.match(s.note, /1\+2\+3 = 6/);
  const norm = normalizeStatement(s, { platform: "atcoder" });
  assert.match(norm.statement, /\$\$\$1 \\leq N \\leq 100\$\$\$/);
  // The input format is <pre><var>N \ K</var></pre> on AtCoder: <var> is always maths
  // (samples never use it), so it is rendered there too, never shown as raw TeX.
  assert.match(norm.inputSpec, /<pre>\$\$\$N\$\$\$<\/pre>/, "<var> inside the input-format <pre> becomes a formula");
  const fmt = normalizeStatement({ statement: '', inputSpec: '<pre><var>A_1 \\ A_2 \\ \\dots</var>\n1 $x$ 2</pre>', outputSpec: '', note: '' }, { platform: "atcoder" });
  assert.equal(fmt.inputSpec, '<pre>$$$A_1 \\ A_2 \\ \\dots$$$\n1 $x$ 2</pre>', "only <var> changes: other text in <pre> is data");
});

test("AtCoder: difficulty uses AtCoder Problems' display formula, no invented tags", () => {
  assert.equal(ac.displayDifficulty(1500), 1500);
  assert.equal(ac.displayDifficulty(400), 400);
  assert.equal(ac.displayDifficulty(0), Math.round(400 / Math.E));
  assert.ok(ac.displayDifficulty(-1000) >= 1);
  assert.equal(ac.displayDifficulty(undefined), 0);
});

test("LeetCode: examples in both the old <pre> and the new example-block layouts", () => {
  const old = lc.examples(`<p><strong>Example 1:</strong></p><pre><strong>Input:</strong> nums = [2,7,11,15], target = 9
<strong>Output:</strong> [0,1]
<strong>Explanation:</strong> Because nums[0] + nums[1] == 9.</pre>`);
  assert.deepEqual(old, [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9." }]);
  const neu = lc.examples(`<div class="example-block"><p><strong>Input:</strong> <span class="example-io">s = "abc"</span></p><p><strong>Output:</strong> <span class="example-io">3</span></p></div>`);
  assert.deepEqual(neu, [{ input: 's = "abc"', output: "3", explanation: "" }]);
});

test("SPOJ: list rows with classed cells and bold titles; labelled and split samples; limits", () => {
  const list = spoj.parseList(`<table class="problems"><tbody>
  <tr class="problemrow"><td class="text-center">1</td><td class="text-left"><a href="/problems/TEST/" title="Life"><b>Life, the Universe, and Everything</b></a></td><td class="text-center"><a href="/ranks/TEST/">x</a></td><td class="text-center"><a href="/ranks/TEST/">118123</a></td></tr>
  <tr class="problemrow"><td>2</td><td><a href="/problems/PRIME1/">Prime Generator</a></td><td></td><td>40,000</td></tr></tbody></table>`);
  assert.deepEqual(
    list.map((r) => [r.problem_id, r.title, r.url]),
    [
      ["TEST", "Life, the Universe, and Everything", "https://www.spoj.com/problems/TEST/"],
      ["PRIME1", "Prime Generator", "https://www.spoj.com/problems/PRIME1/"],
    ],
  );
  const s = spoj.parse(`<table id="problem-meta"><tr><td>Time limit:</td><td>6s</td></tr><tr><td>Memory limit:</td><td>1536MB</td></tr></table>
  <div id="problem-body"><p>Generate primes.</p><h3>Example</h3><pre><b>Input:</b>
2
1 10
3 5

<b>Output:</b>
2
3
5
7

3
5</pre></div><div id="problem-tags"><a href="/problems/tag/number-theory">#number-theory</a></div>`);
  assert.deepEqual(s.samples, [{ input: "2\n1 10\n3 5\n", output: "2\n3\n5\n7\n\n3\n5\n" }]);
  assert.equal(s.timeLimit, "6 s");
  assert.equal(s.memLimit, "1536 MB");
  assert.deepEqual(s.extra.tags, ["number-theory"]);
});

test("Project Euler: minimal list skips the header and rates by solver count", () => {
  const rows = euler.parseList("ID##Description##Published##Solved By##Solved Status\n1##Multiples of 3 or 5##Fri, 5 Oct 2001##1000000##0\n900##Hard one##Sun, 1 Jan 2026##90##0\n");
  assert.equal(rows.length, 2);
  assert.deepEqual([rows[0].problem_id, rows[0].title, rows[0].url], ["PE1", "Multiples of 3 or 5", "https://projecteuler.net/problem=1"]);
  assert.ok(rows[0].rating < rows[1].rating);
  assert.equal(euler.ratingFromSolvers(1_000_000), 800);
});

test("CSES: sections from the list, limits, input/output split and multiple examples", () => {
  const list = cses.parseList(`<div class="content"><h2>General</h2><ul class="task-list"><li class="link"><a href="/problemset/list/">Statistics</a></li></ul>
  <h2>Introductory Problems</h2><ul class="task-list"><li class="task"><a href="/problemset/task/1068">Weird Algorithm</a><span class="detail">100000 / 120000</span></li></ul>
  <h2>Dynamic Programming</h2><ul class="task-list"><li class="task"><a href="/problemset/task/1633">Dice Combinations</a></li></ul></div>`);
  assert.deepEqual(
    list.map((r) => [r.problem_id, r.title, r.category]),
    [
      ["CSES1068", "Weird Algorithm", "Introductory Problems"],
      ["CSES1633", "Dice Combinations", "Dynamic Programming"],
    ],
  );
  const s = cses.parse(`<ul class="task-constraints"><li><b>Time limit:</b> 1.00 s</li><li><b>Memory limit:</b> 512 MB</li></ul>
  <div class="content"><div class="md"><p>Consider an algorithm that takes as input <span class="math inline">\\(n\\)</span>.</p>
  <h1 id="input">Input</h1><p>The only input line contains <span class="math inline">\\(n\\)</span>.</p>
  <h1 id="output">Output</h1><p>Print a line.</p>
  <h1 id="constraints">Constraints</h1><ul><li><span class="math inline">\\(1 \\le n \\le 10^6\\)</span></li></ul>
  <h1 id="example">Example</h1><p>Input:</p><pre>3
</pre><p>Output:</p><pre>3 10 5 16 8 4 2 1
</pre></div></div>`);
  assert.equal(s.timeLimit, "1 s");
  assert.equal(s.memLimit, "512 MB");
  assert.deepEqual(s.samples, [{ input: "3\n", output: "3 10 5 16 8 4 2 1\n" }]);
  assert.match(s.inputSpec, /only input line/);
  assert.match(s.statement, /Constraints/);
  assert.match(normalizeStatement(s, { platform: "cses" }).statement, /\$\$\$1 \\le n \\le 10\^6\$\$\$/);
});

test("DMOJ: numbered samples from headings and tilde math", () => {
  const s = dmoj.parse(`<div class="content-description"><p>Add <span class="inline-math"><img class="tex-image" src="x.svg"><span class="tex-text" style="display:none">~a+b~</span></span>.</p>
  <h4>Sample Input 1</h4><pre><code>1 2
</code></pre><h4>Sample Output 1</h4><pre><code>3
</code></pre><h4>Sample Input 2</h4><div class="codehilite"><pre>5 5</pre></div><h4>Sample Output 2</h4><pre>10</pre></div>`);
  assert.deepEqual(s.samples, [
    { input: "1 2\n", output: "3\n" },
    { input: "5 5\n", output: "10\n" },
  ]);
  assert.match(normalizeStatement(s, { platform: "dmoj" }).statement, /\$\$\$a\+b\$\$\$/);
  assert.equal(dmoj.ratingFromPoints(3), 800);
  assert.ok(dmoj.ratingFromPoints(50) <= 3500);
});

test("Timus: archive rows, limits and the sample table", () => {
  const rows = timus.parseList(`<table class="problemset"><tr class="content"><td></td><td>1000</td><td class="name"><a href="problem.aspx?space=1&amp;num=1000">A+B Problem</a></td><td>x</td><td>130000</td><td>33</td></tr></table>`);
  assert.deepEqual([rows[0].problem_id, rows[0].title], ["T1000", "A+B Problem"]);
  const s = timus.parse(`<div class="problem_content"><div class="problem_limits">Time limit: 1.0 second<br>Memory limit: 64 MB</div>
  <div id="problem_text"><p>Calculate a + b.</p><table class="sample"><tr><th>input</th><th>output</th></tr><tr><td><pre class="intable">1 5</pre></td><td><pre class="intable">6</pre></td></tr></table></div></div>`);
  assert.equal(s.timeLimit, "1 s");
  assert.equal(s.memLimit, "64 MB");
  assert.deepEqual(s.samples, [{ input: "1 5\n", output: "6\n" }]);
  assert.doesNotMatch(s.statement, /intable/);
});

test("Kattis: sample tables and limits", () => {
  const s = kattis.parse(`<div class="problembody"><p>Say hello.</p><table class="sample"><tbody><tr><th>Sample Input 1</th><th>Sample Output 1</th></tr><tr><td><pre>
</pre></td><td><pre>Hello World!
</pre></td></tr></tbody></table></div><div class="metadata">CPU Time limit 1 second Memory limit 1024 MB</div>`);
  assert.deepEqual(s.samples, [{ input: "", output: "Hello World!\n" }]);
  assert.equal(s.timeLimit, "1 s");
  assert.equal(s.memLimit, "1024 MB");
});

test("UVa: samples from titled <pre> blocks", () => {
  const s = uva.parse(`<html><body><h1>100 - The 3n + 1 problem</h1><p>Consider…</p><h2>Sample Input</h2><pre>1 10
100 200
</pre><h2>Sample Output</h2><pre>1 10 20
100 200 125
</pre></body></html>`);
  assert.deepEqual(s.samples, [{ input: "1 10\n100 200\n", output: "1 10 20\n100 200 125\n" }]);
  assert.ok(uva.ratingFromAcceptedUsers(50000) < uva.ratingFromAcceptedUsers(50));
});

test("math rewrite: every judge's notation, never inside code, prices stay text", () => {
  assert.equal(mathify("<p>$a_i$ and $$x^2$$</p>", "dollar"), "<p>$$$a_i$$$ and $$$$$$x^2$$$$$$</p>");
  assert.equal(mathify("<p>It costs $5 and $10.</p>", "dollar"), "<p>It costs $5 and $10.</p>");
  assert.equal(mathify("<pre>$x$</pre><code>$y$</code>", "dollar"), "<pre>$x$</pre><code>$y$</code>");
  assert.equal(mathify("<p>\\(n &lt; 5\\)</p>", "paren"), "<p>$$$n &lt; 5$$$</p>");
  assert.equal(mathify("<p><var>N</var></p>", "var"), "<p>$$$N$$$</p>");
  assert.equal(mathify("<p>$$$x$$$</p>", "dollar3"), "<p>$$$x$$$</p>");
});

test("every source module has the shape the registry expects", () => {
  const { SOURCES, MODULES } = require("../src/sources");
  assert.equal(MODULES.length, 11);
  for (const id of MODULES) {
    const m = SOURCES[id];
    assert.equal(m.id, id);
    assert.equal(typeof m.list, "function", id);
    assert.equal(typeof m.statement, "function", id);
    assert.ok(m.name && m.origin && m.description, id);
    assert.ok(["stdin", "function", "answer"].includes(m.kind), id);
  }
});

test('CodeChef tags keep topics only (no author handles, contest codes or difficulty words)', () => {
  const { topicTags } = require('../src/sources/codechef');
  assert.deepEqual(topicTags(['cakewalk', 'iceknight1093', 'start187', 'Greedy', 'dp', 'cook142', '2d arrays', 'bfs', 'Greedy'], ['someone']), ['Greedy', 'dp', '2d arrays', 'bfs']);
  assert.deepEqual(topicTags(['Math', 'tourist'], ['tourist']), ['Math']);
});

test('a bot-check page is reported as a block, not a bare HTTP error', async () => {
  const { httpError } = require('../src/sources/common');
  const res = (status, body, headers = {}) => ({ status, headers: new Headers(headers), text: async () => body });
  const blocked = await httpError(res(403, '<title>Just a moment...</title>'), 'https://www.spoj.com/problems/x/');
  assert.equal(blocked.blocked, true);
  assert.match(blocked.message, /www\.spoj\.com blocks automated access/);
  const cf = await httpError(res(403, '', { 'cf-mitigated': 'challenge' }), 'https://dmoj.ca/problem/a');
  assert.equal(cf.blocked, true);
  const plain = await httpError(res(404, 'not here'), 'https://cses.fi/x');
  assert.equal(plain.blocked, false);
  assert.equal(plain.message, 'HTTP 404 from cses.fi');
});

test("CSES's pandoc maths spans become formulas (they showed as raw TeX)", () => {
  const { mathify } = require("../src/sources/math");
  const html = '<p>For <span class="math math-inline">n=3</span>:</p><span class="math math-display"> 3 \\rightarrow 10 </span><ul><li><span class="math math-inline">1 \\le n \\le 10^6</span></li></ul><pre>$ not maths</pre>';
  assert.equal(
    mathify(html, "paren"),
    '<p>For $$$n=3$$$:</p>$$$$$$3 \\rightarrow 10$$$$$$<ul><li>$$$1 \\le n \\le 10^6$$$</li></ul><pre>$ not maths</pre>',
  );
});

test("Kattis formulas wrapped over lines and Euler's \"$\\operatorname{OP}$s\" render; prices stay text", () => {
  const { mathify } = require("../src/sources/math");
  assert.equal(mathify('<span class="tex2jax_process">$(x_i,\n    y_i)$</span>', "dollar"), '<span class="tex2jax_process">$$$(x_i, y_i)$$$</span>');
  assert.equal(mathify("the $\\operatorname{OP}$s and the $k$th term", "dollar"), "the $$$\\operatorname{OP}$$$s and the $$$k$$$th term");
  assert.equal(mathify("<p>It costs $5 and $10.</p>", "dollar"), "<p>It costs $5 and $10.</p>");
  assert.equal(mathify("<p>$5-$10</p>", "dollar"), "<p>$5-$10</p>");
});
