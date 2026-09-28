import { useEffect } from 'react'

const SURFACES = '.card, .card-neon'

/**
 * A spot of light that follows the pointer across whichever glass pane it is
 * over — the way light moves across Liquid Glass as you look at it.
 *
 * One passive listener for the whole document: it finds the pane under the
 * pointer and writes the pointer's position, relative to that pane, into
 * --mx / --my (at most once a frame). The card utility in index.css draws a
 * soft radial highlight at that point; its colour comes from --spot-color,
 * which is transparent when there is no wallpaper or the glass is Solid.
 * Skipped on touch screens and for reduced motion.
 */
export function useSurfaceLight() {
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const hover = window.matchMedia?.('(hover: hover)').matches
    if (reduce || !hover) return

    let current: HTMLElement | null = null
    let frame = 0
    let x = 0
    let y = 0

    const clear = (el: HTMLElement | null) => {
      el?.style.removeProperty('--mx')
      el?.style.removeProperty('--my')
    }
    const paint = () => {
      frame = 0
      if (!current) return
      const r = current.getBoundingClientRect()
      current.style.setProperty('--mx', `${Math.round(x - r.left)}px`)
      current.style.setProperty('--my', `${Math.round(y - r.top)}px`)
    }
    const onMove = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null
      const el = (target?.closest(SURFACES) as HTMLElement | null) ?? null
      if (el !== current) {
        clear(current)
        current = el
      }
      if (!el) return
      x = e.clientX
      y = e.clientY
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const onLeave = () => {
      clear(current)
      current = null
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
      clear(current)
    }
  }, [])
}
