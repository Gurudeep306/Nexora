import { lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'
import type { AiMarkdownProps } from './AiMarkdownImpl'

const Impl = lazy(() => import('./AiMarkdownImpl'))

/**
 * The one renderer for AI/model text anywhere in the app: GitHub markdown
 * (tables, task lists), syntax-highlighted code with copy, KaTeX maths and
 * callouts — and never raw HTML. The markdown engine is lazy-loaded, so until
 * it arrives the text shows as plain wrapped prose.
 */
export function AiMarkdown(props: AiMarkdownProps) {
  return (
    <Suspense fallback={<div className={cn('whitespace-pre-wrap break-words', props.className)}>{props.text}</div>}>
      <Impl {...props} />
    </Suspense>
  )
}
