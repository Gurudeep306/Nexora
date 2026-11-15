import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BarChart3, Code2, ImagePlus, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { Avatar, Button, Popover, PopoverContent, PopoverTrigger, Select, useToast } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { Icon, type IconName } from '@/components/icon/Icon'
import { useAuth } from '@/context/AuthContext'
import { api, assetUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { CODE_LANGS } from './CodeBlock'
import { errorText, uploadImage } from './lib'
import type { Post, ShareCard, Shareables, SocialUser } from './types'
import { displayName } from './types'
import { ShareCardView } from './ShareCardView'

const MAX = 2000
const DRAFT_KEY = 'nexora:social-draft'

type ShareRef = { type: ShareCard['type']; id?: string | number; preview: ShareCard }

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}
function writeDraft(v: string) {
  try {
    if (v) localStorage.setItem(DRAFT_KEY, v)
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* private mode */
  }
}

/** Write a post: markdown text, images, a code snippet, a poll or a share card (and quotes). */
export function Composer({
  onPosted,
  quote,
  autoFocus,
  compact,
  placeholder = 'Share what you learned today…',
}: {
  onPosted: (post: Post) => void
  quote?: Post | null
  autoFocus?: boolean
  compact?: boolean
  placeholder?: string
}) {
  const { user } = useAuth()
  const toast = useToast()
  const [body, setBody] = useState(() => (quote ? '' : readDraft()))
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(0)
  const [code, setCode] = useState<{ lang: string; source: string } | null>(null)
  const [poll, setPoll] = useState<{ options: string[]; hours: number } | null>(null)
  const [share, setShare] = useState<ShareRef | null>(null)
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState(!!autoFocus)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [mention, setMention] = useState<{ q: string; start: number } | null>(null)
  const [mentionHits, setMentionHits] = useState<SocialUser[]>([])

  useEffect(() => {
    if (!quote) writeDraft(body)
  }, [body, quote])

  // Grow the textarea with its content.
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 420)}px`
  }, [body])

  // @mention suggestions.
  useEffect(() => {
    if (!mention || mention.q.length < 1) {
      setMentionHits([])
      return
    }
    const t = setTimeout(() => {
      api
        .get<{ users: SocialUser[] }>('/api/social/search', { query: { q: mention.q } })
        .then((r) => setMentionHits(r.users.slice(0, 5)))
        .catch(() => setMentionHits([]))
    }, 160)
    return () => clearTimeout(t)
  }, [mention])

  const onText = (v: string, caret: number) => {
    setBody(v)
    const m = /(^|\s)@([A-Za-z0-9_]{0,40})$/.exec(v.slice(0, caret))
    setMention(m ? { q: m[2], start: caret - m[2].length - 1 } : null)
  }
  const pickMention = (u: SocialUser) => {
    if (!mention) return
    const end = mention.start + 1 + mention.q.length
    const next = `${body.slice(0, mention.start)}@${u.username} ${body.slice(end)}`
    setBody(next)
    setMention(null)
    requestAnimationFrame(() => {
      const pos = mention.start + u.username.length + 2
      textRef.current?.focus()
      textRef.current?.setSelectionRange(pos, pos)
    })
  }

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return
    const room = 4 - images.length
    const list = Array.from(files).slice(0, room)
    if (files.length > room) toast.info('Up to 4 images per post')
    setUploading((n) => n + list.length)
    for (const f of list) {
      try {
        const url = await uploadImage(f)
        setImages((cur) => [...cur, url].slice(0, 4))
      } catch (e) {
        toast.error('Upload failed', e instanceof Error ? e.message : errorText(e))
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const empty = !body.trim() && !code?.source.trim() && !images.length && !share
  const pollInvalid = !!poll && (poll.options.filter((o) => o.trim()).length < 2 || !body.trim())
  const over = body.length > MAX
  const submit = async () => {
    if (empty || over || pollInvalid || uploading) return
    setBusy(true)
    try {
      const res = await api.post<{ post: Post }>('/api/social/posts', {
        body,
        code: code?.source.trim() ? code : undefined,
        images,
        poll: poll ? { options: poll.options.map((o) => o.trim()).filter(Boolean), hours: poll.hours } : undefined,
        share: share ? { type: share.type, id: share.id } : undefined,
        quote_of: quote?.id,
      })
      setBody('')
      setImages([])
      setCode(null)
      setPoll(null)
      setShare(null)
      writeDraft('')
      onPosted(res.post)
    } catch (e) {
      toast.error('Could not post', errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const expanded = focused || !!body || !!code || !!poll || !!images.length || !!share || !!quote
  const pct = Math.min(1, body.length / MAX)

  return (
    <div className={cn(!compact && 'card p-3.5 sm:p-4')}>
      <div className="flex gap-3">
        {!compact && <Avatar seed={user?.username} avatar={user?.avatar} src={(user as { avatar_url?: string } | null)?.avatar_url} name={user?.username} size="md" className="mt-0.5 hidden sm:inline-flex" />}
        <div className="relative min-w-0 flex-1">
          <label htmlFor="composer-text" className="sr-only">
            Post text
          </label>
          <textarea
            id="composer-text"
            ref={textRef}
            value={body}
            autoFocus={autoFocus}
            onFocus={() => setFocused(true)}
            onChange={(e) => onText(e.target.value, e.target.selectionStart)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
              if (e.key === 'Escape') setMention(null)
            }}
            placeholder={quote ? 'Add your take…' : placeholder}
            rows={expanded ? 3 : 1}
            className="w-full resize-none border-0 bg-transparent px-1 py-1.5 text-[15px] leading-relaxed text-text-primary outline-none placeholder:text-text-muted"
          />
          {mention && mentionHits.length > 0 && (
            <ul role="listbox" aria-label="Mention someone" className="pop-surface absolute top-full left-0 z-20 mt-1 w-64 p-1">
              {mentionHits.map((u) => (
                <li key={u.username}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickMention(u)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-bg-surface-3"
                  >
                    <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={displayName(u)} size="xs" ring={false} />
                    <span className="min-w-0 flex-1 truncate text-text-primary">{displayName(u)}</span>
                    <span className="truncate text-xs text-text-muted">@{u.username}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Attachments */}
          <AnimatePresence initial={false}>
            {(images.length > 0 || uploading > 0) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 grid grid-cols-4 gap-2">
                {images.map((src) => (
                  <div key={src} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={assetUrl(src)} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => setImages((cur) => cur.filter((x) => x !== src))}
                      className="absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full bg-bg-app/80 text-text-primary backdrop-blur transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {Array.from({ length: uploading }).map((_, i) => (
                  <div key={`u${i}`} className="grid aspect-square place-items-center rounded-lg border border-dashed border-border-strong">
                    <Loader2 className="size-4 animate-spin text-text-muted" />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {code && (
            <div className="mt-2 overflow-hidden rounded-xl border border-border bg-[var(--color-code-bg)]">
              <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
                <Select value={code.lang} onValueChange={(lang) => setCode({ ...code, lang })} aria-label="Code language" className="h-7 w-36 text-xs">
                  {CODE_LANGS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </Select>
                <button type="button" aria-label="Remove code" onClick={() => setCode(null)} className="cursor-pointer rounded-md p-1 text-text-muted hover:bg-bg-surface-3 hover:text-text-primary">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <textarea
                aria-label="Code"
                value={code.source}
                onChange={(e) => setCode({ ...code, source: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault()
                    const el = e.currentTarget
                    const s = el.selectionStart
                    const v = `${code.source.slice(0, s)}    ${code.source.slice(el.selectionEnd)}`
                    setCode({ ...code, source: v })
                    requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4))
                  }
                }}
                spellCheck={false}
                rows={6}
                placeholder="// paste your snippet"
                className="block w-full resize-y bg-transparent px-3 py-2 font-mono text-[12.5px] leading-[1.6] text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
          )}

          {poll && (
            <div className="mt-2 space-y-2 rounded-xl border border-border p-3">
              {poll.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={o}
                    maxLength={60}
                    aria-label={`Option ${i + 1}`}
                    placeholder={`Option ${i + 1}`}
                    onChange={(e) => setPoll({ ...poll, options: poll.options.map((x, j) => (j === i ? e.target.value : x)) })}
                    className="input-base h-9 flex-1"
                  />
                  {poll.options.length > 2 && (
                    <button type="button" aria-label="Remove option" onClick={() => setPoll({ ...poll, options: poll.options.filter((_, j) => j !== i) })} className="cursor-pointer rounded-md p-1.5 text-text-muted hover:text-text-primary">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {poll.options.length < 4 ? (
                  <Button variant="ghost" size="sm" onClick={() => setPoll({ ...poll, options: [...poll.options, ''] })}>
                    <Plus /> Add option
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <Select value={String(poll.hours)} onValueChange={(v) => setPoll({ ...poll, hours: Number(v) })} aria-label="Poll length" className="h-8 w-28 text-xs">
                    <option value="1">1 hour</option>
                    <option value="24">1 day</option>
                    <option value="72">3 days</option>
                    <option value="168">7 days</option>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => setPoll(null)}>
                    Remove poll
                  </Button>
                </div>
              </div>
              {!body.trim() && <p className="text-xs text-text-muted">Write your question in the post above.</p>}
            </div>
          )}

          {share && (
            <div className="relative mt-2">
              <ShareCardView card={share.preview} />
              <button type="button" aria-label="Remove share card" onClick={() => setShare(null)} className="absolute top-2 right-2 grid size-6 cursor-pointer place-items-center rounded-full bg-bg-app/80 text-text-primary">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {quote && (
            <div className="mt-2 rounded-xl border border-border px-3 py-2.5">
              <div className="flex items-center gap-2 text-[13px]">
                <Avatar seed={quote.author.username} avatar={quote.author.avatar} src={quote.author.avatar_url} name={displayName(quote.author)} size="xs" ring={false} />
                <span className="font-medium text-text-primary">{displayName(quote.author)}</span>
                <UserBadges username={quote.author.username} role={quote.author.role} verified={quote.author.verified} />
              </div>
              <p className="mt-1 line-clamp-3 text-sm text-text-secondary">{quote.body || (quote.code ? 'Code snippet' : quote.share?.title ?? 'Post')}</p>
            </div>
          )}

          {/* Toolbar */}
          {expanded && (
            <div className="mt-2 flex items-center gap-1 border-t border-border pt-2.5">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => void addImages(e.target.files).then(() => (e.target.value = ''))} />
              <ToolButton label="Add images" disabled={images.length >= 4 || !!poll} onClick={() => fileRef.current?.click()}>
                <ImagePlus />
              </ToolButton>
              <ToolButton label="Add code snippet" active={!!code} onClick={() => setCode(code ? null : { lang: 'cpp', source: '' })}>
                <Code2 />
              </ToolButton>
              <ToolButton label="Add poll" active={!!poll} disabled={!!images.length} onClick={() => setPoll(poll ? null : { options: ['', ''], hours: 24 })}>
                <BarChart3 />
              </ToolButton>
              {!quote && <SharePicker onPick={setShare} active={!!share} />}
              <div className="ml-auto flex items-center gap-3">
                {body.length > 0 && (
                  <span className={cn('flex items-center gap-1.5 text-xs tabular-nums', over ? 'text-state-error' : 'text-text-muted')} aria-live="polite">
                    <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden="true">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="var(--color-border)" strokeWidth="2.2" />
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke={over ? 'var(--color-state-error)' : pct > 0.9 ? 'var(--color-state-warning)' : 'var(--color-accent-brand)'}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeDasharray={`${pct * 50.3} 50.3`}
                      />
                    </svg>
                    {MAX - body.length <= 200 && MAX - body.length}
                  </span>
                )}
                <Button size="sm" onClick={() => void submit()} loading={busy} disabled={empty || over || pollInvalid || uploading > 0}>
                  {quote ? 'Quote' : 'Post'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolButton({ label, children, onClick, active, disabled }: { label: string; children: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid size-9 cursor-pointer place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-[18px]',
        active ? 'bg-accent-brand/12 text-accent-brand' : 'text-accent-brand/80 hover:bg-accent-brand/10 hover:text-accent-brand',
      )}
    >
      {children}
    </button>
  )
}

/** Pick an achievement to share: a solve, a GATE test, the streak, a lesson or a badge. */
function SharePicker({ onPick, active }: { onPick: (s: ShareRef) => void; active: boolean }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<Shareables | null>(null)
  useEffect(() => {
    if (open && !data) api.get<Shareables>('/api/social/shareables').then(setData).catch(() => setData({ solved: [], tests: [], lessons: [], achievements: [], streak: { current: 0, best: 0 } }))
  }, [open, data])
  const pick = (s: ShareRef) => {
    onPick(s)
    setOpen(false)
  }
  const empty = data && !data.solved.length && !data.tests.length && !data.lessons.length && !data.achievements.length && !data.streak.current
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Share an achievement"
          title="Share an achievement"
          className={cn(
            'grid size-9 cursor-pointer place-items-center rounded-lg transition-colors [&_svg]:size-[18px]',
            active ? 'bg-accent-brand/12 text-accent-brand' : 'text-accent-brand/80 hover:bg-accent-brand/10 hover:text-accent-brand',
          )}
        >
          <Sparkles />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(320px,calc(100vw-24px))] p-1.5">
        <p className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-text-muted uppercase">Share a milestone</p>
        {!data ? (
          <div className="grid place-items-center py-6">
            <Loader2 className="size-4 animate-spin text-text-muted" />
          </div>
        ) : empty ? (
          <p className="px-2 py-4 text-sm text-text-secondary">Solve a problem, finish a lesson or a GATE test — then show it off here.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {data.streak.current > 0 && (
              <PickRow
                emoji="flame"
                title={`${data.streak.current}-day streak`}
                sub={`Best ${data.streak.best} days`}
                onClick={() => pick({ type: 'streak', preview: { type: 'streak', title: `${data.streak.current}-day streak`, subtitle: `Best ${data.streak.best} days`, stat: `${data.streak.current}d` } })}
              />
            )}
            {data.solved.map((p) => (
              <PickRow
                key={`s${p.id}`}
                emoji="check"
                title={p.title}
                sub={`Solved · ${p.platform}${p.rating ? ` · ${p.rating}` : ''}`}
                onClick={() => pick({ type: 'solved', id: p.id, preview: { type: 'solved', title: p.title, subtitle: `${p.platform}${p.rating ? ` · ${p.rating}` : ''}`, stat: 'Solved' } })}
              />
            ))}
            {data.tests.map((t) => (
              <PickRow
                key={`t${t.id}`}
                emoji="gate"
                title={t.title}
                sub={`GATE test · ${t.score}${t.max ? ` / ${t.max}` : ''}`}
                onClick={() => pick({ type: 'gate_test', id: t.id, preview: { type: 'gate_test', title: t.title, subtitle: 'GATE mock test', stat: `${t.score}${t.max ? ` / ${t.max}` : ''}` } })}
              />
            ))}
            {data.lessons.map((l) => (
              <PickRow key={`l${l.id}`} emoji="learn" title={l.title} sub={`Lesson · ${l.category}`} onClick={() => pick({ type: 'lesson', id: l.id, preview: { type: 'lesson', title: l.title, subtitle: l.category, stat: 'Completed' } })} />
            ))}
            {data.achievements.map((a) => (
              <PickRow key={`a${a.id}`} emoji="trophy" title={a.title} sub="Achievement" onClick={() => pick({ type: 'achievement', id: a.id, preview: { type: 'achievement', title: a.title, stat: 'Unlocked', icon: a.icon } })} />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function PickRow({ title, sub, onClick, emoji }: { title: string; sub: string; onClick: () => void; emoji: string }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-bg-surface-3">
      <ShareGlyph kind={emoji} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-text-primary">{title}</span>
        <span className="block truncate text-xs text-text-muted">{sub}</span>
      </span>
    </button>
  )
}

function ShareGlyph({ kind }: { kind: string }) {
  const map: Record<string, { icon: IconName; cls: string }> = {
    flame: { icon: 'flame', cls: 'bg-state-warning/12 text-state-warning' },
    check: { icon: 'check-circle', cls: 'bg-state-success/12 text-state-success' },
    gate: { icon: 'gate', cls: 'bg-state-info/12 text-state-info' },
    learn: { icon: 'learn', cls: 'bg-accent-brand/12 text-accent-brand' },
    trophy: { icon: 'trophy', cls: 'bg-state-gold/12 text-state-gold' },
  }
  const m = map[kind] ?? map.check
  return (
    <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', m.cls)}>
      <Icon name={m.icon} className="size-4" />
    </span>
  )
}
