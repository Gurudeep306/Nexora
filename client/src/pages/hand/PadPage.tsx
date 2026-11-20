import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LogoMark } from '@/components/brand/Logo'
import { handApi, type DeviceInfo, type DeviceQuestion } from '@/components/hand/api'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { cn } from '@/lib/utils'
import './hand.css'

/*
  The writing pad: opened on a tablet (iPad, drawing pad) from a one-time link
  made on the computer. Pages are drawn in page units (A4 at 150 dpi) and
  scaled to the screen, so a page looks the same on any device and is sent at
  full size. Strokes keep the pen's pressure; with a stylus in use, the palm
  (touch) is ignored. Work is kept on the device as you write, so a reload
  loses nothing. Submit sends every page that has writing on it.
*/

const W = 1240
const H = 1754

type Tool = 'pen' | 'pencil' | 'line' | 'marker' | 'eraser'
type Pt = [number, number, number]
type Stroke = { tool: Exclude<Tool, 'eraser'>; color: string; size: number; pts: Pt[] }
type Page = Stroke[]
type PaperStyle = 'blank' | 'ruled' | 'grid' | 'dots'
type PaperTone = 'white' | 'cream' | 'dark'

const COLORS: { id: string; label: string; light: string; dark: string }[] = [
  { id: 'ink', label: 'Ink', light: '#1c1b19', dark: '#f3f0e8' },
  { id: 'blue', label: 'Blue', light: '#1f4fd1', dark: '#7aa2ff' },
  { id: 'red', label: 'Red', light: '#c62828', dark: '#ff7a70' },
  { id: 'green', label: 'Green', light: '#1b7a3e', dark: '#5fd38d' },
  { id: 'orange', label: 'Orange', light: '#d9620b', dark: '#ffa45c' },
  { id: 'purple', label: 'Purple', light: '#6b3fb8', dark: '#c09cff' },
  { id: 'teal', label: 'Teal', light: '#0f7c80', dark: '#5fd6d9' },
  { id: 'yellow', label: 'Yellow', light: '#e0b400', dark: '#ffd84d' },
]
const SIZES: Record<Exclude<Tool, 'eraser'>, number[]> = { pen: [3, 5.5, 9], pencil: [2.4, 4, 6.5], line: [3, 5.5, 9], marker: [18, 28, 42] }
const ERASER_R = [14, 26, 44]
const TONES: Record<PaperTone, { paper: string; line: string; label: string }> = {
  white: { paper: '#ffffff', line: 'rgba(40, 60, 110, 0.16)', label: 'White' },
  cream: { paper: '#f6f0e1', line: 'rgba(120, 90, 40, 0.18)', label: 'Cream' },
  dark: { paper: '#1d2125', line: 'rgba(255, 255, 255, 0.12)', label: 'Board' },
}

const colorOf = (id: string, tone: PaperTone) => {
  const c = COLORS.find((x) => x.id === id) ?? COLORS[0]
  return tone === 'dark' ? c.dark : c.light
}

function drawPaper(ctx: CanvasRenderingContext2D, style: PaperStyle, tone: PaperTone) {
  const t = TONES[tone]
  ctx.fillStyle = t.paper
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = t.line
  ctx.fillStyle = t.line
  ctx.lineWidth = 2
  const step = 62
  if (style === 'ruled') {
    ctx.beginPath()
    for (let y = 150; y < H - 40; y += step) {
      ctx.moveTo(60, y)
      ctx.lineTo(W - 60, y)
    }
    ctx.stroke()
    ctx.strokeStyle = tone === 'dark' ? 'rgba(255, 120, 120, 0.28)' : 'rgba(200, 60, 60, 0.3)'
    ctx.beginPath()
    ctx.moveTo(150, 40)
    ctx.lineTo(150, H - 40)
    ctx.stroke()
  } else if (style === 'grid') {
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x <= W; x += step) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
    }
    for (let y = 0; y <= H; y += step) {
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
    }
    ctx.stroke()
  } else if (style === 'dots') {
    for (let x = step; x < W; x += step) for (let y = step; y < H; y += step) ctx.fillRect(x - 2, y - 2, 4, 4)
  }
}

/** One stroke, smoothed through the midpoints of its samples. Pens follow pressure; the marker is even and see-through. */
function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, tone: PaperTone) {
  const pts = s.pts
  if (!pts.length) return
  ctx.save()
  ctx.strokeStyle = colorOf(s.color, tone)
  ctx.fillStyle = ctx.strokeStyle
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (s.tool === 'marker') {
    ctx.globalAlpha = tone === 'dark' ? 0.42 : 0.34
    ctx.lineWidth = s.size
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2
      const my = (pts[i][1] + pts[i + 1][1]) / 2
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
    }
    const last = pts[pts.length - 1]
    ctx.lineTo(last[0], last[1])
    ctx.stroke()
    ctx.restore()
    return
  }
  if (s.tool === 'line') {
    // A straight line from where the pen went down to where it is now.
    const a = pts[0]
    const b = pts[pts.length - 1]
    ctx.lineWidth = s.size
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()
    ctx.restore()
    return
  }
  if (s.tool === 'pencil') ctx.globalAlpha = 0.82
  const width = (p: number) => s.size * (s.tool === 'pencil' ? 0.55 + p * 0.7 : 0.35 + p * 1.15)
  if (pts.length === 1) {
    ctx.beginPath()
    ctx.arc(pts[0][0], pts[0][1], width(pts[0][2]) / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }
  let px = pts[0][0]
  let py = pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    const [x, y, p] = pts[i]
    const next = pts[i + 1]
    const mx = next ? (x + next[0]) / 2 : x
    const my = next ? (y + next[1]) / 2 : y
    ctx.lineWidth = width((pts[i - 1][2] + p) / 2)
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.quadraticCurveTo(x, y, mx, my)
    ctx.stroke()
    px = mx
    py = my
  }
  ctx.restore()
}

function renderPage(ctx: CanvasRenderingContext2D, page: Page, style: PaperStyle, tone: PaperTone) {
  drawPaper(ctx, style, tone)
  for (const s of page) drawStroke(ctx, s, tone)
}

type Draft = { pages: Page[]; style: PaperStyle; tone: PaperTone }
const NO_STROKES: Page = []
const draftKey = (token: string) => `nexora:pad:${token}`

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
  const [index, setIndex] = useState(0)
  const [style, setStyle] = useState<PaperStyle>(saved?.style ?? 'ruled')
  const [tone, setTone] = useState<PaperTone>(saved?.tone ?? 'white')
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('ink')
  const [sizeIx, setSizeIx] = useState(1)
  const [penOnly, setPenOnly] = useState(false)
  const [menu, setMenu] = useState<null | 'paper' | 'pages'>(null)
  const [showQ, setShowQ] = useState(false)
  // One history per page, in step with `pages`.
  const [undo, setUndo] = useState<Page[][]>(() => (saved?.pages?.length ? saved.pages : [[]]).map(() => []))
  const [redo, setRedo] = useState<Page[][]>(() => (saved?.pages?.length ? saved.pages : [[]]).map(() => []))

  const wrap = useRef<HTMLDivElement>(null)
  const base = useRef<HTMLCanvasElement>(null)
  const live = useRef<HTMLCanvasElement>(null)
  const [box, setBox] = useState({ w: 600, h: 848 })
  const drawing = useRef<{ id: number; stroke: Stroke | null; erased: boolean; before: Page } | null>(null)
  const page = useMemo(() => pages[index] ?? NO_STROKES, [pages, index])

  // Fit the page into the space under the toolbar.
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const fit = () => {
      const r = el.getBoundingClientRect()
      const s = Math.min((r.width - 16) / W, (r.height - 16) / H)
      setBox({ w: Math.floor(W * s), h: Math.floor(H * s) })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1
  const scale = (box.w * dpr) / W

  const paintBase = useCallback(() => {
    const c = base.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    renderPage(ctx, page, style, tone)
  }, [page, style, tone, scale])
  useEffect(paintBase, [paintBase, box])

  // Live view: a small picture of this page goes to the computer as you write.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const c = document.createElement('canvas')
      c.width = 620
      c.height = Math.round((620 * H) / W)
      const ctx = c.getContext('2d')!
      ctx.scale(620 / W, 620 / W)
      renderPage(ctx, page, style, tone)
      void handApi.sendPreview(token, c.toDataURL('image/jpeg', 0.6)).catch(() => {})
    }, 1200)
    return () => window.clearTimeout(t)
  }, [page, style, tone, token])

  // Keep the work on this device.
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey(token), JSON.stringify({ pages, style, tone }))
      } catch {
        /* storage full: the work is still on screen */
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [pages, style, tone, token])

  const commit = (next: Page, before: Page) => {
    setPages((all) => all.map((p, i) => (i === index ? next : p)))
    setUndo((u) => u.map((h, i) => (i === index ? [...h.slice(-60), before] : h)))
    setRedo((r) => r.map((h, i) => (i === index ? [] : h)))
  }

  const toPage = (e: React.PointerEvent): [number, number] => {
    const r = base.current!.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
  }
  const pressureOf = (e: PointerEvent | React.PointerEvent) => (e.pointerType === 'pen' ? Math.max(0.05, e.pressure || 0.5) : 0.5)

  const eraseAt = (x: number, y: number, current: Page): Page => {
    const r = ERASER_R[sizeIx]
    return current.filter((s) => !s.pts.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 < (r + s.size / 2) ** 2))
  }

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen' && !penOnly) setPenOnly(true)
    if (penOnly && e.pointerType === 'touch') return // the palm, while a stylus writes
    if (drawing.current) return
    setMenu(null)
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = toPage(e)
    if (tool === 'eraser') {
      const after = eraseAt(x, y, page)
      drawing.current = { id: e.pointerId, stroke: null, erased: after.length !== page.length, before: page }
      if (after.length !== page.length) setPages((all) => all.map((p, i) => (i === index ? after : p)))
      return
    }
    const stroke: Stroke = { tool, color, size: SIZES[tool][sizeIx], pts: [[x, y, pressureOf(e)]] }
    drawing.current = { id: e.pointerId, stroke, erased: false, before: page }
    paintLive(stroke)
  }

  const paintLive = (s: Stroke) => {
    const c = live.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    drawStroke(ctx, s, tone)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    const events = (e.nativeEvent.getCoalescedEvents?.() ?? []).length ? e.nativeEvent.getCoalescedEvents() : [e.nativeEvent]
    const r = base.current!.getBoundingClientRect()
    if (tool === 'eraser') {
      let current = pages[index]
      for (const ev of events) current = eraseAt(((ev.clientX - r.left) / r.width) * W, ((ev.clientY - r.top) / r.height) * H, current)
      if (current.length !== pages[index].length) {
        d.erased = true
        setPages((all) => all.map((p, i) => (i === index ? current : p)))
      }
      return
    }
    const s = d.stroke!
    if (s.tool === 'line') {
      const ev = events[events.length - 1]
      s.pts = [s.pts[0], [((ev.clientX - r.left) / r.width) * W, ((ev.clientY - r.top) / r.height) * H, 0.5]]
      paintLive(s)
      return
    }
    for (const ev of events) {
      const x = ((ev.clientX - r.left) / r.width) * W
      const y = ((ev.clientY - r.top) / r.height) * H
      const last = s.pts[s.pts.length - 1]
      if ((x - last[0]) ** 2 + (y - last[1]) ** 2 < 1.2) continue
      s.pts.push([x, y, pressureOf(ev)])
    }
    paintLive(s)
  }

  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    drawing.current = null
    const c = live.current
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
    if (tool === 'eraser') {
      if (d.erased) {
        setUndo((u) => u.map((h, i) => (i === index ? [...h.slice(-60), d.before] : h)))
        setRedo((r) => r.map((h, i) => (i === index ? [] : h)))
      }
      return
    }
    commit([...d.before, { ...d.stroke!, pts: d.stroke!.pts.map(([x, y, p]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(p * 100) / 100]) }], d.before)
  }

  const doUndo = () => {
    const h = undo[index]
    if (!h?.length) return
    const prev = h[h.length - 1]
    setRedo((r) => r.map((x, i) => (i === index ? [...x, page] : x)))
    setUndo((u) => u.map((x, i) => (i === index ? x.slice(0, -1) : x)))
    setPages((all) => all.map((p, i) => (i === index ? prev : p)))
  }
  const doRedo = () => {
    const h = redo[index]
    if (!h?.length) return
    const next = h[h.length - 1]
    setUndo((u) => u.map((x, i) => (i === index ? [...x, page] : x)))
    setRedo((r) => r.map((x, i) => (i === index ? x.slice(0, -1) : x)))
    setPages((all) => all.map((p, i) => (i === index ? next : p)))
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) doRedo()
      else doUndo()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const addPage = () => {
    if (pages.length >= 8) return
    setPages((p) => [...p, []])
    setUndo((u) => [...u, []])
    setRedo((r) => [...r, []])
    setIndex(pages.length)
    setMenu(null)
  }
  const removePage = () => {
    if (pages.length === 1) {
      if (page.length && confirm('Clear this page?')) commit([], page)
      return
    }
    if (page.length && !confirm('Delete this page?')) return
    setPages((p) => p.filter((_, i) => i !== index))
    setUndo((u) => u.filter((_, i) => i !== index))
    setRedo((r) => r.filter((_, i) => i !== index))
    setIndex((i) => Math.max(0, i - 1))
    setMenu(null)
  }

  const written = pages.filter((p) => p.length > 0)
  const submit = () => {
    if (!written.length || sending) return
    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    const ctx = out.getContext('2d')!
    const images = written.map((p) => {
      renderPage(ctx, p, style, tone)
      return out.toDataURL('image/png')
    })
    onSubmit(images)
  }

  const swatch = (id: string) => colorOf(id, tone)
  const sizes = tool === 'eraser' ? ERASER_R : SIZES[tool]

  return (
    <div className="hw-pad" data-tone={tone}>
      <header className="hw-bar" role="toolbar" aria-label="Writing tools">
        <div className="hw-group" role="radiogroup" aria-label="Tool">
          {(['pen', 'pencil', 'line', 'marker', 'eraser'] as Tool[]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tool === t} className={cn('hw-tool', tool === t && 'is-on')} onClick={() => setTool(t)} aria-label={t[0].toUpperCase() + t.slice(1)} title={t[0].toUpperCase() + t.slice(1)}>
              <ToolIcon tool={t} />
            </button>
          ))}
        </div>
        <span className="hw-sep" aria-hidden="true" />
        <div className="hw-group hw-colors" role="radiogroup" aria-label="Colour">
          {COLORS.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={color === c.id} aria-label={c.label} title={c.label} className={cn('hw-swatch', color === c.id && 'is-on')} style={{ background: swatch(c.id) }} onClick={() => (setColor(c.id), tool === 'eraser' && setTool('pen'))} />
          ))}
        </div>
        <span className="hw-sep" aria-hidden="true" />
        <div className="hw-group" role="radiogroup" aria-label="Size">
          {sizes.map((_, i) => (
            <button key={i} type="button" role="radio" aria-checked={sizeIx === i} aria-label={['Fine', 'Medium', 'Bold'][i]} title={['Fine', 'Medium', 'Bold'][i]} className={cn('hw-size', sizeIx === i && 'is-on')} onClick={() => setSizeIx(i)}>
              <span style={{ width: 6 + i * 6, height: 6 + i * 6 }} />
            </button>
          ))}
        </div>
        <span className="hw-sep" aria-hidden="true" />
        <div className="hw-group">
          <button type="button" className="hw-tool" onClick={doUndo} disabled={!undo[index]?.length} aria-label="Undo" title="Undo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" /></svg>
          </button>
          <button type="button" className="hw-tool" onClick={doRedo} disabled={!redo[index]?.length} aria-label="Redo" title="Redo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" /></svg>
          </button>
        </div>
        <div className="hw-group hw-push">
          {info.question && (
            <button type="button" className={cn('hw-chip', showQ && 'is-on')} onClick={() => setShowQ((v) => !v)} aria-expanded={showQ} aria-controls="hw-question">
              Question
            </button>
          )}
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
                <label className="hw-check">
                  <input type="checkbox" checked={penOnly} onChange={(e) => setPenOnly(e.target.checked)} />
                  Stylus only (ignore my palm)
                </label>
              </div>
            )}
          </div>
          <div className="hw-menu-wrap">
            <button type="button" className={cn('hw-chip', menu === 'pages' && 'is-on')} onClick={() => setMenu(menu === 'pages' ? null : 'pages')} aria-expanded={menu === 'pages'}>
              Page {index + 1}/{pages.length}
            </button>
            {menu === 'pages' && (
              <div className="hw-menu hw-menu-pages" role="dialog" aria-label="Pages">
                <div className="hw-thumbs">
                  {pages.map((p, i) => (
                    <button key={i} type="button" className={cn('hw-thumb', i === index && 'is-on')} onClick={() => (setIndex(i), setMenu(null))} aria-label={`Page ${i + 1}${p.length ? '' : ', empty'}`}>
                      <span>{i + 1}</span>
                    </button>
                  ))}
                  {pages.length < 8 && (
                    <button type="button" className="hw-thumb hw-thumb-add" onClick={addPage} aria-label="Add a page">
                      +
                    </button>
                  )}
                </div>
                <button type="button" className="hw-opt hw-danger" onClick={removePage}>
                  {pages.length === 1 ? 'Clear this page' : 'Delete this page'}
                </button>
              </div>
            )}
          </div>
          <button type="button" className="hw-btn hw-btn-main" onClick={submit} disabled={!written.length || sending}>
            {sending ? 'Sending…' : 'Submit'}
          </button>
        </div>
      </header>

      {showQ && info.question && <QuestionStrip q={info.question} title={info.title} onClose={() => setShowQ(false)} />}

      <div ref={wrap} className="hw-stage">
        <div className="hw-sheet" style={{ width: box.w, height: box.h }}>
          <canvas ref={base} width={Math.round(box.w * dpr)} height={Math.round(box.h * dpr)} style={{ width: box.w, height: box.h }} aria-label={`Page ${index + 1} of your solution`} role="img" />
          <canvas
            ref={live}
            className={cn('hw-ink', tool === 'eraser' && 'is-eraser')}
            width={Math.round(box.w * dpr)}
            height={Math.round(box.h * dpr)}
            style={{ width: box.w, height: box.h }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          />
        </div>
      </div>

      <footer className="hw-foot">
        <LogoMark size={16} intro={false} />
        <span className="truncate">
          {info.title} · {info.name}
        </span>
        {pages.length > 1 && (
          <span className="hw-pager">
            <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} aria-label="Previous page">
              ‹
            </button>
            <button type="button" onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))} disabled={index === pages.length - 1} aria-label="Next page">
              ›
            </button>
          </span>
        )}
      </footer>
    </div>
  )
}

function QuestionStrip({ q, title, onClose }: { q: DeviceQuestion; title: string; onClose: () => void }) {
  return (
    <section id="hw-question" className="hw-q" aria-label="The question">
      <div className="hw-q-head">
        <p className="m-0">
          {title} · {q.type} · {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
        </p>
        <button type="button" className="hw-chip" onClick={onClose}>
          Hide
        </button>
      </div>
      <div className="hw-q-body">
        <AiMarkdown text={q.text} />
        {q.figures.map((f) => (
          <img key={f.src} src={f.src} alt={f.alt} className="hw-q-fig" />
        ))}
        {q.options.length > 0 && (
          <ol className="hw-q-opts">
            {q.options.map((o) => (
              <li key={o.l}>
                <span className="hw-q-l">{o.l}</span>
                <AiMarkdown text={o.t} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

function ToolIcon({ tool }: { tool: Tool }) {
  const d: Record<Tool, string> = {
    pen: 'M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4zM14 7l3 3',
    pencil: 'M4 20l1-4L16 5l3 3L8 19l-4 1zM13 8l3 3M5 16l3 3',
    line: 'M5 19 19 5M5 19h.01M19 5h.01',
    marker: 'M9 15l-4 4h5l2-2M9 15l7-7 3 3-7 7M9 15l3 3',
    eraser: 'M8 20h12M4.5 15.5 13 7a2 2 0 0 1 2.8 0l2.7 2.7a2 2 0 0 1 0 2.8L11 20H8.5l-4-4a.7.7 0 0 1 0-.5z',
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
