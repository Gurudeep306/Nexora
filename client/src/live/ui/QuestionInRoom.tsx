/* The GATE question a room is about, shown in the room's side panel (loaded on demand). */
import { Link } from 'react-router-dom'
import { QuestionView } from '@/gate/QuestionView'
import { useQuestionsByIds } from '@/gate/shell/useGateData'

export default function QuestionInRoom({ id }: { id: string }) {
  const r = useQuestionsByIds([id])
  const q = r.data?.[id]
  if (r.error) return <p className="lv-status is-bad">Could not load the question.</p>
  if (!q) return <p className="lv-hint">Loading the question…</p>
  return (
    <div className="grid gap-3">
      <QuestionView q={q} compact mode="practice" />
      <Link to={`/gate/practice?ids=${encodeURIComponent(id)}`} target="_blank" className="ed-link text-[13px]">
        Open it in a new tab, with notes and solutions
      </Link>
    </div>
  )
}
