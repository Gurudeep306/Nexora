/*
 * Shapes for the profile covers (covers.tsx): paper-cut scenes on an
 * 800 × 200 canvas. Every random choice comes from a seed (the profile's
 * username), so each profile has its own version of a scene and always opens
 * on the same one. Pure functions, no React: tests/cover-frames.test.js
 * checks them.
 */
import { rng, seedOf } from './coverFrames.ts'

export const W = 800
export const H = 200
const f1 = (n: number) => Math.round(n * 10) / 10

/** A filled ridge from the bottom edge, twice the width so it can scroll seamlessly. */
export function ridge(r: () => number, base: number, amp: number, wave: number, rough = 0.3, width = W * 2) {
  const a = r() * 6.28
  const b = r() * 6.28
  const c = r() * 6.28
  // Whole numbers of periods per 800 px, so the two halves match and the scroll loops.
  const k1 = Math.max(1, Math.round(W / wave))
  const k2 = k1 * 3
  const k3 = k1 * 7
  let d = `M0 ${H}`
  for (let x = 0; x <= width; x += 8) {
    const t = (x / W) * Math.PI * 2
    const y = base - amp * ((1 - rough) * Math.sin(t * k1 + a) * 0.6 + rough * (0.6 * Math.sin(t * k2 + b) + 0.4 * Math.sin(t * k3 + c)))
    d += `L${x} ${f1(y)}`
  }
  return `${d}L${width} ${H}Z`
}

export const sceneRng = (name: string, scene: string) => rng(seedOf(`${name}:${scene}`))

export function stars(r: () => number, count: number, maxY = H * 0.55) {
  return Array.from({ length: count }, () => ({ x: f1(r() * W), y: f1(4 + r() * maxY), r: f1(0.6 + r() * 1.4), d: f1(r() * 5) }))
}

/* ── Dusk: mountain ridges at sunset ─────────────────────────────────────── */
export function dusk(name: string) {
  const r = sceneRng(name, 'dusk')
  return {
    sun: { cx: f1(140 + r() * 520), cy: f1(92 + r() * 14), r: 34 },
    stars: stars(r, 40, 60),
    ridges: [ridge(r, 118, 34, 300, 0.35), ridge(r, 138, 30, 240, 0.35), ridge(r, 158, 24, 200, 0.3), ridge(r, 178, 18, 160, 0.3), ridge(r, 194, 10, 140, 0.3)],
    birds: Array.from({ length: 4 }, (_, k) => ({ x: f1(200 + k * 34 + r() * 20), y: f1(50 + r() * 26), s: f1(0.7 + r() * 0.5) })),
  }
}

/* ── Ocean: waves and a sailboat ─────────────────────────────────────────── */
export function ocean(name: string) {
  const r = sceneRng(name, 'ocean')
  return {
    sun: { cx: f1(120 + r() * 560), cy: f1(58 + r() * 14), r: 26 },
    waves: [0, 1, 2, 3, 4].map((k) => ridge(r, 104 + k * 22, 6 + k * 1.5, 120 - k * 10, 0.15)),
    boat: f1(160 + r() * 480),
  }
}

/* ── Skyline: two rows of buildings with windows ─────────────────────────── */
export function skyline(name: string) {
  const r = sceneRng(name, 'skyline')
  const row = (base: number, minH: number, maxH: number, minW: number, maxW: number) => {
    const out: { x: number; y: number; w: number; h: number }[] = []
    let x = -10
    while (x < W + 10) {
      const w = Math.round(minW + r() * (maxW - minW))
      const h = Math.round(minH + r() * (maxH - minH))
      out.push({ x, y: base - h, w, h })
      x += w + Math.round(r() * 6)
    }
    return out
  }
  const back = row(200, 60, 130, 30, 70)
  const front = row(200, 30, 100, 26, 60)
  const windows: { x: number; y: number; d: number }[] = []
  for (const b of front)
    for (let wy = b.y + 10; wy < 190; wy += 12)
      for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 10) if (r() < 0.34) windows.push({ x: wx, y: wy, d: f1(r() * 8) })
  return { back, front, windows, stars: stars(r, 50, 70), moon: { cx: f1(80 + r() * 640), cy: 40, r: 18 } }
}

/* ── Forest: rows of pines ───────────────────────────────────────────────── */
export function pines(r: () => number, base: number, size: number, gap: number) {
  let d = ''
  for (let x = -gap; x < W * 2 + gap; x += gap * (0.6 + r() * 0.8)) {
    const h = size * (0.7 + r() * 0.6)
    const w = h * 0.42
    const y = base + r() * 6
    for (let k = 0; k < 3; k++) {
      const top = y - h + k * h * 0.22
      const bw = w * (0.55 + k * 0.25)
      d += `M${f1(x)} ${f1(top)}L${f1(x + bw)} ${f1(top + h * 0.42)}L${f1(x - bw)} ${f1(top + h * 0.42)}Z`
    }
    d += `M${f1(x - 2)} ${f1(y - h * 0.2)}H${f1(x + 2)}V${H}H${f1(x - 2)}Z`
  }
  return `${d}M0 ${base + 2}H${W * 2}V${H}H0Z`
}
export function forest(name: string) {
  const r = sceneRng(name, 'forest')
  return {
    moon: { cx: f1(120 + r() * 560), cy: f1(40 + r() * 16), r: 20 },
    rows: [pines(r, 120, 50, 26), pines(r, 145, 56, 30), pines(r, 168, 62, 34), pines(r, 192, 70, 40)],
  }
}

/* ── Sakura: a branch from the corner, blossoms along it, petals falling ── */
export function sakura(name: string) {
  const r = sceneRng(name, 'sakura')
  const pts: [number, number][] = []
  for (let k = 0; k <= 10; k++) {
    const t = k / 10
    pts.push([f1(-20 + t * 560), f1(10 + t * 70 + Math.sin(t * 5 + r()) * 14)])
  }
  const branch = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join('')
  const twigs: string[] = []
  const blossoms: { x: number; y: number; s: number; rot: number }[] = []
  pts.slice(2).forEach(([x, y], k) => {
    const len = 30 + r() * 50
    const ang = (k % 2 ? 1 : -1) * (0.5 + r() * 0.6)
    const ex = x + Math.cos(ang) * len
    const ey = y + Math.sin(ang) * len
    twigs.push(`M${x} ${y}L${f1(ex)} ${f1(ey)}`)
    blossoms.push({ x: f1(ex), y: f1(ey), s: f1(0.9 + r() * 0.6), rot: Math.round(r() * 72) })
    blossoms.push({ x: f1((x + ex) / 2 + 6), y: f1((y + ey) / 2 - 4), s: f1(0.6 + r() * 0.4), rot: Math.round(r() * 72) })
  })
  const petals = Array.from({ length: 18 }, () => ({ x: f1(r() * W), y: f1(r() * H * 0.6), d: f1(r() * 9), s: f1(0.6 + r() * 0.6) }))
  return { flip: r() < 0.5, branch, twigs, blossoms, petals, hills: [ridge(r, 168, 22, 260, 0.2), ridge(r, 188, 14, 200, 0.2)] }
}
/** One five-petal blossom at (0, 0), radius about 9. */
export const BLOSSOM = Array.from({ length: 5 }, (_, k) => {
  const a = (k * 72 * Math.PI) / 180
  const x = f1(Math.sin(a) * 5)
  const y = f1(-Math.cos(a) * 5)
  return `M0 0 C${f1(x * 0.4 - y * 0.9)} ${f1(y * 0.4 + x * 0.9)} ${f1(x * 2.2)} ${f1(y * 2.2)} ${f1(x * 1.8)} ${f1(y * 1.8)} C${f1(x * 2.2)} ${f1(y * 2.2)} ${f1(x * 0.4 + y * 0.9)} ${f1(y * 0.4 - x * 0.9)} 0 0Z`
}).join('')

/* ── Desert: dunes and a caravan ─────────────────────────────────────────── */
export function desert(name: string) {
  const r = sceneRng(name, 'desert')
  return {
    sun: { cx: f1(120 + r() * 560), cy: f1(64 + r() * 16), r: 30 },
    dunes: [ridge(r, 122, 18, 520, 0.12), ridge(r, 146, 18, 420, 0.1), ridge(r, 170, 14, 360, 0.1), ridge(r, 192, 9, 300, 0.1)],
  }
}
/** A camel, facing right, standing at (0, 0) = between its feet. */
export const CAMEL =
  'M-22 -24 C-20 -34 -12 -36 -8 -30 C-4 -40 6 -40 10 -30 L14 -28 L18 -40 C19 -44 25 -45 27 -41 L30 -38 L26 -36 L23 -38 L20 -26 L18 -18 L18 0 L15 0 L14 -16 L-14 -16 L-15 0 L-18 0 L-18 -18 Z'

/* ── Tea hills: terraced slopes ──────────────────────────────────────────── */
export function teaHills(name: string) {
  const r = sceneRng(name, 'tea')
  return { sun: { cx: f1(100 + r() * 600), cy: f1(38 + r() * 12), r: 20 }, hills: [0, 1, 2, 3].map((k) => ridge(r, 112 + k * 26, 32 - k * 4, 340 - k * 40, 0.25)) }
}

/* ── Warli: a frieze of dancers, huts and a sun ──────────────────────────── */
export function warli(name: string) {
  const r = sceneRng(name, 'warli')
  const count = 13
  const gap = W / count
  return {
    dancers: Array.from({ length: count }, (_, k) => ({ x: f1(gap / 2 + k * gap), y: 134 + Math.round(r() * 5), d: f1((k % 4) * 0.35) })),
    trees: [f1(28 + r() * 30), f1(W - 60 + r() * 30)],
    huts: [f1(150 + r() * 70), f1(570 + r() * 70)],
    sun: { cx: f1(330 + r() * 140), cy: 40 },
  }
}
export const WARLI_BODY = 'M-11 -24 L11 -24 L0 -6 Z M0 -6 L-10 12 L10 12 Z'
export const WARLI_LIMBS = 'M-11 -22 L-26 -12 M11 -22 L26 -12 M-6 12 L-10 28 M6 12 L12 28'

/* ── Cosmos: stars, a ringed planet and moons ────────────────────────────── */
export function cosmos(name: string) {
  const r = sceneRng(name, 'cosmos')
  return {
    stars: stars(r, 130, H),
    planet: { cx: f1(500 + r() * 200), cy: f1(84 + r() * 30), r: 44, tilt: Math.round(-25 + r() * 20) },
    moons: [
      { cx: f1(200 + r() * 160), cy: f1(50 + r() * 100), r: 12 },
      { cx: f1(60 + r() * 80), cy: f1(130 + r() * 40), r: 6 },
    ],
  }
}

/* ── Himalaya: snow peaks and a string of prayer flags ───────────────────── */
/** A jagged ridge as points (for peaks), twice the width for scrolling. */
function jag(r: () => number, base: number, amp: number, step: number) {
  const pts: [number, number][] = []
  for (let x = 0; x <= W * 2; x += step) pts.push([x, f1(base - amp * (0.35 + 0.65 * r()))])
  // Repeat the first half so the scroll loops.
  const half = pts.length >> 1
  for (let k = half; k < pts.length; k++) pts[k] = [pts[k][0], pts[k - half][1]]
  return pts
}
const fillPath = (pts: [number, number][]) => `M0 ${H}${pts.map(([x, y]) => `L${x} ${y}`).join('')}L${W * 2} ${H}Z`
/** Snow caps: a small cap on every peak, reaching `depth` down each slope. */
function snowPath(pts: [number, number][], depth: number) {
  let d = ''
  for (let k = 1; k + 1 < pts.length; k++) {
    const [x, y] = pts[k]
    const [lx, ly] = pts[k - 1]
    const [rx, ry] = pts[k + 1]
    if (y > ly || y > ry) continue
    const at = (ox: number, oy: number) => {
      const t = Math.min(1, depth / Math.max(1, oy - y))
      return [f1(x + (ox - x) * t), f1(y + (oy - y) * t)]
    }
    const [ax, ay] = at(lx, ly)
    const [bx, by] = at(rx, ry)
    const mx = f1((ax + bx) / 2)
    d += `M${x} ${y}L${bx} ${by}L${f1((x + bx) / 2)} ${f1(by - depth * 0.25)}L${mx} ${f1(Math.max(ay, by) - depth * 0.1)}L${f1((x + ax) / 2)} ${f1(ay - depth * 0.3)}L${ax} ${ay}Z`
  }
  return d
}
export function himalaya(name: string) {
  const r = sceneRng(name, 'himalaya')
  const far = jag(r, 120, 80, 50)
  const near = jag(r, 160, 70, 64)
  const flags: { x: number; y: number; c: number }[] = []
  for (let k = 0; k < 22; k++) {
    const t = k / 21
    flags.push({ x: f1(250 + t * 520), y: f1(18 + 26 * Math.sin(t * Math.PI)), c: k % 5 })
  }
  return { far: fillPath(far), farSnow: snowPath(far, 22), near: fillPath(near), nearSnow: snowPath(near, 18), flags, sun: { cx: f1(80 + r() * 140), cy: 40, r: 16 } }
}

/* ── Backwaters: palms, water and a houseboat ────────────────────────────── */
export function backwaters(name: string) {
  const r = sceneRng(name, 'backwaters')
  const palms = Array.from({ length: 7 }, (_, k) => ({ x: f1(30 + k * 115 + r() * 40), h: f1(70 + r() * 40), lean: f1(-14 + r() * 28) }))
  return { palms, sun: { cx: f1(200 + r() * 400), cy: 52, r: 22 }, boat: f1(300 + r() * 200), shore: ridge(r, 132, 6, 400, 0.2) }
}

/* ── Balloons: hot-air balloons over rolling fields ──────────────────────── */
export function balloons(name: string) {
  const r = sceneRng(name, 'balloons')
  return {
    fields: [ridge(r, 150, 18, 420, 0.15), ridge(r, 172, 16, 340, 0.15), ridge(r, 192, 10, 280, 0.1)],
    balloons: Array.from({ length: 5 }, (_, k) => ({ x: f1(110 + k * 150 + r() * 50), y: f1(40 + r() * 60), s: f1(0.55 + r() * 0.5), c: k % 4, d: f1(r() * 4) })),
  }
}
/** A balloon envelope at (0, 0), about 40 wide, with its basket below. */
export const BALLOON = 'M0 -30 C24 -30 26 -4 10 14 L-10 14 C-26 -4 -24 -30 0 -30 Z'

/* ── Lotus pond: pads, flowers and ripples ───────────────────────────────── */
export function lotus(name: string) {
  const r = sceneRng(name, 'lotus')
  return {
    pads: Array.from({ length: 16 }, () => ({ x: f1(r() * W), y: f1(70 + r() * 125), s: f1(0.6 + r() * 0.8), rot: Math.round(r() * 360) })),
    flowers: Array.from({ length: 6 }, (_, k) => ({ x: f1(70 + k * 130 + r() * 50), y: f1(100 + r() * 70), s: f1(0.8 + r() * 0.5) })),
    ripples: Array.from({ length: 5 }, () => ({ x: f1(r() * W), y: f1(60 + r() * 130), d: f1(r() * 6) })),
  }
}

/* ── Lighthouse: a cliff, a tower and a sweeping beam ────────────────────── */
export function lighthouse(name: string) {
  const r = sceneRng(name, 'lighthouse')
  return { stars: stars(r, 60, 90), x: f1(560 + r() * 120), waves: [ridge(r, 150, 4, 90, 0.2), ridge(r, 172, 4, 80, 0.2)], moon: { cx: f1(80 + r() * 200), cy: 40, r: 14 } }
}

/* ── Reef: an underwater scene with fish ─────────────────────────────────── */
export function reef(name: string) {
  const r = sceneRng(name, 'reef')
  return {
    weeds: Array.from({ length: 12 }, (_, k) => ({ x: f1(20 + k * 66 + r() * 30), h: f1(40 + r() * 50), d: f1(r() * 3) })),
    corals: Array.from({ length: 6 }, (_, k) => ({ x: f1(60 + k * 130 + r() * 40), s: f1(0.7 + r() * 0.6), c: k % 3 })),
    fish: Array.from({ length: 7 }, (_, k) => ({ y: f1(40 + r() * 100), s: f1(0.6 + r() * 0.7), c: k % 4, d: f1(r() * 20), dur: f1(16 + r() * 14) })),
    bubbles: Array.from({ length: 14 }, () => ({ x: f1(r() * W), r: f1(1.5 + r() * 3), d: f1(r() * 8) })),
    sand: ridge(r, 186, 6, 300, 0.2),
  }
}
export const FISH = 'M-14 0 C-8 -9 8 -9 14 0 C8 9 -8 9 -14 0 Z M14 0 L24 -8 L22 0 L24 8 Z'

/* ── Aurora: ribbons of light over snow and pines ────────────────────────── */
export function aurora(name: string) {
  const r = sceneRng(name, 'aurora')
  const ribbon = (y0: number, amp: number, thick: number) => {
    const a = r() * 6.28
    const k = 2 + Math.floor(r() * 2)
    let top = ''
    let bot = ''
    for (let x = 0; x <= W * 2; x += 10) {
      const t = (x / W) * Math.PI * 2
      const y = y0 + amp * Math.sin(t * k + a)
      top += `${x ? 'L' : 'M'}${x} ${f1(y)}`
      bot = `L${x} ${f1(y + thick * (0.6 + 0.4 * Math.sin(t * k * 2 + a)))}` + bot
    }
    return `${top}${bot}Z`
  }
  return {
    stars: stars(r, 70, 120),
    ribbons: [ribbon(40, 14, 34), ribbon(62, 18, 26), ribbon(30, 10, 18)],
    trees: pines(r, 178, 46, 30),
    snow: ridge(r, 176, 6, 300, 0.2),
  }
}
