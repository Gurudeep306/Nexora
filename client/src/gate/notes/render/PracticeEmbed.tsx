/*
  One of our own practice questions inside a lesson: answer, check, see
  why a common wrong answer is wrong, then the worked steps. Checking is
  local (these are not exam questions); a later step feeds the result into
  the review queue.
*/
import { useId, useState } from 'react'
import { Icon } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
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
  const uid = useId()
  const correct = checked && isCorrect(q, pick)
  const wrong = checked && !correct ? matchWrong(q, pick) : undefined
  const hasPick = pick !== null && pick !== '' && !(Array.isArray(pick) && !pick.length)

  const choose = (l: string) => {
    if (checked) return
    if (q.type === 'MSQ') setPick((p) => (Array.isArray(p) && p.includes(l) ? p.filter((x) => x !== l) : [...((p as string[]) ?? []), l]))
    else setPick(l)
  }

  return (
    <div className="np">
      <div className="np-text">
        <Nodes nodes={q.text} />
      </div>

      {q.options && (
        <div className="np-options" role={q.type === 'MSQ' ? 'group' : 'radiogroup'} aria-label="Options">
          {q.type === 'MSQ' && <p className="np-hint">Select all that apply.</p>}
          {q.options.map((o) => {
            const on = Array.isArray(pick) ? pick.includes(o.l) : pick === o.l
            const key = checked && [q.answer].flat().includes(o.l)
            return (
              <button
                key={o.l}
                type="button"
                role={q.type === 'MSQ' ? 'checkbox' : 'radio'}
                aria-checked={on}
                disabled={checked}
                onClick={() => choose(o.l)}
                className={cn('np-option', on && 'is-on', key && 'is-key', checked && on && !key && 'is-wrong')}
              >
                <span className="np-letter" aria-hidden="true">
                  {o.l}
                </span>
                <span className="np-option-text">
                  <Nodes nodes={o.c} />
                </span>
                {key && <span className="sr-only">(correct answer)</span>}
              </button>
            )
          })}
        </div>
      )}

      {q.type === 'NAT' && (
        <form
          className="np-nat"
          onSubmit={(e) => {
            e.preventDefault()
            if (hasPick) setChecked(true)
          }}
        >
          <label htmlFor={`${uid}-nat`}>Your answer</label>
          <input
            id={`${uid}-nat`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={typeof pick === 'string' ? pick : ''}
            disabled={checked}
            onChange={(e) => setPick(e.target.value.replace(/[^0-9.eE+-]/g, ''))}
          />
        </form>
      )}

      <div className="np-actions">
        {!checked ? (
          <button type="button" className="np-btn np-btn--main" disabled={!hasPick} onClick={() => setChecked(true)}>
            <Icon name="check" className="size-4" aria-hidden="true" /> Check
          </button>
        ) : (
          <button
            type="button"
            className="np-btn"
            onClick={() => {
              setChecked(false)
              setPick(q.type === 'MSQ' ? [] : null)
            }}
          >
            <Icon name="refresh" className="size-4" aria-hidden="true" /> Try again
          </button>
        )}
        <button type="button" className="np-btn" aria-expanded={showSolution} aria-controls={`${uid}-sol`} onClick={() => setShowSolution((s) => !s)}>
          <Icon name={showSolution ? 'eye-off' : 'eye'} className="size-4" aria-hidden="true" /> {showSolution ? 'Hide solution' : 'Solution'}
        </button>
      </div>

      <div role="status" aria-live="polite">
        {checked && (
          <div className={cn('np-feedback', correct ? 'is-correct' : 'is-incorrect')}>
            <strong>{correct ? 'Correct.' : 'Not quite.'}</strong> {!correct && <>The answer is {fmtAnswer(q)}.</>}
            {wrong && (
              <div className="np-why">
                <Nodes nodes={wrong.why} />
              </div>
            )}
          </div>
        )}
      </div>

      <div id={`${uid}-sol`} className="np-solution" hidden={!showSolution}>
        <p className="np-concept">
          <strong>Idea:</strong> {q.concept}
        </p>
        <ol>
          {q.solution.map((step, i) => (
            <li key={i}>
              <Nodes nodes={step} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
