import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Play, Search } from 'lucide-react'
import { Icon } from '@/components/icon/Icon'
import { GateShell } from '@/gate/shell/GateShell'
import { GATE_ROUTES } from '@/gate/api'
import { cn } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui'
import { GateCbtExam } from '@/gate/GateCbtExam'
import type { GateMeta, GatePaper } from '@/gate/types'

const EXAMS = ['ALL', 'CSE', 'IT', 'DA'] as const

function savedAttempt(id: string): number | null {
  try {
    const s = JSON.parse(localStorage.getItem(`nexora:gate-cbt:${id}`) ?? 'null')
    return s && s.timeRemaining > 0 ? Number(s.timeRemaining) : null
  } catch {
    return null
  }
}

export default function GateCbtPage() {
  const { paperId } = useParams<{ paperId?: string }>()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [exam, setExam] = useState<(typeof EXAMS)[number]>('ALL')
  const meta = useApi<GateMeta>(() => api.get<GateMeta>('/api/gate/meta'), [], { cacheKey: 'gate:meta' })

  const byYear = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = (meta.data?.papers ?? []).filter((p) => {
      if (exam !== 'ALL' && p.exam !== exam) return false
      return !q || `${p.exam} ${p.year} set ${p.set ?? ''}`.toLowerCase().includes(q)
    })
    const groups = new Map<number, GatePaper[]>()
    for (const p of [...list].sort((a, b) => b.year - a.year || a.exam.localeCompare(b.exam) || (a.set ?? 0) - (b.set ?? 0))) {
      groups.set(p.year, [...(groups.get(p.year) ?? []), p])
    }
    return [...groups.entries()]
  }, [meta.data, exam, search])

  if (paperId) {
    return <GateCbtExam key={paperId} paperId={paperId} onExit={() => navigate(GATE_ROUTES.cbt)} />
  }

  return (
    <GateShell
      title="Official mock papers"
      subtitle="Sit a past paper as a timed computer-based test — the exam console’s palette, mark for review, calculator and official negative marking. Answers open after you submit."
      actions={
        <Link to={GATE_ROUTES.tests} aria-label="Custom test" className="btn-secondary inline-flex items-center gap-2 !px-3 !py-2 !text-[13px]">
          <Icon name="sliders" className="size-4" /> <span className="hidden sm:inline" aria-hidden="true">Custom test</span>
        </Link>
      }
    >
    <div className="space-y-5 pb-28">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-0 flex-1 basis-56 items-center gap-2 rounded-xl border border-border-input bg-bg-field px-3 focus-within:border-accent-brand">
          <Search className="size-4 text-text-muted" />
          <span className="sr-only">Find a paper</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a paper — e.g. 2019, DA" className="min-w-0 flex-1 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-muted" />
        </label>
        <div className="flex h-10 items-center rounded-xl border border-border bg-bg-surface p-0.5" role="radiogroup" aria-label="Exam">
          {EXAMS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={exam === e}
              onClick={() => setExam(e)}
              className={cn('h-full rounded-[10px] px-3 text-[13px]', exam === e ? 'bg-bg-surface-3 font-semibold text-text-primary' : 'text-text-muted hover:text-text-primary')}
            >
              {e === 'ALL' ? 'All' : e}
            </button>
          ))}
        </div>
      </div>

      {meta.loading && !meta.data ? (
        <LoadingBlock rows={6} />
      ) : meta.error ? (
        <ErrorState message={meta.error} onRetry={meta.refetch} />
      ) : byYear.length === 0 ? (
        <div className="card">
          <EmptyState icon="search" title="No papers match" description="Try another year or exam." />
        </div>
      ) : (
        <div className="space-y-5">
          {byYear.map(([year, papers]) => (
            <section key={year} aria-labelledby={`y${year}`}>
              <h2 id={`y${year}`} className="mb-2 px-1 font-mono text-[13px] font-semibold text-text-muted">
                {year}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {papers.map((p) => {
                  const left = savedAttempt(p.id)
                  return (
                    <Link
                      key={p.id}
                      to={`${GATE_ROUTES.cbt}/${p.id}`}
                      className="card card-interactive group flex items-center gap-3 !p-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[14.5px] font-semibold text-text-primary">
                          GATE {p.exam} {p.year}
                          {p.set ? ` · Set ${p.set}` : ''}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-text-muted">
                          <span>{p.count} questions</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Icon name="clock" className="size-3" /> 3 h
                          </span>
                          {left !== null && <span className="text-state-warning">· In progress</span>}
                        </div>
                      </div>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary transition-colors group-hover:border-accent-brand group-hover:text-accent-brand">
                        <Play className="size-3.5" />
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
    </GateShell>
  )
}
