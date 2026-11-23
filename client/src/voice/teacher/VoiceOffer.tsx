/*
  The teacher offers herself a natural voice, once. Without the voice server
  (deploy/voice-server) she speaks with the device's built-in voice, which
  sounds robotic; Kokoro in the browser (Apache-2.0, Indian voices, through
  HeadTTS) sounds like a person but is a one-time download, so it is asked
  for, never done silently.

  Shown only when: the natural server isn't set up, the in-browser voice isn't
  on, the student didn't pick the device voice on purpose, and they haven't
  said "Not now" before (remembered on this device).
*/
import { useEffect, useState } from 'react'
import { getVoicePrefs, setVoicePrefs } from '../prefs'
import { KOKORO_MB, loadKokoro, naturalVoices, speak } from '../speak'

const DISMISSED = 'nexora:teacher:voice-offer'

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === '1'
  } catch {
    return false
  }
}

export function VoiceOffer({ name }: { name: string }) {
  const [show, setShow] = useState(false)
  const [state, setState] = useState<{ phase: 'ask' | 'loading' | 'failed'; p: number }>({ phase: 'ask', p: 0 })

  useEffect(() => {
    const p = getVoicePrefs()
    if (dismissed() || p.kokoro || p.engine === 'device' || !p.speak) return
    let live = true
    void naturalVoices().then((v) => live && !v.available && setShow(true))
    return () => {
      live = false
    }
  }, [])

  if (!show) return null
  const notNow = () => {
    try {
      localStorage.setItem(DISMISSED, '1')
    } catch {
      /* private mode */
    }
    setShow(false)
  }
  const yes = async () => {
    setState({ phase: 'loading', p: 0 })
    try {
      await loadKokoro((p) => setState({ phase: 'loading', p }))
      setVoicePrefs({ kokoro: true, engine: 'kokoro' })
      setShow(false)
      const hi = getVoicePrefs().lang === 'hi-IN'
      speak(hi ? 'अब मेरी आवाज़ कैसी लग रही है? चलो, आज क्या पढ़ें?' : 'Achha, does this sound better? Chalo, what shall we study today?', hi ? 'hi-IN' : 'en-IN')
    } catch {
      setState({ phase: 'failed', p: 0 })
    }
  }

  return (
    <div className="tch-say tch-offer" role="region" aria-label={`A natural voice for ${name}`}>
      {state.phase === 'loading' ? (
        <p className="tch-say-text" role="status">
          Getting {name}’s natural voice… {Math.round(state.p * 100)}%
        </p>
      ) : (
        <p className="tch-say-text">
          {state.phase === 'failed'
            ? 'That didn’t work on this device. You can try again, or keep the device voice.'
            : `I can talk in a natural voice instead of the device’s robotic one. It’s free and runs on your device after a one-time download of about ${KOKORO_MB} MB (Wi-Fi is best).`}
        </p>
      )}
      {state.phase !== 'loading' && (
        <div className="tch-say-foot">
          <button type="button" onClick={() => void yes()}>
            {state.phase === 'failed' ? 'Try again' : 'Use natural voice'}
          </button>
          <button type="button" onClick={notNow}>
            Not now
          </button>
        </div>
      )}
    </div>
  )
}
