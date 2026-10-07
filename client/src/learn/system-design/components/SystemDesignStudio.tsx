import React, { useState } from 'react'
import type { SystemCategory } from '../types'
import { ALL_SYSTEM_DESIGNS } from '../data/systemsData'
import { SystemVisualizer } from './SystemVisualizer'
import { CodeTalksViewer } from './CodeTalksViewer'
import { SystemNotesReader } from './SystemNotesReader'
import { InteractiveCapacityCalculator } from './InteractiveCapacityCalculator'
import { InfrastructureTopologyMatrix } from './InfrastructureTopologyMatrix'
import { SequenceDiagramViewer } from './SequenceDiagramViewer'
import { ChapterConceptAnimator } from './ConceptAnimators'
import {
  BookOpen,
  Layers,
  Cpu,
  Database,
  Globe,
  Search,
  CheckCircle,
  Shield,
  Calculator,
  Activity,
  Radio,
  Sparkles,
} from 'lucide-react'

const CATEGORIES: ('All' | SystemCategory)[] = [
  'All',
  'Distributed Core',
  'High-Concurrency & Social',
  'Low-Latency & Streaming',
  'Storage & Databases',
  'Geospatial & Search',
  'Financial & Reliability',
]

export const SystemDesignStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'visualizer' | 'notes'>('visualizer')
  const [systemView, setSystemView] = useState<'simulation' | 'sequence' | 'simulators' | 'capacity' | 'matrix'>('simulation')
  const [selectedCategory, setSelectedCategory] = useState<'All' | SystemCategory>('All')
  const [selectedSystemId, setSelectedSystemId] = useState<string>('tinyurl')
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [systemSearch, setSystemSearch] = useState<string>('')

  // Filter systems
  const filteredSystems = ALL_SYSTEM_DESIGNS.filter((sys) => {
    const matchesCat = selectedCategory === 'All' || sys.category === selectedCategory
    const matchesSearch =
      systemSearch === '' ||
      sys.name.toLowerCase().includes(systemSearch.toLowerCase()) ||
      sys.tagline.toLowerCase().includes(systemSearch.toLowerCase())
    return matchesCat && matchesSearch
  })

  const currentSystem =
    ALL_SYSTEM_DESIGNS.find((s) => s.id === selectedSystemId) || ALL_SYSTEM_DESIGNS[0]
  const currentStep = currentSystem.animationSteps[currentStepIndex] || currentSystem.animationSteps[0]

  const handleSelectSystem = (id: string) => {
    setSelectedSystemId(id)
    setCurrentStepIndex(0)
  }

  return (
    <div className="space-y-6">
      {/* Studio Header & Mode Switcher */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-border bg-gradient-to-r from-bg-surface-2 via-bg-surface-3/50 to-bg-surface-2 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex size-2 rounded-full bg-accent-brand animate-ping" />
                <span className="text-[11px] font-bold tracking-widest text-accent-brand uppercase">
                  Nexora Engineering · Master Curriculum
                </span>
              </div>
              <h2 className="!text-[28px] sm:!text-[32px] font-bold tracking-tight text-text-primary">
                System Design Interactive Studio
              </h2>
              <p className="mt-1 text-[14.5px] text-text-secondary max-w-2xl leading-relaxed">
                Step-by-step visual animation simulations of 30 top-level production systems showing how code talks across services, paired with 56 chapters of in-depth architectural notes.
              </p>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center rounded-xl bg-bg-surface-1 p-1 ring-1 ring-border shadow-sm">
              <button
                onClick={() => setActiveTab('visualizer')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                  activeTab === 'visualizer'
                    ? 'bg-accent-brand text-bg-base shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Cpu className="size-4" /> 30 Interactive Systems
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                  activeTab === 'notes'
                    ? 'bg-accent-brand text-bg-base shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <BookOpen className="size-4" /> 56 Chapter Notes (50+ Pages)
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'visualizer' ? (
        <div className="space-y-6">
          {/* Systems Picker & Filters Bar */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition ${
                      selectedCategory === cat
                        ? 'bg-accent-brand text-bg-base font-bold'
                        : 'bg-bg-surface-2 text-text-muted hover:bg-bg-surface-3 hover:text-text-primary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Filter 30 systems..."
                  value={systemSearch}
                  onChange={(e) => setSystemSearch(e.target.value)}
                  className="w-full rounded-lg bg-bg-surface-2 pl-8 pr-3 py-1.5 text-[12px] text-text-primary ring-1 ring-border placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-brand"
                />
              </div>
            </div>

            {/* Horizontal Scrollable Systems Carousel */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {filteredSystems.map((sys) => {
                const isSelected = sys.id === currentSystem.id
                return (
                  <button
                    key={sys.id}
                    onClick={() => handleSelectSystem(sys.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 transition-all ${
                      isSelected
                        ? 'bg-accent-brand/15 ring-2 ring-accent-brand text-text-primary shadow-sm font-semibold'
                        : 'bg-bg-surface-2 ring-1 ring-border text-text-muted hover:bg-bg-surface-3 hover:text-text-primary'
                    }`}
                  >
                    <span className="flex size-2 rounded-full bg-accent-brand" />
                    <span className="text-[12px] whitespace-nowrap">{sys.name}</span>
                    <span className="rounded bg-bg-surface-1 px-1.5 py-0.2 font-mono text-[9px] uppercase text-text-muted">
                      {sys.category.split(' ')[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active System Hero Banner */}
          <div className="rounded-2xl bg-bg-surface-2 p-6 ring-1 ring-border space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="font-mono text-[11px] font-bold text-accent-brand uppercase tracking-wider">
                  {currentSystem.category} · {currentSystem.difficulty}
                </span>
                <h3 className="!text-[22px] sm:!text-[26px] font-bold text-text-primary mt-1">
                  {currentSystem.name}
                </h3>
              </div>
            </div>

            <p className="text-[14px] text-text-secondary leading-relaxed max-w-3xl">
              {currentSystem.overview}
            </p>

            {/* Key Scalability Metrics Badges */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
              <div className="rounded-xl bg-bg-surface-3/60 p-3 ring-1 ring-border">
                <span className="text-[10px] font-mono font-bold uppercase text-text-muted block">
                  Throughput Target
                </span>
                <span className="text-[12.5px] font-semibold text-text-primary">
                  {currentSystem.throughput}
                </span>
              </div>
              <div className="rounded-xl bg-bg-surface-3/60 p-3 ring-1 ring-border">
                <span className="text-[10px] font-mono font-bold uppercase text-text-muted block">
                  Latency SLA
                </span>
                <span className="text-[12.5px] font-semibold text-text-primary">
                  {currentSystem.latency}
                </span>
              </div>
              <div className="rounded-xl bg-bg-surface-3/60 p-3 ring-1 ring-border">
                <span className="text-[10px] font-mono font-bold uppercase text-text-muted block">
                  Data Footprint
                </span>
                <span className="text-[12.5px] font-semibold text-text-primary">
                  {currentSystem.storageScale}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-view Navigation Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-bg-surface-2 p-1 ring-1 ring-border text-[12px] font-mono">
              <button
                onClick={() => setSystemView('simulation')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
                  systemView === 'simulation'
                    ? 'bg-accent-brand text-bg-base font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Activity className="size-3.5" /> Simulation & Code Walks
              </button>
              <button
                onClick={() => setSystemView('sequence')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
                  systemView === 'sequence'
                    ? 'bg-sky-400 text-black font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Radio className="size-3.5" /> UML Sequence Flow
              </button>
              <button
                onClick={() => setSystemView('simulators')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
                  systemView === 'simulators'
                    ? 'bg-rose-500 text-white font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Sparkles className="size-3.5" /> 10 Concept Simulators
              </button>
              <button
                onClick={() => setSystemView('capacity')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
                  systemView === 'capacity'
                    ? 'bg-amber-400 text-black font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Calculator className="size-3.5" /> Interactive Capacity Sizer
              </button>
              <button
                onClick={() => setSystemView('matrix')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
                  systemView === 'matrix'
                    ? 'bg-purple-500 text-white font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Layers className="size-3.5" /> 31 Systems Infrastructure Matrix
              </button>
            </div>
          </div>

          {/* Conditional View Rendering */}
          {systemView === 'simulation' ? (
            /* Side-by-Side or Stacked Visualizer and Code Inspector */
            <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
              {/* Live Interactive Architecture Visualizer */}
              <SystemVisualizer
                system={currentSystem}
                currentStepIndex={currentStepIndex}
                onStepChange={setCurrentStepIndex}
              />

              {/* Code Interlock: How Code Talks With Each Other */}
              <CodeTalksViewer system={currentSystem} currentStep={currentStep} />
            </div>
          ) : systemView === 'sequence' ? (
            /* Interactive UML Sequence Flow & Code Interlock */
            <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
              <SequenceDiagramViewer
                system={currentSystem}
                currentStepIndex={currentStepIndex}
                onStepChange={setCurrentStepIndex}
              />
              <CodeTalksViewer system={currentSystem} currentStep={currentStep} />
            </div>
          ) : systemView === 'simulators' ? (
            /* 10 Interactive Concept Simulators */
            <div className="rounded-2xl bg-bg-surface-2 p-5 ring-1 ring-border shadow-xl">
              <ChapterConceptAnimator unitId="unit-1" chapterNumber={1} />
            </div>
          ) : systemView === 'capacity' ? (
            /* Interactive Capacity Calculator */
            <InteractiveCapacityCalculator system={currentSystem} />
          ) : (
            /* All 31 Systems Infrastructure Matrix */
            <InfrastructureTopologyMatrix
              systems={ALL_SYSTEM_DESIGNS}
              selectedSystemId={currentSystem.id}
              onSelectSystem={(id) => {
                handleSelectSystem(id)
                setSystemView('simulation')
              }}
            />
          )}

          {/* Deep-Dive Architectural Specifications */}
          <div className="rounded-2xl bg-bg-surface-2 p-6 sm:p-8 ring-1 ring-border space-y-6">
            <h3 className="text-[18px] font-bold text-text-primary flex items-center gap-2">
              <Layers className="size-5 text-accent-brand" /> End-to-End Architectural Blueprint
            </h3>

            {/* Requirements & Capacity Estimation */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Requirements */}
              <div className="space-y-3">
                <h4 className="text-[13px] font-bold uppercase tracking-wider text-text-muted">
                  Functional & Non-Functional Scope
                </h4>
                <ul className="space-y-1.5 text-[13px] text-text-secondary">
                  {currentSystem.functionalReqs.map((req, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="size-3.5 text-accent-brand shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Back-of-the-Envelope Math */}
              <div className="space-y-3">
                <h4 className="text-[13px] font-bold uppercase tracking-wider text-text-muted">
                  Back-of-the-Envelope Capacity Calculations
                </h4>
                <div className="space-y-2">
                  {currentSystem.calculations.map((calc, i) => (
                    <div key={i} className="rounded-lg bg-bg-surface-1 p-2.5 ring-1 ring-border text-[12px] font-mono">
                      <span className="font-semibold text-text-primary">{calc.metric}:</span>
                      <p className="text-text-muted text-[11px] my-0.5">{calc.formula}</p>
                      <span className="text-accent-brand font-bold text-[11.5px]">{calc.result}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Database Schema & API Contract */}
            <div className="grid gap-6 md:grid-cols-2 pt-2 border-t border-border">
              {/* DB Schema */}
              <div className="space-y-2">
                <h4 className="text-[13px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Database className="size-4 text-accent-brand" /> Data Modeling & Schema
                </h4>
                <pre className="max-h-[220px] overflow-auto rounded-xl bg-bg-surface-1 p-3 text-[11px] font-mono text-text-primary ring-1 ring-border">
                  {currentSystem.deepDive.databaseSchema}
                </pre>
              </div>

              {/* API Endpoints */}
              <div className="space-y-2">
                <h4 className="text-[13px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Globe className="size-4 text-accent-brand" /> API Contracts
                </h4>
                <div className="space-y-2 max-h-[220px] overflow-auto pr-1">
                  {currentSystem.deepDive.apiEndpoints.map((ep, i) => (
                    <div key={i} className="rounded-xl bg-bg-surface-1 p-2.5 ring-1 ring-border text-[12px]">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="rounded bg-accent-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-accent-brand">
                          {ep.method}
                        </span>
                        <span className="font-semibold text-text-primary">{ep.path}</span>
                      </div>
                      <p className="text-[11.5px] text-text-secondary mt-1">{ep.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottlenecks & Failure Modes */}
            <div className="space-y-2 pt-2 border-t border-border">
              <h4 className="text-[13px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Shield className="size-4 text-rose-400" /> Bottlenecks & High-Scale Failure Mitigations
              </h4>
              <div className="space-y-2">
                {currentSystem.deepDive.bottlenecksAndTradeoffs.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-xl bg-rose-500/5 p-3 ring-1 ring-rose-500/20 text-[12.5px] text-text-secondary">
                    <span className="mt-1 flex size-1.5 shrink-0 rounded-full bg-rose-400" />
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Notes Tab: In-Depth 56 Chapter Textbook */
        <SystemNotesReader />
      )}
    </div>
  )
}
