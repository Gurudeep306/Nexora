/*
  /live/d/:token — a tablet (or a second phone) joined to a Live room by QR.
  It is not signed in: the token stands for its owner, in one room, for six
  hours. It sends no sound (the owner's computer has the mic), only what it
  shows: a whiteboard written with a stylus, its camera pointed at paper, or
  its screen where the browser allows it. It keeps the screen awake.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Camera, MonitorUp, PenLine, RefreshCw, Square, Users } from 'lucide-react'
import { MarkLoader } from '@/components/brand/Logo'
import { cn } from '@/lib/utils'
import { liveApi } from '@/live/api'
import { LiveSession, useLive } from '@/live/session'
import { cameraTrack, canShareScreen, loadPrefs } from '@/live/devices'
import { Board, type BoardHandle } from '@/live/ui/Board'
import '@/live/live.css'

type Info = { code: string; title: string; name: string }

export default function LiveDevicePage() {
  const { token = '' } = useParams()
  const [info, setInfo] = useState<Info | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    liveApi
      .deviceInfo(token)
      .then((r) => setInfo({ code: r.code, title: r.title, name: r.name }))
      .catch((e: Error) => setError(e.message || 'This link does not work.'))
  }, [token])
  useEffect(() => {
    document.title = 'Tablet · Live · NexoraGuru'
  }, [])
  if (error) return <Msg title="This link doesn't work" text={error} />
  if (!info) return <Msg title="Connecting" busy />
  return <Device token={token} info={info} />
}

function Device({ token, info }: { token: string; info: Info }) {
  const session = useMemo(() => new LiveSession(info.code, { device: token }), [info.code, token])
  const s = useLive(session)
  const [mode, setMode] = useState<'board' | 'camera' | null>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const board = useRef<BoardHandle>(null)
  const preview = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    void session.join({ mic: false, cam: false })
    const bye = () => session.dispose()
    window.addEventListener('pagehide', bye)
    return () => {
      window.removeEventListener('pagehide', bye)
      session.dispose()
    }
  }, [session])

  // Keep the tablet awake while it is in the room.
  useEffect(() => {
    if (s.phase !== 'in') return
    let lock: { release: () => Promise<void> } | null = null
    const ask = () =>
      (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
        ?.request('screen')
        .then((l) => (lock = l))
        .catch(() => {})
    void ask()
    const vis = () => document.visibilityState === 'visible' && void ask()
    document.addEventListener('visibilitychange', vis)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      void lock?.release().catch(() => {})
    }
  }, [s.phase])

  const camScreen = s.screens.find((x) => x.kind === 'camera')
  useEffect(() => {
    if (preview.current) preview.current.srcObject = camScreen ? new MediaStream([camScreen.track]) : null
  }, [camScreen])

  const startBoard = () => {
    setMode('board')
    requestAnimationFrame(() => {
      const t = board.current?.track()
      if (t) void session.addScreen({ id: 'board', label: 'Whiteboard', kind: 'board', track: t })
    })
  }
  const startCamera = async (f = facing) => {
    try {
      const t = await cameraTrack(loadPrefs(), f)
      const old = s.screens.find((x) => x.kind === 'camera')
      if (old) await session.stopScreen(old.id)
      await session.addScreen({ id: `camera-${Math.random().toString(36).slice(2, 7)}`, label: 'Camera', kind: 'camera', track: t })
      setMode('camera')
    } catch (e) {
      session.notice((e as Error).message, 'error')
    }
  }
  const stopAll = async () => {
    for (const x of s.screens) await session.stopScreen(x.id)
    setMode(null)
  }

  if (s.phase === 'idle' || s.phase === 'joining') return <Msg title="Connecting" busy />
  if (s.phase !== 'in' && s.phase !== 'reconnecting')
    return <Msg title={s.phase === 'error' ? "Couldn't join" : 'Done'} text={s.message || 'You can close this page.'} />

  const people = new Set(Object.values(s.peers).map((p) => p.username)).size
  const screen = s.screens.find((x) => x.kind === 'screen')
  return (
    <div className="lv-device">
      <header className="lv-top">
        <div className="lv-top-title">
          <span className="lv-dot-live" aria-hidden="true" />
          <h1 className="lv-title">{info.title}</h1>
        </div>
        <div className="lv-top-meta">
          <span className="lv-people-n">
            <Users className="size-4" aria-hidden="true" /> {people}
          </span>
          {s.screens.length > 0 && (
            <button type="button" className="lv-chip-btn is-danger" onClick={() => void stopAll()}>
              <Square className="size-3.5" aria-hidden="true" /> Stop
            </button>
          )}
          <button type="button" className="lv-chip-btn" onClick={() => session.leave()}>
            Leave
          </button>
        </div>
      </header>
      {s.phase === 'reconnecting' && (
        <div className="lv-banner is-warn" role="status">
          Reconnecting…
        </div>
      )}

      <main className="lv-device-main">
        {mode === 'board' ? (
          <Board ref={board} className="is-device" />
        ) : mode === 'camera' && camScreen ? (
          <div className="lv-device-cam">
            <video ref={preview} autoPlay playsInline muted className="lv-video is-screen" />
            <div className="lv-device-cam-bar">
              <button
                type="button"
                className="lv-chip-btn"
                onClick={() => {
                  const f = facing === 'environment' ? 'user' : 'environment'
                  setFacing(f)
                  void startCamera(f)
                }}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" /> Flip camera
              </button>
            </div>
          </div>
        ) : screen ? (
          <div className="lv-device-pick">
            <p className="lv-end-text">Your screen is being shared. Switch to any app; come back here to stop.</p>
          </div>
        ) : (
          <div className="lv-device-pick">
            <p className="ed-label m-0">Connected as {info.name}</p>
            <h2 className="lv-pre-title">What should everyone see?</h2>
            <div className="lv-device-choices">
              <button type="button" className="lv-device-choice" onClick={startBoard}>
                <PenLine className="size-7" aria-hidden="true" />
                <strong>Whiteboard</strong>
                <span>Write with your stylus or finger. Everyone sees it live.</span>
              </button>
              <button type="button" className="lv-device-choice" onClick={() => void startCamera()}>
                <Camera className="size-7" aria-hidden="true" />
                <strong>Camera on paper</strong>
                <span>Point the back camera at your notebook.</span>
              </button>
              <button type="button" className={cn('lv-device-choice', !canShareScreen() && 'is-off')} disabled={!canShareScreen()} onClick={() => void session.shareScreen()}>
                <MonitorUp className="size-7" aria-hidden="true" />
                <strong>This screen</strong>
                <span>{canShareScreen() ? 'Share any app on this device.' : 'iPad and iPhone browsers cannot share their screen. Use the whiteboard.'}</span>
              </button>
            </div>
          </div>
        )}
      </main>
      <div className="lv-notices" aria-live="polite">
        {s.notices.map((n) => (
          <p key={n.id} className={cn('lv-notice', n.tone && `is-${n.tone}`)}>
            {n.text}
          </p>
        ))}
      </div>
    </div>
  )
}

function Msg({ title, text, busy }: { title: string; text?: string; busy?: boolean }) {
  return (
    <main className="lv-shell lv-end">
      <div className="lv-end-card">
        {busy ? <MarkLoader label={title} /> : <h1 className="lv-end-title">{title}</h1>}
        {text && <p className="lv-end-text">{text}</p>}
      </div>
    </main>
  )
}
