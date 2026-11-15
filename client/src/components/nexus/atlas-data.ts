import type { WebCluster, WebNode } from './types'

/*
 * Real figures for the Atlas (the journal style's Nexus): how many skills
 * build on each star (its "magnitude"), the keystone you can reach next,
 * and per-subject tallies. Everything comes from the loaded web; nothing is
 * invented or estimated.
 */

export type StarKey = string
export const keyOf = (c: WebCluster, n: WebNode): StarKey => `${c.id}:${n.id}`

/** For every star, how many other skills list it as a prerequisite (same subject or across subjects). */
export function dependents(clusters: WebCluster[]): Map<StarKey, number> {
  const deps = new Map<StarKey, number>()
  for (const c of clusters)
    for (const n of c.nodes) {
      for (const r of n.req) deps.set(`${c.id}:${r}`, (deps.get(`${c.id}:${r}`) ?? 0) + 1)
      for (const x of n.cx ?? []) deps.set(x, (deps.get(x) ?? 0) + 1)
    }
  return deps
}

/** The open (not yet mastered) star that unlocks the most other skills: the keystone worth doing next. */
export function keystone(clusters: WebCluster[], deps: Map<StarKey, number>): { cluster: WebCluster; node: WebNode; unlocks: number } | null {
  let best: { cluster: WebCluster; node: WebNode; unlocks: number } | null = null
  for (const c of clusters)
    for (const n of c.nodes) {
      if (n.s !== 1) continue
      const u = deps.get(keyOf(c, n)) ?? 0
      if (!best || u > best.unlocks || (u === best.unlocks && n.z < best.node.z)) best = { cluster: c, node: n, unlocks: u }
    }
  return best && best.unlocks > 0 ? best : null
}

export interface Tally {
  total: number
  mastered: number
  open: number
  pct: number
}

/** Stars mastered / open / total for one subject (optional projects excluded from the percentage, as on the subject page). */
export function tally(c: WebCluster): Tally {
  const core = c.nodes.filter((n) => !n.o)
  const mastered = core.filter((n) => n.s === 2).length
  const open = core.filter((n) => n.s === 1).length
  return { total: core.length, mastered, open, pct: core.length ? Math.round((mastered / core.length) * 100) : 0 }
}

/** Subject → subject links: how many skills in `to` need a skill in `from`. */
export function subjectLinks(clusters: WebCluster[]): { from: string; to: string; n: number }[] {
  const ids = new Set(clusters.map((c) => c.id))
  const w = new Map<string, number>()
  for (const c of clusters)
    for (const n of c.nodes)
      for (const x of n.cx ?? []) {
        const from = x.split(':')[0]
        if (from === c.id || !ids.has(from)) continue
        const k = `${from}>${c.id}`
        w.set(k, (w.get(k) ?? 0) + 1)
      }
  return [...w].map(([k, n]) => {
    const [from, to] = k.split('>')
    return { from, to, n }
  })
}
