/*
  The mic: push to talk, say a command, the site does it. Phase 0/1 of the
  voice blueprint (docs/voice/BLUEPRINT.md): free browser speech recognition
  plus the Action Graph's rule matcher, no AI and no server. A sentence that
  is not a command is offered to the AI assistant instead.

  First press shows the consent screen. Nothing is recorded by NexoraGuru.
*/
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, X } from 'lucide-react'
import { Button, Modal, Tooltip } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { openAssistantEvent, useAgentContext } from '@/context/AgentContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useActionList } from './actions/useVoiceAction'
import { expand, matchCommand, normalize, type Match } from './actions/match'
import type { VoiceAction } from './actions/types'
import { listenOnce, speechSupported, type ListenHandle, type SpeechError } from './speech'
import { useVoicePrefs, type VoicePrefs } from './prefs'
import { activeScene, type SceneHandle } from './scene/active'
import { parseScene, type SceneCommand } from './scene/parse'
import { resolveScene } from './scene/resolve'
import { activeCode, type CodeHandle } from './code/active'
import { applyCode } from './code/apply'
import { parseCode, type CodeCommand } from './code/parse'
import { speak, stopSpeaking } from './speak'
import './voice.css'

type Phase =
  | { kind: 'idle' }
  | { kind: 'listening'; text: string }
  | { kind: 'done'; heard: string; said: string }
  | { kind: 'scene'; heard: string; title: string; say: string }
  | { kind: 'code'; heard: string; say: string; ok: boolean; undo?: () => void }
  | { kind: 'thinking'; heard: string }
  | { kind: 'guru'; heard: string; say: string; step: number }
  | { kind: 'choose'; heard: string; options: { action: VoiceAction; match: Match }[] }
  | { kind: 'confirm'; heard: string; action: VoiceAction; match: Match }
  | { kind: 'miss'; heard: string }
  | { kind: 'error'; error: SpeechError }

const YES = new Set(['confirm', 'yes', 'haan', 'han', 'ha', 'pakka', 'sure', 'ok', 'theek', 'thik'])
const NO = new Set(['no', 'nahi', 'nahin', 'cancel', 'mat', 'ruko', 'pause', 'stop'])

const ERRORS: Record<SpeechError, string> = {
  'not-allowed': 'The microphone is blocked. Allow it in the browser’s address bar, then try again.',
  'no-speech': 'I didn’t hear anything. Press the mic and speak.',
  network: 'The browser’s speech service isn’t reachable right now. Check the connection and try again.',
  unsupported: 'Voice needs Chrome, Edge or Safari for now.',
  other: 'Something went wrong with the microphone. Try again.',
}

/** Hints Guru has given per question / problem / page this session (the hint ladder). */
const hintsGiven = new Map<string, number>()

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
  const supported = speechSupported()

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

  const runAction = useCallback(
    (action: VoiceAction, match: Match, heard: string) => {
      setPhase({ kind: 'done', heard, said: describe(action, match) })
      hideSoon()
      void action.run(match.args)
    },
    [hideSoon],
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
      hideSoon(r.kind === 'answer' ? 9000 : 3200)
    },
    [hideSoon, prefs.speak, prefs.lang],
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
        const r = await api.post<{ ok: boolean; say: string; step: number }>('/api/voice/guru', { text: heard, page, hintsGiven: hintsGiven.get(item) ?? 0, lang: prefs.lang })
        if (r.step >= 1 && r.step <= 5) hintsGiven.set(item, r.step)
        setPhase({ kind: 'guru', heard, say: r.say, step: r.step })
        if (prefs.speak) speak(r.say, prefs.lang)
      } catch (e) {
        setPhase({ kind: 'guru', heard, say: e instanceof Error && e.message ? e.message : 'Guru couldn’t answer just now. Try again in a moment.', step: 0 })
      }
    },
    [pageContext, shareContext, prefs.lang, prefs.speak],
  )

  const decide = useCallback(
    (heard: string) => {
      const pending = phase
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
    [actions, index, phase, runAction, hideSoon, runScene, runCode, askGuru, prefs.speak, prefs.lang],
  )

  const start = useCallback(async () => {
    clearHide()
    if (phase.kind === 'listening') {
      handle.current?.stop()
      return
    }
    setPhase({ kind: 'listening', text: '' })
    handle.current = await listenOnce({
      lang: prefs.lang,
      onText: (text) => setPhase((p) => (p.kind === 'listening' ? { kind: 'listening', text } : p)),
      onDone: (text, error) => {
        handle.current = null
        if (!text) {
          setPhase({ kind: 'error', error: error ?? 'no-speech' })
          hideSoon(4200)
          return
        }
        decide(text)
      },
    })
  }, [phase.kind, prefs.lang, decide, hideSoon])

  const onMic = () => {
    if (!prefs.consent) return setConsentOpen(true)
    void start()
  }

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
      <Tooltip label={listening ? 'Listening… press to stop' : 'Speak a command (Alt+M)'} side="bottom">
        <button
          type="button"
          onClick={onMic}
          aria-label={listening ? 'Stop listening' : 'Speak a command'}
          aria-pressed={listening}
          className={cn('vc-mic flex size-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-text-primary/6 hover:text-text-primary', listening && 'is-on')}
        >
          <Mic className="size-[17px]" aria-hidden="true" />
        </button>
      </Tooltip>

      <AnimatePresence>
        {phase.kind !== 'idle' && (
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
            <Pill phase={phase} onClose={() => { handle.current?.cancel(); stopSpeaking(); setPhase({ kind: 'idle' }) }} onRun={runAction} onAsk={(t) => { setPhase({ kind: 'idle' }); openAssistantEvent(t) }} onHint={() => void askGuru('next hint please')} onListen={() => void start()} />
          </motion.div>
        )}
      </AnimatePresence>

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

function Pill({ phase, onClose, onRun, onAsk, onHint, onListen }: { phase: Phase; onClose: () => void; onRun: (a: VoiceAction, m: Match, heard: string) => void; onAsk: (t: string) => void; onHint: () => void; onListen: () => void }) {
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
          {phase.kind === 'guru' && (phase.step >= 1 && phase.step <= 5 ? `Guru · hint ${phase.step}` : 'Guru')}
          {phase.kind === 'choose' && 'Which one?'}
          {phase.kind === 'confirm' && `${phase.action.title}?`}
          {phase.kind === 'miss' && 'That isn’t a command I know'}
          {phase.kind === 'error' && 'Couldn’t listen'}
        </span>
        <button type="button" className="vc-x" onClick={onClose} aria-label="Close">
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {'heard' in phase && <p className="vc-heard">“{phase.heard}”</p>}
      {phase.kind === 'listening' && <p className="vc-heard">{phase.text ? `“${phase.text}”` : activeScene() ? 'Talk to the animation: “swap pe ruko”, “why did i change?”, “what if sorted?”' : activeCode() ? 'Edit by voice: “line 12 pe jao”, “rename i to j”, “for loop 0 se n tak”, “read my code”.' : 'Say a command, like “notes kholo” or “dark mode”.'}</p>}
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
      {phase.kind === 'miss' && (
        <div className="vc-actions">
          <Button size="sm" variant="secondary" onClick={() => onAsk(phase.heard)}>Ask the AI instead</Button>
          <Button size="sm" variant="ghost" onClick={onListen}>Try again</Button>
        </div>
      )}
    </div>
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
          <li><strong>Your browser turns speech into text.</strong> Where it can, it does this on your device; otherwise your browser’s own speech service (Google, Microsoft or Apple) does it.</li>
          <li><strong>NexoraGuru doesn’t record or keep your voice.</strong> Only the text of the command is used, and only to run it.</li>
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
