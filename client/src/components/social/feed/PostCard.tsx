import { forwardRef, memo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bookmark,
  Ban,
  Flag,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  Quote,
  Repeat2,
  RotateCcw,
  Share,
  ShieldX,
  Star,
  Trash2,
  VolumeX,
} from 'lucide-react'
import { Avatar, Button, ConfirmDialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Modal, useToast } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { api, assetUrl } from '@/lib/api'
import { cn, timeAgo } from '@/lib/utils'
import { CodeBlock } from './CodeBlock'
import { CommentsThread } from './CommentsThread'
import { Composer } from './Composer'
import { ReportDialog } from './ReportDialog'
import { RichText } from './RichText'
import { ShareCardView } from './ShareCardView'
import { compact, copyText, errorText, useSocialPerms } from './lib'
import type { Post, SocialUser } from './types'
import { displayName, postPath, profilePath } from './types'
import './social.css'

export interface PostCardProps {
  post: Post
  repostedBy?: SocialUser
  onChange: (post: Post) => void
  onRemove?: (id: number) => void
  /** Called with the new post when the viewer quotes this one. */
  onCreated?: (post: Post) => void
  /** Hide this author's posts locally (after mute / block). */
  onHideAuthor?: (username: string) => void
  expanded?: boolean
  pinned?: boolean
}

function PostCardImpl({ post, repostedBy, onChange, onRemove, onCreated, onHideAuthor, expanded, pinned }: PostCardProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const { me, canModerate, canFeature } = useSocialPerms()
  const [showComments, setShowComments] = useState(!!expanded)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(post.body)
  const [quoting, setQuoting] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [confirm, setConfirm] = useState<null | 'delete' | 'block'>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [burst, setBurst] = useState(0)
  const mine = post.author.username === me
  const url = `${window.location.origin}${postPath(post.id)}`

  const optimistic = async (next: Post, call: () => Promise<unknown>, fail: string) => {
    const prev = post
    onChange(next)
    try {
      await call()
    } catch (e) {
      onChange(prev)
      toast.error(fail, errorText(e))
    }
  }
  const like = () => {
    const liked = !post.me.liked
    if (liked) setBurst((n) => n + 1)
    void optimistic(
      { ...post, me: { ...post.me, liked }, counts: { ...post.counts, likes: post.counts.likes + (liked ? 1 : -1) } },
      () => (liked ? api.put(`/api/social/posts/${post.id}/like`) : api.delete(`/api/social/posts/${post.id}/like`)),
      'Could not like',
    )
  }
  const bookmark = () => {
    const on = !post.me.bookmarked
    void optimistic(
      { ...post, me: { ...post.me, bookmarked: on } },
      () => (on ? api.put(`/api/social/posts/${post.id}/bookmark`) : api.delete(`/api/social/posts/${post.id}/bookmark`)),
      'Could not save',
    )
    toast.success(on ? 'Saved to bookmarks' : 'Removed from bookmarks')
  }
  const repost = () => {
    const on = !post.me.reposted
    void optimistic(
      { ...post, me: { ...post.me, reposted: on }, counts: { ...post.counts, reposts: post.counts.reposts + (on ? 1 : -1) } },
      () => (on ? api.put(`/api/social/posts/${post.id}/repost`) : api.delete(`/api/social/posts/${post.id}/repost`)),
      'Could not repost',
    )
  }
  const share = async () => {
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ title: `${displayName(post.author)} on NexoraGuru`, url })
        return
      } catch {
        /* dismissed */
      }
    }
    if (await copyText(url)) toast.success('Link copied', url)
    else toast.info('Post link', url)
  }
  const vote = async (option: number) => {
    try {
      const r = await api.post<{ post: Post }>(`/api/social/posts/${post.id}/vote`, { option })
      onChange(r.post)
    } catch (e) {
      toast.error('Could not vote', errorText(e))
    }
  }
  const saveEdit = async () => {
    try {
      const r = await api.patch<{ post: Post }>(`/api/social/posts/${post.id}`, { body: draft })
      onChange(r.post)
      setEditing(false)
    } catch (e) {
      toast.error('Could not save', errorText(e))
    }
  }
  const remove = async () => {
    try {
      await api.delete(`/api/social/posts/${post.id}`)
      onRemove?.(post.id)
      toast.success('Post deleted')
    } catch (e) {
      toast.error('Could not delete', errorText(e))
    }
    setConfirm(null)
  }
  const pin = async () => {
    try {
      const s = await api.get<{ pinned?: { type: string; post?: Post; achievement?: { id: string } }[] }>(`/api/profiles/${encodeURIComponent(me)}/showcase`)
      const cur = (s.pinned ?? []).map((p) => (p.type === 'post' ? { type: 'post', id: p.post!.id } : { type: 'achievement', id: p.achievement!.id }))
      const already = cur.some((p) => p.type === 'post' && p.id === post.id)
      const next = already ? cur.filter((p) => !(p.type === 'post' && p.id === post.id)) : [{ type: 'post', id: post.id }, ...cur].slice(0, 3)
      await api.put('/api/profiles/me', { pinned: next })
      toast.success(already ? 'Unpinned from your profile' : 'Pinned to your profile', already ? undefined : 'Up to 3 pins — the oldest drops off.')
    } catch (e) {
      toast.error('Could not pin', errorText(e))
    }
  }
  const relate = async (kind: 'mute' | 'block') => {
    try {
      await api.put(`/api/social/${kind}/${encodeURIComponent(post.author.username)}`)
      onHideAuthor?.(post.author.username)
      toast.success(kind === 'mute' ? `Muted @${post.author.username}` : `Blocked @${post.author.username}`, kind === 'mute' ? "You won't see their posts in your feeds." : "They can't see or interact with you.")
    } catch (e) {
      toast.error('Something went wrong', errorText(e))
    }
    setConfirm(null)
  }
  const moderate = async (action: 'remove' | 'restore') => {
    try {
      await api.post(`/api/admin/content/${action}`, { content_type: 'post', content_id: String(post.id), reason: 'Removed from the feed' })
      if (action === 'remove') {
        onChange({ ...post, removed: true })
        toast.success('Post removed', 'Hidden for everyone but moderators.')
      } else {
        const r = await api.get<{ post: Post }>(`/api/social/posts/${post.id}`)
        onChange(r.post)
        toast.success('Post restored')
      }
    } catch (e) {
      toast.error('Moderation failed', errorText(e))
    }
  }
  const feature = async () => {
    try {
      await api.post(`/api/social/posts/${post.id}/feature`, { on: !post.featured })
      onChange({ ...post, featured: !post.featured })
      toast.success(post.featured ? 'Unpinned from Explore' : 'Pinned to the top of Explore')
    } catch (e) {
      toast.error('Could not update', errorText(e))
    }
  }

  const open = (e: React.MouseEvent) => {
    if (expanded) return
    const sel = window.getSelection()?.toString()
    if (sel) return
    if ((e.target as HTMLElement).closest('a,button,input,textarea,[role="menu"],[role="dialog"]')) return
    navigate(postPath(post.id))
  }

  return (
    <article
      onClick={open}
      aria-label={`Post by ${displayName(post.author)}`}
      className={cn(
        'so-post card group/post relative px-4 pt-3.5 pb-2 transition-colors sm:px-5',
        !expanded && 'cursor-pointer hover:border-border-strong',
        post.removed && 'border-state-error/40',
        post.featured && 'border-accent-brand/35',
      )}
    >
      {(repostedBy || post.featured || pinned || post.removed) && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[52px] text-xs font-medium text-text-muted">
          {pinned && (
            <span className="inline-flex items-center gap-1.5">
              <Pin className="size-3.5" /> Pinned
            </span>
          )}
          {post.featured && (
            <span className="inline-flex items-center gap-1.5 text-accent-brand">
              <Star className="size-3.5 fill-current" /> Featured by NexoraGuru
            </span>
          )}
          {repostedBy && (
            <Link to={profilePath(repostedBy.username)} className="inline-flex items-center gap-1.5 hover:underline">
              <Repeat2 className="size-3.5" /> {repostedBy.username === me ? 'You' : displayName(repostedBy)} reposted
            </Link>
          )}
          {post.removed && (
            <span className="inline-flex items-center gap-1.5 text-state-error">
              <ShieldX className="size-3.5" /> Removed — only moderators can see this
            </span>
          )}
        </div>
      )}
      <div className="flex gap-3">
        <Link to={profilePath(post.author.username)} className="shrink-0" aria-label={`${displayName(post.author)}'s profile`}>
          <Avatar seed={post.author.username} avatar={post.author.avatar} src={post.author.avatar_url} name={displayName(post.author)} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <header className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
              <Link to={profilePath(post.author.username)} className="truncate font-semibold text-text-primary hover:underline">
                {displayName(post.author)}
              </Link>
              <UserBadges username={post.author.username} role={post.author.role} verified={post.author.verified} />
              <span className="truncate text-text-muted">@{post.author.username}</span>
              <span className="text-text-muted" aria-hidden="true">
                ·
              </span>
              <Link to={postPath(post.id)} className="text-text-muted hover:underline">
                <time dateTime={new Date(post.created_at).toISOString()} title={new Date(post.created_at).toLocaleString()}>
                  {timeAgo(post.created_at)}
                </time>
              </Link>
              {post.edited_at && (
                <span className="text-text-muted" title={`Edited ${new Date(post.edited_at).toLocaleString()}`}>
                  · edited
                </span>
              )}
            </div>
            <Menu>
              <MenuTrigger asChild>
                <button type="button" aria-label="Post options" className="-mt-1 -mr-2 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-text-muted transition-colors hover:bg-accent-brand/10 hover:text-accent-brand">
                  <MoreHorizontal className="size-[18px]" />
                </button>
              </MenuTrigger>
              <MenuContent>
                <MenuItem icon={<Link2 />} onSelect={() => void copyText(url).then((ok) => ok && toast.success('Link copied'))}>
                  Copy link
                </MenuItem>
                {mine && !post.removed && (
                  <>
                    <MenuItem icon={<Pencil />} onSelect={() => setEditing(true)}>
                      Edit post
                    </MenuItem>
                    <MenuItem icon={<Pin />} onSelect={() => void pin()}>
                      Pin / unpin on profile
                    </MenuItem>
                  </>
                )}
                {mine && (
                  <MenuItem icon={<Trash2 />} danger onSelect={() => setConfirm('delete')}>
                    Delete post
                  </MenuItem>
                )}
                {!mine && (
                  <>
                    <MenuItem icon={<VolumeX />} onSelect={() => void relate('mute')}>
                      Mute @{post.author.username}
                    </MenuItem>
                    <MenuItem icon={<Ban />} onSelect={() => setConfirm('block')}>
                      Block @{post.author.username}
                    </MenuItem>
                    <MenuItem icon={<Flag />} danger onSelect={() => setReporting(true)}>
                      Report post
                    </MenuItem>
                  </>
                )}
                {(canModerate || canFeature) && <MenuSeparator />}
                {canFeature && !post.removed && (
                  <MenuItem icon={<Star />} onSelect={() => void feature()}>
                    {post.featured ? 'Unpin from Explore' : 'Pin to top of Explore'}
                  </MenuItem>
                )}
                {canModerate &&
                  (post.removed ? (
                    <MenuItem icon={<RotateCcw />} onSelect={() => void moderate('restore')}>
                      Restore post
                    </MenuItem>
                  ) : (
                    <MenuItem icon={<ShieldX />} danger onSelect={() => void moderate('remove')}>
                      Remove post
                    </MenuItem>
                  ))}
              </MenuContent>
            </Menu>
          </header>

          <div className="mt-1 space-y-3">
            {editing ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <textarea aria-label="Edit post" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} rows={4} className="input-base w-full text-[15px]" autoFocus />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => void saveEdit()}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              post.body && <RichText text={post.body} className="so-body space-y-2 break-words text-[15px] leading-relaxed text-text-primary" />
            )}
            {post.code && <CodeBlock lang={post.code.lang} source={post.code.source} maxLines={expanded ? 200 : 14} />}
            {post.images.length > 0 && <ImageGrid images={post.images} onOpen={setLightbox} />}
            {post.poll && <PollView poll={post.poll} onVote={(i) => void vote(i)} />}
            {post.share && <ShareCardView card={post.share} />}
            {post.quote && <QuotedPost quote={post.quote} />}
          </div>

          <footer className="mt-1.5 -ml-2 flex items-center justify-between sm:max-w-md">
            <Action label="Comment" count={post.counts.comments} onClick={() => setShowComments((v) => !v)} tone="info" active={showComments}>
              <MessageCircle />
            </Action>
            <Menu>
              <MenuTrigger asChild>
                <Action label={post.me.reposted ? 'Undo repost' : 'Repost'} count={post.counts.reposts} tone="success" active={post.me.reposted}>
                  <Repeat2 />
                </Action>
              </MenuTrigger>
              <MenuContent align="start">
                <MenuItem icon={<Repeat2 />} onSelect={repost}>
                  {post.me.reposted ? 'Undo repost' : 'Repost'}
                </MenuItem>
                <MenuItem icon={<Quote />} onSelect={() => setQuoting(true)}>
                  Quote
                </MenuItem>
              </MenuContent>
            </Menu>
            <span className="relative">
              <Action label={post.me.liked ? 'Unlike' : 'Like'} count={post.counts.likes} onClick={like} tone="error" active={post.me.liked}>
                <motion.span key={`${post.me.liked}`} initial={{ scale: post.me.liked ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 14 }} className="grid">
                  <Heart className={cn(post.me.liked && 'fill-current')} />
                </motion.span>
              </Action>
              {burst > 0 && post.me.liked && <Burst key={burst} />}
            </span>
            <Action label={post.me.bookmarked ? 'Remove bookmark' : 'Bookmark'} onClick={bookmark} tone="brand" active={post.me.bookmarked}>
              <Bookmark className={cn(post.me.bookmarked && 'fill-current')} />
            </Action>
            <Action label="Share" onClick={() => void share()} tone="brand">
              <Share />
            </Action>
          </footer>

          <AnimatePresence initial={false}>
            {showComments && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="border-t border-border pt-3 pb-2">
                  <CommentsThread
                    postId={post.id}
                    autoFocus={!expanded}
                    onCount={(d) => onChange({ ...post, counts: { ...post.counts, comments: Math.max(0, post.counts.comments + d) } })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal open={quoting} onClose={() => setQuoting(false)} title="Quote post" size="md">
        <Composer
          compact
          autoFocus
          quote={post}
          onPosted={(p) => {
            setQuoting(false)
            onChange({ ...post, counts: { ...post.counts, reposts: post.counts.reposts + 1 } })
            onCreated?.(p)
            toast.success('Quoted')
          }}
        />
      </Modal>
      <ReportDialog open={reporting} onClose={() => setReporting(false)} contentType="post" contentId={post.id} targetUser={post.author.username} />
      <ConfirmDialog
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => void remove()}
        title="Delete post?"
        message="This can't be undone. Likes, comments and reposts go with it."
        confirmLabel="Delete"
        danger
      />
      <ConfirmDialog
        open={confirm === 'block'}
        onClose={() => setConfirm(null)}
        onConfirm={() => void relate('block')}
        title={`Block @${post.author.username}?`}
        message="They won't be able to see your posts, follow you or interact with you, and you won't see theirs. They aren't told."
        confirmLabel="Block"
        danger
      />
      {lightbox != null && <Lightbox images={post.images} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />}
    </article>
  )
}

export const PostCard = memo(PostCardImpl)

const TONES = {
  info: 'hover:text-state-info hover:bg-state-info/10',
  success: 'hover:text-state-success hover:bg-state-success/10',
  error: 'hover:text-state-error hover:bg-state-error/10',
  brand: 'hover:text-accent-brand hover:bg-accent-brand/10',
}
const ACTIVE = { info: 'text-state-info', success: 'text-state-success', error: 'text-state-error', brand: 'text-accent-brand' }

/** A quiet reaction button. Forwards its ref and extra props so it can be a menu trigger itself. */
const Action = forwardRef<
  HTMLButtonElement,
  {
    label: string
    count?: number
    onClick?: () => void
    children: React.ReactNode
    tone: keyof typeof TONES
    active?: boolean
  } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'>
>(function Action({ label, count, onClick, children, tone, active, className, ...rest }, ref) {
  const slotClick = (rest as { onClick?: React.MouseEventHandler<HTMLButtonElement> }).onClick
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      aria-label={count ? `${label} (${count})` : label}
      aria-pressed={rest['aria-haspopup'] ? undefined : active}
      onClick={(e) => {
        e.stopPropagation()
        slotClick?.(e)
        onClick?.()
      }}
      className={cn('so-act group/act inline-flex h-9 min-w-9 cursor-pointer items-center gap-1 rounded-full px-2 text-[13px] text-text-muted transition-colors [&_svg]:size-[18px]', TONES[tone], active && ACTIVE[tone], className)}
    >
      {children}
      {count != null && count > 0 && <span className="tabular-nums">{compact(count)}</span>}
    </button>
  )
})

function Burst() {
  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    return { dx: `${Math.cos(a) * 18}px`, dy: `${Math.sin(a) * 18}px` }
  })
  return (
    <span className="pointer-events-none absolute top-[18px] left-[17px]" aria-hidden="true">
      {dots.map((d, i) => (
        <span key={i} className="ng-burst-dot" style={{ '--dx': d.dx, '--dy': d.dy } as React.CSSProperties} />
      ))}
    </span>
  )
}

function ImageGrid({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  const n = images.length
  return (
    <div className={cn('grid gap-1 overflow-hidden rounded-xl border border-border', n === 1 ? 'grid-cols-1' : 'grid-cols-2', n > 2 && 'aspect-[16/10]')}>
      {images.map((src, i) => (
        <button
          key={src}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(i)
          }}
          aria-label={`Open image ${i + 1} of ${n}`}
          className={cn('relative block cursor-zoom-in overflow-hidden bg-bg-surface-2', n === 3 && i === 0 && 'row-span-2', n === 2 && 'aspect-[4/5]')}
        >
          <img src={assetUrl(src)} alt="" loading="lazy" decoding="async" className={cn('size-full object-cover transition-transform duration-300 hover:scale-[1.02]', n === 1 && 'max-h-[520px]')} />
        </button>
      ))}
    </div>
  )
}

function Lightbox({ images, index, onClose, onIndex }: { images: string[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  return (
    <Modal open onClose={onClose} size="xl" className="bg-bg-app/95">
      <div
        className="relative grid place-items-center"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onIndex((index + 1) % images.length)
          if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length)
        }}
      >
        <img src={assetUrl(images[index])} alt={`Image ${index + 1} of ${images.length}`} className="max-h-[75vh] w-auto rounded-lg object-contain" />
        {images.length > 1 && (
          <div className="mt-3 flex gap-2">
            {images.map((src, i) => (
              <button key={src} type="button" aria-label={`Image ${i + 1}`} onClick={() => onIndex(i)} className={cn('size-2.5 cursor-pointer rounded-full', i === index ? 'bg-accent-brand' : 'bg-border-strong')} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function PollView({ poll, onVote }: { poll: NonNullable<Post['poll']>; onVote: (i: number) => void }) {
  const voted = poll.my_vote != null
  const showResults = voted || poll.closed
  const max = Math.max(...poll.options.map((o) => o.votes), 0)
  const left = poll.closes_at ? poll.closes_at - Date.now() : 0
  const leftText = poll.closed ? 'Final results' : left > 86400000 ? `${Math.ceil(left / 86400000)} days left` : left > 3600000 ? `${Math.ceil(left / 3600000)} hours left` : `${Math.max(1, Math.ceil(left / 60000))} minutes left`
  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {poll.options.map((o, i) => {
        const pct = poll.total ? Math.round((o.votes / poll.total) * 100) : 0
        return showResults ? (
          <div key={i} className="relative overflow-hidden rounded-lg border border-border px-3 py-2 text-sm">
            <motion.span
              className={cn('absolute inset-y-0 left-0', o.votes === max && max > 0 ? 'bg-accent-brand/20' : 'bg-bg-surface-3')}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.2, 0.7, 0.3, 1] }}
            />
            <span className="relative flex items-center justify-between gap-3">
              <span className={cn('text-text-primary', o.votes === max && max > 0 && 'font-semibold')}>
                {o.text} {poll.my_vote === i && <span className="text-accent-brand">✓</span>}
              </span>
              <span className="font-mono text-xs text-text-secondary tabular-nums">{pct}%</span>
            </span>
          </div>
        ) : (
          <button key={i} type="button" onClick={() => onVote(i)} className="block w-full cursor-pointer rounded-lg border border-accent-brand/35 px-3 py-2 text-left text-sm font-medium text-accent-brand transition-colors hover:bg-accent-brand/10">
            {o.text}
          </button>
        )
      })}
      <p className="text-xs text-text-muted">
        {poll.total} {poll.total === 1 ? 'vote' : 'votes'} · {leftText}
      </p>
    </div>
  )
}

function QuotedPost({ quote }: { quote: NonNullable<Post['quote']> }) {
  if ('unavailable' in quote && quote.unavailable) {
    return <div className="rounded-xl border border-border px-3 py-3 text-sm text-text-muted">This post is unavailable.</div>
  }
  const q = quote as Post
  return (
    <Link to={postPath(q.id)} onClick={(e) => e.stopPropagation()} className="block rounded-xl border border-border px-3.5 py-2.5 transition-colors hover:bg-bg-surface-2/60">
      <div className="flex items-center gap-1.5 text-[13px]">
        <Avatar seed={q.author.username} avatar={q.author.avatar} src={q.author.avatar_url} name={displayName(q.author)} size="xs" ring={false} />
        <span className="font-semibold text-text-primary">{displayName(q.author)}</span>
        <UserBadges username={q.author.username} role={q.author.role} verified={q.author.verified} />
        <span className="text-text-muted">· {timeAgo(q.created_at)}</span>
      </div>
      {q.body && <RichText text={q.body.length > 280 ? `${q.body.slice(0, 280)}…` : q.body} className="mt-1 space-y-1 text-sm text-text-primary" />}
      {q.code && <p className="mt-1 font-mono text-xs text-text-muted">{'</>'} {q.code.lang} snippet</p>}
      {q.images.length > 0 && (
        <div className="mt-2 flex gap-1">
          {q.images.slice(0, 4).map((src) => (
            <img key={src} src={assetUrl(src)} alt="" className="size-14 rounded-md object-cover" loading="lazy" />
          ))}
        </div>
      )}
      {q.share && <p className="mt-1 text-xs text-text-secondary">★ {q.share.title}</p>}
    </Link>
  )
}

