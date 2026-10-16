import { lazy } from 'react'
import { LoadingBlock } from '@/components/ui'
import { useSite } from '@/context/SiteContext'
import { pageLoaders } from '@/routes'

const AdminPage = lazy(pageLoaders.AdminPage)
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
