import { lazy, Suspense, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Sidenote } from '@/components/reader/Sidenote'
import { useScrollSync } from '@/components/reader/useScrollSync'
import { CheckCircle2, ChevronRight, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import '../algorithms'
import { getAlgorithm } from '../engine/registry'
import { VizPlayer } from '../engine/VizPlayer'
import { Markdown } from '../md'
import { codeKey, isDone, useProgress } from '../progress'
import type { Question } from '../questions/types'
import type { Block, CalloutKind } from '../types'
import { CodeTabs } from './CodeTabs'
import { QuestionCard } from './QuestionCard'
import { PythonBlock } from './PythonBlock'
import { AI_BOOKS } from '../content/ai/web.gen'

// Special blocks follow the site's reading design: a label and a hairline, no
// box. Notes, tips and interview asides are sidenotes (in the margin when
// there is room); the rest stay in the line of the argument.
const CALLOUT: Record<CalloutKind, { label: string; tone?: 'accent' | 'warn' | 'danger' | 'good'; side?: boolean }> = {
  note: { label: 'Note', side: true },
  tip: { label: 'Tip', tone: 'good', side: true },
  warn: { label: 'Careful', tone: 'warn' },
  pitfall: { label: 'Pitfall', tone: 'danger' },
  insight: { label: 'Why it works', tone: 'good' },
  interview: { label: 'In interviews', tone: 'accent', side: true },
}

const DIFF: Record<Question['difficulty'], string> = { easy: 'text-state-success', medium: 'text-state-warning', hard: 'text-state-error' }

function PracticeList({ ids, title, bank }: { ids: string[]; title?: string; bank: Map<string, Question> }) {
  const { items } = useProgress()
  const qs = ids.map((id) => bank.get(id)).filter((q): q is Question => !!q)
  const solved = qs.filter((q) => q.kind === 'code' && isDone(items[codeKey(q.slug)])).length
  return (
    <div className="card p-0">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Code2 className="size-4 text-accent-brand" />
        <p className="mb-0 flex-1 text-[14px] font-semibold text-text-primary">{title ?? 'Practice'}</p>
        <span className="font-mono text-[11.5px] text-text-muted">
          {solved}/{qs.length} solved
        </span>
      </div>
      <ul className="divide-y divide-border">
        {qs.map((q) => {
          const done = q.kind === 'code' && isDone(items[codeKey(q.slug)])
          return (
            <li key={q.id}>
              <Link to={q.kind === 'code' ? `/solve/learn/${q.slug}` : `#${q.id}`} className="group flex items-center gap-3 px-4 py-2.5 !no-underline transition-colors hover:bg-bg-surface-2">
                {done ? <CheckCircle2 className="size-4 shrink-0 text-state-success" /> : <span className="size-4 shrink-0 rounded-full border-2 border-border-strong" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-text-primary">{q.title}</span>
                  <span className="block truncate text-[12px] text-text-muted">{q.prompt}</span>
                </span>
                <span className={cn('text-[11px] font-semibold capitalize', DIFF[q.difficulty])}>{q.difficulty}</span>
                <ChevronRight className="size-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** A lesson figure: the animation on a figure spread, numbered, with its caption. */
function Figure({ b, syncTo }: { b: Extract<Block, { t: 'viz' }>; syncTo?: number | null }) {
  const algo = getAlgorithm(b.algo)
  if (!algo) return <p className="text-state-error">Missing animation: {b.algo}</p>
  return (
    <figure className="nr-figure">
      <figcaption className="nr-figure-label">
        <span className="nr-fig-no" />
        {algo.title}
      </figcaption>
      <VizPlayer algo={algo} initial={b.initial} syncTo={syncTo} />
      {b.caption && <p className="nr-figure-caption">{b.caption}</p>}
    </figure>
  )
}

/**
 * Scrollytelling: a figure followed by its step-by-step walkthrough. On wide
 * screens the figure stays in view while the steps scroll past, and moves to
 * the step being read; on phones, or with reduced motion, it is a figure and a
 * list, driven by the figure's own buttons.
 */
export function ScrollyFigure({ viz, steps }: { viz: Extract<Block, { t: 'viz' }>; steps: Extract<Block, { t: 'steps' }> }) {
  const ref = useRef<HTMLDivElement>(null)
  const pos = useScrollSync(ref, '.nx-steps > li')
  return (
    <div ref={ref} className="nr-scrolly">
      <div className="nr-scrolly-figure">
        <Figure b={viz} syncTo={pos} />
      </div>
      <div className="nr-scrolly-text">
        <LessonBlock b={steps} bank={EMPTY_BANK} />
      </div>
    </div>
  )
}
const EMPTY_BANK = new Map<string, Question>()
// The books a lesson may point to (checked by the tests against docs/ai-courses/sources/books.json).
const BOOKS: Record<string, { title: string; authors: string; url: string }> = AI_BOOKS
// The 2D/3D engine is large, so it loads only on pages that have a stage block.
const Stage = lazy(() => import('@/ai/stage/Stage'))

/** Renders one lesson block. */
export function LessonBlock({ b, bank }: { b: Block; bank: Map<string, Question> }) {
  switch (b.t) {
    case 'md':
      return <Markdown md={b.md} />
    case 'viz':
      return <Figure b={b} />
    case 'stage':
      return (
        <figure className="m-0 space-y-2" data-wide>
          <Suspense fallback={<div className="ai3d-view" aria-busy="true" aria-label={`Loading: ${b.scene.title}`} />}>
            <Stage spec={b.scene} />
          </Suspense>
          {b.caption && <figcaption className="text-[13px] text-text-secondary">{b.caption}</figcaption>}
        </figure>
      )
    case 'code':
      return <CodeTabs code={b.code} title={b.title} note={b.note} />
    case 'callout': {
      const c = CALLOUT[b.kind]
      if (c.side)
        return (
          <Sidenote label={b.title ?? c.label} tone={c.tone}>
            <Markdown md={b.md} />
          </Sidenote>
        )
      return (
        <div className="nx-aside" role="note" aria-label={b.title ?? c.label} data-tone={c.tone}>
          <span className="nx-aside-label">{b.title ?? c.label}</span>
          <Markdown md={b.md} />
        </div>
      )
    }
    case 'complexity':
      return (
        <section className="nr-table">
          <h3 className="!mt-0">{b.title ?? 'Complexity'}</h3>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={b.title ?? 'Complexity'}>
            <table>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Time</th>
                  {b.rows.some((r) => r.space) && <th>Space</th>}
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="text-text-primary">{r.op}</td>
                    <td className="font-mono whitespace-nowrap text-text-primary">{r.time}</td>
                    {b.rows.some((x) => x.space) && <td className="font-mono whitespace-nowrap">{r.space ?? ''}</td>}
                    <td>{r.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )
    case 'check': {
      const qs = b.ids.map((id) => bank.get(id)).filter((q): q is Question => !!q)
      return (
        <section className="nr-check space-y-3">
          <h3 className="!mt-0">{b.title ?? 'Check yourself'}</h3>
          {qs.map((q, i) => (
            <QuestionCard key={q.id} q={q} index={i + 1} />
          ))}
        </section>
      )
    }
    case 'practice':
      return <PracticeList ids={b.ids} title={b.title} bank={bank} />
    case 'python':
      return <PythonBlock code={b.code} title={b.title} note={b.note} stdin={b.stdin} browser={b.browser} step={b.step} />
    case 'derive':
      return (
        <section className="nr-derive" aria-label={b.title ?? 'Derivation'}>
          {b.title && <h3 className="!mt-0">{b.title}</h3>}
          <ol>
            {b.lines.map((l, i) => (
              <li key={i}>
                <span className="nr-derive-n" aria-hidden="true">
                  ({i + 1})
                </span>
                <span className="nr-derive-tex" tabIndex={0} role="group" aria-label={`Step ${i + 1}`}>
                  <Markdown md={`$$${l.tex}$$`} />
                </span>
                <span className="nr-derive-why">
                  <Markdown md={l.why} />
                </span>
              </li>
            ))}
          </ol>
          {b.result && (
            <div className="nr-derive-result">
              <span className="nx-aside-label">Result</span>
              <Markdown md={b.result} />
            </div>
          )}
        </section>
      )
    case 'readmore':
      return (
        <section className="nr-readmore" aria-label="Read more">
          {/* A section of the lesson (level 2 for screen readers, so the outline never skips a level); it keeps the smaller look. */}
          <h3 className="!mt-0" role="heading" aria-level={2}>
            Read more
          </h3>
          <ul>
            {b.items.map((it, i) => {
              const book = BOOKS[it.book]
              return (
                <li key={i}>
                  <span className="font-semibold text-text-primary">
                    {book ? (
                      <a href={book.url} target="_blank" rel="noreferrer">
                        {book.title}
                      </a>
                    ) : (
                      it.book
                    )}
                  </span>
                  {book?.authors && <span className="text-text-muted"> · {book.authors}</span>}
                  <span className="text-text-secondary">, {it.where}. </span>
                  <Markdown md={it.why} />
                </li>
              )
            })}
          </ul>
        </section>
      )
    case 'steps':
      return (
        <ol className="nx-steps">
          {b.items.map((s, i) => (
            <li key={i}>
              <p className="mb-0.5 font-semibold text-text-primary">{s.title}</p>
              <Markdown md={s.md} />
            </li>
          ))}
        </ol>
      )
  }
}
