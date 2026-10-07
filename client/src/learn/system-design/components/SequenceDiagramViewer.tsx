import React from 'react'
import type { SystemDesignModel } from '../types'
import {
  Server,
  Zap,
  Database,
  Globe,
  Shield,
  Smartphone,
  Cpu,
  Layers,
  Clock,
} from 'lucide-react'
import { playStepClickSound } from '../utils/audioEffects'

interface SequenceDiagramViewerProps {
  system: SystemDesignModel
  currentStepIndex: number
  onStepChange: (index: number) => void
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Globe: <Globe className="size-4" />,
  Shield: <Shield className="size-4" />,
  Server: <Server className="size-4" />,
  Database: <Database className="size-4" />,
  Layers: <Layers className="size-4" />,
  Zap: <Zap className="size-4" />,
  Smartphone: <Smartphone className="size-4" />,
  Cpu: <Cpu className="size-4" />,
}

export const SequenceDiagramViewer: React.FC<SequenceDiagramViewerProps> = ({
  system,
  currentStepIndex,
  onStepChange,
}) => {
  const services = system.services
  const steps = system.animationSteps

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#04070e] p-6 text-white shadow-2xl space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 rounded-full bg-sky-400 animate-pulse" />
            <h4 className="font-mono text-[13.5px] font-bold tracking-wider text-sky-400 uppercase">
              Interactive UML Sequence Flow Diagram
            </h4>
          </div>
          <p className="text-[12px] text-text-muted mt-0.5">
            Cross-service synchronous calls, asynchronous events, and database activations across lifelines.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
          <span>Click any transaction row to jump simulation</span>
        </div>
      </div>

      {/* Lifeline Headers (Service Columns) */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[640px]">
          {/* Lifeline Node Headers */}
          <div className="grid gap-2 border-b border-border/80 pb-3" style={{ gridTemplateColumns: `repeat(${services.length}, minmax(0, 1fr))` }}>
            {services.map((srv) => {
              const isActiveInCurrentStep =
                system.animationSteps[currentStepIndex]?.fromNode === srv.id ||
                system.animationSteps[currentStepIndex]?.toNode === srv.id

              return (
                <div
                  key={srv.id}
                  className={`flex flex-col items-center rounded-xl p-2.5 text-center ring-1 transition-all ${
                    isActiveInCurrentStep
                      ? 'bg-sky-500/15 ring-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                      : 'bg-bg-surface-2 ring-border'
                  }`}
                >
                  <div
                    className={`flex size-8 items-center justify-center rounded-lg ${
                      isActiveInCurrentStep ? 'bg-sky-400 text-black' : 'bg-bg-surface-1 text-text-muted'
                    }`}
                  >
                    {ICON_MAP[srv.icon] || <Server className="size-4" />}
                  </div>
                  <span className="mt-1.5 font-mono text-[11px] font-bold text-text-primary truncate max-w-full">
                    {srv.name.split(' ')[0]}
                  </span>
                  <span className="text-[9.5px] font-mono text-text-muted truncate max-w-full">
                    {srv.role.split(' ')[0]}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Sequential Step Transactions */}
          <div className="relative mt-4 space-y-4">
            {/* Background Lifeline Dashed Wires */}
            <div
              className="absolute inset-y-0 inset-x-0 grid pointer-events-none opacity-20"
              style={{ gridTemplateColumns: `repeat(${services.length}, minmax(0, 1fr))` }}
            >
              {services.map((srv) => (
                <div key={srv.id} className="mx-auto w-px h-full border-l-2 border-dashed border-sky-400" />
              ))}
            </div>

            {/* Steps Flow Rows */}
            {steps.map((st, stepIdx) => {
              const isCurrent = stepIdx === currentStepIndex
              const fromIndex = services.findIndex((s) => s.id === st.fromNode)
              const toIndex = services.findIndex((s) => s.id === st.toNode)
              const isSelf = fromIndex === toIndex

              const minIdx = Math.min(fromIndex, toIndex)

              // Calculate start percentage and width across columns
              const colWidthPercent = 100 / services.length
              const leftPercent = isSelf
                ? fromIndex * colWidthPercent + colWidthPercent / 2
                : minIdx * colWidthPercent + colWidthPercent / 2
              const spanPercent = isSelf
                ? 8
                : Math.abs(toIndex - fromIndex) * colWidthPercent

              const isLeftToRight = toIndex >= fromIndex

              return (
                <div
                  key={st.step}
                  onClick={() => {
                    playStepClickSound()
                    onStepChange(stepIdx)
                  }}
                  className={`group relative cursor-pointer rounded-xl p-3.5 transition-all ${
                    isCurrent
                      ? 'bg-sky-500/10 ring-1 ring-sky-400/60 shadow-lg'
                      : 'hover:bg-bg-surface-2/60 bg-black/30 ring-1 ring-border/40'
                  }`}
                >
                  {/* Step Label & Metadata */}
                  <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          isCurrent
                            ? 'bg-sky-400 text-black shadow-[0_0_8px_#38bdf8]'
                            : 'bg-bg-surface-2 text-text-muted'
                        }`}
                      >
                        {st.step}
                      </span>
                      <span className={`font-semibold ${isCurrent ? 'text-white' : 'text-text-secondary'}`}>
                        {st.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-300 ring-1 ring-sky-500/30">
                        {st.protocol}
                      </span>
                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                        <Clock className="size-3" /> ~{((st.step * 1.37) % 3.4 + 0.9).toFixed(1)}ms
                      </span>
                    </div>
                  </div>

                  {/* Visual Arrow Rail across lifelines */}
                  <div className="relative h-7 w-full my-1">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 flex items-center"
                      style={{
                        left: `${leftPercent}%`,
                        width: isSelf ? '40px' : `${spanPercent}%`,
                      }}
                    >
                      {/* Arrow Line */}
                      <div
                        className={`h-0.5 w-full transition-all ${
                          isCurrent ? 'bg-sky-400 shadow-[0_0_10px_#38bdf8]' : 'bg-border-strong group-hover:bg-sky-400/50'
                        }`}
                      />

                      {/* Directional In-Flight Pulse on Active Step */}
                      {isCurrent && !isSelf && (
                        <div
                          className="absolute -top-[3px] size-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee] animate-pulse pointer-events-none"
                          style={{ left: isLeftToRight ? '65%' : '35%' }}
                        />
                      )}

                      {/* Directional Arrow Head */}
                      {!isSelf && (
                        <div
                          className={`absolute ${
                            isLeftToRight ? 'right-0' : 'left-0 rotate-180'
                          } -translate-y-1/2 top-1/2`}
                        >
                          <div
                            className={`size-0 border-y-4 border-y-transparent ${
                              isLeftToRight
                                ? 'border-l-[8px] border-l-sky-400'
                                : 'border-r-[8px] border-r-sky-400'
                            }`}
                          />
                        </div>
                      )}

                      {/* Self-loop icon if node talks to itself */}
                      {isSelf && (
                        <div className="absolute left-2 -top-3 text-[10px] font-mono text-purple-400 font-bold">
                          ↺ Local IO
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step Code Reference & Explanation */}
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-text-muted pt-1 border-t border-border/30">
                    <span className="text-text-secondary">
                      {st.fromNode} → {st.toNode}: <span className="text-emerald-400">{st.stateChange}</span>
                    </span>
                    <span className="text-accent-brand text-[10.5px]">
                      {st.codeRef.file}:{st.codeRef.lineHighlight}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
