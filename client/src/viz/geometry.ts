/*
  Pure geometry for Nexora Viz shapes that are not plain SVG primitives.
  Dependency-free and erasable-syntax only, so Node tests can import it.

  Angles are in degrees, measured clockwise from 12 o'clock (the way a
  clock face or a counter wheel is read), so 0 = up, 90 = right.
*/

export type Pt = [number, number]

const round = (n: number) => Math.round(n * 100) / 100

/** Point at `deg` (clockwise from 12 o'clock) on a circle of radius r. */
export function polar(cx: number, cy: number, r: number, deg: number): Pt {
  const a = (deg * Math.PI) / 180
  return [round(cx + r * Math.sin(a)), round(cy - r * Math.cos(a))]
}

/**
 * SVG path data for an annular sector (r0 > 0) or a pie slice (r0 = 0)
 * from `start` to `end` degrees. A full turn (end − start = 360) is drawn as
 * two half-arcs, because one SVG arc cannot start and end at the same point.
 */
export function arcPath(cx: number, cy: number, r: number, r0: number, start: number, end: number): string {
  const sweep = end - start
  if (sweep >= 360) {
    const mid = start + 180
    const outer = (a: number, b: number) => {
      const [x1, y1] = polar(cx, cy, r, a)
      const [x2, y2] = polar(cx, cy, r, b)
      return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`
    }
    const ring = `${outer(start, mid)} ${outer(mid, start + 360).replace(/^M[^A]+/, '')}`
    if (r0 <= 0) return `${ring} Z`
    const [ix, iy] = polar(cx, cy, r0, start)
    const [mx, my] = polar(cx, cy, r0, mid)
    return `${ring} Z M${ix} ${iy} A${r0} ${r0} 0 0 0 ${mx} ${my} A${r0} ${r0} 0 0 0 ${ix} ${iy} Z`
  }
  const large = sweep > 180 ? 1 : 0
  const [x1, y1] = polar(cx, cy, r, start)
  const [x2, y2] = polar(cx, cy, r, end)
  if (r0 <= 0) return `M${round(cx)} ${round(cy)} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
  const [x3, y3] = polar(cx, cy, r0, end)
  const [x4, y4] = polar(cx, cy, r0, start)
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r0} ${r0} 0 ${large} 0 ${x4} ${y4} Z`
}

/** Where an arc's label sits: the middle of the sweep, halfway across the band. */
export function arcLabelPoint(cx: number, cy: number, r: number, r0: number, start: number, end: number): Pt {
  const mid = (start + end) / 2
  const rr = r0 > 0 ? (r + r0) / 2 : r * 0.62
  return polar(cx, cy, rr, mid)
}
