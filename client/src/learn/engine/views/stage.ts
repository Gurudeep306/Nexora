import { createContext, useContext } from 'react'
import type { Role, Structure } from '../types'

/**
 * What every view needs from the player besides its own state: how wide the
 * stage is (arrays shrink their cells to fit a phone), the structure as it
 * was one frame earlier (so a moved value can hop instead of slide through
 * its neighbours) and the frame number (to retrigger one-shot animations).
 */
export interface StageInfo {
  width: number
  prev: Map<string, Structure>
  tick: number
}

export const StageContext = createContext<StageInfo>({ width: 900, prev: new Map(), tick: 0 })
export const useStage = () => useContext(StageContext)

export const ROLE_LABEL: Record<Role, string> = {
  active: 'current',
  compare: 'comparing',
  swap: 'moving',
  write: 'written',
  found: 'found',
  done: 'final',
  window: 'in range',
  pivot: 'pivot',
  best: 'best so far',
  removed: 'removed',
  new: 'new',
  dim: 'out of play',
}

/** Pointer colours: the same name always gets the same colour. */
const PTR_HUES = [255, 340, 150, 40, 200, 290]
const FIXED: Record<string, number> = { i: 0, lo: 0, l: 0, slow: 0, w: 0, write: 0, left: 0, j: 1, hi: 1, r: 1, fast: 1, read: 1, right: 1, rd: 1, k: 2, mid: 2, m: 2, best: 3, end: 3 }
export function ptrHue(name: string) {
  const base = name.replace(/[^a-z]/gi, '').toLowerCase()
  if (base in FIXED) return PTR_HUES[FIXED[base]]
  let h = 0
  for (const ch of base) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PTR_HUES[h % PTR_HUES.length]
}

/** Roles present anywhere in a frame, for the legend. */
export function rolesIn(structures: Structure[]): Role[] {
  const seen = new Set<Role>()
  for (const s of structures) {
    if (s.kind === 'array') {
      Object.values(s.roles ?? {}).forEach((r) => seen.add(r))
      ;(s.ranges ?? []).forEach((r) => seen.add(r.role))
    } else if (s.kind === 'stack' || s.kind === 'queue' || s.kind === 'grid' || s.kind === 'hash') Object.values(s.roles ?? {}).forEach((r) => seen.add(r))
    else if (s.kind === 'list') [...Object.values(s.roles ?? {}), ...Object.values(s.linkRoles ?? {})].forEach((r) => seen.add(r))
    else if (s.kind === 'tree' || s.kind === 'graph') [...Object.values(s.roles ?? {}), ...Object.values(s.edgeRoles ?? {})].forEach((r) => seen.add(r))
    else if (s.kind === 'meter' && s.role) seen.add(s.role)
  }
  const order: Role[] = ['active', 'compare', 'swap', 'write', 'new', 'window', 'best', 'pivot', 'found', 'done', 'removed', 'dim']
  return order.filter((r) => seen.has(r))
}
