import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/*
 * Stale-while-revalidate cache for useApi calls that opt in with `cacheKey`.
 * Returning to a page renders the last response immediately (no skeleton)
 * while a fresh copy loads in the background. Entries live for the session
 * of one signed-in user — setApiCacheScope() clears them when the user
 * changes — and are dropped after MAX_AGE_MS.
 */
const MAX_AGE_MS = 10 * 60 * 1000
const cache = new Map<string, { data: unknown; at: number }>()
const inflight = new Map<string, Promise<unknown>>()
let scope: string | null = null

/** Call when the signed-in user changes; drops every cached response. */
export function setApiCacheScope(next: string | null) {
  if (next === scope) return
  scope = next
  cache.clear()
  inflight.clear()
}

function readCache<T>(key: string | undefined): T | null {
  if (!key) return null
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > MAX_AGE_MS) {
    cache.delete(key)
    return null
  }
  return hit.data as T
}

/** Run fetcher once per key at a time (shared by prefetch and mounted hooks). */
function fetchShared<T>(key: string | undefined, fetcher: () => Promise<T>): Promise<T> {
  if (!key) return fetcher()
  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>
  const owner = scope
  const p = fetcher().then(
    (data) => {
      if (owner === scope) cache.set(key, { data, at: Date.now() })
      if (inflight.get(key) === p) inflight.delete(key)
      return data
    },
    (err: unknown) => {
      if (inflight.get(key) === p) inflight.delete(key)
      throw err
    },
  )
  inflight.set(key, p)
  return p
}

/**
 * Warm the cache for a page's data before it mounts (e.g. on nav-link hover).
 * Skips keys that are already cached and fresh (< 30s) or loading.
 */
export function prefetchApi<T>(key: string, fetcher: () => Promise<T>): void {
  const hit = cache.get(key)
  if ((hit && Date.now() - hit.at < 30_000) || inflight.has(key)) return
  fetchShared(key, fetcher).catch(() => {})
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: { skip?: boolean; cacheKey?: string } = {},
): ApiState<T> & { refetch: () => void; setData: React.Dispatch<React.SetStateAction<T | null>> } {
  const { skip, cacheKey } = options
  const [state, setState] = useState<ApiState<T>>(() => {
    const cached = skip ? null : readCache<T>(cacheKey)
    return { data: cached, loading: !skip && cached === null, error: null }
  })
  const mounted = useRef(true)
  const requestId = useRef(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const keyRef = useRef(cacheKey)
  keyRef.current = cacheKey

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      requestId.current++
    }
  }, [])

  const run = useCallback(
    (silent: boolean) => {
      const id = ++requestId.current
      if (skip) {
        setState({ data: null, loading: false, error: null })
        return
      }
      const key = keyRef.current
      const cached = readCache<T>(key)
      if (silent && cached !== null) {
        // Show what we have; revalidate quietly.
        setState({ data: cached, loading: false, error: null })
      } else {
        setState((s) => ({ ...s, loading: true, error: null }))
      }
      const request = silent ? fetchShared(key, () => fetcherRef.current()) : fetcherRef.current()
      request
        .then((data) => {
          if (key && !silent) cache.set(key, { data, at: Date.now() })
          if (mounted.current && id === requestId.current) setState({ data, loading: false, error: null })
        })
        .catch((err: unknown) => {
          if (!mounted.current || id !== requestId.current) return
          // A failed background refresh keeps the cached copy on screen.
          if (silent && cached !== null) {
            setState({ data: cached, loading: false, error: null })
            return
          }
          setState({
            data: null,
            loading: false,
            error: err instanceof ApiError ? err.message : 'Failed to load data',
          })
        })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skip, cacheKey, ...deps],
  )

  // Mount / deps change: serve from cache if possible and revalidate silently.
  useEffect(() => run(true), [run])

  const refetch = useCallback(() => run(false), [run])

  const setData = useCallback<React.Dispatch<React.SetStateAction<T | null>>>((value) => {
    setState((previous) => {
      const data =
        typeof value === 'function' ? (value as (data: T | null) => T | null)(previous.data) : value
      const key = keyRef.current
      if (key) {
        if (data === null) cache.delete(key)
        else cache.set(key, { data, at: Date.now() })
      }
      return { ...previous, data }
    })
  }, [])

  return { ...state, refetch, setData }
}
