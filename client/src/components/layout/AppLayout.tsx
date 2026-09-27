import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Topbar } from './Topbar'
import { PageErrorBoundary } from './PageErrorBoundary'
import { CommandPalette } from './CommandPalette'
import { ShortcutsDialog } from './ShortcutsDialog'
import { MobileTabBar } from './MobileTabBar'
import { Deck } from './Deck'
import { RouteProgress } from './RouteProgress'
import { RiftBackground } from '../fx/RiftBackground'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const location = useLocation()
  // Workspace pages (the solver) use the full width; everything else sits in a centred column.
  const wide = location.pathname.startsWith('/solve')

  // Start every page at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  return (
    <div className="relative min-h-dvh">
      <a
        href="#main-content"
        className="fixed top-2 left-2 z-[1400] -translate-y-20 rounded-lg bg-accent-brand px-3 py-2 text-sm font-semibold text-text-primary/90 transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <RiftBackground className="pointer-events-none" grid={true} intensity={1} />

      <RouteProgress />
      <CommandPalette />
      <ShortcutsDialog />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <Topbar />
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'min-w-0 flex-1 px-4 pt-6 pb-24 outline-none md:px-6 md:pb-28 lg:px-8',
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
      <Deck />
    </div>
  )
}
