/**
 * NexoraGuru logo concepts, round 3 — interactive NG marks built from CS ideas.
 *
 * Framework-agnostic DOM engine: `mountNgMark(host, concept, options)` renders
 * one concept into `host` and wires its motion; it returns a cleanup function.
 * The React wrapper (../NgConceptMark.tsx) lazy-imports this module, and the
 * standalone preview (docs/brand/concepts-v3/preview.html) bundles it as is,
 * so both always show the same thing.
 *
 * Every concept has:
 *   - a crisp static form (also used at ≤ 24 px and under prefers-reduced-motion),
 *   - an intro on mount, a pointer reaction, click/tap replay and a subtle idle.
 *
 * Colours are CSS custom properties, so the mark follows the app's theme:
 *   --ng-c1 (defaults to the theme accent), --ng-c2 violet, --ng-c3 teal,
 *   --ng-ink (defaults to the theme's primary text colour).
 * All artwork sits on a 32-unit grid.
 */

export type NgConcept = 'traversal' | 'build' | 'caret' | 'depth'

export interface NgMountOptions {
  /** Rendered size in CSS px. */
  size: number
  /** false → static mark. Defaults to size > 24. Reduced motion always means static. */
  animate?: boolean
  /** Play the intro on mount (default true). */
  intro?: boolean
}

export const NG_CONCEPTS: { id: NgConcept; name: string; story: string }[] = [
  { id: 'traversal', name: 'Traversal', story: 'N and G are one graph. A breadth-first search runs from the first node and splits at the junction, so the letters draw themselves the way an algorithm visits a graph.' },
  { id: 'build', name: 'Build', story: 'The letters are an array of cells pushed in order, column by column, like a stack being filled. Hover sends a ripple through the cells, and an idle scan walks the index.' },
  { id: 'caret', name: 'Caret', story: 'The mark types itself in. The cursor waits, types N, moves on, types G, then settles in as the G’s crossbar and keeps blinking. Hover selects the text.' },
  { id: 'depth', name: 'Depth', story: 'A glass NG ligature where N’s right stem is G’s spine. It is extruded in real CSS 3D, tilts toward the pointer while the highlight follows it, and spins when clicked.' },
]

const NS = 'http://www.w3.org/2000/svg'
let uid = 0

const CSS = `
.ng-mark{--ng-c1:var(--color-accent-brand,#4f7cff);--ng-c2:#8b5cf6;--ng-c3:#2dd4bf;--ng-ink:var(--color-text-primary,#e9e9ef);
  display:inline-block;position:relative;line-height:0;vertical-align:middle;-webkit-tap-highlight-color:transparent}
.ng-mark svg{display:block;overflow:visible}
.ng-mark .ng-dim{stroke:color-mix(in oklab,var(--ng-ink) 16%,transparent)}
.ng-mark .ng-cell,.ng-mark .ng-fx{transform-box:fill-box;transform-origin:center}
.ng-mark .ng-cell{transition:transform .14s ease-out}
.ng-mark .ng-sel{transition:opacity .18s ease}
.ng-mark .ng-blink{animation:ng-blink 1.15s steps(2,jump-none) infinite}
.ng-mark.ng-hot .ng-blink{animation-duration:.5s}
@keyframes ng-blink{0%,55%{opacity:1}56%,100%{opacity:.18}}
.ng-mark .ng3d-scene{position:absolute;inset:0}
.ng-mark .ng3d-obj{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}
.ng-mark .ng3d-obj svg{position:absolute;inset:0;width:100%;height:100%;backface-visibility:visible}
.ng-mark .ng3d-shadow{position:absolute;left:18%;right:18%;bottom:2%;height:12%;border-radius:50%;
  background:radial-gradient(closest-side,color-mix(in oklab,var(--ng-c2) 40%,transparent),transparent);filter:blur(6px);opacity:.7}
`

function ensureStyles(doc: Document) {
  if (doc.getElementById('ng-mark-styles')) return
  const s = doc.createElement('style')
  s.id = 'ng-mark-styles'
  s.textContent = CSS
  doc.head.appendChild(s)
}

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

type Attrs = Record<string, string | number>
function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  if (parent) parent.appendChild(e)
  return e
}

function root(size: number, parent: Element) {
  return svgEl('svg', { viewBox: '0 0 32 32', width: size, height: size, 'aria-hidden': 'true', focusable: 'false' }, parent)
}

/** The brand ramp (accent → violet → teal) as a user-space gradient across the grid. */
function ramp(defs: Element, id: string, x1 = 4, y1 = 27, x2 = 28, y2 = 5) {
  const g = svgEl('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1, y1, x2, y2 }, defs)
  ;[['0', '--ng-c1'], ['.55', '--ng-c2'], ['1', '--ng-c3']].forEach(([o, v]) => {
    svgEl('stop', { offset: o, style: `stop-color:var(${v})` }, g)
  })
  return `url(#${id})`
}

function glowFilter(defs: Element, id: string, sd = 1.1) {
  const f = svgEl('filter', { id, x: '-200%', y: '-200%', width: '500%', height: '500%' }, defs)
  svgEl('feGaussianBlur', { stdDeviation: sd }, f)
  return `url(#${id})`
}

interface Concept {
  intro(): void
  replay(): void
  idle(): void
  move(x: number, y: number): void // pointer in 0..1 host coords
  enter(): void
  leave(): void
  destroy(): void
}

const NOOP: Omit<Concept, 'destroy'> = { intro() {}, replay() {}, idle() {}, move() {}, enter() {}, leave() {} }

/* ───────────────────────── 1 · Traversal ───────────────────────── */

const TP: Record<string, [number, number]> = {
  A: [7, 25], B: [7, 7], C: [15, 25], D: [15, 7], E: [25, 7], F: [25, 25], H: [25, 17], I: [20, 17],
}
const T_ROUTES = [['A', 'B', 'C', 'D', 'E'], ['A', 'B', 'C', 'F', 'H', 'I']]
const T_EDGES = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['C', 'F'], ['F', 'H'], ['H', 'I']]
const T_BEADS = ['A', 'C', 'E', 'I']
const dist = (a: [number, number], b: [number, number]) => Math.hypot(b[0] - a[0], b[1] - a[1])

function traversal(host: HTMLElement, size: number, live: boolean): Concept {
  const id = `ngt${++uid}`
  const svg = root(size, host)
  const defs = svgEl('defs', {}, svg)
  const grad = ramp(defs, `${id}g`)
  const glow = glowFilter(defs, `${id}f`)
  const w = size <= 24 ? 3.2 : 2.6

  // distance from the source node, along the BFS tree
  const at: Record<string, number> = { A: 0 }
  for (const route of T_ROUTES) for (let i = 1; i < route.length; i++) at[route[i]] = at[route[i - 1]] + dist(TP[route[i - 1]], TP[route[i]])

  if (live) svgEl('path', { d: 'M7 25V7L15 25V7H25M15 25H25V17H20', class: 'ng-dim', fill: 'none', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg)
  const edges = T_EDGES.map(([a, b]) => ({
    a, b,
    el: svgEl('path', { d: `M${TP[a].join(' ')}L${TP[b].join(' ')}`, pathLength: 1, fill: 'none', stroke: grad, 'stroke-width': w, 'stroke-linecap': 'round' }, svg),
  }))
  const beads = T_BEADS.map((k) => ({ k, el: svgEl('circle', { cx: TP[k][0], cy: TP[k][1], r: 2.15, fill: grad, class: 'ng-fx' }, svg) }))
  const pulses = T_ROUTES.map(() => {
    const g = svgEl('g', { opacity: 0 }, svg)
    svgEl('circle', { r: 3.2, fill: 'var(--ng-c3)', filter: glow, opacity: 0.9 }, g)
    svgEl('circle', { r: 1.25, fill: '#fff' }, g)
    return g
  })

  let raf = 0
  let running = false
  /** Run the signal along both branches; `speed` in grid units per second. */
  function pulse(speed: number, alpha = 1) {
    if (running) return
    running = true
    const total = Math.max(...T_ROUTES.map((rt) => at[rt[rt.length - 1]]))
    const t0 = performance.now()
    const tick = (now: number) => {
      const d = ((now - t0) / 1000) * speed
      T_ROUTES.forEach((rt, i) => {
        const end = at[rt[rt.length - 1]]
        const dd = Math.min(d, end)
        let k = 1
        while (k < rt.length - 1 && at[rt[k]] < dd) k++
        const p = TP[rt[k - 1]], q = TP[rt[k]]
        const f = Math.min(1, Math.max(0, (dd - at[rt[k - 1]]) / (at[rt[k]] - at[rt[k - 1]])))
        const fade = d > end ? Math.max(0, 1 - (d - end) / 6) : Math.min(1, d / 3)
        pulses[i].setAttribute('transform', `translate(${p[0] + (q[0] - p[0]) * f} ${p[1] + (q[1] - p[1]) * f})`)
        pulses[i].setAttribute('opacity', String(alpha * fade))
      })
      if (d < total + 6) raf = requestAnimationFrame(tick)
      else running = false
    }
    raf = requestAnimationFrame(tick)
  }

  const SPEED = 46
  return {
    intro() {
      for (const e of edges) {
        e.el.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], {
          delay: (at[e.a] / SPEED) * 1000, duration: (dist(TP[e.a], TP[e.b]) / SPEED) * 1000, fill: 'backwards', easing: 'linear',
        })
      }
      for (const b of beads) {
        b.el.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.5)', offset: 0.6 }, { transform: 'scale(1)' }], {
          delay: (at[b.k] / SPEED) * 1000, duration: 380, fill: 'backwards', easing: 'ease-out',
        })
      }
      cancelAnimationFrame(raf)
      running = false
      pulse(SPEED)
    },
    replay() { this.intro() },
    idle() { pulse(34, 0.65) },
    enter() { pulse(70) },
    move() {},
    leave() {},
    destroy() { cancelAnimationFrame(raf) },
  }
}

/* ───────────────────────── 2 · Build ───────────────────────── */

const B_MAP = [
  'X..X.' + '.XXX',
  'XX.X.' + 'X...',
  'X.XX.' + 'X.XX',
  'X..X.' + 'X..X',
  'X..X.' + '.XXX',
]

function build(host: HTMLElement, size: number, live: boolean): Concept {
  const id = `ngb${++uid}`
  const svg = root(size, host)
  const defs = svgEl('defs', {}, svg)
  const grad = ramp(defs, `${id}g`)
  const pitch = 3.15
  const gap = size <= 24 ? 0.35 : 0.55
  const cols = B_MAP[0].length, rows = B_MAP.length
  const x0 = (32 - cols * pitch) / 2, y0 = (32 - rows * pitch) / 2
  const cells: { el: SVGRectElement; fx: SVGRectElement; cx: number; cy: number }[] = []
  // push order: column by column, bottom of the stack first
  for (let c = 0; c < cols; c++) for (let r = rows - 1; r >= 0; r--) {
    if (B_MAP[r][c] !== 'X') continue
    const x = x0 + c * pitch + gap / 2, y = y0 + r * pitch + gap / 2, s = pitch - gap
    const el = svgEl('rect', { x, y, width: s, height: s, rx: s * 0.28, fill: grad, class: 'ng-cell' }, svg)
    const fx = svgEl('rect', { x, y, width: s, height: s, rx: s * 0.28, fill: '#fff', opacity: 0, class: 'ng-fx', 'pointer-events': 'none' }, svg)
    cells.push({ el, fx, cx: x + s / 2, cy: y + s / 2 })
  }
  if (!live) return { ...NOOP, destroy() {} }

  let timer = 0
  const STEP = 34
  function intro() {
    cells.forEach((c, i) => {
      c.el.animate([{ transform: 'translateY(-9px) scale(.55)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], {
        delay: i * STEP, duration: 460, fill: 'backwards', easing: 'cubic-bezier(.34,1.56,.64,1)',
      })
      // the just-pushed cell flashes white, like the write head of an array
      c.fx.animate([
        { transform: 'translateY(-9px) scale(.55)', opacity: 0 },
        { transform: 'translateY(-1px) scale(.95)', opacity: 0.9, offset: 0.35 },
        { transform: 'translateY(0) scale(1)', opacity: 0 },
      ], { delay: i * STEP, duration: 520, easing: 'ease-out' })
    })
  }
  return {
    intro,
    replay() {
      clearTimeout(timer)
      const n = cells.length
      cells.forEach((c, i) => c.el.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0)', opacity: 0 }], {
        delay: (n - 1 - i) * 10, duration: 170, fill: 'forwards', easing: 'ease-in',
      }))
      timer = window.setTimeout(() => {
        cells.forEach((c) => c.el.getAnimations().forEach((a) => a.cancel()))
        intro()
      }, n * 10 + 190)
    },
    idle() {
      cells.forEach((c, i) => c.fx.animate([{ opacity: 0 }, { opacity: 0.4 }, { opacity: 0 }], { delay: i * 45, duration: 360, easing: 'ease-in-out' }))
    },
    move(x, y) {
      const px = x * 32, py = y * 32
      for (const c of cells) {
        const d2 = (c.cx - px) ** 2 + (c.cy - py) ** 2
        const k = Math.exp(-d2 / 22)
        c.el.style.transform = `translate(${((c.cx - px) * k * 0.12).toFixed(2)}px, ${((c.cy - py) * k * 0.12).toFixed(2)}px) scale(${(1 + 0.32 * k).toFixed(3)})`
      }
    },
    enter() {},
    leave() { for (const c of cells) c.el.style.transform = '' },
    destroy() { clearTimeout(timer) },
  }
}

/* ───────────────────────── 3 · Caret ───────────────────────── */

function caret(host: HTMLElement, size: number, live: boolean): Concept {
  const id = `ngc${++uid}`
  const svg = root(size, host)
  const defs = svgEl('defs', {}, svg)
  const grad = ramp(defs, `${id}g`, 21, 18, 30, 14)
  const w = size <= 24 ? 3.2 : 2.8
  const g = svgEl('g', { transform: 'translate(-.75 0)' }, svg)
  const sel = svgEl('rect', { x: 2, y: 6.2, width: 29.5, height: 19.6, rx: 3, fill: 'var(--ng-c1)', opacity: 0, class: 'ng-sel' }, g)
  const cx = 21.5, cy = 16, R = 7.5
  const a = (-40 * Math.PI) / 180
  const n = svgEl('path', { d: 'M4.5 23.5V8.5L11.5 23.5V8.5', pathLength: 1, fill: 'none', stroke: 'var(--ng-ink)', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g)
  const gg = svgEl('path', {
    d: `M${(cx + R * Math.cos(a)).toFixed(2)} ${(cy + R * Math.sin(a)).toFixed(2)}A${R} ${R} 0 1 0 ${cx + R} ${cy}`,
    pathLength: 1, fill: 'none', stroke: 'var(--ng-ink)', 'stroke-width': w, 'stroke-linecap': 'round',
  }, g)
  const cur = svgEl('rect', { x: 22, y: 16 - w / 2, width: 7.5 + w / 2, height: w, rx: w / 2, fill: grad, class: 'ng-fx' }, g)
  if (!live) return { ...NOOP, destroy() {} }

  const draw = (el: SVGElement, delay: number, duration: number, back = false) =>
    el.animate([{ strokeDasharray: '1 1', strokeDashoffset: back ? 0 : 1 }, { strokeDasharray: '1 1', strokeDashoffset: back ? 1 : 0 }], {
      delay, duration, fill: back ? 'forwards' : 'backwards', easing: 'cubic-bezier(.5,0,.3,1)',
    })
  let timer = 0
  function intro() {
    cur.classList.remove('ng-blink')
    for (const el of [n, gg, cur]) el.getAnimations().forEach((x) => x.cancel())
    draw(n, 560, 300)
    draw(gg, 1000, 420)
    cur.animate([
      { transform: 'translate(-17.6px,8.2px)', offset: 0 },
      { transform: 'translate(-17.6px,8.2px)', offset: 0.36 },
      { transform: 'translate(-8.4px,8.2px)', offset: 0.5, easing: 'cubic-bezier(.5,0,.2,1)' },
      { transform: 'translate(-8.4px,8.2px)', offset: 0.8 },
      { transform: 'translate(0,0)', offset: 1 },
    ], { duration: 1650, fill: 'backwards', easing: 'cubic-bezier(.5,0,.2,1)' })
    cur.animate([{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }], { duration: 560, easing: 'steps(1)' })
    clearTimeout(timer)
    timer = window.setTimeout(() => cur.classList.add('ng-blink'), 1700)
  }
  return {
    intro,
    replay() {
      clearTimeout(timer)
      cur.classList.remove('ng-blink')
      draw(gg, 0, 200, true)
      draw(n, 180, 200, true)
      timer = window.setTimeout(intro, 440)
    },
    idle() {},
    move() {},
    enter() { host.classList.add('ng-hot'); sel.setAttribute('opacity', '.16') },
    leave() { host.classList.remove('ng-hot'); sel.setAttribute('opacity', '0') },
    destroy() { clearTimeout(timer) },
  }
}

/* ───────────────────────── 4 · Depth ───────────────────────── */

const D_GLYPH = 'M6 24V8L14.5 24M26 8H18.5Q14.5 8 14.5 12V24H22Q26 24 26 20V17H20.5'

function depth(host: HTMLElement, size: number, live: boolean): Concept {
  const id = `ngd${++uid}`
  const sw = 4.2
  if (!live) {
    // static: the face plus two offset back plates for implied depth (flat at small sizes)
    const svg = root(size, host)
    const defs = svgEl('defs', {}, svg)
    const grad = ramp(defs, `${id}g`)
    if (size > 24) {
      for (const k of [2, 1]) svgEl('path', { d: D_GLYPH, transform: `translate(${0.45 * k} ${0.6 * k})`, fill: 'none', stroke: `color-mix(in oklab,var(--ng-c2) ${55 - k * 12}%,#05060c)`, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg)
    }
    svgEl('path', { d: D_GLYPH, fill: 'none', stroke: grad, 'stroke-width': size <= 24 ? 4.4 : sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg)
    return { ...NOOP, destroy() {} }
  }

  host.style.width = host.style.height = `${size}px`
  const shadow = document.createElement('div')
  shadow.className = 'ng3d-shadow'
  const scene = document.createElement('div')
  scene.className = 'ng3d-scene'
  scene.style.perspective = `${size * 3.2}px`
  const obj = document.createElement('div')
  obj.className = 'ng3d-obj'
  host.append(shadow, scene)
  scene.appendChild(obj)

  const LAYERS = size >= 120 ? 12 : 7
  const depthPx = size * 0.085
  const layers: HTMLElement[] = []
  for (let k = LAYERS; k >= 1; k--) {
    const s = root(size, obj)
    svgEl('path', { d: D_GLYPH, fill: 'none', stroke: `color-mix(in oklab,var(--ng-c2) ${Math.round(62 - (k / LAYERS) * 34)}%,#04050b)`, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s)
    ;(s as unknown as HTMLElement).dataset.k = String(k)
    layers.push(s as unknown as HTMLElement)
  }
  const front = root(size, obj)
  const defs = svgEl('defs', {}, front)
  const grad = ramp(defs, `${id}g`)
  const spec = svgEl('radialGradient', { id: `${id}s`, gradientUnits: 'userSpaceOnUse', cx: 10, cy: 8, r: 11 }, defs)
  svgEl('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.75 }, spec)
  svgEl('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, spec)
  const P = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }
  svgEl('path', { d: D_GLYPH, ...P, stroke: grad, 'stroke-width': sw, opacity: 0.94 }, front)
  svgEl('path', { d: D_GLYPH, ...P, stroke: `url(#${id}s)`, 'stroke-width': sw }, front)
  svgEl('path', { d: D_GLYPH, ...P, stroke: '#fff', 'stroke-opacity': 0.4, 'stroke-width': 0.7, transform: 'translate(-.55 -.75)' }, front)

  // state, eased every frame toward its target
  const st = { rx: 0, ry: 0, hover: false, tx: 0, ty: 0, introT: 1, spinT: 1 }
  let raf = 0
  // until the mark has been on screen once, hold the intro so it plays when first seen
  let visible = typeof IntersectionObserver !== 'function'
  let seen = visible
  const t0 = performance.now()
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)
  let introStart = 0, spinStart = 0
  let wantIntro = false

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    if (!visible) {
      if (!seen && wantIntro) introStart = now
      return
    }
    seen = true
    const time = (now - t0) / 1000
    st.introT = Math.min(1, (now - introStart) / 1300)
    st.spinT = Math.min(1, (now - spinStart) / 950)
    const it = ease(st.introT)
    const idleX = Math.cos(time * 0.55) * 6, idleY = Math.sin(time * 0.7) * 9
    const goalX = st.hover ? st.ty * -26 : idleX
    const goalY = st.hover ? st.tx * 34 : idleY
    st.rx += (goalX - st.rx) * 0.12
    st.ry += (goalY - st.ry) * 0.12
    const rx = st.rx * it + (1 - it) * 68
    const spinDeg = st.spinT < 1 ? 360 * ease(st.spinT) : 0
    const ry = st.ry * it + (1 - it) * -28 + spinDeg
    const sc = 0.75 + 0.25 * it
    obj.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`
    obj.style.opacity = String(Math.min(1, it * 1.6))
    const spread = it
    for (const l of layers) l.style.transform = `translateZ(${(-Number(l.dataset.k) * (depthPx / LAYERS) * spread).toFixed(2)}px)`
    shadow.style.transform = `translate(${(-ry * 0.25).toFixed(1)}px, 0) scaleX(${(1 - Math.abs(rx) / 160).toFixed(3)})`
    shadow.style.opacity = String(0.7 * it)
    // the highlight sits where the pointer (or an idle light) is
    const lx = st.hover ? (st.tx + 0.5) * 32 : 16 + Math.sin(time * 0.7) * 9
    const ly = st.hover ? (st.ty + 0.5) * 32 : 9 + Math.cos(time * 0.55) * 3
    spec.setAttribute('cx', lx.toFixed(2))
    spec.setAttribute('cy', ly.toFixed(2))
  }
  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    : null
  io?.observe(host)
  raf = requestAnimationFrame(frame)

  return {
    intro() { wantIntro = true; introStart = performance.now() },
    replay() { spinStart = performance.now() },
    idle() {},
    move(x, y) { st.tx = x - 0.5; st.ty = y - 0.5 },
    enter() { st.hover = true },
    leave() { st.hover = false },
    destroy() { cancelAnimationFrame(raf); io?.disconnect() },
  }
}

/* ───────────────────────── mount ───────────────────────── */

const FACTORIES: Record<NgConcept, (host: HTMLElement, size: number, live: boolean) => Concept> = { traversal, build, caret, depth }

export function mountNgMark(host: HTMLElement, concept: NgConcept, opts: NgMountOptions): () => void {
  ensureStyles(host.ownerDocument)
  host.classList.add('ng-mark')
  host.replaceChildren()
  const live = (opts.animate ?? opts.size > 24) && !prefersReducedMotion()
  const c = FACTORIES[concept](host, opts.size, live)
  if (!live) return () => { c.destroy(); host.replaceChildren() }

  const pos = (e: PointerEvent) => {
    const b = host.getBoundingClientRect()
    return [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height] as const
  }
  const onEnter = () => c.enter()
  const onMove = (e: PointerEvent) => { const [x, y] = pos(e); c.move(x, y) }
  const onLeave = () => c.leave()
  const onClick = () => c.replay()
  host.addEventListener('pointerenter', onEnter)
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerleave', onLeave)
  host.addEventListener('click', onClick)
  host.style.cursor = 'pointer'

  if (opts.intro !== false) c.intro()
  // subtle idle every 6–9 s, only while the tab is visible
  let idleTimer = 0
  const scheduleIdle = () => {
    idleTimer = window.setTimeout(() => {
      if (!document.hidden && !host.matches(':hover')) c.idle()
      scheduleIdle()
    }, 6000 + Math.random() * 3000)
  }
  scheduleIdle()

  return () => {
    clearTimeout(idleTimer)
    host.removeEventListener('pointerenter', onEnter)
    host.removeEventListener('pointermove', onMove)
    host.removeEventListener('pointerleave', onLeave)
    host.removeEventListener('click', onClick)
    host.style.cursor = ''
    c.destroy()
    host.replaceChildren()
  }
}
