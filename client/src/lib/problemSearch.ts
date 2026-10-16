import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Problem, ProblemsResponse } from '@/components/problems/types'

/**
 * Title search over the problem library, shared by the top-bar search and the
 * command palette. Answers are cached for the session (and in-flight requests
 * shared), so retyping a query, or opening the palette on the same query, is
 * instant.
 */
const cache = new Map<string, Problem[]>()
const inflight = new Map<string, Promise<Problem[]>>()
const MAX_CACHE = 60

const keyFor = (query: string, limit: number) => `${limit}:${query.trim().toLowerCase()}`

export function searchProblems(query: string, limit = 6): Promise<Problem[]> {
  const key = keyFor(query, limit)
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  const pending = inflight.get(key)
  if (pending) return pending
  const p = api
    .get<ProblemsResponse>('/api/problems', { query: { search: query.trim(), limit } })
    .then((res) => {
      const list = res.problems ?? []
      cache.set(key, list)
      if (cache.size > MAX_CACHE) {
        const oldest = cache.keys().next().value
        if (oldest !== undefined) cache.delete(oldest)
      }
      return list
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

type SearchState = { q: string; results: Problem[]; loading: boolean }

/**
 * Debounced problem search for a live query. Keeps the previous results on
 * screen while the next request is in flight (no flash of an empty list),
 * and answers cached queries without waiting for the debounce.
 */
export function useProblemSearch(query: string, { enabled = true, limit = 6, delay = 140 } = {}) {
  const q = query.trim()
  const active = enabled && q.length >= 2
  const [state, setState] = useState<SearchState>({ q: '', results: [], loading: false })

  useEffect(() => {
    if (!active) return
    let live = true
    const hit = cache.get(keyFor(q, limit))
    // Cached: answer on the next tick, without the debounce.
    const t = window.setTimeout(
      () => {
        if (hit) {
          setState({ q, results: hit, loading: false })
          return
        }
        setState((s) => ({ ...s, loading: true }))
        searchProblems(q, limit)
          .then((results) => live && setState({ q, results, loading: false }))
          .catch(() => live && setState({ q, results: [], loading: false }))
      },
      hit ? 0 : delay,
    )
    return () => {
      live = false
      window.clearTimeout(t)
    }
  }, [q, active, limit, delay])

  if (!active) return { results: [] as Problem[], loading: false, settled: false }
  const current = state.q === q
  // Results for an older query stay visible until the new ones land.
  return { results: state.results, loading: state.loading || !current, settled: current && !state.loading }
}
