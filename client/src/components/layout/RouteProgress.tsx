import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { EASE_EMPHASIZED, EASE_STANDARD } from '@/lib/motion'

/**
 * A hairline loading bar along the top edge on each navigation: it eases to
 * most of the width, then completes and fades. Accent colour only — no glow,
 * no hard-coded hues — so it reads correctly on every theme.
 */
export function RouteProgress() {
  const { pathname } = useLocation()
  const [run, setRun] = useState<{ key: string; on: boolean }>({ key: pathname, on: false })
  if (run.key !== pathname) setRun({ key: pathname, on: true })
  useEffect(() => {
    if (!run.on) return
    const t = window.setTimeout(() => setRun((r) => ({ ...r, on: false })), 420)
    return () => window.clearTimeout(t)
  }, [run])
  return (
    <AnimatePresence>
      {run.on && (
        <motion.div
          key={run.key}
          aria-hidden="true"
          className="route-progress pointer-events-none fixed top-0 left-0 z-[1300] h-[2px] origin-left rounded-r-full bg-accent-brand"
          style={{ width: '100%' }}
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.82, transition: { duration: 0.42, ease: EASE_EMPHASIZED } }}
          exit={{ scaleX: 1, opacity: 0, transition: { scaleX: { duration: 0.16, ease: EASE_STANDARD }, opacity: { duration: 0.22, delay: 0.1 } } }}
        />
      )}
    </AnimatePresence>
  )
}
