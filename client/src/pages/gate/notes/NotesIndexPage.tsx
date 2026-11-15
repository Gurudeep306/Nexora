/*
  All subjects: /gate/notes — a card per subject with progress, plus search
  across every lesson.
*/
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icon/Icon'
import { Search } from 'lucide-react'
import { EmptyState, LoadingBlock } from '@/components/ui'
import { useNexusWeb } from '@/components/nexus/SubjectsHub'
import '@/gate/notes/notes-home.css'
import { GateShell } from '@/gate/shell/GateShell'
import { NOTES_ROUTES, fmtMinutes, notesApi, subjectStyle, useNotesSubjects } from '@/gate/notes/api'
import { useNotesProgress } from '@/gate/notes/progress'
import { NotesRoot, SubjectIcon } from '@/gate/notes/ui'
import type { SearchResult } from '@/gate/notes/types'
import { VizThumb } from '@/viz/VizThumb'

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
  const { structure } = useNexusWeb()
  const written = new Set(list.map((x) => x.id))
  const soon = (structure?.hubs?.gate?.CSE ?? []).filter((e) => !written.has(e.bank))
  // Counts what this reader can open (staff also see draft subjects).
  const totalLessons = list.reduce((n, x) => n + x.lessonCount, 0)

  return (
    <GateShell title="Notes" bare>
      <NotesRoot>
        <header className="nh-hero nh-hero--index">
          <div className="min-w-0">
            <h1 className="nh-title">Notes</h1>
            <p className="nh-desc">Every GATE subject as short lessons: worked maths, diagrams that step, and real past questions inside the lesson that teaches them.</p>
            {list.length > 0 && (
              <label className="search-field is-lg mt-6 max-w-2xl">
                <Search className="search-field-icon" aria-hidden="true" />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search every lesson" aria-label="Search the notes" />
                <kbd className="search-field-kbd">/</kbd>
              </label>
            )}
          </div>
          {list.length > 0 && (
            <dl className="nh-figures">
              <div>
                <dt>Subjects ready</dt>
                <dd>{list.length}</dd>
              </div>
              <div>
                <dt>Lessons</dt>
                <dd>{totalLessons}</dd>
              </div>
              <div>
                <dt>Being written</dt>
                <dd>{soon.length}</dd>
              </div>
            </dl>
          )}
        </header>

        {shown && (
          <section className="notes-results nh-results" aria-label="Search results" aria-live="polite">
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

        {list.length > 0 && !shown && (
          <>
            <h2 className="nh-section">Ready to read</h2>
            <ul className="nh-subjects">
              {list.map((s) => {
                const done = Object.entries(progress).filter(([k, v]) => k.startsWith(`${s.id}/`) && v.completed).length
                const pct = s.lessonCount ? Math.round((done / s.lessonCount) * 100) : 0
                return (
                  <li key={s.id} style={subjectStyle(s.color)}>
                    <Link to={NOTES_ROUTES.subject(s.id)} className="nh-subject card card-interactive">
                      {s.signature && <VizThumb spec={s.signature.spec} className="nh-thumb" />}
                      <span className="flex items-start justify-between gap-3">
                        <SubjectIcon icon={s.icon} />
                        {s.hidden ? <span className="notes-badge">Staff only</span> : <span className="nh-pct">{pct}%</span>}
                      </span>
                      <span className="nh-subject-title">{s.title}</span>
                      <span className="nh-subject-desc">{s.description}</span>
                      <span className="nh-subject-meta">
                        {s.chapterCount} chapters · {s.lessonCount} lessons · {fmtMinutes(s.est_minutes)}
                        {s.coverage?.total ? ` · ${s.coverage.covered} PYQs linked` : ''}
                      </span>
                      <span className="nh-bar" role="progressbar" aria-label={`${s.title} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                        <span style={{ width: `${pct}%` }} />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>

            {soon.length > 0 && (
              <>
                <h2 className="nh-section">Being written</h2>
                <ul className="nh-soon">
                  {soon.map((e) => (
                    <li key={e.bank}>
                      <span className="nh-soon-name">{e.name}</span>
                      <span className="flex gap-1.5">
                        <Link to={`/learn/${e.nexus}`} className="nh-soon-link">
                          Skill tree
                        </Link>
                        <Link to={`/gate/practice?subject=${encodeURIComponent(e.bank)}`} className="nh-soon-link">
                          Past questions
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </NotesRoot>
    </GateShell>
  )
}
