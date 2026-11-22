/*
  The fast command matcher: turns a spoken (or typed) sentence into one action
  from the Action Graph, with no AI and no network. English, Hinglish and Hindi
  (Devanagari) are all folded into one canonical form first, so "notes kholo",
  "नोट्स खोलो" and "open notes" meet in the middle.

  Only when this finds nothing does a small model get asked (later phases).
  Pure functions, dependency-free and type-strippable: tests/voice-actions.test.js.
*/
import type { ActionSpec, Args } from './types'

/* ── Normalising ─────────────────────────────────────────────────────────── */

/** Hindi words in Devanagari → the Roman spelling the synonym table knows. */
const DEVANAGARI: Record<string, string> = {
  खोलो: 'kholo', खोल: 'khol', खोलें: 'kholo', खोलिए: 'kholo', जाओ: 'jao', जाइए: 'jao', जाएं: 'jao', चलो: 'chalo', ले: 'le',
  अगला: 'agla', अगले: 'agle', अगली: 'agli', पिछला: 'pichla', पिछले: 'pichle', पीछे: 'peeche', वापस: 'wapas',
  रुको: 'ruko', रोको: 'roko', रुक: 'ruk', चलाओ: 'chalao', चला: 'chala', शुरू: 'shuru', ऊपर: 'upar', नीचे: 'neeche',
  बंद: 'band', करो: 'karo', कर: 'kar', दो: 'do', दिखाओ: 'dikhao', समझाओ: 'samjhao', फिर: 'phir', से: 'se', दोबारा: 'dobara',
  नोट्स: 'notes', सवाल: 'sawal', प्रश्न: 'prashn', विकल्प: 'vikalp', होम: 'home', सेटिंग्स: 'settings', प्रॉब्लम्स: 'problems',
  सीखो: 'seekho', मेरा: 'mera', मेरी: 'meri', प्रोफ़ाइल: 'profile', प्रोफाइल: 'profile', थीम: 'theme', डार्क: 'dark', लाइट: 'light',
  मोड: 'mode', स्क्रॉल: 'scroll', चुनो: 'chuno', ए: 'a', बी: 'b', सी: 'c', डी: 'd', एक: 'ek', तीन: 'teen', चार: 'char',
  पेज: 'page', सबसे: 'sabse', नेक्सस: 'nexus', कॉन्टेस्ट: 'contests', बुकमार्क: 'bookmarks', सब्मिशन: 'submissions',
}

/** Multi-word phrases first, then single words: Hinglish → canonical English. */
const SYNONYMS: [RegExp, string][] = [
  [/\b(sabse upar|bilkul upar)\b/g, 'top'],
  [/\b(sabse neeche|sabse niche|bilkul neeche)\b/g, 'bottom'],
  [/\b(peeche jao|wapas jao|piche jao)\b/g, 'back'],
  [/\b(khol ke dikhao|khol do|khol dijiye|open karo|open kar do|kholo|kholiye|khol)\b/g, 'open'],
  [/\b(le chalo|le jao|pe jao|par jao|pe chalo|par chalo|jao|chalo|jaiye)\b/g, 'go'],
  [/\b(phir se|fir se|ek baar aur|dobara|dubara)\b/g, 'again'],
  [/\b(ruk jao|rok do|roko|ruko|ruk|thamo|thehro)\b/g, 'pause'],
  [/\b(chala do|play karo|shuru karo|start karo|chalao|chala)\b/g, 'play'],
  [/\b(wapas|peeche|piche|pichhe)\b/g, 'back'],
  [/\b(agla|agle|agli|aage|next wala)\b/g, 'next'],
  [/\b(pichla|pichle|pichhla|pichli)\b/g, 'previous'],
  [/\b(upar)\b/g, 'up'],
  [/\b(neeche|niche)\b/g, 'down'],
  [/\b(band karo|band kar do|band)\b/g, 'close'],
  [/\b(chuno|select karo|mark karo)\b/g, 'choose'],
  [/\b(samjhao|explain karo)\b/g, 'explain'],
  [/\b(dikhao|dikha do)\b/g, 'show'],
  [/\b(sawal|prashn)\b/g, 'question'],
  [/\b(vikalp)\b/g, 'option'],
  [/\b(seekho|padhai)\b/g, 'learn'],
  [/\b(mera|meri|mere|my)\b/g, 'my'],
]

/** Words that carry no meaning in a command. Not "do" (it is also "two"). */
const FILLERS = new Set(['please', 'plz', 'pls', 'zara', 'jara', 'na', 'bhai', 'yaar', 'yar', 'the', 'an', 'karo', 'kar', 'kardo', 'karna', 'dijiye', 'ji', 'can', 'you', 'could', 'would', 'kya', 'aap', 'me', 'mein', 'mujhe', 'ko', 'hey', 'guru', 'ok', 'okay', 'acha', 'achha', 'now', 'abhi', 'just', 'jaldi', 'for', 'to'])

/** Lower-case, fold Devanagari and Hinglish into canonical words, drop fillers. */
export function normalize(text: string): string {
  let s = text.normalize('NFC').toLowerCase()
  s = s.replace(/[ऀ-ॿ]+/g, (w) => ` ${DEVANAGARI[w] ?? w} `)
  s = s.replace(/[^\p{L}\p{N}]+/gu, ' ')
  s = ` ${s.trim().replace(/\s+/g, ' ')} `
  for (const [re, to] of SYNONYMS) s = s.replace(re, to)
  return s
    .split(' ')
    .filter((w) => w && !FILLERS.has(w))
    .join(' ')
}

/* ── Phrase expansion ────────────────────────────────────────────────────── */

export interface Variant {
  id: string
  tokens: string[]
  /** Tokens that came from slot values: all of them must be heard. */
  slotTokens: string[]
  args: Args
}

/** One spoken alias list per slot value: 'B|bee|बी' → value 'B', aliases [B, bee, बी]. */
function aliases(value: string): { value: string; spoken: string[] } {
  const parts = value.split('|').map((p) => p.trim()).filter(Boolean)
  return { value: parts[0], spoken: parts }
}

const MAX_VARIANTS = 600

/** Every concrete sentence an action can be called by, already normalised. */
export function expand(spec: ActionSpec): Variant[] {
  const out: Variant[] = []
  const phrases = [...spec.say.en, ...(spec.say.hi ?? [])]
  for (const phrase of phrases) {
    const slots = [...phrase.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
    let partial: { text: string; slotTokens: string[]; args: Args }[] = [{ text: phrase, slotTokens: [], args: {} }]
    for (const slot of slots) {
      const values = (spec.args?.[slot] ?? []).map(aliases)
      const next: typeof partial = []
      for (const p of partial)
        for (const v of values)
          for (const spoken of v.spoken) {
            if (next.length >= MAX_VARIANTS) break
            const said = normalize(spoken)
            next.push({ text: p.text.replace(`{${slot}}`, ` ${spoken} `), slotTokens: [...p.slotTokens, ...said.split(' ').filter(Boolean)], args: { ...p.args, [slot]: v.value } })
          }
      partial = next
    }
    for (const p of partial) {
      const tokens = normalize(p.text).split(' ').filter(Boolean)
      if (tokens.length) out.push({ id: spec.id, tokens, slotTokens: p.slotTokens, args: p.args })
    }
  }
  return out
}

/* ── Scoring ─────────────────────────────────────────────────────────────── */

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, cur[j])
    }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

/**
 * Same word, allowing small recognition slips on longer words ("problms").
 * The first letter must match: slips rarely change it, and without this
 * "light" and "night" (light mode / night mode) were the same word.
 */
export function sameWord(a: string, b: string): boolean {
  if (a === b) return true
  const n = Math.min(a.length, b.length)
  if (n < 4 || a[0] !== b[0]) return false
  return editDistance(a, b, n >= 7 ? 2 : 1) <= (n >= 7 ? 2 : 1)
}

/** 0..1: how well the heard words cover this sentence (and not much else). */
export function score(heard: string[], v: Variant): number {
  if (!heard.length || !v.tokens.length) return 0
  const used = new Array(heard.length).fill(false)
  let matched = 0
  for (const t of v.tokens) {
    const i = heard.findIndex((h, k) => !used[k] && sameWord(h, t))
    if (i >= 0) {
      used[i] = true
      matched++
    }
  }
  const recall = matched / v.tokens.length
  const precision = used.filter(Boolean).length / heard.length
  // Recall matters most, but a short phrase inside a long sentence ("search"
  // in "what is a binary search tree") must not win: precision scales it.
  let s = recall * (0.5 + 0.5 * precision)
  // Every word of a slot value must be heard ("option B" must hear "b").
  if (v.slotTokens.some((t) => !heard.some((h) => sameWord(h, t)))) s *= 0.5
  return Math.round(s * 1000) / 1000
}

/* ── Matching ────────────────────────────────────────────────────────────── */

export interface Match {
  id: string
  args: Args
  score: number
}

export interface MatchResult {
  /** The action to run, if one is clearly best. */
  best: Match | null
  /** Close alternatives: ask "1 or 2?" when there is no clear best. */
  candidates: Match[]
}

export const ACCEPT = 0.75
const MARGIN = 0.06

/** Pick the action a sentence asks for, or say it is unclear. */
export function matchCommand(utterance: string, specs: ActionSpec[], expanded?: Map<string, Variant[]>): MatchResult {
  const heard = normalize(utterance).split(' ').filter(Boolean)
  if (!heard.length) return { best: null, candidates: [] }
  // An action that reads its own value ("answer 42.5") and finds one wins.
  for (const spec of specs) {
    const args = spec.parse?.(utterance)
    if (args) return { best: { id: spec.id, args, score: 1 }, candidates: [] }
  }
  const ranked: Match[] = []
  for (const spec of specs) {
    const variants = expanded?.get(spec.id) ?? expand(spec)
    let top: Match | null = null
    for (const v of variants) {
      const s = score(heard, v)
      if (!top || s > top.score) top = { id: spec.id, args: v.args, score: s }
    }
    if (top) ranked.push(top)
  }
  ranked.sort((a, b) => b.score - a.score)
  const good = ranked.filter((m) => m.score >= ACCEPT)
  if (!good.length) return { best: null, candidates: ranked.slice(0, 3).filter((m) => m.score >= 0.5) }
  const [first, second] = good
  if (second && first.score - second.score < MARGIN) return { best: null, candidates: good.slice(0, 3) }
  return { best: first, candidates: good.slice(0, 3) }
}
