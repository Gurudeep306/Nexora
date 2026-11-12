import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bot, Check, Command, FolderGit2 as Github, KeyRound, Layers, Menu as MenuIcon, PanelRight, Search, SquarePen, Wifi, WifiOff, X } from 'lucide-react'
import { Button, Kbd, Modal, Tooltip } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Composer } from './Composer'
import { AddGithubDialog } from './KeysPanel'
import { NewProjectDialog, ProjectRail, projectColor } from './ProjectRail'
import { SidePanel, type SideTab } from './SidePanel'
import { HiveProvider, useHive } from './store'
import { TaskView } from './TaskView'
import { ProviderGlyph, UserDot } from './ui'
import './hive.css'

export default function HivePage() {
  const { projectId = null, taskId = null } = useParams()
  const navigate = useNavigate()
  const onSelect = useCallback(
    (p: string | null, t?: string | null) => {
      try {
        if (p) localStorage.setItem('hive:lastProject', p)
      } catch {
        /* storage unavailable */
      }
      navigate(p ? (t ? `/hive/${p}/${t}` : `/hive/${p}`) : '/hive')
    },
    [navigate],
  )
  return (
    <HiveProvider projectId={projectId} taskId={taskId} onSelect={onSelect}>
      <HiveShell />
    </HiveProvider>
  )
}

function HiveShell() {
  const { boot, loading, error, project, projectId, taskId, select } = useHive()
  const [side, setSide] = useState<SideTab | null>(() => (typeof window !== 'undefined' && window.innerWidth >= 1280 ? 'keys' : null))
  const [railOpen, setRailOpen] = useState(false)
  const [palette, setPalette] = useState(false)

  // Land on the last project you used.
  useEffect(() => {
    if (!boot || projectId) return
    let last: string | null = null
    try {
      last = localStorage.getItem('hive:lastProject')
    } catch {
      /* ignore */
    }
    const p = boot.projects.find((x) => x.id === last) ?? boot.projects[0]
    if (p) select(p.id)
  }, [boot, projectId, select])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((p) => !p)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        setSide((s) => (s ? null : 'keys'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => setRailOpen(false), [taskId, projectId])

  if (loading && !boot) {
    return (
      <div className="hive-root grid h-dvh place-items-center">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <HiveMark className="size-12 animate-pulse" />
          <span className="text-sm">Waking the hive…</span>
        </div>
      </div>
    )
  }
  if (error || !boot) {
    return (
      <div className="hive-root grid h-dvh place-items-center p-6 text-center">
        <div>
          <p className="text-sm text-text-secondary">{error ?? 'Hive is unavailable'}</p>
          <Link to="/hub" className="mt-3 inline-block text-sm text-accent-brand hover:underline">
            Back to NexoraGuru
          </Link>
        </div>
      </div>
    )
  }

  const showComposer = project && !taskId

  return (
    <div className="hive-root flex h-dvh flex-col overflow-hidden text-text-primary">
      <TopBar side={side} onSide={setSide} onPalette={() => setPalette(true)} onRail={() => setRailOpen((o) => !o)} />
      <div className="relative flex min-h-0 flex-1">
        {/* Left rail */}
        <div className={cn('z-30 w-[280px] shrink-0 max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:shadow-2xl max-lg:transition-transform', railOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full', 'bg-bg-app/95 lg:bg-transparent')}>
          <ProjectRail onNewTask={() => project && select(project.id)} />
        </div>
        {railOpen && <button type="button" aria-label="Close menu" className="absolute inset-0 z-20 bg-bg-app/50 lg:hidden" onClick={() => setRailOpen(false)} />}

        {/* Main */}
        <main className="min-w-0 flex-1">
          {!boot.projects.length || !project ? (
            <Onboarding onOpenKeys={() => setSide('keys')} />
          ) : showComposer ? (
            <NewTaskHero />
          ) : (
            <TaskView />
          )}
        </main>

        {/* Side panel */}
        {side && (
          <div className="z-30 w-[360px] shrink-0 max-xl:absolute max-xl:inset-y-0 max-xl:right-0 max-xl:bg-bg-app/95 max-xl:shadow-2xl max-sm:w-full">
            <SidePanel tab={side} onTab={setSide} />
          </div>
        )}
      </div>
      <Palette open={palette} onClose={() => setPalette(false)} onSide={setSide} />
    </div>
  )
}

export function HiveMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="hive-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-brand)" />
          <stop offset="100%" stopColor="var(--color-state-info)" />
        </linearGradient>
      </defs>
      <path d="M16 2.5 27.5 9v14L16 29.5 4.5 23V9z" fill="url(#hive-g)" opacity="0.18" />
      <path d="M16 2.5 27.5 9v14L16 29.5 4.5 23V9z" fill="none" stroke="url(#hive-g)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 9.5 21.5 12.7v6.6L16 22.5l-5.5-3.2v-6.6z" fill="url(#hive-g)" />
    </svg>
  )
}

function TopBar({ side, onSide, onPalette, onRail }: { side: SideTab | null; onSide: (t: SideTab | null) => void; onPalette: () => void; onRail: () => void }) {
  const { boot, project, detail, taskId, online, connected } = useHive()
  const live = boot?.keys.reduce((s, k) => s + k.active, 0) ?? 0
  return (
    <header className="hive-glass z-40 flex h-12 shrink-0 items-center gap-2 border-b border-border/70 px-2.5">
      <Button size="icon-sm" variant="ghost" className="lg:hidden" onClick={onRail} aria-label="Projects and tasks">
        <MenuIcon />
      </Button>
      <Tooltip label="Back to NexoraGuru" side="bottom">
        <Link to="/hub" className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/6 hover:text-text-primary" aria-label="Back to NexoraGuru">
          <ArrowLeft className="size-4" />
        </Link>
      </Tooltip>
      <Link to="/hive" className="flex items-center gap-2 pr-1">
        <HiveMark className="size-6" />
        <span className="text-[15px] font-semibold tracking-tight">Hive</span>
        <span className="hidden rounded-md bg-accent-brand/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-brand sm:inline">Staff</span>
      </Link>
      {project && (
        <div className="hidden min-w-0 items-center gap-1.5 text-[13px] text-text-muted md:flex">
          <span className="text-border-strong">/</span>
          <span className="hive-hex size-3.5 shrink-0" style={{ background: projectColor(project.color) }} />
          <span className="truncate text-text-secondary">{project.name}</span>
          {taskId && detail && (
            <>
              <span className="text-border-strong">/</span>
              <span className="max-w-[28ch] truncate text-text-primary">{detail.task.title}</span>
            </>
          )}
        </div>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        {live > 0 && (
          <span className="hidden items-center gap-1.5 rounded-full bg-accent-brand/10 px-2.5 py-1 text-[11px] font-medium text-accent-brand sm:inline-flex">
            <Bot className="size-3.5" /> {live} live call{live === 1 ? '' : 's'}
          </span>
        )}
        <Tooltip label={`${online.length} staff online: ${online.map((o) => `@${o.username}`).join(', ')}`} side="bottom">
          <button type="button" onClick={() => onSide('team')} className="flex items-center -space-x-1.5 px-1">
            {online.slice(0, 5).map((o) => (
              <UserDot key={o.username} username={o.username} size={6} ring />
            ))}
            {online.length > 5 && <span className="grid size-6 place-items-center rounded-full bg-text-primary/10 text-[10px] ring-2 ring-bg-app">+{online.length - 5}</span>}
          </button>
        </Tooltip>
        <Tooltip label={connected ? 'Live' : 'Reconnecting…'} side="bottom">
          <span className={cn('grid size-7 place-items-center rounded-lg', connected ? 'text-state-success' : 'text-state-warning')}>{connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}</span>
        </Tooltip>
        <button type="button" onClick={onPalette} className="hidden h-8 items-center gap-2 rounded-lg border border-border bg-bg-surface/70 px-2.5 text-xs text-text-muted hover:border-border-strong hover:text-text-primary sm:flex">
          <Search className="size-3.5" /> Jump to… <Kbd>⌘K</Kbd>
        </button>
        <Tooltip label="Key vault, usage & team (⌘.)" side="bottom">
          <Button size="icon-sm" variant={side ? 'secondary' : 'ghost'} onClick={() => onSide(side ? null : 'keys')} aria-label="Toggle side panel">
            <PanelRight />
          </Button>
        </Tooltip>
      </div>
    </header>
  )
}

function NewTaskHero() {
  const { project, boot, tasks, online } = useHive()
  if (!project || !boot) return null
  const running = tasks.filter((t) => t.status === 'running').length
  const here = online.filter((o) => o.view?.projectId === project.id)
  return (
    <div className="hive-scroll relative h-full overflow-y-auto">
      <div className="hive-grid-bg pointer-events-none absolute inset-x-0 top-0 h-80" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-16 pt-[12vh]">
        <HiveMark className="mb-5 size-14 drop-shadow-[0_8px_24px_color-mix(in_oklab,var(--color-accent-brand)_35%,transparent)]" />
        <h1 className="text-center text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">What should the hive build?</h1>
        <p className="mt-2 text-center text-sm text-text-muted">
          <span className="font-mono">
            {project.repo_owner}/{project.repo_name}
          </span>{' '}
          · {running ? `${running} task${running === 1 ? '' : 's'} running` : 'idle'} · {here.length} staff here
        </p>
        <div className="mt-8 w-full">
          <Composer hero />
        </div>
        <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ['Team mode', 'A lead agent splits the work and runs sub-tasks in parallel across Claude, GPT and Gemini — all editing one live working copy.'],
            ['Compare mode', 'Race models on the same task, diff their results side by side and adopt the winner.'],
            ['You stay in control', 'Steer any agent mid-run, edit their output by hand, then commit to a branch and open a PR in one click.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-bg-surface/50 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <Layers className="size-4 text-accent-brand" /> {t}
              </div>
              <p className="text-[12.5px] leading-relaxed text-text-muted">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Onboarding({ onOpenKeys }: { onOpenKeys: () => void }) {
  const { boot } = useHive()
  const [gh, setGh] = useState(false)
  const [proj, setProj] = useState(false)
  if (!boot) return null
  const steps = [
    { done: boot.github.length > 0, title: 'Connect GitHub', body: 'A token with access to the repositories Hive should work on.', action: () => setGh(true), cta: 'Connect', icon: Github },
    { done: boot.keys.length > 0, title: 'Add AI keys', body: 'Claude, GPT, Gemini or any OpenAI-compatible API — with token budgets.', action: onOpenKeys, cta: 'Open key vault', icon: KeyRound },
    { done: boot.projects.length > 0, title: 'Create a project', body: 'Pick a repository. Everyone on staff shares it.', action: () => setProj(true), cta: 'New project', icon: SquarePen, disabled: !boot.github.length },
  ]
  return (
    <div className="hive-scroll relative h-full overflow-y-auto">
      <div className="hive-grid-bg pointer-events-none absolute inset-x-0 top-0 h-96" />
      <div className="relative mx-auto max-w-2xl px-4 pb-16 pt-[10vh]">
        <HiveMark className="mx-auto mb-5 size-16" />
        <h1 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Welcome to Hive</h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-text-muted">
          One place where every staff member runs Claude, GPT and Gemini agents on your GitHub repositories — in parallel, on the same projects, with shared keys and live token budgets.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {(['anthropic', 'openai', 'gemini', 'openai_compat'] as const).map((p) => (
            <ProviderGlyph key={p} provider={p} size="lg" />
          ))}
        </div>
        <ol className="mt-10 flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={s.title} className={cn('flex items-center gap-4 rounded-2xl border p-4', s.done ? 'border-state-success/30 bg-state-success/5' : 'border-border bg-bg-surface/60')}>
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', s.done ? 'bg-state-success/15 text-state-success' : 'bg-text-primary/6 text-text-secondary')}>
                {s.done ? <Check className="size-5" /> : <s.icon className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text-primary">
                  {i + 1}. {s.title}
                </div>
                <div className="text-[12.5px] text-text-muted">{s.body}</div>
              </div>
              {!s.done && (
                <Button size="sm" onClick={s.action} disabled={s.disabled}>
                  {s.cta}
                </Button>
              )}
            </li>
          ))}
        </ol>
        {boot.projects.length > 0 && <p className="mt-6 text-center text-sm text-text-muted">Pick a project from the menu on the left.</p>}
      </div>
      <AddGithubDialog open={gh} onClose={() => setGh(false)} />
      <NewProjectDialog open={proj} onClose={() => setProj(false)} />
    </div>
  )
}

function Palette({ open, onClose, onSide }: { open: boolean; onClose: () => void; onSide: (t: SideTab) => void }) {
  const { boot, tasks, project, select } = useHive()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  useEffect(() => {
    if (open) {
      setQ('')
      setI(0)
    }
  }, [open])
  const items = useMemo(() => {
    const out: { id: string; label: string; hint: string; run: () => void }[] = []
    if (project) out.push({ id: 'new', label: 'New task', hint: project.name, run: () => select(project.id) })
    out.push({ id: 'keys', label: 'Key vault', hint: 'Keys, budgets, GitHub', run: () => onSide('keys') })
    out.push({ id: 'usage', label: 'Usage', hint: 'Tokens by provider and person', run: () => onSide('usage') })
    out.push({ id: 'team', label: 'Team', hint: 'Who is online · staff chat', run: () => onSide('team') })
    for (const p of boot?.projects ?? []) out.push({ id: `p:${p.id}`, label: p.name, hint: `Project · ${p.repo_owner}/${p.repo_name}`, run: () => select(p.id) })
    for (const t of tasks) out.push({ id: `t:${t.id}`, label: t.title, hint: `Task · ${t.status}`, run: () => select(t.project_id, t.id) })
    const s = q.toLowerCase().trim()
    return s ? out.filter((x) => x.label.toLowerCase().includes(s) || x.hint.toLowerCase().includes(s)) : out
  }, [boot, tasks, project, q, select, onSide])

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="-m-2">
        <label className="flex items-center gap-2 border-b border-border px-3 pb-2.5">
          <Command className="size-4 text-text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setI(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setI((x) => Math.min(items.length - 1, x + 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setI((x) => Math.max(0, x - 1))
              }
              if (e.key === 'Enter' && items[i]) {
                items[i].run()
                onClose()
              }
            }}
            placeholder="Jump to a project, task or panel…"
            className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
          />
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">
            <X className="size-4" />
          </button>
        </label>
        <ul className="hive-scroll mt-1.5 max-h-80 overflow-y-auto px-1.5">
          {items.slice(0, 60).map((x, j) => (
            <li key={x.id}>
              <button
                type="button"
                onMouseEnter={() => setI(j)}
                onClick={() => {
                  x.run()
                  onClose()
                }}
                className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', j === i ? 'bg-accent-brand/10' : '')}
              >
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{x.label}</span>
                <span className="shrink-0 text-[11px] text-text-muted">{x.hint}</span>
              </button>
            </li>
          ))}
          {!items.length && <li className="p-4 text-center text-xs text-text-muted">No matches</li>}
        </ul>
      </div>
    </Modal>
  )
}
