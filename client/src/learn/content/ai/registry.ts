import type { SyllabusEntry, Topic, TopicMeta } from '../../types'
import { AI_COURSES, AI_TOPIC_INFO } from './web.gen'
import fNumbers from './foundations/f-numbers/meta'
import fFunctions from './foundations/f-functions/meta'
import fPython from './foundations/f-python/meta'

/**
 * The AI courses: every topic of docs/ai-courses/curriculum.json, in teaching
 * order. Written topics lazy-load their lessons; the rest are listed (with
 * what they need) and marked "being written", so the whole web is visible.
 */
const WRITTEN: Record<string, { meta: TopicMeta; load: () => Promise<{ default: Topic }> }> = {
  'f-numbers': { meta: fNumbers, load: () => import('./foundations/f-numbers') },
  'f-functions': { meta: fFunctions, load: () => import('./foundations/f-functions') },
  'f-python': { meta: fPython, load: () => import('./foundations/f-python') },
}

export const AI_TOPICS: SyllabusEntry[] = AI_COURSES.flatMap((c) =>
  c.chapters.flatMap((ch) =>
    ch.topics.map((id) => {
      const info = AI_TOPIC_INFO[id]
      const w = WRITTEN[id]
      const entry: SyllabusEntry = { id, unit: c.id, title: info.title, blurb: info.visual }
      if (w?.meta.ready) {
        entry.pages = w.meta.pages
        entry.load = () => w.load().then((m) => m.default)
      }
      return entry
    }),
  ),
)
const BY_ID = new Map(AI_TOPICS.map((t) => [t.id, t]))
export const findAiTopic = (id: string) => BY_ID.get(id)
export const aiCourseOf = (id: string) => AI_COURSES.find((c) => c.id === AI_TOPIC_INFO[id]?.course)
