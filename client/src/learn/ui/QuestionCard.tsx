import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Reorder } from 'motion/react'
import { ArrowDown, ArrowUp, CheckCircle2, Code2, Eye, GripVertical, RotateCcw, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '../md'
import { codeKey, isDone, mark, qKey, useProgress } from '../progress'
import { KIND_LABEL, type Question } from '../questions/types'

const DIFF: Record<Question['difficulty'], string> = {
  easy: 'text-state-success bg-state-success/10',
  medium: 'text-state-warning bg-state-warning/10',
  hard: 'text-state-error bg-state-error/10',
}

function hashShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    const j = Math.abs(h) % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  // never show it already solved
  if (out.every((x, i) => x === items[i]) && out.length > 1) out.push(out.shift()!)
  return out
}

const norm = (s: string, cs?: boolean) => {
  const t = s.trim().replace(/\s+/g, ' ')
  return cs ? t : t.toLowerCase()
}
const parseList = (s: string) =>
  s
    .replace(/[[\]]/g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean)

function answerText(q: Question): string {
  switch (q.kind) {
    case 'mcq':
      return q.options[q.answer]
    case 'multi':
      return q.answers.map((i) => q.options[i]).join('; ')
    case 'numeric':
      return String(q.answer)
    case 'text':
      return q.accept[0]
    case 'order':
      return q.items.map((x, i) => `${i + 1}. ${x}`).join('  ')
    case 'array':
      return `[${q.answer.join(', ')}]`
    default:
      return ''
  }
}

/**
 * One question from the bank, answerable in place. Every kind shares the
 * same flow: answer → Check → right/wrong with the explanation, saved to the
 * learner's progress. Coding questions hand off to the full editor.
 */
export function QuestionCard({ q, index }: { q: Question; index?: number }) {
  const { items } = useProgress()
  const key = q.kind === 'code' ? codeKey(q.slug) : qKey(q.id)
  const state = items[key]
  const done = isDone(state)

  const [choice, setChoice] = useState<number | null>(null)
  const [choices, setChoices] = useState<number[]>([])
  const [text, setText] = useState('')
  const order0 = useMemo(() => (q.kind === 'order' ? hashShuffle(q.items, q.id) : []), [q])
  const [order, setOrder] = useState<string[]>(order0)
  const [result, setResult] = useState<null | boolean>(null)
  const [revealed, setRevealed] = useState(false)
  const [tries, setTries] = useState(0)

  const check = () => {
    let ok = false
    switch (q.kind) {
      case 'mcq':
        ok = choice === q.answer
        break
      case 'multi':
        ok = choices.length === q.answers.length && q.answers.every((a) => choices.includes(a))
        break
      case 'numeric': {
        const n = Number(text.replace(/,/g, '').trim())
        ok = text.trim() !== '' && Number.isFinite(n) && Math.abs(n - q.answer) <= (q.tolerance ?? 1e-9)
        break
      }
      case 'text':
        ok = q.accept.some((a) => norm(a, q.caseSensitive) === norm(text, q.caseSensitive))
        break
      case 'order':
        ok = order.every((x, i) => x === q.items[i])
        break
      case 'array': {
        const got = parseList(text)
        ok = got.length === q.answer.length && got.every((x, i) => norm(x) === norm(String(q.answer[i])))
        break
      }
    }
    setResult(ok)
    setTries((t) => t + 1)
    mark(key, ok ? 'correct' : 'wrong')
  }

  const reset = () => {
    setResult(null)
    setChoice(null)
    setChoices([])
    setText('')
    setOrder(order0)
  }

  const canCheck =
    q.kind === 'mcq' ? choice !== null : q.kind === 'multi' ? choices.length > 0 : q.kind === 'order' ? true : text.trim() !== ''
  const locked = result !== null

  return (
    <div id={q.id} className={cn('card scroll-mt-24 p-0 transition-colors', result === true && '!border-state-success/50', result === false && '!border-state-error/50')}>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3.5">
        {index != null && <span className="font-mono text-[11px] text-text-muted">Q{index}</span>}
        <span className="rounded-full bg-bg-surface-3 px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-text-secondary uppercase">{KIND_LABEL[q.kind]}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize', DIFF[q.difficulty])}>{q.difficulty}</span>
        <h4 className="mb-0 min-w-0 flex-1 truncate text-[14px] font-semibold text-text-primary">{q.title}</h4>
        {done ? (
          <span className="flex items-center gap-1 text-[11.5px] font-medium text-state-success">
            <CheckCircle2 className="size-4" /> {q.kind === 'code' ? 'Solved' : 'Done'}
          </span>
        ) : state ? (
          <span className="text-[11.5px] text-text-muted">{state.attempts} attempt{state.attempts === 1 ? '' : 's'}</span>
        ) : null}
      </div>

      <div className="px-4 pt-2 pb-4">
        <Markdown md={q.prompt} className="!text-[14.5px]" />

        {q.kind === 'code' ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link to={`/solve/learn/${q.slug}`} className="btn-primary inline-flex items-center gap-2 !py-2 !text-[13px]">
              <Code2 className="size-4" /> {done ? 'Open again in the editor' : 'Solve in the editor'}
            </Link>
            <span className="text-[12px] text-text-muted">Judged on hidden tests · any language</span>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {q.kind === 'mcq' && (
              <div className="grid gap-2" role="radiogroup">
                {q.options.map((o, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={choice === i}
                    disabled={locked}
                    onClick={() => setChoice(i)}
                    className={cn(
                      'q-option',
                      choice === i && 'q-option-on',
                      locked && i === q.answer && (result || revealed) && 'q-option-right',
                      locked && choice === i && !result && 'q-option-wrong',
                    )}
                  >
                    <span className="q-dot">{String.fromCharCode(65 + i)}</span>
                    <span className="text-left">
                      <Markdown md={o} className="!text-[14px] [&_p]:!m-0" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {q.kind === 'multi' && (
              <div className="grid gap-2">
                <p className="mb-0 text-[12px] text-text-muted">Select every correct option.</p>
                {q.options.map((o, i) => {
                  const on = choices.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={locked}
                      onClick={() => setChoices((c) => (on ? c.filter((x) => x !== i) : [...c, i]))}
                      className={cn(
                        'q-option',
                        on && 'q-option-on',
                        locked && (result || revealed) && q.answers.includes(i) && 'q-option-right',
                        locked && !result && on && !q.answers.includes(i) && 'q-option-wrong',
                      )}
                    >
                      <span className={cn('q-dot !rounded-md', on && 'q-dot-on')}>{on ? '✓' : ''}</span>
                      <span className="text-left">
                        <Markdown md={o} className="!text-[14px] [&_p]:!m-0" />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {(q.kind === 'numeric' || q.kind === 'text' || q.kind === 'array') && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (canCheck && !locked) check()
                }}
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={locked}
                  inputMode={q.kind === 'numeric' ? 'decimal' : 'text'}
                  placeholder={q.kind === 'numeric' ? 'Your answer' + (q.unit ? ` (${q.unit})` : '') : q.kind === 'array' ? q.placeholder ?? 'Values separated by spaces, e.g. 1 2 3' : q.placeholder ?? 'Your answer'}
                  className="input-base w-full max-w-md font-mono"
                  spellCheck={false}
                />
                {q.kind === 'array' && text.trim() && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {parseList(text).map((x, i) => (
                      <span key={i} className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-border-strong bg-bg-surface-3 px-2 font-mono text-[13px] text-text-primary">
                        {x}
                      </span>
                    ))}
                  </div>
                )}
              </form>
            )}

            {q.kind === 'order' && (
              <Reorder.Group axis="y" values={order} onReorder={locked ? () => {} : setOrder} className="grid gap-1.5">
                {order.map((item, i) => (
                  <Reorder.Item key={item} value={item} dragListener={!locked} className={cn('q-option cursor-grab active:cursor-grabbing', locked && (result || revealed) && order[i] === q.items[i] && 'q-option-right', locked && !result && order[i] !== q.items[i] && 'q-option-wrong')}>
                    <GripVertical className="size-4 shrink-0 text-text-muted" />
                    <span className="q-dot">{i + 1}</span>
                    <span className="flex-1 text-left text-[14px] text-text-primary">{item}</span>
                    {!locked && (
                      <span className="flex gap-0.5">
                        <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => setOrder((o) => { const n = [...o]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n })} className="rounded p-1 text-text-muted hover:!scale-100 hover:bg-bg-surface-3 disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
                        <button type="button" aria-label="Move down" disabled={i === order.length - 1} onClick={() => setOrder((o) => { const n = [...o]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n })} className="rounded p-1 text-text-muted hover:!scale-100 hover:bg-bg-surface-3 disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
                      </span>
                    )}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}

            {/* check / feedback */}
            {result === null ? (
              <button type="button" disabled={!canCheck} onClick={check} className="btn-primary !py-2 !text-[13px]">
                Check answer
              </button>
            ) : (
              <div className={cn('rounded-xl px-4 py-3', result ? 'bg-state-success/10' : 'bg-state-error/10')}>
                <p className={cn('mb-1 flex items-center gap-2 text-[14px] font-semibold', result ? 'text-state-success' : 'text-state-error')}>
                  {result ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                  {result ? 'Correct' : 'Not quite'}
                </p>
                {(result || revealed) && (
                  <>
                    {!result && (
                      <p className="mb-1 text-[13px] text-text-secondary">
                        Answer: <span className="font-mono text-text-primary">{answerText(q)}</span>
                      </p>
                    )}
                    <Markdown md={q.explain} className="!text-[14px]" />
                  </>
                )}
                {!result && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={reset} className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]">
                      <RotateCcw className="size-3.5" /> Try again
                    </button>
                    {!revealed && tries >= 1 && (
                      <button type="button" onClick={() => setRevealed(true)} className="btn-ghost inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]">
                        <Eye className="size-3.5" /> Show answer
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
