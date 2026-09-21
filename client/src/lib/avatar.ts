/**
 * Procedural avatars — every user gets a unique, deterministic picture made
 * from their username (no upload needed). Users can switch style and reroll
 * the variant; the choice is stored in `users.avatar` as "gen:<style>:<n>".
 *
 * Pure functions: same (seed, style, variant) → same SVG, on every device.
 */

export const AVATAR_STYLES = ['sigil', 'orbit', 'bot', 'shard', 'pixel', 'rune'] as const
export type AvatarStyle = (typeof AVATAR_STYLES)[number]

export const AVATAR_STYLE_LABELS: Record<AvatarStyle, string> = {
  sigil: 'Sigil',
  orbit: 'Orbit',
  bot: 'Rift Bot',
  shard: 'Shard',
  pixel: 'Pixel',
  rune: 'Circuit Rune',
}

export interface AvatarSpec {
  style: AvatarStyle
  variant: number
}

/* ── deterministic randomness ─────────────────────────────────── */
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function rng(seed: number) {
  let a = seed || 1
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* Neon palettes that sit well on the dark Synthwave Rift theme. */
const PALETTES: [string, string, string][] = [
  ['#7c3aed', '#f43f5e', '#fde68a'],
  ['#22d3ee', '#7c3aed', '#e0f2fe'],
  ['#34d399', '#0ea5e9', '#ecfccb'],
  ['#f59e0b', '#ef4444', '#fff7ed'],
  ['#a78bfa', '#22d3ee', '#f5f3ff'],
  ['#ec4899', '#8b5cf6', '#fce7f3'],
  ['#14b8a6', '#6366f1', '#ccfbf1'],
  ['#facc15', '#f97316', '#1c1917'],
  ['#60a5fa', '#34d399', '#eff6ff'],
  ['#fb7185', '#fbbf24', '#1f1f2e'],
]

/** Legacy preset keys ("coder", "cat", …) map onto a style so old accounts get a sensible default. */
const LEGACY: Record<string, AvatarStyle> = {
  coder: 'sigil', hacker: 'rune', cat: 'pixel', bolt: 'shard', robot: 'bot', ninja: 'sigil', wizard: 'orbit',
}

export function parseAvatar(value: string | null | undefined, seed: string): AvatarSpec {
  const m = /^gen:([a-z]+):(\d{1,6})$/.exec(value ?? '')
  if (m && (AVATAR_STYLES as readonly string[]).includes(m[1])) {
    return { style: m[1] as AvatarStyle, variant: Number(m[2]) }
  }
  const legacy = value ? LEGACY[value] : undefined
  if (legacy) return { style: legacy, variant: 0 }
  return { style: AVATAR_STYLES[hash(seed) % AVATAR_STYLES.length], variant: 0 }
}

export const formatAvatar = (spec: AvatarSpec) => `gen:${spec.style}:${spec.variant}`

/* ── renderers (100×100 viewBox) ──────────────────────────────── */
type R = () => number
const pick = <T,>(r: R, arr: T[]) => arr[Math.floor(r() * arr.length)]

function defs(id: string, [a, b]: [string, string, string]) {
  return `<defs>
    <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <radialGradient id="r${id}" cx="0.5" cy="0.35" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.25"/><stop offset="1" stop-color="#000000" stop-opacity="0.25"/></radialGradient>
  </defs>`
}

function sigil(r: R, p: [string, string, string], id: string) {
  // 5×5 grid mirrored on the vertical axis (identicon-like), rounded cells
  let cells = ''
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (r() > 0.5) {
        const xs = x === 2 ? [2] : [x, 4 - x]
        for (const cx of xs) {
          cells += `<rect x="${17 + cx * 13.5}" y="${17 + y * 13.5}" width="12" height="12" rx="3" fill="${p[2]}" opacity="${0.75 + r() * 0.25}"/>`
        }
      }
    }
  }
  return `${defs(id, p)}<rect width="100" height="100" fill="url(#g${id})"/><rect width="100" height="100" fill="url(#r${id})"/>${cells}`
}

function orbit(r: R, p: [string, string, string], id: string) {
  const rings = 2 + Math.floor(r() * 2)
  let s = `${defs(id, p)}<rect width="100" height="100" fill="#0f0f1a"/><circle cx="50" cy="50" r="46" fill="url(#g${id})" opacity="0.35"/>`
  s += `<circle cx="50" cy="50" r="${12 + r() * 6}" fill="url(#g${id})"/><circle cx="50" cy="50" r="6" fill="${p[2]}" opacity="0.9"/>`
  for (let i = 0; i < rings; i++) {
    const rx = 22 + i * 10
    const ry = 8 + r() * 10
    const rot = Math.floor(r() * 180)
    s += `<ellipse cx="50" cy="50" rx="${rx}" ry="${ry}" fill="none" stroke="${p[2]}" stroke-opacity="0.55" stroke-width="1.6" transform="rotate(${rot} 50 50)"/>`
    const t = r() * Math.PI * 2
    const px = 50 + rx * Math.cos(t)
    const py = 50 + ry * Math.sin(t)
    s += `<circle cx="${px}" cy="${py}" r="${2.5 + r() * 2.5}" fill="${i % 2 ? p[0] : p[1]}" stroke="${p[2]}" stroke-width="1" transform="rotate(${rot} 50 50)"/>`
  }
  return s
}

function bot(r: R, p: [string, string, string], id: string) {
  const eye = pick(r, ['round', 'visor', 'slit'])
  const mouth = pick(r, ['grill', 'smile', 'line'])
  const ant = r() > 0.4
  let s = `${defs(id, p)}<rect width="100" height="100" fill="url(#g${id})"/><rect width="100" height="100" fill="url(#r${id})"/>`
  if (ant) s += `<line x1="50" y1="14" x2="50" y2="26" stroke="${p[2]}" stroke-width="3"/><circle cx="50" cy="12" r="4" fill="${p[2]}"/>`
  s += `<rect x="22" y="26" width="56" height="50" rx="12" fill="#0f0f1a" stroke="${p[2]}" stroke-width="3"/>`
  if (eye === 'round') s += `<circle cx="38" cy="46" r="6" fill="${p[2]}"/><circle cx="62" cy="46" r="6" fill="${p[2]}"/>`
  else if (eye === 'visor') s += `<rect x="30" y="40" width="40" height="11" rx="5.5" fill="${p[2]}"/><rect x="${34 + r() * 26}" y="42" width="6" height="7" rx="2" fill="#0f0f1a"/>`
  else s += `<rect x="31" y="44" width="14" height="4" rx="2" fill="${p[2]}"/><rect x="55" y="44" width="14" height="4" rx="2" fill="${p[2]}"/>`
  if (mouth === 'grill') s += [0, 1, 2, 3].map((i) => `<rect x="${35 + i * 8}" y="60" width="5" height="8" rx="1.5" fill="${p[2]}" opacity="0.8"/>`).join('')
  else if (mouth === 'smile') s += `<path d="M36 60 Q50 72 64 60" fill="none" stroke="${p[2]}" stroke-width="3.5" stroke-linecap="round"/>`
  else s += `<rect x="38" y="63" width="24" height="3.5" rx="1.75" fill="${p[2]}"/>`
  s += `<rect x="14" y="44" width="8" height="14" rx="3" fill="${p[2]}" opacity="0.7"/><rect x="78" y="44" width="8" height="14" rx="3" fill="${p[2]}" opacity="0.7"/>`
  return s
}

function shard(r: R, p: [string, string, string], id: string) {
  // Crystal made of triangular facets around the centre
  const n = 6 + Math.floor(r() * 4)
  const cx = 50, cy = 52
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    const rad = 26 + r() * 16
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]
  })
  let s = `${defs(id, p)}<rect width="100" height="100" fill="#0f0f1a"/><rect width="100" height="100" fill="url(#g${id})" opacity="0.25"/>`
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % n]
    const c = i % 3 === 0 ? p[0] : i % 3 === 1 ? p[1] : p[2]
    s += `<polygon points="${cx},${cy} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${c}" opacity="${0.55 + r() * 0.45}" stroke="#0f0f1a" stroke-width="1"/>`
  }
  s += `<circle cx="${cx}" cy="${cy}" r="4" fill="#ffffff" opacity="0.9"/>`
  return s
}

function pixel(r: R, p: [string, string, string], id: string) {
  // 8×8 pixel critter: mirrored body + eyes
  const grid: number[][] = Array.from({ length: 8 }, () => Array(8).fill(0))
  for (let y = 1; y < 8; y++) for (let x = 1; x < 4; x++) if (r() > 0.35 || (y > 2 && y < 6 && x > 1)) grid[y][x] = grid[y][7 - x] = 1
  grid[3][2] = grid[3][5] = 2
  let s = `${defs(id, p)}<rect width="100" height="100" fill="url(#g${id})"/><rect width="100" height="100" fill="url(#r${id})"/>`
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (!grid[y][x]) continue
      s += `<rect x="${14 + x * 9}" y="${12 + y * 9}" width="9" height="9" fill="${grid[y][x] === 2 ? '#0f0f1a' : p[2]}"/>`
    }
  }
  return s
}

function rune(r: R, p: [string, string, string], id: string) {
  // Circuit rune: ring + traces ending in nodes
  let s = `${defs(id, p)}<rect width="100" height="100" fill="#0f0f1a"/><circle cx="50" cy="50" r="40" fill="none" stroke="url(#g${id})" stroke-width="4"/>`
  const traces = 4 + Math.floor(r() * 4)
  for (let i = 0; i < traces; i++) {
    const a = (i / traces) * Math.PI * 2 + r() * 0.5
    const x1 = 50 + 12 * Math.cos(a), y1 = 50 + 12 * Math.sin(a)
    const mid = 20 + r() * 8
    const x2 = 50 + mid * Math.cos(a), y2 = 50 + mid * Math.sin(a)
    const turn = a + (r() > 0.5 ? 0.6 : -0.6)
    const x3 = x2 + 8 * Math.cos(turn), y3 = y2 + 8 * Math.sin(turn)
    s += `<polyline points="${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x3.toFixed(1)},${y3.toFixed(1)}" fill="none" stroke="${i % 2 ? p[0] : p[1]}" stroke-width="2.4" stroke-linecap="round"/>`
    s += `<circle cx="${x3.toFixed(1)}" cy="${y3.toFixed(1)}" r="2.8" fill="${p[2]}"/>`
  }
  s += `<circle cx="50" cy="50" r="9" fill="url(#g${id})"/><circle cx="50" cy="50" r="3.5" fill="${p[2]}"/>`
  return s
}

const RENDER: Record<AvatarStyle, (r: R, p: [string, string, string], id: string) => string> = {
  sigil, orbit, bot, shard, pixel, rune,
}

const cache = new Map<string, string>()

/** Returns an SVG data URL for the given seed/style/variant. */
export function avatarDataUrl(seed: string, spec: AvatarSpec): string {
  const key = `${seed}|${spec.style}|${spec.variant}`
  const hit = cache.get(key)
  if (hit) return hit
  const h = hash(`${seed.toLowerCase()}#${spec.style}#${spec.variant}`)
  const r = rng(h)
  const palette = PALETTES[h % PALETTES.length]
  const id = (h % 100000).toString(36)
  const body = RENDER[spec.style](r, palette, id)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  if (cache.size > 500) cache.clear()
  cache.set(key, url)
  return url
}
