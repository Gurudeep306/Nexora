/**
 * Motion for the Traversal mark. Lazy-loaded by Logo.tsx, so the static SVG
 * paints first and this only takes over once it has arrived.
 *
 * - intro: the search runs from the source node; edges draw in BFS order,
 *   nodes pop as they are reached, and a signal rides the frontier (it splits
 *   at the junction).
 * - hover: a signal runs both routes again.
 * - idle: a faint signal every 10–16 s (skipped while hidden or hovered).
 * The final frame is identical to the static mark, so handing over is seamless.
 */
import { BEADS, DIST, EDGES, GLYPH_D, NODES, ROUTES, weights, type NodeId } from './traversal'

const NS = 'http://www.w3.org/2000/svg'
const SPEED = 46 // grid units per second while drawing
let uid = 0

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element) {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  parent.appendChild(e)
  return e
}

export interface TraversalFxOptions {
  size: number
  intro?: boolean
  /** Replay the intro on click (off where the logo is a home link). */
  replayOnClick?: boolean
}

export function mountTraversal(host: HTMLElement, opts: TraversalFxOptions): () => void {
  const id = `ngfx${++uid}`
  const w = weights(opts.size <= 24)
  const svg = document.createElementNS(NS, 'svg')
  for (const [k, v] of Object.entries({ viewBox: '0 0 32 32', width: opts.size, height: opts.size, 'aria-hidden': 'true', focusable: 'false' }))
    svg.setAttribute(k, String(v))
  svg.style.overflow = 'visible'
  svg.style.display = 'block'
  const defs = el('defs', {}, svg)
  const grad = el('linearGradient', { id: `${id}g`, gradientUnits: 'userSpaceOnUse', x1: 5, y1: 27, x2: 27, y2: 5 }, defs)
  ;[['0', '--ng-c1'], ['.55', '--ng-c2'], ['1', '--ng-c3']].forEach(([o, v]) => el('stop', { offset: o, style: `stop-color:var(${v})` }, grad))
  const blur = el('filter', { id: `${id}b`, x: '-200%', y: '-200%', width: '500%', height: '500%' }, defs)
  el('feGaussianBlur', { stdDeviation: 1.1 }, blur)
  const paint = `url(#${id}g)`

  el('path', { d: GLYPH_D, fill: 'none', stroke: 'var(--ng-dim)', 'stroke-width': w.stroke, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg)
  const edges = EDGES.map(([a, b]) => ({
    a, b,
    el: el('path', { d: `M${NODES[a].join(' ')}L${NODES[b].join(' ')}`, pathLength: 1, fill: 'none', stroke: paint, 'stroke-width': w.stroke, 'stroke-linecap': 'round' }, svg),
  }))
  const beads = BEADS.map((n) => ({
    n,
    el: el('circle', { cx: NODES[n][0], cy: NODES[n][1], r: w.bead, fill: paint, style: 'transform-box:fill-box;transform-origin:center' }, svg),
  }))
  const pulses = ROUTES.map(() => {
    const g = el('g', { opacity: 0 }, svg)
    el('circle', { r: 3.1, fill: 'var(--ng-c3)', filter: `url(#${id}b)`, opacity: 0.9 }, g)
    el('circle', { r: 1.2, fill: '#fff' }, g)
    return g
  })
  host.replaceChildren(svg)

  let raf = 0
  let running = false
  function signal(speed: number, alpha: number) {
    if (running) return
    running = true
    const ends = ROUTES.map((r) => DIST[r[r.length - 1]])
    const total = Math.max(...ends)
    const t0 = performance.now()
    const tick = (now: number) => {
      const d = ((now - t0) / 1000) * speed
      ROUTES.forEach((rt, i) => {
        const end = ends[i]
        const dd = Math.min(d, end)
        let k = 1
        while (k < rt.length - 1 && DIST[rt[k]] < dd) k++
        const p = NODES[rt[k - 1] as NodeId], q = NODES[rt[k] as NodeId]
        const span = DIST[rt[k]] - DIST[rt[k - 1]]
        const f = Math.min(1, Math.max(0, (dd - DIST[rt[k - 1]]) / span))
        const fade = d > end ? Math.max(0, 1 - (d - end) / 6) : Math.min(1, d / 3)
        pulses[i].setAttribute('transform', `translate(${(p[0] + (q[0] - p[0]) * f).toFixed(2)} ${(p[1] + (q[1] - p[1]) * f).toFixed(2)})`)
        pulses[i].setAttribute('opacity', (alpha * fade).toFixed(3))
      })
      if (d < total + 6) raf = requestAnimationFrame(tick)
      else running = false
    }
    raf = requestAnimationFrame(tick)
  }

  function intro() {
    for (const e of edges) {
      e.el.getAnimations().forEach((a) => a.cancel())
      e.el.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], {
        delay: (DIST[e.a] / SPEED) * 1000,
        duration: (Math.hypot(NODES[e.b][0] - NODES[e.a][0], NODES[e.b][1] - NODES[e.a][1]) / SPEED) * 1000,
        fill: 'backwards',
        easing: 'linear',
      })
    }
    for (const b of beads) {
      b.el.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.45)', offset: 0.6 }, { transform: 'scale(1)' }], {
        delay: (DIST[b.n] / SPEED) * 1000, duration: 380, fill: 'backwards', easing: 'ease-out',
      })
    }
    cancelAnimationFrame(raf)
    running = false
    signal(SPEED, 1)
  }

  const onEnter = () => signal(68, 1)
  const onClick = () => intro()
  host.addEventListener('pointerenter', onEnter)
  if (opts.replayOnClick) host.addEventListener('click', onClick)
  if (opts.intro) intro()

  let idle = 0
  const schedule = () => {
    idle = window.setTimeout(() => {
      if (!document.hidden && !host.matches(':hover')) signal(30, 0.55)
      schedule()
    }, 10000 + Math.random() * 6000)
  }
  schedule()

  return () => {
    clearTimeout(idle)
    cancelAnimationFrame(raf)
    host.removeEventListener('pointerenter', onEnter)
    host.removeEventListener('click', onClick)
  }
}
