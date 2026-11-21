/*
  Share a link the way people actually share in India: WhatsApp first, then
  Telegram, email, the phone's own share sheet, copy, and a QR code to scan
  from another device. One component for rooms, calls, posts and problems.
*/
import { useMemo, useState } from 'react'
import { Check, Copy, Mail, QrCode, Share2 } from 'lucide-react'
import { handQrCard, themeQrColors } from '@/components/hand/qrCard'
import { cn } from '@/lib/utils'
import './share.css'

const WA = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
    <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
  </svg>
)
const TG = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
    <path fill="currentColor" d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.8.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 9-8.1c.4-.3-.1-.5-.6-.2L6.4 13 1.6 11.5c-1-.3-1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.5Z" />
  </svg>
)

export function ShareSheet({ url, text, title, qrTitle }: { url: string; text: string; title: string; qrTitle?: string }) {
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState(false)
  const full = `${text} ${url}`
  const colors = useMemo(() => (qr ? themeQrColors() : null), [qr])
  const card = useMemo(() => (qr && colors ? handQrCard(url, { title: qrTitle ?? 'Scan to join', sub: title.slice(0, 48), colors }) : null), [qr, colors, url, title, qrTitle])
  const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* the field below can be selected by hand */
    }
  }
  return (
    <div className="sh">
      <div className="sh-link">
        <input readOnly value={url} aria-label="Link" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="sh-copy" onClick={() => void copy()}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="sh-row">
        <a className="sh-btn is-wa" href={`https://wa.me/?text=${encodeURIComponent(full)}`} target="_blank" rel="noopener noreferrer">
          {WA} WhatsApp
        </a>
        <a className="sh-btn is-tg" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
          {TG} Telegram
        </a>
        <a className="sh-btn" href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(full)}`}>
          <Mail className="size-4" aria-hidden="true" /> Email
        </a>
        <button type="button" className={cn('sh-btn', qr && 'is-on')} onClick={() => setQr(!qr)} aria-pressed={qr}>
          <QrCode className="size-4" aria-hidden="true" /> QR code
        </button>
        {canNative && (
          <button type="button" className="sh-btn" onClick={() => void navigator.share({ title, text, url }).catch(() => {})}>
            <Share2 className="size-4" aria-hidden="true" /> More…
          </button>
        )}
      </div>
      {qr && card && <div className="sh-qr" dangerouslySetInnerHTML={{ __html: card }} />}
    </div>
  )
}
