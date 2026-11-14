// Route changes with the browser's View Transitions API. The app uses a plain
// BrowserRouter, whose `viewTransition` option does nothing, so Hive starts the
// transition itself. Falls back to a plain navigation where the API is missing
// or the person prefers reduced motion.
import { flushSync } from 'react-dom'
import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'

type Doc = Document & { startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> } }

export function canTransition() {
  return typeof document !== 'undefined' && 'startViewTransition' in document && !matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Navigate inside a view transition. `waitFor` is a CSS selector the new page
 * must show before the "after" picture is taken (data can arrive a moment
 * later); Hive waits at most 350 ms for it.
 */
export function transitionTo(go: () => void, waitFor?: string) {
  const d = document as Doc
  if (!canTransition() || !d.startViewTransition) return go()
  d.startViewTransition(async () => {
    flushSync(go)
    if (!waitFor) return
    const until = performance.now() + 350
    while (!document.querySelector(waitFor) && performance.now() < until) await new Promise((r) => setTimeout(r, 16)) // animation frames are paused during the capture
  })
}

/** For a link's onClick: keeps new-tab clicks (⌘/Ctrl/Shift/middle) as normal links. */
export function plainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented
}

/** onClick for a NavLink: a plain click navigates inside a cross-fade. */
export function useNavFade() {
  const navigate = useNavigate()
  return (e: MouseEvent, to: string) => {
    if (!plainClick(e) || !canTransition()) return
    e.preventDefault()
    transitionTo(() => navigate(to))
  }
}
