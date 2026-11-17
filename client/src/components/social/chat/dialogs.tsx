import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, Link2, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Avatar, Button, Modal, SearchInput, useToast } from '@/components/ui'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/Menu'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { MessageItem, type MessageActions } from './MessageItem'
import { listTime, nameOf, titleOf, type Conversation, type Message, type People, type Person, type Role, type ShareType } from './types'

const err = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback)

/* ── people search, shared by "new message" and "add people" ── */

function PeoplePicker({ me, picked, setPicked, exclude = [] }: { me: string; picked: Person[]; setPicked: (p: Person[]) => void; exclude?: string[] }) {
  const [q, setQ] = useState('')
  const found = useApi(() => (q.trim().length >= 2 ? api.get<{ users: Person[] }>(`/api/user/search?q=${encodeURIComponent(q.trim())}`) : Promise.resolve({ users: [] })), [q])
  const users = (found.data?.users ?? []).filter((u) => u.username !== me && !exclude.includes(u.username))
  return (
    <div className="space-y-3">
      {picked.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Chosen">
          {picked.map((p) => (
            <li key={p.username} className="chat-chip">
              {p.display_name || p.username}
              <button type="button" aria-label={`Remove ${p.username}`} onClick={() => setPicked(picked.filter((x) => x.username !== p.username))}>
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search people by name" aria-label="Search people" autoFocus />
      <ul className="chat-pick-list" aria-label="People">
        {q.trim().length < 2 && <li className="px-1 py-2 text-[13px] text-text-muted">Type two letters of a name.</li>}
        {q.trim().length >= 2 && !found.loading && users.length === 0 && <li className="px-1 py-2 text-[13px] text-text-muted">Nobody by that name.</li>}
        {users.map((u) => {
          const on = picked.some((p) => p.username === u.username)
          return (
            <li key={u.username}>
              <button type="button" className={cn('chat-pick', on && 'is-on')} aria-pressed={on} onClick={() => setPicked(on ? picked.filter((p) => p.username !== u.username) : [...picked, u])}>
                <Avatar size="sm" seed={u.username} avatar={u.avatar} src={u.avatar_url} name={u.display_name || u.username} />
                <span className="min-w-0 text-left">
                  <span className="block truncate font-medium text-text-primary">{u.display_name || u.username}</span>
                  <span className="block truncate text-[12px] text-text-muted">@{u.username}</span>
                </span>
                {on && <Check className="ml-auto size-4 text-text-primary" aria-hidden="true" />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function NewChatDialog({ open, onClose, me, onOpened }: { open: boolean; onClose: () => void; me: string; onOpened: (id: number) => void }) {
  const toast = useToast()
  const [picked, setPicked] = useState<Person[]>([])
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const group = picked.length > 1
  const go = async () => {
    setBusy(true)
    try {
      const r = group
        ? await api.post<{ id: number }>('/api/chat/groups', { title: title.trim() || picked.map((p) => p.display_name || p.username).slice(0, 3).join(', '), members: picked.map((p) => p.username) })
        : await api.post<{ id: number }>('/api/chat/dm', { username: picked[0].username })
      onOpened(r.id)
      setPicked([])
      setTitle('')
      onClose()
    } catch (e) {
      toast.error(err(e, 'Could not start the conversation'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="New message" description="Choose one person for a direct message, or several for a group.">
      <div className="space-y-4">
        <PeoplePicker me={me} picked={picked} setPicked={setPicked} />
        {group && (
          <label className="ai-field">
            Group name
            <input className="ai-input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="DP study group" />
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void go()} disabled={!picked.length || busy}>
            {busy && <Loader2 className="animate-spin" />}
            {group ? `Start the group (${picked.length + 1})` : 'Message'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ── share a problem, solution, contest or GATE question ── */

type ShareItem = { id: number | string; title: string; platform?: string; rating?: number; language?: string; verdict?: string; submitted_at?: string; start_time?: string; year?: number; exam?: string; marks?: number }
const KINDS: { id: Exclude<ShareType, 'room'>; label: string; hint: string }[] = [
  { id: 'problem', label: 'Problem', hint: 'Search all problems, or pick one you worked on' },
  { id: 'submission', label: 'My solution', hint: 'Your submissions; the code goes with it' },
  { id: 'contest', label: 'Contest', hint: 'Contests you made or joined' },
  { id: 'gate', label: 'GATE question', hint: 'Search past papers (the answer is not shown)' },
]

export function ShareDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (s: { type: ShareType; id: number | string }) => void }) {
  const [kind, setKind] = useState<Exclude<ShareType, 'room'>>('problem')
  const [q, setQ] = useState('')
  const items = useApi(() => (open ? api.get<{ items: ShareItem[] }>(`/api/chat/shareables?kind=${kind}&q=${encodeURIComponent(q.trim())}`) : Promise.resolve({ items: [] })), [kind, q, open])
  const meta = (i: ShareItem) =>
    kind === 'problem' ? [i.platform, i.rating].filter(Boolean).join(' · ')
      : kind === 'submission' ? [i.language, i.verdict, i.submitted_at && listTime(i.submitted_at)].filter(Boolean).join(' · ')
        : kind === 'contest' ? (i.start_time ? new Date(i.start_time).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '')
          : [i.exam, i.year, i.marks && `${i.marks} marks`].filter(Boolean).join(' · ')
  return (
    <Modal open={open} onClose={onClose} title="Share" description={KINDS.find((k) => k.id === kind)?.hint}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="What to share">
          {KINDS.map((k) => (
            <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} className={cn('author-lang', kind === k.id && 'is-on')} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search" aria-label="Search" />
        <ul className="chat-pick-list" aria-label="Results">
          {items.loading && <li className="px-1 py-2 text-[13px] text-text-muted">Looking…</li>}
          {!items.loading && (items.data?.items ?? []).length === 0 && (
            <li className="px-1 py-2 text-[13px] text-text-muted">{kind === 'gate' && q.trim().length < 2 ? 'Type a few words from the question.' : 'Nothing found.'}</li>
          )}
          {(items.data?.items ?? []).map((i) => (
            <li key={String(i.id)}>
              <button
                type="button"
                className="chat-pick"
                onClick={() => {
                  onPick({ type: kind, id: i.id })
                  onClose()
                }}
              >
                <span className="min-w-0 text-left">
                  <span className="block truncate font-medium text-text-primary">{i.title}</span>
                  <span className="block truncate text-[12px] text-text-muted">{meta(i)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}

/* ── poll ── */

export function PollDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (p: { question: string; options: string[]; multi: boolean }) => Promise<void> }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [multi, setMulti] = useState(false)
  const [busy, setBusy] = useState(false)
  const ready = question.trim() && options.filter((o) => o.trim()).length >= 2
  return (
    <Modal open={open} onClose={onClose} title="New poll">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!ready) return
          setBusy(true)
          try {
            await onCreate({ question: question.trim(), options: options.map((o) => o.trim()).filter(Boolean), multi })
            setQuestion('')
            setOptions(['', ''])
            setMulti(false)
            onClose()
          } finally {
            setBusy(false)
          }
        }}
      >
        <label className="ai-field">
          Question
          <input className="ai-input" value={question} maxLength={200} onChange={(e) => setQuestion(e.target.value)} placeholder="Which topic tomorrow?" autoFocus />
        </label>
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-[12.5px] font-medium text-text-secondary">Choices</legend>
          {options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input className="ai-input flex-1" value={o} maxLength={100} aria-label={`Choice ${i + 1}`} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} />
              {options.length > 2 && (
                <button type="button" className="ai-icon" aria-label={`Remove choice ${i + 1}`} onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button type="button" className="ai-btn" onClick={() => setOptions([...options, ''])}>
              <Plus className="size-3.5" /> Add a choice
            </button>
          )}
        </fieldset>
        <label className="author-check">
          <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} /> People may choose more than one
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!ready || busy}>
            Send the poll
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ── forward ── */

export function ForwardDialog({ message, onClose, conversations, me, people }: { message: Message | null; onClose: () => void; conversations: Conversation[]; me: string; people: People }) {
  const toast = useToast()
  const [picked, setPicked] = useState<number[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const list = conversations.filter((c) => !c.request && titleOf(c, me, people).toLowerCase().includes(q.toLowerCase()))
  return (
    <Modal open={!!message} onClose={onClose} title="Forward" description="Up to five conversations.">
      <div className="space-y-3">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search your conversations" aria-label="Search your conversations" />
        <ul className="chat-pick-list">
          {list.map((c) => {
            const on = picked.includes(c.id)
            return (
              <li key={c.id}>
                <button type="button" className={cn('chat-pick', on && 'is-on')} aria-pressed={on} disabled={!on && picked.length >= 5} onClick={() => setPicked(on ? picked.filter((x) => x !== c.id) : [...picked, c.id])}>
                  <span className="truncate font-medium text-text-primary">{titleOf(c, me, people)}</span>
                  {on && <Check className="ml-auto size-4" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!picked.length || busy}
            onClick={async () => {
              if (!message) return
              setBusy(true)
              try {
                await api.post(`/api/chat/messages/${message.id}/forward`, { conversationIds: picked })
                toast.success(picked.length === 1 ? 'Forwarded' : `Forwarded to ${picked.length} conversations`)
                setPicked([])
                onClose()
              } catch (e) {
                toast.error(err(e, 'Could not forward it'))
              } finally {
                setBusy(false)
              }
            }}
          >
            Forward
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ── report ── */

const REASONS = ['Spam', 'Harassment or bullying', 'Hate or threats', 'Cheating (sharing contest answers)', 'Something else']
export function ReportDialog({ message, onClose }: { message: Message | null; onClose: () => void }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  return (
    <Modal open={!!message} onClose={onClose} title="Report this message" description="The moderators see the message and your reason. The sender is not told who reported it.">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!message || !reason) return
          try {
            const r = await api.post<{ duplicate: boolean }>(`/api/chat/messages/${message.id}/report`, { reason, details })
            toast.success(r.duplicate ? 'You already reported it' : 'Reported. Thank you.')
            setReason('')
            setDetails('')
            onClose()
          } catch (e2) {
            toast.error(err(e2, 'Could not report it'))
          }
        }}
      >
        <fieldset className="space-y-1.5">
          <legend className="sr-only">Reason</legend>
          {REASONS.map((r) => (
            <label key={r} className="author-mode">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> <span>{r}</span>
            </label>
          ))}
        </fieldset>
        <label className="ai-field">
          More details (optional)
          <textarea className="author-area" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!reason}>
            Report
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ── who can message me ── */

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const s = useApi(() => (open ? api.get<{ settings: { who: string } }>('/api/chat/settings') : Promise.resolve(null)), [open])
  const who = s.data?.settings.who ?? 'everyone'
  const set = async (v: string) => {
    try {
      await api.put('/api/chat/settings', { who: v })
      s.refetch()
      toast.success('Saved')
    } catch (e) {
      toast.error(err(e, 'Could not save'))
    }
  }
  const OPTS = [
    { id: 'everyone', label: 'Everyone', help: 'People you follow reach you straight away. Anyone else lands in Requests until you accept.' },
    { id: 'following', label: 'People I follow', help: 'Only people you follow (and friends) can start a conversation or add you to a group.' },
    { id: 'nobody', label: 'Nobody new', help: 'Nobody can start a new conversation with you. Conversations you have keep working.' },
  ]
  return (
    <Modal open={open} onClose={onClose} title="Who can message you">
      <div role="radiogroup" aria-label="Who can message you" className="space-y-2">
        {OPTS.map((o) => (
          <label key={o.id} className={cn('author-mode', who === o.id && 'is-on')}>
            <input type="radio" name="who" checked={who === o.id} onChange={() => void set(o.id)} />
            <span>
              <span className="block font-medium text-text-primary">{o.label}</span>
              <span className="block text-[12.5px] text-text-secondary">{o.help}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] text-text-muted">Messages are stored on NexoraGuru&rsquo;s server and are not end-to-end encrypted. Moderators read a message only when someone reports it.</p>
    </Modal>
  )
}

/* ── saved messages ── */

export function SavedDialog({ open, onClose, me, people, conversations, onJump }: { open: boolean; onClose: () => void; me: string; people: People; conversations: Conversation[]; onJump: (conv: number, id: number) => void }) {
  const saved = useApi(() => (open ? api.get<{ messages: Message[] }>('/api/chat/saved') : Promise.resolve({ messages: [] })), [open])
  const conv = (id: number) => conversations.find((c) => c.id === id)
  return (
    <Modal open={open} onClose={onClose} title="Saved messages" size="lg">
      {saved.loading ? (
        <p className="text-[13px] text-text-muted">Loading…</p>
      ) : (saved.data?.messages ?? []).length === 0 ? (
        <p className="text-[13px] text-text-secondary">Nothing saved yet. Use a message&rsquo;s menu and choose Save.</p>
      ) : (
        <ul className="space-y-2">
          {saved.data!.messages.map((m) => {
            const c = conv(m.conversationId)
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className="chat-saved"
                  onClick={() => {
                    onJump(m.conversationId, m.id)
                    onClose()
                  }}
                >
                  <span className="block text-[12px] text-text-muted">
                    {m.username === me ? 'You' : nameOf(people, m.username)} · {c ? titleOf(c, me, people) : 'Conversation'} · {listTime(m.createdAt)}
                  </span>
                  <span className="block truncate text-text-primary">{m.body || (m.attachment ? m.attachment.name : m.share ? m.share.title : m.poll?.question)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}

/* ── pinned ── */

export function PinsDialog({ conv, open, onClose, me, people, actions }: { conv: Conversation; open: boolean; onClose: () => void; me: string; people: People; actions: MessageActions }) {
  const pins = useApi(() => (open ? api.get<{ messages: Message[] }>(`/api/chat/conversations/${conv.id}/pins`) : Promise.resolve({ messages: [] })), [open, conv.id])
  return (
    <Modal open={open} onClose={onClose} title="Pinned messages" size="lg">
      {(pins.data?.messages ?? []).length === 0 ? (
        <p className="text-[13px] text-text-secondary">{pins.loading ? 'Loading…' : 'Nothing pinned yet.'}</p>
      ) : (
        <ul className="chat-list-plain">
          {pins.data!.messages.map((m) => (
            <MessageItem key={m.id} m={m} me={me} people={people} conv={conv} grouped={false} saved={false} highlight={false} actions={{ ...actions, jump: (id) => (actions.jump(id), onClose()) }} />
          ))}
        </ul>
      )}
    </Modal>
  )
}

/* ── group / person details ── */

const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', admin: 'Admin', member: 'Member' }

export function InfoDialog({
  conv,
  open,
  onClose,
  me,
  people,
  onChanged,
  onLeft,
}: {
  conv: Conversation
  open: boolean
  onClose: () => void
  me: string
  people: People
  onChanged: () => void
  onLeft: () => void
}) {
  const toast = useToast()
  const navigate = useNavigate()
  const [title, setTitle] = useState(conv.title ?? '')
  const [description, setDescription] = useState(conv.description ?? '')
  const [adding, setAdding] = useState<Person[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [copied, setCopied] = useState(false)
  const manager = conv.role === 'owner' || conv.role === 'admin'
  const other = conv.kind === 'dm' ? conv.members.find((m) => m.username !== me)?.username : null
  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn()
      if (ok) toast.success(ok)
      onChanged()
    } catch (e) {
      toast.error(err(e, 'Could not do that'))
    }
  }
  const link = conv.inviteToken ? `${window.location.origin}/social?tab=messages&join=${conv.inviteToken}` : null
  return (
    <Modal open={open} onClose={onClose} title={conv.kind === 'group' ? 'Group details' : 'Conversation details'} size="lg">
      <div className="space-y-5">
        {conv.kind === 'group' ? (
          manager ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void act(() => api.patch(`/api/chat/conversations/${conv.id}`, { title, description }), 'Saved')
              }}
            >
              <label className="ai-field">
                Name
                <input className="ai-input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="ai-field">
                Description
                <textarea className="author-area" rows={2} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this group is for" />
              </label>
              <Button type="submit" variant="secondary" size="sm" disabled={!title.trim() || (title === conv.title && description === conv.description)}>
                Save
              </Button>
            </form>
          ) : (
            <div>
              <p className="m-0 text-[15px] font-medium text-text-primary">{conv.title}</p>
              {conv.description && <p className="m-0 mt-1 text-[13px] text-text-secondary">{conv.description}</p>}
            </div>
          )
        ) : (
          other && (
            <div className="flex items-center gap-3">
              <Avatar seed={other} avatar={people[other]?.avatar} src={people[other]?.avatar_url} name={nameOf(people, other)} />
              <div className="min-w-0">
                <p className="m-0 font-medium text-text-primary">{nameOf(people, other)}</p>
                <p className="m-0 text-[12.5px] text-text-muted">@{other}</p>
              </div>
              <Button variant="secondary" size="sm" className="ml-auto" onClick={() => navigate(`/profile/${encodeURIComponent(other)}`)}>
                Profile
              </Button>
            </div>
          )
        )}

        <label className="author-check">
          <input type="checkbox" checked={conv.muted} onChange={(e) => void act(() => api.put(`/api/chat/conversations/${conv.id}/mute`, { muted: e.target.checked }))} /> Mute (no unread count; @mentions still show)
        </label>

        {conv.kind === 'group' && (
          <section aria-label="Members">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="m-0 text-[13px] font-semibold text-text-primary">{conv.members.length} people</h3>
              {manager && (
                <button type="button" className="ai-btn" onClick={() => setShowAdd((v) => !v)} aria-expanded={showAdd}>
                  <Plus className="size-3.5" /> Add people
                </button>
              )}
            </div>
            {showAdd && (
              <div className="mb-3 space-y-2 rounded-[var(--radius-card)] border border-border p-3">
                <PeoplePicker me={me} picked={adding} setPicked={setAdding} exclude={conv.members.map((m) => m.username)} />
                <Button
                  size="sm"
                  disabled={!adding.length}
                  onClick={() =>
                    void act(async () => {
                      await api.post(`/api/chat/conversations/${conv.id}/members`, { usernames: adding.map((p) => p.username) })
                      setAdding([])
                      setShowAdd(false)
                    }, 'Added')
                  }
                >
                  Add {adding.length || ''}
                </Button>
              </div>
            )}
            <ul className="chat-pick-list">
              {conv.members.map((m) => (
                <li key={m.username} className="chat-member">
                  <Avatar size="sm" seed={m.username} avatar={people[m.username]?.avatar} src={people[m.username]?.avatar_url} name={nameOf(people, m.username)} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-text-primary">
                      {nameOf(people, m.username)}
                      {m.username === me && ' (you)'}
                    </span>
                    <span className="block text-[12px] text-text-muted">{m.invited ? 'Invited' : ROLE_LABEL[m.role]}</span>
                  </span>
                  {m.username !== me && (conv.role === 'owner' || (conv.role === 'admin' && m.role === 'member')) && (
                    <Menu>
                      <MenuTrigger asChild>
                        <button type="button" className="ai-btn ml-auto" aria-label={`Change ${m.username}`}>
                          Change
                        </button>
                      </MenuTrigger>
                      <MenuContent>
                        {conv.role === 'owner' && m.role !== 'admin' && <MenuItem onSelect={() => void act(() => api.put(`/api/chat/conversations/${conv.id}/members/${m.username}`, { role: 'admin' }))}>Make admin</MenuItem>}
                        {conv.role === 'owner' && m.role === 'admin' && <MenuItem onSelect={() => void act(() => api.put(`/api/chat/conversations/${conv.id}/members/${m.username}`, { role: 'member' }))}>Make member</MenuItem>}
                        {conv.role === 'owner' && <MenuItem onSelect={() => void act(() => api.put(`/api/chat/conversations/${conv.id}/members/${m.username}`, { role: 'owner' }), 'They are the owner now')}>Make owner</MenuItem>}
                        <MenuItem className="text-state-error" onSelect={() => void act(() => api.delete(`/api/chat/conversations/${conv.id}/members/${m.username}`))}>
                          Remove from the group
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {conv.kind === 'group' && manager && (
          <section aria-label="Invite link" className="space-y-2">
            <h3 className="m-0 text-[13px] font-semibold text-text-primary">Invite link</h3>
            <p className="m-0 text-[12.5px] text-text-secondary">Anyone with the link can join. Turn it off to stop it working.</p>
            {link ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="chat-invite">{link}</code>
                <button
                  type="button"
                  className="ai-btn"
                  onClick={() => {
                    void navigator.clipboard?.writeText(link).then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    })
                  }}
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? 'Copied' : 'Copy'}
                </button>
                <button type="button" className="ai-btn" onClick={() => void act(() => api.put(`/api/chat/conversations/${conv.id}/invite`, { on: false }), 'The link is off')}>
                  Turn off
                </button>
              </div>
            ) : (
              <button type="button" className="ai-btn" onClick={() => void act(() => api.put(`/api/chat/conversations/${conv.id}/invite`, { on: true }))}>
                <Link2 className="size-3.5" /> Make a link
              </button>
            )}
          </section>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {conv.kind === 'group' ? (
            <Button
              variant="outline"
              size="sm"
              className="text-state-error"
              onClick={() =>
                void act(async () => {
                  await api.post(`/api/chat/conversations/${conv.id}/leave`)
                  onClose()
                  onLeft()
                }, 'You left the group')
              }
            >
              Leave the group
            </Button>
          ) : (
            other && (
              <Button
                variant="outline"
                size="sm"
                className="text-state-error"
                onClick={() =>
                  void act(async () => {
                    await api.put(`/api/social/block/${encodeURIComponent(other)}`)
                  }, `${nameOf(people, other)} is blocked`)
                }
              >
                Block {nameOf(people, other)}
              </Button>
            )
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ── join with an invite link ── */

export function JoinDialog({ token, onClose, onJoined }: { token: string | null; onClose: () => void; onJoined: (id: number) => void }) {
  const toast = useToast()
  const g = useApi(() => (token ? api.get<{ group: { id: number; title: string; description: string; members: number } }>(`/api/chat/invite/${token}`) : Promise.resolve(null)), [token])
  return (
    <Modal open={!!token} onClose={onClose} title="Join a group">
      {g.loading ? (
        <p className="text-[13px] text-text-muted">Loading…</p>
      ) : g.error || !g.data ? (
        <p className="text-[13px] text-text-secondary">{g.error ?? "This invite link doesn't work any more."}</p>
      ) : (
        <div className="space-y-3">
          <p className="m-0 text-[16px] font-medium text-text-primary">{g.data.group.title}</p>
          {g.data.group.description && <p className="m-0 text-[13px] text-text-secondary">{g.data.group.description}</p>}
          <p className="m-0 text-[12.5px] text-text-muted">{g.data.group.members} people</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Not now
            </Button>
            <Button
              onClick={async () => {
                try {
                  const r = await api.post<{ id: number }>(`/api/chat/invite/${token}`)
                  onJoined(r.id)
                  onClose()
                } catch (e) {
                  toast.error(err(e, 'Could not join'))
                }
              }}
            >
              Join
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function ImageViewer({ image, onClose }: { image: { url: string; alt: string } | null; onClose: () => void }) {
  return (
    <Modal open={!!image} onClose={onClose} title={image?.alt || 'Picture'} size="xl">
      {image && (
        <div className="flex flex-col items-center gap-3">
          <img src={image.url} alt={image.alt} className="max-h-[70vh] w-auto max-w-full rounded" />
          <a href={image.url} download target="_blank" rel="noopener noreferrer" className="ai-btn">
            Open the full picture
          </a>
        </div>
      )}
    </Modal>
  )
}
