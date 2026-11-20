/*
  "On my iPad or tablet": a one-time link as a QR code. The tablet opens
  /explain/pad/<token> (no sign-in), records there and uploads; this panel
  watches the link and hands the posted video back to the page.
*/
import { useEffect, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { handQrCard, themeQrColors } from '@/components/hand/qrCard'
import { explainApi, type ExplainKind, type ExplainVideo } from './api'

export function TabletLink({ kind, target, about, onDone }: { kind: ExplainKind; target: string; about: string; onDone: (v: ExplainVideo) => void }) {
  const [link, setLink] = useState<{ token: string; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<{ opened: boolean; uploading: boolean }>({ opened: false, uploading: false })
  const [copied, setCopied] = useState(false)
  const colors = useMemo(() => themeQrColors(), [])

  useEffect(() => {
    let alive = true
    explainApi
      .link(kind, target, about)
      .then((r) => alive && setLink({ token: r.token, url: `${window.location.origin}${r.path}` }))
      .catch((e: Error) => alive && setError(e.message || 'Could not make a link. Try again.'))
    return () => {
      alive = false
    }
  }, [kind, target, about])

  useEffect(() => {
    if (!link) return
    let stop = false
    let timer = 0
    const tick = async () => {
      try {
        const r = await explainApi.linkStatus(link.token)
        if (stop) return
        setState({ opened: r.opened, uploading: r.uploading })
        if (r.video) return onDone(r.video)
      } catch {
        /* try again on the next tick */
      }
      if (!stop) timer = window.setTimeout(tick, 2500)
    }
    timer = window.setTimeout(tick, 1500)
    return () => {
      stop = true
      window.clearTimeout(timer)
    }
  }, [link]) // eslint-disable-line react-hooks/exhaustive-deps

  const card = useMemo(() => (link ? handQrCard(link.url, { title: 'Scan with your iPad', sub: 'Works for 12 hours · only for this', colors }) : null), [link, colors])

  return (
    <div className="ex-tablet">
      {error ? (
        <p className="lv-status is-bad" role="alert">
          {error}
        </p>
      ) : card ? (
        <div className="lv-qr ex-tablet-qr" dangerouslySetInnerHTML={{ __html: card }} />
      ) : (
        <div className="lv-qr ex-tablet-qr is-waiting" aria-busy="true" />
      )}
      <div className="ex-tablet-side">
        <ol className="lv-steps">
          <li>Open the camera on your iPad or tablet and point it at the code.</li>
          <li>Write on the whiteboard there with your Pencil while you talk. Your face can sit in a corner.</li>
          <li>Or record the iPad's whole screen with its own Screen Recording, then pick that video there.</li>
          <li>Upload on the tablet. The video shows up here by itself.</li>
        </ol>
        <p className={state.uploading ? 'lv-status is-ok' : state.opened ? 'lv-status is-ok' : 'lv-status'} role="status" aria-live="polite">
          {state.uploading ? (
            <>
              <span className="lv-dot-live" aria-hidden="true" /> Uploading from your tablet…
            </>
          ) : state.opened ? (
            <>
              <span className="lv-dot-live" aria-hidden="true" /> Open on your tablet. Waiting for the video…
            </>
          ) : (
            'Waiting for your tablet to open the link…'
          )}
        </p>
        {link && (
          <button
            type="button"
            className="lv-chip-btn self-start"
            onClick={() => {
              void navigator.clipboard?.writeText(link.url).then(() => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1600)
              })
            }}
          >
            {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />} {copied ? 'Copied' : 'Copy the link instead'}
          </button>
        )}
      </div>
    </div>
  )
}
