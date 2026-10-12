import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import type { SolutionResponse } from './types'

/** Lazily fetches one question's solution (v2, legacy text or none). */
export function useGateSolution(id: string, enabled = true) {
  return useApi<SolutionResponse>(() => api.get<SolutionResponse>(`/api/gate/questions/${encodeURIComponent(id)}/solution`), [id], {
    skip: !enabled,
    cacheKey: enabled ? `gate:sol:${id}` : undefined,
  })
}

export type GateSolutionState = ReturnType<typeof useGateSolution>

/** Plain text of what the solution panel shows — for the AI assistant's page context. */
export function solutionToText(res: SolutionResponse | null | undefined): string {
  if (!res) return ''
  if (res.format === 'legacy') return res.legacy
  if (res.format !== 'v2') return ''
  const s = res.solution
  return [
    `Approach: ${s.approach}`,
    s.given ? `Given: ${s.given}` : '',
    ...s.steps.map((st, i) => `Step ${i + 1} — ${st.title}\n${st.body}`),
    `Answer: ${s.answer.value}${s.answer.matchesKey ? '' : ` (${s.answer.keyNote ?? 'differs from the stored key'})`}`,
    ...(s.optionAnalysis ?? []).map((o) => `(${o.option}) ${o.correct ? 'correct' : 'wrong'}: ${o.reason}`),
    s.shortcut ? `Shortcut: ${s.shortcut}` : '',
    ...(s.pitfalls ?? []).map((p) => `Pitfall: ${p}`),
  ]
    .filter(Boolean)
    .join('\n\n')
}
