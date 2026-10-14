/*
  Shared, cached data hooks for the GATE pages. Every hook goes through useApi
  with a stable cacheKey, so the shell, the home page and analytics share one
  request per resource and revisits render instantly.

  Until the backend ships, the per-user endpoints 404; callers treat
  `error` as "no data yet" and render their empty states.
*/
import { useMemo } from 'react'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { gateApi } from '@/gate/api'
import type { GateList, GateMeta, GateQuestion } from '@/gate/types'
import { bankExams, type GateExam } from './examStore'

export function useGateMeta() {
  return useApi<GateMeta>(() => api.get<GateMeta>('/api/gate/meta'), [], { cacheKey: 'gate:meta' })
}

export function useGateSummary() {
  return useApi(() => gateApi.summary().then((r) => r.summary), [], { cacheKey: 'gate:me:summary' })
}

export function useReviewDue() {
  return useApi(() => gateApi.reviewQueue(1).then((r) => r.dueCount), [], { cacheKey: 'gate:me:review-count' })
}

export function useGatePlan() {
  return useApi(() => gateApi.plan().then((r) => r.plan), [], { cacheKey: 'gate:me:plan' })
}

export function useGateTests() {
  return useApi(() => gateApi.tests().then((r) => r.tests), [], { cacheKey: 'gate:me:tests' })
}

export function useGateDaily() {
  return useApi(() => gateApi.daily(), [], { cacheKey: 'gate:daily' })
}

export function useGateTrends(exam: GateExam) {
  return useApi(() => gateApi.trends(exam).then((r) => r.trends), [exam], { cacheKey: `gate:trends:${exam}` })
}

export function useGateProgressAll() {
  return useApi(() => gateApi.progress().then((r) => r.progress), [], { cacheKey: 'gate:me:progress' })
}

/**
 * Question counts per "subject/topic" (and per subject) for one exam, from the
 * public list endpoint's facets — works without the per-user backend.
 */
export function useTopicCounts(exam: GateExam) {
  return useApi(
    () =>
      api
        .get<GateList>('/api/gate/questions', { query: { exam: bankExams(exam).join(','), limit: 1 } })
        .then((r) => ({ topic: r.facets.topic ?? {}, subject: r.facets.subject, year: r.facets.year, type: r.facets.type, total: r.total })),
    [exam],
    { cacheKey: `gate:facets:${exam}` },
  )
}

/** Fetch question details for a list of ids (≤ 100), keyed by id. */
export function useQuestionsByIds(ids: string[]) {
  const list = useMemo(() => [...new Set(ids)].slice(0, 100), [ids])
  const key = list.join(',')
  return useApi<Record<string, GateQuestion>>(
    () =>
      api
        .get<GateList>('/api/gate/questions', { query: { ids: key, limit: 100 } })
        .then((r) => Object.fromEntries(r.questions.map((q) => [q.id, q]))),
    [key],
    { cacheKey: `gate:qs:${key}`, skip: list.length === 0 },
  )
}
