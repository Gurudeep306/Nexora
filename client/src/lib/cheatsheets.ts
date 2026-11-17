/*
  A cheat sheet per language, opened from the editor: the idioms a judged
  problem needs, in the order you reach for them. Every sheet ends with a
  complete program (read n numbers, print their sum) that is run on the real
  judges by tests/cheatsheets.test.js's companion check, so nothing here is
  untested pseudo-code.
*/

export interface CheatItem {
  title: string
  code: string
  note?: string
}
export interface CheatSheet {
  items: CheatItem[]
  mistakes: string[]
  /** A whole program: reads n, then n numbers, and prints their sum. */
  template: string
}

export const CHEATSHEETS: Record<string, CheatSheet> = {
  cpp: {
    items: [
      { title: 'Read a line', code: 'string s;\ngetline(cin, s);', note: 'After cin >> n, call cin.ignore() before getline, or it reads the rest of that line.' },
      { title: 'Read n numbers', code: 'int n; cin >> n;\nvector<long long> a(n);\nfor (auto& x : a) cin >> x;' },
      { title: 'Fast input and output', code: 'ios::sync_with_stdio(false);\ncin.tie(nullptr);', note: "Put it first in main. Then use '\\n', not endl (endl flushes every time)." },
      { title: 'Print', code: 'cout << x << " " << y << \'\\n\';\ncout << fixed << setprecision(6) << d << \'\\n\';' },
      { title: 'Arrays and lists', code: 'vector<int> v(n, 0);\nv.push_back(5); v.pop_back();\nvector<vector<int>> g(n, vector<int>(m));' },
      { title: 'Maps and sets', code: 'map<string, int> cnt; cnt["a"]++;\nunordered_map<int, int> pos;\nset<int> s; s.insert(3); s.count(3);' },
      { title: 'Sort', code: 'sort(v.begin(), v.end());\nsort(v.begin(), v.end(), greater<int>());\nsort(v.begin(), v.end(), [](auto& a, auto& b) { return a.second < b.second; });' },
    ],
    mistakes: [
      'int overflows past about 2·10⁹: use long long for sums and products.',
      'endl in a loop is slow; use \'\\n\'.',
      'v[i] with i == v.size() reads past the end: valid indices are 0 to size − 1.',
      'Comparing a signed int with v.size() (unsigned) can loop wrongly when v is empty.',
    ],
    template: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    long long sum = 0;\n    for (int i = 0; i < n; i++) {\n        long long x;\n        cin >> x;\n        sum += x;\n    }\n    cout << sum << \'\\n\';\n    return 0;\n}\n',
  },
  c: {
    items: [
      { title: 'Read a line', code: 'char s[1001];\nfgets(s, sizeof s, stdin);\ns[strcspn(s, "\\n")] = 0; // drop the newline' },
      { title: 'Read n numbers', code: 'int n; scanf("%d", &n);\nlong long a[200005];\nfor (int i = 0; i < n; i++) scanf("%lld", &a[i]);' },
      { title: 'Print', code: 'printf("%d %lld\\n", x, big);\nprintf("%.6f\\n", d);' },
      { title: 'Arrays', code: 'int *a = malloc(n * sizeof *a);\n/* ... */\nfree(a);', note: 'Big arrays go outside main (global) or on the heap: the stack is small.' },
      { title: 'Sort', code: 'int cmp(const void *x, const void *y) {\n    long long a = *(const long long *)x, b = *(const long long *)y;\n    return (a > b) - (a < b);\n}\nqsort(a, n, sizeof a[0], cmp);' },
    ],
    mistakes: [
      'scanf needs & before the variable (scanf("%d", &n)), except for strings.',
      '%d is for int; long long needs %lld.',
      'A large local array (int a[1000000] inside main) overflows the stack: make it global.',
      'return a - b in a qsort comparator can overflow; compare instead.',
    ],
    template: '#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    long long sum = 0;\n    for (int i = 0; i < n; i++) {\n        long long x;\n        scanf("%lld", &x);\n        sum += x;\n    }\n    printf("%lld\\n", sum);\n    return 0;\n}\n',
  },
  java: {
    items: [
      { title: 'Read a line', code: 'BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\nString line = br.readLine();' },
      { title: 'Read n numbers', code: 'StringTokenizer st = new StringTokenizer(br.readLine());\nint n = Integer.parseInt(st.nextToken());\nlong[] a = new long[n];\nst = new StringTokenizer(br.readLine());\nfor (int i = 0; i < n; i++) a[i] = Long.parseLong(st.nextToken());', note: 'Scanner is easy but slow for large input; BufferedReader is fast.' },
      { title: 'Fast output', code: 'PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out)));\nout.println(x);\nout.flush(); // at the end, or nothing is printed' },
      { title: 'Arrays and lists', code: 'int[] a = new int[n];\nList<Integer> list = new ArrayList<>();\nlist.add(5); list.get(0);\nint[][] g = new int[n][m];' },
      { title: 'Maps and sets', code: 'Map<String, Integer> cnt = new HashMap<>();\ncnt.merge("a", 1, Integer::sum);\nSet<Integer> seen = new HashSet<>();\nTreeMap<Integer, Integer> sorted = new TreeMap<>();' },
      { title: 'Sort', code: 'Arrays.sort(a);\nCollections.sort(list);\nlist.sort((x, y) -> y - x); // descending\nArrays.sort(pairs, Comparator.comparingInt(p -> p[1]));' },
    ],
    mistakes: [
      'The class must be named Main here (public class Main).',
      'int overflows past about 2·10⁹: use long for sums.',
      'Compare Integer objects with .equals, not == (== works only for small values).',
      'Forgetting out.flush() with PrintWriter prints nothing.',
    ],
    template: 'import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        int n = Integer.parseInt(br.readLine().trim());\n        StringTokenizer st = new StringTokenizer(br.readLine());\n        long sum = 0;\n        for (int i = 0; i < n; i++) sum += Long.parseLong(st.nextToken());\n        System.out.println(sum);\n    }\n}\n',
  },
  python: {
    items: [
      { title: 'Read a line', code: 's = input()' },
      { title: 'Read n numbers', code: 'n = int(input())\na = list(map(int, input().split()))' },
      { title: 'Fast input', code: 'import sys\ninput = sys.stdin.readline  # then strip: input().strip()\ndata = sys.stdin.read().split()  # or read everything at once' },
      { title: 'Print', code: 'print(x, y)            # "x y"\nprint(*a)              # a list, space-separated\nprint(f"{d:.6f}")' },
      { title: 'Lists', code: 'a = [0] * n\ngrid = [[0] * m for _ in range(n)]  # not [[0] * m] * n\na.append(5); a.pop()' },
      { title: 'Dicts and sets', code: 'from collections import Counter, defaultdict\ncnt = Counter(a)\ng = defaultdict(list)\nseen = set(); seen.add(3)' },
      { title: 'Sort', code: 'a.sort()\na.sort(reverse=True)\npairs.sort(key=lambda p: (p[1], -p[0]))\nb = sorted(a)' },
    ],
    mistakes: [
      '[[0] * m] * n makes n copies of the same row: changing one changes all.',
      'Deep recursion stops at about 1000 calls: sys.setrecursionlimit, or use a loop.',
      'With sys.stdin.readline the line keeps its "\\n": call .strip().',
      'Mixing tabs and spaces in the indentation is an error.',
    ],
    template: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    print(sum(int(x) for x in data[1:n + 1]))\n\nmain()\n',
  },
  javascript: {
    items: [
      { title: 'Read all input', code: 'const data = require("fs").readFileSync(0, "utf8");\nconst lines = data.split("\\n");' },
      { title: 'Read n numbers', code: 'const tokens = data.split(/\\s+/).filter(Boolean).map(Number);\nconst n = tokens[0];\nconst a = tokens.slice(1, n + 1);' },
      { title: 'Print', code: 'console.log(x, y);\nconsole.log(a.join(" "));\n// many lines: collect, then print once\nconsole.log(out.join("\\n"));' },
      { title: 'Arrays', code: 'const a = new Array(n).fill(0);\nconst grid = Array.from({ length: n }, () => new Array(m).fill(0));\na.push(5); a.pop();' },
      { title: 'Maps and sets', code: 'const cnt = new Map();\ncnt.set(k, (cnt.get(k) ?? 0) + 1);\nconst seen = new Set([1, 2]);' },
      { title: 'Sort', code: 'a.sort((x, y) => x - y);  // numbers need the comparator\nwords.sort();' },
    ],
    mistakes: [
      'a.sort() with no comparator sorts numbers as text: [10, 9, 1] becomes [1, 10, 9].',
      'Numbers above 2^53 lose precision: use BigInt (10n ** 18n).',
      'Printing in a big loop with console.log is slow: join and print once.',
      'new Array(m).fill([]) shares one array: use Array.from.',
    ],
    template: 'const data = require("fs").readFileSync(0, "utf8").split(/\\s+/).filter(Boolean).map(Number);\nconst n = data[0];\nlet sum = 0;\nfor (let i = 1; i <= n; i++) sum += data[i];\nconsole.log(sum);\n',
  },
  typescript: {
    items: [
      { title: 'Read all input', code: 'import * as fs from "fs";\nconst data: string = fs.readFileSync(0, "utf8");' },
      { title: 'Read n numbers', code: 'const t: number[] = data.split(/\\s+/).filter(Boolean).map(Number);\nconst n = t[0];\nconst a = t.slice(1, n + 1);' },
      { title: 'Print', code: 'console.log(a.join(" "));' },
      { title: 'Maps and sets', code: 'const cnt = new Map<string, number>();\ncnt.set(k, (cnt.get(k) ?? 0) + 1);' },
      { title: 'Sort', code: 'a.sort((x, y) => x - y);' },
    ],
    mistakes: ['a.sort() without a comparator sorts numbers as text.', 'Numbers above 2^53 lose precision: use bigint.'],
    template: 'import * as fs from "fs";\n\nconst t: number[] = fs.readFileSync(0, "utf8").split(/\\s+/).filter(Boolean).map(Number);\nconst n = t[0];\nlet sum = 0;\nfor (let i = 1; i <= n; i++) sum += t[i];\nconsole.log(sum);\n',
  },
  go: {
    items: [
      { title: 'Fast reader and writer', code: 'in := bufio.NewReader(os.Stdin)\nout := bufio.NewWriter(os.Stdout)\ndefer out.Flush()' },
      { title: 'Read n numbers', code: 'var n int\nfmt.Fscan(in, &n)\na := make([]int64, n)\nfor i := range a {\n\tfmt.Fscan(in, &a[i])\n}' },
      { title: 'Read a line', code: 'line, _ := in.ReadString(\'\\n\')\nline = strings.TrimSpace(line)' },
      { title: 'Print', code: 'fmt.Fprintln(out, x, y)\nfmt.Fprintf(out, "%.6f\\n", d)' },
      { title: 'Slices and maps', code: 'a := make([]int, n)\na = append(a, 5)\ncnt := map[string]int{}\ncnt["a"]++' },
      { title: 'Sort', code: 'sort.Ints(a)\nsort.Slice(p, func(i, j int) bool { return p[i].w < p[j].w })' },
    ],
    mistakes: [
      'fmt.Scan without bufio is slow for large input.',
      'Forgetting out.Flush() prints nothing (defer it right away).',
      'An unused variable or import is a compile error in Go.',
      'int is 64-bit on the judges, but int32 overflows past 2·10⁹.',
    ],
    template: 'package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\tin := bufio.NewReader(os.Stdin)\n\tout := bufio.NewWriter(os.Stdout)\n\tdefer out.Flush()\n\tvar n int\n\tfmt.Fscan(in, &n)\n\tvar sum int64\n\tfor i := 0; i < n; i++ {\n\t\tvar x int64\n\t\tfmt.Fscan(in, &x)\n\t\tsum += x\n\t}\n\tfmt.Fprintln(out, sum)\n}\n',
  },
  rust: {
    items: [
      { title: 'Read all input', code: 'use std::io::{self, Read};\nlet mut s = String::new();\nio::stdin().read_to_string(&mut s).unwrap();\nlet mut it = s.split_ascii_whitespace();' },
      { title: 'Read n numbers', code: 'let n: usize = it.next().unwrap().parse().unwrap();\nlet a: Vec<i64> = (0..n).map(|_| it.next().unwrap().parse().unwrap()).collect();' },
      { title: 'Fast output', code: 'use std::io::Write;\nlet mut out = io::BufWriter::new(io::stdout().lock());\nwriteln!(out, "{}", x).unwrap();' },
      { title: 'Vectors and maps', code: 'let mut v = vec![0i64; n];\nv.push(5);\nuse std::collections::HashMap;\nlet mut cnt: HashMap<String, i32> = HashMap::new();\n*cnt.entry(k).or_insert(0) += 1;' },
      { title: 'Sort', code: 'v.sort();\nv.sort_by(|a, b| b.cmp(a));        // descending\nv.sort_by_key(|p| p.1);\nf.sort_by(|a, b| a.partial_cmp(b).unwrap()); // floats' },
    ],
    mistakes: [
      'println! in a big loop is slow: use a BufWriter.',
      'Indexing with an i32 does not compile: indices are usize.',
      'Subtracting usize values below zero panics: check first or use i64.',
      'Floats have no .sort(): use sort_by with partial_cmp.',
    ],
    template: 'use std::io::{self, Read};\n\nfn main() {\n    let mut s = String::new();\n    io::stdin().read_to_string(&mut s).unwrap();\n    let mut it = s.split_ascii_whitespace();\n    let n: usize = it.next().unwrap().parse().unwrap();\n    let sum: i64 = (0..n).map(|_| it.next().unwrap().parse::<i64>().unwrap()).sum();\n    println!("{}", sum);\n}\n',
  },
  csharp: {
    items: [
      { title: 'Read a line', code: 'string line = Console.ReadLine();' },
      { title: 'Read n numbers', code: 'int n = int.Parse(Console.ReadLine());\nlong[] a = Console.ReadLine().Split(\' \', StringSplitOptions.RemoveEmptyEntries).Select(long.Parse).ToArray();' },
      { title: 'Fast output', code: 'var sb = new StringBuilder();\nsb.AppendLine(x.ToString());\nConsole.Write(sb);' },
      { title: 'Lists and dictionaries', code: 'var list = new List<int>();\nvar cnt = new Dictionary<string, int>();\ncnt[k] = cnt.GetValueOrDefault(k) + 1;\nvar seen = new HashSet<int>();' },
      { title: 'Sort', code: 'Array.Sort(a);\nlist.Sort();\nlist.Sort((x, y) => y.CompareTo(x)); // descending' },
    ],
    mistakes: ['int overflows past about 2·10⁹: use long.', 'Console.WriteLine in a big loop is slow: build a StringBuilder.', 'Add using System.Linq; for Select and ToArray.'],
    template: 'using System;\nusing System.Linq;\n\nclass Program\n{\n    static void Main()\n    {\n        var tokens = Console.In.ReadToEnd().Split((char[])null, StringSplitOptions.RemoveEmptyEntries);\n        int n = int.Parse(tokens[0]);\n        long sum = tokens.Skip(1).Take(n).Sum(long.Parse);\n        Console.WriteLine(sum);\n    }\n}\n',
  },
  kotlin: {
    items: [
      { title: 'Read a line', code: 'val line = readln()' },
      { title: 'Read n numbers', code: 'val n = readln().trim().toInt()\nval a = readln().trim().split(" ").map { it.toLong() }' },
      { title: 'Fast input and output', code: 'val br = System.`in`.bufferedReader()\nval out = StringBuilder()\nout.appendLine(x)\nprint(out)' },
      { title: 'Lists and maps', code: 'val a = IntArray(n)\nval list = mutableListOf<Int>()\nval cnt = mutableMapOf<String, Int>()\ncnt[k] = (cnt[k] ?: 0) + 1' },
      { title: 'Sort', code: 'a.sort()\nlist.sortDescending()\npairs.sortBy { it.second }' },
    ],
    mistakes: ['Int overflows past about 2·10⁹: use Long (and 1L literals).', 'println in a big loop is slow: build a StringBuilder.', 'split(" ") breaks on double spaces: use split(Regex("\\\\s+")) after trim().'],
    template: 'fun main() {\n    val tokens = System.`in`.bufferedReader().readText().split(Regex("\\\\s+")).filter { it.isNotEmpty() }\n    val n = tokens[0].toInt()\n    var sum = 0L\n    for (i in 1..n) sum += tokens[i].toLong()\n    println(sum)\n}\n',
  },
  swift: {
    items: [
      { title: 'Read a line', code: 'let line = readLine()!' },
      { title: 'Read n numbers', code: 'let n = Int(readLine()!)!\nlet a = readLine()!.split(separator: " ").map { Int($0)! }' },
      { title: 'Print', code: 'print(x, y)\nprint(a.map(String.init).joined(separator: " "))' },
      { title: 'Arrays and dictionaries', code: 'var a = [Int](repeating: 0, count: n)\nvar cnt: [String: Int] = [:]\ncnt[k, default: 0] += 1\nvar seen = Set<Int>()' },
      { title: 'Sort', code: 'a.sort()\na.sort(by: >)\npairs.sort { $0.1 < $1.1 }' },
    ],
    mistakes: ['readLine()! crashes when the input is over: use if let to read safely.', 'Index out of range stops the program at once; check bounds first.', 'Int(...)! crashes on text that is not a number.'],
    template: 'let n = Int(readLine()!)!\nlet a = readLine()!.split(separator: " ").map { Int($0)! }\nprint(a.prefix(n).reduce(0, +))\n',
  },
  ruby: {
    items: [
      { title: 'Read a line', code: 'line = gets.chomp' },
      { title: 'Read n numbers', code: 'n = gets.to_i\na = gets.split.map(&:to_i)' },
      { title: 'Read everything at once', code: 'data = STDIN.read.split.map(&:to_i)' },
      { title: 'Print', code: 'puts x\nputs a.join(" ")\nprintf("%.6f\\n", d)' },
      { title: 'Arrays and hashes', code: 'a = Array.new(n, 0)\ngrid = Array.new(n) { Array.new(m, 0) }\ncnt = Hash.new(0)\ncnt["a"] += 1' },
      { title: 'Sort', code: 'a.sort!\na.sort_by! { |x| -x }\npairs.sort_by { |p| [p[1], p[0]] }' },
    ],
    mistakes: ['gets keeps the newline: use gets.chomp or gets.to_i.', 'Array.new(n, []) shares one array: use Array.new(n) { [] }.', 'puts in a big loop is slow: build a string and print once.'],
    template: 'data = STDIN.read.split.map(&:to_i)\nn = data[0]\nputs data[1, n].sum\n',
  },
  php: {
    items: [
      { title: 'Read a line', code: '$line = trim(fgets(STDIN));' },
      { title: 'Read n numbers', code: '$n = (int) trim(fgets(STDIN));\n$a = array_map(\'intval\', preg_split(\'/\\s+/\', trim(fgets(STDIN))));' },
      { title: 'Print', code: 'echo $x, "\\n";\necho implode(" ", $a), "\\n";\nprintf("%.6f\\n", $d);' },
      { title: 'Arrays and maps', code: '$a = array_fill(0, $n, 0);\n$cnt = [];\n$cnt[$k] = ($cnt[$k] ?? 0) + 1;' },
      { title: 'Sort', code: 'sort($a);\nrsort($a);\nusort($pairs, fn($x, $y) => $x[1] <=> $y[1]);' },
    ],
    mistakes: ['Start the file with <?php.', 'fgets keeps the newline: trim() it.', 'sort() renumbers the keys; use asort() to keep them.'],
    template: '<?php\n$data = preg_split(\'/\\s+/\', trim(stream_get_contents(STDIN)));\n$n = (int) $data[0];\n$sum = 0;\nfor ($i = 1; $i <= $n; $i++) $sum += (int) $data[$i];\necho $sum, "\\n";\n',
  },
  lua: {
    items: [
      { title: 'Read a line', code: 'local line = io.read("l")' },
      { title: 'Read n numbers', code: 'local n = io.read("n")\nlocal a = {}\nfor i = 1, n do a[i] = io.read("n") end' },
      { title: 'Print', code: 'print(x, y)              -- tab-separated\nio.write(x, " ", y, "\\n")\nprint(table.concat(a, " "))' },
      { title: 'Tables', code: 'local t = {}\nt[#t + 1] = 5           -- append\nlocal cnt = {}\ncnt[k] = (cnt[k] or 0) + 1' },
      { title: 'Sort', code: 'table.sort(a)\ntable.sort(a, function(x, y) return x > y end)' },
    ],
    mistakes: ['Tables start at index 1, not 0.', 'print separates values with tabs: use io.write for spaces.', '# counts only up to the first nil in a table.'],
    template: 'local n = io.read("n")\nlocal sum = 0\nfor i = 1, n do sum = sum + io.read("n") end\nprint(math.tointeger(sum) or sum)\n',
  },
}

export function cheatSheetFor(lang: string): CheatSheet | null {
  return CHEATSHEETS[lang] ?? null
}
