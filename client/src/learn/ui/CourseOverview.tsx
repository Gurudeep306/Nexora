import { Link } from 'react-router-dom'
import { BookOpenCheck, ChevronRight, Clapperboard, Code2, Languages, ListChecks, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DSA_TOPICS, DSA_UNITS } from '../content/dsa/syllabus'
import { isDone, useProgress } from '../progress'

/** The DSA course map: units, topics, what is ready, and your progress. */
export function CourseOverview() {
  const { items } = useProgress()
  const pagesRead = (topic: string) => Object.entries(items).filter(([k, v]) => k.startsWith(`page:${topic}/`) && isDone(v)).length
  const ready = DSA_TOPICS.filter((t) => t.load)

  return (
    <div className="space-y-8">
      {/* hero */}
      <div className="card overflow-hidden p-0">
        <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-accent-brand uppercase">Nexora Learn · Course</p>
            <h2 className="mb-3 !text-[28px] font-bold tracking-tight text-text-primary sm:!text-[32px]">Data Structures & Algorithms</h2>
            <p className="mb-5 text-[15px] leading-relaxed text-text-secondary">
              Every topic is taught page by page, with an animation for each algorithm that shows the data structure changing while the matching line of code lights up — in pseudocode, C++, Java, Python, JavaScript and C. Each page ends with questions, and each topic has a problem set judged in the editor.
            </p>
            {ready[0] && (
              <Link to={`/learn/dsa/${ready[0].id}`} className="btn-primary inline-flex items-center gap-2 !py-2.5">
                {pagesRead(ready[0].id) ? 'Continue' : 'Start'} with {ready[0].title} <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            {[
              { icon: Clapperboard, label: 'Step-by-step animations', sub: 'data structures, line by line' },
              { icon: Languages, label: '6 languages', sub: 'pseudo · C++ · Java · Python · JS · C' },
              { icon: ListChecks, label: 'Question bank', sub: 'MCQ, fill the code, match, order, predict…' },
              { icon: Code2, label: 'Judged problems', sub: 'hidden tests, any language' },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl bg-bg-surface-2 p-3.5 ring-1 ring-border">
                <f.icon className="mb-2 size-5 text-accent-brand" />
                <p className="mb-0 text-[13px] font-semibold text-text-primary">{f.label}</p>
                <p className="mb-0 text-[11.5px] text-text-muted">{f.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {DSA_UNITS.map((u, ui) => {
        const topics = DSA_TOPICS.filter((t) => t.unit === u.id)
        return (
          <section key={u.id}>
            <div className="mb-3 flex items-baseline gap-3">
              <span className="font-mono text-[12px] text-text-muted">Unit {ui + 1}</span>
              <h3 className="mb-0 !text-[19px] font-semibold text-text-primary">{u.title}</h3>
              <p className="mb-0 hidden text-[13px] text-text-muted sm:block">{u.blurb}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {topics.map((t) => {
                const read = pagesRead(t.id)
                const pct = t.pages ? Math.round((read / t.pages) * 100) : 0
                const body = (
                  <>
                    <div className="flex items-start gap-3">
                      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', t.load ? 'bg-accent-brand/15 text-accent-brand' : 'bg-bg-surface-3 text-text-muted')}>
                        {t.load ? <BookOpenCheck className="size-5" /> : <Lock className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="mb-0.5 flex items-center gap-2 text-[15px] font-semibold text-text-primary">
                          {t.title}
                          {!t.load && <span className="rounded-full bg-bg-surface-3 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-text-muted uppercase">In the works</span>}
                        </p>
                        <p className="mb-0 line-clamp-2 text-[12.5px] leading-snug text-text-muted">{t.blurb}</p>
                      </div>
                    </div>
                    {t.load && (
                      <div className="mt-3.5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-bg-surface-3">
                          <div className="h-full rounded-full bg-accent-brand transition-[width] duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1.5 mb-0 flex justify-between font-mono text-[11px] text-text-muted">
                          <span>
                            {read}/{t.pages} pages
                          </span>
                          <span>{pct}%</span>
                        </p>
                      </div>
                    )}
                  </>
                )
                return t.load ? (
                  <Link key={t.id} to={`/learn/dsa/${t.id}`} className="card-interactive card block p-4 !no-underline">
                    {body}
                  </Link>
                ) : (
                  <div key={t.id} className="card p-4 opacity-75">
                    {body}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
