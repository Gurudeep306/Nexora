import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, GitCommitHorizontal, MessageSquare, Pencil, Send, StickyNote, Wrench } from 'lucide-react'
import { CopilotMark as Bot } from './marks'
import { Button, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { useHive } from './store'
import type { AgentRow, HiveEvent } from './types'
import { ProviderGlyph, UserDot, timeAgo } from './ui'
import { SegmentedControl } from './kit'

export function BoardView({ agents, events }: { agents: AgentRow[]; events: HiveEvent[] }) {
  const byId = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents])
  const notes = events.filter((e) => e.kind === 'note' || e.kind === 'steer')
  const [filter, setFilter] = useState<'all' | 'edits' | 'notes' | 'problems'>('all')
  const timeline = events.filter((e) => {
    if (filter === 'edits') return (e.kind === 'tool_result' && (e.data.meta as { write?: boolean } | null)?.write) || e.kind === 'human_edit' || e.kind === 'commit'
    if (filter === 'notes') return e.kind === 'note' || e.kind === 'steer' || e.kind === 'system'
    if (filter === 'problems') return e.kind === 'error' || (e.kind === 'tool_result' && e.data.isError)
    return e.kind !== 'tool_call' && e.kind !== 'text'
  })

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[1fr_360px]">
      <div className="flex min-h-0 flex-col overflow-hidden hive-card">
        <div className="flex items-center gap-1 border-b hive-line px-2 py-1.5">
          <span className="px-1.5 text-xs font-semibold text-text-primary">Activity</span>
          <SegmentedControl
            size="sm"
            label="Show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'edits', label: 'Edits' },
              { value: 'notes', label: 'Notes' },
              { value: 'problems', label: 'Problems' },
            ]}
          />
          <span className="ml-auto pr-2 text-[11px] text-text-muted">{events.length} events</span>
        </div>
        <ol className="hive-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
          {timeline
            .slice(-400)
            .reverse()
            .map((e) => (
              <TimelineRow key={e.id} ev={e} agent={e.agent_id ? byId.get(e.agent_id) : undefined} />
            ))}
          {!timeline.length && <li className="p-4 text-center text-xs text-text-muted">Nothing here yet.</li>}
        </ol>
      </div>
      <div className="flex min-h-0 flex-col gap-3">
        <div className="max-h-[40%] min-h-0 overflow-hidden hive-card">
          <div className="flex items-center gap-1.5 border-b hive-line px-3 py-2 text-xs font-semibold text-text-primary">
            <StickyNote className="size-3.5 text-state-warning" /> Team board
          </div>
          <div className="hive-scroll max-h-64 space-y-1.5 overflow-y-auto p-2">
            {notes.length === 0 && <p className="p-2 text-xs text-text-muted">Agents post interfaces, decisions and blockers here so they don't collide.</p>}
            {notes.map((n) => {
              const a = n.agent_id ? byId.get(n.agent_id) : undefined
              return (
                <div key={n.id} className="rounded-lg bg-text-primary/4 px-2.5 py-1.5 text-[12px]">
                  <div className="mb-0.5 flex items-center gap-1.5 text-[10px] text-text-muted">
                    {n.kind === 'steer' ? <UserDot username={String(n.data.username)} size={3.5} /> : a ? <ProviderGlyph provider={a.provider} size="xs" /> : null}
                    <span className="font-medium text-text-secondary">{n.kind === 'steer' ? `@${n.data.username} → ${a?.name}` : a?.name}</span>
                    <span className="ml-auto">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-text-primary">{String(n.data.message)}</p>
                </div>
              )
            })}
          </div>
        </div>
        <StaffChat />
      </div>
    </div>
  )
}

function TimelineRow({ ev, agent }: { ev: HiveEvent; agent?: AgentRow }) {
  const d = ev.data
  let icon = <Bot className="size-3.5 text-text-muted" />
  let text: React.ReactNode = String(d.message ?? ev.kind)
  if (ev.kind === 'tool_result') {
    const meta = d.meta as { path?: string; write?: boolean } | null
    icon = d.isError ? <AlertCircle className="size-3.5 text-state-error" /> : <Wrench className={cn('size-3.5', meta?.write ? 'text-accent-brand' : 'text-text-muted')} />
    text = (
      <>
        <span className="font-mono">{String(d.name)}</span>
        {meta?.path ? <span className="font-mono text-text-muted"> {meta.path}</span> : null}
        {d.isError ? <span className="text-state-error"> — {String(d.preview).slice(0, 140)}</span> : null}
      </>
    )
  } else if (ev.kind === 'human_edit') {
    icon = <Pencil className="size-3.5 text-state-info" />
    text = `@${d.username} ${d.reverted ? 'reverted' : d.deleted ? 'deleted' : 'edited'} ${d.path}`
  } else if (ev.kind === 'commit') {
    icon = <GitCommitHorizontal className="size-3.5 text-state-success" />
    text = `@${d.username} committed ${String(d.sha).slice(0, 7)} to ${d.branch}${d.pr ? ` · PR #${(d.pr as { number: number }).number}` : ''}`
  } else if (ev.kind === 'status') {
    text = `${d.status}${d.error ? ` — ${d.error}` : ''}`
  } else if (ev.kind === 'note') {
    icon = <StickyNote className="size-3.5 text-state-warning" />
  } else if (ev.kind === 'steer') {
    icon = <MessageSquare className="size-3.5 text-accent-brand" />
    text = `@${d.username}: ${d.message}`
  } else if (ev.kind === 'error') {
    icon = <AlertCircle className="size-3.5 text-state-error" />
  }
  return (
    <li className="flex items-start gap-2 rounded-md px-2 py-1 text-[12px] text-text-secondary hover:bg-text-primary/4">
      <span className="mt-0.5">{icon}</span>
      {agent && <span className="shrink-0 font-medium text-text-primary">{agent.name}</span>}
      <span className="min-w-0 flex-1 break-words">{text}</span>
      <span className="shrink-0 text-[10px] tabular-nums text-text-muted">{new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
    </li>
  )
}

export function StaffChat({ className }: { className?: string }) {
  const { chat, projectId, taskId, boot, typing, emitTyping } = useHive()
  const toast = useToast()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [chat.length])
  const typers = Object.keys(typing).filter((u) => u !== boot?.me.username)
  if (!projectId) return null
  const send = async () => {
    if (!text.trim()) return
    setBusy(true)
    try {
      await hiveApi.sendChat(projectId, text.trim(), taskId)
      setText('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden hive-card', className)}>
      <div className="flex items-center gap-1.5 border-b hive-line px-3 py-2 text-xs font-semibold text-text-primary">
        <MessageSquare className="size-3.5 text-accent-brand" /> Staff chat
        <span className="ml-auto text-[10px] font-normal text-text-muted">project-wide</span>
      </div>
      <div className="hive-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {!chat.length && <p className="text-center text-xs text-text-muted">Coordinate with other staff here — who takes what, review requests, merges.</p>}
        {chat.map((m) => {
          const mine = m.username === boot?.me.username
          return (
            <div key={m.id} className={cn('flex gap-2', mine && 'flex-row-reverse')}>
              <UserDot username={m.username} size={6} />
              <div className={cn('max-w-[80%] rounded-2xl px-3 py-1.5 text-[12.5px]', mine ? 'rounded-tr-sm bg-accent-brand/14 text-text-primary' : 'rounded-tl-sm bg-text-primary/6 text-text-primary')}>
                {!mine && <div className="text-[10px] font-medium text-text-muted">@{m.username}</div>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div className="mt-0.5 text-right text-[9px] text-text-muted">{timeAgo(m.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      {typers.length > 0 && <div className="px-3 pb-1 text-[10px] text-text-muted">{typers.map((u) => `@${u}`).join(', ')} typing…</div>}
      <form
        className="flex items-center gap-2 border-t hive-line p-2"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            emitTyping()
          }}
          placeholder="Message staff…"
          className="min-w-0 flex-1 rounded-lg bg-text-primary/5 px-3 py-2 text-[12.5px] text-text-primary outline-none placeholder:text-text-muted"
        />
        <Button size="icon-sm" type="submit" loading={busy} disabled={!text.trim()} aria-label="Send">
          {!busy && <Send />}
        </Button>
      </form>
    </div>
  )
}
