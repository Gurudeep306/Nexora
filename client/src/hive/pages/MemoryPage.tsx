import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, Check, Pencil, Pin, PinOff, Trash2, User, X } from 'lucide-react'
import { CopilotMark as Bot } from '../marks'
import { Button, Input, SearchInput, Select, Textarea, useToast } from '@/components/ui'
import { hiveApi } from '../api'
import { useHive } from '../store'
import type { MemoryItem } from '../types'
import { Empty, SegmentedControl } from '../kit'
import { PageTitle, UserDot, timeAgo } from '../ui'

/**
 * Memory, two kinds:
 *   Project   notes every agent on a project reads before it starts (pinned
 *             first, then newest, up to the Shared memory plugin's limit —
 *             the page marks the ones past it). Agents add to it; a title
 *             learned again updates the note instead of adding a copy.
 *   About you facts Hive chats saved about you (and ones you add), used in
 *             every chat you have.
 */
type Fact = { id: string; fact: string; source: string; created_at: number }
const PERSONAL_MAX = 200

export default function MemoryPage() {
  const [view, setView] = useState<'project' | 'you'>('project')
  return (
    <div className="mx-auto w-full max-w-[820px] px-4 pb-20 pt-10 sm:px-8">
      <PageTitle icon={<Brain />} title="Memory" sub="What agents know before they start, and what chats know about you." />
      <SegmentedControl
        label="Kind of memory"
        value={view}
        onChange={setView}
        options={[
          { value: 'project', label: 'Projects' },
          { value: 'you', label: 'About you' },
        ]}
        className="mb-6"
      />
      {view === 'project' ? <ProjectMemory /> : <PersonalMemory />}
    </div>
  )
}

function ProjectMemory() {
  const { boot, project, memoryVersion } = useHive()
  const toast = useToast()
  const [chosen, setProjectId] = useState<string | null>(null)
  const projectId = chosen ?? project?.id ?? boot?.projects[0]?.id ?? null
  const [items, setItems] = useState<MemoryItem[] | null>(null)
  const [sharing, setSharing] = useState<{ enabled: boolean; limit: number } | null>(null)
  const [q, setQ] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    if (!projectId) return
    hiveApi
      .memory(projectId)
      .then((r) => {
        setItems(r.memory)
        setSharing(r.sharing ?? null)
      })
      .catch(() => setItems([]))
  }, [projectId])
  useEffect(() => {
    load()
  }, [load, memoryVersion])

  // The server's order (pinned, then newest) is the order agents read; mark the cut.
  const sentIds = useMemo(() => new Set((items ?? []).slice(0, sharing?.limit ?? 30).map((m) => m.id)), [items, sharing])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (items ?? []).filter((m) => !s || m.title.toLowerCase().includes(s) || m.body.toLowerCase().includes(s))
  }, [items, q])

  if (!boot) return null
  if (!projectId) return <Empty icon={<Brain />} title="No projects yet">Create a project first; its memory appears here.</Empty>

  const add = async () => {
    setBusy(true)
    try {
      const r = await hiveApi.addMemory(projectId, { title, body, pinned: true })
      if (r.updated) toast.success('Updated the note with that title')
      setTitle('')
      setBody('')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  const n = items?.length ?? 0
  const limit = sharing?.limit ?? 30
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {boot.projects.length > 1 && (
          <Select value={projectId} onValueChange={(v) => setProjectId(v)} className="w-56" aria-label="Project">
            {boot.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        {n > 0 && (
          <p className="text-[13px] text-[var(--hv-text-2)]">
            {sharing && !sharing.enabled ? (
              <>
                Shared memory is off for this project, so agents don't see these notes.{' '}
                <Link to="/hive/extensions/plugins" className="underline underline-offset-2">
                  Turn it on in Plugins
                </Link>
              </>
            ) : n > limit ? (
              `${n} notes. Agents read ${limit}: the pinned ones first, then the newest.`
            ) : (
              `${n} ${n === 1 ? 'note' : 'notes'}. Every agent reads all of them.`
            )}
          </p>
        )}
      </div>

      <div className="hive-composer mb-8 rounded-[var(--hv-r-card)] p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title, e.g. Error format" aria-label="Title" className="mb-2 border-0 bg-transparent px-0 text-[15px] font-medium shadow-none focus-visible:ring-0" maxLength={120} />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="The fact every agent should know, e.g. “APIs answer errors as { error: string } with a 4xx status.”" aria-label="Note" rows={2} className="resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" maxLength={1500} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-[var(--hv-text-3)]">Saved pinned. The same title again updates the note.</span>
          <Button size="sm" onClick={add} loading={busy} disabled={!title.trim() || !body.trim()}>
            Remember
          </Button>
        </div>
      </div>

      {n > 6 && <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search notes" aria-label="Search notes" containerClassName="mb-4" />}

      {items === null ? (
        <div className="hive-shimmer h-24 rounded-[var(--hv-r-card)]" />
      ) : n === 0 ? (
        <Empty icon={<Brain />} title="Nothing remembered yet">
          Add a fact above. With Shared memory on, agents add what they learn here too.
        </Empty>
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-[13.5px] text-[var(--hv-text-3)]">No note matches “{q}”.</p>
      ) : (
        <ul className="divide-y divide-[var(--hv-border)] border-y border-[var(--hv-border)]">
          {shown.map((m) => (
            <MemoryRow key={m.id} m={m} sent={!!sharing?.enabled && sentIds.has(m.id)} sharingOn={!!sharing?.enabled} onChange={load} />
          ))}
        </ul>
      )}
    </>
  )
}

function MemoryRow({ m, sent, sharingOn, onChange }: { m: MemoryItem; sent: boolean; sharingOn: boolean; onChange: () => void }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(m.title)
  const [body, setBody] = useState(m.body)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const agent = m.author.startsWith('agent:')
  const who = agent ? m.author.replace('agent:', '') : m.author.replace(/^@/, '')

  const act = async (fn: () => Promise<unknown>, fail: string) => {
    setBusy(true)
    try {
      await fn()
      onChange()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : fail)
    } finally {
      setBusy(false)
    }
  }
  const save = () =>
    act(async () => {
      await hiveApi.updateMemory(m.id, { title: title.trim(), body: body.trim() })
      setEditing(false)
    }, 'Could not save')

  return (
    <li className="flex gap-3 py-4">
      {agent ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--hv-fill)] text-[var(--hv-text-2)]" title="Added by an agent">
          <Bot className="size-4" />
        </span>
      ) : m.author === 'launchpad' ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--hv-fill)] text-[var(--hv-text-2)]">
          <Brain className="size-4" />
        </span>
      ) : (
        <UserDot username={who} size={8} />
      )}
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="grid gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" maxLength={120} />
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} aria-label="Note" rows={3} maxLength={1500} />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={save} loading={busy} disabled={!title.trim() || !body.trim()}>
                <Check /> Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTitle(m.title)
                  setBody(m.body)
                  setEditing(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-[14px] font-medium text-[var(--hv-text-1)]">{m.title}</span>
              {!!m.pinned && (
                <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--hv-text-2)]">
                  <Pin className="size-3" aria-hidden="true" /> Pinned
                </span>
              )}
              {sharingOn && !sent && <span className="text-[11.5px] text-[var(--color-state-warning)]">Not sent to agents (past the limit)</span>}
            </div>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-[var(--hv-text-2)]">{m.body}</p>
            <p className="mt-1.5 text-[12px] text-[var(--hv-text-3)]">
              {m.author === 'launchpad' ? 'From the project plan' : agent ? `${who} (agent)` : who} · {timeAgo(m.created_at)}
            </p>
          </>
        )}
      </div>
      {!editing && (
        <div className="flex shrink-0 items-start gap-0.5">
          {confirm ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => act(() => hiveApi.deleteMemory(m.id), 'Could not forget')} loading={busy}>
                Forget
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setConfirm(false)} aria-label="Keep it">
                <X />
              </Button>
            </>
          ) : (
            <>
              <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)} aria-label={`Edit ${m.title}`}>
                <Pencil />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => act(() => hiveApi.updateMemory(m.id, { pinned: !m.pinned }), 'Could not change the pin')} aria-label={m.pinned ? `Unpin ${m.title}` : `Pin ${m.title}`}>
                {m.pinned ? <PinOff /> : <Pin />}
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setConfirm(true)} aria-label={`Forget ${m.title}`}>
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  )
}

function PersonalMemory() {
  const toast = useToast()
  const [facts, setFacts] = useState<Fact[] | null>(null)
  const [fact, setFact] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    hiveApi
      .myMemory()
      .then((r) => setFacts(r.facts))
      .catch(() => setFacts([]))
  }, [])
  useEffect(() => {
    load()
  }, [load])
  const add = async () => {
    setBusy(true)
    try {
      await hiveApi.addMyMemory(fact.trim())
      setFact('')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  const forget = async (id: string) => {
    try {
      await hiveApi.deleteMyMemory(id)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not forget')
    }
  }
  const n = facts?.length ?? 0
  return (
    <>
      <p className="mb-4 text-[13.5px] text-[var(--hv-text-2)]">
        Hive chats and the Copilot read these in every conversation you have. Chats save a fact when you ask them to remember something. Only you see this list.
      </p>
      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (fact.trim()) add()
        }}
      >
        <Input value={fact} onChange={(e) => setFact(e.target.value)} placeholder="e.g. I review pull requests on my phone, so keep summaries short" aria-label="A fact about you" maxLength={400} className="flex-1" />
        <Button type="submit" variant="secondary" loading={busy} disabled={!fact.trim() || n >= PERSONAL_MAX}>
          Add
        </Button>
      </form>
      {facts === null ? (
        <div className="hive-shimmer h-24 rounded-[var(--hv-r-card)]" />
      ) : n === 0 ? (
        <Empty icon={<User />} title="Chats don't know anything about you yet">
          Add a fact above, or tell a chat “remember that…”.
        </Empty>
      ) : (
        <>
          <p className="mb-2 text-[12px] text-[var(--hv-text-3)]">
            {n} of {PERSONAL_MAX}
            {n > 60 && ' · chats read the newest 60'}
          </p>
          <ul className="divide-y divide-[var(--hv-border)] border-y border-[var(--hv-border)]">
            {facts.map((f, i) => (
              <li key={f.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[14px] text-[var(--hv-text-1)]">{f.fact}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--hv-text-3)]">
                    {f.source === 'chat' ? 'Saved by a chat' : 'Added by you'} · {timeAgo(f.created_at)}
                    {i >= 60 && ' · not read by chats (past the newest 60)'}
                  </p>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => forget(f.id)} aria-label={`Forget: ${f.fact.slice(0, 60)}`}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
