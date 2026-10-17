/*
  SVG renderer for one frame of a scene. Geometry comes from the spec in
  viewBox units; colours are theme roles (tone / fill → CSS variables), so a
  scene follows the palette, dark mode and print. Text and numbers are
  always crisp SVG text; only outlines are sketched (when a rough.js
  generator is passed in).
*/
import { memo, useMemo, type ReactNode } from 'react'
import type { VizArrow, VizElement, VizLayout, VizSpec, VizTone } from './schema'
import { canvasSize, type VizFrame } from './frames'
import { strokePaths, type Sketcher } from './sketch'
import { arcLabelPoint, arcPath } from './geometry'

const TONE: Record<VizTone, string> = {
  ink: 'var(--color-text-primary)',
  muted: 'var(--color-text-muted)',
  accent: 'var(--color-accent-brand)',
  subject: 'var(--viz-subject, var(--color-accent-brand))',
  success: 'var(--color-state-success)',
  warning: 'var(--color-state-warning)',
  danger: 'var(--color-state-error)',
  info: 'var(--color-state-info)',
}
const tone = (t: VizTone | undefined) => TONE[t ?? 'ink']
const wash = (t: VizTone | 'none' | undefined, strong?: boolean) =>
  !t || t === 'none' ? 'none' : `color-mix(in oklab, ${TONE[t]} ${strong ? 30 : 14}%, transparent)`
const NO_ELEMENTS = new Map<string, VizElement>()
const HIGHLIGHT_WASH = 'color-mix(in oklab, var(--viz-subject, var(--color-accent-brand)) 20%, transparent)'

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Outline box of an element (for arrow snapping). */
function bounds(el: VizElement): Box | { cx: number; cy: number; r: number } | null {
  switch (el.type) {
    case 'box':
      return { x: el.x, y: el.y, w: el.w, h: el.h }
    case 'circle':
    case 'node':
      return { cx: el.cx, cy: el.cy, r: el.r }
    case 'bits': {
      const c = el.cell ?? 40
      return { x: el.x, y: el.y, w: c * el.bits.length, h: c }
    }
    case 'table':
      return { x: el.x, y: el.y, w: el.cellW * Math.max(...el.rows.map((r) => r.length)), h: el.cellH * el.rows.length }
    case 'grid':
      return { x: el.x, y: el.y, w: el.cell * el.cols, h: el.cell * el.rows }
    case 'text':
      return { x: el.x - 2, y: el.y - 10, w: 4, h: 14 }
    case 'arc': {
      // Arrows meet a sector at its label point, as if it were a small disc there.
      const r0 = el.r0 ?? 0
      const [cx, cy] = arcLabelPoint(el.cx, el.cy, el.r, r0, el.start, el.end)
      return { cx, cy, r: Math.max(4, (el.r - r0) / 3) }
    }
    default:
      return null
  }
}

function center(b: NonNullable<ReturnType<typeof bounds>>): [number, number] {
  return 'r' in b ? [b.cx, b.cy] : [b.x + b.w / 2, b.y + b.h / 2]
}

/** Where the segment from `toward` into the shape's centre crosses its outline. */
function snap(b: NonNullable<ReturnType<typeof bounds>>, toward: [number, number], gap = 4): [number, number] {
  const [cx, cy] = center(b)
  const dx = toward[0] - cx
  const dy = toward[1] - cy
  const len = Math.hypot(dx, dy) || 1
  if ('r' in b) return [cx + (dx / len) * (b.r + gap), cy + (dy / len) * (b.r + gap)]
  const sx = dx === 0 ? Infinity : (b.w / 2 + gap) / Math.abs(dx)
  const sy = dy === 0 ? Infinity : (b.h / 2 + gap) / Math.abs(dy)
  const s = Math.min(sx, sy)
  return [cx + dx * s, cy + dy * s]
}

function arrowGeometry(a: VizArrow, byId: Map<string, VizElement>) {
  const endPoint = (end: VizArrow['from']): { p: [number, number]; b: ReturnType<typeof bounds> } => {
    if (Array.isArray(end)) return { p: end, b: null }
    const el = byId.get(end)
    const b = el ? bounds(el) : null
    return { p: b ? center(b) : [0, 0], b }
  }
  const f = endPoint(a.from)
  const t = endPoint(a.to)
  const p1 = f.b ? snap(f.b, t.p) : f.p
  const p2 = t.b ? snap(t.b, p1) : t.p
  const curve = a.curve ?? 0
  const mx = (p1[0] + p2[0]) / 2
  const my = (p1[1] + p2[1]) / 2
  const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1
  // Control point pushed off the midpoint, perpendicular to the segment.
  const cx = mx - ((p2[1] - p1[1]) / len) * curve * len * 0.5
  const cy = my + ((p2[0] - p1[0]) / len) * curve * len * 0.5
  const d = curve ? `M${p1[0]} ${p1[1]} Q${cx} ${cy} ${p2[0]} ${p2[1]}` : `M${p1[0]} ${p1[1]} L${p2[0]} ${p2[1]}`
  const head = (tip: [number, number], from: [number, number]): [number, number][] => {
    const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0])
    const s = 9
    return [
      [tip[0] - s * Math.cos(ang - 0.45), tip[1] - s * Math.sin(ang - 0.45)],
      tip,
      [tip[0] - s * Math.cos(ang + 0.45), tip[1] - s * Math.sin(ang + 0.45)],
    ]
  }
  const ctrl: [number, number] = curve ? [cx, cy] : p1
  const heads: [number, number][][] = []
  const mode = a.head ?? 'end'
  if (mode === 'end' || mode === 'both') heads.push(head(p2, curve ? ctrl : p1))
  if (mode === 'both') heads.push(head(p1, curve ? ctrl : p2))
  const label: [number, number] = curve ? [(mx + cx) / 2, (my + cy) / 2] : [mx, my]
  return { d, p1, p2, heads, label }
}

function Stroke({ paths, fallback, stroke, dashed }: { paths: string[] | null; fallback: ReactNode; stroke: string; dashed?: boolean }) {
  if (!paths) return <>{fallback}</>
  return (
    <>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeDasharray={dashed ? '6 5' : undefined} />
      ))}
    </>
  )
}

function Label({ x, y, text, mono, size = 15, color, weight }: { x: number; y: number; text: string; mono?: boolean; size?: number; color: string; weight?: 'bold' | 'normal' }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className={mono ? 'nxv-mono' : 'nxv-hand'}
      fontSize={size}
      fontWeight={weight === 'bold' ? 700 : undefined}
      fill={color}
    >
      {text}
    </text>
  )
}

const Element = memo(function Element({ el, byId, sketch }: { el: VizElement; byId: Map<string, VizElement>; sketch: Sketcher | null }) {
  const stroke = tone(el.tone)
  const fill = wash(el.fill, el.emphasis === 'strong')
  const dashed = el.dashed
  const sk = (kind: Parameters<typeof strokePaths>[1], args: Parameters<typeof strokePaths>[2], key = el.id) =>
    sketch ? strokePaths(sketch, kind, args, key) : null
  const dash = dashed ? '6 5' : undefined

  switch (el.type) {
    case 'box':
      return (
        <>
          <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={6} fill={fill} stroke={sketch ? 'none' : stroke} strokeWidth={1.6} strokeDasharray={dash} />
          <Stroke paths={sk('rect', [el.x, el.y, el.w, el.h])} fallback={null} stroke={stroke} dashed={dashed} />
          {el.label && <Label x={el.x + el.w / 2} y={el.y + el.h / 2} text={el.label} mono={el.mono} size={el.size} color={stroke} />}
        </>
      )
    case 'circle':
    case 'node':
      return (
        <>
          <circle cx={el.cx} cy={el.cy} r={el.r} fill={fill} stroke={sketch ? 'none' : stroke} strokeWidth={1.6} strokeDasharray={dash} />
          <Stroke paths={sk('circle', [el.cx, el.cy, el.r])} fallback={null} stroke={stroke} dashed={dashed} />
          {el.label && <Label x={el.cx} y={el.cy} text={el.label} mono={el.mono} size={el.size} color={stroke} />}
        </>
      )
    case 'arc': {
      const r0 = el.r0 ?? 0
      const d = arcPath(el.cx, el.cy, el.r, r0, el.start, el.end)
      const [lx, ly] = arcLabelPoint(el.cx, el.cy, el.r, r0, el.start, el.end)
      return (
        <>
          <path d={d} fill={fill} fillRule="evenodd" stroke={sketch ? 'none' : stroke} strokeWidth={1.6} strokeDasharray={dash} strokeLinejoin="round" />
          <Stroke paths={sk('path', d)} fallback={null} stroke={stroke} dashed={dashed} />
          {el.label && <Label x={lx} y={ly} text={el.label} mono={el.mono} size={el.size} color={stroke} />}
        </>
      )
    }
    case 'text':
      return (
        <text
          x={el.x}
          y={el.y}
          textAnchor={el.anchor ?? 'start'}
          dominantBaseline="central"
          className={el.mono ? 'nxv-mono' : 'nxv-hand'}
          fontSize={el.size ?? 15}
          fontWeight={el.weight === 'bold' ? 700 : undefined}
          fill={stroke}
        >
          {el.text}
        </text>
      )
    case 'arrow': {
      const g = arrowGeometry(el, byId)
      return (
        <>
          <Stroke paths={sk('path', g.d)} fallback={<path d={g.d} fill="none" stroke={stroke} strokeWidth={1.6} strokeDasharray={dash} />} stroke={stroke} dashed={dashed} />
          {g.heads.map((h, i) => (
            <Stroke
              key={i}
              paths={sk('poly', h, `${el.id}-h${i}`)}
              fallback={<polyline points={h.map((p) => p.join(',')).join(' ')} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />}
              stroke={stroke}
            />
          ))}
          {el.label && <Label x={g.label[0]} y={g.label[1] - 10} text={el.label} size={13} color={stroke} />}
        </>
      )
    }
    case 'line': {
      const pts = el.points
      return (
        <>
          <Stroke
            paths={sk('poly', pts)}
            fallback={<polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={stroke} strokeWidth={1.6} strokeDasharray={dash} strokeLinejoin="round" />}
            stroke={stroke}
            dashed={dashed}
          />
          {el.label && <Label x={pts[pts.length - 1]![0]} y={pts[pts.length - 1]![1] - 12} text={el.label} size={13} color={stroke} />}
        </>
      )
    }
    case 'table': {
      const hi = new Set((el.highlight ?? []).map(([r, c]) => `${r},${c}`))
      return (
        <>
          {el.rows.map((row, r) =>
            row.map((cell, c) => {
              const x = el.x + c * el.cellW
              const y = el.y + r * el.cellH
              const head = el.header && r === 0
              return (
                <g key={`${r}-${c}`}>
                  <rect x={x} y={y} width={el.cellW} height={el.cellH} fill={hi.has(`${r},${c}`) ? HIGHLIGHT_WASH : head ? 'color-mix(in oklab, var(--color-text-primary) 6%, transparent)' : fill} stroke={sketch ? 'none' : stroke} strokeWidth={1.2} />
                  <Stroke paths={sk('rect', [x, y, el.cellW, el.cellH], `${el.id}-${r}-${c}`)} fallback={null} stroke={stroke} />
                  <Label x={x + el.cellW / 2} y={y + el.cellH / 2} text={cell} mono={el.mono} size={14} color={stroke} weight={head ? 'bold' : 'normal'} />
                </g>
              )
            }),
          )}
        </>
      )
    }
    case 'grid': {
      const hi = new Set((el.highlight ?? []).map(([r, c]) => `${r},${c}`))
      const cells: ReactNode[] = []
      for (let r = 0; r < el.rows; r++)
        for (let c = 0; c < el.cols; c++) {
          const x = el.x + c * el.cell
          const y = el.y + r * el.cell
          const v = el.values?.[r]?.[c]
          cells.push(
            <g key={`${r}-${c}`}>
              <rect x={x} y={y} width={el.cell} height={el.cell} fill={hi.has(`${r},${c}`) ? HIGHLIGHT_WASH : fill} stroke={sketch ? 'none' : stroke} strokeWidth={1.2} />
              <Stroke paths={sk('rect', [x, y, el.cell, el.cell], `${el.id}-${r}-${c}`)} fallback={null} stroke={stroke} />
              {v !== undefined && <Label x={x + el.cell / 2} y={y + el.cell / 2} text={String(v)} mono={el.mono} size={Math.min(16, el.cell * 0.45)} color={stroke} />}
            </g>,
          )
        }
      return <>{cells}</>
    }
    case 'bits': {
      const c = el.cell ?? 40
      const hi = new Set(el.highlight ?? [])
      const subject = TONE.subject
      return (
        <>
          {[...el.bits].map((bit, i) => {
            const x = el.x + i * c
            const on = hi.has(i)
            const s = on ? subject : stroke
            return (
              <g key={i} className="nxv-cell">
                <rect x={x} y={el.y} width={c} height={c} fill={on ? HIGHLIGHT_WASH : fill} stroke={sketch ? 'none' : s} strokeWidth={on ? 2.2 : 1.6} />
                <Stroke paths={sk('rect', [x, el.y, c, c], `${el.id}-${i}`)} fallback={null} stroke={s} />
                <Label x={x + c / 2} y={el.y + c / 2} text={bit} mono size={c * 0.42} color={s} weight={on ? 'bold' : 'normal'} />
                {el.labels?.[i] && <Label x={x + c / 2} y={el.y - 14} text={el.labels[i]!} size={14} color="var(--color-text-secondary)" />}
                {el.below?.[i] && <Label x={x + c / 2} y={el.y + c + 16} text={el.below[i]!} mono size={14} color={on ? subject : 'var(--color-text-secondary)'} weight={on ? 'bold' : 'normal'} />}
              </g>
            )
          })}
        </>
      )
    }
  }
})

export function VizScene({
  spec,
  layout = 'wide',
  frame,
  sketch,
  titleId,
  descId,
}: {
  spec: VizSpec
  layout?: VizLayout
  frame: VizFrame
  sketch: Sketcher | null
  titleId: string
  descId: string
}) {
  const byId = useMemo(() => new Map(frame.elements.map((e) => [e.id, e])), [frame.elements])
  const changed = useMemo(() => new Set(frame.changed), [frame.changed])
  const { width, height } = canvasSize(spec, layout)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="nxv-svg" role="img" aria-labelledby={`${titleId} ${descId}`}>
      <title id={titleId}>{spec.title}</title>
      <desc id={descId}>{frame.caption}</desc>
      {frame.elements.map((el) => (
        <g
          key={el.id}
          className="nxv-el"
          data-changed={changed.has(el.id) || undefined}
          style={{ opacity: el.hidden ? 0 : (el.opacity ?? 1) }}
          aria-hidden="true"
        >
          <Element el={el} byId={el.type === 'arrow' ? byId : NO_ELEMENTS} sketch={sketch} />
        </g>
      ))}
    </svg>
  )
}
