import { ExternalLink } from 'lucide-react'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { CountdownTimer } from './CountdownTimer'
import { contestBucket, contestIcs, fmtDuration } from './contestUtils'
import type { PlatformContest } from './types'

/** Saves the contest as a calendar file; the student's calendar app does the reminding. */
function remind(c: PlatformContest) {
  const ics = contestIcs(c)
  if (!ics) return
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${c.name.replace(/[^\w-]+/g, '-').slice(0, 60) || 'contest'}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * One contest as a calendar line (the Field Journal look): the day as a serif
 * numeral over its month, the name, the platform and length in mono, the
 * countdown, and "Remind me" (a calendar file) or the link.
 */
export function ContestRow({ contest }: { contest: PlatformContest }) {
  const bucket = contestBucket(contest)
  const start = contest.startTime != null ? new Date(contest.startTime) : null
  const end = contest.startTime != null && contest.durationSeconds ? contest.startTime + contest.durationSeconds * 1000 : null
  return (
    <li className="cr-row" data-bucket={bucket}>
      <span className="cr-date" aria-hidden={start ? undefined : true}>
        {start ? (
          <>
            <span className="cr-day">{start.getDate()}</span>
            <span className="cr-month">{start.toLocaleDateString('en-IN', { month: 'short', weekday: 'short' })}</span>
          </>
        ) : (
          <span className="cr-month">TBA</span>
        )}
      </span>
      <span className="cr-main">
        <span className="cr-name">{contest.name}</span>
        <span className="cr-meta">
          <PlatformBadge platform={contest.platform} />
          <span>{fmtDuration(contest.durationSeconds)}</span>
          {start && <span>{start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
          {bucket === 'live' && <span className="cr-live">Live now</span>}
        </span>
      </span>
      <span className="cr-when">
        {bucket === 'upcoming' && contest.startTime != null && <CountdownTimer target={contest.startTime} compact />}
        {bucket === 'live' && end != null && <CountdownTimer target={end} countUpAfter={false} compact />}
      </span>
      <span className="cr-actions">
        {bucket === 'upcoming' && contest.startTime != null && (
          <button type="button" className="cr-link" onClick={() => remind(contest)}>
            Remind me<span className="sr-only">: save {contest.name} to your calendar</span>
          </button>
        )}
        {contest.url && (
          <a className="cr-link" href={contest.url} target="_blank" rel="noopener noreferrer">
            {bucket === 'live' ? 'Join' : 'Open'} <ExternalLink className="inline size-3" aria-hidden="true" />
            <span className="sr-only"> {contest.name} on {contest.platform} (opens in a new tab)</span>
          </a>
        )}
      </span>
    </li>
  )
}
