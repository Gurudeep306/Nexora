import { useEffect, useRef } from 'react'

/**
 * The sign-in backdrop: a quiet field of points joined into a graph, drawn in
 * the theme's own ink. Every few seconds a breadth-first search starts from a
 * random vertex and its frontier ripples outward, lighting edges as they are
 * reached, then fades — the idea NexoraGuru teaches, used as texture.
 *
 * One canvas, no libraries. It pauses when the tab is hidden, follows the
 * theme (colours are read from the CSS roles), and under reduced motion draws
 * a single still frame.
 */
type Node = { x: number; y: number; adj: number[] }
type Wave = { start: number; dist: Map<number, number>; parent: Map<number, number> }

const STEP = 150 // ms per BFS layer
const HOLD = 1400 // ms an edge stays lit after it is reached
const FADE = 1600 // ms to fade out

function readInk() {
  const cs = getComputedStyle(document.documentElement)
  return {
    ink: cs.getPropertyValue('--color-text-primary').trim() || '#e5e7eb',
    accent: cs.getPropertyValue('--color-accent-brand').trim() || '#5b8cff',
    light: document.documentElement.getAttribute('data-mode') === 'light',
  }
}

function build(w: number, h: number): Node[] {
  const gap = w < 640 ? 64 : 92
  const cols = Math.ceil(w / gap) + 2
  const rows = Math.ceil(h / gap) + 2
  const nodes: Node[] = []
  const id = (c: number, r: number) => r * cols + c
  // Deterministic jitter so the field doesn't reshuffle on every resize.
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      nodes.push({ x: (c - 1) * gap + (rnd() - 0.5) * gap * 0.62, y: (r - 1) * gap + (rnd() - 0.5) * gap * 0.62, adj: [] })
  const link = (a: number, b: number) => {
    nodes[a].adj.push(b)
    nodes[b].adj.push(a)
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols && rnd() < 0.72) link(id(c, r), id(c + 1, r))
      if (r + 1 < rows && rnd() < 0.72) link(id(c, r), id(c, r + 1))
      if (c + 1 < cols && r + 1 < rows && rnd() < 0.22) link(id(c, r), id(c + 1, r + 1))
    }
  return nodes
}

function bfs(nodes: Node[], src: number): Pick<Wave, 'dist' | 'parent'> {
  const dist = new Map<number, number>([[src, 0]])
  const parent = new Map<number, number>()
  const q = [src]
  for (let i = 0; i < q.length; i++) {
    const u = q[i]
    const d = dist.get(u)!
    if (d >= 9) continue // a ripple, not a flood
    for (const v of nodes[u].adj)
      if (!dist.has(v)) {
        dist.set(v, d + 1)
        parent.set(v, u)
        q.push(v)
      }
  }
  return { dist, parent }
}

export function GraphField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let ink = readInk()
    let nodes: Node[] = []
    let waves: Wave[] = []
    let w = 0
    let h = 0
    let raf = 0
    let nextWave = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      nodes = build(w, h)
      waves = []
      nextWave = 0
    }

    const spawn = (now: number) => {
      // Start somewhere away from the centre, where the form sits.
      let src = 0
      for (let tries = 0; tries < 20; tries++) {
        src = Math.floor(Math.random() * nodes.length)
        const n = nodes[src]
        const dx = (n.x - w / 2) / w
        const dy = (n.y - h / 2) / h
        if (dx * dx + dy * dy > 0.06 && nodes[src].adj.length) break
      }
      waves.push({ start: now, ...bfs(nodes, src) })
    }

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h)
      const base = ink.light ? 0.07 : 0.065
      // Every edge, faintly.
      ctx.strokeStyle = ink.ink
      ctx.lineWidth = 1
      ctx.globalAlpha = base
      ctx.beginPath()
      nodes.forEach((n, i) => {
        for (const j of n.adj)
          if (j > i) {
            ctx.moveTo(n.x, n.y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
          }
      })
      ctx.stroke()
      // Vertices.
      ctx.fillStyle = ink.ink
      ctx.globalAlpha = base * 2.2
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
      // Search frontiers: tree edges light up in BFS order, then fade.
      for (const wv of waves) {
        const t = now - wv.start
        for (const [v, d] of wv.dist) {
          const reached = d * STEP
          const age = t - reached
          if (age < 0) continue
          const life = age < HOLD ? 1 : Math.max(0, 1 - (age - HOLD) / FADE)
          if (life <= 0) continue
          const u = wv.parent.get(v)
          const grow = Math.min(1, age / STEP)
          if (u !== undefined) {
            const a = nodes[u]
            const b = nodes[v]
            ctx.strokeStyle = ink.accent
            ctx.globalAlpha = 0.55 * life * (1 - d / 12)
            ctx.lineWidth = 1.4
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(a.x + (b.x - a.x) * grow, a.y + (b.y - a.y) * grow)
            ctx.stroke()
          }
          if (grow >= 1) {
            const n = nodes[v]
            ctx.fillStyle = d === 0 ? ink.accent : ink.ink
            ctx.globalAlpha = (d === 0 ? 0.9 : 0.45) * life * (1 - d / 12)
            ctx.beginPath()
            ctx.arc(n.x, n.y, d === 0 ? 3 : 2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      if (now >= nextWave) {
        spawn(now)
        nextWave = now + 2600 + Math.random() * 1800
      }
      waves = waves.filter((wv) => now - wv.start < 10 * STEP + HOLD + FADE)
      draw(now)
      raf = requestAnimationFrame(frame)
    }

    resize()
    if (still) {
      spawn(0)
      draw(9 * STEP + 200)
    } else raf = requestAnimationFrame(frame)

    const ro = new ResizeObserver(() => {
      resize()
      if (still) {
        spawn(0)
        draw(9 * STEP + 200)
      }
    })
    ro.observe(canvas)
    const mo = new MutationObserver(() => {
      ink = readInk()
      if (still) draw(9 * STEP + 200)
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-palette', 'data-accent'] })
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !still) raf = requestAnimationFrame(frame)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className={className} />
}
