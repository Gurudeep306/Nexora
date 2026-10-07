import { useState } from 'react'
import { cn } from '@/lib/utils'
import { QuestionView } from './QuestionView'
import { type GateQuestion, TYPE_LABEL, paperLabel } from './types'

interface GateSplitStudioProps {
  questions: GateQuestion[]
  subjectName: (s: string) => string
  topicName: (s: string, t: string) => string | undefined
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}

export function GateSplitStudio({
  questions,
  subjectName,
  topicName,
  page,
  total,
  pageSize,
  onPageChange,
}: GateSplitStudioProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (questions.length === 0) return null

  const activeQuestion = questions[selectedIndex] || questions[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-in fade-in-0 duration-200">
      {/* ── Left Column: Question Queue Tiles (4 cols) ── */}
      <div className="lg:col-span-4 rounded-3xl border border-border/80 bg-bg-surface-2/40 p-3.5 shadow-xl backdrop-blur-xl space-y-2.5 max-h-[calc(100vh-140px)] flex flex-col">
        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-border/60">
          <div>
            <h4 className="text-[13px] font-bold text-text-primary">Question Queue</h4>
            <p className="text-[11px] text-text-muted">
              {questions.length} questions in this batch
            </p>
          </div>
          <span className="rounded-lg bg-accent-brand/15 px-2 py-0.5 text-[11px] font-mono font-bold text-accent-brand">
            Page {page}
          </span>
        </div>

        {/* Scrollable Queue List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {questions.map((q, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <div
                key={q.id}
                onClick={() => setSelectedIndex(idx)}
                className={cn(
                  'group relative flex flex-col gap-1.5 rounded-2xl border p-3 transition-all duration-150 cursor-pointer text-left',
                  isSelected
                    ? 'border-accent-brand bg-accent-brand/10 shadow-md ring-1 ring-accent-brand/30'
                    : 'border-border/60 bg-bg-surface/70 hover:border-accent-brand/50 hover:bg-bg-surface-2',
                )}
              >
                {/* Tile Top Row */}
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span
                      className={cn(
                        'flex size-5 items-center justify-center rounded-md font-mono text-[10.5px]',
                        isSelected ? 'bg-accent-brand text-white' : 'bg-bg-surface-2 text-text-muted',
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-text-primary">
                      {q.section === 'ga' ? 'GA ' : ''}Q{q.number}
                    </span>
                    <span className="text-text-muted font-normal">· {paperLabel(q)}</span>
                  </div>

                  <span className="rounded bg-bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-secondary border border-border/60">
                    {q.marks ?? 1}M
                  </span>
                </div>

                {/* Prompt Snippet (2 lines truncated) */}
                <p className="text-[12px] text-text-secondary line-clamp-2 m-0 font-normal leading-snug">
                  {q.text.replace(/[$#*_`]/g, '').slice(0, 100)}...
                </p>

                {/* Tile Bottom Row */}
                <div className="flex items-center justify-between pt-1 text-[10.5px] text-text-muted">
                  <span className="font-semibold text-accent-brand">
                    {subjectName(q.subject)}
                  </span>
                  <span className="font-mono">{TYPE_LABEL[q.type]}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Queue Pagination Footer */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11.5px] px-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="text-text-muted hover:text-text-primary disabled:opacity-40 font-semibold cursor-pointer"
          >
            ← Prev Batch
          </button>
          <span className="font-mono text-text-muted">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
          </span>
          <button
            type="button"
            disabled={page * pageSize >= total}
            onClick={() => onPageChange(page + 1)}
            className="text-text-muted hover:text-text-primary disabled:opacity-40 font-semibold cursor-pointer"
          >
            Next Batch →
          </button>
        </div>
      </div>

      {/* ── Right Column: Active Question Workspace (8 cols) ── */}
      <div className="lg:col-span-8 min-h-[500px]">
        <QuestionView
          key={activeQuestion.id}
          q={activeQuestion}
          subjectName={subjectName(activeQuestion.subject)}
          topicName={topicName(activeQuestion.subject, activeQuestion.topic)}
        />
      </div>
    </div>
  )
}
