/*
  Settings → Preferences → Voice: turn voice commands on or off, pick the
  language, and the Bharat Code Speech opt-in (nothing is recorded yet).
*/
import { Mic } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { speechSupported } from './speech'
import { useVoicePrefs } from './prefs'
import './voice.css'

export function VoiceSettings() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useVoicePrefs(user?.username)
  const supported = speechSupported()
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
                : 'Voice commands need Chrome, Edge or Safari for now.'}
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
                <span>Read answers aloud (“i changed from 3 to 4…”), using your device’s voice.</span>
              </label>
            </fieldset>
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
