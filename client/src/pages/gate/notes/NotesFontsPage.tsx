/*
  Staff-only font sample: /gate/notes/_fonts — the same section of the demo
  lesson in each handwriting candidate, side by side, so the owner can pick
  one. The pick is one line: NOTES_BODY_FONT in src/gate/notes/prefs.ts.
*/
import { useMemo } from 'react'
import { Icon } from '@/components/icon/Icon'
import { EmptyState, LoadingBlock } from '@/components/ui'
import { useSite } from '@/context/SiteContext'
import { GateShell } from '@/gate/shell/GateShell'
import { useLesson } from '@/gate/notes/api'
import { NOTES_BODY_FONT, NOTES_FONTS, useNotesPrefs } from '@/gate/notes/prefs'
import { NotesRoot } from '@/gate/notes/ui'
import { NotesContextProvider, Nodes, type NotesContext } from '@/gate/notes/render/NotesContent'
import type { LessonPayload, Node } from '@/gate/notes/types'
import NotFoundPage from '@/pages/NotFoundPage'

export default function NotesFontsPage() {
  const { isStaff, loading } = useSite()
  if (loading) return <LoadingBlock rows={4} />
  if (!isStaff) return <NotFoundPage />
  return <Samples />
}

/** The opening of the demo lesson (headings, body, maths, intuition, definition, aside, derivation) plus its trick and trap. */
function sampleNodes(body: Node[]): Node[] {
  const cut = body.findIndex((n) => n.t === 'block' && n.name === 'viz')
  const opening = body.slice(0, cut > 0 ? cut : 8)
  const extra = body.filter((n) => n.t === 'block' && (n.name === 'trick' || n.name === 'trap'))
  return [...opening, ...extra]
}

function Samples() {
  const r = useLesson('demo', 'place-value')
  const [prefs, setPrefs] = useNotesPrefs()
  const nodes = useMemo(() => (r.data ? sampleNodes(r.data.lesson.body) : []), [r.data])
  if (r.error && !r.data) return <EmptyState title="Couldn't load the demo lesson" description={r.error} />
  if (!r.data)
    return (
      <GateShell title="Notes fonts">
        <LoadingBlock rows={6} />
      </GateShell>
    )
  const data: LessonPayload = r.data
  const ctx: NotesContext = {
    subject: data.subject,
    lessonId: data.lesson.id,
    practice: data.practice,
    viz: data.viz,
    pyqTopics: data.lesson.pyq_topics,
    cleanLines: prefs.cleanLines,
    setCleanLines: (on) => setPrefs({ cleanLines: on }),
  }
  return (
    <GateShell title="Notes fonts" subtitle="The same section in each handwriting candidate. Staff only.">
      <p className="notes-fonts-intro">
        <Icon name="info" className="size-4" aria-hidden="true" /> Current default: <strong>{NOTES_FONTS.find((f) => f.id === NOTES_BODY_FONT)?.label}</strong>. To switch, change{' '}
        <code>NOTES_BODY_FONT</code> in <code>client/src/gate/notes/prefs.ts</code>.
      </p>
      <div className="notes-fonts">
        {NOTES_FONTS.map((f) => (
          <section key={f.id} aria-labelledby={`font-${f.id}`} className="notes-fonts-col">
            <header className="notes-fonts-head">
              <h2 id={`font-${f.id}`}>{f.label}</h2>
              <p>{f.note}</p>
            </header>
            <NotesRoot color={data.subject.color} font={f.id}>
              <article className="notes-paper notes-sample" aria-label={`${f.label} sample`}>
                <div className="notes-prose">
                  <h2 className="notes-sample-title">{data.lesson.title}</h2>
                  <NotesContextProvider value={{ ...ctx, idPrefix: `${f.id}-` }}>
                    <Nodes nodes={nodes} />
                  </NotesContextProvider>
                </div>
              </article>
            </NotesRoot>
          </section>
        ))}
      </div>
    </GateShell>
  )
}
