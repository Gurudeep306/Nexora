import { useId, useState } from 'react'
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react'
import { Inline } from '@/learn/md'
import type { Frame } from '../types'
import { ArrayScene, QueueScene, StackScene } from './sequences'
import { BitsScene, CacheScene, KmapScene, MatrixScene, PagingScene, PipelineScene, TableScene } from './grids'
import { AutomatonScene, GraphScene, TreeScene } from './graphs'
import { GanttScene, SequenceScene } from './timelines'
import { BarsScene, EquationScene, NumberLineScene, VennScene } from './math'
import { CircuitScene, CodeScene } from './code'
import { Pop } from './common'
import './scenes.css'

function Body({ f }: { f: Frame }) {
  switch (f.kind) {
    case 'array':
      return <ArrayScene f={f} />
    case 'stack':
      return <StackScene f={f} />
    case 'queue':
      return <QueueScene f={f} />
    case 'table':
      return <TableScene f={f} />
    case 'matrix':
      return <MatrixScene f={f} />
    case 'graph':
      return <GraphScene f={f} />
    case 'tree':
      return <TreeScene f={f} />
    case 'automaton':
      return <AutomatonScene f={f} />
    case 'gantt':
      return <GanttScene f={f} />
    case 'pipeline':
      return <PipelineScene f={f} />
    case 'paging':
      return <PagingScene f={f} />
    case 'cache':
      return <CacheScene f={f} />
    case 'bits':
      return <BitsScene f={f} />
    case 'numberline':
      return <NumberLineScene f={f} />
    case 'venn':
      return <VennScene f={f} />
    case 'bars':
      return <BarsScene f={f} />
    case 'equation':
      return <EquationScene f={f} />
    case 'code':
      return <CodeScene f={f} />
    case 'sequence':
      return <SequenceScene f={f} />
    case 'circuit':
      return <CircuitScene f={f} />
    case 'kmap':
      return <KmapScene f={f} />
    case 'panels':
      return (
        <div className={f.dir === 'col' ? 'flex flex-col gap-4' : 'grid gap-4 @2xl:grid-flow-col @2xl:auto-cols-fr'}>
          {f.panels.map((p, i) => (
            <FrameView key={i} frame={p} nested />
          ))}
        </div>
      )
  }
}

/** Value chips; a chip whose value changed since the previous frame glows. */
function Vars({ vars }: { vars: Record<string, string | number> }) {
  const [prev, setPrev] = useState(vars)
  const [changed, setChanged] = useState<Set<string>>(() => new Set())
  if (prev !== vars) {
    setChanged(new Set(Object.keys(vars).filter((k) => prev[k] !== undefined && prev[k] !== vars[k])))
    setPrev(vars)
  }
  return (
    <div className="sc-vars justify-center">
      {Object.entries(vars).map(([k, v]) => (
        <span key={k} className="sc-var" data-changed={changed.has(k) ? 'true' : undefined}>
          <span className="sc-var-k">{k}</span>
          <Pop value={v} />
        </span>
      ))}
    </div>
  )
}

export function FrameView({ frame, nested }: { frame: Frame; nested?: boolean }) {
  return (
    <div className="sc flex min-w-0 flex-col gap-3">
      {frame.title && <div className={`text-center font-semibold text-[var(--color-text-secondary)] ${nested ? 'text-[11.5px] uppercase tracking-wider' : 'text-[12.5px]'}`}>{frame.title}</div>}
      <div className="min-w-0">
        <Body f={frame} />
      </div>
      {frame.vars && Object.keys(frame.vars).length > 0 && <Vars vars={frame.vars} />}
      {frame.caption && (
        <div className="text-center text-[13px] leading-snug text-[var(--color-text-secondary)] [&_.katex]:text-[var(--color-text-primary)]">
          <Inline text={frame.caption} />
        </div>
      )}
    </div>
  )
}

/**
 * Renders one frame; consecutive frames of the same kind animate into each
 * other (stable ids glide, colours cross-fade), a change of kind cross-fades
 * the whole canvas. Honours prefers-reduced-motion.
 */
export function SceneCanvas({ frame }: { frame: Frame }) {
  const id = useId()
  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={id}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={frame.kind} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="@container">
            <FrameView frame={frame} />
          </motion.div>
        </AnimatePresence>
      </LayoutGroup>
    </MotionConfig>
  )
}
