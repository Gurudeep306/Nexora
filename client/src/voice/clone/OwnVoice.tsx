/*
  Settings → Virtual teacher → "A voice of your own": record about 30 seconds
  (or upload a clip) and the teacher speaks in that voice, on this device only.
  Consent comes first: it must be the student's own voice or a voice whose
  owner agreed, and the recording starts with them saying so.
*/
import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useVoicePrefs } from '../prefs'
import { speak } from '../speak'
import { CLONE_MB, checkSaved, forgetVoice, loadClone, SAMPLE_SECONDS, saveVoice, useClone, usableSeconds } from './clone'

const CONSENT = 'I agree that NexoraGuru may use my voice for my teacher, on this device only.'
const PASSAGE =
  'A sorted array lets us find any number quickly. We look at the middle first. If the number we want is bigger, we throw away the left half; if it is smaller, the right half. Each step halves what is left, so even a million numbers take only about twenty steps. That is binary search, and it is one of the most useful ideas in computer science.'
const MAX_SECONDS = 60

/** Any recording or file → 24 kHz mono, the rate the voice model uses. */
async function toSample(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: 24000 })
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    const out = new Float32Array(buf.length)
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < d.length; i++) out[i] += d[i] / buf.numberOfChannels
    }
    return out
  } finally {
    void ctx.close()
  }
}

export function OwnVoice({ name }: { name: string }) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useVoicePrefs(user?.username)
  const clone = useClone()
  const [agreed, setAgreed] = useState(false)
  const [rec, setRec] = useState<{ on: boolean; secs: number }>({ on: false, secs: 0 })
  const [note, setNote] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef(0)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void checkSaved()
    return () => window.clearInterval(timer.current)
  }, [])

  const keep = async (blob: Blob) => {
    try {
      const sample = await toSample(blob)
      const secs = usableSeconds(sample)
      if (secs < SAMPLE_SECONDS.min) {
        setNote(`That was ${Math.round(secs)} seconds of speech. ${SAMPLE_SECONDS.min} seconds or more are needed: read the whole passage.`)
        return
      }
      await saveVoice(sample)
      setPrefs({ ownVoice: true })
      setNote('Saved on this device. The first time, the voice model downloads; then it is ready.')
      void loadClone().catch(() => {})
    } catch {
      setNote('That recording couldn’t be read. Try again, or upload an MP3, WAV or M4A file.')
    }
  }

  const record = async () => {
    setNote('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const parts: Blob[] = []
      const r = new MediaRecorder(stream)
      r.ondataavailable = (e) => e.data.size && parts.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        window.clearInterval(timer.current)
        setRec({ on: false, secs: 0 })
        void keep(new Blob(parts, { type: r.mimeType }))
      }
      recorder.current = r
      r.start()
      const t0 = Date.now()
      setRec({ on: true, secs: 0 })
      timer.current = window.setInterval(() => {
        const secs = Math.round((Date.now() - t0) / 1000)
        setRec({ on: true, secs })
        if (secs >= MAX_SECONDS) r.stop()
      }, 250)
    } catch {
      setNote('The microphone couldn’t be opened. Allow it for this site, or upload a recording instead.')
    }
  }

  const busy = clone.status === 'loading'
  const status =
    clone.status === 'loading'
      ? `Getting the voice model ready… ${Math.round(clone.progress * 100)}% (once, about ${(CLONE_MB / 1000).toFixed(1)} GB)`
      : clone.status === 'ready'
        ? `${name} speaks in this voice (${clone.speed >= 1 ? 'keeps up with talking' : 'a little slow on this device'}).`
        : clone.status === 'failed' || clone.status === 'unsupported'
          ? clone.why
          : ''

  return (
    <fieldset className="vc-field">
      <legend>A voice of your own</legend>
      <p className="vc-note">
        Record about 30 seconds and {name} speaks English in that voice. Free and private: it is made on this device and never sent anywhere. It needs Chrome or Edge on a computer
        with a good graphics chip, and a one-time download of about {(CLONE_MB / 1000).toFixed(1)} GB. Hindi stays in {name}’s usual voice.
      </p>
      {clone.hasVoice ? (
        <div className="grid gap-2">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={prefs.ownVoice} onChange={(e) => setPrefs({ ownVoice: e.target.checked })} /> Speak in this voice
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => (clone.status === 'ready' ? speak(`Hi, this is ${name}. Does this sound like you?`, 'en-IN') : void loadClone().catch(() => {}))}>
              {clone.status === 'ready' ? 'Hear it' : 'Start the voice'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void forgetVoice().then(() => setPrefs({ ownVoice: false }))}>
              <Trash2 aria-hidden="true" /> Delete this voice
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <label className="flex items-start gap-2 text-[13px]">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>It is my own voice, or the person whose voice it is has agreed. I won’t use anyone else’s voice.</span>
          </label>
          {agreed && (
            <div className="tch-read">
              <p className="vc-note">Read this aloud, in your normal voice, in a quiet room:</p>
              <p className="tch-read-text">
                <strong>{CONSENT}</strong> {PASSAGE}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {rec.on ? (
              <Button size="sm" variant="secondary" onClick={() => recorder.current?.stop()}>
                <Square aria-hidden="true" /> Stop ({rec.secs}s)
              </Button>
            ) : (
              <Button size="sm" variant="secondary" disabled={!agreed} onClick={() => void record()}>
                <Mic aria-hidden="true" /> Record
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={!agreed || rec.on} onClick={() => file.current?.click()}>
              <Upload aria-hidden="true" /> Upload a recording
            </Button>
            <input ref={file} type="file" accept="audio/*" hidden onChange={(e) => e.target.files?.[0] && void keep(e.target.files[0])} />
          </div>
        </div>
      )}
      {(note || status) && (
        <p className="vc-note" aria-live="polite">
          {note || status}
        </p>
      )}
    </fieldset>
  )
}
