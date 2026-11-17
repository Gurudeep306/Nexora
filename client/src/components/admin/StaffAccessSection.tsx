import { useState } from 'react'
import { Avatar, Button, Input, useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip, Empty, Failed, Panel, RolePill, Skeleton, Toggle } from './kit'
import './staff.css'

/*
  Admin → Staff access (GET/PUT /api/admin/staff-access, src/authz/sections.js).
  For each staff member and each Admin section: follow their role (default),
  hidden, see only, or change. The server enforces every choice; this page
  only sets them. Only the owner and top admins open it; only the owner makes
  top admins.
*/

type Level = 'none' | 'view' | 'edit'
type Choice = Level | 'default'
interface Section {
  id: string
  label: string
  group: string
}
interface Person {
  username: string
  display_name: string | null
  avatar: string | null
  avatar_url: string | null
  role: string
  chosen: Record<string, Level>
  effective: Record<string, Level>
  topAdmin: boolean
  editable: boolean
}
interface Data {
  sections: Section[]
  people: Person[]
  isOwner: boolean
}

const LEVEL_WORD: Record<Level, string> = { none: 'Hidden', view: 'See only', edit: 'Can change' }
const CHOICES: { id: Choice; label: string }[] = [
  { id: 'default', label: 'Role default' },
  { id: 'none', label: 'Hidden' },
  { id: 'view', label: 'See' },
  { id: 'edit', label: 'Change' },
]

export function StaffAccessSection() {
  const toast = useToast()
  const { data, loading, error, refetch, setData } = useApi(() => api.get<Data>('/api/admin/staff-access'), [])
  const [adding, setAdding] = useState('')
  const [extra, setExtra] = useState<string[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  if (error && !data) return <Failed message={error} onRetry={refetch} />
  if (!data) return loading ? <Skeleton className="h-64" /> : null

  const replace = (p: Person) => setData((d) => (d ? { ...d, people: d.people.some((x) => x.username === p.username) ? d.people.map((x) => (x.username === p.username ? p : x)) : [...d.people, p] } : d))

  const choose = async (username: string, section: string, level: Choice) => {
    setBusy(`${username}:${section}`)
    try {
      const r = await api.put<{ person: Person }>(`/api/admin/staff-access/${encodeURIComponent(username)}`, { section, level })
      replace(r.person)
      setExtra((e) => e.filter((u) => u.toLowerCase() !== username.toLowerCase()))
    } catch (e) {
      toast.error('Could not change access', e instanceof ApiError ? e.message : undefined)
    } finally {
      setBusy(null)
    }
  }
  const setTop = async (username: string, on: boolean) => {
    setBusy(`${username}:top`)
    try {
      const r = await api.put<{ person: Person }>(`/api/admin/staff-access/${encodeURIComponent(username)}/top`, { on })
      replace(r.person)
      toast.success(on ? `@${username} is now a top admin` : `@${username} is no longer a top admin`)
    } catch (e) {
      toast.error('Could not change it', e instanceof ApiError ? e.message : undefined)
    } finally {
      setBusy(null)
    }
  }

  // Someone not on staff yet: shown with everything hidden until a choice is saved.
  const listed = new Set(data.people.map((p) => p.username.toLowerCase()))
  const pending: Person[] = extra
    .filter((u) => !listed.has(u.toLowerCase()))
    .map((u) => ({ username: u, display_name: null, avatar: null, avatar_url: null, role: 'member', chosen: {}, effective: Object.fromEntries(data.sections.map((s) => [s.id, 'none' as Level])), topAdmin: false, editable: true }))
  const people = [...data.people, ...pending]

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const u = adding.trim().replace(/^@/, '')
    if (!/^[A-Za-z0-9_]{2,20}$/.test(u)) return toast.error('Enter a username', 'Letters, numbers and _ only.')
    if (!listed.has(u.toLowerCase())) setExtra((x) => [...x, u])
    setOpen(u)
    setAdding('')
  }

  return (
    <div className="space-y-6">
      <Panel
        title="How it works"
        description="Pick, for each person, what they can do in each Admin section. “Role default” follows their role and permissions. The server checks every request, so a hidden section stays shut even if someone knows its address."
      >
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 basis-56">
            <span className="mb-1.5 block text-sm font-medium text-text-primary">Give someone access</span>
            <Input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="username" autoComplete="off" />
          </label>
          <Button type="submit" variant="outline">
            Add person
          </Button>
        </form>
        <p className="mt-3 text-xs text-text-secondary">
          {data.isOwner ? 'You can change everyone except yourself. Top admins can open this page too, for people below them.' : 'You can change people below your own role, and give no more than you have yourself.'}
        </p>
      </Panel>

      {people.length === 0 ? (
        <Empty icon="users" title="No staff yet">
          Add someone above, or make someone an admin or moderator in Users.
        </Empty>
      ) : (
        <ul className="sa-list" aria-label="Staff">
          {people.map((p) => {
            const isOpen = open === p.username
            const name = p.display_name || p.username
            const summary = data.sections.filter((s) => p.effective[s.id] !== 'none').map((s) => s.label)
            return (
              <li key={p.username} className="sa-person">
                <button type="button" className="sa-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.username)}>
                  <Avatar seed={p.username} avatar={p.avatar} src={p.avatar_url} name={name} size="md" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-text-primary">{name}</span>
                      <RolePill role={p.role} />
                      {p.topAdmin && <Chip icon="key">Top admin</Chip>}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-text-secondary">
                      @{p.username} · {summary.length ? summary.join(', ') : 'No Admin sections'}
                    </span>
                  </span>
                  <span className="sa-chev" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                {isOpen && (
                  <div className="sa-body">
                    {!p.editable && <p className="sa-note">You can&rsquo;t change {p.role === 'admin' ? 'another admin' : 'this person'}. Only the owner can.</p>}
                    {data.isOwner && p.role !== 'member' && (
                      <div className="sa-top">
                        <span>
                          <span className="block text-sm font-medium text-text-primary">Top admin</span>
                          <span className="block text-xs text-text-secondary">May open this page and set access for people below them.</span>
                        </span>
                        <Toggle checked={p.topAdmin} label={`Top admin: @${p.username}`} disabled={busy === `${p.username}:top`} onChange={(on) => void setTop(p.username, on)} />
                      </div>
                    )}
                    <div className="sa-rows">
                      {data.sections.map((s) => {
                        const chosen: Choice = p.chosen[s.id] ?? 'default'
                        const eff = p.effective[s.id]
                        const name = `sa-${p.username}-${s.id}`
                        return (
                          <fieldset key={s.id} className="sa-row" disabled={!p.editable || busy === `${p.username}:${s.id}`}>
                            <legend className="sr-only">
                              {s.label} for @{p.username}
                            </legend>
                            <span className="sa-row-name" aria-hidden="true">
                              <span className="block text-sm font-medium text-text-primary">{s.label}</span>
                              <span className="block text-xs text-text-secondary">
                                {s.group} · now: {LEVEL_WORD[eff]}
                              </span>
                            </span>
                            <span className="sa-seg">
                              {CHOICES.map((c) => (
                                <label key={c.id} className={cn('sa-opt', chosen === c.id && 'is-on')}>
                                  <input type="radio" name={name} value={c.id} checked={chosen === c.id} onChange={() => void choose(p.username, s.id, c.id)} className="sr-only" />
                                  {c.label}
                                </label>
                              ))}
                            </span>
                          </fieldset>
                        )
                      })}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
