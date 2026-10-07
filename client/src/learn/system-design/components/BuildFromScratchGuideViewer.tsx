import { useState } from 'react'
import type { SystemDesignModel } from '../types'
import { getSystemFromScratchGuide } from '../data/fromScratchGuides'
import {
  Hammer,
  AlertTriangle,
  Code2,
  CheckCircle,
  Copy,
  Check,
  Cpu,
  Layers,
  ShieldAlert,
  Award,
  ArrowRight,
  Database,
  Zap,
} from 'lucide-react'

interface Props {
  system: SystemDesignModel
  onSwitchToVisualizer?: () => void
}

export function BuildFromScratchGuideViewer({ system, onSwitchToVisualizer }: Props) {
  const guide = getSystemFromScratchGuide(system)
  const [selectedStepIdx, setSelectedStepIdx] = useState(0)
  const [copiedCode, setCopiedCode] = useState(false)

  const currentStep = guide.steps[selectedStepIdx] || guide.steps[0]

  const handleCopyCode = () => {
    if (!currentStep) return
    navigator.clipboard.writeText(currentStep.codeSnippet)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Header: From-Scratch Engineering Blueprint */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bg-surface-2 via-bg-surface-1 to-bg-surface-2 p-6 sm:p-8 ring-1 ring-border shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 size-72 rounded-full bg-accent-brand/5 blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-3 py-1 font-mono text-[11px] font-bold text-amber-400 ring-1 ring-amber-400/30">
                <Hammer className="size-3.5" /> 0-to-1 Engineering Blueprint
              </span>
              <span className="rounded-lg bg-accent-brand/10 px-2.5 py-1 font-mono text-[11px] font-bold text-accent-brand ring-1 ring-accent-brand/30">
                {system.difficulty} Architecture
              </span>
              <span className="rounded-lg bg-bg-surface-3 px-2.5 py-1 font-mono text-[11px] text-text-muted ring-1 ring-border">
                {system.category}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
              How to Build {system.name} From Scratch
            </h2>

            <p className="text-[14px] leading-relaxed text-text-secondary">
              {guide.problemStatement}
            </p>
          </div>

          {onSwitchToVisualizer && (
            <button
              onClick={onSwitchToVisualizer}
              className="flex items-center gap-2 rounded-xl bg-accent-brand px-4 py-2 text-[12.5px] font-bold text-bg-base transition hover:opacity-95 shadow-md shadow-accent-brand/20 shrink-0"
            >
              <Zap className="size-4 fill-current" />
              <span>Launch Live Simulator</span>
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>

        {/* Real-World SLA Badges */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-border/60">
          <div className="rounded-xl bg-bg-surface-2/80 p-3 ring-1 ring-border">
            <span className="text-[10px] font-mono font-bold uppercase text-text-muted">Target Throughput</span>
            <p className="mt-0.5 text-[13px] font-bold text-text-primary truncate">{system.throughput}</p>
          </div>
          <div className="rounded-xl bg-bg-surface-2/80 p-3 ring-1 ring-border">
            <span className="text-[10px] font-mono font-bold uppercase text-text-muted">Latency Target</span>
            <p className="mt-0.5 text-[13px] font-bold text-amber-400 truncate">{system.latency}</p>
          </div>
          <div className="rounded-xl bg-bg-surface-2/80 p-3 ring-1 ring-border">
            <span className="text-[10px] font-mono font-bold uppercase text-text-muted">Storage Invariant</span>
            <p className="mt-0.5 text-[13px] font-bold text-sky-400 truncate">{system.storageScale}</p>
          </div>
          <div className="rounded-xl bg-bg-surface-2/80 p-3 ring-1 ring-border">
            <span className="text-[10px] font-mono font-bold uppercase text-text-muted">Services Topology</span>
            <p className="mt-0.5 text-[13px] font-bold text-emerald-400 truncate">{system.services.length} Microservices</p>
          </div>
        </div>
      </div>

      {/* Section 1: Naive Prototype vs Production Reality */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* The Naive Approach */}
        <div className="rounded-2xl bg-bg-surface-2 p-6 ring-1 ring-border space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
              <Database className="size-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-text-primary">1. The Naive Prototype</h3>
              <p className="text-[11px] text-text-muted">How almost everyone starts (and why it passes in school)</p>
            </div>
          </div>

          <div className="rounded-xl bg-bg-surface-1 p-3.5 text-[12.5px] leading-relaxed text-text-secondary ring-1 ring-border font-sans">
            {guide.naiveApproach.description}
          </div>
        </div>

        {/* Why It Breaks in Production */}
        <div className="rounded-2xl bg-rose-500/5 p-6 ring-1 ring-rose-500/20 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-rose-300">2. Why It Breaks at 10M Scale</h3>
              <p className="text-[11px] text-rose-400/80">Hardware ceilings and distributed failure points</p>
            </div>
          </div>

          <ul className="space-y-2 text-[12px] text-text-secondary">
            {guide.naiveApproach.whyItBreaks.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="size-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                <span className="leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Section 2: Core Data Structures & Invariants */}
      <div className="rounded-2xl bg-bg-surface-2 p-6 ring-1 ring-border space-y-5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-accent-brand" />
            <h3 className="text-[16px] font-bold text-text-primary">
              Core Data Structures & Algorithmic Invariants
            </h3>
          </div>
          <span className="text-[11px] font-mono text-text-muted">
            Fundamental Computer Science Primitives
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {guide.coreDataStructures.map((ds, idx) => (
            <div key={idx} className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono text-[13px] text-text-primary">{ds.name}</span>
                </div>
                <p className="mt-1.5 text-[12px] text-text-secondary leading-relaxed">
                  {ds.purpose}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/40 font-mono text-[10.5px]">
                <div className="flex items-center justify-between text-text-muted">
                  <span>Time Complexity:</span>
                  <span className="text-emerald-400 font-bold">{ds.timeComplexity}</span>
                </div>
                <div className="flex items-center justify-between text-text-muted">
                  <span>Space Complexity:</span>
                  <span className="text-sky-400 font-bold">{ds.spaceComplexity}</span>
                </div>
                {ds.asciiDiagram && (
                  <div className="mt-2 rounded bg-black/60 p-2 text-[10px] text-amber-300 overflow-x-auto whitespace-pre">
                    {ds.asciiDiagram}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Interactive Step-by-Step From-Scratch Build Blueprint */}
      <div className="rounded-2xl bg-bg-surface-2 p-6 sm:p-8 ring-1 ring-border shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h3 className="text-[18px] font-bold text-text-primary flex items-center gap-2">
              <Layers className="size-5 text-amber-400" />
              Step-by-Step From-Scratch Implementation Blueprint
            </h3>
            <p className="text-[12px] text-text-muted mt-0.5">
              Click through each architectural layer to see real production code and design decisions.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {guide.steps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedStepIdx(idx)}
                className={`flex size-8 items-center justify-center rounded-lg font-mono text-[12px] font-bold transition ring-1 ${
                  selectedStepIdx === idx
                    ? 'bg-amber-400 text-black ring-amber-400 shadow-md shadow-amber-400/20'
                    : 'bg-bg-surface-1 text-text-muted ring-border hover:text-text-primary hover:bg-bg-surface-3'
                }`}
              >
                {step.stepNumber}
              </button>
            ))}
          </div>
        </div>

        {/* Active Step Details */}
        {currentStep && (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-[11px] text-amber-400 font-bold uppercase">
                <span>Phase {currentStep.stepNumber} of {guide.steps.length}</span>
                <span>·</span>
                <span>{currentStep.fileName}</span>
              </div>
              <h4 className="text-[20px] font-extrabold text-text-primary">
                {currentStep.title}
              </h4>
              <p className="text-[13px] font-medium text-text-secondary">
                {currentStep.subtitle}
              </p>
            </div>

            <p className="text-[13px] text-text-secondary leading-relaxed bg-bg-surface-1 p-3.5 rounded-xl ring-1 ring-border">
              {currentStep.concept}
            </p>

            {/* Code Box */}
            <div className="relative rounded-2xl bg-black/90 ring-1 ring-border overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-white/5 text-[11px] font-mono">
                <div className="flex items-center gap-2 text-text-muted">
                  <Code2 className="size-3.5 text-accent-brand" />
                  <span className="font-bold text-text-primary">{currentStep.fileName}</span>
                  <span className="rounded bg-accent-brand/10 px-1.5 py-0.2 text-[10px] text-accent-brand uppercase">
                    {currentStep.language}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-text-muted hover:text-text-primary hover:bg-white/20 transition"
                >
                  {copiedCode ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="max-h-[380px] overflow-y-auto p-4 text-[12px] font-mono leading-relaxed text-emerald-300">
                <pre className="whitespace-pre">
                  {currentStep.codeSnippet.split('\n').map((line, idx) => (
                    <div key={idx} className="flex hover:bg-white/5 px-1 rounded">
                      <span className="w-8 shrink-0 text-right pr-4 select-none text-text-muted/50 text-[10.5px]">
                        {idx + 1}
                      </span>
                      <span className="text-text-primary">{line}</span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>

            {/* Step Explanation & Key Takeaway */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-1.5">
                <span className="text-[11px] font-mono font-bold uppercase text-text-muted">
                  How This Works Line-by-Line:
                </span>
                <p className="text-[12.5px] text-text-secondary leading-relaxed">
                  {currentStep.explanation}
                </p>
              </div>

              <div className="rounded-xl bg-amber-400/5 p-4 ring-1 ring-amber-400/20 space-y-1.5">
                <span className="text-[11px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <Zap className="size-3.5" /> Key Architectural Invariant:
                </span>
                <p className="text-[12.5px] text-text-primary leading-relaxed font-medium">
                  {currentStep.keyTakeaway}
                </p>
              </div>
            </div>

            {/* Step Navigation Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                onClick={() => setSelectedStepIdx(Math.max(0, selectedStepIdx - 1))}
                disabled={selectedStepIdx === 0}
                className="rounded-lg bg-bg-surface-1 px-3 py-1.5 text-[12px] font-medium text-text-muted hover:text-text-primary disabled:opacity-40 ring-1 ring-border transition"
              >
                ← Previous Step
              </button>
              <span className="font-mono text-[11px] text-text-muted">
                Step {selectedStepIdx + 1} of {guide.steps.length}
              </span>
              <button
                onClick={() => setSelectedStepIdx(Math.min(guide.steps.length - 1, selectedStepIdx + 1))}
                disabled={selectedStepIdx === guide.steps.length - 1}
                className="rounded-lg bg-accent-brand px-3 py-1.5 text-[12px] font-bold text-bg-base hover:opacity-90 disabled:opacity-40 transition shadow-sm"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Production Disaster Scenarios & Chaos Mitigation */}
      <div className="rounded-2xl bg-bg-surface-2 p-6 ring-1 ring-border space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-rose-400" />
          <h3 className="text-[16px] font-bold text-text-primary">
            Production Chaos Drills & Disaster Mitigations
          </h3>
        </div>
        <p className="text-[12px] text-text-muted">
          Real outage scenarios observed at FAANG scale and how this system self-heals without data loss.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {guide.disasterScenarios.map((scenario, idx) => (
            <div key={idx} className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-rose-400" />
                <span className="font-bold text-[13px] text-rose-300">{scenario.incident}</span>
              </div>
              <p className="text-[11.5px] text-text-muted">{scenario.impact}</p>
              <div className="pt-2 border-t border-border/40">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 block mb-0.5">
                  Mitigation & Self-Healing:
                </span>
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  {scenario.mitigationCodeOrStrategy}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Staff+ FAANG Interview Playbook */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-bg-surface-2 to-bg-surface-1 p-6 ring-1 ring-emerald-500/30 space-y-4">
        <div className="flex items-center gap-2.5">
          <Award className="size-5 text-emerald-400" />
          <h3 className="text-[16px] font-bold text-emerald-300">
            FAANG Senior / Staff Interview Playbook
          </h3>
        </div>

        <ul className="grid gap-2.5 sm:grid-cols-2 text-[12.5px] text-text-secondary">
          {guide.faangInterviewTips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2.5 rounded-lg bg-bg-surface-1/60 p-3 ring-1 ring-border">
              <CheckCircle className="size-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
