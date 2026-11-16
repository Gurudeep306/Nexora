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
  GripVertical,
  Hash,
  Lightbulb,
  ListChecks,
  ListOrdered,
  Puzzle,
  RotateCcw,
  Shuffle,
  TextCursorInput,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '../md'
import { AnswerField, CheckButton, Masthead, OptionList, OptionRow, QuestionActions, QuestionCard as Card, QuestionHint, QuestionText, QuestionTitle, SolutionBlock, TextAction, Verdict } from '@/components/question/Question'
import { codeKey, isDone, mark, qKey, useProgress } from '../progress'
import { KIND_LABEL, type Question, type QuestionKind } from '../questions/types'
import { Select } from '@/components/ui'

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
export function QuestionCard({ q, index, titleAs = 'h4' }: { q: Question; index?: number; /** Heading level of the title, to fit the page's outline. */ titleAs?: 'h2' | 'h3' | 'h4' }) {
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

  const verdictLine = result
    ? tries === 1
      ? 'Correct, first try.'
      : 'Correct.'
    : revealed
      ? 'Not quite. The answer is marked below.'
      : 'Not quite. Look at what is marked, then try again.'

  return (
    <Card
      as="div"
      id={q.id}
      tabIndex={-1}
      onKeyDown={onKey}
      className="scroll-mt-24 outline-none"
      masthead={
        <Masthead
          parts={[
            index != null ? <strong key="i">Q {index}</strong> : null,
            <span key="k" className="inline-flex items-center gap-1">
              <KindIcon className="size-3" aria-hidden="true" /> {KIND_LABEL[q.kind]}
            </span>,
            <span key="d" className="capitalize">
              {q.difficulty}
            </span>,
            'Check yourself',
          ]}
        />
      }
      aside={
        done ? (
          <span className="ed-ui-sm inline-flex items-center gap-1 text-state-success">
            <CheckCircle2 className="size-4" aria-hidden="true" /> {q.kind === 'code' ? 'Solved' : 'Done'}
          </span>
        ) : state ? (
          <span className="ed-mono ed-muted text-[11px]">
            {state.attempts} attempt{state.attempts === 1 ? '' : 's'}
          </span>
        ) : null
      }
    >
      <QuestionTitle as={titleAs}>{q.title}</QuestionTitle>
      <QuestionText>
        <Markdown md={q.prompt} className="q-prompt" />
      </QuestionText>

      {q.kind === 'code' ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[var(--ed-line)] pt-4">
          <span className="min-w-0 flex-1">
            <span className="ed-ui block font-medium">Write and submit code</span>
            <span className="ed-caption ed-muted block">Judged on hidden tests · C++, Java, Python, JavaScript, C</span>
          </span>
          <Link to={`/solve/learn/${q.slug}`} className="ed-btn ed-btn-clay">
            {done ? 'Open again' : 'Solve'} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <>
          {INSTRUCTION[q.kind] && <QuestionHint>{INSTRUCTION[q.kind]}</QuestionHint>}

          {q.kind === 'mcq' && (
            <OptionList>
              {q.options.map((o, i) => (
                <OptionRow
                  key={i}
                  letter={String.fromCharCode(65 + i)}
                  selected={choice === i}
                  state={show && i === q.answer ? 'right' : locked && choice === i && !result ? 'wrong' : locked && show ? 'dim' : 'idle'}
                  disabled={locked}
                  onClick={() => setChoice(i)}
                >
                  <Markdown md={o} className="[&_p]:!m-0" />
                </OptionRow>
              ))}
            </OptionList>
          )}

          {q.kind === 'multi' && (
            <OptionList multi>
              {q.options.map((o, i) => {
                const on = choices.includes(i)
                const right = q.answers.includes(i)
                const st = locked ? (on && right && (show || result) ? 'right' : on && !right ? 'wrong' : !on && right && show ? 'missed' : 'idle') : 'idle'
                return (
                  <OptionRow
                    key={i}
                    multi
                    letter={String.fromCharCode(65 + i)}
                    selected={on}
                    state={st}
                    word={st === 'wrong' ? 'Not correct' : undefined}
                    disabled={locked}
                    onClick={() => setChoices((c) => (on ? c.filter((x) => x !== i) : [...c, i]))}
                  >
                    <Markdown md={o} className="[&_p]:!m-0" />
                  </OptionRow>
                )
              })}
            </OptionList>
          )}

          {(q.kind === 'numeric' || q.kind === 'text' || q.kind === 'array') && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (canCheck && !locked) check()
              }}
            >
              <AnswerField
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={locked}
                inputMode={q.kind === 'numeric' ? 'decimal' : 'text'}
                placeholder={q.kind === 'numeric' ? 'Your answer' : q.kind === 'array' ? (q.placeholder ?? 'e.g. 1 2 3') : (q.placeholder ?? 'Your answer')}
                unit={q.kind === 'numeric' ? q.unit : undefined}
                state={locked ? (result ? 'right' : 'wrong') : 'idle'}
              />
              {q.kind === 'array' && (text.trim() || show) && (
                <div className="mt-3 space-y-2 overflow-x-auto pb-1">
                  <CellRow label="yours" values={parseList(text)} against={show ? q.answer.map(String) : undefined} />
                  {show && !result && <CellRow label="answer" values={q.answer.map(String)} />}
                </div>
              )}
            </form>
          )}

          {q.kind === 'order' && (
            <Reorder.Group axis="y" values={order} onReorder={locked ? () => {} : setOrder} className="qc-options">
              {order.map((item, i) => (
                <Reorder.Item
                  key={item}
                  value={item}
                  dragListener={!locked}
                  data-state={show && order[i] === q.items[i] ? 'right' : locked && !result && order[i] !== q.items[i] ? 'wrong' : 'idle'}
                  className={cn('qc-option !cursor-default items-center', !locked && '!cursor-grab active:!cursor-grabbing')}
                >
                  {!locked && <GripVertical className="size-4 shrink-0 text-text-muted" aria-hidden="true" />}
                  <span className="qc-letter" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="qc-option-text">
                    <Markdown md={item} className="[&_p]:!m-0" />
                  </span>
                  {!locked && (
                    <span className="flex gap-0.5">
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => setOrder((o) => { const n = [...o]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n })} className="ed-icon-btn disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
                      <button type="button" aria-label="Move down" disabled={i === order.length - 1} onClick={() => setOrder((o) => { const n = [...o]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n })} className="ed-icon-btn disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
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
            <div className="qc-options">
              {q.left.map((l, i) => {
                const ok = pairs[i] === q.right[i]
                return (
                  <div
                    key={i}
                    data-state={show && ok ? 'right' : locked && !result && !ok ? 'wrong' : 'idle'}
                    className="qc-option !cursor-default flex-wrap items-center sm:flex-nowrap"
                  >
                    <span className="qc-letter" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="qc-option-text">
                      <Markdown md={l} className="[&_p]:!m-0" />
                    </span>
                    <ArrowRight className="hidden size-4 shrink-0 text-text-muted sm:block" aria-hidden="true" />
                    <Select
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
                    </Select>
                  </div>
                )
              })}
            </div>
          )}

          {/* hint */}
          <AnimatePresence initial={false}>
            {hint && q.hint && !show && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex gap-2.5 border-l-2 border-[var(--ed-line-strong)] pl-4">
                  <Lightbulb className="mt-1 size-4 shrink-0 text-text-muted" aria-hidden="true" />
                  <Markdown md={q.hint} className="ed-body-sm" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* actions, then the verdict and the reasoning */}
          {result === null ? (
            <QuestionActions>
              <CheckButton disabled={!canCheck} onClick={check}>
                Check
              </CheckButton>
              {q.hint && !hint && <TextAction onClick={() => setHint(true)}>Hint</TextAction>}
            </QuestionActions>
          ) : (
            <>
              <Verdict
                tone={result ? 'right' : 'wrong'}
                detail={
                  show && !result ? (
                    <>
                      Answer: <span className="ed-mono ed-ink">{answerText(q)}</span>
                    </>
                  ) : undefined
                }
              >
                {verdictLine}
              </Verdict>
              {!result && (
                <QuestionActions>
                  <TextAction onClick={reset}>
                    <RotateCcw className="mr-1 inline size-3.5" aria-hidden="true" />
                    Try again
                  </TextAction>
                  {!revealed && <TextAction onClick={() => setRevealed(true)}>Show answer</TextAction>}
                </QuestionActions>
              )}
              {show && (
                <SolutionBlock kicker="Why" defaultOpen={!result}>
                  <Markdown md={q.explain} />
                </SolutionBlock>
              )}
            </>
          )}
        </>
      )}
    </Card>
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
