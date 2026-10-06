import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Play,
  ArrowLeft,
  Search,
  Trophy,
  Cpu,
  Brain,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { LoadingBlock } from '@/components/ui'
import { GateCbtExam } from '@/gate/GateCbtExam'
import type { GateMeta } from '@/gate/types'

export default function GateCbtPage() {
  const { paperId } = useParams<{ paperId?: string }>()
  const navigate = useNavigate()
  const [selectedPaper, setSelectedPaper] = useState<string | null>(paperId || null)
  const [search, setSearch] = useState('')
  const [examFilter, setExamFilter] = useState<'ALL' | 'CSE' | 'DA'>('ALL')

  const meta = useApi<GateMeta>(() => api.get<GateMeta>('/api/gate/meta'), [])

  const papers = meta.data?.papers || []

  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      if (examFilter !== 'ALL' && p.exam !== examFilter) return false
      if (search) {
        const text = `${p.exam} ${p.year} set ${p.set || ''} ${p.notes}`.toLowerCase()
        if (!text.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [papers, examFilter, search])

  // If a paper is chosen, render the CBT simulation
  if (selectedPaper) {
    return (
      <GateCbtExam
        paperId={selectedPaper}
        onExit={() => {
          setSelectedPaper(null)
          navigate('/gate/cbt')
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6 font-sans text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/gate')}
            className="mb-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-text-muted hover:text-accent-brand transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Practice Question Bank
          </button>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Real CBT Simulation
            </span>
            <span className="rounded-lg bg-accent-brand/15 px-2.5 py-0.5 text-[11px] font-bold text-accent-brand uppercase tracking-wider">
              TCS iON Environment
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
            Official GATE Computer Based Test (CBT) Simulator
          </h1>
          <p className="mt-1 text-[13.5px] text-text-muted max-w-2xl">
            Attempt official GATE past-year question papers in real exam conditions with strict 3-hour timing, official TCS iON 5-state question palette, built-in scientific calculator, and instant AI diagnostic attempt analysis.
          </p>
        </div>
      </div>

      {/* ── Key Highlights Banner ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 flex items-start gap-3 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/30">
          <Trophy className="size-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-[13px] text-text-primary">Authentic Marking Scheme</h4>
            <p className="text-[12px] text-text-muted mt-0.5">
              Exact negative marking rules (+1, -0.33 for 1M; +2, -0.66 for 2M; 0 negative for NAT & MSQ).
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-start gap-3 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/30">
          <Cpu className="size-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-[13px] text-text-primary">Official Virtual Calculator</h4>
            <p className="text-[12px] text-text-muted mt-0.5">
              Full on-screen TCS iON scientific calculator with Rad/Deg modes, trig, log, and memory operations.
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-start gap-3 bg-gradient-to-br from-accent-brand/10 to-transparent border-accent-brand/30">
          <Brain className="size-5 text-accent-brand shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-[13px] text-text-primary">Nexora AI Diagnostics</h4>
            <p className="text-[12px] text-text-muted mt-0.5">
              Detailed post-exam scorecard, Predicted All India Rank, speed-accuracy matrix, and topic revision plan.
            </p>
          </div>
        </div>
      </div>

      {/* ── Paper Selector Toolbar ── */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl bg-bg-surface-2 px-3 py-2 border border-border">
            <Search className="size-4 text-text-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by year or paper notes (e.g. 2024, DA, IIT Roorkee)..."
              className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>

          {/* Exam Filters */}
          <div className="flex items-center gap-1.5 rounded-xl bg-bg-surface-2 p-1 border border-border text-[12px] font-bold">
            <button
              type="button"
              onClick={() => setExamFilter('ALL')}
              className={cn('rounded-lg px-3 py-1.5 transition-colors cursor-pointer', examFilter === 'ALL' && 'bg-bg-surface text-accent-brand shadow-sm')}
            >
              All Papers ({papers.length})
            </button>
            <button
              type="button"
              onClick={() => setExamFilter('CSE')}
              className={cn('rounded-lg px-3 py-1.5 transition-colors cursor-pointer', examFilter === 'CSE' && 'bg-bg-surface text-accent-brand shadow-sm')}
            >
              Computer Science (CSE)
            </button>
            <button
              type="button"
              onClick={() => setExamFilter('DA')}
              className={cn('rounded-lg px-3 py-1.5 transition-colors cursor-pointer', examFilter === 'DA' && 'bg-bg-surface text-accent-brand shadow-sm')}
            >
              Data Science & AI (DA)
            </button>
          </div>
        </div>
      </div>

      {/* ── Papers Grid ── */}
      {meta.loading ? (
        <LoadingBlock rows={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredPapers.map((p) => {
            const isRecent = p.year >= 2024
            return (
              <div
                key={p.id}
                className={cn(
                  'card relative flex flex-col justify-between p-4 transition-all hover:border-accent-brand/50 hover:shadow-lg',
                  isRecent && 'border-accent-brand/40 bg-gradient-to-br from-accent-brand/5 to-transparent',
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-accent-brand/15 px-2 py-0.5 text-[11px] font-mono font-bold text-accent-brand uppercase">
                      {p.exam} {p.year}
                    </span>
                    <span className="font-mono text-[12px] text-text-muted font-bold">
                      {p.count} Questions · 100M
                    </span>
                  </div>

                  <h3 className="mt-2 text-[15px] font-bold text-text-primary">
                    GATE {p.exam} {p.year} {p.set ? `Set ${p.set}` : ''}
                  </h3>
                  <p className="mt-1 text-[12px] text-text-muted line-clamp-2">
                    {p.notes || `Official examination paper for GATE ${p.exam} ${p.year}.`}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11.5px] text-text-muted font-mono">
                    <span>180 Mins</span>
                    <span>·</span>
                    <span>65 Qs</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPaper(p.id)
                      navigate(`/gate/cbt/${p.id}`)
                    }}
                    className="btn-primary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12px] font-bold shadow-md cursor-pointer"
                  >
                    <Play className="size-3.5" /> Start Exam
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
