/*
  A whiteboard that is shared into a Live room as a video. Used on a tablet
  joined by QR (with a stylus) and on any computer. It draws with the same ink
  as the handwriting pad (pages/hand/ink.ts): pressure, pencil, marker.

  The board is a 1600×900 canvas; canvas.captureStream() turns it into a video
  track. Strokes are kept as data so undo and redraw stay sharp.

  It is a teaching board, so an iPad needs nothing else: several pages, your
  own PDF notes or slides and photos opened as pages to write on (pdf.js,
  loaded only when you open one; files never leave the device, only the
  picture of the board is sent), and a laser pointer that fades.
*/
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { ChevronLeft, ChevronRight, Eraser, FilePlus2, Highlighter, Loader2, MousePointer2, Pen, Plus, Redo2, Trash2, Undo2 } from 'lucide-react'
import { pageImages } from './boardFiles'
import { COLORS, drawStroke, type InkTool, type PaperTone, type Pt, type Stroke } from '@/pages/hand/ink'
import { cn } from '@/lib/utils'

export const BW = 1600
export const BH = 900
type Paper = 'blank' | 'grid' | 'dots'
type Tool = 'pen' | 'marker' | 'eraser' | 'laser'
/** One page: its strokes and, for an opened PDF page or photo, the picture under them. */
type BoardPage = { strokes: Stroke[]; undone: Stroke[]; bg: CanvasImageSource | null }

export interface BoardHandle {
  /** A video track of the board (made once). */
  track(): MediaStreamTrack | null
}

function drawPaper(ctx: CanvasRenderingContext2D, paper: Paper, tone: PaperTone, bg: CanvasImageSource | null = null) {
  ctx.fillStyle = tone === 'dark' && !bg ? '#1b1c1e' : '#fdfcf9'
  ctx.fillRect(0, 0, BW, BH)
  if (bg) {
    // An opened page sits whole in the middle of the board, on white.
    const w = (bg as { width: number }).width
    const h = (bg as { height: number }).height
    const k = Math.min(BW / w, BH / h)
    ctx.drawImage(bg, (BW - w * k) / 2, (BH - h * k) / 2, w * k, h * k)
    return
  }
  if (paper === 'blank') return
  ctx.save()
  ctx.fillStyle = ctx.strokeStyle = tone === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(28,27,25,0.10)'
  ctx.lineWidth = 1
  const step = 40
  if (paper === 'grid') {
    ctx.beginPath()
    for (let x = step; x < BW; x += step) {
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, BH)
    }
    for (let y = step; y < BH; y += step) {
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(BW, y + 0.5)
    }
    ctx.stroke()
  } else {
    for (let x = step; x < BW; x += step) for (let y = step; y < BH; y += step) ctx.fillRect(x - 1, y - 1, 2.2, 2.2)
  }
  ctx.restore()
}

const SIZES: Record<'pen' | 'marker', number[]> = { pen: [3.5, 6, 10], marker: [20, 32, 46] }
const ERASER = [18, 34, 60]

export function Board({ ref, className, compact = false }: { ref?: Ref<BoardHandle>; className?: string; compact?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pages = useRef<BoardPage[]>([{ strokes: [], undone: [], bg: null }])
  const [pageIx, setPageIx] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [busy, setBusy] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  // The page on show, for the drawing code (goTo keeps it in step with pageIx).
  const pageRef = useRef(0)
  const cur = () => pages.current[pageRef.current]
  const live = useRef<Stroke | null>(null)
  const laser = useRef<{ x: number; y: number; t: number }[]>([])
  const stream = useRef<MediaStream | null>(null)
  const penSeen = useRef(false)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('ink')
  const [size, setSize] = useState(1)
  const [paper, setPaper] = useState<Paper>('grid')
  const [tone, setTone] = useState<PaperTone>('white')
  const [count, setCount] = useState(0)

  const redraw = useCallback(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const pg = pages.current[pageRef.current] ?? pages.current[0]
    if (!pg) return
    const ink: PaperTone = pg.bg ? 'white' : tone
    drawPaper(ctx, paper, tone, pg.bg)
    for (const s of pg.strokes) drawStroke(ctx, s, ink)
    if (live.current) drawStroke(ctx, live.current, ink)
    // The laser: a bright dot with a short trail that fades within a second.
    const now = performance.now()
    laser.current = laser.current.filter((p) => now - p.t < 700)
    laser.current.forEach((p, i) => {
      const a = 1 - (now - p.t) / 700
      const last = i === laser.current.length - 1
      ctx.beginPath()
      ctx.fillStyle = `rgba(230, 40, 40, ${last ? 0.95 : a * 0.45})`
      ctx.arc(p.x, p.y, last ? 11 : 4 + a * 5, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [paper, tone])

  // While the laser has a trail, keep repainting so it fades smoothly.
  const laserRaf = useRef(0)
  const animateLaser = useCallback(() => {
    cancelAnimationFrame(laserRaf.current)
    const step = () => {
      redraw()
      if (laser.current.length) laserRaf.current = requestAnimationFrame(step)
    }
    laserRaf.current = requestAnimationFrame(step)
  }, [redraw])
  useEffect(() => () => cancelAnimationFrame(laserRaf.current), [])

  const goTo = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(pages.current.length - 1, i))
      pageRef.current = n
      setPageIx(n)
      live.current = null
      setCount(pages.current[n].strokes.length)
      redraw()
    },
    [redraw],
  )
  const addPage = (bg: CanvasImageSource | null = null, at = pageRef.current + 1) => {
    pages.current.splice(at, 0, { strokes: [], undone: [], bg })
    setPageCount(pages.current.length)
    return at
  }

  /** Open a PDF (every page) or photos as new pages after this one. */
  const openFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy('Opening…')
    try {
      // Pages are made aside and put in at the end, so the board never
      // repaints half-way through (it repaints every second).
      const made: BoardPage[] = []
      for (const f of Array.from(files)) {
        for await (const img of pageImages(f, BW, BH, (n, total) => setBusy(`Opening page ${n} of ${total}…`))) {
          made.push({ strokes: [], undone: [], bg: img })
        }
      }
      if (!made.length) return
      // An empty first page is replaced rather than left in front.
      const blank = pages.current.length === 1 && !pages.current[0].strokes.length && !pages.current[0].bg
      const at = blank ? 0 : pageRef.current + 1
      pages.current = blank ? made : [...pages.current.slice(0, at), ...made, ...pages.current.slice(at)]
      setPageCount(pages.current.length)
      goTo(at)
    } catch (e) {
      setBusy(null)
      window.alert((e as Error).message || 'Couldn’t open that file.')
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  useEffect(() => {
    redraw()
    // A canvas stream only sends frames when the canvas changes; repaint now
    // and then so people who join later see the board at once.
    const id = window.setInterval(redraw, 1000)
    return () => window.clearInterval(id)
  }, [redraw])

  useImperativeHandle(ref, () => ({
    track() {
      if (!canvas.current) return null
      if (!stream.current) stream.current = canvas.current.captureStream(24)
      return stream.current.getVideoTracks()[0] ?? null
    },
  }))

  const point = (e: React.PointerEvent): Pt => {
    const r = canvas.current!.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * BW, ((e.clientY - r.top) / r.height) * BH, e.pressure || 0.5]
  }

  const eraseAt = (x: number, y: number) => {
    const rad = ERASER[size] * 0.5
    const before = cur().strokes.length
    cur().strokes = cur().strokes.filter((s) => !s.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < rad + s.size / 2))
    if (cur().strokes.length !== before) {
      redraw()
      setCount(cur().strokes.length)
    }
  }

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'pen') penSeen.current = true
    // Palm rejection: once a stylus has been used, fingers don't draw.
    if (penSeen.current && e.pointerType === 'touch') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = point(e)
    if (tool === 'laser') {
      laser.current.push({ x: p[0], y: p[1], t: performance.now() })
      return animateLaser()
    }
    if (tool === 'eraser') return eraseAt(p[0], p[1])
    const ink: InkTool = tool === 'marker' ? 'marker' : 'pen'
    live.current = { tool: ink, color, size: SIZES[tool][size], pts: [p] }
    cur().undone = []
    redraw()
  }
  const move = (e: React.PointerEvent) => {
    if (penSeen.current && e.pointerType === 'touch') return
    // The laser follows a mouse or a hovering Pencil too, not only while pressed.
    if (tool === 'laser') {
      const p = point(e)
      laser.current.push({ x: p[0], y: p[1], t: performance.now() })
      if (laser.current.length > 40) laser.current.shift()
      return animateLaser()
    }
    if (!(e.buttons & 1)) return
    const evs = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent]
    if (tool === 'eraser') {
      const p = point(e)
      return eraseAt(p[0], p[1])
    }
    if (!live.current) return
    for (const ev of evs) live.current.pts.push(point(ev as unknown as React.PointerEvent))
    redraw()
  }
  const up = () => {
    if (!live.current) return
    cur().strokes.push(live.current)
    live.current = null
    setCount(cur().strokes.length)
    redraw()
  }

  const undo = () => {
    const s = cur().strokes.pop()
    if (s) cur().undone.push(s)
    setCount(cur().strokes.length)
    redraw()
  }
  const redo = () => {
    const s = cur().undone.pop()
    if (s) cur().strokes.push(s)
    setCount(cur().strokes.length)
    redraw()
  }
  const clear = () => {
    if (!cur().strokes.length) return
    cur().undone = [...cur().strokes].reverse()
    cur().strokes = []
    setCount(0)
    redraw()
  }

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable], .monaco-editor')
      if (!typing && !e.metaKey && !e.ctrlKey && (e.key === 'PageDown' || e.key === 'PageUp')) {
        e.preventDefault()
        goTo(pageRef.current + (e.key === 'PageDown' ? 1 : -1))
        return
      }
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      // Undo in a text box or the code pad belongs to them, not the board.
      if ((e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable], .monaco-editor')) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const swatches = COLORS.slice(0, compact ? 4 : 6)
  return (
    <div className={cn('lv-board', className)}>
      <div className="lv-board-tools" role="toolbar" aria-label="Whiteboard tools">
        <div className="lv-seg">
          {(
            [
              ['pen', 'Pen', Pen],
              ['marker', 'Highlighter', Highlighter],
              ['eraser', 'Eraser', Eraser],
              ['laser', 'Laser pointer', MousePointer2],
            ] as const
          ).map(([id, label, I]) => (
            <button key={id} type="button" className={cn('lv-tool', tool === id && 'is-on')} aria-pressed={tool === id} aria-label={label} title={label} onClick={() => setTool(id)}>
              <I className="size-4" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="lv-seg" role="group" aria-label="Colour">
          {swatches.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn('lv-swatch', color === c.id && 'is-on')}
              style={{ ['--sw' as string]: tone === 'dark' ? c.dark : c.light }}
              aria-label={c.label}
              aria-pressed={color === c.id}
              onClick={() => {
                setColor(c.id)
                if (tool === 'eraser') setTool('pen')
              }}
            />
          ))}
        </div>
        <div className="lv-seg" role="group" aria-label="Size">
          {[0, 1, 2].map((i) => (
            <button key={i} type="button" className={cn('lv-tool', size === i && 'is-on')} aria-label={['Thin', 'Medium', 'Thick'][i]} aria-pressed={size === i} onClick={() => setSize(i)}>
              <span className="lv-dot" style={{ width: 4 + i * 4, height: 4 + i * 4 }} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="lv-seg">
          <button type="button" className="lv-tool" onClick={undo} disabled={!count} aria-label="Undo" title="Undo (Ctrl+Z)">
            <Undo2 className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="lv-tool" onClick={redo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="lv-tool" onClick={clear} disabled={!count} aria-label="Clear the board" title="Clear">
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="lv-seg">
          <select className="lv-select" value={paper} onChange={(e) => setPaper(e.target.value as Paper)} aria-label="Paper">
            <option value="grid">Grid</option>
            <option value="dots">Dots</option>
            <option value="blank">Blank</option>
          </select>
          <select className="lv-select" value={tone} onChange={(e) => setTone(e.target.value as PaperTone)} aria-label="Board colour">
            <option value="white">White board</option>
            <option value="dark">Black board</option>
          </select>
        </div>
      </div>
      <div className="lv-board-pages" role="group" aria-label="Pages">
        <button type="button" className="lv-tool" onClick={() => goTo(pageIx - 1)} disabled={pageIx === 0} aria-label="Previous page" title="Previous page (Page Up)">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="lv-board-pn" aria-live="polite">
          Page {pageIx + 1} of {pageCount}
        </span>
        <button type="button" className="lv-tool" onClick={() => goTo(pageIx + 1)} disabled={pageIx >= pageCount - 1} aria-label="Next page" title="Next page (Page Down)">
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className="lv-chip-btn" onClick={() => goTo(addPage())}>
          <Plus className="size-3.5" aria-hidden="true" /> New page
        </button>
        <button type="button" className="lv-chip-btn" onClick={() => fileInput.current?.click()} disabled={!!busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <FilePlus2 className="size-3.5" aria-hidden="true" />} {busy ?? 'Open PDF or photo'}
        </button>
        <input ref={fileInput} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => void openFiles(e.target.files)} />
        <span className="lv-board-rotate">Turn your iPad sideways for a bigger board.</span>
      </div>
      <div className="lv-board-paper">
        <canvas
          ref={canvas}
          width={BW}
          height={BH}
          className="lv-board-canvas"
          aria-label="Whiteboard. Draw with a stylus, a finger or the mouse."
          role="img"
          data-tool={tool}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onLostPointerCapture={up}
        />
      </div>
    </div>
  )
}
