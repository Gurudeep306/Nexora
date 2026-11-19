/*
  Stage kit: text. A code panel (the running line marked, the variables it
  has made so far) and a small table (cells can be marked), drawn as sheets
  laid into the scene: they scale with the drawing on every screen, and the
  scene's description says what they hold for screen readers.
*/
import { Sheet, type SheetRow } from '../../three/prims'
import { mix } from '../../three/theme3d'
import type { StageElement } from '../spec'
import { at3, fmt, type ElCtx } from './shared'

/** Text dims only partway when out of focus, so it stays readable; it still fades fully when hidden. */
const readable = (el: { id: string; opacity?: number }, c: ElCtx) => (el.opacity ?? 1) * Math.max(0.85, c.dim(el.id))
const sheetColors = (c: ElCtx) => ({ ink: c.p.ink, muted: c.p.muted, paper: c.p.surface, border: c.p.strong, accent: c.p.accent, shade: mix(c.p.surface, c.p.ink, 0.08) })
const show = (v: string | number) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : fmt(v)) : v)

export function CodeEl({ el, c }: { el: Extract<StageElement, { type: 'code' }>; c: ElCtx }) {
  const active = el.active == null ? -1 : Math.round(el.active)
  const rows: SheetRow[] = el.lines.map((l, i) => ({ cells: [String(i + 1), l || ' '], kind: i === active ? 'active' : 'normal' }))
  if (el.vars?.length) el.vars.forEach(([k, v], i) => rows.push({ cells: [k, v], sep: i === 0 }))
  return <Sheet rows={rows} at={at3(el.at ?? [0, 0, 0], c.lift)} colors={sheetColors(c)} opacity={readable(el, c)} mono muted={[0]} align={['right', 'left']} />
}

export function TableEl({ el, c }: { el: Extract<StageElement, { type: 'table' }>; c: ElCtx }) {
  const hl = el.highlight ?? []
  const rows: SheetRow[] = [
    ...(el.header ? [{ cells: el.header, kind: 'head' as const }] : []),
    ...el.rows.map((r, i) => ({ cells: r.map(show), marked: hl.filter(([a]) => a === i).map(([, b]) => b) })),
  ]
  const cols = Math.max(...rows.map((r) => r.cells.length))
  // Numbers line up on the right, words on the left (judged by the first data row).
  const align = Array.from({ length: cols }, (_, k) => (typeof el.rows[0]?.[k] === 'number' ? 'right' : 'left') as 'left' | 'right')
  return <Sheet rows={rows} at={at3(el.at ?? [0, 0, 0], c.lift)} colors={sheetColors(c)} opacity={readable(el, c)} align={align} />
}
