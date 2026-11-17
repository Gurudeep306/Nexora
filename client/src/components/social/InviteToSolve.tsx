import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Users } from 'lucide-react'
import { Avatar, Button, EmptyState, LoadingBlock, Modal, SearchInput, Textarea, useToast } from '@/components/ui'
import { ToggleRow } from '@/components/account/SettingsPrimitives'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import { ApiError, api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Friend {
  username: string
  display_name?: string | null
  avatar?: string | null
  avatar_url?: string | null
}
interface Group {
  id: number
  kind: 'dm' | 'group'
  title: string | null
  members: { username: string }[]
}

/**
 * "Invite friends to solve": pick friends and groups; each gets a card in
 * chat with the problem, a Solve button and who has solved it so far (real
 * times, from their own Accepted). A race only changes how the card reads.
 */
export function InviteToSolve({ problemId, title, className }: { problemId: number; title: string; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-surface-2 hover:text-foreground', className)}>
        <Users className="size-3" aria-hidden="true" /> Invite friends
      </button>
      {open && <InviteDialog problemId={problemId} title={title} onClose={() => setOpen(false)} />}
    </>
  )
}

function InviteDialog({ problemId, title, onClose }: { problemId: number; title: string; onClose: () => void }) {
  const toast = useToast()
  const { user } = useAuth()
  const me = user?.username ?? ''
  const friends = useApi(() => api.get<{ friends: Friend[] }>(`/api/friends/${encodeURIComponent(me)}`), [me], { skip: !me })
  const convs = useApi(() => api.get<{ conversations: Group[] }>('/api/chat/conversations'), [], { skip: !me })
  const [q, setQ] = useState('')
  const [people, setPeople] = useState<string[]>([])
  const [groups, setGroups] = useState<number[]>([])
  const [race, setRace] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const groupList = (convs.data?.conversations ?? []).filter((c) => c.kind === 'group')
  const needle = q.trim().toLowerCase()
  const shownFriends = useMemo(
    () => (friends.data?.friends ?? []).filter((f) => !needle || f.username.toLowerCase().includes(needle) || (f.display_name ?? '').toLowerCase().includes(needle)),
    [friends.data, needle],
  )
  const shownGroups = groupList.filter((g) => !needle || (g.title ?? '').toLowerCase().includes(needle))
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const count = people.length + groups.length

  const send = async () => {
    setBusy(true)
    try {
      const r = await api.post<{ sent: number; skipped: { username: string; reason: string }[] }>('/api/chat/invite-solve', {
        problemId,
        usernames: people,
        conversationIds: groups,
        race,
        note: note.trim(),
      })
      const skipped = r.skipped ?? []
      toast.success(
        r.sent === 1 ? 'Invite sent' : `${r.sent} invites sent`,
        skipped.length ? `Not sent to ${skipped.map((s) => `@${s.username}`).join(', ')}: ${skipped[0].reason}` : 'You will see in chat who solves it, and how fast.',
      )
      onClose()
    } catch (e) {
      toast.error("Couldn't send the invite", e instanceof ApiError ? e.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const loading = (friends.loading && !friends.data) || (convs.loading && !convs.data)
  const nobody = !loading && !(friends.data?.friends ?? []).length && !groupList.length

  return (
    <Modal open onClose={onClose} title="Invite friends to solve" description={title} size="md">
      {loading ? (
        <LoadingBlock rows={4} />
      ) : nobody ? (
        <EmptyState
          title="No friends or groups yet"
          description="Add friends or join a group in Social, then invite them here."
          action={
            <Link to="/social?tab=friends" className="text-sm font-medium text-text-primary underline underline-offset-[3px]" onClick={onClose}>
              Find friends
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a friend or group" aria-label="Find a friend or group" />
          <div className="max-h-72 space-y-3 overflow-y-auto overscroll-contain pr-1">
            {shownFriends.length > 0 && (
              <fieldset>
                <legend className="mb-1.5 text-[11px] font-semibold tracking-wider text-text-muted uppercase">Friends</legend>
                <ul className="space-y-1">
                  {shownFriends.map((f) => {
                    const on = people.includes(f.username)
                    return (
                      <li key={f.username}>
                        <button type="button" aria-pressed={on} onClick={() => setPeople(toggle(people, f.username))} className={cn('flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors', on ? 'border-text-primary' : 'border-border hover:border-border-strong')}>
                          <Avatar size="sm" seed={f.username} avatar={f.avatar} src={f.avatar_url} name={f.display_name || f.username} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-text-primary">{f.display_name || f.username}</span>
                            <span className="block truncate text-xs text-text-muted">@{f.username}</span>
                          </span>
                          <span className={cn('grid size-5 place-items-center rounded-full border', on ? 'border-text-primary bg-text-primary text-bg-app' : 'border-border')} aria-hidden="true">
                            {on && <Check className="size-3" />}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </fieldset>
            )}
            {shownGroups.length > 0 && (
              <fieldset>
                <legend className="mb-1.5 text-[11px] font-semibold tracking-wider text-text-muted uppercase">Groups</legend>
                <ul className="space-y-1">
                  {shownGroups.map((g) => {
                    const on = groups.includes(g.id)
                    return (
                      <li key={g.id}>
                        <button type="button" aria-pressed={on} onClick={() => setGroups(toggle(groups, g.id))} className={cn('flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors', on ? 'border-text-primary' : 'border-border hover:border-border-strong')}>
                          <span className="grid size-8 place-items-center rounded-full border border-border bg-bg-surface-2 text-text-secondary" aria-hidden="true">
                            <Users className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-text-primary">{g.title || 'Group'}</span>
                            <span className="block text-xs text-text-muted">{g.members.length} members</span>
                          </span>
                          <span className={cn('grid size-5 place-items-center rounded-full border', on ? 'border-text-primary bg-text-primary text-bg-app' : 'border-border')} aria-hidden="true">
                            {on && <Check className="size-3" />}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </fieldset>
            )}
            {!shownFriends.length && !shownGroups.length && <p className="py-4 text-center text-sm text-text-secondary">No one matches “{q.trim()}”.</p>}
          </div>
          <ToggleRow label="Make it a race" hint="The card numbers who solves it first. Times are real either way." checked={race} onChange={setRace} />
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={2} placeholder="Add a note (optional)" aria-label="A note with the invite" />
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void send()} loading={busy} disabled={!count}>
              {count ? `Invite ${count}` : 'Choose someone'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
