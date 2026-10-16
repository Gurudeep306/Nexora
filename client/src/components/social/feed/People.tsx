import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hash, Search, TrendingUp, X } from 'lucide-react'
import { Avatar, Button, Skeleton, useToast } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { errorText } from './lib'
import type { SocialUser } from './types'
import { displayName, profilePath, tagPath } from './types'

type FollowState = 'accepted' | 'pending' | null

/** Follow / Following (hover: Unfollow) / Requested. */
export function FollowButton({
  username,
  state,
  onChange,
  size = 'sm',
  className,
}: {
  username: string
  state: FollowState
  onChange?: (s: FollowState) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  const toast = useToast()
  const [cur, setCur] = useState<FollowState>(state)
  const [busy, setBusy] = useState(false)
  useEffect(() => setCur(state), [state])
  const toggle = async () => {
    setBusy(true)
    const prev = cur
    try {
      if (cur) {
        setCur(null)
        await api.delete(`/api/social/follow/${encodeURIComponent(username)}`)
        onChange?.(null)
      } else {
        const r = await api.put<{ following: FollowState }>(`/api/social/follow/${encodeURIComponent(username)}`)
        setCur(r.following)
        onChange?.(r.following)
        if (r.following === 'pending') toast.info('Follow request sent', `@${username} approves followers.`)
      }
    } catch (e) {
      setCur(prev)
      toast.error('Could not update', errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button
      size={size}
      variant={cur ? 'subtle' : 'primary'}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        void toggle()
      }}
      disabled={busy}
      aria-pressed={!!cur}
      className={cn('group/follow min-w-[92px] rounded-full', cur === 'accepted' && 'hover:border-state-error/40 hover:bg-state-error/10 hover:text-state-error', className)}
    >
      {cur === 'accepted' ? (
        <>
          <span className="group-hover/follow:hidden">Following</span>
          <span className="hidden group-hover/follow:inline">Unfollow</span>
        </>
      ) : cur === 'pending' ? (
        'Requested'
      ) : (
        'Follow'
      )}
    </Button>
  )
}

export function UserRow({ u, sub, right }: { u: SocialUser; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-bg-surface-2/60">
      <Link to={profilePath(u.username)} className="shrink-0">
        <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={displayName(u)} size="md" ring={false} />
      </Link>
      <Link to={profilePath(u.username)} className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="truncate text-sm font-semibold text-text-primary">{displayName(u)}</span>
          <UserBadges username={u.username} role={u.role} verified={u.verified} />
        </span>
        <span className="block truncate text-xs text-text-muted">{sub ?? `@${u.username}`}</span>
      </Link>
      {right}
    </div>
  )
}

export function WhoToFollow({ limit = 4, className }: { limit?: number; className?: string }) {
  const [users, setUsers] = useState<(SocialUser & { reason: string })[] | null>(null)
  useEffect(() => {
    api
      .get<{ users: (SocialUser & { reason: string })[] }>('/api/social/suggestions')
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]))
  }, [])
  if (users && !users.length) return null
  return (
    <section className={cn('card p-3', className)} aria-labelledby="wtf-title">
      <h2 id="wtf-title" className="px-2 pt-1 pb-2 font-display text-[15px] font-semibold text-text-primary">
        Who to follow
      </h2>
      {!users ? (
        <div className="space-y-2 p-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : (
        users.slice(0, limit).map((u) => <UserRow key={u.username} u={u} sub={u.reason} right={<FollowButton username={u.username} state={null} />} />)
      )}
    </section>
  )
}

export function TrendingTags({ className }: { className?: string }) {
  const [tags, setTags] = useState<{ tag: string; posts: number }[] | null>(null)
  useEffect(() => {
    api
      .get<{ tags: { tag: string; posts: number }[] }>('/api/social/trending')
      .then((r) => setTags(r.tags))
      .catch(() => setTags([]))
  }, [])
  return (
    <section className={cn('card p-3', className)} aria-labelledby="trend-title">
      <h2 id="trend-title" className="flex items-center gap-2 px-2 pt-1 pb-2 font-display text-[15px] font-semibold text-text-primary">
        <TrendingUp className="size-4 text-accent-brand" /> Trending
      </h2>
      {!tags ? (
        <div className="space-y-2 p-2">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ) : !tags.length ? (
        <p className="px-2 pb-2 text-sm text-text-muted">No tags yet — start one with #yourtopic.</p>
      ) : (
        <ol>
          {tags.map((t, i) => (
            <li key={t.tag}>
              <Link to={tagPath(t.tag)} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-surface-2/60">
                <span className="w-4 text-right font-mono text-xs text-text-muted tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">#{t.tag}</span>
                  <span className="text-xs text-text-muted">
                    {t.posts} {t.posts === 1 ? 'post' : 'posts'} this week
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** Search people and hashtags; Enter searches posts. */
export function SocialSearch({ className, initial = '' }: { className?: string; initial?: string }) {
  const navigate = useNavigate()
  const [q, setQ] = useState(initial)
  const [open, setOpen] = useState(false)
  const [res, setRes] = useState<{ users: SocialUser[]; tags: { tag: string; posts: number }[] } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const term = q.trim()
    if (!term) {
      setRes(null)
      return
    }
    const t = setTimeout(() => {
      api
        .get<{ users: SocialUser[]; tags: { tag: string; posts: number }[] }>('/api/social/search', { query: { q: term } })
        .then(setRes)
        .catch(() => setRes(null))
    }, 180)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }
  const term = q.trim()
  return (
    <div ref={box} className={cn('relative', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (!term) return
          if (term.startsWith('#')) go(tagPath(term.slice(1)))
          else go(`/social?tab=search&q=${encodeURIComponent(term)}`)
        }}
      >
        <label htmlFor="social-search" className="sr-only">
          Search people, tags and posts
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-text-muted" />
        <input
          id="social-search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder="Search people, #tags, posts"
          autoComplete="off"
          className="h-10 w-full rounded-full border border-border bg-bg-surface-2/70 pr-9 pl-10 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-brand/50 focus:bg-bg-surface"
        />
        {q && (
          <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-text-muted hover:text-text-primary">
            <X className="size-3.5" />
          </button>
        )}
      </form>
      {open && term && (
        <div className="pop-surface absolute inset-x-0 top-full z-30 mt-1.5 max-h-96 overflow-y-auto p-1.5">
          {res?.tags.map((t) => (
            <button key={t.tag} type="button" onClick={() => go(tagPath(t.tag))} className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-bg-surface-3">
              <span className="grid size-9 place-items-center rounded-full bg-state-info/12 text-state-info">
                <Hash className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-text-primary">#{t.tag}</span>
                <span className="text-xs text-text-muted">{t.posts} posts</span>
              </span>
            </button>
          ))}
          {res?.users.map((u) => (
            <button key={u.username} type="button" onClick={() => go(profilePath(u.username))} className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-bg-surface-3">
              <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={displayName(u)} size="md" ring={false} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-semibold text-text-primary">
                  <span className="truncate">{displayName(u)}</span>
                  <UserBadges username={u.username} role={u.role} verified={u.verified} />
                </span>
                <span className="block truncate text-xs text-text-muted">@{u.username}</span>
              </span>
            </button>
          ))}
          <button type="button" onClick={() => go(`/social?tab=search&q=${encodeURIComponent(term)}`)} className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-accent-brand hover:bg-bg-surface-3">
            <Search className="size-4" /> Search posts for “{term}”
          </button>
        </div>
      )}
    </div>
  )
}
