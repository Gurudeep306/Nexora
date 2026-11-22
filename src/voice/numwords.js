/*
  Spoken numbers in English, Hinglish and Hindi → digits, for the server ears'
  normaliser (src/voice/normalise.js). The same words as the browser's
  client/src/voice/actions/number.ts; tests/voice-normalise.test.js checks the
  two agree, so they cannot drift.

  Unlike the browser's answer-box reader (one number per utterance), this reads
  every number inside a sentence: "n minus one" → "n minus 1",
  "twenty five plus do" → "25 plus 2".
*/

const ONES = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  // Hinglish
  shunya: 0, sunya: 0, ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6, che: 6, saat: 7, sat: 7, aath: 8, ath: 8, nau: 9,
  das: 10, gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnis: 19, bees: 20, pachchis: 25, pachis: 25, tees: 30, chalis: 40, pachas: 50, pachaas: 50, saath: 60, sattar: 70, assi: 80, nabbe: 90,
  // Hindi
  "शून्य": 0, "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "छः": 6, "सात": 7, "आठ": 8, "नौ": 9,
  "दस": 10, "ग्यारह": 11, "बारह": 12, "तेरह": 13, "चौदह": 14, "पंद्रह": 15, "सोलह": 16, "सत्रह": 17, "अठारह": 18, "उन्नीस": 19, "बीस": 20,
  "पच्चीस": 25, "तीस": 30, "बयालीस": 42, "चालीस": 40, "पचास": 50, "साठ": 60, "सत्तर": 70, "अस्सी": 80, "नब्बे": 90,
};
const TENS = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES = { hundred: 100, sau: 100, "सौ": 100, thousand: 1000, hazaar: 1000, hazar: 1000, "हज़ार": 1000, "हजार": 1000, lakh: 100000, lac: 100000, "लाख": 100000 };
const POINT = new Set(["point", "dashamlav", "dashmalav", "दशमलव", "पॉइंट"]);

/*
  Hinglish number words that are also everyday words ("do" = do, "sat",
  "char", "che", "ath", "das" in names). They count as numbers only next to
  another number word, an operator word or a symbol.
*/
const AMBIGUOUS = new Set(["do", "sat", "char", "che", "ath", "oh", "das", "teen", "saath"]);
const OPERATOR_WORDS = new Set(["plus", "minus", "times", "into", "by", "equals", "equal", "barabar", "se", "tak", "mod", "modulo", "than", "point", "multiplied", "divided", "upto", "till", "to"]);

const DEV_DIGITS = "०१२३४५६७८९";

function valueOf(w) {
  if (/^\d+$/.test(w)) return { kind: "digits", v: Number(w) };
  if (w in ONES) return { kind: ONES[w] >= 20 && ONES[w] % 10 === 0 && ONES[w] < 100 ? "tens" : "ones", v: ONES[w] };
  if (w in TENS) return { kind: "tens", v: TENS[w] };
  if (w in SCALES) return { kind: "scale", v: SCALES[w] };
  return null;
}

/*
  Read one number starting at words[i]. Returns { value, end } (end exclusive)
  or null. Grammar: [tens] [ones] (scale [tens] [ones])* — so "twenty five" is
  25 and "one two" is two numbers, never 3.
*/
function readNumber(words, i) {
  let total = 0;
  let part = 0;
  let j = i;
  let last = null; // kind of the previous word
  let any = false;
  while (j < words.length) {
    const t = valueOf(words[j]);
    if (!t) break;
    if (t.kind === "digits") {
      if (any) break;
      part = t.v;
      last = "digits";
    } else if (t.kind === "tens") {
      if (last === "tens" || last === "ones" || last === "digits") break;
      part += t.v;
      last = "tens";
    } else if (t.kind === "ones") {
      if (last === "ones" || last === "digits") break;
      if (last === "tens" && (t.v === 0 || t.v >= 10)) break;
      part += t.v;
      last = "ones";
    } else {
      if (!any) break; // "hundred" alone is a word, not a number
      if (t.v === 100) part = (part || 1) * 100;
      else {
        total += (part || 1) * t.v;
        part = 0;
      }
      // After a scale ("two hundred …"), tens and ones may follow again.
      last = null;
    }
    any = true;
    j++;
  }
  if (!any) return null;
  let value = String(total + part);
  // "three point one four" → 3.14 (digits after the point one by one).
  if (j + 1 < words.length && POINT.has(words[j])) {
    let frac = "";
    let k = j + 1;
    while (k < words.length) {
      const t = valueOf(words[k]);
      if (t && (t.kind === "digits" || (t.kind === "ones" && t.v <= 9))) {
        frac += String(t.v);
        k++;
      } else break;
    }
    if (frac) {
      value += "." + frac;
      j = k;
    }
  }
  return { value, end: j };
}

/** Is the word at i next to something that makes an ambiguous word a number? */
function numericContext(words, i, end) {
  const near = [words[i - 1], words[end]].filter(Boolean);
  return near.some((w) => OPERATOR_WORDS.has(w) || /^[-+*/%=<>!&|]+$/.test(w) || valueOf(w) != null);
}

/**
 * Where the numbers are in a list of lower-case words: [{ start, end, value }]
 * (end exclusive). Ambiguous Hinglish words count only in a numeric context.
 */
function numberSpans(words) {
  const spans = [];
  let i = 0;
  while (i < words.length) {
    const r = readNumber(words, i);
    if (!r || (r.end === i + 1 && AMBIGUOUS.has(words[i]) && !numericContext(words, i, r.end))) {
      i++;
      continue;
    }
    spans.push({ start: i, end: r.end, value: r.value });
    i = r.end;
  }
  return spans;
}

/** Replace number words in a list of lower-case words with digits; other words pass through. */
function numbersToDigits(words) {
  const out = [];
  let i = 0;
  for (const sp of numberSpans(words)) {
    while (i < sp.start) out.push(words[i++]);
    out.push(sp.value);
    i = sp.end;
  }
  while (i < words.length) out.push(words[i++]);
  return out;
}

/** Devanagari digits → ASCII. */
function asciiDigits(s) {
  return String(s).replace(/[०-९]/g, (d) => String(DEV_DIGITS.indexOf(d)));
}

module.exports = { ONES, TENS, SCALES, readNumber, numberSpans, numbersToDigits, asciiDigits };
