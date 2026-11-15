/* ────────────────────────────────────────────────────────────────────────
   Live wall — every agent working right now, across all projects, grouped
   by project and session: who (model), on what (session + current file),
   doing what (plain words). Plus a health strip: how many agents are ready,
   cooling down or down. The first thing you see in Mission control.
   ──────────────────────────────────────────────────────────────────────── */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CircleCheck, CircleOff, HeartPulse, Snowflake, Workflow } from 'lucide-react'
import { AgentAvatar, type AgentState } from './agents'
import { hiveApi } from './api'
import { projectColor } from './projectColor'
import { useHive } from './store'
import type { HealthKey, LiveAgent } from './types'
import { vendorName } from './ui'

const EASE = [0.2, 0.8, 0.2, 1] as const

function stateOf(doing: string): AgentState {
  const d = doing.toLowerCase()
  if (!d) return 'thinking'
  if (/read|open|look|search|find|list/.test(d)) return 'reading'
  if (/edit|writ|creat|chang|fix|add/.test(d)) return 'editing'
  if (/run|test|build|install|command/.test(d)) return 'running'
  if (/review|check/.test(d)) return 'reviewing'
  if (/wait|approv/.test(d)) return 'waiting'
  return 'thinking'
}

export function HealthStrip() {
  const { on } = useHive()
  const [keys, setKeys] = useState<HealthKey[] | null>(null)
  useEffect(() => {
    const load = () => hiveApi.health().then((r) => setKeys(r.keys)).catch(() => {})
    load()
    return on('health', load)
  }, [on])
  if (!keys?.length) return null
  const ready = keys.filter((k) => k.state === 'healthy' || k.state === 'flaky' || k.state === 'unknown').length
  const cooling = keys.filter((k) => k.state === 'cooling').length
  const down = keys.filter((k) => k.state === 'down').length
  return (
    <Link to="/hive/models/health" className="hive-card hive-card-hover flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
      <HeartPulse className="size-4 text-state-success" />
      <span className="font-medium">Agents</span>
      <span className="inline-flex items-center gap-1 text-state-success">
        <CircleCheck className="size-3.5" /> {ready} ready
      </span>
      {cooling > 0 && (
        <span className="inline-flex items-center gap-1" style={{ color: 'oklch(70% 0.12 230)' }}>
          <Snowflake className="size-3.5" /> {cooling} cooling down
        </span>
      )}
      {down > 0 && (
        <span className="inline-flex items-center gap-1 text-state-error">
          <CircleOff className="size-3.5" /> {down} down
        </span>
      )}
      <span className="ml-auto hidden text-text-muted sm:inline">failing agents are routed around automatically</span>
      <ArrowRight className="size-3.5 text-text-muted" />
    </Link>
  )
}

export function LiveWall() {
  const { live, boot } = useHive()
  const navigate = useNavigate()
  if (!live.length)
    return (
      <div className="hive-card relative overflow-hidden p-5">
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex -space-x-2">
            {['anthropic', 'openai', 'gemini', 'deepseek', 'qwen'].map((p, i) => (
              <motion.span key={p} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }}>
                <AgentAvatar provider={p} state="queued" size={34} />
              </motion.span>
            ))}
          </div>
          <div className="min-w-[200px] flex-1">
            <div className="text-[14px] font-semibold">Your team is resting</div>
            <div className="text-[12.5px] text-text-muted">Give the Dispatcher a goal: it splits the work and puts the cheapest capable model on each part.</div>
          </div>
          <Link to="/hive/copilot?mode=team" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-brand px-3.5 text-[13px] font-medium text-on-accent-brand shadow-sm hover:opacity-90">
            <Workflow className="size-4" /> Dispatch a team
          </Link>
        </div>
      </div>
    )
  // Group by session.
  const groups = new Map<string, LiveAgent[]>()
  for (const a of live) (groups.get(a.taskId) ?? groups.set(a.taskId, []).get(a.taskId)!).push(a)
  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {[...groups.entries()].map(([taskId, agents]) => {
          const p = boot?.projects.find((x) => x.id === agents[0].projectId)
          return (
            <motion.section key={taskId} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.24, ease: EASE }} className="hive-card overflow-hidden">
              <button type="button" onClick={() => navigate(`/hive/p/${agents[0].projectId}/t/${taskId}`)} className="flex w-full items-center gap-2 border-b hive-line px-4 py-2.5 text-left hover:bg-text-primary/[0.03]">
                {p && <span className="rounded-full size-2.5" style={{ background: projectColor(p.color) }} />}
                <span className="text-[11.5px] text-text-muted">{p?.name}</span>
                <span className="truncate text-[13px] font-semibold">{agents[0].taskTitle}</span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent-brand/10 px-2 py-0.5 text-[11px] font-medium text-accent-brand">
                  <span className="hive-dot-run size-1.5 rounded-full bg-accent-brand" /> {agents.length} working
                </span>
                <ArrowRight className="size-3.5 text-text-muted" />
              </button>
              <div className="grid gap-px bg-[var(--hive-line)] sm:grid-cols-2">
                {agents.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.05 } }} className="flex items-center gap-3 bg-bg-surface p-3">
                    <AgentAvatar provider={a.provider} model={a.model} state={stateOf(a.doing)} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[12.5px]">
                        <b className="truncate">{a.name}</b>
                        <span className="truncate text-text-muted">{vendorName(a.provider)}</span>
                      </div>
                      <div className="hive-thinking-text truncate text-[12px] text-accent-brand">{a.doing || 'Thinking…'}</div>
                      {a.files?.length > 0 && (
                        <div className="mt-1 flex gap-1 overflow-hidden">
                          {a.files.slice(-3).map((f) => (
                            <span key={f} className="max-w-[140px] truncate rounded-md bg-text-primary/[0.05] px-1.5 font-mono text-[10.5px] text-text-muted">
                              {f.split('/').pop()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
