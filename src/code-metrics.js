// Measured facts about a piece of code, computed without running it: size,
// functions, loops and how deeply they nest, recursion, branching
// (cyclomatic complexity), data structures and I/O style. These are exact
// counts from the text, shown next to the AI's analysis so the student sees
// what is measured and what is estimated.

const PY_LIKE = new Set(["python", "ruby", "nim", "julia", "elixir", "r", "lua", "shell"]);
const INDENT_BLOCKS = new Set(["python", "nim"]);

/** Remove comments and string literals so keywords inside them don't count. */
function stripNoise(code, lang) {
  let s = String(code || "");
  if (PY_LIKE.has(lang)) {
    s = s.replace(/("""|''')[\s\S]*?\1/g, (m) => m.replace(/[^\n]/g, " "));
    s = s.replace(/#.*$/gm, "");
  }
  if (lang === "lua") s = s.replace(/--.*$/gm, "");
  if (!INDENT_BLOCKS.has(lang)) s = s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/\/\/.*$/gm, "");
  if (lang === "haskell") s = s.replace(/--.*$/gm, "");
  s = s.replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n]){0,4}'|`(?:\\.|[^`\\])*`/g, (m) => `"${" ".repeat(Math.max(0, m.length - 2))}"`);
  return s;
}

function commentLines(code, lang) {
  const lines = String(code || "").split("\n");
  const re = PY_LIKE.has(lang) ? /^\s*#/ : lang === "lua" || lang === "haskell" ? /^\s*--/ : /^\s*(\/\/|\/\*|\*)/;
  return lines.filter((l) => re.test(l)).length;
}

const LOOP_RE = /\b(for|while|do|foreach|loop|repeat|until)\b|\.forEach\(|\.map\(|\.each\b|\.times\b/g;
const BRANCH_RE = /\b(if|elif|else\s+if|case|when|catch|except|unless)\b|&&|\|\||\?\s*[^:?]+\s*:|\band\b|\bor\b/g;

function functionNames(src, lang) {
  const names = new Set();
  const res = {
    python: /^\s*def\s+([A-Za-z_]\w*)/gm,
    ruby: /^\s*def\s+([A-Za-z_]\w*[?!]?)/gm,
    javascript: /function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
    go: /\bfunc\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/g,
    rust: /\bfn\s+([A-Za-z_]\w*)/g,
    kotlin: /\bfun\s+([A-Za-z_]\w*)/g,
    swift: /\bfunc\s+([A-Za-z_]\w*)/g,
    php: /\bfunction\s+([A-Za-z_]\w*)/g,
    lua: /\bfunction\s+([A-Za-z_][\w.:]*)/g,
  };
  const cLike = /^[ \t]*(?:template\s*<[^>]*>\s*)?(?:(?:static|inline|public|private|protected|final|constexpr|virtual|override|unsigned|signed|const|long|short)\s+)*[A-Za-z_][\w:<>,\s*&[\]]*?[\s*&]([A-Za-z_]\w*)\s*\([^;{)]*\)\s*(?:const\s*)?(?:noexcept\s*)?(?:->\s*[\w:<>]+\s*)?\{/gm;
  const re = res[lang] || (lang === "typescript" ? res.javascript : cLike);
  for (const m of src.matchAll(re)) {
    const n = m[1] || m[2];
    if (n && !["if", "for", "while", "switch", "return", "catch", "else", "sizeof"].includes(n)) names.add(n);
  }
  return [...names];
}

/** Deepest loop nesting: braces for C-like languages, indentation for Python. */
function loopDepth(src, lang) {
  const lines = src.split("\n");
  if (INDENT_BLOCKS.has(lang) || lang === "ruby" || lang === "lua") {
    const stack = []; // indents of open loops
    let max = 0;
    let deepest = 0;
    lines.forEach((line, i) => {
      if (!line.trim()) return;
      const indent = line.match(/^\s*/)[0].replace(/\t/g, "    ").length;
      while (stack.length && indent <= stack[stack.length - 1]) stack.pop();
      if (/^\s*(for|while)\b/.test(line) || /\.each\b|\.times\b/.test(line)) {
        stack.push(indent);
        if (stack.length > max) (max = stack.length), (deepest = i + 1);
      }
    });
    return { depth: max, line: deepest };
  }
  // Brace languages: track loop scopes on a brace stack.
  let max = 0;
  let deepest = 0;
  const stack = []; // true when the brace opened a loop body
  let pendingLoop = false;
  let loops = 0;
  lines.forEach((line, i) => {
    const tokens = line.match(/\b(for|while|do)\b|[{};]/g) || [];
    for (const t of tokens) {
      if (t === "for" || t === "while" || t === "do") {
        pendingLoop = true;
        // A body without braces still nests one level for this line.
        const d = loops + 1;
        if (d > max) (max = d), (deepest = i + 1);
      } else if (t === "{") {
        stack.push(pendingLoop);
        if (pendingLoop) loops++;
        pendingLoop = false;
      } else if (t === "}") {
        if (stack.pop()) loops--;
      } else if (t === ";") {
        // "for (…) x++;" without braces, or the end of "while (…);"
        if (pendingLoop && !/for\s*\(/.test(line.slice(0, line.indexOf(";")))) pendingLoop = false;
      }
    }
  });
  return { depth: max, line: deepest };
}

const STRUCTURES = [
  ["Hash map", /\b(unordered_map|HashMap|LinkedHashMap|dict\(|defaultdict|Counter\(|\{\s*\}|new Map\(|map\[|HashMap::|BTreeMap|Dictionary<|Hash\.new)/],
  ["Ordered map", /\b(std::map|map<|TreeMap|SortedDict|BTreeMap)\b/],
  ["Set", /\b(unordered_set|set<|HashSet|TreeSet|set\(|new Set\(|BTreeSet|HashSet::)/],
  ["Heap / priority queue", /\b(priority_queue|PriorityQueue|heapq|BinaryHeap|heappush)\b/],
  ["Stack", /\b(stack<|Stack<|ArrayDeque|\.push\(|\.pop\(\))/],
  ["Queue / deque", /\b(queue<|deque|Queue<|LinkedList<|VecDeque|collections\.deque)\b/],
  ["Dynamic array", /\b(vector<|ArrayList|List<|Vec<|\[\]\s*=|list\(|append\(|push_back)\b/],
  ["Bitset / bitmask", /\b(bitset<|BitSet|<<\s*\d|1\s*<<|\b\w+\s*&\s*\(1\s*<<)/],
  ["2-D array / grid", /\[[^\]]+\]\s*\[[^\]]+\]|vector<\s*vector</],
  ["Sorting", /\b(sort\(|sorted\(|Arrays\.sort|Collections\.sort|\.sort\(|sort_by|stable_sort)/],
  ["Binary search", /\b(lower_bound|upper_bound|bisect|binarySearch|binary_search|partition_point)\b/],
  ["Memoisation", /\b(lru_cache|@cache|memo\b|dp\s*[[=(])/],
];

/** Python: is there a print() inside a for/while body? */
function printsInLoop(src) {
  const stack = [];
  for (const line of src.split("\n")) {
    if (!line.trim()) continue;
    const indent = line.match(/^\s*/)[0].replace(/\t/g, "    ").length;
    while (stack.length && indent <= stack[stack.length - 1]) stack.pop();
    if (stack.length && /\bprint\(/.test(line)) return true;
    if (/^\s*(for|while)\b/.test(line)) stack.push(indent);
  }
  return false;
}

function ioNotes(src, lang) {
  const notes = [];
  if (lang === "cpp" && /\bcin\s*>>/.test(src) && !/sync_with_stdio\s*\(\s*(false|0)\s*\)/.test(src)) notes.push("cin without ios::sync_with_stdio(false) — slow on large inputs");
  if (lang === "cpp" && /\bendl\b/.test(src)) notes.push("endl flushes on every line; '\\n' is much faster for big outputs");
  if (lang === "python" && /\binput\(\)/.test(src) && !/sys\.stdin/.test(src)) notes.push("input() per line is slow for large inputs; sys.stdin.readline or sys.stdin.read is faster");
  if (lang === "java" && /\bScanner\b/.test(src)) notes.push("Scanner is slow for large inputs; BufferedReader (or a custom tokenizer) is much faster");
  if (lang === "java" && /System\.out\.println/.test(src) && !/(PrintWriter|StringBuilder|BufferedWriter)/.test(src)) notes.push("System.out.println in a loop is slow; collect output in a StringBuilder or PrintWriter");
  if (lang === "python" && !/sys\.stdout/.test(src) && printsInLoop(src)) notes.push("print() inside a loop is slow for big outputs; join the lines and print once");
  return notes;
}

function riskNotes(src, lang, statement = "") {
  const notes = [];
  const bigValues = /10\s*\^\s*(1[0-8]|9)|1e(9|1[0-8])|10\^\{?(9|1\d)\}?|2\s*\^\s*(3[1-9]|[4-6]\d)/i.test(statement);
  if (["cpp", "c", "java", "csharp", "go", "kotlin", "swift"].includes(lang) && bigValues && /\bint\b/.test(src) && !/\b(long long|int64|Long|long\b|i64|Int64)/.test(src) && /\*/.test(src)) {
    notes.push("Values can reach 10^9 or more but only 32-bit int is used with multiplication — overflow risk");
  }
  if (lang === "python" && /def\s+(\w+)\([^)]*\)[\s\S]*?\1\(/.test(src) && !/setrecursionlimit/.test(src)) notes.push("Recursive function without sys.setrecursionlimit — deep inputs raise RecursionError");
  if (/\bmemset\s*\([^,]+,\s*(-?[2-9]\d*|0x3f)/.test(src)) notes.push("memset with a value other than 0/-1 sets bytes, not ints — check it does what you expect");
  return notes;
}

const esc = (n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The text of a function's body: indentation for Python-like code, braces otherwise. */
function bodyOf(src, name, lang) {
  const call = new RegExp(`\\b${esc(name)}\\s*\\(`);
  const m = call.exec(src);
  if (!m) return "";
  if (INDENT_BLOCKS.has(lang) || lang === "ruby") {
    const lines = src.slice(m.index).split("\n");
    const base = (src.slice(0, m.index).split("\n").pop() || "").match(/^\s*/)[0].length;
    const out = [];
    for (const line of lines.slice(1)) {
      if (line.trim() && line.match(/^\s*/)[0].length <= base) break;
      out.push(line);
    }
    return out.join("\n");
  }
  const open = src.indexOf("{", m.index);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open + 1, i);
  }
  return src.slice(open + 1);
}

const callsItself = (src, name, lang) => new RegExp(`\\b${esc(name)}\\s*\\(`).test(bodyOf(src, name, lang));

function analyze(code, lang, { statement = "" } = {}) {
  const raw = String(code || "");
  const src = stripNoise(raw, lang);
  const lines = raw.split("\n");
  const blank = lines.filter((l) => !l.trim()).length;
  const comments = commentLines(raw, lang);
  const fns = functionNames(src, lang);
  const recursive = fns.filter((n) => n !== "main" && callsItself(src, n, lang));
  const loops = (src.match(LOOP_RE) || []).length;
  const branches = (src.match(BRANCH_RE) || []).length;
  const depth = loopDepth(src, lang);
  const structures = STRUCTURES.filter(([, re]) => re.test(src)).map(([name]) => name);
  return {
    lines: lines.length,
    codeLines: lines.length - blank - comments,
    commentLines: comments,
    functions: fns.length,
    functionNames: fns.slice(0, 20),
    recursive: recursive.slice(0, 10),
    loops,
    loopDepth: depth.depth,
    deepestLoopLine: depth.line || null,
    cyclomatic: branches + loops + 1,
    structures,
    io: ioNotes(src, lang),
    risks: riskNotes(src, lang, statement),
  };
}

module.exports = { analyze, stripNoise, loopDepth, functionNames };
