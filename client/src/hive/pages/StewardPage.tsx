/* ────────────────────────────────────────────────────────────────────────
   Token Steward — the AI that spends your tokens wisely.
   Efficiency score, where the money goes (free · plan · $ · $$ · $$$),
   one-click savings, the token-saving plugins, “which model is enough for
   this?” and a Steward you can ask — answering from your real numbers and
   the open-source toolbox, using a free model when one is connected.
   ──────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Bot, Check, Coins, Gauge, Layers, PiggyBank, Plug, Scale, Send, Sparkles, TrendingDown, Zap } from 'lucide-react'
import { Button, Textarea, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { AgentMark, COST_INFO, CostBadge, ScoreRing } from '../agents'
import { hiveApi } from '../api'
import { ImproveButton, errMsg } from '../Improve'
import { useHive } from '../store'
import type { CostClass, StewardPlan, StewardReport, StewardTip } from '../types'
import { PageTitle, Toggle, fmtTokens } from '../ui'

const EASE = [0.2, 0.8, 0.2, 1] as const
const usd = (n: number | null | undefined) => (n == null ? '—' : n === 0 ? '$0' : n < 0.01 ? '<$0.01' : `$${n.toFixed(n < 10 ? 2 : 0)}`)
const tierColor = (t: CostClass) => `oklch(64% ${COST_INFO[t].chroma} ${COST_INFO[t].hue})`
const IMPACT = { high: { label: 'Big saving', tone: 'var(--color-state-success)' }, medium: { label: 'Worth it', tone: 'var(--color-state-info)' }, low: { label: 'Small win', tone: 'var(--color-text-muted)' } }
const QUESTIONS = ['Where is most of my money going, and what should I change first?', 'Which free models should I add for reading and summaries?', 'Should I run a local model or a gateway like LiteLLM?', 'How do I make long agent runs cheaper?']

export default function StewardPage() {
  const toast = useToast()
  const { on } = useHive()
  const [days, setDays] = useState(30)
  const [rep, setRep] = useState<StewardReport | null>(null)
  const load = useCallback(async () => {
    try {
      setRep(await hiveApi.steward(days))
    } catch (e) {
      toast.error(errMsg(e))
    }
  }, [days, toast])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => on('plugins', load), [on, load])
  useEffect(() => on('caps', load), [on, load])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageTitle icon={<PiggyBank />} title="Token Steward" sub="An AI that watches every token — folds long chats with free models, routes cheap-first, trims tool output, and shows exactly where to save.">
        <div className="flex gap-1 rounded-xl bg-text-primary/[0.05] p-1">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={cn('h-8 rounded-lg px-3 text-[12.5px] font-medium', days === d ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary')}>
              {d} days
            </button>
          ))}
        </div>
      </PageTitle>

      {!rep ? (
        <div className="space-y-4">
          <div className="hive-shimmer h-56 rounded-3xl" />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="hive-shimmer h-40 rounded-2xl" />
            <div className="hive-shimmer h-40 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          <Hero rep={rep} />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <Tips rep={rep} reload={load} />
            <div className="space-y-6">
              <Savers rep={rep} reload={load} />
              <TopModels rep={rep} />
            </div>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Planner />
            <AskSteward />
          </div>
        </>
      )}
    </div>
  )
}

/* ── Hero: score + where the money goes ──────────────────────────────── */
function Hero({ rep }: { rep: StewardReport }) {
  const t = rep.totals
  const tiers = (Object.keys(COST_INFO) as CostClass[]).map((k) => ({ k, v: rep.tiers[k] ?? 0 }))
  const sum = tiers.reduce((n, x) => n + x.v, 0)
  const verdict = rep.score >= 85 ? 'Lean and efficient' : rep.score >= 60 ? 'Good — a few easy savings left' : 'Money is leaking — start with the big savings below'
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, ease: EASE }} className="hive-card relative overflow-hidden p-5 sm:p-7">
      <div className="relative grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex items-center gap-5">
          <div className="relative">
            <ScoreRing value={rep.score} size={112} hue={rep.score >= 85 ? 155 : rep.score >= 60 ? 75 : 30} label="Efficiency score" />
            <PiggyBank className="absolute -bottom-1 -right-1 size-7 rounded-full bg-bg-surface p-1 text-state-success shadow" />
          </div>
          <div className="md:hidden">
            <div className="text-[12px] uppercase tracking-wider text-text-muted">Efficiency</div>
            <div className="text-[15px] font-semibold">{verdict}</div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="hidden md:block">
            <div className="text-[12px] font-medium uppercase tracking-wider text-text-muted">Efficiency score</div>
            <div className="text-[19px] font-semibold tracking-tight">{verdict}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi icon={Coins} label={`Spent · ${rep.days}d`} value={usd(t.dollars)} />
            <Kpi icon={TrendingDown} label="On track for" value={`${usd(t.monthly)}/mo`} />
            <Kpi icon={Sparkles} label="Free or on plan" value={`${Math.round(t.freeShare * 100)}%`} hint={`${fmtTokens(t.tokens)} tokens in total`} />
            <Kpi icon={Layers} label="Served from cache" value={`${Math.round(t.cacheShare * 100)}%`} hint={`${fmtTokens(t.cached)} cached input tokens`} />
          </div>
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-text-muted">
              <span>Where the money goes</span>
              <span className="tabular-nums">{usd(sum)}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-text-primary/[0.06]">
              {sum > 0 &&
                tiers.map((x, i) =>
                  x.v > 0 ? (
                    <motion.span key={x.k} title={`${COST_INFO[x.k].label}: ${usd(x.v)} (${Math.round((x.v / sum) * 100)}%)`} initial={{ width: 0 }} animate={{ width: `${(x.v / sum) * 100}%` }} transition={{ duration: 0.6, ease: EASE, delay: 0.05 * i }} className="h-full" style={{ background: tierColor(x.k) }} />
                  ) : null,
                )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-text-muted">
              {tiers.map((x) => (
                <span key={x.k} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: tierColor(x.k) }} />
                  {COST_INFO[x.k].label} <span className="tabular-nums text-text-secondary">{usd(x.v)}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof Coins; label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-text-primary/[0.035] p-3" title={hint}>
      <div className="flex items-center gap-1.5 truncate text-[11.5px] text-text-muted">
        <Icon className="size-3.5 shrink-0" /> {label}
      </div>
      <div className="mt-1 text-[20px] font-semibold tabular-nums tracking-tight text-text-primary">{value}</div>
    </div>
  )
}

/* ── Savings ─────────────────────────────────────────────────────────── */
function Tips({ rep, reload }: { rep: StewardReport; reload: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const apply = async (t: StewardTip) => {
    if (!t.action) return
    setBusy(t.id)
    try {
      const r = await hiveApi.stewardApply(t.action)
      toast.success(r.message)
      reload()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(null)
    }
  }
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-medium text-text-secondary">
        <TrendingDown className="size-4 text-state-success" /> Savings to make {rep.tips.length > 0 && <span className="rounded-full bg-text-primary/[0.06] px-1.5 text-[11px] tabular-nums">{rep.tips.length}</span>}
      </h2>
      {!rep.tips.length ? (
        <div className="hive-card grid place-items-center gap-2 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-state-success/12">
            <Check className="size-6 text-state-success" />
          </span>
          <div className="text-[15px] font-semibold">Nothing to fix</div>
          <p className="max-w-xs text-[13px] text-text-muted">Every token saver is on and spend looks healthy. The Steward keeps watching.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rep.tips.map((t, i) => (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03, duration: 0.22, ease: EASE } }} exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }} className="hive-card flex gap-3 p-4">
                <span className="mt-1 h-auto w-1 shrink-0 rounded-full" style={{ background: IMPACT[t.impact].tone }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-text-primary">{t.title}</h3>
                    <span className="rounded-full px-2 py-0.5 text-[10.5px] font-medium" style={{ color: IMPACT[t.impact].tone, background: `color-mix(in oklab, ${IMPACT[t.impact].tone} 12%, transparent)` }}>
                      {IMPACT[t.impact].label}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">{t.detail}</p>
                </div>
                <div className="flex shrink-0 items-start">
                  {t.action?.type === 'plugin' || t.action?.type === 'cap' ? (
                    <Button size="sm" onClick={() => apply(t)} loading={busy === t.id}>
                      <Zap /> {t.action.type === 'cap' ? `Cap at $${t.action.suggest}` : 'Apply'}
                    </Button>
                  ) : t.action?.type === 'connect' ? (
                    <Link to={`/hive/keys?add=${t.action.vendors[0]}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-text-primary/[0.06] px-3 text-[12.5px] font-medium hover:bg-text-primary/[0.1]">
                      Connect <ArrowRight className="size-3.5" />
                    </Link>
                  ) : t.action?.type === 'open' ? (
                    <Link to={t.action.to} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-text-primary/[0.06] px-3 text-[12.5px] font-medium hover:bg-text-primary/[0.1]">
                      Open <ArrowRight className="size-3.5" />
                    </Link>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

function Savers({ rep, reload }: { rep: StewardReport; reload: () => void }) {
  const toast = useToast()
  const flip = async (id: string, enabled: boolean) => {
    try {
      await hiveApi.stewardApply({ type: 'plugin', plugin: id, enabled })
      reload()
    } catch (e) {
      toast.error(errMsg(e))
    }
  }
  return (
    <section className="hive-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[13px] font-medium text-text-secondary">
          <Gauge className="size-4" /> Token savers
        </h2>
        <Link to="/hive/extensions/plugins" className="text-[12px] text-text-muted hover:text-text-primary">
          Tune →
        </Link>
      </div>
      <div className="divide-y divide-[var(--hive-line)]">
        {rep.savers.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2">
            <span className={cn('text-[13px]', s.enabled ? 'text-text-primary' : 'text-text-muted')}>{s.name}</span>
            <Toggle on={s.enabled} label={s.name} onChange={(v) => flip(s.id, v)} />
          </div>
        ))}
      </div>
      <Link to="/hive/extensions?tab=connected" className="mt-3 flex items-center gap-2 rounded-xl bg-text-primary/[0.035] p-2.5 text-[12.5px] text-text-secondary hover:bg-text-primary/[0.06]">
        <Plug className="size-4 text-accent-brand" /> Open-source tools for search, memory, context & gateways
        <ArrowRight className="ml-auto size-3.5" />
      </Link>
    </section>
  )
}

function TopModels({ rep }: { rep: StewardReport }) {
  if (!rep.models.length)
    return (
      <section className="hive-card p-4 text-[13px] text-text-muted">
        <h2 className="mb-1 text-[13px] font-medium text-text-secondary">Models by spend</h2>
        No usage in this period yet — run a chat and the models you spend on land here.
      </section>
    )
  const max = Math.max(...rep.models.map((m) => m.dollars || 0), 0.0001)
  return (
    <section className="hive-card p-4">
      <h2 className="mb-3 text-[13px] font-medium text-text-secondary">Models by spend</h2>
      <div className="space-y-2.5">
        {rep.models.slice(0, 7).map((m) => (
          <div key={`${m.vendor}|${m.model}`} className="flex items-center gap-2.5">
            <AgentMark provider={m.vendor} model={m.model} size={22} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="truncate text-text-primary">{m.name}</span>
                <span className="shrink-0 tabular-nums text-text-secondary">{usd(m.dollars)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-text-primary/[0.06]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(2, ((m.dollars || 0) / max) * 100)}%` }} transition={{ duration: 0.5, ease: EASE }} className="h-full rounded-full" style={{ background: tierColor(m.tier) }} />
              </div>
            </div>
            <CostBadge cost={m.tier} />
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Which model is enough? ──────────────────────────────────────────── */
function Planner() {
  const toast = useToast()
  const [prompt, setPrompt] = useState('')
  const [chat, setChat] = useState(false)
  const [busy, setBusy] = useState(false)
  const [plan, setPlan] = useState<StewardPlan | null>(null)
  const run = async () => {
    if (!prompt.trim()) return
    setBusy(true)
    try {
      setPlan(await hiveApi.stewardPlan(prompt, chat))
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  const saving = plan?.cheapest?.dollars != null && plan.best?.dollars ? Math.max(0, 1 - plan.cheapest.dollars / plan.best.dollars) : null
  return (
    <section className="hive-card flex flex-col p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <Scale className="size-4.5 text-accent-brand" /> Which model is enough?
      </h2>
      <p className="mt-1 text-[13px] text-text-muted">Paste a task. The Steward sizes it and shows the cheapest model that clears the bar next to the best one.</p>
      <div className="hive-composer mt-3 rounded-2xl p-2">
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="e.g. Add pagination to the users API and write tests" className="resize-none border-0 bg-transparent text-[13.5px] shadow-none focus-visible:ring-0" onKeyDown={(e) => (e.key === 'Enter' && (e.metaKey || e.ctrlKey) ? run() : undefined)} />
        <div className="flex items-center gap-2 px-1">
          <div className="flex gap-0.5 rounded-lg bg-text-primary/[0.05] p-0.5 text-[12px]">
            {[false, true].map((c) => (
              <button key={String(c)} type="button" onClick={() => setChat(c)} className={cn('h-7 rounded-md px-2.5', chat === c ? 'bg-bg-surface font-medium shadow-sm' : 'text-text-muted')}>
                {c ? 'Chat answer' : 'Agent task'}
              </button>
            ))}
          </div>
          <ImproveButton value={prompt} onApply={(p) => setPrompt(p)} mode={chat ? 'chat' : 'task'} />
          <Button size="sm" className="ml-auto" onClick={run} loading={busy} disabled={!prompt.trim()}>
            <Gauge /> Size it
          </Button>
        </div>
      </div>
      <AnimatePresence mode="wait">
        {plan && (
          <motion.div key={`${plan.kind}${plan.cheapest?.model}${plan.best?.model}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: EASE }} className="mt-4">
            <div className="mb-2 text-[12.5px] text-text-muted">
              Looks like <b className="text-text-secondary">{plan.kindLabel.toLowerCase()}</b> · ~{fmtTokens(plan.tokensIn)} in / {fmtTokens(plan.tokensOut)} out
            </div>
            {plan.same && plan.cheapest ? (
              <PickCard title="Cheapest is also the best here" pick={plan.cheapest} good />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {plan.cheapest && <PickCard title="Enough for this" pick={plan.cheapest} good />}
                {plan.best && <PickCard title="Strongest available" pick={plan.best} />}
              </div>
            )}
            {saving != null && saving > 0.05 && (
              <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-state-success">
                <TrendingDown className="size-3.5" /> Choosing “enough” saves about {Math.round(saving * 100)}% on this task — set agents to Auto and the router does this for you.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function PickCard({ title, pick, good }: { title: string; pick: NonNullable<StewardPlan['cheapest']>; good?: boolean }) {
  return (
    <div className={cn('rounded-2xl border p-3', good ? 'border-state-success/30 bg-state-success/[0.05]' : 'hive-line')}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">{title}</div>
      <div className="flex items-center gap-2.5">
        <AgentMark provider={pick.provider} model={pick.model} size={30} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold">{pick.name}</div>
          <div className="truncate text-[11.5px] text-text-muted">
            quality {Math.round(pick.quality)} · {pick.keyLabel ?? pick.provider}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-semibold tabular-nums">{usd(pick.dollars)}</div>
          <CostBadge cost={pick.cost} />
        </div>
      </div>
    </div>
  )
}

/* ── Ask the Steward ─────────────────────────────────────────────────── */
function AskSteward() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [thread, setThread] = useState<{ q: string; a?: string; model?: string }[]>([])
  const ask = async (question: string) => {
    if (!question.trim() || busy) return
    setBusy(true)
    setQ('')
    setThread((t) => [...t, { q: question }])
    try {
      const r = await hiveApi.stewardAsk(question)
      setThread((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a: r.answer, model: r.model } : x)))
    } catch (e) {
      toast.error(errMsg(e))
      setThread((t) => t.slice(0, -1))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="hive-card flex flex-col p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <Bot className="size-4.5 text-accent-brand" /> Ask the Steward
      </h2>
      <p className="mt-1 text-[13px] text-text-muted">Answers from your real usage and the open-source toolbox — on a free model when you have one.</p>
      <div className="hive-scroll mt-3 max-h-[420px] min-h-[120px] flex-1 space-y-3 overflow-y-auto">
        {!thread.length && (
          <div className="flex flex-wrap gap-1.5">
            {QUESTIONS.map((x) => (
              <button key={x} type="button" onClick={() => ask(x)} className="rounded-xl border hive-line px-3 py-2 text-left text-[12.5px] text-text-secondary transition-colors hover:border-accent-brand/40 hover:text-text-primary">
                {x}
              </button>
            ))}
          </div>
        )}
        {thread.map((m, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-accent-brand/12 px-3 py-2 text-[13px]">{m.q}</div>
            {m.a ? (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl rounded-tl-sm bg-text-primary/[0.04] px-3.5 py-2.5 text-[13px]">
                <Markdown md={m.a} className="text-[13px]" />
                {m.model && <div className="mt-1.5 text-[10.5px] text-text-muted">answered by {m.model}</div>}
              </motion.div>
            ) : (
              <div className="hive-thinking-text w-fit rounded-2xl bg-text-primary/[0.04] px-3.5 py-2.5 text-[13px]">Looking at your numbers…</div>
            )}
          </div>
        ))}
      </div>
      <form
        className="hive-composer mt-3 flex items-center gap-2 rounded-2xl p-1.5 pl-3"
        onSubmit={(e) => {
          e.preventDefault()
          ask(q)
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="How can I cut my Claude bill in half?" className="h-9 min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-text-muted" aria-label="Ask the Steward" />
        <Button size="icon-sm" type="submit" disabled={!q.trim() || busy} loading={busy} aria-label="Ask">
          <Send />
        </Button>
      </form>
    </section>
  )
}
