/*
  Subject home: /gate/notes/:subject — overview, Start / Continue, and every
  chapter with a progress ring and its lessons.
*/
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '@/components/icon/Icon'
import { EmptyState, LoadingBlock } from '@/components/ui'
import { GateShell } from '@/gate/shell/GateShell'
import { DIFFICULTY_LABEL, NOTES_ROUTES, fmtMinutes, useSubjectTree } from '@/gate/notes/api'
import { progressOf, useNotesProgress } from '@/gate/notes/progress'
import { Crumbs, LessonStatus, NotesRoot, ProgressRing } from '@/gate/notes/ui'
import type { SubjectTree } from '@/gate/notes/types'
import { cn } from '@/lib/utils'
import { useNexusStructure } from '@/lib/lessonSearch'
import '@/gate/notes/notes-home.css'

/** GATE notes subject id → its Nexus subject, where they differ (content/nexus/_hubs.json). */
const NEXUS_OF: Record<string, string> = { db: 'dbms', pds: 'c' }

export default function NotesSubjectPage() {
  const { subject = '' } = useParams()
  const r = useSubjectTree(subject)
  const data = r.data && r.data.subject.id === subject ? r.data : null
  if (r.error && !data)
    return (
      <GateShell title="Notes">
        <EmptyState
          icon={<Icon name="book" className="size-6" />}
          title="Subject not found"
          description="There are no notes for this subject yet."
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
      <GateShell title="Notes">
        <LoadingBlock rows={6} />
      </GateShell>
    )
  return <SubjectHome data={data} />
}

function SubjectHome({ data }: { data: SubjectTree }) {
  const { subject, chapters } = data
  const progress = useNotesProgress(subject.id)
  const lessons = useMemo(() => chapters.flatMap((c) => c.lessons), [chapters])
  const done = lessons.filter((l) => progressOf(progress, subject.id, l.id).completed).length
  const minutesLeft = lessons.filter((l) => !progressOf(progress, subject.id, l.id).completed).reduce((n, l) => n + l.est_minutes, 0)

  // Continue: the most recently read unfinished lesson, else the first unfinished one.
  const next = useMemo(() => {
    const started = lessons
      .map((l) => ({ l, p: progressOf(progress, subject.id, l.id) }))
      .filter((x) => !x.p.completed && x.p.scrollPct > 2)
      .sort((a, b) => b.p.updatedAt - a.p.updatedAt)[0]?.l
    return started ?? lessons.find((l) => !progressOf(progress, subject.id, l.id).completed) ?? lessons[0]
  }, [lessons, progress, subject.id])
  const verb = done === 0 && !lessons.some((l) => progressOf(progress, subject.id, l.id).scrollPct > 2) ? 'Start' : done === lessons.length ? 'Read again' : 'Continue'

  // Only subjects that have a Nexus subject get a skill tree link (not the demo).
  const nexusId = NEXUS_OF[subject.id] ?? subject.id
  const hasTree = !!useNexusStructure()?.clusters.some((c) => c.id === nexusId)

  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0
  const cov = subject.coverage ?? { total: 0, covered: 0 }

  return (
    <GateShell title={subject.title} bare>
      <NotesRoot color={subject.color}>
        {/* Header: the subject, your place in it, and the three ways in */}
        <header className="nh-hero">
          <div className="min-w-0">
            <Crumbs items={[{ label: 'Notes', to: NOTES_ROUTES.all }, { label: subject.title }]} />
            <h1 className="nh-title">{subject.title}</h1>
            {subject.description && <p className="nh-desc">{subject.description}</p>}
            <p className="nh-stats">
              <span>
                {chapters.length} chapters
              </span>
              <span>{lessons.length} lessons</span>
              <span>{fmtMinutes(subject.est_minutes)}</span>
              {cov.total > 0 && (
                <span>
                  {cov.covered}/{cov.total} past questions linked
                </span>
              )}
            </p>
            <div className="nh-actions">
              {next && (
                <Link to={NOTES_ROUTES.lesson(subject.id, next.id)} className="nh-btn nh-btn--main">
                  <Icon name="play" className="size-4" aria-hidden="true" />
                  {verb}
                </Link>
              )}
              {hasTree && (
                <Link to={`/learn/${nexusId}?view=tree`} className="nh-btn">
                  <Icon name="nexus" className="size-4" aria-hidden="true" />
                  Skill tree
                </Link>
              )}
              <Link to={`/gate/practice?subject=${encodeURIComponent(subject.id)}`} className="nh-btn">
                <Icon name="practice" className="size-4" aria-hidden="true" />
                Practice questions
              </Link>
            </div>
          </div>

          <aside className="nh-progress card" aria-label="Your progress">
            <div className="flex items-center gap-4">
              <ProgressRing done={done} total={lessons.length} size={72} label={`${done} of ${lessons.length} lessons completed`} />
              <div className="min-w-0">
                <p className="m-0 text-[13px] text-text-muted">Your progress</p>
                <p className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-text-primary tabular-nums">{pct}%</p>
                <p className="m-0 text-[12.5px] text-text-muted">{fmtMinutes(minutesLeft)} left to read</p>
              </div>
            </div>
            {next && (
              <Link to={NOTES_ROUTES.lesson(subject.id, next.id)} className="nh-next">
                <span className="text-[12px] text-text-muted">{verb === 'Start' ? 'Start with' : verb === 'Continue' ? 'Up next' : 'Read again'}</span>
                <span className="nh-next-title">{next.title}</span>
              </Link>
            )}
          </aside>
        </header>

        {/* Body: a chapter index beside the chapters, lessons across the full width */}
        <div className="nh-body">
          <nav className="nh-index" aria-label="Chapters">
            <p className="nh-index-head">Chapters</p>
            <ol>
              {chapters.map((ch) => {
                const chDone = ch.lessons.filter((l) => progressOf(progress, subject.id, l.id).completed).length
                return (
                  <li key={ch.id}>
                    <a href={`#ch-${ch.id}`} className="nh-index-link">
                      <span className="nh-index-n">
                        <span className="nh-n-arabic">{ch.n}</span>
                        <span className="nh-n-roman" aria-hidden="true">
                          {roman(ch.n)}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 truncate">{ch.title}</span>
                      <span className="nh-index-count">{ch.lessons.length ? `${chDone}/${ch.lessons.length}` : 'soon'}</span>
                    </a>
                  </li>
                )
              })}
            </ol>
          </nav>

          <ol className="nh-chapters">
            {chapters.map((ch) => {
              const chDone = ch.lessons.filter((l) => progressOf(progress, subject.id, l.id).completed).length
              const mins = ch.lessons.reduce((n, l) => n + l.est_minutes, 0)
              return (
                <li key={ch.id} id={`ch-${ch.id}`} className={cn('nh-chapter', !ch.lessons.length && 'is-soon')}>
                  <header className="nh-chapter-head">
                    <ProgressRing done={chDone} total={ch.lessons.length} label={ch.lessons.length ? `Chapter ${ch.n}: ${chDone} of ${ch.lessons.length} lessons done` : `Chapter ${ch.n}: being written`} />
                    <span className="nh-chapter-roman ed-serif-numeral" aria-hidden="true">
                      {roman(ch.n)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="nh-chapter-meta m-0 text-[12.5px] text-text-muted">
                        {ch.lessons.length ? (
                          <>
                            Chapter {ch.n} · {ch.lessons.length} {ch.lessons.length === 1 ? 'lesson' : 'lessons'} · {fmtMinutes(mins)}
                            <span className="nh-chapter-done"> · {chDone} of {ch.lessons.length} done</span>
                          </>
                        ) : (
                          <>Chapter {ch.n} · being written</>
                        )}
                      </p>
                      <h2 className="nh-chapter-title">{ch.title}</h2>
                      {ch.summary && <p className="nh-chapter-summary">{ch.summary}</p>}
                      {!ch.lessons.length && <p className="nh-chapter-soon">These lessons are being written and will appear here as each one is checked.</p>}
                    </div>
                  </header>
                  <ol className="nh-lessons">
                    {ch.lessons.map((l, i) => {
                      const p = progressOf(progress, subject.id, l.id)
                      return (
                        <li key={l.id}>
                          <Link to={NOTES_ROUTES.lesson(subject.id, l.id)} className={cn('nh-lesson', next?.id === l.id && 'is-next')}>
                            <LessonStatus p={p} />
                            <span className="min-w-0 flex-1">
                              <span className="nh-lesson-title">
                                <span className="nh-lesson-n">
                                  {ch.n}.{i + 1}
                                </span>
                                {l.title}
                              </span>
                              <span className="nh-lesson-meta">
                                {DIFFICULTY_LABEL[l.difficulty]} · {fmtMinutes(l.est_minutes)}
                                {l.pyqCount > 0 && <> · {l.pyqCount} PYQs</>}
                              </span>
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ol>
                </li>
              )
            })}
          </ol>
        </div>
      </NotesRoot>
    </GateShell>
  )
}

const ROMAN: [number, string][] = [
  [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
]
/** Chapter numbers as lower-case roman numerals (the journal's chapter style). */
function roman(n: number): string {
  let out = ''
  let left = n
  for (const [v, r] of ROMAN) {
    while (left >= v) {
      out += r
      left -= v
    }
  }
  return out || String(n)
}
