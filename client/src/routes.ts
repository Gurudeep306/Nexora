/*
 * Route chunk loaders, shared by App.tsx (React.lazy) and the prefetcher.
 *
 * Every page is its own chunk, so the first visit to a page used to wait for
 * its download behind a loading fallback. prefetchRoute() starts that
 * download early — on nav-link hover/focus/touch, and for the most-used
 * pages once the app is idle after first load — so navigation is instant.
 * import() is cached by the browser/bundler, so calling a loader twice is free.
 */
import { prefetchNexusData } from '@/components/nexus/data'
import { prefetchSubject } from '@/components/nexus/subjectTree'

type Loader = () => Promise<unknown>

export const pageLoaders = {
  AuthPage: () => import('@/pages/AuthPage'),
  LandingPage: () => import('@/pages/LandingPage'),
  HubPage: () => import('@/pages/HubPage'),
  ProblemsPage: () => import('@/pages/ProblemsPage'),
  ProblemSetsPage: () => import('@/pages/ProblemSetsPage'),
  ProblemSetPage: () => import('@/pages/ProblemSetPage'),
  SolvePage: () => import('@/pages/SolvePage'),
  ContestsPage: () => import('@/pages/ContestsPage'),
  HostedBuilderPage: () => import('@/pages/contests/HostedBuilderPage'),
  HostedContestPage: () => import('@/pages/contests/HostedContestPage'),
  HostedPaperPage: () => import('@/pages/contests/HostedPaperPage'),
  HostedResultsPage: () => import('@/pages/contests/HostedResultsPage'),
  WorkshopPage: () => import('@/pages/WorkshopPage'),
  NexusPage: () => import('@/pages/NexusPage'),
  AnalyticsPage: () => import('@/pages/AnalyticsPage'),
  AchievementsPage: () => import('@/pages/AchievementsPage'),
  LearnPage: () => import('@/pages/LearnPage'),
  SubjectPage: () => import('@/pages/SubjectPage'),
  LearnTopicPage: () => import('@/learn/ui/TopicPage'),
  LearnPracticePage: () => import('@/learn/ui/PracticePage'),
  GatePage: () => import('@/pages/GatePage'),
  GateCbtPage: () => import('@/pages/GateCbtPage'),
  GateHomePage: () => import('@/pages/gate/GateHomePage'),
  GateAnalyticsPage: () => import('@/pages/gate/GateAnalyticsPage'),
  GateSyllabusPage: () => import('@/pages/gate/GateSyllabusPage'),
  GatePlannerPage: () => import('@/pages/gate/GatePlannerPage'),
  GateNotebookPage: () => import('@/pages/gate/GateNotebookPage'),
  GateLeaderboardPage: () => import('@/pages/gate/GateLeaderboardPage'),
  GateReviewPage: () => import('@/pages/gate/GateReviewPage'),
  GateDailyPage: () => import('@/pages/gate/GateDailyPage'),
  GateTestsPage: () => import('@/pages/gate/GateTestsPage'),
  GateTestPage: () => import('@/pages/gate/GateTestPage'),
  NotesIndexPage: () => import('@/pages/gate/notes/NotesIndexPage'),
  NotesSubjectPage: () => import('@/pages/gate/notes/NotesSubjectPage'),
  NotesLessonPage: () => import('@/pages/gate/notes/NotesLessonPage'),
  NotesFontsPage: () => import('@/pages/gate/notes/NotesFontsPage'),
  SocialPage: () => import('@/pages/SocialPage'),
  SocialPostPage: () => import('@/pages/social/PostPage'),
  SocialTagPage: () => import('@/pages/social/HashtagPage'),
  SubmissionsPage: () => import('@/pages/SubmissionsPage'),
  BookmarksPage: () => import('@/pages/BookmarksPage'),
  ProfilePage: () => import('@/pages/ProfilePage'),
  SettingsPage: () => import('@/pages/SettingsPage'),
  WelcomePage: () => import('@/pages/WelcomePage'),
  ThemeCentrePage: () => import('@/pages/ThemeCentrePage'),
  NotFoundPage: () => import('@/pages/NotFoundPage'),
  AdminPage: () => import('@/pages/AdminPage'),
  AuthorProblemPage: () => import('@/pages/AuthorProblemPage'),
  HivePage: () => import('@/hive/HivePage'),
} satisfies Record<string, Loader>

/** First path segment → the chunk(s) that route renders. */
const BY_SEGMENT: Record<string, Loader[]> = {
  hub: [pageLoaders.HubPage],
  problems: [pageLoaders.ProblemsPage],
  solve: [pageLoaders.SolvePage],
  contests: [pageLoaders.ContestsPage],
  workshop: [pageLoaders.WorkshopPage],
  // Subject pages open from the Nexus, /learn and the GATE home: their chunk comes along.
  nexus: [pageLoaders.NexusPage, pageLoaders.SubjectPage],
  analytics: [pageLoaders.AnalyticsPage],
  achievements: [pageLoaders.AchievementsPage],
  learn: [pageLoaders.LearnPage, pageLoaders.SubjectPage],
  gate: [pageLoaders.GateHomePage, pageLoaders.GatePage, pageLoaders.SubjectPage],
  social: [pageLoaders.SocialPage],
  submissions: [pageLoaders.SubmissionsPage],
  bookmarks: [pageLoaders.BookmarksPage],
  profile: [pageLoaders.ProfilePage],
  u: [pageLoaders.ProfilePage],
  settings: [pageLoaders.SettingsPage],
  theme: [pageLoaders.ThemeCentrePage],
  auth: [pageLoaders.AuthPage],
  admin: [pageLoaders.AdminPage],
  hive: [pageLoaders.HivePage],
}

const started = new Set<Loader>()

/** Start downloading the chunk for a client route (no-op for unknown paths). */
export function prefetchRoute(to: string): void {
  if (!to.startsWith('/')) return
  const segment = to.split(/[/?#]/)[1] ?? ''
  for (const load of BY_SEGMENT[segment] ?? []) {
    if (started.has(load)) continue
    started.add(load)
    load().catch(() => started.delete(load))
  }
}

/** Pages most people open first — fetched in the background once idle. */
const COMMON_ROUTES = ['/hub', '/problems', '/nexus', '/learn', '/gate', '/analytics', '/profile', '/achievements']

let idleScheduled = false

/** After first load, quietly download the most-used page chunks one by one. */
export function idlePrefetchCommonRoutes(): void {
  if (idleScheduled || typeof window === 'undefined') return
  idleScheduled = true
  // Respect data-saver / slow connections.
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '')) return

  const idle: (cb: () => void) => void =
    'requestIdleCallback' in window
      ? (cb) => window.requestIdleCallback(cb, { timeout: 4000 })
      : (cb) => window.setTimeout(cb, 1500)
  const queue = [...COMMON_ROUTES]
  const next = () => {
    // Hive is staff-only work: the learning pages aren't worth downloading there.
    if (window.location.pathname.startsWith('/hive')) return
    const to = queue.shift()
    if (!to) return
    prefetchRoute(to)
    // The Nexus also warms its data and computes its layout off-thread.
    if (to === '/nexus') DATA_BY_SEGMENT.nexus?.()
    idle(next)
  }
  window.setTimeout(() => idle(next), 1200)
}

/** Pages whose API data is also worth fetching on link intent (hover/focus). */
const DATA_BY_SEGMENT: Record<string, () => void> = {
  nexus: prefetchNexusData,
}

/** A subject page (/learn/<id>[/<node>], /learn/dsa…): its tree, warmed. */
const NOT_SUBJECTS = new Set(['system-design'])
export function prefetchSubjectRoute(to: string): void {
  const m = /^\/learn\/([a-z0-9][a-z0-9-]*)/.exec(to)
  if (!m || NOT_SUBJECTS.has(m[1])) return
  prefetchRoute(to)
  prefetchSubject(m[1])
}

/** Props that prefetch a route's chunk (and data, where known) on hover, focus or touch. */
export function prefetchHandlers(to: string) {
  const go = () => {
    prefetchRoute(to)
    prefetchSubjectRoute(to)
    const segment = to.split(/[/?#]/)[1] ?? ''
    DATA_BY_SEGMENT[segment]?.()
  }
  return { onMouseEnter: go, onFocus: go, onTouchStart: go }
}

// Opened straight on a subject page: start its chunk and tree with the app.
if (typeof window !== 'undefined') prefetchSubjectRoute(window.location.pathname)
