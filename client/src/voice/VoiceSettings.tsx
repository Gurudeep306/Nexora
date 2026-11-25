/*
  Settings → Preferences → Voice: turn voice commands on or off, pick the
  language, and the Bharat Code Speech opt-in (nothing is recorded yet).
*/
import { useEffect, useState } from 'react'
import { Mic, Volume2 } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useVoiceSupport } from './speech'
import { useVoicePrefs } from './prefs'
import { KOKORO_MB, loadKokoro, naturalVoices, speak } from './speak'
import { deviceInfo, removeBrain, startBrain, useBrain } from './brain/brain'
import { downloadMb, pickTier, unsupportedWhy, type DeviceInfo, type Tier } from './brain/tiers'
import './voice.css'

export function VoiceSettings() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useVoicePrefs(user?.username)
  const supported = useVoiceSupport()
  return (
    <Card>
      <CardContent className="grid gap-4 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-0 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Mic className="size-4 text-text-muted" aria-hidden="true" /> Voice
            </p>
            <p className="mb-0 text-[12.5px] text-text-muted">
              {supported
                ? 'Press the mic in the top bar and say a command — “notes kholo”, “dark mode”, “wapas jao”. It only listens while you press it; NexoraGuru keeps no recordings.'
                : 'This browser can’t listen yet. Voice works in Chrome, Edge and Safari, and in other browsers once your school turns on voice recognition.'}
            </p>
          </div>
          {supported && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                className="accent-[var(--color-accent-brand)]"
                checked={prefs.consent}
                onChange={(e) => setPrefs({ consent: e.target.checked, consentAt: e.target.checked ? new Date().toISOString() : undefined })}
              />
              Voice on
            </label>
          )}
        </div>
        {supported && (
          <div className="vc-consent">
            <fieldset className="vc-field">
              <legend>I speak in</legend>
              <label>
                <input type="radio" name="vs-lang" checked={prefs.lang === 'en-IN'} onChange={() => setPrefs({ lang: 'en-IN' })} /> English or Hinglish
              </label>
              <label>
                <input type="radio" name="vs-lang" checked={prefs.lang === 'hi-IN'} onChange={() => setPrefs({ lang: 'hi-IN' })} /> हिन्दी (Hindi)
              </label>
            </fieldset>
            <fieldset className="vc-field">
              <legend>Answers</legend>
              <label>
                <input type="checkbox" checked={prefs.speak} onChange={(e) => setPrefs({ speak: e.target.checked })} />
                <span>Read answers aloud (“i changed from 3 to 4…”). The words are always shown too.</span>
              </label>
            </fieldset>
            {prefs.speak && <VoicePicker />}
            <OnDevice />
            <fieldset className="vc-field">
              <legend>Bharat Code Speech (optional)</legend>
              <label>
                <input type="checkbox" checked={prefs.adultOrGuardian} onChange={(e) => setPrefs({ adultOrGuardian: e.target.checked, corpus: e.target.checked && prefs.corpus })} />
                <span>I’m 18 or older, or my parent or guardian agrees.</span>
              </label>
              <label className={prefs.adultOrGuardian ? undefined : 'opacity-60'}>
                <input type="checkbox" disabled={!prefs.adultOrGuardian} checked={prefs.corpus} onChange={(e) => setPrefs({ corpus: e.target.checked })} />
                <span>Ask me later to help build a public set of recordings of how Indian students say code. Nothing is recorded now; you’ll be asked again first.</span>
              </label>
            </fieldset>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Which voice reads answers (docs/voice/STEP1_EARS_DESIGN.md §S8). */
function VoicePicker() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useVoicePrefs(user?.username)
  const [natural, setNatural] = useState<{ available: boolean; voices: Record<string, { id: string; label: string }[]> } | null>(null)
  const [kokoro, setKokoro] = useState<{ state: 'idle' | 'loading' | 'ready' | 'failed'; p: number }>({ state: 'idle', p: 0 })
  useEffect(() => {
    let live = true
    void naturalVoices().then((v) => live && setNatural(v))
    return () => {
      live = false
    }
  }, [])
  const voices = natural?.voices[prefs.lang] ?? []
  const download = async () => {
    setKokoro({ state: 'loading', p: 0 })
    try {
      await loadKokoro((p) => setKokoro({ state: 'loading', p }))
      setKokoro({ state: 'ready', p: 1 })
      setPrefs({ kokoro: true, engine: 'kokoro' })
    } catch {
      setKokoro({ state: 'failed', p: 0 })
    }
  }
  const sample = prefs.lang === 'hi-IN' ? 'नमस्ते! मैं आपके सवालों के जवाब ऐसे पढ़ूँगी।' : 'Hi! This is how I will read your answers. Mid ko update karo, then check the loop.'
  return (
    <fieldset className="vc-field">
      <legend>Voice</legend>
      <label>
        <input type="radio" name="vs-engine" checked={prefs.engine === 'auto'} onChange={() => setPrefs({ engine: 'auto' })} />
        <span>The best available (natural voice when it’s set up, otherwise this device’s).</span>
      </label>
      <label className={natural?.available ? undefined : 'opacity-60'}>
        <input type="radio" name="vs-engine" disabled={!natural?.available} checked={prefs.engine === 'natural'} onChange={() => setPrefs({ engine: 'natural' })} />
        <span>
          Natural Indian voice (AI voice).{' '}
          {natural?.available ? 'Made on our server from the answer text only; nothing you say goes there.' : 'Not set up on this site yet.'}
        </span>
      </label>
      {natural?.available && (prefs.engine === 'natural' || prefs.engine === 'auto') && voices.length > 0 && (
        <label className="vc-select">
          <span>Voice</span>
          <select value={prefs.voice && voices.some((v) => v.id === prefs.voice) ? prefs.voice : ''} onChange={(e) => setPrefs({ voice: e.target.value })}>
            <option value="">{voices[0].label} (default)</option>
            {voices.slice(1).map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <input type="radio" name="vs-engine" disabled={!prefs.kokoro && kokoro.state !== 'ready'} checked={prefs.engine === 'kokoro'} onChange={() => setPrefs({ engine: 'kokoro' })} />
        <span>
          Kokoro on this device (AI voice, Indian voices, English and Hindi). Free and private: it runs in your browser after a one-time download of about {KOKORO_MB} MB (Wi-Fi
          recommended). Best on a laptop or desktop; it can be slow on phones.
        </span>
      </label>
      {!prefs.kokoro && kokoro.state !== 'ready' && (
        <div className="vc-row">
          <Button size="sm" variant="secondary" onClick={() => void download()} loading={kokoro.state === 'loading'}>
            Download Kokoro
          </Button>
          <span className="vc-note" aria-live="polite">
            {kokoro.state === 'loading' ? `Downloading… ${Math.round(kokoro.p * 100)}%` : kokoro.state === 'failed' ? 'The download didn’t finish. Try again on Wi-Fi.' : 'Only when you press it.'}
          </span>
        </div>
      )}
      <label>
        <input type="radio" name="vs-engine" checked={prefs.engine === 'device'} onChange={() => setPrefs({ engine: 'device' })} />
        <span>This device’s own voice.</span>
      </label>
      <div className="vc-row">
        <Button size="sm" variant="ghost" onClick={() => speak(sample, prefs.lang)}>
          <Volume2 aria-hidden="true" /> Try the voice
        </Button>
      </div>
    </fieldset>
  )
}

/** Guru on this device (docs/voice/BLUEPRINT.md §4.6): download once, answer here, private. */
const size = (mb: number) => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`)

/** `who`: the teacher's name, when shown in the teacher's settings (her own brain). */
export function OnDevice({ who, male = false }: { who?: string; male?: boolean } = {}) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useVoicePrefs(user?.username)
  const brain = useBrain()
  const [tier, setTier] = useState<Tier | null | undefined>(undefined)
  const [info, setInfo] = useState<DeviceInfo | null>(null)
  const look = async () => {
    const d = await deviceInfo()
    setInfo(d)
    setTier(pickTier(d))
  }
  useEffect(() => {
    let live = true
    void deviceInfo().then((d) => {
      if (!live) return
      setInfo(d)
      setTier(pickTier(d))
    })
    return () => {
      live = false
    }
  }, [])
  const busy = brain.status === 'loading' || brain.status === 'testing'
  const start = async () => {
    setPrefs({ brain: true })
    await startBrain()
  }
  const remove = async () => {
    await removeBrain()
    setPrefs({ brain: false })
    await look()
  }
  const line =
    brain.status === 'loading'
      ? `Downloading ${brain.tier?.name ?? 'Guru'}… ${Math.round(brain.progress * 100)}%`
      : brain.status === 'testing'
        ? 'Checking its speed on this device…'
        : brain.status === 'ready'
          ? `${brain.tier?.name} is answering on this device (about ${Math.max(1, Math.round(brain.speed * 0.75))} words a second).`
          : brain.status === 'failed' || brain.status === 'unsupported'
            ? brain.why
            : prefs.brain
              ? `${tier?.name ?? 'Guru'} is downloaded; it starts with your first question.`
              : tier === null && info
                ? unsupportedWhy(info)
                : ''
  return (
    <fieldset className="vc-field">
      <legend>{who ? `${who}’s own brain` : 'Guru on this device'}</legend>
      <p className="vc-note">
        {who ? `With it, ${who} thinks on this device instead of on a server, like a teacher with ${male ? 'his' : 'her'} own AI chip. ` : ''}Answers your questions on this device: private, free, and it keeps working on a weak connection. Questions you haven’t solved yet still go to the server, so hints stay fair and the
        answer never reaches your device.{tier ? ` This device can run ${tier.name}, built on Qwen3.5 (Apache licence): a one-time download of about ${size(info ? downloadMb(tier, info) : tier.mb)} (Wi-Fi recommended).` : ''}
      </p>
      <div className="vc-row">
        {!prefs.brain && tier && (
          <Button size="sm" variant="secondary" onClick={() => void start()} loading={busy}>
            Download {tier.name}
          </Button>
        )}
        {prefs.brain && brain.status !== 'ready' && !busy && brain.status !== 'failed' && brain.status !== 'unsupported' && (
          <Button size="sm" variant="secondary" onClick={() => void startBrain()}>
            Start now
          </Button>
        )}
        {prefs.brain && (
          <Button size="sm" variant="ghost" onClick={() => void remove()} disabled={busy}>
            Remove from this device
          </Button>
        )}
        <span className="vc-note" aria-live="polite">
          {line}
        </span>
      </div>
    </fieldset>
  )
}
