import React, { useState, useEffect, useRef, useMemo } from 'react'
import type { SystemDesignModel, ServiceNode } from '../types'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Zap,
  Server,
  Database,
  Layers,
  Globe,
  Shield,
  Smartphone,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  Radio,
  Copy,
  Check,
  Terminal,
  HardDrive,
  Activity,
  Code,
  Send,
  X,
  FileCode,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Network,
  Table,
} from 'lucide-react'
import { SYSTEM_METADATA_REGISTRY } from '../data/systemMetadataRegistry'
import { WirePacketHexView } from './WirePacketHexView'
import {
  playPacketTransmitSound,
  playPacketArriveSound,
  playNodeCrashSound,
  playStepClickSound,
} from '../utils/audioEffects'

export interface ResolvedNodePosition {
  x: number
  y: number
  tierName: string
}

// Computes clean, collision-free architectural tier positions across all 31 systems
export function getResolvedNodeLayout(services: ServiceNode[]): Record<string, ResolvedNodePosition> {
  const tiers: Record<number, { name: string; nodes: ServiceNode[] }> = {
    0: { name: 'Clients & Ingress', nodes: [] },
    1: { name: 'Gateways & Security', nodes: [] },
    2: { name: 'Core Microservices', nodes: [] },
    3: { name: 'In-Memory & Messaging', nodes: [] },
    4: { name: 'Storage & Persistence', nodes: [] },
  }

  services.forEach((s) => {
    if (s.type === 'client') tiers[0].nodes.push(s)
    else if (s.type === 'gateway') tiers[1].nodes.push(s)
    else if (s.type === 'service' || s.type === 'worker') tiers[2].nodes.push(s)
    else if (s.type === 'cache' || s.type === 'queue') tiers[3].nodes.push(s)
    else tiers[4].nodes.push(s)
  })

  const activeTierIndices = [0, 1, 2, 3, 4].filter((idx) => tiers[idx].nodes.length > 0)
  const numActiveTiers = activeTierIndices.length

  const positions: Record<string, ResolvedNodePosition> = {}

  activeTierIndices.forEach((tierIdx, colRank) => {
    const minX = 13
    const maxX = 87
    const colX = numActiveTiers <= 1
      ? 50
      : +(minX + (colRank * (maxX - minX)) / (numActiveTiers - 1)).toFixed(1)

    const tierNodes = tiers[tierIdx].nodes
    const count = tierNodes.length

    tierNodes.forEach((node, rowIdx) => {
      let rowY: number
      if (count === 1) {
        rowY = 50
      } else if (count === 2) {
        rowY = rowIdx === 0 ? 30 : 70
      } else if (count === 3) {
        rowY = [22, 50, 78][rowIdx]
      } else if (count === 4) {
        rowY = [16, 38, 62, 84][rowIdx]
      } else {
        const minY = 14
        const maxY = 86
        rowY = +(minY + (rowIdx * (maxY - minY)) / (count - 1)).toFixed(1)
      }

      positions[node.id] = { x: colX, y: rowY, tierName: tiers[tierIdx].name }
    })
  })

  return positions
}

// Maps each node to its live interacting function and source code file
export function getNodeCodeDetails(node: ServiceNode, system: SystemDesignModel, currentStep?: any) {
  if (currentStep && (currentStep.fromNode === node.id || currentStep.toNode === node.id) && currentStep.codeRef) {
    const matchingFile = system.codeFiles.find((f) => f.name === currentStep.codeRef.file)
    return {
      fileName: currentStep.codeRef.file,
      funcName: currentStep.codeRef.funcName,
      explanation: currentStep.codeRef.codeExplanation,
      lineHighlight: currentStep.codeRef.lineHighlight,
      fullCode: matchingFile?.code || `// Code running on ${node.name}`,
      snippet: `${currentStep.codeRef.funcName}()`,
    }
  }

  const matchingFile = system.codeFiles.find((f) => {
    const n = f.name.toLowerCase()
    const r = f.role.toLowerCase()
    const nid = node.id.toLowerCase()
    const nt = node.type.toLowerCase()
    return n.includes(nid) || r.includes(nid) || n.includes(nt) || r.includes(nt)
  }) || system.codeFiles[0]

  let defaultSnippet = 'HandleRequest()'
  if (node.type === 'client') defaultSnippet = "fetch('/api/v1/resource')"
  else if (node.type === 'gateway') defaultSnippet = 'proxy.RouteAndFilter(req)'
  else if (node.type === 'service') defaultSnippet = 'service.Process(ctx, req)'
  else if (node.type === 'cache') defaultSnippet = 'cache.Get(ctx, key)'
  else if (node.type === 'queue') defaultSnippet = 'kafka.Produce(topic, msg)'
  else if (node.type === 'database') defaultSnippet = 'db.QueryRow(ctx, query)'
  else if (node.type === 'storage') defaultSnippet = 's3.PutObject(ctx, bucket)'

  return {
    fileName: matchingFile?.name || `${node.id}.go`,
    funcName: defaultSnippet.split('(')[0],
    explanation: node.details,
    lineHighlight: '1-25',
    fullCode: matchingFile?.code || `// Production Microservice Implementation: ${node.name}
// Role: ${node.role}
// Technology: ${node.techStack}

func ${defaultSnippet} {
    // Process input context and network socket
    return nil
}`,
    snippet: defaultSnippet,
  }
}

export interface SystemVisualizerProps {
  system: SystemDesignModel
  currentStepIndex: number
  onStepChange: (index: number) => void
  onSelectNode?: (node: ServiceNode) => void
  layoutMode?: 'split' | 'blueprint'
  onToggleLayout?: () => void
  onSwitchToFromScratch?: () => void
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Globe: <Globe className="size-5" />,
  Shield: <Shield className="size-5" />,
  Server: <Server className="size-5" />,
  Database: <Database className="size-5" />,
  Layers: <Layers className="size-5" />,
  Zap: <Zap className="size-5" />,
  Smartphone: <Smartphone className="size-5" />,
  Cpu: <Cpu className="size-5" />,
}

const getProtocolTheme = (protocol: string = '') => {
  const p = protocol.toUpperCase()
  if (p.includes('GRPC') || p.includes('PROTO') || p.includes('HTTP/2') || p.includes('QUIC')) {
    return {
      particle: '#10b981',
      particleAlt: '#34d399',
      glow: '#059669',
      line: '#10b981',
      badgeBorder: '#10b981',
      badgeText: '#34d399',
    }
  }
  if (p.includes('KAFKA') || p.includes('EVENT') || p.includes('STREAM') || p.includes('PUBSUB') || p.includes('QUEUE')) {
    return {
      particle: '#c084fc',
      particleAlt: '#e879f9',
      glow: '#9333ea',
      line: '#a855f7',
      badgeBorder: '#c084fc',
      badgeText: '#e879f9',
    }
  }
  if (p.includes('SQL') || p.includes('POSTGRES') || p.includes('MYSQL') || p.includes('WAL') || p.includes('ROCKSDB')) {
    return {
      particle: '#fbbf24',
      particleAlt: '#fde047',
      glow: '#d97706',
      line: '#f59e0b',
      badgeBorder: '#fbbf24',
      badgeText: '#fde047',
    }
  }
  if (p.includes('REDIS') || p.includes('CACHE') || p.includes('MEMCACHE')) {
    return {
      particle: '#38bdf8',
      particleAlt: '#67e8f9',
      glow: '#0284c7',
      line: '#38bdf8',
      badgeBorder: '#38bdf8',
      badgeText: '#67e8f9',
    }
  }
  if (p.includes('WS') || p.includes('WEBSOCKET')) {
    return {
      particle: '#a3e635',
      particleAlt: '#bef264',
      glow: '#65a30d',
      line: '#84cc16',
      badgeBorder: '#a3e635',
      badgeText: '#bef264',
    }
  }
  return {
    particle: 'var(--color-accent-brand)',
    particleAlt: '#38bdf8',
    glow: '#818cf8',
    line: 'var(--color-accent-brand)',
    badgeBorder: 'var(--color-accent-brand)',
    badgeText: 'var(--color-text-primary)',
  }
}

export const SystemVisualizer: React.FC<SystemVisualizerProps> = ({
  system,
  currentStepIndex,
  onStepChange,
  onSelectNode,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1) // 0.5x, 1x, 2x
  const [selectedNode, setSelectedNode] = useState<ServiceNode | null>(null)
  const [chaosMode, setChaosMode] = useState<boolean>(false)
  const [failedNodes, setFailedNodes] = useState<Record<string, boolean>>({})
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false)
  const [trafficProfile, setTrafficProfile] = useState<'normal' | 'peak' | 'spike'>('normal')
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false)
  const [showTelemetryHud, setShowTelemetryHud] = useState<boolean>(true)
  const [packetInspectorMode, setPacketInspectorMode] = useState<'json' | 'hex'>('json')
  const [hoveredConn, setHoveredConn] = useState<{
    id: string
    midX: number
    midY: number
    fromName: string
    toName: string
    protocol: string
  } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mathematically guaranteed collision-free layout across all 31 systems
  const resolvedPositions = useMemo(() => getResolvedNodeLayout(system.services), [system.services])

  const meta = SYSTEM_METADATA_REGISTRY[system.id]
  const [showReqsAccordion, setShowReqsAccordion] = useState<boolean>(false)
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'components' | 'connections' | 'slas'>('components')

  // Calculate unique active tiers for visual swimlane bands
  const activeTiers = useMemo(() => {
    const tierMap: Record<string, { name: string; x: number; count: number }> = {}
    Object.values(resolvedPositions).forEach((pos) => {
      if (!tierMap[pos.tierName]) {
        tierMap[pos.tierName] = { name: pos.tierName, x: pos.x, count: 0 }
      }
      tierMap[pos.tierName].count++
    })
    return Object.values(tierMap).sort((a, b) => a.x - b.x)
  }, [resolvedPositions])

  // Service Deep Inspector State
  const [inspectorTab, setInspectorTab] = useState<'code' | 'test' | 'logs'>('code')
  const [testRpcLoading, setTestRpcLoading] = useState<boolean>(false)
  const [testRpcResult, setTestRpcResult] = useState<{
    status: number
    latencyMs: number
    timestamp: string
    responsePayload: any
  } | null>(null)
  const [copiedCode, setCopiedCode] = useState<boolean>(false)

  const handleTestRpc = (node: ServiceNode) => {
    setTestRpcLoading(true)
    if (soundEnabled) playPacketTransmitSound()
    setTimeout(() => {
      setTestRpcLoading(false)
      if (soundEnabled) playPacketArriveSound()
      const codeInfo = getNodeCodeDetails(node, system, currentStep)
      setTestRpcResult({
        status: failedNodes[node.id] ? 503 : 200,
        latencyMs: failedNodes[node.id] ? 1500 : +(Math.random() * 2.8 + 1.1).toFixed(1),
        timestamp: new Date().toLocaleTimeString(),
        responsePayload: failedNodes[node.id]
          ? { error: 'Service Unavailable', cause: 'Node marked as crashed (Chaos Mode)' }
          : {
              ok: true,
              service: node.id,
              func: codeInfo.funcName,
              protocol: currentStep.protocol || 'gRPC',
              data: currentStep.payload || { message: 'ACK received' },
            },
      })
    }, 450)
  }

  const steps = system.animationSteps
  const currentStep = steps[currentStepIndex] || steps[0]

  // Audio trigger on step transitions
  useEffect(() => {
    if (soundEnabled) {
      playPacketTransmitSound()
      const t = setTimeout(() => playPacketArriveSound(), 400)
      return () => clearTimeout(t)
    }
  }, [currentStepIndex, soundEnabled])

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      const duration = (currentStep?.durationMs || 3000) / playbackSpeed
      timerRef.current = setTimeout(() => {
        if (currentStepIndex < steps.length - 1) {
          onStepChange(currentStepIndex + 1)
        } else {
          setIsPlaying(false) // Reached the end
        }
      }, duration)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, currentStepIndex, steps.length, playbackSpeed, currentStep, onStepChange])

  // Continuous smooth packet stream motion
  const [flowTick, setFlowTick] = useState<number>(0)
  useEffect(() => {
    let animId: number
    const speedMult = trafficProfile === 'spike' ? 2.2 : trafficProfile === 'peak' ? 1.5 : 1.0
    let lastTime = performance.now()
    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now
      setFlowTick((prev) => (prev + dt * speedMult * playbackSpeed) % 1000)
      animId = requestAnimationFrame(loop)
    }
    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [trafficProfile, playbackSpeed])

  const handlePlayPause = () => {
    if (currentStepIndex >= steps.length - 1 && !isPlaying) {
      onStepChange(0) // restart from beginning
      setIsPlaying(true)
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  const handleNext = () => {
    setIsPlaying(false)
    if (soundEnabled) playStepClickSound()
    if (currentStepIndex < steps.length - 1) {
      onStepChange(currentStepIndex + 1)
    }
  }

  const handlePrev = () => {
    setIsPlaying(false)
    if (soundEnabled) playStepClickSound()
    if (currentStepIndex > 0) {
      onStepChange(currentStepIndex - 1)
    }
  }

  const handleReset = () => {
    setIsPlaying(false)
    if (soundEnabled) playStepClickSound()
    onStepChange(0)
  }

  const handleNodeClick = (node: ServiceNode) => {
    if (chaosMode) {
      // Toggle failure simulation
      if (soundEnabled) playNodeCrashSound()
      setFailedNodes((prev) => ({ ...prev, [node.id]: !prev[node.id] }))
    } else {
      setSelectedNode(node)
      if (onSelectNode) onSelectNode(node)
    }
  }

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(currentStep.payload, null, 2))
    setCopiedPayload(true)
    setTimeout(() => setCopiedPayload(false), 2000)
  }

  // Calculate packet position between fromNode and toNode for animation
  const fromNodeObj = system.services.find((s) => s.id === currentStep?.fromNode)
  const toNodeObj = system.services.find((s) => s.id === currentStep?.toNode)
  const isSelfNode = currentStep?.fromNode === currentStep?.toNode

  return (
    <div className="flex flex-col rounded-2xl bg-bg-surface-2 ring-1 ring-border shadow-2xl overflow-hidden">
      {/* SECTION A: SYSTEM ARCHITECTURE OVERVIEW & INVARIANT HERO BANNER */}
      <div className="border-b border-border bg-gradient-to-r from-bg-surface-1 via-bg-surface-2 to-bg-surface-1 p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-amber-400/10 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-400 ring-1 ring-amber-400/30">
              ⚡ {meta?.realWorldArchetype || system.name}
            </span>
            <span className="rounded-md bg-sky-400/10 px-2.5 py-1 font-mono text-[11px] font-bold text-sky-400 ring-1 ring-sky-400/30">
              🏛️ Pattern: {meta?.architecturePattern || system.category}
            </span>
            <span className="rounded-md bg-purple-400/10 px-2 py-0.5 font-mono text-[10.5px] font-bold text-purple-400 ring-1 ring-purple-400/30">
              {meta?.difficulty || system.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
            <span>Throughput: <strong className="text-text-primary">{system.throughput}</strong></span>
            <span>•</span>
            <span>Latency SLA: <strong className="text-emerald-400">{system.latency}</strong></span>
            <span>•</span>
            <span>Scale: <strong className="text-text-primary">{system.storageScale}</strong></span>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 pt-1">
          <div className="max-w-3xl space-y-1">
            <h2 className="text-[20px] sm:text-[22px] font-extrabold text-text-primary tracking-tight font-mono">
              {system.name}
            </h2>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              {meta?.whatItDoes || system.tagline}
            </p>
          </div>

          <button
            onClick={() => setShowReqsAccordion(!showReqsAccordion)}
            className="flex items-center gap-1.5 rounded-lg bg-bg-surface-3 px-3 py-1.5 text-[11.5px] font-mono font-bold text-text-primary hover:bg-bg-surface-1 ring-1 ring-border transition shrink-0"
          >
            {showReqsAccordion ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {showReqsAccordion ? 'Hide Requirements & SLAs' : 'View Requirements & SLAs'}
          </button>
        </div>

        {/* Distributed Invariant Highlight */}
        {meta?.keyInvariant && (
          <div className="rounded-xl bg-accent-brand/5 p-3 ring-1 ring-accent-brand/20 flex items-start gap-2.5 text-[12px] font-mono text-accent-brand">
            <Sparkles className="size-4 shrink-0 mt-0.5 text-accent-brand" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] block text-accent-brand/80">
                Core Distributed System Invariant:
              </span>
              <span className="text-text-primary font-medium">{meta.keyInvariant}</span>
            </div>
          </div>
        )}

        {/* Collapsible Requirements Breakdown */}
        {showReqsAccordion && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[12px] font-mono">
            <div className="rounded-xl bg-bg-surface-3/60 p-3.5 ring-1 ring-border space-y-1.5">
              <span className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider block">
                ✓ Functional Requirements:
              </span>
              <ul className="space-y-1 text-text-secondary font-sans text-[12.5px]">
                {system.functionalReqs.map((req, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 font-mono">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-bg-surface-3/60 p-3.5 ring-1 ring-border space-y-1.5">
              <span className="font-bold text-amber-400 text-[11px] uppercase tracking-wider block">
                ⚡ Non-Functional Requirements & SLAs:
              </span>
              <ul className="space-y-1 text-text-secondary font-sans text-[12.5px]">
                {system.nonFunctionalReqs.map((req, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 shrink-0 font-mono">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Visualizer Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-surface-3/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-2.5 rounded-full bg-accent-brand shadow-[0_0_8px_var(--color-accent-brand)] animate-pulse" />
          <span className="text-[12px] font-bold tracking-wider text-text-primary uppercase flex items-center gap-1.5">
            <Radio className="size-3.5 text-accent-brand" /> Live Architecture Visualizer
          </span>
          <span className="rounded-md bg-accent-brand/10 px-2 py-0.5 font-mono text-[11px] font-bold text-accent-brand ring-1 ring-accent-brand/20">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
        </div>

        {/* Player & Chaos Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chaos Mode Toggle */}
          <button
            onClick={() => {
              setChaosMode(!chaosMode)
              if (chaosMode) setFailedNodes({})
            }}
            title="Simulate node crash & network chaos"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
              chaosMode
                ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                : 'bg-bg-surface-1 text-text-muted hover:text-text-primary ring-1 ring-border'
            }`}
          >
            <Flame className="size-3.5" />
            {chaosMode ? 'Chaos Mode Active (Click node to crash)' : 'Chaos Simulator'}
          </button>

          <button
            onClick={handleReset}
            title="Reset to beginning"
            className="flex size-8 items-center justify-center rounded-lg bg-bg-surface-1 text-text-muted transition hover:bg-bg-surface-3 hover:text-text-primary ring-1 ring-border"
          >
            <RotateCcw className="size-3.5" />
          </button>

          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            title="Previous Step"
            className="flex size-8 items-center justify-center rounded-lg bg-bg-surface-1 text-text-muted transition hover:bg-bg-surface-3 hover:text-text-primary disabled:opacity-40 ring-1 ring-border"
          >
            <SkipBack className="size-3.5" />
          </button>

          <button
            onClick={handlePlayPause}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-bold transition ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-accent-brand text-bg-base hover:opacity-90 shadow-md font-extrabold'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="size-3.5 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="size-3.5 fill-current" /> {currentStepIndex >= steps.length - 1 ? 'Replay' : 'Play Simulation'}
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={currentStepIndex >= steps.length - 1}
            title="Next Step"
            className="flex size-8 items-center justify-center rounded-lg bg-bg-surface-1 text-text-muted transition hover:bg-bg-surface-3 hover:text-text-primary disabled:opacity-40 ring-1 ring-border"
          >
            <SkipForward className="size-3.5" />
          </button>

          {/* Speed selector */}
          <div className="ml-1 flex items-center rounded-lg bg-bg-surface-1 p-0.5 ring-1 ring-border text-[11px] font-mono">
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`rounded px-1.5 py-0.5 transition ${
                  playbackSpeed === spd
                    ? 'bg-accent-brand text-bg-base font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Simulated Traffic Load Generator */}
          <div className="ml-1 flex items-center rounded-lg bg-bg-surface-1 p-0.5 ring-1 ring-border text-[11px] font-mono">
            <button
              onClick={() => setTrafficProfile('normal')}
              title="1,000 QPS Baseline Traffic"
              className={`rounded px-2 py-0.5 transition ${
                trafficProfile === 'normal'
                  ? 'bg-sky-500 text-black font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              1k QPS
            </button>
            <button
              onClick={() => setTrafficProfile('peak')}
              title="10,000 QPS Peak Load"
              className={`rounded px-2 py-0.5 transition ${
                trafficProfile === 'peak'
                  ? 'bg-amber-400 text-black font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              10k QPS
            </button>
            <button
              onClick={() => setTrafficProfile('spike')}
              title="50,000 QPS Flash Spike"
              className={`rounded px-2 py-0.5 transition ${
                trafficProfile === 'spike'
                  ? 'bg-rose-500 text-white font-bold animate-pulse'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              50k Spike
            </button>
          </div>

          {/* Audio Effects Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Audio Effects' : 'Enable Cyber Audio Synthesizer'}
            className={`flex size-8 items-center justify-center rounded-lg transition ring-1 ${
              soundEnabled
                ? 'bg-sky-500/20 text-sky-400 ring-sky-500/50 shadow-[0_0_8px_#38bdf8]'
                : 'bg-bg-surface-1 text-text-muted hover:text-text-primary ring-border'
            }`}
          >
            {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </button>

          {/* Telemetry HUD Toggle */}
          <button
            onClick={() => setShowTelemetryHud(!showTelemetryHud)}
            title={showTelemetryHud ? 'Hide Telemetry HUD' : 'Show Telemetry HUD'}
            className={`flex size-8 items-center justify-center rounded-lg transition ring-1 ${
              showTelemetryHud
                ? 'bg-accent-brand/20 text-accent-brand ring-accent-brand/50 shadow-[0_0_8px_var(--color-accent-brand)]'
                : 'bg-bg-surface-1 text-text-muted hover:text-text-primary ring-border'
            }`}
          >
            <Activity className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="relative min-h-[580px] h-[580px] w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-bg-surface-3/30 via-bg-surface-1 to-[#05070a] p-6 select-none overflow-hidden">
        {/* Animated Cyber Grid */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* Architectural Tier Guideline Lanes - FAANG System Blueprint Layout */}
        <div className="absolute inset-0 pointer-events-none flex justify-between px-6 pt-3 pb-8 opacity-25">
          {['Clients & Ingress', 'Gateways & Security', 'Core Microservices', 'In-Memory & Queues', 'Storage & Persistence'].map((tierLabel, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center border-r border-dashed border-border/40 last:border-r-0">
              <span className="rounded bg-bg-surface-3/80 px-2 py-0.5 font-mono text-[9px] font-bold text-text-muted uppercase tracking-wider ring-1 ring-border/50">
                Tier {idx + 1}: {tierLabel}
              </span>
            </div>
          ))}
        </div>

        {/* Floating Telemetry HUD */}
        {showTelemetryHud && (
          <div className="absolute top-3 right-3 z-30 rounded-xl bg-black/80 p-2.5 ring-1 ring-border/80 backdrop-blur-md font-mono text-[10.5px] space-y-1.5 shadow-2xl min-w-[210px] pointer-events-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-1">
              <span className="flex items-center gap-1.5 text-text-muted font-bold uppercase text-[9.5px]">
                <Activity className={`size-3 ${Object.values(failedNodes).some(Boolean) ? 'text-rose-400 animate-pulse' : 'text-accent-brand'}`} />
                Live Telemetry HUD
              </span>
              <span
                className={`size-2 rounded-full ${
                  Object.values(failedNodes).some(Boolean)
                    ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping'
                    : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                }`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
              <div>
                <span className="text-[9px] text-text-muted block">Throughput</span>
                <span className="font-bold text-sky-400 block">
                  {trafficProfile === 'spike' ? '50k/s' : trafficProfile === 'peak' ? '12.5k/s' : '1k/s'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-text-muted block">p99 Latency</span>
                <span
                  className={`font-bold block ${
                    Object.values(failedNodes).some(Boolean)
                      ? 'text-rose-400 animate-pulse'
                      : 'text-emerald-400'
                  }`}
                >
                  {Object.values(failedNodes).some(Boolean)
                    ? '142ms'
                    : trafficProfile === 'spike'
                    ? '34.6ms'
                    : trafficProfile === 'peak'
                    ? '8.4ms'
                    : '1.9ms'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-text-muted block">Error Rate</span>
                <span
                  className={`font-bold block ${
                    Object.values(failedNodes).some(Boolean)
                      ? 'text-rose-400 animate-pulse'
                      : 'text-text-muted'
                  }`}
                >
                  {Object.values(failedNodes).some(Boolean)
                    ? '34.2%'
                    : trafficProfile === 'spike'
                    ? '0.12%'
                    : '0.00%'}
                </span>
              </div>
            </div>

            {/* Sparkline Load Curve */}
            <div className="pt-1">
              <svg viewBox="0 0 120 20" className="w-full h-4 overflow-visible">
                <polyline
                  fill="none"
                  stroke={
                    Object.values(failedNodes).some(Boolean)
                      ? '#f43f5e'
                      : trafficProfile === 'spike'
                      ? '#f59e0b'
                      : '#00F0FF'
                  }
                  strokeWidth="1.8"
                  points={
                    Object.values(failedNodes).some(Boolean)
                      ? '0,14 15,12 30,15 45,5 60,2 75,3 90,1 105,2 120,1'
                      : trafficProfile === 'spike'
                      ? '0,16 15,14 30,10 45,8 60,6 75,5 90,4 105,5 120,3'
                      : trafficProfile === 'peak'
                      ? '0,18 15,15 30,14 45,12 60,11 75,12 90,10 105,11 120,9'
                      : '0,19 15,18 30,19 45,17 60,18 75,17 90,18 105,17 120,18'
                  }
                  className="transition-all duration-300"
                />
              </svg>
            </div>
          </div>
        )}

        {/* SVG Connection Lines & Animated Flow Particles */}
        <svg className="absolute inset-0 size-full pointer-events-none overflow-visible">
          <defs>
            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent-brand)" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Architectural Tier Swimlane Columns */}
          {activeTiers.map((tier) => {
            const colWidth = 14
            const startX = Math.max(0.5, tier.x - colWidth / 2)
            return (
              <g key={tier.name} className="transition-all duration-300">
                {/* Translucent Tier Column Band */}
                <rect
                  x={`${startX}%`}
                  y="2%"
                  width={`${colWidth}%`}
                  height="96%"
                  rx="14"
                  fill="rgba(255, 255, 255, 0.012)"
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="4 4"
                />
                {/* Tier Title Label */}
                <text
                  x={`${tier.x}%`}
                  y="4.5%"
                  textAnchor="middle"
                  fill="rgba(148, 163, 184, 0.75)"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                  letterSpacing="0.08em"
                >
                  {tier.name.toUpperCase()} ({tier.count})
                </text>
              </g>
            )
          })}

          {/* Connection Wires with Resolved Non-Overlapping Coordinates */}
          {system.connections.map((conn) => {
            const from = system.services.find((s) => s.id === conn.from)
            const to = system.services.find((s) => s.id === conn.to)
            if (!from || !to) return null

            const fromPos = resolvedPositions[conn.from] || { x: from.x, y: from.y, tierName: '' }
            const toPos = resolvedPositions[conn.to] || { x: to.x, y: to.y, tierName: '' }

            const isCurrentActiveConn =
              (currentStep?.fromNode === conn.from && currentStep?.toNode === conn.to) ||
              (currentStep?.fromNode === conn.to && currentStep?.toNode === conn.from)

            const isBlocked = failedNodes[conn.from] || failedNodes[conn.to]
            const protoTheme = getProtocolTheme(currentStep?.protocol)

            // Calculate subtle curvature control point
            const midX = (fromPos.x + toPos.x) / 2
            const midY = (fromPos.y + toPos.y) / 2 - 4 // slight arch
            const pathD = `M ${fromPos.x}% ${fromPos.y}% Q ${midX}% ${midY}% ${toPos.x}% ${toPos.y}%`

            return (
              <g key={conn.id}>
                {/* Background Shadow Wire */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={
                    isBlocked
                      ? '#f43f5e'
                      : isCurrentActiveConn
                      ? protoTheme.line
                      : 'var(--color-border-strong)'
                  }
                  strokeWidth={isCurrentActiveConn ? 3 : 1.2}
                  strokeDasharray={isBlocked ? '4 4' : isCurrentActiveConn ? '8 4' : '4 4'}
                  opacity={isCurrentActiveConn ? 0.95 : 0.35}
                  className="transition-all duration-300"
                />

                {/* Animated Streaming Laser Wave on Active Connection */}
                {isCurrentActiveConn && !isBlocked && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={protoTheme.particle}
                    strokeWidth="3.5"
                    strokeDasharray="10 24"
                    opacity="0.9"
                    filter="url(#laserGlow)"
                    className="animate-flow-dash"
                  />
                )}

                {/* Invisible wide hover hit rail */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="24"
                  className="pointer-events-auto cursor-pointer"
                  onMouseEnter={() =>
                    setHoveredConn({
                      id: conn.id,
                      midX,
                      midY,
                      fromName: from.name,
                      toName: to.name,
                      protocol: conn.protocol || currentStep.protocol || 'TCP/IP',
                    })
                  }
                  onMouseLeave={() => setHoveredConn(null)}
                />
              </g>
            )
          })}

          {/* Traveling Multi-Particle Stream & Protocol Badge */}
          {fromNodeObj && toNodeObj && !isSelfNode && !failedNodes[currentStep.fromNode] && (() => {
            const fromPos = resolvedPositions[fromNodeObj.id] || { x: fromNodeObj.x, y: fromNodeObj.y, tierName: '' }
            const toPos = resolvedPositions[toNodeObj.id] || { x: toNodeObj.x, y: toNodeObj.y, tierName: '' }
            const midX = (fromPos.x + toPos.x) / 2
            const midY = (fromPos.y + toPos.y) / 2 - 4
            const protoTheme = getProtocolTheme(currentStep.protocol)
            const baseOffsets =
              trafficProfile === 'spike'
                ? [0.0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9]
                : trafficProfile === 'peak'
                ? [0.0, 0.22, 0.44, 0.66, 0.88]
                : [0.1, 0.4, 0.7]

            return (
              <g className="transition-all duration-700 ease-in-out">
                {/* Target Node Receiving Waves - Centered via group transform */}
                <g style={{ transform: `translate(${toPos.x}%, ${toPos.y}%)`, transformBox: 'view-box' }}>
                  <circle
                    cx="0"
                    cy="0"
                    r="42"
                    fill="none"
                    stroke={protoTheme.particle}
                    strokeWidth="1.8"
                    opacity="0.6"
                    style={{
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                      animation: 'ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite',
                    }}
                  />
                </g>

                {/* Traveling Particles along True Quadratic Bezier Path */}
                {baseOffsets.map((baseOffset, idx) => {
                  const t = (baseOffset + (flowTick * 0.35)) % 1
                  const oneMinusT = 1 - t
                  const px =
                    oneMinusT * oneMinusT * fromPos.x +
                    2 * oneMinusT * t * midX +
                    t * t * toPos.x
                  const py =
                    oneMinusT * oneMinusT * fromPos.y +
                    2 * oneMinusT * t * midY +
                    t * t * toPos.y

                  return (
                    <circle
                      key={idx}
                      cx={`${px}%`}
                      cy={`${py}%`}
                      r={trafficProfile === 'spike' ? 6 : idx === 1 ? 6.5 : 4.5}
                      fill={trafficProfile === 'spike' ? '#f43f5e' : protoTheme.particle}
                      filter="url(#laserGlow)"
                      className="transition-all"
                    />
                  )
                })}

                {/* Protocol Floating Badge on Wire */}
                <g style={{ transform: `translate(${midX}%, ${midY}%)`, transformBox: 'view-box' }}>
                  <g transform="translate(-32, -14)">
                    <rect
                      width="64"
                      height="20"
                      rx="6"
                      fill="var(--color-bg-surface-3)"
                      stroke={protoTheme.badgeBorder}
                      strokeWidth="1.4"
                      className="shadow-lg"
                    />
                    <text
                      x="32"
                      y="14"
                      fill={protoTheme.badgeText}
                      fontSize="10"
                      fontWeight="800"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                    >
                      {currentStep.protocol}
                    </text>
                  </g>
                </g>
              </g>
            )
          })()}

          {/* Self-Node In-Memory Execution Animation */}
          {fromNodeObj && isSelfNode && !failedNodes[currentStep.fromNode] && (() => {
            const selfPos = resolvedPositions[fromNodeObj.id] || { x: fromNodeObj.x, y: fromNodeObj.y, tierName: '' }
            return (
              <g
                className="transition-all duration-700 ease-in-out"
                style={{ transform: `translate(${selfPos.x}%, ${selfPos.y}%)`, transformBox: 'view-box' }}
              >
                {/* Concentric Rotating Dash Ring */}
                <circle
                  cx="0"
                  cy="0"
                  r="44"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="6 8"
                  filter="url(#laserGlow)"
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    animation: 'spin 3s linear infinite',
                  }}
                />
                {/* Soft Pulsing Core Aura */}
                <circle
                  cx="0"
                  cy="0"
                  r="28"
                  fill="#38bdf8"
                  opacity="0.15"
                  className="animate-pulse"
                />
                {/* Dual Orbiting Particles */}
                <circle
                  cx={44 * Math.cos(flowTick * 3)}
                  cy={44 * Math.sin(flowTick * 3)}
                  r="5"
                  fill="#00F0FF"
                  filter="url(#laserGlow)"
                  className="shadow-lg"
                />
                <circle
                  cx={44 * Math.cos(flowTick * 3 + Math.PI)}
                  cy={44 * Math.sin(flowTick * 3 + Math.PI)}
                  r="3.5"
                  fill="#38bdf8"
                  filter="url(#laserGlow)"
                  className="shadow-lg"
                />
                {/* In-Memory Local Badge */}
                <g transform="translate(-36, -48)">
                  <rect
                    width="72"
                    height="19"
                    rx="6"
                    fill="var(--color-bg-surface-3)"
                    stroke="#38bdf8"
                    strokeWidth="1.3"
                    className="shadow-lg"
                  />
                  <text
                    x="36"
                    y="13"
                    fill="#38bdf8"
                    fontSize="9.5"
                    fontWeight="800"
                    fontFamily="var(--font-mono)"
                    textAnchor="middle"
                  >
                    IN-MEMORY
                  </text>
                </g>
              </g>
            )
          })()}

          {/* Hovered Wire Holographic HUD Tooltip */}
          {hoveredConn && (
            <g style={{ transform: `translate(${hoveredConn.midX}%, ${hoveredConn.midY}%)`, transformBox: 'view-box' }}>
              <g transform="translate(-75, -50)" className="pointer-events-none">
                <rect
                  width="150"
                  height="38"
                  rx="8"
                  fill="rgba(10, 15, 26, 0.95)"
                  stroke="var(--color-accent-brand)"
                  strokeWidth="1.2"
                  filter="url(#laserGlow)"
                />
                <text
                  x="75"
                  y="15"
                  fill="var(--color-accent-brand)"
                  fontSize="9"
                  fontWeight="800"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  ⚡ {hoveredConn.protocol} WIRE
                </text>
                <text
                  x="75"
                  y="28"
                  fill="#94a3b8"
                  fontSize="8"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {hoveredConn.fromName} → {hoveredConn.toName}
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Service Nodes (Clickable, Collision-Free with Live Interacting Code Boxes) */}
        {system.services.map((node) => {
          const isFrom = currentStep?.fromNode === node.id
          const isTo = currentStep?.toNode === node.id
          const isCurrentActive = isFrom || isTo
          const isSelected = selectedNode?.id === node.id
          const isFailed = !!failedNodes[node.id]
          const pos = resolvedPositions[node.id] || { x: node.x, y: node.y, tierName: node.role }
          const codeInfo = getNodeCodeDetails(node, system, currentStep)

          return (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node)}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${
                isCurrentActive ? 'scale-105 z-20' : 'hover:scale-102 z-10'
              }`}
            >
              {/* Outer Radar Waves for Active Nodes */}
              {isCurrentActive && !isFailed && (
                <div className="absolute -inset-2 rounded-2xl bg-accent-brand/25 blur-md animate-pulse pointer-events-none" />
              )}

              {/* Node Card */}
              <div
                className={`relative flex w-[165px] sm:w-[185px] flex-col items-center rounded-2xl p-3 shadow-xl backdrop-blur-md transition-all ${
                  isFailed
                    ? 'bg-rose-950/85 ring-2 ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                    : isCurrentActive
                    ? 'bg-bg-surface-3 ring-2 ring-accent-brand shadow-accent-brand/30 shadow-2xl'
                    : isSelected
                    ? 'bg-bg-surface-2 ring-2 ring-sky-400 shadow-sky-500/20 shadow-lg'
                    : 'bg-bg-surface-2/95 ring-1 ring-border hover:ring-border-strong hover:bg-bg-surface-2'
                }`}
              >
                {/* Node Status Badge */}
                {isFailed ? (
                  <span className="absolute -top-2.5 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 font-mono text-[9px] font-extrabold text-white uppercase tracking-wider shadow">
                    <AlertTriangle className="size-2.5" /> CRASHED
                  </span>
                ) : isCurrentActive ? (
                  <span className="absolute -top-2.5 flex items-center gap-1 rounded-full bg-accent-brand px-2 py-0.5 font-mono text-[9px] font-extrabold text-bg-base uppercase tracking-wider shadow animate-pulse">
                    <Zap className="size-2.5 fill-current" /> {isFrom ? 'SENDING RPC' : 'RECEIVING RPC'}
                  </span>
                ) : (
                  <span className="absolute -top-2 rounded bg-bg-surface-1 px-1.5 py-0.2 font-mono text-[8.5px] font-semibold text-text-muted ring-1 ring-border/50 uppercase">
                    {pos.tierName ? pos.tierName.split(' ')[0] : node.role.split(' ')[0]}
                  </span>
                )}

                {/* Top Row: Icon + Tech Stack */}
                <div className="flex w-full items-center justify-between gap-1.5 mb-1 mt-0.5">
                  <div
                    className={`flex size-8 items-center justify-center rounded-lg transition-all ${
                      isFailed
                        ? 'bg-rose-500/20 text-rose-400'
                        : isCurrentActive
                        ? 'bg-accent-brand text-bg-base shadow-md'
                        : 'bg-bg-surface-1 text-text-secondary group-hover:text-accent-brand group-hover:bg-bg-surface-3'
                    }`}
                  >
                    {ICON_MAP[node.icon] || <Server className="size-4" />}
                  </div>
                  <span className="rounded bg-bg-surface-1 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-text-muted ring-1 ring-border/40 truncate max-w-[105px]">
                    {node.techStack.split(' ')[0]}
                  </span>
                </div>

                {/* Node Title */}
                <span className="w-full text-center font-mono text-[11.5px] font-bold text-text-primary leading-tight truncate">
                  {node.name}
                </span>

                {/* Live Interacting Code Box inside the node */}
                <div
                  className={`mt-2 w-full rounded-lg px-2 py-1 font-mono text-[9px] border transition-all ${
                    isFailed
                      ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                      : isCurrentActive
                      ? 'bg-black/90 border-accent-brand/80 text-accent-brand shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                      : 'bg-black/60 border-border/60 text-emerald-400/90 group-hover:border-accent-brand/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-[8px] text-text-muted mb-0.5">
                    <span className="truncate max-w-[90px]">{codeInfo.fileName}</span>
                    {isCurrentActive ? (
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        <span className="size-1 rounded-full bg-amber-400 animate-ping" /> EXEC
                      </span>
                    ) : (
                      <span className="text-text-muted">idle</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 truncate font-bold text-text-primary">
                    <span className={isCurrentActive ? 'text-accent-brand' : 'text-emerald-400'}>▶</span>
                    <span className="truncate">{codeInfo.snippet}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Step Storyboard Timeline Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto border-t border-border bg-bg-surface-3/40 px-5 py-2.5">
        <span className="text-[10.5px] font-mono text-text-muted uppercase font-bold shrink-0">
          Storyboard:
        </span>
        {steps.map((st, i) => {
          const isCur = i === currentStepIndex
          const isPassed = i < currentStepIndex
          return (
            <button
              key={st.step}
              onClick={() => onStepChange(i)}
              className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-mono transition ${
                isCur
                  ? 'bg-accent-brand text-bg-base font-extrabold shadow-sm'
                  : isPassed
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-bg-surface-1 text-text-muted hover:text-text-primary ring-1 ring-border'
              }`}
            >
              <span>{st.step}.</span>
              <span className="max-w-[120px] truncate">{st.title.split(':')[1]?.trim() || st.title}</span>
            </button>
          )
        })}
      </div>

      {/* Step Description & Live Wire Packet Inspector */}
      <div className="grid border-t border-border bg-bg-surface-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Step Explanation */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-accent-brand animate-pulse" />
            <h4 className="font-bold text-text-primary text-[14.5px]">{currentStep.title}</h4>
          </div>
          <p className="text-[13px] text-text-secondary leading-relaxed">{currentStep.description}</p>

          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-start gap-2.5 text-[12px] text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold font-mono">STATE TRANSITION: </span>
              <span className="text-text-secondary">{currentStep.stateChange}</span>
            </div>
          </div>
        </div>

        {/* Live Wire Packet Inspector */}
        <div className="p-5 space-y-2.5 bg-black/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-bg-surface-2 p-0.5 text-[10.5px] font-mono ring-1 ring-border">
              <button
                onClick={() => setPacketInspectorMode('json')}
                className={`rounded px-2.5 py-0.5 transition ${
                  packetInspectorMode === 'json'
                    ? 'bg-sky-500 text-black font-bold'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                JSON Payload
              </button>
              <button
                onClick={() => setPacketInspectorMode('hex')}
                className={`rounded px-2.5 py-0.5 transition ${
                  packetInspectorMode === 'hex'
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Binary Wire & Hex
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-300 ring-1 ring-sky-500/30">
                {currentStep.protocol} Frame
              </span>
              <button
                onClick={handleCopyPayload}
                className="flex items-center gap-1 rounded bg-bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-text-muted hover:text-text-primary ring-1 ring-border"
              >
                {copiedPayload ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copiedPayload ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Conditional Packet Inspector View */}
          {packetInspectorMode === 'json' ? (
            <div className="relative rounded-xl bg-black/70 p-3 ring-1 ring-border text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[140px]">
              <pre className="whitespace-pre">{JSON.stringify(currentStep.payload, null, 2)}</pre>
            </div>
          ) : (
            <WirePacketHexView currentStep={currentStep} />
          )}

          <div className="flex items-center justify-between text-[10.5px] font-mono text-text-muted pt-1">
            <span>From: {currentStep.fromNode}</span>
            <span>To: {currentStep.toNode}</span>
            <span className="text-accent-brand font-bold">
              Latency: ~{(((currentStepIndex * 1.7 + 2.1) % 5.8) + (trafficProfile === 'spike' ? 18.2 : trafficProfile === 'peak' ? 6.4 : 1.8)).toFixed(1)}ms
            </span>
          </div>
        </div>
      </div>

      {/* Deep Service Source Code & Architecture Inspector (if selected) */}
      {selectedNode && (() => {
        const codeDetails = getNodeCodeDetails(selectedNode, system, currentStep)
        const nodePos = resolvedPositions[selectedNode.id] || { x: selectedNode.x, y: selectedNode.y, tierName: selectedNode.role }
        const isFailed = !!failedNodes[selectedNode.id]

        return (
          <div className="border-t border-border bg-bg-surface-3/95 p-5 space-y-4 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-accent-brand text-bg-base shadow-md">
                  {ICON_MAP[selectedNode.icon] || <Server className="size-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-[15px] text-text-primary font-mono">{selectedNode.name}</h5>
                    <span className="rounded bg-accent-brand/10 px-2 py-0.5 font-mono text-[10px] font-bold text-accent-brand ring-1 ring-accent-brand/20 uppercase">
                      {nodePos.tierName || selectedNode.role}
                    </span>
                    {isFailed && (
                      <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-400 ring-1 ring-rose-500/30 uppercase animate-pulse">
                        ISOLATED / CRASHED
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-text-secondary mt-0.5">
                    Microservice role: <span className="font-mono text-text-primary">{selectedNode.role}</span> · Tech stack: <span className="font-mono text-text-primary">{selectedNode.techStack}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Mode Tabs */}
                <div className="flex items-center rounded-lg bg-bg-surface-1 p-0.5 ring-1 ring-border text-[11px] font-mono">
                  <button
                    onClick={() => setInspectorTab('code')}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition ${
                      inspectorTab === 'code' ? 'bg-accent-brand text-bg-base font-bold' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Code className="size-3.5" /> Source Code ({codeDetails.fileName})
                  </button>
                  <button
                    onClick={() => setInspectorTab('test')}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition ${
                      inspectorTab === 'test' ? 'bg-sky-400 text-black font-bold' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Send className="size-3.5" /> Interactive RPC Test
                  </button>
                  <button
                    onClick={() => setInspectorTab('logs')}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition ${
                      inspectorTab === 'logs' ? 'bg-emerald-400 text-black font-bold' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Terminal className="size-3.5" /> Stdout Logs
                  </button>
                </div>

                <button
                  onClick={() => setSelectedNode(null)}
                  className="flex size-7 items-center justify-center rounded-lg bg-bg-surface-1 text-text-muted hover:text-text-primary ring-1 ring-border"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Hardware & Network Telemetry Gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="rounded-xl bg-bg-surface-1 p-2.5 ring-1 ring-border">
                <span className="text-text-muted flex items-center gap-1 text-[10px] uppercase">
                  <Cpu className="size-3 text-sky-400" /> CPU Core Load
                </span>
                <span className={`text-[13px] font-bold block mt-0.5 ${
                  trafficProfile === 'spike' ? 'text-rose-400' : trafficProfile === 'peak' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {trafficProfile === 'spike' ? '94%' : trafficProfile === 'peak' ? '68%' : '26%'}
                </span>
              </div>

              <div className="rounded-xl bg-bg-surface-1 p-2.5 ring-1 ring-border">
                <span className="text-text-muted flex items-center gap-1 text-[10px] uppercase">
                  <HardDrive className="size-3 text-purple-400" /> RAM Memory
                </span>
                <span className="text-[13px] font-bold text-purple-300 block mt-0.5">
                  {trafficProfile === 'spike' ? '14.2 GB' : trafficProfile === 'peak' ? '6.8 GB' : '2.1 GB'} / 16 GB
                </span>
              </div>

              <div className="rounded-xl bg-bg-surface-1 p-2.5 ring-1 ring-border">
                <span className="text-text-muted flex items-center gap-1 text-[10px] uppercase">
                  <Activity className="size-3 text-emerald-400" /> Active Connections
                </span>
                <span className="text-[13px] font-bold text-emerald-400 block mt-0.5">
                  {(trafficProfile === 'spike' ? 42800 : trafficProfile === 'peak' ? 8400 : 920).toLocaleString()} Sockets
                </span>
              </div>

              <div className="rounded-xl bg-bg-surface-1 p-2.5 ring-1 ring-border">
                <span className="text-text-muted flex items-center gap-1 text-[10px] uppercase">
                  <Zap className="size-3 text-amber-400" /> p99 Latency
                </span>
                <span className="text-[13px] font-bold text-amber-300 block mt-0.5">
                  {trafficProfile === 'spike' ? '18.4ms' : trafficProfile === 'peak' ? '5.8ms' : '1.9ms'}
                </span>
              </div>
            </div>

            {/* Content Tab 1: Source Code View */}
            {inspectorTab === 'code' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11.5px] font-mono bg-bg-surface-2 p-2.5 rounded-xl ring-1 ring-border">
                  <div className="flex items-center gap-2 text-text-muted">
                    <FileCode className="size-4 text-accent-brand" />
                    <span className="font-bold text-text-primary">{codeDetails.fileName}</span>
                    <span>· Function:</span>
                    <span className="text-accent-brand font-bold">{codeDetails.funcName}()</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(codeDetails.fullCode)
                      setCopiedCode(true)
                      setTimeout(() => setCopiedCode(false), 2000)
                    }}
                    className="flex items-center gap-1 rounded bg-bg-surface-3 px-2 py-0.5 text-text-muted hover:text-text-primary ring-1 ring-border"
                  >
                    {copiedCode ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Source'}</span>
                  </button>
                </div>

                <div className="relative rounded-xl bg-black/80 ring-1 ring-border overflow-hidden">
                  <div className="max-h-[220px] overflow-y-auto p-3 text-[11.5px] font-mono leading-relaxed text-emerald-300">
                    <pre className="whitespace-pre">
                      {codeDetails.fullCode.split('\n').map((line, idx) => (
                        <div key={idx} className="flex hover:bg-white/5 px-1 rounded">
                          <span className="w-8 shrink-0 text-right pr-3 select-none text-text-muted/60 text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="text-text-primary">{line}</span>
                        </div>
                      ))}
                    </pre>
                  </div>
                </div>

                <div className="rounded-xl bg-accent-brand/5 border border-accent-brand/20 p-3 text-[12px] text-text-secondary">
                  <span className="font-bold font-mono text-accent-brand">NODE RESPONSIBILITY & ARCHITECTURE: </span>
                  {selectedNode.details}
                </div>
              </div>
            )}

            {/* Content Tab 2: Interactive RPC Test */}
            {inspectorTab === 'test' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-bg-surface-2 ring-1 ring-border">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-sky-400 block uppercase">
                      Client RPC Trigger Endpoint
                    </span>
                    <span className="font-mono text-[13px] font-semibold text-text-primary">
                      rpc://{selectedNode.id}.cluster.local/{codeDetails.funcName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestRpc(selectedNode)}
                      disabled={testRpcLoading}
                      className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-1.5 font-mono text-[11.5px] font-bold text-black transition shadow-md disabled:opacity-50"
                    >
                      <Zap className="size-3.5 fill-current" />
                      {testRpcLoading ? 'Invoking RPC...' : '⚡ Send Test RPC Call'}
                    </button>
                    <button
                      onClick={() => {
                        if (soundEnabled) playNodeCrashSound()
                        setFailedNodes((prev) => ({ ...prev, [selectedNode.id]: !prev[selectedNode.id] }))
                      }}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11.5px] font-bold transition ring-1 ${
                        isFailed
                          ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/50'
                          : 'bg-rose-500/20 text-rose-400 ring-rose-500/50 hover:bg-rose-500/30'
                      }`}
                    >
                      <Flame className="size-3.5" />
                      {isFailed ? 'Revive Node' : 'Simulate Crash'}
                    </button>
                  </div>
                </div>

                {/* RPC Result Output */}
                {testRpcResult && (
                  <div className="rounded-xl bg-black/80 p-3 ring-1 ring-border font-mono text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between border-b border-border/40 pb-1">
                      <span className="text-text-muted">Status:</span>
                      <span className={testRpcResult.status === 200 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        HTTP/2 {testRpcResult.status} {testRpcResult.status === 200 ? 'OK' : 'SERVICE_UNAVAILABLE'}
                      </span>
                      <span className="text-text-muted">Roundtrip Latency:</span>
                      <span className="text-accent-brand font-bold">{testRpcResult.latencyMs}ms</span>
                    </div>
                    <pre className="text-emerald-300 pt-1 overflow-x-auto">
                      {JSON.stringify(testRpcResult.responsePayload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Content Tab 3: Live Microservice Stdout Logs */}
            {inspectorTab === 'logs' && (
              <div className="rounded-xl bg-black/90 p-3.5 ring-1 ring-border font-mono text-[11px] space-y-1.5 max-h-[220px] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5 mb-1 text-[10px] text-text-muted">
                  <span className="text-accent-brand font-bold uppercase">
                    container://{selectedNode.id}:v2.4.1 (PID 4912)
                  </span>
                  <span>Active Goroutines / Threads: {trafficProfile === 'spike' ? 240 : 32}</span>
                </div>
                <p className="text-text-muted">
                  [{new Date().toLocaleTimeString()}] [INFO] Starting request dispatch on port :50051 (TCP multiplexing enabled)
                </p>
                <p className="text-sky-400">
                  [{new Date().toLocaleTimeString()}] [INGRESS] {currentStep.protocol} packet received from "{currentStep.fromNode}".
                </p>
                <p className="text-emerald-400">
                  [{new Date().toLocaleTimeString()}] [EXEC] Executed {codeDetails.funcName}() with state transition "{currentStep.stateChange}".
                </p>
                {isFailed && (
                  <p className="text-rose-400 font-bold">
                    [{new Date().toLocaleTimeString()}] [PANIC] Node injected with synthetic network fault. Sockets terminating!
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* SECTION B: COMPREHENSIVE ARCHITECTURAL COMPONENT SHOWCASE */}
      <div className="border-t border-border bg-bg-surface-1 p-5 sm:p-7 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <h3 className="text-[17px] font-extrabold text-text-primary flex items-center gap-2 font-mono">
              <Layers className="size-4 text-accent-brand" />
              Architectural Subsystem Breakdown & Component Showcase
            </h3>
            <p className="text-[12px] text-text-muted mt-0.5">
              Deep-dive into each microservice, edge gateway, in-memory tier, and persistent storage engine in {system.name}.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-bg-surface-2 p-1 ring-1 ring-border">
            <button
              onClick={() => setActiveShowcaseTab('components')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-mono font-bold transition ${
                activeShowcaseTab === 'components'
                  ? 'bg-accent-brand text-bg-base shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Cpu className="size-3.5" /> All Services ({system.services.length})
            </button>
            <button
              onClick={() => setActiveShowcaseTab('connections')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-mono font-bold transition ${
                activeShowcaseTab === 'connections'
                  ? 'bg-accent-brand text-bg-base shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Network className="size-3.5" /> Connections ({system.connections.length})
            </button>
            <button
              onClick={() => setActiveShowcaseTab('slas')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-mono font-bold transition ${
                activeShowcaseTab === 'slas'
                  ? 'bg-accent-brand text-bg-base shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Table className="size-3.5" /> SLAs & Invariants
            </button>
          </div>
        </div>

        {/* TAB 1: ALL SERVICES DETAILED SHOWCASE */}
        {activeShowcaseTab === 'components' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {system.services.map((node) => {
              const pos = resolvedPositions[node.id]
              const isSelected = selectedNode?.id === node.id
              const isNodeCrashed = !!failedNodes[node.id]

              // Hardware recommendation heuristics based on node type
              let hwSpec = 'AWS c6i.2xlarge (8 vCPU, 16GB RAM) · 10Gbps'
              let failureMode = 'Auto-heals via Kubernetes Deployment replica restart'
              if (node.type === 'client') {
                hwSpec = 'Edge Mobile/Browser Client · WebAssembly + TLS 1.3'
                failureMode = 'Local SQLite offline cache + Exponential retry'
              } else if (node.type === 'gateway') {
                hwSpec = 'AWS c6i.8xlarge (32 vCPU, 64GB RAM) · 25Gbps Anycast DNS'
                failureMode = 'Active-Active Envoy proxy with upstream circuit breaker'
              } else if (node.type === 'cache') {
                hwSpec = 'AWS r6i.4xlarge (16 vCPU, 128GB RAM) · In-Memory Cluster'
                failureMode = 'Master-Replica Redis Sentinel with auto-failover'
              } else if (node.type === 'queue') {
                hwSpec = 'AWS i3en.3xlarge (12 vCPU, 96GB RAM, NVMe SSD) · Kafka'
                failureMode = 'Replication factor 3, min.insync.replicas=2 quorum'
              } else if (node.type === 'database') {
                hwSpec = 'AWS r6i.8xlarge (32 vCPU, 256GB RAM) · Multi-AZ IOPS SSD'
                failureMode = 'Synchronous WAL replication + Hot-standby replica failover'
              } else if (node.type === 'storage') {
                hwSpec = 'AWS S3 Distributed Blob Cluster · 11 9s Durability'
                failureMode = 'Reed-Solomon erasure coding (8+4 redundancy)'
              }

              return (
                <div
                  key={node.id}
                  className={`rounded-xl p-4 transition-all duration-200 flex flex-col justify-between ring-1 ${
                    isSelected
                      ? 'bg-accent-brand/10 ring-2 ring-accent-brand shadow-lg'
                      : isNodeCrashed
                      ? 'bg-rose-500/10 ring-1 ring-rose-500/40'
                      : 'bg-bg-surface-2 ring-border hover:bg-bg-surface-3 hover:ring-border-strong'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-bg-surface-1 text-accent-brand ring-1 ring-border">
                          {ICON_MAP[node.icon] || <Server className="size-4" />}
                        </span>
                        <div>
                          <span className="font-bold text-[13px] text-text-primary block font-mono">
                            {node.name}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted">
                            {pos?.tierName || 'Microservice Tier'}
                          </span>
                        </div>
                      </div>

                      <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-mono font-bold uppercase ${
                        node.type === 'gateway' ? 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30' :
                        node.type === 'cache' ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30' :
                        node.type === 'queue' ? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30' :
                        node.type === 'database' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' :
                        'bg-bg-surface-3 text-text-secondary ring-1 ring-border'
                      }`}>
                        {node.type}
                      </span>
                    </div>

                    {/* Role & Responsibility */}
                    <p className="text-[12px] text-text-secondary leading-relaxed font-sans">
                      {node.details || node.role}
                    </p>

                    {/* Production Specifications */}
                    <div className="rounded-lg bg-bg-surface-1 p-2.5 text-[10.5px] font-mono space-y-1 ring-1 ring-border/50">
                      <div>
                        <span className="text-text-muted">Tech Stack: </span>
                        <span className="text-text-primary font-bold">{node.techStack}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Hardware: </span>
                        <span className="text-sky-300">{hwSpec}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Resiliency: </span>
                        <span className="text-emerald-400">{failureMode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] font-mono">
                    <button
                      onClick={() => handleNodeClick(node)}
                      className="text-accent-brand hover:underline font-bold flex items-center gap-1"
                    >
                      {isSelected ? '✓ In Focus' : '🔍 Inspect Node'}
                    </button>

                    <button
                      onClick={() => {
                        if (soundEnabled) playNodeCrashSound()
                        setFailedNodes((prev) => ({ ...prev, [node.id]: !prev[node.id] }))
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition ring-1 ${
                        isNodeCrashed
                          ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/50'
                          : 'bg-rose-500/10 text-rose-400 ring-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      {isNodeCrashed ? 'Revive' : 'Crash'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB 2: NETWORK CONNECTIONS & RPC CONTRACTS TABLE */}
        {activeShowcaseTab === 'connections' && (
          <div className="overflow-x-auto rounded-xl ring-1 ring-border">
            <table className="w-full text-left text-[12px] font-mono border-collapse">
              <thead className="bg-bg-surface-2 text-[10.5px] uppercase text-text-muted border-b border-border">
                <tr>
                  <th className="p-3">Source Service</th>
                  <th className="p-3">Target Service</th>
                  <th className="p-3">Protocol</th>
                  <th className="p-3">Contract / Action</th>
                  <th className="p-3">Latency Budget</th>
                  <th className="p-3">Resiliency Pattern</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-bg-surface-1">
                {system.connections.map((conn) => {
                  const fromNode = system.services.find((s) => s.id === conn.from)
                  const toNode = system.services.find((s) => s.id === conn.to)
                  const isCurrent =
                    (currentStep?.fromNode === conn.from && currentStep?.toNode === conn.to) ||
                    (currentStep?.fromNode === conn.to && currentStep?.toNode === conn.from)

                  return (
                    <tr
                      key={conn.id}
                      className={`hover:bg-bg-surface-2/60 transition ${
                        isCurrent ? 'bg-accent-brand/10 font-bold' : ''
                      }`}
                    >
                      <td className="p-3 text-text-primary">
                        <span className="text-accent-brand">{fromNode?.name || conn.from}</span>
                      </td>
                      <td className="p-3 text-text-primary">
                        <span className="text-sky-400">{toNode?.name || conn.to}</span>
                      </td>
                      <td className="p-3">
                        <span className="rounded bg-bg-surface-3 px-1.5 py-0.5 text-[10px] text-text-secondary">
                          {conn.protocol}
                        </span>
                      </td>
                      <td className="p-3 text-text-secondary font-sans">{conn.label}</td>
                      <td className="p-3 text-emerald-400">
                        {conn.protocol === 'Redis' || conn.protocol === 'TCP' ? '< 2ms' :
                         conn.protocol === 'gRPC' ? '< 15ms' :
                         conn.protocol === 'SQL' ? '< 25ms' : '< 100ms'}
                      </td>
                      <td className="p-3 text-text-muted font-sans text-[11px]">
                        {conn.protocol === 'Kafka' ? 'At-least-once with idempotent consumer' :
                         conn.protocol === 'gRPC' ? 'Circuit breaker + 3x exponential backoff' :
                         conn.protocol === 'SQL' ? 'Connection pooler (PgBouncer) + Read replica' :
                         'TLS 1.3 keepalive + HTTP/2 multiplexing'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: SLAS, INVARIANTS & CAPACITY ESTIMATIONS */}
        {activeShowcaseTab === 'slas' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-bg-surface-2 p-4 ring-1 ring-border space-y-2">
              <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider block">
                ⚡ Throughput & Scaling SLA
              </span>
              <div className="text-[20px] font-bold text-text-primary font-mono">
                {system.throughput}
              </div>
              <p className="text-[12px] text-text-muted leading-relaxed">
                Horizontal scaling target handled through stateless container replicas, sharded partition keys, and load balanced ingress.
              </p>
            </div>

            <div className="rounded-xl bg-bg-surface-2 p-4 ring-1 ring-border space-y-2">
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                ⏱️ Latency Budget (P99 SLA)
              </span>
              <div className="text-[20px] font-bold text-emerald-400 font-mono">
                {system.latency}
              </div>
              <p className="text-[12px] text-text-muted leading-relaxed">
                Aggressive P99 bounds enforced via multi-tier caching (L1 in-process + L2 Redis), connection pooling, and asynchronous event offloading.
              </p>
            </div>

            <div className="rounded-xl bg-bg-surface-2 p-4 ring-1 ring-border space-y-2">
              <span className="text-[11px] font-mono font-bold text-purple-400 uppercase tracking-wider block">
                💾 Storage Scale & Footprint
              </span>
              <div className="text-[20px] font-bold text-purple-400 font-mono">
                {system.storageScale}
              </div>
              <p className="text-[12px] text-text-muted leading-relaxed">
                Partitioned storage tier with cold data archival, LSM-tree compaction, and tier-appropriate retention policies.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
