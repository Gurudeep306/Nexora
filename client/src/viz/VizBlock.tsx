/*
  Lazy viz: reserves the scene's space (no layout shift), and only when it
  comes near the viewport (or the page is printed) downloads the player
  chunk and mounts it. rough.js is fetched by the player itself.
*/
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { VizSpec } from './schema'
import type { VizPlayerProps } from './VizPlayer'
import { canvasSize } from './frames'
import { useVizLayout } from './useVizLayout'
import './viz.css'

const VizPlayer = lazy(() => import('./VizPlayer'))

export function VizBlock(props: VizPlayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (show) return
    const el = ref.current
    const onPrint = () => setShow(true)
    window.addEventListener('beforeprint', onPrint)
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShow(true)
      return () => window.removeEventListener('beforeprint', onPrint)
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setShow(true), { rootMargin: '400px 0px' })
    io.observe(el)
    return () => {
      io.disconnect()
      window.removeEventListener('beforeprint', onPrint)
    }
  }, [show])

  const layout = useVizLayout(props.spec, ref)
  const placeholder = <Placeholder spec={props.spec} layout={layout} />
  return (
    <div ref={ref} className="nxv-slot">
      {show ? <Suspense fallback={placeholder}>{<VizPlayer {...props} />}</Suspense> : placeholder}
    </div>
  )
}

function Placeholder({ spec, layout }: { spec: VizSpec; layout: 'wide' | 'narrow' }) {
  const { width, height } = canvasSize(spec, layout)
  return (
    <div className="nxv nxv--placeholder" role="img" aria-label={`${spec.title} (loading)`}>
      <div className="nxv-stage" style={{ aspectRatio: `${width} / ${height}` }} />
    </div>
  )
}
