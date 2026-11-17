import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { prefetchHandlers } from '@/routes'
import { SUBJECT_COLOR_VAR, useNotesSubjects, useSubjectTree } from '@/gate/notes/api'
import { progressOf, useNotesProgress } from '@/gate/notes/progress'
import type { NotesSubject } from '@/gate/notes/types'
import { DSA_TOPICS } from '@/learn/content/dsa/syllabus'
import { isDone, type ItemState } from '@/learn/progress'
import { Reveal } from './Today'

/*
 * Your bookshelf: every subject with lessons written, as a book — how far
 * you have read, and the next lesson, one tap from the full reader.
 */

interface Book {
  id: string
  title: string
  blurb: string
  colour: string
  read: number
  total: number
  unit: string
  next: { title: string; to: string } | null
  home: string
}

function BookCard({ b }: { b: Book }) {
  const pct = b.total ? Math.round((b.read / b.total) * 100) : 0
  return (
    <li className="shelf-book" style={{ ['--book' as string]: b.colour }}>
      <Link to={b.home} {...prefetchHandlers(b.home)} className="shelf-cover">
        <span className="shelf-spine" aria-hidden="true" />
        <span className="ed-label ed-muted block">{b.read ? `${pct}% read` : 'Not started'}</span>
        <span className="shelf-title ed-serif block">{b.title}</span>
        <span className="shelf-blurb">{b.blurb}</span>
        <span className="shelf-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </span>
        <span className="ed-mono ed-muted block text-[12px]">
          {b.read} of {b.total} {b.unit} read
        </span>
      </Link>
      {b.next && (
        <Link to={b.next.to} {...prefetchHandlers(b.next.to)} className="shelf-next">
          <span className="min-w-0 flex-1">
            <span className="ed-caption ed-muted block">{b.read ? 'Next lesson' : 'First lesson'}</span>
            <span className="ed-ui block truncate font-medium">{b.next.title}</span>
          </span>
          <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      )}
    </li>
  )
}

/** One GATE notes subject as a book (its own hooks: the tree and progress). */
function NotesBookCard({ s, home }: { s: NotesSubject; home: string }) {
  const tree = useSubjectTree(s.id)
  const progress = useNotesProgress(s.id)
  const book = useMemo<Book>(() => {
    const lessons = (tree.data?.chapters ?? []).flatMap((c) => c.lessons)
    const read = lessons.filter((l) => progressOf(progress, s.id, l.id).completed).length
    const nx = lessons.find((l) => !progressOf(progress, s.id, l.id).completed) ?? null
    return {
      id: s.id,
      title: s.title,
      blurb: s.description,
      colour: SUBJECT_COLOR_VAR[s.color] ?? SUBJECT_COLOR_VAR.accent,
      read,
      total: lessons.length || s.lessonCount,
      unit: 'lessons',
      next: nx ? { title: nx.title, to: `/gate/notes/${s.id}/${nx.id}` } : null,
      home,
    }
  }, [tree.data, progress, s, home])
  return <BookCard b={book} />
}

export function Bookshelf({ items, homeOf }: { items: Record<string, ItemState>; homeOf: (notesId: string) => string }) {
  const subjects = useNotesSubjects()
  const dsa = useMemo<Book>(() => {
    const ready = DSA_TOPICS.filter((t) => t.load)
    const total = ready.reduce((n, t) => n + (t.pages ?? 0), 0)
    const readOf = (id: string) => Object.entries(items).filter(([k, v]) => k.startsWith(`page:${id}/`) && isDone(v)).length
    const read = ready.reduce((n, t) => n + readOf(t.id), 0)
    const nx = ready.find((t) => readOf(t.id) < (t.pages ?? 0)) ?? null
    return {
      id: 'dsa',
      title: 'Data Structures & Algorithms',
      blurb: 'The flagship course. Every idea animated, every problem in five languages.',
      colour: 'var(--color-accent-brand)',
      read,
      total,
      unit: 'pages',
      next: nx ? { title: nx.title, to: `/learn/dsa/${nx.id}` } : null,
      home: '/learn/dsa',
    }
  }, [items])
  // Hidden only means not on the GATE notes index; written lessons belong on the shelf.
  const notes = (subjects.data ?? []).filter((s) => s.lessonCount > 0)

  return (
    <Reveal aria-labelledby="today-shelf">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ed-label ed-muted m-0">Your bookshelf</p>
          <h2 id="today-shelf" className="ed-h2 mt-3 mb-0">
            Lessons ready to read
          </h2>
        </div>
        <Link to="/learn" className="ed-link ed-ui">
          Every subject
        </Link>
      </div>
      <ul className="shelf mt-8 mb-0 list-none p-0">
        <BookCard b={dsa} />
        {notes.map((s) => (
          <NotesBookCard key={s.id} s={s} home={homeOf(s.id)} />
        ))}
      </ul>
    </Reveal>
  )
}
