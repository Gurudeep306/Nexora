import { memo, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  CornerUpLeft,
  Download,
  FileText,
  Flag,
  Forward,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  RotateCw,
  SmilePlus,
  Trash2,
} from 'lucide-react'
import { Avatar } from '@/components/ui'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Menu'
import { assetUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { CodeBlock, RichText } from './RichText'
import { clock, fileSize, nameOf, quoteText, type Conversation, type Message, type People, type ShareCard } from './types'

const QUICK = ['👍', '❤️', '😂', '🔥', '🎉', '🤔']
const MORE = ['👏', '🙏', '💯', '✅', '❌', '😮', '😢', '😡', '🚀', '🧠', '👀', '💡', '📌', '⏰', '🤝', '🙌', '😅', '🥳']

export interface MessageActions {
  reply: (m: Message) => void
  edit: (m: Message) => void
  react: (m: Message, emoji: string) => void
  remove: (m: Message) => void
  pin: (m: Message) => void
  save: (m: Message) => void
  forward: (m: Message) => void
  report: (m: Message) => void
  retry: (m: Message) => void
  vote: (m: Message, options: number[]) => void
  closePoll: (m: Message) => void
  jump: (id: number) => void
  image: (url: string, alt: string) => void
}

const VERDICT: Record<string, string> = { AC: 'Accepted', WA: 'Wrong answer', TLE: 'Time limit', RE: 'Runtime error', CE: 'Compile error', MLE: 'Memory limit' }
const PLATFORM: Record<string, string> = { codeforces: 'Codeforces', atcoder: 'AtCoder', codechef: 'CodeChef', leetcode: 'LeetCode', nexora: 'NexoraGuru', cses: 'CSES', spoj: 'SPOJ', euler: 'Project Euler', dmoj: 'DMOJ', timus: 'Timus', kattis: 'Kattis', uva: 'UVa', learn: 'NexoraGuru Learn' }

function ShareView({ card }: { card: ShareCard }) {
  const [showCode, setShowCode] = useState(false)
  const kicker =
    card.type === 'problem' ? `Problem · ${PLATFORM[card.platform ?? ''] ?? card.platform ?? ''}${card.rating ? ` · ${card.rating}` : ''}`
      : card.type === 'submission' ? `Solution · ${card.language ?? ''} · ${VERDICT[card.verdict ?? ''] ?? card.verdict ?? ''}${card.timeMs ? ` · ${card.timeMs} ms` : ''}`
        : card.type === 'contest' ? `Contest${card.start ? ` · ${new Date(card.start).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}${card.durationMins ? ` · ${card.durationMins} min` : ''}`
          : card.type === 'gate' ? `GATE ${card.exam ?? ''} ${card.year ?? ''}${card.marks ? ` · ${card.marks} ${card.marks === 1 ? 'mark' : 'marks'}` : ''}`
            : 'Solve room'
  const action = card.type === 'problem' ? 'Solve it' : card.type === 'submission' ? 'Open the problem' : card.type === 'contest' ? 'Open contests' : card.type === 'gate' ? 'Try it' : 'Join the room'
  return (
    <div className="chat-card" data-type={card.type}>
      <p className="chat-card-kicker">{kicker}</p>
      <p className="chat-card-title">{card.title}</p>
      {card.type === 'contest' && (card.problems || card.code) && (
        <p className="chat-card-meta">
          {card.problems ? `${card.problems} ${card.problems === 1 ? 'problem' : 'problems'}` : ''}
          {card.code ? `${card.problems ? ' · ' : ''}code ${card.code}` : ''}
        </p>
      )}
      {card.type === 'room' && card.problem && <p className="chat-card-meta">On {card.problem}</p>}
      <div className="chat-card-actions">
        <Link to={card.link} className="chat-card-link">
          {action}
        </Link>
        {card.code && card.type === 'submission' && (
          <button type="button" className="chat-card-link" aria-expanded={showCode} onClick={() => setShowCode((v) => !v)}>
            {showCode ? 'Hide the code' : 'Show the code'}
          </button>
        )}
      </div>
      {showCode && card.code && <CodeBlock code={card.code} lang={card.language ?? ''} />}
    </div>
  )
}

function PollView({ m, me, actions, canClose }: { m: Message; me: string; actions: MessageActions; canClose: boolean }) {
  const p = m.poll!
  const mine = p.options.filter((o) => o.voters.includes(me)).map((o) => o.id)
  const voters = new Set(p.options.flatMap((o) => o.voters))
  const total = voters.size
  const toggle = (id: number) => {
    if (p.closed) return
    const next = p.multi ? (mine.includes(id) ? mine.filter((x) => x !== id) : [...mine, id]) : mine.includes(id) ? [] : [id]
    actions.vote(m, next)
  }
  return (
    <fieldset className="chat-poll">
      <legend className="chat-poll-q">{p.question}</legend>
      <p className="chat-poll-hint">
        {p.closed ? 'Closed' : p.multi ? 'Choose any' : 'Choose one'} · {total} {total === 1 ? 'vote' : 'votes'}
      </p>
      {p.options.map((o) => {
        const share = total ? Math.round((o.voters.length / total) * 100) : 0
        const on = mine.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            className={cn('chat-poll-opt', on && 'is-on')}
            aria-pressed={on}
            disabled={p.closed || !!m.pending}
            onClick={() => toggle(o.id)}
            title={o.voters.length ? o.voters.join(', ') : 'No votes yet'}
          >
            <span className="chat-poll-bar" style={{ width: `${share}%` }} aria-hidden="true" />
            <span className="relative flex w-full items-center justify-between gap-3">
              <span>{o.text}</span>
              <span className="nx-num text-text-secondary">{share}%</span>
            </span>
          </button>
        )
      })}
      {canClose && !p.closed && (
        <button type="button" className="chat-link-btn mt-1" onClick={() => actions.closePoll(m)}>
          Close the poll
        </button>
      )}
    </fieldset>
  )
}

function AttachmentView({ a, actions }: { a: NonNullable<Message['attachment']>; actions: MessageActions }) {
  const url = assetUrl(a.url)
  if (a.kind === 'image')
    return (
      <button type="button" className="chat-image" onClick={() => actions.image(url, a.name)} aria-label={`Open picture ${a.name}`}>
        <img src={url} alt={a.name} loading="lazy" width={a.width} height={a.height} />
      </button>
    )
  if (a.kind === 'audio')
    return (
      <div className="chat-audio">
        <audio controls preload="metadata" src={url} aria-label={`Voice note${a.durationSec ? `, ${a.durationSec} seconds` : ''}`} />
      </div>
    )
  return (
    <a className="chat-file" href={url} download={a.name} target="_blank" rel="noopener noreferrer">
      <FileText className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block truncate font-medium text-text-primary">{a.name}</span>
        <span className="block text-[11.5px] text-text-muted">{fileSize(a.size)}</span>
      </span>
      <Download className="ml-auto size-4 shrink-0 text-text-muted" aria-hidden="true" />
    </a>
  )
}

function EmojiPicker({ onPick, label }: { onPick: (e: string) => void; label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="chat-act" aria-label={label}>
          <SmilePlus className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="chat-emoji-pop" align="end">
        <div className="grid grid-cols-6 gap-1" role="group" aria-label="Emoji">
          {[...QUICK, ...MORE].map((e) => (
            <button key={e} type="button" className="chat-emoji" onClick={() => onPick(e)} aria-label={`React ${e}`}>
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const MessageItem = memo(function MessageItem({
  m,
  me,
  people,
  conv,
  grouped,
  status,
  saved,
  highlight,
  actions,
}: {
  m: Message
  me: string
  people: People
  conv: Conversation
  grouped: boolean
  status?: string | null
  saved: boolean
  highlight: boolean
  actions: MessageActions
}) {
  const [picked, setPicked] = useState(false)
  const rowRef = useRef<HTMLLIElement>(null)
  // A tap anywhere else puts the actions away again.
  useEffect(() => {
    if (!picked) return
    const away = (e: PointerEvent) => {
      if (!rowRef.current?.contains(e.target as Node)) setPicked(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [picked])
  if (m.kind === 'system') {
    return (
      <li className="chat-system" id={`msg-${m.id}`}>
        <span>
          {m.username === me ? 'You' : nameOf(people, m.username)} {m.body}
        </span>
      </li>
    )
  }
  const mine = m.username === me
  const manager = conv.kind === 'group' && (conv.role === 'owner' || conv.role === 'admin')
  const canPin = conv.kind === 'dm' || manager
  const canDelete = mine || manager
  const reacted = Object.entries(m.reactions)
  const live = !m.pending && !m.failed && !m.deleted
  // On a touch screen the actions show for the message you tap, not all at once.
  const pick = (e: MouseEvent<HTMLLIElement>) => {
    if ((e.target as HTMLElement).closest('a, button, input, textarea, audio, video, pre, [role="menu"]')) return
    setPicked((v) => !v)
  }
  return (
    <li ref={rowRef} id={`msg-${m.id}`} onClick={pick} className={cn('chat-msg', mine && 'is-mine', grouped && 'is-grouped', highlight && 'is-highlight', picked && 'is-picked')}>
      {!mine && conv.kind === 'group' && (grouped ? <span className="chat-avatar-gap" aria-hidden="true" /> : <Avatar size="sm" seed={m.username} avatar={people[m.username]?.avatar} src={people[m.username]?.avatar_url} name={nameOf(people, m.username)} className="chat-avatar" />)}
      <div className="chat-col">
        {!mine && conv.kind === 'group' && !grouped && <p className="chat-author">{nameOf(people, m.username)}</p>}
        <div className={cn('chat-bubble', m.deleted && 'is-deleted', m.failed && 'is-failed')}>
          {m.forwarded && !m.deleted && (
            <p className="chat-forwarded">
              <Forward className="size-3" aria-hidden="true" /> Forwarded
            </p>
          )}
          {m.replyTo && !m.deleted && (
            <button type="button" className="chat-reply-quote" onClick={() => m.replyTo && !m.replyTo.deleted && actions.jump(m.replyTo.id)}>
              <span className="font-medium">{m.replyTo.deleted ? 'A deleted message' : m.replyTo.username === me ? 'You' : nameOf(people, m.replyTo.username)}</span>
              {!m.replyTo.deleted && <span className="block truncate">{quoteText(m.replyTo.body) || (m.replyTo.attachment ? 'Attachment' : m.replyTo.share ? 'Shared card' : m.replyTo.poll ? `Poll: ${m.replyTo.poll}` : '')}</span>}
            </button>
          )}
          {m.deleted ? (
            <p className="chat-p italic text-text-muted">This message was deleted</p>
          ) : (
            <>
              {m.attachment && <AttachmentView a={m.attachment} actions={actions} />}
              {m.poll ? <PollView m={m} me={me} actions={actions} canClose={mine || manager} /> : m.body && <RichText text={m.body} me={me} />}
              {m.share && <ShareView card={m.share} />}
            </>
          )}
          <p className="chat-meta">
            {m.pinnedAt && <Pin className="size-3" aria-label="Pinned" />}
            {m.editedAt && !m.deleted && <span>edited</span>}
            <time dateTime={m.createdAt} title={new Date(m.createdAt).toLocaleString()}>
              {clock(m.createdAt)}
            </time>
          </p>
        </div>
        {reacted.length > 0 && (
          <div className="chat-reactions">
            {reacted.map(([e, who]) => (
              <button
                key={e}
                type="button"
                className={cn('chat-reaction', who.includes(me) && 'is-mine')}
                aria-pressed={who.includes(me)}
                title={who.map((u) => (u === me ? 'You' : nameOf(people, u))).join(', ')}
                aria-label={`${e} ${who.length}: ${who.map((u) => (u === me ? 'you' : nameOf(people, u))).join(', ')}`}
                onClick={() => actions.react(m, e)}
              >
                <span aria-hidden="true">{e}</span>
                <span className="nx-num">{who.length}</span>
              </button>
            ))}
          </div>
        )}
        {m.failed ? (
          <p className="chat-status is-failed" role="alert">
            Not sent: {m.failed}{' '}
            <button type="button" className="chat-link-btn" onClick={() => actions.retry(m)}>
              <RotateCw className="size-3" aria-hidden="true" /> Retry
            </button>
          </p>
        ) : m.pending ? (
          <p className="chat-status">Sending…</p>
        ) : status ? (
          <p className="chat-status">{status}</p>
        ) : null}
        {live && (
          <div className="chat-actions" role="toolbar" aria-label="Message actions">
            {QUICK.slice(0, 3).map((e) => (
              <button key={e} type="button" className="chat-act chat-act-emoji" aria-label={`React ${e}`} onClick={() => actions.react(m, e)}>
                {e}
              </button>
            ))}
            <EmojiPicker label="More reactions" onPick={(e) => actions.react(m, e)} />
            <button type="button" className="chat-act" aria-label="Reply" onClick={() => actions.reply(m)}>
              <CornerUpLeft className="size-4" aria-hidden="true" />
            </button>
            <Menu>
              <MenuTrigger asChild>
                <button type="button" className="chat-act" aria-label="More">
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </button>
              </MenuTrigger>
              <MenuContent>
                {m.body && (
                  <MenuItem onSelect={() => void navigator.clipboard?.writeText(m.body)}>
                    <Copy className="size-4" /> Copy text
                  </MenuItem>
                )}
                {mine && m.kind === 'text' && (
                  <MenuItem onSelect={() => actions.edit(m)}>
                    <Pencil className="size-4" /> Edit
                  </MenuItem>
                )}
                {m.kind === 'text' && (
                  <MenuItem onSelect={() => actions.forward(m)}>
                    <Forward className="size-4" /> Forward
                  </MenuItem>
                )}
                <MenuItem onSelect={() => actions.save(m)}>
                  {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />} {saved ? 'Remove from saved' : 'Save'}
                </MenuItem>
                {canPin && (
                  <MenuItem onSelect={() => actions.pin(m)}>
                    {m.pinnedAt ? <PinOff className="size-4" /> : <Pin className="size-4" />} {m.pinnedAt ? 'Unpin' : 'Pin'}
                  </MenuItem>
                )}
                {(!mine || canDelete) && <MenuSeparator />}
                {!mine && (
                  <MenuItem onSelect={() => actions.report(m)}>
                    <Flag className="size-4" /> Report
                  </MenuItem>
                )}
                {canDelete && (
                  <MenuItem onSelect={() => actions.remove(m)} className="text-state-error">
                    <Trash2 className="size-4" /> Delete
                  </MenuItem>
                )}
              </MenuContent>
            </Menu>
          </div>
        )}
      </div>
    </li>
  )
})
