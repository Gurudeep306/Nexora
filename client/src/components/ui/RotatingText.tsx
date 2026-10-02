import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * Cycles through short hint phrases with a vertical slide + blur, clipped to a
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

  useEffect(() => {
    if (items.length < 2) return
    const id = setInterval(() => setI((v) => (v + 1) % items.length), interval)
    return () => clearInterval(id)
  }, [items.length, interval])

  if (items.length === 0) return null
  if (items.length === 1) return <span className={cn('block truncate', className)}>{items[0]}</span>

  return (
    <span className={cn('relative block h-[1.25em] w-full overflow-hidden', className)} aria-live="off">
      <AnimatePresence initial={false}>
        <motion.span
          key={items[i]}
          initial={{ y: '105%', opacity: 0, filter: 'blur(3px)' }}
          animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-105%', opacity: 0, filter: 'blur(3px)' }}
          transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 top-0 block truncate whitespace-nowrap"
        >
          {items[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
