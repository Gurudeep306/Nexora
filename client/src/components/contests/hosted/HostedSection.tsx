import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, Plus } from 'lucide-react'
import { Button, EmptyState, Field, Input, LoadingBlock, Modal } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { PHASE_LABEL, contestUrl, timingLine, type ContestSummary } from './api'
import './hosted.css'

/*
  Contests page: contests made on NexoraGuru. The ones you host (drafts
  included) and the ones you joined, "Join with a code", and "New contest".
*/

const STATE_LABEL = { not_started: 'Not started', running: 'Your time is running', finished: 'Done', missed: 'Missed' } as const

export function HostedSection() {
  const navigate = useNavigate()
  const mine = useApi<{ hosting: ContestSummary[]; joined: ContestSummary[] }>(() => api.get('/api/hosted/mine'), [])
  const [joinOpen, setJoinOpen] = useState(false)
  const [code, setCode] = useState('')
  const clean = code.trim().toUpperCase().replace(/^(?!NX-)([A-Z2-9]{6})$/, 'NX-$1')

  const row = (c: ContestSummary, hosting: boolean) => (
    <li key={c.id} className="hc-item" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
      <div className="min-w-0">
        <Link to={hosting && c.status === 'draft' ? `/contests/${c.id}/edit` : contestUrl(c.code)} className="hc-title">
          {c.title}
        </Link>
        <span className="hc-sub">
          <span>{timingLine(c)}</span>
          {hosting ? (
            <span>
              {c.items ?? 0} question{c.items === 1 ? '' : 's'} · {c.people ?? 0} joined
            </span>
          ) : (
            c.mine && <span>{STATE_LABEL[c.mine]}</span>
          )}
        </span>
      </div>
      <div className="hc-side">
        <span className="hc-chip" data-tone={c.phase === 'live' ? 'live' : undefined}>
          {PHASE_LABEL[c.phase]}
        </span>
        {hosting && c.status !== 'draft' && (
          <Button size="sm" variant="outline" onClick={() => navigate(`/contests/${c.id}/results`)} aria-label={`Marks for ${c.title}`}>
            Marks
          </Button>
        )}
      </div>
    </li>
  )

  return (
    <section className="mt-10" aria-labelledby="hosted-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="hosted-title" className="ed-h2 m-0">
            Hosted on NexoraGuru
          </h2>
          <p className="hc-note mt-1">Make a contest with coding problems and GATE questions, for friends or a class.</p>
        </div>
        <div className="hc-actions">
          <Button variant="outline" size="sm" onClick={() => setJoinOpen(true)}>
            <KeyRound /> Join with a code
          </Button>
          <Button size="sm" onClick={() => navigate('/contests/new')}>
            <Plus /> New contest
          </Button>
        </div>
      </div>

      {mine.loading ? (
        <LoadingBlock rows={3} />
      ) : mine.error ? (
        <p className="hc-note text-state-error">{mine.error}</p>
      ) : !mine.data?.hosting.length && !mine.data?.joined.length ? (
        <EmptyState icon="trophy" title="No hosted contests yet" description="Make one, or join one with the code someone shared." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-text-secondary">You host</h3>
            {mine.data?.hosting.length ? <ul className="hc-list">{mine.data.hosting.map((c) => row(c, true))}</ul> : <p className="hc-note">None yet.</p>}
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-text-secondary">You joined</h3>
            {mine.data?.joined.length ? <ul className="hc-list">{mine.data.joined.map((c) => row(c, false))}</ul> : <p className="hc-note">None yet.</p>}
          </div>
        </div>
      )}

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join with a code" description="The host shares a code like NX-7K2QPA.">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (/^NX-[A-Z2-9]{6}$/.test(clean)) navigate(contestUrl(clean))
          }}
        >
          <div className="min-w-[12rem] flex-1">
            <Field label="Contest code">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="NX-…" autoFocus autoCapitalize="characters" />
            </Field>
          </div>
          <Button type="submit" disabled={!/^NX-[A-Z2-9]{6}$/.test(clean)}>
            Open
          </Button>
        </form>
      </Modal>
    </section>
  )
}
