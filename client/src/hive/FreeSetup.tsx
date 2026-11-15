/* ────────────────────────────────────────────────────────────────────────
   Free models — every free source on one screen. Get a key, paste it, done:
   no dialogs. Sources that need no sign-up are added in one click. The more
   free sources are connected, the more of the work runs at no cost.
   ──────────────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ExternalLink, Loader2, Sparkles, Zap } from 'lucide-react'
import { useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { errMsg } from './Improve'
import { useHive } from './store'
import type { FreeSource } from './types'
import { LimitBar, vendorStyle } from './ui'

const NO_SIGNUP = ['pollinations', 'llm7', 'ovh']

export function FreeSetup() {
  const { boot, refresh } = useHive()
  const toast = useToast()
  const [sources, setSources] = useState<FreeSource[] | null>(null)
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  useEffect(() => {
    hiveApi
      .catalog()
      .then((r) => setSources([...r.freeSources].sort((a, b) => b.score - a.score)))
      .catch(() => setSources([]))
  }, [])
  const connected = useMemo(() => new Set([...(boot?.keys ?? []).filter((k) => !k.disabled).map((k) => k.provider), ...added]), [boot, added])
  const providers = boot?.catalogue.providers ?? []
  const needsUrl = (v: string) => !!providers.find((p) => p.id === v)?.baseUrlRequired
  if (!sources) return <div className="hive-shimmer h-40 rounded-2xl" />
  const list = sources.filter((s) => s.vendor !== 'ollama')
  const done = list.filter((s) => connected.has(s.vendor)).length
  const instant = NO_SIGNUP.filter((v) => !connected.has(v) && providers.some((p) => p.id === v))

  const add = async (vendor: string, apiKey: string, name: string) => {
    setBusy(vendor)
    try {
      const r = await hiveApi.addKey({ provider: vendor, label: `${name} (free)`, apiKey, freeTier: true })
      setAdded((s) => new Set([...s, vendor]))
      if (r.check && !r.check.ok) toast.error(`${name} was added, but its first check failed: ${r.check.error ?? 'unknown error'}`)
      else toast.success(`${name} connected — its free models are now used for easy work`)
      setKeys((k) => ({ ...k, [vendor]: '' }))
      refresh().catch(() => {})
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(null)
    }
  }
  const addInstant = async () => {
    for (const v of instant) {
      const s = list.find((x) => x.vendor === v)
      await add(v, 'free', s?.name ?? vendorStyle(v).name)
    }
  }

  return (
    <section className="hive-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 border-b hive-line p-4 sm:p-5">
        <div className="relative grid size-14 place-items-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="color-mix(in oklab, var(--color-text-primary) 9%, transparent)" strokeWidth="3.5" />
            <motion.circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-state-success)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={94.2} animate={{ strokeDashoffset: 94.2 * (1 - done / Math.max(1, list.length)) }} />
          </svg>
          <span className="text-[13px] font-semibold tabular-nums">
            {done}/{list.length}
          </span>
        </div>
        <div className="min-w-[200px] flex-1">
          <h2 className="text-[16px] font-semibold tracking-tight">Free models</h2>
          <p className="text-[12.5px] text-text-muted">Every source here has a free tier. Connect as many as you can — Hive spreads easy work across them and saves paid models for hard work.</p>
        </div>
        {instant.length > 0 && (
          <button type="button" onClick={addInstant} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--hv-r-btn)] border border-[var(--hv-border-strong)] bg-[var(--hv-surface-2)] px-3.5 text-[13px] font-medium text-[var(--hv-text-1)] transition-colors hover:bg-[var(--hv-surface-3)] disabled:opacity-60">
            {busy && instant.includes(busy) ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Add {instant.length} that need no sign-up
          </button>
        )}
      </div>
      <ul className="divide-y divide-[var(--hive-line)]">
        {list.map((s) => {
          const on = connected.has(s.vendor)
          const st = vendorStyle(s.vendor)
          const keyless = NO_SIGNUP.includes(s.vendor)
          return (
            <li key={s.vendor} className={cn('flex flex-col gap-3 p-4 sm:flex-row sm:items-center', on && 'bg-state-success/[0.03]')}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl text-[12px] font-bold" style={{ color: 'var(--hv-text-2)', background: 'var(--hv-surface-2)', boxShadow: 'inset 0 0 0 1px var(--hv-border)' }}>
                  {st.mark}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold">{s.name}</span>
                    {keyless && <span className="rounded-full bg-state-success/12 px-1.5 text-[10.5px] font-medium text-state-success">no sign-up</span>}
                  </div>
                  <div className="text-[12.5px] text-text-secondary">{s.free}</div>
                  <div className="mt-0.5 text-[11.5px] text-text-muted">
                    {s.models.slice(0, 4).join(' · ')} — {s.limits}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:w-[340px] sm:justify-end">
                {on ? (
                  <div className="flex w-full items-center gap-3">
                    {(() => {
                      const key = (boot?.keys ?? []).find((x) => x.provider === s.vendor && !x.disabled)
                      return key ? (
                        <div className="min-w-0 flex-1">
                          <LimitBar k={key} compact />
                        </div>
                      ) : null
                    })()}
                    <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-state-success/12 px-2.5 text-[12px] font-medium text-state-success">
                      <Check className="size-3.5" /> Connected
                    </span>
                  </div>
                ) : needsUrl(s.vendor) ? (
                  <Link to={`/hive/keys?add=${s.vendor}`} className="inline-flex h-8 items-center gap-1 rounded-lg bg-text-primary/[0.06] px-2.5 text-[12px] font-medium hover:bg-text-primary/[0.1]">
                    Set up →
                  </Link>
                ) : keyless ? (
                  <button type="button" onClick={() => add(s.vendor, 'free', s.name)} disabled={!!busy} className="inline-flex h-8 items-center gap-1 rounded-lg bg-accent-brand px-3 text-[12px] font-medium text-on-accent-brand disabled:opacity-60">
                    {busy === s.vendor ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} Add
                  </button>
                ) : (
                  <form
                    className="flex w-full items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (keys[s.vendor]?.trim()) add(s.vendor, keys[s.vendor].trim(), s.name)
                    }}
                  >
                    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-text-primary/[0.06] px-2.5 text-[12px] font-medium hover:bg-text-primary/[0.1]" title={s.how}>
                      Get key <ExternalLink className="size-3" />
                    </a>
                    <input
                      type="password"
                      value={keys[s.vendor] ?? ''}
                      onChange={(e) => setKeys((k) => ({ ...k, [s.vendor]: e.target.value }))}
                      placeholder="Paste key"
                      autoComplete="new-password" data-1p-ignore="" data-lpignore="true" data-bwignore=""
                      className="h-8 min-w-0 flex-1 rounded-lg border hive-line bg-bg-surface px-2.5 text-[12.5px] outline-none focus:border-accent-brand/50"
                      aria-label={`${s.name} API key`}
                    />
                    <button type="submit" disabled={!keys[s.vendor]?.trim() || !!busy} className="inline-flex h-8 shrink-0 items-center rounded-lg bg-accent-brand px-3 text-[12px] font-medium text-on-accent-brand disabled:opacity-40">
                      {busy === s.vendor ? <Loader2 className="size-3.5 animate-spin" /> : 'Add'}
                    </button>
                  </form>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
