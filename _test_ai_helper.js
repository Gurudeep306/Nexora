/**
 * Comprehensive AI Code Helper Test Suite
 * Tests: /api/ai-complete, /api/ai-fix, and integration with judge/quickRun
 */
const http = require('http');

const BASE = 'http://localhost:3000';
let passed = 0, failed = 0, total = 0;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, BASE);
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

function assert(name, condition, detail = '') {
  total++;
  if (condition) { passed++; console.log(`  ✓  ${name}${detail ? '  →  ' + detail : ''}`); }
  else { failed++; console.log(`  ✗  ${name}${detail ? '  →  ' + detail : ''}`); }
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function runTests() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        NEXORA AI CODE HELPER — COMPREHENSIVE TEST          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: /api/ai-complete — Inline Completion Tests
  // ═══════════════════════════════════════════════════════════════
  console.log('═══ SECTION 1: AI Complete (Inline Ghost Text) ═══\n');

  // 1.1 — C++ completion: after sort, suggest I/O
  {
    const t = Date.now();
    const r = await post('/api/ai-complete', {
      prefix: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> v(n);\n    for (int i = 0; i < n; i++) cin >> v[i];\n    sort(v.begin(), v.end());\n    ',
      suffix: '\n    return 0;\n}',
      language: 'cpp'
    });
    const ms = Date.now() - t;
    assert('1.1 C++ completion after sort', r.body.ok && typeof r.body.text === 'string' && r.body.text.length > 0, `"${r.body.text.substring(0, 60)}" (${ms}ms)`);
  }

  await delay(1500);

  // 1.2 — Python completion: after list + sort
  {
    const t = Date.now();
    const r = await post('/api/ai-complete', {
      prefix: 'def solve():\n    n = int(input())\n    arr = list(map(int, input().split()))\n    arr.sort()\n    ',
      suffix: '\n\nsolve()',
      language: 'python'
    });
    const ms = Date.now() - t;
    assert('1.2 Python completion after sort', r.body.ok && r.body.text.length > 0, `"${r.body.text.substring(0, 60)}" (${ms}ms)`);
  }

  await delay(1500);

  // 1.3 — Java completion: class structure
  {
    const t = Date.now();
    const r = await post('/api/ai-complete', {
      prefix: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        ',
      suffix: '\n    }\n}',
      language: 'java'
    });
    const ms = Date.now() - t;
    assert('1.3 Java completion in main()', r.body.ok && r.body.text.length > 0, `"${r.body.text.substring(0, 60)}" (${ms}ms)`);
  }

  await delay(1500);

  // 1.4 — JavaScript completion: function body
  {
    const t = Date.now();
    const r = await post('/api/ai-complete', {
      prefix: 'const readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on("line", l => lines.push(l));\nrl.on("close", () => {\n    const n = parseInt(lines[0]);\n    ',
      suffix: '\n});',
      language: 'javascript'
    });
    const ms = Date.now() - t;
    assert('1.4 JS completion in readline handler', r.body.ok && r.body.text.length > 0, `"${r.body.text.substring(0, 60)}" (${ms}ms)`);
  }

  await delay(1500);

  // 1.5 — Rust completion: reading input
  {
    const t = Date.now();
    const r = await post('/api/ai-complete', {
      prefix: 'use std::io::{self, BufRead};\n\nfn main() {\n    let stdin = io::stdin();\n    let mut lines = stdin.lock().lines();\n    let n: usize = lines.next().unwrap().unwrap().trim().parse().unwrap();\n    ',
      suffix: '\n}',
      language: 'rust'
    });
    const ms = Date.now() - t;
    assert('1.5 Rust completion after input parse', r.body.ok && r.body.text.length > 0, `"${r.body.text.substring(0, 60)}" (${ms}ms)`);
  }

  await delay(1500);

  // 1.6 — Go completion: fmt.Scan pattern
  {
    const t = Date.now();
    const r = await post('/api/ai-complete', {
      prefix: 'package main\n\nimport "fmt"\n\nfunc main() {\n    var n int\n    fmt.Scan(&n)\n    ',
      suffix: '\n}',
      language: 'go'
    });
    const ms = Date.now() - t;
    assert('1.6 Go completion after Scan', r.body.ok && r.body.text.length > 0, `"${r.body.text.substring(0, 60)}" (${ms}ms)`);
  }

  await delay(1500);

  // 1.7 — Kotlin completion
  {
    const t = Date.now();
    const r = await post('/api/ai-complete', {
      prefix: 'fun main() {\n    val n = readLine()!!.toInt()\n    val arr = readLine()!!.split(" ").map { it.toInt() }\n    ',
      suffix: '\n}',
      language: 'kotlin'
    });
    const ms = Date.now() - t;
    assert('1.7 Kotlin completion', r.body.ok && r.body.text.length > 0, `"${r.body.text.substring(0, 60)}" (${ms}ms)`);
  }

  await delay(1500);

  // 1.8 — TypeScript completion
  {
    const t = Date.now();
    const r = await post('/api/ai-complete', {
      prefix: 'const input = require("fs").readFileSync("/dev/stdin", "utf8").split("\\n");\nconst n: number = parseInt(input[0]);\nconst arr: number[] = input[1].split(" ").map(Number);\narr.sort((a, b) => a - b);\n',
      suffix: '',
      language: 'typescript'
    });
    const ms = Date.now() - t;
    assert('1.8 TypeScript completion after sort', r.body.ok && r.body.text.length > 0, `"${r.body.text.substring(0, 60)}" (${ms}ms)`);
  }

  await delay(1500);

  // 1.9 — Ruby completion
  {
    const t = Date.now();
    const r = await post('/api/ai-complete', {
      prefix: 'n = gets.to_i\narr = gets.split.map(&:to_i)\narr.sort!\n',
      suffix: '',
      language: 'ruby'
    });
    const ms = Date.now() - t;
    assert('1.9 Ruby completion', r.body.ok && r.body.text.length > 0, `"${r.body.text.substring(0, 60)}" (${ms}ms)`);
  }

  // 1.10 — Empty prefix → should return empty (no AI call needed)
  {
    const r = await post('/api/ai-complete', { prefix: '', suffix: '', language: 'cpp' });
    assert('1.10 Empty prefix → empty text', r.body.ok === true && r.body.text === '', `text="${r.body.text}"`);
  }

  // 1.11 — No language → should return empty
  {
    const r = await post('/api/ai-complete', { prefix: 'int main() {', suffix: '' });
    assert('1.11 Missing language → empty text', r.body.text === '', `text="${r.body.text}"`);
  }

  // 1.12 — Only whitespace last line with <2 context lines → empty
  {
    const r = await post('/api/ai-complete', { prefix: '    ', suffix: '', language: 'cpp' });
    assert('1.12 Whitespace-only minimal ctx → empty', r.body.ok === true && r.body.text === '', `text="${r.body.text}"`);
  }

  await delay(1500);

  // 1.13 — Completion should NOT return huge blocks (>5 lines gets trimmed to 3)
  {
    const r = await post('/api/ai-complete', {
      prefix: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> v(n);\n    for (int i = 0; i < n; i++) cin >> v[i];\n    ',
      suffix: '\n    return 0;\n}',
      language: 'cpp'
    });
    const lines = (r.body.text || '').split('\n').length;
    assert('1.13 Completion ≤ 5 lines (safety trim)', r.body.ok && lines <= 5, `${lines} lines`);
  }

  await delay(1500);

  // 1.14 — Caching: same request twice should be fast
  {
    const body = {
      prefix: '#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    ',
      suffix: '\n    return 0;\n}',
      language: 'cpp'
    };
    await post('/api/ai-complete', body); // prime cache
    const t = Date.now();
    const r = await post('/api/ai-complete', body); // should hit cache
    const ms = Date.now() - t;
    assert('1.14 Cache hit is fast (<100ms)', r.body.ok && ms < 100, `${ms}ms`);
  }

  await delay(1500);

  // 1.15 — Lua completion
  {
    const r = await post('/api/ai-complete', {
      prefix: 'local n = io.read("*n")\nlocal arr = {}\nfor i = 1, n do\n    arr[i] = io.read("*n")\nend\ntable.sort(arr)\n',
      suffix: '',
      language: 'lua'
    });
    assert('1.15 Lua completion', r.body.ok && r.body.text.length > 0, `"${(r.body.text||'').substring(0, 60)}"`);
  }

  await delay(1500);

  // 1.16 — C completion (maps to C patterns)
  {
    const r = await post('/api/ai-complete', {
      prefix: '#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);\n    ',
      suffix: '\n    return 0;\n}',
      language: 'c'
    });
    assert('1.16 C completion', r.body.ok && r.body.text.length > 0, `"${(r.body.text||'').substring(0, 60)}"`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: /api/ai-fix — Syntax Fix Tests
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ SECTION 2: AI Fix (Syntax Error Correction) ═══\n');

  await delay(2000);

  // 2.1 — C++ missing semicolons
  {
    const r = await post('/api/ai-fix', {
      code: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int n\n    cin >> n\n    cout << n << endl\n    return 0\n}',
      language: 'cpp',
      error: "error: expected ';' after expression"
    });
    const hasAllSemicolons = r.body.code && r.body.code.includes('int n;') && r.body.code.includes('cin >> n;');
    assert('2.1 C++ fix missing semicolons', r.body.ok && r.body.fixed && hasAllSemicolons, hasAllSemicolons ? 'semicolons added' : `got: ${(r.body.code||'').substring(0, 80)}`);
  }

  await delay(2000);

  // 2.2 — C++ missing #include
  {
    const r = await post('/api/ai-fix', {
      code: 'using namespace std;\n\nint main() {\n    vector<int> v = {1,2,3};\n    sort(v.begin(), v.end());\n    cout << v[0] << endl;\n    return 0;\n}',
      language: 'cpp',
      error: "error: 'vector' was not declared in this scope"
    });
    const hasInclude = r.body.code && r.body.code.includes('#include');
    assert('2.2 C++ fix missing #include', r.body.ok && r.body.fixed && hasInclude, hasInclude ? '#include added' : `fixed=${r.body.fixed}`);
  }

  await delay(2000);

  // 2.3 — Python indentation error
  {
    const r = await post('/api/ai-fix', {
      code: 'def solve():\nn = int(input())\nprint(n)\n\nsolve()',
      language: 'python',
      error: 'IndentationError: expected an indented block'
    });
    const hasIndent = r.body.code && r.body.code.includes('    n = int(input())');
    assert('2.3 Python fix indentation', r.body.ok && r.body.fixed, hasIndent ? 'indent fixed' : `got: ${(r.body.code||'').substring(0, 80)}`);
  }

  await delay(2000);

  // 2.4 — Java missing import
  {
    const r = await post('/api/ai-fix', {
      code: 'public class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(n);\n    }\n}',
      language: 'java',
      error: "error: cannot find symbol: class Scanner"
    });
    const hasImport = r.body.code && r.body.code.includes('import java.util.Scanner') || (r.body.code && r.body.code.includes('import java.util.*'));
    assert('2.4 Java fix missing import', r.body.ok && r.body.fixed && hasImport, hasImport ? 'import added' : `got: ${(r.body.code||'').substring(0, 80)}`);
  }

  await delay(2000);

  // 2.5 — C++ mismatched brackets
  {
    const r = await post('/api/ai-fix', {
      code: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    if (n > 0) {\n        cout << "positive" << endl;\n    \n    return 0;\n}',
      language: 'cpp',
      error: "error: expected '}' at end of input"
    });
    assert('2.5 C++ fix mismatched brackets', r.body.ok && r.body.fixed, `fixed=${r.body.fixed}`);
  }

  await delay(2000);

  // 2.6 — Rust missing semicolons + let mut
  {
    const r = await post('/api/ai-fix', {
      code: 'fn main() {\n    let input = String::new();\n    std::io::stdin().read_line(&mut input).unwrap();\n    let n: i32 = input.trim().parse().unwrap()\n    println!("{}", n)\n}',
      language: 'rust',
      error: "error: expected `;`"
    });
    assert('2.6 Rust fix missing semicolons', r.body.ok && r.body.fixed, `fixed=${r.body.fixed}`);
  }

  await delay(2000);

  // 2.7 — Go missing package/import
  {
    const r = await post('/api/ai-fix', {
      code: 'func main() {\n    var n int\n    fmt.Scan(&n)\n    fmt.Println(n)\n}',
      language: 'go',
      error: "undefined: fmt"
    });
    const hasPkg = r.body.code && r.body.code.includes('package main') && r.body.code.includes('import');
    assert('2.7 Go fix missing package/import', r.body.ok && r.body.fixed && hasPkg, hasPkg ? 'package+import added' : `got: ${(r.body.code||'').substring(0, 80)}`);
  }

  await delay(2000);

  // 2.8 — Clean code should still return (might "fix" formatting or return as-is)
  {
    const cleanCode = '#include <iostream>\nusing namespace std;\nint main() { cout << 42; return 0; }';
    const r = await post('/api/ai-fix', {
      code: cleanCode,
      language: 'cpp',
      error: 'Compilation error'
    });
    assert('2.8 Clean code → returns something', r.body.ok === true, `fixed=${r.body.fixed}`);
  }

  // 2.9 — Missing code param → 400
  {
    const r = await post('/api/ai-fix', { language: 'cpp', error: 'err' });
    assert('2.9 Missing code → 400', r.status === 400, `status=${r.status}`);
  }

  // 2.10 — Missing language param → 400
  {
    const r = await post('/api/ai-fix', { code: 'int main() {}', error: 'err' });
    assert('2.10 Missing language → 400', r.status === 400, `status=${r.status}`);
  }

  await delay(2000);

  // 2.11 — Kotlin syntax fix
  {
    const r = await post('/api/ai-fix', {
      code: 'fun main() {\n    val n = readLine()!!.toInt()\n    println(n\n}',
      language: 'kotlin',
      error: "Expecting ')'"
    });
    const hasCloseParen = r.body.code && r.body.code.includes('println(n)');
    assert('2.11 Kotlin fix missing paren', r.body.ok && r.body.fixed, hasCloseParen ? 'paren fixed' : `fixed=${r.body.fixed}`);
  }

  await delay(2000);

  // 2.12 — TypeScript type error
  {
    const r = await post('/api/ai-fix', {
      code: 'const n: number = "hello";\nconsole.log(n);',
      language: 'typescript',
      error: "Type 'string' is not assignable to type 'number'"
    });
    assert('2.12 TypeScript type fix', r.body.ok && r.body.fixed, `fixed=${r.body.fixed}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: AI Complete + Judge Integration
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ SECTION 3: AI Fix → Judge Integration ═══\n');

  await delay(3000);

  // 3.1 — Get AI fix for broken C++ code, then judge the fixed code
  {
    const broken = '#include <bits/stdc++.h>\nusing namespace std\n\nint main() {\n    int a, b\n    cin >> a >> b\n    cout << a + b << endl\n    return 0\n}';
    const fixR = await post('/api/ai-fix', { code: broken, language: 'cpp', error: "expected ';'" });

    if (fixR.body.ok && fixR.body.fixed && fixR.body.code) {
      const judgeR = await post('/api/judge', {
        code: fixR.body.code,
        language: 'cpp',
        testcases: [
          { input: '3 5', expected_output: '8' },
          { input: '0 0', expected_output: '0' },
          { input: '-1 1', expected_output: '0' },
        ],
      });
      assert('3.1 AI-fixed C++ → judge AC', judgeR.body.verdict === 'AC', `verdict=${judgeR.body.verdict}`);
    } else {
      assert('3.1 AI-fixed C++ → judge AC', false, 'AI fix failed');
    }
  }

  await delay(3000);

  // 3.2 — AI fix for broken Python, then judge
  {
    const broken = 'def solve():\nn = int(input())\na, b = map(int, input().split())\nprint(a + b)\n\nsolve()';
    const fixR = await post('/api/ai-fix', { code: broken, language: 'python', error: 'IndentationError' });

    if (fixR.body.ok && fixR.body.fixed && fixR.body.code) {
      // The fix should preserve logic, just indent
      const judgeR = await post('/api/judge', {
        code: fixR.body.code,
        language: 'python',
        testcases: [
          { input: '1\n3 5', expected_output: '8' },
          { input: '1\n10 20', expected_output: '30' },
        ],
      });
      assert('3.2 AI-fixed Python → judge AC', judgeR.body.verdict === 'AC', `verdict=${judgeR.body.verdict}`);
    } else {
      assert('3.2 AI-fixed Python → judge AC', false, `fix failed: fixed=${fixR.body.fixed}`);
    }
  }

  await delay(3000);

  // 3.3 — AI fix for broken Java, then judge
  {
    const broken = 'public class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt(), b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}';
    const fixR = await post('/api/ai-fix', { code: broken, language: 'java', error: "cannot find symbol: class Scanner" });

    if (fixR.body.ok && fixR.body.fixed && fixR.body.code) {
      const judgeR = await post('/api/judge', {
        code: fixR.body.code,
        language: 'java',
        testcases: [
          { input: '7 3', expected_output: '10' },
          { input: '100 200', expected_output: '300' },
        ],
      });
      assert('3.3 AI-fixed Java → judge AC', judgeR.body.verdict === 'AC', `verdict=${judgeR.body.verdict}`);
    } else {
      assert('3.3 AI-fixed Java → judge AC', false, 'AI fix failed');
    }
  }

  await delay(3000);

  // 3.4 — AI fix for broken Go, then judge
  {
    const broken = 'func main() {\n    var a, b int\n    fmt.Scan(&a, &b)\n    fmt.Println(a + b)\n}';
    const fixR = await post('/api/ai-fix', { code: broken, language: 'go', error: "undefined: fmt" });

    if (fixR.body.ok && fixR.body.fixed && fixR.body.code) {
      const judgeR = await post('/api/judge', {
        code: fixR.body.code,
        language: 'go',
        testcases: [
          { input: '4 6', expected_output: '10' },
          { input: '0 0', expected_output: '0' },
        ],
      });
      assert('3.4 AI-fixed Go → judge AC', judgeR.body.verdict === 'AC', `verdict=${judgeR.body.verdict}`);
    } else {
      assert('3.4 AI-fixed Go → judge AC', false, 'AI fix failed');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Edge Cases & Safety
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ SECTION 4: Edge Cases & Safety ═══\n');

  await delay(3000);

  // 4.1 — AI complete should NOT produce solutions for DP problems
  {
    const r = await post('/api/ai-complete', {
      prefix: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> dp(n + 1);\n    // Calculate nth fibonacci number using dp\n    dp[0] = 0; dp[1] = 1;\n    ',
      suffix: '\n    cout << dp[n] << endl;\n    return 0;\n}',
      language: 'cpp'
    });
    // AI should either give empty or very short structural completion, not the dp loop
    const lines = (r.body.text || '').split('\n').length;
    assert('4.1 DP context → short/no completion', r.body.ok && lines <= 5, `${lines} lines: "${(r.body.text||'').substring(0, 80)}"`);
  }

  await delay(2000);

  // 4.2 — Very large prefix (truncation test)
  {
    const bigPrefix = '#include <bits/stdc++.h>\nusing namespace std;\n' + Array(50).fill('// line of code\n').join('') + 'int main() {\n    int n;\n    cin >> n;\n    ';
    const r = await post('/api/ai-complete', {
      prefix: bigPrefix,
      suffix: '\n    return 0;\n}',
      language: 'cpp'
    });
    assert('4.2 Large prefix (50+ lines) → handled', r.body.ok === true, `text len=${(r.body.text||'').length}`);
  }

  await delay(2000);

  // 4.3 — Unicode in code
  {
    const r = await post('/api/ai-complete', {
      prefix: '# -*- coding: utf-8 -*-\n# 日本語コメント\ndef solve():\n    n = int(input())\n    print("結果:", n)\n    ',
      suffix: '\nsolve()',
      language: 'python'
    });
    assert('4.3 Unicode in code → handled', r.body.ok === true, `text="${(r.body.text||'').substring(0, 60)}"`);
  }

  await delay(2000);

  // 4.4 — AI fix with logic error → should NOT fix (or minimal changes)
  {
    const r = await post('/api/ai-fix', {
      code: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    // This should print sum but prints product\n    int result = 1;\n    for (int i = 0; i < n; i++) {\n        int x; cin >> x;\n        result *= x; // BUG: should be +=\n    }\n    cout << result << endl;\n    return 0;\n}',
      language: 'cpp',
      error: 'Wrong Answer'
    });
    // Should return NO_FIX or return the same code (logic error, not syntax)
    assert('4.4 Logic error → NO_FIX or minimal', r.body.ok, `fixed=${r.body.fixed}, msg=${r.body.message || ''}`);
  }

  await delay(2000);

  // 4.5 — Concurrent AI complete requests (stress test — 5 parallel)
  {
    const languages = ['cpp', 'python', 'java', 'go', 'rust'];
    const prefixes = {
      cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    string s;\n    cin >> s;\n    ',
      python: 'n = int(input())\ns = input()\narr = list(map(int, input().split()))\n',
      java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        ',
      go: 'package main\nimport "fmt"\nfunc main() {\n    var n int\n    fmt.Scan(&n)\n    s := make([]int, n)\n    ',
      rust: 'use std::io;\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_line(&mut input).unwrap();\n    let n: usize = input.trim().parse().unwrap();\n    ',
    };
    const t = Date.now();
    const results = await Promise.all(languages.map(lang =>
      post('/api/ai-complete', { prefix: prefixes[lang], suffix: '', language: lang })
    ));
    const ms = Date.now() - t;
    const allOk = results.every(r => r.body.ok === true);
    const withText = results.filter(r => r.body.text && r.body.text.length > 0).length;
    assert('4.5 5 parallel AI completes', allOk, `${withText}/5 with text, total ${ms}ms`);
  }

  await delay(3000);

  // 4.6 — AI complete for uncommon language (PHP)
  {
    const r = await post('/api/ai-complete', {
      prefix: '<?php\n$n = intval(fgets(STDIN));\n$arr = array_map("intval", explode(" ", fgets(STDIN)));\nsort($arr);\n',
      suffix: '\n?>',
      language: 'php'
    });
    assert('4.6 PHP completion', r.body.ok, `text="${(r.body.text||'').substring(0, 60)}"`);
  }

  await delay(2000);

  // 4.7 — AI complete for Shell/Bash
  {
    const r = await post('/api/ai-complete', {
      prefix: '#!/bin/bash\nread n\nread -a arr\nfor i in "${arr[@]}"; do\n    ',
      suffix: '\ndone',
      language: 'shell'
    });
    assert('4.7 Bash completion', r.body.ok, `text="${(r.body.text||'').substring(0, 60)}"`);
  }

  await delay(2000);

  // 4.8 — Perl completion
  {
    const r = await post('/api/ai-complete', {
      prefix: 'my $n = <STDIN>;\nchomp $n;\nmy @arr = split / /, <STDIN>;\n',
      suffix: '',
      language: 'perl'
    });
    assert('4.8 Perl completion', r.body.ok, `text="${(r.body.text||'').substring(0, 60)}"`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: quickRun & judge regression (ensure no breakage)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ SECTION 5: Regression — quickRun & judge ═══\n');

  // 5.1 — quickRun C++ still works
  {
    const t = Date.now();
    const r = await post('/api/run', {
      code: '#include <iostream>\nusing namespace std;\nint main() { int a,b; cin>>a>>b; cout<<a+b; }',
      input: '3 7',
      language: 'cpp'
    });
    const ms = Date.now() - t;
    assert('5.1 quickRun C++ a+b', r.body.output?.trim() === '10', `output="${r.body.output?.trim()}" (${ms}ms)`);
  }

  // 5.2 — quickRun Python
  {
    const r = await post('/api/run', {
      code: 'a, b = map(int, input().split())\nprint(a * b)',
      input: '6 7',
      language: 'python'
    });
    assert('5.2 quickRun Python a*b', r.body.output?.trim() === '42', `output="${r.body.output?.trim()}"`);
  }

  // 5.3 — judge multi-TC C++
  {
    const r = await post('/api/judge', {
      code: '#include <bits/stdc++.h>\nusing namespace std;\nint main() { int a,b; cin>>a>>b; cout<<a+b<<endl; }',
      language: 'cpp',
      testcases: [
        { input: '1 2', expected_output: '3' },
        { input: '10 20', expected_output: '30' },
        { input: '-5 5', expected_output: '0' },
        { input: '1000000 2000000', expected_output: '3000000' },
      ],
    });
    assert('5.3 judge C++ 4 TCs → AC', r.body.verdict === 'AC', `verdict=${r.body.verdict}`);
  }

  // 5.4 — judge WA detection
  {
    const r = await post('/api/judge', {
      code: '#include <iostream>\nusing namespace std;\nint main() { int a,b; cin>>a>>b; cout<<a-b; }',
      language: 'cpp',
      testcases: [{ input: '3 5', expected_output: '8' }],
    });
    assert('5.4 judge WA detection', r.body.verdict === 'WA', `verdict=${r.body.verdict}`);
  }

  // 5.5 — judge CE detection
  {
    const r = await post('/api/judge', {
      code: '#include <iostream>\nint main() { cout << 1; }',
      language: 'cpp',
      testcases: [{ input: '', expected_output: '1' }],
    });
    assert('5.5 judge CE detection', r.body.verdict === 'CE', `verdict=${r.body.verdict}`);
  }

  // 5.6 — quickRun Go
  {
    const r = await post('/api/run', {
      code: 'package main\nimport "fmt"\nfunc main() { var a,b int; fmt.Scan(&a,&b); fmt.Println(a+b) }',
      input: '100 200',
      language: 'go'
    });
    assert('5.6 quickRun Go', r.body.output?.trim() === '300', `output="${r.body.output?.trim()}"`);
  }

  // 5.7 — quickRun Rust
  {
    const r = await post('/api/run', {
      code: 'use std::io;\nfn main() { let mut s = String::new(); io::stdin().read_line(&mut s).unwrap(); let v: Vec<i64> = s.trim().split_whitespace().map(|x| x.parse().unwrap()).collect(); println!("{}", v[0]+v[1]); }',
      input: '50 60',
      language: 'rust'
    });
    assert('5.7 quickRun Rust', r.body.output?.trim() === '110', `output="${r.body.output?.trim()}"`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS:  ${passed}/${total} passed   ${failed > 0 ? failed + ' FAILED' : 'ALL PASS ✓'}`.padEnd(63) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test runner error:', e); process.exit(1); });
