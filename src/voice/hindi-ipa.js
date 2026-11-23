/*
  Hindi (Devanagari) → the sound alphabet Kokoro's Hindi voices were trained
  on (IPA, in the style eSpeak NG writes Hindi), so our own voice server can
  speak Hindi without any GPL phonemizer (docs/voice/VIRTUAL_TEACHER.md §3).

  Hindi spelling is close to how it sounds. The rules that matter:
  - every consonant carries a short "ə" unless a vowel sign or virama follows;
  - that "ə" is dropped at the end of a word ("kamal", not "kamala") and in
    the middle where Hindi drops it (C ə C V after a vowel: "samajhna" →
    "səmʤʰnaː"), the common schwa-deletion rule;
  - anusvara (ं) is a nasal: n/m/ŋ/ɳ/ɲ before a stop of that place, otherwise
    it nasalises the vowel (̃); chandrabindu (ँ) always nasalises.
  Roman letters are left for the English rules. A number beside Hindi words
  is said in Hindi ("47" → "सैंतालीस", "3.5" → "तीन दशमलव पाँच"); a number
  inside code ("a[47]", "x2") is not touched.

  Only symbols in Kokoro's vocabulary are produced (checked in
  tests/voice-hindi-ipa.test.js).
*/

const { spellHindi } = require("./numwords");

const C = {
  क: "k", ख: "kʰ", ग: "ɡ", घ: "ɡʰ", ङ: "ŋ",
  च: "ʧ", छ: "ʧʰ", ज: "ʤ", झ: "ʤʰ", ञ: "ɲ",
  ट: "ʈ", ठ: "ʈʰ", ड: "ɖ", ढ: "ɖʰ", ण: "ɳ",
  त: "t", थ: "tʰ", द: "d", ध: "dʰ", न: "n",
  प: "p", फ: "pʰ", ब: "b", भ: "bʰ", म: "m",
  य: "j", र: "ɾ", ल: "l", व: "ʋ", श: "ʃ", ष: "ʂ", स: "s", ह: "h", ळ: "ɭ",
};
// With a nukta (as one code point or letter + ़).
const NUKTA = { क: "q", ख: "χ", ग: "ɣ", ज: "z", ड: "ɽ", ढ: "ɽʰ", फ: "f", य: "j" };
const PRECOMPOSED = { "क़": "क", "ख़": "ख", "ग़": "ग", "ज़": "ज", "ड़": "ड", "ढ़": "ढ", "फ़": "फ", "य़": "य" };

const V = { अ: "ə", आ: "aː", इ: "ɪ", ई: "iː", उ: "ʊ", ऊ: "uː", ऋ: "ɾɪ", ए: "eː", ऐ: "ɛː", ओ: "oː", औ: "ɔː", ऑ: "ɒ", ऍ: "ɛ" };
const SIGN = { "ा": "aː", "ि": "ɪ", "ी": "iː", "ु": "ʊ", "ू": "uː", "ृ": "ɾɪ", "े": "eː", "ै": "ɛː", "ो": "oː", "ौ": "ɔː", "ॉ": "ɒ", "ॅ": "ɛ" };
const VIRAMA = "्";
const NUKTA_SIGN = "़";
const ANUSVARA = "ं";
const CHANDRABINDU = "ँ";
const VISARGA = "ः";
const DIGITS = "०१२३४५६७८९";

// The nasal an anusvara becomes before a stop of each place.
const PLACE = { k: "ŋ", ɡ: "ŋ", ʧ: "ɲ", ʤ: "ɲ", ʈ: "ɳ", ɖ: "ɳ", t: "n", d: "n", p: "m", b: "m" };

/** One word as a list of units: { c: consonant } or { v: vowel, nasal? }. */
function units(word) {
  const s = [...word.normalize("NFC")].map((ch) => PRECOMPOSED[ch] ? [PRECOMPOSED[ch], NUKTA_SIGN] : [ch]).flat();
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (C[ch] !== undefined) {
      const nukta = s[i + 1] === NUKTA_SIGN;
      if (nukta) i++;
      const cons = { c: nukta && NUKTA[ch] ? NUKTA[ch] : C[ch] };
      out.push(cons);
      const next = s[i + 1];
      if (next === VIRAMA) {
        i++;
      } else if (SIGN[next] !== undefined) {
        out.push({ v: SIGN[next] });
        i++;
      } else {
        out.push({ v: "ə", inherent: true });
      }
    } else if (V[ch] !== undefined) {
      out.push({ v: V[ch] });
    } else if (ch === ANUSVARA || ch === CHANDRABINDU) {
      const last = out[out.length - 1];
      if (last && last.v) last[ch === ANUSVARA ? "anusvara" : "nasal"] = true;
    } else if (ch === VISARGA) {
      out.push({ c: "h" });
    }
  }
  return out;
}

/** Drop the inherent "ə" where Hindi doesn't say it. */
function deleteSchwa(u) {
  // Final: "kamal", "raam", "sarch" — but kept after a cluster ending in r, y or v ("mitra", "vaakya").
  const last = u[u.length - 1];
  if (last?.inherent && u.length > 2) {
    const cons = u[u.length - 2]?.c;
    const cluster = u[u.length - 3]?.c !== undefined;
    if (!(cluster && (cons === "ɾ" || cons === "j" || cons === "ʋ"))) u.pop();
  }
  // Medial: V C [ə] C V → V C C V, scanning right to left, never the first syllable
  // ("samajhnaa" → səməʤʰnaː, "namaste" keeps its ə before the cluster).
  for (let i = u.length - 3; i >= 2; i--) {
    const x = u[i];
    if (!x.inherent || x.anusvara || x.nasal) continue;
    const prevC = u[i - 1];
    const prevV = u[i - 2];
    const nextC = u[i + 1];
    const nextV = u[i + 2];
    if (prevC?.c && prevV?.v !== undefined && nextC?.c && nextV?.v !== undefined) {
      u.splice(i, 1);
      i--; // the vowel before can't be deleted next
    }
  }
  return u;
}

function wordToIpa(word) {
  const u = deleteSchwa(units(word));
  let out = "";
  for (let i = 0; i < u.length; i++) {
    const x = u[i];
    if (x.c !== undefined) {
      out += x.c;
      continue;
    }
    out += x.v;
    if (x.nasal) out += "̃";
    else if (x.anusvara) {
      const next = u[i + 1]?.c;
      const base = next ? next.replace("ʰ", "") : "";
      if (PLACE[base]) out += PLACE[base];
      else if (next === "m" || next === "n") out += "";
      else out += "̃";
    }
  }
  return out;
}

/** Does the text contain Hindi (Devanagari) letters? */
function hasDevanagari(text) {
  return /[ऀ-ॿ]/.test(String(text || ""));
}

/**
 * Split text into pieces for the voice server: Devanagari runs become
 * phonetic items, everything else stays text. Each item keeps the original
 * words as its subtitles, so the lips and captions follow the real words.
 */
function toVoiceInput(text) {
  const items = [];
  // A run is Hindi words and plain numbers ("मेरे पास 47 किताबें"); a number inside code ("a[47]", "x2", "4.5f") isn't one.
  const NUM = String.raw`(?<![\w\[\].])\d[\d,]*(?:\.\d+)?(?![\w\]])`;
  const re = new RegExp(`((?:[ऀ-ॿ]+|${NUM})(?:[\\s।॥]+(?:[ऀ-ॿ]+|${NUM}))*[।॥]?)`, "g");
  let last = 0;
  for (const m of String(text).matchAll(re)) {
    // Numbers alone, with no Hindi word beside them, stay for the English rules.
    if (!hasDevanagari(m[0].replace(/[०-९]/g, ""))) continue;
    if (m.index > last) items.push({ type: "text", value: text.slice(last, m.index) });
    items.push({ type: "phonetic", value: phrase(m[0]), subtitles: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) items.push({ type: "text", value: text.slice(last) });
  return items.filter((x) => String(x.value).trim());
}

/** A number as Hindi words: "3.5" → "तीन दशमलव पाँच", "1,024" → "एक हज़ार चौबीस". Null if it can't be said. */
function hindiNumber(token) {
  const [whole, frac] = token.replace(/,/g, "").split(".");
  const w = spellHindi(Number(whole));
  if (w == null) return null;
  if (!frac) return w;
  return `${w} दशमलव ${frac.split("").map((d) => spellHindi(Number(d))).join(" ")}`;
}

/** A run of Hindi words and numbers (with danda) as IPA; numbers are said in Hindi. */
function phrase(s) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const end = /[।॥]$/.test(w) ? "." : "";
      const core = w.replace(/[।॥]/g, "").replace(/[०-९]/g, (d) => String(DIGITS.indexOf(d)));
      if (/^\d[\d,]*(\.\d+)?$/.test(core)) {
        const said = hindiNumber(core);
        if (said) return said.split(" ").map(wordToIpa).join(" ") + end;
      }
      return wordToIpa(core) + end;
    })
    .join(" ");
}

module.exports = { wordToIpa, toVoiceInput, hasDevanagari, phrase };
