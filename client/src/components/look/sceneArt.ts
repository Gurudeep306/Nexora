/*
 * Shapes for the theme scenes (ThemeScene.tsx): the drawing behind every page.
 *
 * Three canvases: the sky (1600 × 1000, covers the window), the ground
 * (1600 × 320, along the bottom edge) and a corner piece (400 × 300, top
 * right). Every "random" choice comes from a fixed seed per scene, so a theme
 * always looks the same. Pure functions, no React: tests/theme-scenes.test.js
 * checks them.
 */
import { rng, seedOf } from '../profile/coverFrames.ts'

export const SW = 1600
export const SH = 1000
export const GW = 1600
export const GH = 320

const f = (n: number) => Math.round(n * 10) / 10
export type Pt = [number, number]
export const pts = (p: Pt[]) => p.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')
export const poly = (p: Pt[]) => `M${pts(p)}Z`

export const sceneRng = (scene: string) => rng(seedOf(`theme-scene:${scene}`))

/** Rolling hills from the bottom edge of the ground canvas. */
export function hills(r: () => number, base: number, amp: number, waves: number, rough = 0.3) {
  const a = r() * 6.28
  const b = r() * 6.28
  let d = `M0 ${GH}`
  for (let x = 0; x <= GW; x += 16) {
    const t = (x / GW) * Math.PI * 2
    const y = base - amp * ((1 - rough) * Math.sin(t * waves + a) + rough * Math.sin(t * waves * 3.3 + b))
    d += `L${x} ${f(y)}`
  }
  return `${d}L${GW} ${GH}Z`
}

/** A jagged mountain range: the outline, plus a snow cap on every peak. */
export function range(r: () => number, base: number, top: number, low: number, count: number, snow = 0.32) {
  const step = GW / count
  const outline: Pt[] = [[0, GH], [0, base - (base - low) * r()]]
  const caps: string[] = []
  let prev: Pt = outline[1]
  for (let i = 0; i < count; i++) {
    const px = f(i * step + step * (0.3 + r() * 0.4))
    const py = f(top + (low - top) * r() * 0.7)
    const vx = f((i + 1) * step)
    const vy = f(low + (base - low) * (0.2 + r() * 0.6))
    const peak: Pt = [px, py]
    const next: Pt = [vx, vy]
    // A shoulder on each side so the slopes are not straight.
    const sl: Pt = [f(prev[0] + (px - prev[0]) * 0.55), f(prev[1] + (py - prev[1]) * 0.55 + (r() - 0.5) * 18)]
    const sr: Pt = [f(px + (vx - px) * 0.45), f(py + (vy - py) * 0.45 + (r() - 0.5) * 18)]
    outline.push(sl, peak, sr, next)
    // The cap: down both slopes a little, then a ragged lower edge back.
    const t = snow * (0.8 + r() * 0.4)
    const l: Pt = [px + (sl[0] - px) * t * 1.6, py + (sl[1] - py) * t * 1.6]
    const rr: Pt = [px + (sr[0] - px) * t * 1.6, py + (sr[1] - py) * t * 1.6]
    const rag: Pt[] = []
    const n = 4
    for (let k = n - 1; k >= 1; k--) {
      const u = k / n
      const x = l[0] + (rr[0] - l[0]) * u
      const y = l[1] + (rr[1] - l[1]) * u + (k % 2 ? 10 + r() * 10 : -2 - r() * 6)
      rag.push([x, Math.max(py + 6, y)])
    }
    caps.push(poly([peak, rr, ...rag, l]))
    prev = next
  }
  outline.push([GW, prev[1]], [GW, GH])
  return { outline: poly(outline), caps }
}

/** A pine tree as one path: stacked triangles on a short trunk. */
export function pine(x: number, y: number, h: number) {
  const w = h * 0.42
  const tiers = 3
  let d = `M${f(x - w * 0.08)} ${f(y)}L${f(x + w * 0.08)} ${f(y)}L${f(x + w * 0.08)} ${f(y - h * 0.12)}L${f(x - w * 0.08)} ${f(y - h * 0.12)}Z`
  for (let i = 0; i < tiers; i++) {
    const by = y - h * 0.1 - i * h * 0.26
    const tw = w * (1 - i * 0.24)
    d += `M${f(x - tw / 2)} ${f(by)}L${f(x)} ${f(by - h * 0.42)}L${f(x + tw / 2)} ${f(by)}Z`
  }
  return d
}

/** A cloud of overlapping circles, as one path. */
export function cloud(x: number, y: number, w: number) {
  const h = w * 0.32
  const bumps: [number, number, number][] = [[0.18, 0.62, 0.2], [0.38, 0.38, 0.26], [0.62, 0.42, 0.22], [0.82, 0.64, 0.17]]
  let d = `M${f(x)} ${f(y + h)}L${f(x + w)} ${f(y + h)}`
  for (const [u, v, rr] of bumps) {
    const cx = x + u * w
    const cy = y + v * h
    const rad = rr * w
    d += `M${f(cx - rad)} ${f(cy)}a${f(rad)} ${f(rad)} 0 1 0 ${f(rad * 2)} 0a${f(rad)} ${f(rad)} 0 1 0 ${f(-rad * 2)} 0Z`
  }
  d += `M${f(x + w * 0.05)} ${f(y + h * 0.6)}h${f(w * 0.9)}v${f(h * 0.4)}h${f(-w * 0.9)}Z`
  return d
}

export function stars(r: () => number, count: number, maxY: number, w = SW) {
  return Array.from({ length: count }, () => ({ x: f(r() * w), y: f(10 + r() * maxY), s: f(1 + r() * 2.2), d: f(r() * 6) }))
}

/** A five-petal blossom as one path. */
export function blossom(cx: number, cy: number, rad: number, turn = 0) {
  let d = ''
  for (let i = 0; i < 5; i++) {
    const a = turn + (i * Math.PI * 2) / 5
    const px = cx + Math.cos(a) * rad * 0.62
    const py = cy + Math.sin(a) * rad * 0.62
    const pr = rad * 0.46
    d += `M${f(px - pr)} ${f(py)}a${f(pr)} ${f(pr)} 0 1 0 ${f(pr * 2)} 0a${f(pr)} ${f(pr)} 0 1 0 ${f(-pr * 2)} 0Z`
  }
  return d
}

/* ── Himalaya ──────────────────────────────────────────────────────────── */
export function himalaya() {
  const r = sceneRng('himalaya')
  const far = range(r, 210, 34, 150, 6, 0.34)
  const mid = range(r, 262, 112, 200, 8, 0.26)
  const near = hills(r, 286, 14, 3, 0.35)
  const front = hills(r, 306, 8, 5, 0.3)
  const trees: string[] = []
  for (let x = 20; x < GW; x += 14 + r() * 26) {
    if (x > 960 && x < 1360) continue
    trees.push(pine(x, 292 + r() * 10, 28 + r() * 30))
  }
  // Prayer flags on a sagging line between two poles.
  const flags: { x: number; y: number; c: number }[] = []
  const [x0, y0, x1, y1] = [980, 214, 1340, 236]
  for (let i = 1; i < 16; i++) {
    const t = i / 16
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * 26
    flags.push({ x: f(x), y: f(y), c: i % 5 })
  }
  return {
    far: far.outline, farSnow: far.caps, mid: mid.outline, midSnow: mid.caps, near, front, trees: trees.join(''),
    line: `M${x0} ${y0}Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + 52} ${x1} ${y1}`, poles: `M${x0} ${y0 - 6}V300M${x1} ${y1 - 6}V300`, flags,
    clouds: [cloud(120, 160, 260), cloud(760, 90, 200), cloud(1240, 210, 300)],
    stars: stars(r, 90, 520),
    birds: Array.from({ length: 5 }, (_, k) => ({ x: f(420 + k * 46 + r() * 30), y: f(250 + r() * 70), s: f(0.8 + r() * 0.6), d: f(k * 0.4) })),
  }
}

/* ── Aurora ────────────────────────────────────────────────────────────── */
export function aurora() {
  const r = sceneRng('aurora')
  const ribbon = (y: number, amp: number, thick: number, waves: number) => {
    const a = r() * 6.28
    const top: Pt[] = []
    const bot: Pt[] = []
    for (let x = -200; x <= SW + 200; x += 40) {
      const t = (x / SW) * Math.PI * 2
      const yy = y + amp * Math.sin(t * waves + a) + amp * 0.35 * Math.sin(t * waves * 2.7 + a * 2)
      const th = thick * (0.55 + 0.45 * Math.sin(t * 1.3 + a))
      top.push([x, yy])
      bot.push([x, yy + th])
    }
    return poly([...top, ...bot.reverse()])
  }
  // Vertical curtain streaks inside each ribbon.
  const streaks = (y: number, amp: number, waves: number, n: number) =>
    Array.from({ length: n }, () => {
      const x = r() * SW
      const t = (x / SW) * Math.PI * 2
      const yy = y + amp * Math.sin(t * waves)
      return { x: f(x), y: f(yy - 40 - r() * 60), h: f(90 + r() * 140), w: f(3 + r() * 7) }
    })
  const far = range(r, 230, 120, 190, 7, 0.4)
  const trees: string[] = []
  for (let x = 0; x < GW; x += 9 + r() * 16) if (x < 1040 || x > 1220) trees.push(pine(x, 300 + r() * 14, 40 + r() * 46))
  return {
    ribbons: [ribbon(160, 60, 120, 1.5), ribbon(260, 70, 90, 2.2), ribbon(120, 40, 70, 1.1)],
    streaks: streaks(220, 60, 1.5, 34),
    stars: stars(r, 140, 700),
    far: far.outline, farSnow: far.caps,
    lake: `M0 268 L${GW} 268 L${GW} 284 L0 284 Z`,
    ridge: hills(r, 292, 10, 4, 0.3),
    trees: trees.join(''),
    shooting: [{ x: 300, y: 120, d: 3 }, { x: 980, y: 80, d: 11 }],
  }
}

/* ── Sakura ────────────────────────────────────────────────────────────── */
export function sakura() {
  const r = sceneRng('sakura')
  // The branch enters from the right edge of the corner canvas.
  const branch = 'M410 28 C340 40 300 70 250 82 C200 94 150 92 96 120 C70 133 52 150 40 170'
  const twigs = ['M300 66 C290 40 270 28 248 22', 'M200 92 C190 120 176 136 150 150', 'M140 100 C120 80 104 70 84 66', 'M360 44 C366 70 360 92 344 110']
  const spots: Pt[] = [[250, 82], [248, 22], [200, 92], [150, 150], [96, 120], [84, 66], [40, 170], [300, 66], [344, 110], [176, 136], [270, 30], [120, 104], [330, 56], [62, 150]]
  const flowers = spots.map(([x, y], i) => ({ d: blossom(x + (r() - 0.5) * 10, y + (r() - 0.5) * 10, 11 + r() * 7, r() * 6), deep: i % 3 === 0 }))
  const buds = Array.from({ length: 10 }, () => {
    const [x, y] = spots[Math.floor(r() * spots.length)]
    return { x: f(x + (r() - 0.5) * 40), y: f(y + (r() - 0.5) * 30), s: f(3 + r() * 3) }
  })
  const petals = Array.from({ length: 16 }, (_, k) => ({ x: f(80 + r() * 1440), d: f(-r() * 24), t: f(16 + r() * 14), s: f(0.8 + r() * 0.8), k }))
  // Pagoda: five roofs that narrow upwards.
  let pagoda = ''
  const px = 1300
  let y = 262
  for (let i = 0; i < 5; i++) {
    const w = 96 - i * 15
    const bh = 18 - i * 1.5
    pagoda += `M${px - w * 0.36} ${y}h${f(w * 0.72)}v${-bh}h${-f(w * 0.72)}Z`
    y -= bh
    pagoda += `M${px - w * 0.62} ${y + 4}Q${px} ${y - 14} ${px + w * 0.62} ${y + 4}L${px + w * 0.44} ${y - 6}h${-f(w * 0.88)}Z`
    y -= 6
  }
  pagoda += `M${px - 2} ${y}v-36h4v36Z`
  const trees = Array.from({ length: 7 }, (_, k) => {
    const x = 860 + k * 110 + r() * 50
    const yy = 284 + r() * 12
    return { trunk: `M${f(x - 3)} ${f(yy)}L${f(x - 1)} ${f(yy - 30)}L${f(x + 1)} ${f(yy - 30)}L${f(x + 3)} ${f(yy)}Z`, crown: cloud(x - 34, yy - 64, 68) }
  })
  return {
    branch, twigs, flowers, buds, petals,
    fuji: 'M260 236 L520 70 Q540 58 560 70 L860 236 Z',
    fujiSnow: 'M520 70 Q540 58 560 70 L640 122 L612 112 L596 132 L572 114 L546 136 L522 112 L500 128 L476 110 L452 120 Z',
    mist: [hills(r, 220, 6, 2, 0.2), hills(r, 250, 10, 3, 0.3)],
    hill: hills(r, 280, 14, 2, 0.3),
    front: hills(r, 304, 8, 4, 0.3),
    pagoda, trees,
    stars: stars(r, 70, 480),
  }
}

/* ── Thar ──────────────────────────────────────────────────────────────── */
export function thar() {
  const r = sceneRng('thar')
  const dune = (base: number, amp: number, waves: number) => {
    const a = r() * 6.28
    let d = `M0 ${GH}`
    for (let x = 0; x <= GW; x += 16) {
      const t = (x / GW) * Math.PI * 2
      // Dunes are steep on one side: a skewed sine.
      const s = Math.sin(t * waves + a)
      const y = base - amp * (s + 0.35 * Math.sin(2 * (t * waves + a)))
      d += `L${x} ${f(y)}`
    }
    return `${d}L${GW} ${GH}Z`
  }
  // Fort on the far ridge: walls, round bastions, battlements and domes.
  const fx = 880
  const fy = 196
  let fort = `M${fx} ${fy}V${fy - 46}H${fx + 380}V${fy}Z`
  for (let x = fx; x < fx + 380; x += 12) fort += `M${x} ${fy - 46}v-7h7v7Z`
  for (const bx of [fx - 12, fx + 120, fx + 250, fx + 368]) {
    fort += `M${bx} ${fy}V${fy - 62}h26V${fy}Z`
    for (let k = 0; k < 3; k++) fort += `M${bx + k * 9} ${fy - 62}v-6h6v6Z`
  }
  fort += `M${fx + 150} ${fy - 46}V${fy - 92}h70V${fy - 46}Z`
  for (const dx of [fx + 160, fx + 185, fx + 210]) fort += `M${dx - 9} ${fy - 92}a9 9 0 0 1 18 0Z M${dx - 1} ${fy - 101}v-6h2v6Z`
  fort += `M${fx + 60} ${fy - 46}V${fy - 70}h30V${fy - 46}Z M${fx + 63} ${fy - 70}a12 12 0 0 1 24 0Z`
  fort += `M${fx + 290} ${fy - 46}V${fy - 66}h28V${fy - 46}Z M${fx + 293} ${fy - 66}a11 11 0 0 1 22 0Z`
  const windows: Pt[] = []
  for (let x = fx + 16; x < fx + 370; x += 28) if (r() < 0.7) windows.push([x, fy - 30 - r() * 6])
  return {
    far: dune(212, 16, 2),
    mid: dune(246, 20, 3),
    near: dune(286, 14, 2),
    front: dune(310, 6, 5),
    fort, windows,
    flag: `M${fx + 185} ${fy - 107}v-26 M${fx + 186} ${fy - 133}l22 6l-22 6Z`,
    ripples: Array.from({ length: 14 }, () => {
      const x = r() * GW
      const y = 296 + r() * 18
      return `M${f(x)} ${f(y)}q20 -6 40 0`
    }).join(''),
    tree: 'M1460 300 C1462 270 1458 250 1450 236 M1452 250 C1440 240 1428 238 1414 240 M1454 258 C1470 246 1486 244 1500 246',
    crown: [cloud(1396, 206, 70), cloud(1446, 214, 72), cloud(1420, 196, 60)],
    stars: stars(r, 150, 640),
    birds: Array.from({ length: 3 }, (_, k) => ({ x: f(300 + k * 40 + r() * 20), y: f(300 + r() * 60), s: f(0.8 + r() * 0.5), d: f(k * 0.5) })),
  }
}

/* ── Warli ─────────────────────────────────────────────────────────────── */
/** A Warli figure: round head, two triangles meeting at the waist, stick limbs. */
export function warliFigure(x: number, y: number, s: number) {
  const h = 34 * s
  const head = { cx: f(x), cy: f(y - h - 5 * s), r: f(4.2 * s) }
  const body = poly([[x - 7 * s, y - h + 1 * s], [x + 7 * s, y - h + 1 * s], [x, y - h * 0.55]]) + poly([[x, y - h * 0.55], [x - 7 * s, y - h * 0.18], [x + 7 * s, y - h * 0.18]])
  const legs = `M${f(x - 4 * s)} ${f(y - h * 0.18)}L${f(x - 8 * s)} ${f(y)}M${f(x + 4 * s)} ${f(y - h * 0.18)}L${f(x + 9 * s)} ${f(y)}`
  return { head, body, legs, shoulder: [f(y - h + 2 * s)] as [number] }
}

export function warli() {
  const r = sceneRng('warli')
  // The tarpa dance: a ring of dancers, hands joined, round a musician.
  const cx = 1120
  const cy = 236
  const rx = 230
  const ry = 50
  const n = 18
  const dancers = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const x = cx + Math.cos(a) * rx
    const y = cy + Math.sin(a) * ry + 34
    const s = 0.9 + ((Math.sin(a) + 1) / 2) * 0.35
    return { ...warliFigure(x, y, s), x: f(x), y: f(y), s, odd: i % 2 === 1 }
  })
  // Arms: each dancer holds the next one's hand.
  let arms = ''
  for (let i = 0; i < n; i++) {
    const a = dancers[i]
    const b = dancers[(i + 1) % n]
    const ay = a.y - 34 * a.s + 4 * a.s
    const by = b.y - 34 * b.s + 4 * b.s
    const mx = (a.x + b.x) / 2
    const my = Math.min(ay, by) - 6
    arms += `M${a.x} ${f(ay)}L${f(mx)} ${f(my)}L${b.x} ${f(by)}`
  }
  const musician = warliFigure(cx, cy + 40, 1.3)
  const huts = [660, 770, 1430, 1520].map((x, k) => {
    const y = 300
    const w = 70 + (k % 2) * 16
    return `M${x} ${y}V${y - 34}H${x + w}V${y}Z M${x - 10} ${y - 34}L${x + w / 2} ${y - 72}L${x + w + 10} ${y - 34}Z M${x + w / 2 - 8} ${y}V${y - 20}H${x + w / 2 + 8}V${y}Z`
  })
  const tree = (x: number, y: number, h: number) => {
    let d = `M${x} ${y}V${y - h}`
    for (let k = 1; k < 6; k++) {
      const yy = y - h * (0.35 + k * 0.12)
      const len = h * (0.42 - k * 0.05)
      d += `M${x} ${f(yy)}l${f(-len)} ${f(-len * 0.6)}M${x} ${f(yy)}l${f(len)} ${f(-len * 0.6)}`
    }
    return d
  }
  const leaves = (x: number, y: number, h: number) =>
    Array.from({ length: 22 }, () => ({ x: f(x + (r() - 0.5) * h * 0.8), y: f(y - h * (0.5 + r() * 0.5)), r: f(1.6 + r() * 1.6) }))
  const walkers = [560, 610, 860, 910].map((x, k) => ({ ...warliFigure(x, 300, 1), x, pot: k % 2 === 0 }))
  const birds = Array.from({ length: 6 }, (_, k) => ({ x: f(520 + k * 70 + r() * 30), y: f(330 + r() * 60), d: f(k * 0.35) }))
  return {
    dancers, arms, musician, huts, walkers, birds,
    trees: [tree(500, 300, 110), tree(1390, 300, 130), tree(960, 300, 90)],
    leaves: [...leaves(500, 300, 110), ...leaves(1390, 300, 130), ...leaves(960, 300, 90)],
    ground: `M0 306 H${GW}`,
    dots: Array.from({ length: 60 }, () => ({ x: f(r() * GW), y: f(310 + r() * 8) })),
  }
}

/* ── Reef ──────────────────────────────────────────────────────────────── */
export function reef() {
  const r = sceneRng('reef')
  const rays = Array.from({ length: 6 }, (_, k) => {
    const x = 120 + k * 270 + r() * 80
    const w = 40 + r() * 60
    return { d: poly([[x, -20], [x + w, -20], [x + w * 3.4 + 160, 900], [x + 160, 900]]), k }
  })
  const bubbles = Array.from({ length: 18 }, () => ({ x: f(60 + r() * 1480), r: f(3 + r() * 7), t: f(10 + r() * 12), d: f(-r() * 20) }))
  const fish = Array.from({ length: 7 }, (_, k) => ({ y: f(260 + r() * 520), s: f(0.7 + r() * 0.9), t: f(40 + r() * 40), d: f(-r() * 60), flip: k % 3 === 2 }))
  // Branching coral: a few stems that fork.
  const coral = (x: number, y: number, h: number) => {
    let d = ''
    const grow = (x0: number, y0: number, a: number, len: number, depth: number) => {
      const x1 = x0 + Math.cos(a) * len
      const y1 = y0 + Math.sin(a) * len
      d += `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`
      if (depth > 0) {
        grow(x1, y1, a - 0.45 - r() * 0.2, len * 0.72, depth - 1)
        grow(x1, y1, a + 0.45 + r() * 0.2, len * 0.72, depth - 1)
      }
    }
    grow(x, y, -Math.PI / 2, h * 0.36, 3)
    return d
  }
  const fan = (x: number, y: number, h: number) => {
    let d = ''
    for (let k = -5; k <= 5; k++) {
      const a = -Math.PI / 2 + k * 0.12
      d += `M${x} ${y}Q${f(x + Math.cos(a) * h * 0.5 + k * 3)} ${f(y + Math.sin(a) * h * 0.5)} ${f(x + Math.cos(a) * h)} ${f(y + Math.sin(a) * h)}`
    }
    return d
  }
  const kelp = Array.from({ length: 9 }, (_, k) => {
    const x = 820 + k * 92 + r() * 40
    const h = 110 + r() * 100
    let d = `M${f(x)} ${GH}`
    for (let y = 0; y < h; y += 20) d += `Q${f((y / 20) % 2 === 0 ? x + 16 : x - 16)} ${f(GH - y - 10)} ${f(x + (r() - 0.5) * 6)} ${f(GH - y - 20)}`
    return { d, x: f(x), k }
  })
  const brains = Array.from({ length: 4 }, () => ({ x: f(760 + r() * 760), r: f(22 + r() * 14) }))
  return {
    rays, bubbles, fish, kelp, brains,
    sand: hills(r, 292, 10, 3, 0.4),
    rock: hills(r, 270, 24, 2, 0.5),
    corals: [coral(900, 296, 130), coral(1180, 300, 160), coral(1500, 300, 140), coral(560, 304, 70)],
    fans: [fan(1040, 302, 120), fan(1340, 300, 110), fan(700, 304, 60)],
    jelly: [{ x: 1180, y: 300 }, { x: 330, y: 520 }],
    turtle: { y: 420 },
  }
}

/* ── Bauhaus ───────────────────────────────────────────────────────────── */
export function bauhaus() {
  return {
    // Corner: a sun circle, a half circle, a bar and a square, set off-grid.
    corner: {
      circle: { cx: 268, cy: 120, r: 92 },
      half: 'M120 236 A70 70 0 0 1 260 236 Z',
      bar: { x: 60, y: 40, w: 22, h: 200 },
      square: { x: 300, y: 196, s: 64 },
      dot: { cx: 150, cy: 92, r: 18 },
      ring: { cx: 268, cy: 120, r: 120 },
      lines: 'M20 270 H390 M20 282 H300',
    },
    ground: {
      quarter: `M0 ${GH} V250 A70 70 0 0 1 70 ${GH} Z`,
      semis: Array.from({ length: 4 }, (_, k) => ({ d: `M${700 + k * 70} ${GH} a35 35 0 0 1 70 0 Z`, c: k % 3 })),
      stripes: Array.from({ length: 5 }, (_, k) => `M${1000 + k * 20} ${GH} V${220 + (k % 2) * 26} h11 V${GH} Z`).join(''),
      tri: `M1110 ${GH} L1200 160 L1290 ${GH} Z`,
      circle: { cx: 1380, cy: 230, r: 80 },
      checks: Array.from({ length: 16 }, (_, k) => ({ x: 1480 + (k % 4) * 30, y: 200 + Math.floor(k / 4) * 30, on: (k + Math.floor(k / 4)) % 2 === 0 })),
    },
    floats: [
      { d: 'M0 -26 L23 14 L-23 14 Z', x: 140, y: 420, t: 28 },
      { d: 'M-18 -18 h36 v36 h-36 Z', x: 1500, y: 520, t: 34 },
    ],
  }
}

/* ── Arcade ────────────────────────────────────────────────────────────── */
export function arcade() {
  const r = sceneRng('arcade')
  const P = 8
  const row = (base: number, minH: number, maxH: number, minW: number, maxW: number) => {
    const out: { x: number; y: number; w: number; h: number }[] = []
    let x = 0
    while (x < GW) {
      const w = Math.round((minW + r() * (maxW - minW)) / P) * P
      const lift = 0.35 + 0.65 * Math.min(1, x / (GW * 0.6))
      const h = Math.max(P * 3, Math.round(((minH + r() * (maxH - minH)) * lift) / P) * P)
      out.push({ x, y: base - h, w, h })
      x += w + (r() < 0.3 ? P : 0)
    }
    return out
  }
  const back = row(GH, 120, 240, 48, 112)
  const front = row(GH, 56, 160, 40, 96)
  const windows: { x: number; y: number; d: number; on: boolean }[] = []
  for (const b of front)
    for (let wy = b.y + P * 2; wy < GH - P * 2; wy += P * 3)
      for (let wx = b.x + P; wx < b.x + b.w - P; wx += P * 2) if (r() < 0.5) windows.push({ x: wx, y: wy, d: f(r() * 9), on: r() < 0.55 })
  const antennas = back.filter(() => r() < 0.25).map((b) => ({ x: b.x + Math.round(b.w / 2 / P) * P, y: b.y }))
  const pstars = Array.from({ length: 70 }, () => ({ x: Math.round((r() * SW) / P) * P, y: Math.round((20 + r() * 600) / P) * P, d: f(r() * 4), big: r() < 0.2 }))
  // A pixel moon: a disc of squares.
  const moon: Pt[] = []
  for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 26) moon.push([1280 + x * P, 150 + y * P])
  const cloudPx = (x: number, y: number) => {
    const cells: Pt[] = []
    const shape = ['..XXXX....', '.XXXXXXXX.', 'XXXXXXXXXX']
    shape.forEach((line, j) => [...line].forEach((ch, i) => ch === 'X' && cells.push([x + i * P, y + j * P])))
    return cells
  }
  return { back, front, windows, antennas, pstars, moon, clouds: [cloudPx(220, 180), cloudPx(820, 110), cloudPx(1060, 260)], P }
}

/* ── Blueprint ─────────────────────────────────────────────────────────── */
export function blueprint() {
  // A suspension bridge in elevation, with dimension lines.
  const t1 = 900
  const t2 = 1420
  const deck = 250
  const top = 60
  const hangers: string[] = []
  const cable = (x0: number, x1: number, sag: number) => {
    for (let x = x0 + 30; x < x1; x += 30) {
      const u = (x - x0) / (x1 - x0)
      const y = top + 10 + (deck - top - 20) * (1 - 4 * u * (1 - u)) * (sag ? 1 : 1)
      hangers.push(`M${f(x)} ${f(Math.min(deck, y))}V${deck}`)
    }
  }
  cable(t1, t2, 1)
  const towers = [t1, t2].map((x) => `M${x - 14} ${GH - 20}V${top}H${x + 14}V${GH - 20} M${x - 14} ${top + 50}H${x + 14} M${x - 14} ${top + 110}H${x + 14} M${x - 14} ${deck - 6}H${x + 14}`).join(' ')
  return {
    towers,
    cables: `M${t1} ${top + 10}Q${(t1 + t2) / 2} ${deck * 2 - top - 30} ${t2} ${top + 10} M${t1} ${top + 10}Q${t1 - 200} ${deck - 40} ${t1 - 380} ${deck - 4} M${t2} ${top + 10}Q${t2 + 200} ${deck - 40} ${t2 + 380} ${deck - 4}`,
    hangers: hangers.join(''),
    deck: `M0 ${deck}H${GW} M0 ${deck + 12}H${GW}`,
    truss: Array.from({ length: 80 }, (_, k) => `M${k * 20} ${deck}l10 12l10 -12`).join(''),
    water: Array.from({ length: 40 }, (_, k) => `M${k * 40} ${GH - 14}q10 -5 20 0t20 0`).join(''),
    dims: `M${t1} ${GH - 40}H${t2} M${t1} ${GH - 46}v12 M${t2} ${GH - 46}v12 M${t1 + 10} ${GH - 44}L${t1} ${GH - 40}L${t1 + 10} ${GH - 36} M${t2 - 10} ${GH - 44}L${t2} ${GH - 40}L${t2 - 10} ${GH - 36} M${t2 + 40} ${top}V${deck} M${t2 + 34} ${top}h12 M${t2 + 34} ${deck}h12`,
    labels: [
      { x: (t1 + t2) / 2, y: GH - 48, t: 'MAIN SPAN 1280.00' },
      { x: t2 + 54, y: (top + deck) / 2, t: 'H 190.00' },
      { x: t1 - 260, y: deck - 20, t: 'ELEVATION A–A  1:2500' },
    ],
    gear: gearPath(0, 0, 96, 78, 14),
    gear2: gearPath(0, 0, 54, 42, 9),
    construct: 'M80 80 A260 260 0 0 1 560 160 M60 60 L620 220 M80 70 v20 M70 80 h20',
    car: { y: deck - 10 },
  }
}

export function gearPath(cx: number, cy: number, ro: number, ri: number, teeth: number) {
  let d = ''
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2
    const a1 = a0 + (Math.PI * 2) / teeth * 0.25
    const a2 = a0 + (Math.PI * 2) / teeth * 0.5
    const a3 = a0 + (Math.PI * 2) / teeth * 0.75
    const p = (a: number, rad: number) => `${f(cx + Math.cos(a) * rad)} ${f(cy + Math.sin(a) * rad)}`
    d += `${i === 0 ? 'M' : 'L'}${p(a0, ri)}L${p(a1, ro)}L${p(a2, ro)}L${p(a3, ri)}`
  }
  return `${d}Z M${cx - ri * 0.35} ${cy}a${f(ri * 0.35)} ${f(ri * 0.35)} 0 1 0 ${f(ri * 0.7)} 0a${f(ri * 0.35)} ${f(ri * 0.35)} 0 1 0 ${f(-ri * 0.7)} 0Z`
}

/* ── Kerala ────────────────────────────────────────────────────────────── */
export function kerala() {
  const r = sceneRng('kerala')
  const palm = (x: number, y: number, h: number, lean: number) => {
    const tx = x + lean
    const ty = y - h
    const trunk = `M${x - 5} ${y}Q${f(x + lean * 0.3)} ${f(y - h * 0.5)} ${f(tx - 2)} ${f(ty)}L${f(tx + 2)} ${f(ty)}Q${f(x + lean * 0.3 + 6)} ${f(y - h * 0.5)} ${x + 5} ${y}Z`
    let fronds = ''
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI + (k / 8) * Math.PI + (r() - 0.5) * 0.2
      const len = h * (0.36 + r() * 0.12)
      const ex = tx + Math.cos(a) * len
      const ey = ty + Math.sin(a) * len * 0.5 + len * 0.36
      const mx = tx + Math.cos(a) * len * 0.5
      const my = ty - len * 0.22 + Math.sin(a) * len * 0.15
      fronds += `M${f(tx)} ${f(ty)}Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}Q${f(mx + 4)} ${f(my + 10)} ${f(tx)} ${f(ty + 4)}Z`
    }
    return { trunk, fronds, nuts: { x: f(tx), y: f(ty + 6) } }
  }
  return {
    hills: [hills(r, 170, 24, 2, 0.4), hills(r, 196, 16, 3, 0.35)],
    paddy: [`M0 206 H${GW} V222 H0 Z`, `M0 222 H${GW} V232 H0 Z`],
    water: `M0 236 H${GW} V${GH} H0 Z`,
    ripples: Array.from({ length: 26 }, () => {
      const x = r() * GW
      const y = 250 + r() * 60
      const w = 30 + r() * 60
      return `M${f(x)} ${f(y)}h${f(w)}`
    }).join(''),
    bank: `M${GW} 236 Q1400 222 1120 236 Q1300 254 ${GW} 256 Z`,
    palms: [palm(1180, 244, 130, 50), palm(1500, 248, 200, -80), palm(1400, 242, 150, -30), palm(1560, 246, 120, -20), palm(1290, 240, 110, 30)],
    reflections: [palm(1500, 248, 200, -80), palm(1400, 242, 150, -30)],
    boat: {
      hull: 'M-120 0 Q-110 18 -60 22 L60 22 Q110 18 124 -4 Q100 6 60 6 L-60 6 Q-100 6 -120 0 Z',
      roof: 'M-70 6 Q-70 -34 0 -38 Q70 -34 70 6 Z',
      ribs: 'M-46 6 V-26 M-22 6 V-34 M0 6 V-37 M22 6 V-34 M46 6 V-26',
    },
    canoe: 'M-46 0 Q0 10 46 0 Q0 4 -46 0 Z M-6 0 V-16 M-6 -20 a4 4 0 1 0 0.1 0 M-6 -10 L18 -2',
    egrets: Array.from({ length: 4 }, (_, k) => ({ x: f(460 + k * 60 + r() * 40), y: f(260 + r() * 60), s: f(0.9 + r() * 0.5), d: f(k * 0.4) })),
    clouds: [cloud(240, 150, 240), cloud(980, 110, 300)],
    stars: stars(r, 80, 500),
  }
}

/* ── Cosmos ────────────────────────────────────────────────────────────── */
export function cosmos() {
  const r = sceneRng('cosmos')
  const craters = Array.from({ length: 14 }, () => ({ cx: f(r() * GW), cy: f(250 + r() * 60), rx: f(16 + r() * 40), ry: f(4 + r() * 6) }))
  return {
    stars: stars(r, 220, 940),
    shooting: [{ x: 360, y: 160, d: 2 }, { x: 1080, y: 320, d: 9 }, { x: 640, y: 80, d: 15 }],
    comet: { x: 220, y: 300 },
    galaxy: { x: 760, y: 220 },
    small: [{ cx: 520, cy: 520, r: 26, c: 1 }, { cx: 1420, cy: 640, r: 14, c: 2 }],
    ground: `M0 ${GH} V250 Q${GW / 2} 130 ${GW} 250 V${GH} Z`,
    craters,
    flag: 'M1180 196 V150 M1181 150 h30 v18 h-30',
  }
}

/* ── Ghats ─────────────────────────────────────────────────────────────── */
export function ghats() {
  const r = sceneRng('ghats')
  // Temple spires (shikhara): a tall curved spire with a pot on top.
  const shikhara = (x: number, base: number, h: number, w: number) =>
    `M${x - w / 2} ${base}C${x - w / 2} ${base - h * 0.55} ${x - w * 0.18} ${base - h * 0.85} ${x} ${base - h}C${x + w * 0.18} ${base - h * 0.85} ${x + w / 2} ${base - h * 0.55} ${x + w / 2} ${base}Z M${x - 4} ${base - h}a4 4 0 1 1 8 0Z M${x - 0.8} ${base - h - 4}V${base - h - 22}`
  const flagAt = (x: number, base: number, h: number) => `M${x} ${base - h - 22}l16 5l-16 5Z`
  const spires = [
    { x: 860, h: 110, w: 54 }, { x: 980, h: 170, w: 80 }, { x: 1060, h: 112, w: 52 }, { x: 1240, h: 128, w: 60 }, { x: 1320, h: 150, w: 68 }, { x: 1500, h: 104, w: 50 },
  ]
  const base = 176
  let town = ''
  for (let x = 0; x < GW; ) {
    const w = 50 + r() * 80
    const h = (30 + r() * 50) * (x < 760 ? 0.45 : 1)
    town += `M${f(x)} ${base}V${f(base - h)}H${f(x + w)}V${base}Z`
    if (r() < 0.35) town += `M${f(x + w / 2 - 14)} ${f(base - h)}a14 14 0 0 1 28 0Z`
    x += w
  }
  const steps = Array.from({ length: 8 }, (_, k) => `M0 ${base + 6 + k * 6}H${GW}`).join('')
  const umbrellas = Array.from({ length: 7 }, (_, k) => {
    const x = 140 + k * 210 + r() * 60
    const y = base + 30
    return { x: f(x), y: f(y), w: f(26 + r() * 10) }
  })
  const diyas = Array.from({ length: 14 }, () => ({ y: f(250 + r() * 56), t: f(60 + r() * 50), d: f(-r() * 100), s: f(0.8 + r() * 0.5) }))
  return {
    spires: spires.map((s) => shikhara(s.x, base, s.h, s.w)).join(' '),
    flags: spires.map((s) => flagAt(s.x, base, s.h)).join(' '),
    town, steps, umbrellas, diyas,
    water: `M0 236 H${GW} V${GH} H0 Z`,
    ripples: Array.from({ length: 24 }, () => `M${f(r() * GW)} ${f(246 + r() * 66)}h${f(20 + r() * 50)}`).join(''),
    boats: [{ x: 420, y: 270, t: 140, d: -20 }, { x: 1100, y: 296, t: 180, d: -100 }],
    kites: [{ x: 1420, y: 430, s: 1 }, { x: 1180, y: 220, s: 0.8 }],
    birds: Array.from({ length: 6 }, (_, k) => ({ x: f(560 + k * 50 + r() * 30), y: f(250 + r() * 60), s: f(0.7 + r() * 0.5), d: f(k * 0.3) })),
    stars: stars(r, 80, 460),
  }
}

export const SCENE_IDS = ['himalaya', 'aurora', 'sakura', 'thar', 'warli', 'reef', 'bauhaus', 'arcade', 'blueprint', 'kerala', 'cosmos', 'ghats'] as const
export type SceneId = (typeof SCENE_IDS)[number]
