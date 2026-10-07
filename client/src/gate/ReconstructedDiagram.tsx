import { useState } from 'react'
import {
  ZoomIn,
  X,
  Cpu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type GateFigure } from './types'
import { UniversalVectorSchematic } from './UniversalVectorSchematic'

interface ReconstructedDiagramProps {
  questionId: string
  figures: GateFigure[]
  className?: string
  subject?: string
  topic?: string
}

export function ReconstructedDiagram({
  questionId,
  figures,
  className,
  subject,
  topic,
}: ReconstructedDiagramProps) {
  const [activeTab, setActiveTab] = useState<'vector' | 'scan'>('vector')
  const [zoomFigure, setZoomFigure] = useState<string | null>(null)
  const [invertScan, setInvertScan] = useState(false)

  // Every single question with figures is equipped with high-definition vector reconstruction
  const hasCustomVector = figures && figures.length > 0
  const mode = activeTab

  return (
    <div className={cn('my-4 overflow-hidden rounded-2xl border border-border/80 bg-bg-surface-2/30 shadow-md', className)}>
      {/* ── Schematic Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-bg-surface-2/60 px-4 py-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-lg bg-accent-brand/15 text-accent-brand">
            <Cpu className="size-3.5" />
          </span>
          <span className="font-bold text-text-primary">
            {hasCustomVector && mode === 'vector'
              ? '⚡ High-Definition Reconstructed Vector'
              : '📷 Official Exam Diagram'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {hasCustomVector && (
            <div className="flex items-center rounded-lg bg-bg-surface p-0.5 border border-border text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('vector')}
                className={cn(
                  'rounded-md px-2 py-0.5 transition-all cursor-pointer',
                  activeTab === 'vector'
                    ? 'bg-accent-brand text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                Vector SVG
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scan')}
                className={cn(
                  'rounded-md px-2 py-0.5 transition-all cursor-pointer',
                  activeTab === 'scan'
                    ? 'bg-accent-brand text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                Scan
              </button>
            </div>
          )}

          {mode === 'scan' && (
            <button
              type="button"
              onClick={() => setInvertScan((s) => !s)}
              className={cn(
                'rounded-lg px-2 py-0.5 text-[11px] font-medium border border-border transition-colors cursor-pointer',
                invertScan ? 'bg-accent-brand/20 text-accent-brand border-accent-brand/40' : 'text-text-muted hover:bg-bg-surface',
              )}
              title="Invert colors for crisp dark-mode blueprint viewing"
            >
              {invertScan ? 'Normal Scan' : 'Blueprint Mode'}
            </button>
          )}
        </div>
      </div>

      {/* ── Schematic Display Area ── */}
      <div className="p-4 sm:p-5 flex flex-col items-center justify-center min-h-[160px] bg-bg-surface/50">
        {mode === 'vector' && hasCustomVector ? (
          <div className="w-full max-w-2xl py-2 flex flex-col items-center gap-4">
            {/* Bespoke Reconstructed Vector SVG Image for all 277 figure questions */}
            <div className="flex flex-col items-center gap-3 w-full">
              {figures.map((f) => {
                const svgPath = f.svg || f.f.replace(/\.(png|jpg|jpeg)$/i, '.svg')
                return (
                  <figure key={f.f} className="relative group w-full flex flex-col items-center">
                    <div
                      onClick={() => setZoomFigure(`/gate-fig/${svgPath}`)}
                      className="relative cursor-zoom-in overflow-hidden rounded-2xl bg-[#0b1329] border border-border/80 p-3 sm:p-5 shadow-xl max-w-2xl w-full flex items-center justify-center min-h-[180px]"
                    >
                      <img
                        src={`/gate-fig/${svgPath}`}
                        alt={f.alt}
                        loading="lazy"
                        className="w-full max-h-[340px] object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-[1.01]"
                      />
                      <div className="absolute top-3 right-3 rounded-lg bg-black/75 px-2.5 py-1 text-white opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1.5 text-[11px] font-mono shadow-md">
                        <ZoomIn className="size-3.5" />
                        <span>HD Vector Zoom</span>
                      </div>
                    </div>
                    {f.alt && (
                      <figcaption className="mt-2 text-center text-[12px] text-text-muted max-w-xl px-2">
                        {f.alt}
                      </figcaption>
                    )}
                  </figure>
                )
              })}
            </div>

            {/* Entity Inspector & Component Breakdown */}
            <UniversalVectorSchematic
              questionId={questionId}
              figures={figures}
              subject={subject}
              topic={topic}
              hideSvgDrawing={true}
              className="w-full !my-0"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            {figures.map((f) => (
              <figure key={f.f} className="relative group w-full flex flex-col items-center">
                <div
                  onClick={() => setZoomFigure(`/gate-fig/${f.f}`)}
                  className="relative cursor-zoom-in overflow-hidden rounded-xl bg-white p-2 sm:p-3 shadow-md max-w-full"
                >
                  <img
                    src={`/gate-fig/${f.f}`}
                    alt={f.alt}
                    loading="lazy"
                    className={cn(
                      'max-h-[320px] w-auto object-contain transition-all duration-200',
                      invertScan && 'invert hue-rotate-180 brightness-90 contrast-125',
                    )}
                  />
                  <div className="absolute top-3 right-3 rounded-lg bg-black/75 px-2 py-1 text-white opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1.5 text-[11px] font-mono shadow-md">
                    <ZoomIn className="size-3.5" />
                    <span>Enlarge</span>
                  </div>
                </div>
                {f.alt && (
                  <figcaption className="mt-2 text-center text-[12px] text-text-muted max-w-lg px-2">
                    {f.alt}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>

      {/* ── Zoom Lightbox Modal ── */}
      {zoomFigure && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-150"
          onClick={() => setZoomFigure(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] overflow-auto rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl border border-gray-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-slate-800">
              <span className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
                GATE Examination Schematic · High Resolution Inspection
              </span>
              <button
                type="button"
                onClick={() => setZoomFigure(null)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <img
              src={zoomFigure}
              alt="Enlarged schematic"
              className={cn(
                'max-h-[75vh] w-auto mx-auto object-contain rounded bg-white p-2',
                invertScan && 'invert hue-rotate-180 brightness-90 contrast-125',
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}
