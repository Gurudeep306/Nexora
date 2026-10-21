import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Crosshair, Expand, Maximize2, Minus, Plus, Shrink } from 'lucide-react'
import { Avatar, Button, RankGlyph } from '@/components/ui'
import { LogoMark } from '@/components/brand/Logo'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/icon/Icon'
import { nodeIcon } from './icons'
import { HitGrid, lineage, NODE, R, sectorAt, type RadialLayout } from './radial'
import type { RiftPlayer, WebCluster, WebNode, WebStream } from './types'

/*
 * The radial Nexus: the Rift Tree of every subject, grown outward from YOU.
 *
 * The look is the original Rift Tree's, drawn on one canvas so all of it
 * pans and zooms smoothly: zone bands tinted in the zone's colour (the
 * current one lit, locked ones faint), orbs with progress rings (mastered
 * lit in the zone colour with a check, open ones glass-tinted and pulsing,
 * locked ones quiet with a lock), S-curve links that leave from under a
 * skill's name (mastered glowing in the zone colour, open ones flowing,
 * locked hairlines), and the focus chain on hover or selection. At full
 * zoom an orb is exactly the original's size; names appear as you zoom in.
 *
 * Subjects are sectors, grouped into streams (each its own hue, a quiet
 * background and a rim arc with the stream's name). Inside the first ring,
 * curved connections join subjects that share prerequisites — bundled
 * through their streams, hairlines at rest, brighter and thicker the more
 * links they carry, coloured from the prerequisite subject to the
 * dependent one. Hover a subject and its connections light up with what it
 * needs and what it leads to; the rest dims. YOU are the emblem at the
 * centre. Click a name to open that subject's own tree, a sector to zoom
 * into it, a skill to see it. The zone rail sits beside the canvas.
 */

/** You, at the centre. */
export interface CoreInfo {
  player: RiftPlayer
  username: string
  displayName?: string
  avatarUrl?: string | null
  avatar?: string | null
  mastered: number
  total: number
  streak?: number
}

export interface Camera {
  x: number
  y: number
  k: number
  /** the view size it was taken at (a stale size means: fit again) */
  w?: number
  h?: number
}

const MAX_K = 1.6
const LABEL_BOTTOM = R + 40

interface Colors {
  border: string
  strong: string
  primary: string
  accent: string
  text: string
  muted: string
  surface2: string
  surface3: string
  app: string
}

/** Theme colours, resolved (the canvas cannot read CSS variables). */
function readColors(probe: HTMLElement): Colors {
  const get = (v: string) => {
    probe.style.color = `var(${v})`
    return getComputedStyle(probe).color
  }
  return {
    border: get('--color-border'),
    strong: get('--color-border-strong'),
    primary: get('--color-primary'),
    accent: get('--color-accent-brand'),
    text: get('--color-text-primary'),
    muted: get('--color-text-muted'),
    surface2: get('--color-bg-surface-2'),
    surface3: get('--color-bg-surface-3'),
    app: get('--color-bg-app'),
  }
}

interface Item {
  key: string
  cluster: WebCluster
  node: WebNode
  x: number
  y: number
  color: string
  /** same-subject prerequisites, then cross-subject ones */
  req: string[]
  cx: string[]
}

export function RadialWeb({
  clusters,
  layout,
  selected,
  onSelect,
  onOpenSubject,
  initialCamera,
  onCamera,
  streams,
  me,
}: {
  clusters: WebCluster[]
  streams: WebStream[]
  me: CoreInfo
  layout: RadialLayout
  selected: string | null
  onSelect: (key: string | null) => void
  onOpenSubject: (id: string) => void
  initialCamera?: Camera | null
  /** The camera as it moves (to come back to the same spot). */
  onCamera?: (cam: Camera) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const iconsRef = useRef<HTMLDivElement>(null)
  const coreRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)

  /* ── data bound to the layout ── */
  const items = useMemo(() => {
    const byKey = new Map<string, Item>()
    const index = new Map(layout.keys.map((k, i) => [k, i]))
    for (const c of clusters) {
      const zc = new Map(c.zones.map((z) => [z.level, z.color]))
      for (const n of c.nodes) {
        const key = `${c.id}:${n.id}`
        const i = index.get(key)
        if (i === undefined) continue
        byKey.set(key, {
          key,
          cluster: c,
          node: n,
          x: layout.xy[2 * i],
          y: layout.xy[2 * i + 1],
          color: zc.get(n.z) ?? '#6366f1',
          req: n.req.map((r) => `${c.id}:${r}`),
          cx: n.cx ?? [],
        })
      }
    }
    return byKey
  }, [clusters, layout])
  const prereqs = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const it of items.values()) m.set(it.key, [...it.req, ...it.cx].filter((k) => items.has(k)))
    return m
  }, [items])
  const iconNames = useMemo(() => [...new Set([...items.values()].map((it) => nodeIcon(it.node.i)))], [items])
  const sectorOf = useMemo(() => new Map(clusters.map((c) => [c.id, c])), [clusters])
  // Subject → subject connections: how many concept prerequisites cross.
  const subjectLinks = useMemo(() => {
    const w = new Map<string, number>()
    for (const c of clusters) {
      for (const n of c.nodes) {
        for (const x of n.cx ?? []) {
          const from = x.split(':')[0]
          if (from === c.id || !sectorOf.has(from)) continue
          const k = `${from}>${c.id}`
          w.set(k, (w.get(k) ?? 0) + 1)
        }
      }
    }
    const max = Math.max(1, ...w.values())
    return [...w].map(([k, n]) => {
      const [from, to] = k.split('>')
      return { from, to, n, t: n / max }
    })
  }, [clusters, sectorOf])
  const streamOf = useMemo(() => new Map(streams.map((x) => [x.id, x])), [streams])

  /* ── state the loop reads (refs: React never renders per frame) ── */
  // Everything in view, the stream names on the rim included.
  // Fit: the whole disc with its stream names, a little below the toolbar.
  const fit = (w: number, h: number): Camera => {
    const k = Math.min(w, h - 56) / (2 * (layout.extent + (w < 640 ? 170 : 320)))
    return { x: 0, y: -28 / k, k }
  }
  const cam = useRef<Camera>(initialCamera ?? { x: 0, y: 0, k: 0.05 })
  // Fit to the view on load and on every resize until the user pans or zooms.
  const userMoved = useRef(false)
  const initial = useRef(initialCamera ?? null)
  const hoverStream = useRef<string | null>(null)
  const streamHits = useRef<{ id: string; x: number; y: number; w: number; h: number }[]>([])
  const tiltRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState<'off' | 'native' | 'css'>('off')
  const mountedAt = useRef(0)
  const view = useRef({ w: 1, h: 1, dpr: 1 })
  const hovered = useRef<string | null>(null)
  const hoverSector = useRef<string | null>(null)
  const fly = useRef<{ from: Camera; to: Camera; t0: number; dur: number } | null>(null)
  const dirty = useRef(true)
  const grid = useRef(new HitGrid(40))
  const P = useRef({ selected, onSelect, onOpenSubject, onCamera })
  P.current = { selected, onSelect, onOpenSubject, onCamera }
  // Skills that opened since your last visit pulse gently (this visit only):
  // the open set from the last visit is read once, the new one saved after.
  const [before] = useState<Set<string> | null>(() => {
    try {
      const raw = localStorage.getItem('nexus:open:v1')
      return raw ? new Set(JSON.parse(raw) as string[]) : null
    } catch {
      return null
    }
  })
  const fresh = useMemo(() => {
    if (!before) return new Set<string>()
    return new Set([...items.values()].filter((it) => it.node.s >= 1 && !before.has(it.key)).map((it) => it.key))
  }, [items, before])
  useEffect(() => {
    try {
      localStorage.setItem('nexus:open:v1', JSON.stringify([...items.values()].filter((it) => it.node.s >= 1).map((it) => it.key)))
    } catch {
      /* storage blocked: no pulse, nothing else changes */
    }
  }, [items])
  // The next step: the open skill you are furthest into, nearest the centre.
  const nextStep = useMemo(() => {
    let best: Item | null = null
    for (const it of items.values()) {
      if (it.node.s !== 1) continue
      if (!best || it.node.p > best.node.p || (it.node.p === best.node.p && (it.node.z < best.node.z || (it.node.z === best.node.z && it.cluster.order < best.cluster.order)))) best = it
    }
    return best?.key ?? null
  }, [items])
  useEffect(() => {
    dirty.current = true
  }, [selected, items])

  const flyTo = (to: Camera, dur = 650, byUser = true) => {
    if (byUser) userMoved.current = true
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const target = { ...to, k: Math.max(fit(view.current.w, view.current.h).k * 0.8, Math.min(MAX_K, to.k)) }
    if (reduce) {
      cam.current = target
      dirty.current = true
    } else fly.current = { from: { ...cam.current }, to: target, t0: performance.now(), dur }
  }
  const zoomBy = (f: number) => flyTo({ ...cam.current, k: cam.current.k * f }, 260)
  const fitNow = () => {
    flyTo(fit(view.current.w, view.current.h), 500, false)
    userMoved.current = false
  }
  const flyToStream = (id: string) => {
    const st = layout.streams.find((x) => x.id === id)
    if (!st) return
    const mid = (st.a0 + st.a1) / 2
    const rm = (layout.inner * 0.75 + layout.extent) / 2
    const span = Math.min(Math.PI, st.a1 - st.a0)
    const size = Math.max(layout.extent - layout.inner * 0.6, 2 * Math.sin(span / 2) * layout.extent) + 400
    flyTo({ x: Math.cos(mid) * rm, y: Math.sin(mid) * rm, k: Math.min(view.current.w, view.current.h) / size }, 700)
  }
  const toggleFullscreen = () => {
    const el = cardRef.current
    if (!el) return
    if (fullscreen === 'css') return setFullscreen('off')
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => setFullscreen('css'))
    } else setFullscreen('css')
  }
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === cardRef.current ? 'native' : 'off')
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  useEffect(() => {
    if (fullscreen !== 'css') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setFullscreen('off')
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [fullscreen])
  const flyToRing = (level: number) => {
    const g = layout.rings.find((r) => r.level === level)
    if (!g) return
    const mid = (g.r0 + g.r1) / 2
    flyTo({ x: 0, y: -mid, k: Math.min(1, view.current.h / (g.r1 - g.r0 + 500)) })
  }
  // Selecting from outside (a deep link, a chip): bring it into view.
  useEffect(() => {
    if (!selected) return
    const it = items.get(selected)
    if (!it) return
    const { w, h } = view.current
    const sx = (it.x - cam.current.x) * cam.current.k + w / 2
    const sy = (it.y - cam.current.y) * cam.current.k + h / 2
    if (cam.current.k < 0.6 || sx < 40 || sx > w - 40 || sy < 40 || sy > h - 40) flyTo({ x: it.x, y: it.y + 60, k: Math.max(cam.current.k, 0.85) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, items])

  /* ── rendering ── */
  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const probe = document.createElement('span')
    probe.style.display = 'none'
    wrap.appendChild(probe)
    let C = readColors(probe)
    const font = getComputedStyle(wrap).fontFamily || 'system-ui, sans-serif'
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace'
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Node icons as images, one per icon and tint (drawn when orbs are big).
    const icons = new Map<string, HTMLImageElement>()
    const buildIcons = () => {
      icons.clear()
      const host = iconsRef.current
      if (!host) return
      for (const holder of host.querySelectorAll<HTMLElement>('[data-icon-holder]')) {
        const name = holder.dataset.iconHolder!
        const el = holder.querySelector('svg')
        if (!el) continue
        const clone = el.cloneNode(true) as SVGSVGElement
        clone.removeAttribute('class')
        clone.removeAttribute('style')
        clone.setAttribute('width', '48')
        clone.setAttribute('height', '48')
        if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        const raw = new XMLSerializer().serializeToString(clone)
        for (const [tint, col] of [['done', '#ffffff'], ['open', C.text], ['locked', C.muted]] as const) {
          const img = new Image()
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw.replace(/currentColor/g, col))}`
          img.onload = () => (dirty.current = true)
          icons.set(`${name}|${tint}`, img)
        }
      }
    }
    buildIcons()
    const themeObs = new MutationObserver(() => {
      C = readColors(probe)
      buildIcons()
      dirty.current = true
    })
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-theme', 'class', 'style'] })

    const resize = () => {
      const r = wrap.getBoundingClientRect()
      // Not laid out yet (or collapsed): wait for a real size.
      if (r.width < 40 || r.height < 40) return
      const w = r.width
      const h = r.height
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      view.current = { w, h, dpr }
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      if (!userMoved.current) {
        const ic = initial.current
        initial.current = null
        // Back from a subject at the same size: the same spot. Otherwise fit.
        if (ic && ic.w && ic.h && Math.abs(ic.w - w) < 2 && Math.abs(ic.h - h) < 2) {
          cam.current = { x: ic.x, y: ic.y, k: ic.k }
          userMoved.current = true
        } else {
          cam.current = fit(w, h)
          fly.current = null
        }
      }
      setCompact(window.innerWidth < 640)
      dirty.current = true
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    const ringOf = new Map(layout.rings.map((g) => [g.level, g]))
    const sectors = layout.sectors
    const sectorById = new Map(sectors.map((x) => [x.id, x]))
    const streamArc = new Map(layout.streams.map((x) => [x.id, x]))
    let focusKey: string | null = null
    let related: Set<string> | null = null
    let raf = 0
    let lastCam = ''
    if (!mountedAt.current) mountedAt.current = performance.now()
    const dark = () => document.documentElement.dataset.mode === 'dark' || document.documentElement.classList.contains('dark')

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const p = P.current
      if (fly.current) {
        const f = fly.current
        const t = Math.min(1, (now - f.t0) / f.dur)
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        const k = Math.exp(Math.log(f.from.k) + (Math.log(f.to.k) - Math.log(f.from.k)) * e)
        cam.current = { x: f.from.x + (f.to.x - f.from.x) * e, y: f.from.y + (f.to.y - f.from.y) * e, k }
        if (t >= 1) fly.current = null
        dirty.current = true
      }
      const c = cam.current
      // Flowing links and pulses animate only when they are big enough to see.
      const animate = !reduce && c.k >= 0.3
      const fk = (hovered.current && items.has(hovered.current) ? hovered.current : null) ?? p.selected
      if (fk !== focusKey) {
        focusKey = fk
        related = fk ? lineage(prereqs, fk) : null
        dirty.current = true
      }
      // Progress arcs fill in on load.
      const intro = reduce ? 1 : Math.min(1, (now - mountedAt.current) / 900)
      const introE = 1 - Math.pow(1 - intro, 3)
      if (intro < 1) dirty.current = true
      if (!dirty.current && !animate && !fresh.size) return
      dirty.current = false
      const camKey = `${c.x.toFixed(1)},${c.y.toFixed(1)},${c.k.toFixed(4)}`
      if (camKey !== lastCam) {
        lastCam = camKey
        p.onCamera?.({ ...c, w: view.current.w, h: view.current.h })
      }

      const { w, h, dpr } = view.current
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // World → screen.
      ctx.setTransform(dpr * c.k, 0, 0, dpr * c.k, dpr * (w / 2 - c.x * c.k), dpr * (h / 2 - c.y * c.k))
      const px = 1 / c.k // one screen pixel in world units
      const X = (x: number) => (x - c.x) * c.k + w / 2
      const Y = (y: number) => (y - c.y) * c.k + h / 2
      const vx0 = c.x - w / 2 / c.k - NODE
      const vx1 = c.x + w / 2 / c.k + NODE
      const vy0 = c.y - h / 2 / c.k - NODE
      const vy1 = c.y + h / 2 / c.k + NODE
      const inView = (x: number, y: number, m = 0) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m

      const hs = hoverSector.current
      // Streams: a quiet wash of the stream's hue behind its subjects.
      for (const st of layout.streams) {
        const hue = streamOf.get(st.id)?.hue
        if (!hue) continue
        ctx.globalAlpha = (hs && sectorOf.get(hs)?.stream === st.id) || hoverStream.current === st.id ? 0.075 : 0.035
        ctx.fillStyle = hue
        ctx.beginPath()
        ctx.arc(0, 0, layout.extent + 60, st.a0, st.a1)
        ctx.arc(0, 0, layout.inner * 0.6, st.a1, st.a0, true)
        ctx.closePath()
        ctx.fill()
      }
      ctx.globalAlpha = 1
      // Zone bands: each subject's zones tinted in their colour, as in the
      // original (the current zone lit, locked zones faint).
      for (const s of sectors) {
        const cl = sectorOf.get(s.id)
        if (!cl) continue
        for (const z of cl.zones) {
          const g = ringOf.get(z.level)
          if (!g) continue
          ctx.globalAlpha = z.current ? 0.1 : z.locked ? 0.015 : 0.045
          ctx.fillStyle = z.color
          ctx.beginPath()
          ctx.arc(0, 0, g.r1, s.a0, s.a1)
          ctx.arc(0, 0, g.r0, s.a1, s.a0, true)
          ctx.closePath()
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      // Band lines between the rings, the rail line around the centre.
      ctx.strokeStyle = C.border
      ctx.lineWidth = px
      for (const g of layout.rings) {
        ctx.beginPath()
        ctx.arc(0, 0, g.r0, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Stream rim: an arc in the stream's hue along the outer edge.
      for (const st of layout.streams) {
        const hue = streamOf.get(st.id)?.hue
        if (!hue) continue
        ctx.strokeStyle = hue
        ctx.globalAlpha = 0.85
        ctx.lineWidth = 3 * px
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(0, 0, layout.extent + 70, st.a0 + 0.004, st.a1 - 0.004)
        ctx.stroke()
        ctx.globalAlpha = 0.25
        ctx.lineWidth = px
        ctx.beginPath()
        ctx.moveTo(Math.cos(st.a0) * layout.inner * 0.62, Math.sin(st.a0) * layout.inner * 0.62)
        ctx.lineTo(Math.cos(st.a0) * (layout.extent + 70), Math.sin(st.a0) * (layout.extent + 70))
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // Subject connections inside the first ring, bundled through their
      // streams: anchor (by the subject's name) → stream hub → stream hub →
      // anchor. Colour runs from the prerequisite subject to the dependent.
      const anchorR = layout.inner * 0.58
      const hubR = layout.inner * 0.3
      const midOf = (id: string) => {
        const sct = sectorById.get(id)
        return sct ? (sct.a0 + sct.a1) / 2 : 0
      }
      const hubOf = (id: string) => {
        const st = streamArc.get(sectorOf.get(id)?.stream ?? '')
        return st ? (st.a0 + st.a1) / 2 : midOf(id)
      }
      const chord = (from: string, to: string) => {
        const a1 = midOf(from)
        const a2 = midOf(to)
        const h1 = hubOf(from)
        const h2 = hubOf(to)
        const same = sectorOf.get(from)?.stream === sectorOf.get(to)?.stream
        const hr = same ? layout.inner * 0.42 : hubR
        return [Math.cos(a1) * anchorR, Math.sin(a1) * anchorR, Math.cos(h1) * hr, Math.sin(h1) * hr, Math.cos(h2) * hr, Math.sin(h2) * hr, Math.cos(a2) * anchorR, Math.sin(a2) * anchorR]
      }
      const hueOf = (id: string) => streamOf.get(sectorOf.get(id)?.stream ?? '')?.hue ?? C.primary
      for (const l of subjectLinks) {
        const on = hs ? l.from === hs || l.to === hs : true
        if (hs && !on) continue
        const [x0, y0, x1, y1, x2, y2, x3, y3] = chord(l.from, l.to)
        const g = ctx.createLinearGradient(x0, y0, x3, y3)
        g.addColorStop(0, hueOf(l.from))
        g.addColorStop(1, hueOf(l.to))
        ctx.strokeStyle = g
        ctx.globalAlpha = hs ? 0.95 : 0.1 + 0.4 * l.t
        ctx.lineWidth = (hs ? 1.4 + 2.4 * l.t : 0.6 + 2 * l.t) * px
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3)
        ctx.stroke()
        if (hs) {
          // A small arrowhead at the dependent end.
          const ang = Math.atan2(y3 - y2, x3 - x2)
          const L = 9 * px
          ctx.fillStyle = hueOf(l.to)
          ctx.beginPath()
          ctx.moveTo(x3, y3)
          ctx.lineTo(x3 - Math.cos(ang - 0.45) * L, y3 - Math.sin(ang - 0.45) * L)
          ctx.lineTo(x3 - Math.cos(ang + 0.45) * L, y3 - Math.sin(ang + 0.45) * L)
          ctx.closePath()
          ctx.fill()
        }
      }
      if (hs) {
        // At rest the other connections stay as the faintest hairlines.
        ctx.globalAlpha = 0.04
        ctx.strokeStyle = C.strong
        ctx.lineWidth = 0.6 * px
        for (const l of subjectLinks) {
          if (l.from === hs || l.to === hs) continue
          const [x0, y0, x1, y1, x2, y2, x3, y3] = chord(l.from, l.to)
          ctx.beginPath()
          ctx.moveTo(x0, y0)
          ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3)
          ctx.stroke()
        }
      }
      // Anchor dots where connections meet each subject.
      for (const s2 of sectors) {
        const m = (s2.a0 + s2.a1) / 2
        ctx.globalAlpha = !hs || hs === s2.id ? 0.9 : 0.25
        ctx.fillStyle = hueOf(s2.id)
        ctx.beginPath()
        ctx.arc(Math.cos(m) * anchorR, Math.sin(m) * anchorR, 3.2 * px, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Links, as the original: locked first, then open, then mastered.
      const groups: Record<'locked' | 'open' | 'done', { lit: Path2D; dim: Path2D; glow: Path2D }> = {
        locked: { lit: new Path2D(), dim: new Path2D(), glow: new Path2D() },
        open: { lit: new Path2D(), dim: new Path2D(), glow: new Path2D() },
        done: { lit: new Path2D(), dim: new Path2D(), glow: new Path2D() },
      }
      const doneByColor = new Map<string, { lit: Path2D; dim: Path2D }>()
      const cross = new Path2D()
      const link = (path: Path2D, a: Item, b: Item) => {
        const ra = Math.hypot(a.x, a.y)
        const rb = Math.hypot(b.x, b.y)
        if (Math.abs(ra - rb) < 1) {
          // Same row: a shallow arc between the orbs' sides, bowed inward.
          const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
          const ux = (b.x - a.x) / d
          const uy = (b.y - a.y) / d
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          const mr = Math.hypot(mx, my) || 1
          path.moveTo(a.x + ux * R, a.y + uy * R)
          path.quadraticCurveTo(mx - (mx / mr) * 34, my - (my / mr) * 34, b.x - ux * R, b.y - uy * R)
          return
        }
        const out = rb > ra
        const [ia, ib] = out ? [a, b] : [b, a]
        const r1 = Math.hypot(ia.x, ia.y) || 1
        const r2 = Math.hypot(ib.x, ib.y) || 1
        // Outward links leave from under the name and arrive at the orb's top.
        const s1 = (r1 + LABEL_BOTTOM) / r1
        const s2 = (r2 - (R + 3)) / r2
        const x1 = ia.x * s1
        const y1 = ia.y * s1
        const x2 = ib.x * s2
        const y2 = ib.y * s2
        const dy = (r2 - (R + 3) - (r1 + LABEL_BOTTOM)) * 0.5
        path.moveTo(x1, y1)
        path.bezierCurveTo(x1 + (ia.x / r1) * dy, y1 + (ia.y / r1) * dy, x2 - (ib.x / r2) * dy, y2 - (ib.y / r2) * dy, x2, y2)
      }
      for (const b of items.values()) {
        const near = inView(b.x, b.y, 900)
        for (const rk of b.req) {
          const a = items.get(rk)
          if (!a || (!near && !inView(a.x, a.y, 900))) continue
          const state = b.node.s === 2 && a.node.s === 2 ? 'done' : b.node.s >= 1 ? 'open' : 'locked'
          const lit = !related || (related.has(a.key) && related.has(b.key))
          if (state === 'done') {
            let g = doneByColor.get(b.color)
            if (!g) doneByColor.set(b.color, (g = { lit: new Path2D(), dim: new Path2D() }))
            link(lit ? g.lit : g.dim, a, b)
          } else link(lit ? groups[state].lit : groups[state].dim, a, b)
        }
        // Cross-subject links only for the skill in focus (its direct needs
        // and unlocks), as quiet hairlines: the chips say the rest.
        if (focusKey && (b.key === focusKey || b.cx.includes(focusKey))) {
          for (const rk of b.cx) {
            const a = items.get(rk)
            if (a && (b.key === focusKey || rk === focusKey)) link(cross, a, b)
          }
        }
      }
      const thin = (v: number) => Math.max(v, 0.6 / c.k)
      ctx.lineCap = 'round'
      // locked hairlines
      ctx.strokeStyle = C.strong
      ctx.globalAlpha = 0.08
      ctx.lineWidth = thin(1.25)
      ctx.stroke(groups.locked.dim)
      ctx.globalAlpha = related ? 0.95 : 0.6
      ctx.lineWidth = thin(related ? 1.75 : 1.25)
      ctx.stroke(groups.locked.lit)
      // open: flowing toward the skill you can take next
      ctx.strokeStyle = C.primary
      ctx.setLineDash([5, 7])
      ctx.lineDashOffset = animate ? ((now / 1100) * 24) % 24 : 0
      ctx.globalAlpha = 0.08
      ctx.lineWidth = thin(2)
      ctx.stroke(groups.open.dim)
      ctx.globalAlpha = 1
      ctx.lineWidth = thin(related ? 2.75 : 2)
      ctx.stroke(groups.open.lit)
      ctx.globalAlpha = 0.55
      ctx.lineWidth = thin(1.25)
      ctx.stroke(cross)
      ctx.setLineDash([])
      // mastered: glowing in the zone colour
      for (const [col, g] of doneByColor) {
        ctx.strokeStyle = col
        ctx.globalAlpha = 0.08
        ctx.lineWidth = thin(2)
        ctx.stroke(g.dim)
        ctx.globalAlpha = 0.22
        ctx.lineWidth = thin(6)
        ctx.stroke(g.lit)
        ctx.globalAlpha = 1
        ctx.lineWidth = thin(related ? 2.75 : 2)
        ctx.stroke(g.lit)
      }
      ctx.globalAlpha = 1

      // Orbs.
      const rr = R * c.k // orb radius on screen
      const g2 = grid.current
      g2.clear()
      const pulseT = animate ? (now % 2400) / 2400 : -1
      const visible: Item[] = []
      for (const it of items.values()) if (inView(it.x, it.y)) visible.push(it)
      for (const it of visible) {
        const n = it.node
        const state = n.s === 2 ? 'done' : n.s === 1 ? 'open' : 'locked'
        const dim = related && !related.has(it.key)
        const sel = p.selected === it.key
        const hov = hovered.current === it.key
        g2.add(it.key, X(it.x), Y(it.y))
        ctx.globalAlpha = dim ? 0.3 : 1
        if (rr < 2.2) {
          ctx.fillStyle = state === 'done' ? it.color : state === 'open' ? C.primary : C.strong
          const d = Math.max(1.6, rr * 1.4) * px
          ctx.fillRect(it.x - d / 2, it.y - d / 2, d, d)
          continue
        }
        const s = sel ? 1.08 : 1
        const ringR = (R - 2) * s
        const coreR = 21 * s
        // A soft shadow under each orb; the hovered one lifts a little.
        if (rr >= 5) {
          ctx.globalAlpha = (dim ? 0.3 : 1) * (hov ? 0.16 : 0.24) * (dark() ? 1.4 : 1)
          ctx.fillStyle = '#000'
          ctx.beginPath()
          ctx.ellipse(it.x, it.y + R * (hov ? 0.95 : 0.82), R * (hov ? 1.0 : 0.86), R * 0.3, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = dim ? 0.3 : 1
        }
        const lift = hov && !reduce ? 4 : 0
        if (lift) ctx.translate(0, -lift)
        if (fresh.has(it.key)) {
          // Newly unlocked: a gentle accent pulse (this visit).
          const t = reduce ? 0.5 : (now % 1800) / 1800
          ctx.globalAlpha = 0.55 * (1 - t)
          ctx.strokeStyle = C.accent
          ctx.lineWidth = Math.max(2, 2 / c.k)
          ctx.beginPath()
          ctx.arc(it.x, it.y, (R + 6) * (1 + 0.5 * t), 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = dim ? 0.3 : 1
        }
        if (state === 'open' && pulseT >= 0) {
          const t = Math.min(1, pulseT / 0.8)
          ctx.globalAlpha = (dim ? 0.3 : 1) * 0.7 * (1 - t)
          ctx.strokeStyle = it.color
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(it.x, it.y, (R + 4) * (0.92 + 0.43 * t), 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = dim ? 0.3 : 1
        }
        // progress ring: track, then progress in the zone colour
        ctx.lineWidth = 3
        ctx.strokeStyle = C.border
        ctx.beginPath()
        ctx.arc(it.x, it.y, ringR, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = (dim ? 0.3 : 1) * 0.22
        ctx.strokeStyle = it.color
        ctx.stroke()
        ctx.globalAlpha = dim ? 0.3 : 1
        const pct = (n.s === 2 ? 100 : n.p) * introE
        if (pct > 0) {
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.arc(it.x, it.y, ringR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100)
          ctx.stroke()
        }
        // core
        if (state === 'done') {
          // The original: radial-gradient(circle at 35% 30%, zone+white, zone 55%, zone+black).
          const gx = it.x - coreR * 0.3
          const gy = it.y - coreR * 0.4
          ctx.fillStyle = it.color
          ctx.beginPath()
          ctx.arc(it.x, it.y, coreR, 0, Math.PI * 2)
          ctx.fill()
          const hi = ctx.createRadialGradient(gx, gy, 0, gx, gy, coreR * 1.7)
          hi.addColorStop(0, 'rgba(255,255,255,0.45)')
          hi.addColorStop(0.35, 'rgba(255,255,255,0)')
          hi.addColorStop(0.62, 'rgba(0,0,0,0)')
          hi.addColorStop(1, 'rgba(0,0,0,0.35)')
          ctx.fillStyle = hi
          ctx.fill()
        } else if (state === 'open') {
          ctx.fillStyle = C.surface3
          ctx.beginPath()
          ctx.arc(it.x, it.y, coreR, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = (dim ? 0.3 : 1) * 0.16
          ctx.fillStyle = it.color
          ctx.fill()
          ctx.globalAlpha = dim ? 0.3 : 1
        } else {
          ctx.fillStyle = C.surface2
          ctx.beginPath()
          ctx.arc(it.x, it.y, coreR, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = C.border
          ctx.lineWidth = 1
          ctx.stroke()
        }
        if (hov) {
          ctx.globalAlpha = 0.22
          ctx.strokeStyle = it.color
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.arc(it.x, it.y, coreR + 2, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = dim ? 0.3 : 1
        }
        if (rr >= 9) {
          const img = icons.get(`${nodeIcon(n.i)}|${state}`)
          if (img?.complete && img.naturalWidth) ctx.drawImage(img, it.x - 9.5, it.y - 9.5, 19, 19)
        }
        if (rr >= 8 && state === 'done') {
          const bx = it.x + R * 0.72
          const by = it.y - R * 0.72
          ctx.fillStyle = C.app
          ctx.beginPath()
          ctx.arc(bx, by, 11, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = it.color
          ctx.beginPath()
          ctx.arc(bx, by, 9, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2.2
          ctx.lineJoin = 'round'
          ctx.beginPath()
          ctx.moveTo(bx - 3.6, by + 0.2)
          ctx.lineTo(bx - 1, by + 2.8)
          ctx.lineTo(bx + 3.8, by - 2.6)
          ctx.stroke()
        } else if (rr >= 8 && state === 'locked') {
          const bx = it.x + R * 0.72
          const by = it.y + R * 0.72
          ctx.fillStyle = C.surface3
          ctx.strokeStyle = C.border
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(bx, by, 9, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = C.muted
          ctx.fillRect(bx - 3.2, by - 0.6, 6.4, 4.6)
          ctx.strokeStyle = C.muted
          ctx.lineWidth = 1.3
          ctx.beginPath()
          ctx.arc(bx, by - 0.8, 2.2, Math.PI, 0)
          ctx.stroke()
        }
        if (sel) {
          ctx.strokeStyle = C.accent
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(it.x, it.y, R * s + 6, 0, Math.PI * 2)
          ctx.stroke()
        }
        if (lift) ctx.translate(0, lift)
      }
      ctx.globalAlpha = 1

      // Names under the orbs, the original's type at the original's scale.
      if (c.k >= 0.62) {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        for (const it of visible) {
          const n = it.node
          ctx.globalAlpha = related && !related.has(it.key) ? 0.3 : 1
          ctx.font = `600 11.5px ${font}`
          ctx.fillStyle = n.s === 0 ? C.muted : C.text
          const words = n.n.split(' ')
          const lines: string[] = []
          let line = ''
          for (const wd of words) {
            const t = line ? `${line} ${wd}` : wd
            if (ctx.measureText(t).width > 124 && line) {
              lines.push(line)
              line = wd
            } else line = t
          }
          if (line) lines.push(line)
          if (lines.length > 2) lines[1] = `${lines.slice(1).join(' ').slice(0, 16)}…`
          lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, it.x, it.y + R + 6 + i * 13.5))
          ctx.font = `400 10px ${mono}`
          ctx.fillStyle = C.muted
          ctx.fillText(n.s === 2 ? 'mastered' : n.c || `${n.p}%`, it.x, it.y + R + 7 + Math.min(2, lines.length) * 13.5)
        }
        ctx.globalAlpha = 1
      }

      // Screen-space type: subject names along their branches, and YOU.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // A faint inner shading toward the rim: the disc reads as a surface.
      {
        const R0 = (layout.extent + 70) * c.k
        const vg = ctx.createRadialGradient(X(0), Y(0), R0 * 0.55, X(0), Y(0), R0)
        vg.addColorStop(0, 'rgba(0,0,0,0)')
        vg.addColorStop(1, dark() ? 'rgba(0,0,0,0.22)' : 'rgba(30,40,80,0.06)')
        ctx.fillStyle = vg
        ctx.beginPath()
        ctx.arc(X(0), Y(0), R0, 0, Math.PI * 2)
        ctx.fill()
      }
      const lane = (s: (typeof sectors)[number]) => (s.a1 - s.a0) * layout.inner * 0.9 * c.k
      const hst = hoverStream.current ?? (hs ? (sectorOf.get(hs)?.stream ?? null) : null)
      const fitK = fit(w, h).k
      ctx.textBaseline = 'middle'
      for (const s of sectors) {
        const cl = sectorOf.get(s.id)
        if (!cl) continue
        const mid = (s.a0 + s.a1) / 2
        const r1 = layout.inner * 0.97
        const sx = X(Math.cos(mid) * r1)
        const sy = Y(Math.sin(mid) * r1)
        if (sx < -300 || sx > w + 300 || sy < -300 || sy > h + 300) continue
        const size = Math.max(10, Math.min(13, lane(s) * 0.5))
        // Zoomed out the names would crowd: only the hovered stream's show
        // (the rest are dots and the nine stream names on the rim).
        if ((lane(s) < 15 || c.k < fitK * 1.6) && hst !== cl.stream) continue
        const flip = Math.cos(mid) < 0
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(flip ? mid + Math.PI : mid)
        ctx.textAlign = flip ? 'left' : 'right'
        ctx.font = `600 ${size}px ${font}`
        ctx.globalAlpha = !hs || hs === s.id || subjectLinks.some((l) => (l.from === hs && l.to === s.id) || (l.to === hs && l.from === s.id)) ? 1 : 0.35
        ctx.fillStyle = hs === s.id ? C.accent : C.text
        ctx.fillText(cl.name, 0, 0)
        ctx.restore()
        ctx.globalAlpha = 1
      }
      // Zoomed into the rings: each subject's name also sits past the end of
      // its branch, along the ring, so a sector is never anonymous.
      if (c.k > 0.08 && c.k < 0.62) {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `600 12px ${font}`
        for (const s of sectors) {
          const cl = sectorOf.get(s.id)
          if (!cl) continue
          const mid = (s.a0 + s.a1) / 2
          const r2 = s.rMax + 120
          const sx = X(Math.cos(mid) * r2)
          const sy = Y(Math.sin(mid) * r2)
          if (sx < -100 || sx > w + 100 || sy < -40 || sy > h + 40) continue
          if (ctx.measureText(cl.short).width > (s.a1 - s.a0) * r2 * c.k * 1.6) continue
          const up = Math.sin(mid) > 0
          ctx.save()
          ctx.translate(sx, sy)
          ctx.rotate(mid + (up ? -Math.PI / 2 : Math.PI / 2))
          ctx.fillStyle = hs === s.id ? C.accent : C.text
          ctx.fillText((s.a1 - s.a0) * r2 * c.k > ctx.measureText(cl.name).width + 8 ? cl.name : cl.short, 0, 0)
          ctx.restore()
        }
      }
      // Stream names on the outer rim, in their hue.
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      streamHits.current = []
      for (const st of layout.streams) {
        const info = streamOf.get(st.id)
        if (!info) continue
        const mid = (st.a0 + st.a1) / 2
        const rr2 = layout.extent + 190
        const sx = X(Math.cos(mid) * rr2)
        const sy = Y(Math.sin(mid) * rr2)
        if (sx < -200 || sx > w + 200 || sy < -40 || sy > h + 40) continue
        const label = info.name.toUpperCase()
        if (rr2 * c.k < 230) {
          // A small disc: straight, compact labels instead of curved ones.
          ctx.font = `700 9.5px ${font}`
          const short = info.name.replace('Programming ', '').replace(' & ', ' & ').toUpperCase()
          const tw2 = ctx.measureText(short).width
          const lx = Math.max(tw2 / 2 + 4, Math.min(w - tw2 / 2 - 4, sx))
          const ly = Math.max(10, Math.min(h - 10, sy))
          ctx.globalAlpha = hoverStream.current && hoverStream.current !== st.id ? 0.5 : 1
          ctx.fillStyle = info.hue
          ctx.fillText(short, lx, ly)
          ctx.globalAlpha = 1
          streamHits.current.push({ id: st.id, x: lx - tw2 / 2 - 4, y: ly - 9, w: tw2 + 8, h: 18 })
          continue
        }
        streamHits.current.push({ id: st.id, x: sx - 70, y: sy - 18, w: 140, h: 36 })
        ctx.font = `700 ${c.k < 0.05 ? 10.5 : 12}px ${font}`
        const chars = [...label]
        const sp = 2.2
        const widths = chars.map((ch) => ctx.measureText(ch).width)
        const tw = widths.reduce((a2, b2) => a2 + b2, 0) + sp * (chars.length - 1)
        // Along the rim, reading left to right on both halves.
        const bottom = Math.sin(mid) > 0
        const rad = rr2 * c.k
        let ang = mid + ((bottom ? 1 : -1) * tw) / 2 / rad
        ctx.fillStyle = info.hue
        ctx.globalAlpha = hoverStream.current && hoverStream.current !== st.id ? 0.55 : 1
        chars.forEach((ch, i) => {
          const step = (widths[i] + sp) / rad
          const a3 = ang + ((bottom ? -1 : 1) * widths[i]) / 2 / rad
          ctx.save()
          ctx.translate(X(Math.cos(a3) * rr2), Y(Math.sin(a3) * rr2))
          ctx.rotate(a3 + (bottom ? -Math.PI / 2 : Math.PI / 2))
          ctx.fillText(ch, 0, 0)
          ctx.restore()
          ang += (bottom ? -1 : 1) * step
        })
        ctx.globalAlpha = 1
      }
      // Hovering a subject: what it needs and what it leads to, as labels.
      if (hs) {
        const cl = sectorOf.get(hs)
        const sct = sectorById.get(hs)
        if (cl && sct) {
          const needs = subjectLinks.filter((l) => l.to === hs).sort((p2, q2) => q2.n - p2.n).map((l) => sectorOf.get(l.from)?.name ?? l.from)
          const leads = subjectLinks.filter((l) => l.from === hs).sort((p2, q2) => q2.n - p2.n).map((l) => sectorOf.get(l.to)?.name ?? l.to)
          const short = (list: string[]) => (list.length > 3 ? `${list.slice(0, 3).join(' · ')} +${list.length - 3}` : list.join(' · '))
          const done2 = cl.nodes.filter((n) => n.s === 2).length
          const prog = cl.nodes.length ? Math.round(cl.nodes.reduce((a2, n) => a2 + n.p, 0) / cl.nodes.length) : 0
          const lines: [string, string][] = [[`${cl.name} · ${prog}% mastered`, C.text], [`${done2}/${cl.nodes.length} skills · ${streamOf.get(cl.stream)?.name ?? ''}`, C.muted]]
          if (needs.length) lines.push([`needs ${short(needs)}`, C.muted])
          if (leads.length) lines.push([`leads to ${short(leads)}`, C.muted])
          if (!needs.length && !leads.length) lines.push(['stands on its own', C.muted])
          ctx.font = `600 12px ${font}`
          const bw = Math.max(...lines.map(([t]) => ctx.measureText(t).width)) + 24
          const bh = lines.length * 18 + 14
          // Top-left of the canvas: never over YOU or the subject itself.
          const bx = 12
          const by = 12
          ctx.globalAlpha = 0.96
          ctx.fillStyle = C.surface2
          ctx.strokeStyle = C.border
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.roundRect(bx, by, bw, bh, 10)
          ctx.fill()
          ctx.stroke()
          ctx.globalAlpha = 1
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          lines.forEach(([t, col], i) => {
            ctx.font = i === 0 ? `600 12.5px ${font}` : `400 11.5px ${font}`
            ctx.fillStyle = col
            ctx.fillText(t, bx + 12, by + 8 + i * 18)
          })
        }
      }
      // YOU: the emblem (DOM) follows the centre.
      const core = coreRef.current
      if (core) {
        // Smaller when the first ring is small on screen, so it never covers the web.
        const sc = Math.max(0.5, Math.min(1, (layout.inner * 0.5 * c.k) / 76))
        core.style.transform = `translate(${X(0).toFixed(1)}px, ${Y(0).toFixed(1)}px) translate(-50%, -38px) scale(${sc.toFixed(3)})`
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      themeObs.disconnect()
      probe.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, layout, prereqs, sectorOf, iconNames, subjectLinks, streamOf, fresh])

  /* ── pointer, wheel and keyboard ── */
  useEffect(() => {
    const canvas = canvasRef.current!
    const pts = new Map<number, { x: number; y: number }>()
    let drag: { x: number; y: number; moved: boolean; cx: number; cy: number } | null = null
    let pinch: { d: number; k: number; wx: number; wy: number } | null = null
    const local = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const toWorld = (p: { x: number; y: number }) => {
      const { w, h } = view.current
      const c = cam.current
      return { x: c.x + (p.x - w / 2) / c.k, y: c.y + (p.y - h / 2) / c.k }
    }
    const minK = () => fit(view.current.w, view.current.h).k * 0.8
    const zoomAt = (p: { x: number; y: number }, k2: number) => {
      const before = toWorld(p)
      userMoved.current = true
      cam.current = { ...cam.current, k: Math.max(minK(), Math.min(MAX_K, k2)) }
      const after = toWorld(p)
      cam.current = { ...cam.current, x: cam.current.x + before.x - after.x, y: cam.current.y + before.y - after.y }
      fly.current = null
      dirty.current = true
    }
    const hitNode = (p: { x: number; y: number }) => grid.current.nearest(p.x, p.y, Math.max(12, R * cam.current.k + 4))
    // A subject's name (inside the first ring) or anywhere in its sector.
    const hitSector = (p: { x: number; y: number }) => {
      const wp = toWorld(p)
      const r = Math.hypot(wp.x, wp.y)
      const s = sectorAt(layout, wp.x, wp.y)
      if (!s || r < layout.inner * 0.5) return null
      return { s, onName: r < layout.inner * 1.01, beyond: r > s.rMax + 260 }
    }
    const down = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      const p = local(e)
      pts.set(e.pointerId, p)
      if (pts.size === 1) drag = { ...p, moved: false, cx: cam.current.x, cy: cam.current.y }
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]
        const wm = toWorld({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: cam.current.k, wx: wm.x, wy: wm.y }
        if (drag) drag.moved = true
      }
    }
    const move = (e: PointerEvent) => {
      const p = local(e)
      if (pts.has(e.pointerId)) pts.set(e.pointerId, p)
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const k = Math.max(minK(), Math.min(MAX_K, (pinch.k * d) / pinch.d))
        userMoved.current = true
        const { w, h } = view.current
        cam.current = { k, x: pinch.wx - (m.x - w / 2) / k, y: pinch.wy - (m.y - h / 2) / k }
        fly.current = null
        dirty.current = true
        return
      }
      if (drag && pts.size === 1) {
        if (!drag.moved && Math.hypot(p.x - drag.x, p.y - drag.y) > 5) drag.moved = true
        if (drag.moved) {
          userMoved.current = true
          cam.current = { ...cam.current, x: drag.cx - (p.x - drag.x) / cam.current.k, y: drag.cy - (p.y - drag.y) / cam.current.k }
          fly.current = null
          dirty.current = true
        }
        return
      }
      if (e.pointerType === 'mouse') {
        const sh = streamHits.current.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h)?.id ?? null
        if (sh !== hoverStream.current) {
          hoverStream.current = sh
          dirty.current = true
        }
        const key = sh ? null : hitNode(p)
        const tilt = tiltRef.current
        if (tilt && !key && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const { w, h } = view.current
          tilt.style.transform = `rotateX(${((0.5 - p.y / h) * 3).toFixed(2)}deg) rotateY(${((p.x / w - 0.5) * 3).toFixed(2)}deg)`
        }
        const hs = key || sh ? null : hitSector(p)
        const sec = hs ? hs.s.id : null
        if (key !== hovered.current || sec !== hoverSector.current) dirty.current = true
        hovered.current = key
        hoverSector.current = sec
        canvas.style.cursor = key || sh || hs?.onName ? 'pointer' : 'grab'
      }
    }
    const up = (e: PointerEvent) => {
      const tap = drag && !drag.moved && pts.size === 1
      pts.delete(e.pointerId)
      if (pts.size < 2) pinch = null
      if (pts.size === 0) {
        if (tap) {
          const p = local(e)
          const sh = streamHits.current.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h)?.id ?? null
          const key = sh ? null : hitNode(p)
          const cb = P.current
          if (sh) flyToStream(sh)
          else if (key) cb.onSelect(cb.selected === key ? null : key)
          else {
            const hs = hitSector(p)
            if (hs?.onName) {
              // A short zoom toward the subject, then its own tree.
              const id = hs.s.id
              if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) cb.onOpenSubject(id)
              else {
                const mid = (hs.s.a0 + hs.s.a1) / 2
                flyTo({ x: Math.cos(mid) * layout.inner, y: Math.sin(mid) * layout.inner, k: cam.current.k * 2.2 }, 340)
                window.setTimeout(() => cb.onOpenSubject(id), 320)
              }
            }
            else if (hs && !hs.beyond) {
              // Zoom into the sector.
              const mid = (hs.s.a0 + hs.s.a1) / 2
              const rm = (layout.inner + hs.s.rMax) / 2
              const { w, h } = view.current
              const depth = hs.s.rMax - layout.inner + 400
              const k = Math.min(1, Math.min(w, h) / depth)
              if (cam.current.k < k * 0.9) flyTo({ x: Math.cos(mid) * rm, y: Math.sin(mid) * rm, k })
              else cb.onSelect(null)
            } else cb.onSelect(null)
          }
        }
        drag = null
      } else if (pts.size === 1) {
        const [only] = [...pts.values()]
        drag = { ...only, moved: true, cx: cam.current.x, cy: cam.current.y }
      }
    }
    const leave = () => {
      hovered.current = null
      hoverSector.current = null
      hoverStream.current = null
      if (tiltRef.current) tiltRef.current.style.transform = ''
      dirty.current = true
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(local(e), cam.current.k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016)))
    }
    const key = (e: KeyboardEvent) => {
      const c = cam.current
      const step = 140 / c.k
      if (e.key === 'ArrowLeft') flyTo({ ...c, x: c.x - step }, 220)
      else if (e.key === 'ArrowRight') flyTo({ ...c, x: c.x + step }, 220)
      else if (e.key === 'ArrowUp') flyTo({ ...c, y: c.y - step }, 220)
      else if (e.key === 'ArrowDown') flyTo({ ...c, y: c.y + step }, 220)
      else if (e.key === '+' || e.key === '=') zoomBy(1.3)
      else if (e.key === '-') zoomBy(1 / 1.3)
      else if (e.key === '0') fitNow()
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      else return
      e.preventDefault()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('keydown', key)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('keydown', key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])

  // Dev builds only: where skills and subject names are on screen.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__nexusRadial = {
      node: (key: string) => {
        const it = items.get(key)
        const r = canvasRef.current?.getBoundingClientRect()
        if (!it || !r) return null
        const { w: vw, h: vh } = view.current
        const c = cam.current
        return { x: r.left + (it.x - c.x) * c.k + vw / 2, y: r.top + (it.y - c.y) * c.k + vh / 2 }
      },
      subject: (id: string) => {
        const s = layout.sectors.find((x) => x.id === id)
        const r = canvasRef.current?.getBoundingClientRect()
        if (!s || !r) return null
        const mid = (s.a0 + s.a1) / 2
        const rr = layout.inner * 0.9
        const { w: vw, h: vh } = view.current
        const c = cam.current
        return { x: r.left + (Math.cos(mid) * rr - c.x) * c.k + vw / 2, y: r.top + (Math.sin(mid) * rr - c.y) * c.k + vh / 2 }
      },
      zoom: (k: number, x = 0, y = 0) => {
        userMoved.current = true
        cam.current = { x, y, k }
        dirty.current = true
      },
      stream: (id: string) => {
        const b = streamHits.current.find((x) => x.id === id)
        const r = canvasRef.current?.getBoundingClientRect()
        return b && r ? { x: r.left + b.x + b.w / 2, y: r.top + b.y + b.h / 2 } : null
      },
      camera: () => ({ ...cam.current, ...view.current }),
    }
    return () => {
      delete w.__nexusRadial
    }
  }, [items, layout])

  const selectedItem = selected ? (items.get(selected) ?? null) : null
  // The zone rail: the rings, outward, with their rank emblems.
  const rail = useMemo(() => {
    return layout.rings.map((g) => {
      let done = 0
      let count = 0
      let current = false
      for (const c of clusters) {
        const z = c.zones.find((x) => x.level === g.level)
        if (!z) continue
        done += z.nodesCompleted
        count += z.nodeCount
        current ||= z.current
      }
      return { level: g.level, done, count, pct: count ? Math.round((done / count) * 100) : 0, current }
    })
  }, [layout, clusters])

  return (
    <div
      ref={cardRef}
      className={cn('card relative flex overflow-hidden p-0', fullscreen === 'css' && 'fixed inset-0 z-[60] rounded-none', fullscreen !== 'off' && 'bg-bg-app')}
      style={fullscreen !== 'off' ? { height: '100vh', width: '100vw' } : { height: 'min(720px, max(440px, calc(100vh - 220px)))' }}
      data-fullscreen={fullscreen !== 'off' || undefined}
    >
      <nav
        className={cn('shrink-0 flex-col overflow-y-auto border-r border-border py-2', compact ? 'hidden' : 'flex w-[184px]')}
        aria-label="Zones (rings, outward)"
      >
        {rail.map((z) => (
          <button
            key={z.level}
            type="button"
            onClick={() => flyToRing(z.level)}
            className="flex min-h-[56px] flex-1 cursor-pointer flex-col justify-center gap-1 px-3 text-left transition-colors hover:bg-bg-surface-2"
            aria-label={`Zone ${z.level}: ${z.done} of ${z.count} skills mastered`}
          >
            <span className="flex items-center gap-2.5">
              <RankGlyph level={z.level} size={compact ? 30 : 32} animated={z.current} />
              {!compact && (
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold tracking-[0.12em] text-text-muted uppercase">Zone {z.level}</span>
                  <span className="block font-mono text-[10px] text-text-muted tabular-nums">
                    {z.done}/{z.count} nodes · {z.pct}%
                  </span>
                </span>
              )}
            </span>
            {!compact && (
              <span className="block h-1 overflow-hidden rounded-full bg-bg-surface-3">
                <span className="block h-full rounded-full bg-accent-brand transition-[width] duration-700" style={{ width: `${z.pct}%` }} />
              </span>
            )}
          </button>
        ))}
      </nav>
      <div ref={wrapRef} className="relative min-w-0 flex-1" style={{ perspective: 1800 }}>
        <div ref={tiltRef} className="absolute inset-0 transition-transform duration-500 ease-out will-change-transform">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block size-full touch-none outline-none"
          style={{ cursor: 'grab' }}
          tabIndex={0}
          role="application"
          aria-label={`The Nexus: ${clusters.length} subjects grown outward from you, zones as rings. Drag to pan, scroll or pinch to zoom; click a subject's name to open its tree, a sector to zoom in, a skill to see it. Arrow keys pan, plus and minus zoom, 0 fits.`}
        />
        <CoreEmblem ref={coreRef} me={me} />
        </div>
        <div className="absolute top-3 right-3 flex gap-1.5">
          {nextStep && (
            <Button variant="outline" size="sm" onClick={() => P.current.onSelect(nextStep)} aria-label="Jump to my next step" title="Jump to my next step">
              <Crosshair className="size-3.5" /> <span className="hidden sm:inline">Next step</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => zoomBy(1.4)} aria-label="Zoom in">
            <Plus className="size-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">
            <Minus className="size-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={fitNow} aria-label="Fit to view (0)" title="Fit to view (0)">
            <Maximize2 className="size-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen} aria-label={fullscreen !== 'off' ? 'Exit fullscreen (F)' : 'Fullscreen (F)'} title={fullscreen !== 'off' ? 'Exit fullscreen (F)' : 'Fullscreen (F)'} aria-pressed={fullscreen !== 'off'}>
            {fullscreen !== 'off' ? <Shrink className="size-3.5" /> : <Expand className="size-3.5" />}
          </Button>
        </div>
        {selectedItem ? (
          <nav aria-label="Selected skill" className="absolute bottom-3 left-3 flex items-center gap-1 text-[11.5px] text-text-muted">
            <button type="button" className="cursor-pointer font-semibold hover:underline" style={{ color: streamOf.get(selectedItem.cluster.stream)?.hue }} onClick={() => flyToStream(selectedItem.cluster.stream)}>
              {streamOf.get(selectedItem.cluster.stream)?.name ?? 'Stream'}
            </button>
            <ChevronRight className="size-3" aria-hidden="true" />
            <button type="button" className="cursor-pointer text-text-primary hover:underline" onClick={() => onOpenSubject(selectedItem.cluster.id)}>
              {selectedItem.cluster.name}
            </button>
            <ChevronRight className="size-3" aria-hidden="true" />
            <span>{selectedItem.cluster.zones.find((z) => z.level === selectedItem.node.z)?.name ?? `Zone ${selectedItem.node.z}`}</span>
          </nav>
        ) : null}
        {/* The node icons, drawn into the canvas as images. */}
        <div ref={iconsRef} hidden aria-hidden="true">
          {iconNames.map((n) => (
            <span key={n} data-icon-holder={n}>
              <Icon name={n} size={24} />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}


/**
 * YOU, at the centre: your avatar inside a thin ring that fills with your
 * web rank, the rank's emblem and name beneath, the NG mark set into the
 * ring. Your numbers appear only on hover or focus, as a small caption.
 */
const CoreEmblem = forwardRef<HTMLDivElement, { me: CoreInfo }>(function CoreEmblem({ me }, ref) {
  const pct = Math.max(0, Math.min(1, me.player.xpInLevel / Math.max(1, me.player.xpForNext)))
  const SIZE = 76
  const r = SIZE / 2 - 3
  const circ = 2 * Math.PI * r
  return (
    <div ref={ref} className="pointer-events-none absolute top-0 left-0 z-[1]" style={{ transform: 'translate(-9999px, -9999px)', transformOrigin: '50% 38px' }}>
      <div className="group pointer-events-auto relative flex flex-col items-center outline-none" tabIndex={0} aria-label={`You: web rank ${me.player.name}, level ${me.player.level}; ${formatNumber(me.player.xp)} XP, ${me.mastered} of ${me.total} skills mastered${me.streak !== undefined ? `, ${me.streak}-day streak` : ''}`}>
        <div className="relative rounded-full bg-bg-surface shadow-[0_6px_24px_-8px_rgb(0_0_0/0.45)]" style={{ width: SIZE, height: SIZE }}>
          <svg className="absolute inset-0 -rotate-90" width={SIZE} height={SIZE} aria-hidden="true">
            <defs>
              <linearGradient id="nx-core-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="var(--color-accent-brand)" />
              </linearGradient>
            </defs>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth="2" />
            <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke="url(#nx-core-ring)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`} />
          </svg>
          <span className="absolute inset-[9px] overflow-hidden rounded-full">
            <Avatar src={me.avatarUrl} avatar={me.avatar} name={me.displayName ?? me.username} seed={me.username} size="2xl" ring={false} className="!h-full !w-full" />
          </span>
          <span className="absolute -right-0.5 -bottom-0.5 flex size-[22px] items-center justify-center rounded-full bg-bg-surface ring-1 ring-border">
            <LogoMark size={14} />
          </span>
        </div>
        <p className="mt-1.5 mb-0 flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap text-text-primary">
          <RankGlyph level={me.player.level} size={14} animated={false} />
          {me.player.name} <span className="font-normal text-text-muted">· LVL {me.player.level}</span>
        </p>
        <p className="pointer-events-none absolute top-full mt-1.5 mb-0 rounded-md border border-border bg-bg-surface-2 px-2 py-1 font-mono text-[10.5px] whitespace-nowrap text-text-muted tabular-nums opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          {formatNumber(me.player.xp)} XP · {me.mastered}/{me.total} skills{me.streak !== undefined ? ` · ${me.streak}d streak` : ''}
        </p>
      </div>
    </div>
  )
})
