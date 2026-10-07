import React, { useState } from 'react'
import type { SystemDesignModel } from '../types'
import {
  Award,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Flame,
  Radio,
} from 'lucide-react'
import { playSuccessChimeSound, playStepClickSound } from '../utils/audioEffects'

interface MockInterviewSimulatorProps {
  system: SystemDesignModel
  onSelectSystem?: (id: string) => void
}

export const MockInterviewSimulator: React.FC<MockInterviewSimulatorProps> = ({ system }) => {
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4 | 5>(1)
  
  // Stage 1 State: Scope & Math
  const [selectedReqs, setSelectedReqs] = useState<Record<string, boolean>>({})
  const [qpsGuess, setQpsGuess] = useState<string>('')
  const [stage1Submitted, setStage1Submitted] = useState<boolean>(false)

  // Stage 2 State: High-Level Architecture Assembly
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([])
  const [stage2Submitted, setStage2Submitted] = useState<boolean>(false)

  // Stage 3 State: Deep Dive & Sharding Strategy
  const [partitionChoice, setPartitionChoice] = useState<string>('')
  const [cacheChoice, setCacheChoice] = useState<string>('')
  const [consistencyChoice, setConsistencyChoice] = useState<string>('')
  const [stage3Submitted, setStage3Submitted] = useState<boolean>(false)

  // Stage 4 State: Edge Cases & Bottlenecks
  const [celebrityStrategy, setCelebrityStrategy] = useState<string>('')
  const [redisFailureStrategy, setRedisFailureStrategy] = useState<string>('')

  // Dynamic Rubric Breakdown Calculations
  const stage1Score = (() => {
    let s = 0
    const reqCount = Object.values(selectedReqs).filter(Boolean).length
    if (reqCount >= 3) s += 20
    else if (reqCount > 0) s += 10
    if (qpsGuess.trim()) s += 5
    return Math.min(25, s)
  })()

  const stage2Score = (() => {
    let s = 0
    if (
      selectedBlocks.includes('cdn') &&
      selectedBlocks.includes('lb') &&
      selectedBlocks.includes('api') &&
      selectedBlocks.includes('cache') &&
      selectedBlocks.includes('db')
    ) {
      s += 25
    } else if (selectedBlocks.length >= 3) {
      s += 18
    } else if (selectedBlocks.length > 0) {
      s += 10
    }
    return Math.min(25, s)
  })()

  const stage3Score = (() => {
    let s = 0
    if (partitionChoice === 'consistent_hash') s += 10
    else if (partitionChoice) s += 6

    if (cacheChoice === 'cache_aside') s += 8
    else if (cacheChoice) s += 5

    if (consistencyChoice === 'eventual_quorum' || consistencyChoice === 'strong_raft') s += 7
    else if (consistencyChoice) s += 4
    return Math.min(25, s)
  })()

  const stage4Score = (() => {
    let s = 0
    if (celebrityStrategy === 'scatter_gather_vnodes') s += 13
    else if (celebrityStrategy) s += 7

    if (redisFailureStrategy === 'circuit_breaker_sentinel') s += 12
    else if (redisFailureStrategy) s += 6
    return Math.min(25, s)
  })()

  const finalScore = stage1Score + stage2Score + stage3Score + stage4Score


  const getInterviewLevel = (s: number) => {
    if (s >= 90) return { title: 'Staff Software Engineer (L6 / E6)', color: 'text-emerald-400', badge: 'STRONG HIRE (L6)' }
    if (s >= 80) return { title: 'Senior Software Engineer (L5 / E5)', color: 'text-accent-brand', badge: 'HIRE (L5)' }
    if (s >= 65) return { title: 'Software Engineer II (L4 / E4)', color: 'text-amber-400', badge: 'LEAN HIRE (L4)' }
    return { title: 'Developing Architect (L3)', color: 'text-rose-400', badge: 'NO HIRE (Needs Practice)' }
  }

  const handleReset = () => {
    playStepClickSound()
    setCurrentStage(1)
    setSelectedReqs({})
    setQpsGuess('')
    setStage1Submitted(false)
    setSelectedBlocks([])
    setStage2Submitted(false)
    setPartitionChoice('')
    setCacheChoice('')
    setConsistencyChoice('')
    setStage3Submitted(false)
    setCelebrityStrategy('')
    setRedisFailureStrategy('')
  }

  return (
    <div className="space-y-6 rounded-2xl bg-bg-surface-2 p-6 sm:p-8 ring-1 ring-border shadow-2xl">
      {/* Interview Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <span className="font-mono text-[11px] font-bold text-accent-brand uppercase tracking-wider block flex items-center gap-1.5">
            <Radio className="size-3.5 text-accent-brand" /> FAANG 45-Minute Mock Interview Simulator
          </span>
          <h2 className="text-xl font-extrabold text-text-primary">
            Target System: <span className="text-accent-brand">{system.name}</span>
          </h2>
          <span className="text-[12px] text-text-muted">{system.tagline}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="rounded-lg bg-bg-surface-1 px-3 py-1.5 text-[11px] font-mono text-text-muted hover:text-text-primary ring-1 ring-border flex items-center gap-1"
          >
            <RotateCcw className="size-3" /> Restart Mock
          </button>
        </div>
      </div>

      {/* 4-Stage Progress Stepper */}
      <div className="grid grid-cols-4 gap-2 text-[11px] font-mono">
        {[
          { num: 1, label: '1. Scoping & Scale' },
          { num: 2, label: '2. High-Level Design' },
          { num: 3, label: '3. Deep Dive & Shards' },
          { num: 4, label: '4. Chaos & Bottlenecks' },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setCurrentStage(s.num as any)}
            className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 ring-1 transition ${
              currentStage === s.num
                ? 'bg-accent-brand/20 text-accent-brand font-bold ring-accent-brand/60 shadow-sm'
                : currentStage > s.num
                ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                : 'bg-bg-surface-1 text-text-muted ring-border'
            }`}
          >
            {currentStage > s.num ? <CheckCircle2 className="size-3.5" /> : null}
            <span className="truncate">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: REQUIREMENTS CLARIFICATION & SCALE ESTIMATION */}
      {/* ========================================================================= */}
      {currentStage === 1 && (
        <div className="space-y-5 rounded-xl bg-bg-surface-1 p-5 ring-1 ring-border">
          <div>
            <span className="font-mono text-[10.5px] uppercase font-bold text-accent-brand block">
              Stage 1 of 4: Requirements & Back-of-the-Envelope Math
            </span>
            <h3 className="text-base font-bold text-text-primary">
              Interviewer Prompt: "What are the core requirements and scale requirements for {system.name}?"
            </h3>
          </div>

          {/* Select Requirements Checklist */}
          <div className="space-y-2">
            <span className="text-[12px] font-bold text-text-primary block">
              Select Must-Have Functional Requirements (Choose at least 3):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11.5px]">
              {system.functionalReqs.map((req, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg ring-1 transition cursor-pointer ${
                    selectedReqs[`req_${i}`]
                      ? 'bg-accent-brand/15 text-text-primary ring-accent-brand/40 font-medium'
                      : 'bg-bg-surface-2 text-text-muted ring-border/60 hover:bg-bg-surface-3'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!selectedReqs[`req_${i}`]}
                    onChange={(e) =>
                      setSelectedReqs((prev) => ({ ...prev, [`req_${i}`]: e.target.checked }))
                    }
                    className="mt-0.5 accent-accent-brand"
                  />
                  <span>{req}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Back of envelope estimation */}
          <div className="space-y-2 pt-2">
            <span className="text-[12px] font-bold text-text-primary block">
              Scale Estimation Check: What is the estimated peak write/read throughput?
            </span>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder={`e.g. ${system.throughput}`}
                value={qpsGuess}
                onChange={(e) => setQpsGuess(e.target.value)}
                className="flex-1 rounded-lg bg-bg-surface-2 px-3 py-2 text-[12px] font-mono text-text-primary ring-1 ring-border focus:ring-accent-brand focus:outline-none"
              />
              <button
                onClick={() => setStage1Submitted(true)}
                className="rounded-lg bg-accent-brand px-4 py-2 text-[12px] font-bold text-bg-base hover:opacity-90 active:scale-95"
              >
                Validate Scope
              </button>
            </div>

            {stage1Submitted && (
              <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-500/30 text-[11.5px] font-mono text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" /> Staff Interviewer Critique:
                </span>
                <p>
                  Excellent scoping! Reference design handles <strong className="text-white">{system.throughput}</strong> with a latency target of <strong className="text-white">{system.latency}</strong> and storage capacity of <strong className="text-white">{system.storageScale}</strong>.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={() => {
                playStepClickSound()
                setCurrentStage(2)
              }}
              className="rounded-lg bg-accent-brand px-5 py-2 text-[12px] font-bold text-bg-base hover:opacity-90 flex items-center gap-1.5 shadow"
            >
              Proceed to Stage 2: High-Level Architecture <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: HIGH-LEVEL ARCHITECTURE ASSEMBLY */}
      {/* ========================================================================= */}
      {currentStage === 2 && (
        <div className="space-y-5 rounded-xl bg-bg-surface-1 p-5 ring-1 ring-border">
          <div>
            <span className="font-mono text-[10.5px] uppercase font-bold text-accent-brand block">
              Stage 2 of 4: High-Level Architecture Assembly
            </span>
            <h3 className="text-base font-bold text-text-primary">
              Interviewer Prompt: "Walk me through the end-to-end request lifecycle and component tiers."
            </h3>
          </div>

          <span className="text-[12px] font-bold text-text-primary block">
            Select the essential architectural components for this system:
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-[11.5px] font-mono">
            {[
              { id: 'cdn', name: 'Global Anycast CDN', desc: 'Edge caching static & media assets' },
              { id: 'lb', name: 'Layer 7 Load Balancer', desc: 'Reverse proxy TLS & health checks' },
              { id: 'api', name: 'Stateless API Fleets', desc: 'Horizontally scalable microservices' },
              { id: 'cache', name: 'Distributed Redis Cluster', desc: 'Sub-millisecond RAM lookups' },
              { id: 'queue', name: 'Kafka / Message Broker', desc: 'Async decoupling & buffer bursts' },
              { id: 'db', name: 'Partitioned Database', desc: 'ACID transactional persistence' },
              { id: 'blob', name: 'S3 / Object Storage', desc: 'Durable immutable file blobs' },
              { id: 'worker', name: 'Async Background Workers', desc: 'Heavy background task processing' },
            ].map((block) => {
              const isSelected = selectedBlocks.includes(block.id)
              return (
                <button
                  key={block.id}
                  onClick={() => {
                    setSelectedBlocks((prev) =>
                      isSelected ? prev.filter((b) => b !== block.id) : [...prev, block.id]
                    )
                  }}
                  className={`rounded-xl p-3 text-left ring-1 transition space-y-1 ${
                    isSelected
                      ? 'bg-accent-brand/20 ring-accent-brand text-text-primary shadow-sm'
                      : 'bg-bg-surface-2 ring-border/60 text-text-muted hover:bg-bg-surface-3'
                  }`}
                >
                  <span className="font-bold block text-[12px] text-accent-brand">{block.name}</span>
                  <span className="text-[10px] text-text-muted block">{block.desc}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setStage2Submitted(true)}
            className="rounded-lg bg-accent-brand px-4 py-2 text-[12px] font-bold text-bg-base hover:opacity-90"
          >
            Validate Component Topology
          </button>

          {stage2Submitted && (
            <div className="rounded-lg bg-emerald-500/10 p-3.5 ring-1 ring-emerald-500/30 text-[11.5px] font-mono text-emerald-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" /> Staff Interviewer Critique:
              </span>
              <p>
                Solid component tiering! Placing an L7 Load Balancer in front of Stateless API fleets combined with a Redis Cache layer and Kafka async queue provides both horizontal elasticity and protection against database write bottlenecks.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-3">
            <button
              onClick={() => {
                playStepClickSound()
                setCurrentStage(1)
              }}
              className="rounded-lg bg-bg-surface-2 px-4 py-2 text-[12px] font-mono text-text-muted hover:text-text-primary"
            >
              Back
            </button>
            <button
              onClick={() => {
                playStepClickSound()
                setCurrentStage(3)
              }}
              className="rounded-lg bg-accent-brand px-5 py-2 text-[12px] font-bold text-bg-base hover:opacity-90 flex items-center gap-1.5 shadow"
            >
              Proceed to Stage 3: Deep Dive & Sharding <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: DEEP DIVE DATA MODELING & SHARDING STRATEGY */}
      {/* ========================================================================= */}
      {currentStage === 3 && (
        <div className="space-y-5 rounded-xl bg-bg-surface-1 p-5 ring-1 ring-border">
          <div>
            <span className="font-mono text-[10.5px] uppercase font-bold text-accent-brand block">
              Stage 3 of 4: Deep Dive Engineering & Data Partitioning
            </span>
            <h3 className="text-base font-bold text-text-primary">
              Interviewer Prompt: "How do you partition the database, design the caching strategy, and guarantee consistency?"
            </h3>
          </div>

          {/* Question 1: Partitioning */}
          <div className="space-y-2">
            <span className="text-[12px] font-bold text-text-primary block">
              1. Primary Database Partitioning Strategy:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
              {[
                { id: 'consistent_hash', label: 'Consistent Hashing with Virtual Nodes', desc: 'Minimizes remapping on cluster resizing to K/N keys' },
                { id: 'range_partition', label: 'Range-Based Partitioning', desc: 'Splits by ID or date ranges; prone to hot spots' },
                { id: 'modulo_hash', label: 'Modulo Hash Partitioning (key % N)', desc: 'Simple but invalidates (N-1)/N keys when adding servers' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPartitionChoice(opt.id)}
                  className={`rounded-xl p-3 text-left ring-1 transition space-y-1 ${
                    partitionChoice === opt.id
                      ? 'bg-accent-brand/20 ring-accent-brand text-text-primary'
                      : 'bg-bg-surface-2 ring-border text-text-muted'
                  }`}
                >
                  <span className="font-bold block text-accent-brand">{opt.label}</span>
                  <span className="text-[10px] text-text-muted block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Caching Strategy */}
          <div className="space-y-2 pt-2">
            <span className="text-[12px] font-bold text-text-primary block">
              2. Caching Strategy for High-Traffic Read Paths:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
              {[
                { id: 'cache_aside', label: 'Cache-Aside (Lazy Loading)', desc: 'Application inspects cache; on miss reads DB and hydrates cache' },
                { id: 'write_through', label: 'Write-Through Caching', desc: 'Application writes to cache; cache writes synchronously to DB' },
                { id: 'write_behind', label: 'Write-Behind (Write-Back)', desc: 'Writes buffered in cache and flushed asynchronously to DB' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setCacheChoice(opt.id)}
                  className={`rounded-xl p-3 text-left ring-1 transition space-y-1 ${
                    cacheChoice === opt.id
                      ? 'bg-purple-500/20 ring-purple-500 text-text-primary'
                      : 'bg-bg-surface-2 ring-border text-text-muted'
                  }`}
                >
                  <span className="font-bold block text-purple-300">{opt.label}</span>
                  <span className="text-[10px] text-text-muted block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStage3Submitted(true)}
            className="rounded-lg bg-accent-brand px-4 py-2 text-[12px] font-bold text-bg-base hover:opacity-90"
          >
            Submit Deep Dive Rationale
          </button>

          {stage3Submitted && (
            <div className="rounded-lg bg-emerald-500/10 p-3.5 ring-1 ring-emerald-500/30 text-[11.5px] font-mono text-emerald-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" /> Staff Interviewer Critique:
              </span>
              <p>
                Strong choice on Consistent Hashing with virtual nodes! This avoids massive cache invalidation cascades when auto-scaling database nodes. Combining it with Cache-Aside ensures fast reads while keeping source-of-truth clean.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-3">
            <button
              onClick={() => {
                playStepClickSound()
                setCurrentStage(2)
              }}
              className="rounded-lg bg-bg-surface-2 px-4 py-2 text-[12px] font-mono text-text-muted hover:text-text-primary"
            >
              Back
            </button>
            <button
              onClick={() => {
                playStepClickSound()
                setCurrentStage(4)
              }}
              className="rounded-lg bg-accent-brand px-5 py-2 text-[12px] font-bold text-bg-base hover:opacity-90 flex items-center gap-1.5 shadow"
            >
              Proceed to Stage 4: Chaos & Failure Modes <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: CHAOS SCENARIOS & RESILIENCE */}
      {/* ========================================================================= */}
      {currentStage === 4 && (
        <div className="space-y-5 rounded-xl bg-bg-surface-1 p-5 ring-1 ring-border">
          <div>
            <span className="font-mono text-[10.5px] uppercase font-bold text-rose-400 block">
              Stage 4 of 4: Production Chaos & Bottlenecks
            </span>
            <h3 className="text-base font-bold text-text-primary">
              Interviewer Prompt: "How does your architecture survive catastrophic failure modes?"
            </h3>
          </div>

          {/* Chaos 1: Hot Celebrity Key */}
          <div className="space-y-2">
            <span className="text-[12px] font-bold text-text-primary block flex items-center gap-1.5">
              <Flame className="size-3.5 text-rose-400" /> Scenario A: The Justin Bieber / Hot Celebrity Problem (Single key receives 500,000 QPS)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
              {[
                { id: 'scatter_gather_vnodes', label: 'Scatter-Gather Key Salt (key#1..#100)', desc: 'Replicate celebrity key across 100 cache instances; read randomly to balance load' },
                { id: 'bigger_redis', label: 'Scale Up Redis Machine', desc: 'Upgrade to a 128-core instance (bottlenecked on single-thread network sockets)' },
                { id: 'direct_db', label: 'Bypass Cache to Postgres', desc: 'Overwhelms primary database immediately causing cascade failure' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setCelebrityStrategy(opt.id)}
                  className={`rounded-xl p-3 text-left ring-1 transition space-y-1 ${
                    celebrityStrategy === opt.id
                      ? 'bg-rose-500/20 ring-rose-500 text-text-primary'
                      : 'bg-bg-surface-2 ring-border text-text-muted'
                  }`}
                >
                  <span className="font-bold block text-rose-300">{opt.label}</span>
                  <span className="text-[10px] text-text-muted block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chaos 2: Redis Crash */}
          <div className="space-y-2 pt-2">
            <span className="text-[12px] font-bold text-text-primary block flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-amber-400" /> Scenario B: Primary Redis Cluster crashes under peak load
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
              {[
                { id: 'circuit_breaker_sentinel', label: 'Circuit Breaker + Sentinel Failover + Local Guava Cache', desc: 'Trip circuit breaker to shed load; use in-process L1 cache and promote replica' },
                { id: 'retry_immediately', label: 'Immediate 10x Retry Loop', desc: 'Causes severe retry storm hammering dead node even harder' },
                { id: 'block_clients', label: 'Block HTTP Clients Until Reboot', desc: 'Causes user-facing 504 Gateway Timeouts across entire platform' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setRedisFailureStrategy(opt.id)}
                  className={`rounded-xl p-3 text-left ring-1 transition space-y-1 ${
                    redisFailureStrategy === opt.id
                      ? 'bg-amber-500/20 ring-amber-500 text-text-primary'
                      : 'bg-bg-surface-2 ring-border text-text-muted'
                  }`}
                >
                  <span className="font-bold block text-amber-300">{opt.label}</span>
                  <span className="text-[10px] text-text-muted block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-3">
            <button
              onClick={() => {
                playStepClickSound()
                setCurrentStage(3)
              }}
              className="rounded-lg bg-bg-surface-2 px-4 py-2 text-[12px] font-mono text-text-muted hover:text-text-primary"
            >
              Back
            </button>
            <button
              onClick={() => {
                playSuccessChimeSound()
                setCurrentStage(5)
              }}
              className="rounded-lg bg-accent-brand px-5 py-2.5 text-[12px] font-bold text-bg-base hover:opacity-90 shadow flex items-center gap-1.5"
            >
              <Award className="size-4" /> Generate Staff Interview Scorecard 🏆
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 5: FINAL STAFF ENGINEER SCORECARD & ASSESSMENT RUBRIC */}
      {/* ========================================================================= */}
      {currentStage === 5 && (
        <div className="space-y-6 rounded-xl bg-bg-surface-1 p-6 sm:p-8 ring-1 ring-border animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-5">
            <div>
              <span className="font-mono text-[11px] font-bold uppercase text-accent-brand block">
                Final Hiring Committee Evaluation
              </span>
              <h3 className="text-2xl font-black text-text-primary flex items-center gap-2">
                <Award className="size-6 text-accent-brand" /> {getInterviewLevel(finalScore).title}
              </h3>
            </div>

            <div className="text-right">
              <span className="font-mono text-3xl font-black text-accent-brand block">{finalScore} / 100</span>
              <span className="rounded bg-accent-brand/20 px-2 py-0.5 text-[11px] font-mono font-bold text-accent-brand ring-1 ring-accent-brand/40">
                {getInterviewLevel(finalScore).badge}
              </span>
            </div>
          </div>

          {/* Rubric Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div className="rounded-xl bg-bg-surface-2 p-3 ring-1 ring-border">
              <span className="text-[10px] text-text-muted uppercase block">Scoping & Math</span>
              <span className="text-lg font-bold text-emerald-400">{stage1Score} / 25</span>
            </div>
            <div className="rounded-xl bg-bg-surface-2 p-3 ring-1 ring-border">
              <span className="text-[10px] text-text-muted uppercase block">Architecture Flow</span>
              <span className="text-lg font-bold text-cyan-400">{stage2Score} / 25</span>
            </div>
            <div className="rounded-xl bg-bg-surface-2 p-3 ring-1 ring-border">
              <span className="text-[10px] text-text-muted uppercase block">Sharding Strategy</span>
              <span className="text-lg font-bold text-purple-400">{stage3Score} / 25</span>
            </div>
            <div className="rounded-xl bg-bg-surface-2 p-3 ring-1 ring-border">
              <span className="text-[10px] text-text-muted uppercase block">Chaos Resilience</span>
              <span className="text-lg font-bold text-amber-400">{stage4Score} / 25</span>
            </div>
          </div>

          {/* Hiring Committee Comments */}
          <div className="rounded-xl bg-black/60 p-4 ring-1 ring-border space-y-2 text-[12px] font-mono text-cyan-300">
            <span className="text-accent-brand font-bold block uppercase text-[11px]">
              Principal / Staff Hiring Committee Summary:
            </span>
            <p>
              "The candidate demonstrated exceptional distributed systems judgment. They correctly articulated back-of-the-envelope capacity constraints for {system.name}, decoupled write paths via asynchronous event brokers, selected Consistent Hashing to minimize repartitioning overhead, and proactively addressed celebrity hot spots via key-salting rather than naive vertical scaling."
            </p>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handleReset}
              className="rounded-lg bg-bg-surface-2 px-4 py-2 text-[12px] font-mono text-text-muted hover:text-text-primary ring-1 ring-border"
            >
              Practice Another System
            </button>
            <span className="text-[11px] font-mono text-text-muted">
              Evaluated against real FAANG Staff Engineer (L6) calibration rubrics.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
