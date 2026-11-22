/*
  /live/:code — one Live room, full screen (no Dock). Before joining: the
  pre-join screen. Then the room. ?call=1 (the caller) and ?answer=1 (the
  person who picked up) join straight away.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PhoneOff } from 'lucide-react'
import { MarkLoader } from '@/components/brand/Logo'
import { useSocket } from '@/lib/socket'
import { liveApi, type LiveRoom } from '@/live/api'
import { LiveSession, useLive } from '@/live/session'
import { PreJoin } from '@/live/ui/PreJoin'
import { Room } from '@/live/ui/Room'
import { ringback } from '@/live/ring'
import { getActiveCall, setActiveCall } from '@/live/activeCall'
import '@/live/live.css'

export default function LiveRoomPage() {
  const { code = '' } = useParams()
  const [params] = useSearchParams()
  const autoJoin = params.get('call') === '1' || params.get('answer') === '1'
  const caller = params.get('call') === '1'
  const [room, setRoom] = useState<LiveRoom | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Back from another page mid-call: the same session, still connected.
  const session = useMemo(() => {
    const a = getActiveCall()
    return a && a.code === code ? a.session : new LiveSession(code)
  }, [code])
  const s = useLive(session)
  const navigate = useNavigate()
  const started = useRef(false)

  useEffect(() => {
    let live = true
    liveApi
      .room(code)
      .then((r) => live && setRoom(r))
      .catch((e: Error) => live && setLoadError(e.message || 'This room does not exist.'))
    return () => {
      live = false
    }
  }, [code])

  useEffect(() => {
    const a = getActiveCall()
    if (a?.session === session) setActiveCall(null)
    else if (a) {
      // Opening another room ends the call going on elsewhere.
      a.session.leave()
      setActiveCall(null)
    }
    const bye = () => session.dispose()
    window.addEventListener('pagehide', bye)
    return () => {
      window.removeEventListener('pagehide', bye)
      // Leaving the page mid-call keeps the call: a bar on every page brings you back.
      const st = session.get()
      if (st.phase === 'in' || st.phase === 'reconnecting') setActiveCall({ session, code, title: st.room?.title || 'Live' })
      else session.dispose()
    }
  }, [session, code])

  // Calls skip the pre-join screen.
  useEffect(() => {
    if (!autoJoin || !room || started.current || room.endedAt || session.get().phase !== 'idle') return
    started.current = true
    void session.join({ mic: true, cam: room.mode === 'video' })
  }, [autoJoin, room, session])

  useEffect(() => {
    document.title = room ? `${room.title} · Live · NexoraGuru` : 'Live · NexoraGuru'
  }, [room])

  if (loadError) return <End title="Can't open this room" text={loadError} />
  if (!room) return <Loading label="Opening the room" />
  if (room.endedAt && s.phase === 'idle') return <End title="This room has ended" text="Start a new one from Live." />

  // A lecture's audience just watches: no camera or mic to set up.
  if (room.kind === 'lecture' && !room.isHost && (s.phase === 'idle' || (s.phase === 'joining' && !autoJoin))) {
    return (
      <main className="lv-shell">
        <section className="lv-watch">
          <p className="ed-label m-0">Live lecture</p>
          <h1 className="lv-watch-title">{room.title}</h1>
          {room.hostInfo && <p className="lv-watch-by">with {room.hostInfo.name}</p>}
          <p className="lv-watch-meta">{room.people ? `${room.people} here now` : 'Starting soon'} · you watch and can chat, react and raise your hand</p>
          <button type="button" className="lv-watch-go" disabled={s.phase === 'joining'} onClick={() => void session.join({ mic: false, cam: false, micTrack: null, camTrack: null })}>
            {s.phase === 'joining' ? 'Joining…' : 'Watch the lecture'}
          </button>
        </section>
      </main>
    )
  }
  if (s.phase === 'idle' || (s.phase === 'joining' && !autoJoin)) {
    return (
      <main className="lv-shell">
        <PreJoin room={room} busy={s.phase === 'joining'} onJoin={(c) => void session.join(c)} />
      </main>
    )
  }
  if (s.phase === 'joining') return <Loading label="Joining" />
  if (s.phase === 'waiting')
    return (
      <End
        title="Waiting to be let in"
        text="The host has been told you are here. This page lets you in as soon as they say yes."
        busy
        action={
          <button type="button" className="lv-chip-btn" onClick={() => (session.leave(), navigate('/live'))}>
            Cancel
          </button>
        }
      />
    )
  if (s.phase === 'in' || s.phase === 'reconnecting')
    return (
      <>
        <Room session={session} s={s} onLeft={() => navigate('/live')} />
        {caller && <Calling session={session} code={code} alone={Object.keys(s.peers).length === 0} />}
      </>
    )
  const titles: Record<string, string> = { ended: 'You left the room', removed: 'You were removed', denied: 'Not let in', error: "Couldn't join" }
  return (
    <End
      title={s.message && s.phase === 'ended' ? 'The room has ended' : titles[s.phase] ?? 'Done'}
      text={s.message || 'Thanks for studying together.'}
      action={
        s.phase === 'ended' && !s.message ? (
          <button type="button" className="lv-chip-btn" onClick={() => window.location.reload()}>
            Rejoin
          </button>
        ) : null
      }
    />
  )
}

/** The caller's "Calling…" card until someone picks up. */
function Calling({ session, code, alone }: { session: LiveSession; code: string; alone: boolean }) {
  const socket = useSocket()
  const [declined, setDeclined] = useState<string[]>([])
  const navigate = useNavigate()
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (!alone) return
    const stop = ringback()
    const t = window.setTimeout(() => setTimedOut(true), 45_000)
    return () => {
      stop()
      window.clearTimeout(t)
    }
  }, [alone])
  useEffect(() => {
    if (!socket) return
    const on = (d: { code: string; name: string }) => d.code === code && setDeclined((x) => [...x, d.name])
    socket.on('live:declined', on)
    return () => {
      socket.off('live:declined', on)
    }
  }, [socket, code])
  if (!alone) return null
  const cancel = () => {
    void liveApi.cancel(code).catch(() => {})
    session.leave()
    navigate('/live')
  }
  return (
    <div className="lv-calling" role="status">
      <p className="lv-calling-text">{declined.length ? `${declined.join(', ')} declined.` : timedOut ? 'No answer.' : 'Calling…'}</p>
      <button type="button" className="lv-ctrl is-leave" onClick={cancel} aria-label="Cancel the call">
        <PhoneOff className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}

function Loading({ label }: { label: string }) {
  return (
    <main className="lv-shell lv-end" role="status" aria-label={label}>
      <MarkLoader label={label} />
    </main>
  )
}

function End({ title, text, action, busy }: { title: string; text: string; action?: React.ReactNode; busy?: boolean }) {
  return (
    <main className="lv-shell lv-end">
      <div className="lv-end-card">
        {busy && <span className="lv-wait-dot" aria-hidden="true" />}
        <h1 className="lv-end-title">{title}</h1>
        <p className="lv-end-text">{text}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {action}
          <Link to="/live" className="lv-chip-btn">
            Back to Live
          </Link>
        </div>
      </div>
    </main>
  )
}
