import { useEffect, useState } from 'react'
import { DSA_TOPICS } from '../content/dsa/syllabus'
import { allAlgorithms, registerAlgorithms } from '../engine/registry'
import { EXAMPLES } from '../engine/examples'
import { VizPlayer } from '../engine/VizPlayer'
import '../algorithms'

/**
 * Development-only gallery of every animation (mounted at /viz-lab when
 * running `npm run dev`). No sign-in or server needed — handy for checking
 * an animation by eye or with a Playwright screenshot.
 *
 *   /viz-lab                      every topic's animations, grouped
 *   /viz-lab?topic=graph-basics   one topic
 *   /viz-lab?algo=ex-ll-reverse   one animation
 */
export default function VizLab() {
  const q = new URLSearchParams(window.location.search)
  const topicId = q.get('topic')
  const algoId = q.get('algo')
  const [, setTick] = useState(0)
  const [byTopic, setByTopic] = useState<Record<string, string[]>>({})

  useEffect(() => {
    registerAlgorithms(EXAMPLES)
    const groups: Record<string, string[]> = { examples: EXAMPLES.map((a) => a.id) }
    Promise.all(
      DSA_TOPICS.filter((t) => t.load && (!topicId || t.id === topicId)).map((t) =>
        t.load!().then((topic) => {
          registerAlgorithms(topic.algorithms)
          groups[t.id] = (topic.algorithms ?? []).map((a) => a.id)
        }),
      ),
    ).then(() => {
      setByTopic(groups)
      setTick((n) => n + 1)
    })
  }, [topicId])

  const all = new Map(allAlgorithms().map((a) => [a.id, a]))
  const ids = algoId ? [algoId] : topicId ? (byTopic[topicId] ?? []) : Object.values(byTopic).flat()

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <h1 className="font-display text-2xl">Viz lab {topicId ? `· ${topicId}` : algoId ? `· ${algoId}` : ''}</h1>
      {ids.length === 0 && <p className="text-sm text-foreground-dim">Loading…</p>}
      {ids.map((id) => {
        const a = all.get(id)
        return a ? (
          <section key={id} id={id} data-algo={id}>
            <p className="mb-2 font-mono text-xs text-foreground-faint">{id}</p>
            <VizPlayer algo={a} />
          </section>
        ) : (
          <p key={id} className="text-sm text-destructive">
            Unknown animation {id}
          </p>
        )
      })}
    </div>
  )
}
