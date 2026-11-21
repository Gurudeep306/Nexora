import type { NavigateFunction } from 'react-router-dom'
import { api } from '@/lib/api'
import type { ProblemsResponse } from '@/components/problems/types'

/** Open a random problem from the whole library (the palette's "Surprise me"). */
export async function goToRandomProblem(navigate: NavigateFunction) {
  try {
    const first = await api.get<ProblemsResponse>('/api/problems', { query: { limit: 1 } })
    const offset = Math.floor(Math.random() * Math.max(first.total, 1))
    const pick = await api.get<ProblemsResponse>('/api/problems', { query: { limit: 1, offset } })
    if (pick.problems?.[0]) navigate(`/solve/${pick.problems[0].id}`)
  } catch {
    navigate('/problems')
  }
}
