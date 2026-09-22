import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels'
import { ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, PictureInPicture2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ALLOWED_DOCKS, type Dock, type PaneId, type Rect } from './state'
import type { WorkspaceApi } from './useWorkspace'
import { PaneHeader } from './PaneHeader'

export interface PaneSpec {
  title: string
  icon: ReactNode
  content: ReactNode
  /** Extra controls rendered in the pane title bar (tabs, badges…). */
  headerExtra?: ReactNode
}

interface DragState {
  pane: PaneId
  startX: number
  startY: number
  active: boolean
  x: number
  y: number
  /** pointer offset inside a floating window being moved */
  offX: number
  offY: number
  zone: Dock | null
}

const MIN_W = 300
const MIN_H = 160

function ResizeHandle({ orientation }: { orientation: 'vertical' | 'horizontal' }) {
  const vertical = orientation === 'vertical'
  return (
    <Separator
      className={cn(
        'group relative flex shrink-0 items-center justify-center outline-none',
        vertical ? 'w-2.5 cursor-col-resize' : 'h-2.5 cursor-row-resize',
      )}
    >
      <span
        className={cn(
          'rounded-full bg-white/[0.08] transition-[background-color,box-shadow] duration-150 group-hover:bg-primary group-focus-visible:bg-primary group-data-[separator=active]:bg-primary-bright group-data-[separator=active]:shadow-[0_0_10px_rgb(139_92_246/0.9)]',
          vertical ? 'h-10 w-[3px]' : 'h-[3px] w-10',
        )}
      />
    </Separator>
  )
}

/**
 * IDE-style workspace: the problem and tests panes can be docked left / right /
 * bottom, floated as draggable + resizable windows, minimized to rails, or
 * maximized. Sizes and positions persist per browser.
 */
export function Workspace({
  api,
  problem,
  tests,
  editor,
  overlay,
}: {
  api: WorkspaceApi
  problem: PaneSpec
  tests: PaneSpec
  editor: ReactNode
  overlay?: ReactNode
}) {
  const { ws, dock, setFloat, minimize, toggleMax } = api
  const rootRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [front, setFront] = useState<PaneId>('tests')
  const [bounds, setBounds] = useState({ w: 1200, h: 700 })
  const specs: Record<PaneId, PaneSpec> = { problem, tests }

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setBounds({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const clampRect = useCallback(
    (r: Rect): Rect => {
      const w = Math.min(Math.max(MIN_W, r.w), bounds.w)
      const h = Math.min(Math.max(MIN_H, r.h), bounds.h)
      const x = r.x < 0 ? bounds.w - w - 24 : Math.min(Math.max(0, r.x), bounds.w - w)
      const y = r.y < 0 ? bounds.h - h - 24 : Math.min(Math.max(0, r.y), bounds.h - h)
      return { x, y, w, h }
    },
    [bounds],
  )

  /* ── Drag to move / dock ── */
  const zoneAt = useCallback((pane: PaneId, x: number, y: number): Dock => {
    const el = rootRef.current
    if (!el) return 'float'
    const r = el.getBoundingClientRect()
    const allowed = ALLOWED_DOCKS[pane]
    if (allowed.includes('left') && x < r.left + r.width * 0.14) return 'left'
    if (allowed.includes('right') && x > r.right - r.width * 0.14) return 'right'
    if (allowed.includes('bottom') && y > r.bottom - r.height * 0.18) return 'bottom'
    return 'float'
  }, [])

  const startDrag = (pane: PaneId) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const root = rootRef.current?.getBoundingClientRect()
    const f = ws[pane].float
    setFront(pane)
    setDrag({
      pane,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      x: e.clientX,
      y: e.clientY,
      offX: ws[pane].dock === 'float' && root ? e.clientX - root.left - f.x : 160,
      offY: ws[pane].dock === 'float' && root ? e.clientY - root.top - f.y : 16,
      zone: null,
    })
  }

  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => {
      setDrag((d) => {
        if (!d) return d
        const active = d.active || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6
        return { ...d, active, x: e.clientX, y: e.clientY, zone: active ? zoneAt(d.pane, e.clientX, e.clientY) : null }
      })
      // A floating window follows the pointer live.
      const d = drag
      if (d.active && ws[d.pane].dock === 'float') {
        const root = rootRef.current?.getBoundingClientRect()
        if (root) setFloat(d.pane, clampRect({ ...ws[d.pane].float, x: e.clientX - root.left - d.offX, y: e.clientY - root.top - d.offY }))
      }
    }
    const up = (e: PointerEvent) => {
      const d = drag
      setDrag(null)
      if (!d?.active) return
      const zone = zoneAt(d.pane, e.clientX, e.clientY)
      const root = rootRef.current?.getBoundingClientRect()
      if (zone === 'float') {
        if (ws[d.pane].dock !== 'float' && root) {
          const f = ws[d.pane].float
          const w = Math.min(Math.max(MIN_W, f.w), root.width * 0.8)
          const h = Math.min(Math.max(MIN_H, f.h), root.height * 0.8)
          dock(d.pane, 'float', clampRect({ w, h, x: e.clientX - root.left - Math.min(d.offX, w / 2), y: e.clientY - root.top - d.offY }))
        }
      } else {
        dock(d.pane, zone)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [drag, ws, zoneAt, setFloat, dock, clampRect])

  /* ── Rendering helpers ── */
  const header = (pane: PaneId) => (
    <PaneHeader
      icon={specs[pane].icon}
      title={specs[pane].title}
      dock={ws[pane].dock}
      allowed={ALLOWED_DOCKS[pane]}
      maximized={ws.maximized === pane}
      onDragStart={startDrag(pane)}
      onDock={(d) => dock(pane, d, d === 'float' ? clampRect(ws[pane].float) : undefined)}
      onMinimize={() => minimize(pane, true)}
      onToggleMaximize={() => toggleMax(pane)}
    >
      {specs[pane].headerExtra}
    </PaneHeader>
  )

  const paneBody = (pane: PaneId) => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {header(pane)}
      <div className="min-h-0 flex-1 overflow-hidden">{specs[pane].content}</div>
    </div>
  )

  const rail = (pane: PaneId, side: 'left' | 'right') => (
    <button
      key={`rail-${pane}`}
      onClick={() => minimize(pane, false)}
      aria-label={`Restore ${specs[pane].title} panel`}
      title={`Restore ${specs[pane].title} (Alt+${pane === 'problem' ? 1 : 2})`}
      className={cn(
        'card-neon group flex w-9 shrink-0 cursor-pointer flex-col items-center gap-3 overflow-hidden py-3 text-foreground-faint transition-colors hover:border-primary/40 hover:text-foreground',
        side === 'left' ? 'mr-2.5' : 'ml-2.5',
      )}
    >
      <span className="text-primary-bright [&_svg]:size-4">{specs[pane].icon}</span>
      <span className="min-h-0 flex-1 truncate text-[11px] font-semibold tracking-[0.12em] uppercase [writing-mode:vertical-rl] rotate-180">
        {specs[pane].title}
      </span>
    </button>
  )

  const bottomBar = (pane: PaneId) => (
    <button
      key={`bar-${pane}`}
      onClick={() => minimize(pane, false)}
      aria-label={`Restore ${specs[pane].title} panel`}
      title={`Restore ${specs[pane].title} (Alt+2)`}
      className="card-neon mt-2.5 flex h-9 shrink-0 cursor-pointer items-center gap-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-foreground-faint uppercase transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <span className="text-primary-bright [&_svg]:size-3.5">{specs[pane].icon}</span>
      {specs[pane].title}
      <span className="ml-auto flex min-w-0 items-center gap-2 normal-case">{specs[pane].headerExtra}</span>
    </button>
  )

  /* ── Maximized: one pane owns the workspace ── */
  if (ws.maximized) {
    const id = ws.maximized
    return (
      <div ref={rootRef} className="relative flex min-h-0 flex-1">
        {overlay}
        <div className="card-neon flex min-h-0 flex-1 flex-col overflow-hidden">
          {id === 'editor' ? editor : paneBody(id)}
        </div>
        <button
          onClick={() => toggleMax(id)}
          className="glass absolute bottom-3 left-1/2 z-40 -translate-x-1/2 cursor-pointer rounded-full px-3 py-1 text-[11px] text-foreground-dim hover:text-foreground"
        >
          Press <kbd className="font-mono">Esc</kbd> or click to restore the layout
        </button>
      </div>
    )
  }

  const docked = (pane: PaneId, side: Dock) => ws[pane].dock === side && !ws[pane].minimized
  const minimizedAt = (pane: PaneId, side: Dock) => ws[pane].dock === side && ws[pane].minimized

  const leftPanes = (['problem', 'tests'] as PaneId[]).filter((p) => docked(p, 'left'))
  const rightPanes = (['tests', 'problem'] as PaneId[]).filter((p) => docked(p, 'right')).reverse()
  const testsBottom = docked('tests', 'bottom')
  const hKey = ['h', ...leftPanes, 'c', ...rightPanes].join('-')
  const vKey = testsBottom ? 'v-e-t' : 'v-e'

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1">
      {overlay}
      {(['problem', 'tests'] as PaneId[]).filter((p) => minimizedAt(p, 'left')).map((p) => rail(p, 'left'))}

      <HGroup key={hKey} id={hKey} panelIds={[...leftPanes, 'center', ...rightPanes]}>
        {leftPanes.map((p) => (
          <Fragment key={p}>
            <Panel id={p} minSize="18%" defaultSize={p === 'problem' ? '38%' : '27%'} className="card-neon overflow-hidden">
              {paneBody(p)}
            </Panel>
            <ResizeHandle orientation="vertical" />
          </Fragment>
        ))}
        <Panel id="center" minSize="25%" className="flex flex-col">
          <VGroup key={vKey} id={vKey} panelIds={testsBottom ? ['editor', 'tests'] : ['editor']}>
            <Panel id="editor" minSize="20%" className="card-neon overflow-hidden">
              {editor}
            </Panel>
            {testsBottom && (
              <>
                <ResizeHandle orientation="horizontal" />
                <Panel id="tests" minSize={120} defaultSize="36%" className="card-neon overflow-hidden">
                  {paneBody('tests')}
                </Panel>
              </>
            )}
          </VGroup>
          {minimizedAt('tests', 'bottom') && bottomBar('tests')}
        </Panel>
        {rightPanes.map((p) => (
          <Fragment key={p}>
            <ResizeHandle orientation="vertical" />
            <Panel id={p} minSize="18%" defaultSize={p === 'problem' ? '38%' : '27%'} className="card-neon overflow-hidden">
              {paneBody(p)}
            </Panel>
          </Fragment>
        ))}
      </HGroup>

      {(['tests', 'problem'] as PaneId[]).filter((p) => minimizedAt(p, 'right')).map((p) => rail(p, 'right'))}

      {/* Floating windows */}
      {(['problem', 'tests'] as PaneId[])
        .filter((p) => ws[p].dock === 'float')
        .map((p) => (
          <FloatingWindow
            key={p}
            rect={clampRect(ws[p].float)}
            minimized={ws[p].minimized}
            z={front === p ? 32 : 31}
            dragging={drag?.pane === p && drag.active}
            onFocus={() => setFront(p)}
            onResize={(r) => setFloat(p, clampRect(r))}
          >
            {ws[p].minimized ? (
              <button
                onPointerDown={startDrag(p)}
                onDoubleClick={() => minimize(p, false)}
                onClick={(e) => e.detail === 1 && !drag?.active && minimize(p, false)}
                className="flex h-9 w-full cursor-pointer items-center gap-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-foreground-dim uppercase"
              >
                <span className="text-primary-bright [&_svg]:size-3.5">{specs[p].icon}</span>
                {specs[p].title}
                <span className="ml-auto text-[10px] normal-case text-foreground-faint">click to restore</span>
              </button>
            ) : (
              paneBody(p)
            )}
          </FloatingWindow>
        ))}

      {/* Dock targets while dragging */}
      <AnimatePresence>
        {drag?.active && (
          <DockOverlay pane={drag.pane} zone={drag.zone} floating={ws[drag.pane].dock === 'float'} title={specs[drag.pane].title} x={drag.x} y={drag.y} root={rootRef.current} />
        )}
      </AnimatePresence>
    </div>
  )
}

function HGroup({ id, panelIds, children }: { id: string; panelIds: string[]; children: ReactNode }) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: `nexora-ws-${id}`, panelIds, storage: localStorage })
  return (
    <Group id={id} orientation="horizontal" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged} className="min-h-0 min-w-0 flex-1">
      {children}
    </Group>
  )
}

function VGroup({ id, panelIds, children }: { id: string; panelIds: string[]; children: ReactNode }) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: `nexora-ws-${id}`, panelIds, storage: localStorage })
  return (
    <Group id={id} orientation="vertical" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged} className="min-h-0 flex-1">
      {children}
    </Group>
  )
}

function FloatingWindow({
  rect,
  minimized,
  z,
  dragging,
  onFocus,
  onResize,
  children,
}: {
  rect: Rect
  minimized: boolean
  z: number
  dragging: boolean
  onFocus: () => void
  onResize: (r: Rect) => void
  children: ReactNode
}) {
  const startResize = (edge: 'r' | 'b' | 'rb' | 'l' | 'lb') => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const sx = e.clientX
    const sy = e.clientY
    const start = rect
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx
      const dy = ev.clientY - sy
      const next = { ...start }
      if (edge.includes('r')) next.w = start.w + dx
      if (edge.includes('l')) {
        next.w = start.w - dx
        next.x = start.x + dx
      }
      if (edge.includes('b')) next.h = start.h + dy
      onResize(next)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = edge === 'b' ? 'ns-resize' : edge === 'r' || edge === 'l' ? 'ew-resize' : edge === 'rb' ? 'nwse-resize' : 'nesw-resize'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16 }}
      onPointerDownCapture={onFocus}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: minimized ? 36 : rect.h, zIndex: z }}
      className={cn(
        'pop-surface absolute flex flex-col overflow-hidden rounded-xl bg-surface/95',
        dragging && 'opacity-90 shadow-[0_30px_80px_-10px_rgb(0_0_0/0.9),0_0_0_1px_rgb(139_92_246/0.5)]',
      )}
      role="dialog"
      aria-label="Floating panel"
    >
      {children}
      {!minimized && (
        <>
          <span onPointerDown={startResize('r')} className="absolute top-0 right-0 bottom-3 w-1.5 cursor-ew-resize" />
          <span onPointerDown={startResize('l')} className="absolute top-0 bottom-3 left-0 w-1.5 cursor-ew-resize" />
          <span onPointerDown={startResize('b')} className="absolute right-3 bottom-0 left-3 h-1.5 cursor-ns-resize" />
          <span onPointerDown={startResize('lb')} className="absolute bottom-0 left-0 size-3 cursor-nesw-resize" />
          <span
            onPointerDown={startResize('rb')}
            className="absolute right-0 bottom-0 size-4 cursor-nwse-resize after:absolute after:right-1 after:bottom-1 after:size-2 after:border-r-2 after:border-b-2 after:border-foreground-faint/60 after:content-['']"
            aria-hidden="true"
          />
        </>
      )}
    </motion.div>
  )
}

function DockOverlay({
  pane,
  zone,
  floating,
  title,
  x,
  y,
  root,
}: {
  pane: PaneId
  zone: Dock | null
  floating: boolean
  title: string
  x: number
  y: number
  root: HTMLDivElement | null
}) {
  const r = root?.getBoundingClientRect()
  const allowed = ALLOWED_DOCKS[pane]
  const target = (d: Dock) => (zone === d ? 'border-primary bg-primary/20 text-white shadow-[0_0_30px_rgb(139_92_246/0.45)]' : 'border-white/10 bg-black/30 text-foreground-faint')
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="pointer-events-none absolute inset-0 z-[45]"
    >
      <div className="absolute inset-0 rounded-xl bg-background/30 backdrop-blur-[1px]" />
      {allowed.includes('left') && (
        <div className={cn('absolute inset-y-3 left-3 flex w-[13%] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-xs font-semibold transition-colors', target('left'))}>
          <ArrowLeftToLine className="size-5" /> Dock left
        </div>
      )}
      {allowed.includes('right') && (
        <div className={cn('absolute inset-y-3 right-3 flex w-[13%] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-xs font-semibold transition-colors', target('right'))}>
          <ArrowRightToLine className="size-5" /> Dock right
        </div>
      )}
      {allowed.includes('bottom') && (
        <div className={cn('absolute right-[16%] bottom-3 left-[16%] flex h-[16%] items-center justify-center gap-2 rounded-xl border-2 border-dashed text-xs font-semibold transition-colors', target('bottom'))}>
          <ArrowDownToLine className="size-5" /> Dock bottom
        </div>
      )}
      {!floating && zone === 'float' && r && (
        <div
          className="absolute flex items-center gap-2 rounded-lg border border-primary/50 bg-surface-2/95 px-3 py-2 text-xs font-semibold text-foreground shadow-xl"
          style={{ left: x - r.left + 12, top: y - r.top + 12 }}
        >
          <PictureInPicture2 className="size-4 text-primary-bright" /> Float “{title}” here
        </div>
      )}
    </motion.div>
  )
}
