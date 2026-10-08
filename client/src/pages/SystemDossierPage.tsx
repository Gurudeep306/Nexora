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
  Pause,
  Zap,
  Network,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'
import { getSystemDossier, getAllSystemDossierSummaries } from '@/learn/system-design/data/systemDossierEngine'

export default function SystemDossierPage() {
  const { systemId = 'tinyurl', chapterNumber } = useParams<{ systemId: string; chapterNumber?: string }>()
  const navigate = useNavigate()

  // Load dossier
  const dossier = useMemo(() => getSystemDossier(systemId) || getSystemDossier('tinyurl')!, [systemId])
  const allSummaries = useMemo(() => getAllSystemDossierSummaries(), [])

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

  // 2. Interactive Packet Simulator
  const [simStep, setSimStep] = useState<number>(0)
  const [simIsPlaying, setSimIsPlaying] = useState<boolean>(false)
  const [simSpeed, setSimSpeed] = useState<number>(2000) // ms
  const totalSteps = dossier.system.animationSteps.length || 1

  useEffect(() => {
    let timer: any
    if (simIsPlaying) {
      timer = setInterval(() => {
        setSimStep((prev) => (prev + 1) % totalSteps)
      }, simSpeed)
    }
    return () => clearInterval(timer)
  }, [simIsPlaying, simSpeed, totalSteps])

  const activeAnimationStep = dossier.system.animationSteps[simStep] || dossier.system.animationSteps[0]

  // 3. Interactive Chaos Simulator
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
        <div className="flex items-center gap-3">
          <Link
            to="/learn?tab=sysdesign"
            className="flex items-center gap-1.5 rounded-lg bg-bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary ring-1 ring-border transition"
          >
            <ArrowLeft className="size-3.5" /> Back to Studio
          </Link>
          <span className="text-border">/</span>
          <span className="text-xs font-mono font-bold text-accent-brand uppercase tracking-wider">
            {dossier.system.category}
          </span>
          <span className="text-border">/</span>
          <span className="text-xs font-semibold text-text-primary truncate max-w-[200px] sm:max-w-none">
            {dossier.system.name}
          </span>
        </div>

        {/* System Switcher & Utility Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Quick System Switcher Dropdown */}
          <div className="relative">
            <select
              value={systemId}
              onChange={(e) => navigate(`/learn/system-design/${e.target.value}/1`)}
              className="rounded-lg bg-bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text-primary ring-1 ring-border focus:ring-accent-brand focus:outline-none cursor-pointer"
            >
              {allSummaries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
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

      {/* HERO BANNER FOR THE SYSTEM */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bg-surface-2 via-bg-surface-3/80 to-bg-surface-2 p-6 sm:p-8 ring-1 ring-border shadow-2xl mb-8">
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-15 pointer-events-none hidden lg:block overflow-hidden">
          <img
            src="/images/distributed-systems-blueprint.jpg"
            alt="Distributed Systems Blueprint"
            className="h-full w-full object-cover object-center filter saturate-150"
          />
        </div>

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full bg-accent-brand/10 px-3 py-1 text-[11px] font-mono font-bold text-accent-brand ring-1 ring-accent-brand/30">
              {dossier.system.difficulty} Architecture
            </span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-mono font-bold text-emerald-400 ring-1 ring-emerald-500/30 flex items-center gap-1.5">
              <Zap className="size-3" /> {dossier.system.throughput}
            </span>
            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-[11px] font-mono font-bold text-sky-400 ring-1 ring-sky-500/30 flex items-center gap-1.5">
              <Clock className="size-3" /> P99 {dossier.system.latency}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-text-primary leading-tight">
            {dossier.system.name}
          </h1>

          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            {dossier.executiveSummary}
          </p>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/50 text-xs">
            <div>
              <span className="text-text-muted block">Storage Scale:</span>
              <span className="font-semibold text-text-primary font-mono">{dossier.system.storageScale}</span>
            </div>
            <div>
              <span className="text-text-muted block">Architecture Curriculum:</span>
              <span className="font-semibold text-accent-brand font-mono">10 Exhaustive Chapters</span>
            </div>
            <div>
              <span className="text-text-muted block">Total Reading Time:</span>
              <span className="font-semibold text-text-primary font-mono">{dossier.totalReadingTimeMinutes} mins</span>
            </div>
            <div>
              <span className="text-text-muted block">Your Progress:</span>
              <span className="font-semibold text-emerald-400 font-mono">
                {((completedChapters[systemId]?.length || 0) / 10) * 100}% Completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN DOSSIER LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: CHAPTER SELECTOR SIDEBAR (3 cols) */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
          <div className="rounded-xl bg-bg-surface-2 p-4 ring-1 ring-border shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <BookOpen className="size-3.5 text-accent-brand" /> Table of Contents
              </h3>
              <span className="text-xs font-mono font-bold text-accent-brand">
                Chapter {activeChapterIndex + 1} of 10
              </span>
            </div>

            {/* Chapter Items List */}
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {dossier.chapters.map((ch, idx) => {
                const isActive = idx === activeChapterIndex
                const isDone = (completedChapters[systemId] || []).includes(ch.chapterNumber)

                return (
                  <button
                    key={ch.id}
                    onClick={() => handleSelectChapter(idx)}
                    className={`w-full text-left rounded-lg p-2.5 transition flex items-start gap-2.5 text-xs ${
                      isActive
                        ? 'bg-accent-brand/15 text-accent-brand ring-1 ring-accent-brand/50 shadow-sm font-semibold'
                        : 'text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="size-4 text-emerald-400" />
                      ) : (
                        <div
                          className={`size-4 rounded-full border flex items-center justify-center text-[10px] font-mono ${
                            isActive
                              ? 'border-accent-brand text-accent-brand font-bold'
                              : 'border-border text-text-muted'
                          }`}
                        >
                          {ch.chapterNumber}
                        </div>
                      )}
                    </div>

                    <div className="grow min-w-0">
                      <div className="truncate font-medium">{ch.title.replace(/^Chapter \d+:\s*/, '')}</div>
                      <div className="text-[10px] text-text-muted flex items-center gap-2 mt-0.5">
                        <span>{ch.badge}</span>
                        <span>•</span>
                        <span>{ch.estimatedMinutes}m read</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Architecture Diagram Thumbnail */}
          <div className="rounded-xl bg-bg-surface-2 p-4 ring-1 ring-border shadow-md space-y-2">
            <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
              <Network className="size-3.5 text-sky-400" /> Distributed Topology Overview
            </h4>
            <div className="rounded-lg overflow-hidden border border-border/80">
              <img
                src="/images/lld-internals-blueprint.jpg"
                alt="System Architecture Diagram"
                className="w-full h-32 object-cover"
              />
            </div>
            <p className="text-[11px] text-text-muted leading-tight">
              Hardware-level event loops, lock-free queues, and memory buffers driving this architecture.
            </p>
          </div>
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

          {currentChapter.interactiveModuleType === 'packet-flow' && (
            <div className="rounded-2xl bg-bg-surface-2 p-6 ring-1 ring-sky-500/40 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Activity className="size-4 text-sky-400 animate-pulse" /> Live Request Packet Tracer & Simulator
                </h3>

                {/* Simulator Controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg bg-bg-surface-1 p-0.5 ring-1 ring-border text-[10px] font-mono">
                    <button
                      onClick={() => setSimSpeed(3000)}
                      className={`px-2 py-1 rounded ${simSpeed === 3000 ? 'bg-sky-500 text-bg-base font-bold' : 'text-text-muted hover:text-text-primary'}`}
                    >
                      0.5x
                    </button>
                    <button
                      onClick={() => setSimSpeed(2000)}
                      className={`px-2 py-1 rounded ${simSpeed === 2000 ? 'bg-sky-500 text-bg-base font-bold' : 'text-text-muted hover:text-text-primary'}`}
                    >
                      1x
                    </button>
                    <button
                      onClick={() => setSimSpeed(1000)}
                      className={`px-2 py-1 rounded ${simSpeed === 1000 ? 'bg-sky-500 text-bg-base font-bold' : 'text-text-muted hover:text-text-primary'}`}
                    >
                      2x
                    </button>
                  </div>
                  <button
                    onClick={() => setSimIsPlaying(!simIsPlaying)}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-400 ring-1 ring-sky-500/50 hover:bg-sky-500/30 transition"
                  >
                    {simIsPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                    {simIsPlaying ? 'Pause Simulation' : 'Auto Play'}
                  </button>
                  <button
                    onClick={() => setSimStep((prev) => (prev + 1) % totalSteps)}
                    className="rounded-lg bg-bg-surface-1 px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary ring-1 ring-border transition"
                  >
                    Step Next ➔
                  </button>
                </div>
              </div>

              {/* Active Animation Step Spotlight */}
              <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-sky-400 uppercase tracking-wider">
                    Step {activeAnimationStep.step} of {totalSteps}: {activeAnimationStep.title}
                  </span>
                  <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[11px] text-sky-300">
                    {activeAnimationStep.protocol}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-4 py-3 text-xs font-mono font-bold">
                  <div className="rounded-lg bg-bg-surface-3 px-3 py-2 border border-sky-500/50 text-text-primary text-center">
                    {activeAnimationStep.fromNode}
                  </div>
                  <div className="flex items-center text-sky-400 animate-pulse">
                    ──────────►
                  </div>
                  <div className="rounded-lg bg-bg-surface-3 px-3 py-2 border border-emerald-500/50 text-emerald-400 text-center">
                    {activeAnimationStep.toNode}
                  </div>
                </div>

                <p className="text-xs text-text-secondary">
                  {activeAnimationStep.description}
                </p>

                {activeAnimationStep.codeRef && (
                  <div className="rounded bg-bg-base/80 p-2 font-mono text-[11px] text-text-muted border border-border/50">
                    <span className="text-accent-brand">{activeAnimationStep.codeRef.file}</span>:
                    <span className="text-text-secondary ml-1">{activeAnimationStep.codeRef.funcName}()</span> — {activeAnimationStep.codeRef.codeExplanation}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentChapter.interactiveModuleType === 'chaos-simulator' && (
            <div className="rounded-2xl bg-bg-surface-2 p-6 ring-1 ring-rose-500/40 shadow-2xl space-y-4">
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
          <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-surface-2 p-4 ring-1 border-border shadow-lg">
            <button
              onClick={() => handleSelectChapter(Math.max(0, activeChapterIndex - 1))}
              disabled={activeChapterIndex === 0}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition disabled:opacity-30 disabled:pointer-events-none bg-bg-surface-1 text-text-secondary hover:text-text-primary ring-1 ring-border"
            >
              <ArrowLeft className="size-3.5" /> Previous Chapter
            </button>

            <span className="text-xs font-mono text-text-muted hidden sm:inline">
              Chapter {activeChapterIndex + 1} of 10
            </span>

            {activeChapterIndex < 9 ? (
              <button
                onClick={() => handleSelectChapter(activeChapterIndex + 1)}
                className="flex items-center gap-2 rounded-lg bg-accent-brand px-4 py-2 text-xs font-bold text-bg-base hover:opacity-90 transition shadow-sm"
              >
                Next Chapter <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <Link
                to="/learn?tab=sysdesign"
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-bg-base hover:bg-emerald-600 transition shadow-sm"
              >
                Complete Masterclass Dossier <CheckCircle2 className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
