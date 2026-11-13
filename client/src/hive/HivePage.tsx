import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  LayoutGrid,
  Sparkles,
  Bot,
  HeartPulse,
  Network,
  Boxes,
  Clock3,
  HardDrive,
  PiggyBank,
  Wallet,
  Workflow,
  Brain,
  Check,
  ChevronRight,
  Command,
  CornerDownLeft,
  FolderGit2,
  GitBranch,
  Home,
  KeyRound,
  Lightbulb,
  Menu as MenuIcon,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Puzzle,
  Radar,
  Search,
  Server,
  ShieldAlert,
  Terminal,
  Users,
  X,
} from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { Tooltip } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { AlertsBell, TeamChat } from './TeamChat'
import { Launcher, type LaunchGroup } from './Launcher'
import { CopilotDock } from './Copilot'
import { HiveLogo } from './HiveLogo'
import { projectColor } from './projectColor'
import { HiveProvider, useHive } from './store'
import type { Convo } from './types'
import { StatusDot, UserDot, timeAgo } from './ui'
import './hive.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const PluginsPage = lazy(() => import('./pages/PluginsPage'))
const KeysPage = lazy(() => import('./pages/KeysPage'))
const UsagePage = lazy(() => import('./pages/UsagePage'))
const MemoryPage = lazy(() => import('./pages/MemoryPage'))
const LaunchpadPage = lazy(() => import('./pages/LaunchpadPage'))
const MachinesPage = lazy(() => import('./pages/MachinesPage'))
const ModelsPage = lazy(() => import('./pages/ModelsPage'))
const NexoraGuide = lazy(() => import('./pages/NexoraGuide'))
const DrivePage = lazy(() => import('./pages/DrivePage'))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'))
const AutomationsPage = lazy(() => import('./pages/AutomationsPage'))
const PipelinesPage = lazy(() => import('./pages/PipelinesPage'))
const ToolboxPage = lazy(() => import('./pages/ToolboxPage'))
const StewardPage = lazy(() => import('./pages/StewardPage'))
const DispatchPage = lazy(() => import('./pages/DispatchPage'))
const HealthPage = lazy(() => import('./pages/HealthPage'))
const CopilotPage = lazy(() => import('./pages/CopilotPage'))
const ReposPage = lazy(() => import('./pages/ReposPage'))

const store = {
  get: (k: string, d: string) => {
    try {
      return localStorage.getItem(k) ?? d
    } catch {
      return d
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* storage unavailable */
    }
  },
}

export default function HivePage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const m = /^\/hive\/p\/([^/]+)(?:\/t\/([^/]+))?/.exec(pathname)
  const projectId = m?.[1] ?? null
  const taskId = m?.[2] ?? null
  const onSelect = useCallback(
    (p: string | null, t?: string | null) => {
      if (p) store.set('hive:lastProject', p)
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

/* ── Shell ─────────────────────────────────────────────────────────────── */
function Shell() {
  const { boot, loading, error, noteTasks } = useHive()
  const [palette, setPalette] = useState(false)
  const [launcher, setLauncher] = useState(false)
  const [team, setTeam] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Sessions need the width: the workspace sidebar has its own (default hidden) setting there.
  const inSession = /^\/hive\/p\/[^/]+\/t\//.test(pathname)
  const sideKey = inSession ? 'hive:sideSession' : 'hive:side'
  const [sides, setSides] = useState(() => ({ 'hive:side': store.get('hive:side', '1') === '1', 'hive:sideSession': store.get('hive:sideSession', '0') === '1' }))
  const side = sides[sideKey]
  const setSide = (f: (s: boolean) => boolean) =>
    setSides((all) => {
      const v = f(all[sideKey])
      store.set(sideKey, v ? '1' : '0')
      return { ...all, [sideKey]: v }
    })
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => setMobileNav(false), [pathname])
  useEffect(() => {
    hiveApi
      .overview()
      .then((r) => noteTasks(r.tasks))
      .catch(() => {})
  }, [noteTasks])

  // Keyboard: ⌘K palette · ⌘B sidebar · ⌘J new chat · ⌘⇧I new idea
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === 'k') {
        e.preventDefault()
        setPalette((p) => !p)
      } else if (k === '.') {
        e.preventDefault()
        setLauncher((v) => !v)
      } else if (k === 'b') {
        e.preventDefault()
        toggleRef.current()
      } else if (k === 'j') {
        e.preventDefault()
        navigate('/hive/chat')
      } else if (k === 'i' && e.shiftKey) {
        e.preventDefault()
        navigate('/hive/launchpad')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
  const toggleRef = useRef(() => {})
  toggleRef.current = () => setSide((s) => !s)

  if (loading && !boot) {
    return (
      <div className="hive-root grid h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <HiveLogo size={56} live />
          <span className="hive-shine text-[13px] font-medium">Waking the hive…</span>
        </div>
      </div>
    )
  }
  if (error || !boot) {
    return (
      <div className="hive-root grid h-dvh place-items-center p-6 text-center">
        <div>
          <HiveLogo size={44} className="mx-auto mb-4 opacity-60" />
          <p className="text-sm text-text-secondary">{error ?? 'Hive is unavailable'}</p>
          <Link to="/hub" className="mt-3 inline-block text-sm text-accent-brand hover:underline">
            Back to NexoraGuru
          </Link>
        </div>
      </div>
    )
  }

  const toggleSide = () => setSide((s) => !s)

  return (
    <div className="hive-root flex h-dvh overflow-hidden text-text-primary">
      <ActivityBar onTeam={() => setTeam(true)} onPalette={() => setPalette(true)} onLauncher={() => setLauncher(true)} withSidebar={side} />
      <AnimatePresence initial={false}>
        {side && (
          <motion.div key="side" initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }} className="hidden overflow-hidden lg:block">
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar side={side} onToggleSide={toggleSide} onMobileNav={() => setMobileNav(true)} onPalette={() => setPalette(true)} onTeam={() => setTeam(true)} />
        <main className="hive-main hive-scroll relative min-h-0 flex-1 overflow-y-auto">
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route index element={<HomePage />} />
              <Route path="p/:projectId/*" element={<ProjectPage />} />
              <Route path="chat/:convoId?" element={<ChatPage />} />
              <Route path="launchpad/:ideaId?" element={<LaunchpadPage />} />
              <Route path="machines" element={<MachinesPage />} />
              <Route path="models" element={<ModelsPage />} />
              <Route path="nexora" element={<NexoraGuide />} />
              <Route path="plugins" element={<PluginsPage />} />
              <Route path="keys" element={<KeysPage />} />
              <Route path="usage" element={<UsagePage />} />
              <Route path="memory" element={<MemoryPage />} />
              <Route path="drive" element={<DrivePage />} />
              <Route path="budgets" element={<BudgetsPage />} />
              <Route path="automations" element={<AutomationsPage />} />
              <Route path="pipelines" element={<PipelinesPage />} />
              <Route path="toolbox" element={<ToolboxPage />} />
              <Route path="steward" element={<StewardPage />} />
              <Route path="dispatch" element={<DispatchPage />} />
              <Route path="health" element={<HealthPage />} />
              <Route path="copilot" element={<CopilotPage />} />
              <Route path="repos" element={<ReposPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <ApprovalsTray />
      <CopilotDock />
      <TeamDrawer open={team} onClose={() => setTeam(false)} />
      <Palette open={palette} onClose={() => setPalette(false)} />
      <MobileNav open={mobileNav} onClose={() => setMobileNav(false)} />
      <LauncherMount open={launcher} onClose={() => setLauncher(false)} />
    </div>
  )
}

function LauncherMount({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { groups } = useNav()
  return <Launcher open={open} onClose={onClose} groups={groups} />
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-8">
      <div className="hive-shimmer h-8 w-1/3 rounded-lg" />
      <div className="hive-shimmer h-40 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        <div className="hive-shimmer h-28 rounded-2xl" />
        <div className="hive-shimmer h-28 rounded-2xl" />
        <div className="hive-shimmer h-28 rounded-2xl" />
      </div>
    </div>
  )
}

/* ── Activity bar ─────────────────────────────────────────────────────── */
type NavItem = { to: string; label: string; icon: typeof Home; end?: boolean; match?: RegExp; badge?: number; tone?: string; hint?: string }

/** Every section of Hive, grouped (for the home page's Explore grid). */
export function useHiveSections() {
  return useNav().groups
}

function useNav(): { main: NavItem[]; config: NavItem[]; rail: NavItem[]; groups: LaunchGroup[]; sections: { title: string; items: NavItem[] }[] } {
  const { boot, project, machines, approvals } = useHive()
  const last = store.get('hive:lastProject', '')
  const projectHref = `/hive/p/${project?.id ?? (boot?.projects.find((p) => p.id === last) ?? boot?.projects[0])?.id ?? ''}`
  const online = machines.filter((m) => m.online).length
  const I = {
    home: { to: '/hive', label: 'Mission control', icon: Home, end: true, hint: 'Everything live across projects' },
    copilot: { to: '/hive/copilot', label: 'Copilot', icon: Bot, hint: '⌘I · your chief of staff — plans, delegates, reviews, ships' },
    chat: { to: '/hive/chat', label: 'Chat', icon: MessageSquare, hint: '⌘J · any model, files, images, side by side' },
    projects: { to: projectHref, label: 'Projects', icon: FolderGit2, match: /^\/hive\/p\//, hint: 'Sessions with agents on your code' },
    repos: { to: '/hive/repos', label: 'Your GitHub', icon: GitBranch, hint: 'Every repository you can reach — open one, or hand it to the Copilot' },
    dispatch: { to: '/hive/dispatch', label: 'Dispatcher', icon: Network, hint: 'The right model on every part of the work, fewest tokens' },
    pipelines: { to: '/hive/pipelines', label: 'Pipelines', icon: Workflow, hint: 'Relay teams of agents — design one with the Architect' },
    automations: { to: '/hive/automations', label: 'Automations', icon: Clock3, hint: 'Runs on a schedule — overnight too' },
    launchpad: { to: '/hive/launchpad', label: 'Launchpad', icon: Lightbulb, hint: '⌘⇧I · turn an idea into a project' },
    drive: { to: '/hive/drive', label: 'Drive', icon: HardDrive, hint: 'Team files — push to GitHub when done' },
    machines: { to: '/hive/machines', label: 'Machines', icon: Server, badge: approvals.length || undefined, tone: approvals.length ? 'var(--color-state-warning)' : online ? 'var(--color-state-success)' : undefined, hint: `${online} online · run commands, tests, servers` },
    models: { to: '/hive/models', label: 'Models', icon: Radar, hint: 'Every model ranked — who does what, free sources, compare' },
    health: { to: '/hive/health', label: 'Agent health', icon: HeartPulse, hint: 'Who is working, cooling down or down' },
    keys: { to: '/hive/keys', label: 'Keys & limits', icon: KeyRound, hint: 'AI accounts, Claude/Codex plans, free models, limits, GitHub' },
    toolbox: { to: '/hive/toolbox', label: 'Toolbox', icon: Boxes, hint: '300+ open-source tools — MCP servers, search, skills' },
    plugins: { to: '/hive/plugins', label: 'Plugins', icon: Puzzle, hint: 'Behaviours and token savers' },
    memory: { to: '/hive/memory', label: 'Memory', icon: Brain, hint: 'What every agent knows' },
    steward: { to: '/hive/steward', label: 'Token Steward', icon: PiggyBank, hint: 'Score, savings, ask the Steward' },
    budgets: { to: '/hive/budgets', label: 'Budgets', icon: Wallet, hint: 'Caps and alerts per project, model or person' },
    usage: { to: '/hive/usage', label: 'Usage', icon: BarChart3, hint: 'Tokens and spend' },
    nexora: { to: '/hive/nexora', label: 'Build NexoraGuru', icon: Sparkles, hint: 'Guided: code → PR → live site' },
  } satisfies Record<string, NavItem>
  const H = (it: NavItem, hue: number) => ({ to: it.to, label: it.label, icon: it.icon, hint: it.hint, hue, badge: it.badge })
  // One structure for the sidebar, the launcher (⌘.) and the mobile menu: every section, grouped by what you want to do.
  const sections: { title: string; blurb: string; items: [NavItem, number][] }[] = [
    { title: 'Start', blurb: 'Ask, chat and see what is happening', items: [[I.home, 255], [I.copilot, 285], [I.chat, 230]] },
    { title: 'Build', blurb: 'Your code, projects and teams of agents', items: [[I.repos, 250], [I.projects, 200], [I.dispatch, 310], [I.pipelines, 330], [I.automations, 160], [I.launchpad, 75], [I.nexora, 260]] },
    { title: 'Run', blurb: 'Machines and files', items: [[I.machines, 140], [I.drive, 45]] },
    { title: 'Models & keys', blurb: 'Accounts, limits and who is up', items: [[I.keys, 60], [I.models, 210], [I.health, 150], [I.toolbox, 290], [I.plugins, 20], [I.memory, 340]] },
    { title: 'Spend', blurb: 'Tokens, money and savings', items: [[I.usage, 185], [I.budgets, 95], [I.steward, 155]] },
  ]
  return {
    main: [I.home, I.copilot, I.chat, I.repos, I.projects, I.dispatch, I.pipelines, I.automations, I.launchpad, I.drive, I.machines, I.models],
    config: [I.keys, I.health, I.toolbox, I.plugins, I.memory, I.steward, I.budgets, I.usage],
    // The compact icon rail (when the sidebar is hidden): the everyday places.
    rail: [I.home, I.copilot, I.chat, I.repos, I.projects, I.dispatch, I.keys, I.models, I.drive],
    groups: sections.map((g) => ({ title: g.title, blurb: g.blurb, items: g.items.map(([it, hue]) => H(it, hue)) })),
    sections: sections.map((g) => ({ title: g.title, items: g.items.map(([it]) => it) })),
  }
}

function ActivityBar({ onTeam, onPalette, onLauncher, withSidebar }: { onTeam: () => void; onPalette: () => void; onLauncher: () => void; withSidebar: boolean }) {
  const { online, live } = useHive()
  const { rail } = useNav()
  return (
    <nav className={cn('hive-rail hidden w-[64px] shrink-0 flex-col items-center border-r hive-line py-3 md:flex', withSidebar && 'lg:hidden')} aria-label="Hive">
      <Link to="/hive" className="mb-3 grid size-11 place-items-center rounded-2xl transition-transform hover:scale-105" aria-label="Hive home">
        <HiveLogo size={32} live={live.length > 0} />
      </Link>
      <button type="button" onClick={onPalette} className="mb-2 grid size-10 place-items-center rounded-xl text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="Search (⌘K)">
        <Search className="size-[18px]" strokeWidth={1.8} />
      </button>
      <div className="hive-scroll flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto">
        {rail.map((it) => (
          <RailLink key={it.label} it={it} />
        ))}
        <div className="my-2 h-px w-7 bg-[var(--hive-line)]" />
        <Tooltip
          side="right"
          label={
            <span>
              <span className="font-medium">Everything</span>
              <span className="block text-[11px] opacity-70">⌘. · every part of Hive in one place</span>
            </span>
          }
        >
          <button type="button" onClick={onLauncher} className="grid size-10 place-items-center rounded-xl border border-border text-text-secondary hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="All of Hive (⌘.)">
            <LayoutGrid className="size-[17px]" />
          </button>
        </Tooltip>
      </div>
      <Tooltip label={`Team · ${online.length} online`} side="right">
        <button type="button" onClick={onTeam} className="relative mb-1 grid size-10 place-items-center rounded-xl text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="Team">
          <Users className="size-[18px]" strokeWidth={1.8} />
          {online.length > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-state-success px-1 text-[9px] font-semibold text-white">{online.length}</span>}
        </button>
      </Tooltip>
      <Tooltip label="Back to NexoraGuru" side="right">
        <Link to="/hub" className="grid size-10 place-items-center rounded-xl opacity-80 transition-opacity hover:bg-text-primary/[0.06] hover:opacity-100" aria-label="Back to NexoraGuru">
          <LogoMark size={22} />
        </Link>
      </Tooltip>
    </nav>
  )
}

function RailLink({ it }: { it: NavItem }) {
  const { pathname } = useLocation()
  const forced = it.match ? it.match.test(pathname) : undefined
  return (
    <Tooltip
      side="right"
      label={
        <span>
          <span className="font-medium">{it.label}</span>
          {it.hint && <span className="block text-[11px] opacity-70">{it.hint}</span>}
        </span>
      }
    >
      <NavLink to={it.to} end={it.end} aria-label={it.label} className="relative">
        {({ isActive }) => {
          const on = forced ?? isActive
          return (
            <span className={cn('relative grid size-10 place-items-center rounded-xl transition-colors', on ? 'text-accent-brand' : 'text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary')}>
              {on && <motion.span layoutId="hive-rail-active" className="absolute inset-0 rounded-xl bg-accent-brand/12 ring-1 ring-accent-brand/25" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <it.icon className="relative size-[18px]" strokeWidth={1.8} />
              {it.badge ? (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: it.tone }}>
                  {it.badge}
                </span>
              ) : it.tone ? (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full" style={{ background: it.tone }} />
              ) : null}
            </span>
          )
        }}
      </NavLink>
    </Tooltip>
  )
}

/* ── Sidebar: projects (with their sessions) and chats ─────────────────── */
function Sidebar() {
  const { boot, taskIndex, live, projectId, taskId, convosVersion } = useHive()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [convos, setConvos] = useState<Convo[]>([])
  const [q, setQ] = useState('')
  const [width, setWidth] = useState(() => Number(store.get('hive:sideW', '272')) || 272)
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(store.get('hive:sideOpen', '{}'))
    } catch {
      return {}
    }
  })
  const drag = useRef(false)

  useEffect(() => {
    hiveApi
      .convos()
      .then((r) => setConvos(r.convos))
      .catch(() => {})
  }, [convosVersion, pathname])

  const s = q.trim().toLowerCase()
  const projects = boot?.projects ?? []
  const tasksBy = useMemo(() => {
    const m = new Map<string, (typeof taskIndex)[string][]>()
    for (const t of Object.values(taskIndex)) if (!t.archived) (m.get(t.project_id) ?? m.set(t.project_id, []).get(t.project_id)!).push(t)
    for (const l of m.values()) l.sort((a, b) => b.updated_at - a.updated_at)
    return m
  }, [taskIndex])
  const convoId = /^\/hive\/chat\/([^/]+)/.exec(pathname)?.[1]
  const toggle = (id: string) =>
    setOpen((o) => {
      const n = { ...o, [id]: !(o[id] ?? id === projectId) }
      store.set('hive:sideOpen', JSON.stringify(n))
      return n
    })

  const onDrag = (e: React.PointerEvent) => {
    drag.current = true
    const start = e.clientX
    const w0 = width
    const move = (ev: PointerEvent) => setWidth(Math.max(220, Math.min(420, w0 + ev.clientX - start)))
    const up = () => {
      drag.current = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setWidth((w) => (store.set('hive:sideW', String(w)), w))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="flex h-full">
      <aside className="hive-side flex h-full flex-col border-r hive-line" style={{ width }}>
        <div className="flex items-center gap-2 px-3 pb-2 pt-3">
          <Link to="/hive" className="flex items-center gap-2" aria-label="Hive home">
            <HiveLogo size={24} live={live.length > 0} />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Hive</span>
          </Link>
          <span className="ml-auto flex gap-1">
            <Tooltip label="New chat · ⌘J">
              <button type="button" onClick={() => navigate('/hive/chat')} className="grid size-7 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.07] hover:text-text-primary" aria-label="New chat">
                <MessageSquare className="size-4" />
              </button>
            </Tooltip>
            <Tooltip label="New idea · ⌘⇧I">
              <button type="button" onClick={() => navigate('/hive/launchpad')} className="grid size-7 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.07] hover:text-text-primary" aria-label="New idea">
                <Lightbulb className="size-4" />
              </button>
            </Tooltip>
          </span>
        </div>
        <div className="px-3 pb-2">
          <label className="flex h-8 items-center gap-2 rounded-lg bg-text-primary/[0.05] px-2.5 text-text-muted focus-within:bg-text-primary/[0.08]">
            <Search className="size-3.5" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter" className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-text-muted" />
          </label>
        </div>
        <nav className="hive-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          <NavSections filter={s} />
          <div className="mx-2.5 my-3 h-px bg-[var(--hive-line)]" />
          <SideHeading action={<SideAdd to="/hive/p/new" label="New project" />}>Projects</SideHeading>
          {projects
            .filter((p) => !s || p.name.toLowerCase().includes(s) || (tasksBy.get(p.id) ?? []).some((t) => t.title.toLowerCase().includes(s)))
            .map((p) => {
              const tasks = (tasksBy.get(p.id) ?? []).filter((t) => !s || t.title.toLowerCase().includes(s) || p.name.toLowerCase().includes(s))
              const isOpen = open[p.id] ?? p.id === projectId
              const working = live.filter((a) => a.projectId === p.id).length
              return (
                <div key={p.id} className="mb-0.5">
                  <div className={cn('group flex items-center rounded-lg pr-1', p.id === projectId && !taskId && 'bg-text-primary/[0.07]')}>
                    <button type="button" onClick={() => toggle(p.id)} className="grid size-6 shrink-0 place-items-center text-text-muted" aria-label={isOpen ? 'Collapse' : 'Expand'}>
                      <ChevronRight className={cn('size-3.5 transition-transform', isOpen && 'rotate-90')} />
                    </button>
                    <button type="button" onClick={() => navigate(`/hive/p/${p.id}`)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
                      <span className="hive-hex size-3 shrink-0" style={{ background: projectColor(p.color) }} />
                      <span className="truncate text-[13px] text-text-primary">{p.name}</span>
                      {p.machine_id && <Terminal className="size-3 shrink-0 text-text-muted" aria-label="On a machine" />}
                    </button>
                    {working > 0 && (
                      <span className="mr-1 inline-flex items-center gap-1 text-[10.5px] text-accent-brand">
                        <span className="hive-dot-run size-1.5 rounded-full bg-accent-brand" />
                        {working}
                      </span>
                    )}
                    <Tooltip label="New session">
                      <button type="button" onClick={() => navigate(`/hive/p/${p.id}`)} className="grid size-6 place-items-center rounded-md text-text-muted opacity-0 hover:bg-text-primary/10 hover:text-text-primary group-hover:opacity-100" aria-label="New session">
                        <Plus className="size-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                        <div className="ml-[11px] border-l hive-line pl-2">
                          {tasks.slice(0, 8).map((t) => (
                            <button key={t.id} type="button" onClick={() => navigate(`/hive/p/${p.id}/t/${t.id}`)} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1 text-left', t.id === taskId ? 'bg-accent-brand/10 text-text-primary' : 'text-text-secondary hover:bg-text-primary/[0.05]')}>
                              <StatusDot status={t.status} className="size-1.5" />
                              <span className="min-w-0 flex-1 truncate text-[12.5px]">{t.title}</span>
                              <span className="shrink-0 text-[10.5px] text-text-muted">{timeAgo(t.updated_at)}</span>
                            </button>
                          ))}
                          {!tasks.length && <div className="px-2 py-1 text-[11.5px] text-text-muted">No sessions yet</div>}
                          {tasks.length > 8 && (
                            <button type="button" onClick={() => navigate(`/hive/p/${p.id}`)} className="px-2 py-1 text-[11.5px] text-text-muted hover:text-text-primary">
                              All {tasks.length} sessions →
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          {!projects.length && (
            <Link to="/hive/nexora" className="mx-1 mt-1 flex items-center gap-2 rounded-lg border border-dashed hive-line px-2.5 py-2 text-[12px] text-text-muted hover:text-text-primary">
              <Plus className="size-3.5" /> Set up your first project
            </Link>
          )}

          <SideHeading action={<SideAdd to="/hive/chat" label="New chat" />}>Chats</SideHeading>
          {convos
            .filter((c) => !s || c.title.toLowerCase().includes(s))
            .slice(0, 40)
            .map((c) => (
              <button key={c.id} type="button" onClick={() => navigate(`/hive/chat/${c.id}`)} className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left', c.id === convoId ? 'bg-text-primary/[0.08] text-text-primary' : 'text-text-secondary hover:bg-text-primary/[0.05]')}>
                <span className="min-w-0 flex-1 truncate text-[12.5px]">{c.title}</span>
                {!!c.shared && <Users className="size-3 shrink-0 text-text-muted" />}
                <span className="shrink-0 text-[10.5px] text-text-muted">{timeAgo(c.updated_at)}</span>
              </button>
            ))}
          {!convos.length && <div className="px-2.5 py-1 text-[11.5px] text-text-muted">Your chats appear here.</div>}
        </nav>
        <Link to="/hive/nexora" className="m-2 flex items-center gap-2.5 rounded-xl border hive-line bg-text-primary/[0.03] px-3 py-2.5 transition-colors hover:bg-text-primary/[0.06]">
          <LogoMark size={20} />
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-medium">Build NexoraGuru</span>
            <span className="block truncate text-[11px] text-text-muted">Step-by-step: code → PR → live site</span>
          </span>
          <ChevronRight className="size-3.5 text-text-muted" />
        </Link>
      </aside>
      <div className="hive-resizer" onPointerDown={onDrag} role="separator" aria-orientation="vertical" aria-label="Resize sidebar" />
    </div>
  )
}

/** Every part of Hive, grouped and always visible in the sidebar. Groups fold; the choice is remembered. */
function NavSections({ filter = '' }: { filter?: string }) {
  const { sections } = useNav()
  const { pathname } = useLocation()
  const [closed, setClosed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(store.get('hive:navClosed', '{}'))
    } catch {
      return {}
    }
  })
  const flip = (t: string) =>
    setClosed((c) => {
      const n = { ...c, [t]: !c[t] }
      store.set('hive:navClosed', JSON.stringify(n))
      return n
    })
  return (
    <div className="pt-1">
      {sections.map((g) => {
        const items = g.items.filter((it) => !filter || `${it.label} ${it.hint ?? ''}`.toLowerCase().includes(filter))
        if (!items.length) return null
        const shut = !filter && closed[g.title]
        return (
          <div key={g.title} className="mb-1">
            <button type="button" onClick={() => flip(g.title)} className="group mb-0.5 mt-2 flex w-full items-center px-2.5 text-left" aria-expanded={!shut}>
              <span className="flex-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted group-hover:text-text-secondary">{g.title}</span>
              <ChevronRight className={cn('size-3 text-text-muted transition-transform', !shut && 'rotate-90')} />
            </button>
            {!shut &&
              items.map((it) => {
                const forced = it.match ? it.match.test(pathname) : undefined
                return (
                  <NavLink key={it.label} to={it.to} end={it.end} title={it.hint} className="block">
                    {({ isActive }) => {
                      const on = forced ?? isActive
                      return (
                        <span className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors', on ? 'bg-accent-brand/10 font-medium text-text-primary' : 'text-text-secondary hover:bg-text-primary/[0.05] hover:text-text-primary')}>
                          <it.icon className={cn('size-4 shrink-0', on ? 'text-accent-brand' : 'text-text-muted')} strokeWidth={1.9} />
                          <span className="min-w-0 flex-1 truncate">{it.label}</span>
                          {it.badge ? (
                            <span className="grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: it.tone }}>
                              {it.badge}
                            </span>
                          ) : it.tone ? (
                            <span className="size-1.5 rounded-full" style={{ background: it.tone }} />
                          ) : null}
                        </span>
                      )
                    }}
                  </NavLink>
                )
              })}
          </div>
        )
      })}
    </div>
  )
}

function SideHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="group mb-1 mt-3 flex items-center px-2.5">
      <span className="flex-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">{children}</span>
      {action}
    </div>
  )
}

function SideAdd({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate()
  return (
    <Tooltip label={label}>
      <button type="button" onClick={() => navigate(to)} className="grid size-5 place-items-center rounded text-text-muted opacity-0 hover:bg-text-primary/10 hover:text-text-primary group-hover:opacity-100" aria-label={label}>
        <Plus className="size-3.5" />
      </button>
    </Tooltip>
  )
}

/* ── Top bar: breadcrumbs + live state ─────────────────────────────────── */
function TopBar({ side, onToggleSide, onMobileNav, onPalette, onTeam }: { side: boolean; onToggleSide: () => void; onMobileNav: () => void; onPalette: () => void; onTeam: () => void }) {
  const { project, detail, online, connected, live, approvals } = useHive()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const section = useMemo(() => {
    const m = /^\/hive\/([^/]+)/.exec(pathname)?.[1]
    return { chat: 'Chat', launchpad: 'Launchpad', machines: 'Machines', models: 'Models', keys: 'Keys', usage: 'Usage', memory: 'Memory', plugins: 'Plugins', nexora: 'Build NexoraGuru', drive: 'Drive', budgets: 'Budgets', automations: 'Automations', pipelines: 'Pipelines', toolbox: 'Toolbox', steward: 'Token Steward', dispatch: 'Dispatcher', health: 'Agent health', copilot: 'Copilot' }[m ?? ''] ?? null
  }, [pathname])
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b hive-line px-2 sm:px-3">
      <button type="button" onClick={onMobileNav} className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.06] md:hidden" aria-label="Menu">
        <MenuIcon className="size-4" />
      </button>
      <Tooltip label={`${side ? 'Hide' : 'Show'} sidebar · ⌘B`}>
        <button type="button" onClick={onToggleSide} className="hidden size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary lg:grid" aria-label="Toggle sidebar">
          {side ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
        </button>
      </Tooltip>
      <nav className="flex min-w-0 flex-1 items-center gap-1 text-[13px]" aria-label="Breadcrumb">
        <Link to="/hive" className="flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-text-secondary hover:text-text-primary">
          <HiveLogo size={16} /> Hive
        </Link>
        {section && (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-text-muted" />
            <span className="truncate px-1.5 font-medium text-text-primary">{section}</span>
          </>
        )}
        {project && (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-text-muted" />
            <button type="button" onClick={() => navigate(`/hive/p/${project.id}`)} className={cn('flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-text-primary/[0.05]', detail ? 'text-text-secondary' : 'font-medium text-text-primary')}>
              <span className="hive-hex size-2.5 shrink-0" style={{ background: projectColor(project.color) }} />
              <span className="truncate">{project.name}</span>
            </button>
          </>
        )}
        {detail && project && (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-text-muted" />
            <span className="flex min-w-0 items-center gap-1.5 px-1.5 font-medium text-text-primary">
              <StatusDot status={detail.task.status} className="size-1.5" />
              <span className="truncate">{detail.task.title}</span>
            </span>
          </>
        )}
      </nav>
      {approvals.length > 0 && (
        <button type="button" onClick={() => navigate('/hive/machines')} className="hidden items-center gap-1.5 rounded-full bg-state-warning/15 px-2.5 py-1 text-[12px] font-medium text-state-warning sm:inline-flex">
          <ShieldAlert className="size-3.5" /> {approvals.length} waiting
        </button>
      )}
      {live.length > 0 && (
        <span className="hidden items-center gap-1.5 rounded-full bg-accent-brand/10 px-2.5 py-1 text-[12px] font-medium text-accent-brand md:inline-flex">
          <span className="hive-dot-run size-1.5 rounded-full bg-accent-brand" /> {live.length} agent{live.length === 1 ? '' : 's'} working
        </span>
      )}
      <AlertsBell />
      <button type="button" onClick={onTeam} className="flex items-center -space-x-1.5 px-1" aria-label="Who's online">
        {online.slice(0, 4).map((o) => (
          <UserDot key={o.username} username={o.username} size={6} ring />
        ))}
      </button>
      <Tooltip label={connected ? 'Live — updates stream in real time' : 'Reconnecting…'}>
        <span className={cn('size-2 rounded-full', connected ? 'bg-state-success' : 'hive-dot-run bg-state-warning')} />
      </Tooltip>
      <button type="button" onClick={onPalette} className="ml-1 hidden h-8 items-center gap-2 rounded-lg border hive-line px-2.5 text-[12.5px] text-text-muted hover:bg-text-primary/[0.05] hover:text-text-primary sm:flex">
        <Search className="size-3.5" /> Search or run a command <span className="hive-kbd">⌘K</span>
      </button>
    </header>
  )
}

/* ── Approvals: commands agents want to run, answered from anywhere ───── */
function ApprovalsTray() {
  const { approvals, answerApproval, boot } = useHive()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [min, setMin] = useState(false)
  // Pages that already show approvals inline don't need the floating tray.
  if (!approvals.length || pathname === '/hive' || pathname.startsWith('/hive/machines') || /\/t\/[^/]+/.test(pathname)) return null
  const a = approvals[approvals.length - 1]
  const projectName = (id?: string) => boot?.projects.find((p) => p.id === id)?.name
  if (min)
    return (
      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} type="button" onClick={() => setMin(false)} className="fixed right-4 top-14 z-[950] inline-flex items-center gap-2 rounded-full bg-state-warning px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-xl">
        <ShieldAlert className="size-4" /> {approvals.length} command{approvals.length === 1 ? '' : 's'} waiting
      </motion.button>
    )
  return (
    <div className="fixed right-4 top-14 z-[950] w-[min(400px,calc(100vw-32px))]">
      <AnimatePresence mode="popLayout">
        <motion.div key={a.id} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }} className="hive-card overflow-hidden shadow-2xl ring-1 ring-state-warning/30">
          <div className="flex items-center gap-2 border-b hive-line bg-state-warning/[0.08] px-3.5 py-2">
            <ShieldAlert className="size-4 text-state-warning" />
            <span className="min-w-0 flex-1 truncate text-[12.5px]">
              <span className="font-semibold">{a.agent ?? 'An agent'}</span> wants to {a.kind === 'server' ? 'start a server' : 'run a command'}
            </span>
            {approvals.length > 1 && <span className="rounded-full bg-state-warning/20 px-1.5 text-[11px] font-semibold text-state-warning">+{approvals.length - 1}</span>}
            <button type="button" onClick={() => setMin(true)} className="grid size-6 place-items-center rounded-md text-text-muted hover:bg-text-primary/[0.07]" aria-label="Minimise">
              <X className="size-3.5" />
            </button>
          </div>
          <div className="px-3.5 py-3">
            <pre className="hive-term max-h-28 overflow-auto rounded-lg px-3 py-2 text-[12px]">$ {a.command}</pre>
            <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-text-muted">
              <Server className="size-3" /> {a.machine} · <span className="truncate font-mono">{a.folder}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={() => answerApproval(a.id, true)} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-state-success text-[12.5px] font-medium text-white hover:brightness-110">
                <Check className="size-3.5" /> Run it
              </button>
              <button type="button" onClick={() => answerApproval(a.id, false)} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-text-primary/[0.07] text-[12.5px] font-medium hover:bg-state-error/15 hover:text-state-error">
                <X className="size-3.5" /> Deny
              </button>
              {a.taskId && a.projectId && (
                <button type="button" onClick={() => navigate(`/hive/p/${a.projectId}/t/${a.taskId}`)} className="h-8 rounded-lg px-2.5 text-[12px] text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" title={projectName(a.projectId)}>
                  Open
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ── Team drawer (presence + staff chat) ───────────────────────────────── */
function TeamDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { boot, online, select } = useHive()
  if (!boot) return null
  const onlineSet = new Map(online.map((o) => [o.username, o]))
  const nameOf = (id: string | null | undefined) => boot.projects.find((p) => p.id === id)?.name
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[900] flex justify-end" role="dialog" aria-label="Team">
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="button" className="absolute inset-0 bg-bg-app/50 backdrop-blur-[2px]" onClick={onClose} aria-label="Close" />
          <motion.aside initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }} className="relative flex h-full w-full max-w-[420px] flex-col border-l hive-line bg-bg-surface shadow-2xl">
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
              <TeamChat />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ── Command palette: jump anywhere, or run an action ──────────────────── */
type PaletteItem = { id: string; group: string; label: string; hint?: string; icon?: ReactNode; run: () => void; keys?: string }

function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { boot, taskIndex } = useHive()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const [convos, setConvos] = useState<Convo[]>([])
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (!open) return
    setQ('')
    setI(0)
    hiveApi
      .convos()
      .then((r) => setConvos(r.convos))
      .catch(() => {})
  }, [open])
  const go = (to: string) => () => navigate(to)
  const items = useMemo(() => {
    const out: PaletteItem[] = [
      { id: 'a:chat', group: 'Actions', label: 'New chat', hint: 'Any model, files, images', icon: <MessageSquare className="size-4" />, run: go('/hive/chat'), keys: '⌘J' },
      { id: 'a:idea', group: 'Actions', label: 'New idea → project', hint: 'Plan, repo, first milestone', icon: <Lightbulb className="size-4" />, run: go('/hive/launchpad'), keys: '⌘⇧I' },
      { id: 'a:nexora', group: 'Actions', label: 'Work on NexoraGuru', hint: 'Guided: code → PR → live site', icon: <LogoMark size={16} />, run: go('/hive/nexora') },
      { id: 'a:machine', group: 'Actions', label: 'Connect a machine', hint: 'Run commands, tests and servers', icon: <Server className="size-4" />, run: go('/hive/machines') },
      { id: 'a:key', group: 'Actions', label: 'Add AI keys', hint: 'One or many per provider', icon: <KeyRound className="size-4" />, run: go('/hive/keys') },
      { id: 'a:radar', group: 'Actions', label: "What's new in AI models", icon: <Radar className="size-4" />, run: go('/hive/models') },
      { id: 'n:home', group: 'Go to', label: 'Mission control', icon: <Home className="size-4" />, run: go('/hive') },
      { id: 'n:memory', group: 'Go to', label: 'Memory', icon: <Brain className="size-4" />, run: go('/hive/memory') },
      { id: 'n:plugins', group: 'Go to', label: 'Plugins', icon: <Puzzle className="size-4" />, run: go('/hive/plugins') },
      { id: 'n:usage', group: 'Go to', label: 'Usage', icon: <BarChart3 className="size-4" />, run: go('/hive/usage') },
      { id: 'a:copilot', group: 'Actions', label: 'Ask the Copilot', hint: '⌘I · it plans, delegates and reviews', icon: <Bot className="size-4" />, run: go('/hive/copilot') },
      { id: 'a:dispatch', group: 'Actions', label: 'Dispatch a team of agents', hint: 'Right model per part', icon: <Network className="size-4" />, run: go('/hive/dispatch') },
      { id: 'n:health', group: 'Go to', label: 'Agent health', icon: <HeartPulse className="size-4" />, run: go('/hive/health') },
      { id: 'a:pipeline', group: 'Actions', label: 'Design a pipeline with the Architect', hint: 'Many agents, one flow', icon: <Workflow className="size-4" />, run: go('/hive/pipelines') },
      { id: 'a:automation', group: 'Actions', label: 'Automate something overnight', icon: <Clock3 className="size-4" />, run: go('/hive/automations') },
      { id: 'a:mcp', group: 'Actions', label: 'Connect an MCP server or search engine', icon: <Boxes className="size-4" />, run: go('/hive/toolbox?tab=connected') },
      { id: 'a:steward', group: 'Actions', label: 'Ask the Token Steward', hint: 'Where to save', icon: <PiggyBank className="size-4" />, run: go('/hive/steward') },
      { id: 'n:drive', group: 'Go to', label: 'Drive', icon: <HardDrive className="size-4" />, run: go('/hive/drive') },
      { id: 'n:toolbox', group: 'Go to', label: 'Toolbox', icon: <Boxes className="size-4" />, run: go('/hive/toolbox') },
      { id: 'n:budgets', group: 'Go to', label: 'Budgets', icon: <Wallet className="size-4" />, run: go('/hive/budgets') },
      { id: 'n:models', group: 'Go to', label: 'Models — who does what', icon: <Radar className="size-4" />, run: go('/hive/models') },
    ]
    for (const p of boot?.projects ?? []) out.push({ id: `p:${p.id}`, group: 'Projects', label: p.name, hint: p.repo_owner ? `${p.repo_owner}/${p.repo_name}` : p.folder ?? '', icon: <span className="hive-hex size-3.5" style={{ background: projectColor(p.color) }} />, run: go(`/hive/p/${p.id}`) })
    for (const t of Object.values(taskIndex).sort((a, b) => b.updated_at - a.updated_at)) out.push({ id: `t:${t.id}`, group: 'Sessions', label: t.title, hint: t.project_name ?? t.status, icon: <StatusDot status={t.status} />, run: go(`/hive/p/${t.project_id}/t/${t.id}`) })
    for (const c of convos) out.push({ id: `c:${c.id}`, group: 'Chats', label: c.title, hint: c.model ?? '', icon: <MessageSquare className="size-3.5 text-text-muted" />, run: go(`/hive/chat/${c.id}`) })
    const s = q.toLowerCase().trim()
    if (!s) return out.filter((x) => x.group !== 'Sessions' || out.indexOf(x) < 40).slice(0, 60)
    return out
      .map((x) => ({ x, score: fuzzy(`${x.label} ${x.hint ?? ''}`.toLowerCase(), s) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.x)
      .slice(0, 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boot, taskIndex, convos, q])
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [i])
  const pick = (x: PaletteItem) => {
    x.run()
    onClose()
  }
  let lastGroup = ''
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-label="Command palette">
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="button" className="absolute inset-0 bg-bg-app/60 backdrop-blur-[3px]" onClick={onClose} aria-label="Close" />
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.16 }} className="hive-card relative w-full max-w-[640px] overflow-hidden shadow-2xl">
            <label className="flex items-center gap-3 border-b hive-line px-4">
              <Command className="size-4 text-text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setI(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') (e.preventDefault(), setI((x) => Math.min(items.length - 1, x + 1)))
                  else if (e.key === 'ArrowUp') (e.preventDefault(), setI((x) => Math.max(0, x - 1)))
                  else if (e.key === 'Enter' && items[i]) pick(items[i])
                  else if (e.key === 'Escape') onClose()
                }}
                placeholder="Search projects, sessions, chats — or run an action"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-muted"
              />
              <span className="hive-kbd">esc</span>
            </label>
            <ul ref={listRef} className="hive-scroll max-h-[min(440px,60vh)] overflow-y-auto p-2">
              {items.map((x, j) => {
                const head = x.group !== lastGroup ? (lastGroup = x.group) : null
                return (
                  <li key={x.id}>
                    {head && <div className="px-2.5 pb-1 pt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">{head}</div>}
                    <button type="button" data-i={j} onMouseMove={() => setI(j)} onClick={() => pick(x)} className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', j === i && 'bg-accent-brand/10')}>
                      <span className="grid size-6 shrink-0 place-items-center text-text-secondary">{x.icon}</span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-text-primary">{x.label}</span>
                      {x.hint && <span className="max-w-[45%] shrink-0 truncate text-[11.5px] text-text-muted">{x.hint}</span>}
                      {x.keys && <span className="hive-kbd">{x.keys}</span>}
                      {j === i && <CornerDownLeft className="size-3.5 text-text-muted" />}
                    </button>
                  </li>
                )
              })}
              {!items.length && <li className="p-6 text-center text-[13px] text-text-muted">Nothing matches “{q}”.</li>}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/** Subsequence fuzzy score: contiguous and word-start matches rank higher. */
function fuzzy(text: string, q: string): number {
  if (text.includes(q)) return 100 - text.indexOf(q)
  let ti = 0
  let score = 0
  for (const c of q) {
    const at = text.indexOf(c, ti)
    if (at < 0) return 0
    score += at === ti ? 3 : /\s|\/|-/.test(text[at - 1] ?? ' ') ? 2 : 1
    ti = at + 1
  }
  return score
}

/* ── Mobile navigation ──────────────────────────────────────────────────── */
function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { main, config } = useNav()
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[900] md:hidden">
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="button" className="absolute inset-0 bg-bg-app/60" onClick={onClose} aria-label="Close" />
          <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="relative flex h-full w-[86vw] max-w-[340px] flex-col bg-bg-surface shadow-2xl">
            <div className="flex items-center gap-2 p-4">
              <HiveLogo size={28} />
              <span className="text-[15px] font-semibold">Hive</span>
              <button type="button" onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-lg text-text-muted" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-0.5 px-2">
              {[...main, ...config.filter((c) => !main.includes(c))].map((it) => (
                <NavLink key={it.label} to={it.to} end={it.end} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px]', isActive ? 'bg-accent-brand/12 text-accent-brand' : 'text-text-secondary')}>
                  <it.icon className="size-4" /> {it.label}
                  {it.badge ? <span className="ml-auto rounded-full bg-state-warning px-1.5 text-[11px] text-white">{it.badge}</span> : null}
                </NavLink>
              ))}
            </div>
            <div className="mt-2 min-h-0 flex-1 border-t hive-line">
              <Sidebar />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
