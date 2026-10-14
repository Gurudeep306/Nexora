import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { agentTask } from '@/lib/agent'
import { useAgentPageContext } from '@/context/AgentContext'
import { Icon } from '@/components/icon/Icon'
import { GateAiReport, type ExamEvaluation, type AiDiagnostic } from './GateAiReport'
import { CbtConsole, type CbtResponse } from './cbt/CbtConsole'
import { paperLabel, type GateQuestion, type GatePaper } from './types'

/*
 * An official past paper as a timed mock, in the TCS iON console
 * (cbt/CbtConsole). The server sends the paper without answers; it grades
 * via /api/gate/evaluate (which also records the attempts — nothing is
 * recorded from here) and the AI report follows.
 */

export type { QuestionStatus } from './cbt/CbtConsole'

export interface CbtPaperData {
  paper: GatePaper
  sections: Array<{ id: string; title: string; count: number; marks: number }>
  totalQuestions: number
  totalMarks: number
  durationMinutes: number
  questions: GateQuestion[]
}

const storeKey = (paperId: string) => `nexora:gate-cbt:${paperId}`

export function GateCbtExam({ paperId, onExit }: { paperId: string; onExit: () => void }) {
  const [data, setData] = useState<CbtPaperData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [evalResult, setEvalResult] = useState<ExamEvaluation | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AiDiagnostic | null>(null)

  useEffect(() => {
    let unmounted = false
    api
      .get<CbtPaperData>(`/api/gate/paper/${paperId}`)
      .then((res) => {
        if (unmounted) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (unmounted) return
        setError(err.message || 'Failed to load paper.')
        setLoading(false)
      })
    return () => {
      unmounted = true
    }
  }, [paperId])

  useAgentPageContext(evalResult ? { examReview: true, title: `${data?.paper.exam ?? 'GATE'} ${data?.paper.year ?? ''} mock — results` } : null)

  const submit = async (responses: Record<string, CbtResponse>, timeSpent: Record<string, number>) => {
    const evalRes = await api.post<ExamEvaluation>('/api/gate/evaluate', { paperId, responses, timeSpent })
    setEvalResult(evalRes)
    try {
      const diagRes = await api.post<{ ok: true; analysis: AiDiagnostic }>('/api/gate/ai-analysis', { evalResult: evalRes })
      setAiAnalysis(diagRes.analysis)
      const a = diagRes.analysis
      agentTask<string>(
        'gate_narrative',
        {
          analysis: {
            score: `${evalRes.totalScore}/${evalRes.maxMarks}`,
            accuracy: evalRes.accuracy,
            negativeMarks: evalRes.negativeMarks,
            attempted: evalRes.attemptedCount,
            profile: a.speedAccuracyProfile,
            strengths: a.strengths,
            weaknesses: a.vulnerabilities,
            sections: evalRes.sectionStats,
          },
        },
        { timeoutMs: 45000 },
      )
        .then((narrative) => narrative && setAiAnalysis((prev) => (prev ? { ...prev, narrative } : prev)))
        .catch(() => undefined)
    } catch {
      /* the score report works without the diagnostic */
    }
  }

  const ga = data?.sections.find((s) => s.id === 'ga')?.id ?? 'ga'
  const core = data?.sections.find((s) => s.id !== 'ga')?.id ?? 'subject'
  const sectionOf = useCallback((q: GateQuestion) => (q.section === 'ga' ? ga : core), [ga, core])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-accent-brand border-t-transparent" />
        <p className="text-[14px] text-text-muted">Loading the paper…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <Icon name="warning" className="mx-auto size-9 text-state-error" />
        <h3 className="mt-3 text-lg font-semibold text-text-primary">Couldn’t start the mock</h3>
        <p className="mt-1 text-sm text-text-muted">{error}</p>
        <button type="button" onClick={onExit} className="btn-secondary mt-4">
          Back to papers
        </button>
      </div>
    )
  }

  if (evalResult) {
    const questionsMap = new Map(data.questions.map((q) => [q.id, q]))
    return (
      <GateAiReport
        evalResult={evalResult}
        aiAnalysis={aiAnalysis}
        questionsMap={questionsMap}
        onRetake={() => {
          setEvalResult(null)
          setAiAnalysis(null)
          setAttempt((n) => n + 1)
        }}
        onBackToBank={onExit}
      />
    )
  }

  return (
    <CbtConsole
      key={attempt}
      title={paperLabel(data.paper)}
      questions={data.questions}
      sections={data.sections.map((s) => ({ ...s, title: s.id === 'ga' ? 'General Aptitude' : s.title }))}
      sectionOf={sectionOf}
      durationMinutes={data.durationMinutes || 180}
      totalMarks={data.totalMarks}
      storageKey={storeKey(paperId)}
      onExit={onExit}
      exitLabel="Back to papers"
      onSubmit={submit}
    />
  )
}
