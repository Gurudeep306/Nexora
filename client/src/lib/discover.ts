/**
 * "Something to explore": picks from every real part of the site — DSA
 * chapters, Learn subjects and their concepts, GATE subjects, their topics and
 * their notes — that change every few hours, differ from person to person,
 * and never repeat a fixed set. Home and GATE home use it.
 *
 * The choice is seeded (person + time window + shuffle), so it stays put while
 * you look at it, changes by itself later, and Shuffle gives a new set.
 */

export type DiscoverKind = 'chapter' | 'subject' | 'concept' | 'topic' | 'notes'

export interface DiscoverPick {
  key: string
  kind: DiscoverKind
  title: string
  /** One plain line about it, from the real content. */
  line: string
  to: string
  /** Where it lives ("DSA course", "Operating Systems"…). */
  area: string
}

/** How long a set of picks stays before it changes by itself. */
export const WINDOW_HOURS = 4

export function windowOf(now: number, hours = WINDOW_HOURS): number {
  return Math.floor(now / (hours * 3_600_000))
}

/** A small, fast, seeded random number generator (mulberry32). */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The first sentence of a description, kept short. */
function firstSentence(s: string | undefined, max = 120): string {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const cut = t.match(/^.*?[.!?](\s|$)/)?.[0]?.trim() ?? t
  return cut.length > max ? `${cut.slice(0, max - 1).trimEnd()}…` : cut
}

/**
 * Pick `n` from the pool: mixed kinds and areas first (no two of the same kind
 * while others remain), nothing in `skip`, the same for the same seed.
 */
export function choose(pool: DiscoverPick[], n: number, seed: string, skip: Set<string> = new Set()): DiscoverPick[] {
  const rand = seeded(seed)
  const fresh = pool.filter((p) => !skip.has(p.key))
  const source = fresh.length >= n ? fresh : pool
  // Shuffle a copy (Fisher–Yates), then take a spread of kinds and areas.
  const order = [...source]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const out: DiscoverPick[] = []
  const kinds = new Set<string>()
  const areas = new Set<string>()
  for (const p of order) {
    if (out.length >= n) break
    if (kinds.has(p.kind) || areas.has(p.area)) continue
    out.push(p)
    kinds.add(p.kind)
    areas.add(p.area)
  }
  for (const p of order) {
    if (out.length >= n) break
    if (!out.includes(p)) out.push(p)
  }
  return out
}

/* ── the pool ── */

export interface DiscoverSources {
  /** DSA chapters (client/src/learn/content/dsa/syllabus.ts). */
  dsa?: { id: string; title: string; blurb: string; pages?: number; load?: unknown }[]
  /** Learn subjects with their concepts (GET /api/nexus/web clusters). */
  clusters?: {
    id: string
    name: string
    engine: string | null
    description?: string
    gate?: { pyq: string | null; notes: string | null }
    nodes: { id: string; n: string; z: number }[]
  }[]
  /** GATE subjects with their topics (useSubjects). */
  gate?: { id: string; name: string; legacy?: boolean; topics: { id: string; name: string }[] }[]
  /** Builders for links, so this file stays free of app routing. */
  links: {
    subject: (c: { id: string; engine: string | null }, nodeId?: string | null) => string
    practice?: (o: { subject: string; topic?: string }) => string
  }
}

export function discoverPool(src: DiscoverSources): DiscoverPick[] {
  const pool: DiscoverPick[] = []
  for (const t of src.dsa ?? []) {
    if (!t.load) continue
    pool.push({
      key: `dsa:${t.id}`,
      kind: 'chapter',
      title: t.title,
      line: firstSentence(t.blurb) || 'A chapter of the DSA course, animated step by step.',
      to: `/learn/dsa/${t.id}`,
      area: 'DSA course',
    })
  }
  for (const c of src.clusters ?? []) {
    if (c.engine === 'dsa') continue
    pool.push({
      key: `subject:${c.id}`,
      kind: 'subject',
      title: c.name,
      line: firstSentence(c.description) || `Every lesson and skill of ${c.name}, in one place.`,
      to: src.links.subject(c),
      area: c.name,
    })
    // A handful of its early concepts (the ones a newcomer can start with).
    for (const node of c.nodes.filter((x) => x.z <= 1).slice(0, 12)) {
      pool.push({
        key: `concept:${c.id}:${node.id}`,
        kind: 'concept',
        title: node.n,
        line: `A starting point in ${c.name}.`,
        to: src.links.subject(c, node.id),
        area: c.name,
      })
    }
    if (c.gate?.notes) {
      pool.push({
        key: `notes:${c.id}`,
        kind: 'notes',
        title: `${c.name} notes`,
        line: 'The written notes, figures and worked examples, at your own pace.',
        to: src.links.subject(c),
        area: c.name,
      })
    }
  }
  if (src.links.practice) {
    for (const s of src.gate ?? []) {
      if (s.legacy) continue
      for (const t of s.topics) {
        pool.push({
          key: `topic:${s.id}:${t.id}`,
          kind: 'topic',
          title: t.name,
          line: `Past GATE questions on it, from ${s.name}.`,
          to: src.links.practice({ subject: s.id, topic: t.id }),
          area: s.name,
        })
      }
    }
  }
  return pool
}

/** A heading line that changes with the picks (so the box never reads the same). */
const LEADS = [
  'A few things worth an hour today.',
  'Fresh picks from across the site.',
  'Something new to open — or something you skipped.',
  'Three doors, chosen for this part of the day.',
  'Off the beaten path: three corners of the syllabus.',
  'Different every few hours. Pick one that catches your eye.',
]
export function leadFor(seed: string): string {
  const r = seeded(`lead:${seed}`)
  return LEADS[Math.floor(r() * LEADS.length)]
}

/** The words for a pick's kind, shown small above its title. */
export const KIND_LABEL: Record<DiscoverKind, string> = {
  chapter: 'DSA chapter',
  subject: 'Subject',
  concept: 'Concept',
  topic: 'GATE topic',
  notes: 'Notes',
}
