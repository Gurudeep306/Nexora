import { lazy, Suspense, useEffect } from 'react'
import { LoadingBlock } from '@/components/ui'
import { useSite } from '@/context/SiteContext'
import { useTheme } from '@/context/ThemeContext'
import { pageLoaders } from '@/routes'
import { BootScreen } from '@/hive/HiveBoot'

const AdminPage = lazy(pageLoaders.AdminPage)
const AuthorProblemPage = lazy(pageLoaders.AuthorProblemPage)
const HivePage = lazy(pageLoaders.HivePage)
const NotFoundPage = lazy(pageLoaders.NotFoundPage)

/**
 * /admin. To anyone without an admin permission (or the owner previewing as a
 * member) this is the ordinary 404 page — nothing hints that a panel exists,
 * and the admin chunk is never downloaded: the permission check runs before
 * the lazy import. The server answers its API with 404 too.
 */
export function AdminRoute() {
  const { status, loading, isStaff } = useSite()
  if (loading && !status) {
    return (
      <div className="py-8" aria-busy="true">
        <LoadingBlock rows={6} />
      </div>
    )
  }
  if (!isStaff) return <NotFoundPage />
  return <AdminPage />
}

/** /admin/problems/:id — write a coding problem. Same rule as /admin (the API asks for the Problems permission). */
export function AuthorRoute() {
  const { status, loading, isStaff } = useSite()
  if (loading && !status) {
    return (
      <div className="py-8" aria-busy="true">
        <LoadingBlock rows={6} />
      </div>
    )
  }
  if (!isStaff) return <NotFoundPage />
  return <AuthorProblemPage />
}

/**
 * /hive — the staff-only multi-agent workspace. Same rule as /admin: anyone
 * without an admin-panel permission sees the 404 page and never downloads
 * the chunk; the API and socket namespace refuse them too.
 */
export function HiveRoute() {
  const { status, loading, isStaff, previewAsMember } = useSite()
  // Hive wears the person's own look (theme/look.ts hiveLook).
  const { setHiveScope } = useTheme()
  useEffect(() => {
    setHiveScope(true)
    return () => setHiveScope(false)
  }, [setHiveScope])
  if (loading && !status) {
    return (
      <div className="p-8" aria-busy="true">
        <LoadingBlock rows={6} />
      </div>
    )
  }
  // Admins and the owner only (the server answers 404 to anyone else too).
  if (!isStaff || previewAsMember || !status?.me?.mayHive) return <NotFoundPage />
  // One loading screen from the click until Hive is ready (only once we know
  // the person may use Hive, so members never see that it exists).
  return (
    <Suspense fallback={<BootScreen />}>
      <HivePage />
    </Suspense>
  )
}
