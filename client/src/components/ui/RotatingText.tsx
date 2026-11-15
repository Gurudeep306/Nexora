import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * Cycles through short hint phrases with a vertical slide, clipped to a
 * single line. Used as the "living" placeholder inside the universal search
 * bar so the bar feels alive without a wall of static text.
 */
export function RotatingText({
  items,
  interval = 2600,
  className,
}: {
  items: string[]
  interval?: number
  className?: string
}) {
  const [i, setI] = useState(0)
  const still = useReducedMotion()

  useEffect(() => {
    if (items.length < 2 || still) return
    const id = setInterval(() => setI((v) => (v + 1) % items.length), interval)
    return () => clearInterval(id)
  }, [items.length, interval, still])

  if (items.length === 0) return null
  // A hint only: the field carries its own label, so this stays out of the accessibility tree.
  if (items.length === 1 || still) return <span className={cn('block truncate', className)} aria-hidden="true">{items[0]}</span>

  return (
    <span className={cn('relative block h-[1.25em] w-full overflow-hidden', className)} aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.span
          key={items[i]}
          // A slide only: the window clips the words, so no fade or blur is needed.
          initial={{ y: '105%' }}
          animate={{ y: '0%' }}
          exit={{ y: '-105%' }}
          transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 top-0 block truncate whitespace-nowrap"
        >
          {items[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
