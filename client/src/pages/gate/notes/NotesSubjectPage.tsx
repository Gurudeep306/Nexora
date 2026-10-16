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
import { Crumbs, LessonStatus, NotesRoot, ProgressRing, SubjectIcon } from '@/gate/notes/ui'
import type { SubjectTree } from '@/gate/notes/types'

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

  const action = next && (
    <Link to={NOTES_ROUTES.lesson(subject.id, next.id)} className="notes-tool notes-tool--main">
      <Icon name="play" className="size-4" aria-hidden="true" />
      <span>
        {verb}
        <span className="hidden sm:inline">: {next.title}</span>
      </span>
    </Link>
  )

  return (
    <GateShell title={subject.title} subtitle={subject.description} actions={action}>
      <NotesRoot color={subject.color}>
        <Crumbs items={[{ label: 'Notes', to: NOTES_ROUTES.all }, { label: subject.title }]} />
        <section className="notes-overview" aria-label="Overview">
          <SubjectIcon icon={subject.icon} />
          <dl>
            <div>
              <dt>Chapters</dt>
              <dd>{chapters.length}</dd>
            </div>
            <div>
              <dt>Lessons</dt>
              <dd>{lessons.length}</dd>
            </div>
            <div>
              <dt>Total time</dt>
              <dd>{fmtMinutes(subject.est_minutes)}</dd>
            </div>
            <div>
              <dt>Left to read</dt>
              <dd>{fmtMinutes(minutesLeft)}</dd>
            </div>
          </dl>
          <ProgressRing done={done} total={lessons.length} size={64} label={`${done} of ${lessons.length} lessons completed`} />
        </section>
        {(subject.coverage?.total ?? 0) > 0 && (
          <section className="notes-coverage" aria-label="PYQ coverage">
            <div className="notes-coverage-head">
              <Icon name="gate" className="size-4" aria-hidden="true" />
              <strong>
                {subject.coverage.covered}/{subject.coverage.total} PYQs covered
              </strong>
              <span>every past question in this subject, linked to the lesson block that teaches it</span>
            </div>
            <span
              className="notes-coverage-bar"
              role="progressbar"
              aria-label="PYQs covered by the notes"
              aria-valuemin={0}
              aria-valuemax={subject.coverage.total}
              aria-valuenow={subject.coverage.covered}
            >
              <span style={{ width: `${(subject.coverage.covered / subject.coverage.total) * 100}%` }} />
            </span>
          </section>
        )}

        <ol className="notes-chapters">
          {chapters.map((ch) => {
            const chDone = ch.lessons.filter((l) => progressOf(progress, subject.id, l.id).completed).length
            const mins = ch.lessons.reduce((n, l) => n + l.est_minutes, 0)
            return (
              <li key={ch.id} className="notes-chapter">
                <header>
                  <ProgressRing done={chDone} total={ch.lessons.length} label={`Chapter ${ch.n}: ${chDone} of ${ch.lessons.length} lessons done`} />
                  <div className="min-w-0 flex-1">
                    <h2>
                      <span className="notes-chapter-n">Chapter {ch.n}</span>
                      {ch.title}
                    </h2>
                    {ch.summary && <p>{ch.summary}</p>}
                  </div>
                  <span className="notes-chapter-time">{fmtMinutes(mins)}</span>
                </header>
                <ol className="notes-lessons">
                  {ch.lessons.map((l) => {
                    const p = progressOf(progress, subject.id, l.id)
                    return (
                      <li key={l.id}>
                        <Link to={NOTES_ROUTES.lesson(subject.id, l.id)} className="notes-lesson-row">
                          <LessonStatus p={p} />
                          <span className="notes-lesson-title">{l.title}</span>
                          <span className="notes-lesson-meta">
                            {DIFFICULTY_LABEL[l.difficulty]} · {fmtMinutes(l.est_minutes)}
                            {l.pyqCount > 0 && <> · {l.pyqCount} PYQ</>}
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
      </NotesRoot>
    </GateShell>
  )
}
