import type { NexusResponse, NexusWebStructure, RiftPlayer, SubjectRank } from './types'

/*
 * The subject page's model before the full response: pure functions (no
 * imports but types), so they are tested directly. See subjectTree.ts.
 */

export interface SubjectTree {
  version: string
  subject: { id: string; name: string; short: string; stream?: string; engine: string | null; description?: string; gate?: { pyq: string | null; notes: string | null } }
  zones: { level: number; name: string; color: string; rows: number; xpRequired?: number; probsRequired?: number; glow?: string }[]
  nodes: { id: string; name: string; zone: number; icon: string; requires: string[]; x: number; row: number; xp: number; kind?: string; optional?: boolean }[]
}

/** zone: [done, count, progress, flags(1 locked, 2 current, 4 completed)]; node: [progress, state, count label, …]. */
export interface SubjectProgress {
  version: string
  zones: [number, number, number, number][]
  nodes: [number, 0 | 1 | 2, string, ...unknown[]][]
  rank: SubjectRank | null
  player: RiftPlayer | null
}

/* ── the tree from the cached structure (synchronous) ── */
export function treeFromStructure(st: NexusWebStructure | null, subject: string): SubjectTree | null {
  const c = st?.clusters.find((x) => x.id === subject)
  if (!st || !c || c.nodes.some((n) => n.x == null)) return null
  const nodes = c.nodes.map((n) => ({ id: n.id, name: n.n, zone: n.z, icon: n.i ?? '', requires: n.req, x: n.x ?? 50, row: n.r ?? 0, xp: n.xp, ...(n.k ? { kind: n.k } : {}), ...(n.o ? { optional: true } : {}) }))
  return {
    version: st.version,
    subject: { id: c.id, name: c.name, short: c.short, stream: c.stream, engine: c.engine, description: c.description, ...(c.gate ? { gate: c.gate } : {}) },
    zones: c.zones.map((z) => ({ level: z.level, name: z.name, color: z.color, rows: Math.max(1, ...nodes.filter((n) => n.zone === z.level).map((n) => n.row + 1)) })),
    nodes,
  }
}

const FALLBACK_PLAYER: RiftPlayer = {
  level: 1,
  xp: 0,
  name: 'Novice',
  badge: '',
  color: 'var(--color-primary)',
  glow: 'transparent',
  xpInLevel: 0,
  xpForNext: 1,
  probsInLevel: 0,
  probsForNext: 1,
  xpGated: false,
  probGated: false,
}

/**
 * The subject page's model from the tree and (maybe) the reader's numbers:
 * enough to draw the whole tree with its rings; lesson metrics, review
 * memory and cross links arrive with the full response.
 */
export function quickNexus(tree: SubjectTree, prog: SubjectProgress | null): NexusResponse {
  const ok = !!prog && prog.version === tree.version && prog.nodes.length === tree.nodes.length
  const dsa = tree.subject.engine === 'dsa'
  const nodes = tree.nodes.map((n, i) => {
    const t = ok ? prog!.nodes[i] : null
    const s = t ? t[1] : n.requires.length ? 0 : 1
    const [solved, target] = dsa && t ? String(t[2]).split('/').map(Number) : [0, 0]
    return {
      id: n.id,
      subject: tree.subject.id,
      kind: n.kind ?? 'concept',
      optional: n.optional,
      row: n.row,
      zone: n.zone,
      name: n.name,
      icon: n.icon,
      desc: '',
      tags: [],
      requires: n.requires,
      target: target || 0,
      x: n.x,
      y: 0,
      difficulty: [0, 0] as [number, number],
      xpReward: n.xp,
      resources: [],
      solved: solved || 0,
      progress: t ? t[0] : 0,
      unlocked: s >= 1,
      completed: s === 2,
    }
  })
  const zones = tree.zones.map((z, i) => {
    const t = ok ? prog!.zones[i] : null
    const zn = nodes.filter((n) => n.zone === z.level)
    const done = t ? t[0] : zn.filter((n) => n.completed).length
    const flags = t ? t[3] : i === 0 ? 2 : 1
    return {
      level: z.level,
      name: z.name,
      color: z.color,
      glow: z.glow ?? 'transparent',
      xpRequired: z.xpRequired ?? 0,
      probsRequired: z.probsRequired ?? 0,
      minR: 0,
      maxR: 0,
      unlocked: !(flags & 1),
      locked: !!(flags & 1),
      completed: !!(flags & 4),
      current: !!(flags & 2),
      nodeCount: t ? t[1] : zn.length,
      nodesCompleted: done,
      zoneProgress: t ? t[2] : 0,
      rows: z.rows,
    }
  })
  return {
    ok: true,
    nodes,
    zones,
    player: prog?.player ?? FALLBACK_PLAYER,
    riftLevels: [],
    subject: {
      id: tree.subject.id,
      name: tree.subject.name,
      short: tree.subject.short,
      group: '',
      order: 0,
      icon: '',
      color: '',
      description: tree.subject.description ?? '',
      engine: tree.subject.engine,
      pyqSubject: tree.subject.gate?.pyq ?? null,
      notesSubject: tree.subject.gate?.notes ?? null,
    },
    ...(prog?.rank ? { subjectRank: prog.rank } : {}),
  }
}
