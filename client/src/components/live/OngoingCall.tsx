/*
  A call still going while you are on another page (live/activeCall.ts): a
  slim bar on every page with the room, the time, mute, "Back to call" and
  hang up. Everyone is still heard; nothing to rejoin.
*/
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mic, MicOff, PhoneOff } from 'lucide-react'
import { setActiveCall, useActiveCall } from '@/live/activeCall'
import { useLive, type LiveSession, type LiveState } from '@/live/session'
import { cn } from '@/lib/utils'
import './ongoing.css'

export function OngoingCall() {
  const call = useActiveCall()
  const { pathname } = useLocation()
  if (!call || pathname === `/live/${call.code}`) return null
  return <Bar key={call.code} session={call.session} code={call.code} title={call.title} />
}

const clock = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const sec = String(t % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

function Bar({ session, code, title }: { session: LiveSession; code: string; title: string }) {
  const s = useLive(session)
  const navigate = useNavigate()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  // The call ended (host ended it, removed, connection gone): the bar goes.
  useEffect(() => {
    if (s.phase !== 'in' && s.phase !== 'reconnecting') {
      session.dispose()
      setActiveCall(null)
    }
  }, [s.phase, session])

  const people = new Set([s.self?.username, ...Object.values(s.peers).map((p) => p.username)].filter(Boolean)).size
  const hangUp = () => {
    session.leave()
    setActiveCall(null)
  }
  return (
    <div className="oc" role="region" aria-label="Call in progress">
      <span className={cn('oc-dot', s.phase === 'reconnecting' && 'is-warn')} aria-hidden="true" />
      <button type="button" className="oc-main" onClick={() => navigate(`/live/${code}`)}>
        <span className="oc-title">{title}</span>
        <span className="oc-sub">
          {s.phase === 'reconnecting' ? 'Reconnecting…' : `${people} ${people === 1 ? 'person' : 'people'}`}
          {s.joinedAt ? ` · ${clock(now - s.joinedAt)}` : ''}
        </span>
      </button>
      <button type="button" className={cn('oc-btn', !s.mic && 'is-off')} onClick={() => session.setMic(!s.mic)} aria-pressed={s.mic} aria-label={s.mic ? 'Mute' : 'Unmute'} title={s.mic ? 'Mute' : 'Unmute'}>
        {s.mic ? <Mic className="size-4" aria-hidden="true" /> : <MicOff className="size-4" aria-hidden="true" />}
      </button>
      <button type="button" className="oc-back" onClick={() => navigate(`/live/${code}`)}>
        Back to call
      </button>
      <button type="button" className="oc-btn is-end" onClick={hangUp} aria-label="Leave the call" title="Leave the call">
        <PhoneOff className="size-4" aria-hidden="true" />
      </button>
      <Sinks session={session} s={s} />
    </div>
  )
}

/** Everyone's voice keeps playing while the room page is closed. */
function Sinks({ session, s }: { session: LiveSession; s: LiveState }) {
  const items = Object.entries(s.media).flatMap(([peerId, m]) => (m.mic ? [{ peerId, id: m.mic.id }] : []))
  return (
    <div hidden>
      {items.map((i) => (
        <Sink key={`${i.peerId}:${i.id}`} session={session} peerId={i.peerId} />
      ))}
    </div>
  )
}
function Sink({ session, peerId }: { session: LiveSession; peerId: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    session.attach(peerId, 'mic', el)
    return () => session.detach(peerId, 'mic', el)
  }, [session, peerId])
  return <audio ref={ref} autoPlay />
}
