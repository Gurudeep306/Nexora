import { AnimatePresence, motion } from 'motion/react'
import { Trophy, Zap } from 'lucide-react'
import { VerdictBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import { Confetti } from '@/components/ui/Confetti'

export function VerdictBanner({
  verdict,
  xpEarned,
  burstId,
  onDismiss,
}: {
  verdict: string | null
  xpEarned?: number | null
  /** Changes once per new judge result so a repeat AC fires a fresh burst. */
  burstId?: number
  onDismiss: () => void
}) {
  const isAc = verdict === 'AC' || verdict === 'OK'
  return (
    <>
    {verdict === 'AC' && <Confetti key={burstId} burstKey={`${verdict}-${burstId ?? 0}`} />}
    <AnimatePresence>
      {verdict && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
          transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
          className={cn(
            'pointer-events-auto absolute inset-x-0 top-3 z-30 mx-auto flex w-fit max-w-[92%] cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 backdrop-blur-md',
            isAc
              ? 'border-success/50 bg-success/15 glow-box'
              : 'border-destructive/50 bg-destructive/15',
          )}
          onClick={onDismiss}
        >
          {isAc ? (
            <Trophy className="size-5 text-success" aria-hidden="true" />
          ) : (
            <Zap className="size-5 text-destructive" aria-hidden="true" />
          )}
          <VerdictBadge verdict={verdict} />
          {isAc && xpEarned != null && xpEarned > 0 && (
            <span className="font-display text-sm tracking-wider text-success glow-text tabular-nums">
              +{xpEarned} XP
            </span>
          )}
          <span className="text-[10px] text-foreground-faint">click to dismiss</span>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
