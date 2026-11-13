/* ────────────────────────────────────────────────────────────────────────
   Work map — which model is working on which part of the code, live.
   Every file the team touched, grouped by folder. Each file shows the agents
   on it (solid = edited, outline = read); the file an agent is on right now
   pulses. Files edited by more than one agent are flagged, so overlaps are
   seen before they turn into conflicts. Below: one lane per agent with the
   files it owns.
   ──────────────────────────────────────────────────────────────────────── */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye, FileCode2, FolderOpen, GitMerge, Pencil, Search, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentAvatar, AgentMark, RoleTag, agentActivity } from './agents'
import { useHive } from './store'
import type { AgentRow, HiveEvent } from './types'
import { Tooltip } from '@/components/ui'

const EASE = [0.2, 0.8, 0.2, 1] as const
const READS = new Set(['read_file', 'list_files', 'search', 'repo_read', 'Read', 'Glob', 'Grep', 'LS'])
const EDITS = new Set(['edit_file', 'write_file', 'create_file', 'delete_file', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'apply_patch'])

export function agentHue(a: Pick<AgentRow, 'name'>): string {
  let h = 0
  for (const c of a.name) h = (h * 33 + c.charCodeAt(0)) % 360
  return `oklch(70% 0.14 ${h})`
}

function pathOf(e: HiveEvent): string | null {
  const i = (e.data.input ?? {}) as Record<string, unknown>
  const p = i.path ?? i.file_path ?? i.filePath ?? i.notebook_path ?? (typeof i.glob === 'string' ? i.glob : null)
  if (typeof p !== 'string' || !p.trim()) return null
  return p.replace(/^\.?\/+/, '').replace(/\/+$/, '') || '.'
}

type Touch = { agentId: string; reads: number; edits: number; last: number }
type FileRow = { path: string; dir: string; name: string; touches: Map<string, Touch>; last: number }

export function WorkMap({ agents, events, onFocus }: { agents: AgentRow[]; events: HiveEvent[]; onFocus: (id: string) => void }) {
  const { live } = useHive()
  const [mode, setMode] = useState<'all' | 'edits' | 'overlaps'>('all')
  const byId = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents])

  const { files, current } = useMemo(() => {
    const files = new Map<string, FileRow>()
    const current = new Map<string, string>() // agentId → path it touched last
    for (const e of events) {
      if (e.kind !== 'tool_call' || !e.agent_id) continue
      const name = String(e.data.name ?? '')
      const edit = EDITS.has(name)
      if (!edit && !READS.has(name)) continue
      const p = pathOf(e)
      if (!p) continue
      const i = p.lastIndexOf('/')
      let f = files.get(p)
      if (!f) files.set(p, (f = { path: p, dir: i < 0 ? '.' : p.slice(0, i), name: i < 0 ? p : p.slice(i + 1), touches: new Map(), last: 0 }))
      let t = f.touches.get(e.agent_id)
      if (!t) f.touches.set(e.agent_id, (t = { agentId: e.agent_id, reads: 0, edits: 0, last: 0 }))
      if (edit) t.edits++
      else t.reads++
      t.last = e.created_at
      f.last = Math.max(f.last, e.created_at)
      current.set(e.agent_id, p)
    }
    return { files, current }
  }, [events])

  const running = new Set(agents.filter((a) => a.status === 'running').map((a) => a.id))
  const list = [...files.values()].filter((f) => {
    const editors = [...f.touches.values()].filter((t) => t.edits > 0).length
    if (mode === 'edits') return editors > 0
    if (mode === 'overlaps') return editors > 1
    return true
  })
  const dirs = new Map<string, FileRow[]>()
  for (const f of list.sort((a, b) => a.path.localeCompare(b.path))) (dirs.get(f.dir) ?? dirs.set(f.dir, []).get(f.dir)!).push(f)
  const edited = [...files.values()].filter((f) => [...f.touches.values()].some((t) => t.edits > 0)).length
  const overlaps = [...files.values()].filter((f) => [...f.touches.values()].filter((t) => t.edits > 0).length > 1).length

  if (!files.size)
    return (
      <div className="grid place-items-center gap-2 px-6 py-16 text-center">
        <FolderOpen className="size-7 text-text-muted" />
        <div className="text-[14px] font-medium">No files touched yet</div>
        <p className="max-w-sm text-[12.5px] text-text-muted">As agents read and edit code, each file appears here with the model working on it — so you can see who's on which part.</p>
      </div>
    )

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Summary + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Stat icon={FileCode2} label="files touched" value={files.size} />
        <Stat icon={Pencil} label="edited" value={edited} />
        <Stat icon={GitMerge} label="edited by 2+ agents" value={overlaps} warn={overlaps > 0} />
        <div className="ml-auto flex rounded-full bg-text-primary/[0.06] p-0.5 text-[11.5px]">
          {(
            [
              ['all', 'Everything'],
              ['edits', 'Edits'],
              ['overlaps', 'Overlaps'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMode(k)} className={cn('h-6 rounded-full px-2.5', mode === k ? 'bg-bg-surface font-medium text-text-primary shadow-sm' : 'text-text-muted')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Lanes: who owns what */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((a, i) => {
          const mine = [...files.values()].filter((f) => f.touches.get(a.id)?.edits)
          const reads = [...files.values()].filter((f) => f.touches.get(a.id) && !f.touches.get(a.id)!.edits).length
          const act = agentActivity(a, events, live, {}, {})
          const now = current.get(a.id)
          return (
            <motion.button
              key={a.id}
              type="button"
              onClick={() => onFocus(a.id)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.22, ease: EASE } }}
              className={cn('hive-card hive-card-hover flex flex-col gap-2 p-3 text-left', a.status === 'running' && 'hive-working')}
              style={{ boxShadow: `inset 3px 0 0 ${agentHue(a)}` }}
            >
              <div className="flex items-center gap-2.5">
                <AgentAvatar provider={a.provider} model={a.model} state={act.state} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold">{a.name}</span>
                    <RoleTag a={a} />
                  </div>
                  <div className="truncate text-[11.5px] text-text-muted">{a.title || a.model}</div>
                </div>
                <span className="text-right text-[11px] tabular-nums text-text-muted">
                  {mine.length} edited
                  <br />
                  {reads} read
                </span>
              </div>
              {a.status === 'running' && now && (
                <div className="flex items-center gap-1.5 truncate rounded-lg bg-accent-brand/[0.08] px-2 py-1 text-[11.5px] text-accent-brand">
                  <span className="hive-dot-run size-1.5 shrink-0 rounded-full bg-accent-brand" />
                  <span className="truncate font-mono">{now}</span>
                </div>
              )}
              {mine.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {mine.slice(0, 5).map((f) => (
                    <span key={f.path} className="max-w-[160px] truncate rounded-md px-1.5 py-0.5 font-mono text-[10.5px]" style={{ background: `color-mix(in oklab, ${agentHue(a)} 16%, transparent)` }}>
                      {f.name}
                    </span>
                  ))}
                  {mine.length > 5 && <span className="text-[10.5px] text-text-muted">+{mine.length - 5}</span>}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* The map */}
      <div className="grid gap-3 lg:grid-cols-2">
        <AnimatePresence initial={false}>
          {[...dirs.entries()].map(([dir, rows], di) => (
            <motion.section key={dir} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(di, 8) * 0.03 } }} exit={{ opacity: 0 }} className="hive-card overflow-hidden">
              <div className="flex items-center gap-2 border-b hive-line px-3 py-2 text-[12px]">
                <FolderOpen className="size-3.5 text-text-muted" />
                <span className="truncate font-mono text-text-secondary">{dir === '.' ? 'repository root' : `${dir}/`}</span>
                <span className="ml-auto flex -space-x-1">
                  {[...new Set(rows.flatMap((f) => [...f.touches.keys()]))].slice(0, 6).map((id) => {
                    const a = byId.get(id)
                    return a ? <AgentMark key={id} provider={a.provider} model={a.model} size={18} className="ring-2 ring-bg-surface" /> : null
                  })}
                </span>
              </div>
              <ul className="divide-y divide-[var(--hive-line)]">
                {rows.map((f) => {
                  const touches = [...f.touches.values()].sort((x, y) => y.edits - x.edits || y.last - x.last)
                  const editors = touches.filter((t) => t.edits > 0)
                  const hot = touches.some((t) => running.has(t.agentId) && current.get(t.agentId) === f.path)
                  return (
                    <li key={f.path} className={cn('relative flex items-center gap-2.5 px-3 py-2', hot && 'bg-accent-brand/[0.05]')}>
                      {hot && <span className="absolute inset-y-0 left-0 w-0.5 animate-pulse bg-accent-brand" />}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className={cn('truncate font-mono text-[12px]', editors.length ? 'text-text-primary' : 'text-text-muted')}>{f.name}</span>
                          {editors.length > 1 && (
                            <Tooltip label={`${editors.length} agents edited this file — check the result fits together`}>
                              <TriangleAlert className="size-3.5 shrink-0 text-state-warning" />
                            </Tooltip>
                          )}
                        </span>
                        {/* Share of work on this file per agent */}
                        <span className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-text-primary/[0.05]">
                          {touches.map((t) => {
                            const a = byId.get(t.agentId)
                            const w = t.edits * 3 + t.reads
                            return a ? <span key={t.agentId} className="h-full" style={{ flexGrow: w, background: agentHue(a), opacity: t.edits ? 1 : 0.4 }} /> : null
                          })}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {touches.slice(0, 4).map((t) => {
                          const a = byId.get(t.agentId)
                          if (!a) return null
                          const isNow = running.has(t.agentId) && current.get(t.agentId) === f.path
                          return (
                            <Tooltip key={t.agentId} label={`${a.name} (${a.model}) · ${t.edits ? `${t.edits} edit${t.edits === 1 ? '' : 's'}` : ''}${t.edits && t.reads ? ', ' : ''}${t.reads ? `${t.reads} read${t.reads === 1 ? '' : 's'}` : ''}`}>
                              <button type="button" onClick={() => onFocus(a.id)} className={cn('relative grid size-6 place-items-center rounded-full', isNow && 'hive-dot-run')} style={{ boxShadow: `0 0 0 ${t.edits ? 2 : 1}px ${agentHue(a)}`, opacity: t.edits ? 1 : 0.7 }} aria-label={a.name}>
                                <AgentMark provider={a.provider} model={a.model} size={20} flat />
                                <span className="absolute -bottom-1 -right-1 grid size-3 place-items-center rounded-full bg-bg-surface">{t.edits ? <Pencil className="size-2" /> : <Eye className="size-2" />}</span>
                              </button>
                            </Tooltip>
                          )
                        })}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>
      {mode === 'overlaps' && !list.length && (
        <div className="flex items-center gap-2 text-[12.5px] text-state-success">
          <Search className="size-3.5" /> No file was edited by more than one agent.
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value, warn }: { icon: typeof FileCode2; label: string; value: number; warn?: boolean }) {
  return (
    <span className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px]', warn ? 'bg-state-warning/12 text-state-warning' : 'bg-text-primary/[0.05] text-text-secondary')}>
      <Icon className="size-3.5" />
      <b className="tabular-nums">{value}</b> {label}
    </span>
  )
}
