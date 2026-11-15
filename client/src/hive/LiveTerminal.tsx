import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal as XTerm, type ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { Eraser, Plus, RotateCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { useMedia } from './kit'

/**
 * A live terminal on a machine: a real shell (bash/zsh in a pseudo-terminal)
 * that you type into, with colours, full-screen programs, Ctrl+C and resizing.
 * Several tabs per folder; each survives a dropped connection or a reload
 * (Hive replays what you missed), and closes after 30 idle minutes.
 */

type Phase = 'connecting' | 'live' | 'reconnecting' | 'ended' | 'error'
type Tab = { key: string; id: string | null; title: string }

const store = (machineId: string, folder: string) => `hive:terms:${machineId}:${folder}`
function loadTabs(machineId: string, folder: string): Tab[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(store(machineId, folder)) || '[]') as Tab[]
    if (Array.isArray(raw) && raw.length) return raw.map((t) => ({ key: t.key, id: t.id, title: t.title }))
  } catch {
    /* storage blocked */
  }
  return [{ key: crypto.randomUUID(), id: null, title: 'Shell 1' }]
}
function saveTabs(machineId: string, folder: string, tabs: Tab[]) {
  try {
    sessionStorage.setItem(store(machineId, folder), JSON.stringify(tabs.filter((t) => t.id)))
  } catch {
    /* storage blocked */
  }
}

/** Resolve any CSS colour (oklch, color-mix, var) to #rrggbb for xterm. */
function toHex(css: string, fallback: string): string {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return fallback
    ctx.fillStyle = fallback
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return fallback
  }
}

/** A calm ANSI palette per theme (readable, not neon), on the app's own surfaces. */
function readTheme(host: HTMLElement): ITheme {
  const cs = getComputedStyle(host)
  const v = (name: string, fb: string) => toHex(cs.getPropertyValue(name).trim() || fb, fb)
  const bg = v('--hv-term-bg', '#0b0c0e')
  const dark = (() => {
    const n = parseInt(bg.slice(1), 16)
    return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 128
  })()
  const fg = v('--hv-text-1', dark ? '#e6e8eb' : '#16181d')
  const accent = v('--hv-accent', '#5b8cff')
  const pal = dark
    ? { black: '#2a2d33', red: '#f2727b', green: '#7fd1a0', yellow: '#e8c27a', blue: '#7aa7ff', magenta: '#c49cf5', cyan: '#6fd0d6', white: '#c9ccd2', brightBlack: '#5b6069', brightRed: '#ff8c94', brightGreen: '#97e2b4', brightYellow: '#f3d293', brightBlue: '#99bcff', brightMagenta: '#d5b3fa', brightCyan: '#8ae0e5', brightWhite: '#f2f3f5' }
    : { black: '#24272d', red: '#c4313c', green: '#1d7a46', yellow: '#946200', blue: '#2457c5', magenta: '#7d3fc2', cyan: '#127a82', white: '#d7d9de', brightBlack: '#6b707a', brightRed: '#d9434e', brightGreen: '#25915a', brightYellow: '#a87400', brightBlue: '#3a6ad6', brightMagenta: '#9152d6', brightCyan: '#178e97', brightWhite: '#ffffff' }
  return {
    background: bg,
    foreground: fg,
    cursor: fg,
    cursorAccent: bg,
    selectionBackground: `${accent}55`,
    selectionInactiveBackground: `${accent}30`,
    scrollbarSliderBackground: dark ? '#ffffff18' : '#00000018',
    scrollbarSliderHoverBackground: dark ? '#ffffff30' : '#00000030',
    scrollbarSliderActiveBackground: dark ? '#ffffff40' : '#00000040',
    ...pal,
  }
}

const PHASE: Record<Phase, { label: string; color: string }> = {
  connecting: { label: 'Connecting', color: 'var(--hv-text-3)' },
  live: { label: 'Live', color: 'var(--hv-success)' },
  reconnecting: { label: 'Reconnecting', color: 'var(--hv-warning)' },
  ended: { label: 'Ended', color: 'var(--hv-text-3)' },
  error: { label: 'Problem', color: 'var(--hv-danger)' },
}

export default function LiveTerminal({ machineId, folder, machineName, online = true, className }: { machineId: string; folder: string; machineName?: string; online?: boolean; className?: string }) {
  const [tabs, setTabs] = useState<Tab[]>(() => loadTabs(machineId, folder))
  const [active, setActive] = useState(() => tabs[0]?.key)
  const [phases, setPhases] = useState<Record<string, Phase>>({})
  const writers = useRef(new Map<string, (data: string) => void>())
  const clearers = useRef(new Map<string, () => void>())

  useEffect(() => saveTabs(machineId, folder, tabs), [machineId, folder, tabs])

  const addTab = () => {
    const n = Math.max(0, ...tabs.map((t) => Number(t.title.replace(/\D/g, '')) || 0)) + 1
    const t = { key: crypto.randomUUID(), id: null, title: `Shell ${n}` }
    setTabs((x) => [...x, t])
    setActive(t.key)
  }
  const closeTab = (key: string) => {
    const t = tabs.find((x) => x.key === key)
    if (t?.id) hiveApi.termClose(machineId, t.id).catch(() => {})
    const rest = tabs.filter((x) => x.key !== key)
    if (!rest.length) {
      const fresh = { key: crypto.randomUUID(), id: null, title: 'Shell 1' }
      setTabs([fresh])
      setActive(fresh.key)
      return
    }
    setTabs(rest)
    if (active === key) setActive(rest[rest.length - 1].key)
  }
  const restart = (key: string) => {
    const t = tabs.find((x) => x.key === key)
    if (t?.id) hiveApi.termClose(machineId, t.id).catch(() => {})
    const fresh = { key: crypto.randomUUID(), id: null, title: t?.title || 'Shell' }
    setTabs((x) => x.map((y) => (y.key === key ? fresh : y)))
    setActive(fresh.key)
  }

  // Commands sent from elsewhere in the session (quick actions) run in the active shell.
  useEffect(() => {
    const on = (e: Event) => {
      const cmd = String((e as CustomEvent).detail || '')
      if (cmd && active) writers.current.get(active)?.(`${cmd}\r`)
    }
    document.addEventListener('hive:terminal', on)
    return () => document.removeEventListener('hive:terminal', on)
  }, [active])

  const phase = (active && phases[active]) || 'connecting'
  const setPhase = useCallback((key: string, p: Phase) => setPhases((x) => (x[key] === p ? x : { ...x, [key]: p })), [])
  const touch = useMedia('(pointer: coarse)')

  if (!online) {
    return (
      <div className={cn('hv-term flex h-full flex-col items-center justify-center gap-1 p-6 text-center', className)}>
        <p className="text-[13.5px] font-medium text-[var(--hv-text-1)]">{machineName || 'The machine'} is offline</p>
        <p className="max-w-[44ch] text-[12.5px] text-[var(--hv-text-3)]">Start the Hive bridge on it and the terminal connects on its own.</p>
      </div>
    )
  }

  return (
    <div className={cn('hv-term flex h-full min-h-0 flex-col', className)}>
      <div className="hv-term-bar flex h-9 shrink-0 items-stretch gap-0 border-b border-[var(--hv-border-subtle)] pl-1 pr-1.5">
        <div className="flex min-w-0 items-stretch overflow-x-auto">
          <div role="tablist" aria-label="Terminals" className="flex items-stretch">
          {tabs.map((t) => {
            const p = phases[t.key] || 'connecting'
            return (
              // The tab itself is the only control in the tab list; Delete on a focused tab
              // closes it (like an editor), and the × is a mouse shortcut for the same.
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={t.key === active}
                aria-keyshortcuts="Delete"
                title={`${t.title} — Delete closes it`}
                onClick={() => setActive(t.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault()
                    closeTab(t.key)
                  }
                }}
                className={cn('hv-term-tab group flex h-full items-center gap-2 pl-2.5 pr-1.5 text-[12px]', t.key === active && 'is-active')}
              >
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: PHASE[p].color }} aria-hidden="true" />
                <span className="whitespace-nowrap">{t.title}</span>
                <span
                  aria-hidden="true"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(t.key)
                  }}
                  className="hv-term-icon !size-5 opacity-0 group-hover:opacity-100 [.is-active_&]:opacity-60"
                >
                  <X className="size-3" />
                </span>
              </button>
            )
          })}
          </div>
          <button type="button" onClick={addTab} aria-label="New terminal" title="New terminal" className="hv-term-icon my-auto ml-1">
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2 pl-3">
          <span className="hidden min-w-0 truncate font-mono text-[11.5px] text-[var(--hv-text-3)] md:inline" title={folder}>
            {machineName ? `${machineName} · ` : ''}
            {folder || '~'}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-[var(--hv-text-2)]" role="status">
            <span className={cn('size-1.5 rounded-full', phase === 'live' && 'hv-term-live')} style={{ background: PHASE[phase].color }} aria-hidden="true" />
            {PHASE[phase].label}
          </span>
          <button type="button" onClick={() => active && clearers.current.get(active)?.()} aria-label="Clear the screen" title="Clear" className="hv-term-icon">
            <Eraser className="size-3.5" />
          </button>
          <button type="button" onClick={() => active && restart(active)} aria-label="Restart this shell" title="Restart shell" className="hv-term-icon">
            <RotateCw className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {tabs.map((t) => (
          <TermView
            key={t.key}
            tab={t}
            visible={t.key === active}
            machineId={machineId}
            folder={folder}
            onId={(id) => setTabs((x) => x.map((y) => (y.key === t.key ? { ...y, id } : y)))}
            onPhase={(p) => setPhase(t.key, p)}
            register={(w, c) => {
              writers.current.set(t.key, w)
              clearers.current.set(t.key, c)
              return () => {
                writers.current.delete(t.key)
                clearers.current.delete(t.key)
              }
            }}
          />
        ))}
      </div>
      {touch && <KeyBar send={(s) => active && writers.current.get(active)?.(s)} />}
    </div>
  )
}

/** Keys a phone keyboard doesn't have. Ctrl arms the next key (Ctrl then C sends ^C). */
function KeyBar({ send }: { send: (s: string) => void }) {
  const [ctrl, setCtrl] = useState(false)
  const keys: [string, string][] = [
    ['Esc', '\x1b'],
    ['Tab', '\t'],
    ['↑', '\x1b[A'],
    ['↓', '\x1b[B'],
    ['←', '\x1b[D'],
    ['→', '\x1b[C'],
    ['|', '|'],
    ['~', '~'],
    ['/', '/'],
    ['-', '-'],
  ]
  useEffect(() => {
    if (!ctrl) return
    const on = (e: KeyboardEvent) => {
      if (e.key.length === 1) {
        e.preventDefault()
        send(String.fromCharCode(e.key.toUpperCase().charCodeAt(0) - 64))
        setCtrl(false)
      }
    }
    window.addEventListener('keydown', on, true)
    return () => window.removeEventListener('keydown', on, true)
  }, [ctrl, send])
  return (
    <div className="flex shrink-0 gap-1 overflow-x-auto border-t border-[var(--hv-border-subtle)] px-2 py-1.5" aria-label="Extra keys">
      <button type="button" aria-pressed={ctrl} onClick={() => setCtrl((c) => !c)} className={cn('hv-term-key', ctrl && 'is-on')}>
        Ctrl
      </button>
      <button type="button" onClick={() => send('\x03')} className="hv-term-key" aria-label="Control C (stop)">
        ^C
      </button>
      {keys.map(([label, seq]) => (
        <button key={label} type="button" onClick={() => send(seq)} className="hv-term-key">
          {label}
        </button>
      ))}
    </div>
  )
}

function TermView({
  tab,
  visible,
  machineId,
  folder,
  onId,
  onPhase,
  register,
}: {
  tab: Tab
  visible: boolean
  machineId: string
  folder: string
  onId: (id: string) => void
  onPhase: (p: Phase) => void
  register: (write: (d: string) => void, clear: () => void) => () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const idRef = useRef<string | null>(tab.id)
  const cbs = useRef({ onId, onPhase })
  cbs.current = { onId, onPhase }

  useEffect(() => {
    const el = host.current
    if (!el) return
    const term = new XTerm({
      allowProposedApi: false,
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'ui-monospace, Menlo, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      letterSpacing: 0,
      scrollback: 5000,
      macOptionIsMeta: true,
      theme: readTheme(el),
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon((_e, uri) => window.open(uri, '_blank', 'noopener,noreferrer')))
    term.open(el)
    termRef.current = term
    fitRef.current = fit
    try {
      fit.fit()
    } catch {
      /* not laid out yet */
    }

    let dead = false
    let from = 0
    let ctl: AbortController | null = null
    let queue = ''
    let sending: Promise<void> = Promise.resolve()
    let flushTimer: ReturnType<typeof setTimeout> | null = null
    let sentSize = { cols: term.cols, rows: term.rows }

    const flush = () => {
      flushTimer = null
      const data = queue
      queue = ''
      const id = idRef.current
      if (!data || !id) return
      // Keystrokes go out in order, a few milliseconds' worth at a time.
      sending = sending.then(() => hiveApi.termInput(machineId, id, data).then(() => undefined, () => undefined))
    }
    const input = (d: string) => {
      queue += d
      if (!flushTimer) flushTimer = setTimeout(flush, 6)
    }
    const typing = term.onData(input)

    const open = async () => {
      if (idRef.current) return idRef.current
      const r = await hiveApi.termOpen(machineId, { folder, cols: term.cols, rows: term.rows })
      idRef.current = r.terminal.id
      sentSize = { cols: r.terminal.cols, rows: r.terminal.rows }
      cbs.current.onId(r.terminal.id)
      if (!r.terminal.resizable) term.writeln('\x1b[2m(This machine has no Python 3, so the terminal keeps a fixed size.)\x1b[0m')
      return r.terminal.id
    }

    const pump = async () => {
      let tries = 0
      while (!dead) {
        try {
          cbs.current.onPhase(tries ? 'reconnecting' : 'connecting')
          const id = await open()
          ctl = new AbortController()
          let ended = false
          await hiveApi.termStream(
            machineId,
            id,
            from,
            (ev) => {
              if (ev.type === 'ready') {
                tries = 0
                cbs.current.onPhase('live')
              } else if (ev.type === 'data' && ev.data != null) {
                if (ev.skipped && from > 0) term.writeln('\r\n\x1b[2m… older output was trimmed …\x1b[0m')
                term.write(ev.data)
                from = ev.next ?? from + ev.data.length
              } else if (ev.type === 'reconnecting') cbs.current.onPhase('reconnecting')
              else if (ev.type === 'exit') {
                ended = true
                term.writeln(`\r\n\x1b[2m[${ev.gone ? 'This shell was closed' : `Shell exited${ev.code != null ? ` with code ${ev.code}` : ''}`} — press Restart for a new one]\x1b[0m`)
              } else if (ev.type === 'error') throw new Error(ev.error || 'Lost the machine')
            },
            ctl.signal,
          )
          if (ended) {
            cbs.current.onPhase('ended')
            return
          }
          // The stream closed without an exit (deploy, network): pick up where it stopped.
          tries++
        } catch (e) {
          if (dead) return
          const status = (e as { status?: number }).status
          if (status === 404 && idRef.current) {
            // Hive restarted and forgot this shell: start a new one.
            idRef.current = null
            from = 0
            term.writeln('\r\n\x1b[2m[The previous shell is gone — starting a new one]\x1b[0m\r\n')
            continue
          }
          tries++
          if (tries > 6 || status === 403 || status === 409) {
            cbs.current.onPhase('error')
            term.writeln(`\r\n\x1b[31m${(e as Error).message || 'Could not start the terminal'}\x1b[0m`)
            return
          }
          cbs.current.onPhase('reconnecting')
        }
        await new Promise((r) => setTimeout(r, Math.min(8000, 500 * 2 ** tries)))
      }
    }
    pump()

    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (!el.offsetWidth || !el.offsetHeight) return
        try {
          fit.fit()
        } catch {
          return
        }
        const id = idRef.current
        if (id && (term.cols !== sentSize.cols || term.rows !== sentSize.rows)) {
          sentSize = { cols: term.cols, rows: term.rows }
          hiveApi.termResize(machineId, id, term.cols, term.rows).catch(() => {})
        }
      }, 90)
    })
    ro.observe(el)

    // Follow the app's light/dark theme and palette.
    const mo = new MutationObserver(() => {
      term.options.theme = readTheme(el)
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => (term.options.theme = readTheme(el))
    mq.addEventListener('change', onScheme)

    const unregister = register(input, () => term.clear())
    return () => {
      dead = true
      ctl?.abort()
      if (flushTimer) {
        clearTimeout(flushTimer)
        flush()
      }
      typing.dispose()
      ro.disconnect()
      mo.disconnect()
      mq.removeEventListener('change', onScheme)
      unregister()
      term.dispose()
      termRef.current = null
    }
    // One terminal per tab for its whole life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => {
      try {
        fitRef.current?.fit()
      } catch {
        /* hidden */
      }
      termRef.current?.focus()
    }, 30)
    return () => clearTimeout(t)
  }, [visible])

  // Hidden tabs stay laid out (xterm can't measure display:none), just invisible.
  return <div ref={host} role="tabpanel" aria-label={tab.title} className={cn('hv-term-host absolute inset-0', !visible && 'invisible')} />
}
