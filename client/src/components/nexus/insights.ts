/*
 * The Nexus's small brains, pure and unit-tested (tests/nexus-client.test.js):
 * goal routes, the next step, "continue where you left off", spaced-review
 * hints and the mastery celebration.
 */

/** What these functions need of a subject (a WebCluster fits). */
export interface InsightSubject {
  id: string
  name: string
  short: string
  order: number
  nodes: InsightNode[]
}
export interface InsightNode {
  id: string
  n: string
  z: number
  /** progress 0–100 */
  p: number
  /** 0 locked, 1 open, 2 mastered */
  s: number
  req: string[]
  cx?: string[]
  /** days since its PYQs were last answered right (-1: never) */
  ag?: number
  /** spaced-repetition interval reached, days */
  iv?: number
  /** days since it was last studied (-1: never) */
  td?: number
}

const keyOf = (s: InsightSubject, n: InsightNode) => `${s.id}:${n.id}`

/**
 * A goal route: every concept of the goal's subjects plus everything they
 * need (across subjects), in learning order — prerequisites first, then
 * lower zones, then the subject's place. `next` are the first steps not yet
 * mastered, the ones open to you first.
 */
export function routePlan(subjects: InsightSubject[], goal: string[], nextCount = 5): { order: string[]; next: string[]; keys: Set<string> } {
  const byKey = new Map<string, { s: InsightSubject; n: InsightNode }>()
  for (const s of subjects) for (const n of s.nodes) byKey.set(keyOf(s, n), { s, n })
  const pre = (k: string) => {
    const hit = byKey.get(k)
    if (!hit) return []
    return [...hit.n.req.map((r) => `${hit.s.id}:${r}`), ...(hit.n.cx ?? [])].filter((x) => byKey.has(x))
  }
  const want = new Set<string>()
  const stack: string[] = []
  const goals = new Set(goal)
  for (const s of subjects) if (goals.has(s.id)) for (const n of s.nodes) stack.push(keyOf(s, n))
  while (stack.length) {
    const k = stack.pop()!
    if (want.has(k)) continue
    want.add(k)
    for (const r of pre(k)) stack.push(r)
  }
  const indeg = new Map<string, number>()
  const kids = new Map<string, string[]>()
  for (const k of want) {
    const rs = pre(k).filter((r) => want.has(r))
    indeg.set(k, rs.length)
    for (const r of rs) kids.set(r, [...(kids.get(r) ?? []), k])
  }
  const rank = (k: string) => {
    const { s, n } = byKey.get(k)!
    return n.z * 1000 + s.order
  }
  const ready = [...want].filter((k) => indeg.get(k) === 0)
  const order: string[] = []
  while (ready.length) {
    ready.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    const k = ready.shift()!
    order.push(k)
    for (const u of kids.get(k) ?? []) {
      const d = (indeg.get(u) ?? 1) - 1
      indeg.set(u, d)
      if (d === 0) ready.push(u)
    }
  }
  // Anything left (a cycle in the data) goes last, still in a stable order.
  for (const k of [...want].sort()) if (!order.includes(k)) order.push(k)
  const open = order.filter((k) => byKey.get(k)!.n.s === 1)
  const rest = order.filter((k) => byKey.get(k)!.n.s === 0)
  return { order, next: [...open, ...rest].slice(0, nextCount), keys: want }
}

/** The next step: the open skill you are furthest into, nearest the centre. */
export function nextStep(subjects: InsightSubject[]): string | null {
  let best: { k: string; n: InsightNode; s: InsightSubject } | null = null
  for (const s of subjects) {
    for (const n of s.nodes) {
      if (n.s !== 1) continue
      if (!best || n.p > best.n.p || (n.p === best.n.p && (n.z < best.n.z || (n.z === best.n.z && s.order < best.s.order)))) best = { k: keyOf(s, n), n, s }
    }
  }
  return best?.k ?? null
}

/** Where you left off: the skill you studied most recently (not yet mastered first). */
export function continueFrom(subjects: InsightSubject[]): { key: string; name: string; subject: string; subjectName: string } | null {
  let best: { s: InsightSubject; n: InsightNode } | null = null
  const score = (n: InsightNode) => (n.td ?? -1) < 0 ? Infinity : (n.td as number) + (n.s === 2 ? 3 : 0)
  for (const s of subjects) for (const n of s.nodes) if ((n.td ?? -1) >= 0 && (!best || score(n) < score(best.n))) best = { s, n }
  return best ? { key: keyOf(best.s, best.n), name: best.n.n, subject: best.s.id, subjectName: best.s.name } : null
}

/**
 * Spaced review: a mastered concept is due once the days since its PYQs were
 * last answered right reach its interval (at least 3 days).
 */
export function isDue(n: Pick<InsightNode, 's' | 'ag' | 'iv'>): boolean {
  if (n.s !== 2 || n.ag === undefined || n.ag < 0) return false
  return n.ag >= Math.max(3, n.iv ?? 0)
}

/** Concepts mastered since the set seen last time (null: first visit, none). */
export function newlyMastered(before: Set<string> | null, subjects: InsightSubject[]): string[] {
  if (!before) return []
  const out: string[] = []
  for (const s of subjects) for (const n of s.nodes) if (n.s === 2 && !before.has(keyOf(s, n))) out.push(keyOf(s, n))
  return out
}

/** Every mastered key (what newlyMastered compares against next time). */
export function masteredKeys(subjects: InsightSubject[]): string[] {
  const out: string[] = []
  for (const s of subjects) for (const n of s.nodes) if (n.s === 2) out.push(keyOf(s, n))
  return out
}
