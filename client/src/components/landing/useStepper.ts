import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * The shared player behind every live lesson on the landing page: a step
 * index that advances on its own, holds longer on the last frame, pauses on
 * hover and focus, and waits for the buttons under reduced motion.
 */
export function useStepper(count: number, { hold = 1900, last = 3200 } = {}) {
  const still = useReducedMotion()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (still || paused) return
    const t = setTimeout(() => setI((x) => (x + 1) % count), i === count - 1 ? last : hold)
    return () => clearTimeout(t)
  }, [i, paused, still, count, hold, last])
  const pause = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  }
  return { i, setI, pause, count }
}
