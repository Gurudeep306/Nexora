/* ────────────────────────────────────────────────────────────────────────
   Plan a team (the Dispatcher) — describe the work; Hive splits it into parts, gives each part
   the cheapest model that can really do it, and runs the team. The plan is a
   live graph: parts flow left → right by dependency, each with its model,
   kind of work and cost, compared with "one premium model does everything".
   ──────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  Code2,
  FileText,
  Flame,
  GitBranch,
  Loader2,
  MessageSquare,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  TrendingDown,
  Wand2,
  Workflow,
  Wrench,
  X,
} from 'lucide-react'
import { Button, Menu, MenuContent, MenuItem, MenuTrigger, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { AgentChip } from '../AgentPicker'
import { AgentAvatar, AgentMark, CostBadge, type AgentState } from '../agents'
import { hiveApi } from '../api'
import { ImproveButton, errMsg } from '../Improve'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import type { AgentSpec, Dispatch, DispatchPart, TaskKind } from '../types'
import { PageTitle, timeAgo } from '../ui'

const EASE = [0.2, 0.8, 0.2, 1] as const
const usd = (n: number | null | undefined) => (n == null ? '—' : n === 0 ? 'free' : n < 0.01 ? '<$0.01' : `$${n.toFixed(n < 1 ? 3 : 2)}`)

export const KIND_INFO: Record<TaskKind, { label: string; hue: number; icon: typeof Code2 }> = {
  chat: { label: 'Conversation', hue: 200, icon: MessageSquare },
  mechanical: { label: 'Mechanical', hue: 165, icon: Wrench },
  reading: { label: 'Reading', hue: 230, icon: BookOpen },
  search: { label: 'Finding', hue: 190, icon: Search },
  writing: { label: 'Writing', hue: 330, icon: FileText },
  coding: { label: 'Coding', hue: 285, icon: Code2 },
  review: { label: 'Review', hue: 60, icon: ShieldCheck },
  hard: { label: 'Hard engineering', hue: 25, icon: Flame },
}
const kindColor = (k: TaskKind, l = 64) => `oklch(${l}% 0.14 ${KIND_INFO[k]?.hue ?? 285})`

const EXAMPLES = [
  'Add a dark-mode toggle to the settings page, with tests, and update the docs',
  'Find and fix the slowest API endpoint, add caching, and write a short report',
  'Add input validation to every form, then review the whole change for security',
  'Write unit tests for the utils folder and fix anything they catch',
]

export default function DispatchPage() {
  const { boot, project, on } = useHive()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  // Handed over from the Home composer ("Plan a team"): the request, strategy and project.
  const handed = (useLocation().state ?? null) as { draft?: string; preference?: 'savings' | 'fast' | 'balanced' | 'quality'; freeOnly?: boolean; projectId?: string } | null
  const [projectId, setProjectId] = useState<string>(() => handed?.projectId || params.get('project') || project?.id || boot?.projects[0]?.id || '')
  const [request, setRequest] = useState(() => handed?.draft ?? '')
  const [preference, setPreference] = useState<'savings' | 'fast' | 'balanced' | 'quality'>(() => handed?.preference ?? 'savings')
  const [freeOnly, setFreeOnly] = useState(() => !!handed?.freeOnly)
  const [busy, setBusy] = useState(false)
  const [list, setList] = useState<Dispatch[]>([])
  const openId = params.get('d')
  const current = list.find((d) => d.id === openId) ?? null

  const load = useCallback(async () => {
    try {
      setList((await hiveApi.dispatches(null)).dispatches)
    } catch {
      /* quiet */
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])
  useEffect(
    () =>
      on('dispatch', ((d: Dispatch) => {
        if (!d?.id) return
        setList((l) => (l.some((x) => x.id === d.id) ? l.map((x) => (x.id === d.id ? d : x)) : [d, ...l]))
      }) as never),
    [on],
  )
  const open = (id: string | null) =>
    setParams(
      (p) => {
        if (id) p.set('d', id)
        else p.delete('d')
        return p
      },
      { replace: false },
    )

  const plan = async () => {
    if (!request.trim() || !projectId) return
    setBusy(true)
    try {
      const r = await hiveApi.planDispatch({ projectId, request, preference, freeOnly })
      setList((l) => [r.dispatch, ...l.filter((x) => x.id !== r.dispatch.id)])
      open(r.dispatch.id)
      setRequest('')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  if (!boot) return null
  const proj = boot.projects.find((p) => p.id === projectId)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageTitle
        icon={<Workflow />}
        title="Plan a team"
        sub="Describe the work. Hive splits it into parts, gives each part the cheapest model that can really do it, lets you check the plan, then runs the whole team."
      />

      {/* Composer */}
      <section className="hive-card relative overflow-hidden p-4 sm:p-5">
        <div className="relative">
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            onKeyDown={(e) => (e.key === 'Enter' && (e.metaKey || e.ctrlKey) ? plan() : undefined)}
            rows={3}
            placeholder="What should the team build? e.g. “Add a dark-mode toggle to settings, with tests and docs”"
            className="hive-scroll block w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-text-muted"
            aria-label="Request"
          />
          {!request && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((x) => (
                <button key={x} type="button" onClick={() => setRequest(x)} className="rounded-full bg-text-primary/[0.05] px-3 py-1 text-[12px] text-text-secondary hover:bg-text-primary/[0.09] hover:text-text-primary">
                  {x}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Menu>
              <MenuTrigger asChild>
                <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-text-primary/[0.06] px-3 text-[12.5px] hover:bg-text-primary/[0.1]">
                  {proj ? <span className="rounded-full size-2.5" style={{ background: projectColor(proj.color) }} /> : <GitBranch className="size-3.5" />}
                  {proj?.name ?? 'Pick a project'}
                </button>
              </MenuTrigger>
              <MenuContent align="start">
                {boot.projects.map((p) => (
                  <MenuItem key={p.id} onSelect={() => setProjectId(p.id)}>
                    <span className="rounded-full size-2.5" style={{ background: projectColor(p.color) }} /> {p.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
            <div className="flex rounded-full bg-text-primary/[0.06] p-0.5 text-[12px]" role="radiogroup" aria-label="Priority">
              {(
                [
                  ['savings', 'Fewest tokens'],
                  ['fast', 'Fastest'],
                  ['balanced', 'Balanced'],
                  ['quality', 'Best quality'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={preference === k} onClick={() => setPreference(k)} className={cn('h-7 rounded-full px-3 transition-colors', preference === k ? 'bg-bg-surface font-medium text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary')}>
                  {l}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setFreeOnly((v) => !v)} aria-pressed={freeOnly} className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors', freeOnly ? 'bg-state-success/15 font-medium text-state-success' : 'bg-text-primary/[0.06] text-text-secondary hover:bg-text-primary/[0.1]')}>
              <Sparkles className="size-3.5" /> Free models only
            </button>
            <span className="ml-auto" />
            <ImproveButton value={request} onApply={(t) => setRequest(t)} projectId={projectId || null} label />
            <Button onClick={plan} loading={busy} disabled={!request.trim() || !projectId}>
              {!busy && <Wand2 />} {busy ? 'Planning the team…' : 'Plan the team'}
            </Button>
          </div>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {busy && (
          <motion.div key="planning" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            <PlanningSkeleton />
          </motion.div>
        )}
      </AnimatePresence>

      {current?.plan && (
        <PlanView
          key={current.id}
          d={current}
          onChange={(d) => setList((l) => l.map((x) => (x.id === d.id ? d : x)))}
          onClose={() => open(null)}
          onOpenTask={() => current.taskId && navigate(`/hive/p/${current.projectId}/t/${current.taskId}`)}
        />
      )}

      {/* History */}
      <section className="mt-10">
        <h2 className="mb-3 text-[13px] font-medium text-text-secondary">{list.length ? 'Recent teams' : 'How it works'}</h2>
        {!list.length ? (
          <div className="grid gap-5 border-y border-[var(--hv-border)] py-5 sm:grid-cols-3">
            {[
              ['1', 'Describe the work', 'In plain words — one feature, a refactor, a bug hunt, docs.'],
              ['2', 'Check the plan', 'Each part shows its kind of work, the model picked for it and the cost. Swap any model.'],
              ['3', 'Run the team', 'Parts run in parallel where they can; a reviewer checks the whole change at the end.'],
            ].map(([n, t, s]) => (
              <div key={n} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--hv-fill)] text-[12px] font-semibold text-[var(--hv-text-2)]">{n}</span>
                <div>
                  <div className="text-[13.5px] font-semibold">{t}</div>
                  <div className="text-[12.5px] text-text-muted">{s}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((d) => (
              <button key={d.id} type="button" onClick={() => open(d.id)} className={cn('hive-card hive-card-hover flex flex-col gap-2 p-3.5 text-left', d.id === openId && 'ring-2 ring-accent-brand/40')}>
                <div className="flex items-center gap-2">
                  <StatusBadge status={d.status} />
                  <span className="ml-auto text-[11px] text-text-muted">{timeAgo(d.updatedAt)}</span>
                </div>
                <div className="line-clamp-2 text-[13px] font-medium">{d.plan?.summary || d.request}</div>
                <div className="flex -space-x-1.5">
                  {(d.plan?.parts ?? []).slice(0, 6).map((p) => (p.pick ? <AgentMark key={p.id} provider={p.pick.provider} model={p.pick.model} size={20} className="ring-2 ring-bg-surface" /> : null))}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: Dispatch['status'] }) {
  const m = {
    planned: ['Planned', 'var(--color-state-info)'],
    running: ['Running', 'var(--color-accent-brand)'],
    done: ['Done', 'var(--color-state-success)'],
    failed: ['Failed', 'var(--color-state-error)'],
    stopped: ['Stopped', 'var(--color-text-muted)'],
  }[status]
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[11px] font-medium" style={{ color: m[1], background: `color-mix(in oklab, ${m[1]} 12%, transparent)` }}>
      {status === 'running' ? <Loader2 className="size-3 animate-spin" /> : <span className="size-1.5 rounded-full" style={{ background: m[1] }} />}
      {m[0]}
    </span>
  )
}

function PlanningSkeleton() {
  return (
    <div className="hive-card p-5">
      <div className="mb-4 flex items-center gap-2 text-[13px] text-text-secondary">
        <Brain className="size-4 animate-pulse text-accent-brand" />
        <span className="hive-thinking-text">Splitting the work and matching each part to the cheapest model that can do it…</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((c) => (
          <div key={c} className="space-y-3">
            {Array.from({ length: c === 1 ? 2 : 1 }, (_, i) => (
              <div key={i} className="hive-shimmer h-28 rounded-2xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── The plan as a graph ─────────────────────────────────────────────── */
function waves(parts: DispatchPart[]) {
  const depth = new Map<string, number>()
  const byId = new Map(parts.map((p) => [p.id, p]))
  const d = (id: string, seen = new Set<string>()): number => {
    if (depth.has(id)) return depth.get(id)!
    if (seen.has(id)) return 0
    seen.add(id)
    const p = byId.get(id)
    const v = p && p.dependsOn.length ? 1 + Math.max(...p.dependsOn.map((x) => d(x, seen))) : 0
    depth.set(id, v)
    return v
  }
  parts.forEach((p) => d(p.id))
  const cols: DispatchPart[][] = []
  for (const p of parts) (cols[depth.get(p.id)!] ??= []).push(p)
  return cols.filter(Boolean)
}

function PlanView({ d, onChange, onClose, onOpenTask }: { d: Dispatch; onChange: (d: Dispatch) => void; onClose: () => void; onOpenTask: () => void }) {
  const toast = useToast()
  const plan = d.plan!
  const cols = useMemo(() => waves(plan.parts), [plan.parts])
  const [starting, setStarting] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const [paths, setPaths] = useState<{ id: string; d: string; from: string; to: string }[]>([])
  const editable = d.status === 'planned'

  // Draw connectors between dependent parts.
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const draw = () => {
      const base = el.getBoundingClientRect()
      const out: { id: string; d: string; from: string; to: string }[] = []
      for (const p of plan.parts) {
        const to = el.querySelector<HTMLElement>(`[data-part="${p.id}"]`)
        if (!to) continue
        for (const dep of p.dependsOn) {
          const from = el.querySelector<HTMLElement>(`[data-part="${dep}"]`)
          if (!from) continue
          const a = from.getBoundingClientRect()
          const b = to.getBoundingClientRect()
          const x1 = a.right - base.left
          const y1 = a.top + a.height / 2 - base.top
          const x2 = b.left - base.left
          const y2 = b.top + b.height / 2 - base.top
          if (x2 <= x1) continue // stacked on phones: no wires
          const mx = (x1 + x2) / 2
          out.push({ id: `${dep}-${p.id}`, d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, from: dep, to: p.id })
        }
      }
      setPaths(out)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [plan.parts])

  const statusOf = (id: string) => d.progress[id]?.status ?? (d.status === 'planned' ? 'planned' : 'waiting')
  const total = plan.totals.dollars
  const base = plan.totals.baseline?.dollars ?? null
  const saving = total != null && base ? Math.max(0, 1 - total / base) : null
  const doneCount = plan.parts.filter((p) => statusOf(p.id) === 'done').length

  const start = async () => {
    setStarting(true)
    try {
      onChange((await hiveApi.startDispatch(d.id)).dispatch)
      toast.success('The team is on it — follow along live here or in the session')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setStarting(false)
    }
  }

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, ease: EASE }} className="hive-card mt-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 border-b hive-line p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <StatusBadge status={d.status} />
            <span className="text-[11.5px] text-text-muted">planned by {plan.totals.plannedBy} · {plan.parts.length} part{plan.parts.length === 1 ? '' : 's'}</span>
          </div>
          <h2 className="text-[17px] font-semibold tracking-tight">{plan.summary}</h2>
          <p className="mt-0.5 line-clamp-2 text-[12.5px] text-text-muted">{d.request}</p>
        </div>
        <div className="flex items-center gap-2">
          {d.status === 'planned' && (
            <Button onClick={start} loading={starting}>
              {!starting && <Play />} Start the team
            </Button>
          )}
          {d.status === 'running' && (
            <Button variant="secondary" onClick={() => hiveApi.stopDispatch(d.id).catch(() => {})}>
              <Square /> Stop
            </Button>
          )}
          {d.taskId && (
            <Button variant="secondary" onClick={onOpenTask}>
              Open session <ArrowRight />
            </Button>
          )}
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.06]" aria-label="Close plan">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Cost strip */}
      <div className="grid gap-px bg-[var(--hive-line)] sm:grid-cols-3">
        <div className="bg-bg-surface p-4">
          <div className="text-[11.5px] text-text-muted">This team</div>
          <div className="mt-0.5 text-[22px] font-semibold tabular-nums">{usd(total)}</div>
          <div className="text-[11.5px] text-text-muted">estimated</div>
        </div>
        <div className="bg-bg-surface p-4">
          <div className="text-[11.5px] text-text-muted">One premium model for everything</div>
          <div className="mt-0.5 flex items-center gap-2 text-[22px] font-semibold tabular-nums text-text-secondary">
            {plan.totals.baseline && <AgentMark provider={plan.totals.baseline.provider} model={plan.totals.baseline.model} size={22} />}
            {usd(base)}
          </div>
          <div className="truncate text-[11.5px] text-text-muted">{plan.totals.baseline?.name ?? '—'}</div>
        </div>
        <div className="bg-bg-surface p-4">
          <div className="text-[11.5px] text-text-muted">{d.status === 'planned' ? 'You save' : 'Progress'}</div>
          {d.status === 'planned' ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-[22px] font-semibold tabular-nums text-state-success">
              <TrendingDown className="size-5" /> {saving == null ? '—' : `${Math.round(saving * 100)}%`}
            </div>
          ) : (
            <>
              <div className="mt-0.5 text-[22px] font-semibold tabular-nums">
                {doneCount}/{plan.parts.length}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-text-primary/[0.07]">
                <motion.div className="h-full rounded-full bg-accent-brand" animate={{ width: `${(doneCount / Math.max(1, plan.parts.length)) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
              </div>
            </>
          )}
          {d.error && <div className="mt-1 text-[11.5px] text-state-error">{d.error}</div>}
        </div>
      </div>

      {/* Graph */}
      <div className="hive-scroll overflow-x-auto p-4 sm:p-6">
        <div ref={box} className="relative flex min-w-fit flex-col gap-4 md:flex-row md:items-center md:gap-14">
          <svg className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible md:block" aria-hidden>
            <defs>
              <linearGradient id="dsp-wire" x1="0" x2="1">
                <stop offset="0" stopColor="var(--color-accent-brand)" stopOpacity="0.15" />
                <stop offset="1" stopColor="var(--color-accent-brand)" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            {paths.map((p) => {
              const live = statusOf(p.to) === 'running'
              const done = statusOf(p.from) === 'done'
              return (
                <g key={p.id}>
                  <path d={p.d} fill="none" stroke="url(#dsp-wire)" strokeWidth={done ? 2 : 1.5} />
                  {live && (
                    <path d={p.d} fill="none" stroke="var(--color-accent-brand)" strokeWidth="2" className="hive-wire" />
                  )}
                </g>
              )
            })}
          </svg>
          {cols.map((col, ci) => (
            <div key={ci} className="relative flex w-full flex-col gap-4 md:w-[280px]">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-text-muted">{ci === 0 ? 'First' : `Then · wave ${ci + 1}`}</div>
              {col.map((p, i) => (
                <PartNode key={p.id} d={d} part={p} status={statusOf(p.id)} delay={ci * 0.08 + i * 0.05} editable={editable} onChange={onChange} />
              ))}
            </div>
          ))}
          {plan.review && (
            <div className="relative flex w-full flex-col gap-4 md:w-[240px]">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-text-muted">Finally</div>
              <div data-part="review" className={cn('hive-card relative overflow-hidden p-3.5', statusOf('review') === 'running' && 'hive-working')} style={{ boxShadow: `inset 3px 0 0 ${kindColor('review')}` }}>
                <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: kindColor('review', 52) }}>
                  <ShieldCheck className="size-3.5" /> Team review
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <AgentAvatar provider={plan.review.provider} model={plan.review.model} state={stateFor(statusOf('review'))} size={30} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold">{plan.review.name}</div>
                    <div className="text-[11.5px] text-text-muted">checks that the parts fit together</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {editable && <p className="border-t hive-line px-5 py-3 text-[12px] text-text-muted">Tip: click a model to swap it, or remove a part you don't need. Parts in the same wave run at the same time.</p>}
    </motion.section>
  )
}

function stateFor(s: string): AgentState {
  return s === 'running' ? 'editing' : s === 'done' ? 'done' : s === 'failed' ? 'failed' : 'queued'
}

function PartNode({ d, part, status, delay, editable, onChange }: { d: Dispatch; part: DispatchPart; status: string; delay: number; editable: boolean; onChange: (d: Dispatch) => void }) {
  const { boot } = useHive()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const K = KIND_INFO[part.kind] ?? KIND_INFO.coding
  const prog = d.progress[part.id]
  const swap = async (spec: AgentSpec) => {
    try {
      onChange((await hiveApi.editDispatch(d.id, { partId: part.id, spec: { provider: spec.provider, keyId: spec.keyId, model: spec.model } })).dispatch)
    } catch (e) {
      toast.error(errMsg(e))
    }
  }
  const remove = async () => {
    try {
      onChange((await hiveApi.editDispatch(d.id, { partId: part.id, remove: true })).dispatch)
    } catch (e) {
      toast.error(errMsg(e))
    }
  }
  const tone = status === 'done' ? 'var(--color-state-success)' : status === 'failed' ? 'var(--color-state-error)' : status === 'running' ? 'var(--color-accent-brand)' : null
  return (
    <motion.div
      data-part={part.id}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: EASE, delay }}
      className={cn('hive-card group relative overflow-hidden p-3.5 transition-shadow', status === 'running' && 'hive-working')}
      style={{ boxShadow: `inset 3px 0 0 ${kindColor(part.kind)}${tone ? `, 0 0 0 1px color-mix(in oklab, ${tone} 45%, transparent)` : ''}` }}
    >
      <div className="relative">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10.5px] font-semibold" style={{ color: kindColor(part.kind, 50), background: `color-mix(in oklab, ${kindColor(part.kind)} 14%, transparent)` }}>
            <K.icon className="size-3" /> {K.label}
          </span>
          <span className="rounded-full bg-text-primary/[0.05] px-1.5 text-[10.5px] uppercase text-text-muted">{part.size}</span>
          <span className="ml-auto">
            {status === 'done' ? <Check className="size-4 text-state-success" /> : status === 'running' ? <Loader2 className="size-4 animate-spin text-accent-brand" /> : status === 'failed' ? <X className="size-4 text-state-error" /> : null}
          </span>
          {editable && (
            <button type="button" onClick={remove} className="grid size-6 place-items-center rounded-md text-text-muted opacity-0 transition-opacity hover:bg-text-primary/[0.06] hover:text-state-error group-hover:opacity-100" aria-label={`Remove ${part.title}`}>
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1.5 block w-full text-left text-[13.5px] font-semibold leading-snug hover:text-accent-brand">
          {part.title}
        </button>
        {part.files.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {part.files.slice(0, 3).map((f) => (
              <span key={f} className="max-w-full truncate rounded-md bg-text-primary/[0.05] px-1.5 py-0.5 font-mono text-[10.5px] text-text-muted">
                {f}
              </span>
            ))}
          </div>
        )}
        <AnimatePresence>
          {open && (
            <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2 overflow-hidden whitespace-pre-wrap text-[12px] leading-relaxed text-text-secondary">
              {prog?.result || part.prompt}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="mt-3 flex items-center gap-2 border-t hive-line pt-2.5">
          {part.pick ? <AgentAvatar provider={part.pick.provider} model={part.pick.model} state={stateFor(status)} size={30} /> : <span className="size-[30px] rounded-full bg-text-primary/[0.06]" />}
          <div className="min-w-0 flex-1">
            {editable && boot ? (
              <AgentChip boot={boot} spec={{ provider: part.pick?.provider ?? 'auto', keyId: part.pick?.keyId ?? 'auto', model: part.pick?.model ?? '' }} onChange={swap} compact />
            ) : (
              <div className="truncate text-[12.5px] font-medium">{prog?.model || part.pick?.name || 'Auto'}</div>
            )}
            <div className="truncate text-[11px] text-text-muted">{prog?.message || part.pick?.note?.split(' · ')[0] || ''}</div>
          </div>
          <div className="text-right">
            <div className="text-[12.5px] font-semibold tabular-nums">{usd(part.estimate?.dollars)}</div>
            {part.pick && <CostBadge cost={part.pick.cost} />}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
