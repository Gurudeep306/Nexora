import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

const PLATFORMS: Record<string, { label: string; className: string }> = {
  codeforces: { label: 'Codeforces', className: 'border-info/40 bg-info/10 text-info' },
  codechef: { label: 'CodeChef', className: 'border-warning/40 bg-warning/10 text-warning' },
  atcoder: { label: 'AtCoder', className: 'border-success/40 bg-success/10 text-success' },
  leetcode: { label: 'LeetCode', className: 'border-gold/40 bg-gold/10 text-gold' },
  spoj: { label: 'SPOJ', className: 'border-cyan/40 bg-cyan/10 text-cyan' },
  'project euler': { label: 'Euler', className: 'border-accent/40 bg-accent/10 text-accent' },
  projecteuler: { label: 'Euler', className: 'border-accent/40 bg-accent/10 text-accent' },
  learn: { label: 'Nexora Learn', className: 'border-success/40 bg-success/10 text-success' },
  custom: { label: 'Custom', className: 'border-primary/40 bg-primary/10 text-primary-bright' },
  ai: { label: 'AI', className: 'border-primary/40 bg-primary/10 text-primary-bright' },
}

export function PlatformBadge({ platform, className }: { platform?: string; className?: string }) {
  if (!platform) return null
  const meta = PLATFORMS[platform.toLowerCase()] ?? {
    label: platform,
    className: 'border-border bg-surface-2 text-foreground-dim',
  }
  return <Badge className={cn(meta.className, className)}>{meta.label}</Badge>
}

const VERDICTS: Record<string, { label: string; className: string }> = {
  ac: { label: 'Accepted', className: 'border-success/40 bg-success/10 text-success' },
  accepted: { label: 'Accepted', className: 'border-success/40 bg-success/10 text-success' },
  ok: { label: 'Accepted', className: 'border-success/40 bg-success/10 text-success' },
  wa: { label: 'Wrong Answer', className: 'border-destructive/40 bg-destructive/10 text-destructive' },
  wrong_answer: { label: 'Wrong Answer', className: 'border-destructive/40 bg-destructive/10 text-destructive' },
  tle: { label: 'Time Limit', className: 'border-warning/40 bg-warning/10 text-warning' },
  time_limit_exceeded: { label: 'Time Limit', className: 'border-warning/40 bg-warning/10 text-warning' },
  re: { label: 'Runtime Error', className: 'border-accent/40 bg-accent/10 text-accent' },
  runtime_error: { label: 'Runtime Error', className: 'border-accent/40 bg-accent/10 text-accent' },
  ce: { label: 'Compile Error', className: 'border-info/40 bg-info/10 text-info' },
  compilation_error: { label: 'Compile Error', className: 'border-info/40 bg-info/10 text-info' },
  mle: { label: 'Memory Limit', className: 'border-cyan/40 bg-cyan/10 text-cyan' },
  pending: { label: 'Pending', className: 'border-border bg-surface-2 text-foreground-dim' },
  running: { label: 'Running', className: 'border-primary/40 bg-primary/10 text-primary-bright' },
}

export function VerdictBadge({ verdict, className }: { verdict?: string; className?: string }) {
  if (!verdict) return null
  const meta = VERDICTS[verdict.toLowerCase().replace(/[\s-]/g, '_')] ?? {
    label: verdict,
    className: 'border-border bg-surface-2 text-foreground-dim',
  }
  return <Badge className={cn(meta.className, className)}>{meta.label}</Badge>
}
