import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRightLeft,
  Brain,
  Check,
  ChevronRight,
  FilePen,
  FilePlus,
  FileText,
  FileX,
  Flag,
  FolderTree,
  Globe,
  GitCompare,
  Lightbulb,
  Loader2,
  MessageSquare,
  Network,
  Search,
  Square,
  StickyNote,
  Users,
} from 'lucide-react'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { Button, Popover, PopoverContent, PopoverTrigger, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { AgentChip, defaultSpec } from './AgentPicker'
import { useHive } from './store'
import type { AgentRow, AgentSpec, HiveEvent } from './types'
import { ProviderGlyph, StatusPill, duration, fmtCost, fmtTokens, vendorName } from './ui'

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
  remember: Lightbulb,
  read_url: Globe,
  finish: Flag,
}

export function toolTitle(name: string, input: Record<string, unknown>): string {
  const p = typeof input?.path === 'string' ? input.path : ''
  switch (name) {
    case 'list_files':
      return `Listed ${p || (input?.pattern as string) || 'files'}`
    case 'read_file':
      return `Read ${p}`
    case 'search':
      return `Searched “${String(input?.query ?? '')}”`
    case 'write_file':
      return `Wrote ${p}`
    case 'edit_file':
      return `Edited ${p}`
    case 'delete_file':
      return `Deleted ${p}`
    case 'view_changes':
      return 'Reviewed the changes'
    case 'team_note':
      return 'Posted a note'
    case 'read_team_board':
      return 'Checked the team board'
    case 'delegate':
      return `Delegated ${Array.isArray(input?.tasks) ? input.tasks.length : ''} sub-tasks`
    case 'remember':
      return `Remembered “${String(input?.title ?? '')}”`
    case 'read_url':
      return `Read ${String(input?.url ?? '')}`
    case 'finish':
      return 'Finished'
    default:
      return name
  }
}

type Item = { kind: 'text'; ev: HiveEvent } | { kind: 'tool'; call: HiveEvent; result?: HiveEvent } | { kind: 'other'; ev: HiveEvent }

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

/** One agent's transcript. variant 'focus' is chrome-less; 'card' is the grid tile. */
export const AgentLane = memo(function AgentLane({ agent, events, workers, variant = 'card', onFocus }: { agent: AgentRow; events: HiveEvent[]; workers?: AgentRow[]; variant?: 'card' | 'focus'; onFocus?: () => void }) {
  const { streaming, thinking } = useHive()
  const live = streaming[agent.id] ?? ''
  const think = thinking[agent.id] ?? ''
  const running = agent.status === 'running' || agent.status === 'queued'
  const items = useMemo(() => buildItems(events), [events])
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
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

  const body = (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      }}
      className={cn('hive-scroll min-h-0 flex-1 space-y-3 overflow-y-auto', variant === 'focus' ? 'px-1 pb-6' : 'px-4 py-3')}
    >
      <details className="group text-[13px]">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-text-muted hover:text-text-secondary">
          <ChevronRight className="size-3 transition-transform group-open:rotate-90" /> Instructions
        </summary>
        <p className="mt-2 whitespace-pre-wrap rounded-xl bg-text-primary/[0.04] p-3 leading-relaxed text-text-secondary">{agent.instructions}</p>
      </details>
      {items.map((it, i) => {
        if (it.kind === 'text') return <AiMarkdown key={it.ev.id} text={String(it.ev.data.text ?? '')} size="compact" className="text-[14px] leading-relaxed text-text-primary" />
        if (it.kind === 'tool') return <ToolRow key={it.call.id} call={it.call} result={it.result} />
        return <OtherRow key={it.ev.id ?? i} ev={it.ev} agent={agent} />
      })}
      {think && (
        <div className="flex gap-2 text-[12.5px] italic leading-relaxed text-text-muted">
          <Brain className="mt-0.5 size-3.5 shrink-0 text-accent-brand/70" />
          <p className="line-clamp-3 whitespace-pre-wrap">{think.slice(-700)}</p>
        </div>
      )}
      {live && (
        <div className="hive-caret">
          <AiMarkdown text={live} streaming size="compact" className="inline text-[14px] leading-relaxed text-text-primary" />
        </div>
      )}
      {running && !live && !think && (
        <div className="flex items-center gap-2 text-[12.5px] text-text-muted">
          <Loader2 className="size-3.5 animate-spin" /> {agent.status === 'queued' ? 'Waiting for a free slot…' : 'Working…'}
        </div>
      )}
      {!running && (agent.status === 'failed' || agent.status === 'stopped' || agent.status === 'interrupted') && <ContinueWith agent={agent} />}
    </div>
  )

  if (variant === 'focus') return body

  const cost = fmtCost(agent.cost_micros)
  return (
    <section className={cn('hive-card flex h-[min(560px,calc(100vh-280px))] min-h-0 flex-col overflow-hidden', running && 'ring-1 ring-accent-brand/30')} aria-label={agent.name}>
      <header className="flex items-center gap-2.5 border-b hive-line px-4 py-3">
        <ProviderGlyph provider={agent.provider} pulse={running} />
        <button type="button" onClick={onFocus} className="min-w-0 flex-1 text-left">
          <div className="truncate text-[14px] font-medium text-text-primary">
            {agent.name} {agent.role !== 'solo' && <span className="text-[12px] font-normal capitalize text-text-muted">· {agent.role}</span>}
          </div>
          <div className="truncate text-[12px] text-text-muted">
            {agent.model} · {fmtTokens(agent.input_tokens + agent.output_tokens)} tok{cost ? ` · ${cost}` : ''} · {duration(agent.started_at, agent.finished_at)}
          </div>
        </button>
        <StatusPill status={agent.status} />
        {running && (
          <Button size="icon-sm" variant="ghost" onClick={() => hiveApi.stopAgent(agent.id).catch(() => {})} aria-label="Stop agent">
            <Square className="fill-current" />
          </Button>
        )}
      </header>
      {workers && workers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b hive-line px-4 py-2">
          {workers.map((w) => (
            <span key={w.id} className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary">
              <ProviderGlyph provider={w.provider} size="xs" pulse={w.status === 'running'} />
              {w.name}
            </span>
          ))}
        </div>
      )}
      {body}
    </section>
  )
})

/** Hand a stopped/failed agent's work to any other model. */
export function ContinueWith({ agent }: { agent: AgentRow }) {
  const { boot } = useHive()
  const toast = useToast()
  const [spec, setSpec] = useState<AgentSpec | null>(() => (boot ? defaultSpec(boot) : null))
  const [busy, setBusy] = useState(false)
  if (!boot || !spec) return null
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-text-primary/[0.04] p-3">
      <ArrowRightLeft className="size-4 text-text-muted" />
      <span className="text-[13px] text-text-secondary">Continue {agent.name}'s work with</span>
      <AgentChip boot={boot} spec={spec} onChange={setSpec} compact />
      <Button
        size="sm"
        className="ml-auto"
        loading={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await hiveApi.handoff(agent.id, spec)
            toast.success('Handed over — the new agent picks up from the working copy')
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not hand over')
          } finally {
            setBusy(false)
          }
        }}
      >
        Continue
      </Button>
    </div>
  )
}

function ToolRow({ call, result }: { call: HiveEvent; result?: HiveEvent }) {
  const [open, setOpen] = useState(false)
  const name = String(call.data.name)
  const input = (call.data.input ?? {}) as Record<string, unknown>
  const Icon = TOOL_ICON[name] ?? FileText
  const err = !!result?.data.isError
  const write = ['write_file', 'edit_file', 'delete_file'].includes(name)
  return (
    <div className="text-[13px]">
      <button type="button" onClick={() => setOpen((o) => !o)} className="group flex w-full items-center gap-2 rounded-lg py-0.5 text-left">
        <Icon className={cn('size-3.5 shrink-0', err ? 'text-state-error' : write ? 'text-accent-brand' : 'text-text-muted')} />
        <span className={cn('min-w-0 flex-1 truncate', write ? 'text-text-primary' : 'text-text-secondary')}>{toolTitle(name, input)}</span>
        {!result ? <Loader2 className="size-3 animate-spin text-text-muted" /> : err ? <AlertCircle className="size-3.5 text-state-error" /> : <Check className="size-3.5 text-text-muted opacity-0 group-hover:opacity-100" />}
      </button>
      {open && (
        <div className="mb-1 ml-5 mt-1 space-y-1.5">
          {name === 'delegate' && Array.isArray(input.tasks) ? (
            <ol className="list-decimal space-y-1 pl-4 text-[12.5px] text-text-secondary">
              {(input.tasks as { title: string; agent?: string; difficulty?: string }[]).map((t, i) => (
                <li key={i}>
                  {t.title}
                  {t.agent && <span className="text-text-muted"> → {t.agent}</span>}
                  {t.difficulty && <span className="text-text-muted"> · {t.difficulty}</span>}
                </li>
              ))}
            </ol>
          ) : (
            <pre className="hive-scroll max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-text-primary/[0.04] p-2.5 font-mono text-[11px] text-text-muted">{JSON.stringify(input, null, 2)}</pre>
          )}
          {result && <pre className={cn('hive-scroll max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg p-2.5 font-mono text-[11px]', err ? 'bg-state-error/8 text-state-error' : 'bg-text-primary/[0.04] text-text-secondary')}>{String(result.data.preview ?? '')}</pre>}
        </div>
      )}
    </div>
  )
}

function OtherRow({ ev, agent }: { ev: HiveEvent; agent: AgentRow }) {
  const d = ev.data as Record<string, unknown>
  switch (ev.kind) {
    case 'note':
      return (
        <div className="flex gap-2 text-[13px] text-text-secondary">
          <StickyNote className="mt-0.5 size-3.5 shrink-0 text-state-warning" />
          <span className="whitespace-pre-wrap">{String(d.message)}</span>
        </div>
      )
    case 'steer':
      return (
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent-brand/12 px-3.5 py-2 text-[13.5px] text-text-primary">
          <span className="mb-0.5 block text-[11px] text-accent-brand">@{String(d.username)}</span>
          {String(d.message)}
        </div>
      )
    case 'handoff': {
      const from = d.from as { provider?: string; model?: string } | undefined
      const to = d.to as { provider?: string; model?: string } | undefined
      return (
        <div className="flex items-center gap-2.5 rounded-xl bg-state-info/8 px-3 py-2.5 text-[13px]">
          <ArrowRightLeft className="size-4 shrink-0 text-state-info" />
          <span className="min-w-0 flex-1 text-text-secondary">
            <span className="text-text-primary">Handed over</span>
            {from?.provider && to?.provider && from.provider !== to.provider ? ` from ${vendorName(from.provider)} to ${vendorName(to.provider)}` : ' to another key'}
            {to?.model ? ` · ${to.model}` : ''}
            <span className="block text-[12px] text-text-muted">{String(d.reason ?? '')}</span>
          </span>
          {to?.provider && <ProviderGlyph provider={to.provider} size="sm" />}
        </div>
      )
    }
    case 'error':
      return (
        <div className="flex gap-2 rounded-xl bg-state-error/8 px-3 py-2.5 text-[13px] text-state-error">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="whitespace-pre-wrap">{String(d.message)}</span>
        </div>
      )
    case 'status':
      if (d.status === 'done' && d.summary)
        return (
          <div className="rounded-xl border hive-line bg-state-success/[0.05] p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-state-success">
              <Flag className="size-3.5" /> {agent.name} is done
            </div>
            <AiMarkdown text={String(d.summary)} size="compact" className="text-[13.5px] text-text-primary" />
          </div>
        )
      return null
    default:
      return (
        <div className="flex items-center gap-2 text-[12px] text-text-muted">
          <MessageSquare className="size-3" /> {String(d.message ?? ev.kind)}
        </div>
      )
  }
}

export function AgentsStripButton({ agent, active, onClick }: { agent: AgentRow; active: boolean; onClick: () => void }) {
  const running = agent.status === 'running' || agent.status === 'queued'
  return (
    <button type="button" onClick={onClick} className={cn('flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[13px] transition-colors', active ? 'bg-text-primary/[0.09] text-text-primary' : 'text-text-secondary hover:bg-text-primary/[0.05]')}>
      <ProviderGlyph provider={agent.provider} size="sm" pulse={running} className="rounded-full" />
      <span className="max-w-32 truncate">{agent.name}</span>
      {agent.role === 'lead' && <span className="text-[11px] text-text-muted">lead</span>}
      {!running && <span className="size-1.5 rounded-full" style={{ background: agent.status === 'done' ? 'var(--color-state-success)' : agent.status === 'failed' ? 'var(--color-state-error)' : 'var(--color-text-muted)' }} />}
    </button>
  )
}

/** Small popover with an agent's numbers. */
export function AgentStats({ agent }: { agent: AgentRow }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="text-[12px] text-text-muted hover:text-text-secondary">
          {agent.model} · {fmtTokens(agent.input_tokens + agent.output_tokens)} tok
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 text-[12.5px]">
        <dl className="grid grid-cols-2 gap-y-1.5">
          <dt className="text-text-muted">Provider</dt>
          <dd>{vendorName(agent.provider)}</dd>
          <dt className="text-text-muted">Model</dt>
          <dd className="truncate">{agent.model}</dd>
          <dt className="text-text-muted">Input</dt>
          <dd className="tabular-nums">{agent.input_tokens.toLocaleString()}</dd>
          <dt className="text-text-muted">Output</dt>
          <dd className="tabular-nums">{agent.output_tokens.toLocaleString()}</dd>
          <dt className="text-text-muted">Cost</dt>
          <dd>{fmtCost(agent.cost_micros) ?? '—'}</dd>
          <dt className="text-text-muted">Steps</dt>
          <dd>{agent.steps}</dd>
          <dt className="text-text-muted">Handoffs</dt>
          <dd>{agent.handoffs ?? 0}</dd>
          <dt className="text-text-muted">Time</dt>
          <dd>{duration(agent.started_at, agent.finished_at)}</dd>
        </dl>
      </PopoverContent>
    </Popover>
  )
}
