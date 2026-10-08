import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  ShieldAlert,
  Sparkles,
  Sliders,
  Activity,
  Maximize2,
  Minimize2,
  Play,
  Zap,
  Network,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'
import { getSystemDossier, getAllSystemDossierSummaries } from '@/learn/system-design/data/systemDossierEngine'
import {
  DOMAIN_CATEGORIES,
  getDomainThemeByNameOrId,
  SYSTEM_METADATA_REGISTRY,
} from '@/learn/system-design/data/systemMetadataRegistry'
import { SystemVisualizer } from '@/learn/system-design/components/SystemVisualizer'
import { AlgorithmPlayground } from '@/learn/system-design/components/AlgorithmPlayground'
import { SpecializedDomainEngines } from '@/learn/system-design/components/SpecializedDomainEngines'
import { ChapterConceptAnimator } from '@/learn/system-design/components/ConceptAnimators'
import {
  SystemHeroBlueprint,
  SystemInternalEngineDiagram,
  SystemTopologyMiniRadar,
} from '@/learn/system-design/components/SystemBespokeArchitecturalVisuals'

const CHAPTER_META_ICONS: Record<number, { shortTitle: string; icon: any; tag: string }> = {
  1: { shortTitle: 'Scope & SLAs', icon: BookOpen, tag: 'Non-Negotiables' },
  2: { shortTitle: 'Scale Math', icon: Sliders, tag: 'Capacity Lab' },
  3: { shortTitle: 'Failure Autopsy', icon: AlertTriangle, tag: 'Naive Collapse' },
  4: { shortTitle: 'Architecture', icon: Layers, tag: 'HLD Blueprint' },
  5: { shortTitle: 'Component LLD', icon: Network, tag: 'Low-Level Internals' },
  6: { shortTitle: 'Live Sandbox', icon: Play, tag: 'Interactive Algorithms' },
  7: { shortTitle: 'Data & Raft', icon: Sparkles, tag: 'Storage Consensus' },
  8: { shortTitle: 'Chaos Drills', icon: ShieldAlert, tag: 'Fault Tolerance' },
  9: { shortTitle: 'Observability', icon: Activity, tag: 'SLOs & Runbooks' },
  10: { shortTitle: 'Trade-off Matrix', icon: Zap, tag: 'Interview War Room' },
}

export default function SystemDossierPage() {
  const { systemId = 'tinyurl', chapterNumber } = useParams<{ systemId: string; chapterNumber?: string }>()
  const navigate = useNavigate()

  // Load dossier
  const dossier = useMemo(() => getSystemDossier(systemId) || getSystemDossier('tinyurl')!, [systemId])
  const allSummaries = useMemo(() => getAllSystemDossierSummaries(), [])

  // Domain metadata & theme
  const meta = useMemo(() => SYSTEM_METADATA_REGISTRY[dossier.system.id], [dossier.system.id])
  const domainTheme = useMemo(
    () => getDomainThemeByNameOrId(meta?.domain || dossier.system.category),
    [meta, dossier.system.category]
  )

  const summariesByDomain = useMemo(() => {
    const groups: Record<string, typeof allSummaries> = {}
    DOMAIN_CATEGORIES.forEach((cat) => {
      groups[cat.name] = []
    })
    allSummaries.forEach((s) => {
      const sMeta = SYSTEM_METADATA_REGISTRY[s.id]
      const domainName = sMeta?.domain || s.category
      if (!groups[domainName]) groups[domainName] = []
      groups[domainName].push(s)
    })
    return groups
  }, [allSummaries])

  const nextSystemInDomain = useMemo(() => {
    const currentDomain = meta?.domain || dossier.system.category
    const list = (summariesByDomain[currentDomain] || []).filter((s) => s.id !== systemId)
    return list[0] || allSummaries.find((s) => s.id !== systemId)
  }, [systemId, summariesByDomain, allSummaries, meta, dossier.system.category])

  // Active Chapter State
  const initialChapter = chapterNumber ? Math.max(1, Math.min(10, parseInt(chapterNumber, 10) || 1)) : 1
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(initialChapter - 1)

  // Fullscreen reading mode
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // LocalStorage completed chapters
  const [completedChapters, setCompletedChapters] = useState<Record<string, number[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('nexora_sysdesign_completed') || '{}')
    } catch {
      return {}
    }
  })

  // Copied code status
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null)

  // Live Visualizer Step & Selected Node for Chapter 4
  const [visualizerStep, setVisualizerStep] = useState<number>(0)
  const [, setSelectedVisualizerNode] = useState<any>(null)

  // Sync when URL params change
  useEffect(() => {
    if (chapterNumber) {
      const ch = Math.max(1, Math.min(10, parseInt(chapterNumber, 10) || 1))
      setActiveChapterIndex(ch - 1)
    }
  }, [chapterNumber])

  // Scroll to top on chapter change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeChapterIndex, systemId])

  const currentChapter = dossier.chapters[activeChapterIndex] || dossier.chapters[0]

  const handleSelectChapter = (index: number) => {
    setActiveChapterIndex(index)
    navigate(`/learn/system-design/${systemId}/${index + 1}`, { replace: true })
  }

  const toggleChapterComplete = (chapterNum: number) => {
    setCompletedChapters((prev) => {
      const currentList = prev[systemId] || []
      const updated = currentList.includes(chapterNum)
        ? currentList.filter((c) => c !== chapterNum)
        : [...currentList, chapterNum]
      const next = { ...prev, [systemId]: updated }
      localStorage.setItem('nexora_sysdesign_completed', JSON.stringify(next))
      return next
    })
  }

  const isCurrentChapterComplete = (completedChapters[systemId] || []).includes(currentChapter.chapterNumber)

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCodeKey(key)
    setTimeout(() => setCopiedCodeKey(null), 2000)
  }

  /* ──────────────────────────────────────────────────────────
     INTERACTIVE SUB-COMPONENTS
  ────────────────────────────────────────────────────────── */

  // 1. Interactive Capacity Calculator
  const [calcDau, setCalcDau] = useState<number>(50) // Millions
  const [calcReqsPerUser, setCalcReqsPerUser] = useState<number>(10)
  const [calcPayloadKb, setCalcPayloadKb] = useState<number>(2)
  const [calcReadRatio, setCalcReadRatio] = useState<number>(10) // 10:1

  const calcResults = useMemo(() => {
    const totalDailyReqs = calcDau * 1_000_000 * calcReqsPerUser
    const avgQps = Math.round(totalDailyReqs / 86400)
    const peakQps = Math.round(avgQps * 5)
    const writeQps = Math.round(avgQps / (calcReadRatio + 1))
    const readQps = avgQps - writeQps
    const dailyStorageGb = ((writeQps * 86400 * calcPayloadKb) / (1024 * 1024)).toFixed(2)
    const fiveYearStorageTb = ((parseFloat(dailyStorageGb) * 365 * 5) / 1024).toFixed(1)
    const hotCacheRamGb = (((readQps * 86400 * 0.2 * calcPayloadKb) / (1024 * 1024)) * 1.3).toFixed(1)
    const bandwidthGbps = (((avgQps * calcPayloadKb * 8) / (1024 * 1024))).toFixed(2)

    return {
      avgQps,
      peakQps,
      readQps,
      writeQps,
      dailyStorageGb,
      fiveYearStorageTb,
      hotCacheRamGb,
      bandwidthGbps,
    }
  }, [calcDau, calcReqsPerUser, calcPayloadKb, calcReadRatio])

  // 2. Interactive Chaos Simulator
  const [chaosState, setChaosState] = useState<{
    dbStatus: 'healthy' | 'crashed' | 'failover_promoting' | 'recovered'
    breakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    trafficSurge: boolean
    activeIncidentText: string
  }>({
    dbStatus: 'healthy',
    breakerStatus: 'CLOSED',
    trafficSurge: false,
    activeIncidentText: 'All clusters operating within normal P99 latency bounds.',
  })

  const triggerChaosScenario = (scenario: 'kill_db' | 'surge_traffic' | 'split_brain' | 'reset') => {
    if (scenario === 'kill_db') {
      setChaosState({
        dbStatus: 'crashed',
        breakerStatus: 'OPEN',
        trafficSurge: false,
        activeIncidentText: 'CRITICAL: Primary database unresponsive. Circuit breaker TRIPPED to OPEN. Falling back to cached reads.',
      })
      setTimeout(() => {
        setChaosState((prev) => ({
          ...prev,
          dbStatus: 'failover_promoting',
          breakerStatus: 'HALF_OPEN',
          activeIncidentText: 'Patroni / Raft elected synchronous replica as new primary. Health check probe canary in progress...',
        }))
      }, 3000)
      setTimeout(() => {
        setChaosState({
          dbStatus: 'recovered',
          breakerStatus: 'CLOSED',
          trafficSurge: false,
          activeIncidentText: 'RECOVERED: DNS endpoint switched to new primary. Circuit breaker returned to CLOSED state. 0 data loss.',
        })
      }, 6000)
    } else if (scenario === 'surge_traffic') {
      setChaosState({
        dbStatus: 'healthy',
        breakerStatus: 'CLOSED',
        trafficSurge: true,
        activeIncidentText: 'SURGE: 10x traffic spike detected! Token-bucket rate limiter sheds non-critical traffic; auto-scaler spins up 24 worker pods.',
      })
    } else if (scenario === 'split_brain') {
      setChaosState({
        dbStatus: 'crashed',
        breakerStatus: 'OPEN',
        trafficSurge: false,
        activeIncidentText: 'PARTITION: Cross-datacenter fiber disconnected. Quorum consensus ensures minority region rejects writes to prevent data divergence.',
      })
    } else {
      setChaosState({
        dbStatus: 'healthy',
        breakerStatus: 'CLOSED',
        trafficSurge: false,
        activeIncidentText: 'All clusters operating within normal P99 latency bounds.',
      })
    }
  }

  return (
    <div className={`min-h-screen ${isFullscreen ? 'p-2 sm:p-4 bg-bg-base' : 'pb-24'}`}>
      {/* TOP HEADER / BREADCRUMB NAVIGATION */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <Link
            to="/learn?tab=sysdesign"
            className="flex items-center gap-1.5 rounded-lg bg-bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary ring-1 ring-border transition"
          >
            <ArrowLeft className="size-3.5" /> Back to Studio
          </Link>
          <span className="text-border">/</span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${domainTheme.color}15`,
              color: domainTheme.color,
              boxShadow: `inset 0 0 0 1px ${domainTheme.color}35`,
            }}
          >
            <span>{domainTheme.icon}</span>
            <span>{domainTheme.name}</span>
          </span>
          <span className="text-border">/</span>
          <span className="font-bold text-text-primary truncate max-w-[180px] sm:max-w-none">
            {dossier.system.name}
          </span>
        </div>

        {/* System Switcher & Utility Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Quick System Switcher Dropdown Grouped by Architectural Domain */}
          <div className="relative">
            <select
              value={systemId}
              onChange={(e) => navigate(`/learn/system-design/${e.target.value}/1`)}
              className="rounded-lg bg-bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text-primary ring-1 ring-border focus:ring-accent-brand focus:outline-none cursor-pointer"
            >
              {DOMAIN_CATEGORIES.map((cat) => {
                const sysList = summariesByDomain[cat.name] || []
                if (sysList.length === 0) return null
                return (
                  <optgroup key={cat.id} label={`${cat.icon} ${cat.name} (${sysList.length})`}>
                    {sysList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </div>

          {/* Fullscreen Mode Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg bg-bg-surface-2 p-1.5 text-text-muted hover:text-text-primary ring-1 ring-border transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* DOMAIN-THEMED HERO BANNER FOR THE SYSTEM */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 ring-1 shadow-2xl mb-6 transition-all"
        style={{
          background: `linear-gradient(135deg, #131722 0%, ${domainTheme.color}15 50%, #0d1117 100%)`,
          borderColor: `${domainTheme.color}40`,
          boxShadow: `0 20px 40px -15px ${domainTheme.color}20`,
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono font-bold"
                style={{
                  backgroundColor: `${domainTheme.color}20`,
                  color: domainTheme.color,
                  boxShadow: `inset 0 0 0 1px ${domainTheme.color}50`,
                }}
              >
                <span>{domainTheme.icon}</span>
                <span>{domainTheme.badge}</span>
              </span>

              {meta?.realWorldArchetype && (
                <span className="rounded-full bg-bg-surface-3/90 px-3 py-1 text-[11px] font-mono font-medium text-text-secondary ring-1 ring-border">
                  Archetype: {meta.realWorldArchetype}
                </span>
              )}

              {meta?.architecturePattern && (
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-mono font-bold text-amber-400 ring-1 ring-amber-500/30">
                  {meta.architecturePattern}
                </span>
              )}

              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-mono font-bold text-emerald-400 ring-1 ring-emerald-500/30 flex items-center gap-1.5">
                <Zap className="size-3" /> {dossier.system.throughput}
              </span>
              <span className="rounded-full bg-sky-500/10 px-3 py-1 text-[11px] font-mono font-bold text-sky-400 ring-1 ring-sky-500/30 flex items-center gap-1.5">
                <Clock className="size-3" /> P99 {dossier.system.latency}
              </span>
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-text-muted mb-1">
                Comprehensive Masterclass Dossier • 10 Interactive Chapters
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-text-primary leading-tight">
                {dossier.system.name}
              </h1>
            </div>

            <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-3xl">
              {dossier.executiveSummary}
            </p>

            {/* Quick Metrics & Progress Strip */}
            <div className="pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-mono">Storage Scale</span>
                  <span className="font-semibold text-text-primary font-mono">{dossier.system.storageScale}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-mono">Reading Time</span>
                  <span className="font-semibold text-text-primary font-mono">{dossier.totalReadingTimeMinutes} mins</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-mono">Curriculum</span>
                  <span className="font-semibold font-mono" style={{ color: domainTheme.color }}>
                    10 Dedicated Chapters
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-text-muted block">Masterclass Progress</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {(completedChapters[systemId] || []).length} of 10 Chapters ({Math.round(((completedChapters[systemId]?.length || 0) / 10) * 100)}%)
                  </span>
                </div>
                <div className="w-24 h-2 bg-bg-surface-3 rounded-full overflow-hidden ring-1 ring-border">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${((completedChapters[systemId]?.length || 0) / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bespoke System Hero Blueprint Graphic */}
          <div className="lg:col-span-5">
            <SystemHeroBlueprint
              systemId={dossier.system.id}
              system={dossier.system}
              domainColor={domainTheme.color}
            />
          </div>
        </div>
      </div>

      {/* 10-CHAPTER MASTERCLASS CURRICULUM DECK */}
      <div className="mb-8 rounded-2xl bg-bg-surface-2/95 backdrop-blur-md p-4 ring-1 ring-border shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-accent-brand/10 text-accent-brand">
              <BookOpen className="size-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Masterclass Curriculum Roadmap
            </span>
            <span className="text-[11px] font-mono text-text-muted hidden md:inline">
              (Click any chapter to jump directly to its dedicated deep dive)
            </span>
          </div>
          <span className="text-xs font-mono font-bold" style={{ color: domainTheme.color }}>
            Chapter {activeChapterIndex + 1} of 10 Active
          </span>
        </div>

        {/* Horizontal Chapter Stepper Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {dossier.chapters.map((ch, idx) => {
            const isActive = idx === activeChapterIndex
            const isDone = (completedChapters[systemId] || []).includes(ch.chapterNumber)
            const metaIcon = CHAPTER_META_ICONS[ch.chapterNumber]
            const ChapterIcon = metaIcon?.icon || BookOpen

            return (
              <button
                key={ch.id}
                onClick={() => handleSelectChapter(idx)}
                className={`group relative flex flex-col items-center text-center p-2.5 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-bg-surface-3 shadow-lg ring-2 font-bold scale-[1.02] z-10'
                    : 'bg-bg-surface-1/70 hover:bg-bg-surface-3/60 ring-1 ring-border/50 text-text-muted hover:text-text-primary'
                }`}
                style={{
                  borderColor: isActive ? domainTheme.color : undefined,
                  boxShadow: isActive ? `0 0 15px -3px ${domainTheme.color}40` : undefined,
                }}
                title={`Chapter ${ch.chapterNumber}: ${ch.title}`}
              >
                {/* Completed checkmark badge */}
                {isDone && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-bg-base rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 className="size-3 text-bg-base fill-current" />
                  </span>
                )}

                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: isActive ? `${domainTheme.color}25` : 'rgba(255,255,255,0.05)',
                      color: isActive ? domainTheme.color : undefined,
                    }}
                  >
                    Ch.{ch.chapterNumber.toString().padStart(2, '0')}
                  </span>
                  <ChapterIcon
                    className={`size-3.5 transition-colors ${
                      isActive ? '' : 'text-text-muted group-hover:text-text-primary'
                    }`}
                    style={{ color: isActive ? domainTheme.color : undefined }}
                  />
                </div>

                <div
                  className={`text-[11px] font-semibold leading-tight line-clamp-1 w-full text-left sm:text-center ${
                    isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                  }`}
                >
                  {metaIcon?.shortTitle || ch.badge}
                </div>

                <div className="text-[9px] text-text-muted font-mono mt-1 w-full flex items-center justify-between">
                  <span>{ch.estimatedMinutes}m</span>
                  <span className="hidden lg:inline text-[8px] text-text-muted truncate max-w-[45px]">
                    {metaIcon?.tag || ch.badge}
                  </span>
                </div>

                {/* Active indicator bar */}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ backgroundColor: domainTheme.color }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* MAIN TWO-COLUMN DOSSIER LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: CHAPTER SELECTOR SIDEBAR (3 cols) */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
          <div className="rounded-xl bg-bg-surface-2 p-4 ring-1 ring-border shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <BookOpen className="size-3.5" style={{ color: domainTheme.color }} /> Table of Contents
              </h3>
              <span className="text-xs font-mono font-bold" style={{ color: domainTheme.color }}>
                Chapter {activeChapterIndex + 1} of 10
              </span>
            </div>

            {/* Chapter Items List */}
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {dossier.chapters.map((ch, idx) => {
                const isActive = idx === activeChapterIndex
                const isDone = (completedChapters[systemId] || []).includes(ch.chapterNumber)
                const metaIcon = CHAPTER_META_ICONS[ch.chapterNumber]
                const ChapterIcon = metaIcon?.icon || BookOpen

                return (
                  <button
                    key={ch.id}
                    onClick={() => handleSelectChapter(idx)}
                    className={`w-full text-left rounded-lg p-2.5 transition flex items-start gap-2.5 text-xs ${
                      isActive
                        ? 'font-semibold shadow-sm'
                        : 'text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: `${domainTheme.color}15`,
                            color: domainTheme.color,
                            boxShadow: `inset 0 0 0 1px ${domainTheme.color}50`,
                          }
                        : undefined
                    }
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="size-4 text-emerald-400" />
                      ) : (
                        <div
                          className="size-4 rounded-full border flex items-center justify-center text-[10px] font-mono"
                          style={{
                            borderColor: isActive ? domainTheme.color : 'var(--color-border, #333)',
                            color: isActive ? domainTheme.color : 'var(--color-text-muted, #888)',
                            fontWeight: isActive ? 700 : 400,
                          }}
                        >
                          {ch.chapterNumber}
                        </div>
                      )}
                    </div>

                    <div className="grow min-w-0">
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        <ChapterIcon className="size-3 shrink-0 opacity-70" />
                        <span className="truncate">{ch.title.replace(/^Chapter \d+:\s*/, '')}</span>
                      </div>
                      <div className="text-[10px] text-text-muted flex items-center gap-2 mt-0.5">
                        <span className="truncate">{metaIcon?.tag || ch.badge}</span>
                        <span>•</span>
                        <span>{ch.estimatedMinutes}m read</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Live Cluster Topology Mini Radar */}
          <SystemTopologyMiniRadar system={dossier.system} domainColor={domainTheme.color} />
        </div>

        {/* RIGHT COLUMN: CHAPTER CONTENT & INTERACTIVE LAB (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* CHAPTER HEADER CARD */}
          <div className="rounded-2xl bg-bg-surface-2 p-6 sm:p-8 ring-1 ring-border shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <span className="rounded-md bg-accent-brand/10 px-2.5 py-1 text-[11px] font-mono font-bold text-accent-brand ring-1 ring-accent-brand/30">
                  {currentChapter.badge}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary mt-2">
                  {currentChapter.title}
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  {currentChapter.subtitle}
                </p>
              </div>

              {/* Mark Complete Checkbox Button */}
              <button
                onClick={() => toggleChapterComplete(currentChapter.chapterNumber)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition shadow-sm ${
                  isCurrentChapterComplete
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                    : 'bg-bg-surface-3 text-text-muted hover:text-text-primary ring-1 ring-border'
                }`}
              >
                <CheckCircle2 className="size-4" />
                {isCurrentChapterComplete ? 'Chapter Completed' : 'Mark as Read'}
              </button>
            </div>

            {/* Chapter Executive Summary Box */}
            <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border/80 text-xs sm:text-sm text-text-secondary leading-relaxed">
              <strong className="text-text-primary block mb-1">Executive Summary:</strong>
              {currentChapter.summary}
            </div>

            {/* Key Takeaways Grid */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Key Architectural Takeaways:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentChapter.keyTakeaways.map((takeaway, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-bg-surface-3/50 p-2.5 text-xs text-text-secondary ring-1 ring-border/50"
                  >
                    <Sparkles className="size-3.5 text-accent-brand shrink-0 mt-0.5" />
                    <span>{takeaway}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CHAPTER INTERACTIVE MODULE (If applicable) */}
          {currentChapter.interactiveModuleType === 'capacity-calculator' && (
            <div className="rounded-2xl bg-bg-surface-2 p-6 ring-1 ring-accent-brand/40 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Sliders className="size-4 text-accent-brand" /> Interactive Scale & Capacity Simulator
                </h3>
                <span className="text-[11px] font-mono text-accent-brand font-semibold">
                  Live Mathematical Modeling
                </span>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span className="text-text-secondary">Daily Active Users (DAU):</span>
                    <span className="font-mono font-bold text-text-primary">{calcDau} Million</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    value={calcDau}
                    onChange={(e) => setCalcDau(Number(e.target.value))}
                    className="w-full accent-accent-brand cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span className="text-text-secondary">Requests per User / Day:</span>
                    <span className="font-mono font-bold text-text-primary">{calcReqsPerUser} reqs</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={calcReqsPerUser}
                    onChange={(e) => setCalcReqsPerUser(Number(e.target.value))}
                    className="w-full accent-accent-brand cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span className="text-text-secondary">Average Payload Size:</span>
                    <span className="font-mono font-bold text-text-primary">{calcPayloadKb} KB</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={calcPayloadKb}
                    onChange={(e) => setCalcPayloadKb(Number(e.target.value))}
                    className="w-full accent-accent-brand cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span className="text-text-secondary">Read-to-Write Ratio:</span>
                    <span className="font-mono font-bold text-text-primary">{calcReadRatio}:1</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={calcReadRatio}
                    onChange={(e) => setCalcReadRatio(Number(e.target.value))}
                    className="w-full accent-accent-brand cursor-pointer"
                  />
                </div>
              </div>

              {/* Dynamic Recalculated Matrix Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-center">
                  <span className="text-[11px] text-text-muted block">Peak Traffic (5x)</span>
                  <span className="text-base sm:text-lg font-mono font-extrabold text-accent-brand">
                    {calcResults.peakQps.toLocaleString()} QPS
                  </span>
                </div>
                <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-center">
                  <span className="text-[11px] text-text-muted block">5-Year Disk Footprint</span>
                  <span className="text-base sm:text-lg font-mono font-extrabold text-emerald-400">
                    {calcResults.fiveYearStorageTb} TB
                  </span>
                </div>
                <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-center">
                  <span className="text-[11px] text-text-muted block">Cache RAM (80/20)</span>
                  <span className="text-base sm:text-lg font-mono font-extrabold text-sky-400">
                    {calcResults.hotCacheRamGb} GB
                  </span>
                </div>
                <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-center">
                  <span className="text-[11px] text-text-muted block">Network Ingress/Egress</span>
                  <span className="text-base sm:text-lg font-mono font-extrabold text-purple-400">
                    {calcResults.bandwidthGbps} Gbps
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CHAPTER 4: LIVE INTERACTIVE ARCHITECTURAL VISUALIZER & WIRE FLOW SIMULATOR */}
          {activeChapterIndex === 3 && (
            <div className="rounded-2xl bg-bg-surface-2 p-5 sm:p-6 ring-1 ring-border shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Network className="size-4" style={{ color: domainTheme.color }} /> Live Architectural Topology & Distributed Wire Flow Simulator
                  </h3>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold">
                  {(dossier.system.services || []).length} Microservices • {(dossier.system.animationSteps || []).length} Wire Flow Steps
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Step through distributed request journeys, trace network protocols, toggle playback speed, and trigger live chaos injection to test resilience against real-world node failures.
              </p>
              <SystemVisualizer
                system={dossier.system}
                currentStepIndex={visualizerStep}
                onStepChange={(step) => setVisualizerStep(step)}
                onSelectNode={(node) => setSelectedVisualizerNode(node)}
              />
            </div>
          )}

          {/* CHAPTER 5: LOW-LEVEL COMPONENT ENGINE & HARDWARE EVENT LOOPS */}
          {activeChapterIndex === 4 && (
            <SystemInternalEngineDiagram
              systemId={dossier.system.id}
              system={dossier.system}
              domainColor={domainTheme.color}
            />
          )}

          {/* CHAPTER 6: LIVE INTERACTIVE ALGORITHMIC ENGINE & CONCURRENCY SANDBOX */}
          {activeChapterIndex === 5 && (
            <div className="space-y-6">
              <SpecializedDomainEngines systemId={dossier.system.id} />
              <div className="rounded-2xl border border-border bg-bg-surface-2 p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Zap className="size-4 text-cyan-400" /> Interactive Algorithmic Engine & State Simulator
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                    Live Memory & State Mutations
                  </span>
                </div>
                <AlgorithmPlayground systemId={dossier.system.id} />
              </div>
            </div>
          )}

          {/* CHAPTER 7: STORAGE CONSENSUS & DISTRIBUTED STATE ENGINES */}
          {activeChapterIndex === 6 && (
            <div className="rounded-2xl border border-border bg-bg-surface-2 p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-400" /> Distributed Consensus & Replication Simulator
                </h3>
                <span className="text-[11px] font-mono text-amber-400 font-semibold">
                  Raft / Paxos / 2PC Interactive
                </span>
              </div>
              <ChapterConceptAnimator unitId="unit-7" chapterNumber={43} />
            </div>
          )}

          {/* CHAPTER 8: FAULT TOLERANCE, HIGH AVAILABILITY & CHAOS DRILLS */}
          {activeChapterIndex === 7 && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-bg-surface-2 p-5 sm:p-6 ring-1 ring-rose-500/40 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <ShieldAlert className="size-4 text-rose-400" /> Chaos Engineering & Resiliency Lab
                  </h3>
                  <span className="text-[11px] font-mono font-bold text-rose-400 uppercase">
                    Production Incident Drill
                  </span>
                </div>

                {/* Chaos Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                  <button
                    onClick={() => triggerChaosScenario('kill_db')}
                    className="rounded-lg bg-rose-500/15 p-2.5 text-rose-400 ring-1 ring-rose-500/40 hover:bg-rose-500/25 transition text-left"
                  >
                    💥 Kill DB Primary
                  </button>
                  <button
                    onClick={() => triggerChaosScenario('surge_traffic')}
                    className="rounded-lg bg-amber-500/15 p-2.5 text-amber-400 ring-1 ring-amber-500/40 hover:bg-amber-500/25 transition text-left"
                  >
                    🌊 10x Flash Surge
                  </button>
                  <button
                    onClick={() => triggerChaosScenario('split_brain')}
                    className="rounded-lg bg-purple-500/15 p-2.5 text-purple-400 ring-1 ring-purple-500/40 hover:bg-purple-500/25 transition text-left"
                  >
                    ⚡ Network Split-Brain
                  </button>
                  <button
                    onClick={() => triggerChaosScenario('reset')}
                    className="rounded-lg bg-bg-surface-1 p-2.5 text-text-secondary ring-1 ring-border hover:text-text-primary transition text-left"
                  >
                    🔄 Reset Topology
                  </button>
                </div>

                {/* Live Status Board */}
                <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Circuit Breaker State:</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        chaosState.breakerStatus === 'CLOSED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : chaosState.breakerStatus === 'HALF_OPEN'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-rose-500/20 text-rose-400 animate-pulse'
                      }`}
                    >
                      {chaosState.breakerStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Cluster Health:</span>
                    <span className="font-mono font-bold text-text-primary">{chaosState.dbStatus.toUpperCase()}</span>
                  </div>
                  <div className="rounded bg-bg-surface-3 p-2.5 text-text-secondary font-mono text-[11.5px] border border-border/80">
                    {chaosState.activeIncidentText}
                  </div>
                </div>
              </div>

              {/* Concept Animator for Split Brain / Network Partition */}
              <div className="rounded-2xl border border-border bg-bg-surface-2 p-5 sm:p-6 shadow-2xl space-y-3">
                <ChapterConceptAnimator unitId="unit-1" chapterNumber={1} />
              </div>
            </div>
          )}

          {/* DETAILED CONTENT SECTIONS */}
          <div className="space-y-6">
            {currentChapter.contentSections.map((sec, secIdx) => (
              <div
                key={secIdx}
                className="rounded-2xl bg-bg-surface-2 p-6 sm:p-8 ring-1 ring-border shadow-md space-y-4"
              >
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Layers className="size-4 text-accent-brand" /> {sec.heading}
                </h3>

                <p className="text-sm text-text-secondary leading-relaxed">
                  {sec.description}
                </p>

                {/* Blueprint Image if present */}
                {sec.image && (
                  <div className="rounded-xl overflow-hidden border border-border/80 bg-bg-surface-1 shadow-2xl space-y-2 p-2">
                    <div className="relative overflow-hidden rounded-lg group">
                      <img
                        src={sec.image.url}
                        alt={sec.image.alt}
                        className="w-full h-auto object-cover max-h-[480px] rounded-lg transition-transform duration-500 group-hover:scale-[1.01]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-black/70 backdrop-blur-md text-[11px] font-mono text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                        <Network className="size-3" /> Architectural Blueprint
                      </span>
                    </div>
                    {sec.image.caption && (
                      <p className="text-xs text-text-muted italic px-2 pb-1 text-center">
                        {sec.image.caption}
                      </p>
                    )}
                  </div>
                )}


                {/* Callout box if present */}
                {sec.callout && (
                  <div
                    className={`rounded-xl p-4 ring-1 text-xs sm:text-sm leading-relaxed space-y-1 ${
                      sec.callout.type === 'faang-insight'
                        ? 'bg-accent-brand/10 ring-accent-brand/30 text-accent-brand'
                        : sec.callout.type === 'warning'
                        ? 'bg-rose-500/10 ring-rose-500/30 text-rose-300'
                        : 'bg-sky-500/10 ring-sky-500/30 text-sky-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {sec.callout.type === 'warning' ? (
                        <AlertTriangle className="size-4" />
                      ) : (
                        <Lightbulb className="size-4" />
                      )}
                      {sec.callout.title}
                    </div>
                    <p className="text-text-secondary">{sec.callout.message}</p>
                  </div>
                )}

                {/* Bullet points if present */}
                {sec.bulletPoints && sec.bulletPoints.length > 0 && (
                  <ul className="space-y-2 text-xs sm:text-sm text-text-secondary pl-2">
                    {sec.bulletPoints.map((bp, bpIdx) => (
                      <li key={bpIdx} className="flex items-start gap-2">
                        <span className="size-1.5 rounded-full bg-accent-brand shrink-0 mt-2" />
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Tables if present */}
                {sec.table && (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-bg-surface-1 border-b border-border text-text-primary font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          {sec.table.headers.map((h, hIdx) => (
                            <th key={hIdx} className="p-3">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {sec.table.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-bg-surface-3/50 transition">
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`p-3 text-text-secondary ${
                                  cIdx === 0 ? 'font-semibold text-text-primary' : ''
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Code block if present */}
                {sec.codeBlock && (
                  <div className="rounded-xl overflow-hidden border border-border bg-bg-surface-1 shadow-inner space-y-0">
                    <div className="flex items-center justify-between bg-bg-surface-3 px-4 py-2 border-b border-border text-xs">
                      <span className="font-mono text-accent-brand font-semibold">
                        {sec.codeBlock.filename}
                      </span>
                      <button
                        onClick={() => copyCode(sec.codeBlock!.code, `sec-${secIdx}`)}
                        className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition font-mono text-[11px]"
                      >
                        {copiedCodeKey === `sec-${secIdx}` ? (
                          <>
                            <Check className="size-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" /> Copy Code
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-text-primary overflow-x-auto leading-relaxed bg-bg-base/90">
                      <code>{sec.codeBlock.code}</code>
                    </pre>
                    {sec.codeBlock.explanation && (
                      <div className="p-3 bg-bg-surface-2 border-t border-border text-xs text-text-muted">
                        💡 {sec.codeBlock.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* BOTTOM PAGINATION CONTROLS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-bg-surface-2 p-4 sm:p-5 ring-1 ring-border shadow-xl">
            <button
              onClick={() => handleSelectChapter(Math.max(0, activeChapterIndex - 1))}
              disabled={activeChapterIndex === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:opacity-30 disabled:pointer-events-none bg-bg-surface-1 text-text-secondary hover:text-text-primary ring-1 ring-border"
            >
              <ArrowLeft className="size-3.5" />
              <span>
                {activeChapterIndex > 0 ? (
                  <>
                    Prev: <span className="font-mono text-accent-brand">Ch.{activeChapterIndex}</span>{' '}
                    {CHAPTER_META_ICONS[activeChapterIndex]?.shortTitle}
                  </>
                ) : (
                  'First Chapter'
                )}
              </span>
            </button>

            {/* Middle: Mark Complete button */}
            <button
              onClick={() => toggleChapterComplete(currentChapter.chapterNumber)}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                isCurrentChapterComplete
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                  : 'bg-bg-surface-3 text-text-secondary hover:text-text-primary ring-1 ring-border'
              }`}
            >
              <CheckCircle2 className="size-4" />
              {isCurrentChapterComplete ? 'Chapter Completed ✓' : 'Mark Chapter Complete'}
            </button>

            {activeChapterIndex < 9 ? (
              <button
                onClick={() => handleSelectChapter(activeChapterIndex + 1)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-bg-base hover:opacity-90 transition shadow-lg cursor-pointer"
                style={{ backgroundColor: domainTheme.color }}
              >
                <span>
                  Next: <span className="font-mono opacity-90">Ch.{activeChapterIndex + 2}</span>{' '}
                  {CHAPTER_META_ICONS[activeChapterIndex + 2]?.shortTitle}
                </span>
                <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <Link
                to="/learn?tab=sysdesign"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-bg-base hover:bg-emerald-600 transition shadow-lg"
              >
                <span>Complete Masterclass Dossier</span>
                <CheckCircle2 className="size-3.5" />
              </Link>
            )}
          </div>

          {/* On Chapter 10: NEXT SYSTEM IN DOMAIN RECOMMENDATION CARD */}
          {activeChapterIndex === 9 && nextSystemInDomain && (
            <div
              className="mt-6 rounded-2xl p-6 ring-1 shadow-2xl relative overflow-hidden transition-all"
              style={{
                background: `linear-gradient(135deg, ${domainTheme.color}15 0%, #161b22 100%)`,
                borderColor: `${domainTheme.color}40`,
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{domainTheme.icon}</span>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: domainTheme.color }}>
                      Recommended Next System in {domainTheme.name}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-text-primary">{nextSystemInDomain.name}</h3>
                  <p className="text-xs text-text-secondary max-w-xl">
                    Continue mastering this domain by exploring the complete 10-chapter architectural dossier for {nextSystemInDomain.name}.
                  </p>
                </div>

                <Link
                  to={`/learn/system-design/${nextSystemInDomain.id}/1`}
                  className="shrink-0 flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-bg-base hover:opacity-90 transition shadow-xl"
                  style={{ backgroundColor: domainTheme.color }}
                >
                  <span>Launch {nextSystemInDomain.name} Masterclass</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
