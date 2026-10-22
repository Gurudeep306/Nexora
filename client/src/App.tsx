import { lazy, Suspense, useEffect } from 'react'
import { LegacyGateRedirect } from '@/gate/LegacyGateRedirect'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingBlock } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { idlePrefetchCommonRoutes, pageLoaders } from '@/routes'
import { SiteGate } from '@/components/site/SiteGate'
import { AdminRoute } from '@/components/admin/AdminRoute'

const AuthPage = lazy(pageLoaders.AuthPage)
const LandingPage = lazy(pageLoaders.LandingPage)
const HubPage = lazy(pageLoaders.HubPage)
const CoursePage = lazy(pageLoaders.CoursePage)
const ProblemsPage = lazy(pageLoaders.ProblemsPage)
const SolvePage = lazy(pageLoaders.SolvePage)
const ContestsPage = lazy(pageLoaders.ContestsPage)
const WorkshopPage = lazy(pageLoaders.WorkshopPage)
const NexusPage = lazy(pageLoaders.NexusPage)
const AnalyticsPage = lazy(pageLoaders.AnalyticsPage)
const AchievementsPage = lazy(pageLoaders.AchievementsPage)
const LearnPage = lazy(pageLoaders.LearnPage)
const LearnTopicPage = lazy(pageLoaders.LearnTopicPage)
const LearnPracticePage = lazy(pageLoaders.LearnPracticePage)
const SystemDossierPage = lazy(pageLoaders.SystemDossierPage)
const GatePage = lazy(pageLoaders.GatePage)
const GateCbtPage = lazy(pageLoaders.GateCbtPage)
const GateHomePage = lazy(pageLoaders.GateHomePage)
const GateAnalyticsPage = lazy(pageLoaders.GateAnalyticsPage)
const GateSyllabusPage = lazy(pageLoaders.GateSyllabusPage)
const GatePlannerPage = lazy(pageLoaders.GatePlannerPage)
const GateNotebookPage = lazy(pageLoaders.GateNotebookPage)
const GateLeaderboardPage = lazy(pageLoaders.GateLeaderboardPage)
const GateReviewPage = lazy(pageLoaders.GateReviewPage)
const GateDailyPage = lazy(pageLoaders.GateDailyPage)
const GateTestsPage = lazy(pageLoaders.GateTestsPage)
const GateTestPage = lazy(pageLoaders.GateTestPage)
const NotesIndexPage = lazy(pageLoaders.NotesIndexPage)
const NotesSubjectPage = lazy(pageLoaders.NotesSubjectPage)
const NotesLessonPage = lazy(pageLoaders.NotesLessonPage)
const NotesFontsPage = lazy(pageLoaders.NotesFontsPage)
const SocialPage = lazy(pageLoaders.SocialPage)
const SocialPostPage = lazy(pageLoaders.SocialPostPage)
const SocialTagPage = lazy(pageLoaders.SocialTagPage)
const SubmissionsPage = lazy(pageLoaders.SubmissionsPage)
const BookmarksPage = lazy(pageLoaders.BookmarksPage)
const ProfilePage = lazy(pageLoaders.ProfilePage)
const SettingsPage = lazy(pageLoaders.SettingsPage)
const ThemeCentrePage = lazy(pageLoaders.ThemeCentrePage)
const NotFoundPage = lazy(pageLoaders.NotFoundPage)
const VizLab = import.meta.env.DEV ? lazy(() => import('@/learn/ui/VizLab')) : null

function PageLoader() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 py-8" aria-busy="true">
      <div className="skeleton h-9 w-64" />
      <LoadingBlock rows={6} />
    </div>
  )
}

/** Once a signed-in page has rendered, warm the other common page chunks. */
function IdlePrefetch({ children }: { children: React.ReactNode }) {
  useEffect(() => idlePrefetchCommonRoutes(), [])
  return <>{children}</>
}

/** The Appearance tab moved to the Theme Centre; keep old links working. */
function SettingsRoute() {
  const { search } = useLocation()
  if (new URLSearchParams(search).get('tab') === 'look') return <Navigate to="/theme" replace />
  return <SettingsPage />
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />
  return <IdlePrefetch>{children}</IdlePrefetch>
}

export default function App() {
  return (
    <BrowserRouter>
      <SiteGate>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<LandingPage />} />
          {VizLab && <Route path="/viz-lab" element={<VizLab />} />}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/hub" element={<HubPage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/solve/custom/:id" element={<SolvePage custom />} />
            <Route path="/solve/learn/:id" element={<SolvePage learn />} />
            <Route path="/solve/:id" element={<SolvePage />} />
            <Route path="/contests" element={<ContestsPage />} />
            <Route path="/workshop" element={<WorkshopPage />} />
            <Route path="/nexus" element={<NexusPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            {/* AI Lab was retired; AI courses live under Learn. Keep old links working. */}
            <Route path="/ailab/*" element={<Navigate to="/learn" replace />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/learn/system-design/:systemId/:chapterNumber" element={<SystemDossierPage />} />
            <Route path="/learn/system-design/:systemId" element={<SystemDossierPage />} />
            <Route path="/learn/dsa/:topic/practice" element={<LearnPracticePage />} />
            <Route path="/learn/dsa/:topic/:page?" element={<LearnTopicPage />} />
            {/* Nexus courses: GATE subjects redirect to their notes / PYQs, the rest are course pages. */}
            <Route path="/learn/:subject/:concept?" element={<CoursePage />} />
            <Route path="/gate" element={<LegacyGateRedirect><GateHomePage /></LegacyGateRedirect>} />
            <Route path="/gate/practice" element={<GatePage />} />
            <Route path="/gate/notes" element={<NotesIndexPage />} />
            <Route path="/gate/notes/_fonts" element={<NotesFontsPage />} />
            <Route path="/gate/notes/:subject" element={<NotesSubjectPage />} />
            <Route path="/gate/notes/:subject/:lesson" element={<NotesLessonPage />} />
            <Route path="/gate/review" element={<GateReviewPage />} />
            <Route path="/gate/daily" element={<GateDailyPage />} />
            <Route path="/gate/tests" element={<GateTestsPage />} />
            <Route path="/gate/tests/:testId" element={<GateTestPage />} />
            <Route path="/gate/analytics" element={<GateAnalyticsPage />} />
            <Route path="/gate/syllabus" element={<GateSyllabusPage />} />
            <Route path="/gate/planner" element={<GatePlannerPage />} />
            <Route path="/gate/notebook" element={<GateNotebookPage />} />
            <Route path="/gate/leaderboard" element={<GateLeaderboardPage />} />
            <Route path="/gate/cbt" element={<GateCbtPage />} />
            <Route path="/gate/cbt/:paperId" element={<GateCbtPage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/social/post/:id" element={<SocialPostPage />} />
            <Route path="/social/tag/:tag" element={<SocialTagPage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/u/:username" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsRoute />} />
            <Route path="/theme" element={<ThemeCentrePage />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      </SiteGate>
    </BrowserRouter>
  )
}
