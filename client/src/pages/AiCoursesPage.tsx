import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { BackButton, PageHeader, SearchInput } from '@/components/ui'
import { AI_COURSES, AI_TOPIC_INFO } from '@/learn/content/ai/web.gen'
import { findAiTopic } from '@/learn/content/ai/registry'
import { aiTopicHref } from '@/learn/content/courses'
import { AI_SEARCH } from '@/learn/content/ai/search.gen'

/*
  The AI courses: /learn/ai-courses lists the ten courses in teaching order;
  /learn/ai-courses/<course> lists every chapter and topic, what each one needs (in any
  course), and whether it is written yet. A filter finds any topic, page or
  section by its words.
*/

const COURSE_NO = new Map(AI_COURSES.map((c, i) => [c.id, i + 1]))

function matches(id: string, q: string) {
  if (!q) return true
  const t = AI_TOPIC_INFO[id]
  const hay = [t.title, t.visual, t.chapter, ...(AI_SEARCH[id]?.flatMap((p) => [p.title, ...p.sections]) ?? [])].join(' ').toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

function TopicRow({ id, n }: { id: string; n: string }) {
  const t = AI_TOPIC_INFO[id]
  const written = !!findAiTopic(id)?.load
  return (
    <li id={`t-${id}`} className="ai-topic">
      <span className="ai-topic-n" aria-hidden="true">
        {n}
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[15.5px] leading-snug">
          {written ? (
            <Link to={aiTopicHref(id)} className="font-semibold text-text-primary">
              {t.title}
            </Link>
          ) : (
            <span className="font-semibold text-text-primary">{t.title}</span>
          )}
          <span className="ml-2 text-[12px] text-text-muted">{written ? `${findAiTopic(id)?.pages} pages` : 'being written'}</span>
        </p>
        {t.visual && <p className="m-0 mt-0.5 text-[13.5px] text-text-secondary">{t.visual}</p>}
        {t.needs.length > 0 && (
          <p className="m-0 mt-1 text-[12.5px] text-text-muted">
            Needs:{' '}
            {t.needs.map((x, i) => (
              <span key={x}>
                {i > 0 && ', '}
                <Link to={aiTopicHref(x)} className="text-text-secondary underline underline-offset-2">
                  {AI_TOPIC_INFO[x].title}
                </Link>
                {AI_TOPIC_INFO[x].course !== t.course && <span> ({AI_COURSES.find((c) => c.id === AI_TOPIC_INFO[x].course)?.title})</span>}
              </span>
            ))}
          </p>
        )}
      </div>
    </li>
  )
}

export default function AiCoursesPage() {
  const { course: courseId } = useParams()
  const [q, setQ] = useState('')
  const course = courseId ? AI_COURSES.find((c) => c.id === courseId) : null
  const shown = useMemo(() => (course ? [course] : AI_COURSES), [course])
  if (courseId && !course) return <Navigate to="/learn/ai-courses" replace />
  const total = Object.keys(AI_TOPIC_INFO).length
  const written = Object.keys(AI_TOPIC_INFO).filter((id) => findAiTopic(id)?.load).length
  const hits = shown.flatMap((c) => c.chapters.flatMap((ch) => ch.topics)).filter((id) => matches(id, q)).length

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <BackButton />
      {course ? (
        <PageHeader eyebrow={`AI course ${COURSE_NO.get(course.id)} of ${AI_COURSES.length}`} title={course.title} subtitle={course.blurb} />
      ) : (
        <PageHeader eyebrow="AI courses" title="Artificial intelligence, from school maths to how big models are built" subtitle={`Ten courses, ${total} topics, in teaching order. Every topic says what it needs. ${written} written so far.`} />
      )}
      {course?.story && <p className="m-0 max-w-3xl font-serif text-[17px] leading-relaxed text-text-primary italic">{course.story}</p>}
      {course?.nexus && (
        <p className="m-0 text-[14px] text-text-secondary">
          The same subject as a skill tree: <Link to={`/learn/${course.nexus.id}`} className="underline underline-offset-2">{course.nexus.name}</Link>.
        </p>
      )}
      <div className="space-y-1">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder={course ? `Find a topic in ${course.title}` : 'Find a topic, page or section'} aria-label="Find a topic" containerClassName="max-w-md" />
        {q && (
          <p className="m-0 text-[13px] text-text-muted" role="status">
            {hits} topic{hits === 1 ? '' : 's'} match.
          </p>
        )}
      </div>
      {shown.map((c) => (
        <section key={c.id} aria-labelledby={`c-${c.id}`} className="space-y-4 border-t border-border pt-5">
          {!course && (
            <div>
              <p className="m-0 text-[11px] font-semibold tracking-wider text-text-muted uppercase">Course {COURSE_NO.get(c.id)}</p>
              <h2 id={`c-${c.id}`} className="m-0 text-xl font-semibold">
                <Link to={`/learn/ai-courses/${c.id}`} className="text-text-primary">
                  {c.title}
                </Link>
              </h2>
              <p className="m-0 mt-1 max-w-3xl text-[14.5px] text-text-secondary">{c.blurb}</p>
            </div>
          )}
          {course && (
            <h2 id={`c-${c.id}`} className="sr-only">
              Chapters
            </h2>
          )}
          {c.chapters.map((ch, k) => {
            const ids = ch.topics.filter((id) => matches(id, q))
            if (!ids.length) return null
            return (
              <div key={ch.title}>
                <h3 className="m-0 mb-2 text-[15px] font-semibold text-text-primary">
                  <span className="mr-2 font-mono text-[12px] text-text-muted">{k + 1}</span>
                  {ch.title}
                </h3>
                <ol className="ai-topics">
                  {ids.map((id) => (
                    <TopicRow key={id} id={id} n={`${k + 1}.${ch.topics.indexOf(id) + 1}`} />
                  ))}
                </ol>
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
