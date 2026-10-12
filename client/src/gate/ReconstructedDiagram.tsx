import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Contrast, Maximize2, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GateFigure } from './types'
import './gate.css'

/**
 * Question figures.
 *
 * The official figure (the PNG cropped from the paper) is shown unless a
 * checked vector redraw exists (`svg`). Template redraws (`draft`) are not
 * trusted — most don't match the paper — so they are only offered behind a
 * clearly labelled toggle.
 *
 * Every figure sits on the theme surface in "adaptive ink" (see gate.css) so
 * it is readable in all palettes, light or dark; "Original" shows the scan
 * untouched. Clicking opens a lightbox with zoom and pan (wheel, drag, pinch).
 */

type Ink = 'adaptive' | 'original'
type Source = 'figure' | 'draft'

const INK_KEY = 'nexora:gate-fig-ink'
function readInk(): Ink {
  try {
    return localStorage.getItem(INK_KEY) === 'original' ? 'original' : 'adaptive'
  } catch {
    return 'adaptive'
  }
}

function figureSrc(f: GateFigure, source: Source = 'figure') {
  if (source === 'draft' && f.draft) return `/gate-fig/${f.draft}`
  return `/gate-fig/${f.svg ?? f.f}`
}

export function ReconstructedDiagram({
  figures,
  className,
  compact,
}: {
  questionId?: string
  figures: GateFigure[]
  className?: string
  subject?: string
  topic?: string
  /** Smaller frame (question paper overview, review lists). */
  compact?: boolean
}) {
  const [ink, setInkState] = useState<Ink>(readInk)
  const setInk = (v: Ink) => {
    setInkState(v)
    try {
      localStorage.setItem(INK_KEY, v)
    } catch {
      /* ignore */
    }
  }
  const [open, setOpen] = useState<number | null>(null)

  if (!figures?.length) return null
  const many = figures.length > 1

  return (
    <div className={cn('my-4 space-y-3', className)}>
      {figures.map((f, i) => (
        <FigureFrame
          key={f.f}
          f={f}
          label={many ? `Fig. ${i + 1}` : 'Figure'}
          ink={ink}
          onToggleInk={() => setInk(ink === 'adaptive' ? 'original' : 'adaptive')}
          onOpen={() => setOpen(i)}
          compact={compact}
        />
      ))}
      {open !== null && figures[open] && (
        <Lightbox
          figures={figures}
          index={open}
          ink={ink}
          onIndex={setOpen}
          onToggleInk={() => setInk(ink === 'adaptive' ? 'original' : 'adaptive')}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

function FigureFrame({
  f,
  label,
  ink,
  onToggleInk,
  onOpen,
  compact,
}: {
  f: GateFigure
  label: string
  ink: Ink
  onToggleInk: () => void
  onOpen: () => void
  compact?: boolean
}) {
  const [source, setSource] = useState<Source>('figure')
  const [showAlt, setShowAlt] = useState(false)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const src = figureSrc(f, source)
  const isDraft = source === 'draft'

  // Scans are small (median ~570 px): show them a little larger than 1:1 so
  // labels are legible, but never so large they blur, and cap tall figures.
  const maxH = compact ? 260 : 420
  // Redrawn SVGs carry only a viewBox, so the browser reports a default
  // 300×150 natural size; lay them out by width instead and let the viewBox
  // set the height.
  const isVector = /\.svg(\?|$)/i.test(src)
  const width = isVector
    ? '100%'
    : size
      ? Math.round(Math.min(size.w * 1.25, (maxH * size.w) / size.h, 760))
      : undefined

  return (
    <figure className="gate-fig m-0" data-ink={isDraft ? 'original' : ink}>
      <div className="gate-fig-surface group relative overflow-hidden rounded-xl border border-border">
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full cursor-zoom-in items-center justify-center p-3 sm:p-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
          aria-label={`Enlarge ${label.toLowerCase()}`}
        >
          {failed ? (
            <span className="py-8 text-[13px] text-text-muted">Figure could not be loaded.</span>
          ) : (
            <img
              src={src}
              alt={f.alt || label}
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth || 400, h: e.currentTarget.naturalHeight || 300 })}
              onError={() => setFailed(true)}
              className={cn('gate-fig-art rounded-md', !size && 'min-h-24')}
              style={{ width, maxWidth: isVector ? (compact ? 440 : 640) : undefined, maxHeight: maxH }}
            />
          )}
        </button>
        <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          {!isDraft && (
            <button
              type="button"
              onClick={onToggleInk}
              title={ink === 'adaptive' ? 'Show the original scan' : 'Match the theme'}
              aria-label={ink === 'adaptive' ? 'Show the original scan' : 'Match the theme'}
              aria-pressed={ink === 'original'}
              className="rounded-lg border border-border bg-bg-surface/90 p-1.5 text-text-secondary shadow-sm backdrop-blur hover:text-text-primary"
            >
              <Contrast className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpen}
            title="Enlarge"
            aria-label="Enlarge"
            className="rounded-lg border border-border bg-bg-surface/90 p-1.5 text-text-secondary shadow-sm backdrop-blur hover:text-text-primary"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      </div>
      <figcaption className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-muted">
        <span className="font-semibold text-text-secondary">{label}</span>
        {isDraft && <span className="text-state-warning">Unverified redraw — may not match the paper</span>}
        {f.alt && (
          <button type="button" onClick={() => setShowAlt((s) => !s)} className="underline-offset-2 hover:text-text-primary hover:underline" aria-expanded={showAlt}>
            {showAlt ? 'Hide description' : 'Describe'}
          </button>
        )}
        {f.draft && (
          <button
            type="button"
            onClick={() => setSource(isDraft ? 'figure' : 'draft')}
            className="underline-offset-2 hover:text-text-primary hover:underline"
          >
            {isDraft ? 'Show official figure' : 'Show redraw (draft)'}
          </button>
        )}
      </figcaption>
      {showAlt && f.alt && <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-text-secondary">{f.alt}</p>}
    </figure>
  )
}

/* ── Lightbox with zoom and pan ─────────────────────────────────────────── */

const MIN = 0.5
const MAX = 6

function Lightbox({
  figures,
  index,
  ink,
  onIndex,
  onToggleInk,
  onClose,
}: {
  figures: GateFigure[]
  index: number
  ink: Ink
  onIndex: (i: number) => void
  onToggleInk: () => void
  onClose: () => void
}) {
  const f = figures[index]
  const goTo = (i: number) => {
    setView({ s: 1, x: 0, y: 0 })
    onIndex(i)
  }
  const [view, setView] = useState({ s: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d: number; s: number } | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const zoomBy = useCallback((k: number) => setView((v) => ({ ...v, s: Math.min(MAX, Math.max(MIN, v.s * k)) })), [])
  const reset = useCallback(() => setView({ s: 1, x: 0, y: 0 }), [])

  useEffect(() => {
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  // Latest handler without re-subscribing every render.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyRef.current = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === '+' || e.key === '=') zoomBy(1.25)
      else if (e.key === '-') zoomBy(0.8)
      else if (e.key === '0') reset()
      else if (e.key === 'ArrowRight' && index < figures.length - 1) goTo(index + 1)
      else if (e.key === 'ArrowLeft' && index > 0) goTo(index - 1)
      else return
      e.preventDefault()
      e.stopPropagation()
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e)
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const onDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s }
    }
  }
  const onMove = (e: ReactPointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const cur = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, cur)
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const s = Math.min(MAX, Math.max(MIN, (pinch.current.s * d) / (pinch.current.d || 1)))
      setView((v) => ({ ...v, s }))
    } else if (pointers.current.size === 1) {
      setView((v) => ({ ...v, x: v.x + cur.x - prev.x, y: v.y + cur.y - prev.y }))
    }
  }
  const onUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  const btn = 'inline-flex size-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary disabled:opacity-40'

  return createPortal(
    <div className="gate-fig fixed inset-0 z-[1100] flex flex-col bg-bg-app/95 backdrop-blur-sm" data-ink={ink} role="dialog" aria-modal="true" aria-label={`Figure ${index + 1}`}>
      <div className="flex items-center gap-1 border-b border-border bg-bg-surface px-2 py-1.5 sm:px-4">
        <span className="mr-auto min-w-0 truncate pl-1 text-[13px] font-semibold text-text-primary">
          {figures.length > 1 ? `Fig. ${index + 1} of ${figures.length}` : 'Figure'}
        </span>
        {figures.length > 1 && (
          <>
            <button type="button" className={btn} disabled={index === 0} onClick={() => goTo(index - 1)} aria-label="Previous figure">
              ‹
            </button>
            <button type="button" className={btn} disabled={index === figures.length - 1} onClick={() => goTo(index + 1)} aria-label="Next figure">
              ›
            </button>
          </>
        )}
        <button type="button" className={btn} onClick={() => zoomBy(0.8)} aria-label="Zoom out">
          <Minus className="size-4" />
        </button>
        <span className="w-12 text-center font-mono text-[12px] tabular-nums text-text-muted">{Math.round(view.s * 100)}%</span>
        <button type="button" className={btn} onClick={() => zoomBy(1.25)} aria-label="Zoom in">
          <Plus className="size-4" />
        </button>
        <button type="button" className={btn} onClick={reset} aria-label="Reset zoom">
          <RotateCcw className="size-4" />
        </button>
        <button type="button" className={btn} onClick={onToggleInk} aria-pressed={ink === 'original'} aria-label={ink === 'adaptive' ? 'Show the original scan' : 'Match the theme'}>
          <Contrast className="size-4" />
        </button>
        <button ref={closeRef} type="button" className={btn} onClick={onClose} aria-label="Close">
          <X className="size-5" />
        </button>
      </div>
      <div
        className="gate-lightbox-stage gate-fig-surface relative flex-1 overflow-hidden"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.12 : 0.9)}
        onDoubleClick={() => (view.s > 1.01 ? reset() : setView((v) => ({ ...v, s: 2 })))}
      >
        <div className="gate-fig-surface absolute inset-0 flex items-center justify-center p-4" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          <img src={figureSrc(f)} alt={f.alt || 'Figure'} draggable={false} className="gate-fig-art max-h-full w-auto max-w-full object-contain" style={{ minWidth: 'min(100%, 640px)' }} />
        </div>
      </div>
      {f.alt && <p className="max-h-28 overflow-y-auto border-t border-border bg-bg-surface px-4 py-2.5 text-[12.5px] leading-relaxed text-text-secondary">{f.alt}</p>}
    </div>,
    document.body,
  )
}
