/*
  Inputs the plan generator needs, derived from public data so the planner and
  the home page work before the per-user backend ships:
    weight      subject → average marks per paper (trends), else PYQ share
    topicCount  "subject/topic" → PYQ count (bank facets)
*/
import { useMemo } from 'react'
import type { StudyPlan } from '@/gate/api'
import type { GateExam } from '@/gate/shell/examStore'
import { useGatePlan, useGateTrends, useTopicCounts } from '@/gate/shell/useGateData'
import { useSubjects } from './subjects'

export const DEFAULT_PLAN: StudyPlan = { examDate: null, hoursPerDay: 3, priorities: {}, days: [1, 2, 3, 4, 5, 6] }

/** Average marks of a subject over the most recent `n` years it appeared in. */
export function avgMarks(byYear: Record<number, number> | undefined, n = 5): number {
  if (!byYear) return 0
  const ys = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, n)
  return ys.length ? ys.reduce((a, y) => a + (byYear[y] ?? 0), 0) / ys.length : 0
}

export function usePlanInputs(exam: GateExam) {
  const subjects = useSubjects(exam)
  const trends = useGateTrends(exam)
  const counts = useTopicCounts(exam)

  return useMemo(() => {
    const list = subjects.list.filter((s) => !s.legacy)
    const weight: Record<string, number> = {}
    for (const s of list) {
      const m = avgMarks(trends.data?.marksBySubjectYear?.[s.id])
      weight[s.id] = m > 0 ? m : (counts.data?.subject?.[s.id] ?? 0)
    }
    const topicCount: Record<string, number> = { ...(counts.data?.topic ?? {}) }
    // Trend topic counts fill gaps when facets are unavailable.
    for (const [sid, topics] of Object.entries(trends.data?.topicCounts ?? {}))
      for (const [tid, n] of Object.entries(topics)) topicCount[`${sid}/${tid}`] ??= n
    return {
      subjects: list,
      weight,
      topicCount,
      subjectName: subjects.subjectName,
      topicName: subjects.topicName,
      loading: subjects.meta.loading && !subjects.meta.data,
      trends,
      counts,
    }
  }, [subjects, trends, counts])
}

/* ── Plan with a browser fallback ───────────────────────────────────────────
   The saved plan comes from the server; a copy is kept in this browser so the
   countdown and today's tasks still work while the endpoint is unavailable. */

const LOCAL_KEY = 'nexora:gate-plan:v1'

export function readLocalPlan(): StudyPlan | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null') as StudyPlan | null
    return raw && typeof raw === 'object' && Array.isArray(raw.days) ? raw : null
  } catch {
    return null
  }
}

export function writeLocalPlan(plan: StudyPlan) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(plan))
  } catch {
    /* storage blocked: the server copy is the source of truth */
  }
}

/** { plan, loading, saved } — server plan, else the browser copy, else null. */
export function useStudyPlan() {
  const q = useGatePlan()
  return useMemo(() => {
    const plan = q.data ?? readLocalPlan()
    return { plan, loading: q.loading && !plan, fromServer: !!q.data, query: q }
  }, [q])
}
