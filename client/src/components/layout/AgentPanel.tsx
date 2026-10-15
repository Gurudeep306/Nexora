import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CornerDownLeft,
  Eye,
  EyeOff,
  Lock,
  MessageSquareText,
  Minus,
  PanelRight,
  PictureInPicture2,
  Plus,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react'
import { Button, Kbd, Textarea, Tooltip } from '@/components/ui'
import { useAgentContext } from '@/context/AgentContext'
import { AgentThread, AiUnavailableNotice } from '@/components/agent/AgentThread'
import { SelectionAsk } from '@/components/agent/SelectionAsk'
import { preloadAiMarkdown } from '@/components/ai/preload'
import { chipsFor } from '@/lib/pageContext'
import {
  BUBBLE,
  DRAG_THRESHOLD,
  SHEET_BREAKPOINT,
  bubbleLeft,
  clampBubbleXY,
  clampBubbleY,
  clampRect,
  defaultBubble,
  defaultRect,
  loadFloating,
  saveFloating,
  snapBubble,
  useViewport,
  type BubblePos,
  type Layout,
  type WinRect,
} from '@/components/agent/floating'

const HIDDEN_KEY = 'nexora:agent:bubble-hidden'
function sessionHidden(): boolean {
  try {
    return sessionStorage.getItem(HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}
function setSessionHidden(on: boolean) {
  try {
    if (on) sessionStorage.setItem(HIDDEN_KEY, '1')
    else sessionStorage.removeItem(HIDDEN_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * The site-wide assistant. Mounted once in AppLayout, so it (and the
 * conversation) survives navigation. Minimised it is a draggable bubble that
 * snaps to the nearest edge; open it is a draggable, resizable window, a
 * right-hand dock, or (on phones) a bottom sheet. ⌘J / Ctrl+J toggles it.
 */
export function AgentPanel() {
  const { agent, open, openAssistant, closeAssistant, toggleAssistant, ask, summary, shareContext, setShareContext, focusTick } = useAgentContext()
  const reduce = useReducedMotion()
  const vp = useViewport()
  const sheet = vp.w < SHEET_BREAKPOINT
  const [saved] = useState(loadFloating)

  // null = never moved: follow the default spot (bottom-right) as the viewport changes.
  const [placed, setBubble] = useState<BubblePos | null>(saved.bubble ?? null)
  const bubble = placed ?? defaultBubble(vp)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const [rect, setRect] = useState<WinRect>(() => saved.rect ?? defaultRect(vp))
  const [layout, setLayout] = useState<Layout>(saved.layout ?? 'float')
  const [moving, setMoving] = useState<'drag' | 'resize' | null>(null)
  const [hidden, setHidden] = useState(sessionHidden)
  const [unread, setUnread] = useState(false)
  const [input, setInput] = useState('')

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLElement>(null)
  const bubbleRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const suppressClick = useRef(false)
  const titleId = useId()

  const busy = agent.status === 'streaming'
  const mode: 'sheet' | Layout = sheet ? 'sheet' : layout
  const win = clampRect(rect, vp)
  const chips = chipsFor(summary)

  /* ── keyboard: ⌘J / Ctrl+J toggles from anywhere (capture: works inside Monaco too) ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        e.stopPropagation()
        toggleAssistant()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [toggleAssistant])

  /* ── focus: remember where it was, move in only when asked, give it back on close ── */
  const wasOpen = useRef(open)
  useEffect(() => {
    if (open && !wasOpen.current) {
      const a = document.activeElement
      returnFocus.current = a instanceof HTMLElement && a !== document.body ? a : null
      preloadAiMarkdown()
      setUnread(false)
      setHidden(false)
      setSessionHidden(false)
    } else if (!open && wasOpen.current) {
      const inside = windowRef.current?.contains(document.activeElement)
      if (inside || document.activeElement === document.body) {
        const back = returnFocus.current
        requestAnimationFrame(() => (back?.isConnected ? back.focus({ preventScroll: true }) : bubbleRef.current?.focus({ preventScroll: true })))
      }
    }
    wasOpen.current = open
  }, [open])

  // Opening shows the latest messages.
  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
    return () => cancelAnimationFrame(raf)
  }, [open, mode])

  useEffect(() => {
    if (!open || !focusTick) return
    const raf = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(raf)
  }, [focusTick, open])

  // A reply that lands while minimised lights the bubble.
  const prevBusy = useRef(busy)
  useEffect(() => {
    if (prevBusy.current && !busy && !open) setUnread(true)
    prevBusy.current = busy
  }, [busy, open])

  /* ── bubble dragging ── */
  const bubbleDrag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)
  const bubbleY = clampBubbleY(bubble.y, vp)
  const bubbleX = bubbleLeft(bubble.side, vp)

  const onBubbleDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    bubbleDrag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: bubbleX, oy: bubbleY, moved: false }
  }
  const onBubbleMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = bubbleDrag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    d.moved = true
    setDrag(clampBubbleXY(d.ox + dx, d.oy + dy, vp))
  }
  const onBubbleUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = bubbleDrag.current
    if (!d || d.id !== e.pointerId) return
    bubbleDrag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (d.moved) {
      suppressClick.current = true // the click that follows a drag must not open the chat
      const pos = clampBubbleXY(d.ox + e.clientX - d.sx, d.oy + e.clientY - d.sy, vp)
      const snapped = snapBubble(pos.x, pos.y, vp)
      setBubble(snapped)
      saveFloating({ bubble: snapped })
    }
    setDrag(null)
  }
  const onBubbleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    openAssistant(undefined, { focus: true })
  }
  const onBubbleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Arrow keys move the bubble for keyboard users.
    const step = e.shiftKey ? 64 : 16
    let next: BubblePos | null = null
    if (e.key === 'ArrowUp') next = { ...bubble, y: clampBubbleY(bubbleY - step, vp) }
    else if (e.key === 'ArrowDown') next = { ...bubble, y: clampBubbleY(bubbleY + step, vp) }
    else if (e.key === 'ArrowLeft') next = { ...bubble, side: 'left' }
    else if (e.key === 'ArrowRight') next = { ...bubble, side: 'right' }
    if (next) {
      e.preventDefault()
      setBubble(next)
      saveFloating({ bubble: next })
    }
  }

  /* ── window move / resize (float mode) ── */
  const winDrag = useRef<{ id: number; kind: 'drag' | 'resize'; sx: number; sy: number; r: WinRect } | null>(null)
  const startWin = (kind: 'drag' | 'resize') => (e: ReactPointerEvent<HTMLElement>) => {
    if (mode !== 'float' || e.button !== 0) return
    if (kind === 'drag' && (e.target as HTMLElement).closest('button,a,input,textarea,[data-no-drag]')) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    winDrag.current = { id: e.pointerId, kind, sx: e.clientX, sy: e.clientY, r: win }
    setMoving(kind)
  }
  const moveWin = (e: ReactPointerEvent<HTMLElement>) => {
    const d = winDrag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    setRect(clampRect(d.kind === 'drag' ? { ...d.r, x: d.r.x + dx, y: d.r.y + dy } : { ...d.r, w: d.r.w + dx, h: d.r.h + dy }, vp))
  }
  const endWin = (e: ReactPointerEvent<HTMLElement>) => {
    const d = winDrag.current
    if (!d || d.id !== e.pointerId) return
    winDrag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setMoving(null)
    setRect((r) => {
      const c = clampRect(r, vp)
      saveFloating({ rect: c })
      return c
    })
  }
  const onResizeKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 64 : 16
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (!delta) return
    e.preventDefault()
    const next = clampRect({ ...win, w: win.w + delta[0], h: win.h + delta[1] }, vp)
    setRect(next)
    saveFloating({ rect: next })
  }

  const toggleLayout = () => {
    const next: Layout = layout === 'float' ? 'docked' : 'float'
    setLayout(next)
    saveFloating({ layout: next })
  }

  const hideLauncher = () => {
    closeAssistant()
    setHidden(true)
    setSessionHidden(true)
  }

  const submit = (text = input) => {
    if (!text.trim() || busy) return
    setInput('')
    void ask(text)
  }

  const pill = (
    <Tooltip label={shareContext ? 'The assistant sees this page. Click to stop sharing it.' : 'Page sharing is off. Click to share this page again.'}>
      <button
        type="button"
        className="ai-ctx-pill"
        data-off={shareContext ? undefined : ''}
        data-exam={summary.examActive ? '' : undefined}
        onClick={() => setShareContext(!shareContext)}
        aria-pressed={shareContext}
        aria-label={shareContext ? `Sharing page context: ${summary.label}. Turn off` : 'Page context not shared. Turn on'}
      >
        {summary.examActive ? <Lock aria-hidden="true" /> : shareContext ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
        <span>{shareContext ? `Viewing: ${summary.label}` : 'Page not shared'}</span>
      </button>
    </Tooltip>
  )

  const windowStyle =
    mode === 'float' ? { left: win.x, top: win.y, width: win.w, height: win.h } : undefined
  const motionProps = reduce
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0 } } }
    : mode === 'sheet'
      ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } }
      : mode === 'docked'
        ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' }, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } }
        : { initial: { opacity: 0, scale: 0.96, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: 12 }, transition: { duration: 0.18 } }

  return createPortal(
    <>
      {/* No floating bubble while a timed exam runs: it would cover the exam console. */}
      {!open && !hidden && !summary.examActive && (
        <button
          ref={bubbleRef}
          type="button"
          className="ai-fab"
          style={{ left: drag?.x ?? bubbleX, top: drag?.y ?? bubbleY, width: BUBBLE, height: BUBBLE }}
          data-dragging={drag ? '' : undefined}
          onPointerDown={onBubbleDown}
          onPointerMove={onBubbleMove}
          onPointerUp={onBubbleUp}
          onPointerCancel={onBubbleUp}
          onClick={onBubbleClick}
          onKeyDown={onBubbleKey}
          aria-label={`Open NexoraGuru AI assistant (${summary.label}). Drag or use arrow keys to move.`}
          title="NexoraGuru AI — ⌘J"
        >
          <Sparkles aria-hidden="true" />
          {(busy || unread) && <span className="ai-fab-dot" data-busy={busy ? '' : undefined} aria-hidden="true" />}
        </button>
      )}

      <SelectionAsk />

      <AnimatePresence>
        {open && (
          <motion.section
            key={`agent-${mode}`}
            ref={windowRef}
            {...motionProps}
            className="ai-window"
            data-layout={mode}
            data-dragging={moving === 'drag' ? '' : undefined}
            data-resizing={moving === 'resize' ? '' : undefined}
            style={windowStyle}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                closeAssistant()
              }
            }}
          >
            <header
              className="ai-window-head relative flex items-center gap-2 border-b border-border px-3 py-2.5"
              onPointerDown={startWin('drag')}
              onPointerMove={moveWin}
              onPointerUp={endWin}
              onPointerCancel={endWin}
              onDoubleClick={(e) => {
                if (!(e.target as HTMLElement).closest('button') && !sheet) toggleLayout()
              }}
            >
              {mode === 'sheet' && <span className="absolute top-1.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-border" aria-hidden="true" />}
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-cyan/40 bg-surface-2 text-cyan">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                <p id={titleId} className="text-sm leading-tight font-semibold text-foreground">
                  NexoraGuru AI
                </p>
                {pill}
              </div>
              <Tooltip label="New conversation">
                <Button variant="ghost" size="icon-sm" onClick={agent.reset} aria-label="New conversation" disabled={!agent.messages.length}>
                  <Plus aria-hidden="true" />
                </Button>
              </Tooltip>
              {!sheet && (
                <Tooltip label={layout === 'float' ? 'Dock to the side' : 'Float window'}>
                  <Button variant="ghost" size="icon-sm" onClick={toggleLayout} aria-label={layout === 'float' ? 'Dock assistant to the side' : 'Undock into a floating window'}>
                    {layout === 'float' ? <PanelRight aria-hidden="true" /> : <PictureInPicture2 aria-hidden="true" />}
                  </Button>
                </Tooltip>
              )}
              <Tooltip label="Minimise (Esc)">
                <Button variant="ghost" size="icon-sm" onClick={closeAssistant} aria-label="Minimise assistant">
                  <Minus aria-hidden="true" />
                </Button>
              </Tooltip>
              <Tooltip label="Close and hide the bubble (⌘J brings it back)">
                <Button variant="ghost" size="icon-sm" onClick={hideLauncher} aria-label="Close assistant and hide its bubble">
                  <X aria-hidden="true" />
                </Button>
              </Tooltip>
            </header>

            <div ref={scrollRef} className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-5" role="log" aria-live="polite" aria-label="Conversation">
              {agent.messages.length === 0 ? (
                <div className="flex min-h-full flex-col justify-center gap-5 py-2">
                  <div className="text-center">
                    <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary-bright">
                      <Sparkles className="size-5" aria-hidden="true" />
                    </span>
                    <p className="text-[15px] font-semibold text-foreground">How can I help?</p>
                    <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-relaxed text-foreground-dim">
                      {summary.examActive
                        ? 'Exam in progress: I can explain concepts and strategy, but not answers, until you submit.'
                        : shareContext
                          ? `I can see ${summary.label}. Ask about it, or anything else. On unsolved problems you get hints, not answers.`
                          : 'Page sharing is off, so tell me what you are looking at.'}
                    </p>
                  </div>
                  {agent.status === 'unavailable' && <AiUnavailableNotice />}
                  <div className="flex flex-col gap-2">
                    {chips.map((s) => (
                      <button key={s} type="button" onClick={() => submit(s)} className="ai-prompt-card">
                        <MessageSquareText aria-hidden="true" />
                        <span className="flex-1">{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <AgentThread
                  messages={agent.messages}
                  compact
                  onNavigate={sheet ? closeAssistant : undefined}
                  onRetry={agent.retry}
                  scrollRef={scrollRef}
                  currentLabel={shareContext ? summary.label : undefined}
                />
              )}
            </div>

            <form
              className="border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
            >
              {agent.messages.length > 0 && (
                <div className="ai-quick-row mb-2" role="group" aria-label="Quick actions for this page">
                  {chips.map((s) => (
                    <button key={s} type="button" className="ai-quick" disabled={busy} onClick={() => submit(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault()
                      submit()
                    }
                  }}
                  placeholder={summary.examActive ? 'Ask about a concept…' : 'Ask NexoraGuru AI…'}
                  aria-label="Message the AI assistant"
                  rows={2}
                  className="min-h-11 flex-1 resize-none text-sm"
                />
                {busy ? (
                  <Button type="button" variant="secondary" size="icon" onClick={agent.stop} aria-label="Stop generating">
                    <Square aria-hidden="true" />
                  </Button>
                ) : (
                  <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
                    <Send aria-hidden="true" />
                  </Button>
                )}
              </div>
              {mode === 'sheet' ? (
                <p className="mt-1.5 text-[10px] text-foreground-faint">AI can be wrong — check important answers.</p>
              ) : (
                <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-foreground-faint">
                  <CornerDownLeft className="size-3" aria-hidden="true" /> send · <Kbd>⌘</Kbd>
                  <Kbd>J</Kbd> toggles · <Kbd>Esc</Kbd> minimises · AI can be wrong
                </p>
              )}
            </form>

            {mode === 'float' && (
              <button
                type="button"
                className="ai-resize"
                aria-label="Resize assistant (arrow keys)"
                onPointerDown={startWin('resize')}
                onPointerMove={moveWin}
                onPointerUp={endWin}
                onPointerCancel={endWin}
                onKeyDown={onResizeKey}
              />
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </>,
    document.body,
  )
}
