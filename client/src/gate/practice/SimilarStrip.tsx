import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { gateApi, GATE_ROUTES } from '../api'
import { snippet } from '../answers'
import { useGateProgress } from '../progress'
import { OutcomeDot } from '../QuestionView'
import { TYPE_SHORT, type GateList, type GateQuestion } from '../types'

/** Similar questions: the server's pick, else the same topic from the bank. */
async function fetchSimilar(q: GateQuestion): Promise<GateQuestion[]> {
  let ids: string[] = []
  try {
    ids = (await gateApi.similar(q.id)).ids ?? []
  } catch {
    /* fall back below */
  }
  if (ids.length) {
    const r = await api.get<GateList>('/api/gate/questions', { query: { ids: ids.join(','), limit: 6 } })
    return r.questions.filter((x) => x.id !== q.id).slice(0, 6)
  }
  const r = await api.get<GateList>('/api/gate/questions', { query: { topic: `${q.subject}/${q.topic}`, limit: 12, sort: 'year-desc' } })
  const rest = r.questions.filter((x) => x.id !== q.id)
  // Spread over years rather than six from one paper.
  const seen = new Set<string>()
  const out: GateQuestion[] = []
  for (const x of rest) {
    if (seen.has(x.paper)) continue
    seen.add(x.paper)
    out.push(x)
    if (out.length === 6) break
  }
  return out.length >= 3 ? out : rest.slice(0, 6)
}

export function SimilarStrip({ q, className }: { q: GateQuestion; className?: string }) {
  const res = useApi(() => fetchSimilar(q), [q.id], { cacheKey: `gate:similar:${q.id}` })
  const progress = useGateProgress()
  const list = res.data ?? []
  if (!res.loading && list.length === 0) return null
  const ids = [q.id, ...list.map((x) => x.id)].join(',')

  return (
    <section className={cn('space-y-2', className)} aria-label="Similar questions">
      <h3 className="flex items-center gap-1.5 px-1 text-[12px] font-semibold tracking-wide text-text-muted uppercase">
        <Sparkles className="size-3.5" /> Similar questions
        {list.length > 0 && (
          <Link to={`${GATE_ROUTES.practice}?ids=${ids}&i=1`} className="ml-auto text-[11.5px] font-medium tracking-normal text-accent-brand normal-case hover:underline">
            Practise all {list.length} →
          </Link>
        )}
      </h3>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {res.loading && !res.data
          ? [0, 1, 2].map((i) => <div key={i} className="h-[92px] w-60 shrink-0 animate-pulse rounded-xl bg-bg-surface-2" />)
          : list.map((x, k) => (
              <Link
                key={x.id}
                to={`${GATE_ROUTES.practice}?ids=${ids}&i=${k + 1}`}
                className="card card-interactive flex h-[92px] w-60 shrink-0 snap-start flex-col gap-1 !p-3"
              >
                <span className="flex items-center gap-1.5 text-[11.5px] text-text-muted">
                  <span className="font-mono font-semibold text-text-primary">
                    {x.exam} {x.year}
                    {x.set ? `·${x.set}` : ''}
                  </span>
                  <span>{TYPE_SHORT[x.type]}</span>
                  {x.marks != null && <span>· {x.marks}m</span>}
                  <OutcomeDot outcome={progress[x.id]?.outcome} className="ml-auto" />
                </span>
                <span className="line-clamp-3 text-[12px] leading-snug text-text-secondary">{snippet(x.text, 140)}</span>
              </Link>
            ))}
      </div>
    </section>
  )
}
