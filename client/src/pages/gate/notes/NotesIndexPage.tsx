/*
  All subjects: /gate/notes — a card per subject with progress, plus search
  across every lesson.
*/
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icon/Icon'
import { EmptyState, LoadingBlock, SearchInput } from '@/components/ui'
import { GateShell } from '@/gate/shell/GateShell'
import { NOTES_ROUTES, fmtMinutes, notesApi, subjectStyle, useNotesSubjects } from '@/gate/notes/api'
import { useNotesProgress } from '@/gate/notes/progress'
import { NotesRoot, SubjectIcon } from '@/gate/notes/ui'
import type { SearchResult } from '@/gate/notes/types'

export default function NotesIndexPage() {
  const subjects = useNotesSubjects()
  const progress = useNotesProgress('*')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)

  const term = q.trim()
  useEffect(() => {
    if (term.length < 2) return
    let alive = true
    const t = window.setTimeout(() => {
      notesApi
        .search(term)
        .then((r) => alive && setResults(r))
        .catch(() => alive && setResults([]))
    }, 220)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [term])
  const shown = term.length >= 2 ? results : null

  const list = subjects.data ?? []
  return (
    <GateShell title="Notes" subtitle="Course notes for every GATE subject: short lessons with worked maths, diagrams that step, and real PYQs inline.">
      <NotesRoot>
        {list.length > 0 && (
          <div className="notes-search">
            <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the notes…" aria-label="Search the notes" />
          </div>
        )}

        {shown && (
          <section className="notes-results" aria-label="Search results" aria-live="polite">
            {shown.length === 0 ? (
              <p className="notes-empty">No lessons match “{q.trim()}”.</p>
            ) : (
              <ol>
                {shown.map((r) => (
                  <li key={`${r.subject}/${r.lesson}`}>
                    <Link to={NOTES_ROUTES.lesson(r.subject, r.lesson)}>
                      <span className="notes-result-title">{r.title}</span>
                      <span className="notes-result-meta">
                        {r.subjectTitle} · {r.chapter}
                      </span>
                      <span className="notes-result-snippet">{r.snippet}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {subjects.loading && !subjects.data && <LoadingBlock rows={4} />}
        {subjects.error && !subjects.data && <EmptyState title="Couldn't load the notes" description={subjects.error} />}
        {subjects.data && list.length === 0 && (
          <EmptyState
            icon={<Icon name="book" className="size-6" />}
            title="Notes are on the way"
            description="The first subjects are being written. Your Notebook keeps your own bookmarks and question notes in the meantime."
            action={
              <Link to="/gate/notebook" className="btn-secondary">
                Open Notebook
              </Link>
            }
          />
        )}

        {list.length > 0 && (
          <ul className="notes-grid">
            {list.map((s) => {
              const done = Object.entries(progress).filter(([k, v]) => k.startsWith(`${s.id}/`) && v.completed).length
              const pct = s.lessonCount ? Math.round((done / s.lessonCount) * 100) : 0
              return (
                <li key={s.id} style={subjectStyle(s.color)}>
                  <Link to={NOTES_ROUTES.subject(s.id)} className="notes-card">
                    <span className="notes-card-top">
                      <SubjectIcon icon={s.icon} />
                      {s.hidden && <span className="notes-badge">Staff only</span>}
                    </span>
                    <span className="notes-card-title">{s.title}</span>
                    <span className="notes-card-desc">{s.description}</span>
                    <span className="notes-card-meta">
                      {s.chapterCount} chapter{s.chapterCount === 1 ? '' : 's'} · {s.lessonCount} lesson{s.lessonCount === 1 ? '' : 's'} · {fmtMinutes(s.est_minutes)}
                    </span>
                    <span className="notes-card-bar" role="progressbar" aria-label={`${s.title} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <span style={{ width: `${pct}%` }} />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </NotesRoot>
    </GateShell>
  )
}
