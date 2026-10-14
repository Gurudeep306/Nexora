import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { ErrorState, LoadingBlock } from '@/components/ui'
import { GateShell } from '@/gate/shell/GateShell'
import { GATE_ROUTES, type GateTest } from '@/gate/api'
import { CbtConsole, type CbtSection } from '@/gate/cbt/CbtConsole'
import { fetchQuestions, loadTest, submitTest } from '@/gate/tests/testsData'
import { TestResultView } from '@/gate/tests/TestResultView'
import type { GateMeta, GateQuestion } from '@/gate/types'

/** A custom test: the CBT console until submitted, then the report. */
export default function GateTestPage() {
  const { testId = '' } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState<GateTest | null>(null)
  const [questions, setQuestions] = useState<GateQuestion[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const meta = useApi<GateMeta>(() => api.get<GateMeta>('/api/gate/meta'), [], { cacheKey: 'gate:meta' })

  useEffect(() => {
    let live = true
    loadTest(testId)
      .then(async (t) => {
        const qs = await fetchQuestions(t.questionIds)
        if (!live) return
        setTest(t)
        setQuestions(qs)
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load the test.'))
    return () => {
      live = false
    }
  }, [testId, round])

  const subjectName = useCallback(
    (s: string) => meta.data?.subjects?.CSE?.[s]?.name ?? meta.data?.subjects?.DA?.[s]?.name ?? s.toUpperCase(),
    [meta.data],
  )

  const exam = test?.config.exam
  /* Sections: GA + core like the real paper, else one per subject (≤ 6), else one. */
  const { sections, sectionOf } = useMemo(() => {
    const qs = questions ?? []
    const hasGa = qs.some((q) => q.section === 'ga')
    const hasCore = qs.some((q) => q.section !== 'ga')
    const marks = (list: GateQuestion[]) => list.reduce((a, q) => a + (q.marks ?? 1), 0)
    if (hasGa && hasCore) {
      const ga = qs.filter((q) => q.section === 'ga')
      const core = qs.filter((q) => q.section !== 'ga')
      return {
        sections: [
          { id: 'ga', title: 'General Aptitude', count: ga.length, marks: marks(ga) },
          { id: 'core', title: exam === 'DA' ? 'Data Science & AI' : 'Technical', count: core.length, marks: marks(core) },
        ] as CbtSection[],
        sectionOf: (q: GateQuestion) => (q.section === 'ga' ? 'ga' : 'core'),
      }
    }
    const subjects = [...new Set(qs.map((q) => q.subject))]
    if (subjects.length > 1 && subjects.length <= 6) {
      return {
        sections: subjects.map((s) => {
          const list = qs.filter((q) => q.subject === s)
          return { id: s, title: subjectName(s), count: list.length, marks: marks(list) }
        }),
        sectionOf: (q: GateQuestion) => q.subject,
      }
    }
    return { sections: [{ id: 'all', title: subjects.length === 1 ? subjectName(subjects[0]) : 'Questions', count: qs.length, marks: marks(qs) }], sectionOf: () => 'all' }
  }, [questions, exam, subjectName])

  // Keep the console's question order grouped by section.
  const ordered = useMemo(() => {
    if (!questions) return []
    const order = sections.map((s) => s.id)
    return [...questions].sort((a, b) => order.indexOf(sectionOf(a)) - order.indexOf(sectionOf(b)))
  }, [questions, sections, sectionOf])

  if (error) {
    return (
      <GateShell title="Test">
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null)
            setRound((r) => r + 1)
          }}
        />
      </GateShell>
    )
  }
  if (!test || !questions) {
    return (
      <GateShell title="Test">
        <LoadingBlock rows={6} />
      </GateShell>
    )
  }

  if (test.result) {
    return <TestResultView test={test} questions={questions} subjectName={subjectName} />
  }

  return (
    <CbtConsole
      title={test.title}
      questions={ordered}
      sections={sections}
      sectionOf={sectionOf}
      durationMinutes={test.config.durationMin}
      totalMarks={questions.reduce((a, q) => a + (q.marks ?? 1), 0)}
      storageKey={`nexora:gate-test-run:${test.id}`}
      negativeMarking={test.config.negativeMarking !== false}
      onExit={() => navigate(GATE_ROUTES.tests)}
      exitLabel="Back to tests"
      onSubmit={async (responses, timeSpent) => {
        const done = await submitTest(test, questions, responses, timeSpent)
        setTest(done)
        window.scrollTo({ top: 0 })
      }}
    />
  )
}
