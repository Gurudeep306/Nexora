/*
  Speech to text in the browser, free: the Web Speech API (Chrome, Edge,
  Safari). Where the browser can recognise on the device itself, it does
  (Chrome/Edge 139+ "processLocally"); otherwise the browser's own service
  does it, which the consent screen explains. Nothing is recorded by us.

  This is the first link of the ears chain in docs/voice/BLUEPRINT.md
  ("Never stuck on a limit"); server links come in later phases.
*/

// The Web Speech API is not in TypeScript's DOM lib; this is the part we use.
interface SpeechResultLike {
  isFinal: boolean
  0: { transcript: string }
}
interface SpeechEventLike {
  resultIndex: number
  results: ArrayLike<SpeechResultLike>
}
interface RecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  processLocally?: boolean
  onresult: ((e: SpeechEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
interface RecognitionCtor {
  new (): RecognitionLike
  available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string>
}

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechSupported(): boolean {
  return ctor() != null
}

/** Whether this browser can recognise `lang` without sending audio anywhere. */
export async function onDeviceAvailable(lang: string): Promise<boolean> {
  const C = ctor()
  if (!C?.available) return false
  try {
    return (await C.available({ langs: [lang], processLocally: true })) === 'available'
  } catch {
    return false
  }
}

export type SpeechError = 'not-allowed' | 'no-speech' | 'network' | 'unsupported' | 'other'

export interface ListenHandle {
  stop(): void
  cancel(): void
}

/**
 * Listen for one utterance. `onText` gets the running transcript; `onDone`
 * gets the final text ('' if nothing was heard) exactly once.
 */
export async function listenOnce(opts: { lang: string; onText: (t: string) => void; onDone: (text: string, error?: SpeechError) => void }): Promise<ListenHandle> {
  const C = ctor()
  if (!C) {
    opts.onDone('', 'unsupported')
    return { stop() {}, cancel() {} }
  }
  const local = await onDeviceAvailable(opts.lang)
  const rec = new C()
  rec.lang = opts.lang
  rec.interimResults = true
  rec.continuous = false
  rec.maxAlternatives = 1
  if (local && 'processLocally' in rec) rec.processLocally = true
  let finalText = ''
  let done = false
  let error: SpeechError | undefined
  const finish = () => {
    if (done) return
    done = true
    opts.onDone(finalText.trim(), finalText.trim() ? undefined : error)
  }
  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript
      else interim += r[0].transcript
    }
    opts.onText((finalText + interim).trim())
  }
  rec.onerror = (e) => {
    error = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'not-allowed' : e.error === 'no-speech' ? 'no-speech' : e.error === 'network' ? 'network' : 'other'
  }
  rec.onend = finish
  try {
    rec.start()
  } catch {
    error = 'other'
    finish()
  }
  return {
    stop: () => rec.stop(),
    cancel: () => {
      done = true
      rec.abort()
    },
  }
}
