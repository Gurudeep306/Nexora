// QR codes stay black-on-white whatever the theme (scanners need the contrast).
import { useMemo, useState } from 'react'
import { Check, Copy, Download, Share2 } from 'lucide-react'
import { Avatar, Button, Modal } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { copyText } from '@/components/social/feed/lib'
import type { PublicProfile, Showcase } from '@/components/social/feed/types'
import { CoverArt } from './covers'
import { encodeQr, qrPath } from './qr'

/** Share card (OG-image style preview), copy link and a QR code for the profile. */
export default function ShareProfileDialog({ open, onClose, profile, stats }: { open: boolean; onClose: () => void; profile: PublicProfile; stats?: Showcase['stats'] }) {
  const url = `${window.location.origin}/u/${encodeURIComponent(profile.username)}`
  const [copied, setCopied] = useState(false)
  const qr = useMemo(() => qrPath(encodeQr(url)), [url])
  const name = profile.display_name || profile.username

  const copy = async () => {
    if (await copyText(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }
  }
  const downloadQr = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.size} ${qr.size}" width="512" height="512" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${qr.d}" fill="#000"/></svg>`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    a.download = `nexoraguru-${profile.username}-qr.svg`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const nativeShare = async () => {
    try {
      await navigator.share({ title: `${name} on NexoraGuru`, url })
    } catch {
      /* dismissed */
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share profile" description="Show off your progress — anyone with the link can open it." size="md">
      <div className="space-y-4">
        {/* OG-style preview */}
        <div className="overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-[var(--shadow-pop)]" aria-label="Share card preview">
          <CoverArt cover={profile.cover} className="h-24" />
          <div className="relative px-4 pb-4">
            <div className="-mt-9 flex items-end justify-between">
              <Avatar seed={profile.username} avatar={profile.avatar} src={profile.avatar_url} name={name} size="2xl" className="rounded-full ring-4 ring-bg-surface" />
              <span className="mb-1 font-mono text-[10px] tracking-[0.18em] text-text-muted uppercase">nexoraguru</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="font-display text-lg font-semibold text-text-primary">{name}</span>
              <UserBadges username={profile.username} role={profile.role} verified={profile.verified} />
            </div>
            <p className="text-xs text-text-muted">@{profile.username}</p>
            {stats && (
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {[
                  ['Level', stats.level.level],
                  ['Solved', stats.solved],
                  ['Streak', `${stats.streak.current}d`],
                  ['Followers', profile.counts.followers],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-bg-surface-2/70 py-1.5">
                    <div className="font-display text-base font-semibold text-text-primary tabular-nums">{v}</div>
                    <div className="text-[10px] text-text-muted">{k}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input readOnly value={url} aria-label="Profile link" onFocus={(e) => e.currentTarget.select()} className="input-base h-9 min-w-0 flex-1 font-mono text-xs" />
          <Button onClick={() => void copy()} className="shrink-0">
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border p-4 sm:flex-row">
          <svg viewBox={`0 0 ${qr.size} ${qr.size}`} className="size-36 shrink-0 rounded-lg bg-white p-1" shapeRendering="crispEdges" role="img" aria-label={`QR code for ${url}`}>
            <path d={qr.d} fill="#0b0d12" />
          </svg>
          <div className="text-center sm:text-left">
            <p className="font-medium text-text-primary">Scan to open</p>
            <p className="mt-0.5 text-sm text-text-secondary">Point a phone camera at the code — handy for classrooms and meetups.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button size="sm" variant="subtle" onClick={downloadQr}>
                <Download /> Download QR
              </Button>
              {typeof navigator.share === 'function' && (
                <Button size="sm" variant="subtle" onClick={() => void nativeShare()}>
                  <Share2 /> Share…
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
