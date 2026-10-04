import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Problem, ProblemsResponse } from '@/components/problems/types'

/**
 * Debounced problem-title lookup for inline search dropdowns. Returns [] until
 * the query is at least 2 chars, then fetches a handful of matches.
 */
export function useProblemSuggestions(query: string, limit = 6) {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(false)
  const q = query.trim()

  useEffect(() => {
    if (q.length < 2) {
      setProblems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await api.get<ProblemsResponse>('/api/problems', { query: { search: q, limit } })
        setProblems(res.problems ?? [])
      } catch {
        setProblems([])
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => clearTimeout(t)
  }, [q, limit])

  return { problems, loading }
}
