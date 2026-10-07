import React, { useState, useEffect, useRef } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  Sparkles,
  AlertTriangle,
  Send,
  Key,
} from 'lucide-react'
import {
  playTradeMatchSound,
  playStepClickSound,
  playPacketTransmitSound,
  playNodeCrashSound,
  playSuccessChimeSound,
  playPacketArriveSound,
} from '../utils/audioEffects'

// =========================================================================
// 1. LIMIT ORDER BOOK (LOB) DEPTH OF MARKET & MATCHING ENGINE
// =========================================================================
interface OrderBookLevel {
  price: number
  volume: number
  depth: number
}

interface TradeFill {
  id: string
  time: string
  price: number
  qty: number
  side: 'BUY' | 'SELL'
}

export const LimitOrderBookEngine: React.FC = () => {
  const [bids, setBids] = useState<OrderBookLevel[]>([
    { price: 235.40, volume: 450, depth: 450 },
    { price: 235.35, volume: 1200, depth: 1650 },
    { price: 235.30, volume: 800, depth: 2450 },
    { price: 235.25, volume: 3100, depth: 5550 },
    { price: 235.20, volume: 4200, depth: 9750 },
  ])

  const [asks, setAsks] = useState<OrderBookLevel[]>([
    { price: 235.45, volume: 600, depth: 600 },
    { price: 235.50, volume: 950, depth: 1550 },
    { price: 235.55, volume: 1800, depth: 3350 },
    { price: 235.60, volume: 2400, depth: 5750 },
    { price: 235.65, volume: 3800, depth: 9550 },
  ])

  const [trades, setTrades] = useState<TradeFill[]>([
    { id: 'TRD-101', time: '14:22:01.402', price: 235.45, qty: 150, side: 'BUY' },
    { id: 'TRD-102', time: '14:22:03.119', price: 235.40, qty: 200, side: 'SELL' },
  ])

  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY')
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT')
  const [orderPrice, setOrderPrice] = useState<string>('235.45')
  const [orderQty, setOrderQty] = useState<string>('200')
  const [executionLog, setExecutionLog] = useState<string>('Matching engine idle. Order book spread: $0.05.')

  const bestBid = bids[0]?.price || 0
  const bestAsk = asks[0]?.price || 0
  const spread = (bestAsk - bestBid).toFixed(2)

  const handlePlaceOrder = () => {
    const qty = parseInt(orderQty) || 100
    const price = parseFloat(orderPrice) || bestAsk

    if (orderSide === 'BUY') {
      if (orderType === 'MARKET' || price >= bestAsk) {
        // Crossing the spread -> Immediate Execution!
        const execPrice = bestAsk
        const newTrade: TradeFill = {
          id: `TRD-${Date.now().toString().slice(-4)}`,
          time: new Date().toISOString().slice(11, 23),
          price: execPrice,
          qty,
          side: 'BUY',
        }
        setTrades((prev) => [newTrade, ...prev.slice(0, 5)])
        playTradeMatchSound()

        // Decrement volume at best ask
        setAsks((prev) => {
          const updated = [...prev]
          if (updated[0].volume <= qty) {
            updated.shift() // consumed level
          } else {
            updated[0].volume -= qty
          }
          return updated
        })

        setExecutionLog(`⚡ AGGRESSIVE FILL: Buy order of ${qty} matched with Best Ask @ $${execPrice.toFixed(2)} in sub-microsecond latency.`)
      } else {
        // Resting Limit Order -> Insert into Bids
        playStepClickSound()
        setBids((prev) => {
          const updated = [...prev, { price, volume: qty, depth: qty }].sort((a, b) => b.price - a.price)
          return updated
        })
        setExecutionLog(`📥 RESTING MAKER: Limit Buy order for ${qty} @ $${price.toFixed(2)} added to Doubly Linked List price bucket.`)
      }
    } else {
      // SELL ORDER
      if (orderType === 'MARKET' || price <= bestBid) {
        const execPrice = bestBid
        const newTrade: TradeFill = {
          id: `TRD-${Date.now().toString().slice(-4)}`,
          time: new Date().toISOString().slice(11, 23),
          price: execPrice,
          qty,
          side: 'SELL',
        }
        setTrades((prev) => [newTrade, ...prev.slice(0, 5)])
        playTradeMatchSound()

        setBids((prev) => {
          const updated = [...prev]
          if (updated[0].volume <= qty) {
            updated.shift()
          } else {
            updated[0].volume -= qty
          }
          return updated
        })

        setExecutionLog(`⚡ AGGRESSIVE FILL: Sell order of ${qty} matched with Best Bid @ $${execPrice.toFixed(2)}.`)
      } else {
        playStepClickSound()
        setAsks((prev) => {
          const updated = [...prev, { price, volume: qty, depth: qty }].sort((a, b) => a.price - b.price)
          return updated
        })
        setExecutionLog(`📥 RESTING MAKER: Limit Sell order for ${qty} @ $${price.toFixed(2)} queued on Ask ladder.`)
      }
    }
  }

  return (
    <div className="space-y-4 rounded-xl bg-bg-surface-2 p-5 ring-1 ring-border text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <span className="font-mono text-[11px] font-bold text-accent-brand uppercase tracking-wider block">
            Financial Low-Latency Infrastructure
          </span>
          <h3 className="text-base font-bold text-text-primary">Limit Order Book (LOB) & Matching Engine</h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-text-muted">Spread:</span>
          <span className="rounded bg-sky-500/20 px-2 py-0.5 font-bold text-sky-400 ring-1 ring-sky-500/40">
            ${spread}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Depth of Market Ladder */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-3">
          {/* Bids Ladder (Green) */}
          <div className="space-y-1.5 rounded-xl bg-bg-surface-1 p-3 ring-1 ring-emerald-500/30">
            <span className="text-[11px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="size-3.5" /> Bids (Buy Orders)
            </span>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between text-text-muted text-[10px] pb-1 border-b border-border/40">
                <span>Price</span>
                <span>Qty</span>
                <span>Depth</span>
              </div>
              {bids.map((b, i) => {
                const depthPct = Math.min(100, Math.round((b.depth / 10000) * 100))
                return (
                  <div
                    key={i}
                    className="relative flex justify-between items-center px-1.5 py-0.5 rounded hover:bg-emerald-500/10 transition overflow-hidden"
                  >
                    {/* Visual Volume Depth Bar */}
                    <div
                      className="absolute inset-y-0 right-0 bg-emerald-500/15 rounded pointer-events-none transition-all duration-300"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="relative z-10 font-bold text-emerald-400">${b.price.toFixed(2)}</span>
                    <span className="relative z-10 text-text-primary">{b.volume.toLocaleString()}</span>
                    <span className="relative z-10 text-text-muted text-[10px]">{b.depth.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Asks Ladder (Red) */}
          <div className="space-y-1.5 rounded-xl bg-bg-surface-1 p-3 ring-1 ring-rose-500/30">
            <span className="text-[11px] font-mono font-bold uppercase text-rose-400 flex items-center gap-1.5">
              <TrendingDown className="size-3.5" /> Asks (Sell Orders)
            </span>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between text-text-muted text-[10px] pb-1 border-b border-border/40">
                <span>Price</span>
                <span>Qty</span>
                <span>Depth</span>
              </div>
              {asks.map((a, i) => {
                const depthPct = Math.min(100, Math.round((a.depth / 10000) * 100))
                return (
                  <div
                    key={i}
                    className="relative flex justify-between items-center px-1.5 py-0.5 rounded hover:bg-rose-500/10 transition overflow-hidden"
                  >
                    {/* Visual Volume Depth Bar */}
                    <div
                      className="absolute inset-y-0 left-0 bg-rose-500/15 rounded pointer-events-none transition-all duration-300"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="relative z-10 font-bold text-rose-400">${a.price.toFixed(2)}</span>
                    <span className="relative z-10 text-text-primary">{a.volume.toLocaleString()}</span>
                    <span className="relative z-10 text-text-muted text-[10px]">{a.depth.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Order Ticket & Trade Tape */}
        <div className="lg:col-span-5 space-y-3">
          {/* Order Placement Form */}
          <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border space-y-2.5">
            <span className="text-[11px] font-mono font-bold uppercase text-text-muted block">
              Direct DMA Order Entry
            </span>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <button
                onClick={() => setOrderSide('BUY')}
                className={`rounded-lg py-1 font-bold transition ring-1 ${
                  orderSide === 'BUY'
                    ? 'bg-emerald-500 text-black ring-emerald-400'
                    : 'bg-bg-surface-2 text-text-muted ring-border'
                }`}
              >
                BUY / BID
              </button>
              <button
                onClick={() => setOrderSide('SELL')}
                className={`rounded-lg py-1 font-bold transition ring-1 ${
                  orderSide === 'SELL'
                    ? 'bg-rose-500 text-white ring-rose-400'
                    : 'bg-bg-surface-2 text-text-muted ring-border'
                }`}
              >
                SELL / ASK
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <label className="text-[10px] text-text-muted block">Order Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full rounded bg-bg-surface-2 px-2 py-1 text-text-primary ring-1 ring-border"
                >
                  <option value="LIMIT">Limit Order</option>
                  <option value="MARKET">Market Order</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-text-muted block">Quantity</label>
                <input
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="w-full rounded bg-bg-surface-2 px-2 py-1 text-text-primary ring-1 ring-border"
                />
              </div>
            </div>

            {orderType === 'LIMIT' && (
              <div>
                <label className="text-[10px] text-text-muted block font-mono">Limit Price ($)</label>
                <input
                  type="number"
                  step="0.05"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  className="w-full rounded bg-bg-surface-2 px-2 py-1 text-text-primary ring-1 ring-border font-mono text-[11px]"
                />
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              className={`w-full rounded-lg py-1.5 text-[11.5px] font-bold shadow transition active:scale-95 ${
                orderSide === 'BUY'
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                  : 'bg-rose-500 text-white hover:bg-rose-400'
              }`}
            >
              Submit Order to Matching Engine
            </button>
          </div>

          {/* Trade Executions Tape */}
          <div className="rounded-xl bg-bg-surface-1 p-2.5 ring-1 ring-border space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase text-text-muted block">
              Recent Trade Executions (Tick Tape)
            </span>
            <div className="space-y-1 text-[10px] font-mono">
              {trades.map((t) => (
                <div key={t.id} className="flex justify-between items-center px-1 text-text-muted">
                  <span className="text-text-primary font-bold">{t.time}</span>
                  <span className={t.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {t.side} {t.qty} @ ${t.price.toFixed(2)}
                  </span>
                  <span className="text-text-muted text-[9px]">{t.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-black/60 p-3 ring-1 ring-border text-[11.5px] font-mono text-cyan-300">
        <span className="text-cyan-400 font-bold">Matching Engine Log: </span> {executionLog}
      </div>
    </div>
  )
}

// =========================================================================
// 2. SNOWFLAKE 64-BIT DISTRIBUTED ID GENERATOR
// =========================================================================
export const SnowflakeIdGeneratorEngine: React.FC = () => {
  const [datacenterId, setDatacenterId] = useState<number>(5)
  const [workerId, setWorkerId] = useState<number>(12)
  const [sequence, setSequence] = useState<number>(104)
  const [generatedId, setGeneratedId] = useState<string>('1758204918239019008')
  const [isClockSkew, setIsClockSkew] = useState<boolean>(false)
  const skewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (skewTimerRef.current) clearTimeout(skewTimerRef.current)
    }
  }, [])

  const [bitView, setBitView] = useState({
    sign: '0',
    timestampBits: '01100011010111100010101011100100101011101',
    datacenterBits: '00101',
    workerBits: '01100',
    seqBits: '000001101000',
  })
  const [log, setLog] = useState<string>('Snowflake sequence generator online. Monotonic strictly increasing IDs.')

  const handleGenerate = () => {
    const nextSeq = (sequence + 1) % 4096
    setSequence(nextSeq)

    // Current timestamp relative to custom epoch (e.g. Jan 1 2024)
    const customEpoch = 1704067200000
    const now = Date.now()
    const diff = Math.max(0, now - customEpoch)

    // Binary conversions
    const timeBits = diff.toString(2).padStart(41, '0').slice(-41)
    const dcBits = datacenterId.toString(2).padStart(5, '0')
    const wBits = workerId.toString(2).padStart(5, '0')
    const sBits = nextSeq.toString(2).padStart(12, '0')

    setBitView({
      sign: '0',
      timestampBits: timeBits,
      datacenterBits: dcBits,
      workerBits: wBits,
      seqBits: sBits,
    })

    // Simulate 64-bit ID string
    const simulated64Bit = (BigInt(diff) << 22n) | (BigInt(datacenterId) << 17n) | (BigInt(workerId) << 12n) | BigInt(nextSeq)
    setGeneratedId(simulated64Bit.toString())
    playStepClickSound()
    setLog(`✅ New 64-bit ID generated: ${simulated64Bit} (Timestamp delta: ${diff}ms, Sequence: ${nextSeq})`)
  }

  const handleClockDrift = () => {
    setIsClockSkew(true)
    playNodeCrashSound()
    if (skewTimerRef.current) clearTimeout(skewTimerRef.current)
    skewTimerRef.current = setTimeout(() => setIsClockSkew(false), 2500)
    setLog(`⚠️ NTP CLOCK SKEW DETECTED! Clock moved backward by 4ms. Generator spin-waits on Monotonic sequence borrowing to prevent collision!`)
  }

  return (
    <div className="space-y-4 rounded-xl bg-bg-surface-2 p-5 ring-1 ring-border text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <span className="font-mono text-[11px] font-bold text-accent-brand uppercase tracking-wider block">
            High-Concurrency Identity Architecture
          </span>
          <h3 className="text-base font-bold text-text-primary">Twitter Snowflake 64-Bit Distributed ID Generator</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClockDrift}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold ring-1 transition flex items-center gap-1 ${
              isClockSkew
                ? 'bg-rose-500/30 text-rose-300 ring-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse'
                : 'bg-amber-500/20 text-amber-300 ring-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            <AlertTriangle className="size-3" /> Simulate NTP Drift (-4ms)
          </button>
        </div>
      </div>

      {/* 64-Bit Structure Visualizer Bar */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono font-bold uppercase text-text-muted block">
          64-Bit Memory Layout Allocation
        </span>

        <div className="grid grid-cols-12 gap-1 rounded-xl bg-black p-3 ring-1 ring-border text-center font-mono text-[10.5px]">
          {/* Sign bit (1 bit) */}
          <div className="col-span-1 rounded bg-zinc-800/80 p-2 ring-1 ring-zinc-700">
            <span className="text-[9px] text-zinc-400 block">Sign (1b)</span>
            <span className="text-zinc-200 font-bold">{bitView.sign}</span>
          </div>

          {/* Timestamp bits (41 bits) */}
          <div className={`col-span-6 rounded p-2 ring-1 transition-all duration-300 ${
            isClockSkew
              ? 'bg-rose-950/70 ring-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-pulse'
              : 'bg-cyan-950/40 ring-cyan-500/40'
          }`}>
            <span className={`text-[9px] block font-bold ${isClockSkew ? 'text-rose-400' : 'text-cyan-400'}`}>
              {isClockSkew ? '⚠️ NTP BACKWARD SKEW (-4ms)' : 'Timestamp Delta (41 bits ~ 69.7 Years)'}
            </span>
            <span className={`${isClockSkew ? 'text-rose-200 font-extrabold' : 'text-cyan-300 font-bold'} truncate block tracking-wider`}>
              {bitView.timestampBits}
            </span>
          </div>

          {/* Datacenter ID (5 bits) */}
          <div className="col-span-2 rounded bg-purple-950/40 p-2 ring-1 ring-purple-500/40">
            <span className="text-[9px] text-purple-400 block font-bold">DC ID (5b)</span>
            <span className="text-purple-300 font-bold">{bitView.datacenterBits}</span>
          </div>

          {/* Worker ID (5 bits) */}
          <div className="col-span-1 rounded bg-emerald-950/40 p-2 ring-1 ring-emerald-500/40">
            <span className="text-[9px] text-emerald-400 block font-bold">Worker (5b)</span>
            <span className="text-emerald-300 font-bold">{bitView.workerBits}</span>
          </div>

          {/* Sequence (12 bits) */}
          <div className="col-span-2 rounded bg-amber-950/40 p-2 ring-1 ring-amber-500/40">
            <span className="text-[9px] text-amber-400 block font-bold">Sequence (12b ~ 4096/ms)</span>
            <span className="text-amber-300 font-bold truncate block">{bitView.seqBits}</span>
          </div>
        </div>
      </div>

      {/* Generated ID Big Badge */}
      <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono uppercase text-text-muted block">Resulting 64-Bit Integer</span>
          <span className="text-xl sm:text-2xl font-mono font-extrabold text-accent-brand tracking-wider">
            {generatedId}
          </span>
        </div>

        <button
          onClick={handleGenerate}
          className="rounded-lg bg-accent-brand px-4 py-2 text-[12px] font-bold text-bg-base hover:opacity-90 active:scale-95 shadow-md flex items-center gap-1.5"
        >
          <Zap className="size-3.5" /> Generate Next ID
        </button>
      </div>

      {/* Interactive Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-[11px] font-mono">
        <div>
          <div className="flex justify-between pb-1">
            <span className="text-text-muted">Datacenter ID (0 - 31):</span>
            <span className="text-purple-400 font-bold">{datacenterId}</span>
          </div>
          <input
            type="range"
            min="0"
            max="31"
            value={datacenterId}
            onChange={(e) => setDatacenterId(parseInt(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>

        <div>
          <div className="flex justify-between pb-1">
            <span className="text-text-muted">Worker Node ID (0 - 31):</span>
            <span className="text-emerald-400 font-bold">{workerId}</span>
          </div>
          <input
            type="range"
            min="0"
            max="31"
            value={workerId}
            onChange={(e) => setWorkerId(parseInt(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
      </div>

      <div className="rounded-xl bg-black/60 p-3 ring-1 ring-border text-[11.5px] font-mono text-cyan-300">
        <span className="text-cyan-400 font-bold">Node Hardware Status: </span> {log}
      </div>
    </div>
  )
}

// =========================================================================
// 3. SIGNAL / WHATSAPP DOUBLE RATCHET CRYPTOGRAPHIC ENGINE
// =========================================================================
export const DoubleRatchetCryptoEngine: React.FC = () => {
  const [stage, setStage] = useState<'idle' | 'alice_sends' | 'bob_replies' | 'ratchet_turn'>('idle')
  const [aliceRootKey, setAliceRootKey] = useState<string>('0x7F2A...C4B1')
  const [bobRootKey, setBobRootKey] = useState<string>('0x7F2A...C4B1')
  const [messageKey, setMessageKey] = useState<string>('0x9A4E...118D')
  const [cipherText, setCipherText] = useState<string>('AES-256-GCM[8f2d91a9f02c]')
  const [log, setLog] = useState<string>('End-to-end encrypted session established. Diffie-Hellman ratchet primed.')
  const transitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (transitTimerRef.current) clearTimeout(transitTimerRef.current)
    }
  }, [])

  const handleAliceSend = () => {
    if (transitTimerRef.current) clearTimeout(transitTimerRef.current)
    setStage('alice_sends')
    const newMsgKey = `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`
    setMessageKey(newMsgKey)
    setCipherText(`AES-256-GCM[${Math.random().toString(16).slice(2, 14)}]`)
    playPacketTransmitSound()
    setLog('1/2: Alice advanced Symmetric Sending Chain: KDF(CKs) -> MessageKey Derived. Message encrypted with AES-256-GCM in flight.')

    transitTimerRef.current = setTimeout(() => {
      playPacketArriveSound()
      setLog('1/2: Bob received Alice message packet! Bob successfully derived matching MK with CK_recv and authenticated ciphertext!')
    }, 800)
  }

  const handleBobReply = () => {
    if (transitTimerRef.current) clearTimeout(transitTimerRef.current)
    setStage('bob_replies')
    const newRk = `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`
    setAliceRootKey(newRk)
    setBobRootKey(newRk)
    playPacketTransmitSound()
    setLog('2/2: Bob generates fresh Ephemeral DH Keypair! Transmitting Curve25519 public key along wire to Alice...')

    transitTimerRef.current = setTimeout(() => {
      playSuccessChimeSound()
      setLog('2/2: Alice received Bob DH public key! Diffie-Hellman Ratchet step advances Root Key -> Guarantees Forward Secrecy & Break-in Recovery!')
    }, 800)
  }

  return (
    <div className="space-y-4 rounded-xl bg-bg-surface-2 p-5 ring-1 ring-border text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <span className="font-mono text-[11px] font-bold text-accent-brand uppercase tracking-wider block">
            Cryptographic Privacy Protocol
          </span>
          <h3 className="text-base font-bold text-text-primary">Signal & WhatsApp Double Ratchet E2E Protocol</h3>
        </div>
        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10.5px] font-mono text-emerald-300 ring-1 ring-emerald-500/40 font-bold flex items-center gap-1">
          <Shield className="size-3" /> Zero-Knowledge Server Forward Secrecy
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Alice Node */}
        <div className="md:col-span-5 rounded-xl bg-bg-surface-1 p-3.5 ring-1 ring-sky-500/40 space-y-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-1">
            <span className="font-mono text-[12px] font-bold text-sky-400">Alice (Client A)</span>
            <span className="size-2 rounded-full bg-emerald-400" />
          </div>
          <div className="space-y-1 text-[11px] font-mono text-text-muted">
            <div>Root Key: <span className="text-text-primary font-bold">{aliceRootKey}</span></div>
            <div>Chain Key: <span className="text-cyan-300 font-bold">CK_send #3</span></div>
            <div>Ephemeral DH: <span className="text-amber-300">Curve25519 (KeyPair A)</span></div>
          </div>
          <button
            onClick={handleAliceSend}
            className="w-full rounded-lg bg-sky-500 py-1.5 text-[11px] font-bold text-black hover:bg-sky-400 active:scale-95 shadow flex items-center justify-center gap-1 transition"
          >
            <Send className="size-3" /> Alice Sends Encrypted Message
          </button>
        </div>

        {/* Wire In-Flight */}
        <div className="md:col-span-2 flex flex-col items-center justify-center text-center space-y-1">
          <div className="relative w-full h-14 flex items-center justify-center px-1">
            <svg viewBox="0 0 160 48" className="w-full h-full overflow-visible">
              <defs>
                <filter id="packetLaserGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Untrusted Fiber Wire */}
              <line
                x1="10"
                y1="24"
                x2="150"
                y2="24"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Active Laser Channel */}
              {stage !== 'idle' && (
                <line
                  x1="10"
                  y1="24"
                  x2="150"
                  y2="24"
                  stroke={stage === 'alice_sends' ? '#38bdf8' : '#c084fc'}
                  strokeWidth="2.8"
                  strokeDasharray="8 6"
                  filter="url(#packetLaserGlow)"
                  className="animate-flow-dash"
                />
              )}

              {/* Alice -> Bob Encrypted Packet */}
              {stage === 'alice_sends' && (
                <g filter="url(#packetLaserGlow)" className="transition-all duration-700 ease-out">
                  <rect
                    x="50"
                    y="12"
                    width="60"
                    height="24"
                    rx="6"
                    fill="#0284c7"
                    stroke="#38bdf8"
                    strokeWidth="1.6"
                    className="shadow-lg"
                  />
                  <text
                    x="80"
                    y="27"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    🔒 AES-GCM
                  </text>
                </g>
              )}

              {/* Bob -> Alice Ephemeral DH Ratchet Packet */}
              {stage === 'bob_replies' && (
                <g filter="url(#packetLaserGlow)" className="transition-all duration-700 ease-out">
                  <rect
                    x="48"
                    y="12"
                    width="64"
                    height="24"
                    rx="6"
                    fill="#7e22ce"
                    stroke="#c084fc"
                    strokeWidth="1.6"
                    className="shadow-lg"
                  />
                  <text
                    x="80"
                    y="27"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    🔑 Curve25519
                  </text>
                </g>
              )}

              {stage === 'idle' && (
                <circle cx="80" cy="24" r="5" fill="rgba(0, 240, 255, 0.4)" />
              )}
            </svg>
          </div>

          <span className="text-[9px] font-mono text-text-muted uppercase">Untrusted Fiber Wire</span>
          <span className="text-[9.5px] font-mono text-emerald-300 truncate max-w-[120px]">
            {cipherText}
          </span>
          <span className="text-[8.5px] font-mono text-cyan-300 truncate max-w-[120px]">
            MK: {messageKey}
          </span>
        </div>

        {/* Bob Node */}
        <div className="md:col-span-5 rounded-xl bg-bg-surface-1 p-3.5 ring-1 ring-purple-500/40 space-y-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-1">
            <span className="font-mono text-[12px] font-bold text-purple-400">Bob (Client B)</span>
            <span className="size-2 rounded-full bg-emerald-400" />
          </div>
          <div className="space-y-1 text-[11px] font-mono text-text-muted">
            <div>Root Key: <span className="text-text-primary font-bold">{bobRootKey}</span></div>
            <div>Chain Key: <span className="text-purple-300 font-bold">CK_recv #3</span></div>
            <div>Ephemeral DH: <span className="text-amber-300">Curve25519 (KeyPair B)</span></div>
          </div>
          <button
            onClick={handleBobReply}
            className="w-full rounded-lg bg-purple-500 py-1.5 text-[11px] font-bold text-white hover:bg-purple-400 active:scale-95 shadow flex items-center justify-center gap-1"
          >
            <Key className="size-3" /> Bob Ratchet Reply (New DH Key)
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-[11px] font-mono space-y-1">
        <span className="text-text-muted font-bold block uppercase text-[10px]">
          Cryptographic Guarantees:
        </span>
        <p className="text-text-muted">
          • <strong className="text-text-primary">Forward Secrecy:</strong> If an attacker steals Alice's current phone key, they CANNOT decrypt any past messages because message keys are erased immediately after decryption.
        </p>
        <p className="text-text-muted">
          • <strong className="text-text-primary">Break-in Recovery (Post-Compromise Security):</strong> As soon as Bob and Alice complete a single new Diffie-Hellman ratchet exchange, fresh entropy heals the root key, locking out an active eavesdropper on future messages!
        </p>
      </div>

      <div className="rounded-xl bg-black/60 p-3 ring-1 ring-border text-[11.5px] font-mono text-cyan-300">
        <span className="text-cyan-400 font-bold">Cryptographic State: </span> {log}
      </div>
    </div>
  )
}

// Master Domain Engines Selector
export const SpecializedDomainEngines: React.FC = () => {
  const [activeEngine, setActiveEngine] = useState<'lob' | 'snowflake' | 'doubleratchet'>('lob')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-accent-brand font-bold flex items-center gap-1.5">
          <Sparkles className="size-3.5" /> Specialized Domain Infrastructure Engines
        </span>

        <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
          <button
            onClick={() => setActiveEngine('lob')}
            className={`rounded-lg px-3 py-1.5 transition ${
              activeEngine === 'lob'
                ? 'bg-emerald-500 text-black font-bold ring-1 ring-emerald-400'
                : 'bg-bg-surface-1 text-text-muted hover:text-text-primary ring-1 ring-border'
            }`}
          >
            📈 Limit Order Book & Matching Engine
          </button>
          <button
            onClick={() => setActiveEngine('snowflake')}
            className={`rounded-lg px-3 py-1.5 transition ${
              activeEngine === 'snowflake'
                ? 'bg-accent-brand text-bg-base font-bold ring-1 ring-accent-brand'
                : 'bg-bg-surface-1 text-text-muted hover:text-text-primary ring-1 ring-border'
            }`}
          >
            ❄️ 64-Bit Snowflake ID Generator
          </button>
          <button
            onClick={() => setActiveEngine('doubleratchet')}
            className={`rounded-lg px-3 py-1.5 transition ${
              activeEngine === 'doubleratchet'
                ? 'bg-purple-500 text-white font-bold ring-1 ring-purple-400'
                : 'bg-bg-surface-1 text-text-muted hover:text-text-primary ring-1 ring-border'
            }`}
          >
            🔒 Signal Double Ratchet E2E Crypto
          </button>
        </div>
      </div>

      {activeEngine === 'lob' && <LimitOrderBookEngine />}
      {activeEngine === 'snowflake' && <SnowflakeIdGeneratorEngine />}
      {activeEngine === 'doubleratchet' && <DoubleRatchetCryptoEngine />}
    </div>
  )
}
