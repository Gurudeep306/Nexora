/*
  The guide finds things on the page by the names people see: "point at the
  Run button" finds the button whose name is "Run", on any page, with no
  tagging. Scoring is pure (tests/voice-teacher.test.js); collecting the
  page's elements is in guide.ts.

  Dependency-free and type-strippable.
*/

export type TargetKind = 'button' | 'link' | 'tab' | 'field' | 'heading'

export interface Candidate {
  /** The name a person would read or hear. */
  name: string
  kind: TargetKind
  /** On screen now (fully or mostly). */
  visible: boolean
}

const FILLER = new Set(['the', 'a', 'an', 'button', 'link', 'tab', 'section', 'option', 'icon', 'wala', 'waala', 'vala', 'page', 'my', 'this', 'that', 'yeh', 'woh'])

/** Words to compare: lower case, no punctuation, no filler words. */
export function words(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[‘’'"“”.,:;!?()[\]{}…·→←|/\\-]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w))
}

/** Edit distance, for small slips ("setings"). */
function close(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 4) return false
  let i = 0
  while (i < a.length && a[i] === b[i]) i++
  const ra = a.slice(i + (a.length >= b.length ? 1 : 0))
  const rb = b.slice(i + (b.length >= a.length ? 1 : 0))
  return ra === rb
}

/** How well a spoken target matches a name, 0–1. */
export function nameScore(said: string, name: string): number {
  const s = words(said)
  const n = words(name)
  if (!s.length || !n.length) return 0
  if (s.join(' ') === n.join(' ')) return 1
  const hit = s.filter((w) => n.some((x) => close(w, x) || (w.length >= 3 && x.startsWith(w)))).length
  if (!hit) return 0
  // Every spoken word found in a short name is strong; extra words in the name lower it a little.
  const cover = hit / s.length
  const extra = Math.max(0, n.length - hit) / n.length
  return Math.max(0, cover * (1 - extra * 0.35)) * (cover === 1 ? 0.95 : 0.7)
}

const KIND_ORDER: Record<TargetKind, number> = { button: 0.04, tab: 0.04, link: 0.03, field: 0.02, heading: 0 }

/**
 * The best match for what was said, or null when nothing is close enough.
 * Things on screen beat things below the fold; for a click, controls beat headings.
 */
export function bestTarget<C extends Candidate>(said: string, list: C[], forClick = false): C | null {
  let best: { c: C; s: number } | null = null
  for (const c of list) {
    if (forClick && c.kind === 'heading') continue
    let s = nameScore(said, c.name)
    if (s < 0.6) continue
    s += (c.visible ? 0.05 : 0) + KIND_ORDER[c.kind]
    if (!best || s > best.s) best = { c, s }
  }
  return best?.c ?? null
}

/** Names on buttons that change or lose something: the teacher points, but the student presses. */
export function risky(name: string): boolean {
  return /\b(delete|remove|submit|log ?out|sign ?out|pay|buy|purchase|reset|end (the )?test|finish (the )?test|leave|discard|clear|ban|block|send|post|publish|unfollow|cancel (plan|subscription))\b|हटाओ|मिटाओ|सबमिट|भेजो/i.test(name)
}
