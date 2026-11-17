import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { assetUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AccentKey } from '@/components/social/feed/types'
import { lifeSeed, lifeStep, seedOf } from './coverFrames'
import './covers.css'

/*
 * Profile covers: moving patterns and two live animations, in the profile's
 * accent colour on tinted paper.
 *
 * Patterns: Hero Patterns by Steve Schoger (https://heropatterns.com),
 * CC BY 4.0, taken from the hero-patterns package and stored as
 * client/public/covers/<id>.svg. They are used as a mask, so the colour is
 * always the theme's own (light and dark, every theme). Credit is shown under
 * the cover choices in Edit profile.
 *
 * Motion: a cover only moves while it is on screen and the tab is visible;
 * with reduced motion (or `still`, the swatches in Edit profile) it stays put.
 */

type Pattern = { kind: 'pattern'; label: string; file: string; w: number; h: number; scale?: number }
type Live = { kind: 'live'; label: string }
type Plain = { kind: 'plain'; label: string }

export const COVERS: Record<string, Pattern | Live | Plain> = {
  plain: { kind: 'plain', label: 'Plain' },
  topography: { kind: 'pattern', label: 'Topography', file: 'topography', w: 600, h: 600, scale: 0.75 },
  'circuit-board': { kind: 'pattern', label: 'Circuit', file: 'circuit-board', w: 304, h: 304, scale: 0.8 },
  waves: { kind: 'live', label: 'Waves' },
  life: { kind: 'live', label: 'Life' },
  bubbles: { kind: 'pattern', label: 'Bubbles', file: 'bubbles', w: 100, h: 100 },
  jigsaw: { kind: 'pattern', label: 'Jigsaw', file: 'jigsaw', w: 192, h: 192, scale: 0.75 },
  temple: { kind: 'pattern', label: 'Temple', file: 'temple', w: 152, h: 152, scale: 0.75 },
  'four-point-stars': { kind: 'pattern', label: 'Stars', file: 'four-point-stars', w: 24, h: 24, scale: 1.25 },
  'overlapping-circles': { kind: 'pattern', label: 'Circles', file: 'overlapping-circles', w: 80, h: 80 },
  'endless-clouds': { kind: 'pattern', label: 'Clouds', file: 'endless-clouds', w: 56, h: 28, scale: 1.25 },
  wiggle: { kind: 'pattern', label: 'Wiggle', file: 'wiggle', w: 52, h: 26 },
  autumn: { kind: 'pattern', label: 'Autumn', file: 'autumn', w: 88, h: 24 },
  kiwi: { kind: 'pattern', label: 'Kiwi', file: 'kiwi', w: 34, h: 44, scale: 1.6 },
  'lines-in-motion': { kind: 'pattern', label: 'Lines', file: 'lines-in-motion', w: 120, h: 120 },
}
export const COVER_IDS = Object.keys(COVERS)

/** Covers saved before this set existed show the closest new one. */
const LEGACY: Record<string, string> = {
  aurora: 'topography',
  nebula: 'four-point-stars',
  ember: 'circuit-board',
  lagoon: 'waves',
  orchid: 'bubbles',
  dawn: 'autumn',
  graphite: 'life',
  matrix: 'circuit-board',
}
export const coverId = (cover: string) => (COVERS[cover] ? cover : (LEGACY[cover] ?? 'plain'))

const T = {
  brand: 'var(--color-accent-brand)',
  info: 'var(--color-state-info)',
  success: 'var(--color-state-success)',
  warning: 'var(--color-state-warning)',
  danger: 'var(--color-state-error)',
}

export const ACCENTS: Record<AccentKey, { label: string; color: string }> = {
  brand: { label: 'Brand', color: T.brand },
  info: { label: 'Sky', color: T.info },
  success: { label: 'Mint', color: T.success },
  warning: { label: 'Amber', color: T.warning },
  danger: { label: 'Rose', color: T.danger },
}

export function CoverArt({ cover, className, still, seed = 'nexora', accent }: { cover: string; className?: string; still?: boolean; seed?: string; accent?: AccentKey }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const onScreen = useOnScreen(ref, !still && !reduce)
  if (cover.startsWith('/uploads/')) {
    return (
      <div className={cn('cv relative overflow-hidden', className)} data-cover="image">
        <img src={assetUrl(cover)} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
    )
  }
  const id = coverId(cover)
  const c = COVERS[id]
  const run = !still && !reduce && onScreen
  const style: Record<string, string> = { '--cv-hi': ACCENTS[accent ?? 'brand']?.color ?? T.brand }
  if (c.kind === 'pattern') {
    const s = (c.scale ?? 1) * (still ? 0.6 : 1)
    const w = c.w * s
    const h = c.h * s
    style['--cv-src'] = `url('${import.meta.env.BASE_URL}covers/${c.file}.svg')`
    style['--cv-w'] = `${w}px`
    style['--cv-h'] = `${h}px`
    // About 14 px a second whatever the tile size, so every pattern drifts alike.
    style['--cv-time'] = `${Math.max(6, Math.hypot(w, h) / 14).toFixed(1)}s`
  }
  return (
    <div ref={ref} className={cn('cv relative overflow-hidden', className)} style={style as CSSProperties} data-cover={id} data-kind={c.kind} data-run={run ? '' : undefined} aria-hidden="true">
      {c.kind === 'pattern' && <div className="cv-pattern" />}
      {c.kind === 'live' && id === 'waves' && <Waves />}
      {c.kind === 'live' && id === 'life' && <Life seed={seed} run={run} />}
    </div>
  )
}

/** Patterns credit, shown wherever covers are chosen. */
export function CoverCredit({ className }: { className?: string }): ReactNode {
  return (
    <p className={cn('text-xs text-text-muted', className)}>
      Patterns from{' '}
      <a href="https://heropatterns.com" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-text-primary">
        Hero Patterns
      </a>{' '}
      by Steve Schoger (CC BY 4.0).
    </p>
  )
}

function useOnScreen(ref: React.RefObject<HTMLElement | null>, watch: boolean) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!watch || !el || typeof IntersectionObserver === 'undefined') return
    let seen = false
    const sync = () => setOn(seen && document.visibilityState === 'visible')
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting
      sync()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', sync)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [ref, watch])
  return on
}

/* ── Waves: layered sine curves sliding by, seamless (one period = 200). ── */
function Waves() {
  const paths = useMemo(() => {
    const wave = (amp: number, k: number, phase: number, y0: number) => {
      let d = ''
      for (let x = 0; x <= 1200; x += 4) d += `${x ? 'L' : 'M'}${x} ${(y0 - amp * Math.sin((2 * Math.PI * k * x) / 200 + phase)).toFixed(1)}`
      return `${d}L1200 220L0 220Z`
    }
    return [wave(14, 1, 0, 70), wave(18, 1, 1.4, 105), wave(12, 2, 2.6, 140), wave(16, 1, 4.1, 172)]
  }, [])
  return (
    <svg className="cv-svg" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice">
      {paths.map((d, k) => (
        <path key={k} d={d} className={`cv-wave cv-wave-${k}`} />
      ))}
    </svg>
  )
}

/* ── Life: Conway's Game of Life, newly born cells in full colour. ─────── */
const COLS = 64
const ROWS = 16
function Life({ seed, run }: { seed: string; run: boolean }) {
  const [state, setState] = useState(() => {
    let g = lifeSeed(seedOf(seed, 400), COLS, ROWS)
    let prev = g
    for (let k = 0; k < 12; k++) [prev, g] = [g, lifeStep(g, COLS, ROWS)]
    return { g, prev, gen: 12, round: 0 }
  })
  useEffect(() => {
    if (!run) return
    const t = window.setInterval(() => {
      setState((s) => {
        const alive = s.g.reduce((a, v) => a + v, 0)
        if (s.gen >= 220 || alive < 24) {
          const g = lifeSeed(seedOf(seed, 401 + s.round), COLS, ROWS)
          return { g, prev: g, gen: 0, round: s.round + 1 }
        }
        return { g: lifeStep(s.g, COLS, ROWS), prev: s.g, gen: s.gen + 1, round: s.round }
      })
    }, 240)
    return () => window.clearInterval(t)
  }, [run, seed])
  const cw = 800 / COLS
  const ch = 200 / ROWS
  const cells: ReactNode[] = []
  state.g.forEach((v, k) => {
    if (!v) return
    cells.push(<rect key={k} x={(k % COLS) * cw + 1.5} y={Math.floor(k / COLS) * ch + 1.5} width={cw - 3} height={ch - 3} rx={2} className={state.prev[k] ? 'cv-cell' : 'cv-cell-new'} />)
  })
  return (
    <svg className="cv-svg" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice">
      {cells}
    </svg>
  )
}
