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

type Loader = () => Promise<unknown>

export const pageLoaders = {
  AuthPage: () => import('@/pages/AuthPage'),
  LandingPage: () => import('@/pages/LandingPage'),
  HubPage: () => import('@/pages/HubPage'),
  ProblemsPage: () => import('@/pages/ProblemsPage'),
  SolvePage: () => import('@/pages/SolvePage'),
  ContestsPage: () => import('@/pages/ContestsPage'),
  WorkshopPage: () => import('@/pages/WorkshopPage'),
  NexusPage: () => import('@/pages/NexusPage'),
  AnalyticsPage: () => import('@/pages/AnalyticsPage'),
  AchievementsPage: () => import('@/pages/AchievementsPage'),
  LearnPage: () => import('@/pages/LearnPage'),
  CoursePage: () => import('@/pages/CoursePage'),
  LearnTopicPage: () => import('@/learn/ui/TopicPage'),
  LearnPracticePage: () => import('@/learn/ui/PracticePage'),
  SystemDossierPage: () => import('@/pages/SystemDossierPage'),
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
  ThemeCentrePage: () => import('@/pages/ThemeCentrePage'),
  NotFoundPage: () => import('@/pages/NotFoundPage'),
  AdminPage: () => import('@/pages/AdminPage'),
} satisfies Record<string, Loader>

/** First path segment → the chunk(s) that route renders. */
const BY_SEGMENT: Record<string, Loader[]> = {
  hub: [pageLoaders.HubPage],
  problems: [pageLoaders.ProblemsPage],
  solve: [pageLoaders.SolvePage],
  contests: [pageLoaders.ContestsPage],
  workshop: [pageLoaders.WorkshopPage],
  nexus: [pageLoaders.NexusPage],
  analytics: [pageLoaders.AnalyticsPage],
  achievements: [pageLoaders.AchievementsPage],
  learn: [pageLoaders.LearnPage],
  gate: [pageLoaders.GateHomePage, pageLoaders.GatePage],
  social: [pageLoaders.SocialPage],
  submissions: [pageLoaders.SubmissionsPage],
  bookmarks: [pageLoaders.BookmarksPage],
  profile: [pageLoaders.ProfilePage],
  u: [pageLoaders.ProfilePage],
  settings: [pageLoaders.SettingsPage],
  theme: [pageLoaders.ThemeCentrePage],
  auth: [pageLoaders.AuthPage],
  admin: [pageLoaders.AdminPage],
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

/** Props that prefetch a route's chunk (and data, where known) on hover, focus or touch. */
export function prefetchHandlers(to: string) {
  const go = () => {
    prefetchRoute(to)
    const segment = to.split(/[/?#]/)[1] ?? ''
    DATA_BY_SEGMENT[segment]?.()
  }
  return { onMouseEnter: go, onFocus: go, onTouchStart: go }
}
