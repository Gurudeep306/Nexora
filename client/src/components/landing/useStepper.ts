import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * The shared player behind every live lesson on the landing page: a step
 * index that advances on its own, holds longer on the last frame, pauses on
 * hover and focus, and waits for the buttons under reduced motion.
 *
 * It only plays while the player is on screen, and it starts from the first
 * frame each time it comes into view, so a visitor who scrolls down to it
 * sees the whole lesson rather than joining it halfway through.
 */
export function useStepper(count: number, { hold = 1900, last = 3200 } = {}) {
  const still = useReducedMotion()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const io = useRef<IntersectionObserver | null>(null)

  /** Attach to the player's outer element. */
  const ref = useCallback((el: HTMLElement | null) => {
    io.current?.disconnect()
    io.current = null
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    io.current = new IntersectionObserver(
      ([e]) => {
        setVisible((was) => {
          // Coming back into view: play the lesson again from its first frame.
          if (e.isIntersecting && !was) setI(0)
          return e.isIntersecting
        })
      },
      { threshold: 0.35 },
    )
    io.current.observe(el)
  }, [])
  useEffect(() => () => io.current?.disconnect(), [])

  useEffect(() => {
    if (still || paused || !visible) return
    const t = setTimeout(() => setI((x) => (x + 1) % count), i === count - 1 ? last : hold)
    return () => clearTimeout(t)
  }, [i, paused, visible, still, count, hold, last])

  const pause = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  }
  return { i, setI, pause, count, ref }
}
