import { Link } from 'react-router-dom'
import { AI_COURSES, AI_TOPIC_INFO } from '../content/ai/web.gen'
import { findAiTopic } from '../content/ai/registry'
import { aiTopicHref } from '../content/courses'

/*
  The course web inside a lesson (docs/ai-courses/STYLE.md §4): what a topic
  needs, where it leads, and the way back when a student is stuck. Everything
  comes from the curriculum's web, so no link is typed by hand.
*/

const courseName = (id: string) => AI_COURSES.find((c) => c.id === id)?.title ?? id

function TopicLink({ id, from }: { id: string; from: string }) {
  const t = AI_TOPIC_INFO[id]
  if (!t) return null
  const other = t.course !== AI_TOPIC_INFO[from]?.course
  const written = !!findAiTopic(id)?.load
  return (
    <li className="nr-web-item">
      <Link to={aiTopicHref(id)} className="font-medium text-text-primary">
        {t.title}
      </Link>
      <span className="text-[13px] text-text-muted">
        {other ? ` · ${courseName(t.course)}` : ''}
        {written ? '' : ' · being written'}
      </span>
    </li>
  )
}

export function WhatYouNeed({ topicId }: { topicId: string }) {
  const t = AI_TOPIC_INFO[topicId]
  if (!t) return null
  const course = AI_COURSES.find((c) => c.id === t.course)
  return (
    <section className="nr-web" aria-labelledby="need-h">
      <h2 id="need-h" className="nr-web-h">
        What you need
      </h2>
      {t.needs.length ? (
        <ul className="nr-web-list">
          {t.needs.map((id) => (
            <TopicLink key={id} id={id} from={topicId} />
          ))}
        </ul>
      ) : (
        <p className="m-0 text-text-secondary">Nothing before this: it is where the course starts. School arithmetic is enough.</p>
      )}
      {course?.nexus && (
        <p className="m-0 mt-2 text-[14px] text-text-secondary">
          The same ideas, as a skill tree: <Link to={`/learn/${course.nexus.id}`} className="underline underline-offset-2">{course.nexus.name}</Link>.
        </p>
      )}
    </section>
  )
}

export function WhereNext({ topicId }: { topicId: string }) {
  const t = AI_TOPIC_INFO[topicId]
  if (!t || (!t.usedBy.length && !t.related.length)) return null
  return (
    <section className="nr-web" aria-labelledby="next-h">
      <h2 id="next-h" className="nr-web-h">
        Where this goes next
      </h2>
      {t.usedBy.length > 0 && (
        <>
          <p className="m-0 mb-1 text-[14px] text-text-secondary">These topics build on this one:</p>
          <ul className="nr-web-list">
            {t.usedBy.map((id) => (
              <TopicLink key={id} id={id} from={topicId} />
            ))}
          </ul>
        </>
      )}
      {t.related.length > 0 && (
        <>
          <p className="m-0 mt-3 mb-1 text-[14px] text-text-secondary">Related:</p>
          <ul className="nr-web-list">
            {t.related.map((id) => (
              <TopicLink key={id} id={id} from={topicId} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** The prerequisite chain, nearest first: the way back for anyone who is lost. */
export function Stuck({ topicId }: { topicId: string }) {
  const chain = AI_TOPIC_INFO[topicId]?.allNeeds ?? []
  if (!chain.length) return null
  return (
    <p className="nr-stuck">
      <span className="nx-aside-label">Stuck?</span>{' '}
      {chain.slice(0, 6).map((id, i) => (
        <span key={id}>
          {i > 0 && ' · '}
          <Link to={aiTopicHref(id)} className="underline underline-offset-2">
            {AI_TOPIC_INFO[id].title}
          </Link>
        </span>
      ))}
    </p>
  )
}
