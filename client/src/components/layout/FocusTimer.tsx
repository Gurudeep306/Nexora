import { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger, Tooltip, useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import { PLANS, blockLength, finishIfDue, fmtClock, focus, timeLeft, useFocus } from '@/lib/focusTimer'
import './focus-timer.css'

const SOUND_KEY = 'nexora:focus-sound'

/** A short, soft two-note bell made on the device (no sound file to load). */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    ;[660, 880].forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      const t = ctx.currentTime + i * 0.22
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.18, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 1)
    })
    setTimeout(() => void ctx.close(), 1600)
  } catch {
    /* no audio: the toast still says it */
  }
}

function readSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

/**
 * The Focus timer in the top bar. Idle, it is a quiet clock icon; running, it
 * shows the time left. The sheet has a ring for the block, start, pause,
 * skip and reset, the block lengths, and today's finished blocks.
 */
export function FocusTimer() {
  const s = useFocus()
  const toast = useToast()
  const [now, setNow] = useState(() => Date.now())
  const [sound, setSound] = useState(readSound)
  const running = s.endsAt != null
  const active = s.phase !== 'idle'

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setNow(Date.now())
      const ended = finishIfDue()
      if (!ended) return
      if (readSound()) chime()
      if (ended === 'focus') toast.success('Focus block done', 'Take a short break. The break timer has started.')
      else toast.info('Break over', 'Start the next focus block when you are ready.')
    }, 500)
    return () => window.clearInterval(id)
  }, [running, toast])

  const left = timeLeft(s, now)
  const total = blockLength(s)
  const done = active ? Math.min(1, Math.max(0, 1 - left / total)) : 0
  const label = s.phase === 'break' ? 'Break' : 'Focus'
  const R = 52
  const C = 2 * Math.PI * R

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    try {
      localStorage.setItem(SOUND_KEY, next ? 'on' : 'off')
    } catch {
      /* ignore */
    }
  }

  return (
    <Popover>
      <Tooltip label={active ? `${label}: ${fmtClock(left)} left` : 'Focus timer'} side="bottom">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={active ? `${label} timer, ${fmtClock(left)} left${running ? '' : ', paused'}. Open timer` : 'Focus timer'}
            className={cn(
              'ft-trigger h-8 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 text-text-secondary transition-colors hover:bg-text-primary/6 hover:text-text-primary',
              active ? 'flex border border-border' : 'hidden sm:flex',
            )}
            data-phase={s.phase}
          >
            <Icon name="timer" className="size-[17px]" aria-hidden="true" />
            {active && <span className={cn('text-xs font-semibold tabular-nums', !running && 'text-text-muted')}>{fmtClock(left)}</span>}
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" sideOffset={10} aria-label="Focus timer" className="ft-sheet w-[300px] max-w-[calc(100vw-16px)]">
        <div className="ft-head">
          <p className="ft-kicker m-0">Focus timer</p>
          <button type="button" className="ft-sound" onClick={toggleSound} aria-pressed={sound}>
            Sound {sound ? 'on' : 'off'}
          </button>
        </div>

        <div className="ft-dial">
          <svg viewBox="0 0 120 120" className="ft-ring" aria-hidden="true">
            <circle cx="60" cy="60" r={R} className="ft-track" />
            <circle cx="60" cy="60" r={R} className="ft-arc" strokeDasharray={C} strokeDashoffset={C * (1 - done)} transform="rotate(-90 60 60)" />
          </svg>
          <div className="ft-read" role="timer" aria-live="off">
            <span className="ft-phase" data-break={s.phase === 'break' || undefined}>{active ? (running ? label : `${label} · paused`) : 'Ready'}</span>
            <span className="ft-clock">{fmtClock(left)}</span>
          </div>
        </div>

        <div className="ft-actions">
          {!active && (
            <button type="button" className="ft-primary" onClick={focus.start}>
              <Icon name="play" className="size-4" aria-hidden="true" /> Start focus
            </button>
          )}
          {active && (
            <>
              <button type="button" className="ft-primary" onClick={running ? focus.pause : focus.resume}>
                <Icon name={running ? 'pause' : 'play'} className="size-4" aria-hidden="true" /> {running ? 'Pause' : 'Resume'}
              </button>
              <button type="button" className="ft-ghost" onClick={() => focus.finish(false)} title={s.phase === 'focus' ? 'Skip to the break (not counted)' : 'End the break'}>
                <Icon name="skip-forward" className="size-4" aria-hidden="true" /> {s.phase === 'focus' ? 'Skip' : 'End break'}
              </button>
              <button type="button" className="ft-ghost ft-icon" onClick={focus.reset} aria-label="Reset timer" title="Reset">
                <Icon name="refresh" className="size-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <div className="ft-plans" role="radiogroup" aria-label="Block length in minutes, focus then break">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={s.plan === p.id}
              disabled={active}
              className={cn('ft-plan', s.plan === p.id && 'is-on')}
              onClick={() => focus.setPlan(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="ft-today m-0">
          {s.blocks > 0 ? (
            <>
              Today: <strong>{s.blocks}</strong> {s.blocks === 1 ? 'block' : 'blocks'} · <strong>{s.minutes}</strong> min focused
            </>
          ) : (
            'No focus blocks yet today.'
          )}
        </p>
      </PopoverContent>
    </Popover>
  )
}
