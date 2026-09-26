import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'

/** Thin gradient bar at the very top on each navigation (nprogress-style). */
export function RouteProgress() {
  const { pathname } = useLocation()
  const [run, setRun] = useState<{ key: string; on: boolean }>({ key: pathname, on: false })
  if (run.key !== pathname) setRun({ key: pathname, on: true })
  useEffect(() => {
    if (!run.on) return
    const t = window.setTimeout(() => setRun((r) => ({ ...r, on: false })), 450)
    return () => window.clearTimeout(t)
  }, [run])
  return (
    <AnimatePresence>
      {run.on && (
        <motion.div
          key={run.key}
          aria-hidden="true"
          className="fixed top-0 left-0 z-[1300] h-[2px] bg-gradient-to-r from-accent-brand via-accent-brand-hover to-state-info shadow-[0_0_12px_rgb(167_139_250/0.9)]"
          initial={{ width: '0%', opacity: 1 }}
          animate={{ width: '85%' }}
          exit={{ width: '100%', opacity: 0, transition: { duration: 0.25 } }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </AnimatePresence>
  )
}
