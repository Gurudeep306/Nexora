import { useMemo } from 'react'
import { FileQuestion } from 'lucide-react'
import { sanitizeHtml } from '@/components/ailab/sanitize'
import { cn } from '@/lib/utils'

/** Studio-authored content blocks: paragraphs carry HTML, headings/pyq are markers. */
interface ContentBlock {
  id?: string
  type?: string
  html?: string
  level?: number
}

const PROSE_CLASSES = [
  'text-sm leading-relaxed text-foreground-dim',
  '[&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:font-display [&_h1]:text-lg [&_h1]:tracking-wide [&_h1]:text-foreground',
  '[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-base [&_h2]:tracking-wide [&_h2]:text-foreground',
  '[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-display [&_h3]:text-sm [&_h3]:tracking-wide [&_h3]:text-foreground',
  '[&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:text-xs [&_h4]:font-semibold [&_h4]:tracking-wider [&_h4]:uppercase [&_h4]:text-primary-bright',
  '[&_p]:my-2',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-primary-bright [&_li]:my-1',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1',
  '[&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic',
  '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-background [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed',
  '[&_code]:rounded [&_code]:bg-background [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-cyan',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground',
  '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs',
  '[&_th]:border [&_th]:border-border [&_th]:bg-surface-2 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground',
  '[&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5',
  '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-foreground-dim',
  '[&_a]:text-cyan [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-primary-bright',
  '[&_hr]:my-4 [&_hr]:border-border',
].join(' ')

/**
 * Renders server-seeded tutorial content. Most rows are raw HTML; studio-authored
 * rows are a JSON block array ([{type:'paragraph',html}, {type:'pyq'}, ...]).
 * Everything passes through the shared sanitizer before injection.
 */
export function TutorialContent({ content, className }: { content: string | null | undefined; className?: string }) {
  const { html, hasPyq, isEmpty } = useMemo(() => {
    const trimmed = (content ?? '').trim()
    if (!trimmed) return { html: '', hasPyq: false, isEmpty: true }
    if (trimmed.startsWith('[')) {
      try {
        const blocks: ContentBlock[] = JSON.parse(trimmed)
        if (Array.isArray(blocks)) {
          const html = blocks
            .map((b) => (b.html ? b.html : ''))
            .join('\n')
          return { html: sanitizeHtml(html), hasPyq: blocks.some((b) => b.type === 'pyq'), isEmpty: !html.trim() }
        }
      } catch {
        /* not valid JSON — fall through and treat as raw HTML */
      }
    }
    return { html: sanitizeHtml(trimmed), hasPyq: false, isEmpty: !trimmed }
  }, [content])

  if (isEmpty && !hasPyq) {
    return (
      <p className="rounded-lg border border-border bg-background p-4 text-center text-xs text-foreground-faint">
        This tutorial has no written content yet — check back soon.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {html && (
        <div
          className={cn(PROSE_CLASSES, className)}
          // Server-seeded educational content, passed through sanitizeHtml first.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {hasPyq && (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-xs text-foreground-dim">
          <FileQuestion className="size-4 shrink-0 text-primary-bright" aria-hidden="true" />
          Previous-year question banks for this topic are being compiled — practice problems below.
        </p>
      )}
    </div>
  )
}
