import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { assetUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AccentKey } from '@/components/social/feed/types'
import { BALLOON, BLOSSOM, CAMEL, FISH, H, W, WARLI_BODY, WARLI_LIMBS, aurora, backwaters, balloons, cosmos, desert, dusk, forest, himalaya, lighthouse, lotus, ocean, reef, sakura, skyline, teaHills, warli } from './coverArt'
import './covers.css'

/*
 * Profile covers: twelve paper-cut scenes, our own artwork, each with its own
 * hand-picked palette (covers.css) and drawn from the profile's username
 * (coverArt.ts), so every profile has its own version. The scenes carry their
 * own colours, so they look the same in every theme, light or dark.
 *
 * Motion: a cover only moves while it is on screen and the tab is visible;
 * with reduced motion (or `still`, the swatches in Edit profile) it stays put.
 */

type Scene = { kind: 'scene'; label: string }
type Plain = { kind: 'plain'; label: string }

export const COVERS: Record<string, Scene | Plain> = {
  plain: { kind: 'plain', label: 'Plain' },
  dusk: { kind: 'scene', label: 'Dusk' },
  ocean: { kind: 'scene', label: 'Ocean' },
  sakura: { kind: 'scene', label: 'Sakura' },
  tea: { kind: 'scene', label: 'Tea hills' },
  desert: { kind: 'scene', label: 'Desert' },
  forest: { kind: 'scene', label: 'Forest' },
  skyline: { kind: 'scene', label: 'Skyline' },
  cosmos: { kind: 'scene', label: 'Cosmos' },
  warli: { kind: 'scene', label: 'Warli' },
  himalaya: { kind: 'scene', label: 'Himalaya' },
  backwaters: { kind: 'scene', label: 'Backwaters' },
  balloons: { kind: 'scene', label: 'Balloons' },
  lotus: { kind: 'scene', label: 'Lotus pond' },
  lighthouse: { kind: 'scene', label: 'Lighthouse' },
  reef: { kind: 'scene', label: 'Reef' },
  aurora: { kind: 'scene', label: 'Aurora' },
}
export const COVER_IDS = Object.keys(COVERS)

/** Covers saved before this set existed show the closest new one. */
const LEGACY: Record<string, string> = {
  waves: 'ocean',
  bauhaus: 'balloons',
  circuit: 'skyline',
  life: 'cosmos',
  topography: 'tea',
  'circuit-board': 'skyline',
  bubbles: 'reef',
  jigsaw: 'balloons',
  temple: 'himalaya',
  'four-point-stars': 'aurora',
  'overlapping-circles': 'lotus',
  'endless-clouds': 'sakura',
  wiggle: 'ocean',
  autumn: 'desert',
  kiwi: 'lotus',
  'lines-in-motion': 'ocean',
  nebula: 'cosmos',
  ember: 'desert',
  lagoon: 'backwaters',
  orchid: 'sakura',
  dawn: 'dusk',
  graphite: 'skyline',
  matrix: 'skyline',
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

const SCENES: Record<string, (p: { seed: string }) => ReactNode> = {
  dusk: ({ seed }) => <Dusk seed={seed} />,
  ocean: ({ seed }) => <Ocean seed={seed} />,
  sakura: ({ seed }) => <Sakura seed={seed} />,
  tea: ({ seed }) => <Tea seed={seed} />,
  desert: ({ seed }) => <Desert seed={seed} />,
  forest: ({ seed }) => <Forest seed={seed} />,
  skyline: ({ seed }) => <Skyline seed={seed} />,
  cosmos: ({ seed }) => <Cosmos seed={seed} />,
  warli: ({ seed }) => <Warli seed={seed} />,
  himalaya: ({ seed }) => <Himalaya seed={seed} />,
  backwaters: ({ seed }) => <Backwaters seed={seed} />,
  balloons: ({ seed }) => <Balloons seed={seed} />,
  lotus: ({ seed }) => <Lotus seed={seed} />,
  lighthouse: ({ seed }) => <Lighthouse seed={seed} />,
  reef: ({ seed }) => <Reef seed={seed} />,
  aurora: ({ seed }) => <Aurora seed={seed} />,
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
  return (
    <div ref={ref} className={cn('cv relative overflow-hidden', className)} style={style as CSSProperties} data-cover={id} data-kind={c.kind} data-run={run ? '' : undefined} aria-hidden="true">
      {SCENES[id]?.({ seed })}
    </div>
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

const Svg = ({ children, className }: { children: ReactNode; className?: string }) => (
  <svg className={cn('cv-svg', className)} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
    {children}
  </svg>
)
/** Flat bands of sky, top to bottom (a posterised sky, no gradients). */
const Bands = ({ n }: { n: number }) => (
  <>
    {Array.from({ length: n }, (_, k) => (
      <rect key={k} y={(k * H) / n - 0.5} width={W} height={H / n + 1} className={`cv-sky-${k}`} />
    ))}
  </>
)

/* ── Dusk: five ridges from violet to ink, a setting sun, stars and birds ── */
function Dusk({ seed }: { seed: string }) {
  const p = useMemo(() => dusk(seed), [seed])
  return (
    <Svg>
      <Bands n={5} />
      {p.stars.map((s, k) => (
        <circle key={k} cx={s.x} cy={s.y} r={s.r * 0.8} className="cv-twinkle cv-star" style={{ animationDelay: `${s.d}s` }} />
      ))}
      <circle cx={p.sun.cx} cy={p.sun.cy} r={p.sun.r} className="cv-sun" />
      {p.birds.map((b, k) => (
        <path key={k} d="M-8 0 Q-4 -5 0 0 Q4 -5 8 0" transform={`translate(${b.x} ${b.y}) scale(${b.s})`} className="cv-bird" style={{ animationDelay: `${k * 0.4}s` }} />
      ))}
      {p.ridges.map((d, k) => (
        <path key={k} d={d} className={`cv-layer cv-l${k}`} />
      ))}
    </Svg>
  )
}

/* ── Ocean: a sun over five bands of sea, and a sailboat riding them ─────── */
function Ocean({ seed }: { seed: string }) {
  const p = useMemo(() => ocean(seed), [seed])
  return (
    <Svg>
      <Bands n={3} />
      <circle cx={p.sun.cx} cy={p.sun.cy} r={p.sun.r} className="cv-sun" />
      <path d={p.waves[0]} className="cv-layer cv-l0" />
      <g transform={`translate(${p.boat} 112)`}>
        <g className="cv-boat">
          <path d="M-26 0 L26 0 L18 10 L-18 10 Z" className="cv-hull" />
          <path d="M0 -2 L0 -46 L24 -4 Z" className="cv-sail" />
          <path d="M-2 -2 L-2 -40 L-20 -4 Z" className="cv-sail2" />
        </g>
      </g>
      {p.waves.slice(1).map((d, k) => (
        <path key={k} d={d} className={`cv-layer cv-l${k + 1}`} />
      ))}
    </Svg>
  )
}

/* ── Sakura: a blossoming branch over soft hills; petals drift down ─────── */
function Sakura({ seed }: { seed: string }) {
  const p = useMemo(() => sakura(seed), [seed])
  return (
    <Svg>
      <Bands n={3} />
      {p.hills.map((d, k) => (
        <path key={k} d={d} className={`cv-layer cv-l${k}`} />
      ))}
      <g transform={p.flip ? `translate(${W} 0) scale(-1 1)` : undefined}>
        <path d={p.branch} className="cv-branch" />
        {p.twigs.map((d, k) => (
          <path key={k} d={d} className="cv-twig" />
        ))}
        {p.blossoms.map((b, k) => (
          <g key={k} transform={`translate(${b.x} ${b.y}) rotate(${b.rot}) scale(${b.s})`}>
            <path d={BLOSSOM} className={k % 3 ? 'cv-petal' : 'cv-petal2'} />
            <circle r={1.8} className="cv-heart" />
          </g>
        ))}
      </g>
      {p.petals.map((t, k) => (
        <g key={k} transform={`translate(${t.x} ${t.y})`}>
          <path d="M0 0 C3 -2 4 -7 0 -9 C-4 -7 -3 -2 0 0Z" className="cv-falling" style={{ animationDelay: `${t.d}s`, scale: `${t.s}` }} />
        </g>
      ))}
    </Svg>
  )
}

/* ── Tea hills: terraced green slopes under a pale sun ──────────────────── */
function Tea({ seed }: { seed: string }) {
  const p = useMemo(() => teaHills(seed), [seed])
  return (
    <Svg>
      <Bands n={3} />
      <circle cx={p.sun.cx} cy={p.sun.cy} r={p.sun.r} className="cv-sun" />
      {p.hills.map((d, k) => (
        <g key={k} className={`cv-layer cv-l${k}`}>
          <path d={d} />
          {[6, 13, 20, 27].map((o) => (
            <path key={o} d={d} transform={`translate(0 ${o})`} className="cv-terrace" />
          ))}
        </g>
      ))}
    </Svg>
  )
}

/* ── Desert: dunes, a low sun and a caravan crossing ─────────────────────── */
function Desert({ seed }: { seed: string }) {
  const p = useMemo(() => desert(seed), [seed])
  return (
    <Svg>
      <Bands n={3} />
      <circle cx={p.sun.cx} cy={p.sun.cy} r={p.sun.r} className="cv-sun" />
      {p.dunes.slice(0, 2).map((d, k) => (
        <path key={k} d={d} className={`cv-layer cv-l${k}`} />
      ))}
      <g className="cv-caravan">
        {[0, 1, 2].map((k) => (
          <g key={k} transform={`translate(${520 + k * 44} 150) scale(${1 - k * 0.08})`}>
            <path d={CAMEL} className="cv-camel" />
          </g>
        ))}
      </g>
      {p.dunes.slice(2).map((d, k) => (
        <path key={k} d={d} className={`cv-layer cv-l${k + 2}`} />
      ))}
    </Svg>
  )
}

/* ── Forest: four rows of pines in the mist, under a moon ────────────────── */
function Forest({ seed }: { seed: string }) {
  const p = useMemo(() => forest(seed), [seed])
  return (
    <Svg>
      <Bands n={3} />
      <circle cx={p.moon.cx} cy={p.moon.cy} r={p.moon.r} className="cv-sun" />
      {p.rows.map((d, k) => (
        <g key={k}>
          <path d={d} className={`cv-layer cv-l${k}`} />
          {k < 3 && <rect y={120 + k * 24} width={W} height={10} className="cv-mist" />}
        </g>
      ))}
    </Svg>
  )
}

/* ── Skyline: a city at night; windows switch on and off ────────────────── */
function Skyline({ seed }: { seed: string }) {
  const p = useMemo(() => skyline(seed), [seed])
  return (
    <Svg>
      <Bands n={3} />
      {p.stars.map((s, k) => (
        <circle key={k} cx={s.x} cy={s.y} r={s.r * 0.7} className="cv-twinkle cv-star" style={{ animationDelay: `${s.d}s` }} />
      ))}
      <circle cx={p.moon.cx} cy={p.moon.cy} r={p.moon.r} className="cv-sun" />
      <circle cx={p.moon.cx + 7} cy={p.moon.cy - 5} r={p.moon.r} className="cv-moon-bite" />
      {p.back.map((b, k) => (
        <rect key={k} x={b.x} y={b.y} width={b.w} height={b.h} className="cv-l0" />
      ))}
      {p.front.map((b, k) => (
        <rect key={k} x={b.x} y={b.y} width={b.w} height={b.h} className="cv-l1" />
      ))}
      {p.windows.map((w, k) => (
        <rect key={k} x={w.x} y={w.y} width={4} height={5} className="cv-window" style={{ animationDelay: `${w.d}s` }} />
      ))}
    </Svg>
  )
}

/* ── Cosmos: a ringed planet, two moons and a field of stars ─────────────── */
function Cosmos({ seed }: { seed: string }) {
  const p = useMemo(() => cosmos(seed), [seed])
  const { cx, cy, r, tilt } = p.planet
  return (
    <Svg>
      <Bands n={2} />
      {p.stars.map((s, k) => (
        <circle key={k} cx={s.x} cy={s.y} r={s.r} className={cn('cv-twinkle', k % 7 ? 'cv-star' : 'cv-star2')} style={{ animationDelay: `${s.d}s` }} />
      ))}
      <g transform={`rotate(${tilt} ${cx} ${cy})`}>
        <path d={`M${cx - r * 1.9} ${cy} A${r * 1.9} ${r * 0.42} 0 0 1 ${cx + r * 1.9} ${cy}`} className="cv-ring" />
        <circle cx={cx} cy={cy} r={r} className="cv-planet" />
        <path d={`M${cx - r} ${cy - r * 0.35} H${cx + r} M${cx - r * 0.95} ${cy + r * 0.25} H${cx + r * 0.95}`} className="cv-planet-band" />
        <path d={`M${cx - r * 1.9} ${cy} A${r * 1.9} ${r * 0.42} 0 0 0 ${cx + r * 1.9} ${cy}`} className="cv-ring" />
      </g>
      <g className="cv-orbit" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={p.moons[0].cx} cy={p.moons[0].cy} r={p.moons[0].r} className="cv-moon1" />
      </g>
      <circle cx={p.moons[1].cx} cy={p.moons[1].cy} r={p.moons[1].r} className="cv-moon2" />
    </Svg>
  )
}

/* ── Warli: rice-white dancers on an earth wall, huts, trees and the sun ─── */
function Warli({ seed }: { seed: string }) {
  const w = useMemo(() => warli(seed), [seed])
  return (
    <Svg>
      <rect width={W} height={H} className="cv-sky-0" />
      <g className="cv-white">
        <circle cx={w.sun.cx} cy={w.sun.cy} r={14} />
        {Array.from({ length: 12 }, (_, k) => {
          const a = (k / 12) * Math.PI * 2
          return <line key={k} x1={w.sun.cx + Math.cos(a) * 19} y1={w.sun.cy + Math.sin(a) * 19} x2={w.sun.cx + Math.cos(a) * 27} y2={w.sun.cy + Math.sin(a) * 27} />
        })}
        {w.huts.map((x, k) => (
          <g key={k} transform={`translate(${x} 92)`}>
            <path d="M-26 0 L0 -22 L26 0 Z M-18 0 H18 V24 H-18 Z" className="cv-hut" />
            <path d="M-4 24 V12 H4 V24" className="cv-line" />
          </g>
        ))}
        {w.trees.map((x, k) => (
          <path key={k} d="M0 0 V-70 M0 -20 L-16 -36 M0 -32 L16 -48 M0 -46 L-12 -60 M0 -58 L10 -70" transform={`translate(${x} 166)`} className="cv-line" />
        ))}
        <path d={`M0 168 H${W}`} className="cv-line cv-dotted" />
        {w.dancers.map((d, k) => (
          <g key={k} transform={`translate(${d.x} ${d.y})`}>
            <g className="cv-dance" style={{ animationDelay: `${d.d}s` }}>
              <circle cx={0} cy={-31} r={6} />
              <path d={WARLI_BODY} />
              <path d={WARLI_LIMBS} className="cv-line" />
            </g>
          </g>
        ))}
      </g>
    </Svg>
  )
}

/* ── Himalaya: two ranges with snow caps, prayer flags fluttering ──────── */
const FLAG = ['#2f6fb5', '#f7f2e6', '#d9443a', '#2f8f5b', '#f2c230']
function Himalaya({ seed }: { seed: string }) {
  const p = useMemo(() => himalaya(seed), [seed])
  return (
    <Svg>
      <Bands n={3} />
      <circle cx={p.sun.cx} cy={p.sun.cy} r={p.sun.r} className="cv-sun" />
      <g className="cv-layer cv-slow">
        <path d={p.far} className="cv-l0" />
        <path d={p.farSnow} className="cv-snow" />
      </g>
      <g className="cv-layer">
        <path d={p.near} className="cv-l1" />
        <path d={p.nearSnow} className="cv-snow" />
      </g>
      <path d={`M${p.flags[0].x} ${p.flags[0].y} ${p.flags.map((f) => `L${f.x} ${f.y}`).join(' ')}`} className="cv-string" />
      {p.flags.map((f, k) => (
        <rect key={k} x={f.x - 7} y={f.y} width={14} height={16} fill={FLAG[f.c]} className="cv-flag" style={{ animationDelay: `${(k % 6) * 0.25}s` }} />
      ))}
    </Svg>
  )
}

/* ── Backwaters: palms on a bank, a houseboat drifting by ────────────────── */
function Palm({ x, h, lean }: { x: number; h: number; lean: number }) {
  const tx = x + lean
  const ty = 134 - h
  return (
    <g>
      <path d={`M${x} 136 Q${x + lean * 0.2} ${136 - h / 2} ${tx} ${ty}`} className="cv-trunk" />
      <g className="cv-fronds" style={{ transformOrigin: `${tx}px ${ty}px` }}>
        {[-150, -110, -70, -30, 10, 50].map((a) => {
          const rad = (a * Math.PI) / 180
          const ex = tx + Math.cos(rad) * 34
          const ey = ty + Math.sin(rad) * 20 + 10
          return <path key={a} d={`M${tx} ${ty} Q${(tx + ex) / 2} ${ty - 12} ${ex} ${ey}`} className="cv-frond" />
        })}
      </g>
    </g>
  )
}
function Backwaters({ seed }: { seed: string }) {
  const p = useMemo(() => backwaters(seed), [seed])
  return (
    <Svg>
      <Bands n={3} />
      <circle cx={p.sun.cx} cy={p.sun.cy} r={p.sun.r} className="cv-sun" />
      <path d={p.shore} className="cv-l0" />
      {p.palms.map((t, k) => (
        <Palm key={k} {...t} />
      ))}
      <rect y={138} width={W} height={62} className="cv-l1" />
      {[148, 160, 174, 188].map((y, k) => (
        <path key={y} d={`M${40 + k * 90} ${y} h60 M${400 + k * 70} ${y + 4} h80`} className="cv-ripple-line" />
      ))}
      <g className="cv-houseboat-run">
        <g transform={`translate(${p.boat} 150)`}>
          <path d="M-60 0 C-40 12 40 12 64 -6 L60 -2 C40 6 -40 6 -60 0 Z" className="cv-hull2" />
          <path d="M-62 -2 C-50 10 50 10 66 -8 L58 0 C40 2 -40 2 -58 -2 Z" className="cv-hull" />
          <path d="M-36 -4 C-34 -30 30 -30 34 -4 Z" className="cv-thatch" />
          <path d="M-20 -6 V-16 M0 -6 V-20 M20 -6 V-16" className="cv-thatch-line" />
        </g>
      </g>
    </Svg>
  )
}

/* ── Balloons: five balloons drifting over striped fields ────────────────── */
const BALLOON_C = [
  ['#e4572e', '#f3a712'],
  ['#2e86ab', '#f6f5ae'],
  ['#8e44ad', '#f39c9c'],
  ['#2a9d8f', '#e9c46a'],
]
function Balloons({ seed }: { seed: string }) {
  const p = useMemo(() => balloons(seed), [seed])
  return (
    <Svg>
      <Bands n={3} />
      {p.fields.map((d, k) => (
        <path key={k} d={d} className={`cv-layer cv-l${k}`} />
      ))}
      {p.balloons.map((b, k) => (
        <g key={k} transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
          <g className="cv-float" style={{ animationDelay: `${b.d}s` }}>
            <path d={BALLOON} fill={BALLOON_C[b.c][0]} />
            <path d="M-6 -30 C-12 -10 -10 6 -4 14 L4 14 C10 6 12 -10 6 -30 Z" fill={BALLOON_C[b.c][1]} />
            <path d="M-9 14 L-5 26 M9 14 L5 26" className="cv-rope" />
            <rect x={-6} y={26} width={12} height={9} rx={1.5} className="cv-basket" />
          </g>
        </g>
      ))}
    </Svg>
  )
}

/* ── Lotus pond: lily pads, lotus flowers and ripples ────────────────────── */
function Lotus({ seed }: { seed: string }) {
  const p = useMemo(() => lotus(seed), [seed])
  return (
    <Svg>
      <Bands n={2} />
      {p.ripples.map((r, k) => (
        <ellipse key={k} cx={r.x} cy={r.y} rx={30} ry={8} className="cv-ripple" style={{ animationDelay: `${r.d}s` }} />
      ))}
      {p.pads.map((d, k) => (
        <g key={k} transform={`translate(${d.x} ${d.y}) scale(${d.s} ${d.s * 0.45}) rotate(${d.rot})`}>
          <path d="M0 0 L19.6 -4 A20 20 0 1 0 19.6 4 Z" className={k % 2 ? 'cv-pad1' : 'cv-pad2'} />
        </g>
      ))}
      {p.flowers.map((f, k) => (
        <g key={k} transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
          <g className="cv-bloom" style={{ animationDelay: `${k * 0.6}s` }}>
            <ellipse cx={0} cy={4} rx={18} ry={5} className="cv-pad1" />
            {[-60, -30, 0, 30, 60].map((a) => (
              <ellipse key={a} cx={0} cy={-10} rx={5} ry={13} transform={`rotate(${a} 0 2)`} className={a ? 'cv-lotus' : 'cv-lotus2'} />
            ))}
            <circle cx={0} cy={-2} r={3} className="cv-lotus-heart" />
          </g>
        </g>
      ))}
    </Svg>
  )
}

/* ── Lighthouse: a striped tower on a cliff; its beam sweeps the sea ─────── */
function Lighthouse({ seed }: { seed: string }) {
  const p = useMemo(() => lighthouse(seed), [seed])
  const x = p.x
  return (
    <Svg>
      <Bands n={3} />
      {p.stars.map((s, k) => (
        <circle key={k} cx={s.x} cy={s.y} r={s.r * 0.7} className="cv-twinkle cv-star" style={{ animationDelay: `${s.d}s` }} />
      ))}
      <circle cx={p.moon.cx} cy={p.moon.cy} r={p.moon.r} className="cv-sun" />
      <g className="cv-beam" style={{ transformOrigin: `${x}px 62px` }}>
        <path d={`M${x} 62 L${x - 420} 30 L${x - 420} 94 Z`} className="cv-beam-light" />
      </g>
      {p.waves.map((d, k) => (
        <path key={k} d={d} className={`cv-layer cv-l${k}`} />
      ))}
      <path d={`M${x - 90} 200 L${x - 70} 150 L${x - 30} 128 L${x + 40} 122 L${x + 110} 140 L${x + 160} 200 Z`} className="cv-cliff" />
      <path d={`M${x - 14} 124 L${x - 10} 70 L${x + 10} 70 L${x + 14} 124 Z`} className="cv-tower" />
      <path d={`M${x - 13} 110 L${x + 13} 110 L${x + 12} 98 L${x - 12} 98 Z M${x - 11.5} 86 L${x + 11.5} 86 L${x + 11} 76 L${x - 11} 76 Z`} className="cv-tower-band" />
      <rect x={x - 9} y={56} width={18} height={14} className="cv-lamp" />
      <path d={`M${x - 12} 56 L${x} 46 L${x + 12} 56 Z`} className="cv-tower-band" />
    </Svg>
  )
}

/* ── Reef: seaweed sways, fish swim by, bubbles rise ─────────────────────── */
const FISH_C = ['#f4a261', '#e76f51', '#ffd166', '#90e0ef']
function Reef({ seed }: { seed: string }) {
  const p = useMemo(() => reef(seed), [seed])
  return (
    <Svg>
      <Bands n={4} />
      {p.bubbles.map((b, k) => (
        <circle key={k} cx={b.x} cy={190} r={b.r} className="cv-bubble" style={{ animationDelay: `${b.d}s` }} />
      ))}
      {p.fish.map((f, k) => (
        <g key={k} transform={`translate(0 ${f.y})`}>
          <g className="cv-swim" style={{ animationDelay: `-${f.d}s`, animationDuration: `${f.dur}s` }}>
            <g transform={`scale(${f.s})`}>
              <path d={FISH} fill={FISH_C[f.c]} />
              <circle cx={-7} cy={-2} r={1.6} className="cv-eye" />
            </g>
          </g>
        </g>
      ))}
      {p.weeds.map((w, k) => (
        <path key={k} d={`M${w.x} 196 C${w.x - 10} ${196 - w.h / 3} ${w.x + 10} ${196 - (2 * w.h) / 3} ${w.x} ${196 - w.h}`} className="cv-weed" style={{ animationDelay: `${w.d}s` }} />
      ))}
      {p.corals.map((c, k) => (
        <g key={k} transform={`translate(${c.x} 188) scale(${c.s})`}>
          <path d="M0 0 V-24 M0 -14 L-12 -26 M0 -18 L12 -32 M-12 -26 V-36 M12 -32 V-40" className={`cv-coral cv-coral-${c.c}`} />
        </g>
      ))}
      <path d={p.sand} className="cv-sand" />
    </Svg>
  )
}

/* ── Aurora: ribbons of light ripple over snow and pines ─────────────────── */
function Aurora({ seed }: { seed: string }) {
  const p = useMemo(() => aurora(seed), [seed])
  return (
    <Svg>
      <Bands n={3} />
      {p.stars.map((s, k) => (
        <circle key={k} cx={s.x} cy={s.y} r={s.r * 0.7} className="cv-twinkle cv-star" style={{ animationDelay: `${s.d}s` }} />
      ))}
      {p.ribbons.map((d, k) => (
        <path key={k} d={d} className={`cv-layer cv-ribbon cv-ribbon-${k}`} />
      ))}
      <path d={p.trees} className="cv-layer cv-l1" />
      <path d={p.snow} className="cv-snow" />
    </Svg>
  )
}
