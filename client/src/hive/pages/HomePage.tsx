import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bot, Check, ChevronDown, FolderGit2, KeyRound, Server, ShieldAlert, Sparkles } from 'lucide-react'
import { Button, Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { AgentChip, defaultSpec } from '../AgentPicker'
import { HiveLogo } from '../HiveLogo'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import type { AgentSpec, Task } from '../types'
import { fmtCost, fmtTokens, timeAgo, vendorName } from '../ui'
import { Composer, Row, RowList, SegmentedControl, StatusPill, type Intent } from '../kit'
import { setFocusProject } from '../Showcase'

type OverviewTask = Task & { project_name: string; project_color: string }

export default function HomePage() {
  const { boot, live, approvals, machines, answerApproval } = useHive()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<OverviewTask[]>([])
  const [today, setToday] = useState<{ tokens: number; requests: number; cost: number } | null>(null)
  // The project in focus ("" = any), shared with the top bar and the Copilot.
  const [target, setTarget] = useState<string>(() => {
    try {
      return localStorage.getItem('hive:lastProject') ?? ''
    } catch {
      return ''
    }
  })
  const [intent, setIntent] = useState<Intent>('do')
  const [strategy, setStrategy] = useState<'savings' | 'fast' | 'balanced' | 'quality'>('balanced')
  const [freeOnly, setFreeOnly] = useState(false)
  const [quick, setQuick] = useState(false)
  const [text, setText] = useState('')
  const [spec, setSpec] = useState<AgentSpec | null>(() => (boot ? defaultSpec(boot, undefined, undefined) : null))
  const busy = false

  useEffect(() => {
    hiveApi
      .overview()
      .then((r) => {
        setTasks(r.tasks as OverviewTask[])
        setToday(r.today)
      })
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
            { id: 'github', done: boot.github.length > 0, label: 'Connect GitHub — every repo becomes available', to: '/hive/projects', icon: FolderGit2 },
            { id: 'project', done: boot.projects.length > 0, label: 'Open NexoraGuru as a project', to: '/hive/projects/guide', icon: Sparkles },
            { id: 'machine', done: machines.length > 0, label: 'Connect a machine (optional)', to: '/hive/machines', icon: Server },
          ]
        : [],
    [boot, machines.length],
  )
  if (!boot) return null
  const doneCount = setup.filter((s) => s.done).length

  const DAY = 24 * 3600 * 1000
  const fresh = (t: OverviewTask) => Date.now() - t.updated_at < DAY
  const review = tasks.filter((t) => t.status === 'review').slice(0, 5)
  const failed = tasks.filter((t) => t.status === 'failed' && fresh(t)).slice(0, 3)
  const limited = boot.keys.filter((k) => !k.disabled && k.limitUntil && k.limitUntil > Date.now())
  const needs = [...approvals, ...review, ...failed, ...limited]
  const running = tasks.filter((t) => t.status === 'running' || t.status === 'queued')
  const recent = tasks.filter((t) => !['running', 'queued', 'review'].includes(t.status) && !failed.includes(t)).slice(0, 8)

  const go = () => {
    const body = text.trim()
    if (!body || busy) return
    if (target) setFocusProject(target)
    if (intent === 'ask') navigate('/hive/chat', { state: { send: body, spec } })
    else if (intent === 'team') navigate('/hive/copilot?mode=team', { state: { draft: body, preference: strategy, freeOnly, projectId: target || undefined } })
    else navigate('/hive/copilot', { state: { send: body, quick, projectId: target || undefined } })
  }

  return (
    <div className="relative">
      <div className="relative mx-auto w-full max-w-[1120px] px-4 pb-20 pt-10 sm:px-8">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
            <HiveLogo size={48} live={live.length > 0} />
          </motion.div>
          <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.02em] text-[var(--hv-text-1)] sm:text-[30px]">
            {hello}, {boot.me.username}
          </h1>
          <p className="mt-1.5 text-[14.5px] text-text-muted">{live.length ? `${live.length} agent${live.length === 1 ? ' is' : 's are'} working right now.` : 'Ask anything, or put agents to work on a project.'}</p>
        </div>

        {/* One composer, three intents */}
        <div className="mx-auto mt-8 max-w-[760px]">
          <Composer
            value={text}
            onChange={setText}
            onSubmit={go}
            busy={busy}
            intent={intent}
            onIntent={setIntent}
            autoFocus
            label="What should we build today?"
            placeholder={intent === 'ask' ? 'Ask any model anything…' : intent === 'team' ? 'Describe the work — Hive splits it and picks a model for each part…' : 'What should we build today? Your Copilot plans it, picks the models and runs it…'}
            chips={
              <>
                <Menu>
                  <MenuTrigger asChild>
                    <button type="button" className="inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded-full bg-[var(--hv-surface-2)] px-2.5 text-[12px] text-[var(--hv-text-2)] hover:text-[var(--hv-text-1)]">
                      {project ? <span className="hive-hex size-2.5 shrink-0" style={{ background: projectColor(project.color) }} /> : <FolderGit2 className="size-3.5" />}
                      <span className="truncate">{project ? project.name : 'Any project'}</span>
                      <ChevronDown className="size-3 text-[var(--hv-text-3)]" />
                    </button>
                  </MenuTrigger>
                  <MenuContent align="start" className="w-64">
                    <MenuItem onSelect={() => setTarget('')}>
                      <Bot className="size-3.5" /> Any project — I’ll say which
                    </MenuItem>
                    {boot.projects.length > 0 && <MenuLabel>Projects</MenuLabel>}
                    {boot.projects.map((p) => (
                      <MenuItem key={p.id} onSelect={() => setTarget(p.id)}>
                        <span className="hive-hex size-3.5" style={{ background: projectColor(p.color) }} /> {p.name}
                      </MenuItem>
                    ))}
                    <MenuItem onSelect={() => navigate('/hive/projects')}>
                      <FolderGit2 className="size-3.5" /> Any repository on your GitHub…
                    </MenuItem>
                  </MenuContent>
                </Menu>
                {spec && intent === 'ask' && <AgentChip boot={boot} spec={spec} onChange={setSpec} need="chat" />}
              </>
            }
            options={
              intent === 'team' ? (
                <>
                  <SegmentedControl
                    size="sm"
                    label="Cost strategy"
                    value={strategy}
                    onChange={setStrategy}
                    options={[
                      { value: 'savings', label: 'Fewest tokens' },
                      { value: 'fast', label: 'Fastest' },
                      { value: 'balanced', label: 'Balanced' },
                      { value: 'quality', label: 'Best quality' },
                    ]}
                  />
                  <label className="inline-flex items-center gap-1.5 text-[12px] text-[var(--hv-text-2)]">
                    <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} className="size-3.5 accent-[var(--hv-accent)]" /> Free models only
                  </label>
                </>
              ) : intent === 'do' ? (
                <label className="inline-flex items-center gap-1.5 text-[12px] text-[var(--hv-text-2)]">
                  <input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} className="size-3.5 accent-[var(--hv-accent)]" /> Quick answer (a fast model instead of your Claude plan)
                </label>
              ) : (
                <span className="text-[12px] text-[var(--hv-text-3)]">Pick the model with the chip above, or leave it on Auto.</span>
              )
            }
          />
        </div>

        {/* Setup — only until it is done */}
        {doneCount < setup.length && (
          <section className="mx-auto mt-8 max-w-[760px] rounded-[var(--hv-r-card)] border border-[var(--hv-border)] bg-[var(--hv-surface-1)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-semibold text-[var(--hv-text-1)]">Set up your workspace</h2>
              <span className="hv-num text-[12px] text-[var(--hv-text-3)]">
                {doneCount} of {setup.length} done
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--hv-surface-2)]">
              <div className="h-full rounded-full bg-[var(--hv-accent)] transition-[width]" style={{ width: `${(doneCount / setup.length) * 100}%` }} />
            </div>
            <RowList label="Setup steps" className="mt-2">
              {setup.map((s) => (
                <Row key={s.id} leading={s.done ? <Check className="text-[var(--hv-success)]" /> : <s.icon />} title={<span className={cn(s.done && 'text-[var(--hv-text-3)] line-through')}>{s.label}</span>} trailing={!s.done && <ArrowRight className="size-3.5" />} onOpen={() => navigate(s.to)} />
              ))}
            </RowList>
          </section>
        )}

        <div className="mx-auto mt-10 max-w-[760px] space-y-8">
          {/* Needs you: approvals, finished work to review, failures, limits */}
          {needs.length > 0 && (
            <Block title="Needs you" count={needs.length}>
              <RowList label="Needs you">
                {approvals.map((a) => (
                  <Row
                    key={a.id}
                    leading={<ShieldAlert className="text-[var(--hv-warning)]" />}
                    title={
                      <>
                        <b className="font-medium">{a.agent}</b> wants to run a command on {a.machine}
                      </>
                    }
                    meta={<span className="font-mono">$ {a.command}</span>}
                    onOpen={() => navigate('/hive/machines')}
                    actions={
                      <>
                        <Button size="sm" variant="primary" onClick={() => answerApproval(a.id, true)}>
                          Run
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => answerApproval(a.id, false)}>
                          Deny
                        </Button>
                      </>
                    }
                    className="[&_.hv-row-actions]:opacity-100"
                  />
                ))}
                {review.map((t) => (
                  <Row key={t.id} leading={<Dot color={t.project_color} />} title={t.title} meta={`${t.project_name} · finished ${timeAgo(t.updated_at)} — check it and ship`} trailing={<StatusPill size="sm" status="review" />} onOpen={() => navigate(`/hive/p/${t.project_id}/t/${t.id}`)} />
                ))}
                {failed.map((t) => (
                  <Row key={t.id} leading={<Dot color={t.project_color} />} title={t.title} meta={`${t.project_name} · stopped with an error · ${timeAgo(t.updated_at)}`} trailing={<StatusPill size="sm" status="failed" />} onOpen={() => navigate(`/hive/p/${t.project_id}/t/${t.id}`)} />
                ))}
                {limited.map((k) => (
                  <Row key={k.id} leading={<KeyRound />} title={`${k.label || vendorName(k.provider)} reached its limit`} meta={k.limitNote || 'Other models take over until it frees up.'} trailing={<StatusPill size="sm" status="limited" label={`free in ${untilText(k.limitUntil!)}`} />} onOpen={() => navigate('/hive/keys')} />
                ))}
              </RowList>
            </Block>
          )}

          {/* Running */}
          <Block title="Running" count={running.length || undefined} action={live.length > 0 ? <LinkBtn onClick={() => navigate('/hive/machines')}>{live.length} agent{live.length === 1 ? '' : 's'} live</LinkBtn> : undefined}>
            {running.length ? (
              <RowList label="Running">
                {running.map((t) => (
                  <Row key={t.id} leading={<Dot color={t.project_color} />} title={t.title} meta={`${t.project_name} · ${(t.agents ?? []).map((a) => a.name).join(', ') || 'starting'}`} trailing={<><StatusPill size="sm" status={t.status} /><span className="w-10 text-right text-[var(--hv-text-3)]">{timeAgo(t.updated_at)}</span></>} onOpen={() => navigate(`/hive/p/${t.project_id}/t/${t.id}`)} />
                ))}
              </RowList>
            ) : (
              <p className="px-2.5 text-[13px] text-[var(--hv-text-3)]">Nothing is running. Describe some work above and the Copilot will start it.</p>
            )}
          </Block>

          {/* Recent */}
          <Block title="Recent" action={<LinkBtn onClick={() => navigate('/hive/projects')}>All projects</LinkBtn>}>
            {recent.length ? (
              <RowList label="Recent work">
                {recent.map((t) => (
                  <Row key={t.id} leading={<Dot color={t.project_color} />} title={t.title} meta={t.project_name} trailing={<><StatusPill size="sm" status={t.status} /><span className="w-10 text-right text-[var(--hv-text-3)]">{timeAgo(t.updated_at)}</span></>} onOpen={() => navigate(`/hive/p/${t.project_id}/t/${t.id}`)} />
                ))}
              </RowList>
            ) : (
              <p className="px-2.5 text-[13px] text-[var(--hv-text-3)]">Finished work shows up here.</p>
            )}
          </Block>

          {/* Today, in one quiet line */}
          <p className="hv-num flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--hv-border-subtle)] px-2.5 pt-4 text-[12px] text-[var(--hv-text-3)]">
            <span>Today</span>
            <span>{fmtTokens(today?.tokens ?? 0)} tokens</span>
            <span>{today?.requests ?? 0} call{today?.requests === 1 ? '' : 's'}</span>
            <button type="button" onClick={() => navigate('/hive/spend')} className="hover:text-[var(--hv-text-1)]">
              {fmtCost(today?.cost) ?? '$0'} spent
            </button>
            <button type="button" onClick={() => navigate('/hive/keys')} className="hover:text-[var(--hv-text-1)]">
              {boot.keys.filter((k) => k.status === 'ok' && !k.disabled).length}/{boot.keys.length} keys healthy
            </button>
            <button type="button" onClick={() => navigate('/hive/machines')} className="hover:text-[var(--hv-text-1)]">
              {machines.filter((m) => m.online).length}/{machines.length} machines online
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

/** A Home section: a plain heading, an optional count and a quiet link. */
function Block({ title, count, action, children }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-1.5 flex items-center gap-2 px-2.5">
        <h2 className="text-[13px] font-semibold text-[var(--hv-text-1)]">{title}</h2>
        {count != null && <span className="hv-num rounded-full bg-[var(--hv-surface-2)] px-1.5 text-[11px] text-[var(--hv-text-2)]">{count}</span>}
        <span className="ml-auto">{action}</span>
      </div>
      {children}
    </section>
  )
}

function LinkBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-[12px] text-[var(--hv-text-2)] hover:text-[var(--hv-text-1)]">
      {children} <ArrowRight className="size-3" />
    </button>
  )
}

function Dot({ color }: { color: string }) {
  return <span className="size-2.5 rounded-full" style={{ background: projectColor(color) }} aria-hidden />
}

function untilText(ms: number) {
  const m = Math.max(1, Math.round((ms - Date.now()) / 60000))
  return m < 60 ? `${m}m` : `${Math.round(m / 60)}h`
}
