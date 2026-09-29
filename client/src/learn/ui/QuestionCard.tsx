import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, Reorder, motion } from 'motion/react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Brackets,
  CheckCircle2,
  CircleDot,
  Code2,
  Eye,
  GripVertical,
  Hash,
  Lightbulb,
  ListChecks,
  ListOrdered,
  Puzzle,
  RotateCcw,
  Shuffle,
  TextCursorInput,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '../md'
import { codeKey, isDone, mark, qKey, useProgress } from '../progress'
import { KIND_LABEL, type Question, type QuestionKind } from '../questions/types'

const KIND_ICON: Record<QuestionKind, LucideIcon> = {
  mcq: CircleDot,
  multi: ListChecks,
  numeric: Hash,
  text: TextCursorInput,
  order: ListOrdered,
  array: Brackets,
  code: Code2,
  fill: Puzzle,
  match: Shuffle,
}

const INSTRUCTION: Partial<Record<QuestionKind, string>> = {
  mcq: 'Pick one · keys A–D',
  multi: 'Select every correct option',
  numeric: 'Type a number · Enter to check',
  text: 'Type your answer · Enter to check',
  order: 'Drag, or use the arrows, into the right order',
  array: 'Type the values separated by spaces',
  fill: 'Fill every blank · Enter to check',
  match: 'Choose the matching item for each row',
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
const squash = (s: string) => s.replace(/\s+/g, '')
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
      return String(q.answer) + (q.unit ? ` ${q.unit}` : '')
    case 'text':
      return q.accept[0]
    case 'order':
      return q.items.map((x, i) => `${i + 1}. ${x}`).join('   ')
    case 'array':
      return `[${q.answer.join(', ')}]`
    case 'fill':
      return q.blanks.map((b, i) => `(${i + 1}) ${b[0]}`).join('   ')
    case 'match':
      return q.left.map((l, i) => `${l} → ${q.right[i]}`).join('   ')
    default:
      return ''
  }
}

/** Splits fill-in code into text and blank slots: "a[[0]]b" → ['a', 0, 'b']. */
function splitBlanks(code: string): (string | number)[] {
  const out: (string | number)[] = []
  const re = /\[\[(\d+)\]\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(code))) {
    out.push(code.slice(last, m.index), Number(m[1]))
    last = m.index + m[0].length
  }
  out.push(code.slice(last))
  return out
}

/**
 * One question from the bank, answerable in place. Every kind shares the
 * same flow — answer, check, see right/wrong with the reasoning — and is
 * saved to the learner's progress. Coding questions hand off to the editor.
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
  const nBlanks = q.kind === 'fill' ? q.blanks.length : 0
  const [blanks, setBlanks] = useState<string[]>(() => Array(nBlanks).fill(''))
  const rightShuffled = useMemo(() => (q.kind === 'match' ? hashShuffle(q.right, q.id + ':m') : []), [q])
  const [pairs, setPairs] = useState<string[]>(() => (q.kind === 'match' ? Array(q.left.length).fill('') : []))
  const [result, setResult] = useState<null | boolean>(null)
  const [revealed, setRevealed] = useState(false)
  const [hint, setHint] = useState(false)
  const [tries, setTries] = useState(0)

  const blankOk = (i: number) => q.kind === 'fill' && q.blanks[i].some((a) => squash(a) === squash(blanks[i] ?? ''))

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
      case 'fill':
        ok = q.blanks.every((_, i) => blankOk(i))
        break
      case 'match':
        ok = q.left.every((_, i) => pairs[i] === q.right[i])
        break
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
    setBlanks(Array(nBlanks).fill(''))
    if (q.kind === 'match') setPairs(Array(q.left.length).fill(''))
  }

  const canCheck =
    q.kind === 'mcq'
      ? choice !== null
      : q.kind === 'multi'
        ? choices.length > 0
        : q.kind === 'order'
          ? true
          : q.kind === 'fill'
            ? blanks.every((b) => b.trim() !== '')
            : q.kind === 'match'
              ? pairs.every(Boolean)
              : text.trim() !== ''
  const locked = result !== null
  const show = locked && (result || revealed)
  const KindIcon = KIND_ICON[q.kind]

  const onKey = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'SELECT' || locked) return
    if (q.kind === 'mcq' || q.kind === 'multi') {
      const k = e.key.toUpperCase()
      const i = k >= 'A' && k <= 'H' ? k.charCodeAt(0) - 65 : k >= '1' && k <= '8' ? Number(k) - 1 : -1
      if (i >= 0 && i < q.options.length) {
        e.preventDefault()
        if (q.kind === 'mcq') setChoice(i)
        else setChoices((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))
      } else if (e.key === 'Enter' && canCheck) {
        e.preventDefault()
        check()
      }
    }
  }

  return (
    <div
      id={q.id}
      tabIndex={-1}
      onKeyDown={onKey}
      className={cn('q-card card scroll-mt-24 overflow-hidden p-0 outline-none', `q-diff-${q.difficulty}`, result === true && 'q-card-right', result === false && 'q-card-wrong')}
    >
      {/* header */}
      <div className="q-head flex items-start gap-3 px-4 pt-4 pb-1 sm:px-5">
        <span className="q-num flex size-9 shrink-0 items-center justify-center rounded-xl">
          {done ? <CheckCircle2 className="size-[18px]" /> : index != null ? <span className="font-mono text-[13px] font-bold">{index}</span> : <KindIcon className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="q-chip inline-flex items-center gap-1">
              <KindIcon className="size-3" /> {KIND_LABEL[q.kind]}
            </span>
            <span className="q-chip q-chip-diff capitalize">{q.difficulty}</span>
            {done ? (
              <span className="q-chip q-chip-done">{q.kind === 'code' ? 'Solved' : 'Done'}</span>
            ) : state ? (
              <span className="text-[11px] text-text-muted">
                {state.attempts} attempt{state.attempts === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <h4 className="mt-1.5 mb-0 text-[15.5px] leading-snug font-semibold text-text-primary">{q.title}</h4>
        </div>
      </div>

      <div className="px-4 pt-2 pb-4 sm:px-5">
        <Markdown md={q.prompt} className="q-prompt !text-[14.5px]" />

        {q.kind === 'code' ? (
          <div className="q-code-cta mt-4 flex flex-wrap items-center gap-3 rounded-xl p-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent-brand/15 text-accent-brand">
              <Code2 className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-text-primary">Write and submit code</span>
              <span className="block text-[12px] text-text-muted">Judged on hidden tests · C++, Java, Python, JavaScript, C</span>
            </span>
            <Link to={`/solve/learn/${q.slug}`} className="btn-primary inline-flex items-center gap-2 !py-2 !text-[13px]">
              {done ? 'Open again' : 'Solve'} <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {INSTRUCTION[q.kind] && <p className="q-instr mb-0">{INSTRUCTION[q.kind]}</p>}

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
                      show && i === q.answer && 'q-option-right',
                      locked && choice === i && !result && 'q-option-wrong',
                    )}
                  >
                    <span className="q-dot">{String.fromCharCode(65 + i)}</span>
                    <span className="min-w-0 flex-1 text-left">
                      <Markdown md={o} className="!text-[14px] [&_p]:!m-0" />
                    </span>
                    {show && i === q.answer && <CheckCircle2 className="size-4 shrink-0 text-state-success" />}
                    {locked && choice === i && !result && <XCircle className="size-4 shrink-0 text-state-error" />}
                  </button>
                ))}
              </div>
            )}

            {q.kind === 'multi' && (
              <div className="grid gap-2">
                {q.options.map((o, i) => {
                  const on = choices.includes(i)
                  const right = q.answers.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={locked}
                      onClick={() => setChoices((c) => (on ? c.filter((x) => x !== i) : [...c, i]))}
                      className={cn('q-option', on && 'q-option-on', show && right && 'q-option-right', locked && !result && on !== right && 'q-option-wrong')}
                    >
                      <span className={cn('q-dot !rounded-md', on && 'q-dot-on')}>{on ? '✓' : String.fromCharCode(65 + i)}</span>
                      <span className="min-w-0 flex-1 text-left">
                        <Markdown md={o} className="!text-[14px] [&_p]:!m-0" />
                      </span>
                      {locked && !result && on !== right && <span className="shrink-0 text-[11px] font-medium text-state-error">{on ? 'not correct' : 'missed'}</span>}
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
                <div className={cn('q-input-wrap flex max-w-md items-center rounded-xl', locked && (result ? 'q-input-right' : 'q-input-wrong'))}>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={locked}
                    inputMode={q.kind === 'numeric' ? 'decimal' : 'text'}
                    placeholder={q.kind === 'numeric' ? 'Your answer' : q.kind === 'array' ? (q.placeholder ?? 'e.g. 1 2 3') : (q.placeholder ?? 'Your answer')}
                    className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 font-mono text-[14px] text-text-primary outline-none placeholder:text-text-muted"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  {q.kind === 'numeric' && q.unit && <span className="pr-3.5 text-[12.5px] text-text-muted">{q.unit}</span>}
                </div>
                {q.kind === 'array' && (text.trim() || show) && (
                  <div className="mt-3 space-y-2 overflow-x-auto pb-1">
                    <CellRow label="yours" values={parseList(text)} against={show ? q.answer.map(String) : undefined} />
                    {show && !result && <CellRow label="answer" values={q.answer.map(String)} />}
                  </div>
                )}
              </form>
            )}

            {q.kind === 'order' && (
              <Reorder.Group axis="y" values={order} onReorder={locked ? () => {} : setOrder} className="grid gap-1.5">
                {order.map((item, i) => (
                  <Reorder.Item
                    key={item}
                    value={item}
                    dragListener={!locked}
                    className={cn('q-option !py-2', !locked && 'cursor-grab active:cursor-grabbing', show && order[i] === q.items[i] && 'q-option-right', locked && !result && order[i] !== q.items[i] && 'q-option-wrong')}
                  >
                    {!locked && <GripVertical className="size-4 shrink-0 text-text-muted" />}
                    <span className="q-dot">{i + 1}</span>
                    <span className="min-w-0 flex-1 text-left">
                      <Markdown md={item} className="!text-[14px] [&_p]:!m-0" />
                    </span>
                    {!locked && (
                      <span className="flex gap-0.5">
                        <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => setOrder((o) => { const n = [...o]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n })} className="rounded-md p-1 text-text-muted hover:!scale-100 hover:bg-bg-surface-3 hover:text-text-primary disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
                        <button type="button" aria-label="Move down" disabled={i === order.length - 1} onClick={() => setOrder((o) => { const n = [...o]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n })} className="rounded-md p-1 text-text-muted hover:!scale-100 hover:bg-bg-surface-3 hover:text-text-primary disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
                      </span>
                    )}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}

            {q.kind === 'fill' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (canCheck && !locked) check()
                }}
              >
                <pre className="q-fill overflow-x-auto rounded-xl px-4 py-3 font-mono text-[13px] leading-[2.1]">
                  {splitBlanks(q.code.replace(/^\n/, '')).map((part, k) =>
                    typeof part === 'string' ? (
                      <Fragment key={k}>{part}</Fragment>
                    ) : (
                      <input
                        key={k}
                        value={blanks[part] ?? ''}
                        onChange={(e) => setBlanks((b) => b.map((x, j) => (j === part ? e.target.value : x)))}
                        disabled={locked}
                        aria-label={`Blank ${part + 1}`}
                        placeholder={String(part + 1)}
                        spellCheck={false}
                        autoComplete="off"
                        size={Math.max(3, (blanks[part] ?? '').length + 1, ...(show ? [q.blanks[part][0].length + 1] : []))}
                        className={cn('q-blank', locked && (blankOk(part) ? 'q-blank-right' : 'q-blank-wrong'))}
                      />
                    ),
                  )}
                </pre>
                <button type="submit" hidden />
              </form>
            )}

            {q.kind === 'match' && (
              <div className="grid gap-2">
                {q.left.map((l, i) => {
                  const ok = pairs[i] === q.right[i]
                  return (
                    <div key={i} className={cn('q-option !cursor-default flex-wrap sm:flex-nowrap', show && ok && 'q-option-right', locked && !result && !ok && 'q-option-wrong')}>
                      <span className="q-dot">{i + 1}</span>
                      <span className="min-w-0 flex-1 text-left">
                        <Markdown md={l} className="!text-[14px] [&_p]:!m-0" />
                      </span>
                      <ArrowRight className="hidden size-4 shrink-0 text-text-muted sm:block" />
                      <select
                        value={pairs[i]}
                        disabled={locked}
                        onChange={(e) => setPairs((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                        className="q-select w-full font-mono sm:w-auto sm:min-w-[170px]"
                        aria-label={`Match for ${l}`}
                      >
                        <option value="">Choose…</option>
                        {rightShuffled.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            )}

            {/* hint */}
            <AnimatePresence initial={false}>
              {hint && q.hint && !show && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="q-hint flex gap-2.5 rounded-xl px-3.5 py-2.5">
                    <Lightbulb className="mt-0.5 size-4 shrink-0" />
                    <Markdown md={q.hint} className="!text-[13.5px]" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* actions / feedback */}
            {result === null ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button type="button" disabled={!canCheck} onClick={check} className="btn-primary inline-flex items-center gap-1.5 !px-4 !py-2 !text-[13px]">
                  <CheckCircle2 className="size-4" /> Check answer
                </button>
                {q.hint && !hint && (
                  <button type="button" onClick={() => setHint(true)} className="btn-ghost inline-flex items-center gap-1.5 !px-3 !py-2 !text-[12.5px]">
                    <Lightbulb className="size-3.5" /> Hint
                  </button>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className={cn('q-feedback rounded-xl px-4 py-3.5', result ? 'q-feedback-right' : 'q-feedback-wrong')}
              >
                <p className="q-feedback-title mb-1 flex items-center gap-2 text-[14.5px] font-semibold">
                  {result ? <CheckCircle2 className="size-[18px]" /> : <XCircle className="size-[18px]" />}
                  {result ? (tries === 1 ? 'Correct — first try!' : 'Correct') : 'Not quite'}
                </p>
                {!result && !revealed && <p className="mb-0 text-[13px] text-text-secondary">Look at what is marked, then try again — or reveal the answer.</p>}
                {show && (
                  <div className="mt-2 space-y-2">
                    {!result && (
                      <p className="mb-0 text-[13px] text-text-secondary">
                        Answer: <span className="font-mono text-text-primary">{answerText(q)}</span>
                      </p>
                    )}
                    <div className="q-why rounded-lg px-3 py-2.5">
                      <p className="mb-1 text-[10.5px] font-bold tracking-[0.12em] text-text-muted uppercase">Why</p>
                      <Markdown md={q.explain} className="!text-[14px]" />
                    </div>
                  </div>
                )}
                {!result && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={reset} className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]">
                      <RotateCcw className="size-3.5" /> Try again
                    </button>
                    {!revealed && (
                      <button type="button" onClick={() => setRevealed(true)} className="btn-ghost inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]">
                        <Eye className="size-3.5" /> Show answer
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** A row of array cells, optionally marked against the expected values. */
function CellRow({ label, values, against }: { label: string; values: string[]; against?: string[] }) {
  const n = Math.max(values.length, against?.length ?? 0)
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-right text-[10.5px] font-semibold tracking-wide text-text-muted uppercase">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: n }, (_, i) => {
          const v = values[i]
          const ok = against ? v !== undefined && norm(v) === norm(against[i] ?? '') : undefined
          return (
            <span key={i} className="flex flex-col items-center gap-0.5">
              <span className={cn('q-cell', v === undefined && 'q-cell-empty', ok === true && 'q-cell-right', ok === false && 'q-cell-wrong')}>{v ?? ''}</span>
              <span className="font-mono text-[9.5px] text-text-muted">{i}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
