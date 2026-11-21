/*
  Invite people into this room or call. Friends who are online ring at once
  (the same card as a call); anyone offline gets a message with the join
  link, plus a notification if they have them on. Below: the link to share
  anywhere (WhatsApp, Telegram, email, QR).
*/
import { useEffect, useMemo, useState } from 'react'
import { BellRing, Check, Send } from 'lucide-react'
import { Avatar, SearchInput, useToast } from '@/components/ui'
import { ShareSheet } from '@/components/share/ShareSheet'
import { cn } from '@/lib/utils'
import { liveApi, type Invitee } from '../api'
import type { LiveSession, LiveState } from '../session'

export function InvitePanel({ session, s }: { session: LiveSession; s: LiveState }) {
  const toast = useToast()
  const [people, setPeople] = useState<Invitee[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [sent, setSent] = useState<Record<string, 'rang' | 'messaged'>>({})
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    liveApi
      .invitable(session.code)
      .then((p) => live && setPeople(p))
      .catch((e: Error) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [session.code])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (people ?? []).filter((p) => !t || p.name.toLowerCase().includes(t) || p.username.toLowerCase().includes(t))
  }, [people, q])

  const invite = async (p: Invitee) => {
    setBusy(p.username)
    try {
      const r = await liveApi.invite(session.code, [p.username])
      const one = r.invited[0]
      setSent((m) => ({ ...m, [p.username]: one?.rang ? 'rang' : 'messaged' }))
      if (one && !one.rang && !one.messaged) toast.warning(`Couldn’t reach ${p.name}`, 'Share the link with them below.')
    } catch (e) {
      toast.error('Couldn’t invite', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy(null)
    }
  }

  const url = `${window.location.origin}/live/${session.code}`
  const title = s.room?.title ?? 'Live'
  const online = shown.filter((p) => p.online).length

  return (
    <div className="lv-panel-body lv-inv">
      <section className="lv-section" aria-label="Invite people">
        <div className="lv-section-head">
          <p className="ed-label m-0">Invite people</p>
          {people && <span className="lv-muted-n">{online} online</span>}
        </div>
        {people && people.length > 6 && <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a friend" aria-label="Find a friend" />}
        {error && <p className="lv-status is-bad">{error}</p>}
        {!people && !error && <p className="lv-empty">Loading your friends…</p>}
        {people && people.length === 0 && <p className="lv-empty">Add friends in Community → Friends, or share the link below.</p>}
        <ul className="lv-invite-list">
          {shown.map((p) => {
            const done = sent[p.username] ?? (p.invited ? 'messaged' : null)
            return (
              <li key={p.username} className="lv-invite-row">
                <Avatar src={p.avatarUrl ?? undefined} avatar={p.avatar ?? undefined} name={p.name} seed={p.username} size="sm" online={p.online} />
                <span className="lv-invite-who">
                  <span className="lv-invite-name">{p.name}</span>
                  <span className={cn('lv-invite-state', p.online && 'is-on')}>{p.inRoom ? 'In this room' : p.online ? 'Online now' : 'Offline · gets a link'}</span>
                </span>
                {p.inRoom ? null : done ? (
                  <span className="lv-invite-done" role="status">
                    <Check className="size-3.5" aria-hidden="true" /> {done === 'rang' ? 'Ringing' : 'Link sent'}
                  </span>
                ) : (
                  <button type="button" className={cn('lv-chip-btn', p.online && 'is-primary')} disabled={busy === p.username} onClick={() => void invite(p)}>
                    {p.online ? <BellRing className="size-3.5" aria-hidden="true" /> : <Send className="size-3.5" aria-hidden="true" />}
                    {p.online ? 'Ring' : 'Send link'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      <section className="lv-section" aria-label="Share the link">
        <p className="ed-label m-0">Or share the link</p>
        <ShareSheet url={url} title={title} text={`Join me on NexoraGuru Live: “${title}”`} qrTitle="Scan to join" />
      </section>
    </div>
  )
}
