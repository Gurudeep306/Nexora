import { useEffect, useMemo, useState } from 'react'
import { useHiveSections } from '../HivePage'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUp, Bot, Check, ChevronDown, Cpu, FolderGit2, KeyRound, Loader2, MessageSquare, Radar, Server, ShieldAlert, Sparkles, Zap } from 'lucide-react'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { AgentChip, defaultSpec } from '../AgentPicker'
import { HiveLogo } from '../HiveLogo'
import { HealthStrip, LiveWall } from '../LiveWall'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import type { AgentSpec, MarketModel, Task } from '../types'
import { IconTile, StatusPill, fmtCost, fmtTokens, timeAgo } from '../ui'

type OverviewTask = Task & { project_name: string; project_color: string }

export default function HomePage() {
  const { boot, live, approvals, machines, answerApproval } = useHive()
  const navigate = useNavigate()
  const toast = useToast()
  const [tasks, setTasks] = useState<OverviewTask[]>([])
  const [today, setToday] = useState<{ tokens: number; requests: number; cost: number } | null>(null)
  const [market, setMarket] = useState<MarketModel[]>([])
  const [target, setTarget] = useState<string>('copilot')
  const [text, setText] = useState('')
  const [spec, setSpec] = useState<AgentSpec | null>(() => (boot ? defaultSpec(boot, undefined, undefined) : null))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    hiveApi
      .overview()
      .then((r) => {
        setTasks(r.tasks as OverviewTask[])
        setToday(r.today)
      })
      .catch(() => {})
    hiveApi
      .radar()
      .then((r) => setMarket(r.market.slice(0, 6)))
      .catch(() => {})
  }, [live.length])

  const hour = new Date().getHours()
  const hello = hour < 5 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const project = boot?.projects.find((p) => p.id === target) ?? null
  const setup = useMemo(
    () =>
      boot
        ? [
            { id: 'keys', done: boot.keys.length > 0, label: 'Add an AI key', to: '/hive/keys', icon: KeyRound },
            { id: 'github', done: boot.github.length > 0, label: 'Connect GitHub — every repo becomes available', to: '/hive/repos', icon: FolderGit2 },
            { id: 'project', done: boot.projects.length > 0, label: 'Open NexoraGuru as a project', to: '/hive/nexora', icon: Sparkles },
            { id: 'machine', done: machines.length > 0, label: 'Connect a machine (optional)', to: '/hive/machines', icon: Server },
          ]
        : [],
    [boot, machines.length],
  )
  if (!boot) return null
  const doneCount = setup.filter((s) => s.done).length

  const go = async () => {
    const body = text.trim()
    if (!body || busy) return
    if (target === 'copilot') {
      navigate('/hive/copilot', { state: { send: body } })
      return
    }
    if (target === 'chat') {
      navigate('/hive/chat', { state: { send: body, spec } })
      return
    }
    if (!project) return
    const s = defaultSpec(boot)
    if (!s) return toast.error('Add an AI key that can use tools first')
    setBusy(true)
    try {
      const r = await hiveApi.createTask(project.id, { prompt: body, mode: 'solo', agents: [spec && boot.catalogue.providers.find((p) => p.id === spec.provider)?.caps.tools ? spec : s], machineId: project.machine_id ?? null, folder: project.folder ?? null })
      navigate(`/hive/p/${project.id}/t/${r.task.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      <div className="hive-comb pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <div className="relative mx-auto w-full max-w-[1120px] px-4 pb-20 pt-10 sm:px-8">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
            <HiveLogo size={64} live={live.length > 0} />
          </motion.div>
          <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] sm:text-[38px]">
            {hello}, <span className="hive-gradient-text">{boot.me.username}</span>
          </h1>
          <p className="mt-1.5 text-[14.5px] text-text-muted">{live.length ? `${live.length} agent${live.length === 1 ? ' is' : 's are'} working right now.` : 'Ask anything, or put agents to work on a project.'}</p>
        </div>

        {/* Omni composer */}
        <div className="hive-composer hive-ring mx-auto mt-8 max-w-[760px] rounded-[24px] p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                go()
              }
            }}
            rows={2}
            autoFocus
            placeholder={target === 'copilot' ? 'What should we build today? Your Copilot plans it, picks the models and runs it…' : target === 'chat' ? 'Ask any model anything…' : `Tell the agents what to build in ${project?.name}…`}
            className="block w-full resize-none bg-transparent px-2 py-1.5 text-[16px] leading-relaxed outline-none placeholder:text-text-muted"
          />
          <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1">
            <Menu>
              <MenuTrigger asChild>
                <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-text-primary/[0.06] px-3 text-[12.5px] hover:bg-text-primary/[0.1]">
                  {project ? <span className="hive-hex size-3" style={{ background: projectColor(project.color) }} /> : target === 'copilot' ? <Bot className="size-3.5 text-accent-brand" /> : <MessageSquare className="size-3.5 text-accent-brand" />}
                  {project ? project.name : target === 'copilot' ? 'Copilot' : 'Chat'}
                  <ChevronDown className="size-3 text-text-muted" />
                </button>
              </MenuTrigger>
              <MenuContent align="start" className="w-64">
                <MenuItem onSelect={() => setTarget('copilot')}>
                  <Bot className="size-3.5" /> Copilot — it plans, delegates and reviews
                </MenuItem>
                <MenuItem onSelect={() => setTarget('chat')}>
                  <MessageSquare className="size-3.5" /> Chat — just talk to a model
                </MenuItem>
                {boot.projects.length > 0 && <MenuLabel>Start a session in…</MenuLabel>}
                {boot.projects.map((p) => (
                  <MenuItem key={p.id} onSelect={() => setTarget(p.id)}>
                    <span className="hive-hex size-3.5" style={{ background: projectColor(p.color) }} /> {p.name}
                  </MenuItem>
                ))}
                <MenuItem onSelect={() => navigate('/hive/repos')}>
                  <FolderGit2 className="size-3.5" /> Any repository on your GitHub…
                </MenuItem>
              </MenuContent>
            </Menu>
            {spec && target !== 'copilot' && <AgentChip boot={boot} spec={spec} onChange={setSpec} need={target === 'chat' ? 'chat' : 'tools'} />}
            <button type="button" onClick={go} disabled={!text.trim() || busy} className="ml-auto grid size-9 place-items-center rounded-full bg-accent-brand text-on-accent-brand transition-transform enabled:hover:scale-105 disabled:opacity-35" aria-label="Go">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" strokeWidth={2.4} />}
            </button>
          </div>
        </div>

        <Explore />

        {/* Setup */}
        {doneCount < setup.length && (
          <div className="hive-card mx-auto mt-8 max-w-[920px] p-5">
            <div className="flex items-center gap-3">
              <div className="relative size-10">
                <svg viewBox="0 0 36 36" className="size-10 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="color-mix(in oklab, var(--color-text-primary) 9%, transparent)" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-accent-brand)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={94.2} strokeDashoffset={94.2 * (1 - doneCount / setup.length)} />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold">
                  {doneCount}/{setup.length}
                </span>
              </div>
              <div>
                <div className="text-[14.5px] font-semibold">Set up your workspace</div>
                <div className="text-[12.5px] text-text-muted">A few minutes, once. Then build from anywhere.</div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {setup.map((s) => (
                <button key={s.id} type="button" onClick={() => navigate(s.to)} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors', s.done ? 'bg-state-success/[0.07]' : 'bg-text-primary/[0.04] hover:bg-text-primary/[0.07]')}>
                  <span className={cn('grid size-7 place-items-center rounded-full', s.done ? 'bg-state-success text-white' : 'bg-text-primary/[0.08] text-text-secondary')}>{s.done ? <Check className="size-3.5" /> : <s.icon className="size-3.5" />}</span>
                  <span className={cn('flex-1 text-[13px]', s.done && 'text-text-muted line-through')}>{s.label}</span>
                  {!s.done && <ArrowRight className="size-3.5 text-text-muted" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {/* Live */}
            <section>
              <SectionHead icon={<Zap className="size-3.5 text-accent-brand" />} title="Live now — who's working on what" />
              <div className="space-y-3">
                <HealthStrip />
                <LiveWall />
              </div>
            </section>
            {approvals.length > 0 && (
              <section>
                <SectionHead icon={<ShieldAlert className="size-3.5 text-state-warning" />} title="Waiting for you" />
                <div className="space-y-2">
                  {approvals.map((a) => (
                    <div key={a.id} className="hive-card flex items-center gap-3 p-3 ring-1 ring-state-warning/30">
                      <ShieldAlert className="size-4 shrink-0 text-state-warning" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px]">
                          <b>{a.agent}</b> wants to run on {a.machine}
                        </div>
                        <div className="truncate font-mono text-[12px] text-text-muted">$ {a.command}</div>
                      </div>
                      <button type="button" onClick={() => answerApproval(a.id, true)} className="h-7 rounded-md bg-state-success px-2.5 text-[12px] font-medium text-white">
                        Run
                      </button>
                      <button type="button" onClick={() => answerApproval(a.id, false)} className="h-7 rounded-md bg-text-primary/[0.07] px-2.5 text-[12px]">
                        Deny
                      </button>
                    </div>
                  ))}

                </div>
              </section>
            )}

            {/* Recent sessions */}
            <section>
              <SectionHead icon={<Cpu className="size-3.5 text-text-muted" />} title="Recent sessions" />
              <div className="hive-card divide-y divide-[var(--hive-line)] overflow-hidden">
                {tasks.slice(0, 10).map((t) => (
                  <button key={t.id} type="button" onClick={() => navigate(`/hive/p/${t.project_id}/t/${t.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-text-primary/[0.03]">
                    <span className="hive-hex size-3 shrink-0" style={{ background: projectColor(t.project_color) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px]">{t.title}</span>
                      <span className="block truncate text-[11.5px] text-text-muted">
                        {t.project_name} · {(t.agents ?? []).map((a) => a.name).join(', ')}
                      </span>
                    </span>
                    <StatusPill status={t.status} />
                    <span className="w-8 text-right text-[11px] text-text-muted">{timeAgo(t.updated_at)}</span>
                  </button>
                ))}
                {!tasks.length && <p className="p-5 text-[13px] text-text-muted">No sessions yet. Pick a project in the box above and describe the work.</p>}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section>
              <SectionHead icon={<Sparkles className="size-3.5 text-state-warning" />} title="Today" />
              <div className="grid grid-cols-3 gap-2">
                <Mini label="Tokens" value={fmtTokens(today?.tokens ?? 0)} />
                <Mini label="Calls" value={String(today?.requests ?? 0)} />
                <Mini label="Spend" value={fmtCost(today?.cost) ?? '$0'} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Mini label="Keys healthy" value={`${boot.keys.filter((k) => k.status === 'ok' && !k.disabled).length}/${boot.keys.length}`} onClick={() => navigate('/hive/keys')} />
                <Mini label="Machines online" value={`${machines.filter((m) => m.online).length}/${machines.length}`} onClick={() => navigate('/hive/machines')} />
              </div>
            </section>
            <section>
              <SectionHead icon={<Radar className="size-3.5 text-state-info" />} title="Fresh in the model market" action={<button type="button" onClick={() => navigate('/hive/models')} className="text-[12px] text-accent-brand hover:underline">All →</button>} />
              <div className="hive-card divide-y divide-[var(--hive-line)] overflow-hidden">
                {market.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="grid size-7 place-items-center rounded-lg bg-text-primary/[0.06] text-[10px] font-semibold uppercase">{m.lab.slice(0, 2)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px]">{m.name}</span>
                      <span className="block truncate text-[11px] text-text-muted">
                        {m.lab} · {m.context ? `${fmtTokens(m.context)} ctx` : ''} {m.input != null ? `· $${m.input.toFixed(2)}/M in` : ''}
                      </span>
                    </span>
                    <span className="text-[11px] text-text-muted">{timeAgo(m.created)}</span>
                  </div>
                ))}
                {!market.length && <p className="p-4 text-[12.5px] text-text-muted">Loading the latest releases…</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}


function SectionHead({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      {icon}
      <h2 className="text-[13px] font-semibold">{title}</h2>
      <span className="ml-auto">{action}</span>
    </div>
  )
}

function Mini({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <button type="button" disabled={!onClick} onClick={onClick} className="hive-card p-3 text-left enabled:hover:border-[var(--hive-line-strong)]">
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className="mt-0.5 text-[18px] font-semibold tabular-nums">{value}</div>
    </button>
  )
}

/** Every part of Hive, one click away — like "Explore NexoraGuru" on the site's hub. */
function Explore() {
  const groups = useHiveSections()
  const navigate = useNavigate()
  const [tab, setTab] = useState('All')
  const items = groups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.title })))
  const shown = tab === 'All' ? items : items.filter((it) => it.group === tab)
  return (
    <section className="mx-auto mt-10 max-w-[1120px]">
      <div className="mb-3 flex flex-wrap items-end gap-x-3 gap-y-2">
        <h2 className="text-[20px] font-semibold tracking-[-0.015em]">Explore Hive</h2>
        <span className="text-[13px] text-text-muted">Every part of Hive, one click away.</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {['All', ...groups.map((g) => g.title)].map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors', tab === t ? 'border-accent-brand/50 bg-accent-brand/12 text-text-primary' : 'border-border text-text-secondary hover:text-text-primary')}>
              {t}
              <span className="text-[10.5px] text-text-muted">{t === 'All' ? items.length : groups.find((g) => g.title === t)?.items.length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((it) => (
          <button key={it.group + it.label} type="button" onClick={() => navigate(it.to)} className="hive-card hive-card-hover flex items-start gap-3 p-3.5 text-left">
            <IconTile hue={it.hue}>
              <it.icon />
            </IconTile>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-[14px] font-semibold text-text-primary">
                {it.label}
                {it.badge ? <span className="rounded-full bg-state-warning px-1.5 text-[10px] font-bold text-white">{it.badge}</span> : null}
              </span>
              {it.hint && <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-text-muted">{((h) => h.charAt(0).toUpperCase() + h.slice(1))(it.hint.replace(/^⌘[^·]*·\s*/, ''))}</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
