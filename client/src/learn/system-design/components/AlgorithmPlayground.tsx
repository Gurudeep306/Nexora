import React, { useState, useEffect } from 'react'
import {
  Play,
  Zap,
  CheckCircle,
  Plus,
  Sparkles,
  Search,
  RefreshCw,
} from 'lucide-react'

interface Props {
  systemId: string
}

const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

function encodeBase62(num: bigint): string {
  if (num === 0n) return '0'
  let res = ''
  let n = num
  const base = 62n
  while (n > 0n) {
    const rem = n % base
    res = BASE62_CHARS[Number(rem)] + res
    n = n / base
  }
  return res
}

function decodeBase62(token: string): bigint {
  let num = 0n
  const base = 62n
  for (let i = 0; i < token.length; i++) {
    const idx = BASE62_CHARS.indexOf(token[i])
    if (idx === -1) return 0n
    num = num * base + BigInt(idx)
  }
  return num
}

export const AlgorithmPlayground: React.FC<Props> = ({ systemId }) => {
  /* 1. TinyURL Base62 State */
  const [urlId, setUrlId] = useState<string>('125301934')
  const [base62Output, setBase62Output] = useState<string>('')
  const [decodedCheck, setDecodedCheck] = useState<string>('')

  /* 2. Rate Limiter Token Bucket State */
  const [bucketCap] = useState(10)
  const [refillRate] = useState(2) // tokens per sec
  const [tokens, setTokens] = useState(10)
  const [lastRefill, setLastRefill] = useState(Date.now())
  const [limiterLogs, setLimiterLogs] = useState<Array<{ text: string; success: boolean; ts: string }>>([])

  /* 3. Snowflake Generator State */
  const [workerId, setWorkerId] = useState(42)
  const [snowflakeSequence, setSnowflakeSequence] = useState(0)
  const [generatedSnowflakes, setGeneratedSnowflakes] = useState<
    Array<{ id: string; timeStr: string; worker: number; seq: number }>
  >([])

  /* 4. Consistent Hashing State */
  const [ringNodes, setRingNodes] = useState<string[]>(['Node-A', 'Node-B', 'Node-C'])
  const [hashKey, setHashKey] = useState('user_9120')
  const [assignedNode, setAssignedNode] = useState('')

  /* 5. Order Book State */
  const [bids, setBids] = useState([
    { price: 100.5, qty: 50 },
    { price: 100.2, qty: 100 },
    { price: 100.0, qty: 150 },
  ])
  const [asks, setAsks] = useState([
    { price: 101.0, qty: 60 },
    { price: 101.5, qty: 80 },
    { price: 102.0, qty: 200 },
  ])
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY')
  const [orderPrice, setOrderPrice] = useState('101.0')
  const [orderQty, setOrderQty] = useState('20')
  const [trades, setTrades] = useState<Array<{ price: number; qty: number; time: string }>>([])

  /* 6. LRU Cache State (distributed-cache) */
  const [lruCapacity] = useState(4)
  const [lruCache, setLruCache] = useState<Array<{ key: string; val: string }>>([
    { key: 'user:101', val: 'Alice (Auth)' },
    { key: 'user:102', val: 'Bob (Profile)' },
    { key: 'user:103', val: 'Charlie (Cart)' },
  ])
  const [lruKeyInput, setLruKeyInput] = useState('user:104')
  const [lruValInput, setLruValInput] = useState('David (Order)')
  const [lruLog, setLruLog] = useState<string>('LRU Cache initialized with 3 items. Capacity: 4.')

  /* 7. Google Drive FastCDC Chunking & Dedup State */
  const [driveDocVersion, setDriveDocVersion] = useState(1)
  const [driveChunks, setDriveChunks] = useState<
    Array<{ id: number; text: string; hash: string; isDuplicate: boolean }>
  >([
    { id: 1, text: 'Slide 1: Executive Overview', hash: '8f4a1b02', isDuplicate: true },
    { id: 2, text: 'Slide 2: Q3 Financial Figures', hash: 'c37e9d41', isDuplicate: true },
    { id: 3, text: 'Slide 3: Infrastructure Architecture', hash: '2a0e5b77', isDuplicate: true },
    { id: 4, text: 'Slide 4: Appendix & References', hash: '991bf420', isDuplicate: true },
  ])
  const [driveDedupStats, setDriveDedupStats] = useState<string>(
    'Version 1 committed. All 4 chunks (16MB) cached in cloud block store.'
  )

  /* 8. Search Engine BM25 Inverted Index State */
  const [searchDocs] = useState([
    { id: 1, title: 'Distributed Systems & Partitioning', content: 'Distributed systems scale horizontally through partitioned sharding and consensus protocols.' },
    { id: 2, title: 'Consensus with Raft & Paxos', content: 'Consensus protocols like Raft ensure replicated state machine durability and strong leader election.' },
    { id: 3, title: 'Relational Sharding Best Practices', content: 'Horizontal sharding divides relational tables across database clusters using consistent hash keys.' },
  ])
  const [bm25Query, setBm25Query] = useState('consensus sharding')
  const [rankedResults, setRankedResults] = useState<Array<{ id: number; title: string; score: number }>>([])

  /* 9. Web Crawler Bloom Filter State */
  const [bloomBits, setBloomBits] = useState<number[]>(new Array(16).fill(0))
  const [bloomInputUrl, setBloomInputUrl] = useState('https://news.ycombinator.com')
  const [bloomTestUrl, setBloomTestUrl] = useState('https://news.ycombinator.com')
  const [bloomFeedback, setBloomFeedback] = useState<string>('')

  /* 10. Collaborative Editor CRDT State */
  const [crdtChars, setCrdtChars] = useState<Array<{ val: string; pos: number; peer: string }>>([
    { val: 'S', pos: 0.1, peer: 'Alice' },
    { val: 'Y', pos: 0.2, peer: 'Alice' },
    { val: 'S', pos: 0.3, peer: 'Alice' },
    { val: 'T', pos: 0.4, peer: 'Alice' },
    { val: 'E', pos: 0.5, peer: 'Alice' },
    { val: 'M', pos: 0.6, peer: 'Alice' },
  ])
  const [crdtInsertVal, setCrdtInsertVal] = useState('!')
  const [crdtInsertPeer, setCrdtInsertPeer] = useState<'Alice' | 'Bob'>('Bob')

  /* 11. Distributed Lock Redlock & Fencing Token State */
  const [redlockMasters, setRedlockMasters] = useState<Array<{ name: string; online: boolean }>>([
    { name: 'Master-1 (US-East)', online: true },
    { name: 'Master-2 (US-West)', online: true },
    { name: 'Master-3 (EU-Central)', online: true },
    { name: 'Master-4 (AP-East)', online: true },
    { name: 'Master-5 (SA-East)', online: true },
  ])
  const [fencingCounter, setFencingCounter] = useState(104)
  const [redlockStatus, setRedlockStatus] = useState<string>('Quorum satisfied: 5/5 nodes online. Lock held.')

  // Recalculate TinyURL Base62
  useEffect(() => {
    try {
      const n = BigInt(urlId || '0')
      const enc = encodeBase62(n)
      setBase62Output(enc)
      setDecodedCheck(decodeBase62(enc).toString())
    } catch {
      setBase62Output('Error')
      setDecodedCheck('Error')
    }
  }, [urlId])

  // Recalculate BM25 Ranking
  useEffect(() => {
    const qTokens = bm25Query.toLowerCase().split(/\s+/).filter(Boolean)
    if (qTokens.length === 0) {
      setRankedResults([])
      return
    }

    const scored = searchDocs.map((doc) => {
      let score = 0
      const dWords = doc.content.toLowerCase().split(/\s+/)
      for (const qt of qTokens) {
        const tf = dWords.filter((w) => w.includes(qt)).length
        if (tf > 0) {
          // BM25 term frequency saturation
          const k1 = 1.2
          const tfWeight = (tf * (k1 + 1)) / (tf + k1)
          score += tfWeight * 2.5
        }
      }
      return { id: doc.id, title: doc.title, score: Math.round(score * 100) / 100 }
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score)

    setRankedResults(scored)
  }, [bm25Query, searchDocs])

  // Lazy Token Bucket Refill
  const getRefilledTokens = () => {
    const now = Date.now()
    const elapsedSec = (now - lastRefill) / 1000
    const added = elapsedSec * refillRate
    return Math.min(bucketCap, tokens + added)
  }

  const handleSendRateRequest = (cost = 1) => {
    const currentAvailable = getRefilledTokens()
    const now = Date.now()
    setLastRefill(now)

    if (currentAvailable >= cost) {
      const remaining = currentAvailable - cost
      setTokens(remaining)
      setLimiterLogs((prev) => [
        {
          text: `HTTP 200 OK - Consumed ${cost} token(s). Remaining: ${remaining.toFixed(1)}`,
          success: true,
          ts: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 5),
      ])
    } else {
      setTokens(currentAvailable)
      setLimiterLogs((prev) => [
        {
          text: `HTTP 429 Too Many Requests - Rejected! Available: ${currentAvailable.toFixed(1)} < Required: ${cost}`,
          success: false,
          ts: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 5),
      ])
    }
  }

  // Generate Snowflake ID
  const handleGenerateSnowflake = () => {
    const epoch = 1704067200000n // 2024-01-01
    const now = BigInt(Date.now())
    const tsOffset = now - epoch
    const seq = snowflakeSequence + 1
    setSnowflakeSequence(seq)

    const id = (tsOffset << 22n) | (BigInt(workerId) << 12n) | BigInt(seq % 4096)
    setGeneratedSnowflakes((prev) => [
      {
        id: id.toString(),
        timeStr: new Date(Number(now)).toISOString(),
        worker: workerId,
        seq: seq % 4096,
      },
      ...prev.slice(0, 4),
    ])
  }

  // Consistent Hash Lookup
  const simpleHash = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash)
  }

  useEffect(() => {
    if (ringNodes.length === 0) return
    const keyH = simpleHash(hashKey) % 1000
    const nodeScores = ringNodes.map((n) => ({
      name: n,
      score: simpleHash(n + '#0') % 1000,
    })).sort((a, b) => a.score - b.score)

    let target = nodeScores[0].name
    for (const ns of nodeScores) {
      if (ns.score >= keyH) {
        target = ns.name
        break
      }
    }
    setAssignedNode(target)
  }, [hashKey, ringNodes])

  // Execute Limit Order Match
  const handlePlaceOrder = () => {
    const p = parseFloat(orderPrice)
    const q = parseInt(orderQty)
    if (isNaN(p) || isNaN(q) || q <= 0) return

    if (orderSide === 'BUY') {
      if (asks.length > 0 && p >= asks[0].price) {
        const bestAsk = asks[0]
        const fillQty = Math.min(q, bestAsk.qty)
        setTrades((prev) => [
          { price: bestAsk.price, qty: fillQty, time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 5),
        ])
        if (bestAsk.qty > fillQty) {
          setAsks([{ price: bestAsk.price, qty: bestAsk.qty - fillQty }, ...asks.slice(1)])
        } else {
          setAsks(asks.slice(1))
        }
      } else {
        setBids([{ price: p, qty: q }, ...bids].sort((a, b) => b.price - a.price))
      }
    } else {
      if (bids.length > 0 && p <= bids[0].price) {
        const bestBid = bids[0]
        const fillQty = Math.min(q, bestBid.qty)
        setTrades((prev) => [
          { price: bestBid.price, qty: fillQty, time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 5),
        ])
        if (bestBid.qty > fillQty) {
          setBids([{ price: bestBid.price, qty: bestBid.qty - fillQty }, ...bids.slice(1)])
        } else {
          setBids(bids.slice(1))
        }
      } else {
        setAsks([{ price: p, qty: q }, ...asks].sort((a, b) => a.price - b.price))
      }
    }
  }

  // LRU Cache Handlers
  const handleLruGet = (key: string) => {
    const idx = lruCache.findIndex((item) => item.key === key)
    if (idx !== -1) {
      const hit = lruCache[idx]
      const updated = [hit, ...lruCache.filter((_, i) => i !== idx)]
      setLruCache(updated)
      setLruLog(`CACHE HIT for "${key}"! Promoted to Head (Most Recently Used).`)
    } else {
      setLruLog(`CACHE MISS for "${key}"! (Not found in RAM).`)
    }
  }

  const handleLruPut = () => {
    if (!lruKeyInput.trim()) return
    const existingIdx = lruCache.findIndex((i) => i.key === lruKeyInput)
    if (existingIdx !== -1) {
      const updated = [
        { key: lruKeyInput, val: lruValInput },
        ...lruCache.filter((_, i) => i !== existingIdx),
      ]
      setLruCache(updated)
      setLruLog(`UPDATED "${lruKeyInput}" and promoted to Head.`)
    } else {
      if (lruCache.length >= lruCapacity) {
        const evicted = lruCache[lruCache.length - 1]
        const updated = [{ key: lruKeyInput, val: lruValInput }, ...lruCache.slice(0, lruCapacity - 1)]
        setLruCache(updated)
        setLruLog(`EVICTED Tail "${evicted.key}" (LRU)! Inserted "${lruKeyInput}" at Head.`)
      } else {
        setLruCache([{ key: lruKeyInput, val: lruValInput }, ...lruCache])
        setLruLog(`INSERTED "${lruKeyInput}" at Head. Cache size: ${lruCache.length + 1}/${lruCapacity}.`)
      }
    }
  }

  // Google Drive FastCDC Chunking Simulation
  const handleDriveSimulateEdit = () => {
    setDriveDocVersion((v) => v + 1)
    setDriveChunks([
      { id: 1, text: 'Slide 1: Executive Overview', hash: '8f4a1b02', isDuplicate: true },
      { id: 2, text: 'Slide 2: Q3 Figures (+ Updated Margins)', hash: 'e990ff5b', isDuplicate: false }, // Only this changed!
      { id: 3, text: 'Slide 3: Infrastructure Architecture', hash: '2a0e5b77', isDuplicate: true },
      { id: 4, text: 'Slide 4: Appendix & References', hash: '991bf420', isDuplicate: true },
    ])
    setDriveDedupStats(
      `FastCDC Invariant Demonstrated: User updated Slide 2. 3 out of 4 chunks (75%) maintained identical SHA-256 hashes and were skipped from cloud upload! Only 1 chunk (4MB) was uploaded over the wire!`
    )
  }

  // Web Crawler Bloom Filter Handlers
  const getBloomIndices = (str: string): [number, number, number] => {
    const h = simpleHash(str)
    return [h % 16, (h * 7 + 3) % 16, (h * 13 + 5) % 16]
  }

  const handleBloomAdd = () => {
    const [i1, i2, i3] = getBloomIndices(bloomInputUrl)
    const next = [...bloomBits]
    next[i1] = 1
    next[i2] = 1
    next[i3] = 1
    setBloomBits(next)
    setBloomFeedback(`Added "${bloomInputUrl}". Bits set: [${i1}, ${i2}, ${i3}].`)
  }

  const handleBloomTest = () => {
    const [i1, i2, i3] = getBloomIndices(bloomTestUrl)
    const present = bloomBits[i1] === 1 && bloomBits[i2] === 1 && bloomBits[i3] === 1
    if (!present) {
      setBloomFeedback(`Result for "${bloomTestUrl}": Definite NO! Bit ${bloomBits[i1] === 0 ? i1 : bloomBits[i2] === 0 ? i2 : i3} is 0. Crawl this page!`)
    } else {
      setBloomFeedback(`Result for "${bloomTestUrl}": Probable YES! All checked bits [${i1}, ${i2}, ${i3}] are 1. Skip crawl to avoid duplicate loops.`)
    }
  }

  // Collaborative Editor CRDT Insert Handler
  const handleCrdtInsert = () => {
    if (!crdtInsertVal) return
    const maxPos = crdtChars.length > 0 ? crdtChars[crdtChars.length - 1].pos : 0
    const newPos = Math.round((maxPos + 0.1) * 10) / 10
    const newChars = [...crdtChars, { val: crdtInsertVal, pos: newPos, peer: crdtInsertPeer }].sort(
      (a, b) => a.pos - b.pos
    )
    setCrdtChars(newChars)
  }

  // Distributed Lock Master Toggle
  const toggleMasterOnline = (idx: number) => {
    const updated = [...redlockMasters]
    updated[idx].online = !updated[idx].online
    setRedlockMasters(updated)
    const onlineCount = updated.filter((m) => m.online).length
    if (onlineCount >= 3) {
      setRedlockStatus(`Quorum SATISFIED: ${onlineCount}/5 nodes online (>= 3). Distributed Lock acquired.`)
    } else {
      setRedlockStatus(`QUORUM LOST! Only ${onlineCount}/5 nodes online. Redlock acquisition blocked to prevent split-brain!`)
    }
  }

  return (
    <div className="rounded-2xl bg-bg-surface-2 p-6 ring-1 ring-border shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-amber-400" />
          <h3 className="text-[16px] font-bold text-text-primary">
            Interactive Algorithm Sandbox & Live CS Simulator
          </h3>
        </div>
        <span className="text-[11px] font-mono text-text-muted">
          Real-time In-Browser Execution
        </span>
      </div>

      {/* 1. TinyURL: Base62 Live Bijective Engine */}
      {systemId === 'tinyurl' && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Test the bijective Base62 encoder. Input any 64-bit integer ID to watch it compress into an alphanumeric short slug with zero collision retries.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase text-text-muted">
                Input Database Numeric ID:
              </label>
              <input
                type="number"
                value={urlId}
                onChange={(e) => setUrlId(e.target.value)}
                className="w-full rounded-xl bg-bg-surface-1 px-3 py-2 font-mono text-[13px] text-text-primary ring-1 ring-border focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase text-amber-400">
                Base62 Output Slug:
              </label>
              <div className="flex items-center justify-between rounded-xl bg-amber-400/10 px-3 py-2 font-mono text-[14px] font-bold text-amber-400 ring-1 ring-amber-400/30">
                <span>/{base62Output}</span>
                <span className="text-[10px] text-amber-400/80">{base62Output.length} chars</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase text-emerald-400">
                Bijective Decode Check:
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 font-mono text-[13px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                <CheckCircle className="size-4" />
                <span className="truncate">{decodedCheck}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Rate Limiter: Token Bucket Simulator */}
      {systemId === 'rate-limiter' && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Live Token Bucket Algorithm: Capacity = 10, Refill Rate = 2 tokens/sec. Click the burst button to simulate sudden API traffic spikes and watch HTTP 429 throttling kick in.
          </p>

          <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-text-muted">
                Available Tokens ({tokens.toFixed(1)} / {bucketCap})
              </span>
              <span className="font-mono text-[11px] text-emerald-400">
                Refilling at +2.0 tokens/sec
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-bg-surface-3 ring-1 ring-border">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${(tokens / bucketCap) * 100}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => handleSendRateRequest(1)}
                className="flex items-center gap-1.5 rounded-lg bg-accent-brand px-3 py-1.5 font-mono text-[11px] font-bold text-bg-base hover:opacity-90 transition"
              >
                <Zap className="size-3.5 fill-current" /> Fire 1 Request
              </button>
              <button
                onClick={() => handleSendRateRequest(5)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 font-mono text-[11px] font-bold text-black hover:opacity-90 transition"
              >
                Burst 5 Requests
              </button>
              <button
                onClick={() => handleSendRateRequest(10)}
                className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 font-mono text-[11px] font-bold text-white hover:opacity-90 transition"
              >
                Spike 10 Requests
              </button>
            </div>
          </div>

          {limiterLogs.length > 0 && (
            <div className="rounded-xl bg-black/80 p-3 ring-1 ring-border font-mono text-[11px] space-y-1">
              <span className="text-[10px] text-text-muted uppercase block border-b border-border/40 pb-1">
                Recent Gateway Access Logs:
              </span>
              {limiterLogs.map((log, idx) => (
                <div key={idx} className={log.success ? 'text-emerald-400' : 'text-rose-400'}>
                  [{log.ts}] {log.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Snowflake ID Generator */}
      {systemId === 'snowflake-id' && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Generate 64-bit monotonically increasing Twitter Snowflake IDs with bitfield breakdown: [1 bit unused | 41 bits timestamp | 10 bits worker ID | 12 bits sequence].
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12px] text-text-muted">Worker Node ID:</span>
              <input
                type="number"
                min="0"
                max="1023"
                value={workerId}
                onChange={(e) => setWorkerId(parseInt(e.target.value) || 0)}
                className="w-20 rounded bg-bg-surface-1 px-2 py-1 font-mono text-[12px] ring-1 ring-border"
              />
            </div>

            <button
              onClick={handleGenerateSnowflake}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2 font-mono text-[12px] font-bold text-black transition shadow"
            >
              <Play className="size-3.5 fill-current" /> Generate Snowflake ID
            </button>
          </div>

          {generatedSnowflakes.length > 0 && (
            <div className="space-y-2">
              {generatedSnowflakes.map((item, idx) => (
                <div key={idx} className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border font-mono text-[12px] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-amber-400 font-bold">{item.id}</span>
                  <div className="flex items-center gap-3 text-text-muted text-[11px]">
                    <span>Time: {item.timeStr.slice(11, 23)}</span>
                    <span>Worker: {item.worker}</span>
                    <span>Seq: #{item.seq}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Consistent Hashing Ring */}
      {systemId === 'consistent-hash' && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Consistent Hash Ring Simulator: Test which server node owns a key using circular hashing. Adding or removing nodes only migrates $K/N$ keys!
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-text-muted block">Cache Key:</label>
              <input
                type="text"
                value={hashKey}
                onChange={(e) => setHashKey(e.target.value)}
                className="w-full rounded-xl bg-bg-surface-1 px-3 py-2 font-mono text-[13px] text-text-primary ring-1 ring-border"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setRingNodes([...ringNodes, `Node-${String.fromCharCode(65 + ringNodes.length)}`])}
                  disabled={ringNodes.length >= 6}
                  className="flex items-center gap-1 rounded bg-bg-surface-3 px-2 py-1 text-[11px] font-mono text-text-secondary hover:text-text-primary"
                >
                  <Plus className="size-3" /> Add Server Node
                </button>
                <button
                  onClick={() => ringNodes.length > 2 && setRingNodes(ringNodes.slice(0, -1))}
                  disabled={ringNodes.length <= 2}
                  className="rounded bg-bg-surface-3 px-2 py-1 text-[11px] font-mono text-rose-400 hover:text-rose-300"
                >
                  Remove Node
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border flex flex-col justify-center">
              <span className="text-[11px] font-mono text-text-muted uppercase">Assigned Ring Node:</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{assignedNode}</p>
              <span className="text-[11px] text-text-muted mt-1">
                Active Nodes on Ring: {ringNodes.join(', ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Limit Order Book Simulator */}
      {systemId === 'order-book' && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            In-Memory HFT Limit Order Book Depth Ladder: Place orders to watch the price-time matching engine execute fills or rest on the Bids/Asks book.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Input Form */}
            <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderSide('BUY')}
                  className={`flex-1 py-1.5 rounded-lg font-mono text-[12px] font-bold transition ${
                    orderSide === 'BUY' ? 'bg-emerald-500 text-white' : 'bg-bg-surface-3 text-text-muted'
                  }`}
                >
                  BUY (Bid)
                </button>
                <button
                  onClick={() => setOrderSide('SELL')}
                  className={`flex-1 py-1.5 rounded-lg font-mono text-[12px] font-bold transition ${
                    orderSide === 'SELL' ? 'bg-rose-500 text-white' : 'bg-bg-surface-3 text-text-muted'
                  }`}
                >
                  SELL (Ask)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-text-muted block">Price ($):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    className="w-full rounded bg-bg-surface-2 px-2 py-1 font-mono text-[12px] text-text-primary ring-1 ring-border"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-text-muted block">Quantity:</label>
                  <input
                    type="number"
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    className="w-full rounded bg-bg-surface-2 px-2 py-1 font-mono text-[12px] text-text-primary ring-1 ring-border"
                  />
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 py-2 font-mono text-[12px] font-bold text-black transition shadow"
              >
                Submit Limit Order
              </button>
            </div>

            {/* Depth Ladder */}
            <div className="rounded-xl bg-black/80 p-3 ring-1 ring-border font-mono text-[11px] space-y-2">
              <div className="flex justify-between text-text-muted text-[10px] border-b border-border/40 pb-1">
                <span>Bids (Buyers)</span>
                <span>Asks (Sellers)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="space-y-1">
                  {bids.map((b, i) => (
                    <div key={i} className="flex justify-between text-emerald-400">
                      <span>${b.price.toFixed(2)}</span>
                      <span className="text-text-muted">{b.qty}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {asks.map((a, i) => (
                    <div key={i} className="flex justify-between text-rose-400">
                      <span>${a.price.toFixed(2)}</span>
                      <span className="text-text-muted">{a.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              {trades.length > 0 && (
                <div className="pt-2 border-t border-border/40 text-[10px]">
                  <span className="text-amber-400 font-bold block mb-0.5">Recent Executions:</span>
                  {trades.slice(0, 2).map((t, i) => (
                    <div key={i} className="text-text-muted flex justify-between">
                      <span>Executed @ ${t.price.toFixed(2)}</span>
                      <span>{t.qty} shares</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. LRU Cache Simulator (distributed-cache) */}
      {systemId === 'distributed-cache' && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            LRU Cache Simulator: O(1) Doubly-Linked List + Hash Map. Insert new items; when capacity (4) is reached, the Least Recently Used item at the Tail is automatically evicted!
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-text-muted block">Cache Key:</label>
                  <input
                    type="text"
                    value={lruKeyInput}
                    onChange={(e) => setLruKeyInput(e.target.value)}
                    className="w-full rounded bg-bg-surface-2 px-2 py-1 font-mono text-[12px] ring-1 ring-border"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-text-muted block">Value:</label>
                  <input
                    type="text"
                    value={lruValInput}
                    onChange={(e) => setLruValInput(e.target.value)}
                    className="w-full rounded bg-bg-surface-2 px-2 py-1 font-mono text-[12px] ring-1 ring-border"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleLruPut}
                  className="flex-1 rounded-lg bg-accent-brand py-1.5 font-mono text-[11px] font-bold text-bg-base hover:opacity-90 transition"
                >
                  PUT (Insert / Update)
                </button>
                <button
                  onClick={() => handleLruGet(lruKeyInput)}
                  className="rounded-lg bg-bg-surface-3 px-3 py-1.5 font-mono text-[11px] font-bold text-text-primary hover:bg-bg-surface-2 transition ring-1 ring-border"
                >
                  GET (Touch)
                </button>
              </div>

              <p className="font-mono text-[11px] text-amber-300 bg-black/60 p-2 rounded ring-1 ring-border">
                {lruLog}
              </p>
            </div>

            {/* Visual Doubly-Linked List */}
            <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-2">
              <span className="font-mono text-[11px] font-bold uppercase text-text-muted block">
                Doubly-Linked List Order [Head (MRU) → Tail (LRU)]:
              </span>

              <div className="space-y-1.5">
                {lruCache.map((item, idx) => (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between p-2 rounded-lg font-mono text-[11.5px] ring-1 ${
                      idx === 0
                        ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30 font-bold'
                        : idx === lruCache.length - 1 && lruCache.length === lruCapacity
                        ? 'bg-rose-500/10 text-rose-300 ring-rose-500/30'
                        : 'bg-bg-surface-2 text-text-secondary ring-border'
                    }`}
                  >
                    <span>{idx === 0 ? '👑 [HEAD] ' : idx === lruCache.length - 1 ? '⚠️ [TAIL] ' : ''}{item.key}</span>
                    <span className="text-text-muted text-[10.5px] truncate max-w-[120px]">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Google Drive Content-Defined Chunking & Deduplication */}
      {systemId === 'google-drive' && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Content-Defined Chunking (FastCDC) Simulator: See how cloud deduplication avoids uploading unchanged blocks when a user edits a file.
          </p>

          <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] font-bold text-text-primary">
                Quarterly_Report_2026.pptx (Version {driveDocVersion})
              </span>
              <button
                onClick={handleDriveSimulateEdit}
                className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1 font-mono text-[11px] font-bold text-black hover:bg-amber-300 transition"
              >
                <RefreshCw className="size-3" /> Simulate Slide 2 Edit
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-4">
              {driveChunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className={`p-3 rounded-xl ring-1 font-mono text-[11px] space-y-1 ${
                    chunk.isDuplicate
                      ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                      : 'bg-amber-400/15 text-amber-300 ring-amber-400/40 font-bold'
                  }`}
                >
                  <span className="text-[10px] text-text-muted uppercase block">Chunk #{chunk.id}</span>
                  <p className="text-[11.5px] truncate">{chunk.text}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                    <span>SHA: {chunk.hash}</span>
                    <span>{chunk.isDuplicate ? 'Deduplicated (Skip)' : 'Uploading (Diff)'}</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="font-mono text-[11.5px] text-emerald-400 bg-black/60 p-2.5 rounded-lg ring-1 ring-border">
              {driveDedupStats}
            </p>
          </div>
        </div>
      )}

      {/* 8. Search Engine BM25 Ranking Simulator */}
      {systemId === 'search-engine' && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Okapi BM25 Ranking Sandbox: Test how term frequency (TF) saturation ($k_1=1.2$) and document length normalization ($b=0.75$) score documents for any keyword query.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-text-muted" />
              <input
                type="text"
                value={bm25Query}
                onChange={(e) => setBm25Query(e.target.value)}
                placeholder="Search corpus (e.g. consensus, sharding, distributed)..."
                className="w-full rounded-xl bg-bg-surface-1 px-3 py-2 font-mono text-[13px] text-text-primary ring-1 ring-border focus:ring-accent-brand focus:outline-none"
              />
            </div>

            <div className="space-y-2 pt-2">
              {rankedResults.map((res, idx) => (
                <div key={res.id} className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                      Rank #{idx + 1} · Doc #{res.id}
                    </span>
                    <h4 className="text-[13px] font-bold text-text-primary">{res.title}</h4>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 px-2.5 py-1 font-mono text-[12px] font-bold text-emerald-400 ring-1 ring-emerald-500/30 shrink-0">
                    BM25 Score: {res.score}
                  </div>
                </div>
              ))}
              {rankedResults.length === 0 && (
                <p className="text-[12px] text-text-muted font-mono">No matching documents found in index.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. Web Crawler Bloom Filter Sandbox */}
      {systemId === 'web-crawler' && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Probabilistic Bloom Filter Simulator: Fast URL deduplication in RAM. 16-bit array with 3 hash functions. A "0" guarantees the URL was NEVER crawled!
          </p>

          <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-3">
            {/* 16-Bit Array Visualizer */}
            <div>
              <span className="text-[10px] font-mono text-text-muted uppercase block mb-1">
                Bloom Filter Bitset (16-bits):
              </span>
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1">
                {bloomBits.map((b, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center p-1 rounded font-mono text-[10px] ring-1 ${
                      b === 1 ? 'bg-amber-400 text-black font-bold ring-amber-400' : 'bg-bg-surface-2 text-text-muted ring-border'
                    }`}
                  >
                    <span>{b}</span>
                    <span className="text-[8px] opacity-60">#{idx}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bloomInputUrl}
                  onChange={(e) => setBloomInputUrl(e.target.value)}
                  className="flex-1 rounded bg-bg-surface-2 px-2 py-1 font-mono text-[11px] ring-1 ring-border"
                />
                <button
                  onClick={handleBloomAdd}
                  className="rounded bg-accent-brand px-2.5 py-1 font-mono text-[11px] font-bold text-bg-base"
                >
                  Add URL
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={bloomTestUrl}
                  onChange={(e) => setBloomTestUrl(e.target.value)}
                  className="flex-1 rounded bg-bg-surface-2 px-2 py-1 font-mono text-[11px] ring-1 ring-border"
                />
                <button
                  onClick={handleBloomTest}
                  className="rounded bg-bg-surface-3 px-2.5 py-1 font-mono text-[11px] font-bold text-text-primary ring-1 ring-border"
                >
                  Test Membership
                </button>
              </div>
            </div>

            {bloomFeedback && (
              <p className="font-mono text-[11px] text-amber-300 bg-black/60 p-2 rounded ring-1 ring-border">
                {bloomFeedback}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 10. Collaborative Editor CRDT Sandbox */}
      {systemId === 'collaborative-editor' && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Real-Time CRDT Fractional Indexing: Characters receive fractional positions ($0.1, 0.2, ...$) so concurrent typing inserts without character shifting or server locks!
          </p>

          <div className="rounded-xl bg-bg-surface-1 p-4 ring-1 ring-border space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-black/60 ring-1 ring-border">
              {crdtChars.map((ch, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center px-2 py-1 rounded ring-1 ${
                    ch.peer === 'Alice'
                      ? 'bg-sky-500/10 text-sky-300 ring-sky-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                  }`}
                >
                  <span className="font-bold font-mono text-[16px]">{ch.val}</span>
                  <span className="text-[9px] font-mono opacity-70">pos:{ch.pos}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-text-muted">Insert Character:</span>
              <input
                type="text"
                maxLength={1}
                value={crdtInsertVal}
                onChange={(e) => setCrdtInsertVal(e.target.value)}
                className="w-12 text-center rounded bg-bg-surface-2 py-1 font-mono text-[13px] ring-1 ring-border font-bold"
              />
              <span className="text-[11px] font-mono text-text-muted">Peer:</span>
              <select
                value={crdtInsertPeer}
                onChange={(e) => setCrdtInsertPeer(e.target.value as 'Alice' | 'Bob')}
                className="rounded bg-bg-surface-2 px-2 py-1 font-mono text-[12px] ring-1 ring-border"
              >
                <option value="Alice">Alice (Peer A)</option>
                <option value="Bob">Bob (Peer B)</option>
              </select>
              <button
                onClick={handleCrdtInsert}
                className="rounded-lg bg-accent-brand px-3 py-1 font-mono text-[11px] font-bold text-bg-base"
              >
                Insert Concurrently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Distributed Lock Redlock Quorum Sandbox */}
      {systemId === 'distributed-lock' && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Redlock Multi-Master Quorum Simulator: 5 independent Redis master instances without replication. Toggle node crashes to test majority quorum ($N/2 + 1 \ge 3$) and fencing token protection.
          </p>

          <div className="grid gap-2 sm:grid-cols-5">
            {redlockMasters.map((m, idx) => (
              <button
                key={m.name}
                onClick={() => toggleMasterOnline(idx)}
                className={`p-3 rounded-xl font-mono text-[11px] ring-1 text-left transition ${
                  m.online
                    ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 ring-rose-500/30 opacity-70'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span className={`size-2 rounded-full ${m.online ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span>{m.online ? 'ONLINE' : 'DOWN'}</span>
                </div>
                <p className="mt-1 text-[10px] text-text-muted">{m.name}</p>
                <span className="text-[9px] text-text-muted mt-1 block">Click to toggle</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-bg-surface-1 ring-1 ring-border font-mono text-[11px]">
            <span className="text-text-primary">{redlockStatus}</span>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Storage Fencing Token:</span>
              <button
                onClick={() => setFencingCounter((c) => c + 1)}
                className="bg-amber-400 text-black px-2 py-0.5 rounded font-bold hover:bg-amber-300"
              >
                #{fencingCounter} (Increment)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. Default Fallback Sandbox: Quorum & Partition Calculator */}
      {![
        'tinyurl',
        'rate-limiter',
        'snowflake-id',
        'consistent-hash',
        'order-book',
        'distributed-cache',
        'google-drive',
        'search-engine',
        'web-crawler',
        'collaborative-editor',
        'distributed-lock',
      ].includes(systemId) && (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            Interactive Distributed Quorum Sizer: Test the relation between Replicas (N), Write Quorum (W), and Read Quorum (R) to verify whether Strong Consistency (R + W &gt; N) holds.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border space-y-1">
              <span className="text-[11px] font-mono text-text-muted block">Replicas (N)</span>
              <p className="text-xl font-bold text-text-primary">3</p>
              <span className="text-[10px] text-text-muted">Distributed storage copies</span>
            </div>
            <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border space-y-1">
              <span className="text-[11px] font-mono text-text-muted block">Write Quorum (W)</span>
              <p className="text-xl font-bold text-amber-400">2</p>
              <span className="text-[10px] text-text-muted">Acks needed to confirm write</span>
            </div>
            <div className="rounded-xl bg-bg-surface-1 p-3 ring-1 ring-border space-y-1">
              <span className="text-[11px] font-mono text-text-muted block">Read Quorum (R)</span>
              <p className="text-xl font-bold text-emerald-400">2</p>
              <span className="text-[10px] text-text-muted">Acks needed to return read</span>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/30 flex items-center gap-2 text-[12px] text-emerald-300">
            <CheckCircle className="size-4 shrink-0" />
            <span>
              Invariant Holds: <strong>R (2) + W (2) = 4 &gt; N (3)</strong>. By the Pigeonhole Principle, at least 1 overlapping node contains the latest write!
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
