import { useEffect, useMemo, useState } from 'react'
import { Archive, Bot, ExternalLink, FileDiff, FolderTree, GitBranch, GitPullRequest, LayoutGrid, Plus, ScanSearch, Square, StickyNote } from 'lucide-react'
import { Button, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { AgentLane } from './AgentLane'
import { AgentChip, defaultSpec } from './AgentPicker'
import { BoardView } from './BoardView'
import { ChangesView } from './ChangesView'
import { FilesView } from './FilesView'
import { useHive } from './store'
import type { AgentSpec } from './types'
import { MODE_INFO, StatusPill, UserDot, fmtCost, fmtTokens, timeAgo } from './ui'

type Tab = 'live' | 'changes' | 'files' | 'board'

export function TaskView() {
  const { detail, detailLoading, online, boot, changesVersion } = useHive()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('live')
  const [focus, setFocus] = useState<string | null>(null)
  const [changeCount, setChangeCount] = useState(0)
  const taskId = detail?.task.id

  useEffect(() => {
    setTab('live')
    setFocus(null)
  }, [taskId])

  useEffect(() => {
    if (!taskId) return
    hiveApi
      .changes(taskId)
      .then((r) => setChangeCount(r.changes.length))
      .catch(() => {})
  }, [taskId, changesVersion])

  const eventsByAgent = useMemo(() => {
    const m = new Map<string, NonNullable<typeof detail>['events']>()
    for (const e of detail?.events ?? []) if (e.agent_id) (m.get(e.agent_id) ?? m.set(e.agent_id, []).get(e.agent_id)!).push(e)
    return m
  }, [detail?.events])

  if (!detail) {
    return detailLoading ? (
      <div className="space-y-3 p-6">
        <div className="hive-shimmer h-8 w-1/2 rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <div className="hive-shimmer h-80 rounded-2xl" />
          <div className="hive-shimmer h-80 rounded-2xl" />
        </div>
      </div>
    ) : (
      <div className="grid h-full place-items-center text-sm text-text-muted">Task not found</div>
    )
  }

  const { task, agents } = detail
  const running = agents.some((a) => a.status === 'running' || a.status === 'queued')
  const tokens = agents.reduce((s, a) => s + a.input_tokens + a.output_tokens, 0)
  const cost = fmtCost(agents.reduce((s, a) => s + a.cost_micros, 0))
  const watchers = online.filter((o) => o.view?.taskId === task.id)
  const tops = agents.filter((a) => !a.parent_id || agents.every((x) => x.id !== a.parent_id))
  const lanes = focus ? agents.filter((a) => a.id === focus) : [...tops.flatMap((t) => [t, ...agents.filter((w) => w.parent_id === t.id)])]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border/70 px-5 pt-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight text-text-primary">{task.title}</h1>
              <StatusPill status={task.status} />
              <span className="rounded-md bg-text-primary/6 px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">{MODE_INFO[task.mode].label}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-muted">
              <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                <GitBranch className="size-3 shrink-0" />
                <span className="truncate">
                  {task.base_ref} @ <span className="font-mono">{task.base_sha.slice(0, 7)}</span> → <span className="font-mono">{task.branch}</span>
                </span>
              </span>
              <span>
                by @{task.created_by} · {timeAgo(task.created_at)}
              </span>
              <span className="tabular-nums">
                {agents.length} agent{agents.length === 1 ? '' : 's'} · {fmtTokens(tokens)} tokens{cost ? ` · ≈ ${cost}` : ''}
              </span>
              {task.pr_url && (
                <a href={task.pr_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-state-success hover:underline">
                  <GitPullRequest className="size-3" /> PR #{task.pr_number} <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {watchers.length > 0 && (
              <Tooltip label={`Watching: ${watchers.map((w) => `@${w.username}`).join(', ')}`}>
                <div className="flex -space-x-1.5">
                  {watchers.slice(0, 4).map((w) => (
                    <UserDot key={w.username} username={w.username} size={6} ring />
                  ))}
                </div>
              </Tooltip>
            )}
            {running ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  hiveApi
                    .stopTask(task.id)
                    .then(() => toast.info('Stopping all agents'))
                    .catch(() => {})
                }
              >
                <Square className="fill-current" /> Stop all
              </Button>
            ) : (
              <Tooltip label="Archive task">
                <Button size="icon-sm" variant="ghost" onClick={() => hiveApi.updateTask(task.id, { archived: true }).catch(() => {})} aria-label="Archive task">
                  <Archive />
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
        <nav className="mt-3 flex gap-1" role="tablist">
          {(
            [
              ['live', 'Agents', LayoutGrid, agents.length],
              ['changes', 'Changes', FileDiff, changeCount],
              ['files', 'Files', FolderTree, null],
              ['board', 'Board', StickyNote, null],
            ] as const
          ).map(([id, label, Icon, count]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'relative inline-flex h-9 items-center gap-1.5 px-3 text-[13px] font-medium transition-colors',
                tab === id ? 'text-text-primary after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent-brand' : 'text-text-muted hover:text-text-secondary',
              )}
            >
              <Icon className="size-3.5" />
              {label}
              {count != null && count > 0 && <span className="rounded-full bg-text-primary/8 px-1.5 text-[10px] tabular-nums">{count}</span>}
            </button>
          ))}
        </nav>
      </header>

      <div className="hive-scroll min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'live' && (
          <div className="flex flex-col gap-4">
            <div className={cn('grid gap-3', focus ? 'grid-cols-1' : lanes.length === 1 ? 'grid-cols-1' : lanes.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3')}>
              {lanes.map((a) => (
                <AgentLane
                  key={a.id}
                  agent={a}
                  events={eventsByAgent.get(a.id) ?? []}
                  workers={a.role === 'lead' ? agents.filter((w) => w.parent_id === a.id) : undefined}
                  expanded={focus === a.id}
                  onExpand={lanes.length > 1 || focus ? () => setFocus((f) => (f === a.id ? null : a.id)) : undefined}
                />
              ))}
              {!agents.length && (
                <div className="grid h-60 place-items-center rounded-2xl border border-dashed border-border text-sm text-text-muted">
                  <span className="flex items-center gap-2">
                    <Bot className="size-4" /> Starting agents…
                  </span>
                </div>
              )}
            </div>
            {task.summary && !running && (
              <div className="rounded-2xl border border-border bg-bg-surface/70 p-4 text-[13px] text-text-secondary">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Task summary</div>
                <AiMarkdown text={task.summary} size="compact" className="text-[13px] text-text-primary" />
                {changeCount > 0 && (
                  <Button size="sm" className="mt-3" onClick={() => setTab('changes')}>
                    <FileDiff /> Review {changeCount} changed file{changeCount === 1 ? '' : 's'}
                  </Button>
                )}
              </div>
            )}
            {boot && <FollowUp taskId={task.id} />}
          </div>
        )}
        {tab === 'changes' && (
          <div className="h-[calc(100vh-210px)] min-h-[520px]">
            <ChangesView taskId={task.id} agents={agents} />
          </div>
        )}
        {tab === 'files' && (
          <div className="h-[calc(100vh-210px)] min-h-[520px]">
            <FilesView taskId={task.id} />
          </div>
        )}
        {tab === 'board' && (
          <div className="h-[calc(100vh-210px)] min-h-[520px]">
            <BoardView agents={agents} events={detail.events} />
          </div>
        )}
      </div>
    </div>
  )
}

function FollowUp({ taskId }: { taskId: string }) {
  const { boot } = useHive()
  const toast = useToast()
  const [text, setText] = useState('')
  const [spec, setSpec] = useState<AgentSpec | null>(() => (boot ? defaultSpec(boot) : null))
  const [review, setReview] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!boot || !spec) return null
  const send = async () => {
    if (!text.trim()) return
    setBusy(true)
    try {
      await hiveApi.addAgent(taskId, { prompt: text.trim(), agent: spec, readOnly: review })
      setText('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add the agent')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="hive-glass rounded-2xl border border-border p-2 focus-within:border-accent-brand/50">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            send()
          }
        }}
        rows={2}
        placeholder={review ? 'Ask a reviewer to check the changes… e.g. “Look for edge cases and missing error handling”' : 'Follow up — another agent continues on the same working copy…'}
        className="block w-full resize-none bg-transparent px-2 py-1.5 text-[13.5px] text-text-primary outline-none placeholder:text-text-muted/70"
      />
      <div className="flex flex-wrap items-center gap-2 px-1">
        <AgentChip boot={boot} spec={spec} onChange={setSpec} />
        <button
          type="button"
          onClick={() => setReview((r) => !r)}
          className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium', review ? 'bg-state-info/12 text-state-info' : 'text-text-muted hover:bg-text-primary/5')}
        >
          <ScanSearch className="size-3.5" /> Review only
        </button>
        <Button size="sm" className="ml-auto" onClick={send} loading={busy} disabled={!text.trim() || !spec.model}>
          <Plus /> {review ? 'Add reviewer' : 'Add agent'}
        </Button>
      </div>
    </div>
  )
}
