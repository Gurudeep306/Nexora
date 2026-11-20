import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger, useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { useSite } from '@/context/SiteContext'
import { openAssistantEvent } from '@/context/AgentContext'
import { cn } from '@/lib/utils'
import { HIGHLIGHT_COLORS, useLessonHighlights, type Highlight as Mark, type HighlightColor } from '@/gate/notes/highlights'
import { describe, locate } from './anchor'
import './highlights.css'

/*
  Highlights and margin notes in a lesson.

  Select text and a small toolbar offers four colours, a note, copy and Ask AI.
  Tap a highlight to change its colour, write a note or remove it. The list
  button in the lesson header shows them all and jumps to each.

  Highlights are painted with the browser's Custom Highlight API, so the
  lesson's own markup is never changed (React keeps owning it). Each one is
  saved as its quote plus a little text on each side and found again on every
  visit (./anchor.ts). Text inside figures, questions, code and the hidden
  maths markup is not part of the text that can be highlighted.
*/

const SKIP = '.katex-mathml, .nr-figure, .nb-viz, .nb-lab, .qc, .np, pre, code, button, input, textarea, select, svg, script, style, .nr-check, .nr-listen'
const supportsPaint = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined'

type Index = { text: string; nodes: { node: Text; start: number }[] }

function buildIndex(root: HTMLElement): Index {
  const nodes: Index['nodes'] = []
  let text = ''
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    nodes.push({ node: n as Text, start: text.length })
    text += n.textContent ?? ''
  }
  return { text, nodes }
}

/** A DOM range as [start, end) in the index's text, or null when it holds no indexed text. */
function rangeToSpan(range: Range, idx: Index): [number, number] | null {
  let start = -1
  let end = -1
  for (const { node, start: at } of idx.nodes) {
    if (!range.intersectsNode(node)) continue
    const len = node.length
    const s = node === range.startContainer ? range.startOffset : 0
    const e = node === range.endContainer ? range.endOffset : len
    if (e <= s) continue
    if (start === -1) start = at + s
    end = at + e
  }
  return start === -1 || end <= start ? null : [start, end]
}

function spanToRange(start: number, end: number, idx: Index): Range | null {
  const find = (pos: number, isEnd: boolean) => {
    for (const { node, start: at } of idx.nodes) {
      const len = node.length
      if (pos < at + len || (isEnd && pos === at + len)) return { node, offset: pos - at }
    }
    return null
  }
  const a = find(start, false)
  const b = find(end, true)
  if (!a || !b) return null
  const r = document.createRange()
  r.setStart(a.node, a.offset)
  r.setEnd(b.node, b.offset)
  return r
}

function caretOffset(x: number, y: number, idx: Index): number | null {
  const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }
  let node: Node | null = null
  let offset = 0
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y)
    if (p) ({ offsetNode: node, offset } = p)
  } else if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y)
    if (r) {
      node = r.startContainer
      offset = r.startOffset
    }
  }
  if (!node) return null
  const hit = idx.nodes.find((n) => n.node === node)
  return hit ? hit.start + offset : null
}

type Located = { h: Mark; start: number; end: number; range: Range | null }
type Pick = { start: number; end: number; x: number; y: number; below: boolean; block: string }
type Editing = { id: string; x: number; y: number }

export function LessonHighlights({ target, subject, lesson, enabled }: { target: RefObject<HTMLElement | null>; subject: string; lesson: string; enabled: boolean }) {
  const toast = useToast()
  const { featureOn } = useSite()
  const aiOn = featureOn('ai_tutor')
  const { hash } = useLocation()
  const { list, create, update, remove } = useLessonHighlights(subject, lesson, enabled)
  const [version, setVersion] = useState(0) // bumps when the lesson's text changes
  const [pick, setPick] = useState<Pick | null>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const idxRef = useRef<Index | null>(null)
  const prose = useCallback(() => target.current?.querySelector<HTMLElement>('.notes-prose') ?? null, [target])

  // The lesson's text changes when it renders (maths, lazy blocks): re-index then.
  useEffect(() => {
    if (!enabled) return
    const root = prose()
    if (!root) return
    let t = 0
    const bump = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => setVersion((v) => v + 1), 150)
    }
    const mo = new MutationObserver((records) => {
      if (records.some((r) => !(r.target instanceof Element ? r.target : r.target.parentElement)?.closest(SKIP))) bump()
    })
    mo.observe(root, { childList: true, subtree: true, characterData: true })
    bump()
    return () => {
      mo.disconnect()
      window.clearTimeout(t)
    }
  }, [enabled, prose, subject, lesson])

  // Where each highlight sits in the current text.
  const { index, located } = useMemo<{ index: Index | null; located: Located[] }>(() => {
    void version
    const root = prose()
    if (!enabled || !root) return { index: null, located: [] }
    const idx = buildIndex(root)
    return {
      index: idx,
      located: list.map((h) => {
        const at = locate(idx.text, h.quote, h.prefix, h.suffix)
        return at < 0 ? { h, start: -1, end: -1, range: null } : { h, start: at, end: at + h.quote.length, range: spanToRange(at, at + h.quote.length, idx) }
      }),
    }
  }, [list, version, enabled, prose])
  useEffect(() => {
    idxRef.current = index
  }, [index])

  // Paint them.
  useEffect(() => {
    if (!supportsPaint) return
    const reg = (CSS as unknown as { highlights: Map<string, Highlight> }).highlights
    for (const c of HIGHLIGHT_COLORS) {
      const ranges = located.filter((l) => l.range && l.h.color === c.id).map((l) => l.range!)
      if (ranges.length) reg.set(`nx-hl-${c.id}`, new Highlight(...ranges))
      else reg.delete(`nx-hl-${c.id}`)
    }
    const noted = located.filter((l) => l.range && l.h.note.trim()).map((l) => l.range!)
    if (noted.length) reg.set('nx-hl-note', new Highlight(...noted))
    else reg.delete('nx-hl-note')
    return () => {
      for (const c of HIGHLIGHT_COLORS) reg.delete(`nx-hl-${c.id}`)
      reg.delete('nx-hl-note')
    }
  }, [located])

  // Selecting text in the lesson shows the toolbar.
  useEffect(() => {
    if (!enabled) return
    const root = prose()
    if (!root) return
    // The toolbar has its own Ask AI; the page-wide one steps aside here.
    root.setAttribute('data-agent-ignore', '')
    let timer = 0
    const read = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return setPick(null)
        const range = sel.getRangeAt(0)
        const a = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement
        const b = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement
        if (!a || !b || !root.contains(a) || !root.contains(b)) return setPick(null)
        const idx = idxRef.current ?? buildIndex(root)
        idxRef.current = idx
        const span = rangeToSpan(range, idx)
        if (!span || !idx.text.slice(span[0], span[1]).trim()) return setPick(null)
        const r = range.getBoundingClientRect()
        const coarse = window.matchMedia('(pointer: coarse)').matches
        const below = coarse || r.top < 70
        const x = Math.min(Math.max(r.left + r.width / 2, 120), window.innerWidth - 120)
        const y = below ? Math.min(r.bottom + 10, window.innerHeight - 60) : r.top - 10
        setPick({ start: span[0], end: span[1], x, y, below, block: a.closest('[data-block-id]')?.getAttribute('data-block-id') ?? '' })
      }, 120)
    }
    const clear = () => setPick(null)
    document.addEventListener('mouseup', read)
    document.addEventListener('keyup', read)
    document.addEventListener('touchend', read)
    window.addEventListener('scroll', clear, { passive: true })
    return () => {
      root.removeAttribute('data-agent-ignore')
      window.clearTimeout(timer)
      document.removeEventListener('mouseup', read)
      document.removeEventListener('keyup', read)
      document.removeEventListener('touchend', read)
      window.removeEventListener('scroll', clear)
    }
  }, [enabled, prose, version])

  // Clicking highlighted text opens its editor.
  useEffect(() => {
    if (!enabled) return
    const root = prose()
    if (!root) return
    const onClick = (e: MouseEvent) => {
      if (!window.getSelection()?.isCollapsed) return
      const idx = idxRef.current
      if (!idx) return
      const at = caretOffset(e.clientX, e.clientY, idx)
      if (at == null) return
      const hit = located.find((l) => l.start >= 0 && at >= l.start && at < l.end)
      if (hit) setEditing({ id: hit.h.id, x: e.clientX, y: e.clientY })
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [enabled, prose, located])

  const flash = (l: Located) => {
    if (!l.range) return
    const el = l.range.startContainer.parentElement
    el?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    if (supportsPaint) {
      const reg = (CSS as unknown as { highlights: Map<string, Highlight> }).highlights
      reg.set('nx-hl-flash', new Highlight(l.range))
      window.setTimeout(() => reg.delete('nx-hl-flash'), 1400)
    }
  }

  // A link to one highlight (#hl=<id>, from the Notebook) jumps to it once found.
  const jumped = useRef<string | null>(null)
  useEffect(() => {
    const id = /^#hl=([\w-]+)$/.exec(hash)?.[1]
    if (!id || jumped.current === id) return
    const l = located.find((x) => x.h.id === id && x.range)
    if (!l) return
    jumped.current = id
    window.setTimeout(() => flash(l), 200)
  }, [hash, located])

  const save = async (color: HighlightColor, thenEdit: boolean) => {
    const idx = idxRef.current
    if (!pick || !idx) return
    const p = { ...pick }
    // A highlight never cuts a word in half: widen it to whole words.
    const word = /[\p{L}\p{N}]/u
    while (p.start > 0 && word.test(idx.text[p.start - 1]) && word.test(idx.text[p.start])) p.start--
    while (p.end < idx.text.length && word.test(idx.text[p.end]) && word.test(idx.text[p.end - 1])) p.end++
    setPick(null)
    window.getSelection()?.removeAllRanges()
    try {
      const made = await create({ ...describe(idx.text, p.start, p.end), block: p.block, color })
      if (thenEdit) setEditing({ id: made.id, x: p.x, y: p.below ? p.y : p.y + 20 })
    } catch {
      toast.error('Could not save the highlight', 'Check your connection and try again.')
    }
  }

  const selectedText = () => (pick && idxRef.current ? idxRef.current.text.slice(pick.start, pick.end) : '')

  if (!enabled) return null
  const edit = editing ? list.find((h) => h.id === editing.id) : undefined

  return (
    <>
      <Popover open={listOpen} onOpenChange={setListOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={cn('nr-icon', list.length > 0 && 'is-on')} aria-label={list.length ? `Your highlights in this lesson: ${list.length}` : 'Your highlights in this lesson'} title="Highlights and notes">
            <Icon name="edit" className="size-4" aria-hidden="true" />
            {list.length > 0 && <span className="nr-hl-count">{list.length}</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} aria-label="Highlights and notes" className="nr-hl-list w-[340px] max-w-[calc(100vw-16px)] p-0">
          <div className="nr-hl-list-head">
            <p className="m-0">Highlights and notes</p>
            <span>{list.length}</span>
          </div>
          {list.length === 0 ? (
            <p className="nr-hl-empty">Select any sentence in the lesson to highlight it or add a note. They are saved to your account.</p>
          ) : (
            <ul className="nr-hl-items">
              {located.map((l) => (
                <li key={l.h.id}>
                  <button
                    type="button"
                    className="nr-hl-item"
                    disabled={!l.range}
                    onClick={() => {
                      setListOpen(false)
                      flash(l)
                    }}
                  >
                    <span className="nr-hl-swatch" data-c={l.h.color} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="nr-hl-quote">{l.h.quote}</span>
                      {l.h.note.trim() && <span className="nr-hl-note">{l.h.note}</span>}
                      {!l.range && <span className="nr-hl-gone">This passage changed since you highlighted it.</span>}
                    </span>
                  </button>
                  <button type="button" className="nr-hl-del" aria-label="Remove this highlight" title="Remove" onClick={() => void remove(l.h.id)}>
                    <Icon name="delete" className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!supportsPaint && list.length > 0 && <p className="nr-hl-empty">This browser cannot colour the text itself; your highlights are listed here.</p>}
        </PopoverContent>
      </Popover>

      {pick &&
        createPortal(
          <div className={cn('nr-hl-bar', pick.below && 'is-below')} style={{ left: pick.x, top: pick.y }} role="toolbar" aria-label="Highlight the selected text" onPointerDown={(e) => e.preventDefault()}>
            {HIGHLIGHT_COLORS.map((c) => (
              <button key={c.id} type="button" className="nr-hl-dot" data-c={c.id} aria-label={`Highlight in ${c.label.toLowerCase()}`} title={c.label} onClick={() => void save(c.id, false)} />
            ))}
            <span className="nr-hl-sep" aria-hidden="true" />
            <button type="button" className="nr-hl-act" onClick={() => void save('yellow', true)}>
              <Icon name="edit" className="size-3.5" aria-hidden="true" /> Note
            </button>
            <button
              type="button"
              className="nr-hl-act"
              aria-label="Copy the selected text"
              onClick={() => {
                const t = selectedText()
                void navigator.clipboard?.writeText(t).then(() => toast.success('Copied'))
                setPick(null)
              }}
            >
              <Icon name="copy" className="size-3.5" aria-hidden="true" />
            </button>
            {aiOn && (
              <button
                type="button"
                className="nr-hl-act"
                onClick={() => {
                  const t = selectedText()
                  setPick(null)
                  window.getSelection()?.removeAllRanges()
                  const q = t.length > 600 ? `${t.slice(0, 600)}…` : t
                  openAssistantEvent(`Explain this from the lesson:\n\n> ${q.replace(/\n+/g, '\n> ')}`)
                }}
              >
                <Icon name="sparkles" className="size-3.5" aria-hidden="true" /> Ask AI
              </button>
            )}
          </div>,
          document.body,
        )}

      {edit && editing && createPortal(<Editor key={edit.id} h={edit} at={editing} onClose={() => setEditing(null)} onUpdate={update} onRemove={remove} />, document.body)}
    </>
  )
}

function Editor({ h, at, onClose, onUpdate, onRemove }: { h: Mark; at: Editing; onClose: () => void; onUpdate: (id: string, p: { color?: HighlightColor; note?: string }) => Promise<void>; onRemove: (id: string) => Promise<void> }) {
  const toast = useToast()
  const [note, setNote] = useState(h.note)
  const box = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const w = Math.min(320, window.innerWidth - 16)
  const left = Math.min(Math.max(at.x - w / 2, 8), window.innerWidth - w - 8)
  const top = at.y + 16 + 230 > window.innerHeight ? Math.max(8, at.y - 16 - 230) : at.y + 16

  const commit = useCallback(async () => {
    if (note !== h.note) {
      try {
        await onUpdate(h.id, { note })
      } catch {
        toast.error('Could not save the note')
        return
      }
    }
    onClose()
  }, [note, h.note, h.id, onUpdate, onClose, toast])

  useEffect(() => {
    area.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && void commit()
    const out = (e: PointerEvent) => box.current && !box.current.contains(e.target as Node) && void commit()
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', out)
    return () => {
      document.removeEventListener('keydown', key)
      document.removeEventListener('pointerdown', out)
    }
  }, [commit])

  return (
    <div ref={box} className="nr-hl-editor" style={{ left, top, width: w }} role="dialog" aria-label="Edit highlight">
      <div className="nr-hl-editor-row">
        {HIGHLIGHT_COLORS.map((c) => (
          <button key={c.id} type="button" className={cn('nr-hl-dot', h.color === c.id && 'is-on')} data-c={c.id} aria-label={c.label} aria-pressed={h.color === c.id} onClick={() => void onUpdate(h.id, { color: c.id })} />
        ))}
        <button
          type="button"
          className="nr-hl-act ml-auto"
          onClick={() => {
            void onRemove(h.id)
            onClose()
          }}
        >
          <Icon name="delete" className="size-3.5" aria-hidden="true" /> Remove
        </button>
      </div>
      <label className="sr-only" htmlFor={`hl-note-${h.id}`}>
        Your note
      </label>
      <textarea
        id={`hl-note-${h.id}`}
        ref={area}
        value={note}
        maxLength={2000}
        rows={3}
        placeholder="Add a note in your own words…"
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void commit()
        }}
      />
      <div className="nr-hl-editor-foot">
        <span>{note.length > 1800 ? `${2000 - note.length} left` : 'Saved to your account'}</span>
        <button type="button" className="nr-hl-save" onClick={() => void commit()}>
          Done
        </button>
      </div>
    </div>
  )
}
