/*
  Lip timing for the virtual teacher. The voice tells us only how long a
  sentence lasts, so the words share that time by their length (a word's
  letters plus a short gap; a comma or full stop adds a pause). TalkingHead
  turns each word into mouth shapes (visemes) from its English spelling, so
  Hindi in Devanagari is first written in Roman letters, close to how it sounds.

  Dependency-free and type-strippable (tests/voice-teacher.test.js).
*/

export interface WordTimes {
  words: string[]
  /** Start of each word, ms from the start of the sentence. */
  wtimes: number[]
  wdurations: number[]
}

/** Spread `ms` over the words of `text`. */
export function wordTimes(text: string, ms: number): WordTimes {
  const raw = text.split(/\s+/).filter(Boolean)
  const words: string[] = []
  const weights: number[] = []
  const gaps: number[] = []
  for (const w of raw) {
    const clean = w.replace(/[^\p{L}\p{N}'+\-*/=<>]/gu, '')
    if (!clean) continue
    words.push(clean)
    weights.push(clean.length + 1)
    gaps.push(/[.!?।]$/.test(w) ? 4 : /[,;:]$/.test(w) ? 2 : 0)
  }
  const total = weights.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0)
  const unit = total ? (ms * 0.96) / total : 0
  const wtimes: number[] = []
  const wdurations: number[] = []
  let t = 0
  for (let i = 0; i < words.length; i++) {
    // Round the boundaries, not the lengths, so a word never ends after the next one starts.
    const start = Math.round(t)
    wtimes.push(start)
    wdurations.push(Math.round(t + weights[i] * unit) - start)
    t += (weights[i] + gaps[i]) * unit
  }
  return { words, wtimes, wdurations }
}

/* Devanagari → Roman, for the mouth only (not a transliteration standard). */
const CONS: Record<string, string> = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'n', च: 'ch', छ: 'chh', ज: 'j', झ: 'jh', ञ: 'n',
  ट: 't', ठ: 'th', ड: 'd', ढ: 'dh', ण: 'n', त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ: 'f', ब: 'b', भ: 'bh', म: 'm', य: 'y', र: 'r', ल: 'l', व: 'v', श: 'sh',
  ष: 'sh', स: 's', ह: 'h', ळ: 'l', क़: 'q', ख़: 'kh', ग़: 'g', ज़: 'z', ड़: 'r', ढ़: 'rh', फ़: 'f',
}
const VOWELS: Record<string, string> = { अ: 'a', आ: 'aa', इ: 'i', ई: 'ee', उ: 'u', ऊ: 'oo', ऋ: 'ri', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au', ऑ: 'o', ॲ: 'e' }
const SIGNS: Record<string, string> = { 'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o', 'ॅ': 'e' }
const DIGITS = '०१२३४५६७८९'

/** Write Devanagari in Roman letters, close to how it is said (other text is left as it is). */
export function toRoman(text: string): string {
  if (!/[ऀ-ॿ]/.test(text)) return text
  const s = text.normalize('NFC')
  let out = ''
  // Is the last letter a consonant still carrying its inherent "a"?
  let pendingA = false
  const flush = (atWordEnd: boolean) => {
    // Hindi drops the final inherent "a" ("kamal", not "kamala").
    if (pendingA && !atWordEnd) out += 'a'
    pendingA = false
  }
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    const two = s.slice(i, i + 2)
    if (CONS[two] !== undefined) {
      flush(false)
      out += CONS[two]
      pendingA = true
      i++
      continue
    }
    if (CONS[c] !== undefined) {
      flush(false)
      out += CONS[c]
      pendingA = true
    } else if (SIGNS[c] !== undefined) {
      out += SIGNS[c]
      pendingA = false
    } else if (c === '्') {
      pendingA = false
    } else if (c === '़') {
      /* nukta: the letter is already close enough */
    } else if (c === 'ं' || c === 'ँ') {
      flush(false)
      out += 'n'
    } else if (c === 'ः') {
      flush(false)
      out += 'h'
    } else if (VOWELS[c] !== undefined) {
      flush(false)
      out += VOWELS[c]
    } else if (DIGITS.includes(c)) {
      flush(false)
      out += String(DIGITS.indexOf(c))
    } else if (c === '।' || c === '॥') {
      flush(true)
      out += '.'
    } else {
      flush(!/[\p{L}\p{N}]/u.test(c))
      out += c
    }
  }
  flush(true)
  return out
}
