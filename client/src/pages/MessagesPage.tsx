/*
  /messages — chats get the whole window, like a desktop chat app: the list
  on the left, the open conversation on the right (one at a time on a phone).
  The same conversations as Community → Messages, which now opens here.
  Alerts: a sound for new messages, and notifications on this device even
  when NexoraGuru is closed (Web Push, free).
*/
import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/lib/socket'
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push'
import { MessagesTab } from '@/components/social/MessagesTab'
import { alertSoundOn, setAlertSound } from '@/components/social/chat/sound'
import { Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import '@/components/social/chat/page.css'

export default function MessagesPage() {
  const { user } = useAuth()
  const socket = useSocket()
  const toast = useToast()
  const [push, setPush] = useState<PushState | null>(null)
  const [sound, setSound] = useState(alertSoundOn)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = 'Messages · NexoraGuru'
    void pushState().then(setPush)
  }, [])

  if (!user) return null

  const togglePush = async () => {
    setBusy(true)
    try {
      const next = push === 'on' ? await disablePush() : await enablePush()
      setPush(next)
      if (next === 'on') toast.success('Notifications are on', 'New messages and calls reach this device, even with NexoraGuru closed.')
      if (next === 'denied') toast.warning('Notifications are blocked', 'Allow them for this site in the browser’s address bar, then try again.')
    } catch {
      toast.error('Couldn’t turn on notifications', 'Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="msg-page">
      <header className="msg-head">
        <h1 className="msg-title">Messages</h1>
        <div className="msg-tools">
          <Tooltip label={sound ? 'Sound for new messages: on' : 'Sound for new messages: off'} side="bottom">
            <button
              type="button"
              className={cn('msg-tool', !sound && 'is-off')}
              aria-pressed={sound}
              aria-label="Message sound"
              onClick={() => {
                setSound(!sound)
                setAlertSound(!sound)
              }}
            >
              {sound ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
            </button>
          </Tooltip>
          {push && push !== 'unsupported' && (
            <button type="button" className={cn('msg-alerts', push === 'on' && 'is-on')} onClick={() => void togglePush()} disabled={busy} aria-pressed={push === 'on'}>
              {push === 'on' ? <BellRing className="size-4" aria-hidden="true" /> : push === 'denied' ? <BellOff className="size-4" aria-hidden="true" /> : <Bell className="size-4" aria-hidden="true" />}
              {push === 'on' ? 'Notifications on' : push === 'denied' ? 'Notifications blocked' : 'Turn on notifications'}
            </button>
          )}
        </div>
      </header>
      <MessagesTab me={user.username} socket={socket} />
    </div>
  )
}
