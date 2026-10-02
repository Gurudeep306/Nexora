import { useState } from 'react'
import { Eye, Lightbulb } from 'lucide-react'
import { Markdown } from '@/learn/md'
import { CodeTabs } from '@/learn/ui/CodeTabs'
import type { Lang } from '@/learn/engine/types'

const seenKey = (slug: string) => `nexora:learn-solution:${slug}`

/**
 * The written solution of a Nexora Learn problem: the editorial (intuition,
 * approach, proof, complexity, pitfalls) and verified code in every language.
 * Hidden behind a deliberate click so a student tries first.
 */
export function SolutionTab({ slug, editorial, solutions }: { slug: string; editorial: string | null; solutions: Partial<Record<Lang, string>> }) {
  const [shown, setShown] = useState(() => {
    try {
      return localStorage.getItem(seenKey(slug)) === '1'
    } catch {
      return false
    }
  })
  const hasCode = Object.values(solutions).some(Boolean)
  if (!editorial && !hasCode) {
    return <p className="py-8 text-center text-xs text-foreground-faint">The written solution for this problem is on its way.</p>
  }
  if (!shown) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-warning/15 text-warning">
          <Lightbulb className="size-5" />
        </span>
        <p className="max-w-xs text-sm text-foreground-dim">
          Give it a real try first. Even a wrong attempt teaches you more than reading the answer straight away.
        </p>
        <button
          type="button"
          onClick={() => {
            setShown(true)
            try {
              localStorage.setItem(seenKey(slug), '1')
            } catch {
              /* ignore */
            }
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
        >
          <Eye className="size-4" /> Show the solution
        </button>
      </div>
    )
  }
  return (
    <div className="learn-prose space-y-5">
      {editorial && <Markdown md={editorial} />}
      {hasCode && <CodeTabs code={solutions} title="Solution code" />}
    </div>
  )
}
