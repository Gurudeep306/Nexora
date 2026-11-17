import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Shuffle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { prefetchHandlers } from '@/routes'
import './today.css'
import { KIND_LABEL, WINDOW_HOURS, choose, leadFor, windowOf, type DiscoverPick } from '@/lib/discover'

/**
 * "Something to explore": three picks from every real part of the site,
 * different for each person, changing every few hours by itself, and on
 * Shuffle. Used by Home (when there is nothing to continue) and GATE home.
 */
export function Discover({
  pool,
  n = 3,
  label = 'Something to explore',
  scope,
  skip,
  headingId,
  className,
}: {
  pool: DiscoverPick[]
  n?: number
  label?: string
  /** Keeps Home's and GATE's picks apart. */
  scope: string
  skip?: Set<string>
  headingId?: string
  className?: string
}) {
  const { user } = useAuth()
  const [shuffle, setShuffle] = useState(0)
  // The window changes on its own while the page is open.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5 * 60_000)
    return () => clearInterval(t)
  }, [])
  const seed = `${scope}:${user?.username ?? 'guest'}:${windowOf(now)}:${shuffle}`
  const picks = useMemo(() => choose(pool, n, seed, skip), [pool, n, seed, skip])
  if (!picks.length) return null

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="ed-label m-0">
          {label}
        </h2>
        <button
          type="button"
          onClick={() => setShuffle((s) => s + 1)}
          className="ed-link inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[12.5px]"
        >
          <Shuffle className="size-3.5" aria-hidden="true" /> Shuffle<span className="sr-only"> the picks</span>
        </button>
      </div>
      <p className="ed-body-sm ed-ink-2 mt-4 mb-0">
        {leadFor(seed)} <span className="ed-muted">New picks every {WINDOW_HOURS} hours.</span>
      </p>
      <ol className="today-path ed-rows mt-6 mb-0 list-none p-0" aria-live="polite">
        {picks.map((p, i) => (
          <li key={p.key}>
            <Link to={p.to} {...prefetchHandlers(p.to)} className="today-row">
              <span className="ed-serif-numeral ed-muted w-8 shrink-0">{['i', 'ii', 'iii', 'iv', 'v'][i]}</span>
              <span className="min-w-0 flex-1">
                <span className="ed-caption ed-muted block">
                  {KIND_LABEL[p.kind]} · {p.area}
                </span>
                <span className="ed-ui block font-medium">{p.title}</span>
                <span className="ed-caption ed-ink-2 block">{p.line}</span>
              </span>
              <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
