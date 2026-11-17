// Topics: which kind of problem each question is (Arrays, Graphs, DP…), shown
// on every problem, filterable on the Problems page and searchable there and in
// the contest maker.
//
// One fixed list (TOPICS). A problem's topics come from, in order of trust:
//   1. staff     — a correction made in Admin; kept for good, never overwritten;
//   2. tags      — the judge's own tags (Codeforces, LeetCode, CodeChef, CSES
//                  sections, DMOJ types, SPOJ…), mapped through TAG_MAP;
//   3. text      — phrases in the title and, once fetched, the statement
//                  (TEXT_RULES, weighted);
//   4. ai        — only when 2 and 3 are unsure, and only when an admin asks for
//                  it (Admin → Problem sources → Topics), with the site's own
//                  AI model; statements are public text, nothing about any user
//                  is sent.
// Stored in problem_topics: per problem the topic ids (`ids`, read into the
// in-memory catalog when it is rebuilt, so filtering costs no reads per
// request), each topic with its confidence and where it came from (`detail`),
// whether staff locked it, and when. Writing here does not touch `problems`,
// so a backfill of the whole catalog bumps the catalog version once, not once
// per row. Custom (Workshop) problems keep their own custom_problems.topics.
const { all, get, run, runBatch } = require("./db");

/* ── the list ── */
const TOPICS = [
  { id: "arrays", label: "Arrays", group: "Basics" },
  { id: "strings", label: "Strings", group: "Basics" },
  { id: "implementation", label: "Implementation", group: "Basics" },
  { id: "simulation", label: "Simulation", group: "Basics" },
  { id: "math", label: "Math", group: "Math" },
  { id: "number-theory", label: "Number theory", group: "Math" },
  { id: "combinatorics", label: "Combinatorics", group: "Math" },
  { id: "probability", label: "Probability", group: "Math" },
  { id: "geometry", label: "Geometry", group: "Math" },
  { id: "game-theory", label: "Game theory", group: "Math" },
  { id: "matrices", label: "Matrices", group: "Math" },
  { id: "bit-manipulation", label: "Bit manipulation", group: "Math" },
  { id: "hashing", label: "Hashing", group: "Techniques" },
  { id: "two-pointers", label: "Two pointers", group: "Techniques" },
  { id: "sliding-window", label: "Sliding window", group: "Techniques" },
  { id: "prefix-sums", label: "Prefix sums", group: "Techniques" },
  { id: "sorting", label: "Sorting", group: "Techniques" },
  { id: "binary-search", label: "Binary search", group: "Techniques" },
  { id: "greedy", label: "Greedy", group: "Techniques" },
  { id: "recursion", label: "Recursion", group: "Techniques" },
  { id: "backtracking", label: "Backtracking", group: "Techniques" },
  { id: "divide-and-conquer", label: "Divide and conquer", group: "Techniques" },
  { id: "brute-force", label: "Brute force", group: "Techniques" },
  { id: "constructive", label: "Constructive", group: "Techniques" },
  { id: "interactive", label: "Interactive", group: "Techniques" },
  { id: "stack", label: "Stack", group: "Data structures" },
  { id: "queue", label: "Queue / deque", group: "Data structures" },
  { id: "linked-list", label: "Linked list", group: "Data structures" },
  { id: "heap", label: "Heap", group: "Data structures" },
  { id: "trees", label: "Trees", group: "Data structures" },
  { id: "bst", label: "Binary search tree", group: "Data structures" },
  { id: "trie", label: "Trie", group: "Data structures" },
  { id: "segment-tree", label: "Segment tree / Fenwick", group: "Data structures" },
  { id: "union-find", label: "Union-find", group: "Data structures" },
  { id: "data-structures", label: "Data structures", group: "Data structures" },
  { id: "graphs", label: "Graphs", group: "Graphs" },
  { id: "bfs-dfs", label: "BFS / DFS", group: "Graphs" },
  { id: "shortest-paths", label: "Shortest paths", group: "Graphs" },
  { id: "mst", label: "Minimum spanning tree", group: "Graphs" },
  { id: "topological-sort", label: "Topological sort", group: "Graphs" },
  { id: "flows", label: "Flows and matching", group: "Graphs" },
  { id: "dp", label: "Dynamic programming", group: "Dynamic programming" },
  { id: "dp-bitmask", label: "Bitmask DP", group: "Dynamic programming" },
  { id: "dp-trees", label: "DP on trees", group: "Dynamic programming" },
  { id: "dp-digits", label: "Digit DP", group: "Dynamic programming" },
  { id: "string-algorithms", label: "String algorithms", group: "Advanced" },
  { id: "fft", label: "FFT", group: "Advanced" },
  { id: "database", label: "Database (SQL)", group: "Other" },
];
const BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

/* ── the judges' own tags → topics ── (keys are lower case, trimmed) */
const TAG_MAP = {
  // Codeforces
  "implementation": ["implementation"],
  "math": ["math"],
  "greedy": ["greedy"],
  "dp": ["dp"],
  "data structures": ["data-structures"],
  "brute force": ["brute-force"],
  "constructive algorithms": ["constructive"],
  "graphs": ["graphs"],
  "sortings": ["sorting"],
  "binary search": ["binary-search"],
  "dfs and similar": ["bfs-dfs", "graphs"],
  "trees": ["trees"],
  "strings": ["strings"],
  "number theory": ["number-theory", "math"],
  "combinatorics": ["combinatorics", "math"],
  "two pointers": ["two-pointers"],
  "bitmasks": ["bit-manipulation"],
  "geometry": ["geometry"],
  "dsu": ["union-find"],
  "shortest paths": ["shortest-paths", "graphs"],
  "probabilities": ["probability", "math"],
  "divide and conquer": ["divide-and-conquer"],
  "hashing": ["hashing"],
  "games": ["game-theory"],
  "interactive": ["interactive"],
  "flows": ["flows", "graphs"],
  "graph matchings": ["flows", "graphs"],
  "matrices": ["matrices"],
  "string suffix structures": ["string-algorithms", "strings"],
  "ternary search": ["binary-search"],
  "fft": ["fft", "math"],
  "meet-in-the-middle": ["brute-force"],
  "expression parsing": ["strings", "implementation"],
  "2-sat": ["graphs"],
  "chinese remainder theorem": ["number-theory", "math"],
  "schedules": ["greedy"],
  // LeetCode (topicTags)
  "array": ["arrays"],
  "string": ["strings"],
  "hash table": ["hashing"],
  "dynamic programming": ["dp"],
  "sorting": ["sorting"],
  "depth-first search": ["bfs-dfs"],
  "breadth-first search": ["bfs-dfs"],
  "database": ["database"],
  "tree": ["trees"],
  "binary tree": ["trees"],
  "matrix": ["matrices", "arrays"],
  "bit manipulation": ["bit-manipulation"],
  "heap (priority queue)": ["heap"],
  "stack": ["stack"],
  "monotonic stack": ["stack"],
  "prefix sum": ["prefix-sums"],
  "simulation": ["simulation"],
  "graph": ["graphs"],
  "counting": ["hashing"],
  "sliding window": ["sliding-window"],
  "backtracking": ["backtracking"],
  "union find": ["union-find"],
  "linked list": ["linked-list"],
  "doubly-linked list": ["linked-list"],
  "ordered set": ["data-structures"],
  "trie": ["trie"],
  "segment tree": ["segment-tree"],
  "binary indexed tree": ["segment-tree"],
  "queue": ["queue"],
  "monotonic queue": ["queue"],
  "recursion": ["recursion"],
  "memoization": ["dp"],
  "topological sort": ["topological-sort", "graphs"],
  "binary search tree": ["bst", "trees"],
  "shortest path": ["shortest-paths", "graphs"],
  "game theory": ["game-theory"],
  "number theory": ["number-theory"],
  "data stream": ["data-structures"],
  "bitmask": ["dp-bitmask", "bit-manipulation"],
  "rolling hash": ["hashing", "string-algorithms"],
  "hash function": ["hashing"],
  "string matching": ["string-algorithms", "strings"],
  "suffix array": ["string-algorithms"],
  "probability and statistics": ["probability"],
  "minimum spanning tree": ["mst", "graphs"],
  "strongly connected component": ["graphs"],
  "biconnected component": ["graphs"],
  "eulerian circuit": ["graphs"],
  "merge sort": ["sorting", "divide-and-conquer"],
  "bucket sort": ["sorting"],
  "counting sort": ["sorting"],
  "radix sort": ["sorting"],
  "quickselect": ["sorting"],
  "line sweep": ["sorting"],
  "enumeration": ["brute-force"],
  "brainteaser": ["math"],
  "design": ["data-structures"],
  // CSES sections (stored lower-case)
  "introductory problems": ["implementation"],
  "sorting and searching": ["sorting", "binary-search"],
  "graph algorithms": ["graphs"],
  "range queries": ["segment-tree", "prefix-sums"],
  "tree algorithms": ["trees"],
  "mathematics": ["math"],
  "string algorithms": ["string-algorithms", "strings"],
  "advanced techniques": ["data-structures"],
  "sliding window problems": ["sliding-window"],
  "interactive problems": ["interactive"],
  "bitwise operations": ["bit-manipulation"],
  // DMOJ types / CodeChef / SPOJ / common words
  "graph theory": ["graphs"],
  "simple math": ["math"],
  "advanced math": ["math"],
  "ad hoc": ["implementation"],
  "greedy algorithms": ["greedy"],
  "dynamic-programming": ["dp"],
  "segment-tree": ["segment-tree"],
  "segment trees": ["segment-tree"],
  "fenwick tree": ["segment-tree"],
  "bit": ["segment-tree"],
  "binary-search": ["binary-search"],
  "prefix sums": ["prefix-sums"],
  "prefix-sum": ["prefix-sums"],
  "bfs": ["bfs-dfs", "graphs"],
  "dfs": ["bfs-dfs", "graphs"],
  "dijkstra": ["shortest-paths", "graphs"],
  "disjoint set union": ["union-find"],
  "sieve": ["number-theory"],
  "gcd": ["number-theory"],
  "modular arithmetic": ["number-theory"],
  "primes": ["number-theory"],
  "bitwise": ["bit-manipulation"],
  "xor": ["bit-manipulation"],
  "heap": ["heap"],
  "priority queue": ["heap"],
  "deque": ["queue"],
  "kmp": ["string-algorithms"],
  "z-function": ["string-algorithms"],
  "dp on trees": ["dp-trees", "dp", "trees"],
  "tree dp": ["dp-trees", "dp", "trees"],
  "bitmask dp": ["dp-bitmask", "dp"],
  "digit dp": ["dp-digits", "dp"],
  "basic programming": ["implementation"],
  "basic math": ["math"],
  "sorting algorithms": ["sorting"],
  "arrays": ["arrays"],
  "string manipulation": ["strings"],
  "maths": ["math"],
};

/* ── words in the title and statement → topics (pattern, topics, weight) ── */
const TEXT_RULES = [
  [/\bshortest (path|route|distance)s?\b|\bdijkstra\b|\bbellman[- ]ford\b|\bfloyd\b/i, ["shortest-paths", "graphs"], 3],
  [/\bspanning tree\b|\bkruskal\b|\bprim'?s\b/i, ["mst", "graphs"], 3],
  [/\btopological(ly)? (order|sort)/i, ["topological-sort", "graphs"], 3],
  [/\b(undirected|directed|weighted) graph\b|\bvertices\b|\bedges?\b.*\bvert(ex|ices)\b|\bgraph\b/i, ["graphs"], 2],
  [/\bbfs\b|\bdfs\b|\bbreadth[- ]first\b|\bdepth[- ]first\b|\bconnected components?\b|\bgrid\b.*\b(reach|path|island|maze)\b|\bmaze\b|\bislands?\b/i, ["bfs-dfs"], 2],
  [/\brooted tree\b|\btree with \w+ (nodes|vertices)\b|\bsubtree\b|\blowest common ancestor\b|\bLCA\b|\bbinary tree\b/i, ["trees"], 3],
  [/\bbinary search tree\b|\bBST\b/, ["bst", "trees"], 3],
  [/\btrie\b|\bprefix tree\b/i, ["trie"], 3],
  [/\blinked list\b|\bnext pointer\b|\blist node\b/i, ["linked-list"], 3],
  [/\bstack\b|\bparenthes[ie]s\b|\bbracket sequence\b|\bnext greater\b/i, ["stack"], 2],
  [/\bqueue\b|\bdeque\b/i, ["queue"], 2],
  [/\bpriority queue\b|\bheap\b|\bk-?th (largest|smallest)\b|\bmedian of\b/i, ["heap"], 2],
  [/\b(range|interval) (sum|minimum|maximum|query|update)\b|\bsegment tree\b|\bfenwick\b|\bupdate .{0,30}\bquer(y|ies)\b/i, ["segment-tree"], 2],
  [/\bunion[- ]find\b|\bdisjoint set\b|\bmerge (the )?groups?\b/i, ["union-find"], 3],
  [/\bmaximum flow\b|\bmax[- ]flow\b|\bbipartite matching\b|\bmin(imum)? cut\b/i, ["flows", "graphs"], 3],
  [/\bsubarrays?\b|\barray\b|\bsequence of \w+ integers\b|\bn integers\b/i, ["arrays"], 1],
  [/\bsubstrings?\b|\bpalindrom\w*\b|\banagram\w*\b|\bcharacters?\b|\bstring\b|\blowercase (latin |english )?letters\b/i, ["strings"], 1],
  [/\bsubsequences?\b.*\b(longest|maximum|count|number of ways)\b|\bnumber of ways\b|\bminimum (number of )?(cost|operations|steps) to\b|\bknapsack\b|\bcoin change\b|\bdynamic programming\b/i, ["dp"], 2],
  [/\bmodulo\s*(10\^?9|1e9|998244353|1000000007|10\s*\^\s*9)\b|\bprime\w*\b|\bgcd\b|\blcm\b|\bdivisors?\b|\bdivisible\b|\bfactori[sz]\w*\b/i, ["number-theory", "math"], 1],
  [/\bbinomial\b|\bpermutations? of\b|\bcombinations?\b|\bchoose\b.*\bways\b|\bcount the number of (permutations|arrays|sequences|strings)\b/i, ["combinatorics", "math"], 2],
  [/\bprobabilit\w*\b|\bexpected (value|number)\b/i, ["probability", "math"], 3],
  [/\bpoints? on (a|the) plane\b|\bpolygon\b|\bcircle\b|\bconvex hull\b|\bcoordinates? \(x, ?y\)/i, ["geometry"], 2],
  [/\b(alice|bob)\b.*\b(turn|move)s?\b.*\b(win|lose|optimal(ly)?)\b|\bplays? optimally\b|\bwinning strategy\b/i, ["game-theory"], 3],
  [/\bbitwise\b|\bxor\b|\bbinary representation\b|\bAND\b.*\bOR\b/i, ["bit-manipulation"], 2],
  [/\bsorted (array|order|in non-decreasing)\b|\bsort the\b|\bin sorted order\b/i, ["sorting"], 1],
  [/\bbinary search\b|\bminimi[sz]e the maximum\b|\bmaximi[sz]e the minimum\b|\bsmallest (possible )?value .* such that\b/i, ["binary-search"], 2],
  [/\btwo pointers?\b|\bpair(s)? with (sum|difference)\b/i, ["two-pointers"], 2],
  [/\bsliding window\b|\b(every|each) (contiguous )?window of (size|length)\b|\bconsecutive \w+ of length k\b/i, ["sliding-window"], 3],
  [/\bprefix sums?\b|\bcumulative sum\b|\bsum of (the )?(elements|numbers) (from|between) .* to\b/i, ["prefix-sums"], 2],
  [/\bgenerate all\b|\ball (possible )?(subsets|permutations|combinations)\b|\bn-?queens\b|\bsudoku\b/i, ["backtracking"], 3],
  [/\brecursion\b|\brecursive(ly)?\b/i, ["recursion"], 2],
  [/\binteractive\b|\bflush the output\b|\byou can ask (at most )?\w* quer(y|ies)\b/i, ["interactive"], 3],
  [/\bsimulate\b|\bsimulation\b|\bstep by step\b/i, ["simulation"], 1],
  [/\bconstruct\b|\bprint any (valid|such)\b|\bif there are (several|multiple) (answers|solutions), print any\b/i, ["constructive"], 2],
  [/\bgreedy\b|\bmaximum number of (tasks|events|meetings|intervals)\b|\bschedul\w*\b/i, ["greedy"], 1],
  [/\bmatrix\b|\bmatrices\b/i, ["matrices"], 1],
  [/\bSELECT\b.*\bFROM\b|\bSQL\b|\btable [`"]?\w+[`"]?\b.*\bcolumns?\b/, ["database"], 3],
];

/** Normalise a tag for TAG_MAP: lower case, trimmed, single spaces. */
const norm = (t) => String(t || "").toLowerCase().replace(/^\*|[#]/g, "").replace(/\s+/g, " ").trim();

function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map(String);
  try {
    const a = JSON.parse(tags || "[]");
    return Array.isArray(a) ? a.map(String) : [];
  } catch {
    return [];
  }
}

const plain = (html) =>
  String(html || "")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\$+[^$]{0,200}\$+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Topics for one tag (exact, then known spellings). */
function topicsOfTag(tag) {
  const n = norm(tag);
  if (!n) return [];
  if (TAG_MAP[n]) return TAG_MAP[n];
  if (BY_ID.has(n.replace(/\s+/g, "-"))) return [n.replace(/\s+/g, "-")];
  return [];
}

const MAX_TOPICS = 5;
/** Broad topics: true of many problems, so they rank after the telling ones. */
const GENERIC = new Set(["implementation", "math", "brute-force", "data-structures", "constructive", "greedy", "sorting", "simulation"]);
const SURE = 0.6;

/**
 * Classify one problem. Returns { topics: [{ id, conf, from }], sure } — at
 * most five topics, highest confidence first. `sure` is false when nothing
 * reached SURE (then the AI step may help, when an admin runs it).
 */
function classify({ title = "", tags = [], category = "", statement = "", input_spec = "", output_spec = "", note = "" } = {}) {
  const score = new Map(); // id -> { conf, from }
  const bump = (id, conf, from) => {
    if (!BY_ID.has(id)) return;
    const was = score.get(id);
    if (!was || conf > was.conf) score.set(id, { conf, from: was && was.conf >= conf ? was.from : from });
  };
  // 1. The judge's own tags: trusted. Judges list tags alphabetically, not by
  // importance, so every tag counts the same; the broad ones ("implementation",
  // "math") rank below the telling ones ("fft", "dp"), so the chips shown first
  // say the most.
  for (const t of [...parseTags(tags), ...(category && category !== "__hidden" ? [category] : [])]) {
    const ids = topicsOfTag(t);
    ids.forEach((id, i) => bump(id, (GENERIC.has(id) ? 0.84 : 0.92) - (i ? 0.08 : 0), "tags"));
  }
  // 2. Words in the title (strong) and the statement (fetched or written).
  const text = `${plain(title)}\n${plain(statement)}\n${plain(input_spec)}\n${plain(output_spec)}\n${plain(note)}`.slice(0, 20000);
  const titleText = plain(title);
  const sums = new Map();
  for (const [re, ids, w] of TEXT_RULES) {
    const inTitle = re.test(titleText);
    const inText = inTitle || re.test(text);
    if (!inText) continue;
    for (const id of ids) sums.set(id, (sums.get(id) || 0) + w * (inTitle ? 2 : 1));
  }
  // When the judge's tags already say what it is, a word alone adds a topic
  // only on strong evidence ("Coin Combinations" is DP, not combinatorics).
  const tagged = score.size > 0;
  for (const [id, s] of sums) {
    const conf = Math.min(0.85, 0.25 + s * 0.1);
    if (!tagged || conf >= 0.75 || score.has(id)) bump(id, conf, "text");
  }
  // A specific kind implies its family (bitmask DP is DP; a BST is a tree).
  for (const [id, { conf, from }] of [...score]) {
    if (id.startsWith("dp-")) bump("dp", conf * 0.95, from);
    if (["shortest-paths", "mst", "topological-sort", "flows", "bfs-dfs"].includes(id) && conf >= SURE) bump("graphs", conf * 0.9, from);
    if (id === "bst") bump("trees", conf * 0.95, from);
  }
  const topics = [...score]
    .map(([id, v]) => ({ id, conf: Math.round(v.conf * 100) / 100, from: v.from }))
    .filter((t) => t.conf >= 0.45)
    .sort((a, b) => b.conf - a.conf || TOPICS.findIndex((x) => x.id === a.id) - TOPICS.findIndex((x) => x.id === b.id))
    .slice(0, MAX_TOPICS);
  return { topics, sure: topics.some((t) => t.conf >= SURE) };
}

/* ── storage ── */
let ready = null;
function init() {
  if (!ready) {
    ready = (async () => {
      try {
        await run("ALTER TABLE custom_problems ADD COLUMN topics TEXT DEFAULT '[]'");
      } catch {
        /* already there */
      }
      await run(`CREATE TABLE IF NOT EXISTS problem_topics (
        problem_rowid INTEGER PRIMARY KEY,
        ids TEXT NOT NULL DEFAULT '[]',
        detail TEXT NOT NULL DEFAULT '[]',
        locked INTEGER NOT NULL DEFAULT 0,
        sure INTEGER NOT NULL DEFAULT 0,
        has_text INTEGER NOT NULL DEFAULT 0,
        updated_by TEXT,
        updated_at INTEGER NOT NULL
      )`);
      await run("CREATE INDEX IF NOT EXISTS idx_problem_topics_unsure ON problem_topics(sure, locked)");
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

const catalog = () => require("./problem-catalog");

const idsOf = (topics) => JSON.stringify(topics.map((t) => t.id));

/** The statement fields of a problem, when fetched. */
async function statementOf(rowid) {
  try {
    return (await get("SELECT statement, input_spec, output_spec, note FROM problem_statements WHERE problem_rowid=?", [rowid])) || {};
  } catch {
    return {};
  }
}

/**
 * Classify and store one catalog problem, unless staff locked its topics.
 * `known` may pass the problem row and/or statement to save reads. Returns the
 * stored { topics, sure, locked }.
 */
async function classifyProblem(rowid, known = {}) {
  await init();
  const meta = await get("SELECT ids, detail, locked FROM problem_topics WHERE problem_rowid=?", [rowid]);
  if (meta && meta.locked) return { topics: JSON.parse(meta.detail || "[]"), sure: true, locked: true };
  const p = known.problem || (await get("SELECT id, title, tags, category FROM problems WHERE id=?", [rowid]));
  if (!p) return null;
  const st = known.statement || (await statementOf(rowid));
  const r = classify({ title: p.title, tags: p.tags, category: p.category, ...st });
  const hasText = !!(st && st.statement);
  await run(
    `INSERT INTO problem_topics(problem_rowid, ids, detail, locked, sure, has_text, updated_by, updated_at) VALUES(?,?,?,0,?,?,NULL,?)
     ON CONFLICT(problem_rowid) DO UPDATE SET ids=excluded.ids, detail=excluded.detail, sure=excluded.sure, has_text=excluded.has_text, updated_at=excluded.updated_at
     WHERE problem_topics.locked=0`,
    [rowid, idsOf(r.topics), JSON.stringify(r.topics), r.sure ? 1 : 0, hasText ? 1 : 0, Date.now()],
  );
  // Only a real change makes the catalog reload.
  if (!meta || meta.ids !== idsOf(r.topics)) await catalog().bumpVersion();
  return { ...r, locked: false };
}

/** A staff correction: these topics, kept for good (the pipeline never changes them). */
async function setTopics(rowid, ids, by) {
  await init();
  const clean = [...new Set((ids || []).map(String).filter((id) => BY_ID.has(id)))].slice(0, MAX_TOPICS);
  const detail = clean.map((id) => ({ id, conf: 1, from: "staff" }));
  await run(
    `INSERT INTO problem_topics(problem_rowid, ids, detail, locked, sure, has_text, updated_by, updated_at) VALUES(?,?,?,1,1,0,?,?)
     ON CONFLICT(problem_rowid) DO UPDATE SET ids=excluded.ids, detail=excluded.detail, locked=1, sure=1, updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
    [rowid, JSON.stringify(clean), JSON.stringify(detail), by || null, Date.now()],
  );
  await catalog().bumpVersion();
  return detail;
}

/** Undo a staff correction: back to what the pipeline finds. */
async function unlock(rowid) {
  await init();
  await run("UPDATE problem_topics SET locked=0 WHERE problem_rowid=?", [rowid]);
  return classifyProblem(rowid);
}

/** What is stored for a problem (for the problem page and Admin). */
async function topicsFor(rowid) {
  await init();
  const meta = await get("SELECT detail, locked, sure, has_text, updated_by, updated_at FROM problem_topics WHERE problem_rowid=?", [rowid]);
  if (!meta) return { topics: [], locked: false, sure: false, classified: false };
  return {
    topics: JSON.parse(meta.detail || "[]"),
    locked: !!meta.locked,
    sure: !!meta.sure,
    hasText: !!meta.has_text,
    updatedBy: meta.updated_by || null,
    updatedAt: meta.updated_at,
    classified: true,
  };
}

/** Topic ids for a custom (Workshop) problem, from its own title, tags and statement. */
function customTopics(p) {
  return classify({ title: p.title, tags: p.tags, statement: p.statement, input_spec: p.input_spec, output_spec: p.output_spec }).topics.map((t) => t.id);
}

/* ── the backfill: every problem, in small steps, resumable ── */
const job = { running: false, stop: false, done: 0, total: 0, sure: 0, unsure: 0, startedAt: 0, finishedAt: 0, by: null, error: null, ai: { asked: 0, helped: 0, error: null } };

function status() {
  return { ...job, ai: { ...job.ai } };
}

/**
 * Classify every problem with no topics yet (or all of them with `all`),
 * 200 at a time with a short pause, so a big catalog never floods the
 * database. Safe to run again: locked problems are never touched, and a
 * restarted run picks up where the last one stopped.
 */
async function backfill({ all: everything = false, by = null, pauseMs = 300, batch = 200, ai = null } = {}) {
  if (job.running) return status();
  await init();
  Object.assign(job, { running: true, stop: false, done: 0, sure: 0, unsure: 0, startedAt: Date.now(), finishedAt: 0, by, error: null, ai: { asked: 0, helped: 0, error: null } });
  const where = everything ? "" : "WHERE t.problem_rowid IS NULL";
  try {
    const n = await get(`SELECT COUNT(*) AS n FROM problems p LEFT JOIN problem_topics t ON t.problem_rowid=p.id ${where}`);
    job.total = Number(n?.n || 0);
    let after = 0;
    for (;;) {
      if (job.stop) break;
      const rows = await all(
        `SELECT p.id, p.title, p.tags, p.category, s.statement, s.input_spec, s.output_spec, s.note
           FROM problems p LEFT JOIN problem_topics t ON t.problem_rowid=p.id LEFT JOIN problem_statements s ON s.problem_rowid=p.id
          WHERE p.id > ? ${everything ? "AND COALESCE(t.locked,0)=0" : "AND t.problem_rowid IS NULL"} ORDER BY p.id LIMIT ?`,
        [after, batch],
      );
      if (!rows.length) break;
      const stmts = [];
      const now = Date.now();
      for (const p of rows) {
        after = p.id;
        const r = classify(p);
        job.done++;
        if (r.sure) job.sure++;
        else job.unsure++;
        stmts.push([
          `INSERT INTO problem_topics(problem_rowid, ids, detail, locked, sure, has_text, updated_by, updated_at) VALUES(?,?,?,0,?,?,NULL,?)
           ON CONFLICT(problem_rowid) DO UPDATE SET ids=excluded.ids, detail=excluded.detail, sure=excluded.sure, has_text=excluded.has_text, updated_at=excluded.updated_at
           WHERE problem_topics.locked=0`,
          [p.id, idsOf(r.topics), JSON.stringify(r.topics), r.sure ? 1 : 0, p.statement ? 1 : 0, now],
        ]);
      }
      await runBatch(stmts);
      // Problems can arrive while this runs (a sync finishing): count what is
      // left, so the progress never reads "3,000 of 400".
      const left = await get(
        `SELECT COUNT(*) AS n FROM problems p LEFT JOIN problem_topics t ON t.problem_rowid=p.id WHERE p.id > ? ${everything ? "AND COALESCE(t.locked,0)=0" : "AND t.problem_rowid IS NULL"}`,
        [after],
      );
      job.total = job.done + Number(left?.n || 0);
      if (pauseMs) await new Promise((res) => setTimeout(res, pauseMs));
    }
    if (ai && !job.stop) await aiPass(ai);
    // One catalog reload for the whole run (not one per row).
    if (job.done || job.ai.helped) await catalog().bumpVersion();
  } catch (e) {
    job.error = String(e.message || e).slice(0, 300);
  } finally {
    job.running = false;
    job.finishedAt = Date.now();
  }
  return status();
}

/**
 * Problems whose title or tags changed in a source sync: drop their
 * pipeline topics (never a staff correction) so the next run finds them again.
 */
async function forget(platform, problemIds) {
  if (!problemIds || !problemIds.length) return 0;
  await init();
  let n = 0;
  for (let i = 0; i < problemIds.length; i += 200) {
    const part = problemIds.slice(i, i + 200);
    const r = await run(
      `DELETE FROM problem_topics WHERE locked=0 AND problem_rowid IN (SELECT id FROM problems WHERE platform=? AND problem_id IN (${part.map(() => "?").join(",")}))`,
      [platform, ...part],
    );
    n += Number(r?.changes || 0);
  }
  return n;
}

/** Automatic runs (startup, after a sync) are off in tests unless TOPICS_AUTO=1. */
const AUTO = process.env.NODE_ENV !== "test" || process.env.TOPICS_AUTO === "1";

/** Give every problem with no topics yet its topics, in the background. */
function classifyNew({ by = "auto", pauseMs } = {}) {
  if (!AUTO || job.running) return false;
  backfill({ by, ...(pauseMs != null ? { pauseMs } : {}) }).catch((e) => console.warn("[topics] backfill failed:", e.message));
  return true;
}

function stopBackfill() {
  job.stop = true;
  return status();
}

/**
 * The AI step: for unsure problems whose statement we have, ask the site's
 * AI model which of our topics fit (public statement text only). At most
 * `limit` problems per run, counted against the admin's own AI budget.
 */
async function aiPass({ user, limit = 30, ask }) {
  const rows = await all(
    `SELECT p.id, p.title, s.statement FROM problem_topics t JOIN problems p ON p.id=t.problem_rowid JOIN problem_statements s ON s.problem_rowid=p.id
      WHERE t.sure=0 AND t.locked=0 AND t.has_text=1 ORDER BY p.id LIMIT ?`,
    [Math.max(1, Math.min(100, limit))],
  );
  for (const p of rows) {
    if (job.stop) break;
    job.ai.asked++;
    let ids;
    try {
      ids = await ask({ title: p.title, statement: plain(p.statement).slice(0, 4000), topics: TOPICS.map((t) => `${t.id}: ${t.label}`) }, user);
    } catch (e) {
      job.ai.error = String(e.message || e).slice(0, 200);
      break;
    }
    const good = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter((id) => BY_ID.has(id)))].slice(0, 3);
    if (!good.length) continue;
    const have = (await topicsFor(p.id)).topics;
    const merged = [...have.filter((t) => !good.includes(t.id)), ...good.map((id) => ({ id, conf: 0.7, from: "ai" }))]
      .sort((a, b) => b.conf - a.conf)
      .slice(0, MAX_TOPICS);
    await run("UPDATE problem_topics SET ids=?, detail=?, sure=1, updated_at=? WHERE problem_rowid=? AND locked=0", [idsOf(merged), JSON.stringify(merged), Date.now(), p.id]);
    job.ai.helped++;
  }
}

/** Counts for Admin: how many problems have topics, how many are unsure, locked. */
async function summary() {
  await init();
  const row = await get(
    `SELECT COUNT(*) AS classified, SUM(sure) AS sure, SUM(CASE WHEN sure=0 THEN 1 ELSE 0 END) AS unsure, SUM(locked) AS locked, SUM(has_text) AS with_text FROM problem_topics`,
  );
  const total = await get("SELECT COUNT(*) AS n FROM problems");
  return {
    total: Number(total?.n || 0),
    classified: Number(row?.classified || 0),
    sure: Number(row?.sure || 0),
    unsure: Number(row?.unsure || 0),
    locked: Number(row?.locked || 0),
    withText: Number(row?.with_text || 0),
  };
}

/**
 * The topic ids a search text asks for: `topic:dp` or `topic:"binary search"`
 * (a filter), or the whole text being a topic name ("dynamic programming",
 * "graphs"): then `orTopic` is that id, and the search finds problems whose
 * title matches OR that have the topic (a problem called "Stack" still shows).
 * Returns { ids, rest, orTopic } — rest is the search without the topic part.
 */
function topicsInQuery(q) {
  const ids = [];
  let rest = String(q || "").replace(/\btopic:\s*("([^"]+)"|([\w-]+))/gi, (_m, _all, quoted, bare) => {
    const id = findTopic(quoted || bare);
    if (id) ids.push(id);
    return " ";
  });
  rest = rest.replace(/\s+/g, " ").trim();
  if (!ids.length && rest) {
    const id = findTopic(rest, true);
    if (id) return { ids: [], rest, orTopic: id };
  }
  return { ids: [...new Set(ids)], rest, orTopic: null };
}

const ALIASES = {
  dp: "dp", "dynamic programming": "dp", graph: "graphs", graphs: "graphs", tree: "trees", trees: "trees", bfs: "bfs-dfs", dfs: "bfs-dfs",
  "bfs/dfs": "bfs-dfs", dsu: "union-find", "union find": "union-find", "disjoint set": "union-find", "segment tree": "segment-tree", fenwick: "segment-tree",
  bit: "bit-manipulation", bits: "bit-manipulation", bitmask: "bit-manipulation", "bitmask dp": "dp-bitmask", "digit dp": "dp-digits", "tree dp": "dp-trees",
  "dp on trees": "dp-trees", hash: "hashing", hashmap: "hashing", "hash map": "hashing", "binary search": "binary-search", "two pointers": "two-pointers",
  "two pointer": "two-pointers", "sliding window": "sliding-window", "prefix sum": "prefix-sums", "prefix sums": "prefix-sums", heap: "heap",
  "priority queue": "heap", sort: "sorting", sorting: "sorting", greedy: "greedy", math: "math", maths: "math", "number theory": "number-theory",
  combinatorics: "combinatorics", geometry: "geometry", strings: "strings", string: "strings", arrays: "arrays", array: "arrays", stack: "stack", queue: "queue",
  deque: "queue", "linked list": "linked-list", trie: "trie", bst: "bst", "shortest path": "shortest-paths", "shortest paths": "shortest-paths",
  dijkstra: "shortest-paths", mst: "mst", "topological sort": "topological-sort", toposort: "topological-sort", flow: "flows", flows: "flows",
  matching: "flows", backtracking: "backtracking", recursion: "recursion", "game theory": "game-theory", games: "game-theory", probability: "probability",
  fft: "fft", sql: "database", database: "database", implementation: "implementation", simulation: "simulation", constructive: "constructive",
  interactive: "interactive", "brute force": "brute-force", "divide and conquer": "divide-and-conquer", matrix: "matrices", matrices: "matrices",
  kmp: "string-algorithms", "string algorithms": "string-algorithms",
};

/** A topic id from a name, id or alias; `exact` needs the whole text to be one. */
function findTopic(text, exact = false) {
  const n = norm(text).replace(/_/g, " ");
  if (!n) return null;
  if (BY_ID.has(n)) return n;
  if (BY_ID.has(n.replace(/\s+/g, "-"))) return n.replace(/\s+/g, "-");
  if (ALIASES[n]) return ALIASES[n];
  const byLabel = TOPICS.find((t) => t.label.toLowerCase() === n);
  if (byLabel) return byLabel.id;
  if (exact) return null;
  const starts = TOPICS.find((t) => t.label.toLowerCase().startsWith(n) || t.id.startsWith(n));
  return starts ? starts.id : null;
}

/** Does a catalog row have every one of these topic ids? */
function rowHasTopics(row, ids) {
  if (!ids || !ids.length) return true;
  const have = row.topics;
  if (!have || have === "[]") return false;
  return ids.every((id) => have.includes(`"${id}"`));
}

module.exports = {
  TOPICS,
  TAG_MAP,
  TEXT_RULES,
  classify,
  classifyProblem,
  setTopics,
  unlock,
  topicsFor,
  customTopics,
  backfill,
  classifyNew,
  forget,
  stopBackfill,
  status,
  summary,
  topicsInQuery,
  findTopic,
  rowHasTopics,
  init,
};
