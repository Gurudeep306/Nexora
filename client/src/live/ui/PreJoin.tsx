/*
  Before joining: see yourself, check the mic moves, pick devices, choose to
  come in with the mic or camera off. The tracks made here are handed to the
  room, so the camera does not restart.
*/
import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Video, VideoOff, Users, Lock } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { liveApi, type LiveRoom } from '../api'
import { cameraTrack, listDevices, loadPrefs, micTrack, savePrefs, type Prefs } from '../devices'
import { Meter } from '../levels'

export type JoinChoice = { mic: boolean; cam: boolean; micTrack: MediaStreamTrack | null; camTrack: MediaStreamTrack | null }

export function PreJoin({ room, onJoin, busy }: { room: LiveRoom; onJoin: (c: JoinChoice) => void; busy: boolean }) {
  const { user } = useAuth()
  const voice = room.mode === 'voice'
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(!voice)
  const [micT, setMicT] = useState<MediaStreamTrack | null>(null)
  const [camT, setCamT] = useState<MediaStreamTrack | null>(null)
  const [err, setErr] = useState<{ mic?: string; cam?: string }>({})
  const [devices, setDevices] = useState<Awaited<ReturnType<typeof listDevices>> | null>(null)
  const [level, setLevel] = useState(0)
  const video = useRef<HTMLVideoElement>(null)
  const handed = useRef(false)
  // A quick round trip to the server: how the connection feels.
  const [ping, setPing] = useState<number | null>(null)
  useEffect(() => {
    let live = true
    const t0 = performance.now()
    void liveApi
      .config()
      .catch(() => null)
      .then(() => live && setPing(Math.round(performance.now() - t0)))
    return () => {
      live = false
    }
  }, [])
  const tracks = useRef<{ mic: MediaStreamTrack | null; cam: MediaStreamTrack | null }>({ mic: null, cam: null })

  // Mic preview.
  useEffect(() => {
    if (!mic) return
    let alive = true
    micTrack(prefs)
      .then((t) => {
        if (!alive) return t.stop()
        tracks.current.mic?.stop()
        tracks.current.mic = t
        setMicT(t)
        setErr((e) => ({ ...e, mic: undefined }))
      })
      .catch((e: Error) => alive && setErr((x) => ({ ...x, mic: e.message })))
    return () => {
      alive = false
    }
  }, [mic, prefs.mic, prefs.noise]) // eslint-disable-line react-hooks/exhaustive-deps

  // Camera preview.
  useEffect(() => {
    if (!cam || voice) {
      tracks.current.cam?.stop()
      tracks.current.cam = null
      return
    }
    let alive = true
    cameraTrack(prefs)
      .then((t) => {
        if (!alive) return t.stop()
        tracks.current.cam?.stop()
        tracks.current.cam = t
        setCamT(t)
        setErr((e) => ({ ...e, cam: undefined }))
      })
      .catch((e: Error) => {
        if (!alive) return
        setErr((x) => ({ ...x, cam: e.message }))
        setCam(false)
      })
    return () => {
      alive = false
    }
  }, [cam, voice, prefs.cam]) // eslint-disable-line react-hooks/exhaustive-deps

  // What shows: the camera only while it is switched on.
  const shownCam = cam && !voice && camT?.readyState === 'live' ? camT : null
  useEffect(() => {
    if (video.current) video.current.srcObject = shownCam ? new MediaStream([shownCam]) : null
  }, [shownCam])

  useEffect(() => {
    void listDevices().then(setDevices)
  }, [micT, camT])

  // The level meter.
  useEffect(() => {
    if (!micT || !mic) return
    const m = new Meter(micT)
    let raf = 0
    const loop = () => {
      setLevel(m.level())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      m.stop()
    }
  }, [micT, mic])

  // Tracks not handed to the room are stopped when this screen goes away.
  useEffect(
    () => () => {
      if (handed.current) return
      tracks.current.mic?.stop()
      tracks.current.cam?.stop()
    },
    [],
  )

  const choose = (kind: 'mic' | 'cam', id: string) => {
    const p = { ...prefs, [kind]: id }
    setPrefs(p)
    savePrefs(p)
  }

  const join = () => {
    handed.current = true
    if (!mic) tracks.current.mic?.stop()
    onJoin({ mic, cam: cam && !voice, micTrack: mic ? tracks.current.mic : null, camTrack: cam ? tracks.current.cam : null })
  }

  const shownLevel = mic && micT ? level : 0
  const name = (user?.display_name as string | undefined) || user?.username || 'You'
  const photo = (user?.avatar_url as string | undefined) ?? null
  const knock = room.enter === 'knock'
  return (
    <div className="lv-pre">
      <div className="lv-pre-preview lv-plate">
        <span className="lv-tick is-tl" aria-hidden="true" />
        <span className="lv-tick is-tr" aria-hidden="true" />
        <span className="lv-tick is-bl" aria-hidden="true" />
        <span className="lv-tick is-br" aria-hidden="true" />
        <div className={cn('lv-pre-video', !shownCam && 'is-empty')}>
          {shownCam ? (
            <video ref={video} autoPlay playsInline muted className={cn('lv-video is-cam', prefs.mirror && 'is-mirror')} />
          ) : (
            <div className="lv-avatar-wrap">
              <Avatar src={photo} avatar={user?.avatar} name={name} seed={user?.username} size="3xl" />
              <p className="lv-pre-off">{voice ? 'Voice room: cameras stay off' : err.cam ? err.cam : 'Your camera is off'}</p>
            </div>
          )}
          <div className="lv-pre-bar">
            <button type="button" className={cn('lv-ctrl', !mic && 'is-off')} onClick={() => setMic(!mic)} aria-pressed={mic} aria-label={mic ? 'Turn mic off' : 'Turn mic on'}>
              {mic ? <Mic className="size-5" aria-hidden="true" /> : <MicOff className="size-5" aria-hidden="true" />}
            </button>
            {!voice && (
              <button type="button" className={cn('lv-ctrl', !cam && 'is-off')} onClick={() => setCam(!cam)} aria-pressed={cam} aria-label={cam ? 'Turn camera off' : 'Turn camera on'}>
                {cam ? <Video className="size-5" aria-hidden="true" /> : <VideoOff className="size-5" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
        <div className="lv-meter" aria-label={mic ? 'Microphone level' : 'Microphone off'} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(shownLevel * 100)}>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className={cn('lv-meter-bar', shownLevel * 12 > i && 'is-on')} />
          ))}
        </div>
        {err.mic && (
          <p className="lv-status is-bad" role="alert">
            {err.mic}
          </p>
        )}
        <div className="lv-pre-devices">
          <select className="lv-select" value={prefs.mic} onChange={(e) => choose('mic', e.target.value)} aria-label="Microphone">
            <option value="">Default microphone</option>
            {devices?.mics.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || 'Microphone'}
              </option>
            ))}
          </select>
          {!voice && (
            <select className="lv-select" value={prefs.cam} onChange={(e) => choose('cam', e.target.value)} aria-label="Camera">
              <option value="">Default camera</option>
              {devices?.cams.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || 'Camera'}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="lv-pre-info">
        <p className="ed-label m-0">{room.isCall ? (voice ? 'Voice call' : 'Video call') : voice ? 'Voice room' : 'Study room'}</p>
        <h1 className="lv-pre-title">{room.title}</h1>
        {room.about && <p className="lv-pre-about">About {room.about.title}</p>}
        <div className="lv-pre-who">
          {room.faces && room.faces.length > 0 ? (
            <>
              <div className="lv-faces">
                {room.faces.slice(0, 5).map((f) => (
                  <Avatar key={f.username} src={f.avatarUrl} avatar={f.avatar} name={f.name} seed={f.username} size="sm" />
                ))}
              </div>
              <span>
                {room.faces
                  .slice(0, 2)
                  .map((f) => f.name)
                  .join(', ')}
                {(room.people ?? 0) > 2 ? ` and ${(room.people ?? 0) - 2} more` : ''} {room.people === 1 ? 'is' : 'are'} here
              </span>
            </>
          ) : (
            <span>
              <Users className="mr-1.5 inline size-4 align-[-3px]" aria-hidden="true" />
              {room.people ? `${room.people} here` : 'No one is here yet'}
            </span>
          )}
        </div>
        <ul className="lv-checks" aria-label="Before you join">
          {!voice && (
            <li className={cn(shownCam ? 'is-ok' : err.cam ? 'is-bad' : 'is-idle')}>
              <span className="lv-check-dot" aria-hidden="true" />
              <span className="lv-check-name">Camera</span>
              <span className="lv-check-val">{shownCam ? camT?.label?.replace(/\s*\(.*\)$/, '') || 'On' : err.cam ? 'Blocked' : 'Off'}</span>
            </li>
          )}
          <li className={cn(mic && micT ? 'is-ok' : err.mic ? 'is-bad' : 'is-idle')}>
            <span className="lv-check-dot" aria-hidden="true" />
            <span className="lv-check-name">Microphone</span>
            <span className="lv-check-val">{mic && micT ? (shownLevel > 0.06 ? 'Hearing you' : 'Say something') : err.mic ? 'Blocked' : 'Off'}</span>
          </li>
          <li className={cn(ping == null ? 'is-idle' : ping < 600 ? 'is-ok' : 'is-warn')}>
            <span className="lv-check-dot" aria-hidden="true" />
            <span className="lv-check-name">Connection</span>
            <span className="lv-check-val">{ping == null ? 'Checking…' : ping < 250 ? `Good · ${ping} ms` : ping < 600 ? `Fine · ${ping} ms` : `Slow · ${ping} ms`}</span>
          </li>
        </ul>
        {knock && (
          <p className="lv-pre-note">
            <Lock className="size-4 shrink-0" aria-hidden="true" /> {room.locked ? 'The room is locked.' : 'This room is for invited people.'} The host will let you in.
          </p>
        )}
        <button type="button" className="lv-join" onClick={join} disabled={busy}>
          {busy ? 'Joining…' : knock ? 'Ask to join' : 'Join now'}
        </button>
        <p className="lv-hint">
          Host: {room.hostInfo?.name ?? room.host}.<span className="max-md:hidden"> Keys in the room: M mic, V video, H hand, C chat.</span>
        </p>
      </div>
    </div>
  )
}
