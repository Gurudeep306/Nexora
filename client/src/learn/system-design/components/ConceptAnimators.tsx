import React, { useState, useEffect, useRef } from 'react'
import {
  Play,
  RotateCcw,
  Zap,
  Server,
  Database,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  Activity,
  Search,
  Car,
  Plus,
  Users,
} from 'lucide-react'
import {
  playPacketTransmitSound,
  playPacketArriveSound,
  playNodeCrashSound,
  playStepClickSound,
  playTradeMatchSound,
  playSuccessChimeSound,
} from '../utils/audioEffects'

// ==========================================
// 1. CAP & PACELC THEOREM ANIMATOR
// ==========================================
export const CapPartitionAnimator: React.FC = () => {
  const [isPartitioned, setIsPartitioned] = useState<boolean>(false)
  const [mode, setMode] = useState<'CP' | 'AP'>('CP')
  const [balance, setBalance] = useState<number>(100)
  const [nodeBBalance, setNodeBBalance] = useState<number>(100)
  const [lastEvent, setLastEvent] = useState<string>('System operating normally in equilibrium.')
  const [inFlightWrite, setInFlightWrite] = useState<boolean>(false)
  const [writeSuccess, setWriteSuccess] = useState<boolean | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleDeposit = () => {
    setInFlightWrite(true)
    setWriteSuccess(null)
    playPacketTransmitSound()
    const amount = 50
    const newBal = balance + amount

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (isPartitioned) {
        if (mode === 'CP') {
          // CP Mode: Must reject write to maintain consistency across partition
          setWriteSuccess(false)
          playNodeCrashSound()
          setLastEvent(
            `❌ CP REJECTION: Network partitioned! Node A cannot reach quorum with Node B. Deposit of $${amount} REFUSED to guarantee consistency.`
          )
        } else {
          // AP Mode: Accept write on Node A, but Node B becomes stale
          setBalance(newBal)
          setWriteSuccess(true)
          playTradeMatchSound()
          setLastEvent(
            `⚠️ AP ACCEPTANCE: Node A accepted $${amount} (New balance: $${newBal}). But Node B is partitioned and STALE ($${nodeBBalance})!`
          )
        }
      } else {
        // Normal operation: Replicated immediately
        setBalance(newBal)
        setNodeBBalance(newBal)
        setWriteSuccess(true)
        playSuccessChimeSound()
        setLastEvent(`✅ Synced write of $${amount} committed to both Node A and Node B. Balance: $${newBal}`)
      }
      setInFlightWrite(false)
    }, 700)
  }

  const handleHealOrCut = () => {
    if (isPartitioned) {
      // Healing partition: Reconcile state
      setIsPartitioned(false)
      setNodeBBalance(balance)
      playSuccessChimeSound()
      setLastEvent(`⚡ Partition HEALED: Node B synchronized with Node A via Anti-Entropy Merkle tree reconciliation.`)
    } else {
      setIsPartitioned(true)
      playNodeCrashSound()
      setLastEvent(`🚨 NETWORK SPLIT: Network switch failure isolated Node A from Node B!`)
    }
  }

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070a12] p-6 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 rounded-full bg-sky-400 animate-pulse" />
            <h4 className="font-mono text-[13px] font-bold tracking-wider text-sky-400 uppercase">
              Interactive CAP & PACELC Simulator
            </h4>
          </div>
          <p className="text-[12px] text-text-muted mt-0.5">
            Watch how distributed nodes behave when a network partition severs inter-node communication.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-text-muted">Strategy:</span>
          <div className="flex rounded-lg bg-bg-surface-1 p-0.5 ring-1 ring-border text-[11px] font-mono">
            <button
              onClick={() => setMode('CP')}
              className={`rounded px-2.5 py-1 transition ${
                mode === 'CP' ? 'bg-sky-500 font-bold text-black' : 'text-text-muted hover:text-white'
              }`}
            >
              CP (Consistency)
            </button>
            <button
              onClick={() => setMode('AP')}
              className={`rounded px-2.5 py-1 transition ${
                mode === 'AP' ? 'bg-amber-400 font-bold text-black' : 'text-text-muted hover:text-white'
              }`}
            >
              AP (Availability)
            </button>
          </div>
        </div>
      </div>

      {/* Simulator Stage */}
      <div className="relative my-6 flex flex-col md:flex-row items-center justify-between gap-6 rounded-xl bg-black/40 p-6 ring-1 ring-border/60 overflow-hidden">
        {/* Background Network Grid */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* Client */}
        <div className="z-10 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30">
            <Activity className="size-7" />
          </div>
          <span className="mt-2 text-[12px] font-bold">Banking Client</span>
          <span className="text-[10px] font-mono text-text-muted">Sends Writes</span>
          <button
            onClick={handleDeposit}
            disabled={inFlightWrite}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-[11px] font-bold text-black shadow-md hover:bg-sky-400 active:scale-95 disabled:opacity-50"
          >
            <Zap className="size-3.5 fill-current" /> Deposit $50
          </button>
        </div>

        {/* Wire 1: Client to Node A */}
        <div className="relative flex-1 h-1 w-full md:w-auto bg-border flex items-center justify-center">
          {inFlightWrite && (
            <div className="absolute size-3 rounded-full bg-sky-400 shadow-[0_0_12px_#38bdf8] animate-ping" />
          )}
          <span className="absolute -top-5 text-[10px] font-mono text-text-muted">POST /deposit</span>
        </div>

        {/* Node A (Primary) */}
        <div
          className={`z-10 flex flex-col items-center rounded-2xl p-4 text-center ring-1 transition-all ${
            writeSuccess === true
              ? 'bg-emerald-500/10 ring-emerald-500/50'
              : writeSuccess === false
              ? 'bg-rose-500/10 ring-rose-500/50'
              : 'bg-bg-surface-2 ring-border'
          }`}
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
            <Server className="size-6" />
          </div>
          <span className="mt-2 text-[12px] font-bold">Replica Node A</span>
          <span className="font-mono text-[13px] font-extrabold text-emerald-400 mt-1">${balance}</span>
          <span className="text-[10px] font-mono text-text-muted">Primary Leader</span>
        </div>

        {/* Replication Wire between Node A and Node B (The Partition Zone) */}
        <div className="relative flex-1 h-1.5 w-full md:w-auto flex items-center justify-center">
          {isPartitioned ? (
            <div className="flex flex-col items-center gap-1">
              <div className="h-10 w-1 bg-rose-500 animate-pulse shadow-[0_0_12px_#f43f5e]" />
              <div className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-400 ring-1 ring-rose-500/40">
                PARTITION CUT
              </div>
            </div>
          ) : (
            <div className="w-full h-1 bg-sky-500/50 flex items-center justify-center">
              <span className="text-[10px] font-mono text-sky-400 bg-black/60 px-2 py-0.5 rounded">
                Sync Replication
              </span>
            </div>
          )}
        </div>

        {/* Node B (Secondary) */}
        <div
          className={`z-10 flex flex-col items-center rounded-2xl p-4 text-center ring-1 transition-all ${
            isPartitioned && mode === 'AP' && nodeBBalance !== balance
              ? 'bg-amber-500/10 ring-amber-500/50 animate-pulse'
              : 'bg-bg-surface-2 ring-border'
          }`}
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <Server className="size-6" />
          </div>
          <span className="mt-2 text-[12px] font-bold">Replica Node B</span>
          <span
            className={`font-mono text-[13px] font-extrabold mt-1 ${
              isPartitioned && nodeBBalance !== balance ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            ${nodeBBalance}
          </span>
          <span className="text-[10px] font-mono text-text-muted">
            {isPartitioned && nodeBBalance !== balance ? 'STALE DATA' : 'Follower'}
          </span>
        </div>
      </div>

      {/* Control Bar & Live Event Log */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={handleHealOrCut}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold transition shadow-lg ${
            isPartitioned
              ? 'bg-emerald-500 text-black hover:bg-emerald-400'
              : 'bg-rose-500 text-white hover:bg-rose-600'
          }`}
        >
          <RefreshCw className="size-4" />
          {isPartitioned ? 'Heal Network Link' : 'Sever Network Partition (Cut Wire)'}
        </button>

        <div className="flex-1 rounded-xl bg-black/60 p-3 ring-1 ring-border text-[12px] font-mono text-text-secondary">
          <span className="text-sky-400 font-bold">Live Status: </span>
          {lastEvent}
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 2. TWO-PHASE COMMIT (2PC) ANIMATOR
// ==========================================
export const TwoPhaseCommitAnimator: React.FC = () => {
  const [phase, setPhase] = useState<'IDLE' | 'PREPARE' | 'VOTING' | 'COMMIT' | 'ABORT'>('IDLE')
  const [simulateFail, setSimulateFail] = useState<boolean>(false)
  const [dbVotes, setDbVotes] = useState<Record<string, 'PENDING' | 'YES' | 'NO'>>({
    db1: 'PENDING',
    db2: 'PENDING',
    db3: 'PENDING',
  })
  const [log, setLog] = useState<string>('Click "Execute Distributed Transaction" to start 2PC protocol.')
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t))
    timeoutsRef.current = []
  }

  useEffect(() => {
    return () => clearAllTimeouts()
  }, [])

  const runTransaction = () => {
    clearAllTimeouts()
    setPhase('PREPARE')
    setDbVotes({ db1: 'PENDING', db2: 'PENDING', db3: 'PENDING' })
    setLog('Phase 1 (PREPARE): Coordinator broadcasts PREPARE query and acquires row locks.')
    playPacketTransmitSound()

    const t1 = setTimeout(() => {
      setPhase('VOTING')
      const db2Vote = simulateFail ? 'NO' : 'YES'
      setDbVotes({ db1: 'YES', db2: db2Vote, db3: 'YES' })
      playStepClickSound()
      setLog(
        simulateFail
          ? 'Phase 1 Voting: DB2 returned VOTE_ABORT due to constraint failure! Quorum not reached.'
          : 'Phase 1 Voting: All 3 participants successfully replied VOTE_COMMIT.'
      )

      const t2 = setTimeout(() => {
        if (simulateFail) {
          setPhase('ABORT')
          playNodeCrashSound()
          setLog('Phase 2 (GLOBAL_ROLLBACK): Coordinator sends ROLLBACK. All participants release locks safely.')
        } else {
          setPhase('COMMIT')
          playSuccessChimeSound()
          setLog('Phase 2 (GLOBAL_COMMIT): Coordinator sends COMMIT. All participants write to disk WAL and ACK.')
        }
      }, 1000)
      timeoutsRef.current.push(t2)
    }, 1000)
    timeoutsRef.current.push(t1)
  }

  const reset = () => {
    clearAllTimeouts()
    playStepClickSound()
    setPhase('IDLE')
    setDbVotes({ db1: 'PENDING', db2: 'PENDING', db3: 'PENDING' })
    setLog('Ready to start transaction.')
  }

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-b from-[#0e091c] to-[#07050e] p-6 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 rounded-full bg-purple-400 animate-pulse" />
            <h4 className="font-mono text-[13px] font-bold tracking-wider text-purple-400 uppercase">
              Two-Phase Commit (2PC) Protocol Visualizer
            </h4>
          </div>
          <p className="text-[12px] text-text-muted mt-0.5">
            Atomic all-or-nothing guarantee across distributed databases via Prepare and Commit phases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-[11px] font-mono text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={simulateFail}
              onChange={(e) => setSimulateFail(e.target.checked)}
              className="size-3.5 rounded accent-purple-500"
            />
            Simulate DB2 Abort Failure
          </label>
        </div>
      </div>

      {/* Visual Canvas */}
      <div className="my-6 rounded-xl bg-black/40 p-6 ring-1 ring-border">
        {/* Phase Pill Tracker */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {['PREPARE', 'VOTING', simulateFail ? 'ABORT' : 'COMMIT'].map((p) => {
            const isActive = phase === p
            return (
              <span
                key={p}
                className={`rounded-full px-3 py-1 font-mono text-[10.5px] font-bold transition ${
                  isActive
                    ? p === 'ABORT'
                      ? 'bg-rose-500 text-white shadow-[0_0_12px_#f43f5e]'
                      : 'bg-purple-500 text-white shadow-[0_0_12px_#a855f7]'
                    : 'bg-bg-surface-2 text-text-muted'
                }`}
              >
                {p}
              </span>
            )
          })}
        </div>

        {/* Coordinator Node */}
        <div className="flex flex-col items-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50 shadow-lg">
            <Layers className="size-7" />
          </div>
          <span className="mt-1 text-[12px] font-bold">Transaction Coordinator</span>
          <span className="text-[10px] font-mono text-text-muted">Manages 2PC State Machine</span>
        </div>

        {/* Branching SVG Wires */}
        <div className="my-3 h-10 w-full relative">
          <svg className="size-full overflow-visible pointer-events-none" viewBox="0 0 300 40" preserveAspectRatio="none">
            {/* Wires from Coordinator (150, 0) to 3 DBs (50, 40), (150, 40), (250, 40) */}
            {[50, 150, 250].map((destX, i) => (
              <g key={i}>
                <line
                  x1="150"
                  y1="0"
                  x2={destX}
                  y2="40"
                  stroke={
                    phase === 'ABORT' && i === 1
                      ? '#f43f5e'
                      : phase === 'COMMIT'
                      ? '#10b981'
                      : '#a855f7'
                  }
                  strokeWidth="2"
                  strokeDasharray={phase !== 'IDLE' ? '6 6' : '3 3'}
                  className={phase !== 'IDLE' ? 'animate-flow-dash' : ''}
                  opacity={phase !== 'IDLE' ? 0.9 : 0.4}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* 3 Participant DBs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'db1', name: 'Order DB' },
            { id: 'db2', name: 'Inventory DB' },
            { id: 'db3', name: 'Payment DB' },
          ].map((db) => {
            const vote = dbVotes[db.id]
            return (
              <div
                key={db.id}
                className={`flex flex-col items-center rounded-xl p-3.5 text-center ring-1 transition-all ${
                  vote === 'YES'
                    ? 'bg-emerald-500/10 ring-emerald-500/40'
                    : vote === 'NO'
                    ? 'bg-rose-500/10 ring-rose-500/40'
                    : 'bg-bg-surface-2 ring-border'
                }`}
              >
                <Database className="size-5 text-text-muted mb-1" />
                <span className="text-[11.5px] font-bold">{db.name}</span>
                <span className="text-[10px] font-mono text-text-muted">Participant</span>

                <div className="mt-2 text-[10px] font-mono font-bold">
                  {vote === 'PENDING' && <span className="text-text-muted">Waiting...</span>}
                  {vote === 'YES' && <span className="text-emerald-400">VOTE: COMMIT ✅</span>}
                  {vote === 'NO' && <span className="text-rose-400">VOTE: ABORT ❌</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Control and Logs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={runTransaction}
            disabled={phase === 'PREPARE' || phase === 'VOTING'}
            className="flex items-center gap-1.5 rounded-xl bg-purple-500 px-4 py-2 text-[12px] font-bold text-white shadow-lg hover:bg-purple-400 disabled:opacity-50"
          >
            <Play className="size-3.5 fill-current" /> Execute Distributed Transaction
          </button>
          <button
            onClick={reset}
            className="rounded-xl bg-bg-surface-1 p-2 text-text-muted hover:text-white ring-1 ring-border"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        <div className="flex-1 rounded-xl bg-black/60 p-3 ring-1 ring-border text-[12px] font-mono text-purple-300">
          {log}
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 3. LSM-TREE VS B+ TREE ANIMATOR
// ==========================================
export const LsmTreeVsBTreeAnimator: React.FC = () => {
  const [engineType, setEngineType] = useState<'LSM' | 'BTREE'>('LSM')
  const [memTable, setMemTable] = useState<string[]>(['user:101', 'user:102'])
  const [sstableL0, setSstableL0] = useState<string[]>(['user:01', 'user:05', 'user:09'])
  const [isFlushing, setIsFlushing] = useState<boolean>(false)
  const [log, setLog] = useState<string>('LSM Engine: Fast append-only writes to RAM MemTable and WAL disk.')
  const [btreeRoot, setBtreeRoot] = useState<number[]>([30])
  const [btreeLeaves, setBtreeLeaves] = useState<number[][]>([[10, 20], [30, 45]])
  const [btreeSplits, setBtreeSplits] = useState<number>(0)
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current)
    }
  }, [])

  const handleInsert = () => {
    playStepClickSound()
    const nextKey = `user:${Math.floor(Math.random() * 890 + 100)}`
    if (memTable.length >= 4) {
      // Trigger flush
      setIsFlushing(true)
      setLog(`MemTable threshold exceeded (4 items). Flushing sorted immutable run to SSTable Level 0 on NVMe...`)
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current)
      flushTimeoutRef.current = setTimeout(() => {
        playTradeMatchSound()
        setSstableL0((prev) => [...prev, ...memTable].sort())
        setMemTable([nextKey])
        setIsFlushing(false)
        setLog(`Flush complete! Appended key ${nextKey} to fresh in-memory MemTable.`)
      }, 900)
    } else {
      setMemTable((prev) => [...prev, nextKey].sort())
      setLog(`Sequential write: ${nextKey} appended to WAL and inserted into SkipList MemTable in O(log N).`)
    }
  }

  const handleBtreeInsert = () => {
    playStepClickSound()
    const newKey = Math.floor(Math.random() * 75 + 12)
    const targetIdx = newKey >= (btreeRoot[0] || 0) ? btreeLeaves.length - 1 : 0
    const currentLeaf = [...(btreeLeaves[targetIdx] || [10])]

    if (!currentLeaf.includes(newKey)) {
      currentLeaf.push(newKey)
      currentLeaf.sort((a, b) => a - b)
    }

    if (currentLeaf.length > 3) {
      playTradeMatchSound()
      const mid = currentLeaf[Math.floor(currentLeaf.length / 2)]
      const leftPart = currentLeaf.slice(0, 2)
      const rightPart = currentLeaf.slice(2)
      setBtreeLeaves([leftPart, rightPart])
      setBtreeRoot([mid])
      setBtreeSplits((s) => s + 1)
      setLog(`⚡ B+ Tree Leaf Overflow! Leaf page split into 2 disk blocks. Promoted pivot [${mid}] to Root directory index.`)
    } else {
      const updated = [...btreeLeaves]
      updated[targetIdx] = currentLeaf
      setBtreeLeaves(updated)
      setLog(`In-Place Page Rewrite: Key [${newKey}] written to 4KB Disk Leaf Page #${targetIdx + 1} (incurred random disk I/O).`)
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#091510] to-[#050b08] p-6 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h4 className="font-mono text-[13px] font-bold tracking-wider text-emerald-400 uppercase">
              Storage Engine Internals: LSM-Tree vs B+ Tree
            </h4>
          </div>
          <p className="text-[12px] text-text-muted mt-0.5">
            Visualize how write amplification, disk sequential I/O, and SSTable compaction compare.
          </p>
        </div>

        <div className="flex rounded-lg bg-bg-surface-1 p-0.5 ring-1 ring-border text-[11px] font-mono">
          <button
            onClick={() => {
              playStepClickSound()
              setEngineType('LSM')
              setLog('LSM Engine selected: RocksDB / Cassandra append-only design.')
            }}
            className={`rounded px-3 py-1 transition ${
              engineType === 'LSM' ? 'bg-emerald-500 font-bold text-black' : 'text-text-muted hover:text-white'
            }`}
          >
            LSM-Tree (RocksDB)
          </button>
          <button
            onClick={() => {
              playStepClickSound()
              setEngineType('BTREE')
              setLog('B+ Tree selected: PostgreSQL / MySQL InnoDB page updates.')
            }}
            className={`rounded px-3 py-1 transition ${
              engineType === 'BTREE' ? 'bg-emerald-500 font-bold text-black' : 'text-text-muted hover:text-white'
            }`}
          >
            B+ Tree (InnoDB)
          </button>
        </div>
      </div>

      {engineType === 'LSM' ? (
        <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* In-Memory Tier */}
          <div className="rounded-xl bg-black/40 p-4 ring-1 ring-emerald-500/30">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <span className="text-[12px] font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="size-4" /> In-Memory MemTable (RAM)
              </span>
              <span className="font-mono text-[11px] text-text-muted">{memTable.length}/4 entries</span>
            </div>

            <div className="space-y-2">
              {memTable.map((k, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-[12px] font-mono text-emerald-300 ring-1 ring-emerald-500/30 animate-fadeIn"
                >
                  <span>{k}</span>
                  <span className="text-[10px] text-emerald-400/70">O(1) RAM lookup</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleInsert}
              disabled={isFlushing}
              className="mt-4 w-full rounded-lg bg-emerald-500 py-2 text-[11.5px] font-bold text-black shadow-md hover:bg-emerald-400 disabled:opacity-50"
            >
              + Write New Key-Value Pair (Sequential I/O)
            </button>
          </div>

          {/* On-Disk SSTable Tier */}
          <div className="rounded-xl bg-black/40 p-4 ring-1 ring-border">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <span className="text-[12px] font-bold text-text-primary flex items-center gap-1.5">
                <Database className="size-4 text-sky-400" /> Persistent SSTables (NVMe Disk)
              </span>
              <span className="font-mono text-[11px] text-text-muted">Level 0 Sorted Run</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {sstableL0.map((k, i) => (
                <span
                  key={i}
                  className="rounded-md bg-sky-500/10 px-2.5 py-1 font-mono text-[11px] text-sky-300 ring-1 ring-sky-500/30"
                >
                  {k}
                </span>
              ))}
            </div>

            <div className="mt-4 rounded-lg bg-bg-surface-1 p-3 text-[11px] text-text-muted space-y-1">
              <p>• Fast Bloom Filters check file presence before reading disk blocks.</p>
              <p>• Background Compaction continuously purges overwrites into Level 1.</p>
            </div>
          </div>
        </div>
      ) : (
        /* Interactive B+ Tree View */
        <div className="my-6 rounded-xl bg-black/40 p-6 ring-1 ring-border space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Layers className="size-5" />
              <span className="font-bold text-[13px]">B+ Tree 4KB-16KB Disk Page Hierarchy</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
              <span>Page Splits: <strong className="text-amber-400">{btreeSplits}</strong></span>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-300 ring-1 ring-amber-500/30">
                Random Disk I/O: High
              </span>
            </div>
          </div>

          {/* Tree Diagram */}
          <div className="flex flex-col items-center space-y-4">
            {/* Root Page */}
            <div className="flex flex-col items-center">
              <span className="text-[9.5px] font-mono text-text-muted uppercase mb-1">Root Directory Page</span>
              <div className="flex gap-1.5 rounded-xl bg-sky-500/20 p-2.5 ring-1 ring-sky-500/50 shadow-md">
                {btreeRoot.map((k, i) => (
                  <span key={i} className="rounded bg-sky-500 px-3 py-1 font-mono text-[12px] font-bold text-black shadow">
                    [{k}]
                  </span>
                ))}
              </div>
            </div>

            {/* Tree Branch Connectors */}
            <div className="h-6 w-48 relative">
              <svg className="size-full overflow-visible pointer-events-none" viewBox="0 0 100 24">
                <line x1="50" y1="0" x2="20" y2="24" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="50" y1="0" x2="80" y2="24" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 3" />
              </svg>
            </div>

            {/* Leaf Pages Linked Horizontally */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {btreeLeaves.map((leaf, leafIdx) => (
                <div key={leafIdx} className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/40 text-center space-y-1 shadow-md">
                    <span className="text-[9.5px] font-mono text-emerald-400 block font-bold">
                      Leaf Page #{leafIdx + 1}
                    </span>
                    <div className="flex gap-1">
                      {leaf.map((k, kIdx) => (
                        <span key={kIdx} className="rounded bg-emerald-500/20 px-2 py-1 font-mono text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  {leafIdx < btreeLeaves.length - 1 && (
                    <span className="font-mono text-emerald-400 font-bold text-[13px] animate-pulse">
                      ⇄
                    </span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              Leaf pages form a continuous Doubly-Linked List (⇄) for fast sequential range scans ($O(K)$).
            </span>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={handleBtreeInsert}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-[12px] font-bold text-black shadow hover:bg-emerald-400 active:scale-95"
            >
              + Write Key (Simulate In-Place Disk Page Write & Page Split)
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-black/60 p-3 ring-1 ring-border text-[12px] font-mono text-emerald-300">
        <span className="text-emerald-400 font-bold">Engine Activity: </span> {log}
      </div>
    </div>
  )
}

// ==========================================
// 4. CACHE EVICTION & STAMPEDE ANIMATOR
// ==========================================
export const CacheEvictionAndStampedeAnimator: React.FC = () => {
  const [cache, setCache] = useState<string[]>(['Key_A', 'Key_B', 'Key_C', 'Key_D'])
  const [log, setLog] = useState<string>('Cache capacity: 4 slots. Double-linked list maintains LRU order.')
  const [isStampedeActive, setIsStampedeActive] = useState<boolean>(false)
  const stampedeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (stampedeTimeoutRef.current) clearTimeout(stampedeTimeoutRef.current)
    }
  }, [])

  const accessKey = (k: string) => {
    playStepClickSound()
    // Move to front (MRU)
    setCache((prev) => [k, ...prev.filter((item) => item !== k)])
    setLog(`Accessed [${k}]! Promoted to Head (MRU - Most Recently Used).`)
  }

  const insertNewKey = () => {
    playStepClickSound()
    const newKey = `Key_${String.fromCharCode(65 + Math.floor(Math.random() * 26))}_${Math.floor(Math.random() * 99)}`
    setCache((prev) => {
      const evicted = prev[prev.length - 1]
      const updated = [newKey, ...prev.slice(0, 3)]
      setLog(`Cache Full! Evicted [${evicted}] from Tail (LRU). Inserted [${newKey}] at Head.`)
      return updated
    })
  }

  const simulateStampede = () => {
    setIsStampedeActive(true)
    playNodeCrashSound()
    setLog(`🚨 50 Concurrent threads requested expired key 'HOT_DEAL'! Singleflight mutex locks 1 DB query, 49 threads wait on channel.`)
    if (stampedeTimeoutRef.current) clearTimeout(stampedeTimeoutRef.current)
    stampedeTimeoutRef.current = setTimeout(() => {
      setIsStampedeActive(false)
      playSuccessChimeSound()
      accessKey('HOT_DEAL')
      setLog(`✅ Database queried ONCE (10ms). Hot key cached in Redis. 50 requests served without database overload!`)
    }, 1200)
  }

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-[#161108] to-[#0a0703] p-6 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h4 className="font-mono text-[13px] font-bold tracking-wider text-amber-400 uppercase">
              Cache Eviction & Stampede Simulator
            </h4>
          </div>
          <p className="text-[12px] text-text-muted mt-0.5">
            Visualize LRU doubly-linked list ordering and mutex-protected singleflight stampede mitigation.
          </p>
        </div>

        <button
          onClick={simulateStampede}
          disabled={isStampedeActive}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-[11.5px] font-bold text-black shadow hover:bg-amber-400 disabled:opacity-50"
        >
          <Zap className="size-3.5 fill-current" /> Simulate Cache Stampede
        </button>
      </div>

      {/* Visual Singleflight Stampede Gate Banner (when stampede is active) */}
      {isStampedeActive && (
        <div className="my-4 rounded-xl bg-amber-500/10 p-4 ring-1 ring-amber-500/40 animate-fadeIn space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
              <Shield className="size-4 text-amber-400 animate-pulse" /> Singleflight Mutex Gate (50 Requests Coalesced)
            </span>
            <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono text-rose-300 ring-1 ring-rose-500/30 font-bold">
              1 DB Query In Flight
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] font-mono">
            <div className="rounded-lg bg-black/50 p-2.5 ring-1 ring-border text-center space-y-1">
              <span className="text-text-muted text-[10px] block">Incoming Stampede</span>
              <span className="text-amber-400 font-bold block text-[13px]">50 Threads</span>
              <span className="text-text-muted text-[9.5px]">Requesting 'HOT_DEAL'</span>
            </div>
            <div className="rounded-lg bg-amber-500/20 p-2.5 ring-1 ring-amber-500/50 text-center space-y-1">
              <span className="text-amber-300 text-[10px] block font-bold">Singleflight Mutex</span>
              <span className="text-white font-bold block text-[13px]">1 Lock Holder</span>
              <span className="text-amber-300 text-[9.5px]">49 Waiting on sync.WaitGroup</span>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-2.5 ring-1 ring-emerald-500/30 text-center space-y-1">
              <span className="text-emerald-400 text-[10px] block font-bold">Origin DB Impact</span>
              <span className="text-emerald-300 font-bold block text-[13px]">1 Query (10ms)</span>
              <span className="text-emerald-400 text-[9.5px]">49 Avoided DB Crashes!</span>
            </div>
          </div>
        </div>
      )}

      {/* Cache Slots View */}
      <div className="my-6 rounded-xl bg-black/40 p-6 ring-1 ring-border">
        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mb-3">
          <span className="text-emerald-400 font-bold">← HEAD (Most Recently Used)</span>
          <span className="text-rose-400 font-bold">TAIL (Least Recently Used) →</span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {cache.map((key, i) => (
            <button
              key={key}
              onClick={() => accessKey(key)}
              className="flex flex-col items-center justify-center rounded-xl bg-amber-500/10 p-4 ring-1 ring-amber-500/30 transition hover:bg-amber-500/25 active:scale-95 group"
            >
              <span className="text-[10px] font-mono text-text-muted group-hover:text-amber-400">Slot #{i + 1}</span>
              <span className="text-[13px] font-mono font-bold text-amber-300 mt-1">{key}</span>
              <span className="text-[9.5px] text-text-muted mt-1">Click to Access</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center">
          <button
            onClick={insertNewKey}
            className="rounded-lg bg-bg-surface-2 px-4 py-1.5 text-[11.5px] font-semibold text-text-primary ring-1 ring-border hover:bg-bg-surface-3 active:scale-95"
          >
            + Insert Key to Trigger LRU Eviction
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-black/60 p-3 ring-1 ring-border text-[12px] font-mono text-amber-300">
        <span className="text-amber-400 font-bold">Cache Event: </span> {log}
      </div>
    </div>
  )
}

// ==========================================
// 5. RAFT CONSENSUS LEADER ELECTION ANIMATOR
// ==========================================
export const RaftConsensusAnimator: React.FC = () => {
  const [leaderId, setLeaderId] = useState<number | null>(1)
  const [term, setTerm] = useState<number>(1)
  const [isElecting, setIsElecting] = useState<boolean>(false)
  const [isReplicating, setIsReplicating] = useState<boolean>(false)
  const [committedEntries, setCommittedEntries] = useState<string[]>(['x=10', 'x=25'])
  const [log, setLog] = useState<string>('Node 1 is the elected Leader in Term 1, pulsing periodic heartbeats.')
  const electionTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearElectionTimeouts = () => {
    electionTimeoutsRef.current.forEach((t) => clearTimeout(t))
    electionTimeoutsRef.current = []
  }

  useEffect(() => {
    return () => clearElectionTimeouts()
  }, [])

  const triggerElection = () => {
    clearElectionTimeouts()
    setIsElecting(true)
    setLeaderId(null)
    playNodeCrashSound()
    const nextTerm = term + 1
    setTerm(nextTerm)
    setLog(`Leader crashed! Node 2 election timeout fired. Transitions to CANDIDATE for Term ${nextTerm}.`)

    const t1 = setTimeout(() => {
      playPacketTransmitSound()
      setLog(`Node 2 broadcasted RequestVote RPCs to Node 1 and Node 3. Received 2/3 votes (Quorum achieved).`)
      const t2 = setTimeout(() => {
        setLeaderId(2)
        setIsElecting(false)
        playSuccessChimeSound()
        setLog(`🎉 Node 2 elected LEADER for Term ${nextTerm}! Broadcasting AppendEntries heartbeats.`)
      }, 900)
      electionTimeoutsRef.current.push(t2)
    }, 900)
    electionTimeoutsRef.current.push(t1)
  }

  const handleClientWrite = () => {
    if (!leaderId || isElecting || isReplicating) return
    setIsReplicating(true)
    playPacketTransmitSound()
    const nextVal = `x=${Math.floor(Math.random() * 80 + 30)}`
    setLog(`1/3: Client sent write [${nextVal}] to Leader (Node ${leaderId}). Leader writes to uncommitted WAL...`)

    const t1 = setTimeout(() => {
      playStepClickSound()
      setLog(`2/3: Leader broadcasted AppendEntries to Follower nodes. 2/3 ACKs received (Quorum reached!).`)
      const t2 = setTimeout(() => {
        setCommittedEntries((prev) => [...prev, nextVal])
        setIsReplicating(false)
        playSuccessChimeSound()
        setLog(`3/3: Entry [${nextVal}] COMMITTED to State Machine! Returned HTTP 200 OK to Client.`)
      }, 700)
      electionTimeoutsRef.current.push(t2)
    }, 800)
    electionTimeoutsRef.current.push(t1)
  }

  return (
    <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-b from-[#170a0d] to-[#0b0507] p-6 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 rounded-full bg-rose-400 animate-pulse" />
            <h4 className="font-mono text-[13px] font-bold tracking-wider text-rose-400 uppercase">
              Raft Consensus Leader Election & Quorum Simulator
            </h4>
          </div>
          <p className="text-[12px] text-text-muted mt-0.5">
            Leader election timeouts, candidate request vote RPCs, quorum validation, and heartbeat broadcasting.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <div className="rounded-md bg-rose-500/20 px-3 py-1 font-bold text-rose-300 ring-1 ring-rose-500/40">
            Current Term: {term}
          </div>
          <div className="rounded-md bg-bg-surface-1 px-2.5 py-1 text-text-muted ring-1 ring-border">
            Committed Log: [{committedEntries.join(', ')}]
          </div>
        </div>
      </div>

      {/* Nodes Display */}
      <div className="my-6 grid grid-cols-3 gap-6 relative">
        {[1, 2, 3].map((id) => {
          const isLeader = leaderId === id
          const isCandidate = isElecting && id === 2

          return (
            <div
              key={id}
              className={`relative flex flex-col items-center rounded-2xl p-5 text-center ring-1 transition-all ${
                isLeader
                  ? 'bg-amber-500/10 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                  : isCandidate
                  ? 'bg-rose-500/20 ring-rose-400 animate-pulse'
                  : 'bg-bg-surface-2 ring-border'
              }`}
            >
              {/* Leader Heartbeat Radar Ring */}
              {isLeader && (
                <div className="absolute -inset-1 rounded-2xl bg-amber-400/20 blur-sm animate-pulse pointer-events-none" />
              )}

              <div
                className={`flex size-14 items-center justify-center rounded-2xl transition-all ${
                  isLeader
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30'
                    : isCandidate
                    ? 'bg-rose-500 text-white'
                    : 'bg-bg-surface-3 text-text-muted'
                }`}
              >
                <Server className="size-7" />
              </div>
              <span className="mt-2 text-[13px] font-bold">Node {id}</span>
              <span
                className={`text-[10.5px] font-mono font-bold mt-0.5 ${
                  isLeader ? 'text-amber-400' : isCandidate ? 'text-rose-400' : 'text-text-muted'
                }`}
              >
                {isLeader ? '👑 LEADER' : isCandidate ? 'CANDIDATE' : 'FOLLOWER'}
              </span>

              {/* Log State for this Node */}
              <div className="mt-2 rounded bg-black/50 px-2 py-0.5 text-[9.5px] font-mono text-text-muted">
                Log Index: #{committedEntries.length}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={triggerElection}
            disabled={isElecting || isReplicating}
            className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-[12px] font-bold text-white shadow-lg hover:bg-rose-400 active:scale-95 disabled:opacity-50"
          >
            <Play className="size-3.5 fill-current" /> Trigger Leader Failure & Election
          </button>
          <button
            onClick={handleClientWrite}
            disabled={isElecting || isReplicating || !leaderId}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-[12px] font-bold text-black shadow-lg hover:bg-amber-400 active:scale-95 disabled:opacity-50"
          >
            <Zap className="size-3.5 fill-current" /> Client Write (Quorum Log Commit)
          </button>
        </div>

        <div className="flex-1 rounded-xl bg-black/60 p-3 ring-1 ring-border text-[12px] font-mono text-rose-300">
          <span className="text-rose-400 font-bold">Raft Event: </span> {log}
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 6. TOKEN BUCKET RATE LIMITER ANIMATOR
// ==========================================
export const RateLimiterTokenBucketAnimator: React.FC = () => {
  const [tokens, setTokens] = useState<number>(7)
  const capacity = 10
  const [log, setLog] = useState<string>('Refill rate: 1 token/sec. Bucket capacity: 10 tokens.')
  const [lastStatus, setLastStatus] = useState<'ALLOWED' | 'REJECTED' | null>(null)

  // Token refill timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTokens((prev) => Math.min(capacity, prev + 1))
    }, 1500)
    return () => clearInterval(timer)
  }, [])

  const handleRequest = (cost = 1) => {
    if (tokens >= cost) {
      setTokens((prev) => prev - cost)
      setLastStatus('ALLOWED')
      playStepClickSound()
      setLog(`✅ Request ALLOWED! Consumed ${cost} token(s). Tokens remaining: ${tokens - cost}`)
    } else {
      setLastStatus('REJECTED')
      playNodeCrashSound()
      setLog(`❌ HTTP 429 Too Many Requests! Bucket empty (0 tokens). Retry-After: 1.5s`)
    }
  }

  const handleBurst = () => {
    handleRequest(5)
  }

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#08131a] to-[#04090d] p-6 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h4 className="font-mono text-[13px] font-bold tracking-wider text-cyan-400 uppercase">
              Token Bucket Rate Limiter Simulator
            </h4>
          </div>
          <p className="text-[12px] text-text-muted mt-0.5">
            Visualize steady refill rates, burst absorption, and HTTP 429 backpressure rejection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-text-muted">Bucket Level:</span>
          <span className="font-mono text-[13px] font-extrabold text-cyan-400">
            {tokens} / {capacity}
          </span>
        </div>
      </div>

      {/* Bucket Visual Stage */}
      <div className="my-6 flex flex-col md:flex-row items-center justify-around gap-6 rounded-xl bg-black/40 p-6 ring-1 ring-border">
        {/* Token Bucket Container */}
        <div className="flex flex-col items-center">
          <div className="relative h-44 w-28 rounded-b-2xl border-2 border-t-0 border-cyan-500/40 bg-black/50 p-2 flex flex-col-reverse justify-start gap-1 overflow-hidden">
            {Array.from({ length: tokens }).map((_, i) => (
              <div
                key={i}
                className="h-3 w-full rounded bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-fadeIn transition-all"
              />
            ))}
          </div>
          <span className="mt-2 text-[12px] font-bold">Token Bucket</span>
          <span className="text-[10px] font-mono text-cyan-400/80">+1 token / 1.5s</span>
        </div>

        {/* Request Evaluation Shield */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            className={`flex size-16 items-center justify-center rounded-2xl ring-2 transition-all ${
              lastStatus === 'ALLOWED'
                ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500 shadow-[0_0_20px_#10b981]'
                : lastStatus === 'REJECTED'
                ? 'bg-rose-500/20 text-rose-400 ring-rose-500 shadow-[0_0_20px_#f43f5e]'
                : 'bg-bg-surface-2 text-text-muted ring-border'
            }`}
          >
            {lastStatus === 'ALLOWED' ? (
              <CheckCircle2 className="size-8" />
            ) : lastStatus === 'REJECTED' ? (
              <XCircle className="size-8" />
            ) : (
              <Shield className="size-8" />
            )}
          </div>
          <span className="text-[12px] font-bold">API Gateway Rate Gate</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRequest(1)}
              className="rounded-lg bg-cyan-500 px-3.5 py-1.5 text-[11.5px] font-bold text-black shadow hover:bg-cyan-400 active:scale-95"
            >
              Send 1 Request
            </button>
            <button
              onClick={handleBurst}
              className="rounded-lg bg-bg-surface-1 px-3.5 py-1.5 text-[11.5px] font-bold text-text-primary ring-1 ring-border hover:bg-bg-surface-3 active:scale-95"
            >
              Send Burst (5 Req)
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-black/60 p-3 ring-1 ring-border text-[12px] font-mono text-cyan-300">
        <span className="text-cyan-400 font-bold">Evaluator Status: </span> {log}
      </div>
    </div>
  )
}

// ==========================================
// 7. CONSISTENT HASH RING & VIRTUAL NODES ANIMATOR
// ==========================================
export const ConsistentHashRingAnimator: React.FC = () => {
  const [useVnodes, setUseVnodes] = useState<boolean>(true)
  const [selectedKey, setSelectedKey] = useState<string>('user_94218')
  const [customInput, setCustomInput] = useState<string>('')
  const [removedNodeId, setRemovedNodeId] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [scanAngle, setScanAngle] = useState<number>(0)
  const [activeTarget, setActiveTarget] = useState<{ nodeId: string; angle: number } | null>(null)

  const baseNodes = [
    { id: 'node-a', name: 'Node Alpha (US-East)', color: '#00F0FF', ip: '10.0.1.10', baseAngle: 35 },
    { id: 'node-b', name: 'Node Beta (US-West)', color: '#A855F7', ip: '10.0.1.20', baseAngle: 110 },
    { id: 'node-c', name: 'Node Gamma (EU-Central)', color: '#10B981', ip: '10.0.1.30', baseAngle: 210 },
    { id: 'node-d', name: 'Node Delta (AP-South)', color: '#F59E0B', ip: '10.0.1.40', baseAngle: 305 },
  ]

  const activeNodes = baseNodes.filter((n) => n.id !== removedNodeId)

  const ringTokens: { id: string; nodeId: string; name: string; color: string; angle: number; isVnode: boolean }[] = []
  activeNodes.forEach((node) => {
    if (useVnodes) {
      const offsets = [0, 90, 180]
      offsets.forEach((offset, idx) => {
        const angle = (node.baseAngle + offset) % 360
        ringTokens.push({
          id: `${node.id}-v${idx}`,
          nodeId: node.id,
          name: `${node.name.split(' ')[1]}#${idx + 1}`,
          color: node.color,
          angle,
          isVnode: idx > 0,
        })
      })
    } else {
      ringTokens.push({
        id: `${node.id}-p`,
        nodeId: node.id,
        name: node.name.split(' ')[1],
        color: node.color,
        angle: node.baseAngle,
        isVnode: false,
      })
    }
  })

  ringTokens.sort((a, b) => a.angle - b.angle)

  const computeKeyAngle = (key: string) => {
    let hash = 5381
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) + hash + key.charCodeAt(i)
    }
    return Math.abs(hash) % 360
  }

  const activeKey = customInput.trim() || selectedKey
  const keyAngle = computeKeyAngle(activeKey)

  const targetToken =
    ringTokens.find((t) => t.angle >= keyAngle) ||
    ringTokens[0] || { nodeId: 'none', angle: 0, name: 'None', color: '#fff' }

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    }
  }, [])

  const handleLookup = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    setIsScanning(true)
    setScanAngle(keyAngle)
    setActiveTarget(null)
    playPacketTransmitSound()

    let curr = keyAngle
    const dest = targetToken.angle >= keyAngle ? targetToken.angle : targetToken.angle + 360
    scanIntervalRef.current = setInterval(() => {
      curr += 10
      if (curr >= dest) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
        setIsScanning(false)
        setActiveTarget({ nodeId: targetToken.nodeId, angle: targetToken.angle })
        playTradeMatchSound()
      } else {
        setScanAngle(curr % 360)
      }
    }, 20)
  }

  const getCoordinates = (angle: number, radius = 95) => {
    const rad = ((angle - 90) * Math.PI) / 180
    return {
      x: 130 + radius * Math.cos(rad),
      y: 130 + radius * Math.sin(rad),
    }
  }

  const keyCoords = getCoordinates(keyAngle, 95)
  const scanCoords = getCoordinates(scanAngle, 95)

  return (
    <div className="space-y-4 rounded-xl bg-bg-surface-2 p-5 ring-1 ring-border text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <span className="font-mono text-[11px] font-bold text-accent-brand uppercase tracking-wider block">
            Consistent Hashing Architecture
          </span>
          <h3 className="text-base font-bold text-text-primary">Consistent Hash Ring with Virtual Nodes</h3>
        </div>
        <button
          onClick={() => setUseVnodes(!useVnodes)}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold transition ring-1 ${
            useVnodes
              ? 'bg-purple-500/20 text-purple-300 ring-purple-500/40'
              : 'bg-bg-surface-1 text-text-muted ring-border'
          }`}
        >
          {useVnodes ? '✨ Virtual Nodes: ON (3 vnodes/server)' : 'Virtual Nodes: OFF (1:1)'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative size-[260px]">
            <svg viewBox="0 0 260 260" className="size-full overflow-visible">
              <circle
                cx="130"
                cy="130"
                r="95"
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {[0, 90, 180, 270].map((deg) => {
                const c = getCoordinates(deg, 108)
                return (
                  <text
                    key={deg}
                    x={c.x}
                    y={c.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-text-muted text-[8px] font-mono select-none"
                  >
                    {deg}°
                  </text>
                )
              })}

              {isScanning && (
                <line
                  x1="130"
                  y1="130"
                  x2={scanCoords.x}
                  y2={scanCoords.y}
                  stroke="#00F0FF"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
              )}

              {ringTokens.map((token) => {
                const coords = getCoordinates(token.angle, 95)
                const isTarget = activeTarget?.angle === token.angle
                return (
                  <g key={token.id} className="transition-all duration-300">
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={isTarget ? 7.5 : token.isVnode ? 4 : 5.5}
                      fill={token.color}
                      stroke={isTarget ? '#fff' : '#000'}
                      strokeWidth={isTarget ? 2 : 1.5}
                      style={{
                        filter: isTarget ? `drop-shadow(0 0 10px ${token.color})` : undefined,
                      }}
                    />
                    {isTarget && (
                      <g transform={`translate(${coords.x}, ${coords.y})`}>
                        <circle
                          cx="0"
                          cy="0"
                          r="14"
                          fill="none"
                          stroke={token.color}
                          strokeWidth="1.5"
                          opacity="0.8"
                          style={{
                            transformBox: 'fill-box',
                            transformOrigin: 'center',
                            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                          }}
                        />
                      </g>
                    )}
                    <text
                      x={getCoordinates(token.angle, 114).x}
                      y={getCoordinates(token.angle, 114).y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={token.color}
                      className="text-[8px] font-mono font-bold select-none drop-shadow"
                    >
                      {token.name}
                    </text>
                  </g>
                )
              })}

              <g>
                <circle
                  cx={keyCoords.x}
                  cy={keyCoords.y}
                  r="6"
                  fill="#F43F5E"
                  stroke="#fff"
                  strokeWidth="2"
                  className="shadow-xl"
                />
                <g transform={`translate(${keyCoords.x}, ${keyCoords.y})`}>
                  <circle
                    cx="0"
                    cy="0"
                    r="12"
                    fill="none"
                    stroke="#F43F5E"
                    strokeWidth="1.2"
                    opacity="0.8"
                    style={{
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                      animation: 'ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite',
                    }}
                  />
                </g>
              </g>

              <circle cx="130" cy="130" r="30" fill="rgba(10, 15, 25, 0.9)" stroke="var(--color-border)" strokeWidth="1" />
              <text x="130" y="126" textAnchor="middle" className="fill-text-muted text-[8px] font-mono uppercase">
                Tokens
              </text>
              <text x="130" y="138" textAnchor="middle" className="fill-accent-brand text-[9px] font-bold font-mono">
                2³² - 1
              </text>
            </svg>
          </div>
          <span className="text-[10px] font-mono text-text-muted mt-2 text-center">
            Clockwise traversal finds first replica token where token.angle ≥ key.angle
          </span>
        </div>

        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase text-text-muted block">
              Test Key Lookup
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['user_94218', 'session_tok', 'video_4k_98', 'cart_2039', 'order_882'].map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setSelectedKey(k)
                    setCustomInput('')
                    setActiveTarget(null)
                  }}
                  className={`rounded-md px-2 py-1 text-[11px] font-mono transition ${
                    activeKey === k
                      ? 'bg-accent-brand text-bg-base font-bold'
                      : 'bg-bg-surface-2 text-text-muted hover:text-text-primary ring-1 ring-border'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Custom key name..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="flex-1 rounded-lg bg-bg-surface-2 px-2.5 py-1 text-[11px] font-mono text-text-primary ring-1 ring-border focus:ring-accent-brand focus:outline-none"
              />
              <button
                onClick={handleLookup}
                disabled={isScanning}
                className="rounded-lg bg-accent-brand px-3 py-1 text-[11px] font-bold text-bg-base hover:opacity-90 disabled:opacity-50 flex items-center gap-1 shadow-sm"
              >
                <Search className="size-3" /> Find Node
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase text-text-muted block">
                Cluster Health & Chaos Toggle
              </span>
              {removedNodeId && (
                <button
                  onClick={() => setRemovedNodeId(null)}
                  className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="size-2.5" /> Restore All
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              {baseNodes.map((n) => {
                const isKilled = removedNodeId === n.id
                return (
                  <button
                    key={n.id}
                    onClick={() => setRemovedNodeId(isKilled ? null : n.id)}
                    className={`flex items-center justify-between rounded-lg p-2 ring-1 transition ${
                      isKilled
                        ? 'bg-rose-500/10 text-rose-400 ring-rose-500/30'
                        : 'bg-bg-surface-2 text-text-primary ring-border hover:bg-bg-surface-3'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="size-2 rounded-full" style={{ backgroundColor: n.color }} />
                      {n.name.split(' ')[1]}
                    </span>
                    <span className={`text-[10px] font-bold ${isKilled ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isKilled ? 'DEAD' : 'ALIVE'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl bg-black/60 p-3 ring-1 ring-border text-[11px] font-mono space-y-1">
            <div className="flex items-center justify-between text-text-muted border-b border-border/40 pb-1">
              <span>Active Key: <span className="text-rose-400 font-bold">{activeKey}</span></span>
              <span>Hash Angle: <span className="text-amber-400 font-bold">{keyAngle}°</span></span>
            </div>
            <p className="text-cyan-300 pt-1">
              Clockwise Target: <strong style={{ color: targetToken.color }}>{targetToken.name}</strong> at{' '}
              <span className="text-amber-300">{targetToken.angle}°</span> (Server IP: {activeNodes.find((n) => n.id === targetToken.nodeId)?.ip || '10.0.1.X'}).
            </p>
            {removedNodeId && (
              <p className="text-rose-300 text-[10px] pt-1">
                ⚠️ Minimal Migration: Only 1/N (~25%) of keys moved to neighbor. In naive modulo hashing (hash % N), 75% of keys would be invalidated!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 8. KAFKA PARTITION & COOPERATIVE REBALANCE ANIMATOR
// ==========================================
export const KafkaPartitionRebalanceAnimator: React.FC = () => {
  const [c2Alive, setC2Alive] = useState<boolean>(true)
  const [isRebalancing, setIsRebalancing] = useState<boolean>(false)
  const [rebalanceStep, setRebalanceStep] = useState<string>('Normal steady-state consuming.')
  const [producedCount, setProducedCount] = useState<number>(6)
  const [selectedKey, setSelectedKey] = useState<string>('order_101')

  const [partitions, setPartitions] = useState([
    { id: 0, msgs: [100, 101], consumerId: 'C1' },
    { id: 1, msgs: [200, 201], consumerId: 'C2' },
    { id: 2, msgs: [300, 301], consumerId: 'C3' },
  ])
  const rebalanceTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearRebalanceTimeouts = () => {
    rebalanceTimeoutsRef.current.forEach((t) => clearTimeout(t))
    rebalanceTimeoutsRef.current = []
  }

  useEffect(() => {
    return () => clearRebalanceTimeouts()
  }, [])

  const handleProduce = () => {
    playPacketTransmitSound()
    let hash = 0
    for (let i = 0; i < selectedKey.length; i++) hash += selectedKey.charCodeAt(i)
    const partIdx = hash % 3
    const newMsgId = 100 * (partIdx + 1) + partitions[partIdx].msgs.length

    setPartitions((prev) =>
      prev.map((p) => (p.id === partIdx ? { ...p, msgs: [...p.msgs, newMsgId] } : p))
    )
    setProducedCount((c) => c + 1)
  }

  const handlePollCommit = () => {
    playPacketArriveSound()
    setPartitions((prev) =>
      prev.map((p) => (p.msgs.length > 1 ? { ...p, msgs: p.msgs.slice(1) } : p))
    )
  }

  const handleToggleC2 = () => {
    clearRebalanceTimeouts()
    if (c2Alive) {
      playNodeCrashSound()
      setC2Alive(false)
      setIsRebalancing(true)
      setRebalanceStep('1/4: Consumer C2 missed heartbeat! Coordinator triggers group rebalance...')

      const t1 = setTimeout(() => {
        setRebalanceStep('2/4: JoinGroup & SyncGroup phases executed by Kafka Group Coordinator.')
      }, 900)

      const t2 = setTimeout(() => {
        setRebalanceStep('3/4: Cooperative Sticky Assignor assigns Partition 1 to Consumer C1 without revoking P0 or P2!')
        setPartitions((prev) =>
          prev.map((p) => (p.id === 1 ? { ...p, consumerId: 'C1' } : p))
        )
      }, 1800)

      const t3 = setTimeout(() => {
        playSuccessChimeSound()
        setRebalanceStep('4/4: Rebalance complete! Steady-state consuming resumed with 0 cluster downtime.')
        setIsRebalancing(false)
      }, 2700)
      rebalanceTimeoutsRef.current.push(t1, t2, t3)
    } else {
      playSuccessChimeSound()
      setC2Alive(true)
      setIsRebalancing(true)
      setRebalanceStep('Consumer C2 rejoins group. Partition 1 gracefully returned to C2.')
      const t4 = setTimeout(() => {
        setPartitions((prev) =>
          prev.map((p) => (p.id === 1 ? { ...p, consumerId: 'C2' } : p))
        )
        setIsRebalancing(false)
        setRebalanceStep('Normal steady-state consuming.')
      }, 1200)
      rebalanceTimeoutsRef.current.push(t4)
    }
  }

  return (
    <div className="space-y-4 rounded-xl bg-bg-surface-2 p-5 ring-1 ring-border text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <span className="font-mono text-[11px] font-bold text-accent-brand uppercase tracking-wider block">
            Event Streaming Architecture
          </span>
          <h3 className="text-base font-bold text-text-primary">Kafka Partitions & Cooperative Sticky Rebalance</h3>
        </div>
        <button
          onClick={handleToggleC2}
          disabled={isRebalancing}
          className={`rounded-lg px-3 py-1.5 text-[11.5px] font-mono font-bold transition ring-1 flex items-center gap-1.5 ${
            c2Alive
              ? 'bg-rose-500/20 text-rose-300 ring-rose-500/40 hover:bg-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40 hover:bg-emerald-500/30'
          }`}
        >
          {c2Alive ? '💥 Crash Consumer C2' : '✨ Revive Consumer C2'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-7 space-y-2.5">
          <span className="text-[11px] font-mono font-bold uppercase text-text-muted flex items-center gap-1.5">
            <Layers className="size-3.5 text-cyan-400" /> Topic: orders-stream (3 Partitions)
          </span>

          {partitions.map((p) => (
            <div key={p.id} className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border space-y-1.5">
              <div className="flex items-center justify-between text-[11.5px] font-mono">
                <span className="text-text-primary font-bold">Partition {p.id}</span>
                <span className="text-text-muted text-[10px]">
                  Assigned To:{' '}
                  <strong className={p.consumerId === 'C1' ? 'text-cyan-400' : p.consumerId === 'C2' ? 'text-purple-400' : 'text-emerald-400'}>
                    Consumer {p.consumerId}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {p.msgs.map((m, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-accent-brand ring-1 ring-accent-brand/30 shrink-0"
                  >
                    offset #{idx} (ID:{m})
                  </span>
                ))}
                {p.msgs.length === 0 && (
                  <span className="text-[10px] font-mono text-text-muted italic">All caught up (0 lag)</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="md:col-span-5 space-y-2.5">
          <span className="text-[11px] font-mono font-bold uppercase text-text-muted flex items-center gap-1.5">
            <Users className="size-3.5 text-purple-400" /> Consumer Group: order-workers
          </span>

          <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border flex items-center justify-between">
            <div>
              <span className="text-[12px] font-mono font-bold text-cyan-400 block">Consumer C1</span>
              <span className="text-[10px] text-text-muted font-mono">
                Assigned: {partitions.filter((p) => p.consumerId === 'C1').map((p) => `P${p.id}`).join(', ')}
              </span>
            </div>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
              HEALTHY
            </span>
          </div>

          <div
            className={`rounded-xl p-3 ring-1 transition ${
              c2Alive ? 'bg-bg-surface-1 ring-border' : 'bg-rose-500/10 ring-rose-500/30'
            } flex items-center justify-between`}
          >
            <div>
              <span className={`text-[12px] font-mono font-bold block ${c2Alive ? 'text-purple-400' : 'text-rose-400'}`}>
                Consumer C2
              </span>
              <span className="text-[10px] text-text-muted font-mono">
                {c2Alive ? 'Assigned: P1' : 'Heartbeat Missed (45s)'}
              </span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                c2Alive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300 animate-pulse'
              }`}
            >
              {c2Alive ? 'HEALTHY' : 'OFFLINE'}
            </span>
          </div>

          <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border flex items-center justify-between">
            <div>
              <span className="text-[12px] font-mono font-bold text-emerald-400 block">Consumer C3</span>
              <span className="text-[10px] text-text-muted font-mono">Assigned: P2</span>
            </div>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
              HEALTHY
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-32 rounded-lg bg-bg-surface-1 px-2.5 py-1.5 text-[11px] font-mono ring-1 ring-border text-text-primary"
            placeholder="Key (e.g. order_101)"
          />
          <button
            onClick={handleProduce}
            className="rounded-lg bg-accent-brand px-3 py-1.5 text-[11px] font-bold text-bg-base hover:opacity-90 active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="size-3" /> Publish Event
          </button>
          <button
            onClick={handlePollCommit}
            className="rounded-lg bg-bg-surface-1 px-3 py-1.5 text-[11px] font-bold text-text-primary ring-1 ring-border hover:bg-bg-surface-3 active:scale-95"
          >
            Poll & Commit (Lag -1)
          </button>
        </div>
        <span className="text-[10.5px] font-mono text-text-muted">
          Total Produced: <strong className="text-accent-brand">{producedCount}</strong>
        </span>
      </div>

      <div className="rounded-xl bg-black/60 p-3 ring-1 ring-border text-[11.5px] font-mono text-cyan-300">
        <span className="text-cyan-400 font-bold">Group Coordinator Protocol: </span> {rebalanceStep}
      </div>
    </div>
  )
}

// ==========================================
// 9. LMAX DISRUPTOR LOCK-FREE RING BUFFER ANIMATOR
// ==========================================
export const DisruptorRingBufferAnimator: React.FC = () => {
  const [producerCursor, setProducerCursor] = useState<number>(3)
  const [consumerCursor, setConsumerCursor] = useState<number>(1)
  const [log, setLog] = useState<string>('Disruptor running lock-free via CPU Memory Barriers.')
  const bufferSize = 8 // Power of 2 for fast bitwise masking

  const slots = Array.from({ length: bufferSize }, (_, idx) => {
    const isProduced = idx <= (producerCursor % bufferSize)
    const isConsumed = idx <= (consumerCursor % bufferSize)
    const angle = ((idx * 45 - 90) * Math.PI) / 180
    return {
      index: idx,
      seq: idx,
      status: isConsumed ? 'consumed' : isProduced ? 'pending' : 'empty',
      cx: 120 + 74 * Math.cos(angle),
      cy: 120 + 74 * Math.sin(angle),
    }
  })

  const handleWrite = () => {
    // Check if buffer is full: producer cannot lap consumer
    if (producerCursor - consumerCursor >= bufferSize) {
      playNodeCrashSound()
      setLog('⚠️ Ring Buffer FULL: Producer back-pressured! Cannot overwrite unread sequence.')
      return
    }
    playStepClickSound()
    const nextP = producerCursor + 1
    setProducerCursor(nextP)
    setLog(`✅ Atomic CAS Write: Sequence #${nextP} written to Slot #${nextP & (bufferSize - 1)} without mutex locks.`)
  }

  const handleConsume = () => {
    if (consumerCursor >= producerCursor) {
      setLog('Consumer caught up to Producer cursor. Waiting for next batch.')
      return
    }
    playTradeMatchSound()
    const nextC = consumerCursor + 1
    setConsumerCursor(nextC)
    setLog(`⚡ Matching Engine Processed: Sequence #${nextC} executed in sub-microsecond latency.`)
  }

  const producerAngle = ((producerCursor % bufferSize) * 45 - 90)
  const consumerAngle = ((consumerCursor % bufferSize) * 45 - 90)

  return (
    <div className="space-y-4 rounded-xl bg-bg-surface-2 p-5 ring-1 ring-border text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <span className="font-mono text-[11px] font-bold text-accent-brand uppercase tracking-wider block">
            Ultra Low Latency Architecture
          </span>
          <h3 className="text-base font-bold text-text-primary">LMAX Disruptor Lock-Free Circular Ring Buffer</h3>
        </div>
        <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10.5px] font-mono text-sky-400 ring-1 ring-sky-500/20 font-bold">
          Zero-GC Off-Heap Circular Array
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Circular SVG Ring Buffer Visualizer */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative size-[240px]">
            <svg viewBox="0 0 240 240" className="size-full overflow-visible">
              {/* Outer Ring Track */}
              <circle
                cx="120"
                cy="120"
                r="74"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="28"
                className="opacity-40"
              />

              {/* 8 Circular Slots */}
              {slots.map((slot) => {
                const isP = slot.index === (producerCursor % bufferSize)
                const isC = slot.index === (consumerCursor % bufferSize)
                return (
                  <g key={slot.index} className="transition-all duration-300">
                    <circle
                      cx={slot.cx}
                      cy={slot.cy}
                      r="13"
                      fill={
                        isP
                          ? 'rgba(6, 182, 212, 0.4)'
                          : isC
                          ? 'rgba(16, 185, 129, 0.4)'
                          : 'var(--color-bg-surface-1)'
                      }
                      stroke={isP ? '#06b6d4' : isC ? '#10b981' : 'var(--color-border)'}
                      strokeWidth={isP || isC ? 2 : 1}
                    />
                    <text
                      x={slot.cx}
                      y={slot.cy + 3.5}
                      textAnchor="middle"
                      fill={isP ? '#22d3ee' : isC ? '#34d399' : '#94a3b8'}
                      fontSize="9.5"
                      fontFamily="var(--font-mono)"
                      fontWeight="bold"
                    >
                      {slot.index}
                    </text>
                  </g>
                )
              })}

              {/* Producer Pointer Line (Cyan) */}
              <line
                x1="120"
                y1="120"
                x2={120 + 52 * Math.cos((producerAngle * Math.PI) / 180)}
                y2={120 + 52 * Math.sin((producerAngle * Math.PI) / 180)}
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="transition-all duration-300"
              />

              {/* Consumer Pointer Line (Emerald) */}
              <line
                x1="120"
                y1="120"
                x2={120 + 44 * Math.cos((consumerAngle * Math.PI) / 180)}
                y2={120 + 44 * Math.sin((consumerAngle * Math.PI) / 180)}
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                className="transition-all duration-300"
              />

              {/* Center Core HUD */}
              <circle cx="120" cy="120" r="32" fill="var(--color-bg-surface-3)" stroke="var(--color-border)" strokeWidth="1.2" />
              <text x="120" y="116" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="var(--font-mono)">
                RING
              </text>
              <text x="120" y="129" textAnchor="middle" fill="var(--color-text-primary)" fontSize="10" fontWeight="extrabold" fontFamily="var(--font-mono)">
                LAG: {producerCursor - consumerCursor}
              </text>
            </svg>
          </div>
          <div className="flex gap-4 mt-2 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-cyan-400 font-bold">
              <span className="size-2 rounded-full bg-cyan-400" /> P_HEAD #{producerCursor}
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="size-2 rounded-full bg-emerald-400" /> C_READ #{consumerCursor}
            </span>
          </div>
        </div>

        {/* Slot Strip and Metrics */}
        <div className="md:col-span-7 space-y-3">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {slots.map((slot) => {
              const isProducerHead = slot.index === (producerCursor % bufferSize)
              const isConsumerHead = slot.index === (consumerCursor % bufferSize)
              return (
                <div
                  key={slot.index}
                  className={`rounded-lg p-2 ring-1 text-center font-mono space-y-0.5 transition ${
                    isProducerHead
                      ? 'bg-cyan-500/20 ring-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : isConsumerHead
                      ? 'bg-emerald-500/20 ring-emerald-500/60'
                      : 'bg-bg-surface-1 ring-border/60'
                  }`}
                >
                  <span className="text-[9px] text-text-muted block">#{slot.index}</span>
                  <span className="text-xs font-bold text-text-primary block">[{slot.seq}]</span>
                  <div className="flex flex-col text-[8px] font-bold">
                    {isProducerHead && <span className="text-cyan-400">P_HEAD</span>}
                    {isConsumerHead && <span className="text-emerald-400">C_READ</span>}
                    {!isProducerHead && !isConsumerHead && <span className="text-text-muted opacity-30">IDLE</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleWrite}
              className="rounded-lg bg-cyan-500 px-3.5 py-1.5 text-[11.5px] font-bold text-black hover:bg-cyan-400 active:scale-95 shadow-sm"
            >
              Push Trade (Producer CAS)
            </button>
            <button
              onClick={handleConsume}
              className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-[11.5px] font-bold text-black hover:bg-emerald-400 active:scale-95 shadow-sm"
            >
              Match Engine (Consumer Read)
            </button>
          </div>

          <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border text-[11px] font-mono space-y-1">
            <span className="text-text-muted font-bold block uppercase text-[10px]">
              Hardware Mechanical Sympathy Optimization:
            </span>
            <p className="text-text-muted">
              • <strong className="text-text-primary">Cache-Line Padding (64 Bytes):</strong> Pre-allocates unused 56-byte dummy long fields (<code className="text-cyan-300">p1..p7</code>) to ensure Producer and Consumer cursors reside on completely separate CPU L1 cache lines, eliminating False Sharing across multi-core CPUs.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-black/60 p-3 ring-1 ring-border text-[11.5px] font-mono text-cyan-300">
        <span className="text-cyan-400 font-bold">Ring Engine: </span> {log}
      </div>
    </div>
  )
}

// ==========================================
// 10. UBER H3 SPATIAL HEXAGONAL DISPATCH ANIMATOR
// ==========================================
export const UberH3SpatialDispatchAnimator: React.FC = () => {
  const [dispatchStage, setDispatchStage] = useState<'idle' | 'h3_encode' | 'ring0' | 'ring1' | 'matched'>('idle')
  const [matchedDriver, setMatchedDriver] = useState<string | null>(null)
  const [log, setLog] = useState<string>('Ready for rider dispatch request.')
  const dispatchTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearDispatchTimeouts = () => {
    dispatchTimeoutsRef.current.forEach((t) => clearTimeout(t))
    dispatchTimeoutsRef.current = []
  }

  useEffect(() => {
    return () => clearDispatchTimeouts()
  }, [])

  const drivers = [
    { id: 'D1', name: 'Alex M.', car: 'Toyota Camry (UberX)', eta: '4.2m', rating: '4.92', cell: 'N1', x: 120, y: 58 },
    { id: 'D2', name: 'Sarah K.', car: 'Tesla Model 3 (Comfort)', eta: '2.1m', rating: '4.98', cell: 'Origin', x: 132, y: 130 },
    { id: 'D3', name: 'Marcus R.', car: 'Chevy Bolt (UberX)', eta: '5.8m', rating: '4.85', cell: 'N3', x: 171, y: 149 },
    { id: 'D4', name: 'Elena B.', car: 'BMW 5-Series (Black)', eta: '3.4m', rating: '4.95', cell: 'N5', x: 69, y: 149 },
  ]

  // Regular flat-topped hexagon vertex calculator (shares exact seamless edges)
  const hexRadius = 34
  const hexDistance = Math.sqrt(3) * hexRadius // ~58.89
  const getHexPoints = (cx: number, cy: number, r: number): string => {
    return Array.from({ length: 6 }, (_, i) => {
      const angleRad = ((60 * i) * Math.PI) / 180
      const x = cx + r * Math.cos(angleRad)
      const y = cy + r * Math.sin(angleRad)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }

  const ring1Neighbors = [
    { name: 'N1', cx: 120, cy: +(120 - hexDistance).toFixed(1) },
    { name: 'N2', cx: +(120 + hexDistance * (Math.sqrt(3) / 2)).toFixed(1), cy: +(120 - hexDistance / 2).toFixed(1) },
    { name: 'N3', cx: +(120 + hexDistance * (Math.sqrt(3) / 2)).toFixed(1), cy: +(120 + hexDistance / 2).toFixed(1) },
    { name: 'N4', cx: 120, cy: +(120 + hexDistance).toFixed(1) },
    { name: 'N5', cx: +(120 - hexDistance * (Math.sqrt(3) / 2)).toFixed(1), cy: +(120 + hexDistance / 2).toFixed(1) },
    { name: 'N6', cx: +(120 - hexDistance * (Math.sqrt(3) / 2)).toFixed(1), cy: +(120 - hexDistance / 2).toFixed(1) },
  ]

  const handleStartDispatch = () => {
    clearDispatchTimeouts()
    setDispatchStage('h3_encode')
    setMatchedDriver(null)
    playPacketTransmitSound()
    setLog('1/4: Rider GPS bits converted to H3 Hex Index (0x882681a339fffff) in O(1) bitwise operations.')

    const t1 = setTimeout(() => {
      setDispatchStage('ring0')
      playStepClickSound()
      setLog('2/4: Scanning Origin Hexagon (k-ring radius 0). Found 1 online driver (Sarah K.).')
    }, 1000)

    const t2 = setTimeout(() => {
      setDispatchStage('ring1')
      playTradeMatchSound()
      setLog('3/4: Expanding to 6 adjacent neighbor hexagons (k-ring radius 1). Found 3 additional drivers in N1, N3, N5.')
    }, 2000)

    const t3 = setTimeout(() => {
      setDispatchStage('matched')
      setMatchedDriver('D2')
      playSuccessChimeSound()
      setLog('4/4: Hungarian bipartite optimization selected Driver Sarah K. (2.1m ETA, 4.98 rating, minimal wait time)!')
    }, 3000)
    dispatchTimeoutsRef.current.push(t1, t2, t3)
  }

  return (
    <div className="space-y-4 rounded-xl bg-bg-surface-2 p-5 ring-1 ring-border text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <span className="font-mono text-[11px] font-bold text-accent-brand uppercase tracking-wider block">
            Geospatial Dispatch Engine
          </span>
          <h3 className="text-base font-bold text-text-primary">Uber H3 Spatial Hexagonal Dispatch</h3>
        </div>
        <button
          onClick={handleStartDispatch}
          className="rounded-lg bg-accent-brand px-3.5 py-1.5 text-[11.5px] font-bold text-bg-base hover:opacity-90 active:scale-95 shadow-sm flex items-center gap-1.5 transition"
        >
          <Car className="size-3.5" /> Request Ride Dispatch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Visual Hexagonal Honeycomb Grid */}
        <div className="md:col-span-6 flex flex-col items-center justify-center p-3">
          <div className="relative size-[240px]">
            <svg viewBox="0 0 240 240" className="size-full overflow-visible">
              <defs>
                <filter id="hexGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Ring 1 Neighbors (6 regular hexagons perfectly tiling with origin) */}
              {ring1Neighbors.map((hex, i) => {
                const isRing1Active = dispatchStage === 'ring1' || dispatchStage === 'matched'
                return (
                  <g key={i}>
                    <polygon
                      points={getHexPoints(hex.cx, hex.cy, hexRadius)}
                      fill={isRing1Active ? 'rgba(168, 85, 247, 0.16)' : 'rgba(255, 255, 255, 0.02)'}
                      stroke={isRing1Active ? '#A855F7' : 'rgba(255, 255, 255, 0.12)'}
                      strokeWidth={isRing1Active ? '1.8' : '1'}
                      strokeDasharray={isRing1Active ? 'none' : '3 3'}
                      className="transition-all duration-300"
                    />
                    <text
                      x={hex.cx}
                      y={hex.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-text-muted text-[9px] font-mono font-semibold select-none"
                    >
                      {hex.name}
                    </text>
                  </g>
                )
              })}

              {/* Origin Hexagon (Center) */}
              <polygon
                points={getHexPoints(120, 120, hexRadius)}
                fill={
                  dispatchStage === 'ring0' || dispatchStage === 'matched'
                    ? 'rgba(0, 240, 255, 0.25)'
                    : dispatchStage === 'h3_encode'
                    ? 'rgba(0, 240, 255, 0.12)'
                    : 'rgba(255, 255, 255, 0.05)'
                }
                stroke={
                  dispatchStage === 'ring0' || dispatchStage === 'matched'
                    ? '#00F0FF'
                    : dispatchStage === 'h3_encode'
                    ? '#38bdf8'
                    : 'rgba(255, 255, 255, 0.25)'
                }
                strokeWidth={dispatchStage !== 'idle' ? '2.2' : '1.5'}
                filter={dispatchStage === 'ring0' || dispatchStage === 'matched' ? 'url(#hexGlow)' : undefined}
                className="transition-all duration-300"
              />
              <text x="120" y="104" textAnchor="middle" className="fill-accent-brand text-[9.5px] font-mono font-bold select-none">
                Origin Hex
              </text>
              <text x="120" y="115" textAnchor="middle" className="fill-text-muted text-[7.5px] font-mono select-none">
                0x882681a
              </text>

              {/* Driver Position Markers */}
              {drivers.map((d) => {
                const isMatched = matchedDriver === d.id
                return (
                  <g key={d.id} className="transition-all duration-300">
                    {/* Glowing ring if matched */}
                    {isMatched && (
                      <circle
                        cx={d.x}
                        cy={d.y}
                        r="11"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2"
                        className="animate-ping"
                        style={{ transformOrigin: `${d.x}px ${d.y}px` }}
                      />
                    )}
                    <circle
                      cx={d.x}
                      cy={d.y}
                      r="6.5"
                      fill={isMatched ? '#10B981' : '#38bdf8'}
                      stroke="#fff"
                      strokeWidth="1.5"
                      className="shadow-sm"
                    />
                    <text
                      x={d.x}
                      y={d.y - 8}
                      textAnchor="middle"
                      className={`text-[8px] font-mono font-extrabold ${isMatched ? 'fill-emerald-400' : 'fill-sky-300'}`}
                    >
                      {d.id}
                    </text>
                  </g>
                )
              })}

              {/* Rider Pin at Center */}
              <g>
                <circle cx="110" cy="130" r="5" fill="#F43F5E" stroke="#fff" strokeWidth="1.5" />
                <text x="110" y="142" textAnchor="middle" className="fill-rose-400 text-[7.5px] font-mono font-bold select-none">
                  Rider
                </text>
              </g>

              {/* Animated Laser Route Trajectory when matched */}
              {dispatchStage === 'matched' && (
                <g>
                  <path
                    d="M 132 130 Q 124 135 110 130"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.8"
                    strokeDasharray="4 4"
                    className="animate-flow-dash"
                  />
                  <circle cx="121" cy="132" r="3" fill="#34D399" className="animate-pulse" />
                </g>
              )}
            </svg>
          </div>
          <span className="text-[10px] font-mono text-text-muted mt-1">
            H3 Hierarchical Hexagonal Indexing (Resolution 8 ~460m aperture)
          </span>
        </div>

        {/* Candidate Drivers List */}
        <div className="md:col-span-6 space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase text-text-muted block">
            Nearby Available Drivers (k-Ring Search)
          </span>
          {drivers.map((d) => {
            const isWinner = matchedDriver === d.id
            return (
              <div
                key={d.id}
                className={`rounded-xl p-2.5 ring-1 transition flex items-center justify-between ${
                  isWinner
                    ? 'bg-emerald-500/20 ring-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-bg-surface-1 ring-border'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11.5px] font-bold text-text-primary">{d.name}</span>
                    <span className="text-[10px] text-text-muted">({d.cell})</span>
                  </div>
                  <span className="text-[10.5px] text-text-muted block">{d.car}</span>
                </div>
                <div className="text-right">
                  <span className={`text-[12px] font-bold font-mono block ${isWinner ? 'text-emerald-400' : 'text-accent-brand'}`}>
                    ETA {d.eta}
                  </span>
                  <span className="text-[10px] text-text-muted">★ {d.rating}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl bg-black/60 p-3 ring-1 ring-border text-[11.5px] font-mono text-cyan-300">
        <span className="text-cyan-400 font-bold">Dispatch Step: </span> {log}
      </div>
    </div>
  )
}

// Master component selector mapped to chapter or manual tabs
interface ChapterAnimatorProps {
  unitId: string
  chapterNumber: number
}

export const ChapterConceptAnimator: React.FC<ChapterAnimatorProps> = ({ unitId }) => {
  const [activeWidget, setActiveWidget] = useState<string>('auto')

  // Automatically determine default widget based on Unit / Chapter
  let defaultWidget = 'cap'
  if (unitId === 'unit-1') defaultWidget = 'consistenthash'
  else if (unitId === 'unit-2') defaultWidget = '2pc'
  else if (unitId === 'unit-3') defaultWidget = 'lsm'
  else if (unitId === 'unit-4') defaultWidget = 'cache'
  else if (unitId === 'unit-5') defaultWidget = 'disruptor'
  else if (unitId === 'unit-6') defaultWidget = 'kafka'
  else if (unitId === 'unit-7') defaultWidget = 'raft'
  else if (unitId === 'unit-8') defaultWidget = 'uber'

  const currentWidget = activeWidget === 'auto' ? defaultWidget : activeWidget

  return (
    <div className="space-y-3">
      {/* Widget Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-accent-brand font-bold flex items-center gap-1.5">
          <Sparkles className="size-3.5" /> Interactive Concept Simulator
        </span>

        <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
          {[
            { id: 'cap', label: 'CAP Partition' },
            { id: 'consistenthash', label: 'Consistent Hash Ring' },
            { id: '2pc', label: '2PC Transactions' },
            { id: 'lsm', label: 'LSM vs B+ Tree' },
            { id: 'cache', label: 'LRU Cache & Stampede' },
            { id: 'kafka', label: 'Kafka Rebalance' },
            { id: 'raft', label: 'Raft Consensus' },
            { id: 'disruptor', label: 'Disruptor Ring Buffer' },
            { id: 'ratelimit', label: 'Token Bucket Limiter' },
            { id: 'uber', label: 'Uber H3 Dispatch' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveWidget(tab.id)}
              className={`rounded-lg px-2.5 py-1 transition ${
                currentWidget === tab.id
                  ? 'bg-accent-brand/20 text-accent-brand font-bold ring-1 ring-accent-brand/40'
                  : 'bg-bg-surface-1 text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Render Active Animator */}
      {currentWidget === 'cap' && <CapPartitionAnimator />}
      {currentWidget === 'consistenthash' && <ConsistentHashRingAnimator />}
      {currentWidget === '2pc' && <TwoPhaseCommitAnimator />}
      {currentWidget === 'lsm' && <LsmTreeVsBTreeAnimator />}
      {currentWidget === 'cache' && <CacheEvictionAndStampedeAnimator />}
      {currentWidget === 'kafka' && <KafkaPartitionRebalanceAnimator />}
      {currentWidget === 'raft' && <RaftConsensusAnimator />}
      {currentWidget === 'disruptor' && <DisruptorRingBufferAnimator />}
      {currentWidget === 'ratelimit' && <RateLimiterTokenBucketAnimator />}
      {currentWidget === 'uber' && <UberH3SpatialDispatchAnimator />}
    </div>
  )
}

