import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels'
import { OverflowTabs, StatusPill as KitPill } from './kit'
import {
  AlertCircle,
  ArrowRightLeft,
  ArrowUp,
  Bookmark,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Eye,
  FileDiff,
  FilePen,
  FilePlus,
  FileSearch,
  FileText,
  FolderTree,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Globe,
  History,
  LayoutList,
  ListTree,
  Loader2,
  MessageSquareText,
  NotebookPen,
  Play,
  Plus,
  RotateCcw,
  Rocket,
  ScanSearch,
  Search,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  SquareTerminal,
  Trash2,
  Users,
  Wand2,
  X,
  XCircle,
} from 'lucide-react'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { Button, Popover, PopoverContent, PopoverTrigger, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { AgentChip, defaultSpec, shortModel } from './AgentPicker'
import { BoardView } from './BoardView'
import { ChangesView } from './ChangesView'
import { FilesView } from './FilesView'
import { LiveCode } from './LiveCode'
import { FloorFeed, TeamFloor } from './TeamFloor'
import { WorkMap } from './WorkMap'
import { useHive } from './store'
import type { AgentRow, AgentSpec, Checkpoint, Check as CheckRun, HiveEvent, PrInfo } from './types'
import { MODE_INFO, ProviderGlyph, StatusPill, UserDot, duration, fmtCost, fmtTokens, statusColor, timeAgo } from './ui'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')
type DockTab = 'changes' | 'files' | 'checkpoints' | 'ship' | 'terminal' | 'board'

/** An agent's own colour — consistent across the roster, stream and timeline. */
function agentHue(a: Pick<AgentRow, 'name'>): string {
  let h = 0
  for (const c of a.name) h = (h * 33 + c.charCodeAt(0)) % 360
  return `oklch(70% 0.14 ${h})`
}

export function Session() {
  const { detail, detailLoading, online, changesVersion, machines } = useHive()
  const toast = useToast()
  const [focus, setFocus] = useState<string | null>(null)
  const [dock, setDock] = useState<DockTab>('changes')
  const [dockOpen, setDockOpen] = useState(true)
  const [changeCount, setChangeCount] = useState(0)
  const [cps, setCps] = useState<Checkpoint[]>([])
  const [showReads, setShowReads] = useState(true)
  // The team floor (stations) or the detailed stream of every step.
  const [view, setView] = useState<'floor' | 'map' | 'stream'>(() => {
    const v = localStorage.getItem('hive:sessionView')
    return v === 'stream' || v === 'map' ? v : 'floor'
  })
  const pickView = (v: 'floor' | 'map' | 'stream') => {
    setView(v)
    try {
      localStorage.setItem('hive:sessionView', v)
    } catch {
      /* ignore */
    }
  }
  // Phones: the roster and the panel open as full-screen sheets.
  const [sheet, setSheet] = useState<null | 'agents' | 'dock'>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const sheetDrag = useDragControls()
  // A sheet is a dialog: focus moves in, Tab stays inside, Escape closes it.
  useEffect(() => {
    if (!sheet) return
    const back = document.activeElement as HTMLElement | null
    const el = sheetRef.current
    el?.querySelector<HTMLElement>('[data-sheet-close]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setSheet(null)
        return
      }
      if (e.key !== 'Tab' || !el) return
      const f = [...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null)
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      back?.focus?.()
    }
  }, [sheet])
  const small = () => typeof window !== 'undefined' && window.innerWidth < 768
  // Wide screens show the agents column; narrower ones use filter chips and a sheet.
  const wide = useMedia('(min-width: 1024px)')
  const taskId = detail?.task.id
  const { on } = useHive()

  useEffect(() => {
    setFocus(null)
  }, [taskId])
  useEffect(() => {
    if (!taskId) return
    hiveApi
      .changes(taskId)
      .then((r) => setChangeCount(r.changes.length))
      .catch(() => {})
  }, [taskId, changesVersion])
  const loadCps = (): void => {
    if (taskId)
      hiveApi
        .checkpoints(taskId)
        .then((r) => setCps(r.checkpoints))
        .catch(() => {})
  }
  useEffect(() => {
    loadCps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, changesVersion])
  useEffect(() => on('checkpoint', () => loadCps()), [on, taskId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!detail) {
    return detailLoading ? (
      <div className="space-y-4 p-8">
        <div className="hive-shimmer h-8 w-1/2 rounded-lg" />
        <div className="grid grid-cols-[260px_1fr] gap-4">
          <div className="hive-shimmer h-[60vh] rounded-2xl" />
          <div className="hive-shimmer h-[60vh] rounded-2xl" />
        </div>
      </div>
    ) : (
      <div className="grid h-full place-items-center text-[14px] text-text-muted">Session not found</div>
    )
  }

  const { task, agents, events, project } = detail
  const running = agents.some((a) => a.status === 'running' || a.status === 'queued')
  const tokens = agents.reduce((s, a) => s + a.input_tokens + a.output_tokens, 0)
  const cost = fmtCost(agents.reduce((s, a) => s + a.cost_micros, 0))
  const watchers = online.filter((o) => o.view?.taskId === task.id)
  const machine = task.machine_id ? machines.find((m) => m.id === task.machine_id) : null
  const tabs: { id: DockTab; label: string; icon: typeof FileDiff; count?: number }[] = [
    { id: 'changes', label: 'Changes', icon: FileDiff, count: changeCount || undefined },
    { id: 'files', label: 'Files', icon: FolderTree },
    { id: 'checkpoints', label: 'Checkpoints', icon: History, count: cps.length || undefined },
    { id: 'ship', label: 'Ship', icon: Rocket },
    ...(task.machine_id ? [{ id: 'terminal' as const, label: 'Terminal', icon: SquareTerminal }] : []),
    { id: 'board', label: 'Board', icon: NotebookPen },
  ]


  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex items-center gap-x-3 border-b border-[var(--hv-border)] px-4 py-2.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.015em] text-[var(--hv-text-1)]" data-vt-session style={{ viewTransitionName: 'hv-session-title' }}>{task.title}</h1>
          <div className="mt-0.5 flex min-w-0 items-center gap-x-3 overflow-hidden whitespace-nowrap text-[12px] text-[var(--hv-text-3)] [&>*]:shrink-0 [&>*:nth-child(3)]:min-w-0 [&>*:nth-child(3)]:shrink">
            <StatusPill status={task.status} />
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" /> {MODE_INFO[task.mode].label} · {agents.length} agent{agents.length === 1 ? '' : 's'}
            </span>
            {machine ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Server className={cn('size-3.5', machine.online ? 'text-state-success' : 'text-state-warning')} />
                <span className="truncate">
                  {machine.name}:<span className="font-mono">{task.folder}</span>
                </span>
              </span>
            ) : (
              <span className="inline-flex min-w-0 items-center gap-1">
                <GitBranch className="size-3.5" />
                <span className="truncate font-mono">
                  {project.repo_owner}/{project.repo_name} · {task.branch}
                </span>
              </span>
            )}
            <span className="hidden tabular-nums xl:inline">
              {fmtTokens(tokens)} tokens{cost ? ` · ${cost}` : ''}
            </span>
            {task.pr_url && (
              <a href={task.pr_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-state-success hover:underline">
                <GitPullRequest className="size-3.5" /> PR #{task.pr_number}
              </a>
            )}
          </div>
        </div>
        <div className="hidden items-center -space-x-1.5 lg:flex">
          {watchers.map((w) => (
            <UserDot key={w.username} username={w.username} size={6} ring />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Tooltip label="Save the current working copy as a checkpoint">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                hiveApi
                  .saveCheckpoint(task.id)
                  .then(() => (toast.success('Checkpoint saved'), loadCps()))
                  .catch((e) => toast.error(errMsg(e)))
              }
            >
              <Bookmark /> <span className="hidden xl:inline">Checkpoint</span>
            </Button>
          </Tooltip>
          {running && (
            <Button size="sm" variant="secondary" onClick={() => hiveApi.stopTask(task.id).catch((e) => toast.error(errMsg(e)))}>
              <Square className="fill-current" /> <span className="hidden sm:inline">Stop all</span>
            </Button>
          )}
          <Button size="sm" onClick={() => (setDock('ship'), setDockOpen(true), small() && setSheet('dock'))}>
            <Rocket /> Ship
          </Button>
          <Tooltip label={dockOpen ? 'Hide panel' : 'Show panel'}>
            <Button size="icon-sm" variant="ghost" onClick={() => (small() ? setSheet('dock') : setDockOpen((o) => !o))} aria-label="Toggle panel">
              <LayoutList />
            </Button>
          </Tooltip>
        </div>
      </header>

      <SessionPanes
        wide={wide}
        dockOpen={dockOpen}
        roster={
        <aside className="hive-scroll h-full overflow-y-auto border-r border-[var(--hv-border)] p-3" aria-label="Agents">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">Agents</span>
            {focus && (
              <button type="button" onClick={() => setFocus(null)} className="text-[11px] text-accent-brand hover:underline">
                Show all
              </button>
            )}
          </div>
          <div className="space-y-2">
            {agents.map((a) => (
              <AgentCard key={a.id} a={a} events={events} focused={focus === a.id} dim={!!focus && focus !== a.id} onFocus={() => setFocus((f) => (f === a.id ? null : a.id))} />
            ))}
          </div>
          <AddAgent taskId={task.id} />
        </aside>
        }
        stream={
        <section className="flex h-full min-w-0 flex-col" aria-label="Session stream">
          <div className="flex items-center gap-2 border-b hive-line px-4 py-1.5">
            <div className="relative flex shrink-0 rounded-full bg-text-primary/[0.06] p-0.5" role="tablist" aria-label="Session view">
              {(['floor', 'map', 'stream'] as const).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => pickView(v)} className={cn('relative h-6 rounded-full px-2.5 text-[11.5px] font-medium transition-colors', view === v ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary')}>
                  {view === v && <motion.span layoutId="hive-view-pill" className="absolute inset-0 rounded-full bg-bg-surface shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <span className="relative">{v === 'floor' ? 'Team' : v === 'map' ? 'Work map' : 'Every step'}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setSheet('agents')} className={cn('inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-text-primary/[0.07] px-2.5 text-[12px]', wide && 'hidden')}>
              <Users className="size-3.5" /> {agents.length}
            </button>
            <div className={cn('hive-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto', wide && 'invisible')} aria-hidden={wide || undefined}>
              <FilterChip active={!focus} onClick={() => setFocus(null)}>
                Everyone
              </FilterChip>
              {agents.map((a) => (
                <FilterChip key={a.id} active={focus === a.id} onClick={() => setFocus(a.id)} dot={agentHue(a)}>
                  {a.name}
                </FilterChip>
              ))}
            </div>
            <Tooltip label={showReads ? 'Hide reads & searches' : 'Show reads & searches'}>
              <button type="button" onClick={() => setShowReads((v) => !v)} className={cn('grid size-7 place-items-center rounded-md', showReads ? 'text-text-secondary' : 'bg-accent-brand/12 text-accent-brand')} aria-label="Toggle reads">
                <Eye className="size-3.5" />
              </button>
            </Tooltip>
          </div>
          {view === 'floor' ? (
            <div className="hive-scroll min-h-0 flex-1 overflow-y-auto">
              <TeamFloor task={task} agents={agents} events={events} focus={focus} onFocus={(id) => (setFocus(id), pickView('stream'))} />
              <div className="px-4 pb-10 sm:px-6">
                <FloorFeed events={events} agents={agents} />
              </div>
            </div>
          ) : view === 'map' ? (
            <div className="hive-scroll min-h-0 flex-1 overflow-y-auto">
              <WorkMap agents={agents} events={events} onFocus={(id) => (setFocus(id), pickView('stream'))} />
            </div>
          ) : (
            <Stream events={events} agents={agents} focus={focus} showReads={showReads} task={task} cps={cps} />
          )}
          <Timeline agents={agents} events={events} cps={cps} onCheckpoint={() => (setDock('checkpoints'), setDockOpen(true))} start={task.created_at} />
          <CommandBar taskId={task.id} agents={agents} focus={focus} hasMachine={!!task.machine_id} onOpen={(t) => (setDock(t), setDockOpen(true))} />
        </section>
        }
        dock={
          <aside className="flex h-full min-w-0 flex-col" aria-label="Session panel">
            <div className="flex items-center border-b border-[var(--hv-border)] px-2 py-1.5">
              <OverflowTabs label="Session panel" value={dock} onChange={setDock} tabs={tabs.map((t) => ({ id: t.id, label: t.label, count: t.count, icon: <t.icon /> }))} className="flex-1" />
            </div>
              <div className="hive-scroll min-h-0 flex-1 overflow-y-auto">
                {dock === 'changes' && <ChangesView taskId={task.id} agents={agents} />}
                {dock === 'files' && <FilesView taskId={task.id} />}
                {dock === 'checkpoints' && <CheckpointsPanel taskId={task.id} cps={cps} agents={agents} running={running} onChanged={loadCps} />}
                {dock === 'ship' && <ShipPanel />}
                {dock === 'terminal' && task.machine_id && <TerminalPanel machineId={task.machine_id} folder={task.folder ?? ''} />}
                {dock === 'board' && (
                  <div className="p-4">
                    <BoardView agents={agents} events={events} />
                  </div>
                )}
              </div>
          </aside>
        }
      />

      <AnimatePresence>
        {sheet && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }} drag="y" dragListener={false} dragControls={sheetDrag} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }} onDragEnd={(_, info) => (info.offset.y > 120 || info.velocity.y > 600) && setSheet(null)} ref={sheetRef} role="dialog" aria-modal="true" aria-label={sheet === 'dock' ? 'Session panel' : 'Agents'} className="fixed inset-0 z-[960] flex flex-col bg-bg-app md:hidden">
            {/* Drag the top bar down to close (scrolling inside still works). */}
            <div onPointerDown={(e) => sheetDrag.start(e)} className="flex h-6 shrink-0 touch-none items-center justify-center" aria-hidden>
              <span className="h-1 w-9 rounded-full bg-text-primary/20" />
            </div>
            <div className="flex items-center gap-2 border-b hive-line px-3 py-2">
              {sheet === 'dock' ? (
                <div className="hive-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto">
                  {tabs.map((t) => (
                    <button key={t.id} type="button" onClick={() => setDock(t.id)} className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px]', dock === t.id ? 'bg-text-primary/[0.08] text-text-primary' : 'text-text-muted')}>
                      <t.icon className="size-3.5" /> {t.label}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="flex-1 text-[14px] font-semibold">Agents</span>
              )}
              <button type="button" data-sheet-close onClick={() => setSheet(null)} className="grid size-9 place-items-center rounded-lg text-text-muted" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="hive-scroll min-h-0 flex-1 overflow-y-auto">
              {sheet === 'agents' ? (
                <div className="space-y-2 p-3">
                  {agents.map((a) => (
                    <AgentCard key={a.id} a={a} events={events} focused={focus === a.id} dim={false} onFocus={() => (setFocus((f) => (f === a.id ? null : a.id)), setSheet(null))} />
                  ))}
                  <AddAgent taskId={task.id} />
                </div>
              ) : dock === 'changes' ? (
                <ChangesView taskId={task.id} agents={agents} />
              ) : dock === 'files' ? (
                <FilesView taskId={task.id} />
              ) : dock === 'checkpoints' ? (
                <CheckpointsPanel taskId={task.id} cps={cps} agents={agents} running={running} onChanged={loadCps} />
              ) : dock === 'ship' ? (
                <ShipPanel />
              ) : dock === 'terminal' && task.machine_id ? (
                <TerminalPanel machineId={task.machine_id} folder={task.folder ?? ''} />
              ) : (
                <div className="p-4">
                  <BoardView agents={agents} events={events} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterChip({ active, onClick, children, dot }: { active: boolean; onClick: () => void; children: ReactNode; dot?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors', active ? 'bg-text-primary/[0.09] text-text-primary' : 'text-text-muted hover:bg-text-primary/[0.05]')}>
      {dot && <span className="size-2 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  )
}

/* ── Roster card ───────────────────────────────────────────────────────── */
function AgentCard({ a, events, focused, dim, onFocus }: { a: AgentRow; events: HiveEvent[]; focused: boolean; dim: boolean; onFocus: () => void }) {
  const { live, streaming } = useHive()
  const toast = useToast()
  const [steer, setSteer] = useState('')
  const [open, setOpen] = useState(false)
  const working = a.status === 'running'
  const doing = live.find((x) => x.id === a.id)?.doing
  const lastTool = useMemo(() => [...events].reverse().find((e) => e.agent_id === a.id && e.kind === 'tool_call'), [events, a.id])
  const hue = agentHue(a)
  return (
    <div className={cn('hive-card overflow-hidden transition-[opacity,box-shadow]', working && 'hive-working', focused && 'ring-2 ring-accent-brand/45', dim && 'opacity-50')}>
      <button type="button" onClick={onFocus} className="flex w-full items-start gap-2.5 p-3 text-left">
        <span className="relative">
          <ProviderGlyph provider={a.provider} size="md" />
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-[var(--color-bg-surface)]" style={{ background: hue }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-semibold">{a.name}</span>
            {a.role !== 'solo' && <span className="rounded bg-text-primary/[0.07] px-1 text-[10px] uppercase tracking-wide text-text-muted">{a.role}</span>}
          </span>
          <span className="block truncate font-mono text-[11px] text-text-muted">{shortModel(a.model)}</span>
        </span>
        <StatusDotOnly status={a.status} />
      </button>
      <div className="px-3 pb-3">
        {working ? (
          <div className="flex items-center gap-1.5 text-[12px] text-accent-brand">
            <Loader2 className="size-3 animate-spin" />
            <span className="truncate">{doing || (streaming[a.id] ? 'Writing…' : 'Thinking…')}</span>
          </div>
        ) : (
          <div className="line-clamp-2 text-[12px] text-text-secondary">{a.error ? <span className="text-state-error">{a.error}</span> : a.result ?? (lastTool ? `Last: ${String(lastTool.data.name)}` : a.title ?? '')}</div>
        )}
        <div className="mt-2 flex items-center gap-2 text-[11px] tabular-nums text-text-muted">
          <span>{a.steps} steps</span>
          <span>{fmtTokens(a.input_tokens + a.output_tokens)} tok</span>
          {a.started_at && <span>{duration(a.started_at, a.finished_at)}</span>}
          {(a.handoffs ?? 0) > 0 && <span title="Times it moved to another key/provider">↻{a.handoffs}</span>}
          <span className="ml-auto flex gap-0.5">
            {working && (
              <Tooltip label="Stop this agent">
                <button type="button" onClick={() => hiveApi.stopAgent(a.id).catch((e) => toast.error(errMsg(e)))} className="grid size-6 place-items-center rounded-md hover:bg-state-error/10 hover:text-state-error" aria-label="Stop">
                  <Square className="size-3" />
                </button>
              </Tooltip>
            )}
            <Popover open={open} onOpenChange={setOpen}>
              <Tooltip label={working ? 'Steer or hand over' : 'Continue with any model'}>
                <PopoverTrigger asChild>
                  <button type="button" className="grid size-6 place-items-center rounded-md hover:bg-text-primary/[0.07] hover:text-text-primary" aria-label="More">
                    <ArrowRightLeft className="size-3" />
                  </button>
                </PopoverTrigger>
              </Tooltip>
              <PopoverContent align="start" side="right" className="w-[340px] space-y-3 p-3">
                {working && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!steer.trim()) return
                      hiveApi
                        .steer(a.id, steer.trim())
                        .then(() => (setSteer(''), toast.success(`${a.name} will read that next step`)))
                        .catch((err) => toast.error(errMsg(err)))
                    }}
                    className="space-y-2"
                  >
                    <div className="text-[12px] font-medium">Steer {a.name} while it works</div>
                    <textarea value={steer} onChange={(e) => setSteer(e.target.value)} rows={3} placeholder="e.g. keep the API unchanged, only touch the UI" className="w-full rounded-lg border hive-line bg-transparent p-2 text-[12.5px] outline-none focus:border-accent-brand/50" />
                    <Button size="sm" type="submit" className="w-full">
                      <Send /> Send to {a.name}
                    </Button>
                  </form>
                )}
                <HandOver agent={a} onDone={() => setOpen(false)} />
              </PopoverContent>
            </Popover>
          </span>
        </div>
      </div>
    </div>
  )
}

function StatusDotOnly({ status }: { status: string }) {
  return <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', status === 'running' && 'hive-dot-run')} style={{ background: statusColor(status) }} title={status} />
}

function HandOver({ agent, onDone }: { agent: AgentRow; onDone: () => void }) {
  const { boot } = useHive()
  const toast = useToast()
  const [spec, setSpec] = useState<AgentSpec | null>(() => (boot ? defaultSpec(boot) : null))
  const [busy, setBusy] = useState(false)
  if (!boot || !spec) return null
  return (
    <div className="space-y-2">
      <div className="text-[12px] font-medium">Continue {agent.name}’s work with</div>
      <AgentChip boot={boot} spec={spec} onChange={setSpec} />
      <p className="text-[11.5px] text-text-muted">The new agent gets {agent.name}’s instructions, notes and every edit so far — and the whole team roster.</p>
      <Button
        size="sm"
        className="w-full"
        loading={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await hiveApi.handoff(agent.id, spec)
            toast.success('Handed over')
            onDone()
          } catch (e) {
            toast.error(errMsg(e))
          } finally {
            setBusy(false)
          }
        }}
      >
        <ArrowRightLeft /> Continue with {shortModel(spec.model)}
      </Button>
    </div>
  )
}

function AddAgent({ taskId }: { taskId: string }) {
  const { boot } = useHive()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [spec, setSpec] = useState<AgentSpec | null>(() => (boot ? defaultSpec(boot) : null))
  const [prompt, setPrompt] = useState('')
  const [how, setHow] = useState<'together' | 'own' | 'review'>('together')
  const [busy, setBusy] = useState(false)
  if (!boot) return null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed hive-line py-2.5 text-[12.5px] text-text-muted transition-colors hover:border-accent-brand/40 hover:text-text-primary">
          <Plus className="size-3.5" /> Add an agent
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-[380px] space-y-3 p-4">
        <div className="text-[13px] font-semibold">Bring in another agent</div>
        {spec && <AgentChip boot={boot} spec={spec} onChange={setSpec} />}
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-text-primary/[0.05] p-1">
          {(
            [
              ['together', 'Same copy', 'Works with the others on one working copy'],
              ['own', 'Own copy', 'Tries independently — compare, then adopt'],
              ['review', 'Review', 'Read-only audit of the changes'],
            ] as const
          ).map(([id, label, hint]) => (
            <Tooltip key={id} label={hint}>
              <button type="button" onClick={() => setHow(id)} className={cn('h-8 rounded-md text-[12px]', how === id ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted')}>
                {label}
              </button>
            </Tooltip>
          ))}
        </div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder={how === 'review' ? 'What should it check? (leave empty for a full review)' : 'What should it do?'} className="w-full rounded-lg border hive-line bg-transparent p-2.5 text-[13px] outline-none focus:border-accent-brand/50" />
        <Button
          className="w-full"
          loading={busy}
          disabled={!spec || (how !== 'review' && !prompt.trim())}
          onClick={async () => {
            if (!spec) return
            setBusy(true)
            try {
              if (how === 'own') await hiveApi.assign(taskId, { instructions: prompt.trim(), agents: [spec], together: false })
              else await hiveApi.addAgent(taskId, { prompt: prompt.trim() || 'Review every change in this task for bugs, regressions, security problems and missing tests. Report findings with file and line.', agent: spec, readOnly: how === 'review' })
              setPrompt('')
              setOpen(false)
              toast.success('Agent added')
            } catch (e) {
              toast.error(errMsg(e))
            } finally {
              setBusy(false)
            }
          }}
        >
          <Sparkles /> Add agent
        </Button>
      </PopoverContent>
    </Popover>
  )
}

/* ── The stream: every agent's steps, interleaved ──────────────────────── */
const TOOL_ICON: Record<string, typeof FileText> = {
  read_file: FileText,
  list_files: ListTree,
  search: FileSearch,
  write_file: FilePlus,
  edit_file: FilePen,
  delete_file: Trash2,
  view_changes: FileDiff,
  team_note: MessageSquareText,
  read_team_board: Users,
  delegate: Users,
  remember: Brain,
  read_url: Globe,
  run_command: SquareTerminal,
  start_server: Play,
  server_logs: ScanSearch,
  stop_server: Square,
  fetch_local: Globe,
  finish: Check,
}
const READS = new Set(['read_file', 'list_files', 'search', 'view_changes', 'read_team_board', 'server_logs'])

function toolLine(name: string, input: Record<string, unknown>, meta?: Record<string, unknown> | null): ReactNode {
  const p = String(input.path ?? '')
  const code = (s: string) => <span className="font-mono text-[12px] text-text-primary">{s}</span>
  switch (name) {
    case 'read_file':
      return <>Read {code(p)}{meta?.lines ? <span className="text-text-muted"> · {String(meta.lines)} lines</span> : null}</>
    case 'list_files':
      return <>Listed {code(p || 'the repository')}{input.pattern ? <> matching {code(String(input.pattern))}</> : null}</>
    case 'search':
      return <>Searched {code(String(input.query))}{meta?.count != null ? <span className="text-text-muted"> · {String(meta.count)} matches</span> : null}</>
    case 'write_file':
      return <>Wrote {code(p)}</>
    case 'edit_file':
      return <>Edited {code(p)}</>
    case 'delete_file':
      return <>Deleted {code(p)}</>
    case 'view_changes':
      return <>Reviewed the changes</>
    case 'team_note':
      return <>Posted to the team board</>
    case 'read_team_board':
      return <>Checked the team board</>
    case 'delegate':
      return <>Delegated {Array.isArray(input.tasks) ? input.tasks.length : ''} sub-tasks</>
    case 'remember':
      return <>Saved to project memory: <span className="text-text-primary">{String(input.title)}</span></>
    case 'read_url':
      return <>Read {code(String(input.url))}</>
    case 'run_command':
      return <>Ran {code(String(input.command))}</>
    case 'start_server':
      return <>Started {code(String(input.command))}</>
    case 'server_logs':
      return <>Read logs of {code(String(input.name))}</>
    case 'stop_server':
      return <>Stopped {code(String(input.name))}</>
    case 'fetch_local':
      return <>Fetched {code(String(input.url))}</>
    case 'finish':
      return <>Finished</>
    default:
      return <>{name}</>
  }
}

type Item =
  | { kind: 'turn'; agent: AgentRow; events: HiveEvent[]; at: number }
  | { kind: 'system'; ev: HiveEvent }
  | { kind: 'checkpoint'; cp: Checkpoint }

function Stream({ events, agents, focus, showReads, task, cps }: { events: HiveEvent[]; agents: AgentRow[]; focus: string | null; showReads: boolean; task: { prompt: string; created_by: string; created_at: number }; cps: Checkpoint[] }) {
  const { streaming, thinking } = useHive()
  const ref = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(true)
  const byId = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents])
  const items = useMemo(() => {
    const out: Item[] = []
    const merged = [...events.map((e) => ({ at: e.created_at, e })), ...cps.map((c) => ({ at: c.created_at, c }))].sort((a, b) => a.at - b.at)
    for (const x of merged) {
      if ('c' in x) {
        if (!focus) out.push({ kind: 'checkpoint', cp: x.c })
        continue
      }
      const e = x.e
      if (!e.agent_id) {
        if (!focus) out.push({ kind: 'system', ev: e })
        continue
      }
      if (focus && e.agent_id !== focus) continue
      const agent = byId.get(e.agent_id)
      if (!agent) continue
      const last = out[out.length - 1]
      if (last?.kind === 'turn' && last.agent.id === agent.id) last.events.push(e)
      else out.push({ kind: 'turn', agent, events: [e], at: e.created_at })
    }
    return out
  }, [events, cps, focus, byId])
  const liveAgents = agents.filter((a) => a.status === 'running' && (!focus || a.id === focus))
  const liveLen = liveAgents.reduce((s, a) => s + (streaming[a.id]?.length ?? 0), 0)

  useEffect(() => {
    if (pinned) ref.current?.scrollTo({ top: ref.current.scrollHeight })
  }, [items.length, liveLen, pinned])

  return (
    <div ref={ref} onScroll={(e) => setPinned(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight < 140)} className="hive-scroll relative min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[880px] px-4 py-5 sm:px-6">
        {/* The request */}
        <div className="mb-6 flex gap-3">
          <UserDot username={task.created_by} size={7} />
          <div className="min-w-0 flex-1">
            <div className="text-[11.5px] text-text-muted">
              @{task.created_by} · {timeAgo(task.created_at)}
            </div>
            <div className="mt-1 whitespace-pre-wrap rounded-2xl rounded-tl-md bg-accent-brand/[0.1] px-4 py-3 text-[14px] leading-relaxed ring-1 ring-accent-brand/20">{task.prompt}</div>
          </div>
        </div>
        {items.map((it, i) =>
          it.kind === 'turn' ? (
            <Turn key={`t${i}`} agent={it.agent} events={it.events} showReads={showReads} />
          ) : it.kind === 'checkpoint' ? (
            <CheckpointMark key={it.cp.id} cp={it.cp} />
          ) : (
            <SystemLine key={it.ev.id} ev={it.ev} />
          ),
        )}
        {liveAgents.map((a) => (
          <LiveTurn key={a.id} agent={a} text={streaming[a.id] ?? ''} think={thinking[a.id] ?? ''} events={events.filter((e) => e.agent_id === a.id)} />
        ))}
        {!items.length && !liveAgents.length && <div className="py-10 text-center text-[13px] text-text-muted">Agents are getting ready…</div>}
      </div>
      {!pinned && (
        <button type="button" onClick={() => setPinned(true)} className="sticky bottom-3 left-1/2 mx-auto block -translate-x-0 rounded-full bg-bg-surface px-3 py-1.5 text-[12px] shadow-lg ring-1 ring-[var(--hive-line)]">
          ↓ Jump to live
        </button>
      )}
    </div>
  )
}

function AgentBadge({ agent }: { agent: AgentRow }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <ProviderGlyph provider={agent.provider} size="xs" />
      <span className="text-[12.5px] font-semibold" style={{ color: agentHue(agent) }}>
        {agent.name}
      </span>
      <span className="font-mono text-[10.5px] text-text-muted">{shortModel(agent.model)}</span>
    </span>
  )
}

function Turn({ agent, events, showReads }: { agent: AgentRow; events: HiveEvent[]; showReads: boolean }) {
  const results = useMemo(() => {
    const m = new Map<string, HiveEvent>()
    for (const e of events) if (e.kind === 'tool_result') m.set(String(e.data.id), e)
    return m
  }, [events])
  const hue = agentHue(agent)
  return (
    <div className="hive-in relative mb-5 pl-5">
      <span className="absolute bottom-1 left-[5px] top-6 w-px" style={{ background: `color-mix(in oklab, ${hue} 35%, transparent)` }} />
      <span className="absolute left-0 top-1.5 size-[11px] rounded-full ring-4 ring-[var(--color-bg-app)]" style={{ background: hue }} />
      <div className="mb-1.5 flex items-center gap-2">
        <AgentBadge agent={agent} />
        <span className="text-[11px] text-text-muted">{timeAgo(events[0]?.created_at)}</span>
      </div>
      <div className="space-y-1.5">
        {groupReads(events).map((e) => {
          if (Array.isArray(e)) return showReads ? <ReadGroup key={e[0].id} calls={e} results={results} /> : null
          if (e.kind === 'text' && e.data.text) return <AiMarkdown key={e.id} text={String(e.data.text)} />
          if (e.kind === 'tool_call') {
            const name = String(e.data.name)
            if (!showReads && READS.has(name)) return null
            return <ToolCard key={e.id} call={e} result={results.get(String(e.data.id))} />
          }
          if (e.kind === 'approval') return <ApprovalLine key={e.id} ev={e} />
          if (e.kind === 'approval_result')
            return (
              <div key={e.id} className={cn('flex items-center gap-1.5 text-[12px]', e.data.approved ? 'text-state-success' : 'text-state-error')}>
                {e.data.approved ? <ShieldCheck className="size-3.5" /> : <XCircle className="size-3.5" />}
                {e.data.approved ? `Approved${e.data.by ? ` by @${String(e.data.by)}` : ''}` : `Denied — ${String(e.data.reason ?? '')}`}
              </div>
            )
          if (e.kind === 'status' && (e.data.status === 'done' || e.data.status === 'failed' || e.data.status === 'stopped') && (e.data.summary || e.data.error))
            return <ResultCard key={e.id} agent={agent} ev={e} />
          if (e.kind === 'error') return <div key={e.id} className="flex items-start gap-1.5 rounded-lg bg-state-error/[0.08] px-3 py-2 text-[12.5px] text-state-error"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{String(e.data.message)}</div>
          if (e.kind === 'handoff')
            return (
              <div key={e.id} className="flex items-center gap-1.5 text-[12px] text-state-warning">
                <ArrowRightLeft className="size-3.5" /> {String(e.data.reason ?? 'Handed over')}
              </div>
            )
          if (e.kind === 'steer')
            return (
              <div key={e.id} className="rounded-lg bg-state-info/[0.08] px-3 py-2 text-[12.5px]">
                <span className="font-medium text-state-info">@{String(e.data.username)} steered:</span> {String(e.data.message)}
              </div>
            )
          if (e.kind === 'note') return <div key={e.id} className="text-[12px] italic text-text-muted">{String(e.data.message ?? e.data.text ?? '')}</div>
          return null
        })}
      </div>
    </div>
  )
}

/**
 * Back-to-back reads and searches (2 or more, ignoring their results) become one
 * group, so the stream shows the work, not every file that was opened.
 */
function groupReads(events: HiveEvent[]): (HiveEvent | HiveEvent[])[] {
  const out: (HiveEvent | HiveEvent[])[] = []
  let run: HiveEvent[] = []
  const flush = () => {
    if (run.length >= 2) out.push(run)
    else out.push(...run)
    run = []
  }
  for (const e of events) {
    if (e.kind === 'tool_result') continue
    if (e.kind === 'tool_call' && READS.has(String(e.data.name))) run.push(e)
    else {
      flush()
      out.push(e)
    }
  }
  flush()
  return out
}

function ReadGroup({ calls, results }: { calls: HiveEvent[]; results: Map<string, HiveEvent> }) {
  const [open, setOpen] = useState(false)
  const files = calls.filter((c) => c.data.name === 'read_file').length
  const searches = calls.filter((c) => c.data.name === 'search').length
  const others = calls.length - files - searches
  const live = calls.some((c) => !results.has(String(c.data.id)))
  const label = [files && `Read ${files} file${files === 1 ? '' : 's'}`, searches && `searched ${searches} time${searches === 1 ? '' : 's'}`, others && `${others} other look${others === 1 ? '' : 's'}`].filter(Boolean).join(', ')
  return (
    <div className="rounded-[var(--hv-r-btn)]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 rounded-[var(--hv-r-btn)] px-2 py-1 text-left text-[12.5px] text-[var(--hv-text-2)] hover:bg-[var(--hv-surface-2)]">
        <Search className="size-3.5 shrink-0 text-[var(--hv-text-3)]" />
        <span className={cn('min-w-0 flex-1 truncate', live && 'hive-shine')}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
        <ChevronDown className={cn('size-3.5 shrink-0 text-[var(--hv-text-3)] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-1 space-y-1.5 border-l border-[var(--hv-border)] pl-3">
          {calls.map((c) => (
            <ToolCard key={c.id} call={c} result={results.get(String(c.data.id))} />
          ))}
        </div>
      )}
    </div>
  )
}

function ToolCard({ call, result }: { call: HiveEvent; result?: HiveEvent }) {
  const name = String(call.data.name)
  const input = (call.data.input ?? {}) as Record<string, unknown>
  const meta = (result?.data.meta ?? null) as Record<string, unknown> | null
  const err = !!result?.data.isError
  const Icon = TOOL_ICON[name] ?? Wand2
  const write = ['write_file', 'edit_file', 'delete_file'].includes(name)
  const cmd = ['run_command', 'start_server', 'server_logs', 'fetch_local'].includes(name)
  const [open, setOpen] = useState(write || (cmd && err))
  const expandable = write || cmd || name === 'delegate' || name === 'search' || name === 'read_url' || err || name === 'team_note' || name === 'remember'
  if (name === 'finish') return null
  const exit = meta?.exit
  return (
    <div className={cn('overflow-hidden rounded-xl border transition-colors', err ? 'border-state-error/30 bg-state-error/[0.04]' : write ? 'border-accent-brand/20 bg-accent-brand/[0.03]' : 'border-transparent')}>
      <button type="button" disabled={!expandable} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px] text-text-secondary">
        <Icon className={cn('size-3.5 shrink-0', err ? 'text-state-error' : write ? 'text-accent-brand' : cmd ? 'text-state-info' : 'text-text-muted')} />
        <span className="min-w-0 flex-1 truncate">{toolLine(name, input, meta)}</span>
        {cmd && exit != null && <span className={cn('rounded px-1.5 font-mono text-[10.5px]', exit === 0 ? 'bg-state-success/12 text-state-success' : 'bg-state-error/12 text-state-error')}>exit {String(exit)}</span>}
        {!result ? <Loader2 className="size-3 animate-spin text-text-muted" /> : err ? <AlertCircle className="size-3.5 text-state-error" /> : null}
        {expandable && <ChevronRight className={cn('size-3.5 text-text-muted transition-transform', open && 'rotate-90')} />}
      </button>
      <AnimatePresence initial={false}>
        {open && expandable && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="px-2.5 pb-2.5">
              {name === 'edit_file' && <MiniDiff before={String(input.old_string ?? '')} after={String(input.new_string ?? '')} />}
              {name === 'write_file' && <MiniDiff before="" after={String(input.content ?? '')} />}
              {cmd && <pre className="hive-term max-h-72 overflow-auto rounded-lg px-3 py-2">{String(result?.data.preview ?? '…')}</pre>}
              {name === 'delegate' && Array.isArray(input.tasks) && (
                <ol className="list-decimal space-y-1 pl-5 text-[12.5px] text-text-secondary">
                  {(input.tasks as { title: string; agent?: string; difficulty?: string }[]).map((t, i) => (
                    <li key={i}>
                      {t.title}
                      {t.agent && <span className="text-text-muted"> → {t.agent}</span>}
                      {t.difficulty && <span className="text-text-muted"> · {t.difficulty}</span>}
                    </li>
                  ))}
                </ol>
              )}
              {(name === 'team_note' || name === 'remember') && <p className="text-[12.5px] text-text-secondary">{String(input.message ?? input.note ?? '')}</p>}
              {(name === 'search' || name === 'read_url' || (err && !cmd)) && <pre className="hive-code max-h-56 overflow-auto rounded-lg bg-text-primary/[0.04] px-3 py-2 text-[11.5px] text-text-secondary">{String(result?.data.preview ?? '')}</pre>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** A compact diff of an edit: removed lines then added lines. */
function MiniDiff({ before, after }: { before: string; after: string }) {
  const a = before ? before.split('\n') : []
  const b = after ? after.split('\n') : []
  // Trim the common prefix/suffix so the change itself stands out.
  let s = 0
  while (s < a.length && s < b.length && a[s] === b[s]) s++
  let e = 0
  while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++
  const ctxTop = a.slice(Math.max(0, s - 2), s)
  const del = a.slice(s, a.length - e)
  const add = b.slice(s, b.length - e)
  const ctxBottom = a.slice(a.length - e, a.length - e + 2)
  const rows: { t: ' ' | '-' | '+'; l: string }[] = [...ctxTop.map((l) => ({ t: ' ' as const, l })), ...del.map((l) => ({ t: '-' as const, l })), ...add.map((l) => ({ t: '+' as const, l })), ...ctxBottom.map((l) => ({ t: ' ' as const, l }))]
  const shown = rows.slice(0, 80)
  return (
    <div className="hive-diff max-h-80 overflow-auto rounded-lg bg-text-primary/[0.035] py-1.5">
      {shown.map((r, i) => (
        <div key={i} className={cn('flex gap-2 whitespace-pre px-3', r.t === '+' && 'add', r.t === '-' && 'del')}>
          <span className="ln w-3 shrink-0">{r.t === ' ' ? '' : r.t}</span>
          <span>{r.l || ' '}</span>
        </div>
      ))}
      {rows.length > shown.length && <div className="px-3 pt-1 text-[11px] text-text-muted">… {rows.length - shown.length} more lines</div>}
      <div className="mt-1 flex gap-3 px-3 text-[10.5px] text-text-muted">
        <span className="text-[var(--hive-add-ink)]">+{add.length}</span>
        <span className="text-[var(--hive-del-ink)]">−{del.length}</span>
      </div>
    </div>
  )
}

function ApprovalLine({ ev }: { ev: HiveEvent }) {
  const { approvals, answerApproval, detail } = useHive()
  const pending = approvals.find((a) => a.taskId === detail?.task.id && a.command === ev.data.command)
  return (
    <div className={cn('rounded-[var(--hv-r-card)] border p-3', pending ? 'border-[color-mix(in_oklab,var(--hv-warning)_40%,transparent)] bg-[color-mix(in_oklab,var(--hv-warning)_6%,transparent)]' : 'border-[var(--hv-border)]')}>
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--hv-text-2)]">
        <ShieldAlert className="size-3.5 text-[var(--hv-warning)]" />
        <span className="min-w-0 flex-1">
          Wants to {ev.data.kind === 'server' ? 'start a server' : 'run a command'} on <b className="font-medium text-[var(--hv-text-1)]">{String(ev.data.machine)}</b>
        </span>
        {pending ? <StatusPill status="needs" /> : null}
      </div>
      <pre className="hive-term mt-2 overflow-auto rounded-[var(--hv-r-btn)] px-3 py-2">$ {String(ev.data.command)}</pre>
      {pending && (
        <div className="mt-2 flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => answerApproval(pending.id, false)}>
            <X /> Deny
          </Button>
          <Button size="sm" onClick={() => answerApproval(pending.id, true)}>
            <Check /> Run it
          </Button>
        </div>
      )}
    </div>
  )
}

function ResultCard({ agent, ev }: { agent: AgentRow; ev: HiveEvent }) {
  const ok = ev.data.status === 'done'
  return (
    <div className={cn('rounded-2xl border p-4', ok ? 'border-state-success/30 bg-state-success/[0.05]' : 'border-state-error/30 bg-state-error/[0.05]')}>
      <div className={cn('mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold', ok ? 'text-state-success' : 'text-state-error')}>
        {ok ? <Check className="size-4" /> : <XCircle className="size-4" />} {agent.name} {ok ? 'finished' : ev.data.status === 'stopped' ? 'stopped' : 'failed'}
      </div>
      {ev.data.summary ? <AiMarkdown text={String(ev.data.summary)} size="compact" /> : null}
      {ev.data.error ? <p className="text-[12.5px] text-state-error">{String(ev.data.error)}</p> : null}
    </div>
  )
}

function SystemLine({ ev }: { ev: HiveEvent }) {
  if (ev.kind === 'commit')
    return (
      <div className="my-4 flex items-center gap-2 rounded-xl border border-state-info/30 bg-state-info/[0.06] px-3.5 py-2.5 text-[12.5px]">
        <GitBranch className="size-4 text-state-info" />
        <span className="min-w-0 flex-1 truncate">
          @{String(ev.data.username)} committed {String(ev.data.files ?? '')} files to <span className="font-mono">{String(ev.data.branch)}</span>
        </span>
        {ev.data.pr ? (
          <a href={String((ev.data.pr as { url: string }).url)} target="_blank" rel="noreferrer" className="text-state-success hover:underline">
            PR #{String((ev.data.pr as { number: number }).number)}
          </a>
        ) : null}
      </div>
    )
  if (ev.kind === 'merge')
    return (
      <div className="my-4 flex items-center gap-2 rounded-xl border border-state-success/30 bg-state-success/[0.07] px-3.5 py-2.5 text-[12.5px] font-medium text-state-success">
        <GitMerge className="size-4" /> @{String(ev.data.username)} merged into {String(ev.data.base)} — deploying
      </div>
    )
  const msg = String(ev.data.message ?? '')
  if (!msg) return null
  return (
    <div className="my-3 flex items-center gap-3 text-[11.5px] text-text-muted">
      <span className="h-px flex-1 bg-[var(--hive-line)]" />
      <span className="max-w-[70%] truncate">{msg}</span>
      <span className="h-px flex-1 bg-[var(--hive-line)]" />
    </div>
  )
}

function CheckpointMark({ cp }: { cp: Checkpoint }) {
  return (
    <div className="my-3 flex items-center gap-2 text-[11.5px] text-text-muted">
      <span className="h-px w-6 bg-[var(--hive-line)]" />
      <Bookmark className="size-3 text-accent-brand" />
      <span className="truncate">Checkpoint · {cp.label}</span>
      <span className="shrink-0">· {cp.files} files</span>
      <span className="h-px flex-1 bg-[var(--hive-line)]" />
    </div>
  )
}

function LiveTurn({ agent, text, think, events }: { agent: AgentRow; text: string; think: string; events: HiveEvent[] }) {
  const { code } = useHive()
  const writing = code[agent.id] && !code[agent.id].done && Date.now() - code[agent.id].at < 8000
  return (
    <div className="relative mb-5 pl-5">
      <span className="absolute left-0 top-1.5 size-[11px] animate-pulse rounded-full ring-4 ring-[var(--color-bg-app)]" style={{ background: agentHue(agent) }} />
      <div className="mb-1.5 flex items-center gap-2">
        <AgentBadge agent={agent} />
        <span className="hive-shine text-[11.5px] font-medium">{writing ? 'writing code' : text ? 'typing' : 'thinking'}</span>
      </div>
      {think && !text && (
        <div className="mb-2 flex items-start gap-2 rounded-xl bg-text-primary/[0.04] px-3 py-2">
          <Brain className="mt-0.5 size-3.5 shrink-0 text-accent-brand" />
          <p className="line-clamp-3 text-[12.5px] italic text-text-muted">{think.slice(-600)}</p>
        </div>
      )}
      {text && <AiMarkdown text={text} streaming />}
      {writing && (
        <div className="mt-2 overflow-hidden rounded-xl border hive-line">
          <LiveCode agent={agent} events={events} />
        </div>
      )}
    </div>
  )
}

/* ── Timeline: one track per agent, checkpoints on top ─────────────────── */
function Timeline({ agents, events, cps, start, onCheckpoint }: { agents: AgentRow[]; events: HiveEvent[]; cps: Checkpoint[]; start: number; onCheckpoint: () => void }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 2000)
    return () => clearInterval(t)
  }, [])
  const end = Math.max(Date.now(), ...events.map((e) => e.created_at))
  const span = Math.max(1, end - start)
  const x = (t: number) => `${Math.max(0, Math.min(100, ((t - start) / span) * 100))}%`
  if (!agents.length) return null
  return (
    <div className="border-t hive-line bg-text-primary/[0.015] px-4 py-2">
      <div className="relative h-3">
        {cps.filter((c, i) => i === cps.length - 1 || Math.abs(parseFloat(x(cps[i + 1].created_at)) - parseFloat(x(c.created_at))) > 3).map((c) => (
          <Tooltip key={c.id} label={`${c.label} · ${c.files} files · ${timeAgo(c.created_at)}`}>
            <button type="button" onClick={onCheckpoint} className="group absolute -top-2 grid size-6 -translate-x-1/2 place-items-center" style={{ left: x(c.created_at) }} aria-label={c.label}>
              <span className="size-2.5 rotate-45 rounded-[2px] bg-accent-brand transition-transform group-hover:scale-125" />
            </button>
          </Tooltip>
        ))}
      </div>
      <div className="space-y-1">
        {agents.map((a) => {
          const evs = events.filter((e) => e.agent_id === a.id && (e.kind === 'tool_call' || e.kind === 'text' || e.kind === 'error'))
          const s = a.started_at ?? a.created_at
          const f = a.finished_at ?? (a.status === 'running' ? Date.now() : s)
          return (
            <div key={a.id} className="flex items-center gap-2">
              <span className="w-16 shrink-0 truncate text-[10.5px] font-medium" style={{ color: `color-mix(in oklab, ${agentHue(a)} 60%, var(--color-text-primary))` }}>
                {a.name}
              </span>
              <div className="relative h-2.5 flex-1 rounded-full bg-text-primary/[0.04]">
                <div className={cn('absolute inset-y-0 rounded-full', a.status === 'running' && 'hive-dot-run')} style={{ left: x(s), width: `calc(${x(f)} - ${x(s)} + 3px)`, background: `color-mix(in oklab, ${agentHue(a)} 30%, transparent)` }} />
                {evs.map((e) => (
                  <span key={e.id} className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: x(e.created_at), background: e.kind === 'error' ? 'var(--color-state-error)' : agentHue(a) }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-text-muted">
        <span>{new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span>{duration(start, end)}</span>
        <span>now</span>
      </div>
    </div>
  )
}

/* ── Command bar: follow-ups and slash commands ────────────────────────── */
const COMMANDS = [
  { cmd: '/add', hint: 'Add an agent working with the others', example: '/add write tests for the cart' },
  { cmd: '/race', hint: 'Give this to a new agent on its own copy', example: '/race try a different approach' },
  { cmd: '/review', hint: 'A read-only agent reviews every change', example: '/review focus on security' },
  { cmd: '/steer', hint: 'Message the focused running agent', example: '/steer keep the API unchanged' },
  { cmd: '/run', hint: 'Run a command on the machine (terminal)', example: '/run npm test' },
  { cmd: '/checkpoint', hint: 'Save the working copy', example: '/checkpoint before refactor' },
  { cmd: '/restore', hint: 'Open checkpoints to restore an earlier result', example: '/restore' },
  { cmd: '/ship', hint: 'Commit, open a PR, watch CI, merge', example: '/ship' },
]

function CommandBar({ taskId, agents, focus, hasMachine, onOpen }: { taskId: string; agents: AgentRow[]; focus: string | null; hasMachine: boolean; onOpen: (t: DockTab) => void }) {
  const { boot, detail } = useHive()
  const toast = useToast()
  const [text, setText] = useState('')
  const [spec, setSpec] = useState<AgentSpec | null>(() => (boot ? defaultSpec(boot) : null))
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState(0)
  const ta = useRef<HTMLTextAreaElement>(null)
  const focusAgent = agents.find((a) => a.id === focus)
  const steering = focusAgent?.status === 'running'
  const slash = text.startsWith('/') && !text.includes(' ') ? COMMANDS.filter((c) => c.cmd.startsWith(text.toLowerCase())) : []
  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(200, el.scrollHeight)}px`
  }, [text])

  const run = async () => {
    const raw = text.trim()
    if (!raw || busy) return
    const [head, ...rest] = raw.split(/\s+/)
    const body = raw.slice(head.length).trim()
    setBusy(true)
    try {
      if (head === '/restore') onOpen('checkpoints')
      else if (head === '/ship') onOpen('ship')
      else if (head === '/checkpoint') {
        await hiveApi.saveCheckpoint(taskId, body || undefined)
        toast.success('Checkpoint saved')
      } else if (head === '/run') {
        if (!hasMachine || !detail?.task.machine_id) throw new Error('This session has no machine — commands need one (Machines)')
        onOpen('terminal')
        document.dispatchEvent(new CustomEvent('hive:terminal', { detail: body }))
      } else if (head === '/steer' || (steering && !raw.startsWith('/'))) {
        if (!focusAgent || focusAgent.status !== 'running') throw new Error('Focus a running agent first (click it in the roster)')
        await hiveApi.steer(focusAgent.id, head === '/steer' ? body : raw)
        toast.success(`${focusAgent.name} will read that next`)
      } else if (head === '/review') {
        if (!spec) throw new Error('Pick a model')
        await hiveApi.addAgent(taskId, { prompt: body || 'Review every change in this task for bugs, regressions, security problems and missing tests.', agent: spec, readOnly: true })
      } else if (head === '/race') {
        if (!spec) throw new Error('Pick a model')
        await hiveApi.assign(taskId, { instructions: body || 'Attempt this task independently.', agents: [spec], together: false })
      } else {
        if (!spec) throw new Error('Pick a model')
        const prompt = head === '/add' ? body : raw
        if (!prompt) throw new Error('Say what the agent should do')
        await hiveApi.addAgent(taskId, { prompt, agent: spec })
      }
      setText('')
      void rest
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  if (!boot) return null
  return (
    <div className="border-t hive-line px-3 pb-3 pt-2 sm:px-4">
      <div className="hive-composer relative mx-auto max-w-[880px] rounded-2xl p-2">
        <AnimatePresence>
          {slash.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="hive-card absolute bottom-full left-0 mb-2 w-full max-w-md overflow-hidden p-1 shadow-xl">
              {slash.map((c, i) => (
                <button
                  key={c.cmd}
                  type="button"
                  onMouseEnter={() => setSel(i)}
                  onClick={() => (setText(`${c.cmd} `), ta.current?.focus())}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left', i === sel && 'bg-accent-brand/10')}
                >
                  <span className="w-24 font-mono text-[12.5px] text-accent-brand">{c.cmd}</span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-text-secondary">{c.hint}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <textarea
          ref={ta}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (slash.length && (e.key === 'Tab' || (e.key === 'Enter' && text.length < 12 && !text.includes(' ')))) {
              e.preventDefault()
              setText(`${slash[Math.min(sel, slash.length - 1)].cmd} `)
              return
            }
            if (slash.length && e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(slash.length - 1, s + 1)))
            else if (slash.length && e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(0, s - 1)))
            else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              run()
            }
          }}
          rows={1}
          placeholder={steering ? `Steer ${focusAgent?.name} — or type / for commands` : 'Ask for more, or bring in an agent — type / for commands'}
          className="hive-scroll block max-h-[200px] min-h-[40px] w-full resize-none bg-transparent px-2 py-1.5 text-[14px] outline-none placeholder:text-text-muted"
        />
        <div className="flex items-center gap-1.5 px-1">
          {steering ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-state-info/12 px-2.5 py-1 text-[12px] text-state-info">
              <Code2 className="size-3.5" /> Steering {focusAgent?.name}
            </span>
          ) : (
            spec && <AgentChip boot={boot} spec={spec} onChange={setSpec} side="top" />
          )}
          <span className="hidden whitespace-nowrap text-[11px] text-text-muted sm:inline">
            <span className="hive-kbd">/</span> commands
          </span>
          <button type="button" onClick={run} disabled={!text.trim() || busy} className="ml-auto grid size-8 place-items-center rounded-full bg-accent-brand text-on-accent-brand transition-transform enabled:hover:scale-105 disabled:opacity-35" aria-label="Send">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" strokeWidth={2.4} />}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Checkpoints panel ─────────────────────────────────────────────────── */
function CheckpointsPanel({ taskId, cps, agents, running, onChanged }: { taskId: string; cps: Checkpoint[]; agents: AgentRow[]; running: boolean; onChanged: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const byId = new Map(agents.map((a) => [a.id, a]))
  const restore = async (cp: Checkpoint) => {
    if (running && !window.confirm('Agents are still working. Restore anyway? Their next edits land on top of the restored state.')) return
    setBusy(cp.id)
    try {
      await hiveApi.restoreCheckpoint(taskId, cp.id, running)
      toast.success('Restored', `The working copy is back to “${cp.label}”. The state before is saved as a checkpoint too.`)
      onChanged()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="p-4">
      <div className="mb-4 rounded-xl bg-accent-brand/[0.07] p-3 text-[12.5px] text-text-secondary ring-1 ring-accent-brand/20">
        Every agent’s result is saved here automatically. Not happy with the latest one? Restore an earlier result — nothing is lost, the current state is saved first.
      </div>
      <ol className="relative space-y-2 border-l hive-line pl-4">
        {cps.map((c, i) => {
          const a = c.agent_id ? byId.get(c.agent_id) : null
          return (
            <li key={c.id} className="relative">
              <span className={cn('absolute -left-[21px] top-3 size-2.5 rotate-45 rounded-[2px]', i === 0 ? 'bg-accent-brand' : 'bg-text-muted/50')} />
              <div className="hive-card hive-card-hover flex items-start gap-3 p-3">
                {a ? <ProviderGlyph provider={a.provider} size="sm" /> : <Bookmark className="mt-0.5 size-4 text-text-muted" />}
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-[13px] font-medium">{c.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-text-muted">
                    {c.files} file{c.files === 1 ? '' : 's'} · {timeAgo(c.created_at)} ago{c.created_by ? ` · @${c.created_by}` : c.auto ? ' · automatic' : ''}
                    {i === 0 && <span className="ml-1 text-accent-brand">· latest</span>}
                  </div>
                </div>
                <Button size="sm" variant="secondary" loading={busy === c.id} onClick={() => restore(c)}>
                  {busy !== c.id && <RotateCcw />} Restore
                </Button>
              </div>
            </li>
          )
        })}
      </ol>
      {!cps.length && <p className="text-center text-[13px] text-text-muted">No checkpoints yet — one is saved whenever an agent finishes.</p>}
    </div>
  )
}

/* ── Ship: commit → PR → checks → merge → live ─────────────────────────── */
function ShipPanel() {
  const { detail, boot, refreshDetail } = useHive()
  const toast = useToast()
  const [msg, setMsg] = useState('')
  const [branch, setBranch] = useState('')
  const [busy, setBusy] = useState(false)
  const [pr, setPr] = useState<{ pr: PrInfo; checks: CheckRun[]; state: string } | null>(null)
  const [merging, setMerging] = useState(false)
  const task = detail?.task
  useEffect(() => {
    if (!task) return
    setMsg((m) => m || task.title)
    setBranch(task.branch ?? '')
  }, [task])
  useEffect(() => {
    if (!task?.pr_number) return setPr(null)
    let live = true
    const load = () =>
      hiveApi
        .pr(task.id)
        .then((r) => live && setPr(r))
        .catch(() => {})
    load()
    const t = setInterval(load, 15000)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [task?.id, task?.pr_number])
  if (!task || !detail) return null
  const project = detail.project
  const hasRepo = !!project.repo_owner
  const commit = async (openPr: boolean) => {
    setBusy(true)
    try {
      const r = await hiveApi.commit(task.id, { message: msg, branch, openPr, prTitle: msg, prBody: `${task.prompt}\n\n${detail.agents.map((a) => `- **${a.name}** (${a.model}): ${String(a.result ?? a.status).slice(0, 300)}`).join('\n')}` })
      toast.success(r.pr ? `PR #${r.pr.number} opened` : `Committed ${r.files} files to ${r.branch}`)
      refreshDetail()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  const merged = !!(pr?.pr.merged || task.status === 'merged')
  // Ship as a vertical stepper: each step says where it stands, in words, with a link.
  const steps: { label: string; status: string; word: string; detail?: ReactNode }[] = [
    { label: 'Changes', status: 'done', word: 'Ready' },
    { label: 'Commit', status: task.head_sha ? 'done' : 'queued', word: task.head_sha ? 'Committed' : 'Not yet', detail: task.head_sha ? <span className="font-mono">{task.branch} · {task.head_sha.slice(0, 7)}</span> : null },
    {
      label: 'Pull request',
      status: task.pr_number ? 'done' : 'queued',
      word: task.pr_number ? `#${task.pr_number}` : 'Not opened',
      detail: task.pr_url ? (
        <a href={task.pr_url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
          Open on GitHub
        </a>
      ) : null,
    },
    { label: 'Checks', status: !task.pr_number ? 'queued' : pr?.state === 'success' ? 'done' : pr?.state === 'failure' ? 'failed' : 'running', word: !task.pr_number ? 'After the PR' : pr?.state === 'success' ? 'Passing' : pr?.state === 'failure' ? 'Failing' : 'Running' },
    { label: 'Merge', status: merged ? 'done' : 'queued', word: merged ? 'Merged' : 'Waiting' },
    { label: 'Deploy', status: merged ? 'running' : 'queued', word: merged ? 'Your host deploys it' : 'After merge', detail: merged && project.site_url ? (
        <a href={project.site_url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
          {project.site_url.replace(/^https:\/\//, '')}
        </a>
      ) : null },
  ]
  return (
    <div className="space-y-5 p-4">
      <ol className="space-y-0" aria-label="Ship steps">
        {steps.map((s, i) => (
          <li key={s.label} className="relative flex gap-3 pb-3 last:pb-0">
            {i < steps.length - 1 && <span className={cn('absolute left-[7px] top-5 bottom-0 w-px', s.status === 'done' ? 'bg-[color-mix(in_oklab,var(--hv-success)_50%,transparent)]' : 'bg-[var(--hv-border)]')} aria-hidden />}
            <span className={cn('mt-1 size-[15px] shrink-0 rounded-full border-2', s.status === 'done' ? 'border-[var(--hv-success)] bg-[var(--hv-success)]' : s.status === 'failed' ? 'border-[var(--hv-danger)]' : s.status === 'running' ? 'border-[var(--hv-accent)]' : 'border-[var(--hv-border-strong)]')} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-[var(--hv-text-1)]">{s.label}</span>
                <KitPill size="sm" status={s.status} label={s.word} />
              </div>
              {s.detail && <div className="mt-0.5 truncate text-[12px] text-[var(--hv-text-3)]">{s.detail}</div>}
            </div>
          </li>
        ))}
      </ol>

      <div className="hive-card space-y-3 p-4">
        <div className="text-[13px] font-semibold">{task.head_sha ? 'Commit more changes' : 'Commit the changes'}</div>
        <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Commit message" className="h-9 w-full rounded-lg border hive-line bg-transparent px-3 text-[13px] outline-none focus:border-accent-brand/50" />
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 shrink-0 text-text-muted" />
          <input value={branch} onChange={(e) => setBranch(e.target.value)} className="h-9 flex-1 rounded-lg border hive-line bg-transparent px-3 font-mono text-[12.5px] outline-none focus:border-accent-brand/50" />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" loading={busy} onClick={() => commit(false)} disabled={!msg.trim()}>
            Commit to branch
          </Button>
          {hasRepo && !task.pr_number && (
            <Button size="sm" loading={busy} onClick={() => commit(true)} disabled={!msg.trim()}>
              <GitPullRequest /> Commit & open PR
            </Button>
          )}
        </div>
        {!hasRepo && <p className="text-[11.5px] text-text-muted">This project has no GitHub repo — commits stay on the machine.</p>}
      </div>

      {pr && (
        <div className="hive-card space-y-3 p-4">
          <div className="flex items-start gap-2">
            <GitPullRequest className={cn('mt-0.5 size-4', pr.pr.merged ? 'text-[oklch(65%_0.18_300)]' : 'text-state-success')} />
            <div className="min-w-0 flex-1">
              <a href={pr.pr.url} target="_blank" rel="noreferrer" className="text-[13.5px] font-medium hover:underline">
                #{pr.pr.number} {pr.pr.title}
              </a>
              <div className="text-[11.5px] text-text-muted">
                <span className="font-mono">{pr.pr.head}</span> → <span className="font-mono">{pr.pr.base}</span> · +{pr.pr.additions} −{pr.pr.deletions} · {pr.pr.changedFiles} files
              </div>
            </div>
          </div>
          <div className="space-y-1">
            {pr.checks.map((c) => (
              <a key={c.name} href={c.url ?? undefined} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-text-primary/[0.04]">
                {c.status !== 'completed' ? <Loader2 className="size-3.5 animate-spin text-state-warning" /> : c.conclusion === 'success' ? <Check className="size-3.5 text-state-success" /> : c.conclusion === 'skipped' || c.conclusion === 'neutral' ? <ChevronDown className="size-3.5 text-text-muted" /> : <X className="size-3.5 text-state-error" />}
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="text-[11px] text-text-muted">{c.conclusion ?? c.status}</span>
              </a>
            ))}
            {!pr.checks.length && <p className="text-[12px] text-text-muted">No CI checks reported yet.</p>}
          </div>
          {pr.pr.merged ? (
            <div className="flex items-center gap-2 rounded-lg bg-state-success/[0.08] px-3 py-2 text-[12.5px] font-medium text-state-success">
              <GitMerge className="size-4" /> Merged — your host deploys it from {pr.pr.base}.
            </div>
          ) : boot?.me.admin ? (
            <Button
              className="w-full"
              variant={pr.state === 'success' ? 'success' : 'secondary'}
              loading={merging}
              onClick={async () => {
                if (pr.state !== 'success' && !window.confirm(`Checks are ${pr.state}. Merge anyway? Merging ${pr.pr.base} can deploy to the live site.`)) return
                if (pr.state === 'success' && !window.confirm(`Squash-merge #${pr.pr.number} into ${pr.pr.base}? This can deploy to the live site.`)) return
                setMerging(true)
                try {
                  await hiveApi.merge(task.id)
                  toast.success('Merged', 'Deploys start from the base branch.')
                  refreshDetail()
                } catch (e) {
                  toast.error(errMsg(e))
                } finally {
                  setMerging(false)
                }
              }}
            >
              <GitMerge /> Squash & merge into {pr.pr.base}
            </Button>
          ) : (
            <p className="text-[12px] text-text-muted">An admin merges after review.</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Terminal (machine sessions) ───────────────────────────────────────── */
function TerminalPanel({ machineId, folder }: { machineId: string; folder: string }) {
  const { machines } = useHive()
  const m = machines.find((x) => x.id === machineId)
  const [lines, setLines] = useState<{ cmd: string; out: string; code: number | null; ms: number }[]>([])
  const [cmd, setCmd] = useState('')
  const [busy, setBusy] = useState(false)
  const [hist, setHist] = useState<string[]>([])
  const [hi, setHi] = useState(-1)
  const end = useRef<HTMLDivElement>(null)
  const exec = async (c: string) => {
    if (!c.trim()) return
    setBusy(true)
    setHist((h) => [c, ...h.filter((x) => x !== c)].slice(0, 50))
    setHi(-1)
    try {
      const r = await hiveApi.exec(machineId, { folder, command: c })
      setLines((l) => [...l, { cmd: c, out: r.output, code: r.code, ms: r.ms }])
    } catch (e) {
      setLines((l) => [...l, { cmd: c, out: errMsg(e), code: 1, ms: 0 }])
    } finally {
      setBusy(false)
      setTimeout(() => end.current?.scrollIntoView({ block: 'end' }), 30)
    }
  }
  useEffect(() => {
    const on = (e: Event) => exec(String((e as CustomEvent).detail || ''))
    document.addEventListener('hive:terminal', on)
    return () => document.removeEventListener('hive:terminal', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId, folder])
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b hive-line px-3 py-2 text-[12px]">
        <Server className={cn('size-3.5', m?.online ? 'text-state-success' : 'text-state-warning')} />
        <span className="font-medium">{m?.name ?? 'Machine'}</span>
        <span className="truncate font-mono text-text-muted">{folder}</span>
        <span className="ml-auto flex gap-1">
          {['git status --short', 'npm test', 'npm run build', 'git log --oneline -5'].map((q) => (
            <button key={q} type="button" onClick={() => exec(q)} className="hidden rounded-md bg-text-primary/[0.05] px-2 py-0.5 font-mono text-[11px] text-text-secondary hover:bg-text-primary/[0.09] xl:inline">
              {q}
            </button>
          ))}
        </span>
      </div>
      <div className="hive-term hive-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {!lines.length && <div className="opacity-60">Commands run in {folder} on {m?.name}. Agents’ commands go through the machine’s approval policy; yours run directly.</div>}
        {lines.map((l, i) => (
          <div key={i} className="mb-3">
            <div>
              <span className="text-[var(--color-state-success)]">❯</span> {l.cmd} <span className="opacity-50">· {l.code === 0 ? 'ok' : `exit ${l.code}`} · {(l.ms / 1000).toFixed(1)}s</span>
            </div>
            <div className="opacity-90">{l.out}</div>
          </div>
        ))}
        {busy && <div className="hive-dot-run">running…</div>}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const c = cmd
          setCmd('')
          exec(c)
        }}
        className="hive-term flex items-center gap-2 border-t border-white/10 px-3 py-2"
      >
        <span className="text-[var(--color-state-success)]">❯</span>
        <input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && hist.length) {
              e.preventDefault()
              const n = Math.min(hist.length - 1, hi + 1)
              setHi(n)
              setCmd(hist[n])
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              const n = hi - 1
              setHi(n)
              setCmd(n >= 0 ? hist[n] : '')
            }
          }}
          disabled={!m?.online}
          placeholder={m?.online ? 'Type a command…' : 'Machine offline — start the bridge'}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:opacity-50"
        />
      </form>
    </div>
  )
}

export { agentHue, MiniDiff, Search }

/** True while the media query matches (re-renders on change). */
function useMedia(q: string): boolean {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setOn(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [q])
  return on
}

/**
 * The session's three panes — agents | stream | panel — resizable, with the
 * sizes remembered per layout. Below md the panel opens as a sheet instead.
 */
function SessionPanes({ wide, dockOpen, roster, stream, dock }: { wide: boolean; dockOpen: boolean; roster: ReactNode; stream: ReactNode; dock: ReactNode }) {
  const md = useMedia('(min-width: 768px)')
  const showDock = dockOpen && md
  const ids = [...(wide ? ['roster'] : []), 'stream', ...(showDock ? ['dock'] : [])]
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: `hive-session-${ids.join('-')}`, panelIds: ids, storage: localStorage })
  return (
    <Group key={ids.join('-')} id={`hive-session-${ids.join('-')}`} orientation="horizontal" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged} resizeTargetMinimumSize={{ fine: 10, coarse: 36 }} className="min-h-0 flex-1">
      {wide && (
        <>
          <Panel id="roster" defaultSize={264} minSize={200} maxSize={380} className="min-w-0">
            {roster}
          </Panel>
          <PaneHandle />
        </>
      )}
      <Panel id="stream" minSize={360} className="min-w-0">
        {stream}
      </Panel>
      {showDock && (
        <>
          <PaneHandle />
          <Panel id="dock" defaultSize={480} minSize={360} maxSize="65%" className="min-w-0">
            {dock}
          </Panel>
        </>
      )}
    </Group>
  )
}

function PaneHandle() {
  return (
    <Separator className="group relative flex w-px shrink-0 items-stretch bg-[var(--hv-border)] outline-none data-[separator=active]:bg-[var(--hv-accent)] hover:bg-[var(--hv-accent)] focus-visible:bg-[var(--hv-accent)]">
      <span className="absolute inset-y-0 -left-1 -right-1" aria-hidden />
    </Separator>
  )
}
