import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Eye, Languages, Loader2, ScanSearch, Search, Sparkles, Zap } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger, Tooltip } from '@/components/ui'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export interface LangInfo {
  code: string
  name: string
  native: string
  group: 'indian' | 'world'
}
interface Detected extends LangInfo {
  confidence: number
  method: string
}

const FALLBACK: LangInfo[] = [
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', group: 'indian' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', group: 'indian' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', group: 'indian' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', group: 'indian' },
  { code: 'en', name: 'English', native: 'English', group: 'world' },
]

const store = {
  get: (k: string, d = '') => {
    try {
      return localStorage.getItem(k) ?? d
    } catch {
      return d
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* ignore */
    }
  },
}

/**
 * Statement translation: detects the source language (script analysis →
 * Google → AI), translates into 40 languages incl. 20 Indian ones with a fast
 * engine or a context-aware AI engine, and can auto-translate every problem.
 */
export function TranslateBar({
  html,
  onResult,
}: {
  html: string
  onResult: (r: { lang: string; html: string; engine: string } | null) => void
}) {
  const [langs, setLangs] = useState<LangInfo[]>(FALLBACK)
  const [detected, setDetected] = useState<Detected | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [target, setTarget] = useState(() => store.get('nexora:translate:lang'))
  const [engine, setEngine] = useState<'auto' | 'ai'>(() => (store.get('nexora:translate:engine') === 'ai' ? 'ai' : 'auto'))
  const [auto, setAuto] = useState(() => store.get('nexora:translate:auto') === '1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showing, setShowing] = useState<{ lang: string; engine: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const reqId = useRef(0)

  useEffect(() => {
    api
      .get<{ languages: LangInfo[] }>('/api/translate/languages')
      .then((r) => r.languages?.length && setLangs(r.languages))
      .catch(() => {})
  }, [])

  // Detect the statement's language whenever the statement changes.
  useEffect(() => {
    if (!html) return
    let alive = true
    setDetecting(true)
    setDetected(null)
    setShowing(null)
    onResult(null)
    api
      .post<{ detected: Detected }>('/api/translate/detect', { html: html.slice(0, 8000) })
      .then((r) => alive && setDetected(r.detected))
      .catch(() => {})
      .finally(() => alive && setDetecting(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html])

  const run = async (lang: string, eng = engine) => {
    setError(null)
    if (!lang) {
      setShowing(null)
      onResult(null)
      return
    }
    const id = ++reqId.current
    setBusy(true)
    try {
      const res = await api.post<{ translated: string; engine: string; sameLanguage?: boolean; detected?: Detected }>(
        '/api/translate',
        { html, targetLang: lang, engine: eng, sourceLang: detected?.code },
        { timeoutMs: 120000 },
      )
      if (id !== reqId.current) return
      if (res.sameLanguage) {
        setShowing(null)
        onResult(null)
        setError(`Already in ${langs.find((l) => l.code === lang)?.name ?? lang}`)
        return
      }
      setShowing({ lang, engine: res.engine })
      onResult({ lang, html: res.translated, engine: res.engine })
    } catch (err) {
      if (id === reqId.current) setError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      if (id === reqId.current) setBusy(false)
    }
  }

  // Auto-translate into the preferred language when the statement is in another one.
  useEffect(() => {
    if (!auto || !target || !detected) return
    if (detected.code.split('-')[0] === target.split('-')[0]) return
    void run(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detected, auto])

  const pick = (code: string) => {
    setTarget(code)
    store.set('nexora:translate:lang', code)
    setOpen(false)
    setQ('')
    void run(code)
  }

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    const m = (l: LangInfo) => !query || l.name.toLowerCase().includes(query) || l.native.toLowerCase().includes(query) || l.code.toLowerCase().startsWith(query)
    return {
      indian: langs.filter((l) => l.group === 'indian' && m(l)),
      world: langs.filter((l) => l.group === 'world' && m(l)),
    }
  }, [langs, q])

  const targetInfo = langs.find((l) => l.code === target)

  return (
    <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-2">
      <div className="flex flex-wrap items-center gap-2">
        <Languages className="ml-1 size-4 shrink-0 text-primary-bright" aria-hidden="true" />

        {/* detected language */}
        <Tooltip label={detected ? `Detected by ${detected.method} · ${Math.round(detected.confidence * 100)}% sure` : 'Detecting language…'}>
          <span className="flex h-7 items-center gap-1.5 rounded-md border border-white/[0.06] bg-black/20 px-2 text-[11px] text-foreground-dim">
            {detecting ? <Loader2 className="size-3 animate-spin" /> : <ScanSearch className="size-3 text-cyan" />}
            {detected ? (
              <>
                <span className="text-foreground">{detected.name}</span>
                {detected.native !== detected.name && <span className="text-foreground-faint">{detected.native}</span>}
                <span className="font-mono text-[10px] text-foreground-faint tabular-nums">{Math.round(detected.confidence * 100)}%</span>
              </>
            ) : (
              <span>detecting…</span>
            )}
          </span>
        </Tooltip>

        <span className="text-foreground-faint">→</span>

        {/* target picker */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex h-7 min-w-36 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 text-[12px] text-foreground transition-colors hover:border-border-strong data-[state=open]:border-primary/60"
              aria-label="Translate to"
            >
              <span className="flex-1 truncate text-left">{targetInfo ? `${targetInfo.native} · ${targetInfo.name}` : 'Translate to…'}</span>
              <ChevronsUpDown className="size-3 text-foreground-faint" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3">
              <Search className="size-3.5 text-foreground-faint" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search languages (e.g. Telugu, తెలుగు)…"
                className="h-10 w-full bg-transparent text-[13px] text-foreground placeholder:text-foreground-faint focus:outline-none"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {target && (
                <button onClick={() => pick('')} className="mb-1 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground-dim hover:bg-white/[0.05]">
                  <Eye className="size-3.5" /> Show original
                </button>
              )}
              {(['indian', 'world'] as const).map((g) =>
                groups[g].length ? (
                  <div key={g}>
                    <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-[0.12em] text-foreground-faint uppercase">
                      {g === 'indian' ? `Indian languages · ${groups[g].length}` : 'World languages'}
                    </p>
                    {groups[g].map((l) => (
                      <button
                        key={l.code}
                        onClick={() => pick(l.code)}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground-dim hover:bg-white/[0.05] hover:text-foreground"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          <span className="text-foreground">{l.native}</span> <span className="text-foreground-faint">· {l.name}</span>
                        </span>
                        {detected?.code === l.code && <span className="text-[10px] text-cyan">source</span>}
                        {target === l.code && <Check className="size-3.5 text-primary-bright" />}
                      </button>
                    ))}
                  </div>
                ) : null,
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* engine */}
        <div className="flex h-7 items-center rounded-md border border-white/[0.06] bg-black/20 p-0.5 text-[11px]" role="radiogroup" aria-label="Translation engine">
          {(
            [
              ['auto', 'Fast', <Zap key="z" className="size-3" />],
              ['ai', 'AI', <Sparkles key="s" className="size-3" />],
            ] as const
          ).map(([id, label, icon]) => (
            <Tooltip key={id} label={id === 'ai' ? 'Context-aware AI: keeps CS terms, formulas and sample data intact' : 'Google Translate (falls back to AI)'}>
              <button
                role="radio"
                aria-checked={engine === id}
                onClick={() => {
                  setEngine(id)
                  store.set('nexora:translate:engine', id)
                  if (target && showing) void run(target, id)
                }}
                className={cn(
                  'flex h-6 cursor-pointer items-center gap-1 rounded px-2 transition-colors',
                  engine === id ? 'bg-primary/20 text-primary-bright' : 'text-foreground-faint hover:text-foreground',
                )}
              >
                {icon}
                {label}
              </button>
            </Tooltip>
          ))}
        </div>

        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-foreground-faint select-none">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => {
              setAuto(e.target.checked)
              store.set('nexora:translate:auto', e.target.checked ? '1' : '0')
            }}
            className="accent-[var(--color-primary)]"
          />
          Auto-translate
        </label>
      </div>

      {(busy || showing || error) && (
        <div className="mt-2 flex items-center gap-2 px-1 text-[11px]">
          {busy && (
            <span className="flex items-center gap-1.5 text-foreground-dim">
              <Loader2 className="size-3 animate-spin text-primary-bright" /> Translating{engine === 'ai' ? ' with AI' : ''}…
            </span>
          )}
          {!busy && showing && (
            <span className="text-foreground-faint">
              Showing <span className="text-foreground">{langs.find((l) => l.code === showing.lang)?.name}</span> via{' '}
              {showing.engine === 'ai' ? 'AI' : 'Google'} · formulas and samples are unchanged
            </span>
          )}
          {error && <span className="text-[#f87171]">{error}</span>}
          {showing && !busy && (
            <button onClick={() => void run('')} className="ml-auto cursor-pointer text-primary-bright hover:underline">
              Show original
            </button>
          )}
        </div>
      )}
    </div>
  )
}
