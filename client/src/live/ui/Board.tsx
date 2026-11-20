/*
  A whiteboard that is shared into a Live room as a video. Used on a tablet
  joined by QR (with a stylus) and on any computer. It draws with the same ink
  as the handwriting pad (pages/hand/ink.ts): pressure, pencil, marker.

  The board is a 1600×900 canvas; canvas.captureStream() turns it into a video
  track. Strokes are kept as data so undo and redraw stay sharp.
*/
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { Eraser, Highlighter, Pen, Redo2, Trash2, Undo2 } from 'lucide-react'
import { COLORS, drawStroke, type InkTool, type PaperTone, type Pt, type Stroke } from '@/pages/hand/ink'
import { cn } from '@/lib/utils'

export const BW = 1600
export const BH = 900
type Paper = 'blank' | 'grid' | 'dots'
type Tool = 'pen' | 'marker' | 'eraser'

export interface BoardHandle {
  /** A video track of the board (made once). */
  track(): MediaStreamTrack | null
}

function drawPaper(ctx: CanvasRenderingContext2D, paper: Paper, tone: PaperTone) {
  ctx.fillStyle = tone === 'dark' ? '#1b1c1e' : '#fdfcf9'
  ctx.fillRect(0, 0, BW, BH)
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

const SIZES: Record<Exclude<Tool, 'eraser'>, number[]> = { pen: [3.5, 6, 10], marker: [20, 32, 46] }
const ERASER = [18, 34, 60]

export function Board({ ref, className, compact = false }: { ref?: Ref<BoardHandle>; className?: string; compact?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Stroke[]>([])
  const undone = useRef<Stroke[]>([])
  const live = useRef<Stroke | null>(null)
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
    drawPaper(ctx, paper, tone)
    for (const s of strokes.current) drawStroke(ctx, s, tone)
    if (live.current) drawStroke(ctx, live.current, tone)
  }, [paper, tone])

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
    const before = strokes.current.length
    strokes.current = strokes.current.filter((s) => !s.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < rad + s.size / 2))
    if (strokes.current.length !== before) {
      redraw()
      setCount(strokes.current.length)
    }
  }

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'pen') penSeen.current = true
    // Palm rejection: once a stylus has been used, fingers don't draw.
    if (penSeen.current && e.pointerType === 'touch') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = point(e)
    if (tool === 'eraser') return eraseAt(p[0], p[1])
    const ink: InkTool = tool === 'marker' ? 'marker' : 'pen'
    live.current = { tool: ink, color, size: SIZES[tool][size], pts: [p] }
    undone.current = []
    redraw()
  }
  const move = (e: React.PointerEvent) => {
    if (penSeen.current && e.pointerType === 'touch') return
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
    strokes.current.push(live.current)
    live.current = null
    setCount(strokes.current.length)
    redraw()
  }

  const undo = () => {
    const s = strokes.current.pop()
    if (s) undone.current.push(s)
    setCount(strokes.current.length)
    redraw()
  }
  const redo = () => {
    const s = undone.current.pop()
    if (s) strokes.current.push(s)
    setCount(strokes.current.length)
    redraw()
  }
  const clear = () => {
    if (!strokes.current.length) return
    undone.current = [...strokes.current].reverse()
    strokes.current = []
    setCount(0)
    redraw()
  }

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
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
      <div className="lv-board-paper">
        <canvas
          ref={canvas}
          width={BW}
          height={BH}
          className="lv-board-canvas"
          aria-label="Whiteboard. Draw with a stylus, a finger or the mouse."
          role="img"
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
