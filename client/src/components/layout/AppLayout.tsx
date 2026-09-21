import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { PageErrorBoundary } from './PageErrorBoundary'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('nexora.sidebar') === '1')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const syncPreferences = () => setCollapsed(localStorage.getItem('nexora.sidebar') === '1')
    window.addEventListener('nexora:preferences', syncPreferences)
    return () => window.removeEventListener('nexora:preferences', syncPreferences)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen])

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem('nexora.sidebar', c ? '0' : '1')
      return !c
    })
  }

  return (
    <div className="relative min-h-dvh">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="grid-bg absolute inset-0 opacity-40" />
      </div>

      <Sidebar
        collapsed={collapsed && !mobileOpen}
        onToggle={toggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        inert={mobileOpen}
        className={cn(
          'relative z-10 flex min-h-dvh flex-col transition-[padding] duration-300 ease-out',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-60',
        )}
      >
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <PageErrorBoundary key={location.pathname}>
                <Outlet />
              </PageErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
