import type { SyllabusEntry } from '../types'
import { DSA_TOPICS, findTopic as findDsaTopic } from './dsa/syllabus'
import { aiCourseOf, findAiTopic } from './ai/registry'
import { AI_TOPIC_INFO } from './ai/web.gen'

/*
  One lookup for every course the lesson reader shows: the DSA course and the
  AI courses. Topic ids never clash (AI ids carry a course prefix: f-, m-, dl-…),
  so a topic id alone says where it lives.
*/

export function findAnyTopic(id: string): SyllabusEntry | undefined {
  return findDsaTopic(id) ?? findAiTopic(id)
}
export const isAiTopic = (id: string) => id in AI_TOPIC_INFO

/** The topic's address: /learn/dsa/<id> or /learn/ai-courses/<course>/<id>. */
export function topicBase(id: string): string {
  const c = isAiTopic(id) ? aiCourseOf(id) : null
  return c ? `/learn/ai-courses/${c.id}/${id}` : `/learn/dsa/${id}`
}
/** The course a topic belongs to: its name and its home page. */
export function courseOfTopic(id: string): { label: string; home: string; tree?: string } {
  const c = isAiTopic(id) ? aiCourseOf(id) : null
  return c ? { label: c.title, home: `/learn/ai-courses/${c.id}` } : { label: 'DSA course', home: '/learn/dsa', tree: '/learn/dsa?view=tree' }
}
/** "Chapter n": the topic's place in its course (1-based). */
export function chapterNumber(id: string): number {
  const c = isAiTopic(id) ? aiCourseOf(id) : null
  if (c) return Math.max(1, c.chapters.findIndex((ch) => ch.topics.includes(id)) + 1)
  return Math.max(1, DSA_TOPICS.findIndex((t) => t.id === id) + 1)
}
/** Where an AI topic is read: its lesson when written, else its place on the course page. */
export const aiTopicHref = (id: string) => (findAiTopic(id)?.load ? topicBase(id) : `/learn/ai-courses/${AI_TOPIC_INFO[id]?.course}#t-${id}`)
