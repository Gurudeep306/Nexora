import React, { useState } from 'react'
import type { AnimationStep } from '../types'
import { Copy, Check } from 'lucide-react'
import { playStepClickSound } from '../utils/audioEffects'

interface WirePacketHexViewProps {
  currentStep: AnimationStep
}

export const WirePacketHexView: React.FC<WirePacketHexViewProps> = ({ currentStep }) => {
  const [activeSubTab, setActiveSubTab] = useState<'osi' | 'hexdump'>('osi')
  const [copied, setCopied] = useState<boolean>(false)

  // Generate simulated synthetic packet hex bytes from payload string
  const rawJson = JSON.stringify(currentStep.payload)
  const hexLines: { offset: string; hex: string; ascii: string }[] = []

  let currentHex = ''
  let currentAscii = ''

  for (let i = 0; i < Math.min(rawJson.length, 128); i++) {
    const code = rawJson.charCodeAt(i)
    const hex = code.toString(16).padStart(2, '0').toUpperCase()
    const char = code >= 32 && code <= 126 ? rawJson[i] : '.'

    currentHex += hex + ' '
    currentAscii += char

    if ((i + 1) % 16 === 0 || i === Math.min(rawJson.length, 128) - 1) {
      const lineOffset = (Math.floor(i / 16) * 16).toString(16).padStart(4, '0')
      hexLines.push({
        offset: `0x${lineOffset}`,
        hex: currentHex.trim().padEnd(48, ' '),
        ascii: currentAscii,
      })
      currentHex = ''
      currentAscii = ''
    }
  }

  const handleCopy = () => {
    playStepClickSound()
    navigator.clipboard.writeText(rawJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl bg-black/80 ring-1 ring-border p-4 font-mono text-[11px] space-y-3">
      {/* Sub-tab switcher */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              playStepClickSound()
              setActiveSubTab('osi')
            }}
            className={`rounded px-2.5 py-1 transition ${
              activeSubTab === 'osi'
                ? 'bg-sky-500/20 text-sky-400 font-bold ring-1 ring-sky-500/40'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            OSI Network Frame Headers
          </button>
          <button
            onClick={() => {
              playStepClickSound()
              setActiveSubTab('hexdump')
            }}
            className={`rounded px-2.5 py-1 transition ${
              activeSubTab === 'hexdump'
                ? 'bg-emerald-500/20 text-emerald-400 font-bold ring-1 ring-emerald-500/40'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Raw Hexdump (0x0000 - 0x007F)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Capture
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary"
          >
            {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {activeSubTab === 'osi' ? (
        /* OSI Layer Headers Breakdown */
        <div className="space-y-2 text-[10.5px] animate-fadeIn">
          {/* Layer 2: Ethernet */}
          <div className="rounded-lg bg-bg-surface-1 p-2 ring-1 ring-border/50 space-y-0.5">
            <span className="text-purple-400 font-bold uppercase block">[Layer 2] Ethernet II Frame</span>
            <p className="text-text-muted">
              Dst MAC: <span className="text-text-primary">02:42:AC:11:00:02</span> | Src MAC: <span className="text-text-primary">02:42:AC:11:00:03</span> | EtherType: 0x0800 (IPv4)
            </p>
          </div>

          {/* Layer 3: IPv4 */}
          <div className="rounded-lg bg-bg-surface-1 p-2 ring-1 ring-border/50 space-y-0.5">
            <span className="text-sky-400 font-bold uppercase block">[Layer 3] IPv4 Datagram Header</span>
            <p className="text-text-muted">
              Src IP: <span className="text-text-primary">10.0.1.42 ({currentStep.fromNode})</span> → Dst IP: <span className="text-text-primary">10.0.2.18 ({currentStep.toNode})</span> | TTL: 64 | Proto: 6 (TCP)
            </p>
          </div>

          {/* Layer 4: TCP / Transport */}
          <div className="rounded-lg bg-bg-surface-1 p-2 ring-1 ring-border/50 space-y-0.5">
            <span className="text-emerald-400 font-bold uppercase block">[Layer 4] TCP Segment Header</span>
            <p className="text-text-muted">
              Src Port: <span className="text-text-primary">54820</span> | Dst Port: <span className="text-text-primary">443 / 9092</span> | Flags: [ACK, PSH] | Window: 65,535
            </p>
          </div>

          {/* Layer 7: Application Protocol */}
          <div className="rounded-lg bg-bg-surface-1 p-2 ring-1 ring-border/50 space-y-0.5">
            <span className="text-amber-400 font-bold uppercase block">
              [Layer 7] {currentStep.protocol} Application Frame
            </span>
            <p className="text-text-muted truncate">
              Wire Payload: <span className="text-emerald-300">{rawJson}</span>
            </p>
          </div>
        </div>
      ) : (
        /* Raw Hexdump */
        <div className="rounded-lg bg-black p-2.5 ring-1 ring-border/60 overflow-x-auto space-y-0.5 text-[10px]">
          {hexLines.map((row, i) => (
            <div key={i} className="flex gap-3 leading-relaxed hover:bg-white/5 px-1 rounded">
              <span className="text-sky-400 select-none font-bold">{row.offset}</span>
              <span className="text-emerald-300 font-mono tracking-wider">{row.hex}</span>
              <span className="text-amber-300 font-mono select-none">|{row.ascii}|</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
