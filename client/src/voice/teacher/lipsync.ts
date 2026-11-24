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

/** The loudness of a voice clip, one value (0–1) per `frameMs`, scaled so normal speech is near 1. */
export function energyEnvelope(samples: ArrayLike<number>, rate: number, frameMs = 20): number[] {
  const n = Math.max(1, Math.round((rate * frameMs) / 1000))
  const out: number[] = []
  for (let i = 0; i < samples.length; i += n) {
    let s = 0
    const end = Math.min(samples.length, i + n)
    for (let j = i; j < end; j++) s += samples[j] * samples[j]
    out.push(Math.sqrt(s / Math.max(1, end - i)))
  }
  // Scaled by a loud-but-not-peak frame, so one click doesn't make everything look quiet.
  const ref = [...out].sort((a, b) => a - b)[Math.floor(out.length * 0.9)] || 0
  return ref > 0 ? out.map((v) => Math.min(1, v / ref)) : out.map(() => 0)
}

/** Where the voice is sounding (ms spans), from an envelope: short gaps are bridged, short blips dropped. */
export function voicedSpans(env: number[], frameMs = 20, level = 0.12): [number, number][] {
  const spans: [number, number][] = []
  for (let i = 0; i < env.length; i++) {
    if (env[i] < level) continue
    const s = i * frameMs
    while (i < env.length && env[i] >= level) i++
    const e = i * frameMs
    const last = spans[spans.length - 1]
    if (last && s - last[1] < 90) last[1] = e
    else spans.push([s, e])
  }
  return spans.filter(([s, e]) => e - s >= 40)
}

/**
 * Word times that follow the sound itself: the words share only the time the
 * voice is sounding, so the mouth rests in every pause and never runs ahead
 * or behind. Used when the voice gives no word times of its own (the
 * student's own voice, Azure). Falls back to `wordTimes` when the clip is
 * nearly silent.
 */
export function wordTimesByEnergy(text: string, ms: number, env: number[], frameMs = 20): WordTimes {
  const even = wordTimes(text, ms)
  const spans = voicedSpans(env, frameMs).map(([s, e]) => [Math.min(s, ms), Math.min(e, ms)] as [number, number]).filter(([s, e]) => e > s)
  const voiced = spans.reduce((a, [s, e]) => a + e - s, 0)
  if (!even.words.length || voiced < ms * 0.2) return even
  const weights = even.words.map((w) => w.length + 1)
  const unit = voiced / weights.reduce((a, b) => a + b, 0)
  // Voiced time → clock time, and which span it falls in.
  const at = (v: number, endSide: boolean): [number, number] => {
    let left = v
    for (let k = 0; k < spans.length; k++) {
      const len = spans[k][1] - spans[k][0]
      if (left < len || (endSide && left <= len) || k === spans.length - 1) return [spans[k][0] + Math.min(left, len), k]
      left -= len
    }
    return [ms, spans.length - 1]
  }
  const wtimes: number[] = []
  const wdurations: number[] = []
  let v = 0
  for (const w of weights) {
    const [s0, ks] = at(v, false)
    const [e0, ke] = at(v + w * unit, true)
    let s = s0
    let e = e0
    if (ks !== ke) {
      // A word never stretches across a pause: it stays in the span holding most of it.
      if (spans[ks][1] - s >= e - spans[ke][0]) e = spans[ks][1]
      else s = spans[ke][0]
    }
    const start = Math.max(Math.round(s), wtimes.length ? wtimes[wtimes.length - 1] + wdurations[wdurations.length - 1] : 0)
    wtimes.push(start)
    wdurations.push(Math.max(1, Math.round(e) - start))
    v += w * unit
  }
  return { words: even.words, wtimes, wdurations }
}

/** The word being said `t` ms into the sentence (−1 before the first). */
export function wordAt(wtimes: number[], t: number): number {
  let i = -1
  while (i + 1 < wtimes.length && wtimes[i + 1] <= t) i++
  return i
}

const bare = (w: string) => toRoman(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/** Is a written word the one the voice reports (case, punctuation and script aside)? */
export function sameWord(written: string, spoken: string): boolean {
  const a = bare(written)
  return !!a && a === bare(spoken)
}

/**
 * When each written word of a caption starts, from the spoken word times. Lone
 * punctuation takes the time of the word before it; a voice that counts words
 * its own way is matched by position.
 */
export function captionStarts(tokens: string[], t: WordTimes): number[] {
  const spoken = tokens.map((w) => !!bare(w))
  const n = spoken.filter(Boolean).length
  const starts: number[] = []
  let k = -1
  for (let i = 0; i < tokens.length; i++) {
    if (spoken[i]) k++
    const at = Math.max(0, k)
    const j = n === t.words.length ? at : Math.min(t.wtimes.length - 1, Math.round((at * t.words.length) / Math.max(1, n)))
    starts.push(t.wtimes[j] ?? 0)
  }
  return starts
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
