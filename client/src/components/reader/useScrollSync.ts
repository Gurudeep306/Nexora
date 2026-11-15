import { useEffect, useState, type RefObject } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * Scrollytelling: which of a passage's items (by `selector`, inside `root`) is
 * crossing the middle of the screen, as a position 0–1 through them. Null when
 * reduced motion is on, the screen is narrow, or nothing is in the middle —
 * the figure's own buttons are always there.
 */
export function useScrollSync(root: RefObject<HTMLElement | null>, selector: string, minWidth = 1024): number | null {
  const still = useReducedMotion()
  const [pos, setPos] = useState<number | null>(null)

  useEffect(() => {
    const el = root.current
    if (!el || still || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia(`(max-width: ${minWidth - 1}px)`).matches) return
    const items = Array.from(el.querySelectorAll<HTMLElement>(selector))
    if (items.length < 2) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const i = items.indexOf(e.target as HTMLElement)
          if (i >= 0) {
            items.forEach((it, k) => it.toggleAttribute('data-current', k === i))
            setPos(i / (items.length - 1))
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    items.forEach((it) => io.observe(it))
    return () => io.disconnect()
  }, [root, selector, still, minWidth])

  return pos
}
