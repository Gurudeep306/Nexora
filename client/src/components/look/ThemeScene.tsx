/*
  The drawn scene behind every page: one per theme (snow peaks, a coral reef,
  a desert fort…). Three layers sit behind the content: the sky (covers the
  window), a corner piece (top right, hidden on phones) and the ground (along
  the bottom edge). Colours come from the theme (theme-scene.css), so each
  scene has a day and a night version; motion is CSS only, slow, and off for
  reduced motion. Shapes are in sceneArt.ts.

  Rendered once by AppLayout (fixed, behind the page) and small inside each
  theme card on the Appearance page.
*/
import { memo, useMemo, type ReactNode } from 'react'
import * as A from './sceneArt'
import { cn } from '@/lib/utils'
import './theme-scene.css'

const SKY = { viewBox: `0 0 ${A.SW} ${A.SH}`, preserveAspectRatio: 'xMidYMin slice' }
const GROUND = { viewBox: `0 0 ${A.GW} ${A.GH}`, preserveAspectRatio: 'xMidYMax slice' }
const CORNER = { viewBox: '0 0 400 300', preserveAspectRatio: 'xMaxYMin meet' }

type Parts = { sky?: ReactNode; corner?: ReactNode; ground?: ReactNode }

function Stars({ list, big = 1 }: { list: { x: number; y: number; s: number; d: number }[]; big?: number }) {
  return (
    <g className="ts-night">
      {list.map((s, i) => (
        <circle key={i} className={cn('ts-star', i % 3 === 0 && 'ts-twinkle')} cx={s.x} cy={s.y} r={s.s * big} style={{ animationDelay: `${s.d}s` }} />
      ))}
    </g>
  )
}

function Birds({ list, cls = 'ts-bird' }: { list: { x: number; y: number; s?: number; d: number }[]; cls?: string }) {
  return (
    <g className="ts-flock">
      {list.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y}) scale(${b.s ?? 1})`}>
          <path className={cls} d="M-12 0 Q-6 -7 0 0 Q6 -7 12 0" style={{ animationDelay: `${b.d}s` }} />
        </g>
      ))}
    </g>
  )
}

/** Sun by day, moon by night (the theme's CSS shows one). */
function SunMoon({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle className="ts-day ts-sun" cx={cx} cy={cy} r={r} />
      <g className="ts-night">
        <circle className="ts-moon" cx={cx} cy={cy} r={r * 0.62} />
        <circle className="ts-crater" cx={cx - r * 0.2} cy={cy - r * 0.12} r={r * 0.12} />
        <circle className="ts-crater" cx={cx + r * 0.22} cy={cy + r * 0.18} r={r * 0.08} />
        <circle className="ts-crater" cx={cx + r * 0.05} cy={cy + r * 0.32} r={r * 0.06} />
      </g>
    </g>
  )
}

/* ── The twelve scenes ─────────────────────────────────────────────────── */

function himalaya(): Parts {
  const s = A.himalaya()
  return {
    sky: (
      <>
        <Stars list={s.stars} />
        <SunMoon cx={1280} cy={250} r={74} />
        <g className="ts-drift">
          {s.clouds.map((d, i) => (
            <path key={i} className="ts-cloud" d={d} style={{ animationDelay: `${-i * 30}s` }} />
          ))}
        </g>
        <Birds list={s.birds} />
      </>
    ),
    ground: (
      <>
        <path className="c-far" d={s.far} />
        {s.farSnow.map((d, i) => <path key={i} className="c-snow" d={d} />)}
        <path className="c-mid" d={s.mid} />
        {s.midSnow.map((d, i) => <path key={i} className="c-snow2" d={d} />)}
        <path className="c-near" d={s.near} />
        <path className="c-tree" d={s.trees} />
        <path className="ts-line" d={s.line} />
        <path className="ts-pole" d={s.poles} />
        {s.flags.map((fl, i) => (
          <path key={i} className={`ts-flag f${fl.c}`} d={`M${fl.x - 7} ${fl.y}h14v16h-14Z`} style={{ animationDelay: `${(i % 4) * 0.3}s` }} />
        ))}
        <path className="c-front" d={s.front} />
      </>
    ),
  }
}

function aurora(): Parts {
  const s = A.aurora()
  return {
    sky: (
      <>
        <Stars list={s.stars} />
        <g className="ts-aurora">
          {s.ribbons.map((d, i) => <path key={i} className={`ts-ribbon r${i}`} d={d} />)}
          {s.streaks.map((k, i) => <rect key={i} className={`ts-streak r${i % 3}`} x={k.x} y={k.y} width={k.w} height={k.h} />)}
        </g>
        {s.shooting.map((m, i) => (
          <g key={i} className="ts-night">
            <path className="ts-shoot" d={`M${m.x} ${m.y}l140 50`} style={{ animationDelay: `${m.d}s` }} />
          </g>
        ))}
      </>
    ),
    corner: (
      <g className="ts-night">
        <path className="ts-moon" d="M330 60 a46 46 0 1 0 40 70 a38 38 0 1 1 -40 -70 Z" />
      </g>
    ),
    ground: (
      <>
        <path className="c-far" d={s.far} />
        {s.farSnow.map((d, i) => <path key={i} className="c-snow" d={d} />)}
        <path className="c-lake" d={s.lake} />
        <path className="c-near" d={s.ridge} />
        <path className="c-tree" d={s.trees} />
        <g transform="translate(1100 286)">
          <path className="c-cabin" d="M0 0 V-30 H70 V0 Z M-8 -30 L35 -58 L78 -30 Z M48 -58 V-44 H58 V-52 Z" />
          <rect className="ts-window" x="12" y="-22" width="12" height="10" />
          <rect className="ts-window" x="44" y="-22" width="12" height="10" />
          <path className="ts-smoke" d="M53 -60 q-8 -10 0 -20 q8 -10 0 -20" />
        </g>
      </>
    ),
  }
}

function sakura(): Parts {
  const s = A.sakura()
  return {
    sky: (
      <>
        <Stars list={s.stars} />
        <SunMoon cx={300} cy={300} r={110} />
        {s.petals.map((p) => (
          <g key={p.k} className="ts-petal-lane" style={{ transform: `translateX(${p.x}px)` }}>
            <path className="ts-petal" d="M0 0 C4 -3 4.5 -10 0 -12.5 C-4.5 -10 -4 -3 0 0 Z" style={{ animationDuration: `${p.t}s`, animationDelay: `${p.d}s`, scale: `${p.s}` }} />
          </g>
        ))}
      </>
    ),
    corner: (
      <>
        <path className="ts-branch" d={s.branch} />
        {s.twigs.map((d, i) => <path key={i} className="ts-twig" d={d} />)}
        {s.flowers.map((fl, i) => <path key={i} className={fl.deep ? 'ts-blossom2' : 'ts-blossom'} d={fl.d} />)}
        {s.buds.map((b, i) => <circle key={i} className="ts-bud" cx={b.x} cy={b.y} r={b.s} />)}
      </>
    ),
    ground: (
      <>
        <path className="c-far" d={s.fuji} />
        <path className="c-snow" d={s.fujiSnow} />
        {s.mist.map((d, i) => <path key={i} className={`c-mist m${i}`} d={d} />)}
        <path className="c-mid" d={s.hill} />
        <path className="c-tree" d={s.pagoda} />
        {s.trees.map((t, i) => (
          <g key={i}>
            <path className="c-trunk" d={t.trunk} />
            <path className="c-crown" d={t.crown} />
          </g>
        ))}
        <path className="c-front" d={s.front} />
      </>
    ),
  }
}

function thar(): Parts {
  const s = A.thar()
  return {
    sky: (
      <>
        <Stars list={s.stars} />
        <SunMoon cx={1240} cy={320} r={96} />
        <Birds list={s.birds} />
      </>
    ),
    ground: (
      <>
        <path className="c-far" d={s.far} />
        <path className="c-fort" d={s.fort} />
        {s.windows.map(([x, y], i) => <path key={i} className="ts-window" d={`M${x} ${y}v-8a4 4 0 0 1 8 0v8Z`} />)}
        <path className="ts-line" d={s.flag} />
        <path className="c-mid" d={s.mid} />
        <g className="ts-caravan">
          {[0, 1, 2, 3, 4].map((k) => (
            <g key={k} transform={`translate(${-k * 46} 0)`}>
              <path className="c-camel" d="M0 0 L2 -18 Q4 -30 14 -30 Q18 -40 26 -32 Q30 -26 36 -28 L40 -40 L46 -42 L48 -38 L44 -36 L40 -22 Q40 -16 36 -14 L36 0 L33 0 L32 -12 L14 -12 L12 0 L9 0 L8 -14 Q4 -14 3 0 Z" />
              {k === 0 && <path className="c-camel" d="M18 -32 l2 -10 a4 4 0 1 1 6 0 l1 10 Z" />}
            </g>
          ))}
        </g>
        <path className="c-near" d={s.near} />
        <path className="ts-ripple" d={s.ripples} />
        <path className="ts-trunk-line" d={s.tree} />
        {s.crown.map((d, i) => <path key={i} className="c-crown" d={d} />)}
        <path className="c-front" d={s.front} />
      </>
    ),
  }
}

function WarliPerson({ p, pot }: { p: ReturnType<typeof A.warliFigure>; pot?: boolean }) {
  return (
    <>
      <circle className="w-fill" cx={p.head.cx} cy={p.head.cy} r={p.head.r} />
      <path className="w-fill" d={p.body} />
      <path className="w-line" d={p.legs} />
      {pot && <circle className="w-fill" cx={p.head.cx} cy={p.head.cy - p.head.r * 2.2} r={p.head.r * 1.3} />}
    </>
  )
}

function warli(): Parts {
  const s = A.warli()
  return {
    corner: (
      <g transform="translate(300 110)">
        <circle className="w-fill" r="34" />
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} className="w-fill" d="M-5 -44 L0 -62 L5 -44 Z" transform={`rotate(${i * 22.5})`} />
        ))}
        <g className="ts-spin">
          <circle className="w-ring" r="76" />
        </g>
      </g>
    ),
    sky: <Birds list={s.birds} cls="w-bird" />,
    ground: (
      <>
        <path className="w-line" d={s.ground} />
        {s.dots.map((d, i) => <circle key={i} className="w-fill" cx={d.x} cy={d.y} r={1.4} />)}
        {s.huts.map((d, i) => <path key={i} className="w-hut" d={d} />)}
        {s.trees.map((d, i) => <path key={i} className="w-line" d={d} />)}
        {s.leaves.map((l, i) => <circle key={i} className="w-fill" cx={l.x} cy={l.y} r={l.r} />)}
        {s.walkers.map((w, i) => (
          <g key={i} className={cn('w-walk', i % 2 === 1 && 'w-alt')}>
            <WarliPerson p={w} pot={w.pot} />
            <path className="w-line" d={`M${w.x} ${w.shoulder[0]}l-9 10M${w.x} ${w.shoulder[0]}l9 -10`} />
          </g>
        ))}
        <path className="w-line" d={s.arms} />
        {s.dancers.map((d, i) => (
          <g key={i} className={cn('w-dance', d.odd && 'w-alt')}>
            <WarliPerson p={d} />
          </g>
        ))}
        <g className="w-dance">
          <WarliPerson p={s.musician} />
          <path className="w-line" d={`M${s.musician.head.cx} ${s.musician.head.cy + 6}l40 -22 M${s.musician.head.cx + 40} ${s.musician.head.cy - 16}l8 -6`} />
        </g>
      </>
    ),
  }
}

function reef(): Parts {
  const s = A.reef()
  return {
    sky: (
      <>
        <g className="ts-rays">
          {s.rays.map((r) => <path key={r.k} className="ts-ray" d={r.d} style={{ animationDelay: `${-r.k * 2}s` }} />)}
        </g>
        {s.fish.map((f, i) => (
          <g key={i} className={cn('ts-swim', f.flip && 'ts-swim-back')} style={{ animationDuration: `${f.t}s`, animationDelay: `${f.d}s` }}>
            <g transform={`translate(0 ${f.y}) scale(${f.flip ? -f.s : f.s} ${f.s})`}>
              <path className={`ts-fish k${i % 3}`} d="M0 0 C10 -12 34 -12 44 0 C34 12 10 12 0 0 Z M44 0 L58 -10 L56 0 L58 10 Z" />
              <circle className="ts-eye" cx="10" cy="-2" r="2" />
            </g>
          </g>
        ))}
        <g className="ts-night">
          {s.jelly.map((j, i) => (
            <g key={i} transform={`translate(${j.x} ${j.y})`}>
              <g className="ts-jelly" style={{ animationDelay: `${-i * 3}s` }}>
                <path className="ts-jelly-bell" d="M-26 0 A26 24 0 0 1 26 0 Q13 6 0 0 Q-13 6 -26 0 Z" />
                <path className="ts-jelly-legs" d="M-16 2 q-4 18 2 36 M-5 3 q4 20 -2 44 M6 3 q-4 18 2 40 M16 2 q4 16 -2 32" />
              </g>
            </g>
          ))}
        </g>
        <g className="ts-day">
          <g className="ts-turtle-path">
            <g transform={`translate(0 ${s.turtle.y})`}>
              <path className="ts-turtle" d="M-36 0 A36 22 0 0 1 36 0 A36 14 0 0 1 -36 0 Z M36 -4 a10 8 0 1 1 0.1 8 Z M-20 10 l-14 14 l10 -2 Z M18 10 l16 14 l-4 -12 Z M-24 -8 l-18 -12 l4 12 Z M20 -8 l22 -16 l-4 14 Z" />
              <path className="ts-shell" d="M-18 -6 L0 -14 L18 -6 L12 6 L-12 6 Z" />
            </g>
          </g>
        </g>
        {s.bubbles.map((b, i) => (
          <circle key={i} className="ts-bubble" cx={b.x} cy={980} r={b.r} style={{ animationDuration: `${b.t}s`, animationDelay: `${b.d}s` }} />
        ))}
      </>
    ),
    ground: (
      <>
        <path className="c-far" d={s.rock} />
        {s.kelp.map((k) => <path key={k.k} className="ts-kelp" d={k.d} style={{ transformOrigin: `${k.x}px 320px`, animationDelay: `${-k.k * 0.9}s` }} />)}
        {s.fans.map((d, i) => <path key={i} className="ts-fan" d={d} />)}
        {s.corals.map((d, i) => <path key={i} className={`ts-coral k${i % 2}`} d={d} />)}
        <path className="c-near" d={s.sand} />
        {s.brains.map((b, i) => (
          <g key={i}>
            <path className="c-brain" d={`M${b.x - b.r} 300 a${b.r} ${b.r * 0.8} 0 0 1 ${b.r * 2} 0 Z`} />
            <path className="ts-brain-line" d={`M${b.x - b.r * 0.7} 296 q${b.r * 0.35} -${b.r * 0.5} ${b.r * 0.7} 0 t${b.r * 0.7} 0`} />
          </g>
        ))}
      </>
    ),
  }
}

function bauhaus(): Parts {
  const s = A.bauhaus()
  const c = s.corner
  const g = s.ground
  const fills = ['b-red', 'b-yellow', 'b-blue']
  return {
    corner: (
      <>
        <circle className="b-yellow" cx={c.circle.cx} cy={c.circle.cy} r={c.circle.r} />
        <g className="ts-spin" style={{ transformOrigin: `${c.ring.cx}px ${c.ring.cy}px` }}>
          <circle className="b-ring" cx={c.ring.cx} cy={c.ring.cy} r={c.ring.r} />
          <circle className="b-black" cx={c.ring.cx + c.ring.r} cy={c.ring.cy} r="8" />
        </g>
        <path className="b-red" d={c.half} />
        <rect className="b-black" x={c.bar.x} y={c.bar.y} width={c.bar.w} height={c.bar.h} />
        <rect className="b-blue" x={c.square.x} y={c.square.y} width={c.square.s} height={c.square.s} />
        <circle className="b-black" cx={c.dot.cx} cy={c.dot.cy} r={c.dot.r} />
        <path className="b-rule" d={c.lines} />
      </>
    ),
    sky: (
      <>
        {s.floats.map((fl, i) => (
          <g key={i} transform={`translate(${fl.x} ${fl.y})`}>
            <path className={cn('ts-float', i ? 'b-blue' : 'b-red')} d={fl.d} style={{ animationDuration: `${fl.t}s` }} />
          </g>
        ))}
      </>
    ),
    ground: (
      <>
        <path className="b-blue" d={g.quarter} />
        {g.semis.map((m, i) => <path key={i} className={fills[m.c]} d={m.d} />)}
        <path className="b-black" d={g.stripes} />
        <path className="b-yellow" d={g.tri} />
        <circle className="b-red" cx={g.circle.cx} cy={g.circle.cy} r={g.circle.r} />
        <path className="b-paper" d={`M${g.circle.cx - g.circle.r} ${g.circle.cy} A${g.circle.r} ${g.circle.r} 0 0 0 ${g.circle.cx + g.circle.r} ${g.circle.cy} Z`} />
        {g.checks.map((k, i) => k.on && <rect key={i} className="b-black" x={k.x} y={k.y} width="30" height="30" />)}
      </>
    ),
  }
}

function arcade(): Parts {
  const s = A.arcade()
  const P = s.P
  return {
    sky: (
      <>
        {s.pstars.map((p, i) => (
          <rect key={i} className={cn('ts-pstar', i % 4 === 0 && 'ts-blink')} x={p.x} y={p.y} width={p.big ? P : P / 2} height={p.big ? P : P / 2} style={{ animationDelay: `${p.d}s` }} />
        ))}
        <g className="ts-night">{s.moon.map(([x, y], i) => <rect key={i} className="ts-moon" x={x} y={y} width={P} height={P} />)}</g>
        <g className="ts-day">
          {s.moon.map(([x, y], i) => <rect key={i} className="ts-sun" x={x} y={y} width={P} height={P} />)}
          {s.clouds.map((cl, j) => (
            <g key={j} className="ts-pcloud" style={{ animationDelay: `${-j * 20}s` }}>
              {cl.map(([x, y], i) => <rect key={i} className="ts-cloud" x={x} y={y} width={P} height={P} />)}
            </g>
          ))}
        </g>
        <g className="ts-comet">
          <rect className="ts-moon" x="0" y="0" width={P} height={P} />
          <rect className="ts-star" x={-P * 2} y={-P} width={P} height={P / 2} />
          <rect className="ts-star" x={-P * 4} y={-P * 2} width={P} height={P / 2} />
        </g>
      </>
    ),
    ground: (
      <>
        {s.back.map((b, i) => <rect key={i} className="c-far" x={b.x} y={b.y} width={b.w} height={b.h} />)}
        {s.antennas.map((a, i) => <rect key={i} className="c-far" x={a.x} y={a.y - P * 4} width={P / 2} height={P * 4} />)}
        {s.front.map((b, i) => <rect key={i} className="c-mid" x={b.x} y={b.y} width={b.w} height={b.h} />)}
        {s.windows.map((w, i) => (
          <rect key={i} className={cn('ts-pwin', w.on && 'on', i % 5 === 0 && 'ts-flicker')} x={w.x} y={w.y} width={P} height={P} style={{ animationDelay: `${w.d}s` }} />
        ))}
      </>
    ),
  }
}

function blueprint(): Parts {
  const s = A.blueprint()
  return {
    sky: <path className="bp-faint" d={s.construct} />,
    corner: (
      <>
        <g transform="translate(270 120)">
          <g className="ts-spin">
            <path className="bp-line" d={s.gear} />
          </g>
          <path className="bp-faint" d="M-130 0 H130 M0 -130 V130" />
        </g>
        <g transform="translate(140 214)">
          <g className="ts-spin-back">
            <path className="bp-line" d={s.gear2} />
          </g>
        </g>
        <text className="bp-text" x="190" y="282">GEAR Ø192 · 14T</text>
      </>
    ),
    ground: (
      <>
        <path className="bp-line" d={s.towers} />
        <path className="bp-line" d={s.cables} />
        <path className="bp-faint" d={s.hangers} />
        <path className="bp-line" d={s.deck} />
        <path className="bp-faint" d={s.truss} />
        <path className="bp-faint" d={s.water} />
        <path className="bp-line" d={s.dims} />
        {s.labels.map((l, i) => <text key={i} className="bp-text" x={l.x} y={l.y} textAnchor={i === 0 ? 'middle' : 'start'}>{l.t}</text>)}
        <g className="ts-car">
          <path className="bp-line" d={`M0 ${s.car.y}h34v-8h-8l-6 -6h-10l-6 6h-4Z`} />
        </g>
      </>
    ),
  }
}

function kerala(): Parts {
  const s = A.kerala()
  return {
    sky: (
      <>
        <Stars list={s.stars} />
        <SunMoon cx={1200} cy={300} r={80} />
        <g className="ts-drift">{s.clouds.map((d, i) => <path key={i} className="ts-cloud" d={d} style={{ animationDelay: `${-i * 40}s` }} />)}</g>
        <Birds list={s.egrets} cls="ts-egret" />
      </>
    ),
    ground: (
      <>
        {s.hills.map((d, i) => <path key={i} className={i ? 'c-mid' : 'c-far'} d={d} />)}
        <path className="c-paddy" d={s.paddy[0]} />
        <path className="c-paddy2" d={s.paddy[1]} />
        <path className="c-water" d={s.water} />
        <path className="ts-ripple" d={s.ripples} />
        <g className="c-reflect">
          {s.reflections.map((p, i) => (
            <g key={i} transform="translate(0 492) scale(1 -1)">
              <path d={p.trunk} />
              <path d={p.fronds} />
            </g>
          ))}
        </g>
        <path className="c-bank" d={s.bank} />
        {s.palms.map((p, i) => (
          <g key={i}>
            <path className="c-trunk" d={p.trunk} />
            <path className="c-frond" d={p.fronds} />
            <circle className="c-nut" cx={p.nuts.x - 4} cy={p.nuts.y} r="4" />
            <circle className="c-nut" cx={p.nuts.x + 4} cy={p.nuts.y + 2} r="4" />
          </g>
        ))}
        <g className="ts-sail">
          <g transform="translate(0 262)">
            <path className="c-hull" d={s.boat.hull} />
            <path className="c-roof" d={s.boat.roof} />
            <path className="ts-rib" d={s.boat.ribs} />
          </g>
        </g>
        <g className="ts-sail-slow">
          <g transform="translate(0 296)">
            <path className="c-hull" d={s.canoe} />
          </g>
        </g>
      </>
    ),
  }
}

function cosmos(): Parts {
  const s = A.cosmos()
  return {
    sky: (
      <>
        <g className="ts-allstars">
          {s.stars.map((st, i) => (
            <circle key={i} className={cn('ts-star', i % 4 === 0 && 'ts-twinkle')} cx={st.x} cy={st.y} r={st.s * 0.8} style={{ animationDelay: `${st.d}s` }} />
          ))}
        </g>
        {s.shooting.map((m, i) => <path key={i} className="ts-shoot" d={`M${m.x} ${m.y}l160 56`} style={{ animationDelay: `${m.d}s` }} />)}
        <g transform={`translate(${s.comet.x} ${s.comet.y}) rotate(-24)`}>
          <path className="ts-tail" d="M0 -10 L-220 -2 L-220 2 L0 10 Z" />
          <path className="ts-tail2" d="M0 -5 L-140 0 L0 5 Z" />
          <circle className="ts-moon" r="9" />
        </g>
        <g transform={`translate(${s.galaxy.x} ${s.galaxy.y}) rotate(-20)`} className="ts-galaxy">
          <ellipse rx="70" ry="18" />
          <ellipse rx="44" ry="11" />
          <ellipse rx="18" ry="6" className="core" />
        </g>
        {s.small.map((p, i) => (
          <g key={i}>
            <circle className={`ts-planet p${p.c}`} cx={p.cx} cy={p.cy} r={p.r} />
            <path className="ts-planet-band" d={`M${p.cx - p.r * 0.9} ${p.cy - p.r * 0.2}h${p.r * 1.8}`} />
          </g>
        ))}
      </>
    ),
    corner: (
      <g transform="translate(250 140)">
        <g className="ts-orbit-ring">
          <ellipse rx="150" ry="44" transform="rotate(-14)" />
        </g>
        <path className="ts-ring" d="M-112 0 A112 30 0 0 0 112 0" transform="rotate(-14)" />
        <circle className="ts-planet p0" r="70" />
        <path className="ts-planet-band" d="M-66 -20 Q0 -30 66 -20 M-70 4 Q0 -6 70 4 M-62 28 Q0 20 62 28" />
        <path className="ts-ring" d="M-112 0 A112 30 0 0 1 112 0" transform="rotate(-14)" />
        <g transform="rotate(-14) scale(1 0.29)">
          <g className="ts-orbit">
            <circle className="ts-moon" cx="150" cy="0" r="22" />
          </g>
        </g>
      </g>
    ),
    ground: (
      <>
        <path className="c-near" d={s.ground} />
        {s.craters.map((c, i) => <ellipse key={i} className="c-crater" cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} />)}
        <path className="ts-line" d={s.flag} />
      </>
    ),
  }
}

function ghats(): Parts {
  const s = A.ghats()
  return {
    sky: (
      <>
        <Stars list={s.stars} />
        <SunMoon cx={1160} cy={300} r={92} />
        <Birds list={s.birds} />
        {s.kites.map((k, i) => (
          <g key={i} transform={`translate(${k.x} ${k.y}) scale(${k.s})`}>
            <g className="ts-kite" style={{ animationDelay: `${-i * 2}s` }}>
              <path className="ts-kite-body" d="M0 -26 L20 0 L0 30 L-20 0 Z" />
              <path className="ts-kite-line" d="M0 -26 V30 M-20 0 H20 M0 30 q10 40 -8 90 q-14 40 20 120" />
            </g>
          </g>
        ))}
      </>
    ),
    ground: (
      <>
        <path className="c-far" d={s.town} />
        <path className="c-mid" d={s.spires} />
        <path className="ts-pennant" d={s.flags} />
        <path className="c-steps" d={`M0 176 H${A.GW} V236 H0 Z`} />
        <path className="ts-step-line" d={s.steps} />
        {s.umbrellas.map((u, i) => (
          <g key={i} transform={`translate(${u.x} ${u.y})`}>
            <path className="c-umbrella" d={`M${-u.w} 0 Q0 -22 ${u.w} 0 Z`} />
            <path className="ts-line" d="M0 0 V22" />
          </g>
        ))}
        <path className="c-water" d={s.water} />
        <path className="ts-ripple" d={s.ripples} />
        {s.boats.map((b, i) => (
          <g key={i} className="ts-sail" style={{ animationDuration: `${b.t}s`, animationDelay: `${b.d}s` }}>
            <g transform={`translate(0 ${b.y})`}>
              <path className="c-hull" d="M-60 0 Q0 14 60 0 L52 -6 L-52 -6 Z" />
              <path className="ts-line" d="M10 -6 L30 -46 M-20 -6 V-24 M-20 -28 a4 4 0 1 0 0.1 0" />
            </g>
          </g>
        ))}
        {s.diyas.map((d, i) => (
          <g key={i} className="ts-diya-lane" style={{ animationDuration: `${d.t}s`, animationDelay: `${d.d}s` }}>
            <g transform={`translate(0 ${d.y}) scale(${d.s})`}>
              <path className="c-leaf" d="M-10 0 Q0 7 10 0 Q0 2 -10 0 Z" />
              <path className="ts-flame" d="M0 -1 Q-4 -7 0 -14 Q4 -7 0 -1 Z" />
            </g>
          </g>
        ))}
      </>
    ),
  }
}

const SCENES: Record<string, () => Parts> = { himalaya, aurora, sakura, thar, warli, reef, bauhaus, arcade, blueprint, kerala, cosmos, ghats }

export function hasScene(id: string | undefined): boolean {
  return !!id && id in SCENES
}

/**
 * A theme's scene. On a page (`page`) the sky is fixed behind the window and
 * the landscape is a band across the top of the page, under the header, that
 * scrolls away with it; in a theme card everything fills the card.
 */
export const ThemeScene = memo(function ThemeScene({ scene, page = false, className }: { scene: string; page?: boolean; className?: string }) {
  const parts = useMemo(() => (SCENES[scene] ? SCENES[scene]() : null), [scene])
  if (!parts) return null
  const sky = parts.sky && (
    <svg className="ts-sky" {...SKY}>
      {parts.sky}
    </svg>
  )
  const land = (
    <>
      {parts.ground && (
        <svg className="ts-ground" {...GROUND}>
          {parts.ground}
        </svg>
      )}
      {parts.corner && (
        <svg className="ts-corner" {...CORNER}>
          {parts.corner}
        </svg>
      )}
    </>
  )
  if (page)
    return (
      <>
        {sky && (
          <span className={cn('ts ts-fixed', className)} data-scene={scene} aria-hidden="true">
            {sky}
          </span>
        )}
        <span className={cn('ts ts-band', className)} data-scene={scene} aria-hidden="true">
          {land}
        </span>
      </>
    )
  return (
    <span className={cn('ts', className)} data-scene={scene} aria-hidden="true">
      {sky}
      {land}
    </span>
  )
})
