import { useState } from 'react'
import { Button, Modal, Textarea, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { errorText } from './lib'

const REASONS = [
  { id: 'spam', label: 'Spam or scam' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate or abuse' },
  { id: 'cheating', label: 'Contest cheating / leaked answers' },
  { id: 'misinformation', label: 'Misleading or wrong' },
  { id: 'nsfw', label: 'Inappropriate content' },
  { id: 'other', label: 'Something else' },
]

/** Report a post, comment or profile to the moderators (generic /api/reports). */
export function ReportDialog({
  open,
  onClose,
  contentType,
  contentId,
  targetUser,
}: {
  open: boolean
  onClose: () => void
  contentType: 'post' | 'comment' | 'profile'
  contentId: string | number
  targetUser: string
}) {
  const toast = useToast()
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try {
      const r = await api.post<{ duplicate?: boolean }>('/api/reports', {
        content_type: contentType,
        content_id: String(contentId),
        reason,
        details,
        target_user: targetUser,
      })
      toast.success(r.duplicate ? 'Already reported' : 'Thanks — report sent', 'Moderators will take a look.')
      onClose()
      setDetails('')
    } catch (e) {
      toast.error('Could not send report', errorText(e))
    } finally {
      setBusy(false)
    }
  }
  const noun = contentType === 'profile' ? 'profile' : contentType
  return (
    <Modal open={open} onClose={onClose} title={`Report this ${noun}`} description="Reports are private. The person won't know who reported them." size="sm">
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Reason" className="grid gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={reason === r.id}
              onClick={() => setReason(r.id)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                reason === r.id ? 'border-accent-brand/50 bg-accent-brand/10 text-text-primary' : 'border-border text-text-secondary hover:border-border-strong',
              )}
            >
              <span className={cn('grid size-4 place-items-center rounded-full border', reason === r.id ? 'border-accent-brand' : 'border-border-strong')}>
                {reason === r.id && <span className="size-2 rounded-full bg-accent-brand" />}
              </span>
              {r.label}
            </button>
          ))}
        </div>
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything else moderators should know? (optional)" maxLength={1000} rows={3} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" loading={busy} onClick={() => void submit()}>
            Send report
          </Button>
        </div>
      </div>
    </Modal>
  )
}
