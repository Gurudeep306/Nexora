/*
  Stage kit: plots. A curve y = f(x) or x(t), y(t) — drawn up to a point,
  with the area under it, Riemann rectangles, a tangent and a secant — and
  charts: line charts (log axes too), bar charts and histograms counted from
  real samples. Flat on the page in 2D; with `upright` (curves) or always
  (charts) they stand up in 3D.
*/
import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { FlatText, Quads } from '../../three/prims'
import type { V3 } from '../../three/coords'
import { mix } from '../../three/theme3d'
import { Mat } from '../../three/studio'
import type { StageElement } from '../spec'
import { histogram } from '../layout'
import { clamp01, fmt, opOf, planeMap, SERIES, ticks, toneColor, useFn, type ElCtx } from './shared'

type El<T extends StageElement['type']> = { el: Extract<StageElement, { type: T }>; c: ElCtx }

export function CurveEl({ el, c }: El<'curve'>) {
  const f = useFn(el.f, ['x'], c.params)
  const fx = useFn(el.x, ['t'], c.params)
  const fy = useFn(el.y, ['t'], c.params)
  const [sx, sy] = el.scale ?? [1, 1]
  const map = planeMap(el.at, c.lift, el.upright)
  const P = (x: number, y: number) => map(x * sx, y * sy)
  const n = el.n ?? 240
  const [a, b] = el.range
  const pts = useMemo(() => {
    const out: [number, number][] = []
    for (let i = 0; i <= n; i++) {
      const u = a + ((b - a) * i) / n
      const q: [number, number] = f ? [u, f(u)] : fx && fy ? [fx(u), fy(u)] : [NaN, NaN]
      if (Number.isFinite(q[0]) && Number.isFinite(q[1])) out.push(q)
    }
    return out
  }, [f, fx, fy, a, b, n])
  const col = toneColor(c.p, el.tone, 'ink')
  const o = opOf(el, c)
  const upTo = clamp01(el.upTo ?? 1)
  const shown = pts.slice(0, Math.max(2, Math.round(upTo * pts.length)))
  const fillQuads: V3[][] = []
  const rects: V3[][] = []
  if (f && el.fill) {
    const [f0, f1] = el.fill
    const k = 120
    for (let i = 0; i < k; i++) {
      const x0 = f0 + ((f1 - f0) * i) / k
      const x1 = f0 + ((f1 - f0) * (i + 1)) / k
      fillQuads.push([P(x0, 0), P(x1, 0), P(x1, f(x1)), P(x0, f(x0))])
    }
    const nR = el.riemann ? Math.max(1, Math.round(el.riemann)) : 0
    if (nR) {
      const w = (f1 - f0) / nR
      for (let i = 0; i < nR; i++) {
        const x0 = f0 + w * i
        const y = f(x0 + w / 2)
        rects.push([P(x0, 0), P(x0 + w, 0), P(x0 + w, y), P(x0, y)])
      }
    }
  }
  const tan = f && el.tangent != null && Number.isFinite(f(el.tangent)) ? el.tangent : null
  let tanLine: V3[] | null = null
  let secLine: V3[] | null = null
  const dots: V3[] = []
  if (tan != null && f) {
    const e = 1e-4 * Math.max(1, Math.abs(tan))
    const d = (f(tan + e) - f(tan - e)) / (2 * e)
    const L = (b - a) * 0.22
    tanLine = [P(tan - L, f(tan) - d * L), P(tan + L, f(tan) + d * L)]
    dots.push(P(tan, f(tan)))
    if (el.h != null && Math.abs(el.h) > 1e-9) {
      const x2 = tan + el.h
      const m = (f(x2) - f(tan)) / el.h
      secLine = [P(tan - L, f(tan) - m * L), P(tan + L + el.h, f(tan) + m * (L + el.h))]
      dots.push(P(x2, f(x2)))
    }
  }
  return (
    <group>
      {fillQuads.length > 0 && <Quads quads={fillQuads} colors={[mix(c.p.surface, toneColor(c.p, el.tone, 'info'), 0.35)]} opacity={0.55 * o} />}
      {rects.length > 0 && <Quads quads={rects} colors={rects.map((_, i) => mix(c.p.surface, c.p.warning, i % 2 ? 0.45 : 0.6))} opacity={0.8 * o} onTip={(e, i) => c.tip(e, e && i >= 0 && el.fill && f ? `rectangle ${i + 1}: width ${fmt((el.fill[1] - el.fill[0]) / Math.round(el.riemann!))} × height ${fmt(f(el.fill[0] + ((i + 0.5) * (el.fill[1] - el.fill[0])) / Math.round(el.riemann!)))}` : undefined)} />}
      {shown.length > 1 && <Line points={shown.map(([x, y]) => P(x, y))} color={col} lineWidth={el.width ?? 2.4} dashed={el.dashed} dashSize={0.08} gapSize={0.06} transparent opacity={o} />}
      {tanLine && <Line points={tanLine} color={toneColor(c.p, 'accent')} lineWidth={2} transparent opacity={o} />}
      {secLine && <Line points={secLine} color={toneColor(c.p, 'info')} lineWidth={1.6} dashed dashSize={0.08} gapSize={0.06} transparent opacity={o} />}
      {dots.map((d, i) => (
        <mesh key={i} position={d}>
          <sphereGeometry args={[0.07, 18, 18]} />
          <Mat color={i ? toneColor(c.p, 'info') : toneColor(c.p, 'accent')} />
        </mesh>
      ))}
    </group>
  )
}

export function ChartEl({ el, c }: El<'chart'>) {
  const [W, H] = el.size ?? [4, 2.6]
  const map = planeMap(el.at, c.lift, true)
  const tilt = c.lift
  const o = opOf(el, c)
  const ink = toneColor(c.p, 'ink')
  const muted = toneColor(c.p, 'muted')
  const upTo = clamp01(el.upTo ?? 1)
  const data = useMemo(() => {
    if (el.kind === 'hist') {
      const s = el.samples ?? []
      const lo = el.range?.[0] ?? Math.min(...s)
      const hi = el.range?.[1] ?? Math.max(...s)
      const bins = el.bins ?? 20
      return { series: [histogram(s, bins, lo, hi)], xs: null as number[] | null, xr: [lo, hi] as [number, number] }
    }
    const series = el.series ?? []
    return { series, xs: el.xs ?? null, xr: (el.xs ? [Math.min(...el.xs), Math.max(...el.xs)] : [0, Math.max(1, (series[0]?.length ?? 1) - 1)]) as [number, number] }
  }, [el.kind, el.samples, el.range, el.bins, el.series, el.xs])
  const all = data.series.flat()
  const tx = (v: number) => (el.logX ? Math.log10(Math.max(v, 1e-12)) : v)
  const ty = (v: number) => (el.logY ? Math.log10(Math.max(v, 1e-12)) : v)
  const yLo = el.yRange?.[0] ?? (el.kind === 'line' ? Math.min(...all.map(ty)) : 0)
  const yHi = el.yRange?.[1] ?? Math.max(...all.map(ty), yLo + 1e-9)
  const [x0, x1] = el.kind === 'line' ? [tx(data.xr[0]), tx(data.xr[1])] : [0, 1]
  const X = (v: number) => ((v - x0) / (x1 - x0 || 1)) * W
  const Y = (v: number) => ((v - yLo) / (yHi - yLo || 1)) * H
  const yT = el.logY ? ticks(yLo, yHi, 3).filter((v) => Number.isInteger(v)) : ticks(yLo, yHi, 4)
  const xT = el.kind === 'line' ? (el.logX ? ticks(x0, x1, 4).filter((v) => Number.isInteger(v)) : ticks(x0, x1, 4)) : []
  const lab = (v: number, log?: boolean) => (log ? `10${sup(v)}` : fmt(v))
  const bars: V3[][] = []
  const barCols: string[] = []
  if (el.kind !== 'line') {
    const vals = data.series[0] ?? []
    const n = vals.length
    const bw = W / n
    const shownN = Math.ceil(upTo * n)
    vals.slice(0, shownN).forEach((v, i) => {
      const gap = el.kind === 'hist' ? 0.04 * bw : 0.18 * bw
      const h = Y(ty(v))
      bars.push([map(i * bw + gap, 0, 0.01), map((i + 1) * bw - gap, 0, 0.01), map((i + 1) * bw - gap, h, 0.01), map(i * bw + gap, h, 0.01)])
      barCols.push(toneColor(c.p, el.tones?.[i] ?? el.tone ?? (el.kind === 'hist' ? 'info' : 'ink2')))
    })
  }
  return (
    <group>
      <Line points={[map(0, H), map(0, 0), map(W, 0)]} color={muted} lineWidth={1.1} transparent opacity={o} />
      {yT.map((v) => (
        <group key={`y${v}`}>
          <Line points={[map(0, Y(v)), map(W, Y(v))]} color={mix(c.p.surface, c.p.ink, 0.12)} lineWidth={0.8} transparent opacity={o} />
          <FlatText text={lab(v, el.logY)} at={map(-0.08, Y(v))} size={0.13} color={muted} align="right" tilt={tilt} opacity={o} />
        </group>
      ))}
      {xT.map((v) => (
        <FlatText key={`x${v}`} text={lab(v, el.logX)} at={map(X(v), -0.2)} size={0.13} color={muted} tilt={tilt} opacity={o} />
      ))}
      {el.kind === 'hist' && (
        <>
          <FlatText text={fmt(data.xr[0])} at={map(0, -0.2)} size={0.13} color={muted} tilt={tilt} opacity={o} />
          <FlatText text={fmt(data.xr[1])} at={map(W, -0.2)} size={0.13} color={muted} tilt={tilt} opacity={o} />
        </>
      )}
      {el.labels?.map((t, i) => (
        <FlatText key={`l${i}`} text={t} at={map(((i + 0.5) * W) / el.labels!.length, -0.22)} size={0.13} color={ink} tilt={tilt} opacity={o} />
      ))}
      {el.xLabel && <FlatText text={el.xLabel} at={map(W / 2, -0.5)} size={0.15} color={muted} tilt={tilt} opacity={o} />}
      {el.yLabel && <FlatText text={el.yLabel} at={map(0, H + 0.25)} size={0.15} color={muted} tilt={tilt} align="left" opacity={o} />}
      {bars.length > 0 && <Quads quads={bars} colors={barCols} opacity={o} onTip={(e, i) => c.tip(e, e && i >= 0 ? `${el.labels?.[i] ?? (el.kind === 'hist' ? `bin ${i + 1}` : `#${i + 1}`)}: ${fmt(data.series[0][i])}` : undefined)} />}
      {el.kind === 'line' &&
        data.series.map((s, k) => {
          const xs = data.xs ?? s.map((_, i) => i)
          const n = Math.max(2, Math.round(upTo * s.length))
          const pts = s.slice(0, n).map((v, i) => map(X(tx(xs[i])), Y(ty(v)), 0.01))
          const col = toneColor(c.p, el.tones?.[k] ?? SERIES[k % SERIES.length])
          return (
            <group key={k}>
              <Line points={pts} color={col} lineWidth={2.2} transparent opacity={o} />
              {el.names?.[k] && <FlatText text={el.names[k]} at={map(Math.min(W, X(tx(xs[n - 1]))) + 0.08, Y(ty(s[n - 1])) )} size={0.13} color={col} align="left" tilt={tilt} opacity={o} />}
            </group>
          )
        })}
      {el.marker != null && el.kind === 'line' && <Line points={[map(X(tx(el.marker)), 0), map(X(tx(el.marker)), H)]} color={toneColor(c.p, 'accent')} lineWidth={1.6} dashed dashSize={0.07} gapSize={0.05} transparent opacity={o} />}
    </group>
  )
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
const sup = (v: number) => String(Math.round(v)).split('').map((ch) => SUP[ch] ?? ch).join('')
