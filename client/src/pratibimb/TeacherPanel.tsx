/*
  The teacher on the page (docs/pratibimb/SPEC.md §3): her model in a panel, captions lit word by word,
  and a whiteboard that opens beside her when the lesson needs a picture (she turns and gestures to it).

  variant "inline": inside a page (Studio preview). variant "dock": a corner panel beside the lesson
  (right on wide screens, never over the content); on phones it folds to a face bubble, tap to open.
*/
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Minimize2, Maximize2, X } from 'lucide-react'
import { Player, type Framing } from './engine/player'
import type { Look } from './engine/look'
import './pratibimb.css'

export interface TeacherPanelProps {
  modelUrl: string
  look?: Look
  variant?: 'inline' | 'dock'
  framing?: Framing
  /** Lesson picture to show beside her; null closes the board. */
  board?: ReactNode | null
  /** Caption words and which one is being said (−1 = none). */
  caption?: { words: string[]; at: number } | null
  onReady?: (p: Player) => void
  onError?: (message: string) => void
  onClose?: () => void
}

export function TeacherPanel({ modelUrl, look = 'painted', variant = 'inline', framing = 'upper', board, caption, onReady, onError, onClose }: TeacherPanelProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const player = useRef<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [small, setSmall] = useState(false)
  const ready = useRef(onReady)
  const fail = useRef(onError)
  useEffect(() => {
    ready.current = onReady
    fail.current = onError
  })

  useEffect(() => {
    if (!canvas.current) return
    const p = new Player(canvas.current, { look, framing })
    player.current = p
    let alive = true
    setLoading(true)
    p.load(modelUrl)
      .then(() => {
        if (!alive) return
        setLoading(false)
        p.start()
        ready.current?.(p)
      })
      .catch(() => alive && fail.current?.('The model could not be loaded.'))
    const move = (e: PointerEvent) => {
      const r = canvas.current?.getBoundingClientRect()
      if (!r) return
      p.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      alive = false
      window.removeEventListener('pointermove', move)
      p.dispose()
      player.current = null
    }
  }, [modelUrl, look]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    player.current?.setFraming(small ? 'portrait' : framing)
  }, [framing, small])

  // The board opening turns her towards it; closing turns her back.
  const boardOpen = Boolean(board)
  useEffect(() => {
    const p = player.current
    if (!p) return
    if (boardOpen) {
      p.setGaze('board')
      p.gesture('present')
    } else p.setGaze('viewer')
  }, [boardOpen])

  return (
    <section className={`pb-panel pb-${variant}${small ? ' pb-small' : ''}${board ? ' pb-with-board' : ''}`} aria-label="Your teacher">
      {board && (
        <div className="pb-board" role="figure" aria-label="Whiteboard">
          {board}
        </div>
      )}
      <div className="pb-stage">
        <canvas ref={canvas} className="pb-canvas" aria-hidden="true" />
        {loading && <div className="pb-loading">Getting ready…</div>}
        {variant === 'dock' && (
          <div className="pb-tools">
            <button type="button" className="pb-tool" onClick={() => setSmall((v) => !v)} aria-label={small ? 'Show the teacher larger' : 'Make the teacher smaller'}>
              {small ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
            </button>
            {onClose && (
              <button type="button" className="pb-tool" onClick={onClose} aria-label="Close the teacher">
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
        {caption && caption.words.length > 0 && (
          <p className="pb-caption" aria-live="polite">
            {caption.words.map((w, i) => (
              <span key={i} className={i <= caption.at ? 'pb-said' : undefined}>
                {w}{' '}
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  )
}
