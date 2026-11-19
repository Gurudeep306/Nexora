/*
  Helpers every AI course scene shares: axes with ticks, a number line, and
  number formatting. Plain data (Stage elements), loadable by Node, so the
  tests and the search index can build every scene.
*/
import type { StageElement } from '@/ai/stage/spec'

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
/** A whole number in superscript: 12 → "¹²". */
export const sup = (n: number) =>
  String(n)
    .split('')
    .map((ch) => SUP[ch] ?? ch)
    .join('')
/** 6.3e-8 → "6.3 × 10⁻⁸" (for captions, which are plain text). */
export const sci = (v: number) => {
  const [m, e] = v.toExponential(1).split('e')
  return `${m} × 10${sup(Number(e))}`
}
/** 6.3e-8 → "6.3 \times 10^{-8}" (for formulas). */
export const sciTex = (v: number) => {
  const [m, e] = v.toExponential(1).split('e')
  return `${m} \\times 10^{${Number(e)}}`
}
/** Rounded for display: at most d decimals, no trailing zeros. */
export const rd = (v: number, d = 3) => {
  const s = (Math.round(v * 10 ** d) / 10 ** d).toString()
  return s === '-0' ? '0' : s
}
/** A minus sign that reads as one (−), for labels. */
export const signed = (v: number, d = 3) => (v < 0 ? `−${rd(-v, d)}` : rd(v, d))

/** A number line from lo to hi along x (at height y), with a tick and a label at every integer. */
export function numberLine(lo: number, hi: number, y = 0, scale = 1, idp = 'nl'): StageElement[] {
  const els: StageElement[] = [{ id: `${idp}-axis`, type: 'line', points: [[(lo - 0.4) * scale, y, 0], [(hi + 0.4) * scale, y, 0]], tone: 'ink', width: 1.6 }]
  for (let k = Math.ceil(lo); k <= hi; k++) {
    els.push({ id: `${idp}-t${k}`, type: 'line', points: [[k * scale, y - 0.09, 0], [k * scale, y + 0.09, 0]], tone: 'ink', width: 1.4 })
    els.push({ id: `${idp}-l${k}`, type: 'label', at: [k * scale, y - 0.38, 0], text: signed(k), tone: 'muted' })
  }
  return els
}

/**
 * x and y axes for a flat graph, with ticks every `step` and the names of
 * both axes. `s` is scene units per unit of the graph (curves drawn with the
 * same scale line up with it).
 */
export function plotAxes(x: [number, number], y: [number, number], { s = 1, step = 1, names = ['x', 'y'], idp = 'ax', labels = true }: { s?: number; step?: number; names?: [string, string]; idp?: string; labels?: boolean } = {}): StageElement[] {
  const els: StageElement[] = [
    { id: `${idp}-x`, type: 'line', points: [[x[0] * s, 0, 0], [x[1] * s, 0, 0]], tone: 'ink', width: 1.4 },
    { id: `${idp}-y`, type: 'line', points: [[0, y[0] * s, 0], [0, y[1] * s, 0]], tone: 'ink', width: 1.4 },
    { id: `${idp}-xn`, type: 'label', at: [x[1] * s + 0.3, 0, 0], text: names[0], tone: 'muted' },
    { id: `${idp}-yn`, type: 'label', at: [0, y[1] * s + 0.3, 0], text: names[1], tone: 'muted' },
  ]
  if (!labels) return els
  for (let v = Math.ceil(x[0] / step) * step; v <= x[1] - step / 2; v += step) {
    if (Math.abs(v) < 1e-9) continue
    els.push({ id: `${idp}-xt${rd(v)}`, type: 'line', points: [[v * s, -0.06, 0], [v * s, 0.06, 0]], tone: 'ink' })
    els.push({ id: `${idp}-xl${rd(v)}`, type: 'label', at: [v * s, -0.3, 0], text: signed(v), tone: 'muted' })
  }
  for (let v = Math.ceil(y[0] / step) * step; v <= y[1] - step / 2; v += step) {
    if (Math.abs(v) < 1e-9) continue
    els.push({ id: `${idp}-yt${rd(v)}`, type: 'line', points: [[-0.06, v * s, 0], [0.06, v * s, 0]], tone: 'ink' })
    els.push({ id: `${idp}-yl${rd(v)}`, type: 'label', at: [-0.32, v * s, 0], text: signed(v), tone: 'muted' })
  }
  return els
}
