/* ────────────────────────────────────────────────────────────────────────
   Models: every brain Hive can use — what each one is good at, how smart
   and fast it is, what it costs, how it has actually done on this team's
   work, where to get capable models for free, side-by-side comparisons, and
   the radar of new releases.
   ──────────────────────────────────────────────────────────────────────── */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Brain, Check, CheckCircle2, Columns3, Eye, Gauge, Gift, Layers, MessageSquare, Plus, Radar, Search, Sparkles, TriangleAlert, Wrench, X, Zap } from 'lucide-react'
import { Button, Modal, Tooltip } from '@/components/ui'
import { cn } from '@/lib/utils'
import { AgentMark, COST_INFO, CostBadge, FAMILY, ScoreBar, ScoreRing, familyColor, familyOf } from '../agents'
import { shortModel } from '../AgentPicker'
import { hiveApi } from '../api'
import { useHive } from '../store'
import type { CatalogInfo, ConnectedModel, CostClass, ModelCard, RouteResult, TaskKind } from '../types'
import { ProviderGlyph, fmtTokens } from '../ui'

const RadarTab = lazy(() => import('./RadarTab'))

type Tab = 'team' | 'free' | 'compare' | 'radar'
const KIND_ORDER: TaskKind[] = ['hard', 'coding', 'review', 'writing', 'reading', 'search', 'mechanical', 'chat']
const KIND_ICON: Record<TaskKind, typeof Brain> = { hard: Brain, coding: Wrench, review: Eye, writing: Sparkles, reading: Layers, search: Search, mechanical: Zap, chat: MessageSquare }

export default function ModelsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'team'
  const setTab = (t: Tab) => setParams((p) => (p.set('tab', t), p), { replace: true })
  const [cat, setCat] = useState<CatalogInfo | null>(null)
  const [models, setModels] = useState<ConnectedModel[] | null>(null)
  const { modelsVersion, boot } = useHive()
  useEffect(() => {
    hiveApi.catalog().then(setCat).catch(() => {})
  }, [])
  useEffect(() => {
    hiveApi
      .connectedModels()
      .then((r) => setModels(r.models))
      .catch(() => setModels([]))
  }, [modelsVersion, boot?.keys.length])

  const tabs: { id: Tab; label: string; icon: typeof Brain; count?: number }[] = [
    { id: 'team', label: 'Your models', icon: Layers, count: models?.length },
    { id: 'free', label: 'Free sources', icon: Gift },
    { id: 'compare', label: 'Compare', icon: Columns3 },
    { id: 'radar', label: 'New releases', icon: Radar },
  ]

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Models</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-text-muted">Every brain Hive can use, what each one is best at, what it costs and how it has done on your work. Hive’s router uses all of this to give each job the right model.</p>
        </div>
      </header>
      <nav className="hive-scroll mb-7 flex gap-1 overflow-x-auto border-b hive-line" aria-label="Models sections">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn('relative inline-flex h-10 shrink-0 items-center gap-2 px-3 text-[13px] font-medium transition-colors', tab === t.id ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary')}>
            <t.icon className="size-4" />
            {t.label}
            {t.count != null && <span className="rounded-full bg-text-primary/[0.07] px-1.5 text-[11px] tabular-nums text-text-muted">{t.count}</span>}
            {tab === t.id && <motion.span layoutId="hive-models-tab" className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent-brand" />}
          </button>
        ))}
      </nav>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          {tab === 'team' && <TeamTab models={models} cat={cat} />}
          {tab === 'free' && <FreeTab cat={cat} />}
          {tab === 'compare' && <CompareTab models={models} cat={cat} />}
          {tab === 'radar' && (
            <Suspense fallback={<div className="hive-shimmer h-60 rounded-2xl" />}>
              <RadarTab embedded />
            </Suspense>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ── Your models ──────────────────────────────────────────────────────── */
function TeamTab({ models, cat }: { models: ConnectedModel[] | null; cat: CatalogInfo | null }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<TaskKind | 'all'>('all')
  const [cost, setCost] = useState<'all' | 'free' | 'paid'>('all')
  const [open, setOpen] = useState<ConnectedModel | null>(null)
  const list = useMemo(() => {
    if (!models) return []
    const s = q.trim().toLowerCase()
    return models
      .filter((m) => !s || `${m.card.name} ${m.model} ${m.vendorLabel} ${m.card.lab}`.toLowerCase().includes(s))
      .filter((m) => cost === 'all' || (cost === 'free' ? m.cost === 'free' || m.cost === 'sub' : m.cost !== 'free' && m.cost !== 'sub'))
      .sort((a, b) => (kind === 'all' ? b.card.intelligence - a.card.intelligence : b.card.scores[kind] - a.card.scores[kind]) || a.model.localeCompare(b.model))
  }, [models, q, kind, cost])

  if (!models) return <Grid skeleton />
  if (!models.length)
    return (
      <div className="hive-card mx-auto max-w-xl p-8 text-center">
        <span className="hive-tile mx-auto mb-4 size-12">
          <Sparkles className="size-5" />
        </span>
        <h2 className="text-[17px] font-semibold">No models connected yet</h2>
        <p className="mt-1 text-[13.5px] text-text-muted">Start with a free key — Gemini, Groq, GitHub Models or OpenRouter take two minutes — or connect your Claude Code / Codex subscription.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={() => navigate('/hive/models?tab=free')}>
            <Gift /> See free sources
          </Button>
          <Button variant="secondary" onClick={() => navigate('/hive/keys')}>
            <Plus /> Add a key
          </Button>
        </div>
      </div>
    )

  return (
    <>
      <WhoDoesWhat cat={cat} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-xl bg-text-primary/[0.05] px-3 text-text-muted focus-within:bg-text-primary/[0.08]">
          <Search className="size-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models, labs, hosts" className="min-w-0 flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted" />
        </label>
        <div className="flex rounded-xl bg-text-primary/[0.05] p-0.5">
          {(['all', 'free', 'paid'] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCost(c)} className={cn('h-8 rounded-lg px-3 text-[12.5px] capitalize', cost === c ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted')}>
              {c === 'free' ? 'Free & plan' : c}
            </button>
          ))}
        </div>
      </div>
      <div className="hive-scroll mb-5 flex gap-1.5 overflow-x-auto pb-1">
        <KindChip active={kind === 'all'} onClick={() => setKind('all')} label="Smartest first" />
        {KIND_ORDER.map((k) => (
          <KindChip key={k} active={kind === k} onClick={() => setKind(k)} label={`Best for ${cat?.kinds[k]?.label.toLowerCase() ?? k}`} icon={KIND_ICON[k]} />
        ))}
      </div>
      <Grid>
        {list.map((m, i) => (
          <ModelTile key={`${m.vendor}|${m.model}`} m={m} index={i} kind={kind === 'all' ? null : kind} onOpen={() => setOpen(m)} />
        ))}
      </Grid>
      {!list.length && <p className="py-10 text-center text-[13px] text-text-muted">No model matches.</p>}
      <ModelDetail m={open} cat={cat} onClose={() => setOpen(null)} />
    </>
  )
}

function KindChip({ active, onClick, label, icon: Icon }: { active: boolean; onClick: () => void; label: string; icon?: typeof Brain }) {
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors', active ? 'bg-accent-brand text-on-accent-brand' : 'bg-text-primary/[0.05] text-text-secondary hover:bg-text-primary/[0.09]')}>
      {Icon && <Icon className="size-3.5" />}
      {label}
    </button>
  )
}

function Grid({ children, skeleton }: { children?: React.ReactNode; skeleton?: boolean }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{skeleton ? Array.from({ length: 6 }, (_, i) => <div key={i} className="hive-shimmer h-[230px] rounded-2xl" />) : children}</div>
}

/** "Who does what": the router's pick for every kind of job, right now. */
function WhoDoesWhat({ cat }: { cat: CatalogInfo | null }) {
  const { boot } = useHive()
  const [picks, setPicks] = useState<Partial<Record<TaskKind, RouteResult>>>({})
  useEffect(() => {
    let alive = true
    for (const k of KIND_ORDER)
      hiveApi
        .route({ prompt: '', kind: k, chat: k === 'chat' })
        .then((r) => alive && setPicks((p) => ({ ...p, [k]: r })))
        .catch(() => {})
    return () => {
      alive = false
    }
  }, [boot?.keys.length])
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[15px] font-semibold">Who Hive picks for each job</h2>
        <span className="text-[12px] text-text-muted">live — changes as keys, budgets and results change</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {KIND_ORDER.map((k, i) => {
          const r = picks[k]
          const Icon = KIND_ICON[k]
          return (
            <motion.div key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="hive-card flex items-center gap-3 p-3">
              {r?.pick ? <AgentMark provider={r.pick.provider} model={r.pick.model} size={34} /> : <span className="hive-shimmer size-[34px] rounded-xl" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[11px] text-text-muted">
                  <Icon className="size-3" /> {cat?.kinds[k]?.label ?? k}
                </div>
                {r?.pick ? (
                  <Tooltip label={<span className="block max-w-[300px] text-[12px]">{r.note}</span>}>
                    <div className="flex min-w-0 cursor-help items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold">{r.pick.name}</span>
                      <CostBadge cost={r.pick.cost} />
                    </div>
                  </Tooltip>
                ) : (
                  <div className="truncate text-[12px] text-text-muted">{r?.error ? 'Nothing connected yet' : '…'}</div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

function measuredLine(m: ConnectedModel) {
  const runs = m.measured.reduce((s, x) => s + x.runs, 0)
  if (!runs) return null
  const ok = m.measured.reduce((s, x) => s + x.ok, 0)
  const acc = m.measured.reduce((s, x) => s + x.accepted, 0)
  const judged = m.measured.reduce((s, x) => s + x.accepted + x.rejected, 0)
  return `${runs} run${runs === 1 ? '' : 's'} here · ${Math.round((ok / runs) * 100)}% finished${judged ? ` · ${Math.round((acc / judged) * 100)}% shipped` : ''}`
}

function ModelTile({ m, index, kind, onOpen }: { m: ConnectedModel; index: number; kind: TaskKind | null; onOpen: () => void }) {
  const fam = familyOf(m.vendor, m.model)
  const c = m.card
  const measured = measuredLine(m)
  return (
    <motion.button
      type="button"
      layout
      onClick={onOpen}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 12) * 0.025 }}
      className="hive-card hive-card-hover hive-lift group relative overflow-hidden p-4 text-left"
    >
      <span className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full opacity-[0.12] blur-2xl transition-opacity group-hover:opacity-25" style={{ background: familyColor(fam) }} />
      <div className="relative flex items-start gap-3">
        <AgentMark provider={m.vendor} model={m.model} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{c.name}</span>
            {c.open && (
              <span className="rounded bg-text-primary/[0.07] px-1 text-[9.5px] font-semibold uppercase tracking-wide text-text-muted" title="Open weights">
                open
              </span>
            )}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11.5px] text-text-muted">
            <ProviderGlyph provider={m.vendor} size="xs" />
            <span className="truncate">
              {m.vendorLabel} · <span className="font-mono">{shortModel(m.model)}</span>
            </span>
          </div>
        </div>
        <ScoreRing value={kind ? c.scores[kind] : c.intelligence} size={44} hue={FAMILY[fam].hue} label={kind ? `Fit for this kind of job` : 'Intelligence (estimated)'} />
      </div>
      <div className="relative mt-3.5 space-y-1.5">
        <ScoreBar label="Coding" value={c.coding} hue={150} />
        <ScoreBar label="Reasoning" value={c.reasoning} hue={280} />
        <ScoreBar label="Writing" value={c.writing} hue={210} />
        <ScoreBar label="Speed" value={c.speed * 20} hue={70} suffix={['', 'slow', 'steady', 'quick', 'fast', 'instant'][c.speed]} />
      </div>
      <div className="relative mt-3.5 flex flex-wrap items-center gap-1.5">
        <CostBadge cost={m.cost} long />
        {c.price && m.cost !== 'free' && m.cost !== 'sub' && (
          <span className="text-[11px] tabular-nums text-text-muted">
            ${c.price[0]} / ${c.price[1]} per 1M
          </span>
        )}
        <span className="text-[11px] tabular-nums text-text-muted">{c.context >= 1000 ? `${c.context / 1000}M` : `${c.context}k`} context</span>
        {c.vision && <Eye className="size-3 text-text-muted" aria-label="Sees images" />}
        {!c.tools && (
          <span className="text-[10.5px] text-state-warning" title="Can chat but can't act as an agent">
            chat only
          </span>
        )}
        {!m.online && <span className="text-[10.5px] text-state-warning">machine offline</span>}
      </div>
      {measured && <div className="relative mt-2 text-[11.5px] text-state-success">{measured}</div>}
      {c.guessed && <div className="relative mt-2 text-[11px] text-text-muted">Not in the catalogue yet — Hive learns it from results.</div>}
    </motion.button>
  )
}

function ModelDetail({ m, cat, onClose }: { m: ConnectedModel | null; cat: CatalogInfo | null; onClose: () => void }) {
  const navigate = useNavigate()
  if (!m) return <Modal open={false} onClose={onClose}>{null}</Modal>
  const c = m.card
  const fam = familyOf(m.vendor, m.model)
  return (
    <Modal open={!!m} onClose={onClose} size="lg" title={<span className="flex items-center gap-2.5"><AgentMark provider={m.vendor} model={m.model} size={30} /> {c.name}</span>} description={`${c.lab} · on ${m.vendorLabel} (${m.keyLabel}) · ${m.model}`}>
      <div className="space-y-5">
        <p className="text-[13px] text-text-secondary">{FAMILY[fam].tagline}.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Fit for each kind of job</div>
            {KIND_ORDER.map((k) => (
              <ScoreBar key={k} label={cat?.kinds[k]?.label ?? k} value={c.scores[k]} hue={c.scores[k] >= (cat?.minQuality[k] ?? 60) ? 150 : 40} />
            ))}
          </div>
          <div className="space-y-3">
            {c.strengths.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-state-success">Strengths</div>
                <ul className="space-y-1 text-[12.5px]">
                  {c.strengths.map((s) => (
                    <li key={s} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-state-success" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {c.weaknesses.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-state-warning">Watch out for</div>
                <ul className="space-y-1 text-[12.5px]">
                  {c.weaknesses.map((s) => (
                    <li key={s} className="flex gap-2">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-state-warning" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 text-[12px]">
              <CostBadge cost={m.cost} long />
              {c.price && <span className="hive-chip h-6">${c.price[0]} in · ${c.price[1]} out / 1M</span>}
              <span className="hive-chip h-6">
                <Gauge className="size-3" /> intelligence {c.intelligence}
              </span>
            </div>
          </div>
        </div>
        {m.measured.length > 0 && (
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">On your work</div>
            <div className="hive-card hive-divide overflow-hidden text-[12.5px]">
              {m.measured.map((s) => (
                <div key={s.kind} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-32 shrink-0 text-text-secondary">{cat?.kinds[s.kind]?.label ?? s.kind}</span>
                  <span className="tabular-nums text-text-muted">{s.runs} runs</span>
                  <span className="tabular-nums">{s.successRate != null ? `${Math.round(s.successRate * 100)}% finished` : ''}</span>
                  <span className="tabular-nums text-state-success">{s.acceptRate != null ? `${Math.round(s.acceptRate * 100)}% shipped` : ''}</span>
                  <span className="ml-auto tabular-nums text-text-muted">{s.avgTokens != null ? `${fmtTokens(s.avgTokens)} tok avg` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(`/hive/chat?model=${encodeURIComponent(`${m.vendor}|${m.model}`)}`)}>
            <MessageSquare /> Chat with it
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
        {c.guessed ? null : <p className="text-[11px] text-text-muted">Scores are estimates from public leaderboards (Nov 2026); Hive adjusts its choices with what it measures on your own work.</p>}
      </div>
    </Modal>
  )
}

/* ── Free sources ─────────────────────────────────────────────────────── */
function FreeTab({ cat }: { cat: CatalogInfo | null }) {
  const { boot } = useHive()
  const navigate = useNavigate()
  if (!cat) return <Grid skeleton />
  const connected = new Set((boot?.keys ?? []).filter((k) => !k.disabled).map((k) => k.provider))
  const list = [...cat.freeSources].sort((a, b) => Number(connected.has(a.vendor)) - Number(connected.has(b.vendor)) || b.score - a.score)
  const count = cat.freeSources.filter((s) => connected.has(s.vendor)).length
  return (
    <>
      <div className="hive-card relative mb-6 overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_0%_0%,oklch(72%_0.14_155/0.14),transparent)]" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="hive-tile size-11" style={{ ['--tile' as string]: 'oklch(72% 0.14 155)' }}>
            <Gift className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold">Capable models, free</h2>
            <p className="mt-0.5 text-[13px] text-text-muted">Connect several — Hive spreads routine work across them, moves on when one hits its daily limit, and keeps paid and subscription models for the jobs that need them.</p>
          </div>
          <div className="text-right">
            <div className="text-[24px] font-semibold tabular-nums">
              {count}
              <span className="text-[14px] text-text-muted">/{cat.freeSources.length}</span>
            </div>
            <div className="text-[11.5px] text-text-muted">connected</div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((s, i) => {
          const on = connected.has(s.vendor)
          return (
            <motion.div key={s.vendor} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className={cn('hive-card p-4', on && 'ring-1 ring-state-success/30')}>
              <div className="flex items-start gap-3">
                <ProviderGlyph provider={s.vendor} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold">{s.name}</span>
                    {on && (
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-state-success">
                        <Check className="size-3.5" /> connected
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[12.5px] font-medium" style={{ color: 'oklch(72% 0.13 155)' }}>
                    {s.free}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-text-secondary">{s.limits}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {s.models.map((m) => (
                  <span key={m} className="inline-flex items-center gap-1 rounded-md bg-text-primary/[0.05] px-1.5 py-0.5 text-[11px] text-text-secondary">
                    <AgentMark provider={s.vendor} model={m} size={14} flat /> {m}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                Good for:
                {s.bestFor.map((k) => (
                  <span key={k} className="rounded-full bg-accent-brand/10 px-2 py-0.5 text-accent-brand">
                    {cat.kinds[k]?.label.toLowerCase() ?? k}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t hive-line pt-3">
                <span className="min-w-0 flex-1 text-[11.5px] text-text-muted">{s.how}</span>
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg bg-text-primary/[0.06] px-3 text-[12.5px] hover:bg-text-primary/[0.1]">
                  Get a key <ArrowUpRight className="size-3.5" />
                </a>
                <Button size="sm" onClick={() => navigate(`/hive/keys?add=${s.vendor}`)}>
                  <Plus /> {on ? 'Add another' : 'Connect'}
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>
      <p className="mt-6 text-[11.5px] text-text-muted">Free tiers change often. Hive re-reads every key’s live model list twice a day and treats a source that is out of quota as unavailable until it resets.</p>
    </>
  )
}

/* ── Compare ──────────────────────────────────────────────────────────── */
type Pick = { key: string; label: string; vendor: string; model: string; card: ModelCard; cost: CostClass }

function CompareTab({ models, cat }: { models: ConnectedModel[] | null; cat: CatalogInfo | null }) {
  const options = useMemo<Pick[]>(() => {
    const out: Pick[] = []
    const seen = new Set<string>()
    for (const m of models ?? []) {
      const k = `${m.vendor}|${m.model}`
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ key: k, label: `${m.card.name} · ${m.vendorLabel}`, vendor: m.vendor, model: m.model, card: m.card, cost: m.cost })
    }
    for (const c of cat?.cards ?? []) {
      if (out.some((o) => o.card.id === c.id)) continue
      out.push({ key: `catalog|${c.id}`, label: `${c.name} (not connected)`, vendor: '', model: c.id, card: c, cost: c.tier })
    }
    return out
  }, [models, cat])
  const [sel, setSel] = useState<string[]>([])
  useEffect(() => {
    if (!sel.length && options.length) setSel(options.slice(0, 3).map((o) => o.key))
  }, [options, sel.length])
  const picks = sel.map((k) => options.find((o) => o.key === k)).filter((x): x is Pick => !!x)
  const [adding, setAdding] = useState('')
  if (!cat) return <Grid skeleton />
  const best = (f: (c: ModelCard) => number) => Math.max(...picks.map((p) => f(p.card)))
  const rows: { label: string; f: (c: ModelCard) => number; fmt?: (v: number) => string; hue: number }[] = [
    { label: 'Intelligence', f: (c) => c.intelligence, hue: 285 },
    { label: 'Coding', f: (c) => c.coding, hue: 150 },
    { label: 'Reasoning', f: (c) => c.reasoning, hue: 280 },
    { label: 'Writing', f: (c) => c.writing, hue: 210 },
    { label: 'Speed', f: (c) => c.speed * 20, fmt: (v) => ['', 'slow', 'steady', 'quick', 'fast', 'instant'][v / 20], hue: 70 },
  ]
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {picks.map((p) => (
          <span key={p.key} className="hive-chip h-8 pr-1">
            <AgentMark provider={p.vendor || 'generic'} model={p.model} size={18} /> {p.card.name}
            <button type="button" onClick={() => setSel((s) => s.filter((x) => x !== p.key))} className="grid size-6 place-items-center rounded-full hover:bg-text-primary/10" aria-label={`Remove ${p.card.name}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        {picks.length < 4 && (
          <select value={adding} onChange={(e) => (e.target.value && setSel((s) => [...s, e.target.value]), setAdding(''))} className="h-8 rounded-full bg-text-primary/[0.06] px-3 text-[12.5px] outline-none" aria-label="Add a model to compare">
            <option value="">+ Add a model…</option>
            {options
              .filter((o) => !sel.includes(o.key))
              .map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
          </select>
        )}
      </div>
      {picks.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-text-muted">Pick models to compare.</p>
      ) : (
        <div className="hive-scroll overflow-x-auto">
          <div className="grid min-w-[640px] gap-3" style={{ gridTemplateColumns: `140px repeat(${picks.length}, minmax(0, 1fr))` }}>
            <div />
            {picks.map((p) => (
              <div key={p.key} className="hive-card p-3 text-center">
                <AgentMark provider={p.vendor || 'generic'} model={p.model} size={40} className="mx-auto" />
                <div className="mt-2 truncate text-[14px] font-semibold">{p.card.name}</div>
                <div className="truncate text-[11px] text-text-muted">{p.card.lab}</div>
                <div className="mt-1.5">
                  <CostBadge cost={p.cost} long />
                </div>
              </div>
            ))}
            {rows.map((r) => {
              const top = best(r.f)
              return (
                <Row key={r.label} label={r.label}>
                  {picks.map((p) => {
                    const v = r.f(p.card)
                    return (
                      <div key={p.key} className={cn('rounded-xl px-3 py-2', v === top && picks.length > 1 && 'bg-state-success/[0.07]')}>
                        <ScoreBar value={v} hue={r.hue} suffix={r.fmt ? r.fmt(v) : undefined} />
                      </div>
                    )
                  })}
                </Row>
              )
            })}
            <Row label="Context">
              {picks.map((p) => (
                <Cell key={p.key}>{p.card.context >= 1000 ? `${p.card.context / 1000}M tokens` : `${p.card.context}k tokens`}</Cell>
              ))}
            </Row>
            <Row label="Price / 1M">
              {picks.map((p) => (
                <Cell key={p.key}>{p.cost === 'free' ? 'Free here' : p.cost === 'sub' ? 'Included in your plan' : p.card.price ? `$${p.card.price[0]} in · $${p.card.price[1]} out` : '—'}</Cell>
              ))}
            </Row>
            <Row label="Best for">
              {picks.map((p) => (
                <Cell key={p.key}>
                  <span className="flex flex-wrap gap-1">
                    {p.card.bestFor.slice(0, 5).map((k) => (
                      <span key={k} className="rounded-full bg-accent-brand/10 px-1.5 text-[10.5px] text-accent-brand">
                        {cat.kinds[k]?.label.toLowerCase() ?? k}
                      </span>
                    ))}
                  </span>
                </Cell>
              ))}
            </Row>
            <Row label="Strengths">
              {picks.map((p) => (
                <Cell key={p.key}>
                  <ul className="space-y-0.5">
                    {p.card.strengths.slice(0, 3).map((s) => (
                      <li key={s}>· {s}</li>
                    ))}
                  </ul>
                </Cell>
              ))}
            </Row>
          </div>
        </div>
      )}
      <p className="mt-6 text-[11.5px] text-text-muted">
        Cost classes: {(Object.keys(COST_INFO) as CostClass[]).map((c) => `${COST_INFO[c].short} = ${COST_INFO[c].label.toLowerCase()}`).join(' · ')}.
      </p>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center text-[12px] font-medium text-text-muted">{label}</div>
      {children}
    </>
  )
}
function Cell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-text-primary/[0.03] px-3 py-2 text-[12px] text-text-secondary">{children}</div>
}
