/**
 * Procedural avatars — every user gets a unique, deterministic picture made
 * from their username (no upload needed). Four signature styles (Buddy, a
 * little character; Aura, a soft gradient; Bauhaus, bold geometry; Planet, a
 * small world) plus the earlier six, all coloured from harmonious OKLCH
 * palettes generated per user. Users can switch style and reroll
 * the variant; the choice is stored in `users.avatar` as "gen:<style>:<n>".
 *
 * Pure functions: same (seed, style, variant) → same SVG, on every device.
 */

export const AVATAR_STYLES = ['buddy', 'aura', 'bauhaus', 'planet', 'bot', 'orbit', 'pixel', 'sigil', 'shard', 'rune'] as const
export type AvatarStyle = (typeof AVATAR_STYLES)[number]

export const AVATAR_STYLE_LABELS: Record<AvatarStyle, string> = {
  buddy: 'Buddy',
  aura: 'Aura',
  bauhaus: 'Bauhaus',
  planet: 'Planet',
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

/* ── colour ─────────────────────────────────────────────────────────
   Palettes are generated in OKLCH from a hue picked by the hash, so every
   user gets harmonious colours (analogous, split-complementary or triadic)
   with even lightness, instead of one of ten fixed neon trios. */
function oklchHex(l: number, c: number, h: number): string {
  const hr = (h * Math.PI) / 180
  const A = c * Math.cos(hr)
  const B = c * Math.sin(hr)
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
  return (
    '#' +
    lin
      .map((v) => {
        const x = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055
        return Math.round(Math.min(1, Math.max(0, x)) * 255)
          .toString(16)
          .padStart(2, '0')
      })
      .join('')
  )
}

interface Pal {
  /** hues: base, second, third */
  h: [number, number, number]
  c: (l: number, chroma: number, which?: 0 | 1 | 2, shift?: number) => string
}

function palette(r: () => number): Pal {
  const h0 = r() * 360
  const scheme = Math.floor(r() * 3)
  const offs: [number, number][] = [
    [38, 76], // analogous
    [150, 210], // split complementary
    [120, 240], // triadic
  ]
  const [o1, o2] = offs[scheme]
  const h: [number, number, number] = [h0, (h0 + o1) % 360, (h0 + o2) % 360]
  return { h, c: (l, chroma, which = 0, shift = 0) => oklchHex(l, chroma, (h[which] + shift + 360) % 360) }
}

/** The legacy renderers take a [primary, secondary, light] trio. */
function trio(p: Pal): [string, string, string] {
  return [p.c(0.6, 0.2, 0), p.c(0.64, 0.19, 1), p.c(0.96, 0.035, 0)]
}

/** Legacy preset keys ("coder", "cat", …) map onto a style so old accounts get a sensible default. */
const LEGACY: Record<string, AvatarStyle> = {
  coder: 'buddy', hacker: 'bot', cat: 'buddy', bolt: 'aura', robot: 'bot', ninja: 'buddy', wizard: 'planet',
}

export function parseAvatar(value: string | null | undefined, seed: string): AvatarSpec {
  const m = /^gen:([a-z]+):(\d{1,6})$/.exec(value ?? '')
  if (m && (AVATAR_STYLES as readonly string[]).includes(m[1])) {
    return { style: m[1] as AvatarStyle, variant: Number(m[2]) }
  }
  const legacy = value ? LEGACY[value] : undefined
  if (legacy) return { style: legacy, variant: 0 }
  // No choice saved yet: one of the four signature styles, picked by name.
  const defaults: AvatarStyle[] = ['buddy', 'aura', 'bauhaus', 'planet']
  return { style: defaults[hash(seed) % defaults.length], variant: 0 }
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


/* ── Buddy: a friendly character, a little different for everyone ───── */
function buddy(r: R, P: Pal, id: string) {
  const bg = P.c(0.86, 0.07, 1)
  const bg2 = P.c(0.78, 0.1, 2)
  const skin = P.c(0.74, 0.14, 0)
  const skinDark = P.c(0.6, 0.15, 0)
  const ink = '#1b1530'
  const accent = P.c(0.62, 0.2, 2)
  const cx = 50
  const cy = 58
  let s = `<defs>
    <linearGradient id="b${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <radialGradient id="h${id}" cx="0.38" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs><rect width="100" height="100" fill="url(#b${id})"/>`

  // Behind the head: some hairstyles and ears.
  const top = pick(r, ['none', 'tuft', 'sprout', 'beanie', 'headphones', 'spikes', 'bun', 'antenna', 'cap'])
  if (top === 'bun') s += `<circle cx="${cx}" cy="${cy - 33}" r="9" fill="${skinDark}"/>`
  const ears = r() > 0.6
  if (ears) s += `<circle cx="${cx - 27}" cy="${cy - 18}" r="8" fill="${skin}"/><circle cx="${cx + 27}" cy="${cy - 18}" r="8" fill="${skin}"/><circle cx="${cx - 27}" cy="${cy - 18}" r="4" fill="${skinDark}" opacity="0.45"/><circle cx="${cx + 27}" cy="${cy - 18}" r="4" fill="${skinDark}" opacity="0.45"/>`

  // Head + body
  const shape = pick(r, ['round', 'squircle', 'egg'])
  s += `<path d="M20 100 C22 84 34 78 50 78 C66 78 78 84 80 100 Z" fill="${skinDark}"/>`
  if (shape === 'round') s += `<circle cx="${cx}" cy="${cy}" r="27" fill="${skin}"/>`
  else if (shape === 'squircle') s += `<rect x="${cx - 27}" y="${cy - 26}" width="54" height="52" rx="21" fill="${skin}"/>`
  else s += `<ellipse cx="${cx}" cy="${cy}" rx="25" ry="28" fill="${skin}"/>`
  s += `<ellipse cx="${cx}" cy="${cy - 2}" rx="27" ry="27" fill="url(#h${id})"/>`

  // Eyes
  const ey = cy - 3
  const dx = 10 + r() * 2
  const eyes = pick(r, ['dots', 'shine', 'happy', 'wink', 'sleepy', 'glasses', 'visor', 'stars'])
  const dot = (x: number, rr = 3.6) => `<circle cx="${x}" cy="${ey}" r="${rr}" fill="${ink}"/>`
  if (eyes === 'dots') s += dot(cx - dx) + dot(cx + dx)
  else if (eyes === 'shine')
    s += [cx - dx, cx + dx]
      .map((x) => `<ellipse cx="${x}" cy="${ey}" rx="4.6" ry="5.6" fill="${ink}"/><circle cx="${x + 1.6}" cy="${ey - 2}" r="1.7" fill="#fff"/>`)
      .join('')
  else if (eyes === 'happy')
    s += [cx - dx, cx + dx].map((x) => `<path d="M${x - 4.5} ${ey + 1.5} Q${x} ${ey - 5} ${x + 4.5} ${ey + 1.5}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`).join('')
  else if (eyes === 'wink')
    s += dot(cx - dx) + `<path d="M${cx + dx - 4.5} ${ey} L${cx + dx + 4.5} ${ey}" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`
  else if (eyes === 'sleepy')
    s += [cx - dx, cx + dx].map((x) => `<path d="M${x - 4.5} ${ey - 1} Q${x} ${ey + 4} ${x + 4.5} ${ey - 1}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`).join('')
  else if (eyes === 'glasses')
    s += dot(cx - dx, 3) + dot(cx + dx, 3) + [cx - dx, cx + dx].map((x) => `<circle cx="${x}" cy="${ey}" r="7.5" fill="#fff" fill-opacity="0.25" stroke="${ink}" stroke-width="2.2"/>`).join('') + `<path d="M${cx - dx + 7.5} ${ey} L${cx + dx - 7.5} ${ey}" stroke="${ink}" stroke-width="2.2"/>`
  else if (eyes === 'visor')
    s += `<rect x="${cx - 21}" y="${ey - 6}" width="42" height="12" rx="6" fill="${ink}"/><rect x="${cx - 17}" y="${ey - 3}" width="${10 + r() * 14}" height="3" rx="1.5" fill="${accent}"/>`
  else
    s += [cx - dx, cx + dx].map((x) => `<path d="M${x} ${ey - 5} L${x + 1.6} ${ey - 1.4} L${x + 5} ${ey} L${x + 1.6} ${ey + 1.4} L${x} ${ey + 5} L${x - 1.6} ${ey + 1.4} L${x - 5} ${ey} L${x - 1.6} ${ey - 1.4} Z" fill="${ink}"/>`).join('')

  // Cheeks
  if (r() > 0.35) s += `<ellipse cx="${cx - dx - 5}" cy="${ey + 9}" rx="4.5" ry="3" fill="${P.c(0.7, 0.16, 0, -25)}" opacity="0.55"/><ellipse cx="${cx + dx + 5}" cy="${ey + 9}" rx="4.5" ry="3" fill="${P.c(0.7, 0.16, 0, -25)}" opacity="0.55"/>`

  // Mouth
  const my = cy + 11
  const mouth = pick(r, ['smile', 'grin', 'o', 'cat', 'flat', 'tongue', 'smirk'])
  if (mouth === 'smile') s += `<path d="M${cx - 7} ${my - 1} Q${cx} ${my + 6} ${cx + 7} ${my - 1}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`
  else if (mouth === 'grin') s += `<path d="M${cx - 9} ${my - 2} Q${cx} ${my + 11} ${cx + 9} ${my - 2} Z" fill="${ink}"/><path d="M${cx - 6} ${my - 1} L${cx + 6} ${my - 1}" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`
  else if (mouth === 'o') s += `<ellipse cx="${cx}" cy="${my + 1}" rx="3.6" ry="4.4" fill="${ink}"/>`
  else if (mouth === 'cat') s += `<path d="M${cx - 7} ${my} Q${cx - 3.5} ${my + 4} ${cx} ${my} Q${cx + 3.5} ${my + 4} ${cx + 7} ${my}" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`
  else if (mouth === 'flat') s += `<path d="M${cx - 6} ${my + 1} L${cx + 6} ${my + 1}" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`
  else if (mouth === 'tongue') s += `<path d="M${cx - 8} ${my - 1} Q${cx} ${my + 9} ${cx + 8} ${my - 1} Z" fill="${ink}"/><ellipse cx="${cx}" cy="${my + 4}" rx="3.6" ry="2.6" fill="${P.c(0.68, 0.18, 0, -30)}"/>`
  else s += `<path d="M${cx - 6} ${my + 1} Q${cx + 2} ${my + 4} ${cx + 8} ${my - 2}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`

  // On top of the head
  const hair = P.c(0.42, 0.12, 2)
  if (top === 'tuft') s += `<path d="M${cx - 6} ${cy - 25} Q${cx - 2} ${cy - 40} ${cx + 4} ${cy - 30} Q${cx + 8} ${cy - 40} ${cx + 10} ${cy - 24}" fill="${hair}"/>`
  else if (top === 'sprout') s += `<path d="M${cx} ${cy - 27} L${cx} ${cy - 36}" stroke="${oklchHex(0.55, 0.12, 140)}" stroke-width="2.4" stroke-linecap="round"/><path d="M${cx} ${cy - 35} Q${cx - 12} ${cy - 44} ${cx - 13} ${cy - 34} Q${cx - 5} ${cy - 31} ${cx} ${cy - 35} Z" fill="${oklchHex(0.72, 0.17, 140)}"/><path d="M${cx} ${cy - 37} Q${cx + 11} ${cy - 47} ${cx + 13} ${cy - 37} Q${cx + 5} ${cy - 32} ${cx} ${cy - 37} Z" fill="${oklchHex(0.66, 0.17, 145)}"/>`
  else if (top === 'beanie') s += `<path d="M${cx - 27} ${cy - 10} C${cx - 27} ${cy - 44} ${cx + 27} ${cy - 44} ${cx + 27} ${cy - 10} Z" fill="${accent}"/><rect x="${cx - 29}" y="${cy - 15}" width="58" height="9" rx="4.5" fill="${P.c(0.52, 0.18, 2)}"/><circle cx="${cx}" cy="${cy - 38}" r="5.5" fill="${P.c(0.92, 0.04, 2)}"/>`
  else if (top === 'headphones') s += `<path d="M${cx - 29} ${cy - 2} C${cx - 31} ${cy - 44} ${cx + 31} ${cy - 44} ${cx + 29} ${cy - 2}" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/><rect x="${cx - 35}" y="${cy - 10}" width="12" height="20" rx="6" fill="${accent}"/><rect x="${cx + 23}" y="${cy - 10}" width="12" height="20" rx="6" fill="${accent}"/>`
  else if (top === 'spikes') s += `<path d="M${cx - 22} ${cy - 16} L${cx - 17} ${cy - 36} L${cx - 8} ${cy - 24} L${cx} ${cy - 42} L${cx + 8} ${cy - 24} L${cx + 17} ${cy - 36} L${cx + 22} ${cy - 16} Z" fill="${hair}"/>`
  else if (top === 'bun') s += `<path d="M${cx - 24} ${cy - 12} C${cx - 20} ${cy - 32} ${cx + 20} ${cy - 32} ${cx + 24} ${cy - 12} C${cx + 10} ${cy - 20} ${cx - 10} ${cy - 20} ${cx - 24} ${cy - 12} Z" fill="${skinDark}"/>`
  else if (top === 'antenna') s += `<path d="M${cx} ${cy - 27} L${cx} ${cy - 40}" stroke="${ink}" stroke-width="2.4"/><circle cx="${cx}" cy="${cy - 42}" r="4.5" fill="${accent}"/>`
  else if (top === 'cap') s += `<path d="M${cx - 26} ${cy - 12} C${cx - 26} ${cy - 40} ${cx + 26} ${cy - 40} ${cx + 26} ${cy - 12} Z" fill="${accent}"/><path d="M${cx - 2} ${cy - 13} L${cx + 36} ${cy - 13} Q${cx + 36} ${cy - 6} ${cx + 26} ${cy - 6} L${cx - 2} ${cy - 6} Z" fill="${P.c(0.5, 0.18, 2)}"/>`
  return s
}

/* ── Aura: a soft mesh of light, like a macOS gradient wallpaper ───── */
function aura(r: R, P: Pal, id: string) {
  let s = `<defs><filter id="f${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${13 + r() * 5}"/></filter>
    <radialGradient id="s${id}" cx="0.3" cy="0.25" r="0.7"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`
  s += `<rect width="100" height="100" fill="${P.c(P.h[0] > 70 && P.h[0] < 125 ? 0.78 : 0.55, 0.15, 0)}"/><g filter="url(#f${id})">`
  const blobs = 4 + Math.floor(r() * 2)
  for (let i = 0; i < blobs; i++) {
    const which = (i % 3) as 0 | 1 | 2
    // Yellows turn olive at mid lightness, so they are kept bright.
    const hue = (P.h[which] + 360) % 360
    const l = hue > 70 && hue < 125 ? 0.82 + r() * 0.1 : 0.58 + r() * 0.3
    s += `<circle cx="${(r() * 100).toFixed(1)}" cy="${(r() * 100).toFixed(1)}" r="${(24 + r() * 22).toFixed(1)}" fill="${P.c(l, 0.12 + r() * 0.1, which, (r() - 0.5) * 30)}"/>`
  }
  s += `</g><rect width="100" height="100" fill="url(#s${id})"/>`
  return s
}

/* ── Bauhaus: bold geometry on a 2×2 grid ─────────────────────────── */
function bauhaus(r: R, P: Pal) {
  const cols = [P.c(0.62, 0.19, 0), P.c(0.8, 0.14, 1), P.c(0.45, 0.14, 2), P.c(0.95, 0.03, 1), '#1d1a2b']
  const bg = P.c(0.93, 0.035, 0)
  let s = `<rect width="100" height="100" fill="${bg}"/>`
  const cells: [number, number][] = [[0, 0], [50, 0], [0, 50], [50, 50]]
  for (const [x, y] of cells) {
    const c = pick(r, cols)
    const c2 = pick(r, cols.filter((k) => k !== c))
    const kind = pick(r, ['quarter', 'half', 'circle', 'tri', 'square', 'stripes', 'ring'])
    const rot = Math.floor(r() * 4) * 90
    const t = `transform="rotate(${rot} ${x + 25} ${y + 25})"`
    s += `<rect x="${x}" y="${y}" width="50" height="50" fill="${c2}"/>`
    if (kind === 'quarter') s += `<path d="M${x} ${y} L${x + 50} ${y} A50 50 0 0 1 ${x} ${y + 50} Z" fill="${c}" ${t}/>`
    else if (kind === 'half') s += `<path d="M${x} ${y + 25} A25 25 0 0 1 ${x + 50} ${y + 25} Z" fill="${c}" ${t}/>`
    else if (kind === 'circle') s += `<circle cx="${x + 25}" cy="${y + 25}" r="${14 + r() * 8}" fill="${c}"/>`
    else if (kind === 'tri') s += `<path d="M${x} ${y + 50} L${x + 50} ${y + 50} L${x} ${y} Z" fill="${c}" ${t}/>`
    else if (kind === 'square') s += `<rect x="${x + 12}" y="${y + 12}" width="26" height="26" fill="${c}" ${t}/>`
    else if (kind === 'stripes') s += [0, 1, 2].map((k) => `<rect x="${x}" y="${y + 6 + k * 15}" width="50" height="7" fill="${c}" ${t}/>`).join('')
    else s += `<circle cx="${x + 25}" cy="${y + 25}" r="16" fill="none" stroke="${c}" stroke-width="9"/>`
  }
  return s
}

/* ── Planet: a small world with rings and moons ───────────────────── */
function planet(r: R, P: Pal, id: string) {
  const sky1 = P.c(0.2, 0.06, 1)
  const sky2 = P.c(0.12, 0.04, 2)
  const a = P.c(0.72, 0.16, 0)
  const b = P.c(0.5, 0.17, 1)
  const tilt = -20 + r() * 40
  const R0 = 21 + r() * 6
  let s = `<defs>
    <radialGradient id="k${id}" cx="0.5" cy="0.4" r="0.8"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></radialGradient>
    <radialGradient id="p${id}" cx="0.35" cy="0.3" r="0.85"><stop offset="0" stop-color="${a}"/><stop offset="0.7" stop-color="${b}"/><stop offset="1" stop-color="${P.c(0.32, 0.12, 1)}"/></radialGradient>
    <clipPath id="c${id}"><circle cx="50" cy="52" r="${R0}"/></clipPath>
  </defs><rect width="100" height="100" fill="url(#k${id})"/>`
  for (let i = 0; i < 14; i++) s += `<circle cx="${(r() * 100).toFixed(1)}" cy="${(r() * 100).toFixed(1)}" r="${(0.4 + r() * 0.9).toFixed(2)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`
  const ring = r() > 0.25
  const rc = P.c(0.85, 0.09, 2)
  // back half of the ring
  if (ring) s += `<g transform="rotate(${tilt} 50 52)"><path d="M${50 - R0 - 14} 52 A${R0 + 14} ${6 + r() * 3} 0 0 1 ${50 + R0 + 14} 52" fill="none" stroke="${rc}" stroke-opacity="0.55" stroke-width="3"/></g>`
  s += `<circle cx="50" cy="52" r="${R0}" fill="url(#p${id})"/>`
  // bands
  s += `<g clip-path="url(#c${id})" opacity="0.35">`
  for (let i = 0; i < 3; i++) s += `<ellipse cx="50" cy="${40 + i * 10 + r() * 6}" rx="${R0 + 6}" ry="${1.6 + r() * 2.4}" fill="${i % 2 ? '#fff' : P.c(0.4, 0.15, 1)}" transform="rotate(${tilt / 2} 50 52)"/>`
  s += `</g>`
  // front half of the ring
  if (ring) s += `<g transform="rotate(${tilt} 50 52)"><path d="M${50 - R0 - 14} 52 A${R0 + 14} 8 0 0 0 ${50 + R0 + 14} 52" fill="none" stroke="${rc}" stroke-width="3" stroke-linecap="round"/></g>`
  // a moon
  const ma = r() * Math.PI * 2
  s += `<circle cx="${(50 + Math.cos(ma) * 38).toFixed(1)}" cy="${(52 + Math.sin(ma) * 34).toFixed(1)}" r="${(3 + r() * 2.5).toFixed(1)}" fill="${P.c(0.9, 0.03, 2)}"/>`
  return s
}

type Legacy = (r: R, p: [string, string, string], id: string) => string
const legacy = (f: Legacy) => (r: R, P: Pal, id: string) => f(r, trio(P), id)

const RENDER: Record<AvatarStyle, (r: R, P: Pal, id: string) => string> = {
  buddy,
  aura,
  bauhaus,
  planet,
  sigil: legacy(sigil),
  orbit: legacy(orbit),
  bot: legacy(bot),
  shard: legacy(shard),
  pixel: legacy(pixel),
  rune: legacy(rune),
}

const cache = new Map<string, string>()

/** Returns an SVG data URL for the given seed/style/variant. */
export function avatarDataUrl(seed: string, spec: AvatarSpec): string {
  const key = `${seed}|${spec.style}|${spec.variant}`
  const hit = cache.get(key)
  if (hit) return hit
  const h = hash(`${seed.toLowerCase()}#${spec.style}#${spec.variant}`)
  const r = rng(h)
  const pal = palette(r)
  const id = (h % 100000).toString(36)
  const body = RENDER[spec.style](r, pal, id)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  if (cache.size > 500) cache.clear()
  cache.set(key, url)
  return url
}
