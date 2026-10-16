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
import type { ChapterSummary, LessonPayload } from '@/gate/notes/types'

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
  const outlineRef = useRef<HTMLDetailsElement>(null)
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

  const meta = (
    <>
      Chapter {chapter.n} · {chapter.title} · {fmtMinutes(lesson.est_minutes)} · {DIFFICULTY_LABEL[lesson.difficulty]}
    </>
  )

  const actions = (
    <>
      <button
        type="button"
        className={cn('notes-tool', p.bookmarked && 'is-on')}
        aria-pressed={p.bookmarked}
        onClick={() => setBookmarked(subject.id, lesson.id, !p.bookmarked)}
      >
        <Icon name="bookmark" className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{p.bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
        <span className="sr-only sm:hidden">Bookmark</span>
      </button>
      <button type="button" className={cn('notes-tool', prefs.cleanFont && 'is-on')} aria-pressed={prefs.cleanFont} onClick={() => setPrefs({ cleanFont: !prefs.cleanFont })}>
        <Icon name="type" className="size-4" aria-hidden="true" />
        Clean font
      </button>
      <button
        type="button"
        className={cn('notes-tool notes-tool--main', p.completed && 'is-on')}
        aria-pressed={p.completed}
        onClick={() => setCompleted(subject.id, lesson.id, !p.completed)}
      >
        <Icon name={p.completed ? 'check-circle' : 'check'} className="size-4" aria-hidden="true" />
        {p.completed ? 'Completed' : 'Mark complete'}
      </button>
    </>
  )

  const outline = lesson.outline.filter((h) => h.level <= 3)

  return (
    <GateShell title={lesson.title} actions={actions}>
      <NotesRoot color={subject.color}>
        <div className="notes-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <div className={cn('notes-layout', prefs.treeHidden && 'is-tree-hidden')}>
          <nav className="notes-tree" aria-label={`Lessons in ${subject.title}`}>
            <div className="notes-tree-head">
              <Link to={NOTES_ROUTES.subject(subject.id)} className="notes-tree-subject">
                <Icon name="learn" className="size-4" aria-hidden="true" />
                {subject.title}
              </Link>
              <button type="button" className="notes-icon-btn" onClick={() => setPrefs({ treeHidden: true })} aria-label="Hide the lesson list">
                <Icon name="eye-off" className="size-4" aria-hidden="true" />
              </button>
            </div>
            {chapters ? <LessonTree subject={subject.id} chapters={chapters} current={lesson.id} progress={progressMap} /> : <LoadingBlock rows={3} />}
          </nav>

          <div className="notes-main">
            <button type="button" className="notes-icon-btn notes-show-tree" onClick={() => setPrefs({ treeHidden: false })}>
              <Icon name="list" className="size-4" aria-hidden="true" /> Lessons
            </button>
            <details className="notes-tree-mobile" open={treeOpen} onToggle={(e) => setTreeOpen((e.target as HTMLDetailsElement).open)}>
              <summary>
                <Icon name="list" className="size-4" aria-hidden="true" /> Lessons in {subject.title}
              </summary>
              {chapters && <LessonTree subject={subject.id} chapters={chapters} current={lesson.id} progress={progressMap} onNavigate={() => setTreeOpen(false)} />}
            </details>

            <article ref={article} className="notes-paper" aria-label={lesson.title}>
              <div className="notes-prose">
                <Crumbs
                  items={[
                    { label: 'Notes', to: NOTES_ROUTES.all },
                    { label: subject.title, to: NOTES_ROUTES.subject(subject.id) },
                    { label: chapter.title },
                  ]}
                />
                <p className="notes-meta">{meta}</p>
                {lesson.prerequisites.length > 0 && (
                  <p className="notes-prereq">
                    <Icon name="route" className="size-4" aria-hidden="true" /> Before this:{' '}
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

                {outline.length > 1 && (
                  <nav className="notes-outline" aria-label="On this page">
                    <details ref={outlineRef}>
                      <summary className="notes-icon-btn" title="On this page">
                        <Icon name="list" className="size-4" aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">On this page</span>
                      </summary>
                      <div className="notes-outline-panel">
                        <p>On this page</p>
                        <ol>
                          {outline.map((h) => (
                            <li key={h.id} className={cn(h.level === 3 && 'is-sub')}>
                              <a href={`#${domId(h.id)}`} onClick={() => outlineRef.current?.removeAttribute('open')}>
                                {h.text}
                              </a>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </details>
                  </nav>
                )}

                <NotesContextProvider value={ctx}>
                  <Nodes nodes={lesson.body} />
                </NotesContextProvider>

                <div className="notes-done">
                  <button
                    type="button"
                    className={cn('notes-tool notes-tool--main notes-done-btn', p.completed && 'is-on')}
                    aria-pressed={p.completed}
                    onClick={() => setCompleted(subject.id, lesson.id, !p.completed)}
                  >
                    <Icon name={p.completed ? 'check-circle' : 'check'} className="size-4" aria-hidden="true" />
                    {p.completed ? 'Completed — nice work' : 'Mark this lesson complete'}
                  </button>
                </div>
              </div>
            </article>

            <nav className="notes-pager" aria-label="Previous and next lesson">
              {prev ? (
                <Link to={NOTES_ROUTES.lesson(subject.id, prev.id)} className="notes-pager-link" rel="prev">
                  <span className="notes-pager-dir">
                    <span className="inline-flex" style={{ transform: 'scaleX(-1)' }} aria-hidden="true"><Icon name="play" className="size-3" /></span> Previous
                  </span>
                  <span className="notes-pager-title">{prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link to={NOTES_ROUTES.lesson(subject.id, next.id)} className="notes-pager-link is-next" rel="next">
                  <span className="notes-pager-dir">
                    Next <Icon name="play" className="size-3" aria-hidden="true" />
                  </span>
                  <span className="notes-pager-title">{next.title}</span>
                </Link>
              ) : (
                <Link to={NOTES_ROUTES.subject(subject.id)} className="notes-pager-link is-next">
                  <span className="notes-pager-dir">
                    Done <Icon name="check" className="size-3" aria-hidden="true" />
                  </span>
                  <span className="notes-pager-title">Back to {subject.title}</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </NotesRoot>
    </GateShell>
  )
}
