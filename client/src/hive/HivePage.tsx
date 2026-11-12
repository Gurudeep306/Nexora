import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, Brain, Command, FolderGit2, Home, KeyRound, MessageCircle, MessagesSquare, Puzzle, Search, Users, X } from 'lucide-react'
import { Modal, Tooltip } from '@/components/ui'
import { cn } from '@/lib/utils'
import { StaffChat } from './BoardView'
import { projectColor } from './projectColor'
import { HiveProvider, useHive } from './store'
import { StatusDot, UserDot, timeAgo } from './ui'
import './hive.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const PluginsPage = lazy(() => import('./pages/PluginsPage'))
const KeysPage = lazy(() => import('./pages/KeysPage'))
const UsagePage = lazy(() => import('./pages/UsagePage'))
const MemoryPage = lazy(() => import('./pages/MemoryPage'))

const TABS_KEY = 'hive:tabs'
type TabRef = { projectId: string; taskId: string; title?: string }
const readTabs = (): TabRef[] => {
  try {
    return JSON.parse(localStorage.getItem(TABS_KEY) || '[]')
  } catch {
    return []
  }
}

export default function HivePage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const m = /^\/hive\/p\/([^/]+)(?:\/t\/([^/]+))?/.exec(pathname)
  const projectId = m?.[1] ?? null
  const taskId = m?.[2] ?? null
  const onSelect = useCallback(
    (p: string | null, t?: string | null) => {
      try {
        if (p) localStorage.setItem('hive:lastProject', p)
      } catch {
        /* storage unavailable */
      }
      navigate(p ? (t ? `/hive/p/${p}/t/${t}` : `/hive/p/${p}`) : '/hive')
    },
    [navigate],
  )
  return (
    <HiveProvider projectId={projectId} taskId={taskId} onSelect={onSelect}>
      <Shell />
    </HiveProvider>
  )
}

const saveTabs = (t: TabRef[]) => {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(t))
  } catch {
    /* ignore */
  }
}

function Shell() {
  const { boot, loading, error, projectId, taskId, detail, noteTasks } = useHive()
  const [palette, setPalette] = useState(false)
  const [team, setTeam] = useState(false)
  const [tabs, setTabs] = useState<TabRef[]>(readTabs)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Statuses for tabs and search, across every project.
  useEffect(() => {
    import('./api').then(({ hiveApi }) => hiveApi.overview().then((r) => noteTasks(r.tasks)).catch(() => {}))
  }, [noteTasks])

  // Every task you open becomes a tab, so several projects stay one click away.
  useEffect(() => {
    if (!projectId || !taskId) return
    setTabs((t) => {
      if (t.some((x) => x.taskId === taskId)) return t
      const next = [...t, { projectId, taskId }].slice(-8)
      saveTabs(next)
      return next
    })
  }, [projectId, taskId])
  useEffect(() => {
    const t = detail?.task
    if (!t) return
    setTabs((tabs) => {
      if (!tabs.some((x) => x.taskId === t.id && x.title !== t.title)) return tabs
      const next = tabs.map((x) => (x.taskId === t.id ? { ...x, title: t.title } : x))
      saveTabs(next)
      return next
    })
  }, [detail?.task])

  const closeTab = (id: string) =>
    setTabs((t) => {
      const next = t.filter((x) => x.taskId !== id)
      saveTabs(next)
      return next
    })

  if (loading && !boot) {
    return (
      <div className="hive-root grid h-dvh place-items-center">
        <HiveMark className="size-10 animate-pulse" />
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

  return (
    <div className="hive-root flex h-dvh overflow-hidden text-text-primary">
      <Rail onTeam={() => setTeam(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar tabs={tabs} onClose={closeTab} onPalette={() => setPalette(true)} onTeam={() => setTeam(true)} currentTitle={detail?.task.title} />
        <main className="hive-main hive-scroll min-h-0 flex-1 overflow-y-auto">
          <Suspense fallback={<div className="hive-shimmer m-8 h-40 rounded-2xl" />}>
            <Routes>
              <Route index element={<HomePage />} />
              <Route path="p/:projectId/*" element={<ProjectPage />} />
              <Route path="chat/:convoId?" element={<ChatPage />} />
              <Route path="plugins" element={<PluginsPage />} />
              <Route path="keys" element={<KeysPage />} />
              <Route path="usage" element={<UsagePage />} />
              <Route path="memory" element={<MemoryPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <TeamDrawer open={team} onClose={() => setTeam(false)} />
      <Palette open={palette} onClose={() => setPalette(false)} />
    </div>
  )
}

export function HiveMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 3 27 9.5v13L16 29 5 22.5v-13z" fill="none" stroke="var(--color-accent-brand)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 10.5 21 13.4v5.2L16 21.5l-5-2.9v-5.2z" fill="var(--color-accent-brand)" />
    </svg>
  )
}

function Rail({ onTeam }: { onTeam: () => void }) {
  const { boot, online, project } = useHive()
  let lastProject: string | null = null
  try {
    lastProject = localStorage.getItem('hive:lastProject')
  } catch {
    /* ignore */
  }
  const projectHref = `/hive/p/${project?.id ?? (boot?.projects.find((p) => p.id === lastProject) ?? boot?.projects[0])?.id ?? ''}`
  const items: { to: string; label: string; icon: typeof Home; end?: boolean; match?: RegExp }[] = [
    { to: '/hive', label: 'Home', icon: Home, end: true },
    { to: projectHref, label: 'Projects', icon: FolderGit2, match: /^\/hive\/p\// },
    { to: '/hive/chat', label: 'Chat', icon: MessageCircle },
    { to: '/hive/memory', label: 'Memory', icon: Brain },
    { to: '/hive/plugins', label: 'Plugins', icon: Puzzle },
    { to: '/hive/keys', label: 'Keys', icon: KeyRound },
    { to: '/hive/usage', label: 'Usage', icon: BarChart3 },
  ]
  const { pathname } = useLocation()
  return (
    <nav className="hive-rail flex w-[60px] shrink-0 flex-col items-center border-r hive-line py-3" aria-label="Hive">
      <Link to="/hive" className="mb-4 grid size-9 place-items-center" aria-label="Hive home">
        <HiveMark className="size-7" />
      </Link>
      <div className="flex flex-1 flex-col items-center gap-1">
        {items.map((it) => {
          const active = it.match ? it.match.test(pathname) : undefined
          return (
            <Tooltip key={it.label} label={it.label} side="right">
              <NavLink
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  cn(
                    'grid size-10 place-items-center rounded-xl transition-colors',
                    (active ?? isActive) ? 'bg-accent-brand/12 text-accent-brand' : 'text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary',
                  )
                }
                aria-label={it.label}
              >
                <it.icon className="size-[18px]" strokeWidth={1.8} />
              </NavLink>
            </Tooltip>
          )
        })}
      </div>
      <Tooltip label={`Team · ${online.length} online`} side="right">
        <button type="button" onClick={onTeam} className="relative mb-1 grid size-10 place-items-center rounded-xl text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="Team">
          <Users className="size-[18px]" strokeWidth={1.8} />
          {online.length > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-state-success px-1 text-[9px] font-semibold text-white">{online.length}</span>}
        </button>
      </Tooltip>
      <Tooltip label="Back to NexoraGuru" side="right">
        <Link to="/hub" className="grid size-10 place-items-center rounded-xl text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="Back to NexoraGuru">
          <ArrowLeft className="size-[18px]" strokeWidth={1.8} />
        </Link>
      </Tooltip>
    </nav>
  )
}

function TopBar({ tabs, onClose, onPalette, onTeam, currentTitle }: { tabs: TabRef[]; onClose: (id: string) => void; onPalette: () => void; onTeam: () => void; currentTitle?: string }) {
  const { boot, taskId, taskIndex, online, connected, live } = useHive()
  const navigate = useNavigate()
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b hive-line px-3">
      <div className="hive-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const task = taskIndex[t.taskId]
          const project = boot?.projects.find((p) => p.id === t.projectId)
          if (!project) return null
          const active = t.taskId === taskId
          const title = (active ? currentTitle : null) ?? task?.title ?? t.title ?? 'Task'
          return (
            <div key={t.taskId} className={cn('group flex h-8 max-w-56 shrink-0 items-center gap-2 rounded-lg pl-2.5 pr-1 text-[12.5px] transition-colors', active ? 'bg-text-primary/[0.08] text-text-primary' : 'text-text-muted hover:bg-text-primary/[0.04] hover:text-text-secondary')}>
              <button type="button" onClick={() => navigate(`/hive/p/${t.projectId}/t/${t.taskId}`)} className="flex min-w-0 items-center gap-2">
                <span className="hive-hex size-2.5 shrink-0" style={{ background: projectColor(project.color) }} />
                <span className="truncate">{title}</span>
                {task && <StatusDot status={task.status} className="size-1.5" />}
              </button>
              <button type="button" onClick={() => onClose(t.taskId)} className="grid size-5 shrink-0 place-items-center rounded text-text-muted opacity-0 hover:bg-text-primary/10 hover:text-text-primary group-hover:opacity-100" aria-label={`Close ${title}`}>
                <X className="size-3" />
              </button>
            </div>
          )
        })}
      </div>
      {live.length > 0 && (
        <span className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] text-accent-brand md:inline-flex">
          <span className="hive-dot-run size-1.5 rounded-full bg-accent-brand" /> {live.length} working
        </span>
      )}
      <button type="button" onClick={onTeam} className="flex items-center -space-x-1.5 px-1" aria-label="Who's online">
        {online.slice(0, 4).map((o) => (
          <UserDot key={o.username} username={o.username} size={6} ring />
        ))}
      </button>
      <span className={cn('size-1.5 rounded-full', connected ? 'bg-state-success' : 'bg-state-warning')} title={connected ? 'Live' : 'Reconnecting…'} />
      <button type="button" onClick={onPalette} className="ml-1 hidden h-8 items-center gap-2 rounded-lg px-2.5 text-[12.5px] text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary sm:flex">
        <Search className="size-3.5" /> Search <kbd className="rounded bg-text-primary/[0.08] px-1.5 text-[10.5px]">⌘K</kbd>
      </button>
    </header>
  )
}

function TeamDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { boot, online, select, project, projectId } = useHive()
  if (!open || !boot) return null
  const onlineSet = new Map(online.map((o) => [o.username, o]))
  const nameOf = (id: string | null | undefined) => boot.projects.find((p) => p.id === id)?.name
  return (
    <div className="fixed inset-0 z-[900] flex justify-end" role="dialog" aria-label="Team">
      <button type="button" className="absolute inset-0 bg-bg-app/40 backdrop-blur-[1px]" onClick={onClose} aria-label="Close" />
      <aside className="hive-in relative flex h-full w-full max-w-[380px] flex-col border-l hive-line bg-bg-surface shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-[15px] font-semibold">Team</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.06]" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-0.5 px-3">
          {[...boot.members]
            .sort((a, b) => Number(onlineSet.has(b.username)) - Number(onlineSet.has(a.username)))
            .map((m) => {
              const o = onlineSet.get(m.username)
              return (
                <button
                  key={m.username}
                  type="button"
                  disabled={!o?.view?.projectId}
                  onClick={() => {
                    if (o?.view?.projectId) select(o.view.projectId, o.view.taskId)
                    onClose()
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left enabled:hover:bg-text-primary/5"
                >
                  <span className="relative">
                    <UserDot username={m.username} size={8} />
                    <span className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-bg-surface', o ? 'bg-state-success' : 'bg-text-muted/40')} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-text-primary">{m.display_name || m.username}</span>
                    <span className="block truncate text-[12px] text-text-muted">{o ? (o.view?.projectId ? `In ${nameOf(o.view.projectId) ?? 'a project'}` : `Online · ${timeAgo(o.since)}`) : m.role}</span>
                  </span>
                </button>
              )
            })}
        </div>
        <div className="mt-4 flex min-h-0 flex-1 flex-col border-t hive-line">
          {projectId || project ? (
            <StaffChat className="rounded-none border-0 bg-transparent" />
          ) : (
            <p className="flex items-center gap-2 p-5 text-[13px] text-text-muted">
              <MessagesSquare className="size-4" /> Open a project to chat with staff about it.
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}

function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { boot, taskIndex } = useHive()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  useEffect(() => {
    if (open) {
      setQ('')
      setI(0)
    }
  }, [open])
  const items = useMemo(() => {
    const out: { id: string; label: string; hint: string; icon?: ReactNode; to: string }[] = [
      { id: 'home', label: 'Home', hint: 'Everything running across projects', to: '/hive' },
      { id: 'chat', label: 'New chat', hint: 'Talk to any model', to: '/hive/chat' },
      { id: 'plugins', label: 'Plugins', hint: 'Token savers, reliability, custom instructions', to: '/hive/plugins' },
      { id: 'keys', label: 'Keys', hint: 'Providers, budgets, GitHub', to: '/hive/keys' },
      { id: 'usage', label: 'Usage', hint: 'Tokens by provider and person', to: '/hive/usage' },
      { id: 'memory', label: 'Memory', hint: 'What every agent knows about a project', to: '/hive/memory' },
    ]
    for (const p of boot?.projects ?? []) out.push({ id: `p:${p.id}`, label: p.name, hint: `${p.repo_owner}/${p.repo_name}`, icon: <span className="hive-hex size-3" style={{ background: projectColor(p.color) }} />, to: `/hive/p/${p.id}` })
    for (const t of Object.values(taskIndex)) out.push({ id: `t:${t.id}`, label: t.title, hint: t.status, icon: <StatusDot status={t.status} />, to: `/hive/p/${t.project_id}/t/${t.id}` })
    const s = q.toLowerCase().trim()
    return s ? out.filter((x) => `${x.label} ${x.hint}`.toLowerCase().includes(s)) : out
  }, [boot, taskIndex, q])
  const go = (to: string) => {
    navigate(to)
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="-m-2">
        <label className="flex items-center gap-2 border-b hive-line px-3 pb-2.5">
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
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setI((x) => Math.max(0, x - 1))
              } else if (e.key === 'Enter' && items[i]) go(items[i].to)
            }}
            placeholder="Jump to a project, task or page…"
            className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
          />
        </label>
        <ul className="hive-scroll mt-1.5 max-h-80 overflow-y-auto px-1.5">
          {items.slice(0, 60).map((x, j) => (
            <li key={x.id}>
              <button type="button" onMouseEnter={() => setI(j)} onClick={() => go(x.to)} className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', j === i && 'bg-accent-brand/10')}>
                <span className="grid size-4 place-items-center">{x.icon}</span>
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
