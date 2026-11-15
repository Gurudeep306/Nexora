/*
  The lesson reader: /gate/notes/:subject/:lesson

    ┌ lesson tree ┬ paper: crumbs · meta ……………………………… [≡ On this page] ┐
    │ (sticky,    │ lesson body — every block spans the full column;     │
    │ can hide)   │ running text keeps a ~72ch measure                   │
    │             │ mark complete · prev / next                          │
    └─────────────┴──────────────────────────────────────────────────────┘

  The outline is an icon that opens a small panel; asides sit inline.
  Below lg the tree becomes a "Lessons" disclosure. Study state:
  mark complete, bookmark, reading position (src/gate/notes/progress.ts).

  Extension points for later steps: the toolbar (Explain simpler, revision
  mode, Depth dial), block anchors (data-block-id) for highlights and margin
  notes, and NotesContext for per-lesson features.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Icon } from '@/components/icon/Icon'
import { EmptyState, LoadingBlock } from '@/components/ui'
import { cn } from '@/lib/utils'
import { GateShell } from '@/gate/shell/GateShell'
import { DIFFICULTY_LABEL, NOTES_ROUTES, fmtMinutes, useLesson, useSubjectTree } from '@/gate/notes/api'
import { flushScroll, progressOf, reportScroll, setBookmarked, setCompleted, useNotesProgress } from '@/gate/notes/progress'
import { useNotesPrefs } from '@/gate/notes/prefs'
import { Crumbs, LessonTree, NotesRoot } from '@/gate/notes/ui'
import { NotesContextProvider, Nodes, type NotesContext } from '@/gate/notes/render/NotesContent'
import { domId } from '@/gate/notes/render/ids'
import type { ChapterSummary, Lesson, LessonPayload, PyqLink } from '@/gate/notes/types'
import { gateApi } from '@/gate/api'
import { questionLink } from '@/gate/shell/links'
import { useScrollSpy, type OutlineItem } from '@/components/reader/outline'
import { Outline } from '@/components/reader/Outline'
import { EndOfLesson } from '@/components/reader/EndOfLesson'

const BLOCK_LABEL: Record<string, string> = {
  intuition: 'Intuition',
  definition: 'Definition',
  theorem: 'Theorem',
  proof: 'Proof',
  derivation: 'Derivation',
  example: 'Example',
  check: 'Check',
  trick: 'Trick',
  trap: 'Trap',
  table: 'Table',
  summary: 'Summary',
  note: 'Note',
  aside: 'Aside',
}

/** Readable names for every block and heading a PYQ can point at. */
function conceptTitles(lesson: Lesson): Record<string, string> {
  const out: Record<string, string> = {}
  for (const h of lesson.outline) out[h.id] = h.text
  for (const b of lesson.blocks) {
    const kind = BLOCK_LABEL[b.name] ?? b.name
    out[b.id] = b.title ? `${kind}: ${b.title}` : kind
  }
  return out
}

/** GATE notes subject id → its Nexus subject (content/nexus/_hubs.json), where they differ. */
const NEXUS_OF: Record<string, string> = { db: 'dbms', pds: 'c' }

const DIFF = ['', 'Easy', 'Easy-medium', 'Medium', 'Hard', 'Very hard']

/* "PYQs from this lesson": every past question this lesson teaches, with its year, marks and difficulty. */
function LessonPyqs({ links, concepts }: { links: PyqLink[]; concepts: Record<string, string> }) {
  const [diff, setDiff] = useState<Record<string, number | null>>({})
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    let alive = true
    for (const l of links)
      gateApi
        .questionStats(l.id)
        .then((r) => alive && setDiff((d) => ({ ...d, [l.id]: r.stats.difficulty })))
        .catch(() => {})
    return () => {
      alive = false
    }
  }, [open, links])
  return (
    <details className="notes-pyqs" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>
        <Icon name="gate" className="size-4" aria-hidden="true" />
        <span>
          PYQs from this lesson <strong>{links.length}</strong>
        </span>
      </summary>
      <ul>
        {links.map((l) => {
          const href = l.embedded ? `#${domId(`pyq-${l.id}`)}` : questionLink(l.id)
          const meta = (
            <>
              <span className="notes-pyq-year">GATE {l.year}</span>
              <span>{l.marks ? `${l.marks} mark${l.marks === 1 ? '' : 's'}` : '—'}</span>
              <span>{l.type}</span>
              <span>{diff[l.id] ? DIFF[diff[l.id]!] : open && !(l.id in diff) ? '…' : 'Difficulty n/a'}</span>
            </>
          )
          return (
            <li key={l.id}>
              {l.embedded ? (
                <a href={href} className="notes-pyq-row">
                  {meta}
                  <span className="notes-pyq-where">in this lesson</span>
                </a>
              ) : (
                <Link to={href} className="notes-pyq-row">
                  {meta}
                  <span className="notes-pyq-where">open in practice</span>
                </Link>
              )}
              {l.tests.length > 0 && <span className="notes-pyq-tests">Tests: {l.tests.map((t) => concepts[t] ?? t).join(' · ')}</span>}
            </li>
          )
        })}
      </ul>
    </details>
  )
}

export default function NotesLessonPage() {
  const { subject = '', lesson = '' } = useParams()
  const r = useLesson(subject, lesson)
  const tree = useSubjectTree(subject)
  const data = r.data && r.data.lesson.id === lesson ? r.data : null

  if (r.error && !data)
    return (
      <GateShell title="Notes">
        <EmptyState
          icon={<Icon name="book" className="size-6" />}
          title={/404|unknown/i.test(r.error) ? 'Lesson not found' : "Couldn't load this lesson"}
          description={/404|unknown/i.test(r.error) ? 'It may have moved. Pick it from the subject page.' : r.error}
          action={
            <Link to={NOTES_ROUTES.all} className="btn-secondary">
              All subjects
            </Link>
          }
        />
      </GateShell>
    )
  if (!data)
    return (
      <GateShell title="Loading lesson…">
        <LoadingBlock rows={8} />
      </GateShell>
    )
  return <Reader data={data} chapters={tree.data?.chapters ?? null} />
}

function Reader({ data, chapters }: { data: LessonPayload; chapters: ChapterSummary[] | null }) {
  const { lesson, subject, chapter, prev, next } = data
  const progressMap = useNotesProgress(subject.id)
  const p = progressOf(progressMap, subject.id, lesson.id)
  const [prefs, setPrefs] = useNotesPrefs()
  const [treeOpen, setTreeOpen] = useState(false)
  const article = useRef<HTMLElement>(null)
  const [pct, setPct] = useState(0)
  const { hash } = useLocation()
  const [resumeFrom] = useState(() => (p.completed ? 0 : p.scrollPct))

  const ctx = useMemo<NotesContext>(
    () => ({
      subject,
      lessonId: lesson.id,
      practice: data.practice,
      viz: data.viz,
      pyqTopics: lesson.pyq_topics,
      cleanLines: prefs.cleanLines,
      setCleanLines: (on) => setPrefs({ cleanLines: on }),
      concepts: conceptTitles(lesson),
    }),
    [subject, lesson, data.practice, data.viz, prefs.cleanLines, setPrefs],
  )

  // Reading position → progress bar + saved position.
  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      const el = article.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const span = rect.height - window.innerHeight
      const v = span <= 0 ? 100 : Math.max(0, Math.min(100, (-rect.top / span) * 100))
      setPct(v)
      reportScroll(subject.id, lesson.id, v)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
      flushScroll(`${subject.id}/${lesson.id}`)
    }
  }, [subject.id, lesson.id])

  // #anchor links (from other lessons or the outline).
  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    const el = document.getElementById(id.startsWith('n-') ? id : domId(id))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
  }, [hash, lesson.id])

  const resume = () => {
    const el = article.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + ((el.offsetHeight - window.innerHeight) * resumeFrom) / 100, behavior: 'smooth' })
  }

  const outline = lesson.outline.filter((h) => h.level <= 3)
  const active = useScrollSpy(outline.map((h) => domId(h.id)))
  const outlineItems: OutlineItem[] = outline.map((h) => ({ id: domId(h.id), text: h.text, level: h.level === 3 ? 3 : 2 }))
  const dots = (chapter && chapters ? chapters.find((c) => c.id === chapter.id)?.lessons ?? [] : []).map((l) => ({
    to: NOTES_ROUTES.lesson(subject.id, l.id),
    title: l.title,
    done: progressOf(progressMap, subject.id, l.id).completed,
    current: l.id === lesson.id,
  }))
  const pyqCount = lesson.pyqLinks.length

  const completeBtn = (big?: boolean) => (
    <button
      type="button"
      className={cn('nr-btn', !p.completed && 'nr-btn--main', p.completed && 'is-done', big && 'nr-btn--big')}
      aria-pressed={p.completed}
      onClick={() => setCompleted(subject.id, lesson.id, !p.completed)}
    >
      <Icon name={p.completed ? 'check-circle' : 'check'} className="size-4" aria-hidden="true" />
      {p.completed ? 'Completed' : big ? 'Mark this lesson complete' : 'Mark complete'}
    </button>
  )

  return (
    <GateShell title={lesson.title} bare>
      <NotesRoot color={subject.color}>
        <div className="notes-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <div className={cn('nr-layout', prefs.treeHidden && 'is-tree-hidden')}>
          {/* Left: the subject's lessons */}
          <nav className="nr-tree" aria-label={`Lessons in ${subject.title}`}>
            {prefs.treeHidden ? (
              <MiniRail subject={subject.id} chapters={chapters} current={lesson.id} progress={progressMap} onExpand={() => setPrefs({ treeHidden: false })} />
            ) : (
              <>
                <div className="nr-tree-head">
                  <Link to={NOTES_ROUTES.subject(subject.id)} className="nr-tree-subject">
                    {subject.title}
                  </Link>
                  <button type="button" className="nr-icon" onClick={() => setPrefs({ treeHidden: true })} aria-label="Collapse the lesson list" title="Collapse">
                    <Icon name="list" className="size-4" aria-hidden="true" />
                  </button>
                </div>
                {chapters ? <LessonTree subject={subject.id} chapters={chapters} current={lesson.id} progress={progressMap} /> : <LoadingBlock rows={3} />}
              </>
            )}
          </nav>

          {/* Centre: the lesson */}
          <div className="nr-main">
            <div className="nr-bar">
              <Crumbs
                items={[
                  { label: 'Notes', to: NOTES_ROUTES.all },
                  { label: subject.title, to: NOTES_ROUTES.subject(subject.id) },
                  { label: `Chapter ${chapter.n}` },
                ]}
              />
              <span className="nr-bar-links">
                <Link to={`/learn/${NEXUS_OF[subject.id] ?? subject.id}`} className="nr-bar-link">
                  <Icon name="nexus" className="size-3.5" aria-hidden="true" /> Skill tree
                </Link>
                <Link to={`/gate/practice?subject=${encodeURIComponent(subject.id)}`} className="nr-bar-link">
                  <Icon name="practice" className="size-3.5" aria-hidden="true" /> Practice
                </Link>
              </span>
            </div>
            <details className="notes-tree-mobile" open={treeOpen} onToggle={(e) => setTreeOpen((e.target as HTMLDetailsElement).open)}>
              <summary>
                <Icon name="list" className="size-4" aria-hidden="true" /> Lessons in {subject.title}
              </summary>
              {chapters && <LessonTree subject={subject.id} chapters={chapters} current={lesson.id} progress={progressMap} onNavigate={() => setTreeOpen(false)} />}
            </details>

            <header className="nr-head">
              <p className="nr-kicker">
                Chapter {chapter.n} · {chapter.title}
              </p>
              <h1 className="nr-title">{lesson.title}</h1>
              <div className="nr-meta">
                <span>{fmtMinutes(lesson.est_minutes)}</span>
                <span>{DIFFICULTY_LABEL[lesson.difficulty]}</span>
                {pyqCount > 0 && <span>{pyqCount} past questions</span>}
                <span className="nr-meta-actions">
                  <button
                    type="button"
                    className={cn('nr-icon', p.bookmarked && 'is-on')}
                    aria-pressed={p.bookmarked}
                    aria-label={p.bookmarked ? 'Remove bookmark' : 'Bookmark this lesson'}
                    title={p.bookmarked ? 'Bookmarked' : 'Bookmark'}
                    onClick={() => setBookmarked(subject.id, lesson.id, !p.bookmarked)}
                  >
                    <Icon name="bookmark" className="size-4" aria-hidden="true" />
                  </button>
                  {completeBtn()}
                </span>
              </div>
              {lesson.prerequisites.length > 0 && (
                <p className="nr-prereq">
                  Before this:{' '}
                  {lesson.prerequisites.map((pr, i) => (
                    <span key={pr.id}>
                      {i > 0 && ', '}
                      <Link to={NOTES_ROUTES.lesson(pr.subject, pr.id)}>{pr.title}</Link>
                    </span>
                  ))}
                </p>
              )}
              {resumeFrom > 3 && resumeFrom < 97 && (
                <button type="button" className="notes-resume" onClick={resume}>
                  <Icon name="play" className="size-3.5" aria-hidden="true" /> Continue where you left off ({resumeFrom}%)
                </button>
              )}
            </header>

            <article ref={article} className="notes-paper" aria-label={lesson.title}>
              <div className="notes-prose">
                <NotesContextProvider value={ctx}>
                  <Nodes nodes={lesson.body} />
                </NotesContextProvider>
              </div>
            </article>

            {pyqCount > 0 && (
              <section className="nr-pyqs" aria-label="Past questions from this lesson">
                <LessonPyqs links={lesson.pyqLinks} concepts={ctx.concepts ?? {}} />
              </section>
            )}

            <div className="nr-done">{completeBtn(true)}</div>

            <EndOfLesson
              label={`Chapter ${chapter.n}`}
              next={
                next
                  ? { to: NOTES_ROUTES.lesson(subject.id, next.id), title: next.title }
                  : { to: NOTES_ROUTES.subject(subject.id), title: `Back to ${subject.title}`, kicker: 'Finished' }
              }
              prev={prev ? { to: NOTES_ROUTES.lesson(subject.id, prev.id), title: prev.title } : null}
              dots={dots}
            />
          </div>

          {/* Right: on this page */}
          <aside className="nr-toc" aria-label="On this page">
            <Outline items={outlineItems} active={active} />
            <div className="nr-toc-progress">
              <span className="nr-toc-bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${pct / 100})` }} />
              </span>
              <span>{Math.round(pct)}% read</span>
            </div>
            {pyqCount > 0 && (
              <a href="#lesson-pyqs" className="nr-toc-link" onClick={(e) => {
                e.preventDefault()
                document.querySelector('.nr-pyqs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                const d = document.querySelector<HTMLDetailsElement>('.nr-pyqs details')
                if (d) d.open = true
              }}>
                <Icon name="gate" className="size-3.5" aria-hidden="true" /> {pyqCount} past questions
              </a>
            )}
          </aside>
        </div>
      </NotesRoot>
    </GateShell>
  )
}

/**
 * The lesson list, collapsed: one ring per chapter (filled by how much of it
 * is done) and, under the current chapter, a dot per lesson. Every mark is a
 * link with its title on hover, so the subject stays one click away.
 */
function MiniRail({
  subject,
  chapters,
  current,
  progress,
  onExpand,
}: {
  subject: string
  chapters: ChapterSummary[] | null
  current: string
  progress: ReturnType<typeof useNotesProgress>
  onExpand: () => void
}) {
  return (
    <div className="nr-mini">
      <button type="button" className="nr-icon" onClick={onExpand} aria-label="Show the lesson list" title="Show lessons">
        <Icon name="list" className="size-4" aria-hidden="true" />
      </button>
      <ol>
        {(chapters ?? []).map((ch) => {
          const done = ch.lessons.filter((l) => progressOf(progress, subject, l.id).completed).length
          const here = ch.lessons.some((l) => l.id === current)
          const frac = ch.lessons.length ? done / ch.lessons.length : 0
          return (
            <li key={ch.id}>
              <Link
                to={NOTES_ROUTES.lesson(subject, (ch.lessons.find((l) => !progressOf(progress, subject, l.id).completed) ?? ch.lessons[0]).id)}
                className={cn('nr-mini-ch', here && 'is-here')}
                title={`Chapter ${ch.n}: ${ch.title} (${done}/${ch.lessons.length} done)`}
                aria-label={`Chapter ${ch.n}: ${ch.title}, ${done} of ${ch.lessons.length} done`}
                style={{ ['--p' as string]: `${Math.round(frac * 100)}%` }}
              >
                <span>{ch.n}</span>
              </Link>
              {here && (
                <span className="nr-mini-lessons">
                  {ch.lessons.map((l) => (
                    <Link
                      key={l.id}
                      to={NOTES_ROUTES.lesson(subject, l.id)}
                      className={cn('nr-mini-dot', l.id === current && 'is-current', progressOf(progress, subject, l.id).completed && 'is-done')}
                      title={l.title}
                      aria-label={l.title}
                      aria-current={l.id === current ? 'page' : undefined}
                    />
                  ))}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
