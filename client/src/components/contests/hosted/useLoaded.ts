import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'

/**
 * Load on open (and when `deps` change), keep the last good data on screen
 * while loading again, and give a `reload` that can be awaited.
 */
export function useLoaded<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef(fetcher)
  useEffect(() => {
    ref.current = fetcher
  })
  const seq = useRef(0)
  const apply = useCallback((n: number, p: Promise<T>) => {
    return p.then(
      (d) => {
        if (n !== seq.current) return
        setData(d)
        setError(null)
      },
      (e: unknown) => {
        if (n !== seq.current) return
        setError(e instanceof ApiError ? e.message : 'Could not load this')
      },
    )
  }, [])
  const reload = useCallback(() => apply(++seq.current, ref.current()), [apply])
  useEffect(() => {
    void apply(++seq.current, ref.current())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, error, reload, setData }
}
