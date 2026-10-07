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
  Radio,
  Copy,
  Check,
} from 'lucide-react'

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const steps = system.animationSteps
  const currentStep = steps[currentStepIndex] || steps[0]

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
    if (currentStepIndex < steps.length - 1) {
      onStepChange(currentStepIndex + 1)
    }
  }

  const handlePrev = () => {
    setIsPlaying(false)
    if (currentStepIndex > 0) {
      onStepChange(currentStepIndex - 1)
    }
  }

  const handleReset = () => {
    setIsPlaying(false)
    onStepChange(0)
  }

  const handleNodeClick = (node: ServiceNode) => {
    if (chaosMode) {
      // Toggle failure simulation
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

        {/* SVG Connection Lines & Animated Flow Particles */}
        <svg className="absolute inset-0 size-full pointer-events-none">
          <defs>
            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent-brand)" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
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
                      ? 'var(--color-accent-brand)'
                      : 'var(--color-border-strong)'
                  }
                  strokeWidth={isCurrentActiveConn ? 3 : 1.2}
                  strokeDasharray={isBlocked ? '4 4' : isCurrentActiveConn ? '8 4' : '4 4'}
                  opacity={isCurrentActiveConn ? 0.95 : 0.35}
                  className="transition-all duration-300"
                />

                {/* Animated Flow Pulse on Active Connection */}
                {isCurrentActiveConn && !isBlocked && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="4"
                    strokeDasharray="12 40"
                    opacity="0.8"
                    filter="url(#laserGlow)"
                    className="animate-pulse"
                  />
                )}
              </g>
            )
          })}

          {/* Traveling Multi-Particle Stream & Protocol Badge */}
          {fromNodeObj && toNodeObj && !isSelfNode && !failedNodes[currentStep.fromNode] && (
            <g className="transition-all duration-700 ease-in-out">
              {/* Target Node Receiving Waves */}
              <circle
                cx={`${toNodeObj.x}%`}
                cy={`${toNodeObj.y}%`}
                r="36"
                fill="none"
                stroke="var(--color-accent-brand)"
                strokeWidth="1.5"
                opacity="0.5"
                className="animate-ping"
              />

              {/* 3 Traveling Particles (Progress Stream) */}
              {[0.3, 0.5, 0.7].map((offset, idx) => {
                const px = fromNodeObj.x + (toNodeObj.x - fromNodeObj.x) * offset
                const py = fromNodeObj.y + (toNodeObj.y - fromNodeObj.y) * offset - 3
                return (
                  <circle
                    key={idx}
                    cx={`${px}%`}
                    cy={`${py}%`}
                    r={idx === 1 ? 6.5 : 4}
                    fill="url(#activeGrad)"
                    filter="url(#laserGlow)"
                    className="animate-pulse"
                  />
                )
              })}

              {/* Protocol Floating Badge on Wire */}
              <g
                transform={`translate(calc(${(fromNodeObj.x + toNodeObj.x) / 2}% - 30px), calc(${
                  (fromNodeObj.y + toNodeObj.y) / 2
                }% - 26px))`}
              >
                <rect
                  width="60"
                  height="18"
                  rx="5"
                  fill="var(--color-bg-surface-3)"
                  stroke="var(--color-accent-brand)"
                  strokeWidth="1.2"
                  className="shadow-lg"
                />
                <text
                  x="30"
                  y="12.5"
                  fill="var(--color-text-primary)"
                  fontSize="10"
                  fontWeight="800"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {currentStep.protocol}
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
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11.5px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="size-3.5" /> Wire Packet Frame Inspector
            </span>

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

          {/* Formatted JSON Payload */}
          <div className="relative rounded-xl bg-black/70 p-3 ring-1 ring-border text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[140px]">
            <pre className="whitespace-pre">{JSON.stringify(currentStep.payload, null, 2)}</pre>
          </div>

          <div className="flex items-center justify-between text-[10.5px] font-mono text-text-muted pt-1">
            <span>From: {currentStep.fromNode}</span>
            <span>To: {currentStep.toNode}</span>
            <span className="text-accent-brand font-bold">Latency: ~{(Math.random() * 8 + 2).toFixed(1)}ms</span>
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
        </div>
      )}
    </div>
  )
}
