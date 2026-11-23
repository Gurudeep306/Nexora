/*
  The mic: push to talk, say a command, the site does it. Phase 0/1 of the
  voice blueprint (docs/voice/BLUEPRINT.md): free browser speech recognition
  plus the Action Graph's rule matcher, no AI and no server. A sentence that
  is not a command is offered to the AI assistant instead.

  First press shows the consent screen. Nothing is recorded by NexoraGuru.
*/
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, Pencil, X } from 'lucide-react'
import { Button, Modal, Tooltip } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { openAssistantEvent, useAgentContext } from '@/context/AgentContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { InkWave } from './listen/InkWave'
import { useActionList } from './actions/useVoiceAction'
import { expand, matchCommand, normalize, type Match } from './actions/match'
import type { VoiceAction } from './actions/types'
import { listenOnce, useVoiceSupport, type Heard, type ListenHandle, type SpeechError } from './speech'
import { useVoicePrefs, type VoicePrefs } from './prefs'
import { activeScene, type SceneHandle } from './scene/active'
import { parseScene, type SceneCommand } from './scene/parse'
import { resolveScene } from './scene/resolve'
import { activeCode, type CodeHandle } from './code/active'
import { applyCode } from './code/apply'
import { parseCode, type CodeCommand } from './code/parse'
import { activeBuilder, parseBuild } from './code/build'
import { speak, stopSpeaking, useSpeaking } from './speak'
import { bargeInOn, bargeInResult, listenForInterruption } from './bargeIn'
import { endTalk, getTalk, onCancelListening, onStartTalk, remember, saysGoodbye, setTalkStatus, teacherSays, useTalk } from './talk'
import { teacherMove, teacherShowing, useTeacher } from './teacher/store'
import { teacherById } from './teacher/teachers'
import { askOnDevice, getBrain, startBrain } from './brain/brain'
import { spoken } from './brain/spoken'
import { pageHints } from './hints'
import { SpeakingChip } from './SpeakingChip'
import './voice.css'

type Phase =
  | { kind: 'idle' }
  | { kind: 'listening'; text: string }
  | { kind: 'done'; heard: string; said: string }
  | { kind: 'scene'; heard: string; title: string; say: string }
  | { kind: 'code'; heard: string; say: string; ok: boolean; undo?: () => void }
  | { kind: 'thinking'; heard: string }
  | { kind: 'guru'; heard: string; say: string; step: number; who?: string }
  | { kind: 'choose'; heard: string; options: { action: VoiceAction; match: Match }[] }
  | { kind: 'confirm'; heard: string; action: VoiceAction; match: Match }
  /** S6: the ears weren't sure, and acting on it would change something. */
  | { kind: 'check'; heard: string; options: string[] }
  | { kind: 'miss'; heard: string }
  | { kind: 'error'; error: SpeechError }

/** What the teacher shows herself when she is on screen; the rest (choices that need a tap) stays in the box. */
const TEACHER_SHOWS = new Set<Phase['kind']>(['listening', 'thinking', 'guru', 'done', 'scene', 'error'])

const YES = new Set(['confirm', 'yes', 'haan', 'han', 'ha', 'pakka', 'sure', 'ok', 'theek', 'thik'])
const NO = new Set(['no', 'nahi', 'nahin', 'cancel', 'mat', 'ruko', 'pause', 'stop'])

const ERRORS: Record<SpeechError, string> = {
  'not-allowed': 'The microphone is blocked. Allow it in the browser’s address bar, then try again.',
  'no-speech': 'I didn’t hear anything. Press the mic and speak.',
  network: 'The browser’s speech service isn’t reachable right now. Check the connection and try again.',
  unsupported: 'This browser can’t listen. Try Chrome, Edge or Safari, or type instead.',
  other: 'Something went wrong with the microphone. Try again.',
}

/** Hints Guru has given per question / problem / page this session (the hint ladder). */
const hintsGiven = new Map<string, number>()

/**
 * Guru on this device (Settings → Voice): the server plans the turn and says
 * whether it may be answered here (never an unsolved question: its answer
 * stays on the server). Returns null whenever the server should answer.
 * The first question after a page load starts the model in the background.
 */
async function onDevice(body: Record<string, unknown>): Promise<{ ok: boolean; say: string; step: number } | null> {
  const b = getBrain()
  if (b.status === 'off') {
    void startBrain()
    return null
  }
  if (b.status !== 'ready') return null
  try {
    const plan = await api.post<{ ok: boolean; local: boolean; say?: string; step?: number; messages?: unknown }>('/api/voice/guru/plan', body)
    if (plan.say) return { ok: true, say: plan.say, step: plan.step ?? 0 }
    if (!plan.local || !plan.messages) return null
    const say = spoken(await askOnDevice(plan.messages))
    return say ? { ok: true, say, step: plan.step ?? 0 } : null
  } catch {
    return null
  }
}

/** What was done, in words: "Open Notes", "Switch to dark mode". */
function describe(action: VoiceAction, match: Match) {
  const slot = Object.keys(match.args)[0]
  if (!slot) return action.title
  // A slot value is "value|Spoken label|aliases…": show the spoken label.
  const entry = action.args?.[slot]?.find((v) => v.split('|')[0] === match.args[slot])
  const label = entry?.split('|')[1] ?? match.args[slot]
  return action.id === 'nav.open' ? `Open ${label}` : `${action.title}: ${label}`
}

/** Mics on screen, newest last: Alt+M goes to the top one (the exam console's over the top bar's). */
const mics: symbol[] = []

/**
 * The mic. `layer="top"` puts its answers above full-screen screens such as
 * the exam console, which renders its own mic.
 */
export function VoiceButton({ layer }: { layer?: 'top' } = {}) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useVoicePrefs(user?.username)
  const actions = useActionList()
  const { pageContext, shareContext } = useAgentContext()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [consentOpen, setConsentOpen] = useState(false)
  const handle = useRef<ListenHandle | null>(null)
  const hideTimer = useRef<number | null>(null)
  const supported = useVoiceSupport()
  const talk = useTalk()
  const speaking = useSpeaking()
  // With a teacher on screen, she is the one who listens and answers: no box on the website
  // (except for choices that need a tap). The exam console keeps its own mic and box.
  const teacherState = useTeacher()
  const viaTeacher = useCallback(() => layer !== 'top' && teacherShowing(), [layer])
  const teacherOn = layer !== 'top' && teacherState.status === 'ready' && !teacherState.hidden
  // Conversation mode: turns in a row where nothing was heard (two end it).
  const misses = useRef(0)
  /** True from the moment listening is asked for until it ends (listenOnce is async). */
  const starting = useRef(false)
  const startRef = useRef<() => void>(() => {})
  const prefsRef = useRef(prefs)
  useLayoutEffect(() => {
    prefsRef.current = prefs
  })

  // Expanded phrases, rebuilt only when the action list changes.
  const index = useMemo(() => new Map(actions.map((a) => [a.id, expand(a)])), [actions])

  const clearHide = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = null
  }
  const hideSoon = useCallback((ms = 2600) => {
    clearHide()
    hideTimer.current = window.setTimeout(() => setPhase({ kind: 'idle' }), ms)
  }, [])
  useEffect(() => () => {
    clearHide()
    handle.current?.cancel()
  }, [])

  /**
   * Conversation mode: say it, and the mic opens again when the voice ends
   * (the effect below). If no voice starts (sound off, voice unavailable),
   * listen anyway after a moment.
   */
  const speakingNow = useRef(false)
  const sayThenListen = useCallback((text: string) => {
    speak(text, prefsRef.current.lang === 'hi-IN' ? 'hi-IN' : 'en-IN')
    window.setTimeout(() => {
      if (getTalk().on && !speakingNow.current && getTalk().status !== 'listening') startRef.current()
    }, 1500)
  }, [])

  const runAction = useCallback(
    (action: VoiceAction, match: Match, heard: string) => {
      setPhase({ kind: 'done', heard, said: describe(action, match) })
      if (viaTeacher()) teacherSays(describe(action, match), 2400)
      hideSoon()
      void action.run(match.args)
      // In a conversation, keep listening after doing what was asked ("go left").
      if (getTalk().on) window.setTimeout(() => getTalk().on && !speakingNow.current && startRef.current(), 900)
    },
    [hideSoon, viaTeacher],
  )

  /** Carry out a Scene Voice command on the animation on screen. */
  const runScene = useCallback(
    (scene: SceneHandle, cmd: SceneCommand, heard: string) => {
      const r = resolveScene(cmd, scene.frames(), scene.at())
      let say = r.say
      if (r.kind === 'go') {
        scene.go(r.index)
      } else if (r.kind === 'answer' && r.index != null) {
        scene.go(r.index)
      } else if (r.kind === 'control') {
        if (cmd.verb === 'pause') scene.pause()
        else if (cmd.verb === 'play') scene.play()
        else if (cmd.verb === 'replay') scene.replay()
        else if (cmd.verb === 'speed') scene.speed(cmd.to)
        else if (cmd.verb === 'predict') {
          scene.predict(cmd.on)
          if (cmd.on) scene.play()
        } else if (cmd.verb === 'whatif') {
          const w = scene.whatIf?.(cmd.input) ?? { error: 'This animation doesn’t take an input to change.' }
          say = 'error' in w ? w.error : w.say
        }
      }
      setPhase({ kind: 'scene', heard, title: scene.title, say })
      // Answers are worth hearing; "Paused" is not.
      if (prefs.speak && (r.kind === 'answer' || r.kind === 'none' || cmd.verb === 'whatif')) speak(say, prefs.lang === 'hi-IN' ? 'hi-IN' : 'en-IN')
      else if (viaTeacher()) teacherSays(say, r.kind === 'answer' ? 9000 : 3200)
      hideSoon(r.kind === 'answer' ? 9000 : 3200)
    },
    [hideSoon, prefs.speak, prefs.lang, viaTeacher],
  )

  /** Carry out a code-by-voice edit in the editor in use (lane C, no AI). */
  const runCode = useCallback(
    (code: CodeHandle, cmd: CodeCommand, heard: string) => {
      const r = applyCode(cmd, code)
      const ok = 'say' in r
      const say = ok ? r.say : r.error
      const changed = ok && ['rename', 'insert', 'delete', 'duplicate', 'comment', 'format'].includes(cmd.verb)
      const undo = changed ? () => applyCode({ verb: 'undo' }, code) : undefined
      setPhase({ kind: 'code', heard, say, ok, undo })
      // Reading code and problems are worth hearing; "Line 12." is not.
      if (prefs.speak && (!ok || cmd.verb === 'read' || cmd.verb === 'summary')) speak(say, prefs.lang === 'hi-IN' ? 'hi-IN' : 'en-IN')
      hideSoon(cmd.verb === 'summary' || cmd.verb === 'read' ? 9000 : changed ? 5000 : 2600)
    },
    [hideSoon, prefs.speak, prefs.lang],
  )

  /** Anything that isn't a command is a doubt for Guru, with the page attached. */
  const askGuru = useCallback(
    async (heard: string) => {
      setPhase({ kind: 'thinking', heard })
      const full = pageContext()
      const page = shareContext ? full : { path: full.path }
      const item = String(page.gateQuestionId || page.problemId || page.path || '')
      try {
        const t = getTalk()
        const face = t.on || viaTeacher()
        if (face) setTalkStatus('thinking')
        const body = {
          text: heard,
          page,
          hintsGiven: hintsGiven.get(item) ?? 0,
          lang: prefs.lang,
          // With a virtual teacher, they answer as themselves; in conversation mode, remembering the talk.
          teacher: prefs.teacher,
          // A teacher on screen always talks like a person; the history is kept in conversation mode.
          talk: face,
          history: t.on ? t.history : [],
        }
        const r = (prefs.brain && (await onDevice(body))) || (await api.post<{ ok: boolean; say: string; step: number }>('/api/voice/guru', body))
        if (r.step >= 1 && r.step <= 5) hintsGiven.set(item, r.step)
        setPhase({ kind: 'guru', heard, say: r.say, step: r.step, who: teacherById(prefs.teacher)?.name })
        if (getTalk().on) {
          setTalkStatus('idle')
          remember(heard, r.say)
          sayThenListen(r.say)
        } else if (viaTeacher()) {
          setTalkStatus('idle')
          if (prefs.speak) speak(r.say, prefs.lang)
          else teacherSays(r.say, 14000)
        } else if (prefs.speak) speak(r.say, prefs.lang)
      } catch (e) {
        const msg = e instanceof Error && e.message ? e.message : 'Guru couldn’t answer just now. Try again in a moment.'
        setPhase({ kind: 'guru', heard, say: msg, step: 0 })
        if (getTalk().on || viaTeacher()) setTalkStatus('idle')
        if (!getTalk().on && viaTeacher()) teacherSays(msg)
        if (getTalk().on) sayThenListen(prefs.lang === 'hi-IN' ? 'माफ़ करना, अभी जवाब नहीं दे पाया। फिर से बोलो?' : 'Sorry, I couldn’t answer that just now. Say it again?')
      }
    },
    [pageContext, shareContext, prefs.lang, prefs.speak, prefs.teacher, prefs.brain, sayThenListen, viaTeacher],
  )

  /** Would acting on this text change something (an edit, Build mode, an action that isn't just looking)? */
  const changesSomething = useCallback(
    (heard: string) => {
      const code = activeCode()
      const edit = code ? parseCode(heard) : null
      if (edit) return !['goto', 'read', 'summary'].includes(edit.verb)
      if (code && parseBuild(heard)) return true
      const best = matchCommand(heard, actions, index).best
      const action = best ? actions.find((a) => a.id === best.id) : null
      return !!action && action.risk !== 'safe'
    },
    [actions, index],
  )

  const decide = useCallback(
    (heard: string, ears?: Heard) => {
      const pending = phase
      // Conversation mode: "bye", "bas", "stop talking" ends it, with a wave.
      if (getTalk().on && saysGoodbye(heard)) {
        endTalk()
        teacherMove('wave')
        const bye = prefs.lang === 'hi-IN' ? 'ठीक है, फिर मिलते हैं!' : 'Okay, bye! See you soon.'
        setPhase({ kind: 'done', heard, said: 'Conversation ended' })
        speak(bye, prefs.lang)
        return hideSoon(2400)
      }
      // S6: two services heard different words — the student picks. Unsure words
      // that would change something are shown first ("Did you mean …?").
      if (pending.kind !== 'confirm' && ears?.alternatives && ears.alternatives.length > 1) {
        return setPhase({ kind: 'check', heard, options: ears.alternatives })
      }
      if (pending.kind !== 'confirm' && ears?.unsure && changesSomething(heard)) {
        return setPhase({ kind: 'check', heard, options: [heard] })
      }
      // A reply to "are you sure?" for an irreversible action.
      if (pending.kind === 'confirm') {
        const words = normalize(heard).split(' ')
        if (words.some((w) => YES.has(w))) return runAction(pending.action, pending.match, heard)
        if (words.some((w) => NO.has(w))) {
          setPhase({ kind: 'done', heard, said: 'Cancelled' })
          return hideSoon(1600)
        }
      }
      // An animation on screen hears scene commands first ("swap pe ruko").
      const scene = activeScene()
      if (scene?.awaitingGuess()) {
        const feedback = scene.guess(heard)
        setPhase({ kind: 'scene', heard, title: scene.title, say: feedback })
        if (prefs.speak) speak(feedback, prefs.lang)
        return hideSoon(9000)
      }
      const cmd = scene ? parseScene(heard) : null
      if (scene && cmd) return runScene(scene, cmd, heard)
      // A code editor in use hears edits ("line 12 pe jao", "rename i to j").
      const code = activeCode()
      const edit = code ? parseCode(heard) : null
      if (code && edit) return runCode(code, edit, heard)
      // Build mode: "translate to python", "make it iterative" (opens a review sheet).
      const build = code ? parseBuild(heard) : null
      const builder = build ? activeBuilder() : null
      if (build && builder) {
        builder(build)
        setPhase({ kind: 'done', heard, said: build.verb === 'translate' ? 'Build mode: translating' : 'Build mode' })
        return hideSoon(1800)
      }
      const result = matchCommand(heard, actions, index)
      const byId = (m: Match) => actions.find((a) => a.id === m.id)!
      if (result.best) {
        const action = byId(result.best)
        if (action.risk === 'irreversible') return setPhase({ kind: 'confirm', heard, action, match: result.best })
        return runAction(action, result.best, heard)
      }
      if (result.candidates.length > 1) return setPhase({ kind: 'choose', heard, options: result.candidates.map((m) => ({ action: byId(m), match: m })) })
      void askGuru(heard)
    },
    [actions, index, phase, runAction, hideSoon, runScene, runCode, askGuru, prefs.speak, prefs.lang, changesSomething],
  )

  const start = useCallback(async () => {
    clearHide()
    if (phase.kind === 'listening') {
      handle.current?.stop()
      return
    }
    starting.current = true
    setPhase({ kind: 'listening', text: '' })
    const face = getTalk().on || viaTeacher()
    if (face) {
      // The student is about to speak: the teacher stops and listens.
      stopSpeaking()
      setTalkStatus('listening')
    }
    const code = activeCode()
    handle.current = await listenOnce({
      lang: prefs.lang,
      // An editor in use expects code; otherwise a command. The page's names help the server ears.
      mode: code ? 'code' : 'command',
      hints: pageHints(code, actions),
      onText: (text) => {
        setPhase((p) => (p.kind === 'listening' ? { kind: 'listening', text } : p))
        if (face) setTalkStatus('listening', text)
      },
      onDone: (text, error, ears) => {
        handle.current = null
        starting.current = false
        if (face) setTalkStatus('idle')
        if (interrupted.current) {
          // Was it really the student? Two false alarms turn interrupting off for this session.
          bargeInResult(!!text)
          interrupted.current = false
        }
        if (!text) {
          // In a conversation, one quiet turn listens again; two end it, so the mic is never left open.
          if (getTalk().on && error !== 'not-allowed' && error !== 'unsupported' && ++misses.current < 2) {
            setPhase({ kind: 'idle' })
            window.setTimeout(() => startRef.current(), 300)
            return
          }
          if (getTalk().on) endTalk()
          setPhase({ kind: 'error', error: error ?? 'no-speech' })
          if (face) teacherSays(ERRORS[error ?? 'no-speech'], 5000)
          hideSoon(4200)
          return
        }
        misses.current = 0
        decide(text, ears)
      },
    })
  }, [phase.kind, prefs.lang, decide, hideSoon, actions, viaTeacher])

  const onMic = () => {
    if (!prefs.consent) return setConsentOpen(true)
    void start()
  }
  useLayoutEffect(() => {
    startRef.current = () => {
      if (handle.current || starting.current) return
      void start()
    }
  })

  // Interrupting: in a conversation, starting to talk while the teacher speaks stops her and she listens.
  const interrupted = useRef(false)
  useEffect(() => {
    if (!talk.on || !speaking.on || !bargeInOn()) return
    return listenForInterruption(() => {
      interrupted.current = true
      stopSpeaking()
      startRef.current()
    })
  }, [talk.on, speaking.on])

  // "Cancel" on the teacher's bubble stops the mic.
  useEffect(
    () =>
      onCancelListening(() => {
        handle.current?.cancel()
        handle.current = null
        starting.current = false
        setPhase({ kind: 'idle' })
      }),
    [],
  )

  // Conversation mode: when the teacher finishes speaking, listen again.
  useEffect(() => {
    const was = speakingNow.current
    speakingNow.current = speaking.on
    if (talk.on && was && !speaking.on && !handle.current && !starting.current) {
      const t = window.setTimeout(() => getTalk().on && !speakingNow.current && startRef.current(), 250)
      return () => window.clearTimeout(t)
    }
  }, [speaking.on, talk.on])

  // "Let's talk" (the teacher's Talk button or voice): greet, then listen.
  useEffect(
    () =>
      onStartTalk(() => {
        misses.current = 0
        if (!prefsRef.current.consent) {
          setConsentOpen(true)
          return
        }
        const hi = prefsRef.current.lang === 'hi-IN'
        const plain = hi ? 'हाँ, बोलो! आज क्या पढ़ना है?' : 'Haan, bolo! What shall we study today?'
        // She remembers the student: "Welcome back! Last time we were on paging…" (built on our server, no AI).
        void api
          .get<{ greeting?: string }>('/api/voice/teacher/memory', { query: { lang: prefsRef.current.lang }, timeoutMs: 2500 })
          .then((r) => sayThenListen(r.greeting || plain))
          .catch(() => sayThenListen(plain))
      }),
    [sayThenListen],
  )
  // Leaving the site's pages or closing the mic's answer ends nothing; turning voice off does.
  useEffect(() => {
    if (!prefs.consent && talk.on) endTalk()
  }, [prefs.consent, talk.on])

  // Alt+M: talk without reaching for the mouse (hands-free exam, coding).
  const onMicRef = useRef(onMic)
  useLayoutEffect(() => {
    onMicRef.current = onMic
  })
  useEffect(() => {
    const me = Symbol('mic')
    mics.push(me)
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.code !== 'KeyM' || mics[mics.length - 1] !== me) return
      e.preventDefault()
      onMicRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      mics.splice(mics.indexOf(me), 1)
    }
  }, [])

  if (!user || !supported) return null
  const listening = phase.kind === 'listening'

  return (
    <>
      <Tooltip label={listening ? 'Listening… press to stop' : teacherOn ? `Talk to ${teacherById(prefs.teacher)?.name ?? 'your teacher'} (Alt+M)` : 'Speak a command (Alt+M)'} side="bottom">
        <button
          type="button"
          onClick={onMic}
          aria-label={listening ? 'Stop listening' : teacherOn ? `Talk to ${teacherById(prefs.teacher)?.name ?? 'your teacher'}` : 'Speak a command'}
          aria-pressed={listening}
          className={cn('vc-mic flex size-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-text-primary/6 hover:text-text-primary', listening && 'is-on')}
        >
          <Mic className="size-[17px]" aria-hidden="true" />
        </button>
      </Tooltip>

      <AnimatePresence>
        {phase.kind !== 'idle' && !(teacherOn && TEACHER_SHOWS.has(phase.kind)) && (
          <motion.div
            key="pill"
            role="status"
            aria-live="polite"
            className={cn('vc-pill', layer === 'top' && 'vc-pill--top')}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <Pill
              phase={phase}
              onClose={() => { handle.current?.cancel(); stopSpeaking(); endTalk(); setPhase({ kind: 'idle' }) }}
              onRun={runAction}
              onAsk={(t) => { setPhase({ kind: 'idle' }); openAssistantEvent(t) }}
              onHint={() => void askGuru('next hint please')}
              onListen={() => void start()}
              onUse={(t) => { clearHide(); decide(t) }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <SpeakingChip />
      <ConsentSheet
        open={consentOpen}
        prefs={prefs}
        onClose={() => setConsentOpen(false)}
        onAccept={(patch) => {
          setPrefs({ ...patch, consent: true, consentAt: new Date().toISOString() })
          setConsentOpen(false)
          void start()
        }}
      />
    </>
  )
}

function Pill({ phase, onClose, onRun, onAsk, onHint, onListen, onUse }: { phase: Phase; onClose: () => void; onRun: (a: VoiceAction, m: Match, heard: string) => void; onAsk: (t: string) => void; onHint: () => void; onListen: () => void; onUse: (text: string) => void }) {
  return (
    <div className="vc-pill-in">
      <div className="vc-pill-head">
        <span className={cn('vc-dot', phase.kind === 'listening' && 'is-live')} aria-hidden="true" />
        <span className="vc-pill-title">
          {phase.kind === 'listening' && 'Listening…'}
          {phase.kind === 'done' && phase.said}
          {phase.kind === 'scene' && phase.title}
          {phase.kind === 'code' && (phase.ok ? 'Code' : 'Couldn’t do that')}
          {phase.kind === 'thinking' && 'Guru is thinking…'}
          {phase.kind === 'guru' && `${phase.who ?? 'Guru'}${phase.step >= 1 && phase.step <= 5 ? ` · hint ${phase.step}` : ''}`}
          {phase.kind === 'choose' && 'Which one?'}
          {phase.kind === 'confirm' && `${phase.action.title}?`}
          {phase.kind === 'check' && (phase.options.length > 1 ? 'Which did you say?' : 'Did you mean this?')}
          {phase.kind === 'miss' && 'That isn’t a command I know'}
          {phase.kind === 'error' && 'Couldn’t listen'}
        </span>
        <button type="button" className="vc-x" onClick={onClose} aria-label="Close">
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {'heard' in phase && phase.kind !== 'check' && <HeardCaption key={phase.heard} heard={phase.heard} onUse={onUse} />}
      {phase.kind === 'listening' && <InkWave active />}
      {phase.kind === 'listening' && <p className="vc-heard">{phase.text ? `“${phase.text}”` : activeScene() ? 'Talk to the animation: “swap pe ruko”, “why did i change?”, “what if sorted?”' : activeCode() ? 'Edit by voice: “line 12 pe jao”, “rename i to j”, “for loop 0 se n tak”, “translate to python”.' : 'Say a command, like “notes kholo” or “dark mode”.'}</p>}
      {phase.kind === 'error' && <p className="vc-note">{ERRORS[phase.error]}</p>}
      {phase.kind === 'scene' && <p className="vc-answer">{phase.say}</p>}
      {phase.kind === 'code' && (
        <>
          <p className="vc-answer vc-guru">{phase.say}</p>
          {phase.undo && (
            <div className="vc-actions">
              <Button size="sm" variant="secondary" onClick={() => { phase.undo?.(); onClose() }}>Undo</Button>
            </div>
          )}
        </>
      )}
      {phase.kind === 'guru' && (
        <>
          <p className="vc-answer vc-guru">{phase.say}</p>
          <div className="vc-actions">
            {phase.step >= 1 && phase.step <= 4 && (
              <Button size="sm" variant="secondary" onClick={onHint}>Another hint</Button>
            )}
            <Button size="sm" variant="ghost" onClick={onListen}>
              <Mic aria-hidden="true" /> Reply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onAsk(phase.heard)}>Open in chat</Button>
          </div>
        </>
      )}
      {phase.kind === 'choose' && (
        <ol className="vc-options">
          {phase.options.map((o, i) => (
            <li key={`${o.match.id}:${JSON.stringify(o.match.args)}`}>
              <button type="button" onClick={() => onRun(o.action, o.match, phase.heard)}>
                <span className="vc-num">{i + 1}</span> {describe(o.action, o.match)}
              </button>
            </li>
          ))}
        </ol>
      )}
      {phase.kind === 'confirm' && (
        <div className="vc-actions">
          <p className="vc-note">This can’t be undone. Say “confirm”, or tap.</p>
          <Button size="sm" onClick={() => onRun(phase.action, phase.match, phase.heard)}>Confirm</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="ghost" onClick={onListen}>
            <Mic aria-hidden="true" /> Answer by voice
          </Button>
        </div>
      )}
      {phase.kind === 'check' && (
        <>
          <ol className="vc-options">
            {phase.options.map((t, i) => (
              <li key={t}>
                <button type="button" onClick={() => onUse(t)}>
                  {phase.options.length > 1 && <span className="vc-num">{i + 1}</span>} “{t}”
                </button>
              </li>
            ))}
          </ol>
          <p className="vc-note">{phase.options.length > 1 ? 'Two services heard different words. Tap the right one.' : 'I wasn’t sure I heard that right, so nothing has changed yet.'}</p>
          <div className="vc-actions">
            <Button size="sm" variant="ghost" onClick={onListen}>
              <Mic aria-hidden="true" /> Say again
            </Button>
          </div>
          <HeardCaption heard={phase.options[0]} onUse={onUse} editOnly />
        </>
      )}
      {phase.kind === 'miss' && (
        <div className="vc-actions">
          <Button size="sm" variant="secondary" onClick={() => onAsk(phase.heard)}>Ask the AI instead</Button>
          <Button size="sm" variant="ghost" onClick={onListen}>Try again</Button>
        </div>
      )}
    </div>
  )
}

/**
 * What was heard, always shown (S6), with a way to fix it by typing: the
 * corrected text is used as if it had been said.
 */
function HeardCaption({ heard, onUse, editOnly }: { heard: string; onUse: (text: string) => void; editOnly?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(heard)
  const input = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])
  if (editing) {
    return (
      <form
        className="vc-fix"
        onSubmit={(e) => {
          e.preventDefault()
          const t = value.trim()
          if (t) onUse(t)
          setEditing(false)
        }}
      >
        <label className="sr-only" htmlFor="vc-fix-input">Fix what was heard</label>
        <input id="vc-fix-input" ref={input} value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false} />
        <Button size="sm" type="submit">Use</Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>Cancel</Button>
      </form>
    )
  }
  return (
    <p className={cn('vc-heard', editOnly && 'vc-heard-quiet')}>
      {!editOnly && <span>“{heard}”</span>}
      <button type="button" className="vc-fix-btn" onClick={() => setEditing(true)} aria-label={editOnly ? 'Type it instead' : `Fix “${heard}” by typing`}>
        <Pencil aria-hidden="true" /> {editOnly ? 'Type it instead' : 'Fix'}
      </button>
    </p>
  )
}

function ConsentSheet({ open, prefs, onClose, onAccept }: { open: boolean; prefs: VoicePrefs; onClose: () => void; onAccept: (p: Partial<VoicePrefs>) => void }) {
  const [lang, setLang] = useState(prefs.lang)
  const [corpus, setCorpus] = useState(prefs.corpus)
  const [adult, setAdult] = useState(prefs.adultOrGuardian)
  return (
    <Modal open={open} onClose={onClose} title="Talk to NexoraGuru" description="Say a command and the site does it — in English, Hinglish or Hindi." size="md">
      <div className="vc-consent">
        <ul className="vc-points">
          <li><strong>It only listens while you press the mic.</strong> Never in the background.</li>
          <li><strong>Turning speech into text:</strong> your browser does it (on your device where it can, otherwise its own service: Google, Microsoft or Apple). If your school has turned on better recognition for Indian speech, a short clip of what you say is also sent through NexoraGuru to a speech service, only to turn it into text.</li>
          <li><strong>NexoraGuru doesn’t keep your voice.</strong> Clips aren’t stored. Only the text is used, and only to do what you asked. You always see what was heard and can fix it.</li>
          <li>You can turn voice off any time in Settings → Preferences.</li>
        </ul>

        <fieldset className="vc-field">
          <legend>I’ll speak in</legend>
          <label><input type="radio" name="vc-lang" checked={lang === 'en-IN'} onChange={() => setLang('en-IN')} /> English or Hinglish</label>
          <label><input type="radio" name="vc-lang" checked={lang === 'hi-IN'} onChange={() => setLang('hi-IN')} /> हिन्दी (Hindi)</label>
        </fieldset>

        <fieldset className="vc-field">
          <legend>Optional: help Indian students</legend>
          <label>
            <input type="checkbox" checked={corpus} onChange={(e) => setCorpus(e.target.checked)} />
            <span>Ask me later to help build <strong>Bharat Code Speech</strong>, a public set of recordings of how Indian students say code. Nothing is recorded now, and you’ll be asked again before anything is.</span>
          </label>
          {corpus && (
            <label>
              <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
              <span>I’m 18 or older, or my parent or guardian agrees.</span>
            </label>
          )}
        </fieldset>

        <div className="vc-consent-foot">
          <Button variant="ghost" onClick={onClose}>Not now</Button>
          <Button onClick={() => onAccept({ lang, corpus: corpus && adult, adultOrGuardian: adult })}>
            <Mic aria-hidden="true" /> Turn on voice
          </Button>
        </div>
      </div>
    </Modal>
  )
}
