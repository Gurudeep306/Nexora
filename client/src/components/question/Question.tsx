/*
 * One question design for every question on the site (brief §5): GATE PYQs in
 * practice, daily, review and notes, lesson "check yourself" questions, notes
 * practice and Nexus test-outs all build from these.
 *
 *   QuestionCard     the card: a mono masthead line, then the body
 *   QuestionText     the question in serif
 *   OptionList       a radio group (MCQ) or a group of checkboxes (MSQ)
 *   OptionRow        a hairline row: a letter in a circle (a square for MSQ)
 *   AnswerField      the NAT / typed-answer field: mono digits, inline unit
 *   QuestionActions  the clay Check, tertiary actions, a timer at the right
 *   Verdict          one serif line that is focused and announced
 *   SolutionBlock    "Solution" kicker; open on a wrong answer, folded on a right one
 *   NextQuestion     a large serif "Next question →"
 *
 * Feedback never relies on colour alone: every state also has a symbol and a
 * word ("Correct", "Your answer", "Missed").
 */
import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import './question.css'
import { useFitMaths } from './useFitMaths'

export type OptionState = 'idle' | 'right' | 'wrong' | 'missed' | 'dim'

/* ── The card ── */
export function QuestionCard({
  masthead,
  aside,
  children,
  className,
  id,
  as = 'article',
  ...rest
}: {
  /** The mono line: "GATE CSE 2019 · Q 34 · 2 marks · MCQ". */
  masthead?: ReactNode
  /** Right of the masthead: bookmark, timer, status. */
  aside?: ReactNode
  children: ReactNode
  className?: string
  id?: string
  as?: 'article' | 'div' | 'section'
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>
  tabIndex?: number
  'aria-label'?: string
}) {
  const Tag = as
  return (
    <Tag id={id} className={cn('qc', className)} {...rest}>
      {(masthead || aside) && (
        <header className="qc-masthead">
          <div className="qc-masthead-line">{masthead}</div>
          {aside && <div className="qc-masthead-aside">{aside}</div>}
        </header>
      )}
      <div className="qc-body">{children}</div>
    </Tag>
  )
}

/** The pieces of a masthead line, joined by middle dots. Falsy parts are dropped. */
export function Masthead({ parts }: { parts: ReactNode[] }) {
  const list = parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '')
  return (
    <>
      {list.map((p, i) => (
        <span key={i} className="qc-part">
          {i > 0 && (
            <span className="qc-dot" aria-hidden="true">
              ·
            </span>
          )}
          {p}
        </span>
      ))}
    </>
  )
}

export function QuestionTitle({ children, as = 'h3' }: { children: ReactNode; as?: 'h2' | 'h3' | 'h4' }) {
  const Tag = as
  return <Tag className="qc-title ed-serif">{children}</Tag>
}

export function QuestionText({ children, className }: { children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  useFitMaths(box)
  return (
    <div ref={box} className={cn('qc-text', className)}>
      {children}
    </div>
  )
}

/** A short instruction under the question, in caption style. */
export function QuestionHint({ children }: { children: ReactNode }) {
  return <p className="qc-hint">{children}</p>
}

/* ── Options ── */
export function OptionList({ multi, label = 'Options', children, className }: { multi?: boolean; label?: string; children: ReactNode; className?: string }) {
  return (
    <div role={multi ? 'group' : 'radiogroup'} aria-label={label} className={cn('qc-options', className)}>
      {children}
    </div>
  )
}

const STATE_WORD: Record<OptionState, string> = { idle: '', right: 'Correct', wrong: 'Your answer', missed: 'Missed', dim: '' }

export interface OptionRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** "A", "B", "1" … */
  letter: ReactNode
  multi?: boolean
  selected?: boolean
  state?: OptionState
  /** Replace the default state word (e.g. "Answer"). */
  word?: string
  children: ReactNode
}

export const OptionRow = forwardRef<HTMLButtonElement, OptionRowProps>(function OptionRow({ letter, multi, selected, state = 'idle', word, children, className, ...rest }, ref) {
  const w = word ?? STATE_WORD[state]
  const text = useRef<HTMLSpanElement>(null)
  useFitMaths(text)
  return (
    <button
      ref={ref}
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={!!selected}
      data-state={state}
      className={cn('qc-option', multi && 'is-multi', selected && 'is-on', className)}
      {...rest}
    >
      <span className="qc-letter" aria-hidden="true">
        {state === 'right' ? <Check className="size-3.5" /> : state === 'wrong' ? <X className="size-3.5" /> : letter}
      </span>
      <span className="sr-only">Option {letter}: </span>
      <span ref={text} className="qc-option-text">
        {children}
      </span>
      {w && <span className="qc-word">{w}</span>}
    </button>
  )
})

/* ── Typed answers (NAT, text) ── */
export const AnswerField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; unit?: ReactNode; hint?: ReactNode; state?: 'idle' | 'right' | 'wrong' }
>(function AnswerField({ label = 'Your answer', unit, hint, state = 'idle', className, id, ...rest }, ref) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={cn('qc-field-wrap', className)}>
      <label htmlFor={fid} className="qc-field-label">
        {label}
      </label>
      <div className="qc-field" data-state={state}>
        <input ref={ref} id={fid} autoComplete="off" spellCheck={false} {...rest} />
        {unit && <span className="qc-unit">{unit}</span>}
        {state !== 'idle' && (
          <span className="qc-field-mark" aria-hidden="true">
            {state === 'right' ? <Check className="size-4" /> : <X className="size-4" />}
          </span>
        )}
      </div>
      {hint && <p className="qc-hint mt-1.5">{hint}</p>}
    </div>
  )
})

/* ── Actions ── */
export function QuestionActions({ children, timer }: { children: ReactNode; timer?: ReactNode }) {
  return (
    <div className="qc-actions">
      {children}
      {timer && <span className="qc-timer">{timer}</span>}
    </div>
  )
}

/** The one clay action on the card. */
export function CheckButton({ children = 'Check', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cn('ed-btn ed-btn-clay qc-check', className)} {...rest}>
      {children}
    </button>
  )
}

/** A tertiary action: underlined text. */
export function TextAction({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn('qc-text-action', className)} {...rest} />
}

/* ── Verdict: one serif line, focused and announced ── */
export function Verdict({ tone, children, detail, focus = true }: { tone: 'right' | 'wrong' | 'neutral'; children: ReactNode; detail?: ReactNode; focus?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focus) ref.current?.focus({ preventScroll: true })
  }, [focus])
  return (
    <div ref={ref} tabIndex={-1} role="status" aria-live="polite" className="qc-verdict" data-tone={tone}>
      <p className="qc-verdict-line">
        <span className="qc-verdict-mark" aria-hidden="true">
          {tone === 'right' ? <Check className="size-4" /> : tone === 'wrong' ? <X className="size-4" /> : null}
        </span>
        {children}
      </p>
      {detail && <div className="qc-verdict-detail">{detail}</div>}
    </div>
  )
}

/* ── Solution ── */
export function SolutionBlock({
  children,
  defaultOpen = true,
  open: controlled,
  onToggle,
  title = 'Read the reasoning',
  kicker = 'Solution',
  credit,
}: {
  children: ReactNode
  /** Open by default on a wrong answer, folded on a right one. */
  defaultOpen?: boolean
  open?: boolean
  onToggle?: (open: boolean) => void
  title?: string
  kicker?: string
  /** The source paper credit, in caption style. */
  credit?: ReactNode
}) {
  const [inner, setInner] = useState(defaultOpen)
  const open = controlled ?? inner
  const set = (v: boolean) => {
    setInner(v)
    onToggle?.(v)
  }
  const id = useId()
  return (
    <section className="qc-solution" aria-labelledby={`${id}-k`}>
      <div className="qc-solution-head">
        <p id={`${id}-k`} className="ed-label ed-muted m-0">
          {kicker}
        </p>
        <button type="button" className="qc-text-action" aria-expanded={open} aria-controls={`${id}-b`} onClick={() => set(!open)}>
          {open ? 'Fold it away' : title}
        </button>
      </div>
      <div id={`${id}-b`} hidden={!open} className="qc-solution-body">
        {children}
        {credit && <p className="qc-credit">{credit}</p>}
      </div>
    </section>
  )
}

/** Steps numbered in roman italic. */
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx']
export function SolutionSteps({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="qc-steps">
      {steps.map((s, i) => (
        <li key={i}>
          <span className="qc-step-no ed-serif-numeral" aria-hidden="true">
            {ROMAN[i] ?? i + 1}
          </span>
          <div className="qc-step-body">{s}</div>
        </li>
      ))}
    </ol>
  )
}

/* ── Next ── */
export function NextQuestion({ onClick, children = 'Next question', note }: { onClick: () => void; children?: ReactNode; note?: ReactNode }) {
  return (
    <div className="qc-next-wrap">
      <button type="button" className="qc-next" onClick={onClick}>
        {children} <ArrowRight className="size-5" aria-hidden="true" />
      </button>
      {note && <span className="qc-next-note">{note}</span>}
    </div>
  )
}
