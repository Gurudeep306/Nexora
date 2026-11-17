import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { Badge, badgeVariants } from '@/components/ui/Badge'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { TOPICS, TOPIC_GROUPS, topicIds, topicLabel } from '@/lib/topics'
import './topics.css'

/*
  Topics on a problem: small quiet chips (a hairline, muted text). Shown on
  Problems rows, the Solve page header and the contest problem picker. A chip
  with `onPick` is a button that filters by that topic.
*/
export function TopicChips({
  topics,
  max = Infinity,
  className,
  onPick,
  link = false,
}: {
  /** Topic ids, or their JSON text. */
  topics: unknown
  /** Show at most this many; the rest become "+n". By default every topic gets its badge. */
  max?: number
  className?: string
  onPick?: (id: string) => void
  /** Each badge opens Problems filtered to that topic. */
  link?: boolean
}) {
  const ids = topicIds(topics)
  if (!ids.length) return null
  const shown = ids.slice(0, max)
  const more = ids.length - shown.length
  // The site's own Badge (data-ui="badge"), so every theme dresses topic
  // badges the way it dresses every other badge: shape, face, ink, light and dark.
  const look = cn(badgeVariants({ variant: 'secondary' }), 'tp-chip')
  return (
    <span className={cn('tp-chips', className)} role="group" aria-label="Topics">
      {shown.map((id) =>
        onPick ? (
          <button
            key={id}
            type="button"
            data-ui="badge"
            data-variant="secondary"
            className={cn(look, 'tp-chip-btn')}
            title={`Show ${topicLabel(id)} problems`}
            onClick={(e) => {
              e.stopPropagation()
              onPick(id)
            }}
          >
            {topicLabel(id)}
          </button>
        ) : link ? (
          <Link key={id} to={`/problems?topic=${encodeURIComponent(id)}`} data-ui="badge" data-variant="secondary" className={cn(look, 'tp-chip-btn')} title={`More ${topicLabel(id)} problems`}>
            {topicLabel(id)}
          </Link>
        ) : (
          <Badge key={id} variant="secondary" className="tp-chip">
            {topicLabel(id)}
          </Badge>
        ),
      )}
      {more > 0 && (
        <Badge variant="secondary" className="tp-chip tp-more" title={ids.slice(max).map(topicLabel).join(', ')}>
          +{more}
        </Badge>
      )}
    </span>
  )
}

/** The pill that opens the topic chooser, in the filter row's size. */
export function TopicFilterButton({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const label = !value.length ? 'All topics' : value.length === 1 ? topicLabel(value[0]) : `${value.length} topics`
  return (
    <>
      <button type="button" className="tp-pill input-base" aria-haspopup="dialog" aria-label={`Topic: ${label}`} onClick={() => setOpen(true)} data-active={value.length ? '' : undefined}>
        <span className="truncate">{label}</span>
        <ChevronDown className="tp-pill-chev" aria-hidden="true" />
      </button>
      <TopicChooser open={open} value={value} onClose={() => setOpen(false)} onChange={onChange} />
    </>
  )
}

/** Choose any number of topics; a problem must have all of them. */
export function TopicChooser({
  open,
  value,
  onClose,
  onChange,
  onDone,
}: {
  open: boolean
  value: string[]
  onClose: () => void
  onChange: (ids: string[]) => void
  /** "Done" (defaults to closing): e.g. save, where closing alone should not. */
  onDone?: () => void
}) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  // How many problems have each topic (real counts from the catalog), once the chooser opens.
  const counts = useApi(() => api.get<{ topics: { id: string; count: number }[] }>('/api/topics'), [], { skip: !open, cacheKey: 'topics:counts' })
  const countOf = new Map((counts.data?.topics ?? []).map((t) => [t.id, t.count]))
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Topics"
      description="Pick one or more. A problem must have every topic you pick."
      size="lg"
    >
      <div className="tp-groups">
        {TOPIC_GROUPS.map((g) => (
          <fieldset key={g} className="tp-group">
            <legend className="tp-legend">{g}</legend>
            <div className="tp-options">
              {TOPICS.filter((t) => t.group === g).map((t) => {
                const on = value.includes(t.id)
                const n = countOf.get(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="tp-option"
                    aria-pressed={on}
                    data-empty={n === 0 && !on ? '' : undefined}
                    aria-label={n === undefined ? t.label : `${t.label}, ${n} problem${n === 1 ? '' : 's'}`}
                    onClick={() => toggle(t.id)}
                  >
                    {on && <Check aria-hidden="true" />}
                    {t.label}
                    {n !== undefined && (
                      <span className="tp-count" aria-hidden="true">
                        {n.toLocaleString()}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="tp-actions">
        <Button variant="ghost" onClick={() => onChange([])} disabled={!value.length}>
          Clear
        </Button>
        <Button onClick={onDone ?? onClose}>Done</Button>
      </div>
    </Modal>
  )
}
