import { useEffect, useMemo, useState } from 'react'
import { Archive, ArrowUp, Columns2, ExternalLink, GitBranch, GitPullRequest, LayoutGrid, ScanSearch, Send, Square, Users } from 'lucide-react'
import { Button, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { AgentLane, AgentStats, AgentsStripButton } from './AgentLane'
import { AgentChip, defaultSpec } from './AgentPicker'
import { BoardView } from './BoardView'
import { ChangesView } from './ChangesView'
import { FilesView } from './FilesView'
import { LiveCode } from './LiveCode'
import { useHive } from './store'
import type { AgentRow, AgentSpec, HiveEvent } from './types'
import { MODE_INFO, ProviderGlyph, StatusPill, UserDot, fmtCost, fmtTokens, timeAgo } from './ui'

type Tab = 'agents' | 'changes' | 'files' | 'activity'

export function TaskView() {
  const { detail, detailLoading, online, changesVersion } = useHive()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('agents')
  const [layout, setLayout] = useState<'focus' | 'grid'>('focus')
  const [selected, setSelected] = useState<string | null>(null)
  const [changeCount, setChangeCount] = useState(0)
  const taskId = detail?.task.id

  useEffect(() => {
    setTab('agents')
    setSelected(null)
  }, [taskId])

  useEffect(() => {
    if (!taskId) return
    hiveApi
      .changes(taskId)
      .then((r) => setChangeCount(r.changes.length))
      .catch(() => {})
  }, [taskId, changesVersion])

  const eventsByAgent = useMemo(() => {
    const m = new Map<string, HiveEvent[]>()
    for (const e of detail?.events ?? []) if (e.agent_id) (m.get(e.agent_id) ?? m.set(e.agent_id, []).get(e.agent_id)!).push(e)
    return m
  }, [detail?.events])

  if (!detail) {
    return detailLoading ? (
      <div className="space-y-4 p-10">
        <div className="hive-shimmer h-7 w-1/2 rounded-lg" />
        <div className="hive-shimmer h-[60vh] rounded-2xl" />
      </div>
    ) : (
      <div className="grid h-full place-items-center text-[14px] text-text-muted">Task not found</div>
    )
  }

  const { task, agents } = detail
  const ordered: AgentRow[] = []
  for (const a of agents.filter((x) => !x.parent_id)) ordered.push(a, ...agents.filter((w) => w.parent_id === a.id))
  for (const a of agents) if (!ordered.includes(a)) ordered.push(a)
  const running = agents.some((a) => a.status === 'running' || a.status === 'queued')
  const current = ordered.find((a) => a.id === selected) ?? ordered.find((a) => a.status === 'running') ?? ordered[ordered.length - 1]
  const tokens = agents.reduce((s, a) => s + a.input_tokens + a.output_tokens, 0)
  const cost = fmtCost(agents.reduce((s, a) => s + a.cost_micros, 0))
  const watchers = online.filter((o) => o.view?.taskId === task.id)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="px-8 pt-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-text-primary">{task.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-muted">
              <StatusPill status={task.status} />
              <span>{MODE_INFO[task.mode].label}</span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <GitBranch className="size-3.5 shrink-0" />
                <span className="truncate font-mono text-[12px]">{task.branch}</span>
              </span>
              <span className="tabular-nums">
                {fmtTokens(tokens)} tokens{cost ? ` · ${cost}` : ''}
              </span>
              <span>
                @{task.created_by} · {timeAgo(task.created_at)}
              </span>
              {task.pr_url && (
                <a href={task.pr_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-state-success hover:underline">
                  <GitPullRequest className="size-3.5" /> PR #{task.pr_number} <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {watchers.length > 0 && (
              <Tooltip label={`Here: ${watchers.map((w) => `@${w.username}`).join(', ')}`}>
                <span className="flex -space-x-1.5">
                  {watchers.slice(0, 4).map((w) => (
                    <UserDot key={w.username} username={w.username} size={6} ring />
                  ))}
                </span>
              </Tooltip>
            )}
            {running ? (
              <Button size="sm" variant="ghost" onClick={() => hiveApi.stopTask(task.id).then(() => toast.info('Stopping all agents')).catch(() => {})}>
                <Square className="size-3 fill-current" /> Stop all
              </Button>
            ) : (
              <Tooltip label="Archive">
                <Button size="icon-sm" variant="ghost" onClick={() => hiveApi.updateTask(task.id, { archived: true }).catch(() => {})} aria-label="Archive task">
                  <Archive />
                </Button>
              </Tooltip>
            )}
            {changeCount > 0 && tab !== 'changes' && (
              <Button size="sm" onClick={() => setTab('changes')}>
                Review {changeCount} change{changeCount === 1 ? '' : 's'}
              </Button>
            )}
          </div>
        </div>
        <nav className="mt-5 flex items-center gap-6 border-b hive-line" role="tablist">
          {(
            [
              ['agents', `Agents`, agents.length],
              ['changes', 'Changes', changeCount],
              ['files', 'Files', null],
              ['activity', 'Activity', null],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              type="button"
              onClick={() => setTab(id)}
              className={cn('relative -mb-px flex h-10 items-center gap-1.5 border-b-2 text-[13.5px] transition-colors', tab === id ? 'border-accent-brand text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary')}
            >
              {label}
              {count != null && count > 0 && <span className="text-[12px] tabular-nums text-text-muted">{count}</span>}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'agents' && (
        <>
          <div className="flex items-center gap-2 px-8 py-3">
            <div className="hive-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {ordered.map((a) => (
                <AgentsStripButton
                  key={a.id}
                  agent={a}
                  active={layout === 'focus' && current?.id === a.id}
                  onClick={() => {
                    setSelected(a.id)
                    setLayout('focus')
                  }}
                />
              ))}
            </div>
            <div className="flex shrink-0 rounded-lg bg-text-primary/[0.05] p-0.5">
              {(
                [
                  ['focus', Columns2, 'Agent + live code'],
                  ['grid', LayoutGrid, 'All agents side by side'],
                ] as const
              ).map(([id, Icon, label]) => (
                <Tooltip key={id} label={label}>
                  <button type="button" onClick={() => setLayout(id)} className={cn('grid size-7 place-items-center rounded-md', layout === id ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted')} aria-label={label}>
                    <Icon className="size-3.5" />
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 px-8">
            {!current ? (
              <div className="grid h-60 place-items-center text-[14px] text-text-muted">Starting agents…</div>
            ) : layout === 'focus' ? (
              <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                <div className="flex min-h-0 flex-col">
                  <div className="mb-3 flex items-center gap-2">
                    <ProviderGlyph provider={current.provider} size="sm" pulse={current.status === 'running'} />
                    <span className="text-[14px] font-medium text-text-primary">{current.name}</span>
                    {current.title && current.title !== 'Solo' && <span className="truncate text-[13px] text-text-muted">· {current.title}</span>}
                    <span className="ml-auto">
                      <AgentStats agent={current} />
                    </span>
                  </div>
                  <AgentLane key={current.id} agent={current} events={eventsByAgent.get(current.id) ?? []} variant="focus" />
                </div>
                <div className="hidden min-h-0 pb-4 lg:block">
                  <LiveCode agent={current} events={eventsByAgent.get(current.id) ?? []} />
                </div>
              </div>
            ) : (
              <div className="hive-scroll grid h-full grid-cols-1 gap-4 overflow-y-auto pb-4 lg:grid-cols-2 2xl:grid-cols-3">
                {ordered.map((a) => (
                  <AgentLane
                    key={a.id}
                    agent={a}
                    events={eventsByAgent.get(a.id) ?? []}
                    workers={a.role === 'lead' ? agents.filter((w) => w.parent_id === a.id) : undefined}
                    onFocus={() => {
                      setSelected(a.id)
                      setLayout('focus')
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <CommandBar taskId={task.id} target={current ?? null} agents={ordered} />
        </>
      )}
      {tab !== 'agents' && (
        <div className="min-h-0 flex-1 px-8 py-5">
          {tab === 'changes' && <ChangesView taskId={task.id} agents={agents} />}
          {tab === 'files' && <FilesView taskId={task.id} />}
          {tab === 'activity' && <BoardView agents={agents} events={detail.events} />}
        </div>
      )}
    </div>
  )
}

type Intent = 'steer' | 'assign' | 'review'

/** One input for everything you say to the agents: steer, assign, review. */
function CommandBar({ taskId, target, agents }: { taskId: string; target: AgentRow | null; agents: AgentRow[] }) {
  const { boot } = useHive()
  const toast = useToast()
  const running = target && (target.status === 'running' || target.status === 'queued')
  const [intent, setIntent] = useState<Intent>(running ? 'steer' : 'assign')
  const [text, setText] = useState('')
  const [specs, setSpecs] = useState<AgentSpec[]>(() => (boot ? [defaultSpec(boot)!].filter(Boolean) : []))
  const [together, setTogether] = useState(true)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!running && intent === 'steer') setIntent('assign')
  }, [running, intent])
  if (!boot) return null

  const send = async () => {
    if (!text.trim()) return
    setBusy(true)
    try {
      if (intent === 'steer' && target) await hiveApi.steer(target.id, text.trim())
      else if (intent === 'review') await hiveApi.addAgent(taskId, { prompt: text.trim(), agent: specs[0], readOnly: true })
      else await hiveApi.assign(taskId, { instructions: text.trim(), agents: specs, together })
      setText('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setBusy(false)
    }
  }

  const intents: { id: Intent; label: string; icon: typeof Send; disabled?: boolean }[] = [
    { id: 'steer', label: target ? `Tell ${target.name}` : 'Steer', icon: Send, disabled: !running },
    { id: 'assign', label: 'Assign work', icon: Users },
    { id: 'review', label: 'Ask for a review', icon: ScanSearch },
  ]

  return (
    <div className="px-8 pb-5 pt-2">
      <div className="hive-composer rounded-2xl">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey) && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          placeholder={
            intent === 'steer'
              ? `Message ${target?.name} — it reads this before its next step`
              : intent === 'review'
                ? 'What should the reviewer check?'
                : agents.length
                  ? 'Give more work to the agents you pick — they join this task'
                  : 'Describe the work'
          }
          className="block max-h-40 min-h-[52px] w-full resize-none bg-transparent px-4 pt-3.5 text-[14.5px] text-text-primary outline-none placeholder:text-text-muted/70"
        />
        <div className="flex flex-wrap items-center gap-1.5 px-2.5 pb-2.5">
          {intents.map((it) => (
            <button
              key={it.id}
              type="button"
              disabled={it.disabled}
              onClick={() => setIntent(it.id)}
              className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] transition-colors disabled:opacity-35', intent === it.id ? 'bg-text-primary/[0.09] text-text-primary' : 'text-text-muted hover:text-text-secondary')}
            >
              <it.icon className="size-3.5" /> {it.label}
            </button>
          ))}
          {intent !== 'steer' && <span className="mx-1 h-4 w-px bg-text-primary/10" />}
          {intent !== 'steer' &&
            specs.map((s, i) => (
              <AgentChip key={i} boot={boot} spec={s} compact onChange={(n) => setSpecs((l) => l.map((x, j) => (j === i ? n : x)))} onRemove={specs.length > 1 ? () => setSpecs((l) => l.filter((_, j) => j !== i)) : undefined} />
            ))}
          {intent === 'assign' && (
            <>
              <button type="button" onClick={() => setSpecs((l) => [...l, defaultSpec(boot, undefined)!].filter(Boolean))} className="h-7 rounded-full px-2 text-[12.5px] text-text-muted hover:text-text-primary" title="Give the same work to another agent">
                + agent
              </button>
              {specs.length > 1 && (
                <button type="button" onClick={() => setTogether((t) => !t)} className="h-7 rounded-full px-2.5 text-[12.5px] text-text-muted hover:text-text-primary" title="Together: one shared working copy. Separately: each on its own copy, compare results.">
                  {together ? 'Together' : 'Separately'}
                </button>
              )}
            </>
          )}
          <Button size="icon" variant="accent" className="ml-auto size-8 rounded-full" onClick={send} loading={busy} disabled={!text.trim() || (intent !== 'steer' && !specs.length)} aria-label="Send">
            {!busy && <ArrowUp className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
