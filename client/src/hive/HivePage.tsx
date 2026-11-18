import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Settings2,
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
  ChevronDown,
  ChevronRight,
  Command,
  CornerDownLeft,
  FolderGit2,
  Home,
  Inbox as InboxIcon,
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
  TriangleAlert,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { CopilotMark as Bot } from './marks'
import { LogoMark } from '@/components/brand/Logo'
import { Highlight, Menu, MenuContent, MenuItem, MenuTrigger, Tooltip } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { TeamChat } from './TeamChat'
import { InboxBell } from './Inbox'
import { Panel, PanelGroup, PanelSeparator, Skeleton, transitionTo, useDensity, useMedia, useNavFade } from './kit'
import type { LaunchGroup } from './Launcher'
import { CopilotDock } from './Copilot'
import { HiveLogo } from './HiveLogo'
import { projectColor } from './projectColor'
import { ModelsAtWork, ProjectSwitcher } from './Showcase'
import { Go, Sectioned } from './Sections'
import { ShortcutSheet, useShortcuts } from './Shortcuts'
import { HiveProvider, useHive } from './store'
import type { Convo } from './types'
import { StatusDot, UserDot, timeAgo } from './ui'
import { riskyCommand } from './commandRisk'
import './hive.css'
import './kit/kit.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const InboxPage = lazy(() => import('./pages/InboxPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const PluginsPage = lazy(() => import('./pages/PluginsPage'))
const KeysPage = lazy(() => import('./pages/KeysPage'))
const UsagePage = lazy(() => import('./pages/UsagePage'))
const MemoryPage = lazy(() => import('./pages/MemoryPage'))
const LaunchpadPage = lazy(() => import('./pages/LaunchpadPage'))
const MachinesPage = lazy(() => import('./pages/MachinesPage'))
const MachineTerminalPage = lazy(() => import('./pages/MachineTerminalPage'))
const ModelsPage = lazy(() => import('./pages/ModelsPage'))
const NexoraGuide = lazy(() => import('./pages/NexoraGuide'))
const DrivePage = lazy(() => import('./pages/DrivePage'))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'))
const AutomationsPage = lazy(() => import('./pages/AutomationsPage'))
const PipelinesPage = lazy(() => import('./pages/PipelinesPage'))
const ToolboxPage = lazy(() => import('./pages/ToolboxPage'))
const StewardPage = lazy(() => import('./pages/StewardPage'))
const HealthPage = lazy(() => import('./pages/HealthPage'))
// Development-only gallery of the Hive kit (not routed in production builds).
const DevUiPage = import.meta.env.DEV ? lazy(() => import('./pages/DevUiPage')) : null
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
    (p: string | null, t?: string | null, opts?: { viewTransition?: boolean }) => {
      if (p) store.set('hive:lastProject', p)
      const url = p ? (t ? `/hive/p/${p}/t/${t}` : `/hive/p/${p}`) : '/hive'
      if (opts?.viewTransition) transitionTo(() => navigate(url), t ? '[data-vt-session]' : undefined)
      else navigate(url)
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
  const density = useDensity()
  const [palette, setPalette] = useState(false)
  const [team, setTeam] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { pathname } = location
  // Route swaps cross-fade through the native View Transitions API where
  // available; reduced-motion users and older browsers get an instant swap.
  const [displayLocation, setDisplayLocation] = useState(location)
  useEffect(() => {
    if (location.key === displayLocation.key) return
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (doc.startViewTransition && !reduce) doc.startViewTransition(() => flushSync(() => setDisplayLocation(location)))
    else {
      const t = window.setTimeout(() => setDisplayLocation(location), 0)
      return () => window.clearTimeout(t)
    }
  }, [location, displayLocation])
  // Sessions need the width: the workspace sidebar has its own (default hidden) setting there.
  const inSession = /^\/hive\/p\/[^/]+\/t\//.test(pathname)
  const sideKey = inSession ? 'hive:sideSession' : 'hive:side'
  const [sides, setSides] = useState(() => ({ 'hive:side': store.get('hive:side', '1') === '1', 'hive:sideSession': store.get('hive:sideSession', '0') === '1' }))
  const side = sides[sideKey]
  const lgUp = useMedia('(min-width: 1024px)')
  const sideW = useMemo(() => Number(store.get('hive:sideW', '272')) || 272, [])
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
        setPalette((p) => !p)
      } else if (k === 'b') {
        e.preventDefault()
        toggleRef.current()
      } else if (k === 'j') {
        e.preventDefault()
        navigate('/hive/chat')
      } else if (k === 'i' && e.shiftKey) {
        e.preventDefault()
        navigate('/hive/projects/ideas')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
  // Single-key shortcuts (never while typing; can be switched off in the shortcut sheet).
  const [sheet, setSheet] = useState(false)
  useShortcuts({ onPalette: () => setPalette(true), onSheet: () => setSheet((v) => !v), onToggleSide: () => toggleRef.current() })
  useEffect(() => {
    const side = () => toggleRef.current()
    const keys = () => setSheet(true)
    window.addEventListener('hive:toggle-side', side)
    window.addEventListener('hive:shortcuts', keys)
    return () => {
      window.removeEventListener('hive:toggle-side', side)
      window.removeEventListener('hive:shortcuts', keys)
    }
  }, [])
  const toggleRef = useRef(() => {})
  toggleRef.current = () => setSide((s) => !s)

  if (loading && !boot) {
    return (
      <div className="hive-root grid h-dvh place-items-center" role="status" aria-label="Loading Hive">
        <div className="flex flex-col items-center gap-5">
          <HiveLogo size={40} draw />
          <span className="hive-boot-word font-serif text-[15px] italic text-text-muted">Waking the hive…</span>
          <span className="hive-boot-bar" aria-hidden="true">
            <span />
          </span>
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

  const mainCol = (
    <div className="flex h-full min-w-0 flex-1 flex-col">
    <TopBar side={side} onToggleSide={toggleSide} onMobileNav={() => setMobileNav(true)} onPalette={() => setPalette(true)} onTeam={() => setTeam(true)} />
    <main className="hive-main hive-scroll relative min-h-0 flex-1 overflow-y-auto">
      <Suspense fallback={<PageSkeleton />}>
        <Routes location={displayLocation}>
          <Route index element={<HomePage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="p/:projectId/*" element={<ProjectPage />} />
          <Route path="chat/:convoId?" element={<ChatPage />} />
          <Route path="copilot" element={<CopilotPage />} />
          {/* Work */}
          <Route path="projects/ideas/:ideaId" element={<ProjectsSection active="ideas" />} />
          <Route path="projects/*" element={<ProjectsSection />} />
          <Route path="pipelines/*" element={<Sectioned base="pipelines" label="Pipelines" tabs={[{ id: 'all', label: 'Pipelines', element: <PipelinesPage /> }, { id: 'schedules', label: 'Schedules', element: <AutomationsPage /> }]} />} />
          {/* Resources */}
          <Route path="machines" element={<MachinesPage />} />
          <Route path="machines/:machineId/terminal" element={<MachineTerminalPage />} />
          <Route path="drive" element={<DrivePage />} />
          {/* AI setup */}
          <Route path="models/*" element={<Sectioned base="models" label="Models" tabs={[{ id: 'catalogue', label: 'Catalogue', element: <ModelsPage /> }, { id: 'health', label: 'Health', element: <HealthPage /> }]} />} />
          <Route path="keys" element={<KeysPage />} />
          <Route path="extensions/*" element={<Sectioned base="extensions" label="Extensions" tabs={[{ id: 'toolbox', label: 'Toolbox', element: <ToolboxPage /> }, { id: 'plugins', label: 'Plugins', element: <PluginsPage /> }, { id: 'memory', label: 'Memory', element: <MemoryPage /> }]} />} />
          {/* Spend */}
          <Route path="spend/*" element={<Sectioned base="spend" label="Spend" tabs={[{ id: 'overview', label: 'Overview', element: <UsagePage /> }, { id: 'budgets', label: 'Budgets', element: <BudgetsPage /> }, { id: 'savings', label: 'Savings', element: <StewardPage /> }]} />} />
          {/* Old addresses → their new homes (query and hash kept) */}
          <Route path="repos" element={<Go to="/hive/projects" />} />
          <Route path="launchpad/:ideaId" element={<Go to="/hive/projects/ideas/:ideaId" />} />
          <Route path="launchpad" element={<Go to="/hive/projects/ideas" />} />
          <Route path="nexora" element={<Go to="/hive/projects/guide" />} />
          <Route path="dispatch" element={<Go to="/hive/copilot?mode=team" />} />
          <Route path="automations" element={<Go to="/hive/pipelines/schedules" />} />
          <Route path="health" element={<Go to="/hive/models/health" />} />
          <Route path="toolbox" element={<Go to="/hive/extensions" />} />
          <Route path="plugins" element={<Go to="/hive/extensions/plugins" />} />
          <Route path="memory" element={<Go to="/hive/extensions/memory" />} />
          <Route path="usage" element={<Go to="/hive/spend" />} />
          <Route path="budgets" element={<Go to="/hive/spend/budgets" />} />
          <Route path="steward" element={<Go to="/hive/spend/savings" />} />
          {DevUiPage && <Route path="dev/ui" element={<DevUiPage />} />}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Suspense>
    </main>
    <MobileTabs />
    </div>
  )

  return (
    <div className="hive-root flex h-dvh overflow-hidden text-text-primary" data-density={density}>
      <ActivityBar onTeam={() => setTeam(true)} onPalette={() => setPalette(true)} withSidebar={side} />
      {side && lgUp ? (
        <PanelGroup key="hive-shell" id="hive-shell" panelIds={["side", "main"]}>
          <Panel id="side" minSize={220} maxSize={420} defaultSize={sideW} className="min-w-0">
            <Sidebar />
          </Panel>
          <PanelSeparator label="Resize sidebar" />
          <Panel id="main" minSize="40%" className="min-w-0">
            {mainCol}
          </Panel>
        </PanelGroup>
      ) : (
        mainCol
      )}
      <ApprovalsTray />
      <CopilotDock />
      <TeamDrawer open={team} onClose={() => setTeam(false)} />
      <Palette open={palette} onClose={() => setPalette(false)} />
      <MobileNav open={mobileNav} onClose={() => setMobileNav(false)} />
      <ShortcutSheet open={sheet} onClose={() => setSheet(false)} />
    </div>
  )
}

/** Projects: every repo (some already projects), ideas that become projects, and the NexoraGuru guide. */
function ProjectsSection({ active }: { active?: string }) {
  return (
    <Sectioned
      base="projects"
      label="Projects"
      active={active}
      tabs={[
        { id: 'repos', label: 'All projects', element: <ReposPage /> },
        { id: 'ideas', label: 'Ideas', element: <LaunchpadPage /> },
        { id: 'guide', label: 'NexoraGuru guide', element: <NexoraGuide /> },
      ]}
    />
  )
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-8" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="ml-auto h-8 w-24" />
      </div>
      <Skeleton className="h-36 w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  )
}

/* ── Activity bar ─────────────────────────────────────────────────────── */
type NavItem = { to: string; label: string; icon: typeof Home; end?: boolean; match?: RegExp; badge?: number; tone?: string; hint?: string }

function useNav(): { main: NavItem[]; config: NavItem[]; rail: NavItem[]; groups: LaunchGroup[]; sections: { title: string; items: NavItem[] }[] } {
  const { machines, approvals } = useHive()
  const online = machines.filter((m) => m.online).length
  // One place for every destination. Old names stay searchable in ⌘K (see PALETTE_SYNONYMS).
  const I = {
    home: { to: '/hive', label: 'Home', icon: Home, end: true, hint: 'What is running and what needs you' },
    inbox: { to: '/hive/inbox', label: 'Inbox', icon: InboxIcon, hint: 'What needs you, and every alert' },
    copilot: { to: '/hive/copilot', label: 'Copilot', icon: Bot, hint: 'Plans, delegates and reports back · also "Plan a team"' },
    chat: { to: '/hive/chat', label: 'Chat', icon: MessageSquare, hint: 'Any model, files, images, side by side' },
    projects: { to: '/hive/projects', label: 'Projects', icon: FolderGit2, match: /^\/hive\/(projects|p\/)/, hint: 'Every repository, ideas and the NexoraGuru guide' },
    pipelines: { to: '/hive/pipelines', label: 'Pipelines', icon: Workflow, hint: 'Relay teams of agents, and schedules' },
    machines: { to: '/hive/machines', label: 'Machines', icon: Server, badge: approvals.length || undefined, tone: approvals.length ? 'var(--color-state-warning)' : undefined, hint: `${online} online · commands, tests, servers` },
    drive: { to: '/hive/drive', label: 'Drive', icon: HardDrive, hint: 'Files the whole team and every agent can use' },
    models: { to: '/hive/models', label: 'Models', icon: Radar, hint: 'Who does what, and who is up' },
    keys: { to: '/hive/keys', label: 'Keys & limits', icon: KeyRound, hint: 'AI accounts, plans, free models, GitHub' },
    extensions: { to: '/hive/extensions', label: 'Extensions', icon: Puzzle, hint: 'Tools, plugins and shared memory' },
    spend: { to: '/hive/spend', label: 'Spend', icon: Wallet, hint: 'Tokens, money, budgets and savings' },
  } satisfies Record<string, NavItem>
  const H = (it: NavItem, hue: number) => ({ to: it.to, label: it.label, icon: it.icon, hint: it.hint, hue, badge: it.badge })
  const sections: { title: string; blurb: string; items: [NavItem, number][] }[] = [
    { title: '', blurb: '', items: [[I.home, 255], [I.inbox, 25]] },
    { title: 'Work', blurb: 'Ask, build and run teams of agents', items: [[I.copilot, 285], [I.chat, 230], [I.projects, 200], [I.pipelines, 330]] },
    { title: 'Resources', blurb: 'Machines and files', items: [[I.machines, 140], [I.drive, 45]] },
    { title: 'AI setup', blurb: 'Models, accounts and extensions', items: [[I.models, 210], [I.keys, 60], [I.extensions, 290]] },
    { title: 'Spend', blurb: 'Tokens, money and savings', items: [[I.spend, 95]] },
  ]
  const all = sections.flatMap((g) => g.items.map(([it]) => it))
  return {
    main: all,
    config: [],
    rail: all,
    groups: sections.map((g) => ({ title: g.title || 'Home', blurb: g.blurb, items: g.items.map(([it, hue]) => H(it, hue)) })),
    sections: sections.map((g) => ({ title: g.title, items: g.items.map(([it]) => it) })),
  }
}

function ActivityBar({ onTeam, onPalette, withSidebar }: { onTeam: () => void; onPalette: () => void; withSidebar: boolean }) {
  const { online, live } = useHive()
  const { rail } = useNav()
  // Collapsed: hovering the rail opens the full labelled sidebar as an overlay.
  const [peek, setPeek] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const enter = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPeek(true), 180)
  }
  const leave = () => {
    window.clearTimeout(timer.current)
    setPeek(false)
  }
  return (
    <>
      <nav onMouseEnter={enter} onMouseLeave={leave} className={cn('hive-rail hidden w-[56px] shrink-0 flex-col items-center border-r hive-line py-3 md:flex', withSidebar && 'lg:hidden')} aria-label="Hive">
        <Link to="/hive" className="mb-3 grid size-10 place-items-center rounded-xl" aria-label="Hive home">
          <HiveLogo size={28} live={live.length > 0} />
        </Link>
        <button type="button" onClick={onPalette} className="mb-2 grid size-9 place-items-center rounded-[var(--hv-r-btn)] text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="Search or run a command (⌘K)">
          <Search className="size-[17px]" strokeWidth={1.8} />
        </button>
        <div className="hive-scroll flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto">
          {rail.map((it) => (
            <RailLink key={it.label} it={it} />
          ))}
        </div>
        <Tooltip label={`Team · ${online.length} online`} side="right">
          <button type="button" onClick={onTeam} className="relative mb-1 grid size-9 place-items-center rounded-[var(--hv-r-btn)] text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="Team">
            <Users className="size-[17px]" strokeWidth={1.8} />
            {online.length > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-state-success px-1 text-[9px] font-semibold text-on-accent-brand">{online.length}</span>}
          </button>
        </Tooltip>
        <Tooltip label="Back to NexoraGuru" side="right">
          <Link to="/hub" className="grid size-9 place-items-center rounded-[var(--hv-r-btn)] opacity-80 hover:bg-text-primary/[0.06] hover:opacity-100" aria-label="Back to NexoraGuru">
            <LogoMark size={20} />
          </Link>
        </Tooltip>
      </nav>
      {peek && (
        <div onMouseEnter={() => window.clearTimeout(timer.current)} onMouseLeave={leave} className="hv-peek fixed bottom-0 left-0 top-0 z-[850] hidden shadow-[12px_0_32px_-16px_oklch(0_0_0/0.5)] md:block">
          <div className="h-full w-[272px]">
            <Sidebar />
          </div>
        </div>
      )}
    </>
  )
}

function RailLink({ it }: { it: NavItem }) {
  const navFade = useNavFade()
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
      <NavLink to={it.to} end={it.end} aria-label={it.label} onClick={(e) => navFade(e, it.to)} className="relative">
        {({ isActive }) => {
          const on = forced ?? isActive
          return (
            <span className={cn('relative grid size-9 place-items-center rounded-[var(--hv-r-btn)] transition-colors', on ? 'text-accent-brand' : 'text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary')}>
              {on && <span className="absolute inset-0 rounded-[var(--hv-r-btn)] bg-accent-brand/12 ring-1 ring-accent-brand/25" />}
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
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(store.get('hive:sideOpen', '{}'))
    } catch {
      return {}
    }
  })
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

  return (
    <aside className="hive-side flex h-full w-full flex-col border-r hive-line">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <Link to="/hive" className="flex items-center gap-2" aria-label="Hive home">
          <HiveLogo size={24} live={live.length > 0} />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Hive</span>
        </Link>
        <span className="ml-auto">
          <NewMenu />
        </span>
      </div>
      <div className="px-3 pb-2">
        <ProjectSwitcher />
      </div>
      <div className="px-3 pb-2">
        <label className="flex h-8 items-center gap-2 rounded-lg bg-text-primary/[0.05] px-2.5 text-text-muted focus-within:bg-text-primary/[0.08] focus-within:ring-2 focus-within:ring-[var(--hv-focus-ring)]">
          <Search className="size-3.5" />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter the menu" placeholder="Filter" className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-text-muted" />
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
          <Link to="/hive/projects/guide" className="mx-1 mt-1 flex items-center gap-2 rounded-lg border border-dashed hive-line px-2.5 py-2 text-[12px] text-text-muted hover:text-text-primary">
            <Plus className="size-3.5" /> Set up your first project
          </Link>
        )}

        <SideHeading action={<SideAdd to="/hive/chat" label="New chat" />}>Recent chats</SideHeading>
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
      <SideFooter />
    </aside>
  )
}

/** Every part of Hive, grouped and always visible in the sidebar. Groups fold; the choice is remembered. */
function NavSections({ filter = '' }: { filter?: string }) {
  const navFade = useNavFade()
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
        const shut = !filter && !!g.title && closed[g.title]
        return (
          <div key={g.title || 'top'} className="mb-1">
            {g.title && (
              <button type="button" onClick={() => flip(g.title)} className="group mb-0.5 mt-1.5 flex min-h-6 w-full items-center px-2.5 text-left" aria-expanded={!shut}>
                <span className="flex-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted group-hover:text-text-secondary">{g.title}</span>
                <ChevronRight className={cn('size-3 text-text-muted transition-transform', !shut && 'rotate-90')} />
              </button>
            )}
            {!shut &&
              items.map((it) => {
                const forced = it.match ? it.match.test(pathname) : undefined
                return (
                  <NavLink key={it.label} to={it.to} end={it.end} title={it.hint} onClick={(e) => navFade(e, it.to)} className="block">
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

/** The one strong button in the sidebar: everything you can start. */
function NewMenu() {
  const navigate = useNavigate()
  return (
    <Menu>
      <MenuTrigger asChild>
        <button type="button" className="inline-flex h-7 items-center gap-1 rounded-[var(--hv-r-btn)] bg-[var(--hv-surface-2)] px-2 text-[12.5px] font-medium text-[var(--hv-text-1)] ring-1 ring-[var(--hv-border)] hover:bg-[var(--hv-surface-3)]" aria-label="New">
          <Plus className="size-3.5" /> New <ChevronDown className="size-3 text-[var(--hv-text-3)]" />
        </button>
      </MenuTrigger>
      <MenuContent align="end" className="w-56">
        <MenuItem icon={<Bot />} shortcut="C" onSelect={() => navigate('/hive/copilot')}>
          New task
        </MenuItem>
        <MenuItem icon={<MessageSquare />} shortcut="⌘J" onSelect={() => navigate('/hive/chat')}>
          New chat
        </MenuItem>
        <MenuItem icon={<FolderGit2 />} onSelect={() => navigate('/hive/projects')}>
          New project
        </MenuItem>
        <MenuItem icon={<Lightbulb />} onSelect={() => navigate('/hive/projects/ideas')}>
          From an idea
        </MenuItem>
        <MenuItem icon={<Upload />} onSelect={() => navigate('/hive/projects')}>
          Upload a folder
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

/** Plain-words system status (replaces the unlabelled dot), team, and the way back to the site. */
/** Phones: the five places people go most, always one tap away. */
function MobileTabs() {
  const { pathname } = useLocation()
  const tabs = [
    { to: '/hive', label: 'Home', icon: Home, on: pathname === '/hive' || pathname === '/hive/' },
    { to: '/hive/inbox', label: 'Inbox', icon: InboxIcon, on: pathname.startsWith('/hive/inbox') },
    { to: '/hive/copilot', label: 'Copilot', icon: Bot, on: pathname.startsWith('/hive/copilot') },
    { to: '/hive/chat', label: 'Chat', icon: MessageSquare, on: pathname.startsWith('/hive/chat') },
    { to: '/hive/projects', label: 'Projects', icon: FolderGit2, on: /^\/hive\/(projects|p\/)/.test(pathname) },
  ]
  return (
    <nav aria-label="Main" className="flex shrink-0 border-t border-[var(--hv-border)] bg-[var(--hv-bg-app)] pb-[env(safe-area-inset-bottom)] sm:hidden">
      {tabs.map((t) => (
        <Link key={t.to} to={t.to} aria-current={t.on ? 'page' : undefined} className={cn('flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px]', t.on ? 'text-[var(--hv-accent)]' : 'text-[var(--hv-text-3)]')}>
          <t.icon className="size-5" strokeWidth={t.on ? 2.2 : 1.8} />
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

function SideFooter() {
  const { boot, connected, online } = useHive()
  const now = Date.now()
  const limited = (boot?.keys ?? []).filter((k) => !k.disabled && ((k.limitUntil ?? 0) > now || k.status === 'invalid')).length
  const ok = connected && !limited
  const text = !connected ? 'Reconnecting…' : limited ? `${limited} connection${limited === 1 ? '' : 's'} limited` : 'All systems ok'
  return (
    <div className="border-t hive-line px-2 py-2">
      <Link to="/hive/models/health" className="flex items-center gap-2 rounded-[var(--hv-r-btn)] px-2.5 py-1.5 text-[12px] text-[var(--hv-text-2)] hover:bg-[var(--hv-surface-2)] hover:text-[var(--hv-text-1)]" title="Open model health">
        <span className={cn('size-1.5 shrink-0 rounded-full', !connected && 'hv-live')} style={{ background: ok ? 'var(--hv-success)' : 'var(--hv-warning)' }} aria-hidden />
        <span className="flex-1 truncate">{text}</span>
      </Link>
      <div className="flex items-center gap-1 px-1 pt-1">
        <Link to="/hub" className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--hv-r-btn)] px-1.5 py-1 text-[12px] text-[var(--hv-text-3)] hover:text-[var(--hv-text-1)]">
          <LogoMark size={16} /> <span className="truncate">Back to NexoraGuru</span>
        </Link>
        <Tooltip label="Settings">
          <Link to="/hive/settings" className="grid size-7 place-items-center rounded-[var(--hv-r-btn)] text-[var(--hv-text-3)] hover:bg-[var(--hv-surface-2)] hover:text-[var(--hv-text-1)]" aria-label="Settings">
            <Settings2 className="size-3.5" />
          </Link>
        </Tooltip>
        <span className="flex -space-x-1.5" title={`${online.length} online`}>
          {online.slice(0, 3).map((o) => (
            <UserDot key={o.username} username={o.username} size={5} ring />
          ))}
        </span>
      </div>
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
  const { project, detail, online, approvals } = useHive()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const section = useMemo(() => {
    const m = /^\/hive\/([^/]+)/.exec(pathname)?.[1]
    return { inbox: 'Inbox', settings: 'Settings', chat: 'Chat', copilot: 'Copilot', projects: 'Projects', pipelines: 'Pipelines', machines: 'Machines', drive: 'Drive', models: 'Models', keys: 'Keys & limits', extensions: 'Extensions', spend: 'Spend' }[m ?? ''] ?? null
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
      {!side && (
        <div className="hidden sm:block">
          <ProjectSwitcher />
        </div>
      )}
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
          <span className="contents sm:hidden">
            <ChevronRight className="size-3.5 shrink-0 text-text-muted" />
            <button type="button" onClick={() => navigate(`/hive/p/${project.id}`)} className={cn('flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-text-primary/[0.05]', detail ? 'text-text-secondary' : 'font-medium text-text-primary')}>
              <span className="rounded-full size-2.5 shrink-0" style={{ background: projectColor(project.color) }} />
              <span className="truncate">{project.name}</span>
            </button>
          </span>
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
      <ModelsAtWork />
      <InboxBell />
      <button type="button" onClick={onTeam} className="flex items-center -space-x-1.5 px-1" aria-label={`Team · ${online.length} online`} title={`Team · ${online.length} online`}>
        {online.slice(0, 4).map((o) => (
          <UserDot key={o.username} username={o.username} size={6} ring />
        ))}
      </button>
      <Tooltip label={<span className="inline-flex items-center gap-2">Copilot <span className="hive-kbd">⌘I</span></span>}>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('hive:copilot-panel'))} className="grid size-8 place-items-center rounded-[var(--hv-r-btn)] text-[var(--hv-text-2)] hover:bg-[var(--hv-surface-2)] hover:text-[var(--hv-text-1)]" aria-label="Open the Copilot panel (⌘I)">
          <Bot className="size-4" />
        </button>
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
            {riskyCommand(a.command) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-state-error/12 px-1.5 py-0.5 text-[10.5px] font-medium text-state-error">
                <TriangleAlert className="size-3" /> destructive
              </span>
            )}
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
              <button type="button" onClick={() => answerApproval(a.id, true)} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-state-success text-[12.5px] font-medium text-on-accent-brand hover:brightness-110">
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
type PaletteItem = { id: string; group: string; label: string; hint?: string; kw?: string; cmd?: boolean; icon?: ReactNode; run: () => void; keys?: string }

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
      // Create
      { id: 'a:task', group: 'Create', label: 'New task', hint: 'The Copilot plans, delegates and reports back', icon: <Bot className="size-4" />, run: go('/hive/copilot'), keys: 'C' },
      { id: 'a:chat', group: 'Create', label: 'New chat', hint: 'Any model, files, images', icon: <MessageSquare className="size-4" />, run: go('/hive/chat'), keys: '⌘J' },
      { id: 'a:team', group: 'Create', label: 'Plan a team', hint: 'Right model per part, review before it runs', kw: 'dispatcher dispatch', icon: <Network className="size-4" />, run: go('/hive/copilot?mode=team') },
      { id: 'a:project', group: 'Create', label: 'New project', hint: 'Add a repository or upload a folder', kw: 'repo github upload folder', icon: <FolderGit2 className="size-4" />, run: go('/hive/projects') },
      { id: 'a:idea', group: 'Create', label: 'New project from an idea', kw: 'launchpad', icon: <Lightbulb className="size-4" />, run: go('/hive/projects/ideas'), keys: '⌘⇧I' },
      // Go to: every page and tab, with old names as synonyms
      { id: 'n:home', group: 'Go to', label: 'Home', kw: 'mission control dashboard', icon: <Home className="size-4" />, run: go('/hive') },
      { id: 'n:settings', group: 'Go to', label: 'Settings', kw: 'appearance theme dark light density compact shortcuts preferences', icon: <Settings2 className="size-4" />, run: go('/hive/settings') },
      { id: 'n:inbox', group: 'Go to', label: 'Inbox', kw: 'alerts notifications approvals needs you bell', icon: <InboxIcon className="size-4" />, run: go('/hive/inbox') },
      { id: 'n:copilot', group: 'Go to', label: 'Copilot', kw: 'assistant chief of staff', icon: <Bot className="size-4" />, run: go('/hive/copilot') },
      { id: 'n:chat', group: 'Go to', label: 'Chat', icon: <MessageSquare className="size-4" />, run: go('/hive/chat') },
      { id: 'n:projects', group: 'Go to', label: 'Projects', hint: 'Work', kw: 'your github repos repositories', icon: <FolderGit2 className="size-4" />, run: go('/hive/projects') },
      { id: 'n:ideas', group: 'Go to', label: 'Projects › Ideas', kw: 'launchpad', icon: <Lightbulb className="size-4" />, run: go('/hive/projects/ideas') },
      { id: 'n:guide', group: 'Go to', label: 'Projects › NexoraGuru guide', kw: 'build nexoraguru', icon: <LogoMark size={16} />, run: go('/hive/projects/guide') },
      { id: 'n:pipelines', group: 'Go to', label: 'Pipelines', hint: 'Work', kw: 'architect relay', icon: <Workflow className="size-4" />, run: go('/hive/pipelines') },
      { id: 'n:schedules', group: 'Go to', label: 'Pipelines › Schedules', kw: 'automations cron overnight', icon: <Clock3 className="size-4" />, run: go('/hive/pipelines/schedules') },
      { id: 'n:machines', group: 'Go to', label: 'Machines', hint: 'Resources', kw: 'worker bridge terminal', icon: <Server className="size-4" />, run: go('/hive/machines') },
      { id: 'n:drive', group: 'Go to', label: 'Drive', hint: 'Resources', kw: 'files upload', icon: <HardDrive className="size-4" />, run: go('/hive/drive') },
      { id: 'n:models', group: 'Go to', label: 'Models', hint: 'AI setup', kw: 'catalogue ranking compare', icon: <Radar className="size-4" />, run: go('/hive/models') },
      { id: 'n:health', group: 'Go to', label: 'Models › Health', kw: 'agent health status cooling down', icon: <HeartPulse className="size-4" />, run: go('/hive/models/health') },
      { id: 'n:keys', group: 'Go to', label: 'Keys & limits', hint: 'AI setup', kw: 'api key provider connect claude codex vibe plans limits', icon: <KeyRound className="size-4" />, run: go('/hive/keys') },
      { id: 'n:toolbox', group: 'Go to', label: 'Extensions › Toolbox', kw: 'mcp tools search', icon: <Boxes className="size-4" />, run: go('/hive/extensions') },
      { id: 'n:plugins', group: 'Go to', label: 'Extensions › Plugins', icon: <Puzzle className="size-4" />, run: go('/hive/extensions/plugins') },
      { id: 'n:memory', group: 'Go to', label: 'Extensions › Memory', kw: 'what agents know', icon: <Brain className="size-4" />, run: go('/hive/extensions/memory') },
      { id: 'n:spend', group: 'Go to', label: 'Spend', hint: 'Spend', kw: 'usage tokens cost money', icon: <BarChart3 className="size-4" />, run: go('/hive/spend') },
      { id: 'n:budgets', group: 'Go to', label: 'Spend › Budgets', kw: 'caps alerts', icon: <Wallet className="size-4" />, run: go('/hive/spend/budgets') },
      { id: 'n:savings', group: 'Go to', label: 'Spend › Savings', kw: 'token steward', icon: <PiggyBank className="size-4" />, run: go('/hive/spend/savings') },
      // Commands
      { id: 'x:sidebar', group: 'Commands', label: 'Show or hide the sidebar', icon: <PanelLeftOpen className="size-4" />, run: () => window.dispatchEvent(new CustomEvent('hive:toggle-side')), keys: '⌘B', cmd: true },
      { id: 'x:copilot', group: 'Commands', label: 'Open the Copilot panel', icon: <Bot className="size-4" />, run: () => window.dispatchEvent(new CustomEvent('hive:copilot-panel')), keys: '⌘I', cmd: true },
      { id: 'x:shortcuts', group: 'Commands', label: 'Keyboard shortcuts', icon: <Command className="size-4" />, run: () => window.dispatchEvent(new CustomEvent('hive:shortcuts')), keys: '?', cmd: true },
      { id: 'x:test', group: 'Commands', label: 'Test every model', kw: 'verify check health', icon: <HeartPulse className="size-4" />, run: go('/hive/models/health'), cmd: true },
      { id: 'x:machine', group: 'Commands', label: 'Connect a machine', icon: <Server className="size-4" />, run: go('/hive/machines'), cmd: true },
      { id: 'x:key', group: 'Commands', label: 'Add an AI key', icon: <KeyRound className="size-4" />, run: go('/hive/keys'), cmd: true },
      { id: 'x:mcp', group: 'Commands', label: 'Connect an MCP server or search engine', icon: <Boxes className="size-4" />, run: go('/hive/extensions?tab=connected'), cmd: true },
    ]
    for (const p of boot?.projects ?? []) out.push({ id: `p:${p.id}`, group: 'Projects', label: p.name, hint: p.repo_owner ? `${p.repo_owner}/${p.repo_name}` : p.folder ?? '', icon: <span className="rounded-full size-3.5" style={{ background: projectColor(p.color) }} />, run: go(`/hive/p/${p.id}`) })
    for (const t of Object.values(taskIndex).sort((a, b) => b.updated_at - a.updated_at)) out.push({ id: `t:${t.id}`, group: 'Sessions', label: t.title, hint: t.project_name ?? t.status, icon: <StatusDot status={t.status} />, run: go(`/hive/p/${t.project_id}/t/${t.id}`) })
    for (const c of convos) out.push({ id: `c:${c.id}`, group: 'Chats', label: c.title, hint: c.model ?? '', icon: <MessageSquare className="size-3.5 text-text-muted" />, run: go(`/hive/chat/${c.id}`) })
    const raw = q.toLowerCase().trim()
    const cmdOnly = raw.startsWith('>')
    const projOnly = raw.startsWith('@')
    const s = raw.replace(/^[>@]\s*/, '')
    const pool = cmdOnly ? out.filter((x) => x.cmd) : projOnly ? out.filter((x) => x.group === 'Projects') : out
    if (!s) {
      if (cmdOnly || projOnly) return pool.slice(0, 60)
      // Empty: what you ran recently first, then recent work, then create/go.
      let recentIds: string[] = []
      try {
        recentIds = JSON.parse(localStorage.getItem('hive:paletteRecent') ?? '[]') as string[]
      } catch {
        /* private mode */
      }
      const byId = new Map(out.map((x) => [x.id, x]))
      const picked = recentIds.map((id) => byId.get(id)).filter((x): x is PaletteItem => !!x).map((x) => ({ ...x, group: 'Recent' }))
      const recent = picked.length ? picked : [...out.filter((x) => x.group === 'Sessions').slice(0, 3), ...out.filter((x) => x.group === 'Chats').slice(0, 2)].map((x) => ({ ...x, group: 'Recent' }))
      return [...recent, ...out.filter((x) => x.group === 'Create' || x.group === 'Go to')]
    }
    const hits = pool
      .map((x) => ({ x, score: fuzzy(`${x.label} ${x.hint ?? ''} ${x.kw ?? ''}`.toLowerCase(), s) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.x)
      .slice(0, 60)
    // Nothing matches: hand the words to the Copilot.
    if (!hits.length && !cmdOnly && !projOnly) hits.push({ id: 'ask', group: 'Ask', label: `Ask Copilot: “${q.trim()}”`, icon: <Bot className="size-4" />, run: () => navigate('/hive/copilot', { state: { send: q.trim() } }) })
    return hits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boot, taskIndex, convos, q])
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [i])
  const pick = (x: PaletteItem) => {
    try {
      const recent = JSON.parse(localStorage.getItem('hive:paletteRecent') ?? '[]') as string[]
      localStorage.setItem('hive:paletteRecent', JSON.stringify([x.id, ...recent.filter((r) => r !== x.id)].slice(0, 5)))
    } catch {
      /* private mode */
    }
    x.run()
    onClose()
  }
  let lastGroup = ''
  const sq = q.replace(/^[>@]\s*/, '').trim()
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
                placeholder="Search pages, projects, chats…  > for commands, @ for projects"
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
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-text-primary">{sq ? <Highlight text={x.label} query={sq} /> : x.label}</span>
                      {x.hint && <span className="max-w-[45%] shrink-0 truncate text-[11.5px] text-text-muted">{x.hint}</span>}
                      {x.keys && <span className="hive-kbd">{x.keys}</span>}
                      {j === i && <CornerDownLeft className="size-3.5 text-text-muted" />}
                    </button>
                  </li>
                )
              })}
              {!items.length && <li className="p-6 text-center text-[13px] text-text-muted">Nothing matches “{q}”.</li>}
            </ul>
            <div className="flex items-center gap-3 border-t hive-line px-4 py-2 text-[11px] text-text-muted">
              <span className="flex items-center gap-1"><span className="hive-kbd">↑</span><span className="hive-kbd">↓</span> navigate</span>
              <span className="flex items-center gap-1"><span className="hive-kbd">↵</span> open</span>
              <span className="flex items-center gap-1"><span className="hive-kbd">&gt;</span> commands</span>
              <span className="flex items-center gap-1"><span className="hive-kbd">@</span> projects</span>
              <span className="ml-auto flex items-center gap-1"><span className="hive-kbd">esc</span> close</span>
            </div>
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
