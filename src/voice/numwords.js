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
/*
  Hindi numbers 0–99 each have their own word ("सैंतालीस" = 47), so they are
  listed in full: the standard Devanagari spelling first, then spellings
  speech recognisers also write (पांच/पाँच, इक्यानबे/इक्यानवे), then Hinglish.
  The same table is in client/src/voice/actions/number.ts; tests/voice-numbers-full.test.js checks both
  read every number 0–9,999 in English, Hindi and Hinglish.
*/
const HINDI_NUMBERS = [
  [0, "शून्य", "shunya", "sunya"],
  [1, "एक", "ek"],
  [2, "दो", "do"],
  [3, "तीन", "teen"],
  [4, "चार", "char", "chaar"],
  [5, "पाँच", "पांच", "paanch", "panch"],
  [6, "छह", "छः", "छे", "chhah", "chhe", "che"],
  [7, "सात", "saat", "sat"],
  [8, "आठ", "aath", "ath"],
  [9, "नौ", "nau"],
  [10, "दस", "das"],
  [11, "ग्यारह", "gyarah", "gyaarah"],
  [12, "बारह", "barah", "baarah"],
  [13, "तेरह", "terah"],
  [14, "चौदह", "chaudah"],
  [15, "पंद्रह", "पन्द्रह", "pandrah"],
  [16, "सोलह", "solah"],
  [17, "सत्रह", "satrah"],
  [18, "अठारह", "atharah", "athaarah"],
  [19, "उन्नीस", "unnis", "unnees"],
  [20, "बीस", "bees"],
  [21, "इक्कीस", "ikkis", "ikkees"],
  [22, "बाईस", "bais", "baees"],
  [23, "तेईस", "teis", "teees"],
  [24, "चौबीस", "chaubis", "chaubees"],
  [25, "पच्चीस", "pachchis", "pachis", "pachchees"],
  [26, "छब्बीस", "chhabbis", "chhabbees"],
  [27, "सत्ताईस", "sattais", "sattaees"],
  [28, "अट्ठाईस", "अठाईस", "atthais", "athaees"],
  [29, "उनतीस", "उन्तीस", "untis", "untees"],
  [30, "तीस", "tees"],
  [31, "इकतीस", "इकत्तीस", "iktis", "iktees"],
  [32, "बत्तीस", "battis", "battees"],
  [33, "तैंतीस", "तेंतीस", "taintis", "taintees"],
  [34, "चौंतीस", "चौतीस", "chauntis", "chauntees"],
  [35, "पैंतीस", "paintis", "paintees"],
  [36, "छत्तीस", "chhattis", "chhattees"],
  [37, "सैंतीस", "saintis", "saintees"],
  [38, "अड़तीस", "adtis", "adtees", "artees"],
  [39, "उनतालीस", "उन्तालीस", "untalis", "untalees"],
  [40, "चालीस", "chalis", "chaalis", "chalees"],
  [41, "इकतालीस", "iktalis", "iktalees"],
  [42, "बयालीस", "bayalis", "bayalees"],
  [43, "तैंतालीस", "तेंतालीस", "taintalis", "taintalees"],
  [44, "चवालीस", "चौवालीस", "chavalis", "chauvalis", "chawalees"],
  [45, "पैंतालीस", "paintalis", "paintalees"],
  [46, "छियालीस", "chhiyalis", "chhiyalees"],
  [47, "सैंतालीस", "saintalis", "saintalees"],
  [48, "अड़तालीस", "adtalis", "adtalees", "artalees"],
  [49, "उनचास", "unchas", "unchaas"],
  [50, "पचास", "pachas", "pachaas"],
  [51, "इक्यावन", "ikyavan", "ikyawan"],
  [52, "बावन", "bavan", "baawan"],
  [53, "तिरपन", "तिरेपन", "tirpan", "tirepan"],
  [54, "चौवन", "चौव्वन", "chauvan", "chauwan"],
  [55, "पचपन", "pachpan"],
  [56, "छप्पन", "chhappan"],
  [57, "सत्तावन", "sattavan", "sattawan"],
  [58, "अट्ठावन", "अठावन", "atthavan", "athawan"],
  [59, "उनसठ", "unsath"],
  [60, "साठ", "saath"],
  [61, "इकसठ", "iksath"],
  [62, "बासठ", "basath", "baasath"],
  [63, "तिरसठ", "तिरेसठ", "tirsath", "tiresath"],
  [64, "चौंसठ", "चौसठ", "chaunsath"],
  [65, "पैंसठ", "painsath"],
  [66, "छियासठ", "chhiyasath"],
  [67, "सड़सठ", "सरसठ", "sadsath", "sarsath"],
  [68, "अड़सठ", "adsath", "arsath"],
  [69, "उनहत्तर", "unhattar"],
  [70, "सत्तर", "sattar"],
  [71, "इकहत्तर", "ikhattar"],
  [72, "बहत्तर", "bahattar"],
  [73, "तिहत्तर", "tihattar"],
  [74, "चौहत्तर", "chauhattar"],
  [75, "पचहत्तर", "pachhattar", "pachattar"],
  [76, "छिहत्तर", "chhihattar"],
  [77, "सतहत्तर", "sathattar"],
  [78, "अठहत्तर", "athhattar", "athattar"],
  [79, "उन्यासी", "उनासी", "unyasi", "unaasi"],
  [80, "अस्सी", "assi"],
  [81, "इक्यासी", "ikyasi"],
  [82, "बयासी", "bayasi"],
  [83, "तिरासी", "tirasi"],
  [84, "चौरासी", "chaurasi"],
  [85, "पचासी", "pachasi"],
  [86, "छियासी", "chhiyasi"],
  [87, "सत्तासी", "sattasi"],
  [88, "अट्ठासी", "अठासी", "atthasi", "athasi"],
  [89, "नवासी", "navasi"],
  [90, "नब्बे", "nabbe"],
  [91, "इक्यानबे", "इक्यानवे", "ikyanbe", "ikyanve"],
  [92, "बानबे", "बानवे", "baanbe", "banve"],
  [93, "तिरानबे", "तिरानवे", "tiranbe", "tiranve"],
  [94, "चौरानबे", "चौरानवे", "chauranbe", "chauranve"],
  [95, "पंचानबे", "पंचानवे", "पिचानवे", "panchanbe", "panchanve", "pichanve"],
  [96, "छियानबे", "छियानवे", "chhiyanbe", "chhiyanve"],
  [97, "सत्तानबे", "सत्तानवे", "sattanbe", "sattanve"],
  [98, "अट्ठानबे", "अट्ठानवे", "अठानवे", "atthanbe", "atthanve"],
  [99, "निन्यानबे", "निन्यानवे", "ninyanbe", "ninyanve"],
];
for (const [v, ...words] of HINDI_NUMBERS) for (const w of words) ONES[w] = v;
const TENS = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES = { hundred: 100, sau: 100, "सौ": 100, thousand: 1000, hazaar: 1000, hazar: 1000, "हज़ार": 1000, "हजार": 1000, lakh: 100000, lac: 100000, "लाख": 100000, crore: 10000000, karod: 10000000, karor: 10000000, "करोड़": 10000000, "करोड": 10000000 };
const POINT = new Set(["point", "dashamlav", "dashmalav", "दशमलव", "पॉइंट"]);

/*
  Hinglish number words that are also everyday words ("do" = do, "sat",
  "char", "che", "ath", "das" in names). They count as numbers only next to
  another number word, an operator word or a symbol.
*/
const AMBIGUOUS = new Set(["do", "sat", "char", "che", "ath", "oh", "das", "teen", "saath"]);
const OPERATOR_WORDS = new Set(["plus", "minus", "times", "into", "by", "equals", "equal", "barabar", "se", "tak", "mod", "modulo", "than", "point", "multiplied", "divided", "upto", "till", "to"]);
/* Words a number usually follows in code talk: "size do", "line teen", "index char". */
// Also answer words: "jawab char hai" is 4.
const COUNT_WORDS = new Set(["answer", "ans", "jawab", "jawaab", "uttar", "उत्तर", "जवाब", "size", "length", "len", "line", "index", "row", "column", "col", "position", "number", "no", "step", "level", "count", "capacity"]);

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
  if (COUNT_WORDS.has(words[i - 1])) return true;
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

/**
 * A whole number in Hindi words, Indian grouping: 47 → "सैंतालीस",
 * 1024 → "एक हज़ार चौबीस", 150000 → "एक लाख पचास हज़ार". For speaking Hindi
 * (src/voice/hindi-ipa.js). Null above 99 crore.
 */
function spellHindi(n) {
  n = Math.trunc(Number(n));
  if (!Number.isFinite(n) || n < 0 || n > 999999999) return null;
  const w = (v) => HINDI_NUMBERS[v][1];
  if (n < 100) return w(n);
  const parts = [];
  for (const [size, name] of [[10000000, "करोड़"], [100000, "लाख"], [1000, "हज़ार"], [100, "सौ"]]) {
    const q = Math.floor(n / size);
    if (q) {
      parts.push(`${spellHindi(q)} ${name}`);
      n %= size;
    }
  }
  if (n) parts.push(w(n));
  return parts.join(" ");
}

module.exports = { spellHindi, HINDI_NUMBERS, ONES, TENS, SCALES, readNumber, numberSpans, numbersToDigits, asciiDigits };
