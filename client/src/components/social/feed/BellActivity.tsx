import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui'
import { api } from '@/lib/api'
import { cn, timeAgo } from '@/lib/utils'
import { NOTIF_META, actorsText, notifLink, plainSnippet } from './notifications'
import type { NotificationGroup } from './types'
import { displayName } from './types'

/** Unread social notifications inside the top-bar inbox (grouped: "Ana and 3 others liked…"). */
export function SocialActivity({ open, onNavigate, onSeen }: { open: boolean; onNavigate: () => void; onSeen: () => void }) {
  const [groups, setGroups] = useState<NotificationGroup[]>([])
  useEffect(() => {
    if (!open) return
    api
      .get<{ groups: NotificationGroup[] }>('/api/social/notifications')
      .then((r) => setGroups(r.groups.filter((g) => !g.read)))
      .catch(() => setGroups([]))
  }, [open])
  if (!groups.length) return null
  const go = () => {
    void api.post('/api/social/notifications/read').then(onSeen, () => {})
    onNavigate()
  }
  return (
    <div className="mb-1 border-b border-border/60 pb-1">
      {groups.slice(0, 5).map((g) => {
        const m = NOTIF_META[g.type] ?? NOTIF_META.like
        const Ico = m.icon
        return (
          <Link key={`${g.type}${g.id}`} to={notifLink(g)} onClick={go} className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-[13px] transition-colors hover:bg-bg-app/5">
            <span className="relative mt-0.5 shrink-0">
              <Avatar seed={g.actors[0]?.username} avatar={g.actors[0]?.avatar} src={g.actors[0]?.avatar_url} name={displayName(g.actors[0])} size="sm" ring={false} />
              <span className={cn('absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full ring-2 ring-bg-surface', m.cls)}>
                <Ico className="size-2.5" />
              </span>
            </span>
            <span className="min-w-0 text-text-secondary">
              <strong className="font-semibold text-text-primary">{actorsText(g.actors, g.actor_count)}</strong> {m.verb(g.actor_count > 1)}
              <span className="ml-1 text-[11px] text-text-muted">· {timeAgo(g.created_at)}</span>
              {g.snippet && <span className="mt-0.5 line-clamp-1 block text-xs text-text-muted">{plainSnippet(g.snippet)}</span>}
            </span>
          </Link>
        )
      })}
      <Link to="/social?tab=notifications" onClick={go} className="block rounded-lg px-2.5 py-2 text-center text-xs font-medium text-accent-brand hover:bg-bg-app/5">
        See all activity
      </Link>
    </div>
  )
}
