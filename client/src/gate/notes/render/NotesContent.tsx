/*
  Renders a compiled lesson AST (see ../types.ts). Plain Markdown nodes map
  to semantic HTML; :::blocks go through BLOCK_RENDERERS, so a new block is
  one entry here plus one in scripts/build-gate-notes.js.

  Every block's wrapper carries data-block, data-block-id and data-depth:
  the anchors later reader features hang off (the Depth dial filters on
  data-depth; highlights, margin notes and "Explain simpler" attach to a
  block id). Nothing is injected as HTML except KaTeX's own output.
*/
import { createContext, lazy, Suspense, useContext, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { Icon, type IconName } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import { VizBlock } from '@/viz/VizBlock'
import type { VizSpec } from '@/viz/schema'
import type { BlockName, DirectiveNode, Inline, Node, NotesSubject, PracticeQuestion } from '../types'
import { PracticeEmbed } from './PracticeEmbed'
import { domId } from './ids'

const PyqEmbed = lazy(() => import('./PyqEmbed'))

export interface NotesContext {
  subject: NotesSubject
  lessonId: string
  practice: Record<string, PracticeQuestion>
  viz: Record<string, VizSpec>
  pyqTopics: string[]
  cleanLines: boolean
  setCleanLines: (on: boolean) => void
  /** Prefix for DOM ids when one page shows a lesson more than once (the font samples). */
  idPrefix?: string
  /** Start worked examples with every step shown (the font samples). */
  expandExamples?: boolean
  /** Lesson blocks and headings by id, for "Concepts this tests" chips. */
  concepts?: Record<string, string>
}
const Ctx = createContext<NotesContext | null>(null)
export const NotesContextProvider = Ctx.Provider
const useNotes = () => useContext(Ctx)

const useDomId = () => {
  const prefix = useNotes()?.idPrefix ?? ''
  return (id: string) => `${prefix}${domId(id)}`
}

/* ── Maths ───────────────────────────────────────────────────────────── */

const texCache = new Map<string, string>()
function tex(src: string, display: boolean) {
  const key = `${display ? 'D' : 'I'}${src}`
  let html = texCache.get(key)
  if (html === undefined) {
    try {
      html = katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' })
    } catch {
      html = src.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    }
    if (texCache.size > 2000) texCache.clear()
    texCache.set(key, html)
  }
  return html
}

/* ── Inline ──────────────────────────────────────────────────────────── */

function href(h: string) {
  const i = h.indexOf('#')
  return i < 0 ? h : `${h.slice(0, i)}#${domId(h.slice(i + 1))}`
}

export function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => (
        <InlineNode key={i} n={n} />
      ))}
    </>
  )
}

function InlineNode({ n }: { n: Inline }) {
  if (typeof n === 'string') return <>{n}</>
  switch (n.t) {
    case 'em':
      return <em>{<Inlines nodes={n.c} />}</em>
    case 'strong':
      return <strong>{<Inlines nodes={n.c} />}</strong>
    case 'del':
      return <del>{<Inlines nodes={n.c} />}</del>
    case 'key':
      return <mark className="notes-key">{<Inlines nodes={n.c} />}</mark>
    case 'code':
      return <code className="notes-code">{n.v}</code>
    case 'im':
      return <span className="nm" dangerouslySetInnerHTML={{ __html: tex(n.v, false) }} />
    case 'br':
      return <br />
    case 'img':
      return <img src={n.src} alt={n.alt} loading="lazy" className="notes-img" />
    case 'a': {
      const to = href(n.href)
      if (/^https?:/.test(to))
        return (
          <a href={to} target="_blank" rel="noreferrer">
            <Inlines nodes={n.c} />
          </a>
        )
      if (to.startsWith('#')) return <a href={to}>{<Inlines nodes={n.c} />}</a>
      return (
        <Link to={to}>
          <Inlines nodes={n.c} />
        </Link>
      )
    }
  }
}

/* ── Blocks ──────────────────────────────────────────────────────────── */

export function Nodes({ nodes }: { nodes: Node[] }) {
  return (
    <>
      {nodes.map((n, i) => (
        <NodeView key={i} n={n} />
      ))}
    </>
  )
}

function NodeView({ n }: { n: Node }) {
  const did = useDomId()
  switch (n.t) {
    case 'h': {
      const H = `h${Math.min(6, n.d)}` as 'h2'
      return (
        <H id={did(n.id)} className="notes-h">
          <span className="notes-h-text">
            <Inlines nodes={n.c} />
            {n.d === 2 && <Squiggle />}
          </span>
        </H>
      )
    }
    case 'p':
      return (
        <p>
          <Inlines nodes={n.c} />
        </p>
      )
    case 'ul':
    case 'ol': {
      const L = n.t
      return (
        <L start={n.t === 'ol' ? n.start : undefined} className={cn(n.tight && 'tight')}>
          {n.c.map((li, i) => (
            <li key={i} className={cn(li.checked !== undefined && 'task')}>
              {li.checked !== undefined && <input type="checkbox" checked={li.checked} readOnly disabled aria-label={li.checked ? 'Done' : 'Not done'} />}
              <Nodes nodes={li.c} />
            </li>
          ))}
        </L>
      )
    }
    case 'quote':
      return (
        <blockquote>
          <Nodes nodes={n.c} />
        </blockquote>
      )
    case 'hr':
      return <hr />
    case 'pre':
      return (
        <pre className="notes-pre" tabIndex={0}>
          <code>{n.v}</code>
        </pre>
      )
    case 'math':
      return <div className="nm-display" dangerouslySetInnerHTML={{ __html: tex(n.v, true) }} />
    case 'table': {
      const [head, ...rows] = n.c
      const align = (i: number) => (n.align[i] ?? undefined) as 'left' | 'center' | 'right' | undefined
      return (
        <div className="notes-table" tabIndex={0} role="region" aria-label="Table">
          <table>
            {head && (
              <thead>
                <tr>
                  {head.c.map((cell, i) => (
                    <th key={i} scope="col" style={{ textAlign: align(i) }}>
                      <Inlines nodes={cell.c} />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.c.map((cell, i) => (
                    <td key={i} style={{ textAlign: align(i) }}>
                      <Inlines nodes={cell.c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'block':
      return <Block node={n} />
  }
}

/* ── Hand-drawn bits ─────────────────────────────────────────────────── */

export function Squiggle() {
  return (
    <svg className="notes-squiggle" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M1 6 C 9 2, 15 9, 24 5 S 39 2, 47 6 S 62 9, 71 5 S 86 2, 95 6 S 110 8, 119 4" />
    </svg>
  )
}

function Qed() {
  return (
    <svg className="notes-qed" viewBox="0 0 16 16" role="img" aria-label="End of proof">
      <path d="M3 3.5 L13 2.8 L12.6 13 L2.6 12.4 Z" />
      <path d="M4.6 5 L11 4.6 M4.4 7 L11.2 6.7 M4.3 9 L11 8.8 M4.5 11 L10.8 10.8" />
    </svg>
  )
}

/* ── :::blocks ───────────────────────────────────────────────────────── */

interface BlockProps {
  node: DirectiveNode
  children: ReactNode
}

function Frame({ node, as: As = 'section', className, icon, kicker, title, children, labelledBy }: {
  node: DirectiveNode
  as?: 'section' | 'aside' | 'div' | 'figure'
  className?: string
  icon?: IconName | string
  kicker?: string
  title?: ReactNode
  children: ReactNode
  labelledBy?: string
}) {
  const hid = useId()
  const did = useDomId()
  const hasHead = !!(kicker || title)
  return (
    <As
      id={did(node.id)}
      data-block={node.name}
      data-block-id={node.id}
      data-depth={node.depth}
      className={cn('nb', `nb-${node.name}`, className)}
      aria-labelledby={hasHead ? (labelledBy ?? hid) : undefined}
    >
      {hasHead && (
        <header className="nb-head" id={labelledBy ? undefined : hid}>
          {icon &&
            (icon.length <= 2 ? (
              <span className="nb-emoji" aria-hidden="true">
                {icon}
              </span>
            ) : (
              <Icon name={icon as IconName} className="nb-icon" aria-hidden="true" />
            ))}
          {kicker && <span className="nb-kicker">{kicker}</span>}
          {title && <span className="nb-title">{title}</span>}
        </header>
      )}
      <div className="nb-body">{children}</div>
    </As>
  )
}

const label = (node: DirectiveNode, attr?: string): ReactNode =>
  node.label ? <Inlines nodes={node.label} /> : attr && node.attrs[attr] ? node.attrs[attr] : undefined

const LEVEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', gate: 'GATE level' }

const BLOCK_RENDERERS: Record<BlockName, (p: BlockProps) => ReactNode> = {
  intuition: ({ node, children }) => (
    <Frame node={node} icon="lightbulb" kicker="Intuition" title={label(node, 'title')}>
      {children}
    </Frame>
  ),
  definition: ({ node, children }) => (
    <Frame node={node} icon="book" kicker="Definition" title={node.attrs.term || node.label ? <dfn>{label(node, 'term')}</dfn> : undefined}>
      {children}
    </Frame>
  ),
  theorem: ({ node, children }) => (
    <Frame node={node} icon="award" kicker="Theorem" title={label(node, 'name')}>
      {children}
    </Frame>
  ),
  proof: ({ node, children }) => <Proof node={node}>{children}</Proof>,
  derivation: ({ node, children }) => (
    <Frame node={node} icon="function" kicker="Derivation" title={node.attrs.of ? <>of {node.attrs.of}</> : label(node)}>
      {children}
    </Frame>
  ),
  example: ({ node }) => <Example node={node} />,
  step: ({ node, children }) => (
    <Frame node={node} as="div">
      {children}
    </Frame>
  ),
  check: ({ node }) => <Check node={node} />,
  answer: ({ node, children }) => (
    <Frame node={node} as="div">
      {children}
    </Frame>
  ),
  trick: ({ node, children }) => (
    <Frame node={node} as="aside" icon="sparkles" kicker="Trick" title={label(node, 'title')}>
      {children}
    </Frame>
  ),
  trap: ({ node, children }) => (
    <Frame node={node} as="aside" icon="⚠️" kicker="Trap" title={label(node, 'title')}>
      {children}
    </Frame>
  ),
  pyq: ({ node }) => (
    <Frame node={node} as="div" icon="gate" kicker="Previous-year question">
      <ConceptChips tests={node.attrs.tests} />
      <Suspense fallback={<div className="nb-loading" aria-busy="true" />}>
        <PyqEmbedSlot id={node.attrs.id!} />
      </Suspense>
    </Frame>
  ),
  practice: ({ node }) => <PracticeSlot node={node} />,
  viz: ({ node }) => <VizSlot node={node} />,
  table: ({ node, children }) => (
    <Frame node={node} as="figure" icon="grid" kicker="Table" title={label(node, 'title')}>
      {children}
    </Frame>
  ),
  summary: ({ node, children }) => (
    <Frame node={node} icon="check-circle" kicker="Summary" title={label(node, 'title')}>
      {children}
    </Frame>
  ),
  note: ({ node, children }) => (
    <Frame node={node} as="aside" icon="edit" kicker="Note" title={label(node, 'title')}>
      {children}
    </Frame>
  ),
  aside: ({ node, children }) => (
    <Frame node={node} as="aside" icon="info" kicker="Aside" title={label(node, 'title')}>
      {children}
    </Frame>
  ),
}

function Block({ node }: { node: DirectiveNode }) {
  const render = BLOCK_RENDERERS[node.name]
  return <>{render({ node, children: <Nodes nodes={node.c} /> })}</>
}

function Proof({ node, children }: BlockProps) {
  const did = useDomId()
  return (
    <details id={did(node.id)} data-block="proof" data-block-id={node.id} data-depth={node.depth} className="nb nb-proof" open={node.attrs.open !== 'false'}>
      <summary className="nb-head">
        <Icon name="check" className="nb-icon" aria-hidden="true" />
        <span className="nb-kicker">Proof</span>
        {node.attrs.of && <span className="nb-title">of {node.attrs.of}</span>}
      </summary>
      <div className="nb-body">
        {children}
        <Qed />
      </div>
    </details>
  )
}

function Check({ node }: { node: DirectiveNode }) {
  const [open, setOpen] = useState(false)
  const answerId = useId()
  const answer = node.c.find((c): c is DirectiveNode => c.t === 'block' && c.name === 'answer')
  const rest = node.c.filter((c) => c !== answer)
  return (
    <Frame node={node} icon="target" kicker="Check yourself" title={label(node, 'title')}>
      <Nodes nodes={rest} />
      <button type="button" className="nb-reveal" aria-expanded={open} aria-controls={answerId} onClick={() => setOpen((o) => !o)}>
        <Icon name={open ? 'eye-off' : 'eye'} className="size-4" aria-hidden="true" />
        {open ? 'Hide answer' : 'Show answer'}
      </button>
      <div id={answerId} className="nb-answer" data-concealed={!open || undefined} data-block-id={answer?.id}>
        {answer && <Nodes nodes={answer.c} />}
      </div>
    </Frame>
  )
}

/*
  Worked example: the problem in a highlighted header, then numbered steps —
  each "what we do" with a "why" line — and the answer row. Steps can be
  revealed one at a time (Next step) or all at once; printing shows all.
*/
function Example({ node }: { node: DirectiveNode }) {
  const isStep = (c: Node): c is DirectiveNode => c.t === 'block' && c.name === 'step'
  const steps = node.c.filter(isStep)
  const answer = node.c.find((c): c is DirectiveNode => c.t === 'block' && c.name === 'answer')
  const problem = node.c.filter((c) => c !== answer && !isStep(c))
  const [shown, setShown] = useState(useNotes()?.expandExamples ? steps.length : 0)
  const listId = useId()
  const all = shown >= steps.length
  const title = (
    <>
      {node.attrs.level && <span className={cn('nb-level', `nb-level-${node.attrs.level}`)}>{LEVEL[node.attrs.level]}</span>}
      {label(node, 'title')}
    </>
  )
  if (!steps.length)
    return (
      <Frame node={node} icon="edit" kicker="Example" title={title}>
        <Nodes nodes={node.c.filter((c) => c !== answer)} />
        {answer && (
          <div className="nb-ex-answer">
            <span className="nb-ex-answer-label">Answer</span>
            <div>
              <Nodes nodes={answer.c} />
            </div>
          </div>
        )}
      </Frame>
    )
  return (
    <Frame node={node} icon="edit" kicker="Worked example" title={title} className="nb-example--steps">
      <div className="nb-ex-problem">
        <span className="nb-ex-problem-label">Problem</span>
        <Nodes nodes={problem} />
      </div>
      <ol className="nb-ex-steps" id={listId} aria-live="polite">
        {steps.map((st, i) => (
          <li key={st.id} className="nb-ex-step" data-block-id={st.id} data-concealed={i >= shown || undefined}>
            <span className="nb-ex-n" aria-hidden="true">
              {i + 1}
            </span>
            <div className="nb-ex-step-body">
              <span className="sr-only">Step {i + 1}. </span>
              {st.label && (
                <p className="nb-ex-step-title">
                  <Inlines nodes={st.label} />
                </p>
              )}
              <Nodes nodes={st.c} />
              {st.attrs.why && (
                <p className="nb-ex-why">
                  <span className="nb-ex-why-label">Why:</span> {st.attrs.why}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {answer && (
        <div className="nb-ex-answer" data-concealed={!all || undefined}>
          <span className="nb-ex-answer-label">Answer</span>
          <div>
            <Nodes nodes={answer.c} />
          </div>
        </div>
      )}
      <div className="nb-ex-controls">
        {!all ? (
          <>
            <button type="button" className="nb-reveal nb-reveal--main" aria-controls={listId} onClick={() => setShown((n) => n + 1)}>
              <Icon name="play" className="size-4" aria-hidden="true" />
              {shown === 0 ? 'Reveal steps one by one' : `Next step (${shown + 1} of ${steps.length})`}
            </button>
            <button type="button" className="nb-reveal" aria-controls={listId} onClick={() => setShown(steps.length)}>
              <Icon name="list" className="size-4" aria-hidden="true" />
              Show all
            </button>
          </>
        ) : (
          <button type="button" className="nb-reveal" aria-controls={listId} onClick={() => setShown(0)}>
            <Icon name="refresh" className="size-4" aria-hidden="true" />
            Hide steps
          </button>
        )}
      </div>
    </Frame>
  )
}

/** "Concepts this tests": chips that jump to the blocks a PYQ draws on. */
function ConceptChips({ tests }: { tests?: string }) {
  const ctx = useNotes()
  const did = useDomId()
  const ids = (tests ?? '').split(/[\s,]+/).filter(Boolean)
  if (!ids.length) return null
  return (
    <div className="nb-concepts">
      <span className="nb-concepts-label">Concepts this tests</span>
      <ul>
        {ids.map((id) => (
          <li key={id}>
            <a href={`#${did(id)}`} className="nb-chip">
              {ctx?.concepts?.[id] ?? id}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PyqEmbedSlot({ id }: { id: string }) {
  const ctx = useNotes()
  return <PyqEmbed id={id} topics={ctx?.pyqTopics ?? []} />
}

function PracticeSlot({ node }: { node: DirectiveNode }) {
  const ctx = useNotes()
  const q = ctx?.practice[node.attrs.id!]
  return (
    <Frame node={node} as="div" icon="practice" kicker="Practice" title={q ? `${q.type} · ${q.marks ?? 1} mark${(q.marks ?? 1) === 1 ? '' : 's'}` : undefined}>
      {q ? <PracticeEmbed q={q} /> : <p className="nb-missing">This question is not available.</p>}
    </Frame>
  )
}

function VizSlot({ node }: { node: DirectiveNode }) {
  const ctx = useNotes()
  const did = useDomId()
  const spec = ctx?.viz[node.attrs.spec!]
  if (!spec) return null
  return (
    <div id={did(node.id)} data-block="viz" data-block-id={node.id} data-depth={node.depth} className="nb nb-viz">
      <VizBlock
        spec={spec}
        mode={node.attrs.mode === 'static' ? 'static' : 'animate'}
        caption={node.attrs.caption}
        cleanLines={ctx?.cleanLines ?? false}
        onCleanLines={(on) => ctx?.setCleanLines(on)}
      />
    </div>
  )
}
