import { useMemo } from 'react'
import type { GateMeta } from '@/gate/types'
import type { GateExam } from '@/gate/shell/examStore'
import { useGateMeta } from '@/gate/shell/useGateData'
import { titleCase } from './format'

export interface SubjectInfo {
  id: string
  name: string
  /** Not in the current syllabus (kept for old papers). */
  legacy: boolean
  topics: { id: string; name: string }[]
}

export function subjectsOf(meta: GateMeta | null | undefined, exam: GateExam): SubjectInfo[] {
  const subjects = meta?.subjects?.[exam] ?? {}
  return Object.entries(subjects).map(([id, s]) => ({
    id,
    name: s.name,
    legacy: id === 'legacy',
    topics: Object.entries(s.topics ?? {}).map(([tid, name]) => ({ id: tid, name })),
  }))
}

/** Subjects of the exam plus name lookups. */
export function useSubjects(exam: GateExam) {
  const meta = useGateMeta()
  return useMemo(() => {
    const list = subjectsOf(meta.data, exam)
    const byId = new Map(list.map((s) => [s.id, s]))
    const subjectName = (id: string) => byId.get(id)?.name ?? titleCase(id)
    const topicName = (sid: string, tid: string) => byId.get(sid)?.topics.find((t) => t.id === tid)?.name ?? titleCase(tid)
    return { list, byId, subjectName, topicName, meta }
  }, [meta, exam])
}

/** Short subject label for chart axes. */
export function shortSubject(name: string): string {
  const map: Record<string, string> = {
    'General Aptitude': 'Aptitude',
    'Discrete Mathematics': 'Discrete Maths',
    'Probability & Statistics': 'Prob & Stats',
    'Computer Organization & Architecture': 'COA',
    'Programming & Data Structures': 'Prog & DS',
    'Theory of Computation': 'TOC',
    'Operating Systems': 'OS',
    'Computer Networks': 'Networks',
    'Programming, Data Structures & Algorithms': 'Prog, DS & Algo',
    'Database Management & Warehousing': 'DBMS & DW',
    'Calculus & Optimization': 'Calculus & Opt',
    'Other / no longer in syllabus': 'Legacy',
  }
  return map[name] ?? name
}
