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
  - Look: a warm key light, a soft fill and a cool back light; tone mapping,
    matte skin and clean hair edges are set in look.ts.
  - Body: goes left, right or to the middle (glides there, turned the way it
    goes), sits and stands, turns around, waves, namaste, thumbs up, points.
  - It never takes a click: the drawing lets every click through to the page;
    only its own small buttons are clickable.
  - Reduced motion: it appears in its new place instead of gliding.
*/
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Armchair, Cpu, EyeOff, Hand, Keyboard, MessageCircle, MoreHorizontal, PenLine, PersonStanding, Send, SlidersHorizontal, Square, X, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TalkingHead } from '@met4citizen/talkinghead'
import { getVoicePrefs, useVoicePrefs, type TeacherSize } from '../prefs'
import { onSentence, onWord, speak, stopSpeaking, useSpeaking, type SpokenSentence } from '../speak'
import { VoiceOffer } from './VoiceOffer'
import { useBrain } from '../brain/brain'
import { askTyped, cancelListening, endTalk, getTalk, startTalk, teacherSays, useTalk } from '../talk'
import { onMicLevel } from '../capture'
import { closeBoard, openBoard, pageTopic, useBoard } from './boardStore'
import { captionStarts, sameWord, toRoman, wordAt, wordTimes, wordTimesByEnergy, type WordTimes } from './lipsync'
import { nodder, presenceFor, PRESENCE_SHAPES, type Presence } from './presence'
import { gestureFor, moodFor, soundsWorried } from './expressions'
import { countResult, reactionFor } from './reactions'
import { pixelRatio, polish } from './look'
import { getTeacher, onTeacherMove, onTeacherPoint, onTeacherReact, setTeacher, teacherMove, useTeacher, type Move, type PointAt, type Side } from './store'
import { teacherModel, teacherPortrait, UNNAMED, type TeacherInfo } from './teachers'
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

/** A sentence on screen: its words, and when each starts (null = the device voice, which reports words as it says them). */
interface Shown {
  tokens: string[]
  starts: number[] | null
  at: number
}

/** The words as written, each with the start of its spoken word (lipsync.ts). */
function shownFor(s: SpokenSentence, t: WordTimes | null): Shown {
  const tokens = s.text.split(/\s+/).filter(Boolean)
  return { tokens, starts: t?.words.length ? captionStarts(tokens, t) : null, at: performance.now() }
}

/** The sentence being said, lit word by word as she says it. Scrolls itself, never the page. */
function Caption({ shown, liveIdx, lang }: { shown: Shown; liveIdx: number; lang: string }) {
  const box = useRef<HTMLParagraphElement>(null)
  const [timedIdx, setTimedIdx] = useState(-1)
  useEffect(() => {
    const starts = shown.starts
    if (!starts) return
    let raf = 0
    const tick = () => {
      setTimedIdx(wordAt(starts, performance.now() - shown.at))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [shown])
  const idx = shown.starts ? timedIdx : liveIdx
  useEffect(() => {
    const p = box.current
    const el = p?.children[idx] as HTMLElement | undefined
    if (!p || !el) return
    if (el.offsetTop + el.offsetHeight > p.scrollTop + p.clientHeight || el.offsetTop < p.scrollTop) p.scrollTop = Math.max(0, el.offsetTop - 4)
  }, [idx])
  return (
    <p className="tch-say-text tch-cap" ref={box} aria-hidden="true" lang={lang === 'hi-IN' ? 'hi' : 'en'}>
      {shown.tokens.map((w, i) => (
        <span key={i} data-w={i < idx ? 'said' : i === idx ? 'now' : undefined}>
          {w}{' '}
        </span>
      ))}
    </p>
  )
}

/** How loud the student is, as five small bars (or, with the browser's own ears, a pulse each time words arrive). */
function MicMeter({ pulse }: { pulse: string }) {
  const [level, setLevel] = useState(0)
  const fromMic = useRef(0)
  useEffect(
    () =>
      onMicLevel((l) => {
        fromMic.current = performance.now()
        setLevel((v) => (l > v ? l : v * 0.6 + l * 0.4))
      }),
    [],
  )
  useEffect(() => {
    if (!pulse || performance.now() - fromMic.current < 1000) return
    setLevel(0.85)
    const t = window.setTimeout(() => setLevel(0.25), 260)
    return () => window.clearTimeout(t)
  }, [pulse])
  return (
    <span className="tch-meter" aria-hidden="true">
      {[0.5, 0.8, 1, 0.8, 0.5].map((k, i) => (
        <i key={i} style={{ transform: `scaleY(${Math.max(0.18, Math.min(1, level * k * 1.25))})` }} />
      ))}
    </span>
  )
}

/** Type to the teacher instead of speaking: handled exactly like spoken words. */
function TypeBox({ name, said, lang, onAsk, onClose }: { name: string; said: string; lang: string; onAsk: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])
  return (
    <form
      className="tch-say tch-type"
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        onAsk(text.trim())
        setText('')
      }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {/* Her answer stays above the box when the voice is off, like a chat. */}
      {said && (
        <p className="tch-say-text" role="status" lang={lang === 'hi-IN' ? 'hi' : 'en'}>
          {said}
        </p>
      )}
      <label className="tch-type-row">
        <span className="sr-only">Type to {name}</span>
        <input ref={input} className="tch-type-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Ask ${name} anything…`} maxLength={500} autoComplete="off" enterKeyHint="send" />
      </label>
      <div className="tch-say-foot">
        <button type="button" onClick={onClose} aria-label="Close typing">
          <X className="size-3" aria-hidden="true" /> Close
        </button>
        <button type="submit" className="tch-send" disabled={!text.trim()} aria-label={`Send to ${name}`}>
          <Send className="size-3" aria-hidden="true" /> Send
        </button>
      </div>
    </form>
  )
}

interface MenuItem {
  id: string
  label: string
  icon: LucideIcon
  run: () => void
}

/** Everything else she can do, in one small menu above her bar (arrow keys move, Escape closes). */
function TeacherMenu({ name, items }: { name: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    list.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    const away = (e: PointerEvent) => {
      if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away, true)
    return () => document.removeEventListener('pointerdown', away, true)
  }, [open])
  const onKey = (e: React.KeyboardEvent) => {
    const all = [...(list.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])]
    const i = all.indexOf(document.activeElement as HTMLButtonElement)
    const go = e.key === 'ArrowDown' ? (i + 1) % all.length : e.key === 'ArrowUp' ? (i - 1 + all.length) % all.length : e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : -1
    if (go >= 0) {
      e.preventDefault()
      all[go]?.focus()
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault()
      setOpen(false)
      btn.current?.focus()
    }
  }
  return (
    <>
      <button
        ref={btn}
        type="button"
        className="tch-btn"
        data-on={open ? '' : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More with ${name}`}
        title="More"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal aria-hidden="true" />
      </button>
      {open && (
        <div ref={list} className="tch-menu" role="menu" aria-label={`More with ${name}`} onKeyDown={onKey}>
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                setOpen(false)
                it.run()
              }}
            >
              <it.icon aria-hidden="true" />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)

export default function TeacherLayer({ teacher, size }: { teacher: TeacherInfo; size: TeacherSize }) {
  const stage = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const headRef = useRef<TalkingHead | null>(null)
  const turnRaf = useRef(0)
  const lastX = useRef<number | null>(null)
  const moodTimer = useRef(0)
  const browTimer = useRef(0)
  const lastHeard = useRef('')
  /** Was the teacher sitting (so "stand" has something to do)? */
  const standUp = useRef(false)
  const st = useTeacher()
  const speaking = useSpeaking()
  const talk = useTalk()
  const brain = useBrain()
  const board = useBoard()
  const prefs = useVoicePrefs(null)[0]
  const navigate = useNavigate()
  const view = prefs.teacherView
  const anchored = !!st.anchor
  const speakingNowRef = useRef(false)
  useEffect(() => {
    speakingNowRef.current = speaking.on
  }, [speaking.on])
  const [shown, setShown] = useState<Shown | null>(null)
  const [liveIdx, setLiveIdx] = useState(-1)
  const [typing, setTyping] = useState(false)
  const [dragX, setDragX] = useState<number | null>(null)
  const shownRef = useRef<Shown | null>(null)
  useEffect(() => {
    shownRef.current = shown
  }, [shown])
  const drag = useRef<{ id: number; from: number; x0: number; moved: boolean } | null>(null)

  /* Drag her by her name bar to any side of the screen (the move button does the same from the keyboard). */
  const onBarDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || x === null || anchored || e.button !== 0) return
    drag.current = { id: e.pointerId, from: e.clientX, x0: x, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onBarMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.from
    if (!d.moved && Math.abs(dx) < 6) return
    d.moved = true
    const w = root.current?.offsetWidth ?? 0
    setDragX(Math.round(Math.max(GAP, Math.min(document.documentElement.clientWidth - w - GAP, d.x0 + dx))))
  }
  const onBarUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    if (!d || d.id !== e.pointerId || !d.moved || dragX === null) return setDragX(null)
    const w = root.current?.offsetWidth ?? 0
    const mid = (dragX + w / 2) / document.documentElement.clientWidth
    // She settles on the nearest side, gliding from where she was let go.
    lastX.current = dragX
    setDragX(null)
    setTeacher({ side: mid < 1 / 3 ? 'left' : mid > 2 / 3 ? 'right' : 'centre' })
  }
  const [x, setX] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)
  // The name only words the failure message: renaming the teacher must not reload the 3D model.
  const nameRef = useRef(teacher.name)
  useEffect(() => {
    nameRef.current = teacher.name
  }, [teacher.name])

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
        // TalkingHead multiplies this by the screen's ratio: a sharp picture, never more than 2× (it was 3× on a Retina Mac).
        modelPixelRatio: pixelRatio(window.devicePixelRatio || 1),
        avatarIdleEyeContact: 0.4,
        avatarSpeakingEyeContact: 0.7,
        avatarIdleHeadMove: reduced() ? 0.2 : 0.5,
        lightAmbientIntensity: 0.6,
        lightDirectIntensity: 18,
        lightDirectColor: 0xffd8b0,
        // A soft, cool light from behind and above: separates her from the page, like a studio portrait.
        lightSpotIntensity: 3.5,
        lightSpotColor: 0xdfe8ff,
        lightSpotPhi: 0.6,
        lightSpotTheta: Math.PI,
        lightSpotDispersion: 0.9,
      })
      head.lipsync.en = new LipsyncEn()
      await head.showAvatar({ url: teacherModel(teacher.id), body: teacher.body, avatarMood: 'neutral', lipsyncLang: 'en' }, (e) => {
        if (e.lengthComputable && e.total) setTeacher({ progress: e.loaded / e.total })
      })
      if (dead) return head.dispose()
      polish(head as unknown as Parameters<typeof polish>[0])
      headRef.current = head
      setTeacher({ status: 'ready', progress: 1 })
    })().catch(() => {
      if (!dead) setTeacher({ status: 'failed', why: `${nameRef.current} didn’t load. Check the connection and try again.` })
    })
    return () => {
      dead = true
      cancelAnimationFrame(turnRaf.current)
      headRef.current = null
      head?.dispose()
      setTeacher({ status: 'off', sitting: false })
    }
  }, [teacher.id, teacher.body, attempt])

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
          setShown(null)
          head?.stopSpeaking()
          // Back to a calm face a moment after speaking.
          window.clearTimeout(moodTimer.current)
          moodTimer.current = window.setTimeout(() => headRef.current?.setMood('neutral'), 1800)
          return
        }
        const exact = s.timing
        const hasShapes = !!exact?.visemes?.length && exact.visemes.length === exact.vtimes?.length && exact.visemes.length === exact.vdurations?.length
        const hasWords = !!exact?.words?.length && exact.words.length === exact.wtimes?.length && exact.words.length === exact.wdurations?.length
        // Word times: the voice's own; else from the sound itself (the mouth rests in pauses); else shared by length.
        const t: WordTimes = hasWords
          ? { words: exact!.words!, wtimes: exact!.wtimes!, wdurations: exact!.wdurations! }
          : s.energy?.length
            ? wordTimesByEnergy(toRoman(s.text), s.ms, s.energy, s.frameMs ?? 20)
            : wordTimes(toRoman(s.text), s.ms)
        const next = shownFor(s, s.live ? null : t)
        shownRef.current = next
        setShown(next)
        setLiveIdx(-1)
        if (!head) return
        // Face and hands follow the words: a smile for greetings and praise, a thumbs up, a shrug…
        window.clearTimeout(moodTimer.current)
        head.setMood(moodFor(s.text))
        const g = reduced() ? null : gestureFor(s.text)
        // A question ends with raised brows, as people ask.
        if (/[?？]\s*$/.test(s.text)) {
          window.clearTimeout(browTimer.current)
          browTimer.current = window.setTimeout(() => headRef.current?.setValue('browInnerUp', 0.4, 900), Math.max(0, s.ms * 0.65))
        }
        if (!t.words.length && !hasShapes) return
        const ctx = head.audioCtx
        if (ctx.state === 'suspended') void ctx.resume()
        const silent = ctx.createBuffer(1, Math.max(1, Math.round((ctx.sampleRate * s.ms) / 1000)), ctx.sampleRate)
        head.stopSpeaking()
        // Hands: a gesture that fits the sentence, else they move a little while talking (only standing).
        if (getVoicePrefs().teacherGestures) {
          if (g && !getTeacher().sitting) head.playGesture(g, 2.2, g === 'index')
          else if (!reduced()) head.speakWithHands(0, 0.6)
        }
        // With exact mouth shapes TalkingHead uses them instead of guessing from the words.
        head.speakAudio({ audio: silent, ...t, ...(hasShapes ? { visemes: exact!.visemes!, vtimes: exact!.vtimes!, vdurations: exact!.vdurations! } : {}) }, { lipsyncLang: 'en' })
      }),
    [],
  )

  /* The device voice says where each word starts: the lips follow each word as it is said, so they never drift from the sound. */
  useEffect(
    () =>
      onWord((w) => {
        // The caption lights the word the device voice has reached (the next one that matches, a little ahead at most).
        const cur = shownRef.current
        if (cur && !cur.starts) {
          setLiveIdx((i) => {
            for (let j = i + 1; j < Math.min(cur.tokens.length, i + 5); j++) if (sameWord(cur.tokens[j], w.word)) return j
            return Math.min(cur.tokens.length - 1, i + 1)
          })
        }
        const head = headRef.current
        if (!head) return
        const words = toRoman(w.word).split(/\s+/).filter(Boolean)
        if (!words.length) return
        const ctx = head.audioCtx
        if (ctx.state === 'suspended') void ctx.resume()
        const silent = ctx.createBuffer(1, Math.max(1, Math.round((ctx.sampleRate * w.ms) / 1000)), ctx.sampleRate)
        const each = w.ms / words.length
        head.stopSpeaking()
        head.speakAudio({ audio: silent, words, wtimes: words.map((_, i) => i * each), wdurations: words.map(() => each) }, { lipsyncLang: 'en' })
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

  /* Real results (judge verdicts, GATE grades): she reacts like a teacher beside the student (reactions.ts). */
  const lastReact = useRef(0)
  useEffect(
    () =>
      onTeacherReact((result) => {
        const head = headRef.current
        const misses = countResult(result)
        const now = Date.now()
        // One reaction at a time, and never over her own talking or a conversation turn.
        const prefs = getVoicePrefs()
        if (!head || !prefs.teacherReacts || now - lastReact.current < 5000 || speakingNowRef.current || getTalk().status !== 'idle') return
        lastReact.current = now
        const r = reactionFor(result, { misses, lang: prefs.lang, seed: now / 1000 })
        window.clearTimeout(moodTimer.current)
        head.setMood(r.mood)
        moodTimer.current = window.setTimeout(() => headRef.current?.setMood('neutral'), 3500)
        if (!reduced()) {
          if (r.gesture && !getTeacher().sitting) head.playGesture(r.gesture, 2.4)
          const box = stage.current?.getBoundingClientRect()
          if (r.nod && box) {
            head.lookAt(box.left + box.width / 2, box.bottom + box.height * 0.5, 260)
            window.setTimeout(() => headRef.current?.lookAtCamera(900), 320)
          }
        }
        if (prefs.speak) speak(r.say, prefs.lang)
        else teacherSays(r.say, 5000)
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
      if (!head || !getVoicePrefs().teacherGlance || now - last < 2500 || speakingNowRef.current || getTalk().status !== 'idle' || Math.random() > 0.35) return
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

  /* While the student speaks, small nods now and then ("mm-hm, go on"), as a listener does. */
  const lastNod = useRef(0)
  const micAt = useRef(-Infinity)
  /* With our own ears the mic level is known: she nods as the student starts each phrase, like a listener. */
  useEffect(() => {
    const nod = nodder()
    return onMicLevel((level) => {
      const head = headRef.current
      micAt.current = performance.now()
      if (!head || reduced() || getTalk().status !== 'listening' || !nod(level, performance.now())) return
      const r = stage.current?.getBoundingClientRect()
      if (!r) return
      head.lookAt(r.left + r.width / 2, r.bottom + r.height * 0.35, 220)
      window.setTimeout(() => headRef.current?.lookAtCamera(1600), 240)
    })
  }, [])

  /* How she holds herself: leaning in to listen, lips pressed while thinking (presence.ts). Held a moment at a time, so nothing sticks. */
  const presence: Presence = speaking.on ? 'speaking' : talk.status === 'listening' ? 'listening' : talk.status === 'thinking' ? 'thinking' : 'idle'
  useEffect(() => {
    if (st.status !== 'ready') return
    const body = new Set(['bodyRotateX', 'headRotateZ'])
    const hold = Object.entries(presenceFor(presence, st.side)).filter(([k]) => !(reduced() && body.has(k)))
    const apply = () => {
      const head = headRef.current
      if (head) for (const [k, v] of hold) head.setValue(k, v, 900)
    }
    apply()
    const t = window.setInterval(apply, 600)
    return () => {
      window.clearInterval(t)
      const head = headRef.current
      if (head) for (const k of PRESENCE_SHAPES) head.setValue(k, null)
    }
  }, [presence, st.status, st.side])
  useEffect(() => {
    const head = headRef.current
    const r = stage.current?.getBoundingClientRect()
    if (!head || !r || talk.status !== 'listening' || !talk.hearing || reduced() || performance.now() - micAt.current < 1500) return
    const now = Date.now()
    if (now - lastNod.current < 1800) return
    lastNod.current = now
    head.lookAt(r.left + r.width / 2, r.bottom + r.height * 0.35, 220)
    window.setTimeout(() => headRef.current?.lookAtCamera(1600), 240)
  }, [talk.hearing, talk.status])

  /* Conversation cues: look at the student while they speak, nod, glance away while thinking. */
  useEffect(() => {
    const head = headRef.current
    if (!head || st.status !== 'ready') return
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
  }, [talk.status, st.status, st.side])

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
      head.setView(view === 'mid' ? 'upper' : view, { cameraY: 2.2 })
    } else {
      // Stand up into the usual standing pose (stopPose alone keeps the last pose until an idle timer changes it).
      if (standUp.current) void head.playPose(teacher.body === 'M' ? 'wide' : 'side', null, 4)
      head.setView(view, { cameraY: 0 })
    }
    standUp.current = st.sitting
  }, [st.sitting, st.status, teacher.body, view])

  /* Place: glide to the new side, turned the way it walks. */
  useLayoutEffect(() => {
    const el = root.current
    if (!el || anchored) return
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
  }, [st.side, st.atX, size, anchored])

  const a = st.anchor
  const placed = a
    ? ({ transform: `translate(${a.x}px, ${a.y}px)`, ['--tch-w' as string]: `${a.w}px`, visibility: a.shown ? undefined : 'hidden' } as React.CSSProperties)
    : x === null
      ? { visibility: 'hidden' as const }
      : { transform: `translateX(${dragX ?? x}px)` }
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
      data-state={presence}
      data-dragging={dragX !== null ? '' : undefined}
      data-anchored={a ? '' : undefined}
      style={placed}
      role="region"
      aria-label={teacher.name === UNNAMED ? 'Virtual teacher' : `Virtual teacher ${teacher.name}`}
    >
      {/* The teacher listens, thinks and answers here — not a box on the website. */}
      {!speaking.on && talk.status === 'listening' && (
        <div className="tch-say tch-say--talk" role="status" key="listening">
          <div className="tch-say-head">
            <MicMeter pulse={talk.hearing} />
            <span>{talk.on ? `Talking with ${teacher.name}` : 'Listening'}</span>
          </div>
          <p className="tch-say-text">{talk.hearing ? <span lang={lang === 'hi-IN' ? 'hi' : 'en'}>“{talk.hearing}”</span> : `Go ahead, I’m listening.`}</p>
          <div className="tch-say-foot">
            <span>Speak now</span>
            {talk.on ? (
              <button type="button" onClick={() => { endTalk(); stopSpeaking() }} aria-label={`End the conversation with ${teacher.name}`}>
                <Square className="size-3" aria-hidden="true" /> End
              </button>
            ) : (
              <button type="button" onClick={cancelListening} aria-label={`Stop ${teacher.name} listening`}>
                <Square className="size-3" aria-hidden="true" /> Cancel
              </button>
            )}
          </div>
        </div>
      )}
      {!speaking.on && talk.status === 'thinking' && (
        <div className="tch-say tch-say--talk" role="status" key="thinking">
          {talk.asked && (
            <p className="tch-asked" lang={lang === 'hi-IN' ? 'hi' : 'en'}>
              “{talk.asked}”
            </p>
          )}
          <p className="tch-think">
            <span className="tch-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            {teacher.name} is thinking
          </p>
          {talk.on && (
            <div className="tch-say-foot">
              <span>Talking with {teacher.name}</span>
              <button type="button" onClick={() => { endTalk(); stopSpeaking() }} aria-label={`End the conversation with ${teacher.name}`}>
                <Square className="size-3" aria-hidden="true" /> End
              </button>
            </div>
          )}
        </div>
      )}
      {!speaking.on && talk.status === 'idle' && talk.says && !typing && (
        <div className="tch-say" role="status" key="says">
          <p className="tch-say-text" lang={lang === 'hi-IN' ? 'hi' : 'en'}>
            {talk.says}
          </p>
          <div className="tch-say-foot">
            <span>{teacher.name}</span>
            <button type="button" onClick={() => teacherSays('')} aria-label="Close">
              <X className="size-3" aria-hidden="true" /> Close
            </button>
          </div>
        </div>
      )}
      {!speaking.on && talk.status === 'idle' && typing && (
        <TypeBox
          key="type"
          name={teacher.name}
          said={talk.says}
          lang={lang}
          onClose={() => setTyping(false)}
          onAsk={(text) => {
            teacherSays('')
            if (!askTyped(text)) teacherSays(`I can’t answer here right now. Try again in a moment.`, 5000)
          }}
        />
      )}
      {speaking.on && !board.open && (
        <div className="tch-say" role="status" key="speaking">
          {shown && prefs.teacherCaptions && <Caption shown={shown} liveIdx={liveIdx} lang={lang} />}
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

      {st.status === 'ready' && !speaking.on && talk.status === 'idle' && !talk.says && !typing && !board.open && <VoiceOffer name={teacher.name} />}
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

      <div className="tch-bar" onPointerDown={onBarDown} onPointerMove={onBarMove} onPointerUp={onBarUp} onPointerCancel={onBarUp} title="Drag to move">
        <span className="tch-name">{teacher.name}</span>
        {brain.status === 'ready' && (
          <span className="tch-chip" role="img" aria-label={`${teacher.name} is thinking on this device`} title={`Thinking on this device (${teacher.body === 'M' ? 'his' : 'her'} own brain)`}>
            <Cpu size={12} aria-hidden="true" />
          </span>
        )}
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
          data-on={typing ? '' : undefined}
          aria-pressed={typing}
          onClick={() => setTyping((v) => !v)}
          aria-label={typing ? 'Close typing' : `Type to ${teacher.name}`}
          title={typing ? 'Close typing' : 'Type instead of speaking'}
        >
          <Keyboard aria-hidden="true" />
        </button>
        <TeacherMenu
          name={teacher.name}
          items={[
            { id: 'board', label: board.open ? 'Close the whiteboard' : 'Explain this page on the whiteboard', icon: PenLine, run: () => (board.open ? (stopSpeaking(), closeBoard(), setTeacher({ atX: null })) : void openBoard(pageTopic())) },
            ...(anchored ? [] : [{ id: 'move', label: `Move to the ${nextSide}`, icon: ArrowLeftRight, run: () => setTeacher({ side: nextSide }) }]),
            ...(st.status === 'ready'
              ? [
                  { id: 'sit', label: st.sitting ? 'Stand up' : 'Sit down', icon: st.sitting ? PersonStanding : Armchair, run: () => setTeacher({ sitting: !st.sitting }) },
                  { id: 'wave', label: 'Wave hello', icon: Hand, run: () => teacherMove('wave') },
                ]
              : []),
            ...(anchored ? [] : [{ id: 'studio', label: 'Teacher studio', icon: SlidersHorizontal, run: () => navigate('/teacher') }]),
            ...(anchored ? [] : [{ id: 'hide', label: 'Hide', icon: EyeOff, run: () => setTeacher({ hidden: true }) }]),
          ]}
        />
      </div>
    </div>
  )
}
