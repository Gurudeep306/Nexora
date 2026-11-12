import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Brain,
  Check,
  ChevronRight,
  Crown,
  FilePen,
  FilePlus,
  FileText,
  FileX,
  Flag,
  FolderTree,
  GitCompare,
  Loader2,
  MessageSquare,
  Network,
  ScanSearch,
  Search,
  Send,
  Square,
  StickyNote,
  Users,
  X,
} from 'lucide-react'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { Button, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { useHive } from './store'
import type { AgentRow, HiveEvent } from './types'
import { ProviderGlyph, StatusPill, duration, fmtCost, fmtTokens } from './ui'

const TOOL_ICON: Record<string, typeof FileText> = {
  list_files: FolderTree,
  read_file: FileText,
  search: Search,
  write_file: FilePlus,
  edit_file: FilePen,
  delete_file: FileX,
  view_changes: GitCompare,
  team_note: StickyNote,
  read_team_board: Users,
  delegate: Network,
  finish: Flag,
}

function toolTitle(name: string, input: Record<string, unknown>): string {
  const p = typeof input?.path === 'string' ? input.path : ''
  switch (name) {
    case 'list_files':
      return `List ${p || input?.pattern || 'repository'}${p && input?.pattern ? ` · ${input.pattern}` : ''}`
    case 'read_file':
      return `Read ${p}${input?.offset ? ` :${input.offset}` : ''}`
    case 'search':
      return `Search “${String(input?.query ?? '')}”${input?.glob ? ` in ${input.glob}` : ''}`
    case 'write_file':
      return `Write ${p}`
    case 'edit_file':
      return `Edit ${p}`
    case 'delete_file':
      return `Delete ${p}`
    case 'view_changes':
      return `Review changes${p ? ` · ${p}` : ''}`
    case 'team_note':
      return 'Note to team'
    case 'read_team_board':
      return 'Check team board'
    case 'delegate':
      return `Delegate ${Array.isArray(input?.tasks) ? input.tasks.length : ''} sub-tasks`
    case 'finish':
      return 'Finish'
    default:
      return name
  }
}

type Item =
  | { kind: 'text'; ev: HiveEvent }
  | { kind: 'tool'; call: HiveEvent; result?: HiveEvent }
  | { kind: 'other'; ev: HiveEvent }

function buildItems(events: HiveEvent[]): Item[] {
  const items: Item[] = []
  const calls = new Map<string, Item & { kind: 'tool' }>()
  for (const ev of events) {
    if (ev.kind === 'text') items.push({ kind: 'text', ev })
    else if (ev.kind === 'tool_call') {
      const it = { kind: 'tool' as const, call: ev }
      calls.set(String(ev.data.id), it)
      items.push(it)
    } else if (ev.kind === 'tool_result') {
      const it = calls.get(String(ev.data.id))
      if (it) it.result = ev
    } else if (ev.kind !== 'status' || ev.data.status !== 'running') items.push({ kind: 'other', ev })
  }
  return items
}

export const AgentLane = memo(function AgentLane({ agent, events, workers, expanded, onExpand }: { agent: AgentRow; events: HiveEvent[]; workers?: AgentRow[]; expanded?: boolean; onExpand?: () => void }) {
  const { streaming, thinking } = useHive()
  const toast = useToast()
  const live = streaming[agent.id] ?? ''
  const think = thinking[agent.id] ?? ''
  const running = agent.status === 'running' || agent.status === 'queued'
  const items = useMemo(() => buildItems(events), [events])
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const [steerText, setSteerText] = useState('')
  const [sending, setSending] = useState(false)
  const [, tick] = useState(0)

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  useEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [items.length, live, think])

  const RoleIcon = agent.role === 'lead' ? Crown : agent.role === 'reviewer' ? ScanSearch : null
  const cost = fmtCost(agent.cost_micros)

  const steer = async () => {
    if (!steerText.trim()) return
    setSending(true)
    try {
      await hiveApi.steer(agent.id, steerText.trim())
      setSteerText('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-bg-surface/75 transition-shadow',
        running ? 'hive-lane-running border-transparent' : 'border-border',
        expanded ? 'h-full' : 'h-[min(640px,calc(100vh-260px))]',
      )}
      aria-label={`${agent.name} (${agent.model})`}
    >
      <header className="flex items-center gap-2.5 border-b border-border/70 px-3 py-2.5">
        <ProviderGlyph provider={agent.provider} pulse={running} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {RoleIcon && <RoleIcon className="size-3.5 shrink-0 text-accent-brand" />}
            <span className="min-w-0 truncate text-sm font-semibold text-text-primary" title={agent.name}>
              {agent.name}
            </span>
            {agent.role !== 'solo' && <span className="shrink-0 rounded bg-text-primary/6 px-1.5 text-[10px] capitalize text-text-muted">{agent.role}</span>}
          </div>
          <Tooltip label={`${agent.model}${agent.effort ? ` · ${agent.effort} effort` : ''} · ${agent.input_tokens.toLocaleString()} in · ${agent.output_tokens.toLocaleString()} out${cost ? ` · ≈ ${cost}` : ''}`} side="bottom">
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-text-muted">
              <StatusPill status={agent.status} className="h-4 shrink-0 px-1.5 text-[10px]" />
              <span className="truncate">
                {agent.model}
                {agent.effort ? ` · ${agent.effort}` : ''} · {fmtTokens(agent.input_tokens + agent.output_tokens)} tok · {duration(agent.started_at, agent.finished_at)}
              </span>
            </div>
          </Tooltip>
        </div>
        {onExpand && (
          <Button size="icon-sm" variant="ghost" onClick={onExpand} aria-label={expanded ? 'Back to grid' : 'Focus this agent'}>
            {expanded ? <X /> : <ChevronRight />}
          </Button>
        )}
        {running && (
          <Tooltip label="Stop this agent">
            <Button size="icon-sm" variant="ghost" onClick={() => hiveApi.stopAgent(agent.id).catch(() => {})} aria-label="Stop agent">
              <Square className="fill-current" />
            </Button>
          </Tooltip>
        )}
      </header>

      {workers && workers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border/70 px-3 py-2">
          {workers.map((w) => (
            <span key={w.id} className="inline-flex items-center gap-1.5 rounded-full bg-text-primary/5 py-0.5 pl-0.5 pr-2 text-[11px] text-text-secondary">
              <ProviderGlyph provider={w.provider} size="xs" pulse={w.status === 'running'} />
              {w.name}
              <span className={cn('size-1.5 rounded-full', w.status === 'done' ? 'bg-state-success' : w.status === 'failed' ? 'bg-state-error' : w.status === 'running' ? 'hive-dot-run bg-accent-brand' : 'bg-text-muted')} />
            </span>
          ))}
        </div>
      )}

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="hive-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3"
      >
        <details className="group rounded-lg bg-text-primary/4 px-2.5 py-1.5 text-[12px] text-text-secondary">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-text-muted">
            <ChevronRight className="size-3 transition-transform group-open:rotate-90" /> Instructions
          </summary>
          <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{agent.instructions}</p>
        </details>

        {items.map((it, i) => {
          if (it.kind === 'text') return <AiMarkdown key={it.ev.id} text={String(it.ev.data.text ?? '')} size="compact" className="text-[13px] text-text-primary" />
          if (it.kind === 'tool') return <ToolRow key={it.call.id} call={it.call} result={it.result} />
          return <OtherRow key={it.ev.id ?? i} ev={it.ev} />
        })}

        {think && (
          <div className="rounded-lg border border-dashed border-border px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
              <Brain className="size-3 text-accent-brand" /> Thinking
            </div>
            <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[11.5px] italic leading-relaxed text-text-muted">{think.slice(-900)}</p>
          </div>
        )}
        {live && (
          <div className="hive-caret">
            <AiMarkdown text={live} streaming size="compact" className="text-[13px] text-text-primary" />
          </div>
        )}
        {running && !live && !think && (
          <div className="hive-shimmer flex h-7 items-center gap-2 rounded-lg px-2 text-[11px] text-text-muted">
            <Loader2 className="size-3 animate-spin" /> {agent.status === 'queued' ? 'Waiting for a free slot…' : 'Working…'}
          </div>
        )}
      </div>

      {running && (
        <form
          className="flex items-center gap-2 border-t border-border/70 px-2 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            steer()
          }}
        >
          <MessageSquare className="ml-1 size-3.5 shrink-0 text-text-muted" />
          <input
            value={steerText}
            onChange={(e) => setSteerText(e.target.value)}
            placeholder={`Steer ${agent.name} — it reads this before its next step`}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-muted"
          />
          <Button size="icon-sm" variant="ghost" type="submit" loading={sending} disabled={!steerText.trim()} aria-label="Send to agent">
            {!sending && <Send />}
          </Button>
        </form>
      )}
    </section>
  )
})

function ToolRow({ call, result }: { call: HiveEvent; result?: HiveEvent }) {
  const [open, setOpen] = useState(false)
  const name = String(call.data.name)
  const input = (call.data.input ?? {}) as Record<string, unknown>
  const Icon = TOOL_ICON[name] ?? FileText
  const err = !!result?.data.isError
  const write = ['write_file', 'edit_file', 'delete_file'].includes(name)
  const meta = (result?.data.meta ?? null) as Record<string, unknown> | null
  return (
    <div className={cn('rounded-lg border text-[12px] transition-colors', err ? 'border-state-error/30 bg-state-error/5' : write ? 'border-accent-brand/25 bg-accent-brand/4' : 'border-border/70 bg-bg-app/40')}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left">
        <Icon className={cn('size-3.5 shrink-0', write ? 'text-accent-brand' : 'text-text-muted')} />
        <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-text-secondary">{toolTitle(name, input)}</span>
        {meta?.count != null && <span className="text-[10px] tabular-nums text-text-muted">{String(meta.count)}</span>}
        {!result ? <Loader2 className="size-3 animate-spin text-text-muted" /> : err ? <AlertCircle className="size-3.5 text-state-error" /> : <Check className="size-3.5 text-state-success" />}
        <ChevronRight className={cn('size-3 text-text-muted transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-border/60 px-2.5 py-2">
          {name === 'delegate' && Array.isArray(input.tasks) ? (
            <ol className="list-decimal space-y-1 pl-4 text-text-secondary">
              {(input.tasks as { title: string; agent?: string; files?: string[] }[]).map((t, i) => (
                <li key={i}>
                  <span className="font-medium text-text-primary">{t.title}</span>
                  {t.agent && <span className="text-text-muted"> → {t.agent}</span>}
                  {t.files?.length ? <span className="block font-mono text-[10.5px] text-text-muted">{t.files.join(', ')}</span> : null}
                </li>
              ))}
            </ol>
          ) : (
            <pre className="hive-scroll max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-text-primary/4 p-2 font-mono text-[10.5px] text-text-muted">{JSON.stringify(input, null, 2)}</pre>
          )}
          {result && <pre className={cn('hive-scroll max-h-64 overflow-auto whitespace-pre-wrap break-words rounded p-2 font-mono text-[10.5px]', err ? 'bg-state-error/8 text-state-error' : 'bg-text-primary/4 text-text-secondary')}>{String(result.data.preview ?? '')}</pre>}
        </div>
      )}
    </div>
  )
}

function OtherRow({ ev }: { ev: HiveEvent }) {
  const d = ev.data
  switch (ev.kind) {
    case 'note':
      return (
        <div className="flex gap-2 rounded-lg bg-state-warning/8 px-2.5 py-1.5 text-[12px] text-text-secondary">
          <StickyNote className="mt-0.5 size-3.5 shrink-0 text-state-warning" />
          <span className="whitespace-pre-wrap">{String(d.message)}</span>
        </div>
      )
    case 'steer':
      return (
        <div className="ml-6 flex gap-2 rounded-lg rounded-tr-sm bg-accent-brand/10 px-2.5 py-1.5 text-[12px] text-text-primary">
          <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-accent-brand" />
          <span>
            <span className="font-medium text-accent-brand">@{String(d.username)}</span> {String(d.message)}
          </span>
        </div>
      )
    case 'error':
      return (
        <div className="flex gap-2 rounded-lg border border-state-error/30 bg-state-error/8 px-2.5 py-2 text-[12px] text-state-error">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="whitespace-pre-wrap">{String(d.message)}</span>
        </div>
      )
    case 'status':
      if (d.status === 'done' && d.summary)
        return (
          <div className="rounded-xl border border-state-success/30 bg-state-success/6 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-state-success">
              <Flag className="size-3" /> Summary
            </div>
            <AiMarkdown text={String(d.summary)} size="compact" className="text-[13px] text-text-primary" />
          </div>
        )
      if (d.status === 'stopped' || d.status === 'failed')
        return <div className="text-center text-[11px] text-text-muted">— {String(d.status)} —</div>
      return null
    default:
      return <div className="px-1 text-[11px] text-text-muted">{String(d.message ?? ev.kind)}</div>
  }
}
