import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { PageErrorBoundary } from './PageErrorBoundary'
import { CommandPalette } from './CommandPalette'
import { ShortcutsDialog } from './ShortcutsDialog'
import { MobileTabBar } from './MobileTabBar'
import { RouteProgress } from './RouteProgress'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('nexora.sidebar') === '1')
  const [mobileOpen, setMobileOpen] = useState(false)
  // Workspace pages (the solver) use the full width; everything else sits in a centred column.
  const wide = location.pathname.startsWith('/solve')

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

  // Close the drawer and start every page at the top.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMobileOpen(false)
  }
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem('nexora.sidebar', c ? '0' : '1')
      return !c
    })
  }

  return (
    <div className="relative min-h-dvh">
      <a
        href="#main-content"
        className="fixed top-2 left-2 z-[1400] -translate-y-20 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <div className="app-ambient" aria-hidden="true" />
      <div className="grid-bg pointer-events-none fixed inset-x-0 top-0 z-0 h-[480px] opacity-60" aria-hidden="true" />

      <RouteProgress />
      <CommandPalette />
      <ShortcutsDialog />
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        inert={mobileOpen}
        className={cn(
          'relative z-10 flex min-h-dvh flex-col transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          collapsed ? 'lg:pl-[68px]' : 'lg:pl-[248px]',
        )}
      >
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'min-w-0 flex-1 px-4 pt-6 pb-24 outline-none md:px-6 lg:px-8 lg:pb-10',
            wide && 'lg:px-5 lg:pt-4',
          )}
        >
          <div className={cn(!wide && 'mx-auto w-full max-w-[1320px]')}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <PageErrorBoundary key={location.pathname}>
                  <Outlet />
                </PageErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  )
}
