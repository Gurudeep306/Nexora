import { useLayoutEffect, type RefObject } from 'react'

const MATHS = '.md-math, .nm'
/** Smallest scale before a formula is left to overflow (it stays readable). */
const MIN_SCALE = 0.6

/**
 * Inline maths that cannot wrap (one long overlined group, say) and is wider
 * than its box is scaled down to fit, instead of pushing the card past a phone
 * screen. Runs again when the box changes size.
 */
export function useFitMaths(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = root.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const fit = () => {
      const box = el.getBoundingClientRect().width
      el.querySelectorAll<HTMLElement>(MATHS).forEach((m) => {
        m.style.fontSize = ''
        const w = m.getBoundingClientRect().width
        if (box > 0 && w > box) m.style.fontSize = `${Math.max(MIN_SCALE, Math.floor((box / w) * 100) / 100)}em`
      })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  })
}
