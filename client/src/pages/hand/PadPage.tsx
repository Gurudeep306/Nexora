import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LogoMark } from '@/components/brand/Logo'
import { handApi, type DeviceInfo } from '@/components/hand/api'
import { cn } from '@/lib/utils'
import { COLORS, ERASER_R, GAP, H, SIZES, TONES, W, colorOf, drawStroke, measureQuestion, renderPage, type Page, type PaperStyle, type PaperTone, type QuestionArt, type Stroke, type Tool } from './ink'
import './hand.css'

/*
  The writing pad: opened on a tablet (iPad, drawing pad) from a link made on
  the computer. It is a notebook: pages one under another, the question
  printed at the top of page 1 with the answer written below it.

    Write     a stylus or a finger (with a stylus in use, the palm is ignored)
    Move      two fingers drag the pages, a pinch zooms; the Move tool, the
              mouse wheel and the zoom buttons do the same
    Pages     the + button adds one; the current page is the one in view

  The screen is redrawn from the strokes at the current zoom, so writing stays
  sharp however far you zoom in. Pages are sent at full size (A4 at 150 dpi).
  Work is kept on the device as you write, so a reload loses nothing.
*/

type View = { x: number; y: number; s: number }
type Draft = { pages: Page[]; style: PaperStyle; tone: PaperTone; printQ: boolean }
const NO_STROKES: Page = []
const MAX_PAGES = 12
const draftKey = (token: string) => `nexora:pad:${token}`
const pageTop = (i: number) => i * (H + GAP)

export default function PadPage() {
  const { token = '' } = useParams()
  const [info, setInfo] = useState<DeviceInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    handApi
      .device(token)
      .then((r) => (r.mode === 'pad' ? setInfo(r) : setError('This link is for photos. Open it on your phone.')))
      .catch((e: Error) => setError(e.message || 'This link has expired. Make a new one on your computer.'))
  }, [token])

  if (error) return <DeviceMessage title="This link can't be used" body={error} />
  if (!info) return <DeviceMessage title="Opening your pad…" body="" busy />
  if (sent)
    return (
      <DeviceMessage
        title="Sent to your computer"
        body={`Your solution is on ${info.title}. You can close this tab, or write another one.`}
        done
        action={
          <button type="button" className="hw-btn hw-btn-main" onClick={() => setSent(false)}>
            Write another
          </button>
        }
      />
    )
  return (
    <Pad
      token={token}
      info={info}
      sending={sending}
      onSubmit={async (images) => {
        setSending(true)
        try {
          await handApi.send(token, images)
          try {
            localStorage.removeItem(draftKey(token))
          } catch {
            /* ignore */
          }
          setSent(true)
        } catch (e) {
          alert((e as Error).message || 'Could not send. Check the connection and try again.')
        } finally {
          setSending(false)
        }
      }}
    />
  )
}

function useQuestionArt(info: DeviceInfo): QuestionArt | null {
  const [images, setImages] = useState<(HTMLImageElement | null)[]>([])
  const q = info.question
  useEffect(() => {
    if (!q?.figures.length) return
    let live = true
    const list: (HTMLImageElement | null)[] = q.figures.map(() => null)
    q.figures.forEach((f, i) => {
      const img = new Image()
      img.onload = () => {
        if (!live) return
        list[i] = img
        setImages([...list])
      }
      img.src = f.src
    })
    return () => {
      live = false
    }
  }, [q])
  return useMemo(() => (q ? { q, title: info.title, images } : null), [q, info.title, images])
}

function Pad({ token, info, sending, onSubmit }: { token: string; info: DeviceInfo; sending: boolean; onSubmit: (images: string[]) => void }) {
  const saved = useMemo<Draft | null>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(draftKey(token)) || 'null') as Draft | null
      return v && Array.isArray(v.pages) ? v : null
    } catch {
      return null
    }
  }, [token])
  const [pages, setPages] = useState<Page[]>(saved?.pages?.length ? saved.pages : [[]])
  const [style, setStyle] = useState<PaperStyle>(saved?.style ?? 'ruled')
  const [tone, setTone] = useState<PaperTone>(saved?.tone ?? 'white')
  const [printQ, setPrintQ] = useState(saved?.printQ ?? true)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('ink')
  const [sizeIx, setSizeIx] = useState(1)
  const [penOnly, setPenOnly] = useState(false)
  const [menu, setMenu] = useState<null | 'paper' | 'page'>(null)
  const [undo, setUndo] = useState<Page[][]>([])
  const [redo, setRedo] = useState<Page[][]>([])
  const [view, setView] = useState<View>({ x: 0, y: 0, s: 0.5 })
  const [full, setFull] = useState(false)

  const art = useQuestionArt(info)
  const question = useMemo(() => (art && printQ ? { art, top: measureQuestion(art, tone) } : null), [art, printQ, tone])

  const port = useRef<HTMLDivElement>(null)
  const base = useRef<HTMLCanvasElement>(null)
  const live = useRef<HTMLCanvasElement>(null)
  const size = useRef({ w: 800, h: 1000 })
  const [portSize, setPortSize] = useState({ w: 800, h: 1000 })
  const viewRef = useRef(view)
  const pagesRef = useRef(pages)
  const penOnlyRef = useRef(penOnly)
  // Handlers read the latest values through refs, kept in step before paint.
  useLayoutEffect(() => {
    viewRef.current = view
    pagesRef.current = pages
    penOnlyRef.current = penOnly
  }, [view, pages, penOnly])
  const fitted = useRef(false)

  /* ── The view: fit the page width, keep it in reach ── */
  const clampView = useCallback((v: View): View => {
    const { w, h } = size.current
    const s = Math.min(4, Math.max(0.15, v.s))
    const docH = pagesRef.current.length * (H + GAP) - GAP
    const x = Math.min(w * 0.6, Math.max(w * 0.4 - W * s, v.x))
    const y = Math.min(h * 0.6, Math.max(h * 0.4 - docH * s, v.y))
    return { x, y, s }
  }, [])
  const fitWidth = useCallback(() => {
    const { w } = size.current
    const s = Math.min((w - 32) / W, 1.2)
    setView((v) => clampView({ s, x: (w - W * s) / 2, y: v.s === s ? v.y : 16 }))
  }, [clampView])

  // Size the canvases to the viewport.
  useEffect(() => {
    const el = port.current
    if (!el) return
    const resize = () => {
      const r = el.getBoundingClientRect()
      size.current = { w: r.width, h: r.height }
      setPortSize({ w: r.width, h: r.height })
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      for (const c of [base.current, live.current]) {
        if (!c) continue
        c.width = Math.round(r.width * dpr)
        c.height = Math.round(r.height * dpr)
        c.style.width = `${r.width}px`
        c.style.height = `${r.height}px`
      }
      if (!fitted.current) {
        fitted.current = true
        const s = Math.min((r.width - 32) / W, 1.2)
        setView({ s, x: (r.width - W * s) / 2, y: 16 })
      } else setView((v) => ({ ...v }))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ── Drawing the visible pages at the current zoom ── */
  const paint = useCallback(() => {
    const c = base.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const dpr = c.width / Math.max(1, size.current.w)
    const v = viewRef.current
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    pagesRef.current.forEach((page, i) => {
      const top = v.y + pageTop(i) * v.s
      if (top > size.current.h || top + H * v.s < 0) return
      ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.x, dpr * top)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, W, H)
      ctx.clip()
      renderPage(ctx, page, style, tone, i === 0 ? question : null)
      ctx.restore()
    })
  }, [style, tone, question])
  useEffect(() => {
    const id = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(id)
  }, [paint, pages, view])

  /* ── Where a point on screen falls: page and position on it ── */
  const locate = (cx: number, cy: number) => {
    const r = port.current!.getBoundingClientRect()
    const v = viewRef.current
    const dx = (cx - r.left - v.x) / v.s
    const dy = (cy - r.top - v.y) / v.s
    const i = Math.floor(dy / (H + GAP))
    const y = dy - pageTop(i)
    if (i < 0 || i >= pagesRef.current.length || y > H || dx < 0 || dx > W) return null
    return { i, x: dx, y }
  }

  const commit = (next: Page[]) => {
    setUndo((u) => [...u.slice(-80), pagesRef.current])
    setRedo([])
    setPages(next)
  }
  const replacePage = (all: Page[], i: number, p: Page) => all.map((x, j) => (j === i ? p : x))

  /* ── Pointers: write, erase, move and zoom ── */
  type Draw = { id: number; page: number; stroke: Stroke | null; erased: boolean; before: Page[]; at: number }
  const pointers = useRef(new Map<number, { x: number; y: number; type: string }>())
  const drawing = useRef<Draw | null>(null)
  const gesture = useRef<{ start: View; mid: { x: number; y: number }; dist: number; ids: number[] } | null>(null)

  const paintLive = (d: Draw) => {
    const c = live.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    if (!d.stroke) return
    const dpr = c.width / Math.max(1, size.current.w)
    const v = viewRef.current
    ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.x, dpr * (v.y + pageTop(d.page) * v.s))
    drawStroke(ctx, d.stroke, tone)
  }
  const clearLive = () => {
    const c = live.current
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
  }
  const pressureOf = (e: PointerEvent) => (e.pointerType === 'pen' ? Math.max(0.05, e.pressure || 0.5) : 0.5)

  const eraseOn = (all: Page[], i: number, x: number, y: number) => {
    const r = ERASER_R[sizeIx]
    const page = all[i]
    const kept = page.filter((s) => !s.pts.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 < (r + s.size / 2) ** 2))
    return kept.length === page.length ? all : replacePage(all, i, kept)
  }

  const startGesture = () => {
    const ids = [...pointers.current.keys()].slice(-2)
    const pts = ids.map((id) => pointers.current.get(id)!)
    const r = port.current!.getBoundingClientRect()
    const mid = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length - r.left, y: pts.reduce((a, p) => a + p.y, 0) / pts.length - r.top }
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
    gesture.current = { start: viewRef.current, mid, dist, ids }
  }

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    setMenu(null)
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType })
    if (e.pointerType === 'pen' && !penOnlyRef.current) setPenOnly(true)
    const touches = [...pointers.current.values()].filter((p) => p.type === 'touch').length

    // Fingers move the pages: always with two, and with one when a stylus
    // writes or the Move tool is on. A stroke a second finger interrupts
    // within a moment was the start of a pinch, so it is dropped.
    if (e.pointerType === 'touch' && (touches >= 2 || penOnlyRef.current || tool === 'hand')) {
      const d = drawing.current
      if (d && d.stroke && Date.now() - d.at < 400) {
        drawing.current = null
        clearLive()
      } else if (d) return
      startGesture()
      return
    }
    if (tool === 'hand' || e.button === 1 || (e.pointerType === 'mouse' && e.button !== 0)) {
      startGesture()
      return
    }
    if (drawing.current) return
    const at = locate(e.clientX, e.clientY)
    if (!at) return
    if (tool === 'eraser') {
      const after = eraseOn(pagesRef.current, at.i, at.x, at.y)
      drawing.current = { id: e.pointerId, page: at.i, stroke: null, erased: after !== pagesRef.current, before: pagesRef.current, at: Date.now() }
      if (after !== pagesRef.current) setPages(after)
      return
    }
    const stroke: Stroke = { tool, color, size: SIZES[tool][sizeIx], pts: [[at.x, at.y, pressureOf(e.nativeEvent)]] }
    drawing.current = { id: e.pointerId, page: at.i, stroke, erased: false, before: pagesRef.current, at: Date.now() }
    paintLive(drawing.current)
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType })
    const g = gesture.current
    if (g && g.ids.includes(e.pointerId)) {
      const pts = g.ids.map((id) => pointers.current.get(id)).filter(Boolean) as { x: number; y: number }[]
      const r = port.current!.getBoundingClientRect()
      const mid = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length - r.left, y: pts.reduce((a, p) => a + p.y, 0) / pts.length - r.top }
      const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
      const s = g.dist && dist ? Math.min(4, Math.max(0.15, (g.start.s * dist) / g.dist)) : g.start.s
      // The point under the fingers stays under the fingers.
      const k = s / g.start.s
      setView(clampView({ s, x: mid.x - (g.mid.x - g.start.x) * k, y: mid.y - (g.mid.y - g.start.y) * k }))
      return
    }
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    const events = e.nativeEvent.getCoalescedEvents?.().length ? e.nativeEvent.getCoalescedEvents() : [e.nativeEvent]
    const r = port.current!.getBoundingClientRect()
    const v = viewRef.current
    const toPage = (ev: PointerEvent) => [(ev.clientX - r.left - v.x) / v.s, (ev.clientY - r.top - v.y) / v.s - pageTop(d.page)] as const
    if (tool === 'eraser') {
      let all = pagesRef.current
      for (const ev of events) {
        const [x, y] = toPage(ev)
        all = eraseOn(all, d.page, x, y)
      }
      if (all !== pagesRef.current) {
        d.erased = true
        setPages(all)
      }
      return
    }
    const s = d.stroke!
    if (s.tool === 'line') {
      const [x, y] = toPage(events[events.length - 1])
      s.pts = [s.pts[0], [x, y, 0.5]]
    } else {
      for (const ev of events) {
        const [x, y] = toPage(ev)
        const last = s.pts[s.pts.length - 1]
        if ((x - last[0]) ** 2 + (y - last[1]) ** 2 < 0.8 / (v.s * v.s)) continue
        s.pts.push([x, y, pressureOf(ev)])
      }
    }
    paintLive(d)
  }

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (g && g.ids.includes(e.pointerId)) {
      gesture.current = null
      // One finger still down after a pinch keeps moving the pages.
      if (pointers.current.size && [...pointers.current.values()].every((p) => p.type === 'touch')) startGesture()
      return
    }
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    drawing.current = null
    clearLive()
    if (tool === 'eraser') {
      if (d.erased) {
        setUndo((u) => [...u.slice(-80), d.before])
        setRedo([])
      }
      return
    }
    const s = d.stroke!
    const clean = { ...s, pts: s.pts.map(([x, y, p]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(p * 100) / 100] as [number, number, number]) }
    commit(replacePage(pagesRef.current, d.page, [...pagesRef.current[d.page], clean]))
  }

  // Wheel and trackpad: scroll moves, ctrl/⌘ (or a pinch on a trackpad) zooms.
  useEffect(() => {
    const el = port.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const v = viewRef.current
      if (e.ctrlKey || e.metaKey) {
        const s = Math.min(4, Math.max(0.15, v.s * Math.exp(-e.deltaY * 0.01)))
        const k = s / v.s
        const mx = e.clientX - r.left
        const my = e.clientY - r.top
        setView(clampView({ s, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k }))
      } else setView(clampView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }
    // Safari's own page pinch would zoom the whole tool.
    const stop = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', wheel, { passive: false })
    document.addEventListener('gesturestart', stop)
    return () => {
      el.removeEventListener('wheel', wheel)
      document.removeEventListener('gesturestart', stop)
    }
  }, [clampView])

  const zoomBy = (k: number) => {
    const { w, h } = size.current
    const v = viewRef.current
    const s = Math.min(4, Math.max(0.15, v.s * k))
    const f = s / v.s
    setView(clampView({ s, x: w / 2 - (w / 2 - v.x) * f, y: h / 2 - (h / 2 - v.y) * f }))
  }

  /* ── The page in view, adding and removing pages ── */
  const current = Math.min(pages.length - 1, Math.max(0, Math.floor((portSize.h / 2 - view.y) / view.s / (H + GAP))))
  const goTo = (i: number) => setView((v) => clampView({ ...v, y: 16 - pageTop(i) * v.s }))
  const addPage = () => {
    if (pages.length >= MAX_PAGES) return
    commit([...pages, []])
    setMenu(null)
    requestAnimationFrame(() => goTo(pages.length))
  }
  const clearPage = () => {
    if (!pages[current].length) return
    if (confirm(`Clear everything on page ${current + 1}?`)) commit(replacePage(pages, current, []))
    setMenu(null)
  }
  const deletePage = () => {
    if (pages.length === 1) return clearPage()
    if (pages[current].length && !confirm(`Delete page ${current + 1}?`)) return
    commit(pages.filter((_, i) => i !== current))
    setMenu(null)
  }

  const doUndo = () => {
    if (!undo.length) return
    setRedo((r) => [...r, pages])
    setPages(undo[undo.length - 1])
    setUndo((u) => u.slice(0, -1))
  }
  const doRedo = () => {
    if (!redo.length) return
    setUndo((u) => [...u, pages])
    setPages(redo[redo.length - 1])
    setRedo((r) => r.slice(0, -1))
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z') {
        e.preventDefault()
        if (e.shiftKey) doRedo()
        else doUndo()
      } else if (k === '=' || k === '+') {
        e.preventDefault()
        zoomBy(1.2)
      } else if (k === '-') {
        e.preventDefault()
        zoomBy(1 / 1.2)
      } else if (k === '0') {
        e.preventDefault()
        fitWidth()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  // Keep the work on this device.
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey(token), JSON.stringify({ pages, style, tone, printQ }))
      } catch {
        /* storage full: the work is still on screen */
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [pages, style, tone, printQ, token])

  // Live view: a small picture of the page in view goes to the computer.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const c = document.createElement('canvas')
      c.width = 620
      c.height = Math.round((620 * H) / W)
      const ctx = c.getContext('2d')!
      ctx.scale(620 / W, 620 / W)
      renderPage(ctx, pages[current] ?? NO_STROKES, style, tone, current === 0 ? question : null)
      void handApi.sendPreview(token, c.toDataURL('image/jpeg', 0.6)).catch(() => {})
    }, 1200)
    return () => window.clearTimeout(t)
  }, [pages, current, style, tone, question, token])

  // Full screen, where the browser allows it (more room to write).
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const canFull = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen
  const toggleFull = () => (document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen?.().catch(() => {}))

  const written = pages.map((p, i) => ({ p, i })).filter(({ p }) => p.length > 0)
  const submit = () => {
    if (!written.length || sending) return
    if (!confirm(`Send ${written.length} ${written.length === 1 ? 'page' : 'pages'} to your computer?`)) return
    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    const ctx = out.getContext('2d')!
    const images = written.map(({ p, i }) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      renderPage(ctx, p, style, tone, i === 0 ? question : null)
      return out.toDataURL('image/png')
    })
    onSubmit(images)
  }

  const sizes = tool === 'eraser' ? ERASER_R : tool === 'hand' ? [] : SIZES[tool]
  const docBottom = view.y + (pages.length * (H + GAP) - GAP) * view.s

  return (
    <div className="hw-pad" data-tone={tone}>
      <header className="hw-bar" role="toolbar" aria-label="Writing tools">
        <div className="hw-group" role="radiogroup" aria-label="Tool">
          {(['pen', 'pencil', 'line', 'marker', 'eraser', 'hand'] as Tool[]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tool === t} className={cn('hw-tool', tool === t && 'is-on')} onClick={() => setTool(t)} aria-label={TOOL_LABEL[t]} title={TOOL_LABEL[t]}>
              <ToolIcon tool={t} />
            </button>
          ))}
        </div>
        <span className="hw-sep" aria-hidden="true" />
        <div className="hw-group hw-colors" role="radiogroup" aria-label="Colour">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={color === c.id}
              aria-label={c.label}
              title={c.label}
              className={cn('hw-swatch', color === c.id && 'is-on')}
              style={{ background: colorOf(c.id, tone) }}
              onClick={() => {
                setColor(c.id)
                if (tool === 'eraser' || tool === 'hand') setTool('pen')
              }}
            />
          ))}
        </div>
        {sizes.length > 0 && (
          <>
            <span className="hw-sep" aria-hidden="true" />
            <div className="hw-group" role="radiogroup" aria-label="Size">
              {sizes.map((_, i) => (
                <button key={i} type="button" role="radio" aria-checked={sizeIx === i} aria-label={['Fine', 'Medium', 'Bold'][i]} title={['Fine', 'Medium', 'Bold'][i]} className={cn('hw-size', sizeIx === i && 'is-on')} onClick={() => setSizeIx(i)}>
                  <span style={{ width: 6 + i * 6, height: 6 + i * 6 }} />
                </button>
              ))}
            </div>
          </>
        )}
        <span className="hw-sep" aria-hidden="true" />
        <div className="hw-group">
          <button type="button" className="hw-tool" onClick={doUndo} disabled={!undo.length} aria-label="Undo" title="Undo (⌘Z)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />
            </svg>
          </button>
          <button type="button" className="hw-tool" onClick={doRedo} disabled={!redo.length} aria-label="Redo" title="Redo (⇧⌘Z)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" />
            </svg>
          </button>
          <button type="button" className="hw-tool" onClick={addPage} disabled={pages.length >= MAX_PAGES} aria-label="Add a page" title="Add a page">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 11v6M9 14h6" />
            </svg>
          </button>
        </div>
        <div className="hw-group hw-push">
          <div className="hw-menu-wrap">
            <button type="button" className={cn('hw-chip', menu === 'paper' && 'is-on')} onClick={() => setMenu(menu === 'paper' ? null : 'paper')} aria-expanded={menu === 'paper'}>
              Paper
            </button>
            {menu === 'paper' && (
              <div className="hw-menu" role="dialog" aria-label="Paper">
                <p className="hw-menu-k">Lines</p>
                <div className="hw-menu-row">
                  {(['blank', 'ruled', 'grid', 'dots'] as PaperStyle[]).map((p) => (
                    <button key={p} type="button" className={cn('hw-opt', style === p && 'is-on')} aria-pressed={style === p} onClick={() => setStyle(p)}>
                      <PaperIcon style={p} />
                      {p[0].toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="hw-menu-k">Colour</p>
                <div className="hw-menu-row">
                  {(Object.keys(TONES) as PaperTone[]).map((t) => (
                    <button key={t} type="button" className={cn('hw-opt', tone === t && 'is-on')} aria-pressed={tone === t} onClick={() => setTone(t)}>
                      <span className="hw-tone" style={{ background: TONES[t].paper }} />
                      {TONES[t].label}
                    </button>
                  ))}
                </div>
                {art && (
                  <label className="hw-check">
                    <input type="checkbox" checked={printQ} onChange={(e) => setPrintQ(e.target.checked)} />
                    Print the question at the top of page 1
                  </label>
                )}
                <label className="hw-check">
                  <input type="checkbox" checked={penOnly} onChange={(e) => setPenOnly(e.target.checked)} />
                  Stylus only (fingers move the page)
                </label>
              </div>
            )}
          </div>
          <div className="hw-menu-wrap">
            <button type="button" className={cn('hw-chip', menu === 'page' && 'is-on')} onClick={() => setMenu(menu === 'page' ? null : 'page')} aria-expanded={menu === 'page'}>
              Page {current + 1}/{pages.length}
            </button>
            {menu === 'page' && (
              <div className="hw-menu hw-menu-pages" role="dialog" aria-label="Pages">
                <div className="hw-thumbs">
                  {pages.map((p, i) => (
                    <button key={i} type="button" className={cn('hw-thumb', i === current && 'is-on')} onClick={() => (goTo(i), setMenu(null))} aria-label={`Go to page ${i + 1}${p.length ? '' : ', empty'}`}>
                      <span>{i + 1}</span>
                    </button>
                  ))}
                  {pages.length < MAX_PAGES && (
                    <button type="button" className="hw-thumb hw-thumb-add" onClick={addPage} aria-label="Add a page">
                      +
                    </button>
                  )}
                </div>
                <button type="button" className="hw-opt hw-wide" onClick={clearPage}>
                  Clear page {current + 1}
                </button>
                {pages.length > 1 && (
                  <button type="button" className="hw-opt hw-wide hw-danger" onClick={deletePage}>
                    Delete page {current + 1}
                  </button>
                )}
              </div>
            )}
          </div>
          {canFull && (
            <button type="button" className="hw-tool" onClick={toggleFull} aria-label={full ? 'Leave full screen' : 'Full screen'} title={full ? 'Leave full screen' : 'Full screen'}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={full ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'} />
              </svg>
            </button>
          )}
          <button type="button" className="hw-btn hw-btn-main" onClick={submit} disabled={!written.length || sending}>
            {sending ? 'Sending…' : 'Submit'}
          </button>
        </div>
      </header>

      <div
        ref={port}
        className={cn('hw-port', tool === 'hand' ? 'is-hand' : tool === 'eraser' ? 'is-eraser' : 'is-ink')}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
        role="application"
        aria-label={`Your notebook, ${pages.length} ${pages.length === 1 ? 'page' : 'pages'}. Write with a stylus or finger; two fingers move and zoom.`}
      >
        <canvas ref={base} className="hw-canvas" aria-hidden="true" />
        <canvas ref={live} className="hw-canvas" aria-hidden="true" />
        {pages.length < MAX_PAGES && docBottom < portSize.h + 80 && (
          <button type="button" className="hw-addpage" style={{ top: docBottom + 18, left: view.x + (W * view.s) / 2 }} onClick={addPage}>
            + Add a page
          </button>
        )}
      </div>

      <footer className="hw-foot">
        <LogoMark size={16} intro={false} />
        <span className="truncate">
          {info.title} · {info.name}
        </span>
        <span className="hw-zoom" role="group" aria-label="Zoom">
          <button type="button" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out" title="Zoom out (⌘−)">
            −
          </button>
          <button type="button" className="hw-zoom-pct" onClick={fitWidth} title="Fit the page width (⌘0)" aria-label={`Zoom ${Math.round(view.s * 100)}%. Fit the page width`}>
            {Math.round(view.s * 100)}%
          </button>
          <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in" title="Zoom in (⌘+)">
            +
          </button>
        </span>
      </footer>
    </div>
  )
}

const TOOL_LABEL: Record<Tool, string> = { pen: 'Pen', pencil: 'Pencil', line: 'Straight line', marker: 'Marker', eraser: 'Eraser', hand: 'Move the page' }

function ToolIcon({ tool }: { tool: Tool }) {
  const d: Record<Tool, string> = {
    pen: 'M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4zM14 7l3 3',
    pencil: 'M4 20l1-4L16 5l3 3L8 19l-4 1zM13 8l3 3M5 16l3 3',
    line: 'M5 19 19 5M5 19h.01M19 5h.01',
    marker: 'M9 15l-4 4h5l2-2M9 15l7-7 3 3-7 7M9 15l3 3',
    eraser: 'M8 20h12M4.5 15.5 13 7a2 2 0 0 1 2.8 0l2.7 2.7a2 2 0 0 1 0 2.8L11 20H8.5l-4-4a.7.7 0 0 1 0-.5z',
    hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.3 15a1.6 1.6 0 0 1 2.6-1.8L8 15',
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d[tool]} />
    </svg>
  )
}

function PaperIcon({ style }: { style: PaperStyle }) {
  return (
    <svg viewBox="0 0 20 24" className="hw-paper-ic" aria-hidden="true">
      <rect x="1" y="1" width="18" height="22" rx="2" />
      {style === 'ruled' && <path d="M4 8h12M4 12h12M4 16h12" />}
      {style === 'grid' && <path d="M7 1v22M13 1v22M1 8h18M1 15h18" />}
      {style === 'dots' && <path d="M6 7h.01M10 7h.01M14 7h.01M6 12h.01M10 12h.01M14 12h.01M6 17h.01M10 17h.01M14 17h.01" strokeWidth="2" />}
    </svg>
  )
}

export function DeviceMessage({ title, body, busy, done, action }: { title: string; body: string; busy?: boolean; done?: boolean; action?: React.ReactNode }) {
  return (
    <main className="hw-msg">
      <div className="hw-msg-card">
        {done ? (
          <span className="hw-msg-ok" aria-hidden="true">
            ✓
          </span>
        ) : (
          <LogoMark size={40} loop={busy} intro={false} />
        )}
        <h1>{title}</h1>
        {body && <p>{body}</p>}
        {action}
      </div>
    </main>
  )
}
