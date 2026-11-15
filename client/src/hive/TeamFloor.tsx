/* ────────────────────────────────────────────────────────────────────────
   The team floor: a session seen as a team at work. The brief sits at the
   head of the floor; every agent has its own station — who it is, what role
   it plays, what it is doing this second, the files it has touched, how far
   along it is — wired to the brief (and to its lead) with live links that
   pulse while work flows. Handoffs, escalations, the Judge's verdict and
   pipeline stages all show up here in plain language.
   ──────────────────────────────────────────────────────────────────────── */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRightLeft, ChevronDown, Crown, Eye, FileCode2, Gavel, GitPullRequest, Loader2, Route, Send, Sparkles, Square, Workflow } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { AgentAvatar, AgentMark, CostBadge, FAMILY, RoleTag, STATE_INFO, agentActivity, describeTool, familyColor, familyOf } from './agents'
import { shortModel } from './AgentPicker'
import { hiveApi } from './api'
import { errMsg } from './Improve'
import { useHive } from './store'
import type { AgentRow, CostClass, HiveEvent, Task } from './types'
import { duration, fmtTokens } from './ui'

const WRITE = new Set(['write_file', 'edit_file', 'delete_file'])

function costOf(a: AgentRow, keys: { id: string; freeTier?: boolean; subscription?: boolean }[]): CostClass | null {
  if (a.provider === 'claude_code' || a.provider === 'codex' || a.provider === 'vibe') return 'sub'
  const k = keys.find((x) => x.id === a.key_id)
  if (k?.freeTier || /:free$/.test(a.model)) return 'free'
  return null
}

/** Order: lead, then builders by start, then reviewers and judges. */
function order(agents: AgentRow[]) {
  const rank = (a: AgentRow) => (a.role === 'lead' ? 0 : a.role === 'reviewer' ? 2 : 1)
  return [...agents].sort((a, b) => rank(a) - rank(b) || a.created_at - b.created_at)
}

export function TeamFloor({ task, agents, events, focus, onFocus }: { task: Task; agents: AgentRow[]; events: HiveEvent[]; focus: string | null; onFocus: (id: string) => void }) {
  const { boot, live, streaming, thinking } = useHive()
  const floorRef = useRef<HTMLDivElement>(null)
  const briefRef = useRef<HTMLDivElement>(null)
  const stationRefs = useRef(new Map<string, HTMLDivElement>())
  const [wires, setWires] = useState<{ id: string; d: string; active: boolean; color: string }[]>([])
  const [briefOpen, setBriefOpen] = useState(false)
  const list = useMemo(() => order(agents), [agents])

  const activity = useMemo(() => Object.fromEntries(list.map((a) => [a.id, agentActivity(a, events, live, streaming, thinking)])), [list, events, live, streaming, thinking])
  const verdict = useMemo(() => [...events].reverse().find((e) => e.kind === 'verdict'), [events])
  const stages = useMemo(() => pipelineStages(events), [events])
  const recentHandoffs = useMemo(() => events.filter((e) => e.kind === 'handoff' && Date.now() - e.created_at < 15000), [events])
  const files = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const e of events) {
      if (e.kind !== 'tool_call' || !e.agent_id || !WRITE.has(String(e.data.name))) continue
      const p = String((e.data.input as Record<string, unknown>)?.path ?? '')
      if (!p) continue
      const l = m.get(e.agent_id) ?? []
      if (!l.includes(p)) l.push(p)
      m.set(e.agent_id, l)
    }
    return m
  }, [events])

  // Wires from the brief (or the lead) to each station; recomputed on layout changes.
  useLayoutEffect(() => {
    const floor = floorRef.current
    if (!floor) return
    const compute = () => {
      const fr = floor.getBoundingClientRect()
      const anchor = (el: HTMLElement | null | undefined, side: 'top' | 'bottom') => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.left - fr.left + r.width / 2, y: side === 'top' ? r.top - fr.top : r.bottom - fr.top }
      }
      const brief = anchor(briefRef.current, 'bottom')
      const out: { id: string; d: string; active: boolean; color: string }[] = []
      for (const a of list) {
        const el = stationRefs.current.get(a.id)
        const lead = a.parent_id ? stationRefs.current.get(a.parent_id) : null
        const from = lead ? anchor(lead, 'bottom') : brief
        const to = anchor(el, 'top')
        if (!from || !to) continue
        // Workers under a lead in the same row: wire across the top instead.
        const dy = Math.max(24, (to.y - from.y) / 2)
        const d = `M ${from.x} ${from.y} C ${from.x} ${from.y + dy}, ${to.x} ${to.y - dy}, ${to.x} ${to.y}`
        out.push({ id: a.id, d, active: a.status === 'running', color: familyColor(familyOf(a.provider, a.model)) })
      }
      setWires(out)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(floor)
    for (const el of stationRefs.current.values()) ro.observe(el)
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', compute)
    }
  }, [list, briefOpen, stages.length, verdict])

  const running = list.filter((a) => a.status === 'running').length
  const done = list.filter((a) => a.status === 'done').length

  return (
    <div ref={floorRef} className="hive-floor relative min-h-full px-4 pb-10 pt-6 sm:px-6">
      {/* wires */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {wires.map((w) => (
          <g key={w.id}>
            <path d={w.d} fill="none" stroke="var(--hive-line-strong)" strokeWidth="1.5" />
            {w.active && <path d={w.d} fill="none" stroke={w.color} strokeWidth="2" className="hive-wire" opacity="0.9" />}
          </g>
        ))}
      </svg>

      {/* the brief */}
      <div className="relative mx-auto mb-10 max-w-2xl">
        <motion.div ref={briefRef} layout className="hive-card relative overflow-hidden p-4 shadow-[var(--elev-2)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-accent-brand/50" />
          <div className="flex items-start gap-3">
            <span className="hive-tile size-9 shrink-0" style={{ ['--tile' as string]: 'var(--color-accent-brand)' }}>
              {task.mode === 'pipeline' ? <Workflow className="size-4" /> : <Sparkles className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-text-muted">The brief</span>
                {task.kind && <span className="hive-chip h-5 px-2 text-[10.5px]">{KIND_LABEL[task.kind] ?? task.kind}</span>}
                <span className="ml-auto text-[11.5px] tabular-nums text-text-muted">
                  {running > 0 ? (
                    <span className="inline-flex items-center gap-1 text-accent-brand">
                      <span className="hive-dot-run size-1.5 rounded-full bg-accent-brand" /> {running} working
                    </span>
                  ) : (
                    `${done}/${list.length} done`
                  )}
                </span>
              </div>
              <p className={cn('mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-text-primary', !briefOpen && 'line-clamp-2')}>{task.prompt}</p>
              {task.prompt.length > 160 && (
                <button type="button" onClick={() => setBriefOpen((o) => !o)} className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-text-muted hover:text-text-primary">
                  {briefOpen ? 'Less' : 'More'} <ChevronDown className={cn('size-3 transition-transform', briefOpen && 'rotate-180')} />
                </button>
              )}
            </div>
          </div>
          {stages.length > 0 && <StageRail stages={stages} />}
          {task.pr_url && (
            <a href={task.pr_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-state-success/12 px-2.5 py-1 text-[12px] font-medium text-state-success hover:bg-state-success/20">
              <GitPullRequest className="size-3.5" /> Shipped as PR #{task.pr_number}
            </a>
          )}
        </motion.div>
      </div>

      {verdict && <VerdictBanner ev={verdict} agents={agents} />}

      {/* stations */}
      <div className="relative grid gap-x-5 gap-y-8 sm:grid-cols-2 2xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {list.map((a, i) => (
            <Station
              key={a.id}
              a={a}
              index={i}
              act={activity[a.id]}
              files={files.get(a.id) ?? []}
              cost={costOf(a, boot?.keys ?? [])}
              focused={focus === a.id}
              onFocus={() => onFocus(a.id)}
              winner={verdict && String(verdict.data.winner) === a.id}
              handoff={recentHandoffs.find((e) => e.agent_id === a.id)}
              innerRef={(el) => (el ? stationRefs.current.set(a.id, el) : stationRefs.current.delete(a.id))}
            />
          ))}
        </AnimatePresence>
      </div>
      {!list.length && (
        <div className="mx-auto max-w-sm py-10 text-center text-[13px] text-text-muted">
          <Loader2 className="mx-auto mb-3 size-5 animate-spin text-accent-brand" />
          Assembling the team…
        </div>
      )}
    </div>
  )
}

const KIND_LABEL: Record<string, string> = { chat: 'Conversation', mechanical: 'Mechanical edits', reading: 'Reading', search: 'Finding things', writing: 'Writing', coding: 'Coding', review: 'Review', hard: 'Hard engineering' }

function Station({
  a,
  index,
  act,
  files,
  cost,
  focused,
  onFocus,
  winner,
  handoff,
  innerRef,
}: {
  a: AgentRow
  index: number
  act: { state: keyof typeof STATE_INFO; line: string }
  files: string[]
  cost: CostClass | null
  focused: boolean
  onFocus: () => void
  winner?: boolean
  handoff?: HiveEvent
  innerRef: (el: HTMLDivElement | null) => void
}) {
  const toast = useToast()
  const [steer, setSteer] = useState('')
  const [open, setOpen] = useState(false)
  const fam = familyOf(a.provider, a.model)
  const working = a.status === 'running'
  const st = STATE_INFO[act.state]
  const [, tick] = useState(0)
  useEffect(() => {
    if (!working) return
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [working])
  return (
    <motion.div
      ref={innerRef}
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
      className="hive-station p-4"
      data-active={working}
      data-focus={focused}
      style={{ ['--st' as string]: st.color }}
    >
      {working && <span className="hive-station-glow" aria-hidden="true" />}
      {winner && (
        <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-[oklch(80%_0.14_85)] px-2 py-0.5 text-[10.5px] font-bold text-[oklch(30%_0.08_70)] shadow-sm">
          <Crown className="size-3" /> Judge’s pick
        </span>
      )}
      <div className="relative flex items-start gap-3">
        <button type="button" onClick={onFocus} aria-label={`Show ${a.name}'s work`} className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent-brand">
          <AgentAvatar provider={a.provider} model={a.model} state={act.state} size={42} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{a.name}</span>
            <RoleTag a={a} />
            {cost && <CostBadge cost={cost} long />}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11.5px] text-text-muted">
            <span className="font-medium" style={{ color: `color-mix(in oklab, ${familyColor(fam, 60)} 65%, var(--color-text-primary))` }}>
              {FAMILY[fam].name}
            </span>
            <span className="truncate font-mono">{shortModel(a.model)}</span>
            {a.route_note && (
              <Tooltip label={<span className="block max-w-[300px] text-[12px]">{a.route_note}</span>}>
                <span className="inline-flex shrink-0 cursor-help items-center gap-0.5 rounded-full bg-accent-brand/10 px-1.5 text-[10px] text-accent-brand">
                  <Route className="size-2.5" /> why
                </span>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* what it's doing right now */}
      <div className="relative mt-3 rounded-xl bg-text-primary/[0.035] px-3 py-2.5">
        <div className="mb-0.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: st.color }}>
          {working && <span className="size-1.5 rounded-full hive-dot-run" style={{ background: st.color }} />}
          {st.label}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={act.line} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className={cn('text-[13px] leading-snug', a.status === 'failed' ? 'text-state-error' : 'text-text-primary', working ? 'line-clamp-1' : 'line-clamp-3')}>
            {act.line}
          </motion.div>
        </AnimatePresence>
        {a.title && !/^(solo|together|follow-up)$/i.test(a.title) && <div className="mt-1 truncate text-[11.5px] text-text-muted">Job: {a.title}</div>}
      </div>

      {handoff && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[oklch(70%_0.14_330/0.1)] px-2.5 py-1.5 text-[11.5px] text-[color-mix(in_oklab,oklch(60%_0.13_330)_70%,var(--color-text-primary))]">
          <ArrowRightLeft className="size-3.5 shrink-0" />
          <span className="truncate">
            {String(handoff.data.reason ?? 'Handed over')}
            {(handoff.data.to as { model?: string })?.model ? ` → ${shortModel(String((handoff.data.to as { model: string }).model))}` : ''}
          </span>
        </motion.div>
      )}

      {files.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {files.slice(-4).map((p) => (
            <span key={p} className="inline-flex max-w-full items-center gap-1 rounded-md bg-text-primary/[0.05] px-1.5 py-0.5 font-mono text-[10.5px] text-text-secondary">
              <FileCode2 className="size-3 shrink-0 text-text-muted" />
              <span className="truncate">{p.split('/').pop()}</span>
            </span>
          ))}
          {files.length > 4 && <span className="px-1 text-[10.5px] text-text-muted">+{files.length - 4}</span>}
        </div>
      )}

      {/* progress */}
      <div className="mt-3 flex items-center gap-3 text-[11px] tabular-nums text-text-muted">
        <span title="Steps">{a.steps} steps</span>
        <span title="Tokens">{fmtTokens(a.input_tokens + a.output_tokens)} tok</span>
        {a.started_at && <span>{duration(a.started_at, a.finished_at)}</span>}
        {(a.handoffs ?? 0) > 0 && <span title="Times it continued on another key or model">↻ {a.handoffs}</span>}
        <span className="ml-auto flex items-center gap-0.5">
          <Tooltip label="Show its work">
            <button type="button" onClick={onFocus} className="grid size-7 place-items-center rounded-lg hover:bg-text-primary/[0.07] hover:text-text-primary" aria-label="Show its work">
              <Eye className="size-3.5" />
            </button>
          </Tooltip>
          {working && (
            <>
              <Popover open={open} onOpenChange={setOpen}>
                <Tooltip label="Send it a message">
                  <PopoverTrigger asChild>
                    <button type="button" className="grid size-7 place-items-center rounded-lg hover:bg-text-primary/[0.07] hover:text-text-primary" aria-label="Steer">
                      <Send className="size-3.5" />
                    </button>
                  </PopoverTrigger>
                </Tooltip>
                <PopoverContent align="end" className="w-[320px] p-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!steer.trim()) return
                      hiveApi
                        .steer(a.id, steer.trim())
                        .then(() => (toast.success(`${a.name} got your message`), setSteer(''), setOpen(false)))
                        .catch((err) => toast.error(errMsg(err)))
                    }}
                    className="space-y-2"
                  >
                    <div className="text-[12px] font-medium">Message {a.name}</div>
                    <textarea autoFocus value={steer} onChange={(e) => setSteer(e.target.value)} rows={3} placeholder="e.g. keep the public API unchanged" className="w-full resize-none rounded-lg bg-text-primary/[0.05] p-2 text-[12.5px] outline-none focus:bg-text-primary/[0.08]" />
                    <button type="submit" className="h-8 w-full rounded-lg bg-accent-brand text-[12.5px] font-medium text-on-accent-brand">
                      Send
                    </button>
                  </form>
                </PopoverContent>
              </Popover>
              <Tooltip label="Stop this agent">
                <button type="button" onClick={() => hiveApi.stopAgent(a.id).catch((e) => toast.error(errMsg(e)))} className="grid size-7 place-items-center rounded-lg hover:bg-state-error/10 hover:text-state-error" aria-label="Stop">
                  <Square className="size-3" />
                </button>
              </Tooltip>
            </>
          )}
        </span>
      </div>
    </motion.div>
  )
}

/* ── Pipeline stages (from 'pipeline' events) ─────────────────────────── */
function pipelineStages(events: HiveEvent[]) {
  const order: string[] = []
  const last = new Map<string, { status: string; message?: string; index: number; total: number }>()
  for (const e of events) {
    if (e.kind !== 'pipeline') continue
    const stage = String(e.data.stage)
    if (!order.includes(stage)) order.push(stage)
    last.set(stage, { status: String(e.data.status), message: e.data.message ? String(e.data.message) : undefined, index: Number(e.data.index ?? 0), total: Number(e.data.total ?? 0) })
  }
  return order.map((s) => ({ name: s, ...last.get(s)! }))
}

const STAGE_TONE: Record<string, string> = {
  running: 'var(--color-accent-brand)',
  done: 'var(--color-state-success)',
  passed: 'var(--color-state-success)',
  changes: 'var(--color-state-warning)',
  failed: 'var(--color-state-error)',
  skipped: 'var(--color-text-muted)',
}

function StageRail({ stages }: { stages: { name: string; status: string; message?: string }[] }) {
  return (
    <div className="hive-scroll mt-3 flex items-center gap-1 overflow-x-auto pb-1">
      {stages.map((s, i) => (
        <div key={s.name} className="flex shrink-0 items-center gap-1">
          <Tooltip label={s.message || s.status}>
            <span className="hive-stage-chip inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium" data-state={s.status === 'running' ? 'active' : s.status} style={{ color: STAGE_TONE[s.status] ?? 'var(--color-text-secondary)', background: `color-mix(in oklab, ${STAGE_TONE[s.status] ?? 'var(--color-text-muted)'} 12%, transparent)` }}>
              {s.status === 'running' ? <Loader2 className="size-3 animate-spin" /> : <span className="size-1.5 rounded-full" style={{ background: STAGE_TONE[s.status] ?? 'currentColor' }} />}
              {s.name}
            </span>
          </Tooltip>
          {i < stages.length - 1 && <span className="h-px w-3 bg-[var(--hive-line-strong)]" />}
        </div>
      ))}
    </div>
  )
}

/* ── The Judge's verdict ──────────────────────────────────────────────── */
function VerdictBanner({ ev, agents }: { ev: HiveEvent; agents: AgentRow[] }) {
  const d = ev.data as { winner: string | null; noVerdict?: boolean; name?: string; model?: string; reason?: string; ranking?: { agentId: string; name: string; score: number; strengths?: string; weaknesses?: string }[]; judge?: { model: string } | null; adopted?: boolean }
  const win = agents.find((a) => a.id === d.winner)
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto mb-8 max-w-3xl overflow-hidden rounded-2xl border border-[oklch(80%_0.14_85/0.35)] bg-[oklch(80%_0.14_85/0.07)] p-4">
      <div className="flex items-start gap-3">
        <span className="hive-tile size-9 shrink-0" style={{ ['--tile' as string]: 'oklch(78% 0.14 80)' }}>
          <Gavel className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">
            {d.noVerdict ? (
              'No verdict — nothing was adopted'
            ) : (
              <>
                The Judge picked {win?.name ?? d.name} <span className="font-normal text-text-muted">({shortModel(win?.model ?? d.model ?? '')})</span>
              </>
            )}
            {d.adopted && <span className="ml-1.5 text-[11.5px] font-medium text-state-success">· adopted as the result</span>}
          </div>
          {d.reason && <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{d.reason}</p>}
          {!!d.ranking?.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.ranking.map((r, i) => (
                <Tooltip key={r.agentId} label={<span className="block max-w-[320px] text-[12px]">{r.strengths}{r.weaknesses ? ` — but: ${r.weaknesses}` : ''}</span>}>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px]', i === 0 ? 'bg-[oklch(80%_0.14_85/0.2)] font-semibold' : 'bg-text-primary/[0.06] text-text-secondary')}>
                    {i === 0 && <Crown className="size-3" />} {r.name} · {r.score}/10
                  </span>
                </Tooltip>
              ))}
            </div>
          )}
          {d.judge && <div className="mt-1.5 text-[11px] text-text-muted">Judged by {d.judge.model}</div>}
        </div>
      </div>
    </motion.div>
  )
}

/** A short plain-language feed of the latest notable moments (for the floor). */
export function FloorFeed({ events, agents }: { events: HiveEvent[]; agents: AgentRow[] }) {
  const byId = new Map(agents.map((a) => [a.id, a]))
  const items = events
    .filter((e) => ['tool_call', 'handoff', 'route', 'commit', 'verdict', 'approval', 'status'].includes(e.kind))
    .filter((e) => e.kind !== 'status' || ['done', 'failed'].includes(String(e.data.status)))
    .slice(-10)
    .reverse()
  if (!items.length) return null
  return (
    <div className="mx-auto mt-10 max-w-3xl">
      <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-text-muted">Latest</div>
      <div className="hive-card hive-divide overflow-hidden">
        {items.map((e) => {
          const a = e.agent_id ? byId.get(e.agent_id) : null
          let text = ''
          if (e.kind === 'tool_call') text = describeTool(String(e.data.name), (e.data.input ?? {}) as Record<string, unknown>)
          else if (e.kind === 'handoff') text = `continued on ${shortModel(String((e.data.to as { model?: string })?.model ?? ''))} — ${String(e.data.reason ?? '')}`
          else if (e.kind === 'route') text = String(e.data.note ?? '').split(' · ')[0]
          else if (e.kind === 'commit') text = `committed to ${String(e.data.branch)}${e.data.pr ? ' and opened a PR' : ''}`
          else if (e.kind === 'verdict') text = e.data.noVerdict ? 'the Judge gave no verdict' : `the Judge picked ${String(e.data.name)}`
          else if (e.kind === 'approval') text = `asked to run: ${String(e.data.command).slice(0, 80)}`
          else if (e.kind === 'status') text = e.data.status === 'done' ? 'finished' : `stopped: ${String(e.data.error ?? '')}`
          return (
            <div key={e.id} className="flex items-center gap-2.5 px-3 py-2 text-[12.5px]">
              {a ? <AgentMark provider={a.provider} model={a.model} size={20} /> : <Sparkles className="size-4 text-accent-brand" />}
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{a?.name ?? 'Hive'}</span> <span className="text-text-secondary">{text}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
