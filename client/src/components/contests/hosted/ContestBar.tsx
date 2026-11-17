import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { api } from '@/lib/api'
import { clock, contestUrl, type ContestView } from './api'
import { useLoaded } from './useLoaded'
import './hosted.css'

/** On the Solve page inside a contest (?contest=ID): whose contest, your time left, and the way back. */
export function ContestBar({ id }: { id: number }) {
  const { data } = useLoaded(() => api.get<ContestView>(`/api/hosted/${id}`), [id])
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!data) return null
  const me = data.me
  const left = me?.state === 'running' && me.to ? me.to - now : null
  const note =
    left != null && left > 0
      ? 'Every Submit counts here.'
      : me?.state === 'not_started'
        ? 'Start the contest first: runs do not count yet.'
        : data.host && !me
          ? 'You host this contest: your runs do not count.'
          : 'Your contest time is over: runs no longer count.'
  return (
    <div className="hc-banner m-0 flex-wrap items-center" data-tone={left != null && left > 0 ? 'success' : 'info'} role="region" aria-label="Contest">
      <Trophy className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 font-semibold">{data.contest.title}</span>
      {left != null && left > 0 && (
        <span className="font-mono tabular-nums" role="timer" aria-label="Time left">
          {clock(left)} left
        </span>
      )}
      <span className="text-text-secondary">{note}</span>
      <Link to={contestUrl(data.contest.code)} className="ml-auto font-semibold underline underline-offset-2">
        Back to the contest
      </Link>
    </div>
  )
}
