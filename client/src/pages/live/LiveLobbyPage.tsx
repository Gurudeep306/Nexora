/*
  /live — study together: start a room, join one with a code, see the public
  rooms that are live now, rooms you were invited to, and your recent rooms.
*/
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Link2, Mic, MonitorUp, PenLine, Radio, Tablet, Users, Video } from 'lucide-react'
import { Avatar, Modal, useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { codeFrom, liveApi, type LiveMode, type LiveRoom, type Visibility } from '@/live/api'
import '@/live/live.css'

const VIS: { id: Visibility; label: string; hint: string }[] = [
  { id: 'link', label: 'Anyone with the link', hint: 'Share the link with your group.' },
  { id: 'public', label: 'Listed on Live', hint: 'Any member can find it and join.' },
  { id: 'invite', label: 'Ask to join', hint: 'People wait until you let them in.' },
]

export default function LiveLobbyPage() {
  const rooms = useApi(() => liveApi.list(), [], { cacheKey: 'live:rooms' })
  const cfg = useApi(() => liveApi.config(), [], { cacheKey: 'live:config' })
  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState<string | null>(null)
  const navigate = useNavigate()
  // Live now changes by the minute.
  const { refetch } = rooms
  useEffect(() => {
    const id = window.setInterval(refetch, 20_000)
    return () => window.clearInterval(id)
  }, [refetch])

  const join = () => {
    const c = codeFrom(code)
    if (!c) return setCodeErr('Type a code like abc-defg-hij, or paste the link.')
    navigate(`/live/${c}`)
  }

  const live = rooms.data?.live ?? []
  const invited = rooms.data?.invited ?? []
  const mine = (rooms.data?.mine ?? []).filter((r) => !live.some((l) => l.code === r.code)).slice(0, 8)

  return (
    <div className="lv-lobby">
      <header className="lv-hero">
        <div className="lv-hero-text">
          <p className="ed-label m-0">Live</p>
          <h1 className="lv-hero-title">
            Study together, <em>live.</em>
          </h1>
          <p className="lv-hero-lead">Talk a problem through, share several screens at once, and teach on a whiteboard from your tablet.</p>
        </div>
        <div className="lv-hero-side">
          <button type="button" className="lv-join" onClick={() => setCreating(true)}>
            Start a room
          </button>
          <form
            className="lv-code-form"
            onSubmit={(e) => {
              e.preventDefault()
              join()
            }}
          >
            <label className="search-field" htmlFor="lv-code">
              <Link2 className="search-field-icon" aria-hidden="true" />
              <input
                id="lv-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setCodeErr(null)
                }}
                placeholder="Have a code? abc-defg-hij"
                autoComplete="off"
                spellCheck={false}
                aria-label="Room code or link"
                aria-invalid={!!codeErr}
                aria-describedby={codeErr ? 'lv-code-err' : undefined}
              />
            </label>
            <button type="submit" className="lv-chip-btn" disabled={!code.trim()}>
              Join
            </button>
          </form>
          {codeErr && (
            <p id="lv-code-err" className="lv-status is-bad" role="alert">
              {codeErr}
            </p>
          )}
        </div>
      </header>

      <ul className="lv-ways" aria-label="What a room can do">
        {(
          [
            [Video, 'Video or voice', 'Cameras on, or just voices for a quiet doubt session.'],
            [MonitorUp, 'Several screens', 'Two people can share at once: code beside the question.'],
            [Tablet, 'A tablet by QR', 'Scan, then teach on a whiteboard with your stylus.'],
            [PenLine, 'Hands and chat', 'Raise a hand, send code, react without interrupting.'],
          ] as const
        ).map(([I, t, d]) => (
          <li key={t} className="lv-way">
            <span className="lv-way-icon">
              <I className="size-4" aria-hidden="true" />
            </span>
            <span>
              <strong>{t}</strong>
              <span>{d}</span>
            </span>
          </li>
        ))}
      </ul>

      {invited.length > 0 && (
        <Section title="Invited">
          {invited.map((r) => (
            <RoomCard key={r.code} r={r} live />
          ))}
        </Section>
      )}

      <Section title="Live now" empty={rooms.loading ? null : live.length ? null : 'No public rooms right now. Start one and list it on Live.'}>
        {live.map((r) => (
          <RoomCard key={r.code} r={r} live />
        ))}
      </Section>

      {mine.length > 0 && (
        <Section title="Your recent rooms">
          {mine.map((r) => (
            <RoomCard key={r.code} r={r} />
          ))}
        </Section>
      )}

      {cfg.data && (
        <p className="lv-hint mt-8">
          {cfg.data.transport === 'sfu'
            ? `Rooms go through the NexoraGuru video server and hold up to ${cfg.data.maxDevices} devices.`
            : `Rooms connect devices to each other directly and hold up to ${cfg.data.maxDevices} devices.`}
        </p>
      )}

      {creating && <CreateDialog onClose={() => setCreating(false)} />}
    </div>
  )
}

function Section({ title, empty, children }: { title: string; empty?: string | null; children?: React.ReactNode }) {
  return (
    <section className="lv-section mt-8" aria-label={title}>
      <h2 className="lv-h2">{title}</h2>
      {empty ? <p className="lv-empty">{empty}</p> : <ul className="lv-cards">{children}</ul>}
    </section>
  )
}

function RoomCard({ r, live = false }: { r: LiveRoom; live?: boolean }) {
  const ended = !!r.endedAt
  return (
    <li>
      <Link to={`/live/${r.code}`} className={cn('lv-card', ended && 'is-ended')}>
        <div className="lv-card-top">
          <span className="lv-card-kind">
            {r.mode === 'voice' ? <Mic className="size-3.5" aria-hidden="true" /> : <Video className="size-3.5" aria-hidden="true" />}
            {r.isCall ? 'Call' : r.mode === 'voice' ? 'Voice' : 'Video'}
          </span>
          {live && (r.people ?? 0) > 0 ? (
            <span className="lv-card-live">
              <span className="lv-dot-live" aria-hidden="true" /> {r.people} in
            </span>
          ) : ended ? (
            <span className="lv-card-ended">Ended</span>
          ) : (
            <span className="lv-card-ended">{new Date(r.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
          )}
        </div>
        <p className="lv-card-title">{r.title}</p>
        {r.about && <p className="lv-card-about">{r.about.title}</p>}
        {r.faces && r.faces.length > 0 && (
          <div className="lv-faces">
            {r.faces.map((f) => (
              <Avatar key={f.username} src={f.avatarUrl} avatar={f.avatar} name={f.name} seed={f.username} size="xs" />
            ))}
          </div>
        )}
      </Link>
    </li>
  )
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<LiveMode>('video')
  const [vis, setVis] = useState<Visibility>('link')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const create = async () => {
    setBusy(true)
    try {
      const room = await liveApi.create({ title, mode, visibility: vis })
      navigate(`/live/${room.code}`)
    } catch (e) {
      toast.error('Could not start the room', (e as Error).message)
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Start a room" description="You are the host: you can mute, spotlight, lock the room and let people in.">
      <form
        className="lv-create"
        onSubmit={(e) => {
          e.preventDefault()
          void create()
        }}
      >
        <label className="lv-field">
          <span className="ed-label">Name</span>
          <input className="lv-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Graphs revision, DP doubts…" autoFocus />
        </label>
        <fieldset className="lv-field">
          <legend className="ed-label">Kind</legend>
          <div className="lv-choice-row">
            {(
              [
                ['video', 'Video', Video],
                ['voice', 'Voice only', Radio],
              ] as const
            ).map(([id, label, I]) => (
              <label key={id} className={cn('lv-choice', mode === id && 'is-on')}>
                <input type="radio" name="mode" value={id} checked={mode === id} onChange={() => setMode(id)} className="sr-only" />
                <I className="size-4" aria-hidden="true" /> {label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="lv-field">
          <legend className="ed-label">Who can join</legend>
          <div className="lv-choice-col">
            {VIS.map((v) => (
              <label key={v.id} className={cn('lv-choice is-wide', vis === v.id && 'is-on')}>
                <input type="radio" name="vis" value={v.id} checked={vis === v.id} onChange={() => setVis(v.id)} className="sr-only" />
                <Users className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong>{v.label}</strong>
                  <span className="lv-hint block">{v.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="lv-join" disabled={busy}>
          {busy ? 'Starting…' : 'Start the room'}
        </button>
      </form>
    </Modal>
  )
}
