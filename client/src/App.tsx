import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingBlock } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'

const AuthPage = lazy(() => import('@/pages/AuthPage'))
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const HubPage = lazy(() => import('@/pages/HubPage'))
const ProblemsPage = lazy(() => import('@/pages/ProblemsPage'))
const SolvePage = lazy(() => import('@/pages/SolvePage'))
const ContestsPage = lazy(() => import('@/pages/ContestsPage'))
const WorkshopPage = lazy(() => import('@/pages/WorkshopPage'))
const NexusPage = lazy(() => import('@/pages/NexusPage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const AchievementsPage = lazy(() => import('@/pages/AchievementsPage'))
const AiLabPage = lazy(() => import('@/pages/AiLabPage'))
const LearnPage = lazy(() => import('@/pages/LearnPage'))
const LearnTopicPage = lazy(() => import('@/learn/ui/TopicPage'))
const LearnPracticePage = lazy(() => import('@/learn/ui/PracticePage'))
const GatePage = lazy(() => import('@/pages/GatePage'))
const SocialPage = lazy(() => import('@/pages/SocialPage'))
const SubmissionsPage = lazy(() => import('@/pages/SubmissionsPage'))
const BookmarksPage = lazy(() => import('@/pages/BookmarksPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const VizLab = import.meta.env.DEV ? lazy(() => import('@/learn/ui/VizLab')) : null

function PageLoader() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 py-8" aria-busy="true">
      <div className="skeleton h-9 w-64" />
      <LoadingBlock rows={6} />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />
  return <>{children}</>
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
            <Route path="/learn/dsa/:topic/practice" element={<LearnPracticePage />} />
            <Route path="/learn/dsa/:topic/:page?" element={<LearnTopicPage />} />
            <Route path="/gate" element={<GatePage />} />
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
