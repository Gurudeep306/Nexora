/*
  Drawing for the writing pad: paper, strokes and the question printed at the
  top of page 1. Everything is in page units (an A4 page at 150 dpi), so the
  same code draws the page on screen at any zoom, the live view, and the
  full-size image that is sent.
*/
import { texToPlain } from '@/gate/texPlain'
import type { DeviceQuestion } from '@/components/hand/api'

export const W = 1240
export const H = 1754
/** Space between pages in the notebook view, in page units. */
export const GAP = 56
export const MARGIN = 80

export type Tool = 'pen' | 'pencil' | 'line' | 'marker' | 'eraser' | 'hand'
export type InkTool = Exclude<Tool, 'eraser' | 'hand'>
export type Pt = [number, number, number]
export type Stroke = { tool: InkTool; color: string; size: number; pts: Pt[] }
export type Page = Stroke[]
export type PaperStyle = 'blank' | 'ruled' | 'grid' | 'dots'
export type PaperTone = 'white' | 'cream' | 'dark'

export const COLORS: { id: string; label: string; light: string; dark: string }[] = [
  { id: 'ink', label: 'Ink', light: '#1c1b19', dark: '#f3f0e8' },
  { id: 'blue', label: 'Blue', light: '#1f4fd1', dark: '#7aa2ff' },
  { id: 'red', label: 'Red', light: '#c62828', dark: '#ff7a70' },
  { id: 'green', label: 'Green', light: '#1b7a3e', dark: '#5fd38d' },
  { id: 'orange', label: 'Orange', light: '#d9620b', dark: '#ffa45c' },
  { id: 'purple', label: 'Purple', light: '#6b3fb8', dark: '#c09cff' },
  { id: 'teal', label: 'Teal', light: '#0f7c80', dark: '#5fd6d9' },
  { id: 'yellow', label: 'Yellow', light: '#e0b400', dark: '#ffd84d' },
]
export const SIZES: Record<InkTool, number[]> = { pen: [3, 5.5, 9], pencil: [2.4, 4, 6.5], line: [3, 5.5, 9], marker: [18, 28, 42] }
export const ERASER_R = [14, 26, 44]
export const TONES: Record<PaperTone, { paper: string; line: string; ink: string; muted: string; label: string }> = {
  white: { paper: '#ffffff', line: 'rgba(40, 60, 110, 0.16)', ink: '#1c1b19', muted: '#5f5d57', label: 'White' },
  cream: { paper: '#f6f0e1', line: 'rgba(120, 90, 40, 0.18)', ink: '#1c1b19', muted: '#5f5a4d', label: 'Cream' },
  dark: { paper: '#1d2125', line: 'rgba(255, 255, 255, 0.12)', ink: '#f3f0e8', muted: '#a9adb2', label: 'Board' },
}

export const colorOf = (id: string, tone: PaperTone) => {
  const c = COLORS.find((x) => x.id === id) ?? COLORS[0]
  return tone === 'dark' ? c.dark : c.light
}

export function drawPaper(ctx: CanvasRenderingContext2D, style: PaperStyle, tone: PaperTone, from = 0) {
  const t = TONES[tone]
  ctx.fillStyle = t.paper
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = t.line
  ctx.fillStyle = t.line
  ctx.lineWidth = 2
  const step = 62
  if (style === 'ruled') {
    ctx.beginPath()
    for (let y = Math.max(150, Math.ceil((from + 20) / step) * step + 26); y < H - 40; y += step) {
      ctx.moveTo(60, y)
      ctx.lineTo(W - 60, y)
    }
    ctx.stroke()
    ctx.strokeStyle = tone === 'dark' ? 'rgba(255, 120, 120, 0.28)' : 'rgba(200, 60, 60, 0.3)'
    ctx.beginPath()
    ctx.moveTo(150, Math.max(40, from))
    ctx.lineTo(150, H - 40)
    ctx.stroke()
  } else if (style === 'grid') {
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x <= W; x += step) {
      ctx.moveTo(x, from)
      ctx.lineTo(x, H)
    }
    for (let y = Math.ceil(from / step) * step; y <= H; y += step) {
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
    }
    ctx.stroke()
  } else if (style === 'dots') {
    for (let x = step; x < W; x += step) for (let y = Math.max(step, Math.ceil(from / step) * step); y < H; y += step) ctx.fillRect(x - 2, y - 2, 4, 4)
  }
}

/** One stroke, smoothed through the midpoints of its samples. Pens follow pressure; the marker is even and see-through. */
export function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, tone: PaperTone) {
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

/* ── The question, printed at the top of page 1 ── */

const SERIF = "'Newsreader', 'Iowan Old Style', Georgia, serif"
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"

/** Markdown with $maths$ as plain readable text, one entry per paragraph. */
export function plainParagraphs(md: string): string[] {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\$\$([^$]+)\$\$/g, (_, t: string) => texToPlain(t))
    .replace(/\$([^$]+)\$/g, (_, t: string) => texToPlain(t))
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, ''))
    .replace(/[*_`#>]/g, '')
    .split(/\n{2,}|\n(?=\s*[-•]\s)/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > width && line) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

export type QuestionArt = { q: DeviceQuestion; title: string; images: (HTMLImageElement | null)[] }

/**
 * Prints the question (label, text, options, figures) at the top of a page
 * and returns where the answer space begins. The answer space starts under a
 * dashed rule with the word "Answer".
 */
export function drawQuestion(ctx: CanvasRenderingContext2D, art: QuestionArt, tone: PaperTone): number {
  const t = TONES[tone]
  const width = W - MARGIN * 2
  let y = 92
  ctx.save()
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = t.muted
  ctx.font = `500 21px ${MONO}`
  ctx.fillText(`QUESTION · ${art.title.toUpperCase()} · ${art.q.type} · ${art.q.marks} ${art.q.marks === 1 ? 'MARK' : 'MARKS'}`, MARGIN, y)
  y += 26
  ctx.fillStyle = t.ink
  ctx.font = `400 31px ${SERIF}`
  for (const para of plainParagraphs(art.q.text)) {
    y += 14
    for (const line of wrap(ctx, para, width)) {
      y += 42
      ctx.fillText(line, MARGIN, y)
    }
  }
  if (art.q.options.length) {
    y += 14
    for (const o of art.q.options) {
      const text = plainParagraphs(o.t).join(' ')
      ctx.font = `600 26px ${MONO}`
      ctx.fillStyle = t.muted
      y += 44
      ctx.fillText(`(${o.l})`, MARGIN, y)
      ctx.font = `400 30px ${SERIF}`
      ctx.fillStyle = t.ink
      const lines = wrap(ctx, text, width - 64)
      lines.forEach((line, i) => {
        if (i) y += 40
        ctx.fillText(line, MARGIN + 64, y)
      })
    }
  }
  for (const img of art.images) {
    if (!img || !img.naturalWidth) continue
    const scale = Math.min(1, (width * 0.8) / img.naturalWidth, 380 / img.naturalHeight)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    y += 24
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(MARGIN - 8, y - 8, w + 16, h + 16)
    ctx.drawImage(img, MARGIN, y, w, h)
    y += h + 8
  }
  y += 40
  ctx.strokeStyle = t.muted
  ctx.globalAlpha = 0.6
  ctx.setLineDash([10, 10])
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(MARGIN, y)
  ctx.lineTo(W - MARGIN, y)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
  y += 36
  ctx.fillStyle = t.muted
  ctx.font = `500 21px ${MONO}`
  ctx.fillText('ANSWER', MARGIN, y)
  ctx.restore()
  return Math.min(H - 200, y + 10)
}

/** Where the answer space begins under the printed question (measured once). */
export function measureQuestion(art: QuestionArt, tone: PaperTone): number {
  const probe = document.createElement('canvas').getContext('2d')!
  return drawQuestion(probe, art, tone)
}

/** A whole page: paper, the question when asked for (page 1, with its measured `top`), then the strokes. */
export function renderPage(ctx: CanvasRenderingContext2D, page: Page, style: PaperStyle, tone: PaperTone, art?: { art: QuestionArt; top: number } | null) {
  if (art) {
    drawPaper(ctx, style, tone, art.top)
    drawQuestion(ctx, art.art, tone)
  } else drawPaper(ctx, style, tone)
  for (const s of page) drawStroke(ctx, s, tone)
}
