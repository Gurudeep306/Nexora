/*
  S9 measures (docs/voice/STEP1_EARS_DESIGN.md §S9). Pure functions; tested in
  tests/voice-asr-metrics.test.js.

  - wer: word error rate = (substitutions + deletions + insertions) / words
    in the reference, after folding case, punctuation and number words.
  - codeWer: the same, counting only the reference's code and CS words (BFS,
    queue, mid, i, ++ …): the words that matter most and fail most.
  - percentile: p50 / p95 of times.
*/
const { numbersToDigits } = require("../../src/voice/numwords");
const { GLOSSARY, CODE_WORDS } = require("../../src/voice/normalise");

/** Words to compare: lower case, no punctuation, number words as digits, Devanagari danda dropped. */
function words(s) {
  const w = String(s || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[।॥]/g, " ")
    .replace(/[“”"'`?!,;:()]/g, " ")
    .replace(/\.(?!\d)/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return numbersToDigits(w);
}

/** Word-level edit alignment: [{ op: 'ok'|'sub'|'del'|'ins', ref, hyp }]. */
function align(ref, hyp) {
  const n = ref.length;
  const m = hyp.length;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...new Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
    }
  }
  const out = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) {
      out.push({ op: ref[i - 1] === hyp[j - 1] ? "ok" : "sub", ref: ref[i - 1], hyp: hyp[j - 1] });
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      out.push({ op: "del", ref: ref[i - 1] });
      i--;
    } else {
      out.push({ op: "ins", hyp: hyp[j - 1] });
      j--;
    }
  }
  return out.reverse();
}

/** { errors, words } for one pair. */
function wer(reference, hypothesis) {
  const ref = words(reference);
  const ops = align(ref, words(hypothesis));
  return { errors: ops.filter((o) => o.op !== "ok").length, words: ref.length };
}

const CODE = new Set([...GLOSSARY.map((w) => w.toLowerCase()), ...CODE_WORDS]);
/** A reference word that is code or CS vocabulary: a glossary name, a code word, a single letter or a symbol. */
function isCodeWord(w) {
  return CODE.has(w) || /^[a-z]$/.test(w) || /^[-+*/%=<>!&|[\]().]+$/.test(w) || /^\d+$/.test(w);
}

/** { errors, words } counting only the reference's code words (substituted or dropped). */
function codeWer(reference, hypothesis) {
  const ops = align(words(reference), words(hypothesis));
  let errors = 0;
  let total = 0;
  for (const o of ops) {
    if (o.op === "ins" || !isCodeWord(o.ref)) continue;
    total++;
    if (o.op !== "ok") errors++;
  }
  return { errors, words: total };
}

function percentile(xs, p) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
}

/** Sum a list of { errors, words } into a rate (0–1), or null. */
function rate(list) {
  const e = list.reduce((a, x) => a + x.errors, 0);
  const w = list.reduce((a, x) => a + x.words, 0);
  return w ? e / w : null;
}

/* The design's gates (§S9.3) to turn a link or language on. */
const GATES = { commands: 0.95, codeWer: 0.05, hinglishWer: 0.15, p95Ms: 1500 };

module.exports = { words, align, wer, codeWer, isCodeWord, percentile, rate, GATES };
