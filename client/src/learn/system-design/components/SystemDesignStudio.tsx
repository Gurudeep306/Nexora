import React, { useState, useMemo } from 'react'
import { ALL_SYSTEM_DESIGNS } from '../data/systemsData'
import {
  DOMAIN_CATEGORIES,
  SYSTEM_METADATA_REGISTRY,
} from '../data/systemMetadataRegistry'
import { SystemVisualizer } from './SystemVisualizer'
import { CodeTalksViewer } from './CodeTalksViewer'
import { SystemNotesReader } from './SystemNotesReader'
import { InteractiveCapacityCalculator } from './InteractiveCapacityCalculator'
import { SequenceDiagramViewer } from './SequenceDiagramViewer'
import { MockInterviewSimulator } from './MockInterviewSimulator'
import { SpecializedDomainEngines } from './SpecializedDomainEngines'
import { BuildFromScratchGuideViewer } from './BuildFromScratchGuideViewer'
import {
  BookOpen,
  Layers,
  Cpu,
  Search,
  Shield,
  Calculator,
  Activity,
  Radio,
  Sparkles,
  Award,
  LayoutGrid,
  Hammer,
  CreditCard,
  Video,
  MapPin,
  Table,
  SlidersHorizontal,
  X,
} from 'lucide-react'

const TECH_PILLS = [
  'All Tech',
  'Redis',
  'Kafka',
  'PostgreSQL',
  'Cassandra',
  'WebSockets',
  'gRPC',
  'Uber H3',
  'FastCDC',
  'BM25',
  'Amazon S3',
  'Go',
]

const DIFFICULTY_PILLS = ['All', 'Foundational', 'Advanced', 'Staff+']

const DOMAIN_COLOR_MAP: Record<string, { badge: string; text: string; border: string }> = {
  'Distributed Core & Consensus': {
    badge: 'bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/30',
    text: 'text-amber-400',
    border: 'border-amber-400',
  },
  'High-Concurrency Social & Feeds': {
    badge: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30',
    text: 'text-rose-400',
    border: 'border-rose-500',
  },
  'Media Streaming & Cloud Storage': {
    badge: 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30',
    text: 'text-purple-400',
    border: 'border-purple-500',
  },
  'Financial & High-Frequency Engines': {
    badge: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30',
    text: 'text-emerald-400',
    border: 'border-emerald-500',
  },
  'Geospatial & Information Retrieval': {
    badge: 'bg-sky-400/10 text-sky-400 ring-1 ring-sky-400/30',
    text: 'text-sky-400',
    border: 'border-sky-400',
  },
  'Cloud Infrastructure & Reliability': {
    badge: 'bg-indigo-400/10 text-indigo-400 ring-1 ring-indigo-400/30',
    text: 'text-indigo-400',
    border: 'border-indigo-400',
  },
}

const DOMAIN_ICON_MAP: Record<string, React.ReactNode> = {
  Cpu: <Cpu className="size-4" />,
  Activity: <Activity className="size-4" />,
  Video: <Video className="size-4" />,
  CreditCard: <CreditCard className="size-4" />,
  MapPin: <MapPin className="size-4" />,
  Shield: <Shield className="size-4" />,
}

export const SystemDesignStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'visualizer' | 'notes'>('visualizer')
  const [systemView, setSystemView] = useState<
    'simulation' | 'from-scratch' | 'sequence' | 'simulators' | 'interview' | 'engines' | 'capacity' | 'matrix'
  >('simulation')

  /* Navigation & Filter State */
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all')
  const [selectedTech, setSelectedTech] = useState<string>('All Tech')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All')
  const [systemSearch, setSystemSearch] = useState<string>('')
  const [browseMode, setBrowseMode] = useState<'matrix' | 'catalog' | 'table'>('matrix')
  const [selectedSystemId, setSelectedSystemId] = useState<string>('tinyurl')
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [canvasLayout, setCanvasLayout] = useState<'blueprint' | 'split'>('blueprint')
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false)

  // Filtered systems computation
  const filteredSystems = useMemo(() => {
    return ALL_SYSTEM_DESIGNS.filter((sys) => {
      const meta = SYSTEM_METADATA_REGISTRY[sys.id]

      // Domain filter
      let matchesDomain = true
      if (selectedDomainId !== 'all') {
        const domainObj = DOMAIN_CATEGORIES.find((d) => d.id === selectedDomainId)
        if (domainObj && meta) {
          matchesDomain = meta.domain === domainObj.name
        }
      }

      // Tech filter
      let matchesTech = true
      if (selectedTech !== 'All Tech') {
        const techLower = selectedTech.toLowerCase()
        const metaTechs = (meta?.technologies || []).map((t) => t.toLowerCase())
        const sysServices = sys.services.map((s) => s.techStack.toLowerCase()).join(' ')
        matchesTech =
          metaTechs.some((t) => t.includes(techLower)) || sysServices.includes(techLower)
      }

      // Difficulty filter
      let matchesDifficulty = true
      if (selectedDifficulty !== 'All') {
        const targetDiff = selectedDifficulty.toLowerCase()
        matchesDifficulty =
          (meta?.difficulty || sys.difficulty).toLowerCase().includes(targetDiff) ||
          sys.difficulty.toLowerCase().includes(targetDiff)
      }

      // Search filter (searches across name, archetype, what-it-does, tech, and tagline)
      let matchesSearch = true
      if (systemSearch.trim() !== '') {
        const q = systemSearch.toLowerCase()
        const metaStr = `${meta?.realWorldArchetype || ''} ${meta?.whatItDoes || ''} ${meta?.architecturePattern || ''} ${(meta?.technologies || []).join(' ')}`.toLowerCase()
        const sysStr = `${sys.name} ${sys.tagline} ${sys.overview} ${sys.category}`.toLowerCase()
        matchesSearch = metaStr.includes(q) || sysStr.includes(q)
      }

      return matchesDomain && matchesTech && matchesDifficulty && matchesSearch
    })
  }, [selectedDomainId, selectedTech, selectedDifficulty, systemSearch])

  const currentSystem =
    ALL_SYSTEM_DESIGNS.find((s) => s.id === selectedSystemId) || ALL_SYSTEM_DESIGNS[0]
  const currentMeta = SYSTEM_METADATA_REGISTRY[currentSystem.id]
  const currentStep =
    currentSystem.animationSteps[currentStepIndex] || currentSystem.animationSteps[0]

  const handleSelectSystem = (id: string) => {
    setSelectedSystemId(id)
    setCurrentStepIndex(0)
    window.scrollTo({ top: 380, behavior: 'smooth' })
  }

  // Count systems per domain for badges
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    DOMAIN_CATEGORIES.forEach((d) => {
      counts[d.id] = ALL_SYSTEM_DESIGNS.filter(
        (s) => SYSTEM_METADATA_REGISTRY[s.id]?.domain === d.name
      ).length
    })
    return counts
  }, [])

  return (
    <div className="space-y-6">
      {/* Studio Master Header */}
      <div className="card overflow-hidden p-0 ring-1 ring-border shadow-2xl">
        <div className="border-b border-border bg-gradient-to-r from-bg-surface-2 via-bg-surface-3/60 to-bg-surface-2 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex size-2 rounded-full bg-accent-brand animate-ping" />
                <span className="text-[11px] font-bold tracking-widest text-accent-brand uppercase font-mono">
                  Nexora Distributed Systems Masterclass
                </span>
              </div>
              <h1 className="!text-[28px] sm:!text-[34px] font-extrabold tracking-tight text-text-primary">
                System Design Interactive Studio
              </h1>
              <p className="mt-1 text-[14.5px] text-text-secondary max-w-3xl leading-relaxed">
                The ultimate one-stop curriculum: 31 production architectures simulated live with packet transmissions, 56 in-depth theory chapters, from-scratch 0-to-1 blueprints, and live algorithm playgrounds.
              </p>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center rounded-xl bg-bg-surface-1 p-1 ring-1 ring-border shadow-md">
              <button
                onClick={() => setActiveTab('visualizer')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-bold transition ${
                  activeTab === 'visualizer'
                    ? 'bg-accent-brand text-bg-base shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Cpu className="size-4" /> 31 Interactive Systems
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-bold transition ${
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
          {/* SECTION 1: ARCHITECTURAL DOMAIN CATEGORY HUB */}
          <div className="rounded-2xl bg-bg-surface-2 p-5 ring-1 ring-border shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div>
                <h3 className="text-[16px] font-bold text-text-primary flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-accent-brand" />
                  Architectural Domains & System Archetypes
                </h3>
                <p className="text-[12px] text-text-muted mt-0.5">
                  Click any architectural domain to inspect systems by their core distributed engineering discipline.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCompareModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-bg-surface-1 px-3 py-1.5 text-[11.5px] font-mono font-bold text-sky-400 hover:text-sky-300 ring-1 ring-sky-500/30 transition shadow-sm"
                >
                  <Table className="size-3.5" /> Compare All 31 Systems Side-by-Side
                </button>
                <button
                  onClick={() => setSelectedDomainId('all')}
                  className={`rounded-lg px-3 py-1.5 text-[11.5px] font-mono font-bold transition ring-1 ${
                    selectedDomainId === 'all'
                      ? 'bg-accent-brand text-bg-base ring-accent-brand'
                      : 'bg-bg-surface-1 text-text-muted ring-border hover:text-text-primary'
                  }`}
                >
                  All 31 Systems
                </button>
              </div>
            </div>

            {/* Interactive Domain Taxonomy Bar */}
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-bg-surface-1 ring-1 ring-border">
              <button
                onClick={() => setSelectedDomainId('all')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-mono font-bold transition ${
                  selectedDomainId === 'all'
                    ? 'bg-accent-brand text-bg-base shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-surface-2'
                }`}
              >
                <span>🌐 All 31 Systems</span>
                <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[9.5px]">31</span>
              </button>
              {DOMAIN_CATEGORIES.map((domain) => {
                const count = domainCounts[domain.id] || 0
                const isSelected = selectedDomainId === domain.id
                return (
                  <button
                    key={domain.id}
                    onClick={() => setSelectedDomainId(isSelected ? 'all' : domain.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-mono font-bold transition ${
                      isSelected
                        ? 'bg-accent-brand text-bg-base shadow-sm'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-surface-2'
                    }`}
                  >
                    <span>{DOMAIN_ICON_MAP[domain.icon]}</span>
                    <span>{domain.name.split('&')[0].trim()}</span>
                    <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[9.5px]">
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Active Domain Explainer Banner */}
            {selectedDomainId !== 'all' ? (
              (() => {
                const activeDomain = DOMAIN_CATEGORIES.find((d) => d.id === selectedDomainId)
                if (!activeDomain) return null
                return (
                  <div className="rounded-xl bg-accent-brand/5 border border-accent-brand/20 p-3.5 flex flex-wrap items-center justify-between gap-3 text-[12px] animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-accent-brand/20 text-accent-brand">
                        {DOMAIN_ICON_MAP[activeDomain.icon]}
                      </span>
                      <div>
                        <span className="font-mono font-bold text-accent-brand block">
                          {activeDomain.name} · {activeDomain.badgeText}
                        </span>
                        <p className="text-text-secondary text-[11.5px] mt-0.5 font-sans">
                          {activeDomain.description}
                        </p>
                      </div>
                    </div>
                    <div className="font-mono text-[11px] text-text-muted">
                      Archetypes: <strong className="text-text-primary">{activeDomain.archetypesSummary}</strong>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div className="rounded-xl bg-bg-surface-1 p-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-text-muted border border-border/60">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-accent-brand animate-ping" />
                  <span>Showing all 31 distributed systems across 6 architectural disciplines.</span>
                </div>
                <span className="text-accent-brand font-bold">Select any domain tab to isolate specific system types</span>
              </div>
            )}

            {/* Secondary Filter Bar: Tech Stack & Difficulty & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
              <div className="flex flex-wrap items-center gap-2">
                {/* Tech Pills */}
                <span className="text-[11px] font-mono font-bold text-text-muted uppercase mr-1">
                  Tech:
                </span>
                <div className="flex flex-wrap gap-1">
                  {TECH_PILLS.map((tech) => (
                    <button
                      key={tech}
                      onClick={() => setSelectedTech(tech)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-medium transition ${
                        selectedTech === tech
                          ? 'bg-sky-400 text-black font-bold ring-1 ring-sky-400'
                          : 'bg-bg-surface-1 text-text-muted hover:text-text-primary ring-1 ring-border'
                      }`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Mode Toggle & Search */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Difficulty */}
                <div className="flex items-center gap-1 rounded-lg bg-bg-surface-1 p-0.5 ring-1 ring-border">
                  {DIFFICULTY_PILLS.map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`px-2 py-0.5 text-[10.5px] font-mono font-bold rounded ${
                        selectedDifficulty === diff
                          ? 'bg-amber-400 text-black shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>

                {/* View Switcher */}
                <div className="flex items-center rounded-lg bg-bg-surface-1 p-0.5 ring-1 ring-border">
                  <button
                    onClick={() => setBrowseMode('matrix')}
                    className={`px-2 py-1 text-[11px] font-mono font-bold rounded flex items-center gap-1 ${
                      browseMode === 'matrix'
                        ? 'bg-accent-brand text-bg-base'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                    title="Domain Grouped Matrix View"
                  >
                    <Layers className="size-3" /> Matrix
                  </button>
                  <button
                    onClick={() => setBrowseMode('catalog')}
                    className={`px-2 py-1 text-[11px] font-mono font-bold rounded flex items-center gap-1 ${
                      browseMode === 'catalog'
                        ? 'bg-accent-brand text-bg-base'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                    title="Flat Bento Catalog View"
                  >
                    <LayoutGrid className="size-3" /> Catalog
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search name, tech, pattern..."
                    value={systemSearch}
                    onChange={(e) => setSystemSearch(e.target.value)}
                    className="w-full rounded-lg bg-bg-surface-1 pl-8 pr-3 py-1.5 text-[12px] text-text-primary ring-1 ring-border placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-brand"
                  />
                  {systemSearch && (
                    <button
                      onClick={() => setSystemSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: SYSTEM CARDS BROWSER */}
          {browseMode === 'matrix' ? (
            /* VIEW MODE A: DOMAIN GROUPED ARCHITECTURAL MATRIX (Default / Best UX) */
            <div className="space-y-6">
              {DOMAIN_CATEGORIES.filter(
                (d) => selectedDomainId === 'all' || d.id === selectedDomainId
              ).map((domain) => {
                const domainSystems = filteredSystems.filter(
                  (s) => SYSTEM_METADATA_REGISTRY[s.id]?.domain === domain.name
                )
                if (domainSystems.length === 0) return null

                return (
                  <div
                    key={domain.id}
                    className="rounded-2xl bg-bg-surface-2 p-5 ring-1 ring-border shadow-xl space-y-4"
                  >
                    {/* Domain Category Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-accent-brand/10 text-accent-brand ring-1 ring-accent-brand/20">
                          {DOMAIN_ICON_MAP[domain.icon] || <Cpu className="size-4" />}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-[16px] text-text-primary font-mono">
                            {domain.name}
                          </h4>
                          <p className="text-[11.5px] text-text-muted">
                            {domain.description}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-accent-brand font-bold bg-bg-surface-1 px-2.5 py-1 rounded-lg ring-1 ring-border">
                        {domainSystems.length} Production Systems
                      </span>
                    </div>

                    {/* System Cards in this Domain */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {domainSystems.map((sys) => {
                        const meta = SYSTEM_METADATA_REGISTRY[sys.id]
                        const isSelected = sys.id === currentSystem.id
                        const domainStyle = DOMAIN_COLOR_MAP[meta?.domain || ''] || {
                          badge: 'bg-accent-brand/10 text-accent-brand ring-1 ring-accent-brand/30',
                          text: 'text-accent-brand',
                          border: 'border-accent-brand',
                        }

                        return (
                          <div
                            key={sys.id}
                            onClick={() => handleSelectSystem(sys.id)}
                            className={`cursor-pointer rounded-xl p-4.5 transition-all duration-200 flex flex-col justify-between ring-1 ${
                              isSelected
                                ? 'bg-accent-brand/15 ring-2 ring-accent-brand shadow-xl scale-[1.01]'
                                : 'bg-bg-surface-1/90 ring-border hover:bg-bg-surface-3 hover:ring-border-strong hover:scale-[1.01]'
                            }`}
                          >
                            <div className="space-y-2">
                              {/* Header Badges */}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold truncate ${domainStyle.badge}`}>
                                  {meta?.domain || sys.category}
                                </span>
                                <span className="font-mono text-[10px] text-text-muted font-bold shrink-0">
                                  {meta?.difficulty || sys.difficulty}
                                </span>
                              </div>

                              <div>
                                <span className="text-[11px] font-mono text-amber-400 font-bold block mb-0.5">
                                  ⚡ Modeled on: {meta?.realWorldArchetype || sys.name}
                                </span>
                                <h5 className="font-bold text-[15px] text-text-primary font-mono leading-snug">
                                  {sys.name}
                                </h5>
                              </div>

                              {/* WHAT IT DOES CALLOUT (Core value explanation) */}
                              <div className={`my-2 rounded-lg bg-bg-surface-2 p-2.5 text-[11.5px] leading-relaxed text-text-secondary border-l-2 ${domainStyle.border} font-sans shadow-inner`}>
                                <span className={`font-bold text-[10px] uppercase font-mono block mb-0.5 ${domainStyle.text}`}>
                                  What It Does & Why It Exists:
                                </span>
                                {meta?.whatItDoes || sys.tagline}
                              </div>

                              {/* Core Pattern & Tech */}
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-sky-400 font-medium">
                                  <Sparkles className="size-3 shrink-0" />
                                  <span className="truncate">
                                    {meta?.architecturePattern || sys.category}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {(meta?.technologies || []).slice(0, 4).map((tech, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="rounded bg-bg-surface-3 px-1.5 py-0.2 text-[9.5px] font-mono text-text-muted ring-1 ring-border"
                                    >
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Scale SLAs & Action Footer */}
                            <div className="pt-3 mt-2 border-t border-border/40 space-y-2">
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                <div>
                                  <span className="text-text-muted uppercase block text-[8.5px]">Throughput:</span>
                                  <span className="font-bold text-text-primary truncate block">
                                    {sys.throughput.split(' ')[0]} {sys.throughput.split(' ')[1] || ''}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-text-muted uppercase block text-[8.5px]">Latency SLA:</span>
                                  <span className="font-bold text-emerald-400 truncate block">{sys.latency}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] font-mono text-text-muted">
                                  {sys.services.length} Microservices · {sys.animationSteps.length} Steps
                                </span>
                                <button className={`text-[11px] font-mono font-bold px-2 py-1 rounded transition ${
                                  isSelected
                                    ? 'bg-accent-brand text-bg-base'
                                    : 'text-accent-brand hover:underline'
                                }`}>
                                  {isSelected ? 'Simulating ▶' : 'Launch →'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* VIEW MODE B: FLAT BENTO CATALOG VIEW */
            <div className="rounded-2xl bg-bg-surface-2 p-5 ring-1 ring-border shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <span className="text-[14px] font-bold text-text-primary font-mono">
                  All Systems Catalog ({filteredSystems.length} Results)
                </span>
                <span className="text-[11px] font-mono text-text-muted">
                  Click any card to load its architecture
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredSystems.map((sys) => {
                  const meta = SYSTEM_METADATA_REGISTRY[sys.id]
                  const isSelected = sys.id === currentSystem.id
                  const domainStyle = DOMAIN_COLOR_MAP[meta?.domain || ''] || {
                    badge: 'bg-accent-brand/10 text-accent-brand ring-1 ring-accent-brand/30',
                    text: 'text-accent-brand',
                    border: 'border-accent-brand',
                  }

                  return (
                    <div
                      key={sys.id}
                      onClick={() => handleSelectSystem(sys.id)}
                      className={`cursor-pointer rounded-xl p-4 transition-all duration-200 flex flex-col justify-between ring-1 ${
                        isSelected
                          ? 'bg-accent-brand/15 ring-2 ring-accent-brand shadow-lg'
                          : 'bg-bg-surface-1 hover:bg-bg-surface-3 ring-border hover:ring-border-strong'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase truncate ${domainStyle.badge}`}>
                            {meta?.domain || sys.category}
                          </span>
                          <span className="font-mono text-[10px] text-text-muted font-bold shrink-0">
                            {sys.difficulty}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10.5px] font-mono text-amber-400 font-bold block mb-0.5">
                            ⚡ Modeled on: {meta?.realWorldArchetype || sys.name}
                          </span>
                          <h4 className="font-bold text-[14px] text-text-primary font-mono leading-snug">
                            {sys.name}
                          </h4>
                        </div>

                        {/* WHAT IT DOES CALLOUT */}
                        <div className={`my-1.5 rounded-lg bg-bg-surface-2 p-2 text-[11px] leading-relaxed text-text-secondary border-l-2 ${domainStyle.border} font-sans`}>
                          <span className={`font-bold text-[9.5px] uppercase font-mono block mb-0.5 ${domainStyle.text}`}>
                            What It Does:
                          </span>
                          {meta?.whatItDoes || sys.tagline}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-sky-400 font-medium">
                          <Sparkles className="size-3 shrink-0" />
                          <span className="truncate">{meta?.architecturePattern || sys.category}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-border/40 grid grid-cols-2 gap-2 text-[10.5px] font-mono text-text-muted">
                        <div>
                          <span className="text-[8.5px] uppercase block">Throughput</span>
                          <span className="text-text-primary font-bold truncate block">{sys.throughput}</span>
                        </div>
                        <div>
                          <span className="text-[8.5px] uppercase block">Latency</span>
                          <span className="text-emerald-400 font-bold truncate block">{sys.latency}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: ACTIVE SYSTEM HERO BANNER & DEEP OVERVIEW */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bg-surface-2 via-bg-surface-1 to-bg-surface-2 p-6 sm:p-7 ring-1 ring-border shadow-2xl space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-amber-400/10 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-400 ring-1 ring-amber-400/30">
                    ⚡ Production Archetype: {currentMeta?.realWorldArchetype || currentSystem.name}
                  </span>
                  <span className="rounded-lg bg-accent-brand/10 px-2.5 py-1 font-mono text-[11px] font-bold text-accent-brand ring-1 ring-accent-brand/30">
                    {currentSystem.difficulty}
                  </span>
                  <span className="rounded-lg bg-bg-surface-3 px-2.5 py-1 font-mono text-[11px] text-text-muted ring-1 ring-border">
                    {currentMeta?.domain || currentSystem.category}
                  </span>
                </div>

                <h2 className="!text-[24px] sm:!text-[28px] font-extrabold text-text-primary font-mono tracking-tight">
                  {currentSystem.name}
                </h2>

                <p className="text-[13.5px] text-text-secondary leading-relaxed">
                  {currentSystem.overview}
                </p>

                {currentMeta?.keyInvariant && (
                  <div className="rounded-xl bg-amber-400/5 p-3 text-[12.5px] text-amber-300 ring-1 ring-amber-400/20 font-mono flex items-start gap-2">
                    <Sparkles className="size-4 shrink-0 text-amber-400 mt-0.5" />
                    <span><strong>Fundamental Invariant:</strong> {currentMeta.keyInvariant}</span>
                  </div>
                )}
              </div>

              {/* Technologies Pills */}
              <div className="space-y-1.5 sm:max-w-xs">
                <span className="text-[10px] font-mono uppercase font-bold text-text-muted block">
                  Tech Stack & Algorithms:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(currentMeta?.technologies || []).map((tech, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-bg-surface-3 px-2 py-0.5 font-mono text-[10px] text-text-secondary ring-1 ring-border"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Scale Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/50">
              <div className="rounded-xl bg-bg-surface-2 p-3 ring-1 ring-border">
                <span className="text-[10px] font-mono font-bold uppercase text-text-muted block">Throughput</span>
                <p className="mt-0.5 text-[13px] font-bold text-text-primary truncate">{currentSystem.throughput}</p>
              </div>
              <div className="rounded-xl bg-bg-surface-2 p-3 ring-1 ring-border">
                <span className="text-[10px] font-mono font-bold uppercase text-text-muted block">Latency SLA</span>
                <p className="mt-0.5 text-[13px] font-bold text-amber-400 truncate">{currentSystem.latency}</p>
              </div>
              <div className="rounded-xl bg-bg-surface-2 p-3 ring-1 ring-border">
                <span className="text-[10px] font-mono font-bold uppercase text-text-muted block">Storage Scale</span>
                <p className="mt-0.5 text-[13px] font-bold text-sky-400 truncate">{currentSystem.storageScale}</p>
              </div>
              <div className="rounded-xl bg-bg-surface-2 p-3 ring-1 ring-border">
                <span className="text-[10px] font-mono font-bold uppercase text-text-muted block">Topology Size</span>
                <p className="mt-0.5 text-[13px] font-bold text-emerald-400 truncate">{currentSystem.services.length} Microservices</p>
              </div>
            </div>
          </div>

          {/* SECTION 4: SUB-VIEW TAB NAVIGATION */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-bg-surface-2 p-1 ring-1 ring-border text-[12px] font-mono shadow-sm">
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
                onClick={() => setSystemView('from-scratch')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
                  systemView === 'from-scratch'
                    ? 'bg-amber-400 text-black font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Hammer className="size-3.5" /> 🏗️ How It's Built From Scratch
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
                <Sparkles className="size-3.5" /> Live Algorithm Sandboxes
              </button>
              <button
                onClick={() => setSystemView('interview')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
                  systemView === 'interview'
                    ? 'bg-emerald-500 text-white font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Award className="size-3.5" /> FAANG Mock Interview
              </button>
              <button
                onClick={() => setSystemView('capacity')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
                  systemView === 'capacity'
                    ? 'bg-accent-brand text-bg-base font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Calculator className="size-3.5" /> Capacity Sizing
              </button>
            </div>
          </div>

          {/* VIEW RENDERER */}
          {systemView === 'simulation' && (
            <div className="space-y-6 animate-fadeIn">
              <SystemVisualizer
                system={currentSystem}
                currentStepIndex={currentStepIndex}
                onStepChange={setCurrentStepIndex}
                layoutMode={canvasLayout}
                onToggleLayout={() =>
                  setCanvasLayout(canvasLayout === 'blueprint' ? 'split' : 'blueprint')
                }
                onSwitchToFromScratch={() => setSystemView('from-scratch')}
              />

              <div className="border-t border-border pt-6">
                <CodeTalksViewer
                  system={currentSystem}
                  currentStep={currentStep}
                />
              </div>
            </div>
          )}

          {systemView === 'from-scratch' && (
            <BuildFromScratchGuideViewer
              system={currentSystem}
              onSwitchToVisualizer={() => setSystemView('simulation')}
            />
          )}

          {systemView === 'sequence' && (
            <SequenceDiagramViewer
              system={currentSystem}
              currentStepIndex={currentStepIndex}
              onStepChange={setCurrentStepIndex}
            />
          )}

          {systemView === 'simulators' && (
            <SpecializedDomainEngines systemId={currentSystem.id} />
          )}

          {systemView === 'interview' && (
            <MockInterviewSimulator system={currentSystem} />
          )}

          {systemView === 'capacity' && (
            <InteractiveCapacityCalculator system={currentSystem} />
          )}
        </div>
      ) : (
        /* SECTION 5: MASTER CURRICULUM THEORY NOTES */
        <SystemNotesReader />
      )}

      {/* MODAL: COMPARISON MATRIX TABLE OF ALL 31 SYSTEMS */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl bg-bg-surface-2 ring-1 ring-border shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-2">
                <Table className="size-5 text-accent-brand" />
                <h3 className="font-extrabold text-[18px] text-text-primary font-mono">
                  FAANG Architectural Comparison Matrix (All 31 Systems)
                </h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-surface-3 hover:text-text-primary transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="overflow-auto p-4 flex-1">
              <table className="w-full text-left text-[12px] border-collapse font-mono">
                <thead className="bg-bg-surface-3 text-text-muted uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-3">System</th>
                    <th className="p-3">Archetype</th>
                    <th className="p-3">Domain</th>
                    <th className="p-3">Throughput</th>
                    <th className="p-3">Latency SLA</th>
                    <th className="p-3">Core Pattern</th>
                    <th className="p-3">Difficulty</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 bg-bg-surface-1">
                  {ALL_SYSTEM_DESIGNS.map((sys) => {
                    const meta = SYSTEM_METADATA_REGISTRY[sys.id]
                    return (
                      <tr key={sys.id} className="hover:bg-bg-surface-2/60 transition">
                        <td className="p-3 font-bold text-text-primary">{sys.name}</td>
                        <td className="p-3 text-amber-400 font-bold">{meta?.realWorldArchetype || sys.name}</td>
                        <td className="p-3 text-text-secondary">{meta?.domain || sys.category}</td>
                        <td className="p-3 text-text-primary">{sys.throughput}</td>
                        <td className="p-3 text-emerald-400">{sys.latency}</td>
                        <td className="p-3 text-sky-400 truncate max-w-[200px]">{meta?.architecturePattern || sys.category}</td>
                        <td className="p-3 text-text-muted">{meta?.difficulty || sys.difficulty}</td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              handleSelectSystem(sys.id)
                              setShowCompareModal(false)
                            }}
                            className="bg-accent-brand text-bg-base px-2.5 py-1 rounded text-[11px] font-bold hover:opacity-90"
                          >
                            Open →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
