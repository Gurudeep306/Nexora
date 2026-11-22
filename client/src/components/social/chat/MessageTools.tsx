/*
  The sound and notification switches for Messages (Community → Messages and
  the quick chat). Notifications reach this device even when NexoraGuru is
  closed (free Web Push, src/push.js).
*/
import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Volume2, VolumeX } from 'lucide-react'
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push'
import { alertSoundOn, setAlertSound } from './sound'
import { Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import './page.css'

export function MessageTools({ compact = false }: { compact?: boolean }) {
  const toast = useToast()
  const [push, setPush] = useState<PushState | null>(null)
  const [sound, setSound] = useState(alertSoundOn)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void pushState().then(setPush)
  }, [])

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

  const pushLabel = push === 'on' ? 'Notifications on' : push === 'denied' ? 'Notifications blocked' : 'Turn on notifications'
  const PushIcon = push === 'on' ? BellRing : push === 'denied' ? BellOff : Bell

  return (
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
      {push && push !== 'unsupported' && (compact ? (
        <Tooltip label={pushLabel} side="bottom">
          <button type="button" className={cn('msg-tool', push === 'on' && 'is-good')} onClick={() => void togglePush()} disabled={busy} aria-pressed={push === 'on'} aria-label="Notifications on this device">
            <PushIcon className="size-4" aria-hidden="true" />
          </button>
        </Tooltip>
      ) : (
        <button type="button" className={cn('msg-alerts', push === 'on' && 'is-on')} onClick={() => void togglePush()} disabled={busy} aria-pressed={push === 'on'}>
          <PushIcon className="size-4" aria-hidden="true" />
          <span className="msg-alerts-text">{pushLabel}</span>
        </button>
      ))}
    </div>
  )
}
