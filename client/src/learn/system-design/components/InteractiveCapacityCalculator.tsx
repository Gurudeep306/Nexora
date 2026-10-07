import React, { useState } from 'react'
import type { SystemDesignModel } from '../types'
import {
  Calculator,
  Server,
  Database,
  Cpu,
  Activity,
  HardDrive,
  Sparkles,
  Zap,
} from 'lucide-react'

interface CapacityCalculatorProps {
  system: SystemDesignModel
}

export const InteractiveCapacityCalculator: React.FC<CapacityCalculatorProps> = ({ system }) => {
  // Configurable sliders
  const [writeQps, setWriteQps] = useState<number>(1000)
  const [readRatio, setReadRatio] = useState<number>(50) // 50:1 read to write
  const [payloadSizeKb, setPayloadSizeKb] = useState<number>(2) // 2 KB per record
  const [retentionYears, setRetentionYears] = useState<number>(5) // 5 years
  const cacheMemoryPercent = 20 // 20% Pareto rule

  // Calculated values
  const readQps = writeQps * readRatio
  const totalQps = writeQps + readQps
  const peakQps = totalQps * 2 // standard 2x peak headroom

  // Ingress & Egress Bandwidth
  const ingressBytesPerSec = writeQps * payloadSizeKb * 1024
  const ingressMbps = (ingressBytesPerSec * 8) / (1024 * 1024)

  const egressBytesPerSec = readQps * payloadSizeKb * 1024
  const egressMbps = (egressBytesPerSec * 8) / (1024 * 1024)

  // Storage calculation
  const secondsPerDay = 86400
  const dailyIngressBytes = writeQps * payloadSizeKb * 1024 * secondsPerDay
  const dailyIngressGb = dailyIngressBytes / (1024 * 1024 * 1024)

  const fiveYearStorageTb = (dailyIngressGb * 365 * retentionYears) / 1024
  const storageWithReplicationTb = fiveYearStorageTb * 3 // standard 3-way replication

  // Cache estimation (20% Pareto 80/20 rule on daily read volume)
  const dailyReadRequests = readQps * secondsPerDay
  const dailyUniqueHotKeysBytes = dailyReadRequests * payloadSizeKb * 1024 * (cacheMemoryPercent / 100) * 0.1
  const cacheMemoryGb = Math.max(8, Math.round(dailyUniqueHotKeysBytes / (1024 * 1024 * 1024)))

  // Server instance sizing (assuming 1 commodity 8-core server handles ~10,000 IOPS)
  const serversNeeded = Math.max(2, Math.ceil(peakQps / 10000))

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-b from-[#0a0f1d] via-[#070b14] to-[#04060b] p-6 text-white shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-sky-400" />
            <h4 className="font-mono text-[14px] font-bold tracking-wider text-sky-400 uppercase">
              Interactive Back-of-the-Envelope Capacity Estimator
            </h4>
          </div>
          <p className="text-[12.5px] text-text-muted mt-0.5">
            Dynamically adjust traffic scale parameters to calculate IOPS, network bandwidth, RAM cache, and multi-year disk storage.
          </p>
        </div>

        <div className="rounded-lg bg-sky-500/10 px-3 py-1 font-mono text-[11px] font-bold text-sky-300 ring-1 ring-sky-500/30">
          Tailored for: {system.name.split('(')[0].trim()}
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-black/40 ring-1 ring-border">
        {/* Write QPS Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-text-muted">Write Requests/sec:</span>
            <span className="font-bold text-sky-400">{writeQps.toLocaleString()} QPS</span>
          </div>
          <input
            type="range"
            min={100}
            max={50000}
            step={100}
            value={writeQps}
            onChange={(e) => setWriteQps(Number(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer"
          />
          <div className="flex justify-between text-[9.5px] font-mono text-text-muted">
            <span>100</span>
            <span>25,000</span>
            <span>50,000</span>
          </div>
        </div>

        {/* Read:Write Ratio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-text-muted">Read-to-Write Ratio:</span>
            <span className="font-bold text-purple-400">{readRatio}:1</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={readRatio}
            onChange={(e) => setReadRatio(Number(e.target.value))}
            className="w-full accent-purple-400 cursor-pointer"
          />
          <div className="flex justify-between text-[9.5px] font-mono text-text-muted">
            <span>1:1</span>
            <span>50:1</span>
            <span>100:1</span>
          </div>
        </div>

        {/* Payload Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-text-muted">Avg Record Size:</span>
            <span className="font-bold text-emerald-400">{payloadSizeKb} KB</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={50}
            step={0.5}
            value={payloadSizeKb}
            onChange={(e) => setPayloadSizeKb(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer"
          />
          <div className="flex justify-between text-[9.5px] font-mono text-text-muted">
            <span>500 B</span>
            <span>25 KB</span>
            <span>50 KB</span>
          </div>
        </div>

        {/* Retention Years */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-text-muted">Retention Horizon:</span>
            <span className="font-bold text-amber-400">{retentionYears} Years</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={retentionYears}
            onChange={(e) => setRetentionYears(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[9.5px] font-mono text-text-muted">
            <span>1 Year</span>
            <span>5 Years</span>
            <span>10 Years</span>
          </div>
        </div>
      </div>

      {/* Calculated Metrics Output Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Read Throughput */}
        <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-center space-y-1">
          <span className="text-[10px] font-mono uppercase text-text-muted flex items-center justify-center gap-1">
            <Activity className="size-3 text-purple-400" /> Read Throughput
          </span>
          <span className="font-mono text-[14px] font-extrabold text-purple-400 block">
            {readQps.toLocaleString()} /s
          </span>
          <span className="text-[9.5px] font-mono text-text-muted block">Peak: {(readQps * 2).toLocaleString()}</span>
        </div>

        {/* Peak Total QPS */}
        <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-center space-y-1">
          <span className="text-[10px] font-mono uppercase text-text-muted flex items-center justify-center gap-1">
            <Zap className="size-3 text-sky-400" /> Peak System QPS
          </span>
          <span className="font-mono text-[14px] font-extrabold text-sky-400 block">
            {peakQps.toLocaleString()} /s
          </span>
          <span className="text-[9.5px] font-mono text-text-muted block">2x Headroom factor</span>
        </div>

        {/* Network Ingress & Egress */}
        <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-center space-y-1">
          <span className="text-[10px] font-mono uppercase text-text-muted flex items-center justify-center gap-1">
            <Cpu className="size-3 text-emerald-400" /> Network Egress
          </span>
          <span className="font-mono text-[14px] font-extrabold text-emerald-400 block">
            {egressMbps > 1000 ? `${(egressMbps / 1000).toFixed(2)} Gbps` : `${egressMbps.toFixed(1)} Mbps`}
          </span>
          <span className="text-[9.5px] font-mono text-text-muted block">Ingress: {ingressMbps.toFixed(1)} Mbps</span>
        </div>

        {/* Daily Storage Ingestion */}
        <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-center space-y-1">
          <span className="text-[10px] font-mono uppercase text-text-muted flex items-center justify-center gap-1">
            <Database className="size-3 text-cyan-400" /> Daily Ingestion
          </span>
          <span className="font-mono text-[14px] font-extrabold text-cyan-400 block">
            {dailyIngressGb > 1000 ? `${(dailyIngressGb / 1024).toFixed(2)} TB/day` : `${dailyIngressGb.toFixed(1)} GB/day`}
          </span>
          <span className="text-[9.5px] font-mono text-text-muted block">Uncompressed raw</span>
        </div>

        {/* 5-Year Storage Capacity */}
        <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-center space-y-1">
          <span className="text-[10px] font-mono uppercase text-text-muted flex items-center justify-center gap-1">
            <HardDrive className="size-3 text-amber-400" /> Total Storage (3x)
          </span>
          <span className="font-mono text-[14px] font-extrabold text-amber-400 block">
            {storageWithReplicationTb > 1000
              ? `${(storageWithReplicationTb / 1024).toFixed(2)} PB`
              : `${storageWithReplicationTb.toFixed(1)} TB`}
          </span>
          <span className="text-[9.5px] font-mono text-text-muted block">3-way replicated</span>
        </div>

        {/* Redis Cache Memory */}
        <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-center space-y-1">
          <span className="text-[10px] font-mono uppercase text-text-muted flex items-center justify-center gap-1">
            <Server className="size-3 text-rose-400" /> Hot Redis Cache
          </span>
          <span className="font-mono text-[14px] font-extrabold text-rose-400 block">
            {cacheMemoryGb > 1000 ? `${(cacheMemoryGb / 1024).toFixed(1)} TB` : `${cacheMemoryGb} GB`}
          </span>
          <span className="text-[9.5px] font-mono text-text-muted block">80/20 Pareto rule</span>
        </div>
      </div>

      {/* Sizing Blueprint Explanation Box */}
      <div className="rounded-xl bg-black/60 p-4 ring-1 ring-border text-[12px] font-mono text-text-secondary space-y-2">
        <div className="flex items-center gap-2 text-sky-400 font-bold">
          <Sparkles className="size-4" /> Recommended Production Hardware Fleet:
        </div>
        <p className="leading-relaxed">
          • <strong className="text-white">{serversNeeded} Stateless API Gateway & Service Nodes</strong> (8-Core, 32GB RAM) behind an L4 Network Load Balancer to effortlessly sustain peak throughput of {peakQps.toLocaleString()} QPS.
        </p>
        <p className="leading-relaxed">
          • <strong className="text-white">{Math.ceil(cacheMemoryGb / 64)} Redis Cluster Nodes</strong> (64GB RAM each) configured with LRU eviction to serve 80% of read queries sub-5ms from memory.
        </p>
        <p className="leading-relaxed">
          • <strong className="text-white">{Math.max(3, Math.ceil(storageWithReplicationTb / 4))} Sharded Database Storage Volumes</strong> (NVMe SSD, 4TB each) to hold {storageWithReplicationTb.toFixed(1)} TB across {retentionYears} years with 3-way multi-AZ replication.
        </p>
      </div>
    </div>
  )
}
