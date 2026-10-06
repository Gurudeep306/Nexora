import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ErrorState, LoadingBlock, PageHeader } from '@/components/ui'
import { cn } from '@/lib/utils'
import { codeKey, isDone, qKey, useProgress } from '../progress'
import { KIND_LABEL, type Question, type QuestionKind } from '../questions/types'
import { QuestionCard } from './QuestionCard'
import { useTopic } from './useTopic'

type Status = 'all' | 'todo' | 'done'

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('cursor-pointer rounded-full px-3 py-1 text-[12px] font-medium transition-colors hover:!scale-100', on ? 'bg-accent-brand text-on-accent-brand' : 'bg-bg-surface-2 text-text-secondary ring-1 ring-border hover:text-text-primary')}
    >
      {children}
    </button>
  )
}

/** A topic's whole question bank, with filters by kind, page, difficulty and status. */
export default function PracticePage() {
  const { topic: topicId } = useParams()
  const { entry, topic, error } = useTopic(topicId)
  const { items } = useProgress()
  const [kind, setKind] = useState<QuestionKind | 'all'>('all')
  const [diff, setDiff] = useState<Question['difficulty'] | 'all'>('all')
  const [page, setPage] = useState<string>('all')
  const [status, setStatus] = useState<Status>('all')

  const doneOf = (q: Question) => isDone(items[q.kind === 'code' ? codeKey(q.slug) : qKey(q.id)])
  const list = useMemo(
    () =>
      (topic?.questions ?? []).filter(
        (q) =>
          (kind === 'all' || q.kind === kind) &&
          (diff === 'all' || q.difficulty === diff) &&
          (page === 'all' || q.page === page) &&
          (status === 'all' || (status === 'done') === doneOf(q)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topic, kind, diff, page, status, items],
  )

  if (!entry?.load) return <Navigate to="/learn" replace />
  if (error) return <ErrorState message={error} />
  if (!topic) return <LoadingBlock rows={8} />

  const kinds = [...new Set(topic.questions.map((q) => q.kind))]
  const total = topic.questions.length
  const done = topic.questions.filter(doneOf).length

  return (
    <div className="mx-auto max-w-[900px]">
      <Link to={`/learn/dsa/${topic.id}`} className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-text-muted !no-underline hover:text-text-primary">
        <ArrowLeft className="size-3.5" /> {topic.title}
      </Link>
      <PageHeader title={`${topic.title} — question bank`} subtitle={`${total} questions: ${topic.questions.filter((q) => q.kind !== 'code').length} answered right here, ${topic.questions.filter((q) => q.kind === 'code').length} judged in the editor. ${done} done.`} />

      <div className="card mb-5 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-[11.5px] font-semibold text-text-muted">Type</span>
          <Chip on={kind === 'all'} onClick={() => setKind('all')}>All</Chip>
          {kinds.map((k) => (
            <Chip key={k} on={kind === k} onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-[11.5px] font-semibold text-text-muted">Level</span>
          {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
            <Chip key={d} on={diff === d} onClick={() => setDiff(d)}>
              {d === 'all' ? 'All' : d[0].toUpperCase() + d.slice(1)}
            </Chip>
          ))}
          <span className="ml-3 w-14 text-[11.5px] font-semibold text-text-muted">Status</span>
          {(['all', 'todo', 'done'] as const).map((s) => (
            <Chip key={s} on={status === s} onClick={() => setStatus(s)}>
              {s === 'all' ? 'All' : s === 'todo' ? 'To do' : 'Done'}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-[11.5px] font-semibold text-text-muted">Page</span>
          <select value={page} onChange={(e) => setPage(e.target.value)} className="input-base !py-1.5 !text-[12.5px]">
            <option value="all">All pages</option>
            {topic.pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <span className="ml-auto font-mono text-[11.5px] text-text-muted">{list.length} shown</span>
        </div>
      </div>

      <div className="space-y-4">
        {list.map((q, i) => (
          <QuestionCard key={q.id} q={q} index={i + 1} />
        ))}
        {!list.length && <p className="py-10 text-center text-text-muted">No questions match these filters.</p>}
      </div>
    </div>
  )
}
