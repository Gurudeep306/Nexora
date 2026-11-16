import { useMemo, useState } from 'react'
import { useTopic } from '@/learn/ui/useTopic'
import { getAlgorithm } from '@/learn/engine/registry'
import { VizPlayer } from '@/learn/engine/VizPlayer'
import type { Block } from '@/learn/types'
import { useLesson, useNotesSubjects } from '@/gate/notes/api'
import { VizBlock } from '@/viz/VizBlock'
import type { Continue } from './today-data'
import { FigureFor } from './Today'

/**
 * The real animation from what you are reading: the DSA chapter's figure on
 * (or after) the page you are on, or the notes lesson's first animation. Falls
 * back to the landing specimen only when the chapter has no animation.
 */
export function LiveFigure({ item }: { item: Continue }) {
  const dsa = /^\/learn\/dsa\/([^/?#]+)/.exec(item.to)?.[1]
  const notes = /^\/gate\/notes\/([^/?#]+)\/([^/?#]+)/.exec(item.to)
  if (dsa) return <DsaFigure id={dsa} page={item.page?.read ?? 0} fallback={item.figure} />
  if (notes) return <NotesFigure subject={notes[1]} lesson={notes[2]} fallback={item.figure} />
  return <FigureFor figure={item.figure} />
}

function DsaFigure({ id, page, fallback }: { id: string; page: number; fallback: Continue['figure'] }) {
  const { topic } = useTopic(id)
  const viz = useMemo(() => {
    if (!topic) return null
    const order = [...topic.pages.slice(page), ...topic.pages.slice(0, page)]
    for (const pg of order) {
      const b = pg.blocks.find((x): x is Extract<Block, { t: 'viz' }> => x.t === 'viz' && !!getAlgorithm(x.algo))
      if (b) return b
    }
    return null
  }, [topic, page])
  const algo = viz ? getAlgorithm(viz.algo) : null
  if (!topic) return <div className="today-live today-live--wait" aria-hidden="true" />
  if (!viz || !algo) return <FigureFor figure={fallback} />
  return (
    <figure className="today-live">
      <figcaption className="ed-label ed-muted">From this chapter · {algo.title}</figcaption>
      <VizPlayer algo={algo} initial={viz.initial} />
    </figure>
  )
}

function NotesFigure({ subject, lesson, fallback }: { subject: string; lesson: string; fallback: Continue['figure'] }) {
  const r = useLesson(subject, lesson)
  const subjects = useNotesSubjects()
  const [clean, setClean] = useState(false)
  const own = r.data ? Object.values(r.data.viz ?? {})[0] : undefined
  // A lesson without an animation shows its subject's signature one.
  const signature = subjects.data?.find((x) => x.id === subject)?.signature?.spec
  const spec = own ?? signature
  if (r.loading && !r.data) return <div className="today-live today-live--wait" aria-hidden="true" />
  if (!spec) return <FigureFor figure={fallback} />
  return (
    <figure className="today-live">
      <figcaption className="ed-label ed-muted">
        {own ? 'From this lesson' : 'From this subject'} · {spec.title}
      </figcaption>
      <VizBlock spec={spec} mode="animate" cleanLines={clean} onCleanLines={setClean} />
    </figure>
  )
}
