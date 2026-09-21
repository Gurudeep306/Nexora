import { motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui'
import { PlatformBadge, VerdictBadge } from '@/components/shared/PlatformBadge'
import { timeAgo } from '@/lib/utils'
import type { ActivitySubmission } from './types'

export function SubmissionsTable({
  submissions,
  onSelect,
}: {
  submissions: ActivitySubmission[]
  onSelect: (submission: ActivitySubmission) => void
}) {
  return (
    <div className="card-neon overflow-hidden">
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>Verdict</TH>
            <TH>Problem</TH>
            <TH className="hidden md:table-cell">Platform</TH>
            <TH className="hidden lg:table-cell">Language</TH>
            <TH className="hidden sm:table-cell">Time</TH>
            <TH>Submitted</TH>
            <TH className="w-8" aria-label="Open details" />
          </TR>
        </THead>
        <TBody>
          {submissions.map((s, i) => (
            <motion.tr
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.03, 0.3), ease: [0.34, 1.56, 0.64, 1] }}
              className="cursor-pointer transition-colors duration-150 hover:bg-surface-2/60"
              onClick={() => onSelect(s)}
              tabIndex={0}
              role="button"
              aria-label={`View submission ${s.id} for ${s.title}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(s)
                }
              }}
            >
              <TD>
                <VerdictBadge verdict={s.verdict} />
              </TD>
              <TD>
                <span className="block max-w-56 truncate text-sm text-foreground lg:max-w-96">
                  {s.title}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-[11px] text-foreground-faint md:hidden">
                  <PlatformBadge platform={s.platform} />
                  {s.language && <span className="font-mono">{s.language}</span>}
                </span>
              </TD>
              <TD className="hidden md:table-cell">
                <PlatformBadge platform={s.platform} />
              </TD>
              <TD className="hidden font-mono text-xs lg:table-cell">{s.language ?? '—'}</TD>
              <TD className="hidden font-mono text-xs tabular-nums sm:table-cell">
                {s.exec_time_ms != null ? `${s.exec_time_ms} ms` : '—'}
              </TD>
              <TD>
                <span className="font-mono text-xs tabular-nums" title={s.submitted_at}>
                  {timeAgo(s.submitted_at)}
                </span>
                {s.rating > 0 && (
                  <span className="ml-2 hidden font-mono text-[11px] text-primary-bright tabular-nums sm:inline">
                    {s.rating}
                  </span>
                )}
              </TD>
              <TD>
                <ChevronRight className="size-4 text-foreground-faint" aria-hidden="true" />
              </TD>
            </motion.tr>
          ))}
        </TBody>
      </Table>
    </div>
  )
}
