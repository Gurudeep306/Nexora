/*
  A real previous-year question inside a lesson: the practice bank's
  question card (answer checking, attempts feed the review queue) with its
  worked v2 solution, minus the practice page's stats and similar-question
  chrome. Loaded lazily — the card pulls in the solution engine.
*/
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { Icon } from '@/components/icon/Icon'
import { QuestionView } from '@/gate/QuestionView'
import type { GateDetail } from '@/gate/types'
import { lessonPracticeLink } from '../api'

export default function PyqEmbed({ id, topics }: { id: string; topics: string[] }) {
  const r = useApi(() => api.get<GateDetail>(`/api/gate/questions/${encodeURIComponent(id)}`), [id], { cacheKey: `gate:q:${id}` })
  return (
    <div className="npyq">
      {r.loading && !r.data && <div className="nb-loading" role="status" aria-busy="true" aria-label="Loading question" />}
      {r.error && !r.data && <p className="nb-missing">Couldn't load this question ({r.error}).</p>}
      {r.data && <QuestionView q={r.data.question} mode="practice" />}
      <Link to={lessonPracticeLink(topics)} className="npyq-more">
        Practise all PYQs of this lesson
        <Icon name="external" className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  )
}
