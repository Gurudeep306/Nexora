export interface Snippet {
  id: string
  label: string
  detail: string
  body: string
}

/* Monaco snippet syntax: $1/$2 tab stops, ${1:placeholder}, $0 final cursor */
const cpp: Snippet[] = [
  {
    id: 'cpp-fastio',
    label: 'fastio',
    detail: 'Untie C++ streams for fast I/O',
    body: 'ios::sync_with_stdio(false);\ncin.tie(nullptr);\n$0',
  },
  {
    id: 'cpp-fori',
    label: 'fori',
    detail: 'for loop 0..n',
    body: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n\t$0\n}',
  },
  {
    id: 'cpp-forrange',
    label: 'forr',
    detail: 'for loop a..b inclusive',
    body: 'for (int ${1:i} = ${2:a}; ${1:i} <= ${3:b}; ++${1:i}) {\n\t$0\n}',
  },
  {
    id: 'cpp-readvec',
    label: 'readvec',
    detail: 'Read n then a vector of n values',
    body: 'int ${1:n};\ncin >> $1;\nvector<${2:int}> ${3:v}($1);\nfor (auto &${4:x} : $3) cin >> $4;\n$0',
  },
  {
    id: 'cpp-vec',
    label: 'vec',
    detail: 'vector<T> v(n)',
    body: 'vector<${1:int}> ${2:v}(${3:n});\n$0',
  },
  {
    id: 'cpp-hashmap',
    label: 'umap',
    detail: 'unordered_map counter',
    body: 'unordered_map<${1:string}, ${2:int}> ${3:cnt};\n$0',
  },
  {
    id: 'cpp-sort',
    label: 'sortv',
    detail: 'sort a container',
    body: 'sort(${1:v}.begin(), ${1:v}.end());\n$0',
  },
  {
    id: 'cpp-yesno',
    label: 'yesno',
    detail: 'Print YES/NO from a condition',
    body: 'cout << (${1:cond} ? "YES" : "NO") << "\\n";\n$0',
  },
  {
    id: 'cpp-dbg',
    label: 'dbg',
    detail: 'Debug print macro to stderr',
    body: '#define dbg(x) cerr << #x << " = " << (x) << "\\n";\n$0',
  },
  {
    id: 'cpp-gcd',
    label: 'gcd',
    detail: 'Greatest common divisor',
    body: 'long long gcd(long long a, long long b) { return b ? gcd(b, a % b) : a; }\n$0',
  },
  {
    id: 'cpp-modpow',
    label: 'modpow',
    detail: 'Binary exponentiation mod m',
    body:
      'long long modpow(long long b, long long e, long long m) {\n\tlong long r = 1;\n\tb %= m;\n\twhile (e > 0) {\n\t\tif (e & 1) r = r * b % m;\n\t\tb = b * b % m;\n\t\te >>= 1;\n\t}\n\treturn r;\n}\n$0',
  },
  {
    id: 'cpp-binsearch',
    label: 'binsearch',
    detail: 'Binary search on predicate (first true)',
    body:
      'long long lo = ${1:0}, hi = ${2:1000000000};\nwhile (lo < hi) {\n\tlong long mid = lo + (hi - lo) / 2;\n\tif (${3:ok(mid)}) hi = mid;\n\telse lo = mid + 1;\n}\n$0',
  },
  {
    id: 'cpp-sieve',
    label: 'sieve',
    detail: 'Eratosthenes sieve up to n',
    body:
      'int ${1:n} = ${2:1000000};\nvector<bool> is_p($1 + 1, true);\nis_p[0] = is_p[1] = false;\nfor (int i = 2; i * i <= $1; ++i)\n\tif (is_p[i])\n\t\tfor (int j = i * i; j <= $1; j += i) is_p[j] = false;\n$0',
  },
  {
    id: 'cpp-dsu',
    label: 'dsu',
    detail: 'Disjoint set union with path compression',
    body:
      'struct DSU {\n\tvector<int> p, r;\n\tDSU(int n) : p(n), r(n, 1) { iota(p.begin(), p.end(), 0); }\n\tint find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }\n\tbool unite(int a, int b) {\n\t\ta = find(a); b = find(b);\n\t\tif (a == b) return false;\n\t\tif (r[a] < r[b]) swap(a, b);\n\t\tp[b] = a;\n\t\tif (r[a] == r[b]) ++r[a];\n\t\treturn true;\n\t}\n};\n$0',
  },
  {
    id: 'cpp-segtree',
    label: 'segtree',
    detail: 'Sum segment tree with point update',
    body:
      'struct SegTree {\n\tint n;\n\tvector<long long> t;\n\tSegTree(const vector<long long> &a) : n(a.size()), t(4 * n) { build(a, 1, 0, n - 1); }\n\tvoid build(const vector<long long> &a, int v, int l, int r) {\n\t\tif (l == r) { t[v] = a[l]; return; }\n\t\tint m = (l + r) / 2;\n\t\tbuild(a, 2 * v, l, m); build(a, 2 * v + 1, m + 1, r);\n\t\tt[v] = t[2 * v] + t[2 * v + 1];\n\t}\n\tvoid upd(int v, int l, int r, int i, long long val) {\n\t\tif (l == r) { t[v] = val; return; }\n\t\tint m = (l + r) / 2;\n\t\tif (i <= m) upd(2 * v, l, m, i, val); else upd(2 * v + 1, m + 1, r, i, val);\n\t\tt[v] = t[2 * v] + t[2 * v + 1];\n\t}\n\tlong long qry(int v, int l, int r, int ql, int qr) {\n\t\tif (qr < l || r < ql) return 0;\n\t\tif (ql <= l && r <= qr) return t[v];\n\t\tint m = (l + r) / 2;\n\t\treturn qry(2 * v, l, m, ql, qr) + qry(2 * v + 1, m + 1, r, ql, qr);\n\t}\n};\n$0',
  },
  {
    id: 'cpp-getline',
    label: 'getline',
    detail: 'Read a whole line',
    body: 'string ${1:line};\ngetline(cin, $1);\n$0',
  },
  {
    id: 'cpp-multitest',
    label: 'multitest',
    detail: 't test-cases wrapper',
    body: 'int ${1:t};\ncin >> $1;\nwhile ($1--) {\n\t$0\n}',
  },
]

const python: Snippet[] = [
  {
    id: 'py-fast',
    label: 'fastinput',
    detail: 'Fast stdin reading',
    body: 'import sys\ninput = sys.stdin.readline\n$0',
  },
  {
    id: 'py-readints',
    label: 'readints',
    detail: 'Read n and a list of ints',
    body: '${1:n} = int(input())\n${2:a} = list(map(int, input().split()))\n$0',
  },
  {
    id: 'py-counter',
    label: 'counter',
    detail: 'collections.Counter',
    body: 'from collections import Counter\n${1:cnt} = Counter(${2:a})\n$0',
  },
  {
    id: 'py-defaultdict',
    label: 'ddict',
    detail: 'defaultdict(int)',
    body: 'from collections import defaultdict\n${1:d} = defaultdict(int)\n$0',
  },
  {
    id: 'py-sortkey',
    label: 'sortkey',
    detail: 'Sort by key lambda',
    body: '${1:a}.sort(key=lambda ${2:x}: ${3:x})\n$0',
  },
  {
    id: 'py-enumerate',
    label: 'fori',
    detail: 'enumerate loop',
    body: 'for ${1:i}, ${2:x} in enumerate(${3:a}):\n\t$0',
  },
  {
    id: 'py-inf',
    label: 'inflow',
    detail: 'Infinite loop with break',
    body: 'while True:\n\t${1:line} = input()\n\tif not $1:\n\t\tbreak\n\t$0',
  },
]

const java: Snippet[] = [
  {
    id: 'java-scanner',
    label: 'fastscan',
    detail: 'BufferedReader + StringTokenizer',
    body:
      'BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\nStringTokenizer st = new StringTokenizer(br.readLine());\nint ${1:n} = Integer.parseInt(st.nextToken());\n$0',
  },
  {
    id: 'java-hashmap',
    label: 'hmap',
    detail: 'HashMap<String, Integer>',
    body: 'Map<${1:String}, ${2:Integer}> ${3:cnt} = new HashMap<>();\n$0',
  },
  {
    id: 'java-sb',
    label: 'sbout',
    detail: 'StringBuilder output',
    body: 'StringBuilder ${1:sb} = new StringBuilder();\n$1.append(${2:x}).append("\\n");\nSystem.out.print($1);\n$0',
  },
]

const js: Snippet[] = [
  {
    id: 'js-readline',
    label: 'readline',
    detail: 'Node readline boilerplate',
    body:
      "const rl = require('readline').createInterface({ input: process.stdin });\nconst lines = [];\nrl.on('line', (l) => lines.push(l));\nrl.on('close', () => {\n\t$0\n});",
  },
  {
    id: 'js-map',
    label: 'cmap',
    detail: 'Counting Map',
    body: 'const ${1:cnt} = new Map();\nfor (const ${2:x} of ${3:a}) $1.set($2, ($1.get($2) ?? 0) + 1);\n$0',
  },
  {
    id: 'js-sort',
    label: 'sortnum',
    detail: 'Numeric sort',
    body: '${1:a}.sort((x, y) => x - y);\n$0',
  },
]

const go: Snippet[] = [
  {
    id: 'go-scanner',
    label: 'scanner',
    detail: 'bufio scanner input',
    body:
      'sc := bufio.NewScanner(os.Stdin)\nsc.Split(bufio.ScanWords)\nnext := func() string { sc.Scan(); return sc.Text() }\n${1:n}, _ := strconv.Atoi(next())\n$0',
  },
  {
    id: 'go-writer',
    label: 'writer',
    detail: 'Buffered writer output',
    body: 'w := bufio.NewWriter(os.Stdout)\ndefer w.Flush()\nfmt.Fprintln(w, ${1:x})\n$0',
  },
]

const rust: Snippet[] = [
  {
    id: 'rust-read',
    label: 'readln',
    detail: 'Read a line of ints',
    body:
      'let mut input = String::new();\nstd::io::stdin().read_line(&mut input).unwrap();\nlet ${1:a}: Vec<i64> = input.split_whitespace().map(|x| x.parse().unwrap()).collect();\n$0',
  },
  {
    id: 'rust-hashmap',
    label: 'hmap',
    detail: 'Counting HashMap',
    body:
      'let mut ${1:cnt}: std::collections::HashMap<${2:i64}, ${3:i64}> = std::collections::HashMap::new();\n*$1.entry(${4:x}).or_insert(0) += 1;\n$0',
  },
]

const SNIPPETS: Record<string, Snippet[]> = {
  cpp,
  c: cpp,
  python: python,
  java,
  javascript: js,
  typescript: js,
  go,
  rust,
}

export function snippetsFor(language: string): Snippet[] {
  return SNIPPETS[language] ?? []
}
