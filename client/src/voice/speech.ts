/*
  Speech to text in the browser, free: the Web Speech API (Chrome, Edge,
  Safari). Where the browser can recognise on the device itself, it does
  (Chrome/Edge 139+ "processLocally"); otherwise the browser's own service
  does it, which the consent screen explains. Nothing is recorded by us.

  This is the first link of the ears chain in docs/voice/BLUEPRINT.md
  ("Never stuck on a limit"); the server links (Admin → Voice recognition)
  are in capture.ts and src/voice/stt.js.
*/

import { serverEars, startCapture, transcribe, type Capture } from './capture'

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
 *
 * With server ears set up (Admin → Voice recognition), the same speech is also
 * recorded and sent through the chain of services (capture.ts); their text,
 * built for Indian speech, replaces the browser's when it comes back. Without
 * a browser recogniser (Firefox) the server ears do it alone.
 */
export async function listenOnce(opts: {
  lang: string
  onText: (t: string) => void
  onDone: (text: string, error?: SpeechError) => void
  /** Keep listening through pauses (a long explanation) until stopped. */
  continuous?: boolean
  /** Words on the page (actions, variable names) that help the server ears. */
  hints?: string[]
}): Promise<ListenHandle> {
  const C = ctor()
  const server = await serverEars()
  if (!C && !server) {
    opts.onDone('', 'unsupported')
    return { stop() {}, cancel() {} }
  }
  let finalText = ''
  let done = false
  let error: SpeechError | undefined
  let rec: RecognitionLike | null = null
  let capture: Capture | null = null
  const finish = async () => {
    if (done) return
    done = true
    let text = finalText.trim()
    if (capture) {
      const clip = await capture.stop().catch(() => null)
      capture = null
      if (clip) {
        const r = await transcribe(clip, opts.lang, opts.hints)
        if (r.ok && r.text.trim()) text = r.text.trim()
      }
    }
    opts.onDone(text, text ? undefined : error ?? (C ? undefined : 'no-speech'))
  }
  const stopAll = () => {
    if (rec) rec.stop()
    else void finish()
  }
  if (server) {
    capture = await startCapture({
      // Without a browser recogniser, a pause after speech ends the turn.
      onPause: () => {
        if (!C && !opts.continuous) void finish()
      },
    })
    if (!capture && !C) {
      opts.onDone('', 'not-allowed')
      return { stop() {}, cancel() {} }
    }
  }
  if (C) {
    const local = await onDeviceAvailable(opts.lang)
    rec = new C()
    rec.lang = opts.lang
    rec.interimResults = true
    rec.continuous = !!opts.continuous
    rec.maxAlternatives = 1
    if (local && 'processLocally' in rec) rec.processLocally = true
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += (finalText && !/\s$/.test(finalText) ? ' ' : '') + r[0].transcript.trim()
        else interim += r[0].transcript
      }
      opts.onText((finalText + interim).trim())
    }
    rec.onerror = (e) => {
      error = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'not-allowed' : e.error === 'no-speech' ? 'no-speech' : e.error === 'network' ? 'network' : 'other'
    }
    rec.onend = () => void finish()
    try {
      rec.start()
    } catch {
      error = 'other'
      void finish()
    }
  } else {
    opts.onText('…')
  }
  return {
    stop: stopAll,
    cancel: () => {
      done = true
      capture?.cancel()
      capture = null
      rec?.abort()
    },
  }
}
