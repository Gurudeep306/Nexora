import { Link } from 'react-router-dom'
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, ChevronRight, Code2, Info, Lightbulb, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ALGORITHMS } from '../algorithms'
import { VizPlayer } from '../engine/VizPlayer'
import { Markdown } from '../md'
import { codeKey, isDone, useProgress } from '../progress'
import type { Question } from '../questions/types'
import type { Block, CalloutKind } from '../types'
import { CodeTabs } from './CodeTabs'
import { QuestionCard } from './QuestionCard'

const CALLOUT: Record<CalloutKind, { icon: typeof Info; label: string; cls: string }> = {
  note: { icon: Info, label: 'Note', cls: 'callout-note' },
  tip: { icon: Lightbulb, label: 'Tip', cls: 'callout-tip' },
  warn: { icon: AlertTriangle, label: 'Careful', cls: 'callout-warn' },
  pitfall: { icon: AlertTriangle, label: 'Pitfall', cls: 'callout-warn' },
  insight: { icon: Sparkles, label: 'Insight', cls: 'callout-insight' },
  interview: { icon: BriefcaseBusiness, label: 'Interview', cls: 'callout-interview' },
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
      const algo = ALGORITHMS[b.algo]
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
      const Icon = c.icon
      return (
        <aside className={cn('callout rounded-2xl px-4 py-3.5', c.cls)}>
          <p className="callout-title mb-1 flex items-center gap-2 text-[12px] font-bold tracking-[0.08em] uppercase">
            <Icon className="size-4" /> {b.title ?? c.label}
          </p>
          <Markdown md={b.md} className="!text-[14.5px]" />
        </aside>
      )
    }
    case 'complexity':
      return (
        <div className="card overflow-hidden p-0">
          <p className="mb-0 flex items-center gap-2 border-b border-border px-4 py-2.5 text-[13px] font-semibold text-text-primary">
            <Zap className="size-4 text-accent-brand" /> {b.title ?? 'Complexity'}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[11px] tracking-wider text-text-muted uppercase">
                  <th className="px-4 py-2 font-semibold">Operation</th>
                  <th className="px-4 py-2 font-semibold">Time</th>
                  {b.rows.some((r) => r.space) && <th className="px-4 py-2 font-semibold">Space</th>}
                  <th className="px-4 py-2 font-semibold">Why</th>
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-2 text-text-primary">{r.op}</td>
                    <td className="px-4 py-2 font-mono font-semibold whitespace-nowrap text-accent-brand">{r.time}</td>
                    {b.rows.some((x) => x.space) && <td className="px-4 py-2 font-mono whitespace-nowrap text-text-secondary">{r.space ?? ''}</td>}
                    <td className="px-4 py-2 text-text-muted">{r.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    case 'check': {
      const qs = b.ids.map((id) => bank.get(id)).filter((q): q is Question => !!q)
      return (
        <section className="space-y-3">
          <h3 className="mb-0 flex items-center gap-2 text-[17px] font-semibold text-text-primary">
            <CheckCircle2 className="size-5 text-accent-brand" /> {b.title ?? 'Check yourself'}
          </h3>
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
        <ol className="space-y-3">
          {b.items.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-brand/15 font-mono text-[12px] font-bold text-accent-brand">{i + 1}</span>
              <div>
                <p className="mb-0.5 font-semibold text-text-primary">{s.title}</p>
                <Markdown md={s.md} className="!text-[14.5px]" />
              </div>
            </li>
          ))}
        </ol>
      )
  }
}
