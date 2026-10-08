import React, { useState, useEffect, useMemo } from 'react'
import {
  Cpu,
  Database,
  Server,
  HardDrive,
  Layers,
  Zap,
  Shield,
  Activity,
  Globe,
  RefreshCw,
  AlertTriangle,
  Radio,
  Network,
  Clock,
  ArrowRight,
  Lock,
  FileCode,
  TrendingUp,
  Sparkles,
  Wifi,
  Smartphone,
  Search,
  MapPin,
  Compass,
  Gauge,
  Bell,
  Key,
  DollarSign,
  BarChart2,
  Users,
  Video,
  Box,
  Archive,
  FileText,
  Terminal,
  Shuffle,
  Filter,
} from 'lucide-react'
import type { SystemDesignModel } from '../types'
import { SYSTEM_METADATA_REGISTRY } from '../data/systemMetadataRegistry'

// ============================================================================
// 1. BESPOKE SYSTEM ARCHETYPAL BLUEPRINT METADATA FOR ALL 31 SYSTEMS
// ============================================================================
export type LldDiagramType =
  | 'hash-ring'
  | 'commit-log'
  | 'bitfield-64'
  | 'lru-doubly-linked'
  | 'double-entry'
  | 'order-book'
  | 'spatial-hex'
  | 'crypto-ratchet'
  | 'token-bucket'
  | 'video-chunk'
  | 'erasure-coding'
  | 'dag-graph'
  | 'inverted-index'
  | 'tsdb-xor'
  | 'dns-tree'
  | 'webhook-jitter'
  | 'api-filters'
  | 'anycast-edge'
  | 'udp-prediction'
  | 'crdt-tree'
  | 'fanout-matrix'
  | 'paste-cas'
  | 'risk-score'
  | 'redlock-consensus'
  | 'vector-clocks'
  | 'fanout-queues'
  | 'crawler-frontier'
  | 'generic-cluster'

export interface BespokeSystemVisualConfig {
  glyph: string
  subGlyph: string
  diagramTitle: string
  flowNodes: Array<{ name: string; role: string; icon: any; tier: string }>
  animatedPipes: Array<{ from: number; to: number; label: string; protocol: string }>
  lldDiagramType: LldDiagramType
  specs: {
    engineHeartbeat: string
    memoryFootprint: string
    concurrencyModel: string
    failureGuarantee: string
  }
}

export const BESPOKE_SYSTEM_VISUALS: Record<string, BespokeSystemVisualConfig> = {
  tinyurl: {
    glyph: 'Base62 ➜ URL',
    subGlyph: 'Bijective Key Generation & Bloom Filter',
    diagramTitle: 'Base62 Key Generation Service & Distributed Cache Tier',
    flowNodes: [
      { name: 'Browser Client', role: 'POST /v1/shorten', icon: Globe, tier: 'Ingress' },
      { name: 'API Gateway', role: 'Rate limit & Auth', icon: Shield, tier: 'Edge' },
      { name: 'KGS Range Broker', role: 'Pre-allocated 1M batches', icon: Cpu, tier: 'Key Gen' },
      { name: 'Redis Cache', role: 'Sub-ms URL lookup', icon: Zap, tier: 'Cache' },
      { name: 'PostgreSQL DB', role: 'Range partitioned storage', icon: Database, tier: 'Storage' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'HTTP/2 TLS', protocol: 'HTTPS' },
      { from: 1, to: 2, label: 'gRPC Request', protocol: 'gRPC' },
      { from: 2, to: 3, label: 'Range Reserve', protocol: 'TCP' },
      { from: 3, to: 4, label: 'Write Mapping', protocol: 'SQL' },
    ],
    lldDiagramType: 'bitfield-64',
    specs: {
      engineHeartbeat: 'Atomic Counter Reservation (1M chunks)',
      memoryFootprint: '24 GB Redis LRU Cache',
      concurrencyModel: 'Stateless Golang Gin Workers',
      failureGuarantee: 'Collision-free monotonic integer ID guarantee',
    },
  },
  'distributed-cache': {
    glyph: 'LRU Cache [O(1)]',
    subGlyph: 'Doubly-Linked List + In-Memory Hash Map',
    diagramTitle: 'Distributed In-Memory Cache Engine & Async Replica Mesh',
    flowNodes: [
      { name: 'Application Pods', role: 'GET /user:42', icon: Server, tier: 'Clients' },
      { name: 'Proxy Sharder', role: 'Consistent Hash Router', icon: Network, tier: 'Proxy' },
      { name: 'Master Node', role: 'O(1) Hash Map + LRU List', icon: Cpu, tier: 'In-Memory' },
      { name: 'AOF Logger', role: 'Append-Only fsync Disk', icon: HardDrive, tier: 'Persistence' },
      { name: 'Replica Slave', role: 'Non-blocking replication stream', icon: Database, tier: 'Replica' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'TCP RESP', protocol: 'RESP' },
      { from: 1, to: 2, label: 'Hash slot route', protocol: 'TCP' },
      { from: 2, to: 3, label: 'AOF background write', protocol: 'fsync' },
      { from: 2, to: 4, label: 'PSYNC replication buffer', protocol: 'TCP' },
    ],
    lldDiagramType: 'lru-doubly-linked',
    specs: {
      engineHeartbeat: 'Event-loop multiplexing (epoll/kqueue)',
      memoryFootprint: '128 GB Hot RAM with jemalloc fragmentation manager',
      concurrencyModel: 'Single-threaded CPU core execution loop per shard',
      failureGuarantee: 'Sub-second automatic failover via Redis Sentinel / Raft',
    },
  },
  'kafka-broker': {
    glyph: 'Commit Log [Partition]',
    subGlyph: 'Zero-Copy DMA & Sequential NVMe Disk IO',
    diagramTitle: 'Distributed Commit Log Partition Mesh & Controller Consensus',
    flowNodes: [
      { name: 'Producer Apps', role: 'Batch compressed records', icon: Activity, tier: 'Ingress' },
      { name: 'KRaft Controller', role: 'Quorum metadata manager', icon: Shield, tier: 'Control' },
      { name: 'Broker Leader', role: 'Partition log append-only', icon: Server, tier: 'Partition 0' },
      { name: 'Follower Replica', role: 'In-sync replica (ISR) fetcher', icon: HardDrive, tier: 'ISR Peer' },
      { name: 'Consumer Group', role: 'Committed offset tracking', icon: Users, tier: 'Egress' },
    ],
    animatedPipes: [
      { from: 0, to: 2, label: 'Batch send (Snappy)', protocol: 'Kafka TCP' },
      { from: 1, to: 2, label: 'Leader epoch lease', protocol: 'KRaft' },
      { from: 2, to: 3, label: 'ISR sync fetch', protocol: 'TCP' },
      { from: 2, to: 4, label: 'Zero-copy sendfile(2)', protocol: 'DMA' },
    ],
    lldDiagramType: 'commit-log',
    specs: {
      engineHeartbeat: 'Sequential disk write throughput: 1.2 GB/sec',
      memoryFootprint: 'Linux PageCache caching active partition heads',
      concurrencyModel: 'Non-blocking Java NIO network processor threads',
      failureGuarantee: 'Strict total ordering per partition key + min.insync.replicas=2',
    },
  },
  'distributed-lock': {
    glyph: 'Redlock [Consensus]',
    subGlyph: '5-Node Drift Clock & Monotonic Fencing Token',
    diagramTitle: 'Multi-Master Distributed Lock & Fencing Token Authority',
    flowNodes: [
      { name: 'Worker A', role: 'Acquire lock with TTL', icon: Cpu, tier: 'Client' },
      { name: 'Redis Master 1', role: 'SET resource NX PX 5000', icon: Database, tier: 'Quorum 1' },
      { name: 'Redis Master 2', role: 'SET resource NX PX 5000', icon: Database, tier: 'Quorum 2' },
      { name: 'Redis Master 3', role: 'SET resource NX PX 5000', icon: Database, tier: 'Quorum 3' },
      { name: 'Storage Target', role: 'Validates fencing token >= N', icon: HardDrive, tier: 'Protected' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'SETNX token', protocol: 'RESP' },
      { from: 0, to: 2, label: 'SETNX token', protocol: 'RESP' },
      { from: 0, to: 3, label: 'SETNX token', protocol: 'RESP' },
      { from: 0, to: 4, label: 'Write with Fencing Token', protocol: 'gRPC' },
    ],
    lldDiagramType: 'redlock-consensus',
    specs: {
      engineHeartbeat: 'Clock drift formula: validity = TTL - elapsed - drift',
      memoryFootprint: 'Minimal in-memory key namespace',
      concurrencyModel: 'Majority Quorum consensus (3/5 independent nodes)',
      failureGuarantee: 'Zero split-brain mutual exclusion via monotonic fencing tokens',
    },
  },
  'snowflake-id': {
    glyph: '64-Bit Binary ID',
    subGlyph: 'Time (41b) + Machine (10b) + Seq (12b)',
    diagramTitle: '64-bit Monotonic Distributed ID Generation Bitfield',
    flowNodes: [
      { name: 'App Services', role: 'GET /next-id', icon: Server, tier: 'Client' },
      { name: 'Snowflake Worker 1', role: 'Epoch ms + MachineID 0x01', icon: Cpu, tier: 'Generator' },
      { name: 'Snowflake Worker 2', role: 'Epoch ms + MachineID 0x02', icon: Cpu, tier: 'Generator' },
      { name: 'ZooKeeper / K8s', role: 'Worker ID lease allocator', icon: Shield, tier: 'Coordination' },
      { name: 'Order Engine', role: 'Time-sorted insert into B+Tree', icon: Database, tier: 'Consumer' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'gRPC NextId()', protocol: 'gRPC' },
      { from: 3, to: 1, label: 'Lease node_id=1', protocol: 'TCP' },
      { from: 1, to: 4, label: 'Unique int64 primary key', protocol: 'Internal' },
    ],
    lldDiagramType: 'bitfield-64',
    specs: {
      engineHeartbeat: 'Clock backwards protection: wait until clock catches up',
      memoryFootprint: 'Zero persistent storage needed on generator pods',
      concurrencyModel: 'Atomic bitwise CAS counter per worker thread',
      failureGuarantee: 'Strict k-sortable monotonic IDs without database roundtrips',
    },
  },
  'consistent-hash': {
    glyph: '360° Hash Ring',
    subGlyph: 'Virtual Nodes (Vnodes) & Clockwise Successor Walk',
    diagramTitle: 'Consistent Hashing Ring Topology with MD5/Murmur3 Sharding',
    flowNodes: [
      { name: 'Client Request', role: 'hash("user:90210")', icon: Globe, tier: 'Ingress' },
      { name: 'Hashing Router', role: 'Binary search ring lookup', icon: Network, tier: 'Proxy' },
      { name: 'Node Alpha (Vnodes)', role: 'Token range 0x00..0x3F', icon: Server, tier: 'Partition' },
      { name: 'Node Beta (Vnodes)', role: 'Token range 0x40..0x7F', icon: Server, tier: 'Partition' },
      { name: 'Node Gamma (Vnodes)', role: 'Token range 0x80..0xFF', icon: Server, tier: 'Partition' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Key hash lookup', protocol: 'TCP' },
      { from: 1, to: 2, label: 'Clockwise successor route', protocol: 'TCP' },
      { from: 1, to: 3, label: 'Failover replica write', protocol: 'TCP' },
    ],
    lldDiagramType: 'hash-ring',
    specs: {
      engineHeartbeat: 'Murmur3 128-bit uniform distribution check',
      memoryFootprint: 'Red-Black tree of 256 virtual nodes per physical host',
      concurrencyModel: 'O(log V) binary search on sorted token array',
      failureGuarantee: 'Only K/N keys relocated when node joins or crashes',
    },
  },
  'dynamo-kv': {
    glyph: 'Dynamo Key-Value',
    subGlyph: 'Vector Clock Causality & Merkle Tree Anti-Entropy',
    diagramTitle: 'Decentralized Sloppy Quorum Mesh & Vector Clock Matrix',
    flowNodes: [
      { name: 'Client App', role: 'PUT /cart:104 val=item', icon: Server, tier: 'Client' },
      { name: 'Coordinator Node', role: 'R+W > N Quorum orchestrator', icon: Network, tier: 'Coordinator' },
      { name: 'Replica Node A', role: 'Vector clock [A:2, B:1]', icon: Database, tier: 'Storage' },
      { name: 'Replica Node B', role: 'Hinted handoff buffer', icon: Database, tier: 'Storage' },
      { name: 'Merkle Sync Sync', role: 'Background anti-entropy audit', icon: RefreshCw, tier: 'Auditor' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Quorum PUT (W=2, N=3)', protocol: 'gRPC' },
      { from: 1, to: 2, label: 'Write with Vector Clock', protocol: 'Internal' },
      { from: 1, to: 3, label: 'Write with Vector Clock', protocol: 'Internal' },
      { from: 2, to: 4, label: 'Merkle leaf hash exchange', protocol: 'Gossip' },
    ],
    lldDiagramType: 'vector-clocks',
    specs: {
      engineHeartbeat: 'Gossip protocol state dissemination every 200ms',
      memoryFootprint: 'LSM-tree memtable + SSTables with Bloom filters',
      concurrencyModel: 'Sloppy Quorum: configurable R + W > N tunable consistency',
      failureGuarantee: 'Conflict resolution via vector clock causality or CRDT merge',
    },
  },
  'twitter-feed': {
    glyph: 'Timeline Fanout',
    subGlyph: 'Fanout-On-Write Redis RPUSH vs Celebrity Pull',
    diagramTitle: 'Hybrid Fanout Newsfeed Engine & Social Graph Sharding',
    flowNodes: [
      { name: 'Poster Client', role: 'POST /v1/tweets', icon: Smartphone, tier: 'Client' },
      { name: 'Tweet Ingestion', role: 'Writes tweet to Snowflake DB', icon: Server, tier: 'Ingress' },
      { name: 'Fanout Service', role: 'Inspects social graph followers', icon: Users, tier: 'Worker' },
      { name: 'Timeline Cache', role: 'Redis List of 800 tweet IDs', icon: Zap, tier: 'Cache' },
      { name: 'Follower Feed', role: 'GET /v1/home_timeline', icon: Smartphone, tier: 'Consumer' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Publish Tweet', protocol: 'HTTPS' },
      { from: 1, to: 2, label: 'Kafka tweet-events topic', protocol: 'Kafka' },
      { from: 2, to: 3, label: 'RPUSH home:timeline:uid', protocol: 'RESP' },
      { from: 4, to: 3, label: 'LRANGE home:timeline:uid 0 20', protocol: 'RESP' },
    ],
    lldDiagramType: 'fanout-queues',
    specs: {
      engineHeartbeat: 'Celebrity cut-off: accounts > 100k followers switch to pull',
      memoryFootprint: '800 tweet IDs * 8 bytes = 6.4 KB per active user in Redis',
      concurrencyModel: 'Distributed Go worker pool consuming fanout partitions',
      failureGuarantee: 'Eventual timeline delivery within 2.5 seconds P99',
    },
  },
  'whatsapp-chat': {
    glyph: 'E2EE Epoll Mesh',
    subGlyph: 'WebSocket Session Registry & Signal Double Ratchet',
    diagramTitle: 'Persistent WebSocket Session Mesh & End-to-End Encryption',
    flowNodes: [
      { name: 'Alice Client', role: 'Signal Ratchet encrypted msg', icon: Smartphone, tier: 'Client' },
      { name: 'Chat Gateway', role: 'Epoll multiplexer (2M sockets)', icon: Wifi, tier: 'Gateway' },
      { name: 'Session Registry', role: 'Redis hash user ➜ gateway_id', icon: Shield, tier: 'State' },
      { name: 'Offline Store', role: 'Cassandra offline inbox queue', icon: Database, tier: 'Offline' },
      { name: 'Bob Client', role: 'Real-time WebSocket push', icon: Smartphone, tier: 'Client' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Noise / TLS WebSocket', protocol: 'WSS' },
      { from: 1, to: 2, label: 'Route lookup for Bob', protocol: 'RESP' },
      { from: 1, to: 4, label: 'Direct socket forward', protocol: 'WSS' },
      { from: 1, to: 3, label: 'Fallback offline enqueue', protocol: 'CQL' },
    ],
    lldDiagramType: 'crypto-ratchet',
    specs: {
      engineHeartbeat: 'TCP keepalive pings every 55 seconds to prevent NAT drop',
      memoryFootprint: '10 KB kernel socket buffer per idle connection',
      concurrencyModel: 'Erlang/Elixir actor processes or Go goroutines per socket',
      failureGuarantee: 'At-least-once message delivery with server ACK and client double-check',
    },
  },
  'flash-sale': {
    glyph: 'Atomic Inventory',
    subGlyph: 'Redis Lua DECR Gate & Sliding Token Limiter',
    diagramTitle: 'High-Concurrency Flash Sale Inventory Gate & Order Buffer',
    flowNodes: [
      { name: 'Buyers (100k/s)', role: 'POST /v1/buy-item', icon: Users, tier: 'Ingress' },
      { name: 'WAF / Rate Limiter', role: 'Bot detection & token bucket', icon: Shield, tier: 'Edge' },
      { name: 'Redis Lua Gate', role: 'Atomic check & decrement stock', icon: Zap, tier: 'Atomic' },
      { name: 'Order Kafka Queue', role: 'Decoupled async order buffer', icon: Activity, tier: 'Buffer' },
      { name: 'Payment & DB', role: 'Async checkout processing', icon: Database, tier: 'Storage' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Burst HTTPS requests', protocol: 'HTTP/2' },
      { from: 1, to: 2, label: 'EVALSHA decr_stock.lua', protocol: 'RESP' },
      { from: 2, to: 3, label: 'Enqueue confirmed reservation', protocol: 'Kafka' },
      { from: 3, to: 4, label: 'Execute idempotency insert', protocol: 'SQL' },
    ],
    lldDiagramType: 'token-bucket',
    specs: {
      engineHeartbeat: 'Redis single-threaded Lua script guarantees zero overselling',
      memoryFootprint: 'In-memory stock counters with 10-minute hold TTL',
      concurrencyModel: 'Non-blocking rejection of 99.9% excess traffic at cache tier',
      failureGuarantee: 'Strict zero overselling invariant under 500,000 QPS burst',
    },
  },
  'youtube-stream': {
    glyph: 'HLS / DASH Engine',
    subGlyph: 'Adaptive Bitrate Ladder & Parallel Transcoding',
    diagramTitle: 'Chunked Video Transcoder Pipeline & Edge CDN Delivery',
    flowNodes: [
      { name: 'Creator Upload', role: 'Resumable MP4 upload', icon: Video, tier: 'Client' },
      { name: 'Upload Processor', role: 'Chunks raw MP4 into 4s blobs', icon: Server, tier: 'Ingress' },
      { name: 'Transcode Cluster', role: 'FFmpeg workers (1080p, 720p)', icon: Cpu, tier: 'Worker' },
      { name: 'S3 Object Storage', role: 'TS segments + M3U8 playlists', icon: Box, tier: 'Storage' },
      { name: 'CDN Edge PoPs', role: 'Geo-distributed video streaming', icon: Globe, tier: 'Egress' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'TUS Resumable Upload', protocol: 'HTTPS' },
      { from: 1, to: 2, label: 'Raw video segments', protocol: 'gRPC' },
      { from: 2, to: 3, label: 'Put HLS chunks (H.264/AV1)', protocol: 'S3 API' },
      { from: 3, to: 4, label: 'Origin pull on cache miss', protocol: 'HTTPS' },
    ],
    lldDiagramType: 'video-chunk',
    specs: {
      engineHeartbeat: 'Adaptive bitrate switching: 240p to 4K based on player bandwidth',
      memoryFootprint: 'Temporary NVMe scratch disk for video rendering',
      concurrencyModel: 'Distributed DAG task orchestration (Temporal / Celery)',
      failureGuarantee: 'Chunk checksum verification before adding segment to manifest',
    },
  },
  'youtube-video': {
    glyph: 'HLS / DASH Engine',
    subGlyph: 'Adaptive Bitrate Ladder & Parallel Transcoding',
    diagramTitle: 'Chunked Video Transcoder Pipeline & Edge CDN Delivery',
    flowNodes: [
      { name: 'Creator Upload', role: 'Resumable MP4 upload', icon: Video, tier: 'Client' },
      { name: 'Upload Processor', role: 'Chunks raw MP4 into 4s blobs', icon: Server, tier: 'Ingress' },
      { name: 'Transcode Cluster', role: 'FFmpeg workers (1080p, 720p)', icon: Cpu, tier: 'Worker' },
      { name: 'S3 Object Storage', role: 'TS segments + M3U8 playlists', icon: Box, tier: 'Storage' },
      { name: 'CDN Edge PoPs', role: 'Geo-distributed video streaming', icon: Globe, tier: 'Egress' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'TUS Resumable Upload', protocol: 'HTTPS' },
      { from: 1, to: 2, label: 'Raw video segments', protocol: 'gRPC' },
      { from: 2, to: 3, label: 'Put HLS chunks (H.264/AV1)', protocol: 'S3 API' },
      { from: 3, to: 4, label: 'Origin pull on cache miss', protocol: 'HTTPS' },
    ],
    lldDiagramType: 'video-chunk',
    specs: {
      engineHeartbeat: 'Adaptive bitrate switching: 240p to 4K based on player bandwidth',
      memoryFootprint: 'Temporary NVMe scratch disk for video rendering',
      concurrencyModel: 'Distributed DAG task orchestration (Temporal / Celery)',
      failureGuarantee: 'Chunk checksum verification before adding segment to manifest',
    },
  },
  'google-drive': {
    glyph: 'Chunk Deduplication',
    subGlyph: 'Rabin Fingerprinting & Block Hash Store',
    diagramTitle: 'Content-Addressable Block Storage & Resumable Sync Engine',
    flowNodes: [
      { name: 'Desktop Client', role: 'Rabin rolling hash chunking', icon: Smartphone, tier: 'Client' },
      { name: 'API Sync Gateway', role: 'Block metadata handshake', icon: Server, tier: 'Gateway' },
      { name: 'Block Meta DB', role: 'SHA-256 chunk deduplication', icon: Database, tier: 'Metadata' },
      { name: 'S3 Block Store', role: 'Immutable 4MB encrypted chunks', icon: Box, tier: 'Storage' },
      { name: 'Notification Hub', role: 'Websocket push to other devices', icon: Bell, tier: 'Sync' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Check Chunk Hashes', protocol: 'HTTPS' },
      { from: 1, to: 2, label: 'Query SHA-256 presence', protocol: 'SQL' },
      { from: 0, to: 3, label: 'Upload new chunks only', protocol: 'S3 API' },
      { from: 1, to: 4, label: 'Broadcast file update', protocol: 'WSS' },
    ],
    lldDiagramType: 'erasure-coding',
    specs: {
      engineHeartbeat: 'Variable-size 4MB chunking with Rabin fingerprint boundaries',
      memoryFootprint: 'Local SQLite database on client device tracking sync state',
      concurrencyModel: 'Multi-threaded chunk upload with pause/resume support',
      failureGuarantee: 'Content-addressable SHA256 integrity check prevents corruption',
    },
  },
  'payment-ledger': {
    glyph: 'Double-Entry Ledger',
    subGlyph: 'Zero-Sum Invariant (Debits == Credits)',
    diagramTitle: 'Distributed Double-Entry Financial Ledger & 2PC Coordinator',
    flowNodes: [
      { name: 'Payment API', role: 'POST /v1/charges', icon: DollarSign, tier: 'Ingress' },
      { name: 'Idempotency Key', role: 'Redis atomic lock by key', icon: Lock, tier: 'Safety' },
      { name: 'Ledger Engine', role: 'Two-Phase Commit Coordinator', icon: Shield, tier: 'Core' },
      { name: 'PostgreSQL Primary', role: 'Immutable debit/credit journal', icon: Database, tier: 'Journal' },
      { name: 'Bank Gateway', role: 'External card network settlement', icon: Globe, tier: 'Provider' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Acquire idempotency key', protocol: 'RESP' },
      { from: 1, to: 2, label: 'Dispatch payment plan', protocol: 'gRPC' },
      { from: 2, to: 3, label: 'BEGIN; INSERT debit; INSERT credit;', protocol: 'SQL' },
      { from: 2, to: 4, label: 'Card network settlement', protocol: 'HTTPS' },
    ],
    lldDiagramType: 'double-entry',
    specs: {
      engineHeartbeat: 'Double-entry accounting invariant: SUM(entries) == 0 at all times',
      memoryFootprint: 'Strict serializable isolation (PostgreSQL SSI / CockroachDB)',
      concurrencyModel: 'Distributed 2-Phase Commit with optimistic idempotency locks',
      failureGuarantee: 'Zero phantom transactions; full financial audit trail preserved',
    },
  },
  'stripe-ledger': {
    glyph: 'Double-Entry Ledger',
    subGlyph: 'Zero-Sum Invariant (Debits == Credits)',
    diagramTitle: 'Distributed Double-Entry Financial Ledger & 2PC Coordinator',
    flowNodes: [
      { name: 'Payment API', role: 'POST /v1/charges', icon: DollarSign, tier: 'Ingress' },
      { name: 'Idempotency Key', role: 'Redis atomic lock by key', icon: Lock, tier: 'Safety' },
      { name: 'Ledger Engine', role: 'Two-Phase Commit Coordinator', icon: Shield, tier: 'Core' },
      { name: 'PostgreSQL Primary', role: 'Immutable debit/credit journal', icon: Database, tier: 'Journal' },
      { name: 'Bank Gateway', role: 'External card network settlement', icon: Globe, tier: 'Provider' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Acquire idempotency key', protocol: 'RESP' },
      { from: 1, to: 2, label: 'Dispatch payment plan', protocol: 'gRPC' },
      { from: 2, to: 3, label: 'BEGIN; INSERT debit; INSERT credit;', protocol: 'SQL' },
      { from: 2, to: 4, label: 'Card network settlement', protocol: 'HTTPS' },
    ],
    lldDiagramType: 'double-entry',
    specs: {
      engineHeartbeat: 'Double-entry accounting invariant: SUM(entries) == 0 at all times',
      memoryFootprint: 'Strict serializable isolation (PostgreSQL SSI / CockroachDB)',
      concurrencyModel: 'Distributed 2-Phase Commit with optimistic idempotency locks',
      failureGuarantee: 'Zero phantom transactions; full financial audit trail preserved',
    },
  },
  'order-book': {
    glyph: 'LOB Matching Engine',
    subGlyph: 'Price-Time Priority Limit Order Ladder',
    diagramTitle: 'Ultra-Low Latency Order Matching Engine & Disrupter Ring Buffer',
    flowNodes: [
      { name: 'Trader FIX API', role: 'NewOrderSingle (Limit)', icon: TrendingUp, tier: 'Client' },
      { name: 'Gateway Parser', role: 'SBE binary decoder (sub-μs)', icon: Network, tier: 'Edge' },
      { name: 'Disruptor Ring', role: 'Lock-free sequential queue', icon: Zap, tier: 'RingBuffer' },
      { name: 'Matching Engine', role: 'Bids/Asks B-Tree / Doubly-Linked', icon: Cpu, tier: 'Matching' },
      { name: 'Market Data Feed', role: 'UDP Multicast order book delta', icon: Radio, tier: 'Multicast' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'FIX 4.4 / ITCH protocol', protocol: 'TCP' },
      { from: 1, to: 2, label: 'Direct ring buffer write', protocol: 'Lock-free' },
      { from: 2, to: 3, label: 'Single-thread core pinned', protocol: 'L1 Cache' },
      { from: 3, to: 4, label: 'ITCH execution broadcast', protocol: 'UDP' },
    ],
    lldDiagramType: 'order-book',
    specs: {
      engineHeartbeat: 'Tick-to-trade matching latency: < 5 microseconds P99',
      memoryFootprint: 'Pre-allocated contiguous C++ memory arrays (Zero GC pauses)',
      concurrencyModel: 'Single core pinned thread processing deterministic event queue',
      failureGuarantee: 'Strict price-time FIFO execution ordering; AOF replay journal',
    },
  },
  'robinhood-order-book': {
    glyph: 'LOB Matching Engine',
    subGlyph: 'Price-Time Priority Limit Order Ladder',
    diagramTitle: 'Ultra-Low Latency Order Matching Engine & Disrupter Ring Buffer',
    flowNodes: [
      { name: 'Trader FIX API', role: 'NewOrderSingle (Limit)', icon: TrendingUp, tier: 'Client' },
      { name: 'Gateway Parser', role: 'SBE binary decoder (sub-μs)', icon: Network, tier: 'Edge' },
      { name: 'Disruptor Ring', role: 'Lock-free sequential queue', icon: Zap, tier: 'RingBuffer' },
      { name: 'Matching Engine', role: 'Bids/Asks B-Tree / Doubly-Linked', icon: Cpu, tier: 'Matching' },
      { name: 'Market Data Feed', role: 'UDP Multicast order book delta', icon: Radio, tier: 'Multicast' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'FIX 4.4 / ITCH protocol', protocol: 'TCP' },
      { from: 1, to: 2, label: 'Direct ring buffer write', protocol: 'Lock-free' },
      { from: 2, to: 3, label: 'Single-thread core pinned', protocol: 'L1 Cache' },
      { from: 3, to: 4, label: 'ITCH execution broadcast', protocol: 'UDP' },
    ],
    lldDiagramType: 'order-book',
    specs: {
      engineHeartbeat: 'Tick-to-trade matching latency: < 5 microseconds P99',
      memoryFootprint: 'Pre-allocated contiguous C++ memory arrays (Zero GC pauses)',
      concurrencyModel: 'Single core pinned thread processing deterministic event queue',
      failureGuarantee: 'Strict price-time FIFO execution ordering; AOF replay journal',
    },
  },
  'rate-limiter': {
    glyph: 'Token Bucket Limiter',
    subGlyph: 'Redis Sorted Set & Leaky Bucket Throttle',
    diagramTitle: 'Distributed Sliding-Window Token Bucket Rate Limiting Cluster',
    flowNodes: [
      { name: 'Client Request', role: 'GET /api/v1/resource', icon: Globe, tier: 'Ingress' },
      { name: 'API Gateway Filter', role: 'Extracts IP / API-Key', icon: Shield, tier: 'Gateway' },
      { name: 'Redis Token Cluster', role: 'Atomic Lua script token check', icon: Zap, tier: 'Limiter' },
      { name: 'Upstream Services', role: 'Processes allowed traffic', icon: Server, tier: 'Service' },
      { name: 'Throttler (429)', role: 'Returns Retry-After header', icon: AlertTriangle, tier: 'Egress' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'HTTPS request', protocol: 'HTTP/2' },
      { from: 1, to: 2, label: 'EVALSHA token_bucket.lua', protocol: 'RESP' },
      { from: 2, to: 3, label: 'Allowed: forward upstream', protocol: 'gRPC' },
      { from: 2, to: 4, label: 'Rejected: HTTP 429 response', protocol: 'HTTPS' },
    ],
    lldDiagramType: 'token-bucket',
    specs: {
      engineHeartbeat: 'Sub-millisecond Redis EVALSHA execution (< 0.8ms P99)',
      memoryFootprint: 'Sliding window ZSET: ~64 bytes per active user timestamp',
      concurrencyModel: 'Non-blocking distributed token check across 3 Redis shards',
      failureGuarantee: 'Fail-open policy on Redis timeout to protect upstream availability',
    },
  },
  'uber-dispatch': {
    glyph: 'Geospatial H3 Hex',
    subGlyph: 'Uber H3 Hexagonal Grid & QuadTree Dispatch',
    diagramTitle: 'Real-Time Geospatial Driver Location Stream & QuadTree Engine',
    flowNodes: [
      { name: 'Driver App (GPS)', role: 'Lat/Lng location ping (4s)', icon: Smartphone, tier: 'Ingress' },
      { name: 'Location Ingestion', role: 'Kafka geo-pings queue', icon: Activity, tier: 'Pipeline' },
      { name: 'H3 Spatial Index', role: 'In-memory Redis H3 hex cells', icon: MapPin, tier: 'Spatial' },
      { name: 'Dispatch Matcher', role: 'K-ring neighbor search & ETA', icon: Compass, tier: 'Matching' },
      { name: 'Rider App', role: 'Nearby drivers radar display', icon: Smartphone, tier: 'Client' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'UDP / TLS location ping', protocol: 'WSS' },
      { from: 1, to: 2, label: 'Batch stream coordinates', protocol: 'Kafka' },
      { from: 2, to: 3, label: 'Update driver cell index', protocol: 'RESP' },
      { from: 3, to: 4, label: 'Dispatch match notification', protocol: 'gRPC' },
    ],
    lldDiagramType: 'spatial-hex',
    specs: {
      engineHeartbeat: 'H3 resolution 8 (461m hexagons) k-ring neighbor scans',
      memoryFootprint: 'In-memory driver coordinate store: 200k active drivers in 50MB RAM',
      concurrencyModel: 'Event-driven geospatial stream processing via Apache Flink',
      failureGuarantee: 'Idempotent driver coordinate updates; stale drivers evicted after 30s',
    },
  },
  'web-crawler': {
    glyph: 'Mercator Frontier',
    subGlyph: 'Politeness Queues & Bloom Filter Dedup',
    diagramTitle: 'Distributed Web Crawler Frontier & Distributed HTML Parser',
    flowNodes: [
      { name: 'URL Frontier', role: 'Host-politeness FIFO queues', icon: Shuffle, tier: 'Frontier' },
      { name: 'DNS Resolver', role: 'Async cached DNS lookup', icon: Globe, tier: 'DNS' },
      { name: 'Fetch Worker Pods', role: 'Robots.txt compliant fetcher', icon: Server, tier: 'Fetcher' },
      { name: 'Parser & Extractor', role: 'Extracts links & text content', icon: FileCode, tier: 'Parser' },
      { name: 'Bloom Filter Dedup', role: '2-billion URL seen filter', icon: Filter, tier: 'Dedup' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Resolve host IP', protocol: 'DNS' },
      { from: 1, to: 2, label: 'Fetch HTML with timeout', protocol: 'HTTPS' },
      { from: 2, to: 3, label: 'Pipe raw DOM to parser', protocol: 'Internal' },
      { from: 3, to: 4, label: 'Check unvisited link URL', protocol: 'Hash' },
    ],
    lldDiagramType: 'crawler-frontier',
    specs: {
      engineHeartbeat: 'Host politeness delay: 1000ms pause between requests to same domain',
      memoryFootprint: 'Distributed Bloom filter (2 GB RAM for 10 billion URLs with 1% false pos)',
      concurrencyModel: 'Asynchronous event-loop workers fetching 25,000 pages/sec',
      failureGuarantee: 'Dead-letter queue for unreachable domains with 3 retry backoffs',
    },
  },
  'search-engine': {
    glyph: 'Inverted Index',
    subGlyph: 'Postings List with Skip Pointers & BM25 Scoring',
    diagramTitle: 'Distributed Inverted Index Postings Mesh & BM25 Ranker',
    flowNodes: [
      { name: 'Search Query', role: 'GET /search?q=database', icon: Search, tier: 'Ingress' },
      { name: 'Query Parser', role: 'Tokenize, stem, remove stop words', icon: Terminal, tier: 'Parser' },
      { name: 'Term Dictionary', role: 'FST (Finite State Transducer)', icon: FileText, tier: 'Index' },
      { name: 'Postings Lists', role: 'DocIDs & Term frequencies (TF)', icon: Database, tier: 'Postings' },
      { name: 'BM25 Ranker', role: 'Top-K heap score aggregator', icon: BarChart2, tier: 'Scorer' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Search HTTP request', protocol: 'HTTPS' },
      { from: 1, to: 2, label: 'Match terms in FST', protocol: 'Internal' },
      { from: 2, to: 3, label: 'Intersect postings lists', protocol: 'Block-read' },
      { from: 3, to: 4, label: 'Calculate BM25 relevance score', protocol: 'SIMD' },
    ],
    lldDiagramType: 'inverted-index',
    specs: {
      engineHeartbeat: 'BM25 score formula: IDF * (TF * (k1 + 1)) / (TF + k1 * (1 - b + b * (docLen/avgLen)))',
      memoryFootprint: 'FST term dictionary compressed in RAM; postings lists stored on NVMe SSD',
      concurrencyModel: 'Distributed scatter-gather across index shards with coordinate merger',
      failureGuarantee: 'Immutable Lucene segments merged via background TieredMergePolicy',
    },
  },
  'metrics-tsdb': {
    glyph: 'Gorilla TSDB',
    subGlyph: 'Delta-of-Delta Timestamps & IEEE 754 XOR Compression',
    diagramTitle: 'Gorilla Time-Series In-Memory Compactor & Storage Tier',
    flowNodes: [
      { name: 'Node Exporter', role: 'Push metrics scrape (15s)', icon: Activity, tier: 'Ingress' },
      { name: 'TSDB Head Shard', role: 'Active 2h chunks in RAM', icon: Cpu, tier: 'Head' },
      { name: 'Gorilla Compressor', role: 'Delta-of-delta timestamp XOR', icon: Zap, tier: 'Compress' },
      { name: 'Block Flusher', role: '2h chunk blocks written to disk', icon: HardDrive, tier: 'Storage' },
      { name: 'PromQL Engine', role: 'Evaluates rate() & histogram()', icon: TrendingUp, tier: 'Query' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Scrape Prometheus targets', protocol: 'HTTPS' },
      { from: 1, to: 2, label: 'Encode time diff & float XOR', protocol: 'Bitstream' },
      { from: 2, to: 3, label: 'Write immutable chunk index', protocol: 'fsync' },
      { from: 4, to: 1, label: 'Read active & disk chunks', protocol: 'PromQL' },
    ],
    lldDiagramType: 'tsdb-xor',
    specs: {
      engineHeartbeat: 'Gorilla compression achieves 1.37 bytes per sample (92% reduction)',
      memoryFootprint: 'Write-ahead log (WAL) protects in-memory Head chunk against crashes',
      concurrencyModel: 'Lock-free append to time-series ring buffers per metric label hash',
      failureGuarantee: 'WAL replay restores 100% of uncompressed samples on server reboot',
    },
  },
  'google-maps': {
    glyph: 'Routing Graph Engine',
    subGlyph: 'Contraction Hierarchies & Bidirectional Dijkstra A*',
    diagramTitle: 'Geospatial Graph Contraction Hierarchies & Vector Tiles',
    flowNodes: [
      { name: 'Rider Navigation', role: 'Origin ➜ Destination coords', icon: Compass, tier: 'Client' },
      { name: 'Tile Map Gateway', role: 'Vector map tile caching', icon: MapPin, tier: 'Tiles' },
      { name: 'Road Graph Server', role: 'Contraction Hierarchies Graph', icon: Network, tier: 'Graph' },
      { name: 'Live Traffic Hub', role: 'Real-time road speed overlays', icon: Activity, tier: 'Traffic' },
      { name: 'Route Calculator', role: 'Bidirectional Dijkstra A* search', icon: Cpu, tier: 'Routing' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Fetch vector tiles', protocol: 'HTTPS' },
      { from: 0, to: 4, label: 'Request route computation', protocol: 'gRPC' },
      { from: 3, to: 4, label: 'Inject traffic speed weights', protocol: 'Stream' },
      { from: 2, to: 4, label: 'Traverse contracted shortcuts', protocol: 'Internal' },
    ],
    lldDiagramType: 'spatial-hex',
    specs: {
      engineHeartbeat: 'Contraction Hierarchies calculate continental route in < 15ms',
      memoryFootprint: 'Compressed road network graph kept in memory (16 GB for North America)',
      concurrencyModel: 'Parallel bidirectional search from start node and destination node',
      failureGuarantee: 'Fallback to standard A* search if dynamic road closure invalidates shortcut',
    },
  },
  'job-scheduler': {
    glyph: 'Timing Wheel Engine',
    subGlyph: 'Hierarchical Timing Wheels & Distributed Worker Leases',
    diagramTitle: 'Hierarchical Timing Wheel & Distributed Worker Lease Cluster',
    flowNodes: [
      { name: 'Client App', role: 'Schedule job at T+60s', icon: Clock, tier: 'Client' },
      { name: 'Scheduler Master', role: 'Hashed timing wheel bucket', icon: Shield, tier: 'Master' },
      { name: 'Job State Store', role: 'PostgreSQL state machine', icon: Database, tier: 'Storage' },
      { name: 'Worker Lease Pool', role: 'Heartbeat worker lease lock', icon: Server, tier: 'Worker' },
      { name: 'Execution Pod', role: 'Runs idempotent task command', icon: Terminal, tier: 'Executor' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'POST /v1/jobs', protocol: 'gRPC' },
      { from: 1, to: 2, label: 'Persist state = SCHEDULED', protocol: 'SQL' },
      { from: 1, to: 3, label: 'Dispatches tick when bucket fires', protocol: 'TCP' },
      { from: 3, to: 4, label: 'Execute with lease heartbeat', protocol: 'gRPC' },
    ],
    lldDiagramType: 'dag-graph',
    specs: {
      engineHeartbeat: 'O(1) timer insertion and cancellation via hierarchical circular wheels',
      memoryFootprint: 'In-memory timer wheel for next 1 hour; future jobs stored in database',
      concurrencyModel: 'Distributed leader election via Raft or ZooKeeper ephemeral lease',
      failureGuarantee: 'At-least-once execution guarantee with task idempotency tokens',
    },
  },
  'dns-resolver': {
    glyph: 'Recursive DNS',
    subGlyph: 'Hierarchical DNS Tree (Root ➜ TLD ➜ Authoritative)',
    diagramTitle: 'Recursive DNS Hierarchical Resolver & EDNS0 Anycast Cache',
    flowNodes: [
      { name: 'Client Stub', role: 'Lookup example.com (A record)', icon: Globe, tier: 'Stub' },
      { name: 'Recursive Resolver', role: 'Validates DNSSEC & local cache', icon: Network, tier: 'Resolver' },
      { name: 'Root Server (.)', role: 'Referral to .com TLD server', icon: Server, tier: 'Root' },
      { name: 'TLD Server (.com)', role: 'Referral to auth nameserver', icon: Server, tier: 'TLD' },
      { name: 'Auth Server (NS)', role: 'Returns A: 93.184.216.34', icon: Database, tier: 'Auth' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'UDP port 53 query', protocol: 'DNS UDP' },
      { from: 1, to: 2, label: 'Iterative query to Root', protocol: 'UDP' },
      { from: 1, to: 3, label: 'Iterative query to TLD', protocol: 'UDP' },
      { from: 1, to: 4, label: 'Iterative query to Auth NS', protocol: 'UDP' },
    ],
    lldDiagramType: 'dns-tree',
    specs: {
      engineHeartbeat: 'Anycast routing directs client to nearest geographical DNS edge POP',
      memoryFootprint: 'LRU cache of DNS records bounded by authoritative TTL values',
      concurrencyModel: 'Asynchronous event loop multiplexing thousands of concurrent queries',
      failureGuarantee: 'Cryptographic DNSSEC signature validation against cache poisoning',
    },
  },
  'webhook-engine': {
    glyph: 'Webhook Engine',
    subGlyph: 'Full Jitter Exponential Backoff & HMAC-SHA256 Signing',
    diagramTitle: 'Distributed Webhook Delivery Pipeline & Exponential Retry Ladder',
    flowNodes: [
      { name: 'Internal Events', role: 'charge.succeeded event', icon: Activity, tier: 'Event' },
      { name: 'Dispatcher Queue', role: 'Kafka delivery partitions', icon: Layers, tier: 'Queue' },
      { name: 'Delivery Workers', role: 'Signs payload with HMAC-SHA256', icon: Lock, tier: 'Worker' },
      { name: 'Merchant Server', role: 'POST /webhook endpoint', icon: Globe, tier: 'Target' },
      { name: 'Dead Letter Queue', role: 'Holds failed events after 72h', icon: Archive, tier: 'DLQ' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Publish event', protocol: 'Kafka' },
      { from: 1, to: 2, label: 'Worker consumes event', protocol: 'TCP' },
      { from: 2, to: 3, label: 'HTTP POST with X-Signature', protocol: 'HTTPS' },
      { from: 2, to: 4, label: 'Exhausted retries ➜ DLQ', protocol: 'Kafka' },
    ],
    lldDiagramType: 'webhook-jitter',
    specs: {
      engineHeartbeat: 'Exponential backoff formula: sleep = min(cap, base * 2^attempt) + rand(0, sleep)',
      memoryFootprint: 'Stateless worker fleet with PostgreSQL endpoint subscription database',
      concurrencyModel: 'Per-merchant rate-limiting to prevent overloading downstream servers',
      failureGuarantee: 'At-least-once delivery with HMAC signature verifying webhook authenticity',
    },
  },
  'api-gateway': {
    glyph: 'Envoy L7 Proxy',
    subGlyph: 'Non-blocking Filter Chain (TLS ➜ JWT ➜ RateLimit ➜ Router)',
    diagramTitle: 'Cloud API Gateway L7 Filter Chain & Service Discovery Mesh',
    flowNodes: [
      { name: 'Public Client', role: 'HTTPS /api/v1/orders', icon: Globe, tier: 'Client' },
      { name: 'TLS Termination', role: 'TLS 1.3 handshake & HTTP/2', icon: Shield, tier: 'TLS' },
      { name: 'JWT Auth Filter', role: 'Validates cryptographic claims', icon: Key, tier: 'Auth' },
      { name: 'Rate Limit Filter', role: 'Token check against Redis', icon: Zap, tier: 'Throttler' },
      { name: 'Upstream Router', role: 'gRPC forward to target pod', icon: Server, tier: 'Upstream' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'TLS 1.3 ClientHello', protocol: 'HTTPS' },
      { from: 1, to: 2, label: 'Verify Bearer token', protocol: 'Internal' },
      { from: 2, to: 3, label: 'Check rate limit quota', protocol: 'RESP' },
      { from: 3, to: 4, label: 'Dynamic route dispatch', protocol: 'gRPC' },
    ],
    lldDiagramType: 'api-filters',
    specs: {
      engineHeartbeat: 'Non-blocking epoll event loop handles 250,000 req/sec per 8-core host',
      memoryFootprint: 'Dynamic route tables hot-reloaded via Envoy xDS APIs with zero downtime',
      concurrencyModel: 'Single worker thread per CPU core with shared memory connection pool',
      failureGuarantee: 'Outlier detection automatically ejects unhealthy upstream instances',
    },
  },
  'cdn-network': {
    glyph: 'Global Edge CDN',
    subGlyph: 'BGP Anycast Routing, Origin Shield & Tier-1 Edge POPs',
    diagramTitle: 'Global Anycast Edge CDN Caching & Origin Shield Architecture',
    flowNodes: [
      { name: 'End User Browser', role: 'GET /assets/app.js', icon: Globe, tier: 'User' },
      { name: 'BGP Anycast Edge', role: 'Closest geographical POP', icon: Wifi, tier: 'Edge' },
      { name: 'Local Edge Cache', role: 'RAM/NVMe cache lookup', icon: Zap, tier: 'Cache' },
      { name: 'Origin Shield', role: 'Regional consolidating cache', icon: Shield, tier: 'Shield' },
      { name: 'Customer Origin', role: 'Master application server', icon: Server, tier: 'Origin' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'BGP Anycast route', protocol: 'QUIC/HTTP3' },
      { from: 1, to: 2, label: 'Check local cache tag', protocol: 'Internal' },
      { from: 2, to: 3, label: 'Cache miss ➜ Origin Shield', protocol: 'HTTPS' },
      { from: 3, to: 4, label: 'Shield miss ➜ Origin server', protocol: 'HTTPS' },
    ],
    lldDiagramType: 'anycast-edge',
    specs: {
      engineHeartbeat: 'Edge cache hit ratio: 98.2% of static assets served without origin touch',
      memoryFootprint: 'Multi-tiered storage: Hot assets in RAM, warm assets on NVMe SSD array',
      concurrencyModel: 'Asynchronous event-driven NGINX/Rust edge workers handling 1M+ conns',
      failureGuarantee: 'Stale-while-revalidate serving protects users during origin downtime',
    },
  },
  'game-server': {
    glyph: 'Tick Sync Engine',
    subGlyph: 'UDP Client Prediction, Rollback & Snapshot Interpolation',
    diagramTitle: 'Multiplayer Tick Loop State Synchronization & Lag Compensation',
    flowNodes: [
      { name: 'Player A Client', role: 'Local input prediction (60fps)', icon: Smartphone, tier: 'Client' },
      { name: 'UDP Socket Ingress', role: 'Unreliable packet sequencing', icon: Wifi, tier: 'Network' },
      { name: 'Tick Server (64Hz)', role: 'Authoritative physics simulation', icon: Cpu, tier: 'Server' },
      { name: 'Snapshot History', role: '128-tick rewind lag buffer', icon: Clock, tier: 'History' },
      { name: 'Player B Client', role: 'Entity interpolation (smoothed)', icon: Smartphone, tier: 'Client' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'User input packet (delta)', protocol: 'UDP' },
      { from: 1, to: 2, label: 'Consume input in current tick', protocol: 'Internal' },
      { from: 2, to: 3, label: 'Save authoritative world snapshot', protocol: 'RingBuffer' },
      { from: 2, to: 4, label: 'Broadcast compressed snapshot', protocol: 'UDP' },
    ],
    lldDiagramType: 'udp-prediction',
    specs: {
      engineHeartbeat: 'Strict 64 Hz tick loop (15.625 ms per simulation frame)',
      memoryFootprint: 'Circular ring buffer holding past 128 ticks for lag compensation',
      concurrencyModel: 'Single dedicated thread per game match instance to prevent lock contention',
      failureGuarantee: 'Server reconciliation overrides client position if discrepancy exceeds delta',
    },
  },
  'collab-docs': {
    glyph: 'CRDT State Tree',
    subGlyph: 'Conflict-Free Replicated Data Types & Lamport Clocks',
    diagramTitle: 'Real-Time CRDT State Tree Merging & WebSocket Session Mesh',
    flowNodes: [
      { name: 'Author Alice', role: 'Insert char at index 4', icon: Users, tier: 'Client' },
      { name: 'CRDT Local Engine', role: 'Assigns unique Lamport ID', icon: FileCode, tier: 'CRDT' },
      { name: 'WebSocket Server', role: 'Broadcasts operation to peers', icon: Wifi, tier: 'Relay' },
      { name: 'Document Store', role: 'PostgreSQL snapshots + append log', icon: Database, tier: 'Storage' },
      { name: 'Author Bob', role: 'Deterministically merges operation', icon: Users, tier: 'Client' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Local keystroke', protocol: 'DOM' },
      { from: 1, to: 2, label: 'Send CRDT update delta', protocol: 'WSS' },
      { from: 2, to: 3, label: 'Persist document snapshot', protocol: 'SQL' },
      { from: 2, to: 4, label: 'Relay update to Bob', protocol: 'WSS' },
    ],
    lldDiagramType: 'crdt-tree',
    specs: {
      engineHeartbeat: 'CRDT convergence: all replicas converge to identical state regardless of arrival order',
      memoryFootprint: 'Yjs / Automerge binary encoded CRDT state with garbage collected tombstones',
      concurrencyModel: 'Peer-to-peer or server-mediated peer broadcast with zero merge conflicts',
      failureGuarantee: 'Mathematical strong eventual consistency guarantees zero data loss',
    },
  },
  'notification-system': {
    glyph: 'Multi-Channel Fanout',
    subGlyph: 'Provider Failover (APNS ➜ FCM ➜ Twilio ➜ SendGrid)',
    diagramTitle: 'Distributed Notification Fanout Matrix & Priority Queue Engine',
    flowNodes: [
      { name: 'Event Triggers', role: 'Order shipped / Password reset', icon: Bell, tier: 'Ingress' },
      { name: 'Priority Router', role: 'Sorts High vs Bulk priorities', icon: Shuffle, tier: 'Router' },
      { name: 'User Preferences', role: 'Opt-in & channel preferences', icon: Users, tier: 'Filter' },
      { name: 'Dispatch Workers', role: 'Kafka consumer worker pool', icon: Server, tier: 'Worker' },
      { name: 'External Gateways', role: 'APNS, FCM, Twilio, SendGrid', icon: Globe, tier: 'Gateway' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Trigger notification', protocol: 'gRPC' },
      { from: 1, to: 2, label: 'Check user mute & opt-out', protocol: 'RESP' },
      { from: 2, to: 3, label: 'Enqueue to priority partition', protocol: 'Kafka' },
      { from: 3, to: 4, label: 'Send via third-party provider', protocol: 'HTTPS' },
    ],
    lldDiagramType: 'fanout-matrix',
    specs: {
      engineHeartbeat: 'Sub-2-second delivery for high-priority transactional notifications',
      memoryFootprint: 'Redis rate-limiting counters preventing spam floods to same recipient',
      concurrencyModel: 'Autoscaling worker pool partitioned by notification delivery channel',
      failureGuarantee: 'Circuit breaker switches to alternate provider if primary API returns 5xx',
    },
  },
  pastebin: {
    glyph: 'Content-Addressable CAS',
    subGlyph: 'SHA-256 Hash Chunks with Automated TTL Sweeper',
    diagramTitle: 'Distributed Text Snippet Store & Content-Addressable Storage',
    flowNodes: [
      { name: 'Web Creator', role: 'POST /v1/paste (code snippet)', icon: FileCode, tier: 'Client' },
      { name: 'API Gateway', role: 'Rate limit & input sanitize', icon: Shield, tier: 'Edge' },
      { name: 'Metadata Service', role: 'MySQL snippet metadata + TTL', icon: Database, tier: 'Metadata' },
      { name: 'Object Block Store', role: 'S3 chunk storage by SHA-256', icon: Box, tier: 'Storage' },
      { name: 'Redis Cache', role: 'Sub-millisecond hot snippet reads', icon: Zap, tier: 'Cache' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Submit code text', protocol: 'HTTPS' },
      { from: 1, to: 2, label: 'Save paste key & expiry', protocol: 'SQL' },
      { from: 1, to: 3, label: 'Put raw text block', protocol: 'S3 API' },
      { from: 1, to: 4, label: 'Cache hot paste content', protocol: 'RESP' },
    ],
    lldDiagramType: 'paste-cas',
    specs: {
      engineHeartbeat: 'Deterministic SHA-256 content key generation: collision probability < 10^-30',
      memoryFootprint: '100 GB Redis cluster caching 20% most accessed pastes',
      concurrencyModel: 'Stateless Go HTTP handlers reading from local cache and S3',
      failureGuarantee: 'Automated background TTL reaper deletes expired pastes without downtime',
    },
  },
  'fraud-detection': {
    glyph: 'Velocity Risk Engine',
    subGlyph: 'Sliding Window Velocity Aggregates & Low-Latency ML',
    diagramTitle: 'Real-Time Fraud Velocity Risk Pipeline & Scoring Engine',
    flowNodes: [
      { name: 'Payment Transaction', role: 'Card swipe / online checkout', icon: DollarSign, tier: 'Ingress' },
      { name: 'Kafka Event Bus', role: 'Streams event to fraud workers', icon: Activity, tier: 'Stream' },
      { name: 'Velocity Aggregator', role: 'Redis sliding-window counts', icon: Gauge, tier: 'Velocity' },
      { name: 'ML Scoring Service', role: 'ONNX model evaluates features', icon: Cpu, tier: 'Model' },
      { name: 'Decision Gate', role: 'ALLOW / CHALLENGE / BLOCK', icon: Shield, tier: 'Action' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'Publish payment attempt', protocol: 'gRPC' },
      { from: 1, to: 2, label: 'Extract card velocity features', protocol: 'Stream' },
      { from: 2, to: 3, label: 'Query aggregate risk signals', protocol: 'RESP' },
      { from: 3, to: 4, label: 'Emit risk decision (< 30ms)', protocol: 'Internal' },
    ],
    lldDiagramType: 'risk-score',
    specs: {
      engineHeartbeat: 'Real-time scoring latency: < 30ms synchronous gate before payment charge',
      memoryFootprint: 'Redis sliding window counters tracking attempts per card, IP, and device',
      concurrencyModel: 'Flink stream processor maintaining stateful session graphs',
      failureGuarantee: 'Fail-permissive with asynchronous post-charge fraud review on timeout',
    },
  },
  'object-storage': {
    glyph: 'Reed-Solomon RS(10,4)',
    subGlyph: 'Erasure Coding Parity Matrix & CRUSH Map Racks',
    diagramTitle: 'Distributed Cloud Object Storage & Erasure Coding Mesh',
    flowNodes: [
      { name: 'Client Driver', role: 'PUT /bucket/large-file.tar', icon: HardDrive, tier: 'Ingress' },
      { name: 'Object Gateway', role: 'S3-compatible REST API', icon: Shield, tier: 'Gateway' },
      { name: 'Metadata Server', role: 'B-tree directory namespace', icon: Database, tier: 'Metadata' },
      { name: 'CRUSH Placement', role: 'Algorithmic disk rack mapping', icon: Network, tier: 'Algorithm' },
      { name: 'OSD Storage Disks', role: 'Raw NVMe/HDD chunk daemons', icon: Box, tier: 'OSD' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'S3 Multi-part Upload', protocol: 'HTTPS' },
      { from: 1, to: 2, label: 'Update inode metadata', protocol: 'gRPC' },
      { from: 1, to: 3, label: 'Calculate 10+4 chunk positions', protocol: 'CRUSH' },
      { from: 1, to: 4, label: 'Distribute Reed-Solomon chunks', protocol: 'TCP' },
    ],
    lldDiagramType: 'erasure-coding',
    specs: {
      engineHeartbeat: 'Reed-Solomon RS(10,4): data survives simultaneous loss of 4 full disk racks',
      memoryFootprint: 'CRUSH map computed algorithmically without centralized metadata bottlenecks',
      concurrencyModel: 'Async streaming pipeline writing chunks directly to OSD disk controllers',
      failureGuarantee: '99.999999999% (11 9s) durability across multi-datacenter failure domains',
    },
  },
  's3-object-storage': {
    glyph: 'Reed-Solomon RS(10,4)',
    subGlyph: 'Erasure Coding Parity Matrix & CRUSH Map Racks',
    diagramTitle: 'Distributed Cloud Object Storage & Erasure Coding Mesh',
    flowNodes: [
      { name: 'Client Driver', role: 'PUT /bucket/large-file.tar', icon: HardDrive, tier: 'Ingress' },
      { name: 'Object Gateway', role: 'S3-compatible REST API', icon: Shield, tier: 'Gateway' },
      { name: 'Metadata Server', role: 'B-tree directory namespace', icon: Database, tier: 'Metadata' },
      { name: 'CRUSH Placement', role: 'Algorithmic disk rack mapping', icon: Network, tier: 'Algorithm' },
      { name: 'OSD Storage Disks', role: 'Raw NVMe/HDD chunk daemons', icon: Box, tier: 'OSD' },
    ],
    animatedPipes: [
      { from: 0, to: 1, label: 'S3 Multi-part Upload', protocol: 'HTTPS' },
      { from: 1, to: 2, label: 'Update inode metadata', protocol: 'gRPC' },
      { from: 1, to: 3, label: 'Calculate 10+4 chunk positions', protocol: 'CRUSH' },
      { from: 1, to: 4, label: 'Distribute Reed-Solomon chunks', protocol: 'TCP' },
    ],
    lldDiagramType: 'erasure-coding',
    specs: {
      engineHeartbeat: 'Reed-Solomon RS(10,4): data survives simultaneous loss of 4 full disk racks',
      memoryFootprint: 'CRUSH map computed algorithmically without centralized metadata bottlenecks',
      concurrencyModel: 'Async streaming pipeline writing chunks directly to OSD disk controllers',
      failureGuarantee: '99.999999999% (11 9s) durability across multi-datacenter failure domains',
    },
  },
}

// Helper to get bespoke config with robust fallback
export function getVisualConfigForSystem(systemId: string, system: SystemDesignModel): BespokeSystemVisualConfig {
  const existing = BESPOKE_SYSTEM_VISUALS[systemId]
  if (existing) return existing

  const meta = SYSTEM_METADATA_REGISTRY[systemId]

  return {
    glyph: system.name.split(' ')[0] || 'SYSTEM',
    subGlyph: meta?.architecturePattern || system.tagline || 'Distributed Architecture',
    diagramTitle: `${system.name} Microservice Topology Blueprint`,
    flowNodes: (system.services || []).slice(0, 5).map((s) => ({
      name: s.name,
      role: s.role,
      icon: s.type === 'database' ? Database : s.type === 'cache' ? Zap : s.type === 'gateway' ? Shield : Server,
      tier: s.type.toUpperCase(),
    })),
    animatedPipes: (system.animationSteps || []).slice(0, 4).map((step, idx: number) => ({
      from: idx % 4,
      to: (idx + 1) % 5,
      label: step.description ? step.description.split('.')[0] : 'Data Flow',
      protocol: step.protocol || 'gRPC',
    })),
    lldDiagramType: 'generic-cluster',
    specs: {
      engineHeartbeat: `Throughput: ${system.throughput}`,
      memoryFootprint: `Scale: ${system.storageScale}`,
      concurrencyModel: meta?.architecturePattern || 'Distributed Service Mesh',
      failureGuarantee: `Target SLA: P99 < ${system.latency}`,
    },
  }
}

// ============================================================================
// 2. BESPOKE ANIMATED HERO BLUEPRINT (Interactive Modes + Animated SVG Mesh)
// ============================================================================
export const SystemHeroBlueprint: React.FC<{
  systemId: string
  system: SystemDesignModel
  domainColor: string
}> = ({ systemId, system, domainColor }) => {
  const config = useMemo(() => getVisualConfigForSystem(systemId, system), [systemId, system])
  const [activeTab, setActiveTab] = useState<'nodes' | 'wires' | 'telemetry'>('nodes')
  const [pulseTick, setPulseTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setPulseTick((t) => (t + 1) % 100), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border/80 bg-bg-surface-1/95 p-4 shadow-2xl flex flex-col justify-between space-y-3">
      {/* Background Cybernetic Blueprint Grid */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(${domainColor} 1.2px, transparent 1.2px), linear-gradient(to right, ${domainColor}12 1px, transparent 1px)`,
          backgroundSize: '24px 24px, 48px 48px',
        }}
      />

      {/* Top Header: Glyph, Title, and Tab Controller */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 items-center justify-center rounded-xl font-mono text-xs font-bold shadow-lg"
            style={{
              backgroundColor: `${domainColor}25`,
              color: domainColor,
              boxShadow: `0 0 14px ${domainColor}40`,
            }}
          >
            <Activity className="size-4 animate-pulse" />
          </span>
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              {config.glyph}
              <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-[10px] font-mono text-text-muted">{config.subGlyph}</div>
          </div>
        </div>

        {/* Blueprint Mode Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-bg-base/80 p-1 border border-border text-[10px] font-mono">
          <button
            onClick={() => setActiveTab('nodes')}
            className={`px-2 py-1 rounded transition-all ${
              activeTab === 'nodes'
                ? 'bg-bg-surface-3 text-text-primary font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Topology Constellation
          </button>
          <button
            onClick={() => setActiveTab('wires')}
            className={`px-2 py-1 rounded transition-all ${
              activeTab === 'wires'
                ? 'bg-bg-surface-3 text-text-primary font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Wire Protocol Trace
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-2 py-1 rounded transition-all ${
              activeTab === 'telemetry'
                ? 'bg-bg-surface-3 text-text-primary font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Hardware SLA
          </button>
        </div>
      </div>

      {/* Mode 1: Topology Constellation */}
      {activeTab === 'nodes' && (
        <div className="relative z-10 py-1">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
            {config.flowNodes.map((node, i) => {
              const Icon = node.icon || Server
              const isPulsing = pulseTick % config.flowNodes.length === i

              return (
                <div
                  key={i}
                  className={`relative flex flex-col items-center text-center p-2.5 rounded-xl border transition-all duration-300 ${
                    isPulsing
                      ? 'scale-105 shadow-lg'
                      : 'bg-bg-surface-2/80 border-border/70 text-text-muted hover:border-border'
                  }`}
                  style={
                    isPulsing
                      ? {
                          backgroundColor: `${domainColor}15`,
                          borderColor: domainColor,
                          boxShadow: `0 0 16px -2px ${domainColor}50`,
                          color: domainColor,
                        }
                      : undefined
                  }
                >
                  <div
                    className="size-7 rounded-lg flex items-center justify-center mb-1.5"
                    style={{
                      backgroundColor: isPulsing ? `${domainColor}30` : 'rgba(255,255,255,0.05)',
                      color: isPulsing ? domainColor : 'var(--color-text-secondary)',
                    }}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-[10px] font-bold font-mono text-text-primary truncate w-full">
                    {node.name}
                  </span>
                  <span className="text-[8px] text-text-muted font-mono truncate w-full mt-0.5">
                    {node.role}
                  </span>

                  {/* Animated Pipeline Arrow to Next Node */}
                  {i < config.flowNodes.length - 1 && (
                    <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-[10px] opacity-70">
                      <ArrowRight
                        className="size-3 transition-colors"
                        style={{ color: isPulsing ? domainColor : 'var(--color-text-muted)' }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mode 2: Live Protocol Wire Trace */}
      {activeTab === 'wires' && (
        <div className="relative z-10 py-1 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {config.animatedPipes.map((pipe, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-bg-surface-2/90 border border-border text-xs font-mono"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-text-primary font-bold truncate">
                    {config.flowNodes[pipe.from]?.name || `Node ${pipe.from}`} ➜{' '}
                    {config.flowNodes[pipe.to]?.name || `Node ${pipe.to}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 rounded bg-bg-surface-3 text-[10px] text-cyan-300 font-bold border border-cyan-500/30">
                    {pipe.protocol}
                  </span>
                  <span className="text-[10px] text-text-muted hidden md:inline">{pipe.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode 3: Hardware SLA & Invariants */}
      {activeTab === 'telemetry' && (
        <div className="relative z-10 py-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-bg-surface-2 border border-border space-y-1">
            <span className="text-[10px] text-text-muted block">Throughput Target</span>
            <span className="font-bold text-text-primary truncate block">{system.throughput}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-bg-surface-2 border border-border space-y-1">
            <span className="text-[10px] text-text-muted block">P99 Latency Bound</span>
            <span className="font-bold text-emerald-400 truncate block">{system.latency}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-bg-surface-2 border border-border space-y-1">
            <span className="text-[10px] text-text-muted block">Storage Scale</span>
            <span className="font-bold text-sky-400 truncate block">{system.storageScale}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-bg-surface-2 border border-border space-y-1">
            <span className="text-[10px] text-text-muted block">Availability SLA</span>
            <span className="font-bold text-purple-400 truncate block">99.999% High Availability</span>
          </div>
        </div>
      )}

      {/* Bottom Architectural Blueprint Specs Strip */}
      <div className="relative z-10 pt-2 border-t border-border/60 flex flex-wrap items-center justify-between text-[10px] font-mono text-text-muted gap-2">
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-text-primary">Engine:</strong> {config.specs.engineHeartbeat}
          </span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">
            <strong className="text-text-primary">Footprint:</strong> {config.specs.memoryFootprint}
          </span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: domainColor }}>
          <Sparkles className="size-3" />
          <span className="font-semibold">{config.specs.failureGuarantee}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 3. LOW-LEVEL COMPONENT ENGINE DIAGRAM (Interactive LLD for all 31 systems)
// ============================================================================
export const SystemInternalEngineDiagram: React.FC<{
  systemId: string
  system: SystemDesignModel
  domainColor: string
}> = ({ systemId, system, domainColor }) => {
  const config = useMemo(() => getVisualConfigForSystem(systemId, system), [systemId, system])

  // Interactive dynamic states for simulated diagrams
  const [logOffsets, setLogOffsets] = useState<number[]>([0, 1, 2, 3, 4])
  const [lruNodes, setLruNodes] = useState<string[]>(['user:101', 'user:102', 'user:103', 'user:104'])
  const [bitfieldSeq, setBitfieldSeq] = useState<number>(1048)
  const [doubleEntryBalance, setDoubleEntryBalance] = useState<{ debit: number; credit: number }>({
    debit: 5000,
    credit: 5000,
  })
  const [tokensInBucket, setTokensInBucket] = useState<number>(8)
  const [ringAngle, setRingAngle] = useState<number>(45)
  const [corruptedDisks, setCorruptedDisks] = useState<number[]>([])

  const handleAppendLog = () => {
    setLogOffsets((prev) => [...prev.slice(1), prev[prev.length - 1] + 1])
  }

  const handleTouchLru = (key: string) => {
    setLruNodes((prev) => [key, ...prev.filter((k) => k !== key)])
  }

  const handleIncrementBitfield = () => {
    setBitfieldSeq((s) => s + 1)
  }

  const handleToggleDiskCorruption = (diskIdx: number) => {
    setCorruptedDisks((prev) =>
      prev.includes(diskIdx) ? prev.filter((d) => d !== diskIdx) : [...prev, diskIdx]
    )
  }

  return (
    <div className="rounded-2xl bg-bg-surface-2 p-5 sm:p-6 ring-1 ring-border shadow-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div
            className="size-3 rounded-full animate-ping"
            style={{ backgroundColor: domainColor }}
          />
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Cpu className="size-4" style={{ color: domainColor }} /> {config.diagramTitle}
          </h3>
        </div>
        <span
          className="text-[11px] font-mono px-2 py-0.5 rounded border font-bold"
          style={{
            borderColor: `${domainColor}40`,
            backgroundColor: `${domainColor}15`,
            color: domainColor,
          }}
        >
          {config.lldDiagramType.toUpperCase()} ARCHETYPE
        </span>
      </div>

      {/* 1. Commit Log Segment (Kafka) */}
      {config.lldDiagramType === 'commit-log' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>
              <strong>Append-Only Partition Segment Log</strong> (Zero-Copy <code>sendfile(2)</code> DMA):
            </span>
            <button
              onClick={handleAppendLog}
              className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition text-[10px] font-bold"
            >
              + Append Record
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {logOffsets.map((offset, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-center transition-all ${
                  idx === logOffsets.length - 1
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold animate-pulse'
                    : 'border-border bg-bg-surface-2 text-text-secondary'
                }`}
              >
                <div className="text-[10px] text-text-muted">Segment #{idx}</div>
                <div className="truncate">Offset: {offset}</div>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl bg-bg-base/80 border border-border text-[11px] text-text-muted flex flex-wrap items-center justify-between gap-2">
            <span>Disk I/O: Sequential <code>O(1)</code> Write</span>
            <span className="text-cyan-400">Linux PageCache: 98.4% Hit Rate</span>
            <span className="text-emerald-400">NIC DMA: ZERO CPU Copy</span>
          </div>
        </div>
      )}

      {/* 2. LRU Doubly-Linked List + Hash Map (Redis / Cache) */}
      {config.lldDiagramType === 'lru-doubly-linked' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>
              <strong>LRU Doubly-Linked List + Hash Pointer Array</strong> (O(1) Get / Put):
            </span>
            <span className="text-[10px] text-text-muted">Click node to access & promote to HEAD</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold text-[11px]">
              [HEAD]
            </div>
            <span className="text-text-muted">⇆</span>
            {lruNodes.map((node, i) => (
              <React.Fragment key={node}>
                <button
                  onClick={() => handleTouchLru(node)}
                  className={`p-2.5 rounded-lg border text-xs transition-all ${
                    i === 0
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-400 font-bold'
                      : i === lruNodes.length - 1
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-bg-surface-2 border-border text-text-primary hover:border-sky-500/40'
                  }`}
                >
                  {node}
                </button>
                {i < lruNodes.length - 1 && <span className="text-text-muted">⇆</span>}
              </React.Fragment>
            ))}
            <span className="text-text-muted">⇆</span>
            <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 font-bold text-[11px]">
              [TAIL (Evict)]
            </div>
          </div>
          <div className="p-3 rounded-xl bg-bg-base/80 border border-border text-[11px] text-text-muted flex flex-wrap items-center justify-between gap-2">
            <span>Hash Lookup: <code>O(1)</code></span>
            <span>Eviction at Tail: <code>O(1)</code></span>
            <span>Promotion to Head: <code>O(1)</code> Pointer Relink</span>
          </div>
        </div>
      )}

      {/* 3. 64-bit Bitfield Layout (Snowflake / TinyURL) */}
      {config.lldDiagramType === 'bitfield-64' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>
              <strong>64-Bit Monotonic Binary Bitfield Layout</strong>:
            </span>
            <button
              onClick={handleIncrementBitfield}
              className="px-2.5 py-1 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 hover:bg-sky-500/30 transition text-[10px] font-bold"
            >
              + Generate ID
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-3 rounded-lg bg-bg-surface-2 border border-border text-text-muted">
              <div className="text-[10px]">1 Bit</div>
              <div>[Sign 0]</div>
            </div>
            <div className="p-3 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-400 font-bold">
              <div className="text-[10px]">41 Bits (Epoch ms)</div>
              <div>{Date.now()}</div>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-400 font-bold">
              <div className="text-[10px]">10 Bits (Node)</div>
              <div>Worker #0x1B</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold">
              <div className="text-[10px]">12 Bits (Seq)</div>
              <div>Seq #{bitfieldSeq}</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-bg-base/80 border border-border text-[11px] text-text-muted flex flex-wrap items-center justify-between gap-2">
            <span>Bitwise Formula: <code>(ts &lt;&lt; 22) | (node &lt;&lt; 12) | seq</code></span>
            <span className="text-emerald-400">4,096 IDs / millisecond / worker</span>
          </div>
        </div>
      )}

      {/* 4. Limit Order Book (Robinhood / Order Book) */}
      {config.lldDiagramType === 'order-book' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="text-[11px] text-text-secondary">
            <strong>Price-Time Priority Limit Order Book Ladder</strong>:
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="text-[11px] font-bold text-emerald-400">BIDS (Buyers)</div>
              <div className="flex justify-between text-text-secondary"><span>$235.40</span><span>450 shares</span></div>
              <div className="flex justify-between text-text-secondary"><span>$235.35</span><span>1,200 shares</span></div>
              <div className="flex justify-between text-text-secondary"><span>$235.30</span><span>800 shares</span></div>
            </div>
            <div className="space-y-1.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <div className="text-[11px] font-bold text-rose-400">ASKS (Sellers)</div>
              <div className="flex justify-between text-text-secondary"><span>$235.45</span><span>600 shares</span></div>
              <div className="flex justify-between text-text-secondary"><span>$235.50</span><span>950 shares</span></div>
              <div className="flex justify-between text-text-secondary"><span>$235.55</span><span>1,800 shares</span></div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-bg-base/80 border border-border text-[11px] text-text-muted flex flex-wrap items-center justify-between gap-2">
            <span>Spread: <strong className="text-text-primary">$0.05</strong></span>
            <span>Matching Latency: <strong className="text-emerald-400">&lt; 8.2 microseconds</strong></span>
            <span>Queue Ordering: <strong className="text-cyan-400">Strict FIFO per price tier</strong></span>
          </div>
        </div>
      )}

      {/* 5. Double-Entry Accounting Ledger (Stripe / Payment Ledger) */}
      {config.lldDiagramType === 'double-entry' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>
              <strong>Double-Entry Zero-Sum Journal Balance</strong> (Debits == Credits):
            </span>
            <button
              onClick={() =>
                setDoubleEntryBalance((prev) => ({
                  debit: prev.debit + 250,
                  credit: prev.credit + 250,
                }))
              }
              className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition text-[10px] font-bold"
            >
              + Post $250 Transaction
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
              <div className="text-[10px] text-emerald-400 font-bold">TOTAL DEBITS (DR)</div>
              <div className="text-base font-bold text-emerald-300">
                ${doubleEntryBalance.debit.toLocaleString()}.00
              </div>
              <div className="text-[10px] text-text-muted">User Wallets & Accounts</div>
            </div>
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-1">
              <div className="text-[10px] text-sky-400 font-bold">TOTAL CREDITS (CR)</div>
              <div className="text-base font-bold text-sky-300">
                ${doubleEntryBalance.credit.toLocaleString()}.00
              </div>
              <div className="text-[10px] text-text-muted">Settlement & Merchant Clearing</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-bg-base/80 border border-border text-[11px] text-text-muted flex items-center justify-between">
            <span className="text-emerald-400 font-bold">Invariant: Debits - Credits == $0.00</span>
            <span>2PC Distributed Transaction Safety</span>
          </div>
        </div>
      )}

      {/* 6. Token Bucket Limiter (Rate Limiter / Flash Sale) */}
      {config.lldDiagramType === 'token-bucket' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>
              <strong>Token Bucket Atomic Leaky Throttle</strong>:
            </span>
            <button
              onClick={() => setTokensInBucket((t) => Math.max(0, t - 1))}
              className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 transition text-[10px] font-bold"
            >
              Consume 1 Token
            </button>
          </div>
          <div className="p-4 rounded-xl bg-bg-surface-1 border border-border space-y-2">
            <div className="flex justify-between text-xs">
              <span>Bucket Capacity: 10 Tokens</span>
              <span className="font-bold text-amber-400">{tokensInBucket} Available</span>
            </div>
            <div className="w-full h-3 rounded-full bg-bg-surface-3 overflow-hidden border border-border">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-300"
                style={{ width: `${(tokensInBucket / 10) * 100}%` }}
              />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-bg-base/80 border border-border text-[11px] text-text-muted flex items-center justify-between">
            <span>Refill Rate: 1 token / 500ms</span>
            <span className={tokensInBucket > 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
              {tokensInBucket > 0 ? 'Status: HTTP 200 OK' : 'Status: HTTP 429 TOO MANY REQUESTS'}
            </span>
          </div>
        </div>
      )}

      {/* 7. Geospatial H3 Hexagons (Uber / Google Maps) */}
      {config.lldDiagramType === 'spatial-hex' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="text-[11px] text-text-secondary">
            <strong>Uber H3 Hexagonal Spatial Index & Proximity K-Ring</strong>:
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            {['H3: 8828308281', 'H3: 8828308283', 'H3: 8828308287', 'H3: 8828308290', 'H3: 8828308295', 'H3: 8828308299'].map(
              (hex, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-[10px] ${
                    i === 2
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                      : 'border-border bg-bg-surface-2 text-text-secondary'
                  }`}
                >
                  <div>{i === 2 ? 'Center Rider' : `Ring-${(i % 2) + 1}`}</div>
                  <div className="truncate text-[9px] text-text-muted mt-1">{hex}</div>
                </div>
              )
            )}
          </div>
          <div className="p-3 rounded-xl bg-bg-base/80 border border-border text-[11px] text-text-muted flex items-center justify-between">
            <span>Resolution: H3 Res 8 (461m radius)</span>
            <span className="text-cyan-400">K-Ring 1 Search: 7 Hexagons Scanned in &lt; 1.2ms</span>
          </div>
        </div>
      )}

      {/* 8. Erasure Coding 10+4 (S3 / Google Drive) */}
      {config.lldDiagramType === 'erasure-coding' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>
              <strong>Reed-Solomon RS(10,4) Chunk Distribution Matrix</strong>:
            </span>
            <span className="text-[10px] text-text-muted">Click chunks to simulate drive failures</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {Array.from({ length: 14 }).map((_, i) => {
              const isParity = i >= 10
              const isFailed = corruptedDisks.includes(i)

              return (
                <button
                  key={i}
                  onClick={() => handleToggleDiskCorruption(i)}
                  className={`p-2 rounded-lg border text-[10px] transition-all ${
                    isFailed
                      ? 'border-rose-500 bg-rose-500/20 text-rose-400 font-bold animate-pulse'
                      : isParity
                      ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                      : 'border-border bg-bg-surface-2 text-text-primary'
                  }`}
                >
                  <div>{isParity ? `P${i - 9}` : `D${i + 1}`}</div>
                  <div className="text-[8px] text-text-muted">{isFailed ? 'FAILED' : 'OK'}</div>
                </button>
              )
            })}
          </div>
          <div className="p-3 rounded-xl bg-bg-base/80 border border-border text-[11px] text-text-muted flex items-center justify-between">
            <span>
              Failed: <strong className="text-rose-400">{corruptedDisks.length} / 14</strong>
            </span>
            <span className={corruptedDisks.length <= 4 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {corruptedDisks.length <= 4
                ? 'Reed-Solomon Status: 100% RECOVERABLE'
                : 'CRITICAL: Quorum Lost (> 4 Parity Failures)'}
            </span>
          </div>
        </div>
      )}

      {/* 9. Consistent Hash Ring (Consistent Hash / Dynamo) */}
      {config.lldDiagramType === 'hash-ring' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>
              <strong>Consistent Hash Ring (360° Virtual Nodes)</strong>:
            </span>
            <button
              onClick={() => setRingAngle((a) => (a + 60) % 360)}
              className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 transition text-[10px] font-bold"
            >
              Hash Next Key ({ringAngle}°)
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {['Node-A (0°-90°)', 'Node-B (90°-180°)', 'Node-C (180°-270°)', 'Node-D (270°-360°)'].map(
              (slot, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border ${
                    Math.floor(ringAngle / 90) === idx
                      ? 'border-cyan-400 bg-cyan-400/15 text-cyan-300 font-bold'
                      : 'border-border bg-bg-surface-2 text-text-secondary'
                  }`}
                >
                  <div className="text-[10px] text-text-muted">Partition #{idx + 1}</div>
                  <div>{slot}</div>
                </div>
              )
            )}
          </div>
          <div className="p-3 rounded-xl bg-bg-base/80 border border-border text-[11px] text-text-muted flex items-center justify-between">
            <span>Key Hash Angle: {ringAngle}°</span>
            <span className="text-cyan-400">Routed to Node-{['A', 'B', 'C', 'D'][Math.floor(ringAngle / 90)]}</span>
          </div>
        </div>
      )}

      {/* 10. Fallback / Generic Pipeline for other archetypes */}
      {config.lldDiagramType !== 'commit-log' &&
        config.lldDiagramType !== 'lru-doubly-linked' &&
        config.lldDiagramType !== 'bitfield-64' &&
        config.lldDiagramType !== 'order-book' &&
        config.lldDiagramType !== 'double-entry' &&
        config.lldDiagramType !== 'token-bucket' &&
        config.lldDiagramType !== 'spatial-hex' &&
        config.lldDiagramType !== 'erasure-coding' &&
        config.lldDiagramType !== 'hash-ring' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="text-[11px] text-text-secondary">
              <strong>End-to-End Microservice State Pipeline & Handshake</strong>:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {config.flowNodes.slice(0, 4).map((n, i) => (
                <div key={i} className="p-3 rounded-xl bg-bg-surface-2 border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted">Tier #{i + 1}</span>
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="font-bold text-text-primary">{n.name}</div>
                  <div className="text-[10px] text-text-muted">{n.role}</div>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-bg-base/80 border border-border text-[11px] text-text-muted flex items-center justify-between">
              <span>Concurrency: {config.specs.concurrencyModel}</span>
              <span className="text-emerald-400">{config.specs.failureGuarantee}</span>
            </div>
          </div>
        )}
    </div>
  )
}

// ============================================================================
// 4. SIDEBAR LIVE TOPOLOGY MINI-RADAR (Replaces static thumbnail)
// ============================================================================
export const SystemTopologyMiniRadar: React.FC<{
  system: SystemDesignModel
  domainColor: string
}> = ({ system, domainColor }) => {
  const [radarAngle, setRadarAngle] = useState(0)
  const [pingActive, setPingActive] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setRadarAngle((a) => (a + 6) % 360), 50)
    return () => clearInterval(timer)
  }, [])

  const triggerPing = () => {
    setPingActive(true)
    setTimeout(() => setPingActive(false), 1200)
  }

  return (
    <div className="rounded-xl bg-bg-surface-2 p-4 ring-1 ring-border shadow-md space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
          <Radio className="size-3.5 text-emerald-400 animate-pulse" /> Live Cluster Topology Radar
        </h4>
        <button
          onClick={triggerPing}
          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition"
        >
          Ping Mesh
        </button>
      </div>

      {/* Mini Radar Canvas */}
      <div className="relative w-full h-32 rounded-lg bg-bg-base/90 border border-border overflow-hidden flex items-center justify-center">
        {/* Radar concentric rings */}
        <div className="absolute inset-2 rounded-full border border-border/40" />
        <div className="absolute inset-8 rounded-full border border-border/30" />
        <div className="absolute inset-14 rounded-full border border-border/20" />

        {/* Radar crosshairs */}
        <div className="absolute left-0 right-0 h-px bg-border/30" />
        <div className="absolute top-0 bottom-0 w-px bg-border/30" />

        {/* Pulse wave animation on Ping */}
        {pingActive && (
          <div
            className="absolute inset-0 rounded-full animate-ping pointer-events-none opacity-40"
            style={{ backgroundColor: domainColor }}
          />
        )}

        {/* Sweeping radar beam */}
        <div
          className="absolute inset-0 origin-center pointer-events-none"
          style={{
            transform: `rotate(${radarAngle}deg)`,
            background: `conic-gradient(from 0deg, transparent 0deg, ${domainColor}35 30deg, transparent 31deg)`,
          }}
        />

        {/* Active Node Blips */}
        {(system.services || []).slice(0, 6).map((service, i) => {
          const angles = [30, 95, 160, 220, 290, 340]
          const dists = [38, 45, 30, 42, 28, 48]
          const rad = ((angles[i] || 0) * Math.PI) / 180
          const dist = dists[i] || 35
          const x = 50 + dist * Math.cos(rad)
          const y = 50 + dist * Math.sin(rad)

          return (
            <div
              key={service.id || i}
              className="absolute size-2.5 rounded-full ring-2 ring-bg-base transition-all cursor-pointer group"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: domainColor,
                boxShadow: `0 0 8px ${domainColor}`,
              }}
              title={`${service.name} (${service.role})`}
            >
              <div className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-bg-surface-3 px-1.5 py-0.5 rounded text-[9px] font-mono text-text-primary border border-border pointer-events-none z-30 transition-opacity">
                {service.name}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
        <span>Active Nodes: {(system.services || []).length}</span>
        <span className="text-emerald-400">100% HEALTHY</span>
      </div>
    </div>
  )
}
