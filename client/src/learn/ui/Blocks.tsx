import { Link } from 'react-router-dom'
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

// Special blocks follow the site's reading design: a label and a margin rule, no box.
const CALLOUT: Record<CalloutKind, { label: string; tone?: 'accent' | 'warn' | 'danger' | 'good' }> = {
  note: { label: 'Note' },
  tip: { label: 'Tip', tone: 'good' },
  warn: { label: 'Careful', tone: 'warn' },
  pitfall: { label: 'Pitfall', tone: 'danger' },
  insight: { label: 'Insight', tone: 'accent' },
  interview: { label: 'In interviews', tone: 'accent' },
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

/** Renders one lesson block. */
export function LessonBlock({ b, bank }: { b: Block; bank: Map<string, Question> }) {
  switch (b.t) {
    case 'md':
      return <Markdown md={b.md} />
    case 'viz': {
      const algo = getAlgorithm(b.algo)
      if (!algo) return <p className="text-state-error">Missing animation: {b.algo}</p>
      return (
        <figure className="-mx-1 my-2 sm:-mx-4 lg:-mx-10">
          <VizPlayer algo={algo} initial={b.initial} />
          {b.caption && <figcaption className="mt-2 px-2 text-center text-[12.5px] text-text-muted">{b.caption}</figcaption>}
        </figure>
      )
    }
    case 'code':
      return <CodeTabs code={b.code} title={b.title} note={b.note} />
    case 'callout': {
      const c = CALLOUT[b.kind]
      return (
        <aside className="nx-aside" data-tone={c.tone}>
          <span className="nx-aside-label">{b.title ?? c.label}</span>
          <Markdown md={b.md} />
        </aside>
      )
    }
    case 'complexity':
      return (
        <section>
          <h3 className="!mt-0">{b.title ?? 'Complexity'}</h3>
          <div className="overflow-x-auto">
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
        <section className="space-y-3">
          <h3 className="!mt-0">{b.title ?? 'Check yourself'}</h3>
          {qs.map((q, i) => (
            <QuestionCard key={q.id} q={q} index={i + 1} />
          ))}
        </section>
      )
    }
    case 'practice':
      return <PracticeList ids={b.ids} title={b.title} bank={bank} />
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
