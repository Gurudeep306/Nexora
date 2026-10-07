import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'

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

  const handleDeposit = () => {
    setInFlightWrite(true)
    setWriteSuccess(null)
    const amount = 50
    const newBal = balance + amount

    setTimeout(() => {
      if (isPartitioned) {
        if (mode === 'CP') {
          // CP Mode: Must reject write to maintain consistency across partition
          setWriteSuccess(false)
          setLastEvent(
            `❌ CP REJECTION: Network partitioned! Node A cannot reach quorum with Node B. Deposit of $${amount} REFUSED to guarantee consistency.`
          )
        } else {
          // AP Mode: Accept write on Node A, but Node B becomes stale
          setBalance(newBal)
          setWriteSuccess(true)
          setLastEvent(
            `⚠️ AP ACCEPTANCE: Node A accepted $${amount} (New balance: $${newBal}). But Node B is partitioned and STALE ($${nodeBBalance})!`
          )
        }
      } else {
        // Normal operation: Replicated immediately
        setBalance(newBal)
        setNodeBBalance(newBal)
        setWriteSuccess(true)
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
      setLastEvent(`⚡ Partition HEALED: Node B synchronized with Node A via Anti-Entropy Merkle tree reconciliation.`)
    } else {
      setIsPartitioned(true)
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

  const runTransaction = () => {
    setPhase('PREPARE')
    setDbVotes({ db1: 'PENDING', db2: 'PENDING', db3: 'PENDING' })
    setLog('Phase 1 (PREPARE): Coordinator broadcasts PREPARE query and acquires row locks.')

    setTimeout(() => {
      setPhase('VOTING')
      const db2Vote = simulateFail ? 'NO' : 'YES'
      setDbVotes({ db1: 'YES', db2: db2Vote, db3: 'YES' })
      setLog(
        simulateFail
          ? 'Phase 1 Voting: DB2 returned VOTE_ABORT due to constraint failure! Quorum not reached.'
          : 'Phase 1 Voting: All 3 participants successfully replied VOTE_COMMIT.'
      )

      setTimeout(() => {
        if (simulateFail) {
          setPhase('ABORT')
          setLog('Phase 2 (GLOBAL_ROLLBACK): Coordinator sends ROLLBACK. All participants release locks safely.')
        } else {
          setPhase('COMMIT')
          setLog('Phase 2 (GLOBAL_COMMIT): Coordinator sends COMMIT. All participants write to disk WAL and ACK.')
        }
      }, 1000)
    }, 1000)
  }

  const reset = () => {
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
                      ? 'bg-rose-500 text-white'
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

        {/* Branching Wires */}
        <div className="my-4 h-6 w-full flex justify-around items-center px-10">
          <div className="h-full w-0.5 bg-purple-500/40" />
          <div className="h-full w-0.5 bg-purple-500/40" />
          <div className="h-full w-0.5 bg-purple-500/40" />
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

  const handleInsert = () => {
    const nextKey = `user:${Math.floor(Math.random() * 890 + 100)}`
    if (memTable.length >= 4) {
      // Trigger flush
      setIsFlushing(true)
      setLog(`MemTable threshold exceeded (4 items). Flushing sorted immutable run to SSTable Level 0 on NVMe...`)
      setTimeout(() => {
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
              + Write New Key-Value Pair
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
        /* B+ Tree View */
        <div className="my-6 rounded-xl bg-black/40 p-6 text-center ring-1 ring-border space-y-4">
          <div className="inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-400 ring-1 ring-emerald-500/30">
            <Layers className="size-8" />
          </div>
          <h5 className="text-[14px] font-bold">B+ Tree Disk Page Hierarchies</h5>
          <p className="max-w-xl mx-auto text-[12.5px] text-text-secondary leading-relaxed">
            Data resides in fixed 4KB-16KB pages. Writes require finding the target leaf page, modifying bytes in place,
            and splitting pages when node fan-out exceeds $M$. Delivers predictable $O(\log N)$ point reads, but incurs
            random disk I/O on heavy write workloads.
          </p>
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

  const accessKey = (k: string) => {
    // Move to front (MRU)
    setCache((prev) => [k, ...prev.filter((item) => item !== k)])
    setLog(`Accessed [${k}]! Promoted to Head (MRU - Most Recently Used).`)
  }

  const insertNewKey = () => {
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
    setLog(`🚨 50 Concurrent threads requested expired key 'HOT_DEAL'! Singleflight mutex locks 1 DB query, 49 threads wait on channel.`)
    setTimeout(() => {
      setIsStampedeActive(false)
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
            className="rounded-lg bg-bg-surface-2 px-4 py-1.5 text-[11.5px] font-semibold text-text-primary ring-1 ring-border hover:bg-bg-surface-3"
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
  const [log, setLog] = useState<string>('Node 1 is the elected Leader in Term 1, pulsing periodic heartbeats.')

  const triggerElection = () => {
    setIsElecting(true)
    setLeaderId(null)
    const nextTerm = term + 1
    setTerm(nextTerm)
    setLog(`Leader crashed! Node 2 election timeout fired. Transitions to CANDIDATE for Term ${nextTerm}.`)

    setTimeout(() => {
      setLog(`Node 2 broadcasted RequestVote RPCs to Node 1 and Node 3. Received 2/3 votes (Quorum achieved).`)
      setTimeout(() => {
        setLeaderId(2)
        setIsElecting(false)
        setLog(`🎉 Node 2 elected LEADER for Term ${nextTerm}! Broadcasting AppendEntries heartbeats.`)
      }, 900)
    }, 900)
  }

  return (
    <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-b from-[#170a0d] to-[#0b0507] p-6 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 rounded-full bg-rose-400 animate-pulse" />
            <h4 className="font-mono text-[13px] font-bold tracking-wider text-rose-400 uppercase">
              Raft Consensus Leader Election Simulator
            </h4>
          </div>
          <p className="text-[12px] text-text-muted mt-0.5">
            Leader election timeouts, candidate request vote RPCs, quorum validation, and heartbeat broadcasting.
          </p>
        </div>

        <div className="rounded-md bg-rose-500/20 px-3 py-1 font-mono text-[12px] font-bold text-rose-300 ring-1 ring-rose-500/40">
          Current Term: {term}
        </div>
      </div>

      {/* Nodes Display */}
      <div className="my-6 grid grid-cols-3 gap-6">
        {[1, 2, 3].map((id) => {
          const isLeader = leaderId === id
          const isCandidate = isElecting && id === 2

          return (
            <div
              key={id}
              className={`flex flex-col items-center rounded-2xl p-5 text-center ring-1 transition-all ${
                isLeader
                  ? 'bg-amber-500/10 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                  : isCandidate
                  ? 'bg-rose-500/20 ring-rose-400 animate-pulse'
                  : 'bg-bg-surface-2 ring-border'
              }`}
            >
              <div
                className={`flex size-14 items-center justify-center rounded-2xl ${
                  isLeader
                    ? 'bg-amber-400 text-black'
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
            </div>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={triggerElection}
          disabled={isElecting}
          className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-[12px] font-bold text-white shadow-lg hover:bg-rose-400 active:scale-95 disabled:opacity-50"
        >
          <Play className="size-3.5 fill-current" /> Trigger Leader Failure & Election
        </button>

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
      setLog(`✅ Request ALLOWED! Consumed ${cost} token(s). Tokens remaining: ${tokens - cost}`)
    } else {
      setLastStatus('REJECTED')
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

// Master component selector mapped to chapter or manual tabs
interface ChapterAnimatorProps {
  unitId: string
  chapterNumber: number
}

export const ChapterConceptAnimator: React.FC<ChapterAnimatorProps> = ({ unitId }) => {
  const [activeWidget, setActiveWidget] = useState<string>('auto')

  // Automatically determine default widget based on Unit / Chapter
  let defaultWidget = 'cap'
  if (unitId === 'unit-1') defaultWidget = 'cap'
  else if (unitId === 'unit-2') defaultWidget = '2pc'
  else if (unitId === 'unit-3') defaultWidget = 'lsm'
  else if (unitId === 'unit-4') defaultWidget = 'cache'
  else if (unitId === 'unit-5') defaultWidget = 'cap'
  else if (unitId === 'unit-6') defaultWidget = 'cache'
  else if (unitId === 'unit-7') defaultWidget = 'raft'
  else if (unitId === 'unit-8') defaultWidget = 'ratelimit'

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
            { id: '2pc', label: '2PC Transactions' },
            { id: 'lsm', label: 'LSM vs B+ Tree' },
            { id: 'cache', label: 'LRU Cache & Stampede' },
            { id: 'raft', label: 'Raft Consensus' },
            { id: 'ratelimit', label: 'Token Bucket Limiter' },
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
      {currentWidget === '2pc' && <TwoPhaseCommitAnimator />}
      {currentWidget === 'lsm' && <LsmTreeVsBTreeAnimator />}
      {currentWidget === 'cache' && <CacheEvictionAndStampedeAnimator />}
      {currentWidget === 'raft' && <RaftConsensusAnimator />}
      {currentWidget === 'ratelimit' && <RateLimiterTokenBucketAnimator />}
    </div>
  )
}
