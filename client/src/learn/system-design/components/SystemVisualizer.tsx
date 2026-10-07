import React, { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import { WirePacketHexView } from './WirePacketHexView'
import {
  playPacketTransmitSound,
  playPacketArriveSound,
  playNodeCrashSound,
  playStepClickSound,
} from '../utils/audioEffects'

interface SystemVisualizerProps {
  system: SystemDesignModel
  currentStepIndex: number
  onStepChange: (index: number) => void
  onSelectNode?: (node: ServiceNode) => void
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
      <div className="relative h-[480px] w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-bg-surface-3/30 via-bg-surface-1 to-[#05070a] p-6 select-none overflow-hidden">
        {/* Animated Cyber Grid */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

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

          {/* Connection Wires */}
          {system.connections.map((conn) => {
            const from = system.services.find((s) => s.id === conn.from)
            const to = system.services.find((s) => s.id === conn.to)
            if (!from || !to) return null

            const isCurrentActiveConn =
              (currentStep?.fromNode === conn.from && currentStep?.toNode === conn.to) ||
              (currentStep?.fromNode === conn.to && currentStep?.toNode === conn.from)

            const isBlocked = failedNodes[conn.from] || failedNodes[conn.to]
            const protoTheme = getProtocolTheme(currentStep?.protocol)

            // Calculate subtle curvature control point
            const midX = (from.x + to.x) / 2
            const midY = (from.y + to.y) / 2 - 4 // slight arch
            const pathD = `M ${from.x}% ${from.y}% Q ${midX}% ${midY}% ${to.x}% ${to.y}%`

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
            const midX = (fromNodeObj.x + toNodeObj.x) / 2
            const midY = (fromNodeObj.y + toNodeObj.y) / 2 - 4
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
                <g style={{ transform: `translate(${toNodeObj.x}%, ${toNodeObj.y}%)`, transformBox: 'view-box' }}>
                  <circle
                    cx="0"
                    cy="0"
                    r="38"
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
                    oneMinusT * oneMinusT * fromNodeObj.x +
                    2 * oneMinusT * t * midX +
                    t * t * toNodeObj.x
                  const py =
                    oneMinusT * oneMinusT * fromNodeObj.y +
                    2 * oneMinusT * t * midY +
                    t * t * toNodeObj.y

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
          {fromNodeObj && isSelfNode && !failedNodes[currentStep.fromNode] && (
            <g
              className="transition-all duration-700 ease-in-out"
              style={{ transform: `translate(${fromNodeObj.x}%, ${fromNodeObj.y}%)`, transformBox: 'view-box' }}
            >
              {/* Concentric Rotating Dash Ring */}
              <circle
                cx="0"
                cy="0"
                r="42"
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
                r="26"
                fill="#38bdf8"
                opacity="0.15"
                className="animate-pulse"
              />
              {/* Dual Orbiting Particles */}
              <circle
                cx={42 * Math.cos(flowTick * 3)}
                cy={42 * Math.sin(flowTick * 3)}
                r="5"
                fill="#00F0FF"
                filter="url(#laserGlow)"
                className="shadow-lg"
              />
              <circle
                cx={42 * Math.cos(flowTick * 3 + Math.PI)}
                cy={42 * Math.sin(flowTick * 3 + Math.PI)}
                r="3.5"
                fill="#38bdf8"
                filter="url(#laserGlow)"
                className="shadow-lg"
              />
              {/* In-Memory Local Badge */}
              <g transform="translate(-36, -46)">
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
          )}

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

        {/* Service Nodes (Clickable, Animated Holographic Rings) */}
        {system.services.map((node) => {
          const isFrom = currentStep?.fromNode === node.id
          const isTo = currentStep?.toNode === node.id
          const isCurrentActive = isFrom || isTo
          const isSelected = selectedNode?.id === node.id
          const isFailed = !!failedNodes[node.id]

          return (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node)}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${
                isCurrentActive ? 'scale-105 z-20' : 'hover:scale-102 z-10'
              }`}
            >
              {/* Outer Radar Waves for Active Nodes */}
              {isCurrentActive && !isFailed && (
                <div className="absolute -inset-2 rounded-2xl bg-accent-brand/20 blur-md animate-pulse pointer-events-none" />
              )}

              {/* Node Card */}
              <div
                className={`relative flex min-w-[135px] flex-col items-center rounded-2xl p-3.5 shadow-xl backdrop-blur-md transition-all ${
                  isFailed
                    ? 'bg-rose-950/80 ring-2 ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                    : isCurrentActive
                    ? 'bg-bg-surface-3 ring-2 ring-accent-brand shadow-accent-brand/25 shadow-2xl'
                    : isSelected
                    ? 'bg-bg-surface-2 ring-2 ring-text-primary'
                    : 'bg-bg-surface-2/90 ring-1 ring-border hover:ring-border-strong hover:bg-bg-surface-2'
                }`}
              >
                {/* Node Status Badge */}
                {isFailed ? (
                  <span className="absolute -top-2.5 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 font-mono text-[9px] font-extrabold text-white uppercase tracking-wider shadow">
                    <AlertTriangle className="size-2.5" /> CRASHED
                  </span>
                ) : isCurrentActive ? (
                  <span className="absolute -top-2.5 rounded-full bg-accent-brand px-2 py-0.5 font-mono text-[9px] font-extrabold text-bg-base uppercase tracking-wider shadow">
                    {isFrom ? 'SENDING' : 'RECEIVING'}
                  </span>
                ) : null}

                {/* Node Icon with type styling */}
                <div
                  className={`mb-2 flex size-10 items-center justify-center rounded-xl transition-all ${
                    isFailed
                      ? 'bg-rose-500/20 text-rose-400'
                      : isCurrentActive
                      ? 'bg-accent-brand text-bg-base shadow-md'
                      : 'bg-bg-surface-1 text-text-secondary group-hover:text-accent-brand group-hover:bg-bg-surface-3'
                  }`}
                >
                  {ICON_MAP[node.icon] || <Server className="size-5" />}
                </div>

                {/* Node Title */}
                <span className="text-center font-mono text-[12px] font-bold text-text-primary leading-tight">
                  {node.name}
                </span>

                {/* Tech Stack Badge */}
                <span className="mt-1.5 rounded-md bg-bg-surface-1 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-text-muted ring-1 ring-border/50">
                  {node.techStack.split(' ')[0]}
                </span>
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

      {/* Node Inspector Drawer Modal (if selected) */}
      {selectedNode && (
        <div className="border-t border-border bg-bg-surface-3/90 p-5 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-accent-brand text-bg-base">
                {ICON_MAP[selectedNode.icon] || <Server className="size-4" />}
              </div>
              <h5 className="font-bold text-[14px] text-text-primary font-mono">{selectedNode.name}</h5>
              <span className="rounded bg-bg-surface-1 px-2 py-0.5 font-mono text-[10.5px] text-accent-brand ring-1 ring-border">
                {selectedNode.role}
              </span>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="rounded-lg bg-bg-surface-1 px-2.5 py-1 text-[11px] font-mono text-text-muted hover:text-text-primary ring-1 ring-border"
            >
              Close
            </button>
          </div>

          {/* Hardware & Network Telemetry Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]">
            <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border">
              <span className="font-mono text-[11px] text-text-muted uppercase font-bold">Tech Stack:</span>
              <p className="mt-1 font-semibold text-text-primary">{selectedNode.techStack}</p>
            </div>
            <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border">
              <span className="font-mono text-[11px] text-text-muted uppercase font-bold">Responsibilities & Internal Mechanics:</span>
              <p className="mt-1 text-text-secondary leading-relaxed">{selectedNode.details}</p>
            </div>
          </div>

          {/* Microservice Live Stdout Console */}
          <div className="rounded-xl bg-black/80 p-3 ring-1 ring-border font-mono text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 text-text-muted border-b border-border/50 pb-1.5 mb-1.5">
              <Terminal className="size-3.5 text-accent-brand" />
              <span className="uppercase text-[10px] tracking-wider text-accent-brand font-bold">
                Stdout Stream: {selectedNode.id}.service.internal
              </span>
            </div>
            <p className="text-text-muted">
              [SYSTEM] Process container pid 1042 active. GC pause: 0.14ms.
            </p>
            <p className="text-sky-400">
              [INGRESS] Handled request {currentStep.protocol} with payload size {JSON.stringify(currentStep.payload).length} bytes.
            </p>
            <p className="text-emerald-400">
              [STATE] Transitioned to "{currentStep.stateChange}".
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
