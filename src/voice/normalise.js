/*
  S5 — the server ears' normaliser (docs/voice/STEP1_EARS_DESIGN.md §S5).
  Pure rules, no AI. It runs on every text a speech service returns, before
  the site acts on it.

  normalise(text, { mode, hints, lang }) → {
    text,       what the site acts on: the same words, cleaned and with names
                fixed. Words stay words ("i plus plus" stays), because the
                browser's own parsers (voice/actions, voice/code) read words.
    code,       code pages only: the speech written as code ("i++", "n - 1",
                "a[i] = 0"), for the caption and for dictation.
    unplaced,   code pages only: words it could not place (S6 treats a clip
                with these as unsure).
    retryHindi, Urdu script came back: ask for Hindi again (S4).
    changes,    [{ from, to, rule }] for the caption and the tests.
  }

  mode: "text" (Explain-back, questions), "command" (the mic in the top bar),
  "code" (an editor is in use).

  What it does, in order:
  1. Clean: Devanagari digits → 0–9, the danda (।) → a full stop, spaces.
  2. Names spelt letter by letter ("bee eff ess", "b f s") → BFS, but only
     when the joined name is in the glossary or on the page.
  3. Known mishearings of CS words ("beefs" → BFS, "kyu" → queue).
  4. command and code: near-misses of the page's own names and the glossary
     (edit distance ≤ 1 for short names, ≤ 2 for longer ones, same first
     sound): "mit" → mid when "mid" is on the page. Only names that exist on
     the page or in the glossary, so it never invents a word; common words are
     never touched.
  5. code: spoken code → symbols and number words → digits.
*/
const { numberSpans, asciiDigits, ONES, TENS, SCALES } = require("./numwords");

/* Number words are never "fixed" to a name ("three" is not "tree"). */
const NUMBER_WORDS = new Set([...Object.keys(ONES), ...Object.keys(TENS), ...Object.keys(SCALES), "point", "dot", "minus", "plus"]);

/* ── the glossary (canonical spellings) ── */

const GLOSSARY = [
  // Acronyms students say letter by letter.
  "BFS", "DFS", "DP", "LCS", "LIS", "MST", "DSU", "BST", "AVL", "GCD", "LCM", "XOR", "SQL", "DBMS", "OS", "CPU", "RAM", "ROM",
  "TCP", "UDP", "IP", "DNS", "HTTP", "API", "JSON", "HTML", "CSS", "JS", "GATE", "NAT", "MCQ", "MSQ", "TLE", "WA", "AC", "OOP",
  "LRU", "FIFO", "LIFO", "DAG", "NFA", "DFA", "PDA", "CFG", "TM", "ALU", "IEEE", "BCD", "MUX", "SOP", "POS", "KMP",
  // Words.
  "array", "queue", "deque", "stack", "heap", "pointer", "recursion", "mid", "low", "high", "left", "right", "node", "root",
  "tree", "graph", "vertex", "edge", "hash", "hashmap", "map", "set", "vector", "string", "sort", "merge", "quick", "binary",
  "search", "loop", "index", "null", "nullptr", "return", "function", "variable", "matrix", "Dijkstra", "Kruskal", "Prim",
  "Bellman", "Ford", "Floyd", "Warshall", "Kadane", "memo", "memoization", "tabulation", "greedy", "backtracking", "bitmask",
  "segment", "Fenwick", "trie", "iterator", "linked", "list", "submit", "run", "complexity", "pivot", "partition", "prefix",
  "suffix", "window", "pointer", "sliding", "subarray", "substring", "subsequence", "palindrome", "modulo", "integer", "boolean",
  "char", "double", "float", "struct", "class", "object", "inheritance", "polymorphism", "semaphore", "mutex", "deadlock",
  "thread", "process", "cache", "pipeline", "register", "interrupt", "kernel", "schema", "tuple", "relation", "normalization",
  "Python", "Java", "JavaScript", "nums", "arr", "len", "count", "temp", "result", "answer", "sum", "max", "min", "dp",
];

/*
  Mishearings seen with Whisper and browser recognition on Indian English and
  Hinglish. Each maps to a glossary entry; applied only as whole words or
  phrases.
*/
const ALIASES = [
  ["beefs", "BFS"], ["be fs", "BFS"], ["bfs's", "BFS"], ["the fs", "DFS"], ["deep fs", "DFS"], ["d fs", "DFS"], ["dee fs", "DFS"],
  ["kyu", "queue"], ["kyoo", "queue"], ["cue", "queue"], ["queue's", "queue"], ["dek", "deque"], ["deck", "deque"],
  ["hash map", "hashmap"], ["hashed map", "hashmap"], ["link list", "linked list"], ["linklist", "linked list"],
  ["dykstra", "Dijkstra"], ["dikstra", "Dijkstra"], ["dijkstras", "Dijkstra"], ["dextra", "Dijkstra"], ["dijktra", "Dijkstra"],
  ["crus kal", "Kruskal"], ["kruskals", "Kruskal"], ["prims", "Prim"], ["kadanes", "Kadane"], ["ka dane", "Kadane"],
  ["try", null], // "trie" is said like "tree" or "try"; never guess.
  ["memorization", "memoization"], ["memorisation", "memoization"], ["memoisation", "memoization"],
  ["dee pee", "DP"], ["d p", "DP"], ["db ms", "DBMS"], ["gate exam", "GATE exam"], ["null pointer", "nullptr"],
  ["sub array", "subarray"], ["sub string", "substring"], ["sub sequence", "subsequence"],
  ["paleen drome", "palindrome"], ["palin drome", "palindrome"], ["polindrome", "palindrome"],
];

/* Letter names → letters (for "bee eff ess"). */
const LETTER_NAMES = {
  a: "a", ay: "a", aa: "a", b: "b", bee: "b", be: "b", bi: "b", c: "c", see: "c", cee: "c", si: "c", d: "d", dee: "d", di: "d",
  e: "e", ee: "e", f: "f", eff: "f", ef: "f", g: "g", gee: "g", ji: "g", h: "h", aitch: "h", haich: "h", eich: "h",
  i: "i", eye: "i", j: "j", jay: "j", k: "k", kay: "k", l: "l", el: "l", ell: "l", m: "m", em: "m", n: "n", en: "n",
  o: "o", oh: "o", p: "p", pee: "p", pi: "p", q: "q", cue: "q", kyu: "q", r: "r", ar: "r", aar: "r", s: "s", ess: "s", es: "s", t: "t", tee: "t", ti: "t",
  u: "u", you: "u", yu: "u", v: "v", vee: "v", w: "w", x: "x", ex: "x", y: "y", wai: "y", z: "z", zed: "z", zee: "z",
};

/* Words never "fixed" to a glossary name: everyday English and Hinglish. */
const STOP = new Set(`a about above after again against all also am an and any are as at be because been before being below between
both but by can could did do does doing done down during each else even ever every few first for from further get gets give go goes
going gone got had has have having he her here hers him his how i if in into is it its itself just know last let like long look made
make many may me might more most much must my next no nor not now of off on once one only or other our out over own please put
read right said same say see seen set she should show so some such take tell than that the their them then there these they thing
think this those through time to too two under until up upon us use used very want was way we well were what when where which while
who whom why will with would yes yet you your mode dark light open close back home page next previous go start stop play pause
again hint help explain answer question problem solve notes lesson chapter test exam timer show hide zoom line lines word words
code run submit check clear undo redo delete copy paste rename insert add remove move top bottom first last new old same other
number numbers value values big small short tall high low left right fast slow good bad true false yes ok okay hello hi hey thanks
thank sorry what why how karo kar karna kariye karein kholo kholiye band bandh jao jaiye wapas aage peeche upar neeche dikhao
batao samjhao likho daalo hatao chalao ruko chalo ko ka ki ke hai hain tha thi the se tak par pe mein me main mera meri mere tum aap
yeh ye woh wo kya kyun kaise kab kahan accha acha theek thik haan nahi nahin bhi aur ya agar toh to phir abhi sab ek do teen
wala wali wale wale ab jab tab kuch koi isko usko iska uska apna apni yahan wahan line pe jaao`.split(/\s+/));

/* Words that belong in spoken code (not "unplaced"). */
const CODE_WORDS = new Set(`for while if else elif return int long float double char bool boolean string void from to in range
loop print printf cout cin println console log function def class new true false null none nil let const var and or not is
then do break continue switch case default try catch throw import include using namespace std main public static private struct
auto vector list dict map set append push pop size length len begin end swap max min abs sqrt pow equals equal plus minus times
into divided by mod modulo increment decrement assign less greater than at most least open close bracket brackets paren
parenthesis curly brace semicolon semi colon comma dot arrow underscore of sub index square round each step upto till
update call empty full check add remove insert delete find search reverse init initialize declare create make get change
move store save compare increase decrease iterate traverse visit mark enqueue dequeue front back peek item element key
value node first last next prev previous left right start end done found exists contains equal swap update karo daalo
hatao likho badlo chalao`.split(/\s+/));

/* ── helpers ── */

function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  // Optimal string alignment: insert, delete, substitute, or swap two neighbours ("mdi" → "mid").
  let older = [];
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], older[j - 2] + 1);
    }
    older = prev;
    prev = cur;
  }
  return prev[n];
}

/** The first sound of a word, so "kyu"/"queue" and "fone"/"phone" match but "node"/"mode" do not. */
function firstSound(w) {
  const s = w.toLowerCase();
  if (/^(ph)/.test(s)) return "f";
  if (/^(kh|qu|q|c(?![eiy])|k)/.test(s)) return "k";
  if (/^(c[eiy]|s|z|ts)/.test(s)) return "s";
  if (/^(w|v)/.test(s)) return "v";
  if (/^(gh|g(?![eiy]))/.test(s)) return "g";
  if (/^(j|g[eiy])/.test(s)) return "j";
  if (/^[aeiou]/.test(s)) return "V";
  return s[0] || "";
}

/** Split into tokens, keeping each token's punctuation so the text reads the same. */
function tokens(s) {
  return s.split(/\s+/).filter(Boolean).map((raw) => {
    const m = raw.match(/^([("'“‘[{]*)(.*?)([)"'”’\]},.;:!?]*)$/u);
    return { lead: m[1], core: m[2], tail: m[3] };
  });
}
const join = (ts) => ts.map((t) => t.lead + t.core + t.tail).join(" ");

function buildVocab(hints) {
  const canon = new Map(); // lower-case → canonical spelling
  const add = (w) => {
    const c = String(w || "").trim();
    if (!c || c.length > 40) return;
    const k = c.toLowerCase();
    if (!canon.has(k)) canon.set(k, c);
  };
  for (const w of GLOSSARY) add(w);
  // Page names win their own spelling ("leftIndex", "mid").
  const page = new Set();
  for (const h of hints || []) {
    const c = String(h || "").trim();
    if (!c || c.length > 40) continue;
    canon.set(c.toLowerCase(), c);
    page.add(c.toLowerCase());
    for (const part of c.split(/\s+/)) {
      if (part.length > 1 && !canon.has(part.toLowerCase())) canon.set(part.toLowerCase(), part);
      if (part.length > 1) page.add(part.toLowerCase());
    }
  }
  canon.page = page;
  return canon;
}

/* ── the steps ── */

/** 1. Clean. */
function clean(text) {
  let s = String(text || "").normalize("NFC");
  s = asciiDigits(s);
  s = s.replace(/[।॥]/g, ".");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** 2. Letter-by-letter names → the name, when it is known. */
function joinSpelled(ts, vocab, changes) {
  const out = [];
  let i = 0;
  while (i < ts.length) {
    // The longest run of letter names starting here.
    let j = i;
    const letters = [];
    while (j < ts.length && !ts[j].lead && LETTER_NAMES[ts[j].core.toLowerCase()] && (j === i || !ts[j - 1].tail || /^[.]+$/.test(ts[j - 1].tail))) {
      letters.push(LETTER_NAMES[ts[j].core.toLowerCase()]);
      j++;
    }
    let done = false;
    // The whole run must spell a known name ("b f s" → BFS); a run that only
    // contains one ("a b c d") is left alone.
    if (letters.length >= 2) {
      const hit = vocab.get(letters.join(""));
      if (hit && hit === hit.toUpperCase()) {
        const from = join(ts.slice(i, j));
        out.push({ lead: "", core: hit, tail: ts[j - 1].tail.replace(/^\.+$/, "") });
        changes.push({ from, to: hit, rule: "spelled" });
        i = j;
        done = true;
      }
    }
    if (!done) {
      // Not a name: keep the whole run as said (never retry inside it).
      const end = Math.max(j, i + 1);
      for (let k = i; k < end; k++) out.push(ts[k]);
      i = end;
    }
  }
  return out;
}

/** 3. Known mishearings (whole words or phrases). */
function applyAliases(ts, vocab, changes) {
  let out = ts;
  for (const [phrase, to] of ALIASES) {
    if (!to) continue;
    const words = phrase.split(" ");
    const next = [];
    let i = 0;
    while (i < out.length) {
      const span = out.slice(i, i + words.length);
      if (span.length === words.length && span.every((t, k) => t.core.toLowerCase() === words[k] && (k === span.length - 1 || !t.tail)) && (vocab.has(to.toLowerCase()) || to.toLowerCase().split(" ").every((w) => vocab.has(w)))) {
        const canonical = vocab.get(to.toLowerCase()) || to;
        next.push({ lead: span[0].lead, core: canonical, tail: span[span.length - 1].tail });
        changes.push({ from: join(span), to: canonical, rule: "known mishearing" });
        i += words.length;
      } else {
        next.push(out[i]);
        i++;
      }
    }
    out = next;
  }
  return out;
}

/** Words of an identifier: leftIndex → ["left","index"], max_val → ["max","val"]. */
function identWords(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/** Spoken multi-word names → the page's identifier ("left index" → leftIndex). */
function joinPageNames(ts, hints, changes) {
  const names = [];
  for (const h of hints || []) {
    const c = String(h || "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(c)) continue;
    const words = identWords(c);
    if (words.length >= 2 && words.length <= 4) names.push({ c, words });
  }
  if (!names.length) return ts;
  names.sort((a, b) => b.words.length - a.words.length);
  const out = [];
  let i = 0;
  while (i < ts.length) {
    const hit = names.find(({ words }) => words.every((w, k) => ts[i + k] && ts[i + k].core.toLowerCase() === w && (k === words.length - 1 || !ts[i + k].tail)));
    if (hit) {
      const span = ts.slice(i, i + hit.words.length);
      out.push({ lead: span[0].lead, core: hit.c, tail: span[span.length - 1].tail });
      changes.push({ from: join(span), to: hit.c, rule: "page name" });
      i += hit.words.length;
    } else {
      out.push(ts[i]);
      i++;
    }
  }
  return out;
}

/** Exact names in the wrong case ("bfs" → BFS) and 4. near-misses (command and code). */
function fixNames(ts, vocab, fuzzy, changes, code = false) {
  const entries = [...vocab.entries()].filter(([k]) => !k.includes(" "));
  return ts.map((t) => {
    const w = t.core;
    const k = w.toLowerCase();
    if (!/^[a-z][a-z']*$/i.test(w)) return t;
    const exact = vocab.get(k);
    if (exact) {
      // Recase acronyms and page names; leave ordinary words as said.
      // On a code page only the page's own spelling counts ("dp" stays dp unless the page says DP).
      if (exact !== w && (!code || vocab.page.has(k)) && (exact === exact.toUpperCase() || /[A-Z]/.test(exact.slice(1)))) {
        changes.push({ from: w, to: exact, rule: "case" });
        return { ...t, core: exact };
      }
      return t;
    }
    if (!fuzzy || w.length < 3 || STOP.has(k) || CODE_WORDS.has(k) || NUMBER_WORDS.has(k)) return t;
    // The page's own names first, then the glossary: "mit" → mid when mid is on the page, even though min is in the glossary.
    const pick = (pool) => {
      let best = null;
      let bestD = 99;
      let tie = false;
      for (const [vk, canonical] of pool) {
        if (vk.length < 3 || Math.abs(vk.length - k.length) > 2) continue;
        if (firstSound(vk) !== firstSound(k)) continue;
        const max = vk.length <= 4 ? 1 : 2;
        const d = editDistance(k, vk);
        if (d > max) continue;
        if (d < bestD) {
          best = canonical;
          bestD = d;
          tie = false;
        } else if (d === bestD && canonical.toLowerCase() !== best.toLowerCase()) tie = true;
      }
      return { best, tie };
    };
    let { best, tie } = pick(entries.filter(([vk]) => vocab.page.has(vk)));
    if (!best) ({ best, tie } = pick(entries));
    if (!best || tie) return t;
    changes.push({ from: w, to: best, rule: "near-miss" });
    return { ...t, core: best };
  });
}

/* 5. Spoken code → symbols. Longest phrases first. */
const CODE_RULES = [
  [/\bplus plus\b/gi, " ++ "],
  [/\bminus minus\b/gi, " -- "],
  [/\b(?:plus|add) equals?(?: to)?\b/gi, " += "],
  [/\bminus equals?(?: to)?\b/gi, " -= "],
  [/\b(?:times|into|star|multiply) equals?(?: to)?\b/gi, " *= "],
  [/\b(?:divided by|divide|slash) equals?(?: to)?\b/gi, " /= "],
  [/\bmod(?:ulo)? equals?(?: to)?\b/gi, " %= "],
  [/\b(?:is )?less than or equal to\b|\bless than equals?(?: to)?\b|\b(?:is )?at most\b/gi, " <= "],
  [/\b(?:is )?greater than or equal to\b|\bgreater than equals?(?: to)?\b|\b(?:is )?at least\b/gi, " >= "],
  [/\b(?:is )?not equal to\b|\bnot equals?\b|\bbang equals?\b/gi, " != "],
  [/\bequals equals\b|\bdouble equals?\b|\bequal equal\b|\b(?:is )?equal to\b|\bbarabar barabar\b|\bbarabar hai\b/gi, " == "],
  [/\b(?:is )?less than\b|\bse chhota\b|\bse kam\b/gi, " < "],
  [/\b(?:is )?greater than\b|\bse bada\b|\bse zyada\b/gi, " > "],
  [/\b(?:and and|double and|logical and)\b/gi, " && "],
  [/\b(?:or or|double or|logical or|pipe pipe)\b/gi, " || "],
  [/\bopen (?:square )?brackets?\b|\bleft (?:square )?bracket\b/gi, " [ "],
  [/\bclose (?:square )?brackets?\b|\bright (?:square )?bracket\b/gi, " ] "],
  [/\bopen (?:paren|parenthesis|round bracket)\b|\bleft paren(?:thesis)?\b/gi, " ( "],
  [/\bclose (?:paren|parenthesis|round bracket)\b|\bright paren(?:thesis)?\b/gi, " ) "],
  [/\bopen (?:curly(?: brace| bracket)?|brace)\b|\bleft (?:curly|brace)\b/gi, " { "],
  [/\bclose (?:curly(?: brace| bracket)?|brace)\b|\bright (?:curly|brace)\b/gi, " } "],
  [/\bsemi ?colon\b/gi, " ; "],
  [/\bcomma\b/gi, " , "],
  [/\bcolon\b/gi, " : "],
  [/\barrow\b/gi, " -> "],
  [/\bunderscore\b/gi, " _ "],
  [/\bplus\b/gi, " + "],
  [/\bminus\b/gi, " - "],
  [/\btimes\b|\bmultiplied by\b|\binto\b|\bstar\b/gi, " * "],
  [/\bdivided by\b|\bdivide by\b|\bslash\b/gi, " / "],
  [/\bmod(?:ulo)?\b|\bremainder\b/gi, " % "],
  [/\band\b/gi, " && "],
  [/\bor\b/gi, " || "],
  [/\bequals?\b|\bbarabar\b|\bassign(?:ed)?(?: to)?\b/gi, " = "],
];
/* Spoken single letters in code ("eye" → i). */
const CODE_LETTERS = { eye: "i", jay: "j", jey: "j", kay: "k", en: "n", em: "m", ex: "x", why: "y", zed: "z", zee: "z" };
/* "a of i": words that are never arrays on the left. */
const NOT_ARRAYS = new Set(["length", "size", "sum", "value", "type", "number", "part", "end", "start", "top", "half", "square", "root", "all", "each", "one", "rest", "most", "least", "out", "set", "list", "kind", "copy"]);

function toCode(text) {
  let s = ` ${text} `;
  s = s.replace(/[,;:!?"“”]/g, " ");
  // Keep dots between words for "node dot next"; drop sentence-final ones.
  s = s.replace(/\.(?=\s|$)/g, " ");
  for (const [re, to] of CODE_RULES) s = s.replace(re, to);
  let words = s.trim().split(/\s+/).filter(Boolean).map((w) => CODE_LETTERS[w.toLowerCase()] ?? w);
  // Number words are read in lower case; every other word keeps the case it was said or named in.
  const spans = numberSpans(words.map((w) => w.toLowerCase()));
  for (let k = spans.length - 1; k >= 0; k--) words.splice(spans[k].start, spans[k].end - spans[k].start, spans[k].value);
  s = ` ${words.join(" ")} `;
  // "node dot next" → node.next
  s = s.replace(/ ([A-Za-z_]\w*) dot ([A-Za-z_]\w*)\b/gi, " $1.$2");
  // "max _ val" → max_val
  s = s.replace(/(\w) _ (\w)/g, "$1_$2");
  // "a of n minus one" → a[n - 1]: an index takes a following "± number".
  s = s.replace(/ ([A-Za-z_]\w*) (?:of|sub|index|ka) ([A-Za-z_]\w*|\d+) ([-+]) (\d+)(?= )/g, (m, a, b, op, num) => (NOT_ARRAYS.has(a.toLowerCase()) || CODE_WORDS.has(a.toLowerCase()) ? m : ` ${a}[${b} ${op} ${num}]`));
  // "a of i", "a sub i", "a index i", "a ka i" → a[i]
  s = s.replace(/ ([A-Za-z_]\w*) (?:of|sub|index|ka) ([A-Za-z_]\w*|\d+)(?= )/g, (m, a, b) => (NOT_ARRAYS.has(a.toLowerCase()) || CODE_WORDS.has(a.toLowerCase()) ? m : ` ${a}[${b}]`));
  // Tidy spacing: "i ++" → "i++", "( x )" → "(x)", "a [ i ]" → "a[i]", "x ," → "x,".
  s = s.replace(/(\w|\]|\)) (\+\+|--)(?= |$)/g, "$1$2");
  s = s.replace(/ (\+\+|--) ([A-Za-z_]\w*)/g, " $1$2");
  s = s.replace(/([A-Za-z_]\w*|\]|\)) \[/g, "$1[");
  s = s.replace(/\[ /g, "[").replace(/ \]/g, "]").replace(/\( /g, "(").replace(/ \)/g, ")");
  s = s.replace(/ ([,;:])/g, "$1");
  // "print (x)" → print(x), but "if (x)" keeps its space.
  s = s.replace(/\b(?!if\b|while\b|for\b|return\b|switch\b|elif\b)([A-Za-z_]\w*) \(/g, "$1(");
  // "not" → "!" only where a condition starts: "not visited of v", "if not found", "x and not y".
  s = s.replace(/(^ ?|\b(?:if|while|return|elif)\b |&& |\|\| |\( |= )not ([A-Za-z_!(])/gi, "$1!$2");
  s = s.replace(/ -> /g, "->");
  return s.trim().replace(/\s+/g, " ");
}

/** Words in the code text that are none of: a symbol, a number, a code word, a known name, a stop word, a single letter. */
function unplacedIn(code, vocab) {
  const out = [];
  for (const raw of code.split(/[^A-Za-z_']+/)) {
    const w = raw.toLowerCase();
    if (w.length < 3) continue;
    if (CODE_WORDS.has(w) || STOP.has(w) || vocab.has(w)) continue;
    if (!out.includes(raw)) out.push(raw);
  }
  return out;
}

/**
 * Normalise one recognised text. Pure.
 * @param {string} text
 * @param {{ mode?: "text"|"command"|"code", hints?: string[], lang?: string }} opts
 */
function normalise(text, { mode = "text", hints = [], lang = "en-IN" } = {}) {
  const changes = [];
  const cleaned = clean(text);
  const retryHindi = lang === "hi-IN" && /[؀-ۿ]/.test(cleaned);
  const vocab = buildVocab(hints);
  let ts = tokens(cleaned);
  ts = joinSpelled(ts, vocab, changes);
  ts = applyAliases(ts, vocab, changes);
  const fuzzy = mode === "command" || mode === "code";
  if (fuzzy) ts = joinPageNames(ts, hints, changes);
  ts = fixNames(ts, vocab, fuzzy, changes, mode === "code");
  const out = join(ts);
  const result = { text: out, retryHindi, changes };
  if (mode === "code") {
    result.code = toCode(out);
    result.unplaced = unplacedIn(result.code, vocab);
  }
  return result;
}

module.exports = { normalise, toCode, editDistance, firstSound, GLOSSARY, ALIASES, STOP, CODE_WORDS };
