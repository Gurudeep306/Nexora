/*
  Incoming calls, on any page: a card with the caller, Accept and Decline,
  and a soft ringtone. It goes away after 45 seconds, or when the caller
  hangs up.
*/
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useSocket } from '@/lib/socket'
import { liveApi, type Face, type LiveMode } from '@/live/api'
import { ringtone } from '@/live/ring'
import './ringer.css'

type Ring = { code: string; mode: LiveMode; title: string; from: Face; at: number; invite?: boolean }

export function CallRinger() {
  const socket = useSocket()
  const [ring, setRing] = useState<Ring | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!socket) return
    const on = (r: Ring) => setRing(r)
    const off = (d: { code: string }) => setRing((cur) => (cur?.code === d.code ? null : cur))
    socket.on('live:ring', on)
    socket.on('live:ring-cancel', off)
    return () => {
      socket.off('live:ring', on)
      socket.off('live:ring-cancel', off)
    }
  }, [socket])

  useEffect(() => {
    if (!ring) return
    const stop = ringtone()
    const t = window.setTimeout(() => setRing(null), 45_000)
    return () => {
      stop()
      window.clearTimeout(t)
    }
  }, [ring])

  if (!ring) return null
  const accept = () => {
    setRing(null)
    // A call starts at once; a room invite opens the room's join screen.
    navigate(ring.invite ? `/live/${ring.code}` : `/live/${ring.code}?answer=1`)
  }
  const decline = () => {
    void liveApi.decline(ring.code).catch(() => {})
    setRing(null)
  }
  return (
    <div className="lv-ringer" role="alertdialog" aria-label={ring.invite ? `${ring.from.name} invites you to ${ring.title}` : `${ring.from.name} is calling`}>
      <Avatar src={ring.from.avatarUrl} avatar={ring.from.avatar} name={ring.from.name} seed={ring.from.username} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="lv-ringer-name">{ring.from.name}</p>
        <p className="lv-ringer-kind">{ring.invite ? `Invites you to “${ring.title}”` : ring.mode === 'voice' ? 'Voice call' : 'Video call'}</p>
      </div>
      <button type="button" className="lv-round is-bad" onClick={decline} aria-label="Decline">
        <PhoneOff className="size-4" aria-hidden="true" />
      </button>
      {ring.invite ? (
        <button type="button" className="lv-ringer-join" onClick={accept} autoFocus>
          Join
        </button>
      ) : (
        <button type="button" className="lv-round is-ok" onClick={accept} aria-label="Accept" autoFocus>
          {ring.mode === 'voice' ? <Phone className="size-4" aria-hidden="true" /> : <Video className="size-4" aria-hidden="true" />}
        </button>
      )}
    </div>
  )
}

/** "Voice call" and "Video call" buttons, e.g. in a conversation header. */
export function CallButtons({ to, className = 'lv-call-btns' }: { to: string[]; className?: string }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const call = async (mode: LiveMode) => {
    setBusy(true)
    setErr(null)
    try {
      const room = await liveApi.call(to, mode)
      navigate(`/live/${room.code}?call=1`)
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }
  return (
    <span className={className}>
      <button type="button" className="lv-round" disabled={busy} onClick={() => void call('voice')} aria-label="Voice call" title={err ?? 'Voice call'}>
        <Phone className="size-4" aria-hidden="true" />
      </button>
      <button type="button" className="lv-round" disabled={busy} onClick={() => void call('video')} aria-label="Video call" title={err ?? 'Video call'}>
        <Video className="size-4" aria-hidden="true" />
      </button>
    </span>
  )
}
