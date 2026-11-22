import { lazy, Suspense, useEffect } from 'react'
import { LegacyGateRedirect } from '@/gate/LegacyGateRedirect'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { MarkLoader } from '@/components/brand/Logo'
import { useAuth } from '@/context/AuthContext'
import { idlePrefetchCommonRoutes, pageLoaders } from '@/routes'
import { SiteGate } from '@/components/site/SiteGate'
import { CallRinger } from '@/components/live/CallRinger'
import { OngoingCall } from '@/components/live/OngoingCall'
import { MessageAlerts } from '@/components/social/MessageAlerts'
import { AdminRoute, AuthorRoute, HiveRoute } from '@/components/admin/AdminRoute'

const PadPage = lazy(() => import('@/pages/hand/PadPage'))
const SnapPage = lazy(() => import('@/pages/hand/SnapPage'))
// Live: study rooms and calls. The room and the tablet page are full screen.
const LiveLobbyPage = lazy(() => import('@/pages/live/LiveLobbyPage'))
const LiveRoomPage = lazy(() => import('@/pages/live/LiveRoomPage'))
const LiveDevicePage = lazy(() => import('@/pages/live/LiveDevicePage'))
const ExplainPadPage = lazy(() => import('@/pages/explain/ExplainPadPage'))
const AuthPage = lazy(pageLoaders.AuthPage)
const WelcomePage = lazy(pageLoaders.WelcomePage)
const LandingPage = lazy(pageLoaders.LandingPage)
const HubPage = lazy(pageLoaders.HubPage)
const SubjectPage = lazy(pageLoaders.SubjectPage)
const ProblemsPage = lazy(pageLoaders.ProblemsPage)
const ProblemSetsPage = lazy(pageLoaders.ProblemSetsPage)
const ProblemSetPage = lazy(pageLoaders.ProblemSetPage)
const SolvePage = lazy(pageLoaders.SolvePage)
const ContestsPage = lazy(pageLoaders.ContestsPage)
const HostedBuilderPage = lazy(pageLoaders.HostedBuilderPage)
const NewContestPage = lazy(() => pageLoaders.HostedBuilderPage().then((m) => ({ default: m.NewContestPage })))
const HostedContestPage = lazy(pageLoaders.HostedContestPage)
const HostedPaperPage = lazy(pageLoaders.HostedPaperPage)
const HostedResultsPage = lazy(pageLoaders.HostedResultsPage)
const WorkshopPage = lazy(pageLoaders.WorkshopPage)
const NexusPage = lazy(pageLoaders.NexusPage)
const AnalyticsPage = lazy(pageLoaders.AnalyticsPage)
const AchievementsPage = lazy(pageLoaders.AchievementsPage)
const LearnPage = lazy(pageLoaders.LearnPage)
const LearnTopicPage = lazy(pageLoaders.LearnTopicPage)
const AiCoursesPage = lazy(pageLoaders.AiCoursesPage)
const LearnPracticePage = lazy(pageLoaders.LearnPracticePage)
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
const MessagesPage = lazy(pageLoaders.MessagesPage)
const ExplorePage = lazy(pageLoaders.ExplorePage)
const SocialPostPage = lazy(pageLoaders.SocialPostPage)
const SocialTagPage = lazy(pageLoaders.SocialTagPage)
const SubmissionsPage = lazy(pageLoaders.SubmissionsPage)
const BookmarksPage = lazy(pageLoaders.BookmarksPage)
const ProfilePage = lazy(pageLoaders.ProfilePage)
const SettingsPage = lazy(pageLoaders.SettingsPage)
const ThemeCentrePage = lazy(pageLoaders.ThemeCentrePage)
const AiLabPage = lazy(pageLoaders.AiLabPage)
const NotFoundPage = lazy(pageLoaders.NotFoundPage)
const VizLab = import.meta.env.DEV ? lazy(() => import('@/learn/ui/VizLab')) : null

/** /gate/subjects/<id>[/<node>] (older links): the subject's one page, under /learn. */
function GateSubjectAlias() {
  const { subject = '', node } = useParams()
  const { hash } = useLocation()
  const n = node ?? (decodeURIComponent(hash.replace(/^#/, '')) || null)
  return <Navigate to={`/learn/${encodeURIComponent(subject)}${n ? `/${encodeURIComponent(n)}` : ''}`} replace />
}

function PageLoader() {
  // The mark writing itself, on a loop, while the page arrives.
  return (
    <div className="grid min-h-[60vh] place-items-center py-12">
      <MarkLoader />
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
      {/* Incoming Live calls ring on any page. */}
      <CallRinger />
      {/* A call still going while you look at another page. */}
      <OngoingCall />
      {/* New messages, like a phone's chat app, on any page. */}
      <MessageAlerts />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          {/* Handwriting on a tablet or a phone: opened from a one-time link, no sign-in. */}
          <Route path="/pad/:token" element={<PadPage />} />
          <Route path="/snap/:token" element={<SnapPage />} />
          <Route path="/live/d/:token" element={<LiveDevicePage />} />
          <Route path="/explain/pad/:token" element={<ExplainPadPage />} />
          <Route path="/live/:code" element={<RequireAuth><LiveRoomPage /></RequireAuth>} />
          <Route path="/welcome" element={<RequireAuth><WelcomePage /></RequireAuth>} />
          <Route path="/" element={<LandingPage />} />
          {VizLab && <Route path="/viz-lab" element={<VizLab />} />}
          <Route path="/hive/*" element={<RequireAuth><HiveRoute /></RequireAuth>} />
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/hub" element={<HubPage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/problems/sets" element={<ProblemSetsPage />} />
            <Route path="/problems/sets/company/:company" element={<ProblemSetPage />} />
            <Route path="/problems/sets/:id" element={<ProblemSetPage />} />
            <Route path="/solve/custom/:id" element={<SolvePage custom />} />
            <Route path="/solve/learn/:id" element={<SolvePage learn />} />
            <Route path="/solve/:id" element={<SolvePage />} />
            <Route path="/contests" element={<ContestsPage />} />
            <Route path="/contests/new" element={<NewContestPage />} />
            <Route path="/contests/c/:code" element={<HostedContestPage />} />
            <Route path="/contests/:id/edit" element={<HostedBuilderPage />} />
            <Route path="/contests/:id/paper" element={<HostedPaperPage />} />
            <Route path="/contests/:id/results" element={<HostedResultsPage />} />
            <Route path="/workshop" element={<WorkshopPage />} />
            <Route path="/nexus" element={<NexusPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            {/* AI Lab was retired; AI courses live under Learn. Keep old links working. */}
            <Route path="/ailab/*" element={<Navigate to="/learn" replace />} />
            <Route path="/learn" element={<LearnPage />} />
            {/* System Design was removed (2026-11): old links land on Learn. */}
            <Route path="/learn/system-design/*" element={<Navigate to="/learn" replace />} />
            <Route path="/learn/dsa/:topic/practice" element={<LearnPracticePage />} />
            <Route path="/learn/dsa/:topic/:page?" element={<LearnTopicPage />} />
            {/* Every Nexus subject's one page: its course tree; a node opens its lesson in place. */}
            <Route path="/learn/ai-courses" element={<AiCoursesPage />} />
            <Route path="/learn/ai-courses/:course" element={<AiCoursesPage />} />
            <Route path="/learn/ai-courses/:course/:topic/practice" element={<LearnPracticePage />} />
            <Route path="/learn/ai-courses/:course/:topic/:page?" element={<LearnTopicPage />} />
            <Route path="/learn/dsa" element={<SubjectPage />} />
            <Route path="/learn/dsa/skill/:node" element={<SubjectPage />} />
            <Route path="/learn/:subject" element={<SubjectPage />} />
            <Route path="/learn/:subject/:node" element={<SubjectPage />} />
            <Route path="/gate" element={<LegacyGateRedirect><GateHomePage /></LegacyGateRedirect>} />
            <Route path="/gate/practice" element={<GatePage />} />
            <Route path="/gate/subjects/:subject" element={<GateSubjectAlias />} />
            <Route path="/gate/subjects/:subject/:node" element={<GateSubjectAlias />} />
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
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/live" element={<LiveLobbyPage />} />
            <Route path="/social/post/:id" element={<SocialPostPage />} />
            <Route path="/social/tag/:tag" element={<SocialTagPage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/u/:username" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsRoute />} />
            <Route path="/theme" element={<ThemeCentrePage />} />
            <Route path="/ai-lab" element={<AiLabPage />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="/admin/problems/:id" element={<AuthorRoute />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      </SiteGate>
    </BrowserRouter>
  )
}
