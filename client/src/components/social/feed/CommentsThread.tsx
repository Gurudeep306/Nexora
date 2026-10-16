import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Flag, Heart, MoreHorizontal, Pencil, RotateCcw, ShieldX, Trash2 } from 'lucide-react'
import { Avatar, Button, Menu, MenuContent, MenuItem, MenuTrigger, Skeleton, useToast } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { cn, timeAgo } from '@/lib/utils'
import { RichText } from './RichText'
import { ReportDialog } from './ReportDialog'
import { errorText, useSocialPerms } from './lib'
import type { Comment } from './types'
import { displayName, profilePath } from './types'

/** Comments with one level of replies, inline under a post. */
export function CommentsThread({ postId, onCount, autoFocus }: { postId: number; onCount?: (delta: number) => void; autoFocus?: boolean }) {
  const toast = useToast()
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<Comment | null>(null)

  useEffect(() => {
    let live = true
    api
      .get<{ comments: Comment[] }>(`/api/social/posts/${postId}/comments`)
      .then((r) => live && setComments(r.comments))
      .catch((e) => live && setError(errorText(e)))
    return () => {
      live = false
    }
  }, [postId])

  const tree = useMemo(() => {
    const top = (comments ?? []).filter((c) => !c.parent_id)
    const kids = new Map<number, Comment[]>()
    for (const c of comments ?? []) if (c.parent_id) kids.set(c.parent_id, [...(kids.get(c.parent_id) ?? []), c])
    return top.map((c) => ({ c, replies: kids.get(c.id) ?? [] }))
  }, [comments])

  const add = async (body: string, parent?: Comment | null) => {
    try {
      const r = await api.post<{ comment: Comment }>(`/api/social/posts/${postId}/comments`, { body, parent_id: parent?.id })
      setComments((cur) => [...(cur ?? []), r.comment])
      onCount?.(1)
      setReplyTo(null)
      return true
    } catch (e) {
      toast.error('Could not comment', errorText(e))
      return false
    }
  }
  const update = (c: Comment) => setComments((cur) => cur?.map((x) => (x.id === c.id ? c : x)) ?? cur)
  const drop = (id: number) => {
    setComments((cur) => cur?.filter((x) => x.id !== id) ?? cur)
    onCount?.(-1)
  }

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <CommentBox onSubmit={(b) => add(b)} autoFocus={autoFocus} placeholder="Write a comment…" />
      {error ? (
        <p className="text-sm text-state-error">{error}</p>
      ) : !comments ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : tree.length === 0 ? (
        <p className="py-2 text-center text-sm text-text-muted">No comments yet — start the conversation.</p>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {tree.map(({ c, replies }) => (
              <motion.li key={c.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <CommentRow c={c} onReply={() => setReplyTo(c)} onChange={update} onDelete={() => drop(c.id)} />
                {(replies.length > 0 || replyTo?.id === c.id || replies.some((r) => r.id === replyTo?.id)) && (
                  <ul className="mt-2 ml-5 space-y-2 border-l border-border pl-4 sm:ml-9">
                    {replies.map((r) => (
                      <li key={r.id}>
                        <CommentRow c={r} small onReply={() => setReplyTo(r)} onChange={update} onDelete={() => drop(r.id)} />
                      </li>
                    ))}
                    {(replyTo?.id === c.id || replies.some((r) => r.id === replyTo?.id)) && replyTo && (
                      <li>
                        <CommentBox
                          autoFocus
                          initial={replyTo.author.username !== c.author.username || replyTo.id !== c.id ? `@${replyTo.author.username} ` : ''}
                          placeholder={`Reply to ${displayName(replyTo.author)}…`}
                          onSubmit={(b) => add(b, replyTo)}
                          onCancel={() => setReplyTo(null)}
                        />
                      </li>
                    )}
                  </ul>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}

function CommentBox({
  onSubmit,
  onCancel,
  placeholder,
  autoFocus,
  initial = '',
}: {
  onSubmit: (body: string) => Promise<boolean>
  onCancel?: () => void
  placeholder: string
  autoFocus?: boolean
  initial?: string
}) {
  const { user } = useAuth()
  const [body, setBody] = useState(initial)
  const [busy, setBusy] = useState(false)
  const send = async () => {
    if (!body.trim() || busy) return
    setBusy(true)
    if (await onSubmit(body)) setBody('')
    setBusy(false)
  }
  return (
    <div className="flex items-start gap-2.5">
      <Avatar seed={user?.username} avatar={user?.avatar} src={(user as { avatar_url?: string } | null)?.avatar_url} name={user?.username} size="sm" ring={false} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 items-end gap-2 rounded-xl border border-border bg-bg-surface-2/60 px-3 py-1.5 focus-within:border-accent-brand/50">
        <textarea
          aria-label={placeholder}
          value={body}
          autoFocus={autoFocus}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
            if (e.key === 'Escape') onCancel?.()
          }}
          rows={1}
          maxLength={1000}
          placeholder={placeholder}
          className="max-h-40 min-h-7 flex-1 resize-none bg-transparent py-1 text-sm text-text-primary outline-none placeholder:text-text-muted [field-sizing:content]"
        />
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button size="sm" variant={body.trim() ? 'primary' : 'subtle'} disabled={!body.trim()} loading={busy} onClick={() => void send()}>
          Reply
        </Button>
      </div>
    </div>
  )
}

function CommentRow({ c, small, onReply, onChange, onDelete }: { c: Comment; small?: boolean; onReply: () => void; onChange: (c: Comment) => void; onDelete: () => void }) {
  const toast = useToast()
  const { me, canModerate } = useSocialPerms()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(c.body)
  const [reporting, setReporting] = useState(false)
  const mine = c.author.username === me

  if (c.tombstone && !canModerate) {
    return <p className="rounded-lg bg-bg-surface-2/60 px-3 py-2 text-sm text-text-muted italic">{c.tombstone === 'removed' ? 'Removed by a moderator' : 'Comment deleted'}</p>
  }

  const like = async () => {
    const next = { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) }
    onChange(next)
    try {
      if (next.liked) await api.put(`/api/social/comments/${c.id}/like`)
      else await api.delete(`/api/social/comments/${c.id}/like`)
    } catch (e) {
      onChange(c)
      toast.error('Could not like', errorText(e))
    }
  }
  const save = async () => {
    try {
      const r = await api.patch<{ body: string; edited_at: number }>(`/api/social/comments/${c.id}`, { body: draft })
      onChange({ ...c, body: r.body, edited_at: r.edited_at })
      setEditing(false)
    } catch (e) {
      toast.error('Could not save', errorText(e))
    }
  }
  const remove = async () => {
    try {
      await api.delete(`/api/social/comments/${c.id}`)
      onDelete()
    } catch (e) {
      toast.error('Could not delete', errorText(e))
    }
  }
  const moderate = async (action: 'remove' | 'restore') => {
    try {
      await api.post(`/api/admin/content/${action}`, { content_type: 'comment', content_id: String(c.id), reason: 'Removed from the feed' })
      onChange({ ...c, removed: action === 'remove' })
      toast.success(action === 'remove' ? 'Comment removed' : 'Comment restored')
    } catch (e) {
      toast.error('Moderation failed', errorText(e))
    }
  }

  return (
    <div className="group flex gap-2.5">
      <Link to={profilePath(c.author.username)} className="shrink-0">
        <Avatar seed={c.author.username} avatar={c.author.avatar} src={c.author.avatar_url} name={displayName(c.author)} size={small ? 'xs' : 'sm'} ring={false} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className={cn('rounded-2xl rounded-tl-md bg-bg-surface-2/70 px-3 py-2', c.removed && 'ring-1 ring-state-error/40')}>
          <div className="flex flex-wrap items-center gap-x-1.5 text-[13px]">
            <Link to={profilePath(c.author.username)} className="font-semibold text-text-primary hover:underline">
              {displayName(c.author)}
            </Link>
            <UserBadges username={c.author.username} role={c.author.role} verified={c.author.verified} />
            <span className="text-text-muted">· {timeAgo(c.created_at)}</span>
            {c.edited_at && <span className="text-text-muted">· edited</span>}
            {c.removed && <span className="rounded bg-state-error/12 px-1.5 text-[11px] font-medium text-state-error">Removed</span>}
          </div>
          {editing ? (
            <div className="mt-1.5 space-y-2">
              <textarea aria-label="Edit comment" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} rows={2} className="input-base w-full text-sm" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => void save()} disabled={!draft.trim()}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <RichText text={c.body || (c.tombstone ? `[${c.tombstone}]` : '')} className="mt-0.5 space-y-1 text-sm leading-relaxed break-words text-text-primary" />
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 pl-2 text-xs text-text-muted">
          <button type="button" onClick={() => void like()} aria-pressed={c.liked} className={cn('inline-flex cursor-pointer items-center gap-1 font-medium hover:text-state-error', c.liked && 'text-state-error')}>
            <Heart className={cn('size-3.5', c.liked && 'fill-current')} /> {c.likes > 0 && c.likes}
            <span className="sr-only">{c.liked ? 'Unlike' : 'Like'}</span>
          </button>
          <button type="button" onClick={onReply} className="cursor-pointer font-medium hover:text-text-primary">
            Reply
          </button>
          <Menu>
            <MenuTrigger asChild>
              <button type="button" aria-label="Comment options" className="cursor-pointer rounded p-0.5 opacity-70 hover:text-text-primary focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <MoreHorizontal className="size-4" />
              </button>
            </MenuTrigger>
            <MenuContent align="start">
              {mine && !c.removed && (
                <MenuItem icon={<Pencil />} onSelect={() => setEditing(true)}>
                  Edit
                </MenuItem>
              )}
              {mine && (
                <MenuItem icon={<Trash2 />} danger onSelect={() => void remove()}>
                  Delete
                </MenuItem>
              )}
              {!mine && (
                <MenuItem icon={<Flag />} onSelect={() => setReporting(true)}>
                  Report
                </MenuItem>
              )}
              {canModerate &&
                (c.removed ? (
                  <MenuItem icon={<RotateCcw />} onSelect={() => void moderate('restore')}>
                    Restore (moderator)
                  </MenuItem>
                ) : (
                  <MenuItem icon={<ShieldX />} danger onSelect={() => void moderate('remove')}>
                    Remove (moderator)
                  </MenuItem>
                ))}
            </MenuContent>
          </Menu>
        </div>
      </div>
      <ReportDialog open={reporting} onClose={() => setReporting(false)} contentType="comment" contentId={c.id} targetUser={c.author.username} />
    </div>
  )
}
