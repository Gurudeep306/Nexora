import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuestionView } from './QuestionView'
import { type GateQuestion } from './types'

interface GateFocusDeckProps {
  questions: GateQuestion[]
  subjectName: (s: string) => string
  topicName: (s: string, t: string) => string | undefined
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}

export function GateFocusDeck({
  questions,
  subjectName,
  topicName,
  page,
  total,
  pageSize,
  onPageChange,
}: GateFocusDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Clamp current index when questions change
  useEffect(() => {
    if (currentIndex >= questions.length) {
      setCurrentIndex(Math.max(0, questions.length - 1))
    }
  }, [questions.length, currentIndex])

  // Keyboard navigation [ArrowLeft] and [ArrowRight]
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === 'j') {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex((i) => i + 1)
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        if (currentIndex > 0) {
          setCurrentIndex((i) => i - 1)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, questions.length])

  if (questions.length === 0) return null

  const activeQuestion = questions[currentIndex] || questions[0]
  const globalIndex = (page - 1) * pageSize + currentIndex + 1

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-200">
      {/* ── Top Focus Studio Strip Navigator ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-bg-surface-2/60 p-3 sm:px-5 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[13px] font-bold text-text-primary">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent-brand text-white shadow-xs">
              {currentIndex + 1}
            </span>
            <span className="text-text-muted">/ {questions.length}</span>
            <span className="text-[11.5px] text-text-muted font-normal hidden sm:inline">
              (Global #{globalIndex} of {total})
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 border-l border-border/60 pl-3">
            <span className="text-[11px] text-text-muted">Use</span>
            <kbd className="rounded bg-bg-surface px-1.5 py-0.5 text-[10px] font-mono border border-border">←</kbd>
            <kbd className="rounded bg-bg-surface px-1.5 py-0.5 text-[10px] font-mono border border-border">→</kbd>
            <span className="text-[11px] text-text-muted">keys to navigate</span>
          </div>
        </div>

        {/* Scrollable Question Number Chips Strip */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full sm:max-w-md py-1 scrollbar-none">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIndex
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-xl font-mono text-[12px] font-bold transition-all cursor-pointer border',
                  isCurrent
                    ? 'border-accent-brand bg-accent-brand text-white shadow-sm ring-2 ring-accent-brand/20 scale-105'
                    : 'border-border/60 bg-bg-surface/80 text-text-muted hover:border-accent-brand/40 hover:text-text-primary',
                )}
                title={`Jump to Q${idx + 1}: ${q.number}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>

        {/* Prev / Next Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            className="flex items-center gap-1 rounded-xl border border-border/80 bg-bg-surface px-3 py-1.5 text-[12px] font-bold text-text-primary hover:border-accent-brand disabled:opacity-40 transition-all cursor-pointer shadow-xs"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <button
            type="button"
            disabled={currentIndex === questions.length - 1}
            onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            className="flex items-center gap-1 rounded-xl border border-border/80 bg-bg-surface px-3 py-1.5 text-[12px] font-bold text-text-primary hover:border-accent-brand disabled:opacity-40 transition-all cursor-pointer shadow-xs"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Active Question Canvas ── */}
      <div className="min-h-[420px]">
        <QuestionView
          key={activeQuestion.id}
          q={activeQuestion}
          subjectName={subjectName(activeQuestion.subject)}
          topicName={topicName(activeQuestion.subject, activeQuestion.topic)}
        />
      </div>

      {/* ── Bottom Deck Footer with Jump Control ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-[12.5px] text-text-muted">
        <span>
          Viewing Question <strong className="text-text-primary">{currentIndex + 1}</strong> of{' '}
          <strong className="text-text-primary">{questions.length}</strong> in current set
        </span>

        <div className="flex items-center gap-2">
          {page > 1 && (
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              className="text-accent-brand hover:underline font-semibold"
            >
              ← Load Previous Set
            </button>
          )}
          {page * pageSize < total && (
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              className="text-accent-brand hover:underline font-semibold"
            >
              Load Next Set →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
