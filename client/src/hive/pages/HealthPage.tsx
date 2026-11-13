/* ────────────────────────────────────────────────────────────────────────
   Agent health — every connected agent at a glance: working, flaky, cooling
   down after errors, or down (bad key, no credit). Hive routes around anything
   that isn't healthy automatically, so work keeps going; this page shows why,
   for how long, and lets you test everything with one click.
   ──────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ChevronDown, CircleCheck, CircleOff, Clock, EyeOff, FlaskConical, HeartPulse, KeyRound, Loader2, PauseCircle, RefreshCw, Snowflake, Sparkles, TriangleAlert, Zap } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { AgentMark } from '../agents'
import { hiveApi } from '../api'
import { errMsg } from '../Improve'
import { useHive } from '../store'
import type { HealthKey, HealthState } from '../types'
import { PageTitle, timeAgo } from '../ui'

const EASE = [0.2, 0.8, 0.2, 1] as const
export const HEALTH: Record<HealthState, { label: string; tone: string; icon: typeof CircleCheck; hint: string }> = {
  healthy: { label: 'Working', tone: 'var(--color-state-success)', icon: CircleCheck, hint: 'Answering normally' },
  flaky: { label: 'Flaky', tone: 'var(--color-state-warning)', icon: TriangleAlert, hint: 'Failed recently but still in use' },
  cooling: { label: 'Cooling down', tone: 'oklch(70% 0.12 230)', icon: Snowflake, hint: 'Skipped until the cool-down ends — other agents take its work' },
  down: { label: 'Down', tone: 'var(--color-state-error)', icon: CircleOff, hint: 'Key rejected or out of credit — fix it in Keys' },
  paused: { label: 'Paused', tone: 'var(--color-text-muted)', icon: PauseCircle, hint: 'Paused by staff' },
  unknown: { label: 'Not tested yet', tone: 'var(--color-text-muted)', icon: Clock, hint: 'No calls yet — test it' },
}
const ORDER: HealthState[] = ['down', 'cooling', 'flaky', 'unknown', 'healthy', 'paused']

function useNow(ms = 1000) {
  const [t, setT] = useState(() => Date.now())
  useEffect(() => {
    const i = setInterval(() => setT(Date.now()), ms)
    return () => clearInterval(i)
  }, [ms])
  return t
}

const left = (until: number | null, t: number) => {
  if (!until) return null
  const s = Math.max(0, Math.round((until - t) / 1000))
  if (s >= 3600) return `${Math.round(s / 3600)}h`
  if (s >= 60) return `${Math.round(s / 60)}m`
  return `${s}s`
}

export default function HealthPage() {
  const toast = useToast()
  const { on } = useHive()
  const [keys, setKeys] = useState<HealthKey[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'problems' | 'free'>('all')
  const t = useNow()

  const load = useCallback(async () => {
    try {
      setKeys((await hiveApi.health()).keys)
    } catch (e) {
      toast.error(errMsg(e))
    }
  }, [toast])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => on('health', load), [on, load])
  useEffect(() => on('keys', load), [on, load])

  const testAll = async (includePaid: boolean) => {
    setBusy(includePaid ? 'all' : 'free')
    try {
      const r = await hiveApi.probeHealth({ includePaid })
      setKeys(r.keys)
      const bad = r.results.filter((x) => !x.ok).length
      if (bad) toast.error(`${r.results.length - bad} working, ${bad} failing — failing ones are routed around`)
      else toast.success(`All ${r.results.length} tested agents answered`)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(null)
    }
  }
  const testOne = async (keyId: string) => {
    setBusy(keyId)
    try {
      const r = await hiveApi.probeHealth({ keyId })
      setKeys(r.keys)
      const res = r.results[0]
      if (res?.ok) toast.success(`Answered in ${res.latencyMs ?? '?'} ms`)
      else toast.error(res?.error ?? 'Failed')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(null)
    }
  }

  const verify = async (keyId?: string, retest = false) => {
    setBusy(keyId ? `v:${keyId}` : 'verify')
    try {
      const r = await hiveApi.verifyModels({ keyId, retest })
      setKeys(r.keys)
      toast.success(keyId ? 'Testing every model on this key — the ones that fail are removed as it goes' : 'Testing every model on every free key — this takes a minute or two. Failing models are removed.')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(null)
    }
  }
  const hide = async (keyId: string, model: string) => {
    try {
      await hiveApi.hideModel(keyId, model)
      toast.success(`${model} won't be offered or used again`)
      load()
    } catch (e) {
      toast.error(errMsg(e))
    }
  }
  const anyVerifying = (keys ?? []).some((k) => k.verifying)
  useEffect(() => {
    if (!anyVerifying) return
    const i = setInterval(load, 2500)
    return () => clearInterval(i)
  }, [anyVerifying, load])
  const modelTotals = useMemo(() => {
    let ok = 0
    let failed = 0
    let tested = 0
    for (const k of keys ?? [])
      if (k.verified) {
        tested++
        ok += k.verified.ok.length
        failed += k.verified.failed.length
      }
    return { ok, failed, tested }
  }, [keys])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const k of keys ?? []) c[k.state] = (c[k.state] ?? 0) + 1
    return c
  }, [keys])
  const shown = (keys ?? [])
    .filter((k) => (filter === 'problems' ? ['down', 'cooling', 'flaky'].includes(k.state) : filter === 'free' ? k.free || k.subscription : true))
    .sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state) || a.label.localeCompare(b.label))
  const working = (counts.healthy ?? 0) + (counts.flaky ?? 0)
  const total = keys?.length ?? 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageTitle
        title={
          <span className="inline-flex items-center gap-2.5">
            <HeartPulse className="size-6 text-state-success" /> Agent health
          </span>
        }
        sub="Hive skips any agent that's failing and gives its work to the next best one — so work never stops. Here's who's working right now."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => verify()} loading={busy === 'verify' || anyVerifying}>
            {busy !== 'verify' && !anyVerifying && <FlaskConical />} {anyVerifying ? 'Testing models…' : 'Test every model'}
          </Button>
          <Button variant="secondary" onClick={() => testAll(false)} loading={busy === 'free'}>
            {busy !== 'free' && <Sparkles />} Test free agents
          </Button>
          <Button variant="secondary" onClick={() => testAll(true)} loading={busy === 'all'}>
            {busy !== 'all' && <Zap />} Test paid too
          </Button>
        </div>
      </PageTitle>

      {/* Pulse */}
      <section className="hive-card relative mb-6 overflow-hidden p-5">
        <div className="pointer-events-none absolute -left-16 -top-20 size-64 rounded-full opacity-[0.15] blur-3xl" style={{ background: 'oklch(72% 0.15 155)' }} />
        <div className="relative flex flex-wrap items-center gap-6">
          <Pulse ratio={total ? working / total : 0} />
          <div className="min-w-[200px] flex-1">
            <div className="text-[13px] text-text-muted">Working right now</div>
            <div className="text-[30px] font-semibold tabular-nums tracking-tight">
              {working}
              <span className="text-[18px] text-text-muted">/{total}</span>
            </div>
            <div className="text-[12.5px] text-text-muted">Free and plan agents are tested every 4 hours; every real call also updates this.</div>
            {modelTotals.tested > 0 && (
              <div className="mt-2 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-text-primary/[0.04] px-3 py-1.5 text-[12.5px]">
                <span className="font-medium text-state-success">{modelTotals.ok} models work</span>
                <span className="text-text-muted" title="Only working models are offered and used">{modelTotals.failed} removed</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(['healthy', 'cooling', 'down', 'unknown'] as const).map((s) => {
              const H = HEALTH[s]
              return (
                <div key={s} className="rounded-2xl bg-text-primary/[0.035] px-3 py-2" title={H.hint}>
                  <div className="flex items-center gap-1.5 text-[11.5px] text-text-muted">
                    <H.icon className="size-3.5" style={{ color: H.tone }} /> {H.label}
                  </div>
                  <div className="text-[20px] font-semibold tabular-nums">{counts[s] ?? 0}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <div className="mb-4 flex gap-1 rounded-xl bg-text-primary/[0.05] p-1 sm:w-fit">
        {(
          [
            ['all', 'All agents'],
            ['problems', `Problems${(counts.down ?? 0) + (counts.cooling ?? 0) + (counts.flaky ?? 0) ? ` · ${(counts.down ?? 0) + (counts.cooling ?? 0) + (counts.flaky ?? 0)}` : ''}`],
            ['free', 'Free & plan'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={cn('h-8 flex-1 rounded-lg px-3 text-[12.5px] sm:flex-none', filter === k ? 'bg-bg-surface font-medium text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary')}>
            {l}
          </button>
        ))}
      </div>

      {!keys ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="hive-shimmer h-28 rounded-2xl" />
          ))}
        </div>
      ) : !keys.length ? (
        <div className="hive-card grid place-items-center gap-2 p-10 text-center">
          <KeyRound className="size-6 text-text-muted" />
          <div className="text-[14px] font-medium">No agents connected yet</div>
          <Link to="/hive/models?tab=free" className="text-[13px] text-accent-brand">
            Add free models →
          </Link>
        </div>
      ) : (
        <motion.div layout className="grid gap-3 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {shown.map((k, i) => (
              <KeyCard key={k.keyId} k={k} t={t} i={i} busy={busy === k.keyId} onTest={() => testOne(k.keyId)} verifying={busy === `v:${k.keyId}`} onVerify={(retest) => verify(k.keyId, retest)} onHide={(m) => hide(k.keyId, m)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

function Pulse({ ratio }: { ratio: number }) {
  const tone = ratio > 0.8 ? 'var(--color-state-success)' : ratio > 0.5 ? 'var(--color-state-warning)' : 'var(--color-state-error)'
  return (
    <div className="relative grid size-24 place-items-center">
      <span className="absolute inset-0 animate-ping rounded-full opacity-20" style={{ background: tone, animationDuration: '2.4s' }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" stroke="color-mix(in oklab, var(--color-text-primary) 8%, transparent)" strokeWidth="8" />
        <motion.circle cx="50" cy="50" r="44" fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round" strokeDasharray={276.5} initial={{ strokeDashoffset: 276.5 }} animate={{ strokeDashoffset: 276.5 * (1 - ratio) }} transition={{ duration: 0.8, ease: EASE }} />
      </svg>
      <Activity className="relative size-7" style={{ color: tone }} />
    </div>
  )
}

function KeyCard({ k, t, i, busy, onTest, verifying, onVerify, onHide }: { k: HealthKey; t: number; i: number; busy: boolean; onTest: () => void; verifying: boolean; onVerify: (retest: boolean) => void; onHide: (model: string) => void }) {
  const [showFailed, setShowFailed] = useState(false)
  const v = k.verified
  const running = k.verifying
  const [open, setOpen] = useState(k.state !== 'healthy')
  const H = HEALTH[k.state]
  const cd = left(k.cooldownUntil, t)
  const best = k.models.find((m) => m.model === k.defaultModel) ?? k.models[0]
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.025, duration: 0.22, ease: EASE } }} exit={{ opacity: 0 }} className="hive-card overflow-hidden" style={{ boxShadow: `inset 3px 0 0 ${H.tone}` }}>
      <div className="flex items-center gap-3 p-3.5">
        <div className="relative">
          <AgentMark provider={k.vendor} model={k.defaultModel} size={36} />
          <span className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-bg-surface', k.state === 'healthy' && 'hive-dot-run')} style={{ background: H.tone }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-semibold">{k.label}</span>
            {k.free && <span className="rounded-full bg-state-success/12 px-1.5 text-[10.5px] font-medium text-state-success">free</span>}
            {k.subscription && <span className="rounded-full bg-accent-brand/12 px-1.5 text-[10.5px] font-medium text-accent-brand">plan</span>}
          </div>
          <div className="truncate text-[12px] text-text-muted">
            {k.vendorLabel} · {k.defaultModel ?? 'no model'}
          </div>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: H.tone }} title={H.hint}>
            <H.icon className="size-3.5" /> {H.label}
            {cd && <span className="tabular-nums text-text-muted"> · {cd}</span>}
          </div>
          <div className="text-[11px] tabular-nums text-text-muted">
            {best?.latencyMs != null ? `${best.latencyMs} ms` : ''}
            {best?.successRate != null ? ` · ${Math.round(best.successRate * 100)}% ok` : ''}
          </div>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onTest} loading={busy} aria-label={`Test ${k.label}`}>
          {!busy && <RefreshCw />}
        </Button>
        {k.models.length > 0 && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="grid size-7 place-items-center rounded-md text-text-muted hover:bg-text-primary/[0.06]" aria-label="Details" aria-expanded={open}>
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {k.detail && <div className="mx-3.5 mb-3 rounded-xl bg-state-error/[0.06] px-3 py-2 text-[12px] text-text-secondary">{k.detail}</div>}
      {!k.subscription && (
        <div className="mx-3.5 mb-3 rounded-xl bg-text-primary/[0.035] px-3 py-2 text-[12px]">
          {running ? (
            <div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Loader2 className="size-3.5 animate-spin" /> Testing its models… {running.done}/{running.total}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-text-primary/[0.07]">
                <motion.div className="h-full rounded-full bg-state-success" animate={{ width: `${running.total ? (running.done / running.total) * 100 : 0}%` }} />
              </div>
            </div>
          ) : v ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-state-success">{v.ok.length} working</span>
              {v.failed.length > 0 && (
                <button type="button" onClick={() => setShowFailed((x) => !x)} className="text-text-muted underline-offset-2 hover:underline">
                  {v.failed.length} removed
                </button>
              )}
              {v.untested > 0 && <span className="text-text-muted" title={v.stoppedBy ? `Stopped early: the provider said ${v.stoppedBy === 'rate' ? 'slow down' : v.stoppedBy}` : 'Only the strongest models are tested; the rest stay hidden'}>{v.untested} hidden, not tested</span>}
              <span className="text-text-muted">· tested {timeAgo(v.at)}</span>
              <span className="ml-auto flex gap-1">
                <button type="button" disabled={verifying} onClick={() => onVerify(false)} className="rounded-md px-2 py-0.5 text-accent-brand hover:bg-accent-brand/10">
                  Test again
                </button>
                {v.failed.length > 0 && (
                  <button type="button" disabled={verifying} onClick={() => onVerify(true)} className="rounded-md px-2 py-0.5 text-text-muted hover:bg-text-primary/[0.06]" title="Removed models get another chance">
                    Retry removed
                  </button>
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Its models haven’t been tested yet.</span>
              <button type="button" disabled={verifying} onClick={() => onVerify(false)} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-accent-brand hover:bg-accent-brand/10">
                {verifying ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />} Test every model
              </button>
            </div>
          )}
          {showFailed && v && v.failed.length > 0 && (
            <ul className="hive-scroll mt-2 max-h-40 space-y-1 overflow-y-auto border-t hive-line pt-2">
              {v.failed.map((f) => (
                <li key={f.model} className="flex gap-2 text-[11.5px]">
                  <CircleOff className="mt-0.5 size-3 shrink-0 text-state-error" />
                  <span className="min-w-0">
                    <span className="font-mono">{f.model}</span> <span className="text-text-muted">— {f.error}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && k.models.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t hive-line">
            <div className="space-y-1.5 p-3">
              {k.models.filter((m) => !v?.failed.some((f) => f.model === m.model)).slice(0, 8).map((m) => {
                const MH = HEALTH[m.state]
                const rate = m.successRate ?? 0
                return (
                  <div key={m.model} className="flex items-center gap-2.5 text-[12px]">
                    <MH.icon className="size-3.5 shrink-0" style={{ color: MH.tone }} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[11.5px]">{m.model}</span>
                    <span className="hidden w-24 sm:block">
                      <span className="block h-1.5 overflow-hidden rounded-full bg-text-primary/[0.07]">
                        <span className="block h-full rounded-full" style={{ width: `${Math.round(rate * 100)}%`, background: rate > 0.9 ? 'var(--color-state-success)' : rate > 0.6 ? 'var(--color-state-warning)' : 'var(--color-state-error)' }} />
                      </span>
                    </span>
                    <span className="w-24 text-right tabular-nums text-text-muted">
                      {m.ok}✓ {m.fail}✕{m.latencyMs != null ? ` · ${m.latencyMs}ms` : ''}
                    </span>
                    <span className="hidden w-20 text-right text-text-muted sm:inline">{m.lastFail && (!m.lastOk || m.lastFail > m.lastOk) ? `failed ${timeAgo(m.lastFail)}` : m.lastOk ? timeAgo(m.lastOk) : ''}</span>
                    {!k.subscription && (
                      <button type="button" onClick={() => onHide(m.model)} className="grid size-6 shrink-0 place-items-center rounded-md text-text-muted hover:bg-state-error/10 hover:text-state-error" title="Never offer or use this model" aria-label={`Hide ${m.model}`}>
                        <EyeOff className="size-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
              {k.models.find((m) => m.lastError && m.state !== 'healthy') && <div className="mt-1 rounded-lg bg-text-primary/[0.04] px-2.5 py-1.5 text-[11.5px] text-text-muted">Last error: {k.models.find((m) => m.lastError && m.state !== 'healthy')!.lastError}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
