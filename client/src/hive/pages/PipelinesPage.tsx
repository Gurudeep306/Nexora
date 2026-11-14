/* ────────────────────────────────────────────────────────────────────────
   Pipelines: chains of AI agents that turn one request into shipped work —
   Plan → Build → Test → Review ⟲ Fix → Docs → Ship. Design one by talking
   to the Architect, start from a template, or build it stage by stage.
   Runs show live as a progress rail of their stages.
   ──────────────────────────────────────────────────────────────────────── */
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  GitPullRequest,
  Layers,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Rocket,
  ScanEye,
  Search,
  Send,
  Server,
  SkipForward,
  Sparkles,
  Square,
  Trash2,
  Workflow,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button, ConfirmDialog, Input, Modal, Select, Textarea, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { ImproveButton, errMsg } from '../Improve'
import { useHive } from '../store'
import type { ArchitectReply, Pipeline, PipelineRun, PipelineStage, PipelineTemplate, Project, StageAgent, TaskKind } from '../types'
import { PageTitle, Toggle, duration, timeAgo, vendorName } from '../ui'

const EASE = [0.2, 0.8, 0.2, 1] as const

/* ── Kinds ────────────────────────────────────────────────────────────── */
const KINDS: TaskKind[] = ['coding', 'review', 'writing', 'reading', 'search', 'mechanical', 'hard', 'chat']
const KIND_FALLBACK: Record<TaskKind, { label: string; hint: string }> = {
  chat: { label: 'Conversation', hint: 'Talk things through' },
  mechanical: { label: 'Simple edits', hint: 'Small, mechanical changes' },
  reading: { label: 'Reading & planning', hint: 'Understand the code and plan the work' },
  search: { label: 'Research', hint: 'Look things up' },
  writing: { label: 'Writing', hint: 'Docs, copy and release notes' },
  coding: { label: 'Coding', hint: 'Build features and fix bugs' },
  review: { label: 'Review', hint: 'Check the work and ask for changes' },
  hard: { label: 'Hard problems', hint: 'Tricky reasoning and architecture' },
}
const KIND_STYLE: Record<TaskKind, { icon: LucideIcon; hue: number }> = {
  chat: { icon: MessageSquare, hue: 250 },
  mechanical: { icon: Wrench, hue: 200 },
  reading: { icon: BookOpen, hue: 220 },
  search: { icon: Search, hue: 190 },
  writing: { icon: FileText, hue: 330 },
  coding: { icon: Code2, hue: 285 },
  review: { icon: ScanEye, hue: 55 },
  hard: { icon: Brain, hue: 15 },
}
const SHIP_HUE = 150

function stageLook(s: PipelineStage): { icon: LucideIcon; color: string } {
  if (s.ship) return { icon: Rocket, color: `oklch(68% 0.14 ${SHIP_HUE})` }
  const n = s.name.toLowerCase()
  const k = KIND_STYLE[s.kind] ?? KIND_STYLE.coding
  const icon = /plan/.test(n) ? ListChecks : k.icon
  return { icon, color: `oklch(68% 0.13 ${k.hue})` }
}

type KindMap = Record<TaskKind, { label: string; hint: string }>

/* ── Stage run status ─────────────────────────────────────────────────── */
type StageState = 'pending' | 'running' | 'done' | 'passed' | 'changes' | 'failed' | 'skipped'
const STATE: Record<StageState, { label: string; color: string }> = {
  pending: { label: 'Waiting', color: 'var(--color-text-muted)' },
  running: { label: 'Working', color: 'var(--color-accent-brand)' },
  done: { label: 'Done', color: 'var(--color-state-success)' },
  passed: { label: 'Passed', color: 'var(--color-state-success)' },
  changes: { label: 'Asked for changes', color: 'var(--color-state-warning)' },
  failed: { label: 'Failed', color: 'var(--color-state-error)' },
  skipped: { label: 'Skipped', color: 'var(--color-text-muted)' },
}
const RUN_STATUS: Record<PipelineRun['status'], { label: string; color: string }> = {
  queued: { label: 'Queued', color: 'var(--color-text-muted)' },
  running: { label: 'Running', color: 'var(--color-accent-brand)' },
  done: { label: 'Finished', color: 'var(--color-state-success)' },
  failed: { label: 'Failed', color: 'var(--color-state-error)' },
  stopped: { label: 'Stopped', color: 'var(--color-text-muted)' },
}

function stageStates(stages: PipelineStage[], run: PipelineRun): StageState[] {
  const last = new Map<string, string>()
  for (const e of run.log) last.set(e.stage, e.status)
  return stages.map((s, i) => {
    const st = last.get(s.name)
    if (st && st in STATE) {
      if (st === 'running' && run.status !== 'running' && run.status !== 'queued') return run.status === 'failed' ? 'failed' : 'skipped'
      return st as StageState
    }
    if (run.status === 'running' && i === run.stageIndex) return 'running'
    return 'pending'
  })
}

const newAgent = (): StageAgent => ({ mode: 'auto' })
const newStage = (name = 'New stage', kind: TaskKind = 'coding'): PipelineStage => ({ name, kind, instructions: '', agents: [newAgent()] })

const STARTERS = [
  'Ship small features end to end on free models',
  'Fix bugs with a regression test and a cross-lab review',
  'Race three models on hard tasks and keep the best',
  'Write docs and release notes for every merged change',
]

/* ════════════════════════════════════════════════════════════════════════ */
export default function PipelinesPage() {
  const { boot, on } = useHive()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const projects = useMemo(() => boot?.projects ?? [], [boot])
  const projectId = params.get('project') && projects.some((p) => p.id === params.get('project')) ? params.get('project')! : (projects[0]?.id ?? null)
  const project = projects.find((p) => p.id === projectId) ?? null

  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<PipelineTemplate[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [kinds, setKinds] = useState<KindMap>(KIND_FALLBACK)
  const [editing, setEditing] = useState<Draft | null>(null)
  const [running, setRunning] = useState<Pipeline | null>(null)
  const [deleting, setDeleting] = useState<Pipeline | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const architectRef = useRef<HTMLDivElement>(null)
  const templatesRef = useRef<HTMLDivElement>(null)
  const runsRef = useRef<HTMLDivElement>(null)

  const load = useCallback(
    async (quiet = false) => {
      if (!projectId) {
        setLoading(false)
        return
      }
      if (!quiet) setLoading(true)
      try {
        const r = await hiveApi.pipelines(projectId)
        setTemplates(r.templates)
        setPipelines(r.pipelines)
        setRuns(r.runs)
      } catch (e) {
        if (!quiet) toast.error('Couldn’t load pipelines', errMsg(e))
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId],
  )

  useEffect(() => {
    setEditing(null)
    void load()
  }, [load])

  useEffect(() => {
    hiveApi
      .catalog()
      .then((r) => setKinds({ ...KIND_FALLBACK, ...r.kinds }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const off1 = on('pipelines', () => void load(true))
    const off2 = on('pipeline_run', (run: PipelineRun) => {
      if (!run || run.projectId !== projectId) return
      setRuns((l) => (l.some((x) => x.id === run.id) ? l.map((x) => (x.id === run.id ? run : x)) : [run, ...l]))
    })
    return () => {
      off1()
      off2()
    }
  }, [on, load, projectId])

  const byId = useMemo(() => new Map(pipelines.map((p) => [p.id, p])), [pipelines])
  const lastRun = useMemo(() => {
    const m = new Map<string, PipelineRun>()
    for (const r of [...runs].sort((a, b) => a.createdAt - b.createdAt)) m.set(r.pipelineId, r)
    return m
  }, [runs])
  const sortedRuns = useMemo(() => [...runs].sort((a, b) => b.createdAt - a.createdAt), [runs])

  const scrollTo = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const saveNew = async (p: { name: string; description?: string; stages: PipelineStage[] }, note = 'Pipeline saved') => {
    if (!projectId) return null
    try {
      const r = await hiveApi.savePipeline({ projectId, name: p.name, description: p.description ?? '', stages: p.stages })
      setPipelines((l) => (l.some((x) => x.id === r.pipeline.id) ? l : [r.pipeline, ...l]))
      toast.success(note, r.pipeline.name)
      return r.pipeline
    } catch (e) {
      toast.error('Couldn’t save the pipeline', errMsg(e))
      return null
    }
  }

  const doDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await hiveApi.deletePipeline(deleting.id)
      setPipelines((l) => l.filter((x) => x.id !== deleting.id))
      toast.success('Pipeline deleted', deleting.name)
      setDeleting(null)
    } catch (e) {
      toast.error('Couldn’t delete it', errMsg(e))
    } finally {
      setDeleteBusy(false)
    }
  }

  const openEditor = (d: Draft) => {
    setEditing(d)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!boot) return <PageSkeleton />

  if (!projects.length)
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <PageTitle icon={<Workflow />} title="Pipelines" sub="Chains of agents that turn a request into shipped work." />
        <div className="hive-card p-8 text-center">
          <Workflow className="mx-auto size-6 text-text-muted" />
          <div className="mt-2 text-[14px] font-medium">Create a project first</div>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-text-muted">Pipelines live inside a project — they work on its repository. Connect a repo from Home, then come back to build one.</p>
          <Link to="/hive" className="mt-4 inline-block">
            <Button size="sm">Go to Home</Button>
          </Link>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
      <PageTitle icon={<Workflow />} title="Pipelines" sub="Chains of AI agents that take one request all the way to a pull request — planning, building, testing, reviewing and shipping.">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select aria-label="Project" value={projectId ?? ''} onValueChange={(v) => setParams({ project: v })} className="h-9 min-w-[180px] flex-1 sm:flex-none">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          {!editing && (
            <Button onClick={() => openEditor(blankDraft())}>
              <Plus /> New pipeline
            </Button>
          )}
        </div>
      </PageTitle>

      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.div key="editor" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: EASE }}>
            <Editor
              draft={editing}
              kinds={kinds}
              project={project}
              onCancel={() => setEditing(null)}
              onSaved={(p) => {
                setPipelines((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [p, ...l]))
                setEditing(null)
              }}
            />
          </motion.div>
        ) : (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: EASE }} className="space-y-10">
            {/* Pipelines */}
            <section>
              <SectionHead icon={Workflow} title="This project’s pipelines" count={loading ? undefined : pipelines.length} />
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="hive-card h-[170px] p-5">
                      <div className="hive-shimmer h-4 w-40 rounded" />
                      <div className="hive-shimmer mt-2 h-3 w-64 max-w-full rounded" />
                      <div className="hive-shimmer mt-6 h-7 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : pipelines.length ? (
                <motion.div layout className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {pipelines.map((p, i) => (
                      <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 6) * 0.04, duration: 0.22, ease: EASE } }} exit={{ opacity: 0, scale: 0.98 }}>
                        <PipelineCard
                          p={p}
                          last={lastRun.get(p.id) ?? null}
                          onRun={() => setRunning(p)}
                          onEdit={() => openEditor({ id: p.id, name: p.name, description: p.description, stages: structuredClone(p.stages) })}
                          onDuplicate={() => void saveNew({ name: `${p.name} (copy)`, description: p.description, stages: p.stages }, 'Duplicated')}
                          onDelete={() => setDeleting(p)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <EmptyPipelines onArchitect={() => scrollTo(architectRef.current)} onTemplates={() => scrollTo(templatesRef.current)} onBlank={() => openEditor(blankDraft())} />
              )}
            </section>

            {/* Architect */}
            <div ref={architectRef} className="scroll-mt-6">
              <Architect projectId={projectId} kinds={kinds} onSave={(p) => saveNew(p)} onOpen={(p) => openEditor({ id: null, name: p.name, description: p.description, stages: structuredClone(p.stages) })} />
            </div>

            {/* Runs */}
            <section ref={runsRef} className="scroll-mt-6">
              <SectionHead icon={Play} title="Runs" count={loading ? undefined : runs.length} />
              {loading ? (
                <div className="hive-card h-[120px] p-5">
                  <div className="hive-shimmer h-4 w-56 rounded" />
                  <div className="hive-shimmer mt-6 h-8 w-full rounded-full" />
                </div>
              ) : sortedRuns.length ? (
                <motion.div layout className="space-y-3">
                  <AnimatePresence initial={false}>
                    {sortedRuns.map((r) => (
                      <motion.div key={r.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: EASE }}>
                        <RunCard run={r} pipeline={byId.get(r.pipelineId) ?? null} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div className="hive-card border-dashed p-6 text-center text-[13px] text-text-muted">No runs yet. Press <b className="text-text-secondary">Run</b> on a pipeline and give it a request — you’ll watch every stage light up here.</div>
              )}
            </section>

            {/* Templates */}
            <section ref={templatesRef} className="scroll-mt-6">
              <SectionHead icon={Layers} title="Templates" hint="Proven shapes. Use one and it’s copied into this project for you to tweak." />
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="hive-shimmer h-[150px] rounded-2xl" />
                  ))}
                </div>
              ) : templates.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {templates.map((t, i) => (
                    <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.035, duration: 0.22, ease: EASE }}>
                      <TemplateCard t={t} onUse={() => saveNew({ name: t.name, description: t.description, stages: t.stages }, 'Template added')} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-[13px] text-text-muted">No templates available right now.</div>
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <RunDialog
        pipeline={running}
        project={project}
        onClose={() => setRunning(null)}
        onStarted={(run) => {
          setRuns((l) => (l.some((x) => x.id === run.id) ? l : [run, ...l]))
          setRunning(null)
          setTimeout(() => scrollTo(runsRef.current), 120)
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        loading={deleteBusy}
        danger
        title="Delete this pipeline?"
        message={
          <>
            <b>{deleting?.name}</b> will be removed for everyone. Past runs and their sessions stay.
          </>
        }
        confirmLabel="Delete"
      />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="hive-shimmer h-8 w-48 rounded-lg" />
      <div className="hive-shimmer mt-3 h-4 w-96 max-w-full rounded" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="hive-shimmer h-[170px] rounded-2xl" />
        <div className="hive-shimmer h-[170px] rounded-2xl" />
      </div>
    </div>
  )
}

function SectionHead({ icon: Icon, title, count, hint }: { icon: LucideIcon; title: string; count?: number; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold text-text-primary">
        <Icon className="size-4 text-text-muted" /> {title}
        {count != null && count > 0 && <span className="text-[12px] font-normal tabular-nums text-text-muted">{count}</span>}
      </h2>
      {hint && <p className="mt-0.5 text-[12.5px] text-text-muted">{hint}</p>}
    </div>
  )
}

/* ── Stage strip (cards, previews, templates) ─────────────────────────── */
function StageStrip({ stages, states, loops = 0, size = 'sm', className }: { stages: PipelineStage[]; states?: StageState[]; loops?: number; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div className={cn('hive-scroll -mx-1 overflow-x-auto px-1 py-1.5', className)} tabIndex={0} role="region" aria-label="Stages">
      <ol className="flex w-max items-center">
        {stages.map((s, i) => {
          const look = stageLook(s)
          const st = states?.[i]
          const color = st && st !== 'pending' ? STATE[st].color : look.color
          const active = st === 'running'
          const Icon = st === 'failed' ? X : st === 'done' || st === 'passed' ? Check : st === 'skipped' ? SkipForward : look.icon
          const prevDone = states && i > 0 && states[i - 1] !== 'pending' && states[i - 1] !== 'running'
          return (
            <Fragment key={`${s.name}-${i}`}>
              {i > 0 && (
                <li aria-hidden className={cn('relative h-px shrink-0', size === 'md' ? 'w-6' : 'w-4')}>
                  <svg className="absolute inset-0 h-px w-full overflow-visible" preserveAspectRatio="none">
                    <line x1="0" y1="0.5" x2="100%" y2="0.5" stroke={prevDone ? 'var(--color-state-success)' : 'var(--hive-line-strong)'} strokeWidth="1.5" className={cn(active && 'hive-wire')} style={active ? { stroke: 'var(--color-accent-brand)' } : undefined} />
                  </svg>
                </li>
              )}
              <li
                data-state={active ? 'active' : undefined}
                title={`${s.name}${st ? ` — ${STATE[st].label}` : ''}`}
                className={cn(
                  'hive-stage-chip relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-shadow',
                  size === 'md' ? 'h-8 px-3 text-[12.5px]' : 'h-7 px-2.5 text-[11.5px]',
                  s.optional && 'border border-dashed',
                  s.onlyOnGate && 'opacity-75',
                  st === 'pending' && 'opacity-60',
                )}
                style={{ color, background: `color-mix(in oklab, ${color} 13%, var(--color-bg-surface))`, borderColor: `color-mix(in oklab, ${color} 45%, transparent)` }}
              >
                {active ? <span className="hive-dot-run size-1.5 rounded-full" style={{ background: color }} /> : <Icon className="size-3.5" />}
                <span className="text-text-primary">{s.name}</span>
                {s.race && <Tooltip label="Race: several agents compete, the Judge keeps the best"><Sparkles className="size-3 opacity-80" /></Tooltip>}
                {s.gate && (
                  <Tooltip label={`Gate: sends work back to “${s.gate.fixStage}” — up to ${s.gate.maxLoops}×`}>
                    <span className="inline-flex items-center gap-0.5">
                      <RotateCcw className="size-3" />
                      {loops > 0 && <span className="text-[10px] tabular-nums">{loops}</span>}
                    </span>
                  </Tooltip>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </div>
  )
}

/* ── Pipeline card ────────────────────────────────────────────────────── */
function PipelineCard({ p, last, onRun, onEdit, onDuplicate, onDelete }: { p: Pipeline; last: PipelineRun | null; onRun: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const rs = last ? RUN_STATUS[last.status] : null
  return (
    <div className="hive-card hive-card-hover flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="hive-tile size-10 shrink-0" style={{ ['--tile' as string]: 'oklch(68% 0.14 285)' }}>
          <Workflow className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{p.name}</div>
          <div className="mt-0.5 line-clamp-2 text-[12.5px] text-text-muted">{p.description || `${p.stages.length} stages`}</div>
        </div>
      </div>
      <StageStrip stages={p.stages} className="mt-3" />
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        <div className="min-w-0 flex-1 text-[11.5px] text-text-muted">
          {last && rs ? (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', last.status === 'running' && 'hive-dot-run')} style={{ background: rs.color }} />
              <span style={{ color: rs.color }}>{rs.label}</span> · {timeAgo(last.createdAt) === 'now' ? 'just now' : `${timeAgo(last.createdAt)} ago`}
            </span>
          ) : (
            'Never run'
          )}
        </div>
        <Tooltip label="Edit">
          <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${p.name}`}>
            <Pencil />
          </Button>
        </Tooltip>
        <Tooltip label="Duplicate">
          <Button size="icon-sm" variant="ghost" onClick={onDuplicate} aria-label={`Duplicate ${p.name}`}>
            <Copy />
          </Button>
        </Tooltip>
        <Tooltip label="Delete">
          <Button size="icon-sm" variant="ghost" onClick={onDelete} aria-label={`Delete ${p.name}`} className="hover:text-state-error">
            <Trash2 />
          </Button>
        </Tooltip>
        <Button size="sm" onClick={onRun}>
          <Play /> Run
        </Button>
      </div>
    </div>
  )
}

function TemplateCard({ t, onUse }: { t: PipelineTemplate; onUse: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="hive-card hive-card-hover hive-lift flex h-full flex-col p-4">
      <div className="text-[13.5px] font-semibold">{t.name}</div>
      <div className="mt-0.5 line-clamp-2 text-[12px] text-text-muted">{t.description}</div>
      <StageStrip stages={t.stages} className="mt-2" />
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-[11.5px] tabular-nums text-text-muted">{t.stages.length} stages</span>
        <Button
          size="sm"
          variant="secondary"
          loading={busy}
          onClick={async () => {
            setBusy(true)
            await onUse()
            setBusy(false)
          }}
        >
          <Plus /> Use template
        </Button>
      </div>
    </div>
  )
}

/* ── Empty state with a tiny animated diagram ─────────────────────────── */
function EmptyPipelines({ onArchitect, onTemplates, onBlank }: { onArchitect: () => void; onTemplates: () => void; onBlank: () => void }) {
  const nodes = [
    { label: 'Plan', icon: ListChecks, hue: 220 },
    { label: 'Build', icon: Code2, hue: 285 },
    { label: 'Review', icon: ScanEye, hue: 55 },
    { label: 'Ship', icon: Rocket, hue: SHIP_HUE },
  ]
  return (
    <div className="hive-card relative overflow-hidden p-6 sm:p-8">
      <div className="relative grid items-center gap-6 md:grid-cols-[1.1fr_1fr]">
        <div>
          <h3 className="text-[17px] font-semibold tracking-[-0.01em]">Your request in, a pull request out</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-text-secondary">
            A pipeline is a relay team of AI agents. You describe what you want once; one agent plans it, another builds it, a third tests and reviews it — sending it back to be fixed if it isn’t right — and the last one opens a pull request. Each stage can use the best model for its job, free models only, or a specific one you trust.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onArchitect}>
              <Sparkles /> Design with the Architect
            </Button>
            <Button variant="secondary" onClick={onTemplates}>
              <Layers /> Start from a template
            </Button>
            <Button variant="ghost" onClick={onBlank}>
              <Plus /> Build from scratch
            </Button>
          </div>
        </div>
        <div className="relative mx-auto flex w-full max-w-[360px] items-center justify-between" aria-hidden>
          <svg className="absolute left-5 right-5 top-1/2 h-px w-[calc(100%-40px)] overflow-visible">
            <line x1="0" y1="0" x2="100%" y2="0" stroke="var(--hive-line-strong)" strokeWidth="1.5" className="hive-wire" />
          </svg>
          <motion.span
            className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-accent-brand shadow-[0_0_12px_var(--color-accent-brand)]"
            initial={{ left: '8%' }}
            animate={{ left: ['8%', '90%'] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <svg className="absolute -top-7 left-[54%] h-7 w-[26%] overflow-visible text-state-warning" viewBox="0 0 100 28" preserveAspectRatio="none">
            <path d="M95 26 C 90 2, 10 2, 5 26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5" className="hive-wire" vectorEffect="non-scaling-stroke" />
          </svg>
          {nodes.map((n, i) => (
            <motion.span
              key={n.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.24, ease: EASE }}
              className="relative z-[1] flex flex-col items-center gap-1.5"
            >
              <span className="hive-tile size-10 bg-bg-surface" style={{ ['--tile' as string]: `oklch(68% 0.13 ${n.hue})` }}>
                <n.icon className="size-4" />
              </span>
              <span className="text-[11px] font-medium text-text-muted">{n.label}</span>
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Runs ─────────────────────────────────────────────────────────────── */
function RunCard({ run, pipeline }: { run: PipelineRun; pipeline: Pipeline | null }) {
  const toast = useToast()
  const [stopping, setStopping] = useState(false)
  const [open, setOpen] = useState(false)
  const [, tick] = useState(0)
  const live = run.status === 'running' || run.status === 'queued'
  useEffect(() => {
    if (!live) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [live])
  const stages = pipeline?.stages ?? uniqueStagesFromLog(run)
  const states = stageStates(stages, run)
  const pr = [...run.log].reverse().find((e) => e.pr)?.pr ?? null
  const rs = RUN_STATUS[run.status]
  const done = states.filter((s) => s !== 'pending' && s !== 'running').length
  const latest = [...run.log].reverse().find((e) => e.message)
  const stop = async () => {
    setStopping(true)
    try {
      await hiveApi.stopPipelineRun(run.id)
    } catch (e) {
      toast.error('Couldn’t stop the run', errMsg(e))
    } finally {
      setStopping(false)
    }
  }
  return (
    <div className={cn('hive-card overflow-hidden', run.status === 'running' && 'ring-1 ring-accent-brand/25')}>
      <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: rs.color }}>
              <span className={cn('size-1.5 rounded-full', live && 'hive-dot-run')} style={{ background: rs.color }} />
              {rs.label}
            </span>
            <span className="text-[13.5px] font-semibold">{pipeline?.name ?? 'Deleted pipeline'}</span>
            {run.loops > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-state-warning/12 px-2 py-0.5 text-[11px] font-medium text-state-warning">
                <RotateCcw className="size-3" /> Round {run.loops + 1}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-[12.5px] text-text-secondary">{run.request}</p>
          <div className="mt-1 text-[11.5px] tabular-nums text-text-muted">
            @{run.startedBy} · {timeAgo(run.createdAt) === 'now' ? 'just now' : `${timeAgo(run.createdAt)} ago`} · {duration(run.createdAt, live ? null : run.updatedAt)} · {done}/{stages.length} stages
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pr && (
            <a href={pr.url} target="_blank" rel="noreferrer" className="hive-chip h-8 text-state-success">
              <GitPullRequest className="size-3.5" /> PR #{pr.number}
            </a>
          )}
          {run.taskId && (
            <Link to={`/hive/p/${run.projectId}/t/${run.taskId}`} className="hive-chip h-8">
              <ExternalLink className="size-3.5" /> Open session
            </Link>
          )}
          {live && (
            <Button size="sm" variant="secondary" loading={stopping} onClick={stop}>
              <Square /> Stop
            </Button>
          )}
        </div>
      </div>
      <div className="px-4 pb-3 sm:px-5">
        <RunRail stages={stages} states={states} loops={run.loops} />
        {run.status === 'failed' && run.error && <div className="mt-2 rounded-xl bg-state-error/[0.08] px-3 py-2 text-[12.5px] text-state-error">{run.error}</div>}
        {live && latest?.message && <div className="hive-thinking-text mt-2 truncate text-[12px]">{latest.message}</div>}
      </div>
      {run.log.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-1.5 border-t hive-line px-4 py-2 text-[12px] text-text-muted hover:text-text-primary sm:px-5">
            <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} /> {open ? 'Hide' : 'Show'} step-by-step log
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: EASE }} className="overflow-hidden px-4 sm:px-5">
                <div className="space-y-1.5 pb-4">
                  {run.log.map((e, i) => {
                    const st = (e.status in STATE ? e.status : 'pending') as StageState
                    return (
                      <li key={i} className="flex gap-2 text-[12px]">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: STATE[st].color }} />
                        <span className="w-12 shrink-0 tabular-nums text-text-muted">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="min-w-0">
                          <b className="font-medium text-text-primary">{e.stage}</b> <span style={{ color: STATE[st].color }}>{STATE[st]?.label ?? e.status}</span>
                          {e.message && <span className="text-text-muted"> — {e.message}</span>}
                        </span>
                      </li>
                    )
                  })}
                </div>
              </motion.ol>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

function uniqueStagesFromLog(run: PipelineRun): PipelineStage[] {
  const seen = new Set<string>()
  const out: PipelineStage[] = []
  for (const e of run.log)
    if (!seen.has(e.stage)) {
      seen.add(e.stage)
      out.push(newStage(e.stage))
    }
  return out
}

/** A progress rail: stages as nodes on a line, the active one breathing. */
function RunRail({ stages, states, loops }: { stages: PipelineStage[]; states: StageState[]; loops: number }) {
  return (
    <div className="hive-scroll -mx-1 overflow-x-auto px-1 pb-1 pt-2" tabIndex={0} role="region" aria-label="Progress">
      <ol className="flex min-w-full w-max items-start">
        {stages.map((s, i) => {
          const st = states[i] ?? 'pending'
          const look = stageLook(s)
          const color = st === 'pending' ? 'var(--color-text-muted)' : STATE[st].color
          const Icon = st === 'done' || st === 'passed' ? Check : st === 'failed' ? X : st === 'skipped' ? SkipForward : st === 'changes' ? RotateCcw : look.icon
          const active = st === 'running'
          const filled = st !== 'pending' && st !== 'running'
          return (
            <li key={`${s.name}-${i}`} className="flex min-w-[84px] flex-1 flex-col items-center">
              <div className="relative flex w-full items-center">
                <span className={cn('h-0.5 flex-1 rounded-full', i === 0 && 'invisible')} style={{ background: filled || active ? `color-mix(in oklab, ${color} 55%, transparent)` : 'var(--hive-line)' }} />
                <span className="relative grid size-8 shrink-0 place-items-center rounded-full" style={{ color, background: `color-mix(in oklab, ${color} ${st === 'pending' ? 8 : 16}%, var(--color-bg-surface))`, boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${color} ${st === 'pending' ? 25 : 55}%, transparent)` }}>
                  {active && <motion.span className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${color}` }} animate={{ scale: [1, 1.35], opacity: [0.6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }} />}
                  {active ? <span className="hive-dot-run size-2 rounded-full" style={{ background: color }} /> : <Icon className="size-3.5" />}
                  {s.gate && loops > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-state-warning text-[9px] font-bold tabular-nums text-bg-app" title={`Sent back ${loops}×`}>
                      {loops}
                    </span>
                  )}
                </span>
                <span className={cn('h-0.5 flex-1 rounded-full', i === stages.length - 1 && 'invisible')} style={{ background: filled ? `color-mix(in oklab, ${color} 55%, transparent)` : 'var(--hive-line)' }} />
              </div>
              <div className="mt-1.5 max-w-[110px] truncate px-1 text-center text-[11.5px] font-medium text-text-primary">{s.name}</div>
              <div className={cn('text-[10.5px]', active && 'hive-thinking-text')} style={active ? undefined : { color }}>
                {STATE[st].label}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ── Run dialog ───────────────────────────────────────────────────────── */
function RunDialog({ pipeline, project, onClose, onStarted }: { pipeline: Pipeline | null; project: Project | null; onClose: () => void; onStarted: (r: PipelineRun) => void }) {
  const toast = useToast()
  const { machines } = useHive()
  const [request, setRequest] = useState('')
  const [onMachine, setOnMachine] = useState(true)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (pipeline) {
      setRequest('')
      setOnMachine(true)
    }
  }, [pipeline])
  const machine = project?.machine_id ? machines.find((m) => m.id === project.machine_id) : null
  const needsMachine = !!pipeline?.stages.some((s) => s.machineOnly)
  const start = async () => {
    if (!pipeline || !request.trim()) return
    setBusy(true)
    try {
      const useMachine = !!project?.machine_id && onMachine
      const r = await hiveApi.runPipeline(pipeline.id, { request: request.trim(), machineId: useMachine ? project!.machine_id : null, folder: useMachine ? (project?.folder ?? null) : null })
      toast.success('Pipeline started', pipeline.name)
      onStarted(r.run)
    } catch (e) {
      toast.error('Couldn’t start the run', errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={!!pipeline} onClose={onClose} size="lg" title={pipeline ? `Run “${pipeline.name}”` : 'Run'} description="Describe what you want. Every stage gets your request plus the work of the stages before it.">
      {pipeline && (
        <div className="space-y-4">
          <StageStrip stages={pipeline.stages} />
          <div className="hive-composer rounded-2xl p-2">
            <textarea
              autoFocus
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void start()
              }}
              placeholder="e.g. Add a dark-mode toggle to the settings page and remember the choice"
              rows={5}
              className="hive-scroll w-full resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed outline-none placeholder:text-text-muted"
              aria-label="Request"
            />
            <div className="flex items-center justify-between gap-2 px-1">
              <ImproveButton value={request} onApply={setRequest} mode="task" projectId={project?.id ?? null} label />
              <span className="hidden text-[11px] text-text-muted sm:inline">
                <span className="hive-kbd">⌘</span> <span className="hive-kbd">↵</span> to start
              </span>
            </div>
          </div>
          {project?.machine_id && (
            <label className="flex items-center gap-3 rounded-xl border hive-line p-3">
              <Server className="size-4 shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">Run on the project’s machine</span>
                <span className="block text-[12px] text-text-muted">
                  {machine ? `${machine.name} · ${machine.online ? 'online' : 'offline right now'}` : 'The connected computer'}
                  {project.folder ? ` · ${project.folder}` : ''} — agents can run tests and commands for real.
                </span>
              </span>
              <Toggle on={onMachine} onChange={setOnMachine} label="Run on the project’s machine" />
            </label>
          )}
          {needsMachine && !(project?.machine_id && onMachine) && <div className="rounded-xl bg-state-warning/[0.08] px-3 py-2 text-[12.5px] text-state-warning">Some stages need a machine — they’ll be skipped without one.</div>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={start} loading={busy} disabled={!request.trim()}>
              <Play /> Start pipeline
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ── Editor ───────────────────────────────────────────────────────────── */
interface Draft {
  id: string | null
  name: string
  description: string
  stages: PipelineStage[]
}

function blankDraft(): Draft {
  return {
    id: null,
    name: 'New pipeline',
    description: '',
    stages: [
      { ...newStage('Plan', 'reading'), readOnly: true, instructions: 'Read the relevant code and write a short, step-by-step plan.' },
      { ...newStage('Build', 'coding'), instructions: 'Implement the plan. Keep changes focused and add tests where they make sense.' },
      { ...newStage('Review', 'review'), readOnly: true, crossVendor: true, gate: { fixStage: 'Build', maxLoops: 2 }, instructions: 'Review the change for bugs, missing tests and unclear code. Ask for changes if anything is wrong.' },
      { ...newStage('Ship', 'mechanical'), ship: true, instructions: 'Commit the work and open a pull request with a clear summary.' },
    ],
  }
}

function Editor({ draft, kinds, project, onCancel, onSaved }: { draft: Draft; kinds: KindMap; project: Project | null; onCancel: () => void; onSaved: (p: Pipeline) => void }) {
  const toast = useToast()
  const [d, setD] = useState<Draft>(draft)
  const [sel, setSel] = useState(0)
  const [busy, setBusy] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const keysRef = useRef<string[]>(d.stages.map(() => Math.random().toString(36).slice(2)))
  const panelRef = useRef<HTMLDivElement>(null)

  const stage = d.stages[sel] ?? d.stages[0]
  const setStage = (i: number, patch: Partial<PipelineStage>) =>
    setD((x) => {
      const stages = x.stages.map((s, j) => (j === i ? { ...s, ...patch } : s))
      // Keep gates pointing at a renamed stage.
      if (patch.name != null && x.stages[i].name !== patch.name) {
        const old = x.stages[i].name
        for (let j = 0; j < stages.length; j++) if (stages[j].gate?.fixStage === old) stages[j] = { ...stages[j], gate: { ...stages[j].gate!, fixStage: patch.name } }
      }
      return { ...x, stages }
    })
  const move = (from: number, to: number) => {
    if (to < 0 || to >= d.stages.length || from === to) return
    setD((x) => {
      const stages = [...x.stages]
      const [s] = stages.splice(from, 1)
      stages.splice(to, 0, s)
      return { ...x, stages }
    })
    const k = [...keysRef.current]
    const [kk] = k.splice(from, 1)
    k.splice(to, 0, kk)
    keysRef.current = k
    setSel(to)
  }
  const add = (at: number) => {
    let name = 'New stage'
    let n = 2
    while (d.stages.some((s) => s.name === name)) name = `New stage ${n++}`
    setD((x) => {
      const stages = [...x.stages]
      stages.splice(at, 0, newStage(name))
      return { ...x, stages }
    })
    keysRef.current.splice(at, 0, Math.random().toString(36).slice(2))
    setSel(at)
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
  }
  const remove = (i: number) => {
    if (d.stages.length <= 1) return
    const name = d.stages[i].name
    setD((x) => ({ ...x, stages: x.stages.filter((_, j) => j !== i).map((s) => (s.gate?.fixStage === name ? { ...s, gate: null } : s)) }))
    keysRef.current.splice(i, 1)
    setSel(Math.max(0, Math.min(i, d.stages.length - 2)))
  }

  const problems = useMemo(() => {
    const out: string[] = []
    if (!d.name.trim()) out.push('Give the pipeline a name.')
    const names = d.stages.map((s) => s.name.trim())
    if (names.some((n) => !n)) out.push('Every stage needs a name.')
    if (new Set(names).size !== names.length) out.push('Stage names must be different.')
    d.stages.forEach((s) => {
      if (s.race && s.agents.length < 2) out.push(`“${s.name}” races agents — add at least two.`)
      if (s.gate && !names.includes(s.gate.fixStage)) out.push(`“${s.name}” sends work back to a stage that doesn’t exist.`)
      if (s.agents.some((a) => a.mode === 'specific' && (!a.provider || !a.model?.trim()))) out.push(`“${s.name}” has a specific model with no provider or model chosen.`)
    })
    return out
  }, [d])

  const save = async () => {
    if (problems.length) {
      toast.error('Almost there', problems[0])
      return
    }
    if (!project) return
    setBusy(true)
    const body = { name: d.name.trim(), description: d.description.trim(), stages: d.stages.map((s) => ({ ...s, name: s.name.trim() })) }
    try {
      const r = d.id ? await hiveApi.updatePipeline(d.id, body) : await hiveApi.savePipeline({ projectId: project.id, ...body })
      toast.success(d.id ? 'Pipeline updated' : 'Pipeline saved', r.pipeline.name)
      onSaved(r.pipeline)
    } catch (e) {
      toast.error('Couldn’t save the pipeline', errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="hive-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Pipeline name" aria-label="Pipeline name" className="text-[15px] font-semibold" />
            <Input value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder="What it’s for, in one line (optional)" aria-label="Description" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy}>
              <Check /> Save
            </Button>
          </div>
        </div>
        {problems.length > 0 && <div className="mt-3 text-[12px] text-state-warning">{problems[0]}</div>}
      </div>

      {/* Flow */}
      <div className="hive-card hive-sunken relative overflow-hidden p-4 sm:p-6">
        <div className="relative mb-3 flex items-center justify-between text-[12px] text-text-muted">
          <span>Work flows from stage to stage. Select one to change it; drag or use the arrows to reorder.</span>
        </div>
        <div className="hive-scroll relative overflow-x-auto pb-2">
          <ol className="flex flex-col items-stretch sm:w-max sm:flex-row sm:items-center">
            {d.stages.map((s, i) => {
              const look = stageLook(s)
              const Icon = look.icon
              const on = i === sel
              return (
                <Fragment key={keysRef.current[i]}>
                  {i > 0 && <Connector onAdd={() => add(i)} />}
                  <motion.li
                    layout
                    transition={{ duration: 0.22, ease: EASE }}
                    draggable
                    onDragStart={() => setDragFrom(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragFrom != null) move(dragFrom, i)
                      setDragFrom(null)
                    }}
                    onDragEnd={() => setDragFrom(null)}
                    className="sm:w-[176px]"
                  >
                    <button
                      type="button"
                      onClick={() => setSel(i)}
                      aria-pressed={on}
                      className={cn('relative w-full rounded-2xl border bg-bg-surface p-3 text-left transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-px', on ? 'shadow-[var(--elev-2)]' : 'hive-line', dragFrom === i && 'opacity-50', s.optional && 'border-dashed')}
                      style={on ? { borderColor: look.color, boxShadow: `0 0 0 3px color-mix(in oklab, ${look.color} 18%, transparent)` } : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <span className="hive-tile size-8 shrink-0" style={{ ['--tile' as string]: look.color }}>
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold">{s.name || 'Untitled'}</div>
                          <div className="truncate text-[11px] text-text-muted">{kinds[s.kind]?.label ?? s.kind}</div>
                        </div>
                        <span className="text-[10.5px] tabular-nums text-text-muted">{i + 1}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <MiniTag>{agentSummary(s.agents)}</MiniTag>
                        {s.readOnly && <MiniTag>Read-only</MiniTag>}
                        {s.race && <MiniTag tone="oklch(68% 0.14 300)">Race</MiniTag>}
                        {s.crossVendor && <MiniTag>Cross-lab</MiniTag>}
                        {s.gate && (
                          <MiniTag tone="var(--color-state-warning)">
                            <RotateCcw className="size-2.5" /> {s.gate.fixStage} ×{s.gate.maxLoops}
                          </MiniTag>
                        )}
                        {s.onlyOnGate && <MiniTag>On send-back</MiniTag>}
                        {s.optional && <MiniTag>Optional</MiniTag>}
                        {s.machineOnly && <MiniTag>Machine</MiniTag>}
                        {s.ship && <MiniTag tone={`oklch(68% 0.14 ${SHIP_HUE})`}>Commit + PR</MiniTag>}
                      </div>
                    </button>
                  </motion.li>
                </Fragment>
              )
            })}
            <Connector onAdd={() => add(d.stages.length)} last />
          </ol>
        </div>
      </div>

      {/* Side panel (below the flow; two columns on wide screens) */}
      {stage && (
        <div ref={panelRef} className="scroll-mt-6">
          <StagePanel
            key={keysRef.current[sel]}
            stage={stage}
            index={sel}
            count={d.stages.length}
            others={d.stages.filter((_, j) => j !== sel).map((s) => s.name)}
            kinds={kinds}
            projectId={project?.id ?? null}
            onChange={(p) => setStage(sel, p)}
            onMove={(dir) => move(sel, sel + dir)}
            onRemove={() => remove(sel)}
          />
        </div>
      )}
    </div>
  )
}

function Connector({ onAdd, last }: { onAdd: () => void; last?: boolean }) {
  return (
    <li className={cn('group/conn relative flex items-center justify-center', 'h-10 sm:h-auto sm:w-12', last && 'sm:ml-1 sm:w-auto')}>
      {!last && (
        <>
          <svg className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 overflow-visible sm:hidden" aria-hidden>
            <line x1="0.5" y1="0" x2="0.5" y2="100%" stroke="var(--color-accent-brand)" strokeOpacity="0.55" strokeWidth="1.5" className="hive-wire" />
          </svg>
          <svg className="absolute left-0 top-1/2 hidden h-px w-full -translate-y-1/2 overflow-visible sm:block" aria-hidden>
            <line x1="0" y1="0.5" x2="100%" y2="0.5" stroke="var(--color-accent-brand)" strokeOpacity="0.55" strokeWidth="1.5" className="hive-wire" />
          </svg>
        </>
      )}
      <Tooltip label="Add a stage here">
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add a stage here"
          className={cn(
            'relative z-[1] grid place-items-center rounded-full border hive-line-strong bg-bg-surface text-text-muted transition-all hover:border-accent-brand hover:text-accent-brand',
            last ? 'h-10 w-full gap-1 rounded-2xl border-dashed px-4 text-[12.5px] sm:h-[88px] sm:w-[120px]' : 'size-7 opacity-100 sm:opacity-0 sm:group-hover/conn:opacity-100 sm:focus-visible:opacity-100',
          )}
        >
          {last ? (
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" /> Add stage
            </span>
          ) : (
            <Plus className="size-3.5" />
          )}
        </button>
      </Tooltip>
    </li>
  )
}

function MiniTag({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10.5px] font-medium" style={{ color: tone ?? 'var(--color-text-secondary)', background: tone ? `color-mix(in oklab, ${tone} 13%, transparent)` : 'color-mix(in oklab, var(--color-text-primary) 6%, transparent)' }}>
      {children}
    </span>
  )
}

function agentSummary(agents: StageAgent[]): string {
  if (!agents.length) return 'Auto'
  if (agents.length > 1) return `${agents.length} agents`
  const a = agents[0]
  if (a.mode === 'auto') return 'Best model'
  if (a.mode === 'free') return 'Free models'
  return a.model || (a.provider ? vendorName(a.provider) : 'Specific')
}

function StagePanel({
  stage,
  index,
  count,
  others,
  kinds,
  projectId,
  onChange,
  onMove,
  onRemove,
}: {
  stage: PipelineStage
  index: number
  count: number
  others: string[]
  kinds: KindMap
  projectId: string | null
  onChange: (p: Partial<PipelineStage>) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const look = stageLook(stage)
  const setAgent = (i: number, a: StageAgent) => onChange({ agents: stage.agents.map((x, j) => (j === i ? a : x)) })
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: EASE }} className="hive-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b hive-line p-4 sm:px-5">
        <span className="hive-tile size-9" style={{ ['--tile' as string]: look.color }}>
          <look.icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Stage {index + 1} of {count}</div>
          <div className="truncate text-[15px] font-semibold">{stage.name || 'Untitled'}</div>
        </div>
        <div className="flex gap-1">
          <Tooltip label="Move earlier">
            <Button size="icon-sm" variant="ghost" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move stage earlier">
              <ArrowUp className="sm:-rotate-90" />
            </Button>
          </Tooltip>
          <Tooltip label="Move later">
            <Button size="icon-sm" variant="ghost" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move stage later">
              <ArrowDown className="sm:-rotate-90" />
            </Button>
          </Tooltip>
          <Tooltip label={count <= 1 ? 'A pipeline needs at least one stage' : 'Remove stage'}>
            <Button size="icon-sm" variant="ghost" onClick={onRemove} disabled={count <= 1} aria-label="Remove stage" className="hover:text-state-error">
              <Trash2 />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldLabel label="Name">
              <Input value={stage.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Build" aria-label="Stage name" />
            </FieldLabel>
            <FieldLabel label="What kind of work" hint={kinds[stage.kind]?.hint}>
              <Select value={stage.kind} onValueChange={(v) => onChange({ kind: v as TaskKind })} aria-label="Kind of work" className="w-full">
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {kinds[k]?.label ?? k}
                  </option>
                ))}
              </Select>
            </FieldLabel>
          </div>
          <FieldLabel label="Instructions" hint="What this stage should do. It also sees the request and the earlier stages’ work.">
            <div className="hive-composer rounded-xl p-1.5">
              <Textarea
                value={stage.instructions}
                onChange={(e) => onChange({ instructions: e.target.value })}
                rows={5}
                placeholder="e.g. Write tests for the new behaviour, run the suite and fix anything that fails."
                className="min-h-[120px] border-0 bg-transparent shadow-none focus:ring-0"
                aria-label="Instructions"
              />
              <div className="flex justify-end px-1 pb-0.5">
                <ImproveButton value={stage.instructions} onApply={(v) => onChange({ instructions: v })} mode="task" projectId={projectId} label />
              </div>
            </div>
          </FieldLabel>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12.5px] font-medium text-text-secondary">Agents</span>
              <Button size="sm" variant="ghost" onClick={() => onChange({ agents: [...stage.agents, newAgent()] })}>
                <Plus /> Add agent
              </Button>
            </div>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {stage.agents.map((a, i) => (
                  <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18, ease: EASE }}>
                    <AgentRowEditor
                      a={a}
                      onChange={(x) => setAgent(i, x)}
                      onRemove={stage.agents.length > 1 ? () => onChange({ agents: stage.agents.filter((_, j) => j !== i), race: stage.race && stage.agents.length - 1 >= 2 }) : undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {stage.agents.length > 1 && !stage.race && <p className="mt-2 text-[11.5px] text-text-muted">Several agents share this stage’s work. Turn on Race to have them compete instead.</p>}
          </div>
        </div>

        <div className="space-y-1">
          <div className="mb-1 text-[12.5px] font-medium text-text-secondary">How it behaves</div>
          <SwitchRow label="Read-only" hint="Can look at the code but never change it — good for planning and review." on={!!stage.readOnly} onChange={(v) => onChange({ readOnly: v })} />
          <SwitchRow
            label="Race"
            hint={stage.agents.length < 2 ? 'Add a second agent to race them. The Judge keeps the best result.' : 'Every agent does the work on its own copy; the Judge adopts the best.'}
            on={!!stage.race}
            disabled={stage.agents.length < 2}
            onChange={(v) => onChange({ race: v })}
          />
          <SwitchRow label="Cross-lab review" hint="Uses a model from a different lab than the one that built the work — catches blind spots." on={!!stage.crossVendor} onChange={(v) => onChange({ crossVendor: v })} />
          <SwitchRow label="Gate" hint="If this stage isn’t happy, it sends the work back to be fixed and checks again." on={!!stage.gate} disabled={!others.length} onChange={(v) => onChange({ gate: v ? { fixStage: others.find((n) => /fix|build/i.test(n)) ?? others[0] ?? '', maxLoops: 2 } : null })} />
          <AnimatePresence initial={false}>
            {stage.gate && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mb-2 ml-1 grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl bg-state-warning/[0.07] p-3">
                  <FieldLabel label="Send work back to">
                    <Select value={stage.gate.fixStage} onValueChange={(v) => onChange({ gate: { ...stage.gate!, fixStage: v } })} aria-label="Fix stage" className="w-full">
                      {others.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </FieldLabel>
                  <FieldLabel label="At most">
                    <div className="flex h-9 items-center rounded-lg border hive-line bg-bg-surface p-0.5" role="radiogroup" aria-label="Max loops">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={stage.gate!.maxLoops === n}
                          onClick={() => onChange({ gate: { ...stage.gate!, maxLoops: n } })}
                          className={cn('h-full min-w-9 rounded-md px-2 text-[12.5px] tabular-nums', stage.gate!.maxLoops === n ? 'bg-accent-brand/15 font-semibold text-accent-brand' : 'text-text-muted hover:text-text-primary')}
                        >
                          {n}×
                        </button>
                      ))}
                    </div>
                  </FieldLabel>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <SwitchRow label="Only when a gate sends work back" hint="Skipped on the first pass; runs only to fix what a review asked for." on={!!stage.onlyOnGate} onChange={(v) => onChange({ onlyOnGate: v })} />
          <SwitchRow label="Optional" hint="If it fails, the pipeline carries on instead of stopping." on={!!stage.optional} onChange={(v) => onChange({ optional: v })} />
          <SwitchRow label="Needs a machine" hint="Runs only on a connected computer — for tests, builds and dev servers." on={!!stage.machineOnly} onChange={(v) => onChange({ machineOnly: v })} />
          <SwitchRow label="Ship (commit + PR)" hint="Commits the work and opens a pull request." on={!!stage.ship} onChange={(v) => onChange({ ship: v })} />
        </div>
      </div>
    </motion.div>
  )
}

function FieldLabel({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[12.5px] font-medium text-text-secondary">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-text-muted">{hint}</span>}
    </label>
  )
}

function SwitchRow({ label, hint, on, onChange, disabled }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-text-primary/[0.03]', disabled && 'opacity-60')}>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11.5px] leading-snug text-text-muted">{hint}</div>
      </div>
      <div className="pt-0.5">
        <Toggle on={on} onChange={onChange} label={label} disabled={disabled} />
      </div>
    </div>
  )
}

function AgentRowEditor({ a, onChange, onRemove }: { a: StageAgent; onChange: (a: StageAgent) => void; onRemove?: () => void }) {
  const { boot } = useHive()
  const providers = useMemo(() => (boot?.catalogue.providers ?? []).filter((p) => p.id !== 'auto'), [boot])
  const connected = useMemo(() => new Set((boot?.keys ?? []).filter((k) => !k.disabled).map((k) => k.provider)), [boot])
  const models = useMemo(() => {
    if (!a.provider) return []
    const s = new Set<string>()
    for (const k of boot?.keys ?? []) if (k.provider === a.provider) for (const m of k.models) s.add(m)
    for (const m of providers.find((p) => p.id === a.provider)?.suggested ?? []) s.add(m)
    return [...s]
  }, [a.provider, boot, providers])
  const listId = useId()
  const modes: { id: StageAgent['mode']; label: string }[] = [
    { id: 'auto', label: 'Auto — best model' },
    { id: 'free', label: 'Free models only' },
    { id: 'specific', label: 'Specific model' },
  ]
  const freeVendors = (boot?.keys ?? []).filter((k) => k.freeTier && !k.disabled).length
  return (
    <div className="rounded-xl border hive-line bg-bg-surface p-3">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1" role="radiogroup" aria-label="Agent choice">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={a.mode === m.id}
              onClick={() => onChange(m.id === 'specific' ? { ...a, mode: m.id, provider: a.provider ?? providers.find((p) => connected.has(p.id))?.id } : { mode: m.id, preference: a.preference })}
              className={cn('h-8 rounded-full px-3 text-[12px] font-medium transition-colors', a.mode === m.id ? 'bg-accent-brand/15 text-accent-brand' : 'bg-text-primary/[0.05] text-text-secondary hover:text-text-primary')}
            >
              {m.label}
            </button>
          ))}
        </div>
        {onRemove && (
          <Tooltip label="Remove agent">
            <Button size="icon-sm" variant="ghost" onClick={onRemove} aria-label="Remove agent">
              <X />
            </Button>
          </Tooltip>
        )}
      </div>
      {a.mode === 'specific' && (
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          <Select value={a.provider ?? ''} onValueChange={(v) => onChange({ ...a, provider: v, model: '' })} aria-label="Provider" placeholder="Choose a provider" className="w-full">
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.subscription ? ' (subscription)' : ''}
                {connected.has(p.id) ? '' : ' — not connected'}
              </option>
            ))}
          </Select>
          <Input value={a.model ?? ''} onChange={(e) => onChange({ ...a, model: e.target.value })} list={listId} placeholder={models[0] ?? 'Model id'} aria-label="Model" className="font-mono text-[12.5px]" />
          <datalist id={listId}>
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      )}
      {a.mode === 'free' && freeVendors === 0 && <p className="mt-2 text-[11.5px] text-state-warning">No free-tier keys are connected yet — add one on the Keys page.</p>}
      {a.mode !== 'specific' && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] text-text-muted">
          <span>Prefer</span>
          {(['balanced', 'quality', 'savings'] as const).map((p) => {
            const cur = (a.preference ?? 'balanced') === p
            return (
              <button key={p} type="button" aria-pressed={cur} onClick={() => onChange({ ...a, preference: p === 'balanced' ? undefined : p })} className={cn('hive-chip h-7', cur && 'bg-text-primary/[0.12] font-medium text-text-primary')}>
                {p === 'balanced' ? 'Balanced' : p === 'quality' ? 'Quality' : 'Savings'}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Architect ────────────────────────────────────────────────────────── */
interface ArchMsg {
  role: 'user' | 'assistant'
  text: string
  questions?: string[]
  model?: string
}

function Architect({ projectId, kinds, onSave, onOpen }: { projectId: string | null; kinds: KindMap; onSave: (p: NonNullable<ArchitectReply['pipeline']>) => Promise<Pipeline | null>; onOpen: (p: NonNullable<ArchitectReply['pipeline']>) => void }) {
  const toast = useToast()
  const [msgs, setMsgs] = useState<ArchMsg[]>([])
  const [draft, setDraft] = useState<ArchitectReply['pipeline']>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!busy) return
    setElapsed(0)
    const t0 = Date.now()
    const t = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(t)
  }, [busy])
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])

  const send = async (text?: string) => {
    const t = (text ?? input).trim()
    if (!t || busy) return
    const next: ArchMsg[] = [...msgs, { role: 'user', text: t }]
    setMsgs(next)
    setInput('')
    setBusy(true)
    try {
      const r = await hiveApi.architect({ history: next.map((m) => ({ role: m.role, text: m.text })), draft: draft ?? undefined, projectId })
      setMsgs((l) => [...l, { role: 'assistant', text: r.message, questions: r.questions, model: r.model }])
      if (r.pipeline) {
        setDraft(r.pipeline)
        setSaved(false)
      }
    } catch (e) {
      toast.error('The Architect didn’t answer', errMsg(e))
      setMsgs((l) => l.slice(0, -1))
      setInput(t)
    } finally {
      setBusy(false)
    }
  }

  const prefill = (q: string) => {
    setInput((v) => `${v ? `${v}\n` : ''}${q} — `)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (el) {
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      }
    })
  }

  const reset = () => {
    setMsgs([])
    setDraft(null)
    setInput('')
    setSaved(false)
  }

  const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant')

  return (
    <section className="hive-card relative overflow-hidden" aria-labelledby="architect-title">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_20%_0%,color-mix(in_oklab,var(--color-accent-brand)_16%,transparent),transparent),radial-gradient(50%_100%_at_90%_0%,color-mix(in_oklab,oklch(70%_0.14_330)_12%,transparent),transparent)]" />
      <div className="relative flex flex-wrap items-start gap-4 p-5 sm:p-6">
        <span className="hive-tile size-11" style={{ ['--tile' as string]: 'oklch(68% 0.15 300)' }}>
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="architect-title" className="text-[18px] font-semibold tracking-[-0.01em]">
            Design with the Architect
          </h2>
          <p className="mt-0.5 max-w-2xl text-[13px] text-text-muted">Tell the strongest model what you want your agents to handle. It asks a few questions, then drafts a pipeline you can save or fine-tune.</p>
        </div>
        {msgs.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
            <RotateCcw /> Start over
          </Button>
        )}
      </div>

      <div className="relative grid border-t hive-line lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Chat */}
        <div className="flex min-w-0 flex-col lg:border-r hive-line">
          <div ref={scrollRef} className="hive-scroll max-h-[460px] min-h-[220px] flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
            {!msgs.length && (
              <div className="py-2">
                <div className="mb-2 flex items-center gap-1.5 text-[12px] text-text-muted">
                  <Lightbulb className="size-3.5" /> Try one of these
                </div>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <button key={s} type="button" onClick={() => void send(s)} className="hive-chip h-auto min-h-9 py-1.5 text-left text-[12.5px] leading-snug">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <AnimatePresence initial={false}>
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: EASE }} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed', m.role === 'user' ? 'rounded-br-md bg-accent-brand/12 text-text-primary' : 'rounded-bl-md border hive-line bg-bg-surface')}>
                    {m.role === 'assistant' ? <MarkdownLite text={m.text} /> : <span className="whitespace-pre-wrap">{m.text}</span>}
                    {m.role === 'assistant' && m.questions && m.questions.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {m.questions.map((q) => (
                          <button key={q} type="button" onClick={() => prefill(q)} disabled={m !== lastAssistant} className="hive-chip h-auto min-h-8 py-1 text-left text-[12px] leading-snug disabled:opacity-50">
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                    {m.model && <div className="mt-1.5 text-[10.5px] text-text-muted">{m.model}</div>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {busy && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-1 text-[13px]">
                <Sparkles className="size-3.5 animate-pulse text-accent-brand" />
                <span className="hive-thinking-text">{elapsed < 20 ? 'Thinking about your workflow…' : elapsed < 50 ? 'Choosing the right models for each stage…' : 'Putting the pipeline together…'}</span>
                <span className="text-[11px] tabular-nums text-text-muted">{elapsed}s</span>
              </motion.div>
            )}
          </div>
          <div className="border-t hive-line p-3 sm:p-4">
            <div className="hive-composer rounded-2xl p-1.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
                rows={2}
                placeholder={msgs.length ? 'Reply to the Architect…' : 'What should your agents take care of?'}
                aria-label="Message the Architect"
                className="hive-scroll w-full resize-none bg-transparent px-2 py-1.5 text-[13.5px] outline-none placeholder:text-text-muted"
              />
              <div className="flex items-center justify-between gap-2 px-1">
                <ImproveButton value={input} onApply={setInput} mode="task" projectId={projectId} />
                <Button size="icon-sm" onClick={() => void send()} disabled={!input.trim() || busy} aria-label="Send">
                  <Send />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="min-w-0 border-t hive-line p-4 sm:p-5 lg:border-t-0">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Proposed pipeline</div>
          <AnimatePresence mode="wait" initial={false}>
            {draft ? (
              <motion.div key={JSON.stringify(draft.stages.map((s) => s.name))} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: EASE }}>
                <div className="text-[15px] font-semibold">{draft.name}</div>
                {draft.description && <p className="mt-0.5 text-[12.5px] text-text-muted">{draft.description}</p>}
                <StageStrip stages={draft.stages} size="md" className="mt-2" />
                <ol className="mt-3 space-y-2">
                  {draft.stages.map((s, i) => {
                    const look = stageLook(s)
                    return (
                      <li key={`${s.name}-${i}`} className="flex gap-2.5 rounded-xl bg-text-primary/[0.03] p-2.5">
                        <span className="hive-tile size-7 shrink-0" style={{ ['--tile' as string]: look.color }}>
                          <look.icon className="size-3.5" />
                        </span>
                        <div className="min-w-0 text-[12px]">
                          <div className="font-medium text-text-primary">
                            {s.name} <span className="font-normal text-text-muted">· {kinds[s.kind]?.label ?? s.kind} · {agentSummary(s.agents)}</span>
                          </div>
                          {s.instructions && <div className="mt-0.5 line-clamp-2 text-text-muted">{s.instructions}</div>}
                        </div>
                      </li>
                    )
                  })}
                </ol>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    loading={saving}
                    disabled={saved || !projectId}
                    onClick={async () => {
                      setSaving(true)
                      const p = await onSave(draft)
                      setSaving(false)
                      if (p) setSaved(true)
                    }}
                  >
                    {saved ? <Check /> : <Plus />} {saved ? 'Saved' : 'Save this pipeline'}
                  </Button>
                  <Button variant="secondary" onClick={() => onOpen(draft)}>
                    <Pencil /> Open in editor
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed hive-line p-6 text-center">
                <div>
                  {busy ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className="hive-shimmer h-7 w-16 rounded-full" />
                        ))}
                      </div>
                      <div className="hive-thinking-text text-[12.5px]">Sketching stages…</div>
                    </div>
                  ) : (
                    <>
                      <Workflow className="mx-auto size-5 text-text-muted" />
                      <div className="mt-2 text-[13px] text-text-muted">The pipeline appears here as the Architect designs it.</div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

/** Just enough markdown: paragraphs, line breaks, bullets, numbered lists, headings, **bold**, `code`. */
function MarkdownLite({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r/g, '').split('\n')
  let list: { ordered: boolean; items: string[] } | null = null
  let para: string[] = []
  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`p${blocks.length}`} className="my-1.5 first:mt-0 last:mb-0">
          {para.map((l, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              <Inline text={l} />
            </Fragment>
          ))}
        </p>,
      )
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      const L = list
      const Tag = L.ordered ? 'ol' : 'ul'
      blocks.push(
        <Tag key={`l${blocks.length}`} className={cn('my-1.5 space-y-0.5 pl-5', L.ordered ? 'list-decimal' : 'list-disc', 'marker:text-text-muted')}>
          {L.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </Tag>,
      )
      list = null
    }
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    const b = /^\s*[-*•]\s+(.*)$/.exec(line)
    const n = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    const h = /^#{1,4}\s+(.*)$/.exec(line)
    if (b || n) {
      flushPara()
      const ordered = !!n
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push((b ?? n)![1])
    } else if (h) {
      flushPara()
      flushList()
      blocks.push(
        <div key={`h${blocks.length}`} className="mb-1 mt-2.5 font-semibold first:mt-0">
          <Inline text={h[1]} />
        </div>,
      )
    } else if (!line.trim()) {
      flushPara()
      flushList()
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return <div>{blocks}</div>
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
          <strong key={i} className="font-semibold">
            {p.slice(2, -2)}
          </strong>
        ) : p.startsWith('`') && p.endsWith('`') && p.length > 2 ? (
          <code key={i} className="rounded bg-text-primary/[0.07] px-1 py-px font-mono text-[12px]">
            {p.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  )
}
