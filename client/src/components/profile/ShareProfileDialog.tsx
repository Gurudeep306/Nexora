// The QR tag stays black-on-white whatever the theme (scanners need the contrast).
import { useMemo, useRef, useState } from 'react'
import { Check, Copy, Download, ImageDown, Share2 } from 'lucide-react'
import { Avatar, Button, Modal } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { copyText } from '@/components/social/feed/lib'
import type { PublicProfile, Showcase } from '@/components/social/feed/types'
import { CoverArt } from './covers'
import { ShareCard } from './ShareCard'
import { paperColours } from './paper'
import { downloadSvgAsPng, qrTagSvg } from './qrTag'
import { useTheme } from '@/context/ThemeContext'

/** Share the profile: a share card (image), the link, and a printed-tag QR code with the NexoraGuru mark. */
export default function ShareProfileDialog({ open, onClose, profile, stats, days }: { open: boolean; onClose: () => void; profile: PublicProfile; stats?: Showcase['stats']; days?: Showcase['heatmap'] }) {
  const journal = useTheme().shown.style === 'journal'
  const card = useRef<SVGSVGElement>(null)
  // Paper colours and "today" are read once when the dialog opens.
  const [paper] = useState(paperColours)
  const [today] = useState(() => new Date())
  const url = `${window.location.origin}/u/${encodeURIComponent(profile.username)}`
  const [copied, setCopied] = useState(false)
  const tag = useMemo(() => qrTagSvg(url, profile.username), [url, profile.username])
  const name = profile.display_name || profile.username

  const downloadCard = () => {
    const svg = card.current
    if (!svg) return
    downloadSvgAsPng(new XMLSerializer().serializeToString(svg), 600, 315, `nexoraguru-${profile.username}.png`, 2)
  }
  const downloadQrSvg = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([tag.svg], { type: 'image/svg+xml' }))
    a.download = `nexoraguru-${profile.username}-qr.svg`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const copy = async () => {
    if (await copyText(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }
  }
  const nativeShare = async () => {
    try {
      await navigator.share({ title: `${name} on NexoraGuru`, url })
    } catch {
      /* dismissed */
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share profile" description="Anyone with the link or the code can open your profile." size="lg">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0 space-y-4">
          {journal ? (
            <div className="overflow-hidden rounded-2xl border border-border">
              <ShareCard ref={card} profile={profile} stats={stats} days={days} paper={paper} today={today} />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-bg-surface" aria-label="Share card preview">
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
          )}
          {journal && (
            <Button size="sm" variant="subtle" onClick={downloadCard}>
              <ImageDown /> Download card
            </Button>
          )}

          <div className="flex gap-2">
            <input readOnly value={url} aria-label="Profile link" onFocus={(e) => e.currentTarget.select()} className="input-base h-9 min-w-0 flex-1 font-mono text-xs" />
            <Button onClick={() => void copy()} className="shrink-0">
              {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          {typeof navigator.share === 'function' && (
            <Button size="sm" variant="subtle" onClick={() => void nativeShare()}>
              <Share2 /> Share…
            </Button>
          )}
        </div>

        <figure className="m-0 flex flex-col items-center gap-3">
          <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(tag.svg)}`} width={tag.w} height={tag.h} alt={`QR code that opens ${url}`} className="h-auto w-full max-w-[15rem] rounded-[22px] border border-border" />
          <figcaption className="text-center text-xs text-text-muted">Point a phone camera at it. Handy for classrooms and meetups.</figcaption>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="subtle" onClick={() => downloadSvgAsPng(tag.svg, tag.w, tag.h, `nexoraguru-${profile.username}-qr.png`)}>
              <Download /> PNG
            </Button>
            <Button size="sm" variant="subtle" onClick={downloadQrSvg}>
              <Download /> SVG
            </Button>
          </div>
        </figure>
      </div>
    </Modal>
  )
}
