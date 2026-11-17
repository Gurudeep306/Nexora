import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Check, Plus, Trash2 } from 'lucide-react'
import { Button, Field, Input, LoadingBlock, Modal, Select, Textarea, useToast } from '@/components/ui'
import { ToggleRow } from '@/components/account/SettingsPrimitives'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import { ApiError, api } from '@/lib/api'
import { setPath, type AskedReport, type SetForProblem } from '@/lib/problemSets'

/* Dialogs for Problem sets (src/routes/problem-sets.js): make a set, add the
   problem you are on to one of yours, report where you were asked it, and the
   staff form for famous series and company lists. */

const errText = (e: unknown) => (e instanceof ApiError ? e.message : undefined)

function SignInNote({ what }: { what: string }) {
  return (
    <p className="m-0 py-3 text-sm text-text-secondary">
      <Link to="/auth" className="font-medium text-text-primary underline underline-offset-[3px]">
        Sign in
      </Link>{' '}
      {what}
    </p>
  )
}

/** Make a set: a name, a line about it, private or shared. With a problem, it goes in. */
export function NewSetDialog({ onClose, problemId, onMade }: { onClose: () => void; problemId?: number; onMade?: () => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [shared, setShared] = useState(false)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      const r = await api.post<{ id: string }>('/api/problem-sets', { title, description, visibility: shared ? 'public' : 'private', problemIds: problemId ? [problemId] : [] })
      toast.success('Set made', problemId ? 'This problem is in it.' : 'Add problems from Problems or the Solve page.')
      onMade?.()
      onClose()
      if (!problemId) navigate(setPath(r.id))
    } catch (e) {
      toast.error("Couldn't make the set", errText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="New problem set" size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <Field label="Name">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Graphs before the contest" required />
        </Field>
        <Field label="About it (optional)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} placeholder="What it's for, how to use it" />
        </Field>
        <ToggleRow label="Share it" hint="Anyone can see and like it. You can change this later." checked={shared} onChange={setShared} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={title.trim().length < 2}>
            Make the set
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Solve page → … → Add to a set: your sets, with this problem's place in each. */
export function AddToSetDialog({ problemId, title, onClose }: { problemId: number; title: string; onClose: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const [making, setMaking] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const sets = useApi(() => api.get<{ sets: SetForProblem[] }>(`/api/problem-sets-for/${problemId}`), [problemId], { skip: !user })
  const add = async (s: SetForProblem) => {
    setBusy(s.id)
    try {
      const r = await api.post<{ added: number; reason?: string }>(`/api/problem-sets/${s.id}/items`, { problemId })
      if (r.added) toast.success('Added', `“${title}” is in ${s.title}.`)
      else toast.info(r.reason || 'It is already in this set')
      sets.setData((cur) => (cur ? { ...cur, sets: cur.sets.map((x) => (x.id === s.id ? { ...x, has: true } : x)) } : cur))
    } catch (e) {
      toast.error("Couldn't add it", errText(e))
    } finally {
      setBusy(null)
    }
  }
  if (making) return <NewSetDialog problemId={problemId} onClose={onClose} />
  return (
    <Modal open onClose={onClose} title="Add to a set" description={`Put “${title}” in one of your problem sets.`} size="md">
      {!user ? (
        <SignInNote what="to keep problem sets." />
      ) : sets.error && !sets.data ? (
        <p className="m-0 text-sm text-state-error">Couldn't load your sets: {sets.error}</p>
      ) : !sets.data ? (
        <LoadingBlock rows={3} />
      ) : (
        <div className="space-y-4">
          {sets.data.sets.length > 0 ? (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto overscroll-contain rounded-lg border border-border" tabIndex={-1}>
              {sets.data.sets.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <Link to={setPath(s.id)} className="block truncate text-sm text-text-primary hover:underline">
                      {s.title}
                    </Link>
                    <span className="block text-xs text-text-muted">{s.visibility === 'public' ? 'Shared' : 'Private'}</span>
                  </span>
                  <Button variant="ghost" size="sm" disabled={s.has || busy !== null} loading={busy === s.id} onClick={() => void add(s)} aria-label={s.has ? `It is in ${s.title}` : `Add to ${s.title}`}>
                    {s.has ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />} {s.has ? 'In it' : 'Add'}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-text-secondary">You have no sets yet.</p>
          )}
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={onClose}>
              Done
            </Button>
            <Button onClick={() => setMaking(true)}>
              <Plus aria-hidden="true" /> New set with it
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/** Solve page → … → I was asked this at…: what people reported, and your own report. */
export function AskedAtDialog({ problemId, title, onClose }: { problemId: number; title: string; onClose: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const [company, setCompany] = useState('')
  const [year, setYear] = useState('')
  const [busy, setBusy] = useState(false)
  const asked = useApi(() => api.get<AskedReport>(`/api/problems/${problemId}/asked`), [problemId])
  const thisYear = new Date().getFullYear()
  const report = async () => {
    setBusy(true)
    try {
      const r = await api.post<{ company: string }>(`/api/problems/${problemId}/asked`, { company, year: year ? Number(year) : undefined })
      toast.success('Thanks', `Saved: you were asked this at ${r.company}.`)
      setCompany('')
      setYear('')
      asked.refetch()
    } catch (e) {
      toast.error("Couldn't save it", errText(e))
    } finally {
      setBusy(false)
    }
  }
  const unreport = async (c: string) => {
    try {
      await api.delete(`/api/problems/${problemId}/asked/${encodeURIComponent(c)}`)
      asked.refetch()
    } catch (e) {
      toast.error("Couldn't remove it", errText(e))
    }
  }
  const d = asked.data
  const shown = d?.companies ?? []
  const waiting = d?.waiting ?? 0
  return (
    <Modal open onClose={onClose} title="Asked at a company?" description={`Were you asked “${title}” in an interview or test? Tell others where.`} size="md">
      <div className="space-y-4">
        <section aria-labelledby="asked-h" className="space-y-2">
          <h3 id="asked-h" className="m-0 text-sm font-semibold text-text-primary">
            What people here reported
          </h3>
          {asked.error && !d ? (
            <p className="m-0 text-sm text-state-error">Couldn't load the reports: {asked.error}</p>
          ) : !d ? (
            <LoadingBlock rows={2} />
          ) : shown.length === 0 ? (
            <p className="m-0 text-sm text-text-secondary">
              No company yet. A company shows once at least {d.minReports} people name it.
              {waiting > 0 && ` ${waiting} ${waiting === 1 ? 'company has' : 'companies have'} one report so far.`}
            </p>
          ) : (
            <>
              <ul className="flex flex-wrap gap-2">
                {shown.map((c) => (
                  <li key={c.company}>
                    <Link to={setPath(`company:${c.company}`)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary transition-colors hover:border-border-strong">
                      <Building2 className="size-4 text-text-muted" aria-hidden="true" />
                      {c.company}
                      <span className="text-xs text-text-muted tabular-nums">
                        {c.reports} {c.reports === 1 ? 'report' : 'reports'}
                        {c.year ? ` · latest ${c.year}` : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="m-0 text-xs text-text-muted">
                These are our users’ reports, not the companies’ own lists.
                {waiting > 0 && ` ${waiting} more ${waiting === 1 ? 'company has' : 'companies have'} one report so far.`}
              </p>
            </>
          )}
        </section>

        {!user ? (
          <SignInNote what="to add your report." />
        ) : (
          <>
            {d && d.mine.length > 0 && (
              <section aria-labelledby="asked-mine" className="space-y-1.5">
                <h3 id="asked-mine" className="m-0 text-sm font-semibold text-text-primary">
                  Your reports
                </h3>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {d.mine.map((m) => (
                    <li key={m.company} className="flex items-center gap-3 px-3 py-1.5 text-sm text-text-primary">
                      <span className="min-w-0 flex-1 truncate">
                        {m.company}
                        {m.year ? <span className="text-text-muted"> · {m.year}</span> : null}
                      </span>
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove your report for ${m.company}`} onClick={() => void unreport(m.company)}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void report()
              }}
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <Field label="Company">
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={40} placeholder="e.g. Google" required />
                </Field>
                <Field label="Year (optional)">
                  <Input type="number" inputMode="numeric" min={2000} max={thisYear} value={year} onChange={(e) => setYear(e.target.value)} placeholder={String(thisYear)} />
                </Field>
              </div>
              <p className="m-0 text-xs text-text-muted">Only say so if it really happened to you. Your name is not shown with the report.</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Close
                </Button>
                <Button type="submit" loading={busy} disabled={company.trim().length < 2}>
                  I was asked this
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  )
}

/** Staff: a famous series (a link to the original) or a company list (its public source). */
export function StaffSetDialog({ onClose, kind: initial = 'series' }: { onClose: () => void; kind?: 'series' | 'company' }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [kind, setKind] = useState<'series' | 'company'>(initial)
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const linkOk = /^https?:\/\/\S+\.\S+/.test(sourceUrl.trim())
  const ready = title.trim().length >= 2 && linkOk && (kind === 'series' || company.trim().length >= 2)
  const save = async () => {
    setBusy(true)
    try {
      const r = await api.post<{ id: string }>('/api/problem-sets', { kind, title, description, sourceUrl, company: kind === 'company' ? company : undefined })
      toast.success(kind === 'series' ? 'Series added' : 'Company list added', 'Now add its problems.')
      onClose()
      navigate(setPath(r.id))
    } catch (e) {
      toast.error("Couldn't add it", errText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Add a series or company list" description="Staff only. Every list must cite where it comes from." size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <Field label="Kind">
          <Select value={kind} onValueChange={(v) => setKind(v === 'company' ? 'company' : 'series')}>
            <option value="series">Famous series</option>
            <option value="company">Company list</option>
          </Select>
        </Field>
        <Field label="Name">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder={kind === 'series' ? 'A well-known sheet' : 'Asked at the company'} required />
        </Field>
        {kind === 'company' && (
          <Field label="Company">
            <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={40} required />
          </Field>
        )}
        <Field
          label={kind === 'series' ? 'Link to the original' : 'Public source'}
          hint={kind === 'series' ? 'Where the series lives. We list our matching problems and link the rest; we never copy it.' : 'A public page anyone can open that shows this list. No paid, private or leaked lists.'}
        >
          <Input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" required />
        </Field>
        <Field label="About it (optional)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!ready}>
            Add it
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Staff, in a famous series: list a problem we don't have, by a link to the original. */
export function AddLinkForm({ setId, onAdded }: { setId: string; onAdded: () => void }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [section, setSection] = useState('')
  const [busy, setBusy] = useState(false)
  const ok = title.trim().length >= 2 && /^https?:\/\/\S+\.\S+/.test(url.trim())
  const save = async () => {
    setBusy(true)
    try {
      await api.post(`/api/problem-sets/${setId}/items`, { title, url, section })
      toast.success('Link added', title)
      setTitle('')
      setUrl('')
      onAdded()
    } catch (e) {
      toast.error("Couldn't add it", errText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <h3 className="m-0 text-sm font-semibold text-text-primary">A problem we don’t have</h3>
      <p className="m-0 text-xs text-text-muted">It shows as a link to the original. Nothing is copied.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Problem name">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Section (optional)">
          <Input value={section} onChange={(e) => setSection(e.target.value)} maxLength={60} placeholder="Arrays" />
        </Field>
      </div>
      <Field label="Link">
        <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="outline" size="sm" loading={busy} disabled={!ok}>
          <Plus aria-hidden="true" /> Add the link
        </Button>
      </div>
    </form>
  )
}
