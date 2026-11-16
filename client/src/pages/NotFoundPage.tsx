import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { LogoMark } from '@/components/brand/Logo'
import '@/components/site/not-found.css'

/* The pages a binary search could look through, in sorted order (what the
   cells show). Real addresses on the site. */
const SHELF = ['/achievements', '/analytics', '/bookmarks', '/contests', '/gate', '/hub', '/learn', '/nexus', '/problems', '/profile', '/settings', '/social', '/submissions', '/theme', '/workshop', '/u']

interface Step {
  lo: number
  hi: number
  mid: number | null
  note: string
}

/** The steps of a binary search for `target` over SHELF, ending empty-handed. */
function searchSteps(target: string): Step[] {
  const steps: Step[] = []
  let lo = 0
  let hi = SHELF.length - 1
  steps.push({ lo, hi, mid: null, note: `Looking for ${target} among ${SHELF.length} pages, in order.` })
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const cmp = target.localeCompare(SHELF[mid])
    if (cmp === 0) break
    steps.push({ lo, hi, mid, note: `${SHELF[mid]} is ${cmp < 0 ? 'after' : 'before'} it, so that half goes.` })
    if (cmp < 0) hi = mid - 1
    else lo = mid + 1
  }
  steps.push({ lo, hi, mid: null, note: 'Nothing left to look at. The page isn’t here.' })
  return steps
}

export default function NotFoundPage() {
  const { pathname } = useLocation()
  // A real page address can't be "found" by this search: search for something just beside it.
  const target = SHELF.includes(pathname) ? `${pathname}~` : pathname
  const steps = searchSteps(target)
  const still = useReducedMotion()
  const [i, setI] = useState(0)
  const at = still ? steps.length - 1 : Math.min(i, steps.length - 1)
  useEffect(() => {
    if (still || i >= steps.length - 1) return
    const t = window.setTimeout(() => setI((n) => n + 1), i === 0 ? 900 : 1100)
    return () => window.clearTimeout(t)
  }, [i, still, steps.length])
  const step = steps[at]

  return (
    <div className="nf">
      <LogoMark size={56} write className="nf-mark" />
      <p className="ed-label mt-8">Error 404</p>
      <h1 className="ed-display-serif nf-title">This page wandered off the map.</h1>
      <p className="ed-lead nf-lead">
        There is nothing at <code className="nf-path">{pathname}</code>. It may have moved, or the link may have a typo.
      </p>

      <figure className="nf-search" aria-label="A binary search looks for the page and does not find it">
        <ol className="nf-cells">
          {SHELF.map((p, k) => {
            const state = k === step.mid ? 'mid' : k < step.lo || k > step.hi ? 'gone' : 'live'
            return (
              <li key={p} className="nf-cell" data-state={state}>
                {p.slice(1)}
              </li>
            )
          })}
        </ol>
        <figcaption className="nf-note" aria-live="polite">
          <span className="nf-step">
            Step {at + 1} of {steps.length}
          </span>{' '}
          {step.note}
        </figcaption>
      </figure>

      <div className="nf-actions">
        <Link to="/hub" className="ed-btn ed-btn-clay">
          Back to Today
        </Link>
        <Link to="/learn" className="ed-link">
          Browse the Library
        </Link>
      </div>
    </div>
  )
}
