import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LoadingBlock } from '@/components/ui/EmptyState'
import { useSubjectTree, fmtMinutes } from '@/gate/notes/api'
import { progressOf, useNotesProgress } from '@/gate/notes/progress'
import { DSA_TOPICS, DSA_UNITS } from '@/learn/content/dsa/syllabus'
import { isDone, useProgress } from '@/learn/progress'
import { roman } from './SubjectContents'
import './subject-contents.css'

/*
 * A subject's book: the lessons you can read, in order, each one click from
 * the reader. GATE subjects show their notes (chapters, then lessons); DSA
 * shows its course (units, then chapters). Nothing here is locked: a lesson
 * that is written can always be read. The skills you master are a tab away.
 */

export interface BookChapter {
  id: string
  n: number
  title: string
  lessons: BookLesson[]
}
export interface BookLesson {
  id: string
  title: string
  href: string | null
  minutes?: number
  /** "3 of 9 pages", "Being written"… */
  note?: string
  done: boolean
  started: boolean
}

function Book({ chapters, kicker, aside }: { chapters: BookChapter[]; kicker: string; aside?: ReactNode }) {
  const [current, setCurrent] = useState<string | null>(chapters[0]?.id ?? null)
  const all = chapters.flatMap((c) => c.lessons).filter((l) => l.href)
  const next = all.find((l) => l.started && !l.done) ?? all.find((l) => !l.done) ?? null
  const read = all.filter((l) => l.done).length

  useEffect(() => {
    const els = chapters.map((c) => document.getElementById(`book-${c.id}`)).filter((e): e is HTMLElement => !!e)
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (vis) setCurrent(vis.target.getAttribute('data-ch'))
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [chapters])

  return (
    <div className="sx-toc">
      <aside className="sx-toc-index" aria-label="Chapters">
        <p className="ed-label ed-muted m-0">{kicker}</p>
        <ol className="mt-4 mb-0 list-none p-0">
          {chapters.map((c) => {
            const done = c.lessons.filter((l) => l.done).length
            return (
              <li key={c.id}>
                <a
                  href={`#book-${c.id}`}
                  className={cn('sx-toc-link', current === c.id && 'is-on')}
                  aria-current={current === c.id ? 'location' : undefined}
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(`book-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <span className="ed-serif-numeral sx-toc-num">{roman(c.n)}</span>
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  <span className="ed-mono text-[11px]">
                    {done}/{c.lessons.length}
                  </span>
                </a>
              </li>
            )
          })}
        </ol>
        {aside && <div className="mt-10 hidden lg:block">{aside}</div>}
      </aside>

      <div className="min-w-0">
        {next && (
          <Link to={next.href!} className="sx-resume">
            <span className="min-w-0 flex-1">
              <span className="ed-label ed-muted block">{read ? 'Continue reading' : 'Start reading'}</span>
              <span className="ed-serif sx-resume-title mt-1 block">{next.title}</span>
            </span>
            <span className="ed-mono ed-muted shrink-0 text-[12px]">
              {read} of {all.length} read
            </span>
            <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
          </Link>
        )}
        {chapters.map((c) => (
          <section key={c.id} id={`book-${c.id}`} data-ch={c.id} className="sx-chapter" aria-labelledby={`book-h-${c.id}`}>
            <h2 id={`book-h-${c.id}`} className="sx-chapter-h">
              <span className="ed-serif-numeral sx-chapter-num" aria-hidden="true">
                {roman(c.n)}
              </span>
              <span className="sr-only">Chapter {c.n}: </span>
              <span className="ed-serif">{c.title}</span>
            </h2>
            <ol className="sx-lessons mt-5 mb-0 list-none p-0">
              {c.lessons.map((l, i) => {
                const body = (
                  <>
                    <span className="ed-mono ed-muted sx-lesson-no">
                      {c.n}.{i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="ed-ui block">{l.title}</span>
                      {l === next && <span className="ed-caption sx-next mt-0.5 block">Next up</span>}
                    </span>
                    {l.note ? <span className="ed-mono ed-muted text-[12px]">{l.note}</span> : l.minutes ? <span className="ed-mono ed-muted text-[12px]">{fmtMinutes(l.minutes)}</span> : null}
                    <span className="sx-lesson-state">
                      {l.done ? (
                        <span className="sx-done" title="Read">
                          <Check className="size-3.5" aria-hidden="true" />
                          <span className="sr-only">Read</span>
                        </span>
                      ) : l.href ? (
                        <ArrowRight className="sx-go size-4" aria-hidden="true" />
                      ) : null}
                    </span>
                  </>
                )
                return (
                  <li key={l.id}>
                    {l.href ? (
                      <Link to={l.href} className="sx-lesson">
                        {body}
                      </Link>
                    ) : (
                      <div className="sx-lesson is-locked" aria-disabled="true">
                        {body}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
        {aside && <div className="mt-12 lg:hidden">{aside}</div>}
      </div>
    </div>
  )
}

/** The GATE notes of a subject, as its book. */
export function NotesBook({ notesId, aside }: { notesId: string; aside?: ReactNode }) {
  const tree = useSubjectTree(notesId)
  const progress = useNotesProgress(notesId)
  const chapters = useMemo<BookChapter[]>(
    () =>
      (tree.data?.chapters ?? []).map((c) => ({
        id: c.id,
        n: c.n,
        title: c.title,
        lessons: c.lessons.map((l) => {
          const p = progressOf(progress, notesId, l.id)
          return {
            id: l.id,
            title: l.title,
            href: `/gate/notes/${notesId}/${l.id}`,
            minutes: l.est_minutes || undefined,
            done: p.completed,
            started: p.scrollPct > 0,
          }
        }),
      })),
    [tree.data, progress, notesId],
  )
  if (!tree.data) return tree.error ? <p className="ed-ui ed-muted">The lessons could not load. Refresh to try again.</p> : <LoadingBlock rows={8} />
  return <Book chapters={chapters} kicker="Chapters" aside={aside} />
}

/** The DSA course, as its book. */
export function DsaBook({ aside }: { aside?: ReactNode }) {
  const { items } = useProgress()
  const chapters = useMemo<BookChapter[]>(
    () =>
      DSA_UNITS.map((u, ui) => ({
        id: u.id,
        n: ui + 1,
        title: u.title,
        lessons: DSA_TOPICS.filter((t) => t.unit === u.id).map((t) => {
          const read = Object.entries(items).filter(([k, v]) => k.startsWith(`page:${t.id}/`) && isDone(v)).length
          const pages = t.pages ?? 0
          return {
            id: t.id,
            title: t.title,
            href: t.load ? `/learn/dsa/${t.id}` : null,
            note: t.load ? (read ? `${read} of ${pages} pages` : `${pages} pages`) : 'Being written',
            done: !!t.load && pages > 0 && read >= pages,
            started: read > 0,
          }
        }),
      })).filter((c) => c.lessons.length),
    [items],
  )
  return <Book chapters={chapters} kicker="Units" aside={aside} />
}
