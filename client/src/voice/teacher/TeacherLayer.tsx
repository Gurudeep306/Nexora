/*
  The virtual teacher on screen (docs/voice/VIRTUAL_TEACHER.md §3): a
  realistic 3D person drawn with TalkingHead (MIT) on a transparent canvas,
  standing beside the page. Loaded only when a student turns a teacher on;
  three.js and the model are never part of the normal page load.

  - Lips: every sentence the site says (speak.ts → onSentence) is played to
    TalkingHead as silent audio of the same length, so the mouth follows our
    own voice. Our voice server sends the exact mouth shapes and word times;
    for other voices the words share the sentence's time by length (Hindi is
    written in Roman letters first).
  - Light: a warm key light and a soft fill, slightly lower exposure, so skin
    keeps its colour and shape instead of looking washed out.
  - Body: goes left, right or to the middle (glides there, turned the way it
    goes), sits and stands, turns around, waves, namaste, thumbs up, points.
  - It never takes a click: the drawing lets every click through to the page;
    only its own small buttons are clickable.
  - Reduced motion: it appears in its new place instead of gliding.
*/
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Armchair, EyeOff, MessageCircle, PenLine, PersonStanding, Square } from 'lucide-react'
import type { TalkingHead } from '@met4citizen/talkinghead'
import { getVoicePrefs, type TeacherSize } from '../prefs'
import { onSentence, stopSpeaking, useSpeaking } from '../speak'
import { endTalk, getTalk, startTalk, useTalk } from '../talk'
import { closeBoard, openBoard, pageTopic, useBoard } from './boardStore'
import { toRoman, wordTimes } from './lipsync'
import { gestureFor, moodFor, soundsWorried } from './expressions'
import { getTeacher, onTeacherMove, onTeacherPoint, setTeacher, useTeacher, type Move, type PointAt, type Side } from './store'
import { teacherModel, teacherPortrait, type TeacherInfo } from './teachers'
import './teacher.css'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

const GAP = 16
function xFor(side: Side, w: number, atX: number | null = null): number {
  const vw = document.documentElement.clientWidth
  // Standing beside something to point at it (kept on screen).
  if (atX != null) return Math.round(Math.max(GAP, Math.min(vw - w - GAP, atX - w / 2)))
  if (side === 'left') return GAP
  if (side === 'centre') return Math.max(GAP, Math.round((vw - w) / 2))
  return Math.max(GAP, vw - w - GAP)
}

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)

export default function TeacherLayer({ teacher, size }: { teacher: TeacherInfo; size: TeacherSize }) {
  const stage = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const headRef = useRef<TalkingHead | null>(null)
  const turnRaf = useRef(0)
  const lastX = useRef<number | null>(null)
  const moodTimer = useRef(0)
  const lastHeard = useRef('')
  /** Was the teacher sitting (so "stand" has something to do)? */
  const standUp = useRef(false)
  const st = useTeacher()
  const speaking = useSpeaking()
  const talk = useTalk()
  const board = useBoard()
  const speakingNowRef = useRef(false)
  useEffect(() => {
    speakingNowRef.current = speaking.on
  }, [speaking.on])
  const [caption, setCaption] = useState<string | null>(null)
  const [x, setX] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)

  /* Turn the body to `to` radians over `ms` (0 = facing the student). */
  const turnTo = (to: number, ms: number, then?: () => void) => {
    const a = headRef.current?.armature
    cancelAnimationFrame(turnRaf.current)
    if (!a) return then?.()
    const from = a.rotation.y
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms)
      a.rotation.y = from + (to - from) * ease(k)
      if (k < 1) turnRaf.current = requestAnimationFrame(step)
      else then?.()
    }
    turnRaf.current = requestAnimationFrame(step)
  }

  /* Load TalkingHead and the teacher. */
  useEffect(() => {
    const node = stage.current
    if (!node) return
    if (!hasWebGL2()) {
      setTeacher({ status: 'failed', why: 'This browser or device can’t draw 3D (WebGL 2 is off or missing).' })
      return
    }
    let dead = false
    let head: TalkingHead | null = null
    setTeacher({ status: 'loading', progress: 0, why: '' })
    void (async () => {
      const [{ TalkingHead }, { LipsyncEn }] = await Promise.all([
        import('@met4citizen/talkinghead'),
        import('@met4citizen/talkinghead/modules/lipsync-en.mjs'),
      ])
      if (dead) return
      head = new TalkingHead(node, {
        ttsEndpoint: 'none',
        // The lip-sync rules are loaded here, not fetched by the library at run time.
        lipsyncModules: [],
        lipsyncLang: 'en',
        cameraView: 'upper',
        cameraRotateEnable: false,
        cameraZoomEnable: false,
        cameraPanEnable: false,
        modelFPS: 30,
        modelPixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        avatarIdleEyeContact: 0.4,
        avatarSpeakingEyeContact: 0.7,
        avatarIdleHeadMove: reduced() ? 0.2 : 0.5,
        lightAmbientIntensity: 0.6,
        lightDirectIntensity: 18,
        lightDirectColor: 0xffd8b0,
      })
      head.renderer.toneMappingExposure = 0.85
      head.lipsync.en = new LipsyncEn()
      await head.showAvatar({ url: teacherModel(teacher.id), body: teacher.body, avatarMood: 'neutral', lipsyncLang: 'en' }, (e) => {
        if (e.lengthComputable && e.total) setTeacher({ progress: e.loaded / e.total })
      })
      if (dead) return head.dispose()
      headRef.current = head
      setTeacher({ status: 'ready', progress: 1 })
    })().catch(() => {
      if (!dead) setTeacher({ status: 'failed', why: `${teacher.name} didn’t load. Check the connection and try again.` })
    })
    return () => {
      dead = true
      cancelAnimationFrame(turnRaf.current)
      headRef.current = null
      head?.dispose()
      setTeacher({ status: 'off', sitting: false })
    }
  }, [teacher.id, teacher.body, teacher.name, attempt])

  /* Browsers start sound only after a tap: wake the teacher's audio clock on the first one. */
  useEffect(() => {
    const wake = () => {
      const ctx = headRef.current?.audioCtx
      if (ctx && ctx.state === 'suspended') void ctx.resume()
    }
    window.addEventListener('pointerdown', wake, true)
    window.addEventListener('keydown', wake, true)
    return () => {
      window.removeEventListener('pointerdown', wake, true)
      window.removeEventListener('keydown', wake, true)
    }
  }, [])

  /* Don't draw while the tab is in the background. */
  useEffect(() => {
    const vis = () => {
      const h = headRef.current
      if (!h) return
      if (document.hidden) h.stop()
      else h.start()
    }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [])

  /* Lips and caption follow each sentence the site says. */
  useEffect(
    () =>
      onSentence((s) => {
        const head = headRef.current
        if (!s) {
          setCaption(null)
          head?.stopSpeaking()
          // Back to a calm face a moment after speaking.
          window.clearTimeout(moodTimer.current)
          moodTimer.current = window.setTimeout(() => headRef.current?.setMood('neutral'), 1800)
          return
        }
        setCaption(s.text)
        if (!head) return
        // Face and hands follow the words: a smile for greetings and praise, a thumbs up, a shrug…
        window.clearTimeout(moodTimer.current)
        head.setMood(moodFor(s.text))
        const g = reduced() ? null : gestureFor(s.text)
        const exact = s.timing
        const hasShapes = !!exact?.visemes?.length && exact.visemes.length === exact.vtimes?.length && exact.visemes.length === exact.vdurations?.length
        const hasWords = !!exact?.words?.length && exact.words.length === exact.wtimes?.length && exact.words.length === exact.wdurations?.length
        const t = hasWords ? { words: exact!.words!, wtimes: exact!.wtimes!, wdurations: exact!.wdurations! } : wordTimes(toRoman(s.text), s.ms)
        if (!t.words.length && !hasShapes) return
        const ctx = head.audioCtx
        if (ctx.state === 'suspended') void ctx.resume()
        const silent = ctx.createBuffer(1, Math.max(1, Math.round((ctx.sampleRate * s.ms) / 1000)), ctx.sampleRate)
        head.stopSpeaking()
        // Hands: a gesture that fits the sentence, else they move a little while talking (only standing).
        if (g && !getTeacher().sitting) head.playGesture(g, 2.2, g === 'index')
        else if (!reduced()) head.speakWithHands(0, 0.6)
        // With exact mouth shapes TalkingHead uses them instead of guessing from the words.
        head.speakAudio({ audio: silent, ...t, ...(hasShapes ? { visemes: exact!.visemes!, vtimes: exact!.vtimes!, vdurations: exact!.vdurations! } : {}) }, { lipsyncLang: 'en' })
      }),
    [],
  )

  /* One-off moves. */
  useEffect(
    () =>
      onTeacherMove((m: Move) => {
        const head = headRef.current
        if (!head) return
        if (m === 'turn') {
          const a = head.armature
          if (!a) return
          turnTo(Math.PI * 2, 1800, () => {
            if (headRef.current?.armature) headRef.current.armature.rotation.y = 0
          })
          return
        }
        const g = { wave: 'handup', namaste: 'namaste', thumbs: 'thumbup', point: 'index' }[m]
        head.playGesture(g, m === 'namaste' ? 3 : 2.5)
        if (m !== 'point') {
          head.setMood('happy')
          window.clearTimeout(moodTimer.current)
          moodTimer.current = window.setTimeout(() => headRef.current?.setMood('neutral'), 3200)
        }
      }),
    [],
  )

  /* When nothing else is going on, now and then glance at where the student is pointing, like a person beside them. */
  useEffect(() => {
    if (st.status !== 'ready') return
    let last = 0
    const onMove = (e: PointerEvent) => {
      const head = headRef.current
      const now = performance.now()
      if (!head || now - last < 2500 || speakingNowRef.current || getTalk().status !== 'idle' || Math.random() > 0.35) return
      last = now
      head.lookAt(e.clientX, e.clientY, 900)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [st.status])

  /* What the student last said, for the face (a worried student gets calm attention). */
  useEffect(() => {
    if (talk.hearing) lastHeard.current = talk.hearing
  }, [talk.hearing])

  /* Conversation cues: look at the student while they speak, nod, glance away while thinking. */
  useEffect(() => {
    const head = headRef.current
    if (!head || st.status !== 'ready' || !talk.on) return
    if (talk.status === 'listening') {
      head.lookAtCamera(4000)
    } else if (talk.status === 'thinking') {
      // A small nod ("got it"): a quick look down and back, then think.
      const r0 = stage.current?.getBoundingClientRect()
      if (r0 && !reduced()) {
        head.lookAt(r0.left + r0.width / 2, r0.bottom + r0.height * 0.6, 260)
        window.setTimeout(() => headRef.current?.lookAtCamera(300), 300)
      }
      // A worried student gets calm attention, not a smile.
      if (soundsWorried(lastHeard.current)) head.setMood('neutral')
      // Up and to one side, as people do when they think.
      const r = stage.current?.getBoundingClientRect()
      if (r) window.setTimeout(() => headRef.current?.lookAt(r.left + r.width * (st.side === 'left' ? 0.9 : 0.1), r.top - r.height * 0.4, 1600), 650)
    }
  }, [talk.on, talk.status, st.status, st.side])

  /* Point at something on the page: turn a little towards it, look at it, point with the hand on that side. */
  useEffect(
    () =>
      onTeacherPoint((p: PointAt) => {
        const head = headRef.current
        const box = stage.current?.getBoundingClientRect()
        if (!head || !box) return
        const dx = p.x - (box.left + box.width / 2)
        head.lookAt(p.x, p.y, 2600)
        if (!reduced()) turnTo(Math.max(-0.45, Math.min(0.45, (dx / window.innerWidth) * 1.2)), 400, () => window.setTimeout(() => turnTo(0, 500), 2400))
        if (!getTeacher().sitting) head.playGesture('index', 2.8, dx > 0)
      }),
    [],
  )

  /* Sit and stand. */
  useEffect(() => {
    const head = headRef.current
    if (!head || st.status !== 'ready') return
    if (st.sitting) {
      // Held for an hour (until "stand up"); the camera drops with her so she stays in view.
      void head.playPose('sitting', null, 3600)
      head.setView('upper', { cameraY: 2.2 })
    } else if (standUp.current) {
      // Stand up into the usual standing pose (stopPose alone keeps the last pose until an idle timer changes it).
      void head.playPose(teacher.body === 'M' ? 'wide' : 'side', null, 4)
      head.setView('upper', { cameraY: 0 })
    }
    standUp.current = st.sitting
  }, [st.sitting, st.status, teacher.body])

  /* Place: glide to the new side, turned the way it walks. */
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const place = () => {
      lastX.current = xFor(st.side, el.offsetWidth, st.atX)
      setX(lastX.current)
    }
    const prev = lastX.current
    const next = xFor(st.side, el.offsetWidth, st.atX)
    let back: (() => void) | null = null
    if (prev !== null && Math.abs(next - prev) > 40 && !reduced() && headRef.current) {
      turnTo((next > prev ? 1 : -1) * Math.PI * 0.42, 380)
      back = () => turnTo(0, 420)
      el.addEventListener('transitionend', back, { once: true })
    }
    lastX.current = next
    setX(next)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('resize', place)
      if (back) el.removeEventListener('transitionend', back)
    }
  }, [st.side, st.atX, size])

  const ai = speaking.engine === 'natural' || speaking.engine === 'kokoro'
  const lang = getVoicePrefs().lang
  const nextSide: Side = st.side === 'right' ? 'left' : 'right'

  return (
    <div
      ref={root}
      className="tch"
      data-size={size}
      data-side={st.side}
      data-ready={st.status === 'ready' ? '' : undefined}
      data-sitting={st.sitting ? '' : undefined}
      style={x === null ? { visibility: 'hidden' } : { transform: `translateX(${x}px)` }}
      role="region"
      aria-label={`Virtual teacher ${teacher.name}`}
    >
      {talk.on && !speaking.on && (talk.status === 'listening' || talk.status === 'thinking') && (
        <div className="tch-say tch-say--talk" role="status">
          <p className="tch-say-text">
            {talk.status === 'listening' ? (talk.hearing ? <span lang={lang === 'hi-IN' ? 'hi' : 'en'}>“{talk.hearing}”</span> : 'Listening…') : <span className="tch-dots" aria-label="Thinking">…</span>}
          </p>
          <div className="tch-say-foot">
            <span>Talking with {teacher.name}</span>
            <button type="button" onClick={() => { endTalk(); stopSpeaking() }} aria-label={`End the conversation with ${teacher.name}`}>
              <Square className="size-3" aria-hidden="true" /> End
            </button>
          </div>
        </div>
      )}
      {speaking.on && !board.open && (
        <div className="tch-say" role="status">
          {caption && (
            <p className="tch-say-text" aria-hidden="true" lang={lang === 'hi-IN' ? 'hi' : 'en'}>
              {caption}
            </p>
          )}
          <div className="tch-say-foot">
            <span>
              {ai ? <strong>AI voice</strong> : null}
              {ai ? ` · ${speaking.name}` : speaking.name}
            </span>
            <button type="button" onClick={stopSpeaking} aria-label="Stop speaking">
              <Square className="size-3" aria-hidden="true" /> Stop
            </button>
          </div>
        </div>
      )}

      <div className="tch-stage" ref={stage} aria-hidden="true" />

      {st.status === 'loading' && (
        <div className="tch-load" aria-live="polite">
          <img src={teacherPortrait(teacher.id)} alt="" width={96} height={120} />
          <span>
            {teacher.name} is coming{st.progress > 0 && st.progress < 1 ? ` · ${Math.round(st.progress * 100)}%` : '…'}
          </span>
        </div>
      )}
      {st.status === 'failed' && (
        <div className="tch-load tch-fail" role="alert">
          <img src={teacherPortrait(teacher.id)} alt="" width={96} height={120} />
          <span>{st.why}</span>
          {hasWebGL2() && (
            <button type="button" className="tch-link" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          )}
        </div>
      )}

      <div className="tch-bar">
        <span className="tch-name">{teacher.name}</span>
        <button
          type="button"
          className="tch-btn"
          data-on={talk.on ? '' : undefined}
          aria-pressed={talk.on}
          onClick={() => (talk.on ? (endTalk(), stopSpeaking()) : startTalk())}
          aria-label={talk.on ? `End the conversation with ${teacher.name}` : `Talk with ${teacher.name}`}
          title={talk.on ? 'End the conversation' : 'Talk (hands-free)'}
        >
          <MessageCircle aria-hidden="true" />
        </button>
        <button
          type="button"
          className="tch-btn"
          data-on={board.open ? '' : undefined}
          aria-pressed={board.open}
          onClick={() => (board.open ? (stopSpeaking(), closeBoard(), setTeacher({ atX: null })) : void openBoard(pageTopic()))}
          aria-label={board.open ? 'Close the whiteboard' : `${teacher.name}: explain this page on the whiteboard`}
          title={board.open ? 'Close the whiteboard' : 'Whiteboard'}
        >
          <PenLine aria-hidden="true" />
        </button>
        <button type="button" className="tch-btn" onClick={() => setTeacher({ side: nextSide })} aria-label={`Move ${teacher.name} to the ${nextSide}`} title={`Move to the ${nextSide}`}>
          <ArrowLeftRight aria-hidden="true" />
        </button>
        {st.status === 'ready' && (
          <button
            type="button"
            className="tch-btn"
            onClick={() => setTeacher({ sitting: !st.sitting })}
            aria-label={st.sitting ? `Stand ${teacher.name} up` : `Sit ${teacher.name} down`}
            title={st.sitting ? 'Stand up' : 'Sit down'}
          >
            {st.sitting ? <PersonStanding aria-hidden="true" /> : <Armchair aria-hidden="true" />}
          </button>
        )}
        <button type="button" className="tch-btn" onClick={() => setTeacher({ hidden: true })} aria-label={`Hide ${teacher.name}`} title="Hide">
          <EyeOff aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
