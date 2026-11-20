import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LogoMark } from '@/components/brand/Logo'
import { handApi, shrinkPhoto, type DeviceInfo } from '@/components/hand/api'
import { DeviceMessage } from './PadPage'
import './hand.css'

/*
  Photos of working done on paper: opened on a phone from a one-time link made
  on the computer. Take one photo per page (or pick them from the gallery),
  turn any that came out sideways, then send. Photos are shrunk on the phone
  first, so they go up quickly on mobile data.
*/

type Shot = { id: number; file: File; url: string; turns: number }
const MAX = 8

export default function SnapPage() {
  const { token = '' } = useParams()
  const [info, setInfo] = useState<DeviceInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [progress, setProgress] = useState('')
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  useEffect(() => {
    handApi
      .device(token)
      .then((r) => (r.mode === 'photo' ? setInfo(r) : setError('This link is for the writing pad. Open it on your tablet.')))
      .catch((e: Error) => setError(e.message || 'This link has expired. Make a new one on your computer.'))
  }, [token])
  useEffect(() => () => shots.forEach((s) => URL.revokeObjectURL(s.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const add = (files: FileList | null) => {
    if (!files) return
    const next = [...files].filter((f) => f.type.startsWith('image/')).slice(0, MAX - shots.length)
    setShots((cur) => [...cur, ...next.map((file) => ({ id: ++seq.current, file, url: URL.createObjectURL(file), turns: 0 }))])
  }

  const send = async () => {
    if (!shots.length) return
    setState('sending')
    try {
      const images: string[] = []
      for (let i = 0; i < shots.length; i++) {
        setProgress(`Preparing photo ${i + 1} of ${shots.length}…`)
        images.push(await shrinkPhoto(shots[i].file, { turns: shots[i].turns }))
      }
      setProgress('Sending…')
      await handApi.send(token, images)
      setState('sent')
    } catch (e) {
      setState('idle')
      alert((e as Error).message || 'Could not send. Check the connection and try again.')
    }
  }

  if (error) return <DeviceMessage title="This link can't be used" body={error} />
  if (!info) return <DeviceMessage title="Opening the camera page…" body="" busy />
  if (state === 'sent')
    return (
      <DeviceMessage
        title="Sent to your computer"
        body={`Your photos are on ${info.title}. You can close this page.`}
        done
        action={
          <button
            type="button"
            className="hw-btn hw-btn-main"
            onClick={() => {
              shots.forEach((s) => URL.revokeObjectURL(s.url))
              setShots([])
              setState('idle')
            }}
          >
            Send more photos
          </button>
        }
      />
    )

  return (
    <main className="hw-snap">
      <header className="hw-snap-head">
        <LogoMark size={22} intro={false} />
        <div className="min-w-0">
          <p className="hw-snap-k">Photo of your solution</p>
          <h1 className="hw-snap-t">{info.title}</h1>
        </div>
      </header>

      <p className="hw-snap-tip">One photo per page. Hold the phone flat above the paper, in good light, with the whole page in the frame.</p>

      <div className="hw-snap-actions">
        <button type="button" className="hw-btn hw-btn-main hw-btn-big" onClick={() => camera.current?.click()} disabled={shots.length >= MAX || state === 'sending'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
          {shots.length ? 'Take another photo' : 'Take a photo'}
        </button>
        <button type="button" className="hw-btn hw-btn-big" onClick={() => gallery.current?.click()} disabled={shots.length >= MAX || state === 'sending'}>
          Choose from gallery
        </button>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (add(e.target.files), (e.target.value = ''))} />
        <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ''))} />
      </div>

      {shots.length > 0 && (
        <>
          <ol className="hw-shots" aria-label="Your photos">
            {shots.map((s, i) => (
              <li key={s.id} className="hw-shot">
                <div className="hw-shot-img">
                  <img src={s.url} alt={`Page ${i + 1}`} style={{ transform: `rotate(${s.turns * 90}deg)` }} />
                </div>
                <div className="hw-shot-bar">
                  <span>Page {i + 1}</span>
                  <button type="button" onClick={() => setShots((cur) => cur.map((x) => (x.id === s.id ? { ...x, turns: (x.turns + 1) % 4 } : x)))} aria-label={`Turn page ${i + 1}`}>
                    Turn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(s.url)
                      setShots((cur) => cur.filter((x) => x.id !== s.id))
                    }}
                    aria-label={`Remove page ${i + 1}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <div className="hw-snap-send">
            <button type="button" className="hw-btn hw-btn-main hw-btn-big" onClick={() => void send()} disabled={state === 'sending'}>
              {state === 'sending' ? progress : `Send ${shots.length} ${shots.length === 1 ? 'photo' : 'photos'}`}
            </button>
          </div>
        </>
      )}
    </main>
  )
}
