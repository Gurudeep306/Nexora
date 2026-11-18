import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, FolderGit2, KeyRound, Server, Sparkles } from 'lucide-react'
import { CopilotMark as Bot } from '../marks'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'
import { AgentChip, defaultSpec } from '../AgentPicker'
import { AgentMark } from '../agents'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import type { AgentSpec } from '../types'
import { fmtCost, fmtTokens, timeAgo } from '../ui'
import { Composer, Row, RowList, SegmentedControl, StatusPill, type Intent } from '../kit'
import { setFocusProject } from '../Showcase'
import { Dot, NeedsList, useNeeds, useOverview } from '../Inbox'

export default function HomePage() {
  const { boot, live, machines, approvals } = useHive()
  const navigate = useNavigate()
  const { tasks, today } = useOverview()
  const needs = useNeeds(tasks)
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

  const running = tasks.filter((t) => t.status === 'running' || t.status === 'queued')
  const recent = tasks.filter((t) => !['running', 'queued', 'review'].includes(t.status) && !needs.failed.includes(t)).slice(0, 8)

  const go = () => {
    const body = text.trim()
    if (!body || busy) return
    if (target) setFocusProject(target)
    if (intent === 'ask') navigate('/hive/chat', { state: { send: body, spec } })
    else if (intent === 'team') navigate('/hive/copilot?mode=team', { state: { draft: body, preference: strategy, freeOnly, projectId: target || undefined } })
    else navigate('/hive/copilot', { state: { send: body, quick, projectId: target || undefined } })
  }

  const onlineMachines = machines.filter((m) => m.online).length
  const healthyKeys = boot.keys.filter((k) => k.status === 'ok' && !k.disabled).length
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const lead = live.length
    ? `${live.length} agent${live.length === 1 ? ' is' : 's are'} working right now${approvals.length ? `, and ${approvals.length} command${approvals.length === 1 ? ' waits' : 's wait'} for you.` : '.'}`
    : needs.count
      ? `Nothing is running. ${needs.count} thing${needs.count === 1 ? ' needs' : 's need'} you below.`
      : 'Nothing is running. Ask anything, or put agents to work on a project.'

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
      {/* Masthead: the date, a greeting in the display face, one true line. */}
      <header className="border-b border-[var(--hv-border)] pb-6">
        <div className="hv-eyebrow">
          {dateLine} · Hive
        </div>
        <h1 className="hv-title mt-3">
          {hello}, {boot.me.username}
          <span className="text-[var(--hv-accent)]" aria-hidden="true">
            .
          </span>
        </h1>
        <p className="hv-lead mt-2 mb-0">{lead}</p>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-14">
        <div className="min-w-0 space-y-10">
          {/* One composer, three intents */}
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
                    <button type="button" className="inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded-[var(--hv-r-btn)] px-2.5 text-[12px] text-[var(--hv-text-2)] ring-1 ring-inset ring-[var(--hv-border)] hover:text-[var(--hv-text-1)] hover:ring-[var(--hv-border-strong)]">
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
                        <span className="hive-hex size-3" style={{ background: projectColor(p.color) }} /> {p.name}
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

          {/* Setup — only until it is done */}
          {doneCount < setup.length && (
            <Block title="Set up your workspace" count={undefined} action={<span className="hv-num text-[12px] text-[var(--hv-text-3)]">{doneCount} of {setup.length} done</span>}>
              <ol className="hv-ledger m-0 list-none border-y border-[var(--hv-border)] p-0">
                {setup.map((st, i) => (
                  <li key={st.id}>
                    <button type="button" onClick={() => navigate(st.to)} className="group flex w-full items-center gap-4 py-3 text-left">
                      <span className="hv-serif w-7 shrink-0 text-[17px] italic text-[var(--hv-text-3)]">{['i', 'ii', 'iii', 'iv'][i]}</span>
                      <span className={cn('min-w-0 flex-1 text-[13.5px]', st.done ? 'text-[var(--hv-text-3)] line-through' : 'text-[var(--hv-text-1)]')}>{st.label}</span>
                      {st.done ? <Check className="size-4 text-[var(--hv-success)]" aria-label="Done" /> : <ArrowRight className="size-3.5 text-[var(--hv-text-3)] transition-transform group-hover:translate-x-0.5" />}
                    </button>
                  </li>
                ))}
              </ol>
            </Block>
          )}

          {/* Needs you: approvals, finished work to review, failures, limits */}
          {needs.count > 0 && (
            <Block title="Needs you" count={needs.count}>
              <NeedsList needs={needs} />
            </Block>
          )}

          {/* Running */}
          <Block title="Running" count={running.length || undefined}>
            {running.length ? (
              <RowList label="Running">
                {running.map((t) => (
                  <Row key={t.id} leading={<Dot color={t.project_color} />} title={t.title} meta={`${t.project_name} · ${(t.agents ?? []).map((a) => a.name).join(', ') || 'starting'}`} trailing={<><StatusPill size="sm" status={t.status} /><span className="hv-num w-10 text-right text-[var(--hv-text-3)]">{timeAgo(t.updated_at)}</span></>} onOpen={() => navigate(`/hive/p/${t.project_id}/t/${t.id}`)} />
                ))}
              </RowList>
            ) : (
              <Quiet>Nothing is running. Describe some work above and the Copilot will start it.</Quiet>
            )}
          </Block>

          {/* Recent */}
          <Block title="Recent" action={<LinkBtn onClick={() => navigate('/hive/projects')}>All projects</LinkBtn>}>
            {recent.length ? (
              <RowList label="Recent work">
                {recent.map((t) => (
                  <Row key={t.id} leading={<Dot color={t.project_color} />} title={t.title} meta={t.project_name} trailing={<><StatusPill size="sm" status={t.status} /><span className="hv-num w-10 text-right text-[var(--hv-text-3)]">{timeAgo(t.updated_at)}</span></>} onOpen={() => navigate(`/hive/p/${t.project_id}/t/${t.id}`)} />
                ))}
              </RowList>
            ) : (
              <Quiet>Finished work shows up here.</Quiet>
            )}
          </Block>
        </div>

        {/* The side column: who is working on what, and today in figures. */}
        <aside className="min-w-0 space-y-10" aria-label="At a glance">
          <Block title="At work now" count={live.length || undefined} action={live.length > 0 ? <LinkBtn onClick={() => navigate('/hive/machines')}>Machines</LinkBtn> : undefined}>
            {live.length ? (
              <ul className="hv-ledger m-0 list-none border-y border-[var(--hv-border)] p-0">
                {live.slice(0, 6).map((a) => {
                  const p = boot.projects.find((x) => x.id === a.projectId)
                  return (
                    <li key={a.id}>
                      <button type="button" onClick={() => navigate(`/hive/p/${a.projectId}/t/${a.taskId}`)} className="flex w-full items-start gap-3 py-3 text-left">
                        <AgentMark provider={a.provider} model={a.model} size={26} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-medium text-[var(--hv-text-1)]">{a.name}</span>
                            <span className="hive-dot-run size-1.5 shrink-0 rounded-full bg-[var(--hv-accent)]" aria-hidden="true" />
                          </span>
                          <span className="hv-mono block truncate text-[11px] text-[var(--hv-text-3)]">{a.model}</span>
                          <span className="mt-1 block truncate text-[12px] text-[var(--hv-text-2)]">{a.doing || a.taskTitle}</span>
                          {p && <span className="mt-0.5 block truncate text-[11.5px] text-[var(--hv-text-3)]">{p.name}</span>}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Quiet>No agent is working. When one starts, you’ll see its model and what it is doing here.</Quiet>
            )}
          </Block>

          <Block title="Today">
            <dl className="m-0 grid grid-cols-2 border-t border-[var(--hv-text-1)]">
              <Figure label="Tokens" value={fmtTokens(today?.tokens ?? 0)} />
              <Figure label="Calls" value={String(today?.requests ?? 0)} />
              <Figure label="Spent" value={fmtCost(today?.cost) ?? '$0'} to="/hive/spend" />
              <Figure label="Keys healthy" value={`${healthyKeys}/${boot.keys.length}`} to="/hive/keys" />
              <Figure label="Machines online" value={`${onlineMachines}/${machines.length}`} to="/hive/machines" />
              <Figure label="Projects" value={String(boot.projects.length)} to="/hive/projects" />
            </dl>
          </Block>
        </aside>
      </div>
    </div>
  )
}

/** A figure in the "Today" ledger: a small capital label over a display-face number. */
function Figure({ label, value, to }: { label: string; value: string; to?: string }) {
  const navigate = useNavigate()
  const body = (
    <>
      <dt className="hv-eyebrow">{label}</dt>
      <dd className="hv-figure m-0 mt-2 text-[26px]">{value}</dd>
    </>
  )
  const cls = 'block border-b border-[var(--hv-border)] py-3 pr-3 text-left odd:pr-3 even:border-l even:pl-4'
  return to ? (
    <button type="button" onClick={() => navigate(to)} className={cn(cls, 'hover:bg-[var(--hv-surface-2)]')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="m-0 border-y border-[var(--hv-border)] py-4 text-[13px] text-[var(--hv-text-3)]">{children}</p>
}

/** A Home section: a plain heading, an optional count and a quiet link. */
function Block({ title, count, action, children }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="hv-h2 m-0">{title}</h2>
        {count != null && <span className="hv-num text-[12px] text-[var(--hv-text-3)]">{count}</span>}
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

