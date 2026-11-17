import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Topbar } from './Topbar'
import { PageErrorBoundary } from './PageErrorBoundary'
import { CommandPalette } from './CommandPalette'
import { ShortcutsDialog } from './ShortcutsDialog'
import { MobileTabBar } from './MobileTabBar'
import { Deck } from './Deck'
import { isReaderRoute } from '@/components/reader/panels'
import { RouteProgress } from './RouteProgress'
import { LookSync } from '../look/LookSync'
import { DockSync } from './DockSync'
import { AgentPanel } from './AgentPanel'
import { AgentProvider } from '@/context/AgentContext'
import { cn } from '@/lib/utils'
import { useSite } from '@/context/SiteContext'
import { featureForPath } from '@/lib/site'
import { SiteBanners } from '@/components/site/SiteBanners'
import { PartOff, SectionOff } from '@/components/site/SectionOff'
import { DUR, EASE_EMPHASIZED } from '@/lib/motion'

export function AppLayout() {
  const location = useLocation()
  // Workspace pages (the solver) use the full width; everything else sits in a centred column.
  // Solving and reading use the whole window.
  const wide = location.pathname.startsWith('/solve') || isReaderRoute(location.pathname)
  // Sections an admin switched off (feature flags) render a notice instead.
  const { featureOn, blockedPart } = useSite()
  // Admin → Site map: parts hidden, staff only or coming soon for this viewer
  // (it says which); the older flag notice only when no part is known.
  const partOff = blockedPart(location.pathname + location.search)
  const flag = featureForPath(location.pathname)
  const sectionOff = !partOff && flag && !featureOn(flag) ? flag : null

  // Start every page at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  return (
    <AgentProvider>
    <div className="relative min-h-dvh">
      <a
        href="#main-content"
        className="fixed top-2 left-2 z-[1400] -translate-y-20 rounded-[var(--radius-control)] bg-accent-brand px-3 py-2 text-sm font-semibold text-on-accent-brand transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <LookSync />
      <DockSync />

      <RouteProgress />
      <CommandPalette />
      <ShortcutsDialog />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteBanners />
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
                /* Position only: an opacity fade would make this wrapper a
                   backdrop root, and every glass card inside would lose its
                   blur for the length of the transition. */
                initial={{ y: 6 }}
                animate={{ y: 0 }}
                exit={{ transition: { duration: 0 } }}
                transition={{ duration: DUR.slow, ease: EASE_EMPHASIZED }}
              >
                <PageErrorBoundary key={location.pathname}>
                  {sectionOff ? <SectionOff flag={sectionOff} /> : partOff ? <PartOff part={partOff} /> : <Outlet />}
                </PageErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <MobileTabBar />
      <Deck />
      {featureOn('ai_tutor') && <AgentPanel />}
    </div>
    </AgentProvider>
  )
}
