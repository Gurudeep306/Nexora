/**
 * The NexoraGuru mark — "Traversal".
 *
 * N and G are one graph on a 32-unit grid. Read as an algorithm: a search
 * starts at the source node (bottom-left of the N), climbs, crosses the
 * diagonal to the junction, and there the frontier splits — one branch climbs
 * the shared stem and runs along the G's top, the other runs along the G's
 * bowl and turns in to its spur. Four nodes mark the source, the junction and
 * the two leaves.
 *
 * Single source of truth for the geometry: the React logo (Logo.tsx), the
 * lazy-loaded motion (traversalFx.ts), the animated favicon (lib/faviconFx.ts)
 * and the static asset exports (scripts/brand/build-brand.mjs, which imports
 * this file directly) all draw from here. Keep it dependency-free.
 */

export type Pt = readonly [number, number]

export const NODES = {
  A: [7, 25], // source
  B: [7, 7],
  C: [15, 25], // junction: N's diagonal meets the shared stem
  D: [15, 7],
  E: [25, 7], // leaf: the G's top terminal
  F: [25, 25],
  H: [25, 17],
  I: [20, 17], // leaf: the G's spur
} as const satisfies Record<string, Pt>

export type NodeId = keyof typeof NODES

/** BFS tree edges, in visiting order. */
export const EDGES: readonly (readonly [NodeId, NodeId])[] = [
  ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['C', 'F'], ['F', 'H'], ['H', 'I'],
]
/** The two root-to-leaf routes the signal follows. */
export const ROUTES: readonly (readonly NodeId[])[] = [
  ['A', 'B', 'C', 'D', 'E'],
  ['A', 'B', 'C', 'F', 'H', 'I'],
]
export const BEADS: readonly NodeId[] = ['A', 'C', 'E', 'I']

/** The whole glyph as one path (for the static mark and the favicon canvas). */
export const GLYPH_D = 'M7 25V7L15 25V7H25M15 25H25V17H20'

/** Stroke weight and node radius; small renders (≤ 24 px) get a heavier cut. */
export const weights = (small: boolean) => (small ? { stroke: 3.3, bead: 2.45 } : { stroke: 2.6, bead: 2.15 })

/** Distance from the source along the BFS tree, per node. */
export const DIST: Record<NodeId, number> = (() => {
  const d = { A: 0 } as Record<NodeId, number>
  for (const route of ROUTES) {
    for (let i = 1; i < route.length; i++) {
      const p = NODES[route[i - 1]], q = NODES[route[i]]
      d[route[i]] = d[route[i - 1]] + Math.hypot(q[0] - p[0], q[1] - p[1])
    }
  }
  return d
})()

/**
 * Legacy three-colour ramp (blue → violet → teal). The current mark is one
 * colour (see markSvg below); this stays only for code that still reads it.
 */
export const RAMP = {
  dark: ['#5b8cff', '#9b6bff', '#2dd4bf'],
  light: ['#2f5bea', '#7c3aed', '#0d9488'],
  neutral: ['#4f7cff', '#8b5cf6', '#14b8a6'],
} as const

export interface TraversalSvgOptions {
  /** Unique prefix for gradient ids. */
  id: string
  /** Heavier strokes for ≤ 24 px. */
  small?: boolean
  /** Three stop colours (CSS values — `var(--x)` works for inline SVG). */
  colors?: readonly [string, string, string] | readonly string[]
  /** Dark rounded tile behind the glyph ('bleed' = full-square, for app icons). */
  tile?: false | 'rounded' | 'bleed'
  /** Scale of the glyph inside the 32-unit frame (maskable icons need ~0.72). */
  scale?: number
  /** width/height attributes (omit for a fluid SVG). */
  size?: number
  title?: string
}

/** The static mark as an SVG string. */
export function traversalSvg(o: TraversalSvgOptions): string {
  const { id, small = false, colors = RAMP.neutral, tile = false, scale = 1, size, title } = o
  const w = weights(small)
  const g = `${id}g`
  const stop = (off: string, c: string) =>
    c.startsWith('var(') ? `<stop offset="${off}" style="stop-color:${c}"/>` : `<stop offset="${off}" stop-color="${c}"/>`
  const tileDefs = tile
    ? `<linearGradient id="${id}t" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#171b36"/><stop offset=".6" stop-color="#0d0f1f"/><stop offset="1" stop-color="#08090f"/></linearGradient>` +
      `<radialGradient id="${id}h" cx=".3" cy="0" r=".9"><stop offset="0" stop-color="#5b8cff" stop-opacity=".22"/><stop offset="1" stop-color="#5b8cff" stop-opacity="0"/></radialGradient>`
    : ''
  const tileBody = !tile
    ? ''
    : tile === 'bleed'
      ? `<rect width="32" height="32" fill="url(#${id}t)"/><rect width="32" height="32" fill="url(#${id}h)"/>`
      : `<rect width="32" height="32" rx="7.2" fill="url(#${id}t)"/><rect width="32" height="32" rx="7.2" fill="url(#${id}h)"/>` +
        `<rect x=".5" y=".5" width="31" height="31" rx="6.7" fill="none" stroke="#fff" stroke-opacity=".09"/>`
  const k = scale
  const tr = k === 1 ? '' : ` transform="translate(${+(16 - 16 * k).toFixed(3)} ${+(16 - 16 * k).toFixed(3)}) scale(${k})"`
  const beads = BEADS.map((n) => `<circle cx="${NODES[n][0]}" cy="${NODES[n][1]}" r="${w.bead}"/>`).join('')
  const dims = size ? ` width="${size}" height="${size}"` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${dims} aria-hidden="true" focusable="false">` +
    (title ? `<title>${title}</title>` : '') +
    `<defs><linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="5" y1="27" x2="27" y2="5">` +
    stop('0', colors[0]) + stop('.55', colors[1]) + stop('1', colors[2]) +
    `</linearGradient>${tileDefs}</defs>${tileBody}` +
    `<g${tr}><path d="${GLYPH_D}" fill="none" stroke="url(#${g})" stroke-width="${w.stroke}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<g fill="url(#${g})">${beads}</g></g></svg>`
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   The mark (2026): one solid tile with the NG graph cut out of it.

   One colour, no gradient, no beads: a mass that reads at any size and on any
   ground, like an app icon. The tile takes the text colour (near-black on
   light, near-white on dark), so the brand follows every theme. Below ~18 px
   the G closes up, so tiny renders (the favicon) cut out the N alone.
   ══════════════════════════════════════════════════════════════════════════ */

export const TILE_R = 7.5
/** Glyph scale inside the tile (the graph keeps a generous margin). */
export const MARK_SCALE = 0.62
/** Cut width in glyph units (before MARK_SCALE); small renders cut heavier. */
export const markStroke = (small: boolean) => (small ? 4.6 : 3.8)
/** The N alone, already in tile coordinates, for ≤ 18 px. */
export const N_ONLY_D = 'M11 22V10L21 22V10'
export const N_ONLY_STROKE = 3.6

export interface MarkSvgOptions {
  /** Unique prefix for the mask id. */
  id: string
  size?: number
  /** Tile colour (default currentColor, so it follows the text colour). */
  ink?: string
  /** Draw the glyph in this colour instead of cutting it out (for flat exports on a known ground). */
  glyph?: string
  /** ≤ 18 px: the N alone. */
  tiny?: boolean
  /** ≤ 24 px: a heavier cut. */
  small?: boolean
  /** 'bleed' fills the whole square (app icons; the OS rounds it). */
  shape?: 'rounded' | 'bleed'
  /** Extra glyph scale (maskable icons keep it in the safe zone). */
  inset?: number
  title?: string
}

export function markSvg(o: MarkSvgOptions): string {
  const { id, size, ink = 'currentColor', glyph, tiny = false, small = false, shape = 'rounded', inset = 1, title } = o
  const dims = size ? ` width="${size}" height="${size}"` : ''
  const rx = shape === 'bleed' ? 0 : TILE_R
  const k = (tiny ? 1 : MARK_SCALE) * inset
  const tr = `translate(16 16) scale(${+k.toFixed(4)}) translate(-16 -16)`
  const d = tiny ? N_ONLY_D : GLYPH_D
  const sw = tiny ? N_ONLY_STROKE : markStroke(small)
  const cut = (color: string) => `<path d="${d}" transform="${tr}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${dims} aria-hidden="true" focusable="false">` + (title ? `<title>${title}</title>` : '')
  if (glyph) return `${head}<rect width="32" height="32" rx="${rx}" fill="${ink}"/>${cut(glyph)}</svg>`
  return (
    `${head}<defs><mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32"><rect width="32" height="32" rx="${rx}" fill="#fff"/>${cut('#000')}</mask></defs>` +
    `<rect width="32" height="32" rx="${rx}" fill="${ink}" mask="url(#${id}m)"/></svg>`
  )
}
