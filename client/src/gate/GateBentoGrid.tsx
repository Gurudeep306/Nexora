import { useState } from 'react'
import {
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { HandwrittenSolution } from './HandwrittenSolution'
import { ReconstructedDiagram } from './ReconstructedDiagram'
import { type GateQuestion, TYPE_LABEL, paperLabel } from './types'

interface GateBentoGridProps {
  questions: GateQuestion[]
  subjectName: (s: string) => string
  topicName: (s: string, t: string) => string | undefined
}

export function GateBentoGrid({
  questions,
  subjectName,
  topicName,
}: GateBentoGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in-0 duration-200">
      {questions.map((q) => {
        const isExpanded = expandedId === q.id

        return (
          <article
            key={q.id}
            className={cn(
              'group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-bg-surface p-4 sm:p-5 shadow-lg transition-all duration-200 hover:border-accent-brand/50 hover:shadow-xl',
              isExpanded && 'md:col-span-2 border-accent-brand ring-1 ring-accent-brand/20 bg-bg-surface',
            )}
          >
            {/* Header */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5 text-[11.5px]">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="rounded-lg bg-accent-brand/15 px-2 py-0.5 text-accent-brand">
                    {paperLabel(q)}
                  </span>
                  <span className="text-text-primary font-mono text-[12.5px]">
                    {q.section === 'ga' ? 'GA ' : ''}Q{q.number}
                  </span>
                  <span className="rounded bg-bg-surface-2 px-1.5 py-0.5 text-text-muted">
                    {q.marks ?? 1}M
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="rounded-lg bg-bg-surface-2 px-2 py-0.5 font-medium text-text-muted">
                    {subjectName(q.subject)}
                  </span>
                  <span className="rounded-lg bg-bg-surface-2 px-1.5 py-0.5 font-mono text-text-muted">
                    {TYPE_LABEL[q.type]}
                  </span>
                </div>
              </div>

              {/* Prompt Body */}
              <div className="py-3 text-[13.5px] text-text-primary leading-relaxed font-normal">
                <Markdown
                  md={
                    isExpanded
                      ? q.text
                      : q.text.slice(0, 220) + (q.text.length > 220 ? '...' : '')
                  }
                />
              </div>

              {/* Figures if any */}
              {q.figures && q.figures.length > 0 && isExpanded && (
                <ReconstructedDiagram questionId={q.id} figures={q.figures} />
              )}

              {/* Options */}
              {q.options && q.options.length > 0 && (
                <div className="grid gap-1.5 pt-1">
                  {(isExpanded ? q.options : q.options.slice(0, 4)).map((o) => (
                    <div
                      key={o.l}
                      className="flex items-center gap-2 rounded-xl border border-border/60 bg-bg-surface-2/40 px-3 py-1.5 text-[12.5px] text-text-secondary"
                    >
                      <span className="font-mono font-bold text-accent-brand">{o.l}</span>
                      <span className="line-clamp-1">{o.t.replace(/[$`]/g, '')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-text-primary hover:border-accent-brand transition-colors cursor-pointer"
              >
                {isExpanded ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span>{isExpanded ? 'Collapse' : '✍️ View Handwritten Solution'}</span>
              </button>

              <span className="text-[11px] font-mono text-text-muted">
                {q.exam} {q.year}
              </span>
            </div>

            {/* Handwritten Solution Expanded */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-border">
                <HandwrittenSolution
                  q={q}
                  subjectName={subjectName(q.subject)}
                  topicName={topicName(q.subject, q.topic)}
                />
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
