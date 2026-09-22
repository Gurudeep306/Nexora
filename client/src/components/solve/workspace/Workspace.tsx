import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
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

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
const CURSOR: Record<Edge, string> = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' }
const MIN_W = 280
const MIN_H = 150
const HEADER_H = 36
const PANES: PaneId[] = ['problem', 'tests']

/* What the pointer is doing right now. Kept in a ref — moving and resizing
   write straight to the DOM (GPU transform) and commit to React state only on
   release, so drags stay at 60 fps even with Monaco on screen. */
interface Interaction {
  kind: 'move' | 'resize'
  pane: PaneId
  edge?: Edge
  el: HTMLElement
  pointerId: number
  sx: number
  sy: number
  start: Rect
  cur: Rect
  active: boolean
  fromDock: boolean
  zone: Dock | null
  raf: number
}

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
          'rounded-full bg-white/[0.08] transition-[background-color,box-shadow,height,width] duration-150 group-hover:bg-primary group-focus-visible:bg-primary group-data-[separator=active]:bg-primary-bright group-data-[separator=active]:shadow-[0_0_10px_rgb(139_92_246/0.9)]',
          vertical ? 'h-10 w-[3px] group-hover:h-16' : 'h-[3px] w-10 group-hover:w-16',
        )}
      />
    </Separator>
  )
}

/**
 * IDE-style workspace: the problem and tests panes can be docked left / right /
 * bottom, floated as windows (move, resize from any edge or corner), minimized,
 * or maximized. In `immersive` mode (the full-screen arena) the editor fills
 * the screen and both panes are floating windows above it.
 */
export function Workspace({
  api,
  problem,
  tests,
  editor,
  overlay,
  immersive = false,
}: {
  api: WorkspaceApi
  problem: PaneSpec
  tests: PaneSpec
  editor: ReactNode
  overlay?: ReactNode
  immersive?: boolean
}) {
  const { ws, dock, setFloat, minimize, toggleMax, setImmersive } = api
  const rootRef = useRef<HTMLDivElement>(null)
  const winRef = useRef<Record<PaneId, HTMLDivElement | null>>({ problem: null, tests: null })
  const ghostRef = useRef<HTMLDivElement>(null)
  const act = useRef<Interaction | null>(null)
  const lastDragEnd = useRef(0)
  const [dragUi, setDragUi] = useState<{ pane: PaneId; zone: Dock | null; fromDock: boolean } | null>(null)
  const [front, setFront] = useState<PaneId>('tests')
  const [bounds, setBounds] = useState({ w: 0, h: 0 })
  const [maxFloat, setMaxFloat] = useState<PaneId | null>(null)
  const specs: Record<PaneId, PaneSpec> = { problem, tests }

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setBounds({ w: r.width, h: r.height })
    const ro = new ResizeObserver(([e]) => e && setBounds({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* Floating state lives in different places for the docked workspace and the arena. */
  const isFloat = (p: PaneId) => immersive || ws[p].dock === 'float'
  const floatOf = (p: PaneId) => (immersive ? ws.immersive[p] : { minimized: ws[p].minimized, float: ws[p].float })
  const commitFloat = useCallback(
    (p: PaneId, r: Rect) => (immersive ? setImmersive(p, { float: r }) : setFloat(p, r)),
    [immersive, setImmersive, setFloat],
  )
  const setMin = (p: PaneId, v: boolean) => (immersive ? setImmersive(p, { minimized: v }) : minimize(p, v))

  /* Keep a window reachable: at least 120px of its title bar stays on screen. */
  const place = useCallback(
    (r: Rect): Rect => {
      const W = bounds.w || 1200
      const H = bounds.h || 700
      const w = Math.min(Math.max(MIN_W, r.w < 0 ? W * 0.36 : r.w), W)
      const hAuto = r.h === -2 ? H * 0.6 - 18 : r.h === -3 ? H * 0.4 - 18 : H - 24
      const h = Math.min(Math.max(MIN_H, r.h < 0 ? hAuto : r.h), H)
      const x = r.x < 0 ? W - w - 12 : Math.min(Math.max(-(w - 120), r.x), W - 120)
      const y = r.y < 0 ? H - h - 12 : Math.min(Math.max(0, r.y), H - HEADER_H)
      return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }
    },
    [bounds],
  )

  const zoneAt = useCallback(
    (pane: PaneId, x: number, y: number): Dock => {
      if (immersive) return 'float'
      const el = rootRef.current
      if (!el) return 'float'
      const r = el.getBoundingClientRect()
      const allowed = ALLOWED_DOCKS[pane]
      if (allowed.includes('left') && x < r.left + Math.min(140, r.width * 0.12)) return 'left'
      if (allowed.includes('right') && x > r.right - Math.min(140, r.width * 0.12)) return 'right'
      if (allowed.includes('bottom') && y > r.bottom - Math.min(120, r.height * 0.16)) return 'bottom'
      return 'float'
    },
    [immersive],
  )

  const paint = (a: Interaction) => {
    a.raf = 0
    const el = winRef.current[a.pane]
    if (a.kind === 'move' && a.fromDock) {
      const g = ghostRef.current
      const root = rootRef.current?.getBoundingClientRect()
      if (g && root) g.style.transform = `translate3d(${a.cur.x}px, ${a.cur.y}px, 0)`
      return
    }
    if (!el) return
    el.style.transform = `translate3d(${a.cur.x}px, ${a.cur.y}px, 0)`
    el.style.width = `${a.cur.w}px`
    el.style.height = `${a.cur.h}px`
  }

  const onPointerMove = useCallback(
    (ev: PointerEvent) => {
      const a = act.current
      if (!a || ev.pointerId !== a.pointerId) return
      const dx = ev.clientX - a.sx
      const dy = ev.clientY - a.sy
      if (!a.active) {
        if (Math.hypot(dx, dy) < 4) return
        a.active = true
        try {
          a.el.setPointerCapture(a.pointerId)
        } catch {
          /* pointer already gone */
        }
        document.body.style.userSelect = 'none'
        document.body.style.cursor = a.kind === 'resize' && a.edge ? CURSOR[a.edge] : 'grabbing'
        winRef.current[a.pane]?.setAttribute('data-live', '')
        if (a.kind === 'move') setDragUi({ pane: a.pane, zone: null, fromDock: a.fromDock })
      }
      const s = a.start
      if (a.kind === 'move') {
        if (a.fromDock) {
          const root = rootRef.current!.getBoundingClientRect()
          a.cur = { ...s, x: ev.clientX - root.left + 14, y: ev.clientY - root.top + 14 }
        } else {
          a.cur = place({ ...s, x: s.x + dx, y: s.y + dy })
        }
        const zone = zoneAt(a.pane, ev.clientX, ev.clientY)
        if (zone !== a.zone) {
          a.zone = zone
          setDragUi({ pane: a.pane, zone, fromDock: a.fromDock })
        }
      } else if (a.edge) {
        const e = a.edge
        const n = { ...s }
        const right = s.x + s.w
        const bottom = s.y + s.h
        if (e.includes('e')) n.w = Math.max(MIN_W, Math.min(s.w + dx, (bounds.w || 9999) - s.x))
        if (e.includes('s')) n.h = Math.max(MIN_H, Math.min(s.h + dy, (bounds.h || 9999) - s.y))
        if (e.includes('w')) {
          n.x = Math.max(0, Math.min(s.x + dx, right - MIN_W))
          n.w = right - n.x
        }
        if (e.includes('n')) {
          n.y = Math.max(0, Math.min(s.y + dy, bottom - MIN_H))
          n.h = bottom - n.y
        }
        a.cur = n
      }
      if (!a.raf) a.raf = requestAnimationFrame(() => paint(a))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [place, zoneAt, bounds],
  )

  const finish = useCallback(
    (ev: PointerEvent) => {
      const a = act.current
      if (!a || ev.pointerId !== a.pointerId) return
      act.current = null
      if (a.raf) cancelAnimationFrame(a.raf)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      try {
        a.el.releasePointerCapture(a.pointerId)
      } catch {
        /* already released */
      }
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      winRef.current[a.pane]?.removeAttribute('data-live')
      setDragUi(null)
      if (!a.active) return
      lastDragEnd.current = Date.now()
      if (a.kind === 'resize') {
        commitFloat(a.pane, a.cur)
        return
      }
      const zone = zoneAt(a.pane, ev.clientX, ev.clientY)
      if (zone !== 'float') {
        dock(a.pane, zone)
      } else if (a.fromDock) {
        const root = rootRef.current!.getBoundingClientRect()
        const f = floatOf(a.pane).float
        const w = f.w > 0 ? f.w : 480
        const h = f.h > 0 ? f.h : 360
        dock(a.pane, 'float', place({ w, h, x: ev.clientX - root.left - Math.min(160, w / 2), y: ev.clientY - root.top - 16 }))
      } else {
        commitFloat(a.pane, a.cur)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onPointerMove, commitFloat, dock, place, zoneAt],
  )

  const begin = (pane: PaneId, kind: 'move' | 'resize', edge?: Edge) => (e: React.PointerEvent) => {
    if (e.button !== 0 || act.current) return
    const onTab = !!(e.target as HTMLElement).closest('[role="tab"]')
    if (!onTab) e.preventDefault() // no text selection / focus steal; tabs keep their click
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    const floating = isFloat(pane)
    const start = floating ? place(floatOf(pane).float) : { x: 0, y: 0, w: 480, h: 360 }
    setFront(pane)
    act.current = {
      kind,
      pane,
      edge,
      el,
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      start,
      cur: start,
      active: false,
      fromDock: !floating,
      zone: null,
      raf: 0,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  useEffect(
    () => () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    },
    [],
  )

  /* ── pieces ── */
  const header = (pane: PaneId, floating: boolean) => (
    <PaneHeader
      icon={specs[pane].icon}
      title={specs[pane].title}
      dock={immersive ? 'float' : ws[pane].dock}
      allowed={immersive ? [] : ALLOWED_DOCKS[pane]}
      maximized={floating ? maxFloat === pane : ws.maximized === pane}
      onDragStart={begin(pane, 'move')}
      onDock={(d) => dock(pane, d, d === 'float' ? place(ws[pane].float) : undefined)}
      onMinimize={() => setMin(pane, true)}
      onToggleMaximize={() => (floating ? setMaxFloat((m) => (m === pane ? null : pane)) : toggleMax(pane))}
    >
      {specs[pane].headerExtra}
    </PaneHeader>
  )

  const paneBody = (pane: PaneId, floating = false) => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {header(pane, floating)}
      <motion.div
        key={`${pane}-${immersive ? 'im' : ws[pane].dock}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="min-h-0 flex-1 overflow-hidden"
      >
        {specs[pane].content}
      </motion.div>
    </div>
  )

  const rail = (pane: PaneId, side: 'left' | 'right') => (
    <motion.button
      key={`rail-${pane}`}
      layout
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: 36 }}
      exit={{ opacity: 0, width: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      onClick={() => setMin(pane, false)}
      aria-label={`Restore ${specs[pane].title} panel`}
      title={`Restore ${specs[pane].title} (Alt+${pane === 'problem' ? 1 : 2})`}
      className={cn(
        'card-neon group flex shrink-0 cursor-pointer flex-col items-center gap-3 overflow-hidden py-3 text-foreground-faint transition-colors hover:border-primary/40 hover:text-foreground',
        side === 'left' ? 'mr-2.5' : 'ml-2.5',
      )}
    >
      <span className="text-primary-bright [&_svg]:size-4">{specs[pane].icon}</span>
      <span className="min-h-0 flex-1 truncate text-[11px] font-semibold tracking-[0.12em] uppercase [writing-mode:vertical-rl] rotate-180">
        {specs[pane].title}
      </span>
    </motion.button>
  )

  const floatingWindow = (p: PaneId) => {
    const st = floatOf(p)
    const maxed = maxFloat === p
    const r = maxed ? { x: 0, y: 0, w: bounds.w, h: bounds.h } : place(st.float)
    const min = st.minimized
    return (
      <div
        key={`win-${p}`}
        ref={(el) => {
          winRef.current[p] = el
        }}
        onPointerDownCapture={() => setFront(p)}
        style={{
          transform: `translate3d(${r.x}px, ${r.y}px, 0)`,
          width: min ? Math.min(r.w, 300) : r.w,
          height: min ? HEADER_H : r.h,
          zIndex: front === p ? 32 : 31,
        }}
        className={cn(
          'nx-float pop-surface absolute top-0 left-0 flex flex-col overflow-hidden rounded-xl bg-surface/95 will-change-transform',
          dragUi?.pane === p && !dragUi.fromDock && 'shadow-[0_30px_80px_-10px_rgb(0_0_0/0.9),0_0_0_1px_rgb(139_92_246/0.55)]',
        )}
        role="dialog"
        aria-label={`${specs[p].title} window`}
      >
        {min ? (
          <div
            onPointerDown={begin(p, 'move')}
            onClick={() => Date.now() - lastDragEnd.current > 250 && setMin(p, false)}
            className="flex h-9 w-full cursor-grab items-center gap-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-foreground-dim uppercase select-none active:cursor-grabbing"
            title="Click to restore · drag to move"
          >
            <span className="text-primary-bright [&_svg]:size-3.5">{specs[p].icon}</span>
            {specs[p].title}
            <span className="ml-auto text-[10px] normal-case text-foreground-faint">restore</span>
          </div>
        ) : (
          paneBody(p, true)
        )}
        {!min && !maxed && (
          <>
            <span onPointerDown={begin(p, 'resize', 'n')} className="nx-edge top-0 right-3 left-3 h-1.5 cursor-ns-resize" />
            <span onPointerDown={begin(p, 'resize', 's')} className="nx-edge right-3 bottom-0 left-3 h-1.5 cursor-ns-resize" />
            <span onPointerDown={begin(p, 'resize', 'e')} className="nx-edge top-3 right-0 bottom-3 w-1.5 cursor-ew-resize" />
            <span onPointerDown={begin(p, 'resize', 'w')} className="nx-edge top-3 bottom-3 left-0 w-1.5 cursor-ew-resize" />
            <span onPointerDown={begin(p, 'resize', 'nw')} className="nx-corner top-0 left-0 cursor-nwse-resize" />
            <span onPointerDown={begin(p, 'resize', 'ne')} className="nx-corner top-0 right-0 cursor-nesw-resize" />
            <span onPointerDown={begin(p, 'resize', 'sw')} className="nx-corner bottom-0 left-0 cursor-nesw-resize" />
            <span onPointerDown={begin(p, 'resize', 'se')} className="nx-corner nx-grip right-0 bottom-0 cursor-nwse-resize" />
          </>
        )}
      </div>
    )
  }

  const overlayLayer = (
    <>
      {/* ghost chip when pulling a docked pane out */}
      <div
        ref={ghostRef}
        className={cn(
          'pointer-events-none absolute top-0 left-0 z-[46] flex items-center gap-2 rounded-lg border border-primary/50 bg-surface-2/95 px-3 py-2 text-xs font-semibold text-foreground shadow-xl will-change-transform',
          dragUi?.fromDock ? 'opacity-100' : 'opacity-0',
        )}
      >
        <PictureInPicture2 className="size-4 text-primary-bright" />
        {dragUi ? (dragUi.zone && dragUi.zone !== 'float' ? `Dock ${specs[dragUi.pane].title} ${dragUi.zone}` : `Float ${specs[dragUi.pane].title}`) : ''}
      </div>
      <AnimatePresence>{dragUi && !immersive && <DockTargets pane={dragUi.pane} zone={dragUi.zone} />}</AnimatePresence>
    </>
  )

  /* ── Full-screen arena: editor fills, panes float above ── */
  if (immersive) {
    return (
      <div ref={rootRef} className="relative min-h-0 flex-1 overflow-hidden">
        {overlay}
        <div className="absolute inset-0 overflow-hidden">{editor}</div>
        <AnimatePresence>
          {PANES.filter((p) => !ws.immersive[p].minimized).map((p) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              style={{ zIndex: front === p ? 32 : 31 }}
              className="pointer-events-none absolute inset-0 [&>*]:pointer-events-auto"
            >
              {floatingWindow(p)}
            </motion.div>
          ))}
        </AnimatePresence>
        {overlayLayer}
      </div>
    )
  }

  /* ── Maximized docked pane ── */
  if (ws.maximized) {
    const id = ws.maximized
    return (
      <div ref={rootRef} className="relative flex min-h-0 flex-1">
        {overlay}
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18 }}
          className="card-neon flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {id === 'editor' ? editor : paneBody(id)}
        </motion.div>
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
  const leftPanes = PANES.filter((p) => docked(p, 'left'))
  const rightPanes = (['tests', 'problem'] as PaneId[]).filter((p) => docked(p, 'right')).reverse()
  const testsBottom = docked('tests', 'bottom')
  const hKey = ['h', ...leftPanes, 'c', ...rightPanes].join('-')
  const vKey = testsBottom ? 'v-e-t' : 'v-e'

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1">
      {overlay}
      <AnimatePresence initial={false}>{PANES.filter((p) => minimizedAt(p, 'left')).map((p) => rail(p, 'left'))}</AnimatePresence>

      <HGroup key={hKey} id={hKey} panelIds={[...leftPanes, 'center', ...rightPanes]}>
        {leftPanes.map((p) => (
          <Fragment key={p}>
            <Panel id={p} minSize="16%" defaultSize={p === 'problem' ? '38%' : '27%'} className="card-neon overflow-hidden">
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
          <AnimatePresence initial={false}>
            {minimizedAt('tests', 'bottom') && (
              <motion.button
                key="bar-tests"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 36, marginTop: 10 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                onClick={() => minimize('tests', false)}
                aria-label="Restore Tests panel"
                title="Restore Tests (Alt+2)"
                className="card-neon flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden px-3 text-[11px] font-semibold tracking-[0.12em] text-foreground-faint uppercase transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <span className="text-primary-bright [&_svg]:size-3.5">{tests.icon}</span>
                {tests.title}
                <span className="ml-auto text-[10px] normal-case">click to restore</span>
              </motion.button>
            )}
          </AnimatePresence>
        </Panel>
        {rightPanes.map((p) => (
          <Fragment key={p}>
            <ResizeHandle orientation="vertical" />
            <Panel id={p} minSize="16%" defaultSize={p === 'problem' ? '38%' : '27%'} className="card-neon overflow-hidden">
              {paneBody(p)}
            </Panel>
          </Fragment>
        ))}
      </HGroup>

      <AnimatePresence initial={false}>
        {(['tests', 'problem'] as PaneId[]).filter((p) => minimizedAt(p, 'right')).map((p) => rail(p, 'right'))}
      </AnimatePresence>

      {PANES.filter((p) => ws[p].dock === 'float').map((p) => floatingWindow(p))}
      {overlayLayer}
    </div>
  )
}

function HGroup({ id, panelIds, children }: { id: string; panelIds: string[]; children: ReactNode }) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: `nexora-ws-${id}`, panelIds, storage: localStorage })
  return (
    <Group
      id={id}
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      resizeTargetMinimumSize={{ fine: 14, coarse: 36 }}
      className="min-h-0 min-w-0 flex-1"
    >
      {children}
    </Group>
  )
}

function VGroup({ id, panelIds, children }: { id: string; panelIds: string[]; children: ReactNode }) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: `nexora-ws-${id}`, panelIds, storage: localStorage })
  return (
    <Group
      id={id}
      orientation="vertical"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      resizeTargetMinimumSize={{ fine: 14, coarse: 36 }}
      className="min-h-0 flex-1"
    >
      {children}
    </Group>
  )
}

function DockTargets({ pane, zone }: { pane: PaneId; zone: Dock | null }) {
  const allowed = ALLOWED_DOCKS[pane]
  const target = (d: Dock) =>
    zone === d ? 'border-primary bg-primary/20 text-white shadow-[0_0_30px_rgb(139_92_246/0.45)] scale-[1.02]' : 'border-white/10 bg-black/30 text-foreground-faint'
  const base = 'absolute flex items-center justify-center gap-2 rounded-xl border-2 border-dashed text-xs font-semibold transition-[background-color,border-color,transform,color] duration-150'
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="pointer-events-none absolute inset-0 z-[45]"
    >
      {allowed.includes('left') && (
        <div className={cn(base, 'inset-y-3 left-3 w-[min(140px,12%)] flex-col', target('left'))}>
          <ArrowLeftToLine className="size-5" /> Dock left
        </div>
      )}
      {allowed.includes('right') && (
        <div className={cn(base, 'inset-y-3 right-3 w-[min(140px,12%)] flex-col', target('right'))}>
          <ArrowRightToLine className="size-5" /> Dock right
        </div>
      )}
      {allowed.includes('bottom') && (
        <div className={cn(base, 'right-[15%] bottom-3 left-[15%] h-[min(110px,15%)]', target('bottom'))}>
          <ArrowDownToLine className="size-5" /> Dock bottom
        </div>
      )}
    </motion.div>
  )
}
