import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Modal, useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib/api'
import { REPORT_EVENT, REPORT_REASONS, type ReportTarget } from '@/lib/report'
import { cn } from '@/lib/utils'
import './brand.css'

/** The one report dialog; open it with openReport() from '@/lib/report'. */
export function ReportHost() {
  const { user } = useAuth()
  const toast = useToast()
  const [target, setTarget] = useState<ReportTarget | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const onOpen = (e: Event) => {
      setTarget((e as CustomEvent<ReportTarget>).detail)
      setReason(null)
      setDetails('')
      setDone(false)
    }
    window.addEventListener(REPORT_EVENT, onOpen)
    return () => window.removeEventListener(REPORT_EVENT, onOpen)
  }, [])

  const noun = target?.noun ?? target?.contentType.replace(/_/g, ' ') ?? 'content'
  const close = () => setTarget(null)

  async function submit() {
    if (!target || !reason) return
    setBusy(true)
    try {
      await api.post('/api/reports', {
        content_type: target.contentType,
        content_id: String(target.contentId),
        target_user: target.targetUser,
        reason,
        details: details.trim(),
      })
      setDone(true)
    } catch (e) {
      toast.error('Could not send the report', e instanceof ApiError ? e.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={!!target && !!user} onClose={close} title={done ? undefined : `Report this ${noun}`} description={done ? undefined : 'Only the moderators see reports. The person you report is not told who sent it.'} size="sm">
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-state-success/12 text-state-success shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-state-success)_28%,transparent)]">
              <Icon name="check" className="size-6" />
            </span>
            <h3 className="nx-display mt-4 text-xl font-semibold text-text-primary">Thanks — we've got it</h3>
            <p className="mt-1.5 max-w-xs text-sm text-text-secondary">A moderator will review this {noun}. You won't see it flagged, but we'll act if it breaks the rules.</p>
            <button type="button" onClick={close} className="nx-btn mt-6">
              Done
            </button>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {target?.preview && (
              <blockquote className="line-clamp-3 rounded-xl border-l-2 border-[color:var(--nx-hair-strong)] bg-bg-surface-2 px-3 py-2 text-[13px] text-text-secondary">
                {target.targetUser && <span className="mr-1.5 font-medium text-text-primary">@{target.targetUser}</span>}
                {target.preview}
              </blockquote>
            )}
            <div role="radiogroup" aria-label="Reason" className="grid grid-cols-2 gap-2">
              {REPORT_REASONS.map((r) => {
                const on = reason === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setReason(r.id)}
                    className={cn(
                      'cursor-pointer rounded-xl px-3 py-2.5 text-left transition-[background-color,box-shadow] duration-200',
                      on
                        ? 'bg-[color-mix(in_oklab,var(--nx-b1)_10%,transparent)] shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--nx-b1)_60%,transparent)]'
                        : 'bg-bg-surface-2 shadow-[inset_0_0_0_1px_var(--nx-hair)] hover:shadow-[inset_0_0_0_1px_var(--nx-hair-strong)]',
                    )}
                  >
                    <span className="block text-[13px] font-semibold text-text-primary">{r.label}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-text-muted">{r.hint}</span>
                  </button>
                )
              })}
            </div>
            <textarea
              className="nx-input"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={reason === 'other' ? 'What happened?' : 'Anything else moderators should know? (optional)'}
              maxLength={1000}
              aria-label="Details"
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="nx-btn" onClick={close}>
                Cancel
              </button>
              <button type="button" className="nx-cta" disabled={!reason || (reason === 'other' && details.trim().length < 3) || busy} onClick={submit} aria-busy={busy || undefined}>
                <Icon name="flag" />
                {busy ? 'Sending…' : 'Send report'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
