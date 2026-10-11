import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingBlock } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { idlePrefetchCommonRoutes, pageLoaders } from '@/routes'

const AuthPage = lazy(pageLoaders.AuthPage)
const LandingPage = lazy(pageLoaders.LandingPage)
const HubPage = lazy(pageLoaders.HubPage)
const ProblemsPage = lazy(pageLoaders.ProblemsPage)
const SolvePage = lazy(pageLoaders.SolvePage)
const ContestsPage = lazy(pageLoaders.ContestsPage)
const WorkshopPage = lazy(pageLoaders.WorkshopPage)
const NexusPage = lazy(pageLoaders.NexusPage)
const AnalyticsPage = lazy(pageLoaders.AnalyticsPage)
const AchievementsPage = lazy(pageLoaders.AchievementsPage)
const AiLabPage = lazy(pageLoaders.AiLabPage)
const LearnPage = lazy(pageLoaders.LearnPage)
const LearnTopicPage = lazy(pageLoaders.LearnTopicPage)
const LearnPracticePage = lazy(pageLoaders.LearnPracticePage)
const SystemDossierPage = lazy(pageLoaders.SystemDossierPage)
const GatePage = lazy(pageLoaders.GatePage)
const GateCbtPage = lazy(pageLoaders.GateCbtPage)
const SocialPage = lazy(pageLoaders.SocialPage)
const SubmissionsPage = lazy(pageLoaders.SubmissionsPage)
const BookmarksPage = lazy(pageLoaders.BookmarksPage)
const ProfilePage = lazy(pageLoaders.ProfilePage)
const SettingsPage = lazy(pageLoaders.SettingsPage)
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
            <Route path="/ailab" element={<AiLabPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/learn/system-design/:systemId/:chapterNumber" element={<SystemDossierPage />} />
            <Route path="/learn/system-design/:systemId" element={<SystemDossierPage />} />
            <Route path="/learn/dsa/:topic/practice" element={<LearnPracticePage />} />
            <Route path="/learn/dsa/:topic/:page?" element={<LearnTopicPage />} />
            <Route path="/gate" element={<GatePage />} />
            <Route path="/gate/cbt" element={<GateCbtPage />} />
            <Route path="/gate/cbt/:paperId" element={<GateCbtPage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
