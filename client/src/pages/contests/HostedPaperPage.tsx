import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { BackButton, Button, ErrorState, LoadingBlock } from '@/components/ui'
import { CbtConsole, type CbtResponse } from '@/gate/cbt/CbtConsole'
import type { GateQuestion } from '@/gate/types'
import { Markdown } from '@/learn/md'
import { api } from '@/lib/api'
import { minutes, TYPE_LABEL, type ContestView, type QType, marksOf } from '@/components/contests/hosted/api'
import { useLoaded } from '@/components/contests/hosted/useLoaded'
import '@/components/contests/hosted/hosted.css'

/*
  The GATE-style part of a hosted contest: the exam console while your time
  runs (answered once, graded on the server), then your answers. Right
  answers and solutions appear when the host's rules allow (after you
  finish, or after the contest ends).
*/

type PaperQ = GateQuestion & { negative?: number; custom?: boolean; solutionText?: string; bankId?: string }
type Mine = Record<string, { response: CbtResponse | null; attempted: boolean; timeMs: number; correct?: boolean; marks?: number }>
type Paper = { questions: PaperQ[]; review: boolean; submitted: boolean; mine: Mine | null; endsAt: number | null; negativeMarking: boolean }

export default function HostedPaperPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [handedIn, setHandedIn] = useState<{ marks?: number } | null>(null)
  const { data, error, reload } = useLoaded(async () => {
    const [view, paper] = await Promise.all([api.get<ContestView>(`/api/hosted/${id}`), api.get<Paper>(`/api/hosted/${id}/paper`)])
    return { view, paper, at: Date.now() }
  }, [id])
  const load = reload

  if (error && !data) return <ErrorState message={error} onRetry={() => void reload()} />
  if (!data) return <LoadingBlock rows={6} className="py-8" />
  const { view, paper } = data
  const c = view.contest
  const back = () => navigate(`/contests/c/${c.code}`)
  const running = view.me?.state === 'running'

  if (running && !paper.submitted && !handedIn && paper.endsAt) {
    const left = Math.max(1, Math.floor((paper.endsAt - data.at) / 60000))
    return (
      <CbtConsole
        title={c.title}
        questions={paper.questions}
        sections={[{ id: 'all', title: 'Questions', count: paper.questions.length, marks: paper.questions.reduce((a, q) => a + (q.marks ?? 1), 0) }]}
        sectionOf={() => 'all'}
        durationMinutes={left}
        deadline={paper.endsAt}
        totalMarks={Math.round(paper.questions.reduce((a, q) => a + (q.marks ?? 1), 0) * 100) / 100}
        storageKey={`nexora:contest-paper:${c.id}`}
        negativeMarking={paper.questions.some((q) => (q.negative ?? 0) > 0)}
        intro={
          <p>
            This is part of <strong>{c.title}</strong>. You can hand it in only once. The clock is your contest time: when it reaches zero, your answers are handed in.
            {paper.questions.some((q) => (q.negative ?? 0) > 0) ? ' Some questions lose marks for a wrong answer, as the host set. Leaving a question blank never loses marks.' : ''}
          </p>
        }
        onExit={back}
        exitLabel="Back to the contest"
        onSubmit={async (responses, timeSpent) => {
          const timeMs = Object.fromEntries(Object.entries(timeSpent).map(([k, v]) => [k, Math.round(v * 1000)]))
          const r = await api.post<{ marks?: number; review: boolean }>(`/api/hosted/${c.id}/paper`, { responses, timeMs })
          try {
            localStorage.removeItem(`nexora:contest-paper:${c.id}`)
          } catch {
            /* ignore */
          }
          setHandedIn({ marks: r.marks })
          window.scrollTo({ top: 0 })
          await load()
        }}
      />
    )
  }

  return (
    <div className="hc">
      <BackButton />
      <header className="hc-head">
        <div className="min-w-0">
          <p className="ed-label">{c.title}</p>
          <h1 className="ed-title">{view.host && !view.me ? 'The paper' : 'Your answers'}</h1>
        </div>
        <Button variant="outline" onClick={back}>
          Back to the contest
        </Button>
      </header>

      {(handedIn || (paper.submitted && !paper.review)) && (
        <p className="hc-banner" data-tone="success" role="status">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          {handedIn?.marks != null ? `Handed in. You scored ${marksOf(handedIn.marks)}.` : `Handed in. ${c.settings.review === 'after_finish' ? 'Your marks show when you finish the contest.' : 'Marks and the right answers show when the contest ends.'}`}
        </p>
      )}
      {!paper.submitted && !view.host && <p className="hc-banner">You did not hand in answers for this part.</p>}

      <Review paper={paper} />
    </div>
  )
}

function answerText(q: PaperQ, a: unknown): string {
  if (a == null || a === '' || (Array.isArray(a) && !a.length)) return 'No answer'
  if (q.type === 'NAT') {
    const s = String(a)
    const m = s.match(/^(-?[\d.]+):(-?[\d.]+)$/)
    return m ? `from ${m[1]} to ${m[2]}` : s
  }
  const letters = Array.isArray(a) ? a : String(a).split(/[;,\s]+/).filter(Boolean)
  return letters.map(String).join(', ')
}

function Review({ paper }: { paper: Paper }) {
  return (
    <ol className="hc-review m-0 list-none p-0">
      {paper.questions.map((q, i) => {
        const m = paper.mine?.[q.id]
        const tone = !paper.review || !m ? undefined : !m.attempted ? undefined : m.correct ? 'success' : 'error'
        return (
          <li key={q.id} className="hc-review-q" data-tone={tone}>
            <p className="hc-meta m-0 mb-2">
              <strong className="text-text-primary">Question {i + 1}</strong>
              <span>{TYPE_LABEL[q.type as QType] ?? q.type}</span>
              <span>
                {q.marks ?? 1} mark{(q.marks ?? 1) === 1 ? '' : 's'}
                {q.negative ? `, −${q.negative} if wrong` : ''}
              </span>
              {!q.custom && <span>GATE past paper</span>}
            </p>
            <Markdown md={q.text} />
            {q.figures?.map((f, k) => (
              <figure key={k} className="m-0 mt-2">
                <img src={f.svg || f.f} alt={f.alt || `Figure ${k + 1}`} loading="lazy" />
              </figure>
            ))}
            {q.options?.length > 0 && (
              <ol className="mt-2 grid list-none gap-1 p-0" aria-label="Options">
                {q.options.map((o) => (
                  <li key={o.l} className="flex gap-2">
                    <strong className="w-5 shrink-0">{o.l}</strong>
                    <Markdown md={o.t} className="[&_p]:!m-0" />
                  </li>
                ))}
              </ol>
            )}
            <div className="hc-ans">
              {m ? (
                <span>
                  Your answer: <strong>{answerText(q, m.response)}</strong>
                  {m.timeMs ? ` · ${minutes(m.timeMs)} on it` : ''}
                  {paper.review && m.attempted ? (m.correct ? ' · right' : ' · wrong') : ''}
                  {paper.review && m.marks != null ? ` · ${marksOf(m.marks)}` : ''}
                </span>
              ) : null}
              {paper.review && q.answer != null && (
                <span>
                  Right answer: <strong>{answerText(q, q.answer)}</strong>
                </span>
              )}
            </div>
            {paper.review && q.solutionText?.trim() && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-text-secondary">Solution</p>
                <Markdown md={q.solutionText} />
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
