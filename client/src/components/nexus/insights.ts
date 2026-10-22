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
 * mastered: open ones in the goal's subjects first, then open prerequisites
 * elsewhere, then locked ones.
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
  // Next: what you can do now in the goal's own subjects, then the open
  // prerequisites elsewhere, then what is still locked (goal subjects first).
  const inGoal = (k: string) => goals.has(byKey.get(k)!.s.id)
  const pick = (st: number, own: boolean) => order.filter((k) => byKey.get(k)!.n.s === st && inGoal(k) === own)
  return { order, next: [...pick(1, true), ...pick(1, false), ...pick(0, true), ...pick(0, false)].slice(0, nextCount), keys: want }
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

/* ── per node: confidence, unlock path; per subject: study plan ── */

/** What confidence needs of a subject-tree node (a NexusNode fits). */
export interface ConfidenceNode {
  progress: number
  completed: boolean
  testedOut?: boolean
  metric?: {
    pyq?: { pool: number; target: number; correct: number; attempted: number; accuracy: number | null } | null
    lessons?: { done: number; total: number } | null
  } | null
  memory?: { lastAt: number; interval: number } | null
}

/**
 * A node's mastery confidence (0–100) from what was studied — lessons read,
 * PYQs right against the target, accuracy — fading with time since the
 * PYQs were last answered right (half-life: twice the review interval, at
 * least 7 days; never below half). A passed quick check counts at least 80.
 */
export function confidence(n: ConfidenceNode, now = Date.now()) {
  const pyq = n.metric?.pyq ?? null
  const lessons = n.metric?.lessons ?? null
  const parts: number[] = []
  if (lessons && lessons.total) parts.push(lessons.done / lessons.total)
  if (pyq && pyq.target) parts.push(0.7 * Math.min(1, pyq.correct / pyq.target) + 0.3 * ((pyq.accuracy ?? 0) / 100))
  const base = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : n.progress / 100
  const days = n.memory?.lastAt ? Math.max(0, (now - n.memory.lastAt) / 86400000) : null
  const half = Math.max(7, 2 * (n.memory?.interval ?? 0))
  const decay = days === null ? 1 : Math.pow(0.5, days / half)
  let score = Math.round(100 * base * (0.5 + 0.5 * decay))
  if (n.testedOut) score = Math.max(score, 80)
  if (n.completed && !pyq && !lessons) score = Math.max(score, 100)
  const bits: string[] = []
  if (lessons && lessons.total) bits.push(`Lessons ${lessons.done}/${lessons.total}`)
  if (pyq && pyq.target) bits.push(`PYQs ${Math.min(pyq.correct, pyq.target)}/${pyq.target}${pyq.accuracy != null ? ` (${pyq.accuracy}%)` : ''}`)
  if (days !== null) bits.push(days < 1 ? 'practised today' : `last practised ${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'} ago`)
  if (n.testedOut) bits.push('tested out')
  return { score: Math.min(100, score), days: days === null ? null : Math.round(days), decay, breakdown: bits.join(' · ') || 'Nothing studied yet' }
}

/**
 * The shortest way to unlock a node: every not-yet-mastered prerequisite it
 * depends on (all are needed), in an order you can study them, with time.
 */
export function unlockPath(nodes: { id: string; requires: string[]; completed: boolean }[], target: string, minutes: Record<string, number> = {}) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const need = new Set<string>()
  const walk = (id: string, guard = 0) => {
    for (const r of byId.get(id)?.requires ?? []) {
      const p = byId.get(r)
      if (!p || p.completed || need.has(r) || guard > 300) continue
      need.add(r)
      walk(r, guard + 1)
    }
  }
  walk(target)
  // Topological order (prerequisites first), stable by file order.
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  const order: string[] = []
  const placed = new Set<string>()
  const ids = [...need].sort((a, b) => index.get(a)! - index.get(b)!)
  while (order.length < ids.length) {
    const next = ids.find((id) => !placed.has(id) && (byId.get(id)!.requires ?? []).every((r) => !need.has(r) || placed.has(r)))
    if (!next) break
    placed.add(next)
    order.push(next)
  }
  for (const id of ids) if (!placed.has(id)) order.push(id)
  return { steps: order, minutes: order.reduce((a, id) => a + (minutes[id] ?? 0), 0) }
}

export interface PlanNode {
  id: string
  requires: string[]
  completed: boolean
  progress: number
}

/**
 * A study plan through a subject's remaining nodes: prerequisites first,
 * heavier exam weight earlier among what is ready, packed into days of
 * `perDay` minutes from `start`; `onTime` says whether it ends by `end`
 * (the exam date). Returns the days, the weeks they group into and the finish.
 */
export function studyPlan(nodes: PlanNode[], minutes: Record<string, number>, weight: Record<string, number>, start: Date, perDay: number, end?: Date | null) {
  const left = new Map(nodes.filter((n) => !n.completed).map((n) => [n.id, Math.max(10, Math.round((minutes[n.id] ?? 40) * (1 - n.progress / 100)))]))
  const done = new Set(nodes.filter((n) => n.completed).map((n) => n.id))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  const order: string[] = []
  const queued = new Set<string>()
  while (order.length < left.size) {
    const ready = [...left.keys()].filter((id) => !queued.has(id) && (byId.get(id)!.requires ?? []).every((r) => done.has(r) || queued.has(r) || !byId.has(r)))
    if (!ready.length) {
      for (const id of left.keys()) {
        if (!queued.has(id)) {
          queued.add(id)
          order.push(id)
        }
      }
      break
    }
    ready.sort((a, b) => (weight[b] ?? 0) - (weight[a] ?? 0) || index.get(a)! - index.get(b)!)
    queued.add(ready[0])
    order.push(ready[0])
  }
  const day0 = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const days: { date: string; items: { id: string; minutes: number }[]; minutes: number }[] = []
  let cur = { date: iso(day0), items: [] as { id: string; minutes: number }[], minutes: 0 }
  let di = 0
  const cap = Math.max(15, perDay)
  for (const id of order) {
    let need = left.get(id)!
    while (need > 0) {
      const room = cap - cur.minutes
      if (room <= 0) {
        days.push(cur)
        di++
        cur = { date: iso(new Date(day0.getTime() + di * 86400000)), items: [], minutes: 0 }
        continue
      }
      const take = Math.min(room, need)
      cur.items.push({ id, minutes: take })
      cur.minutes += take
      need -= take
    }
  }
  if (cur.items.length) days.push(cur)
  const weeks: { start: string; days: typeof days; minutes: number }[] = []
  for (const d of days) {
    const w = Math.floor((Date.parse(d.date) - day0.getTime()) / (7 * 86400000))
    if (!weeks[w]) weeks[w] = { start: iso(new Date(day0.getTime() + w * 7 * 86400000)), days: [], minutes: 0 }
    weeks[w].days.push(d)
    weeks[w].minutes += d.minutes
  }
  const finish = days.length ? days[days.length - 1].date : iso(day0)
  return { days, weeks: weeks.filter(Boolean), finish, onTime: end ? Date.parse(finish) <= end.getTime() : null }
}

/** "1h 45m" / "40m". */
export function fmtMinutes(m: number) {
  const h = Math.floor(m / 60)
  const r = Math.round(m % 60)
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`
}
