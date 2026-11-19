/*
  Stage kit: language. A row (or column) of tokens as chips: highlighted,
  masked, coloured by group, appearing one by one (generation), each with a
  probability bar that stands up in 3D. Also used for bits and byte strings.
*/
import { Line } from '@react-three/drei'
import { FlatText, Quads } from '../../three/prims'
import type { V3 } from '../../three/coords'
import { mix } from '../../three/theme3d'
import type { StageElement } from '../spec'
import { at3, clamp01, fmt, opOf, planeMap, toneColor, type ElCtx } from './shared'

export function TokensEl({ el, c }: { el: Extract<StageElement, { type: 'tokens' }>; c: ElCtx }) {
  const n = el.tokens.length
  const w = el.cell ?? 0.9
  const h = 0.42
  const gap = 0.08
  const o = opOf(el, c)
  const base = el.at ?? [0, 0, 0]
  const shown = el.upTo == null ? n : Math.max(0, Math.min(n, el.upTo))
  const hi = new Set(el.highlight ?? [])
  const masked = new Set(el.masked ?? [])
  const pmax = Math.max(1e-9, ...(el.probs ?? [0]).map(Math.abs))
  const span = n * w + (n - 1) * gap
  const centre = (i: number): [number, number] => (el.vertical ? [0, -(i * (h + gap)) + ((n - 1) * (h + gap)) / 2] : [i * (w + gap) - span / 2 + w / 2, 0])
  const chips: V3[][] = []
  const cols: string[] = []
  const texts: { t: string; at: V3; col: string; op: number }[] = []
  const bars: V3[][] = []
  const barCols: string[] = []
  for (let i = 0; i < n; i++) {
    const vis = clamp01(shown - i)
    if (vis <= 0) continue
    const [x, y] = centre(i)
    const ax = base[0] + x
    const ay = base[1] + y
    const z = base[2]
    const corner = (dx: number, dy: number) => at3([ax + dx, ay + dy, z], c.lift)
    chips.push([corner(-w / 2, -h / 2), corner(w / 2, -h / 2), corner(w / 2, h / 2), corner(-w / 2, h / 2)])
    const tone = hi.has(i) ? 'accent' : (el.tones?.[i] ?? el.tone)
    cols.push(masked.has(i) ? mix(c.p.surface, c.p.ink, 0.06) : mix(c.p.surface, toneColor(c.p, tone, 'ink2'), hi.has(i) ? 0.5 : tone ? 0.32 : 0.1))
    const label = masked.has(i) ? '[MASK]' : el.tokens[i]
    texts.push({ t: label, at: at3([ax, ay, z + 0.01], c.lift), col: toneColor(c.p, masked.has(i) ? 'muted' : 'ink'), op: vis })
    if (el.probs) {
      const map = planeMap([ax, ay + h / 2 + 0.06, z], c.lift, true)
      const ph = (Math.abs(el.probs[i]) / pmax) * 1.1 * vis
      bars.push([map(-w * 0.32, 0), map(w * 0.32, 0), map(w * 0.32, ph), map(-w * 0.32, ph)])
      barCols.push(toneColor(c.p, hi.has(i) ? 'accent' : 'info'))
      texts.push({ t: fmt(el.probs[i]), at: map(0, ph + 0.14), col: toneColor(c.p, 'muted'), op: vis * (1 - c.lift * 0.5) })
    }
  }
  const fit = (t: string) => Math.min(0.2, (w * 1.45) / Math.max(1, t.length))
  return (
    <group>
      <Quads quads={chips} colors={cols} opacity={o} onTip={(e, i) => c.tip(e, e && i >= 0 ? `token ${i + 1}: "${el.tokens[i]}"${el.probs ? `  p = ${fmt(el.probs[i])}` : ''}` : undefined)} />
      {chips.map((q, i) => (
        <Line key={i} points={[...q, q[0]]} color={toneColor(c.p, 'hair')} lineWidth={1} dashed={masked.has(i)} dashSize={0.06} gapSize={0.04} transparent opacity={o} />
      ))}
      {bars.length > 0 && <Quads quads={bars} colors={barCols} opacity={o} />}
      {texts.map((t, i) => (
        <FlatText key={i} text={t.t} at={t.at} size={fit(t.t)} color={t.col} opacity={o * t.op} mono={el.tokens.every((s) => s === '0' || s === '1')} />
      ))}
    </group>
  )
}
