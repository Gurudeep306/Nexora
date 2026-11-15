/*
  One of our own practice questions inside a lesson: answer, check, see
  why a common wrong answer is wrong, then the worked steps. Checking is
  local (these are not exam questions); a later step feeds the result into
  the review queue.
*/
import { useState } from 'react'
import { AnswerField, CheckButton, Masthead, OptionList, OptionRow, QuestionActions, QuestionCard, QuestionHint, QuestionText, SolutionBlock, SolutionSteps, TextAction, Verdict, type OptionState } from '@/components/question/Question'
import type { PracticeQuestion } from '../types'
import { Nodes } from './NotesContent'

type Pick = string | string[] | null

function isCorrect(q: PracticeQuestion, pick: Pick): boolean {
  if (pick === null || pick === '' || (Array.isArray(pick) && !pick.length)) return false
  if (q.type === 'MCQ') return pick === q.answer
  if (q.type === 'MSQ') {
    const want = [...(q.answer as string[])].sort().join()
    return Array.isArray(pick) && [...pick].sort().join() === want
  }
  const v = Number(pick)
  if (!Number.isFinite(v)) return false
  const [lo, hi] = Array.isArray(q.answer) ? (q.answer as [number, number]) : [q.answer as number, q.answer as number]
  const tol = 1e-9 * Math.max(1, Math.abs(hi))
  return v >= lo - tol && v <= hi + tol
}

function matchWrong(q: PracticeQuestion, pick: Pick) {
  return q.common_wrong.find((w) => {
    if (q.type === 'NAT') return Number(pick) === Number(w.answer)
    const a = [w.answer].flat().map(String).sort().join()
    const p = [pick ?? ''].flat().map(String).sort().join()
    return a === p
  })
}

const fmtAnswer = (q: PracticeQuestion) =>
  Array.isArray(q.answer) ? (q.type === 'NAT' ? `${q.answer[0]} to ${q.answer[1]}` : q.answer.join(', ')) : String(q.answer)

export function PracticeEmbed({ q }: { q: PracticeQuestion }) {
  const [pick, setPick] = useState<Pick>(q.type === 'MSQ' ? [] : null)
  const [checked, setChecked] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const correct = checked && isCorrect(q, pick)
  const wrong = checked && !correct ? matchWrong(q, pick) : undefined
  const hasPick = pick !== null && pick !== '' && !(Array.isArray(pick) && !pick.length)
  const keys = [q.answer].flat().map(String)

  const choose = (l: string) => {
    if (checked) return
    if (q.type === 'MSQ') setPick((p) => (Array.isArray(p) && p.includes(l) ? p.filter((x) => x !== l) : [...((p as string[]) ?? []), l]))
    else setPick(l)
  }
  const check = () => {
    if (!hasPick) return
    setChecked(true)
    // The reasoning opens by itself on a wrong answer.
    if (!isCorrect(q, pick)) setShowSolution(true)
  }

  return (
    <QuestionCard as="div" className="np" masthead={<Masthead parts={[<strong key="p">Practice</strong>, q.type, `${q.marks ?? 1} mark${(q.marks ?? 1) === 1 ? '' : 's'}`, 'Check yourself']} />}>
      <QuestionText className="np-text">
        <Nodes nodes={q.text} />
      </QuestionText>

      {q.options && (
        <div className="grid gap-2">
          {q.type === 'MSQ' && !checked && <QuestionHint>Select every option that is true.</QuestionHint>}
          <OptionList multi={q.type === 'MSQ'}>
            {q.options.map((o) => {
              const on = Array.isArray(pick) ? pick.includes(o.l) : pick === o.l
              const key = keys.includes(o.l)
              const state: OptionState = !checked ? 'idle' : key && on ? 'right' : key ? (q.type === 'MSQ' ? 'missed' : 'right') : on ? 'wrong' : 'dim'
              return (
                <OptionRow key={o.l} letter={o.l} multi={q.type === 'MSQ'} selected={on} state={state} disabled={checked} onClick={() => choose(o.l)}>
                  <Nodes nodes={o.c} />
                </OptionRow>
              )
            })}
          </OptionList>
        </div>
      )}

      {q.type === 'NAT' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            check()
          }}
        >
          <AnswerField
            type="text"
            inputMode="decimal"
            value={typeof pick === 'string' ? pick : ''}
            disabled={checked}
            onChange={(e) => setPick(e.target.value.replace(/[^0-9.eE+-]/g, ''))}
            placeholder="0.00"
            state={checked ? (correct ? 'right' : 'wrong') : 'idle'}
          />
        </form>
      )}

      {checked && (
        <Verdict
          tone={correct ? 'right' : 'wrong'}
          detail={
            wrong ? (
              <div className="np-why">
                <Nodes nodes={wrong.why} />
              </div>
            ) : undefined
          }
        >
          {correct ? 'Correct.' : <>Not quite. The answer is {fmtAnswer(q)}.</>}
        </Verdict>
      )}

      <QuestionActions>
        {!checked ? (
          <CheckButton disabled={!hasPick} onClick={check}>
            Check
          </CheckButton>
        ) : (
          <TextAction
            onClick={() => {
              setChecked(false)
              setShowSolution(false)
              setPick(q.type === 'MSQ' ? [] : null)
            }}
          >
            Try again
          </TextAction>
        )}
        {!checked && (
          <TextAction aria-expanded={showSolution} onClick={() => setShowSolution((s) => !s)}>
            {showSolution ? 'Hide solution' : 'Show solution'}
          </TextAction>
        )}
      </QuestionActions>

      {(showSolution || checked) && (
        <SolutionBlock open={showSolution} onToggle={setShowSolution}>
          <p className="m-0">
            <span className="ed-label ed-muted mr-2">Idea</span>
            {q.concept}
          </p>
          <div className="mt-4">
            <SolutionSteps
              steps={q.solution.map((step, i) => (
                <Nodes key={i} nodes={step} />
              ))}
            />
          </div>
        </SolutionBlock>
      )}
    </QuestionCard>
  )
}
