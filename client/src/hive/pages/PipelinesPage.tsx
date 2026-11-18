/* ────────────────────────────────────────────────────────────────────────
   Pipelines: chains of AI agents that turn one request into shipped work —
   Plan → Build → Test → Review ⟲ Fix → Docs → Ship. Design one by talking
   to the Architect, start from a template, or build it stage by stage.
   Runs show live as a progress rail of their stages.
   ──────────────────────────────────────────────────────────────────────── */
import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
import { Toggle, duration, timeAgo, vendorName } from '../ui'
import { PageHeader } from '../kit'

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
        <PageHeader className="mb-8" title="Pipelines" sub="Relay teams of agents that turn a request into shipped work." />
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
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6 lg:px-8">
      <PageHeader
        className="mb-8"
        title="Pipelines"
        sub="Relay teams of AI agents that take one request all the way to a pull request: planning, building, testing, reviewing and shipping."
        actions={
          <>
            <Select aria-label="Project" value={projectId ?? ''} onValueChange={(v) => setParams({ project: v })} className="h-9 w-full sm:w-[200px]">
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
          </>
        }
      />

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
              <SectionHead title={project ? `${project.name}’s pipelines` : 'Pipelines'} count={loading ? undefined : pipelines.length} />
              {loading ? (
                <div className="hv-ledger border-y border-[var(--hv-border)]">
                  {[0, 1].map((i) => (
                    <div key={i} className="py-5">
                      <div className="hive-shimmer h-5 w-48 rounded" />
                      <div className="hive-shimmer mt-2 h-3 w-80 max-w-full rounded" />
                      <div className="hive-shimmer mt-4 h-7 w-[420px] max-w-full rounded" />
                    </div>
                  ))}
                </div>
              ) : pipelines.length ? (
                <motion.div layout className="hv-ledger border-y border-[var(--hv-border)]">
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
              <SectionHead title="Runs" count={loading ? undefined : runs.length} hint="Every run, live: which stage is working, what it is doing, and where it sent work back." />
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
                <p className="m-0 border-y border-[var(--hv-border)] py-5 text-[13px] text-text-muted">No runs yet. Press <b className="text-text-secondary">Run</b> on a pipeline and give it a request — you’ll watch each stage work here.</p>
              )}
            </section>

            {/* Templates */}
            <section ref={templatesRef} className="scroll-mt-6">
              <SectionHead title="Templates" hint="Proven shapes. Use one and it’s copied into this project for you to tweak." />
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="hive-shimmer h-[150px] rounded-[var(--hv-r-card)]" />
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

function SectionHead({ title, count, hint, action }: { icon?: LucideIcon; title: string; count?: number; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-x-3 gap-y-1">
      <div className="min-w-0 flex-1">
        <h2 className="hv-h2 m-0 flex items-baseline gap-2">
          {title}
          {count != null && count > 0 && <span className="hv-num font-[var(--hv-sans)] text-[12px] text-text-muted">{count}</span>}
        </h2>
        {hint && <p className="mt-1 mb-0 text-[13px] text-text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

/* ── Stage strip (rows, previews, templates) ──────────────────────────── */
/** The stages in order: a numbered hairline label each, joined by arrows.
 * A gate shows where it sends work back; a run colours only the icon. */
function StageStrip({ stages, states, loops = 0, size = 'sm', wrap = false, className }: { stages: PipelineStage[]; states?: StageState[]; loops?: number; size?: 'sm' | 'md'; wrap?: boolean; className?: string }) {
  return (
    <div className={cn(wrap ? 'py-1' : 'hive-scroll -mx-1 overflow-x-auto px-1 py-1', className)} tabIndex={wrap ? undefined : 0} role="group" aria-label="Stages">
      <ol className={cn('m-0 flex list-none items-center p-0', wrap ? 'flex-wrap gap-y-1.5' : 'w-max')}>
        {stages.map((s, i) => {
          const look = stageLook(s)
          const st = states?.[i]
          const active = st === 'running'
          const Icon = st === 'failed' ? X : st === 'done' || st === 'passed' ? Check : st === 'skipped' ? SkipForward : look.icon
          const iconColor = st && st !== 'pending' ? STATE[st].color : 'var(--hv-text-3)'
          return (
            <Fragment key={`${s.name}-${i}`}>
              {i > 0 && (
                <li aria-hidden className={cn('flex shrink-0 items-center text-[var(--hv-text-3)]', size === 'md' ? 'px-1.5' : 'px-1')}>
                  <svg width={size === 'md' ? 18 : 14} height="8" viewBox="0 0 18 8" fill="none" className="overflow-visible">
                    <path d="M0 4H16M12.5 1L16 4L12.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </li>
              )}
              <li
                data-state={active ? 'active' : undefined}
                title={`${i + 1}. ${s.name}${st ? ` — ${STATE[st].label}` : ''}`}
                className={cn(
                  'hive-stage-chip relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--hv-r-btn)] ring-1 ring-inset ring-[var(--hv-border)]',
                  size === 'md' ? 'h-8 px-2.5 text-[12.5px]' : 'h-7 px-2 text-[12px]',
                  s.optional && 'ring-dashed',
                  (s.onlyOnGate || st === 'pending' || st === 'skipped') && 'opacity-70',
                )}
              >
                <span className="hv-num text-[10.5px] text-[var(--hv-text-3)]">{i + 1}</span>
                {active ? <span className="hive-dot-run size-1.5 rounded-full bg-[var(--hv-accent)]" aria-hidden /> : <Icon className="size-3.5" style={{ color: iconColor }} aria-hidden />}
                <span className="font-medium text-[var(--hv-text-1)]">{s.name}</span>
                {s.race && (
                  <Tooltip label="Race: several agents compete, the Judge keeps the best">
                    <Sparkles className="size-3 text-[var(--hv-text-3)]" />
                  </Tooltip>
                )}
                {s.gate && (
                  <Tooltip label={`Gate: sends work back to “${s.gate.fixStage}” — up to ${s.gate.maxLoops}×`}>
                    <span className="inline-flex items-center gap-0.5 text-[var(--hv-text-3)]">
                      <RotateCcw className="size-3" />
                      <span className="hv-num text-[10px]">{loops > 0 ? `${loops}/${s.gate.maxLoops}` : `×${s.gate.maxLoops}`}</span>
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

/* ── Pipeline row ─────────────────────────────────────────────────────── */
function PipelineCard({ p, last, onRun, onEdit, onDuplicate, onDelete }: { p: Pipeline; last: PipelineRun | null; onRun: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const rs = last ? RUN_STATUS[last.status] : null
  return (
    <article className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="hv-serif m-0 text-[19px] leading-tight text-[var(--hv-text-1)]">{p.name}</h3>
          <span className="hv-num text-[12px] text-text-muted">{p.stages.length} stages</span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
            {last && rs ? (
              <>
                <span className={cn('size-1.5 rounded-full', last.status === 'running' && 'hive-dot-run')} style={{ background: rs.color }} aria-hidden />
                <span className="text-[var(--hv-text-2)]">{rs.label}</span> · {timeAgo(last.createdAt) === 'now' ? 'just now' : `${timeAgo(last.createdAt)} ago`}
              </>
            ) : (
              'Never run'
            )}
          </span>
        </div>
        {p.description && <p className="mt-1 mb-0 line-clamp-2 max-w-3xl text-[13px] text-[var(--hv-text-2)]">{p.description}</p>}
        <StageStrip stages={p.stages} className="mt-3" />
      </div>
      <div className="flex items-center gap-1">
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
        <Button size="sm" variant="secondary" onClick={onRun} className="ml-1">
          <Play /> Run
        </Button>
      </div>
    </article>
  )
}

function TemplateCard({ t, onUse }: { t: PipelineTemplate; onUse: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="hive-card hive-card-hover flex h-full flex-col p-5">
      <h3 className="hv-serif m-0 text-[17px] leading-tight">{t.name}</h3>
      <p className="mt-1 mb-0 line-clamp-2 text-[12.5px] text-text-muted">{t.description}</p>
      <StageStrip stages={t.stages} wrap className="mt-3" />
      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="hv-num text-[12px] text-text-muted">{t.stages.length} stages</span>
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

/* ── How a pipeline works: a diagram that explains it ─────────────────── */
/**
 * Four stations on a line. A request (the accent dot) travels Plan → Build →
 * Review; the first time, Review sends it back to Build along the loop
 * underneath (that is what a gate does), then it passes and goes on to Ship.
 * Still under prefers-reduced-motion: the dot rests at Ship.
 */
function RelayDiagram() {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const xs = [56, 196, 336, 476]
  const names = ['Plan', 'Build', 'Review', 'Ship']
  const route = `M${xs[0]} 56 H${xs[2]} V72 C${xs[2] - 8} 124 ${xs[1] + 8} 124 ${xs[1]} 72 V56 H${xs[3]}`
  return (
    <figure className="m-0">
      <svg viewBox="0 0 532 140" className="block h-auto w-full max-w-[560px] text-[var(--hv-text-1)]" role="img" aria-label="A request goes from Plan to Build to Review; if the review fails it goes back to Build, then on to Ship.">
        <line x1={xs[0]} y1="56" x2={xs[3]} y2="56" stroke="var(--hv-border-strong)" strokeWidth="1.2" />
        <path d={`M${xs[2]} 74 C${xs[2] - 8} 124 ${xs[1] + 8} 124 ${xs[1]} 74`} fill="none" stroke="var(--hv-text-3)" strokeWidth="1.2" strokeDasharray="3 4" />
        <path d={`M${xs[1] + 4} 82 L${xs[1]} 74 L${xs[1] - 4} 82`} fill="none" stroke="var(--hv-text-3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <text x={(xs[1] + xs[2]) / 2} y="134" textAnchor="middle" className="fill-[var(--hv-text-3)] text-[11px] italic" style={{ fontFamily: 'var(--hv-prose)' }}>
          not right yet? back to Build
        </text>
        {xs.map((x, i) => (
          <g key={x}>
            <circle cx={x} cy="56" r="17" fill="var(--hv-bg-app)" stroke="currentColor" strokeWidth="1.4" />
            <text x={x} y="61" textAnchor="middle" className="fill-current text-[14px]" style={{ fontFamily: 'var(--hv-serif)' }}>
              {['i', 'ii', 'iii', 'iv'][i]}
            </text>
            <text x={x} y="24" textAnchor="middle" className="fill-[var(--hv-text-2)] text-[12px] font-medium" style={{ fontFamily: 'var(--hv-sans)' }}>
              {names[i]}
            </text>
          </g>
        ))}
        <circle r="5" fill="var(--hv-accent)" cx={reduce ? xs[3] + 24 : 0} cy={reduce ? 56 : 0}>
          {!reduce && <animateMotion dur="7s" repeatCount="indefinite" path={route} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />}
        </circle>
      </svg>
      <figcaption className="mt-2 text-[12px] text-text-muted">The dot is one request moving through a four-stage pipeline with a review gate.</figcaption>
    </figure>
  )
}

function EmptyPipelines({ onArchitect, onTemplates, onBlank }: { onArchitect: () => void; onTemplates: () => void; onBlank: () => void }) {
  const ways = [
    { n: 'i', title: 'Design with the Architect', line: 'Tell the strongest model what the work is. It asks a few questions and drafts a pipeline you can edit.', icon: Sparkles, go: onArchitect },
    { n: 'ii', title: 'Start from a template', line: 'Proven shapes — plan, build, test, review, ship — copied into this project for you to tweak.', icon: Layers, go: onTemplates },
    { n: 'iii', title: 'Build from scratch', line: 'Add stages one by one: what each does, which model, and where the work goes back.', icon: Plus, go: onBlank },
  ]
  return (
    <div className="grid gap-10 border-y border-[var(--hv-border)] py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
      <div>
        <h3 className="hv-serif m-0 text-[24px] leading-tight">Your request in, a pull request out.</h3>
        <p className="hv-lead mt-2 mb-0">
          A pipeline is a relay team of AI agents. You describe the work once: one agent plans it, another builds it, a third reviews it and sends it back if it isn’t right, and the last opens a pull request. Each stage can use the best model for its job, free models only, or one you trust.
        </p>
        <div className="mt-6">
          <RelayDiagram />
        </div>
      </div>
      <ol className="hv-ledger m-0 list-none border-y border-[var(--hv-border)] p-0">
        {ways.map((w) => (
          <li key={w.n}>
            <button type="button" onClick={w.go} className="group flex w-full items-start gap-4 py-4 text-left">
              <span className="hv-serif w-8 shrink-0 pt-0.5 text-[20px] italic text-[var(--hv-text-3)]">{w.n}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[14.5px] font-semibold text-[var(--hv-text-1)]">
                  <w.icon className="size-4 text-[var(--hv-text-3)]" aria-hidden /> {w.title}
                </span>
                <span className="mt-1 block text-[13px] text-[var(--hv-text-2)]">{w.line}</span>
              </span>
              <ChevronDown className="mt-1 size-4 -rotate-90 text-[var(--hv-text-3)] transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
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
    <div className={cn('hive-card overflow-hidden', run.status === 'running' && 'hive-working')}>
      <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="hv-serif text-[17px] leading-tight">{pipeline?.name ?? 'Deleted pipeline'}</span>
            <span className="inline-flex h-6 items-center gap-1.5 rounded-[var(--hv-r-chip)] px-2 text-[12px] font-medium text-[var(--hv-text-2)] ring-1 ring-inset ring-[var(--hv-border)]">
              <span className={cn('size-1.5 rounded-full', live && 'hive-dot-run')} style={{ background: rs.color }} aria-hidden />
              {rs.label}
            </span>
            {run.loops > 0 && (
              <span className="inline-flex h-6 items-center gap-1 rounded-[var(--hv-r-chip)] px-2 text-[11.5px] font-medium text-[var(--hv-text-2)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--hv-warning)_55%,transparent)]">
                <RotateCcw className="size-3 text-[var(--hv-warning)]" aria-hidden /> Round {run.loops + 1}
              </span>
            )}
          </div>
          <p className="hv-lead mt-1.5 mb-0 line-clamp-2 text-[14px]">“{run.request}”</p>
          <div className="hv-num mt-1.5 text-[12px] text-text-muted">
            @{run.startedBy} · {timeAgo(run.createdAt) === 'now' ? 'just now' : `${timeAgo(run.createdAt)} ago`} · {duration(run.createdAt, live ? null : run.updatedAt)} · {done}/{stages.length} stages
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pr && (
            <a href={pr.url} target="_blank" rel="noreferrer" className="hive-chip h-8">
              <GitPullRequest className="size-3.5 text-[var(--hv-success)]" aria-hidden /> PR #{pr.number}
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
        {run.status === 'failed' && run.error && <div className="mt-3 border-l-2 border-state-error py-0.5 pl-3 text-[12.5px] text-[var(--hv-text-1)]">{run.error}</div>}
        {live && latest?.message && (
          <div className="mt-3 flex items-center gap-2 truncate text-[12.5px] text-[var(--hv-text-2)]">
            <span className="hive-dot-run size-1.5 shrink-0 rounded-full bg-[var(--hv-accent)]" aria-hidden /> {latest.message}
          </div>
        )}
      </div>
      {run.log.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-1.5 border-t hive-line px-4 py-2.5 text-[12.5px] text-text-muted hover:text-text-primary sm:px-5">
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
                        <span className="hv-mono w-12 shrink-0 text-text-muted">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

/** A progress rail: numbered stations on a line. Finished stations fill with
 * ink, the working one wears the accent ring, a gate shows its rounds. */
function RunRail({ stages, states, loops }: { stages: PipelineStage[]; states: StageState[]; loops: number }) {
  return (
    <div className="hive-scroll -mx-1 overflow-x-auto px-1 pb-1 pt-3" tabIndex={0} role="group" aria-label="Progress">
      <ol className="m-0 flex w-max min-w-full list-none items-start p-0">
        {stages.map((s, i) => {
          const st = states[i] ?? 'pending'
          const active = st === 'running'
          const filled = st === 'done' || st === 'passed'
          const bad = st === 'failed'
          const Icon = filled ? Check : bad ? X : st === 'skipped' ? SkipForward : st === 'changes' ? RotateCcw : null
          const lineDone = (k: number) => {
            const x = states[k]
            return x === 'done' || x === 'passed' || x === 'changes'
          }
          return (
            <li key={`${s.name}-${i}`} className="flex min-w-[96px] flex-1 flex-col items-center">
              <div className="relative flex w-full items-center">
                <span className={cn('h-px flex-1', i === 0 && 'invisible')} style={{ background: i > 0 && lineDone(i - 1) ? 'var(--hv-text-1)' : 'var(--hv-border-strong)' }} />
                <span
                  className={cn('relative grid size-8 shrink-0 place-items-center rounded-full text-[13px]', filled ? 'bg-[var(--hv-text-1)] text-[var(--hv-bg-app)]' : 'bg-[var(--hv-bg-app)] text-[var(--hv-text-1)] ring-1 ring-inset', active ? 'ring-2 ring-[var(--hv-accent)]' : bad ? 'ring-[var(--hv-danger)]' : st === 'changes' ? 'ring-[var(--hv-warning)]' : 'ring-[var(--hv-border-strong)]')}
                  title={`${s.name} — ${STATE[st].label}`}
                >
                  {active ? <span className="hive-dot-run size-2 rounded-full bg-[var(--hv-accent)]" aria-hidden /> : Icon ? <Icon className="size-3.5" style={{ color: bad ? 'var(--hv-danger)' : st === 'changes' ? 'var(--hv-warning)' : undefined }} aria-hidden /> : <span className="hv-serif">{i + 1}</span>}
                  {s.gate && loops > 0 && (
                    <span className="hv-num absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--hv-bg-app)] px-1 text-[9.5px] font-semibold text-[var(--hv-text-1)] ring-1 ring-[var(--hv-warning)]" title={`Sent back ${loops}×`}>
                      {loops}
                    </span>
                  )}
                </span>
                <span className={cn('h-px flex-1', i === stages.length - 1 && 'invisible')} style={{ background: lineDone(i) ? 'var(--hv-text-1)' : 'var(--hv-border-strong)' }} />
              </div>
              <div className="mt-2 max-w-[120px] truncate px-1 text-center text-[12px] font-medium text-[var(--hv-text-1)]">{s.name}</div>
              <div className="text-[11px] text-[var(--hv-text-3)]">{STATE[st].label}</div>
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
    <div className="space-y-8">
      {/* Name and what it is for, written like a title */}
      <div className="flex flex-wrap items-start gap-4 border-b border-[var(--hv-border)] pb-5">
        <div className="min-w-0 flex-1">
          <div className="hv-eyebrow">{d.id ? 'Editing a pipeline' : 'A new pipeline'}</div>
          <input
            value={d.name}
            onChange={(e) => setD({ ...d, name: e.target.value })}
            placeholder="Name this pipeline"
            aria-label="Pipeline name"
            className="hv-serif mt-2 block w-full border-0 border-b border-transparent bg-transparent p-0 pb-1 text-[28px] leading-tight text-[var(--hv-text-1)] outline-none transition-colors placeholder:text-[var(--hv-text-3)] focus:border-[var(--hv-text-1)]"
          />
          <input
            value={d.description}
            onChange={(e) => setD({ ...d, description: e.target.value })}
            placeholder="What it’s for, in one line (optional)"
            aria-label="Description"
            className="mt-2 block w-full border-0 border-b border-transparent bg-transparent p-0 pb-1 text-[15px] text-[var(--hv-text-2)] outline-none transition-colors placeholder:italic placeholder:text-[var(--hv-text-3)] focus:border-[var(--hv-text-2)]"
            style={{ fontFamily: 'var(--hv-prose)' }}
          />
          {problems.length > 0 && (
            <p className="mt-3 mb-0 flex items-center gap-2 text-[12.5px] text-[var(--hv-text-2)]" role="status">
              <span className="size-1.5 rounded-full bg-[var(--hv-warning)]" aria-hidden /> {problems[0]}
            </p>
          )}
        </div>
        <div className="flex gap-2 pt-6">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            <Check /> Save
          </Button>
        </div>
      </div>

      {/* The flow */}
      <FlowTrack d={d} sel={sel} kinds={kinds} keys={keysRef.current} dragFrom={dragFrom} setDragFrom={setDragFrom} onSelect={setSel} onMove={move} onAdd={add} />

      {/* The chosen stage */}
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

/**
 * The stages as a track: numbered cards joined by arrows (a + appears on an
 * arrow to add a stage there), and each review gate's send-back drawn as a
 * loop under the track to the stage it returns to. The loops are measured
 * from the cards, so they follow every add, move and rename.
 */
function FlowTrack({ d, sel, kinds, keys, dragFrom, setDragFrom, onSelect, onMove, onAdd }: { d: Draft; sel: number; kinds: KindMap; keys: string[]; dragFrom: number | null; setDragFrom: (i: number | null) => void; onSelect: (i: number) => void; onMove: (from: number, to: number) => void; onAdd: (at: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLLIElement | null)[]>([])
  const [loops, setLoops] = useState<{ d: string; label: string; x: number; y: number }[]>([])
  const wide = useMediaQuery('(min-width: 640px)')
  const gates = d.stages.map((s, i) => ({ i, to: s.gate ? d.stages.findIndex((x) => x.name === s.gate!.fixStage) : -1, n: s.gate?.maxLoops ?? 0 })).filter((g) => g.to >= 0 && g.to !== g.i)
  const sig = JSON.stringify(gates) + d.stages.length + String(wide)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el || !wide) return setLoops([])
    const measure = () => {
      const box = el.getBoundingClientRect()
      const out: { d: string; label: string; x: number; y: number }[] = []
      gates.forEach((g, k) => {
        const a = cards.current[g.i]?.getBoundingClientRect()
        const b = cards.current[g.to]?.getBoundingClientRect()
        if (!a || !b) return
        const x1 = a.left - box.left + el.scrollLeft + a.width / 2
        const x2 = b.left - box.left + el.scrollLeft + b.width / 2
        const y = Math.max(a.bottom, b.bottom) - box.top + 6
        const depth = 26 + k * 14
        out.push({ d: `M${x1} ${y} C${x1} ${y + depth} ${x2} ${y + depth} ${x2} ${y}`, label: `back to ${d.stages[g.to].name} · up to ${g.n}×`, x: (x1 + x2) / 2, y: y + depth * 0.75 + 12 })
      })
      setLoops(out)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
  const deepest = loops.length ? 26 + (loops.length - 1) * 14 : 0
  return (
    <section aria-label="The flow">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="hv-h2 m-0">The flow</h2>
        <span className="text-[12.5px] text-text-muted">Select a stage to change it. Drag, or use the arrows below, to reorder.</span>
      </div>
      <div ref={wrap} className="hive-scroll relative overflow-x-auto border-y border-[var(--hv-border)] py-6" style={wide && loops.length ? { paddingBottom: 24 + deepest + 22 } : undefined}>
        <ol className="m-0 flex list-none flex-col items-stretch p-0 sm:w-max sm:flex-row sm:items-start">
          {d.stages.map((s, i) => {
            const look = stageLook(s)
            const Icon = look.icon
            const on = i === sel
            return (
              <Fragment key={keys[i]}>
                {i > 0 && <Connector onAdd={() => onAdd(i)} />}
                <motion.li
                  ref={(el: HTMLLIElement | null) => {
                    cards.current[i] = el
                  }}
                  layout
                  transition={{ duration: 0.22, ease: EASE }}
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom != null) onMove(dragFrom, i)
                    setDragFrom(null)
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  className="sm:w-[184px]"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(i)}
                    aria-pressed={on}
                    className={cn(
                      'relative w-full overflow-hidden rounded-[var(--hv-r-card)] border bg-[var(--hv-surface-1)] p-3.5 text-left transition-colors duration-150',
                      on ? 'border-[var(--hv-text-1)]' : 'border-[var(--hv-border)] hover:border-[var(--hv-border-strong)]',
                      dragFrom === i && 'opacity-50',
                      s.optional && 'border-dashed',
                    )}
                  >
                    {on && <span className="absolute inset-x-0 top-0 h-[2px] bg-[var(--hv-accent)]" aria-hidden />}
                    <div className="flex items-start gap-2.5">
                      <span className="hv-serif w-5 shrink-0 pt-px text-[18px] leading-none text-[var(--hv-text-3)]">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold text-[var(--hv-text-1)]">{s.name || 'Untitled'}</div>
                        <div className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-text-muted">
                          <Icon className="size-3 shrink-0" aria-hidden /> {kinds[s.kind]?.label ?? s.kind}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      <MiniTag>{agentSummary(s.agents)}</MiniTag>
                      {s.readOnly && <MiniTag>Read-only</MiniTag>}
                      {s.race && <MiniTag>Race</MiniTag>}
                      {s.crossVendor && <MiniTag>Cross-lab</MiniTag>}
                      {s.gate && (
                        <MiniTag tone="var(--hv-warning)">
                          <RotateCcw className="size-2.5" /> {s.gate.fixStage} ×{s.gate.maxLoops}
                        </MiniTag>
                      )}
                      {s.onlyOnGate && <MiniTag>On send-back</MiniTag>}
                      {s.optional && <MiniTag>Optional</MiniTag>}
                      {s.machineOnly && <MiniTag>Machine</MiniTag>}
                      {s.ship && <MiniTag tone="var(--hv-success)">Commit + PR</MiniTag>}
                    </div>
                  </button>
                </motion.li>
              </Fragment>
            )
          })}
          <Connector onAdd={() => onAdd(d.stages.length)} last />
        </ol>
        {loops.length > 0 && (
          <svg className="pointer-events-none absolute left-0 top-0 h-full overflow-visible" style={{ width: wrap.current?.scrollWidth ?? '100%' }} aria-hidden>
            {loops.map((l) => (
              <g key={l.d}>
                <path d={l.d} fill="none" stroke="var(--hv-text-3)" strokeWidth="1.2" strokeDasharray="3 4" />
                <text x={l.x} y={l.y} textAnchor="middle" className="fill-[var(--hv-text-2)] text-[11.5px] italic" style={{ fontFamily: 'var(--hv-prose)' }}>
                  {l.label}
                </text>
              </g>
            ))}
            {loops.map((l) => {
              const m = /C\S+ \S+ \S+ \S+ (\S+) (\S+)$/.exec(l.d)
              if (!m) return null
              const x = Number(m[1])
              const y = Number(m[2])
              return <path key={`h${l.d}`} d={`M${x - 4} ${y + 8} L${x} ${y} L${x + 4} ${y + 8}`} fill="none" stroke="var(--hv-text-3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            })}
          </svg>
        )}
      </div>
      {gates.length > 0 && !wide && (
        <ul className="m-0 mt-3 list-none space-y-1 p-0 text-[12.5px] text-[var(--hv-text-2)]">
          {gates.map((g) => (
            <li key={g.i} className="flex items-center gap-1.5">
              <RotateCcw className="size-3 text-[var(--hv-text-3)]" aria-hidden /> {d.stages[g.i].name} sends work back to {d.stages[g.to].name}, up to {g.n}×
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function useMediaQuery(q: string) {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(q)
    if (!mq) return
    const f = () => setOn(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [q])
  return on
}

function Connector({ onAdd, last }: { onAdd: () => void; last?: boolean }) {
  return (
    <li className={cn('group/conn relative flex items-center justify-center', 'h-10 sm:h-auto sm:min-h-[96px] sm:w-12', last && 'sm:ml-2 sm:w-auto')}>
      {!last && (
        <>
          <svg className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 overflow-visible text-[var(--hv-text-3)] sm:hidden" aria-hidden>
            <line x1="0.5" y1="0" x2="0.5" y2="100%" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <svg className="absolute left-1 right-1 top-1/2 hidden h-2 -translate-y-1/2 overflow-visible text-[var(--hv-text-3)] sm:block" width="40" height="8" viewBox="0 0 40 8" preserveAspectRatio="none" aria-hidden>
            <path d="M0 4H38M34.5 1L38 4L34.5 7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </>
      )}
      <Tooltip label="Add a stage here">
        <button
          type="button"
          onClick={onAdd}
          aria-label={last ? undefined : 'Add a stage here'}
          className={cn(
            'relative z-[1] grid place-items-center border bg-[var(--hv-bg-app)] text-text-muted transition-colors hover:border-[var(--hv-text-2)] hover:text-text-primary',
            last ? 'h-10 w-full rounded-[var(--hv-r-card)] border-dashed border-[var(--hv-border-strong)] px-4 text-[12.5px] sm:h-[96px] sm:w-[124px]' : 'size-7 rounded-full border-[var(--hv-border-strong)] opacity-100 sm:opacity-0 sm:group-hover/conn:opacity-100 sm:focus-visible:opacity-100',
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
    <span className="inline-flex h-5 items-center gap-1 rounded-[var(--hv-r-chip)] px-1.5 text-[10.5px] font-medium text-[var(--hv-text-2)] ring-1 ring-inset" style={{ ['--tw-ring-color' as string]: tone ? `color-mix(in oklab, ${tone} 55%, transparent)` : 'var(--hv-border)' }}>
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
          <div className="hv-eyebrow">Stage {index + 1} of {count}</div>
          <div className="hv-serif mt-1 truncate text-[20px] leading-tight">{stage.name || 'Untitled'}</div>
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
      <div className="relative flex flex-wrap items-start gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <div className="hv-eyebrow">The Architect</div>
          <h2 id="architect-title" className="hv-h2 mt-1.5 mb-0 text-[21px]">
            Design a pipeline by describing the work
          </h2>
          <p className="mt-1 mb-0 max-w-2xl text-[13.5px] text-text-muted">Tell the strongest model what you want your agents to handle. It asks a few questions, then drafts a pipeline you can save or fine-tune.</p>
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
                  <div className={cn('max-w-[88%] text-[13.5px] leading-relaxed', m.role === 'user' ? 'hv-user-msg px-3.5 py-2.5' : 'border-l border-[var(--hv-border-strong)] py-0.5 pl-3.5 text-text-primary')}>
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
              <div className="px-1" role="status">
                <span className="inline-flex items-center gap-3 text-[13px] text-[var(--hv-text-2)]">
                  <span className="hv-wait-rule" aria-hidden />
                  The Architect is working on it
                  <span className="hv-num text-[var(--hv-text-3)]">{elapsed}s</span>
                </span>
              </div>
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
          <div className="hv-eyebrow mb-2">Proposed pipeline</div>
          <AnimatePresence mode="wait" initial={false}>
            {draft ? (
              <motion.div key={JSON.stringify(draft.stages.map((s) => s.name))} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: EASE }}>
                <div className="hv-serif text-[19px] leading-tight">{draft.name}</div>
                {draft.description && <p className="mt-0.5 text-[12.5px] text-text-muted">{draft.description}</p>}
                <StageStrip stages={draft.stages} size="md" className="mt-2" />
                <ol className="mt-3 space-y-2">
                  {draft.stages.map((s, i) => {
                    const look = stageLook(s)
                    return (
                      <li key={`${s.name}-${i}`} className="flex gap-2.5 border-b border-[var(--hv-border)] py-2.5 last:border-b-0">
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
                      <div className="text-[12.5px] text-[var(--hv-text-3)]">The stages appear here when the Architect sends them.</div>
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
