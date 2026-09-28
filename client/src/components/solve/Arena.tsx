import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { Code2, Minimize2, Play, ScrollText, Send, Timer } from 'lucide-react'
import { Button, Kbd, Tooltip } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Workspace, type PaneSpec } from './workspace/Workspace'
import type { WorkspaceApi } from './workspace/useWorkspace'
import { LayoutMenu } from './workspace/LayoutMenu'

type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> }
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }

/** Ask the browser for real full screen (call from a click handler). */
export function enterBrowserFullscreen() {
  const el = document.documentElement as FsEl
  try {
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.()
    void p?.catch?.(() => {})
  } catch {
    /* not allowed — the arena still covers the page */
  }
}
function exitBrowserFullscreen() {
  const d = document as FsDoc
  if (d.fullscreenElement || d.webkitFullscreenElement) {
    void (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.())?.catch?.(() => {})
  }
}

function useElapsed() {
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(start)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.floor((now - start) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Full-screen arena: the whole monitor, no sidebar/tabs/theme menus — just the
 * editor, a slim bar with Run / Submit, and the problem + tests as floating
 * windows you can drag, resize from any edge, minimize or maximize.
 */
export function Arena({
  api,
  title,
  languagePicker,
  problem,
  tests,
  editor,
  overlay,
  running,
  submitting,
  onRun,
  onSubmit,
  onExit,
}: {
  api: WorkspaceApi
  title: string
  languagePicker: ReactNode
  problem: PaneSpec
  tests: PaneSpec
  editor: ReactNode
  overlay?: ReactNode
  running: boolean
  submitting: boolean
  onRun: () => void
  onSubmit: () => void
  onExit: () => void
}) {
  const elapsed = useElapsed()
  const im = api.ws.immersive
  const floating = api.ws.arenaMode === 'floating'
  const hidden = (p: 'problem' | 'tests') => (floating ? im[p].minimized : api.ws[p].minimized)

  // Leaving browser full screen (Esc) closes the arena too.
  useEffect(() => {
    const onFs = () => {
      const d = document as FsDoc
      if (!d.fullscreenElement && !d.webkitFullscreenElement) onExit()
    }
    document.addEventListener('fullscreenchange', onFs)
    document.addEventListener('webkitfullscreenchange', onFs)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement && !document.querySelector('[role="dialog"][data-state="open"]')) onExit()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      document.removeEventListener('webkitfullscreenchange', onFs)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onExit])

  const toggle = (p: 'problem' | 'tests') =>
    floating ? api.setImmersive(p, { minimized: !im[p].minimized }) : api.minimize(p, !api.ws[p].minimized)

  return createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[1050] flex flex-col bg-background"
      role="application"
      aria-label="Full-screen arena"
    >
      {/* slim command bar */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline/[0.06] bg-bg-surface/90 px-3 backdrop-blur-xl">
        <Tooltip label="Exit full screen (Esc)" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              exitBrowserFullscreen()
              onExit()
            }}
            aria-label="Exit full screen"
          >
            <Minimize2 /> <span className="hidden sm:inline">Exit</span>
          </Button>
        </Tooltip>
        <span className="min-w-0 truncate font-display text-sm font-semibold text-foreground">{title}</span>
        <span className="hidden items-center gap-1 rounded-full border border-hairline/[0.06] px-2 py-0.5 font-mono text-[11px] text-foreground-faint tabular-nums sm:flex" title="Time in arena">
          <Timer className="size-3" /> {elapsed}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {(
            [
              ['problem', 'Problem', <ScrollText key="p" />, 'Alt+1'],
              ['tests', 'Tests', <Code2 key="t" />, 'Alt+2'],
            ] as const
          ).map(([id, label, icon, key]) => (
            <Tooltip key={id} label={`${hidden(id) ? 'Show' : 'Hide'} ${label.toLowerCase()} (${key})`} side="bottom">
              <button
                onClick={() => toggle(id)}
                aria-pressed={!hidden(id)}
                className={cn(
                  'flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors [&_svg]:size-3.5',
                  hidden(id) ? 'border-hairline/[0.06] text-foreground-faint hover:text-foreground' : 'border-primary/30 bg-primary/10 text-primary-bright',
                )}
              >
                {icon}
                <span className="hidden md:inline">{label}</span>
              </button>
            </Tooltip>
          ))}
          <LayoutMenu api={api} arena />
          <span className="mx-1 h-5 w-px bg-white/10" />
          {languagePicker}
          <Button variant="subtle" size="sm" onClick={onRun} loading={running} disabled={submitting}>
            {!running && <Play />} Run <Kbd className="ml-0.5 hidden lg:inline-flex">⌘↵</Kbd>
          </Button>
          <Button size="sm" onClick={onSubmit} loading={submitting} disabled={running}>
            {!submitting && <Send />} Submit
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 p-2">
        <Workspace
          api={api}
          immersive={floating}
          overlay={overlay}
          problem={problem}
          tests={tests}
          editor={floating ? <div className="card-neon h-full overflow-hidden">{editor}</div> : editor}
        />
      </div>
    </motion.div>,
    document.body,
  )
}
