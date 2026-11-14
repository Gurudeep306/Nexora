/* ────────────────────────────────────────────────────────────────────────
   Automations: work that runs on its own, day and night — scheduled jobs
   (a prompt or a pipeline, hourly / daily / weekdays / weekly) and the
   autopilots that keep sessions moving without anyone watching.
   The server stores hours in UTC; everything here is shown and picked in
   the viewer's local time and converted when saving.
   ──────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Clock,
  Infinity as InfinityIcon,
  Lock,
  Moon,
  Pencil,
  Play,
  Plus,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
  Workflow,
  Wrench,
} from 'lucide-react'
import { Button, ConfirmDialog, Input, Modal, Select, Textarea, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { AgentMark, FAMILY, familyOf } from '../agents'
import { ImproveButton, errMsg } from '../Improve'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import type { Bootstrap, Pipeline, Plugin, Project, Schedule, ScheduleTemplate } from '../types'
import { MODE_INFO, Section, Toggle, timeAgo } from '../ui'

const EASE = [0.2, 0.8, 0.2, 1] as const
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return ''
  }
})()

/* ── Time: UTC on the server, local on screen ─────────────────────────── */
/** Local clock time and day shift (−1, 0, +1) for a whole UTC hour. */
function localOf(utcHour: number) {
  const d = new Date()
  d.setUTCHours(utcHour, 0, 0, 0)
  let shift = d.getDay() - d.getUTCDay()
  if (shift > 1) shift -= 7
  if (shift < -1) shift += 7
  return { h: d.getHours(), m: d.getMinutes(), shift, minutes: d.getHours() * 60 + d.getMinutes() }
}
const clock = (h: number, m: number) => new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const localWeekday = (utcWeekday: number, utcHour: number) => (utcWeekday + localOf(utcHour).shift + 7) % 7
const utcWeekday = (localDay: number, utcHour: number) => (localDay - localOf(utcHour).shift + 7) % 7

/** "Every night at 2:00 AM", "Mondays at 9:00 AM", "Every hour", "Weekdays at 6:00 AM". */
function cadence(s: Pick<Schedule, 'every' | 'hour' | 'weekday'>): string {
  if (s.every === 'hourly') {
    const m = localOf(0).m
    return m ? `Every hour at :${String(m).padStart(2, '0')}` : 'Every hour'
  }
  const l = localOf(s.hour)
  const t = clock(l.h, l.m)
  if (s.every === 'daily') return l.h < 6 || l.h >= 22 ? `Every night at ${t}` : `Every day at ${t}`
  if (s.every === 'weekdays') return l.shift === 0 ? `Weekdays at ${t}` : l.shift > 0 ? `Tue–Sat at ${t}` : `Sun–Thu at ${t}`
  return `${DAYS[localWeekday(s.weekday, s.hour)]}s at ${t}`
}

function countdown(ms: number): string {
  if (ms <= 30_000) return 'any moment now'
  const s = Math.round(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d) return `in ${d}d ${h}h`
  if (h) return `in ${h}h ${m}m`
  if (m >= 10) return `in ${m}m`
  return `in ${m}m ${s % 60}s`
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/* ── Agents on a schedule ─────────────────────────────────────────────── */
function agentsKind(a: Schedule['agents']): 'auto' | 'free' | 'specific' {
  if (!a.length) return 'auto'
  if (a.every((x) => x.provider === 'auto')) return a.some((x) => x.freeOnly) ? 'free' : 'auto'
  return 'specific'
}

function AgentsChip({ agents }: { agents: Schedule['agents'] }) {
  const k = agentsKind(agents)
  if (k !== 'specific')
    return (
      <Tooltip label={k === 'free' ? 'Hive picks the best free or plan model for the job' : 'Hive picks the best model for the job'}>
        <span className="hive-chip">
          <AgentMark provider="auto" size={16} />
          {k === 'free' ? 'Auto · free only' : 'Auto'}
        </span>
      </Tooltip>
    )
  return (
    <span className="flex flex-wrap gap-1">
      {agents.map((a, i) => (
        <span key={i} className="hive-chip">
          <AgentMark provider={a.provider} model={a.model} size={16} />
          <span className="max-w-[140px] truncate">{a.model || FAMILY[familyOf(a.provider, a.model)].name}</span>
        </span>
      ))}
    </span>
  )
}

/* ── Autopilots ───────────────────────────────────────────────────────── */
const AUTOPILOTS: { id: string; icon: typeof Wrench; hue: number }[] = [
  { id: 'auto_resume', icon: Moon, hue: 260 },
  { id: 'never_stop', icon: InfinityIcon, hue: 285 },
  { id: 'ci_fixer', icon: Wrench, hue: 155 },
  { id: 'escalation', icon: TrendingUp, hue: 40 },
  { id: 'auto_review', icon: ShieldCheck, hue: 200 },
  { id: 'judge', icon: Scale, hue: 75 },
  { id: 'smart_router', icon: Route, hue: 230 },
]

/* ── Page ─────────────────────────────────────────────────────────────── */
type Editing = { schedule?: Schedule; template?: ScheduleTemplate } | null

export default function AutomationsPage() {
  const { boot, on, pluginsVersion } = useHive()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const filter = params.get('project')
  const [data, setData] = useState<{ schedules: Schedule[]; templates: ScheduleTemplate[] } | null>(null)
  const [plugins, setPlugins] = useState<Plugin[] | null>(null)
  const [pipelineNames, setPipelineNames] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Editing>(null)

  const load = useCallback(
    () =>
      hiveApi
        .schedules(filter)
        .then((r) => setData({ schedules: r.schedules, templates: r.templates }))
        .catch((e) => toast.error(errMsg(e))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter],
  )
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => on('schedules', () => load()), [on, load])
  useEffect(() => {
    hiveApi
      .plugins()
      .then((r) => setPlugins(r.builtins))
      .catch(() => setPlugins([]))
  }, [pluginsVersion])

  // Names for schedules that run a pipeline.
  const pipelineProjects = useMemo(() => [...new Set((data?.schedules ?? []).filter((s) => s.pipelineId).map((s) => s.projectId))].sort().join(','), [data])
  useEffect(() => {
    if (!pipelineProjects) return
    let live = true
    Promise.all(pipelineProjects.split(',').map((p) => hiveApi.pipelines(p).catch(() => null))).then((rs) => {
      if (!live) return
      const m: Record<string, string> = {}
      for (const r of rs) for (const p of r?.pipelines ?? []) m[p.id] = p.name
      setPipelineNames(m)
    })
    return () => {
      live = false
    }
  }, [pipelineProjects])

  if (!boot) return null
  const schedules = data?.schedules ?? []
  const setFilter = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('project', id)
    else next.delete('project')
    setParams(next, { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
      <Hero schedules={schedules} loaded={!!data} onNew={() => setEditing({})} />

      {boot.projects.length > 1 && (
        <div className="hive-scroll -mx-1 mb-6 flex gap-1 overflow-x-auto px-1 pb-1">
          <FilterPill on={!filter} onClick={() => setFilter(null)}>
            All projects
          </FilterPill>
          {boot.projects.map((p) => (
            <FilterPill key={p.id} on={filter === p.id} onClick={() => setFilter(p.id)}>
              <span className="rounded-full size-2.5" style={{ background: projectColor(p.color) }} />
              {p.name}
            </FilterPill>
          ))}
        </div>
      )}

      {!data ? (
        <div className="mb-10 grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="hive-shimmer h-44 rounded-[18px]" />
          ))}
        </div>
      ) : schedules.length ? (
        <Section title={`Scheduled · ${schedules.length}`}>
          <motion.div layout className="grid gap-3 md:grid-cols-2">
            <AnimatePresence initial={false}>
              {schedules.map((s, i) => (
                <motion.div key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.22, delay: Math.min(i, 8) * 0.03, ease: EASE }}>
                  <ScheduleCard s={s} boot={boot} pipelineName={s.pipelineId ? pipelineNames[s.pipelineId] : undefined} onEdit={() => setEditing({ schedule: s })} onChanged={load} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </Section>
      ) : (
        <EmptyAutomations noProjects={!boot.projects.length} onNew={() => setEditing({})} />
      )}

      {!!data?.templates.length && !!boot.projects.length && (
        <Section title={schedules.length ? 'Start from a template' : 'Templates to start with'}>
          <Templates templates={data.templates} onPick={(t) => setEditing({ template: t })} />
        </Section>
      )}

      <Autopilots plugins={plugins} admin={boot.me.admin} />

      <Editor editing={editing} onClose={() => setEditing(null)} boot={boot} defaultProject={filter} onSaved={load} />
    </div>
  )
}

function FilterPill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13px] transition-colors', on ? 'bg-bg-surface text-text-primary shadow-sm ring-1 ring-[color-mix(in_oklab,var(--color-text-primary)_8%,transparent)]' : 'text-text-muted hover:bg-text-primary/[0.04] hover:text-text-secondary')}
    >
      {children}
    </button>
  )
}

/* ── Hero ─────────────────────────────────────────────────────────────── */
function Hero({ schedules, loaded, onNew }: { schedules: Schedule[]; loaded: boolean; onNew: () => void }) {
  const now = useNow()
  const next = schedules.filter((s) => s.enabled && s.nextRun).sort((a, b) => (a.nextRun ?? 0) - (b.nextRun ?? 0))[0]
  const active = schedules.filter((s) => s.enabled).length
  return (
    <div className="hive-card relative mb-6 overflow-hidden p-6 sm:p-7">
      <div className="relative flex flex-wrap items-start gap-5">
        <span className="hive-tile size-12" style={{ ['--tile' as string]: 'oklch(66% 0.15 270)' }}>
          <CalendarClock className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-text-primary">Automations</h1>
          <p className="mt-1 text-[14px] text-text-muted">Hive keeps working while you sleep.</p>
          <div className="mt-3 min-h-7">
            {!loaded ? (
              <div className="hive-shimmer h-7 w-60 rounded-full" />
            ) : next ? (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: EASE }} className="inline-flex max-w-full items-center gap-2 rounded-full bg-text-primary/[0.05] py-1 pl-2.5 pr-3 text-[12.5px]">
                <span className="relative flex size-2">
                  <span className="hive-ping absolute inset-0 rounded-full bg-state-success" />
                  <span className="relative size-2 rounded-full bg-state-success" />
                </span>
                <span className="truncate text-text-secondary">
                  Next: <b className="font-medium text-text-primary">{next.title}</b>
                </span>
                <span className="shrink-0 tabular-nums text-text-muted" title={new Date(next.nextRun!).toLocaleString()}>
                  {countdown(next.nextRun! - now)}
                </span>
              </motion.div>
            ) : (
              <span className="inline-flex items-center gap-2 text-[12.5px] text-text-muted">
                <span className="size-2 rounded-full bg-text-muted/50" /> Nothing scheduled yet
              </span>
            )}
            {loaded && active > 0 && <span className="ml-2 text-[12px] text-text-muted">{active} active</span>}
          </div>
        </div>
        <Button onClick={onNew}>
          <Plus /> New automation
        </Button>
      </div>
    </div>
  )
}

/* ── Schedule card ────────────────────────────────────────────────────── */
function ScheduleCard({ s, boot, pipelineName, onEdit, onChanged }: { s: Schedule; boot: Bootstrap; pipelineName?: string; onEdit: () => void; onChanged: () => void }) {
  const toast = useToast()
  const now = useNow(15000)
  const [running, setRunning] = useState(false)
  const [del, setDel] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [enabled, setEnabled] = useState(s.enabled)
  useEffect(() => setEnabled(s.enabled), [s.enabled])
  const project = boot.projects.find((p) => p.id === s.projectId)

  const toggle = async (v: boolean) => {
    setEnabled(v)
    try {
      await hiveApi.saveSchedule({ id: s.id, projectId: s.projectId, title: s.title, prompt: s.prompt, every: s.every, hour: s.hour, weekday: s.weekday, agents: s.agents, mode: s.mode, enabled: v, pipelineId: s.pipelineId })
      toast.success(v ? `“${s.title}” is on` : `“${s.title}” is paused`)
      onChanged()
    } catch (e) {
      setEnabled(!v)
      toast.error(errMsg(e))
    }
  }
  const runNow = async () => {
    setRunning(true)
    try {
      await hiveApi.runSchedule(s.id)
      toast.success('Started — it’ll appear in the project’s sessions in a moment')
      onChanged()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className={cn('hive-card hive-card-hover flex h-full flex-col overflow-hidden', !enabled && 'opacity-75')}>
      <div className="flex items-start gap-3 p-4 pb-3">
        <span className="hive-tile size-10" style={{ ['--tile' as string]: enabled ? (project ? projectColor(project.color) : 'var(--color-accent-brand)') : 'var(--color-text-muted)' }}>
          {s.pipelineId ? <Workflow className="size-4.5" /> : <Clock className="size-4.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onEdit} className="block max-w-full truncate text-left text-[14.5px] font-semibold text-text-primary hover:underline">
            {s.title}
          </button>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px]">
            <span className="font-medium text-text-secondary">{cadence(s)}</span>
            {project && (
              <span className="inline-flex items-center gap-1 text-text-muted">
                <span className="rounded-full size-2" style={{ background: projectColor(project.color) }} />
                {project.name}
              </span>
            )}
          </div>
        </div>
        <Toggle on={enabled} onChange={toggle} label={enabled ? `Pause ${s.title}` : `Turn on ${s.title}`} />
      </div>

      <div className="px-4">
        {s.pipelineId ? (
          <div className="flex items-center gap-1.5 text-[12.5px] text-text-secondary">
            <Workflow className="size-3.5 text-text-muted" /> Runs pipeline <b className="font-medium text-text-primary">{pipelineName ?? '…'}</b>
          </div>
        ) : null}
        {s.prompt && <p className="mt-1 line-clamp-2 text-[12.5px] text-text-muted">{s.prompt}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {!s.pipelineId && <AgentsChip agents={s.agents} />}
          {!s.pipelineId && s.mode !== 'solo' && (
            <Tooltip label={MODE_INFO[s.mode]?.hint ?? ''}>
              <span className="hive-chip">{MODE_INFO[s.mode]?.label ?? s.mode}</span>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 px-4 pt-4 text-[12px]">
        <div>
          <div className="text-[11px] text-text-muted">Last run</div>
          {s.lastRun ? (
            <div className="flex items-center gap-1.5 text-text-secondary">
              <span className="tabular-nums" title={new Date(s.lastRun).toLocaleString()}>
                {timeAgo(s.lastRun) === 'now' ? 'just now' : `${timeAgo(s.lastRun)} ago`}
              </span>
              {s.lastTask && (
                <Link to={`/hive/p/${s.projectId}/t/${s.lastTask}`} className="inline-flex items-center gap-0.5 font-medium text-accent-brand hover:underline">
                  Open <ArrowUpRight className="size-3" />
                </Link>
              )}
            </div>
          ) : (
            <div className="text-text-muted">Not yet</div>
          )}
        </div>
        <div>
          <div className="text-[11px] text-text-muted">Next run</div>
          <div className="tabular-nums text-text-secondary" title={s.nextRun ? new Date(s.nextRun).toLocaleString() : undefined}>
            {!enabled ? 'Paused' : s.nextRun ? countdown(s.nextRun - now) : '—'}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 border-t hive-line px-2.5 py-2">
        <Button size="sm" variant="ghost" onClick={runNow} loading={running}>
          {!running && <Play />} Run now
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
        <Tooltip label="Delete automation">
          <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label={`Delete ${s.title}`} onClick={() => setDel(true)}>
            <Trash2 />
          </Button>
        </Tooltip>
      </div>
      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        title="Delete this automation?"
        message={`“${s.title}” will stop running. Sessions it already started are kept.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true)
          try {
            await hiveApi.deleteSchedule(s.id)
            toast.success('Automation deleted')
            setDel(false)
            onChanged()
          } catch (e) {
            toast.error(errMsg(e))
          } finally {
            setDeleting(false)
          }
        }}
      />
    </div>
  )
}

/* ── Empty state & templates ──────────────────────────────────────────── */
function EmptyAutomations({ noProjects, onNew }: { noProjects: boolean; onNew: () => void }) {
  const steps = [
    { icon: Sparkles, t: 'Say what to do', s: 'Plain words — “keep the build green”, “update dependencies safely”. Or run a pipeline.' },
    { icon: CalendarClock, t: 'Pick when', s: 'Every hour, every night, weekdays, or one day a week — in your time zone.' },
    { icon: BadgeCheck, t: 'Wake up to results', s: 'Each run is a normal session: changes to review, a PR, or a report.' },
  ]
  return (
    <div className="hive-card mb-10 p-6 text-center sm:p-8">
      <span className="hive-tile mx-auto size-12" style={{ ['--tile' as string]: 'oklch(66% 0.15 270)' }}>
        <Timer className="size-5" />
      </span>
      <h2 className="mt-3 text-[17px] font-semibold text-text-primary">No automations yet</h2>
      <p className="mx-auto mt-1 max-w-lg text-[13px] text-text-muted">An automation is a job Hive starts on its own, on a schedule — so tests get fixed, dependencies get updated and docs stay fresh without anyone asking.</p>
      <div className="mx-auto mt-6 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {steps.map((x, i) => (
          <motion.div key={x.t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: i * 0.05, ease: EASE }} className="rounded-2xl border hive-line bg-bg-app/40 p-3.5">
            <x.icon className="size-4 text-accent-brand" />
            <div className="mt-1.5 text-[13px] font-medium text-text-primary">{x.t}</div>
            <div className="text-[12px] text-text-muted">{x.s}</div>
          </motion.div>
        ))}
      </div>
      {noProjects ? (
        <p className="mt-6 text-[12.5px] text-text-muted">
          Automations run inside a project.{' '}
          <Link to="/hive/p/new" className="font-medium text-accent-brand hover:underline">
            Create a project first
          </Link>
          .
        </p>
      ) : (
        <Button className="mt-6" onClick={onNew}>
          <Plus /> New automation
        </Button>
      )}
    </div>
  )
}

const TEMPLATE_STYLE: Record<string, { icon: typeof Wrench; hue: number }> = {
  'nightly-tests': { icon: BadgeCheck, hue: 155 },
  deps: { icon: TrendingUp, hue: 220 },
  security: { icon: ShieldCheck, hue: 15 },
  todos: { icon: Sparkles, hue: 285 },
  docs: { icon: Pencil, hue: 75 },
}

function Templates({ templates, onPick, compact }: { templates: ScheduleTemplate[]; onPick: (t: ScheduleTemplate) => void; compact?: boolean }) {
  return (
    <div className={cn('grid gap-3', compact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3')}>
      {templates.map((t, i) => {
        const st = TEMPLATE_STYLE[t.id] ?? { icon: Clock, hue: 260 }
        const color = `oklch(68% 0.13 ${st.hue})`
        return (
          <motion.button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04, ease: EASE }}
            className={cn('hive-card hive-card-hover hive-lift group relative overflow-hidden text-left', compact ? 'p-3' : 'p-4')}
          >
            <span className="relative flex items-start gap-3">
              <span className={cn('hive-tile', compact ? 'size-8' : 'size-9')} style={{ ['--tile' as string]: color }}>
                <st.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-text-primary">{t.title.replace(/^(Nightly|Weekly):\s*/, '')}</span>
                <span className="mt-0.5 block text-[12px] font-medium text-text-secondary">{cadence({ every: t.every, hour: t.hour, weekday: t.weekday ?? 1 })}</span>
                {!compact && <span className="mt-1.5 line-clamp-2 block text-[12px] text-text-muted">{t.prompt}</span>}
                <span className="mt-2 flex items-center gap-1.5">
                  <AgentsChip agents={t.agents} />
                  {t.mode === 'review' && <span className="hive-chip">Read-only review</span>}
                </span>
              </span>
              <Plus className="size-4 shrink-0 text-text-muted transition-colors group-hover:text-accent-brand" />
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ── Autopilots ───────────────────────────────────────────────────────── */
function Autopilots({ plugins, admin }: { plugins: Plugin[] | null; admin: boolean }) {
  const toast = useToast()
  const [local, setLocal] = useState<Record<string, boolean>>({})
  useEffect(() => setLocal({}), [plugins])
  const list = AUTOPILOTS.map((a) => ({ ...a, p: plugins?.find((x) => x.id === a.id) })).filter((x) => x.p)
  if (plugins && !list.length) return null
  return (
    <Section
      title="Autopilots"
      action={
        !admin && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
            <Lock className="size-3.5" /> Only admins change these workspace-wide
          </span>
        )
      }
    >
      <p className="-mt-1 mb-3 text-[12.5px] text-text-muted">Always-on helpers that keep sessions moving without anyone watching. They apply to every project unless a project overrides them in Plugins.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {!plugins &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="hive-shimmer h-24 rounded-[18px]" />
          ))}
        {list.map(({ id, icon: Icon, hue, p }, i) => {
          const on = local[id] ?? p!.enabled
          return (
            <motion.div key={id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03, ease: EASE }} className={cn('hive-card flex items-start gap-3 p-4 transition-shadow', on && 'ring-1 ring-accent-brand/20')}>
              <span className="hive-tile size-9" style={{ ['--tile' as string]: on ? `oklch(68% 0.13 ${hue})` : 'var(--color-text-muted)' }}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-medium text-text-primary">{p!.name}</span>
                  <span className={cn('text-[11px] font-medium', on ? 'text-state-success' : 'text-text-muted')}>{on ? 'On' : 'Off'}</span>
                </div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-text-muted">{p!.description}</p>
              </div>
              <Tooltip label={admin ? (on ? 'Turn off for all projects' : 'Turn on for all projects') : 'Only admins can change workspace-wide autopilots'}>
                <span>
                  <Toggle
                    on={on}
                    disabled={!admin}
                    label={`${p!.name}: ${on ? 'on' : 'off'}`}
                    onChange={async (v) => {
                      setLocal((m) => ({ ...m, [id]: v }))
                      try {
                        await hiveApi.setPlugin(id, { scope: '*', enabled: v })
                        toast.success(`${p!.name} ${v ? 'on' : 'off'}`)
                      } catch (e) {
                        setLocal((m) => ({ ...m, [id]: !v }))
                        toast.error(errMsg(e))
                      }
                    }}
                  />
                </span>
              </Tooltip>
            </motion.div>
          )
        })}
      </div>
    </Section>
  )
}

/* ── Editor ───────────────────────────────────────────────────────────── */
interface Draft {
  id?: string
  projectId: string
  title: string
  what: 'prompt' | 'pipeline'
  prompt: string
  pipelineId: string
  every: Schedule['every']
  hour: number // UTC
  day: number // local weekday
  agents: 'auto' | 'free' | 'keep'
  keepAgents: Schedule['agents']
  mode: 'solo' | 'review'
  enabled: boolean
  template: string | null
}

const blankDraft = (projectId: string): Draft => {
  // Default: 2:00 local time, rounded to the nearest whole UTC hour.
  const d = new Date()
  d.setHours(2, 0, 0, 0)
  return { projectId, title: '', what: 'prompt', prompt: '', pipelineId: '', every: 'daily', hour: d.getUTCHours(), day: 1, agents: 'auto', keepAgents: [], mode: 'solo', enabled: true, template: null }
}

function fromTemplate(base: Draft, t: ScheduleTemplate): Draft {
  return {
    ...base,
    title: t.title,
    what: 'prompt',
    prompt: t.prompt,
    pipelineId: '',
    every: t.every,
    hour: t.hour,
    day: localWeekday(t.weekday ?? 1, t.hour),
    agents: agentsKind(t.agents) === 'free' ? 'free' : 'auto',
    mode: t.mode === 'review' ? 'review' : 'solo',
    template: t.id,
  }
}

function fromSchedule(s: Schedule): Draft {
  const k = agentsKind(s.agents)
  return {
    id: s.id,
    projectId: s.projectId,
    title: s.title,
    what: s.pipelineId ? 'pipeline' : 'prompt',
    prompt: s.prompt,
    pipelineId: s.pipelineId ?? '',
    every: s.every,
    hour: s.hour,
    day: localWeekday(s.weekday, s.hour),
    agents: k === 'specific' ? 'keep' : k,
    keepAgents: s.agents,
    mode: s.mode === 'review' ? 'review' : 'solo',
    enabled: s.enabled,
    template: s.template,
  }
}

const CADENCES: { id: Schedule['every']; label: string; hint: string }[] = [
  { id: 'hourly', label: 'Hourly', hint: 'On the hour' },
  { id: 'daily', label: 'Daily', hint: 'Once a day' },
  { id: 'weekdays', label: 'Weekdays', hint: 'Mon–Fri' },
  { id: 'weekly', label: 'Weekly', hint: 'One day a week' },
]

function Editor({ editing, onClose, boot, defaultProject, onSaved }: { editing: Editing; onClose: () => void; boot: Bootstrap; defaultProject: string | null; onSaved: () => void }) {
  const toast = useToast()
  const [d, setD] = useState<Draft>(() => blankDraft(''))
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[] | null>(null)
  const [busy, setBusy] = useState(false)
  const open = !!editing
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    if (!editing) return
    const pid = defaultProject && boot.projects.some((p) => p.id === defaultProject) ? defaultProject : (boot.projects[0]?.id ?? '')
    const base = blankDraft(pid)
    setD(editing.schedule ? fromSchedule(editing.schedule) : editing.template ? fromTemplate(base, editing.template) : base)
  }, [editing, boot.projects, defaultProject])

  useEffect(() => {
    if (open && !templates.length)
      hiveApi
        .schedules('__none__')
        .then((r) => setTemplates(r.templates))
        .catch(() => {})
  }, [open, templates.length])

  useEffect(() => {
    if (!open || !d.projectId) return
    let live = true
    setPipelines(null)
    hiveApi
      .pipelines(d.projectId)
      .then((r) => live && setPipelines(r.pipelines))
      .catch(() => live && setPipelines([]))
    return () => {
      live = false
    }
  }, [open, d.projectId])

  const hours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, utc) => ({ utc, ...localOf(utc) }))
        .sort((a, b) => a.minutes - b.minutes)
        .map((x) => ({ value: x.utc, label: clock(x.h, x.m) })),
    [],
  )
  const local = localOf(d.hour)
  const project: Project | undefined = boot.projects.find((p) => p.id === d.projectId)
  const ready = !!d.projectId && (d.what === 'pipeline' ? !!d.pipelineId : !!d.prompt.trim())
  const preview = cadence({ every: d.every, hour: d.hour, weekday: utcWeekday(d.day, d.hour) })

  const save = async () => {
    if (!ready || busy) return
    setBusy(true)
    const agents = d.agents === 'keep' && d.keepAgents.length ? d.keepAgents : d.agents === 'free' ? [{ provider: 'auto', keyId: 'auto', freeOnly: true }] : [{ provider: 'auto', keyId: 'auto' }]
    const pipelineName = pipelines?.find((p) => p.id === d.pipelineId)?.name
    try {
      await hiveApi.saveSchedule({
        id: d.id,
        projectId: d.projectId,
        title: d.title.trim() || (d.what === 'pipeline' ? `Run ${pipelineName ?? 'pipeline'}` : d.prompt.trim().split('\n')[0].slice(0, 60)),
        prompt: d.prompt.trim(),
        pipelineId: d.what === 'pipeline' ? d.pipelineId : null,
        every: d.every,
        hour: d.every === 'hourly' ? 0 : d.hour,
        weekday: utcWeekday(d.day, d.hour),
        agents,
        mode: d.mode,
        enabled: d.enabled,
        template: d.template,
      })
      toast.success(d.id ? 'Automation saved' : `Scheduled — ${preview.charAt(0).toLowerCase()}${preview.slice(1)}`)
      onSaved()
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const label = 'mb-1.5 block text-[12px] font-medium text-text-secondary'
  return (
    <Modal open={open} onClose={onClose} size="xl" title={d.id ? 'Edit automation' : 'New automation'} description="A job Hive starts on its own, on a schedule. Each run becomes a normal session you can open and review.">
      <div className="space-y-6">
        {!d.id && templates.length > 0 && (
          <div>
            <span className={label}>Start from a template</span>
            <Templates compact templates={templates} onPick={(t) => setD((x) => fromTemplate(x, t))} />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={label}>Project</span>
            <Select value={d.projectId} onValueChange={(v) => setD((x) => ({ ...x, projectId: v, pipelineId: '' }))} disabled={!!d.id} placeholder="Pick a project" aria-label="Project">
              {boot.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            {d.id && <p className="mt-1 text-[11.5px] text-text-muted">An automation stays in its project.</p>}
          </div>
          <div>
            <span className={label}>Title</span>
            <Input value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Nightly: keep the build green" maxLength={120} aria-label="Title" />
          </div>
        </div>

        <div>
          <span className={label}>What should happen</span>
          <div role="radiogroup" aria-label="What should happen" className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-text-primary/[0.05] p-1 sm:w-96">
            {(
              [
                ['prompt', 'Describe a task', Sparkles],
                ['pipeline', 'Run a pipeline', Workflow],
              ] as const
            ).map(([id, l, Icon]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={d.what === id}
                onClick={() => set('what', id)}
                className={cn('flex h-9 items-center justify-center gap-1.5 rounded-lg text-[12.5px] transition-colors', d.what === id ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}
              >
                <Icon className="size-3.5" /> {l}
              </button>
            ))}
          </div>
          {d.what === 'pipeline' && (
            <div className="mb-3">
              {pipelines == null ? (
                <div className="hive-shimmer h-10 rounded-xl" />
              ) : pipelines.length ? (
                <Select value={d.pipelineId} onValueChange={(v) => set('pipelineId', v)} placeholder="Pick a pipeline" aria-label="Pipeline">
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.stages.length} stages
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="rounded-xl border border-dashed hive-line px-3 py-3 text-[12.5px] text-text-muted">{project?.name ?? 'This project'} has no pipelines yet. Build one in the project’s Pipelines tab, or describe a task instead.</p>
              )}
            </div>
          )}
          <div className="hive-composer rounded-2xl p-2">
            <Textarea
              value={d.prompt}
              onChange={(e) => set('prompt', e.target.value)}
              placeholder={d.what === 'pipeline' ? 'Optional: what the pipeline should work on each time' : 'In plain words: what should the agents do each time? e.g. “Run the tests and fix anything failing with small, safe changes.”'}
              aria-label={d.what === 'pipeline' ? 'Request for the pipeline' : 'What to do'}
              className="min-h-[120px] border-0 bg-transparent shadow-none focus:shadow-none"
            />
            <div className="flex items-center justify-end px-1 pt-1">
              <ImproveButton value={d.prompt} onApply={(p) => set('prompt', p)} mode="task" projectId={d.projectId || null} label />
            </div>
          </div>
        </div>

        <div>
          <span className={label}>When</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CADENCES.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={d.every === c.id}
                onClick={() => set('every', c.id)}
                className={cn('rounded-xl border px-3 py-2 text-left transition-colors', d.every === c.id ? 'border-accent-brand bg-accent-brand/8' : 'hive-line hover:bg-text-primary/[0.03]')}
              >
                <div className="text-[13px] font-medium text-text-primary">{c.label}</div>
                <div className="text-[11px] text-text-muted">{c.hint}</div>
              </button>
            ))}
          </div>
          {d.every !== 'hourly' && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              {d.every === 'weekly' && (
                <div className="w-full sm:w-auto">
                  <span className="mb-1 block text-[11.5px] text-text-muted">Day</span>
                  <div role="radiogroup" aria-label="Day of the week" className="grid grid-cols-7 gap-1 rounded-xl bg-text-primary/[0.05] p-1">
                    {[1, 2, 3, 4, 5, 6, 0].map((i) => (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={d.day === i}
                        aria-label={DAYS[i]}
                        onClick={() => set('day', i)}
                        className={cn('h-9 min-w-10 rounded-lg px-1 text-[12px] transition-colors', d.day === i ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}
                      >
                        {DAYS_SHORT[i]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="w-40">
                <span className="mb-1 block text-[11.5px] text-text-muted">Time (your time)</span>
                <Select value={String(d.hour)} onValueChange={(v) => set('hour', Number(v))} aria-label="Time of day">
                  {hours.map((h) => (
                    <option key={h.value} value={String(h.value)}>
                      {h.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[12px] text-text-muted">
            <CalendarClock className="size-3.5 text-accent-brand" />
            <span className="font-medium text-text-secondary">{preview}</span>
            {d.every !== 'hourly' && (
              <span>
                · {TZ ? `${TZ.replace(/_/g, ' ')} time` : 'your time'} ({String(d.hour).padStart(2, '0')}:00 UTC{local.shift !== 0 && d.every !== 'daily' ? `, ${local.shift > 0 ? 'the day before' : 'the day after'} in UTC` : ''})
              </span>
            )}
          </p>
        </div>

        {d.what === 'prompt' && (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <span className={label}>Agents</span>
              <div role="radiogroup" aria-label="Agents" className="space-y-2">
                {(
                  [
                    { id: 'auto', t: 'Auto — best model for the job', s: 'Hive picks per run: free and plan models first, strong models where they’re needed.' },
                    { id: 'free', t: 'Free models only', s: 'Never adds to the bill. Great for nightly chores.' },
                    ...(d.keepAgents.length && agentsKind(d.keepAgents) === 'specific' ? [{ id: 'keep' as const, t: 'Keep the current agents', s: '' }] : []),
                  ] as { id: Draft['agents']; t: string; s: string }[]
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={d.agents === o.id}
                    onClick={() => set('agents', o.id)}
                    className={cn('flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors', d.agents === o.id ? 'border-accent-brand bg-accent-brand/8' : 'hive-line hover:bg-text-primary/[0.03]')}
                  >
                    <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2', d.agents === o.id ? 'border-accent-brand' : 'border-text-muted/40')}>{d.agents === o.id && <span className="size-1.5 rounded-full bg-accent-brand" />}</span>
                    {o.id === 'keep' ? <AgentsChip agents={d.keepAgents} /> : <AgentMark provider="auto" size={22} />}
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-text-primary">{o.t}</span>
                      {o.s && <span className="block text-[12px] text-text-muted">{o.s}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={label}>How they work</span>
              <Select value={d.mode} onValueChange={(v) => set('mode', v as Draft['mode'])} aria-label="Mode">
                <option value="solo">{MODE_INFO.solo.label} — make changes</option>
                <option value="review">{MODE_INFO.review.label} — read-only report</option>
              </Select>
              <p className="mt-1.5 text-[11.5px] text-text-muted">{MODE_INFO[d.mode].hint}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t hive-line pt-4">
          <label className="flex items-center gap-2 text-[13px] text-text-secondary">
            <Toggle on={d.enabled} onChange={(v) => set('enabled', v)} label="Enabled" />
            {d.enabled ? 'On' : 'Paused'}
          </label>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!ready} loading={busy}>
              {d.id ? 'Save' : 'Schedule it'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
