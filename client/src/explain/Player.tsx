/*
  The explanation player: the theme's own controls on a dark frame. It plays
  only the kept part of a video (trim), marks chapters on the bar and lists
  them, and counts a view after 5 seconds of watching.
  Keys (when the player has focus): Space/K play, J/L ±10 s, ←/→ ±5 s,
  < / > speed, F full screen, M mute.
*/
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { Maximize2, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { explainApi, fmtTime, mediaUrl, type ExplainVideo } from './api'

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2]

export type PlayerHandle = { seek: (msIntoKept: number) => void; play: () => void }

export function Player({ v, autoPlay = false, onTime, ref: handle }: { v: ExplainVideo; autoPlay?: boolean; onTime?: (ms: number) => void; ref?: Ref<PlayerHandle> }) {
  const ref = useRef<HTMLVideoElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const counted = useRef(false)
  const watched = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0) // ms into the kept part
  const [speed, setSpeed] = useState(1)
  const [muted, setMuted] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const start = v.trimStartMs
  const end = v.trimEndMs ?? v.durationMs
  const len = Math.max(1000, end - start)
  const chapters = v.chapters.filter((c) => c.at >= start && c.at < end)
  const current = [...chapters].reverse().find((c) => c.at <= start + t)

  const seek = useCallback(
    (ms: number) => {
      const el = ref.current
      if (!el) return
      const clamped = Math.max(0, Math.min(len - 200, ms))
      el.currentTime = (start + clamped) / 1000
      setT(clamped)
    },
    [len, start],
  )

  useImperativeHandle(handle, () => ({
    seek,
    play: () => void ref.current?.play().catch(() => {}),
  }))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const meta = () => {
      if (start > 0 && el.currentTime < start / 1000) el.currentTime = start / 1000
    }
    const time = () => {
      const now = el.currentTime * 1000 - start
      if (el.currentTime * 1000 >= end - 30) {
        el.pause()
        el.currentTime = end / 1000
      }
      setT(Math.max(0, Math.min(len, now)))
      onTime?.(el.currentTime * 1000)
      if (el.buffered.length) setBuffered(Math.min(1, (el.buffered.end(el.buffered.length - 1) * 1000 - start) / len))
    }
    const play = () => {
      setPlaying(true)
      if (el.currentTime * 1000 >= end - 100) el.currentTime = start / 1000
    }
    const pause = () => setPlaying(false)
    el.addEventListener('loadedmetadata', meta)
    el.addEventListener('timeupdate', time)
    el.addEventListener('play', play)
    el.addEventListener('pause', pause)
    return () => {
      el.removeEventListener('loadedmetadata', meta)
      el.removeEventListener('timeupdate', time)
      el.removeEventListener('play', play)
      el.removeEventListener('pause', pause)
    }
  }, [start, end, len, onTime])

  // A view counts after five seconds of watching.
  useEffect(() => {
    if (!playing || counted.current) return
    const id = window.setInterval(() => {
      watched.current += 1
      if (watched.current >= 5 && !counted.current) {
        counted.current = true
        void explainApi.view(v.id)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [playing, v.id])

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed
  }, [speed])

  const toggle = () => {
    const el = ref.current
    if (!el) return
    if (el.paused) void el.play().catch(() => {})
    else el.pause()
  }
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void box.current?.requestFullscreen?.().catch(() => {})
  }
  const pip = () => {
    const el = ref.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null
    void el?.requestPictureInPicture?.().catch(() => {})
  }
  const at = (e: React.PointerEvent | React.MouseEvent) => {
    const r = bar.current!.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * len
  }

  const keys = (e: React.KeyboardEvent) => {
    const k = e.key
    const map: Record<string, () => void> = {
      ' ': toggle,
      k: toggle,
      j: () => seek(t - 10_000),
      l: () => seek(t + 10_000),
      ArrowLeft: () => seek(t - 5000),
      ArrowRight: () => seek(t + 5000),
      f: fullscreen,
      m: () => setMuted((x) => !x),
      '>': () => setSpeed((s) => SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(s) + 1)]),
      '<': () => setSpeed((s) => SPEEDS[Math.max(0, SPEEDS.indexOf(s) - 1)]),
    }
    if (map[k] && !(e.target as HTMLElement).closest('select')) {
      e.preventDefault()
      map[k]()
    }
  }

  return (
    <div ref={box} className={cn('ex-player', playing && 'is-playing')} tabIndex={0} onKeyDown={keys} aria-label={`Video: ${v.title}. Space plays, J and L skip ten seconds.`}>
      <video
        ref={ref}
        className="ex-video"
        src={mediaUrl(v.src)}
        poster={v.poster ? mediaUrl(v.poster) : undefined}
        preload="metadata"
        playsInline
        autoPlay={autoPlay}
        muted={muted}
        onClick={toggle}
        onDoubleClick={fullscreen}
      />
      {!playing && (
        <button type="button" className="ex-big-play" onClick={toggle} aria-label="Play">
          <Play className="size-7" aria-hidden="true" />
        </button>
      )}
      <div className="ex-controls">
        <div
          ref={bar}
          className="ex-bar"
          role="slider"
          tabIndex={-1}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(len / 1000)}
          aria-valuenow={Math.round(t / 1000)}
          aria-valuetext={`${fmtTime(t)} of ${fmtTime(len)}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            seek(at(e))
          }}
          onPointerMove={(e) => {
            setHover(at(e))
            if (e.buttons & 1) seek(at(e))
          }}
          onPointerLeave={() => setHover(null)}
        >
          <span className="ex-bar-buf" style={{ width: `${buffered * 100}%` }} />
          <span className="ex-bar-fill" style={{ width: `${(t / len) * 100}%` }} />
          {chapters.map((c) => (
            <span key={c.at} className="ex-bar-tick" style={{ left: `${((c.at - start) / len) * 100}%` }} />
          ))}
          {hover != null && (
            <span className="ex-bar-tip" style={{ left: `${(hover / len) * 100}%` }}>
              {fmtTime(hover)}
              {(() => {
                const c = [...chapters].reverse().find((x) => x.at - start <= hover)
                return c ? ` · ${c.title}` : ''
              })()}
            </span>
          )}
        </div>
        <div className="ex-row">
          <button type="button" className="ex-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          </button>
          <button type="button" className="ex-btn" onClick={() => seek(t - 10_000)} aria-label="Back 10 seconds">
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="ex-btn" onClick={() => seek(t + 10_000)} aria-label="Forward 10 seconds">
            <RotateCw className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="ex-btn" onClick={() => setMuted(!muted)} aria-label={muted ? 'Sound on' : 'Mute'}>
            {muted ? <VolumeX className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
          </button>
          <span className="ex-time">
            {fmtTime(t)} / {fmtTime(len)}
          </span>
          {current && <span className="ex-chapter">{current.title}</span>}
          <span className="ml-auto" />
          <select className="ex-speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Speed">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
          {'pictureInPictureEnabled' in document && (
            <button type="button" className="ex-btn max-sm:hidden" onClick={pip} aria-label="Picture in picture">
              <PictureInPicture2 className="size-4" aria-hidden="true" />
            </button>
          )}
          <button type="button" className="ex-btn" onClick={fullscreen} aria-label="Full screen">
            <Maximize2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ChapterList({ v, nowMs, onSeek }: { v: ExplainVideo; nowMs: number; onSeek: (ms: number) => void }) {
  const start = v.trimStartMs
  const end = v.trimEndMs ?? v.durationMs
  const list = v.chapters.filter((c) => c.at >= start && c.at < end)
  if (!list.length) return null
  const cur = [...list].reverse().find((c) => c.at <= nowMs)
  return (
    <ol className="ex-chapters" aria-label="Chapters">
      {list.map((c) => (
        <li key={c.at}>
          <button type="button" className={cn('ex-chapter-row', cur === c && 'is-on')} onClick={() => onSeek(c.at - start)}>
            <span className="ex-chapter-at">{fmtTime(c.at - start)}</span>
            <span>{c.title}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}
