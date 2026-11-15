import { isValidElement, memo, useMemo, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { ExternalLink } from 'lucide-react'
import { tokenize } from '@/learn/engine/code'
import type { Lang } from '@/learn/engine/types'
import { cn } from '@/lib/utils'
import { CopyButton } from './CopyButton'


/**
 * The real renderer behind <AiMarkdown> (lazy-loaded). react-markdown builds
 * React elements from the markdown AST, so raw HTML in model output is shown
 * as text, never parsed — there is deliberately no rehype-raw. The only HTML
 * we inject is KaTeX's own output for $maths$.
 */

/* ── preprocessing ── */

/** Split into code (fenced / inline) and prose segments so rewrites never touch code. */
function mapProse(src: string, fn: (prose: string) => string): string {
  return src
    .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join('')
}

/** Models often write \( … \) and \[ … \]; remark-math wants $ … $ and $$ … $$. */
function normalizeMath(src: string): string {
  if (!src.includes('\\(') && !src.includes('\\[')) return src
  return mapProse(src, (p) =>
    p.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex: string) => `\n$$\n${tex.trim()}\n$$\n`).replace(/\\\(([\s\S]+?)\\\)/g, (_, tex: string) => `$${tex.trim()}$`),
  )
}

/**
 * While a reply streams, hold back constructs that would render broken for a
 * moment and then jump: an unfinished display-math block and a table row still
 * being typed. Unclosed code fences are fine — CommonMark runs them to the end.
 */
function stableWhileStreaming(src: string): string {
  let out = src
  const fences = (out.match(/^\s*```/gm) ?? []).length
  if (fences % 2 === 0) {
    // display maths only outside code
    const prose = mapProse(out, (p) => p)
    const dollars = (prose.match(/\$\$/g) ?? []).length
    if (dollars % 2 === 1) out = out.slice(0, out.lastIndexOf('$$'))
  }
  const nl = out.lastIndexOf('\n')
  const tail = out.slice(nl + 1)
  if (/^\s*\|/.test(tail)) out = out.slice(0, nl + 1)
  else if ((out.match(/^\s*```/gm) ?? []).length % 2 === 0) {
    // A half-typed **bold**, _em_ or `code` on the last line would flash its raw
    // markers until the closing one arrives: hold the opener back instead.
    let line = out.slice(nl + 1)
    if ((line.match(/\*\*/g) ?? []).length % 2 === 1) line = line.replace(/\*\*(?!.*\*\*)/, '')
    if ((line.replace(/```/g, '').match(/`/g) ?? []).length % 2 === 1) line = line.replace(/`(?!.*`)/, '')
    out = out.slice(0, nl + 1) + line.replace(/\s*[*_`#>-]+$/, (m) => (/^\s*$/.test(line.slice(0, -m.length)) ? m : ''))
  }
  return out
}

/* ── remark plugin: GitHub-style callouts  > [!NOTE] … ── */

interface MdNode {
  type: string
  value?: string
  children?: MdNode[]
  data?: { hProperties?: Record<string, unknown> }
}
const CALLOUTS = new Set(['note', 'tip', 'important', 'warning', 'caution'])

function remarkCallouts() {
  const walk = (node: MdNode) => {
    if (node.type === 'blockquote') {
      const para = node.children?.[0]
      const text = para?.type === 'paragraph' ? para.children?.[0] : undefined
      const m = text?.type === 'text' ? /^\[!(\w+)\]\s*/.exec(text.value ?? '') : null
      if (m && text && CALLOUTS.has(m[1].toLowerCase())) {
        const kind = m[1].toLowerCase()
        text.value = (text.value ?? '').slice(m[0].length)
        node.data = { ...node.data, hProperties: { className: ['ai-callout', `ai-callout-${kind}`], 'data-label': kind } }
      }
    }
    node.children?.forEach(walk)
  }
  return (tree: MdNode) => walk(tree)
}

/**
 * remark plugin: raw HTML in model output becomes literal text. Without this,
 * react-markdown silently drops it — and `vector<int>` written outside
 * backticks would lose its `<int>`.
 */
function remarkHtmlAsText() {
  const walk = (node: MdNode) => {
    if (node.type === 'html') node.type = 'text'
    node.children?.forEach(walk)
  }
  return (tree: MdNode) => walk(tree)
}

/* ── code ── */

const LANG_ALIASES: Record<string, Lang> = {
  cpp: 'cpp', 'c++': 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', h: 'cpp',
  c: 'c',
  java: 'java', kotlin: 'java', kt: 'java', csharp: 'java', cs: 'java', go: 'js', rust: 'cpp', rs: 'cpp',
  python: 'python', py: 'python', python3: 'python',
  js: 'js', javascript: 'js', jsx: 'js', ts: 'js', typescript: 'js', tsx: 'js', mjs: 'js',
  pseudo: 'pseudo', pseudocode: 'pseudo', text: 'pseudo', plaintext: 'pseudo', txt: 'pseudo',
}
const LANG_LABELS: Record<string, string> = {
  cpp: 'C++', 'c++': 'C++', c: 'C', java: 'Java', python: 'Python', py: 'Python', js: 'JavaScript', javascript: 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX', jsx: 'JSX', go: 'Go', rust: 'Rust', rs: 'Rust', kotlin: 'Kotlin',
  csharp: 'C#', cs: 'C#', sql: 'SQL', bash: 'Bash', sh: 'Shell', shell: 'Shell', json: 'JSON', pseudo: 'Pseudocode', pseudocode: 'Pseudocode',
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const key = lang.toLowerCase()
  const hl = LANG_ALIASES[key]
  const label = LANG_LABELS[key] ?? (key || 'Code')
  const lines = code.replace(/\n$/, '').split('\n')
  return (
    <div className="ai-code not-prose">
      <div className="ai-code-head">
        <span className="ai-code-lang">{label}</span>
        <CopyButton text={code.replace(/\n$/, '')} label="Copy code" />
      </div>
      <pre>
        <code>
          {lines.map((line, i) => (
            <span key={i} className="ai-code-line">
              {hl && key !== 'text' && key !== 'txt' && key !== 'plaintext'
                ? tokenize(line, hl).map((t, k) =>
                    t.k ? (
                      <span key={k} className={`ai-tok-${t.k}`}>
                        {t.t}
                      </span>
                    ) : (
                      t.t
                    ),
                  )
                : line}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

function MathTex({ tex, display }: { tex: string; display: boolean }) {
  const html = useMemo(() => {
    try {
      // trust:false (default) keeps \href, \url etc. from producing links/HTML.
      return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: false, trust: false, maxExpand: 500 })
    } catch {
      return null
    }
  }, [tex, display])
  if (html == null) return <code>{tex}</code>
  return display ? (
    <div className="ai-math-display" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span className="ai-math" dangerouslySetInnerHTML={{ __html: html }} />
  )
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

const components: Components = {
  pre({ children }) {
    const child = (Array.isArray(children) ? children[0] : children) as ReactElement<{ className?: string; children?: ReactNode }> | undefined
    const className = (isValidElement(child) && child.props.className) || ''
    const code = textOf(isValidElement(child) ? child.props.children : children)
    if (/\bmath-display\b/.test(className)) return <MathTex tex={code} display />
    const lang = /language-([\w+#.-]+)/.exec(className)?.[1] ?? ''
    return <CodeBlock code={code} lang={lang} />
  },
  code({ className, children }) {
    if (/\bmath-inline\b/.test(className ?? '')) return <MathTex tex={textOf(children)} display={false} />
    return <code className={className}>{children}</code>
  },
  a({ href, children }) {
    const url = href ?? ''
    const external = /^https?:\/\//i.test(url)
    if (!url) return <>{children}</>
    return external ? (
      <a href={url} target="_blank" rel="noopener noreferrer nofollow">
        {children}
        <ExternalLink className="ai-link-icon" aria-hidden="true" />
      </a>
    ) : (
      <a href={url}>{children}</a>
    )
  },
  // No remote images from model output (tracking pixels, huge files): show a link instead.
  img({ src, alt }) {
    const url = typeof src === 'string' ? src : ''
    if (!/^https?:\/\//i.test(url)) return <>{alt}</>
    return (
      <a href={url} target="_blank" rel="noopener noreferrer nofollow">
        {alt || 'image'}
        <ExternalLink className="ai-link-icon" aria-hidden="true" />
      </a>
    )
  },
  table({ children }) {
    return (
      <div className="ai-table-wrap">
        <table>{children}</table>
      </div>
    )
  },
  input(props: ComponentPropsWithoutRef<'input'>) {
    // GFM task-list checkboxes: read-only.
    return <input type="checkbox" checked={!!props.checked} readOnly disabled className="ai-task" />
  },
}

const remarkPlugins = [remarkGfm, [remarkMath, { singleDollarTextMath: true }], remarkCallouts, remarkHtmlAsText] as NonNullable<
  ComponentPropsWithoutRef<typeof Markdown>['remarkPlugins']
>

export interface AiMarkdownProps {
  text: string
  streaming?: boolean
  /** 'chat' = comfortable reading size; 'compact' = dense panels (coach, cards). */
  size?: 'chat' | 'compact'
  className?: string
}

function AiMarkdownImpl({ text, streaming = false, size = 'chat', className }: AiMarkdownProps) {
  const src = useMemo(() => {
    const t = normalizeMath(text)
    return streaming ? stableWhileStreaming(t) : t
  }, [text, streaming])
  return (
    <div className={cn('ai-md', size === 'compact' && 'ai-md-compact', className)} data-streaming={streaming || undefined}>
      <Markdown remarkPlugins={remarkPlugins} components={components}>
        {src}
      </Markdown>
    </div>
  )
}

export default memo(AiMarkdownImpl)
