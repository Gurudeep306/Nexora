// =========================================================================
// NEXORA STAFF+ DISTRIBUTED SYSTEMS ENRICHMENT REGISTRY
// Real-World FAANG Post-Mortems, Production Configurations & Staff Quizzes
// =========================================================================

export interface UnitWarStory {
  company: string
  incident: string
  rootCause: string
  architecturalFix: string
  impactSLA: string
}

export interface UnitProductionConfig {
  title: string
  filename: string
  language: string
  content: string
  keyParameters: { param: string; desc: string }[]
}

export interface StaffQuizQuestion {
  question: string
  options: string[]
  answerIndex: number
  staffRationale: string
}

export const UNIT_WAR_STORIES: Record<string, UnitWarStory> = {
  'unit-1': {
    company: 'Amazon Web Services (AWS)',
    incident: 'AWS S3 US-East-1 Cascading Metadata Outage (February 2017)',
    rootCause:
      'An authorized operator ran an automated command to take a small cluster of S3 billing servers offline. A typo in the command removed significantly more servers than intended. The two decommissioned subsystems managed metadata index allocation and placement maps. Bringing them back online required a complete restart from cold storage, triggering an avalanche of dependency failures across EC2, GitHub, and thousands of enterprise services.',
    architecturalFix:
      'AWS partitioned large blast-radius services into isolated "Cells" (Cell-Based Architecture), enforced hard guardrails on minimum available capacity in operational CLI tooling, and decoupled internal health dependencies so S3 index recovery cannot deadlock waiting on EC2.',
    impactSLA: '4 hours 20 minutes global downtime; $150M+ financial impact across AWS customers',
  },
  'unit-2': {
    company: 'GitHub',
    incident: 'GitHub 43-Minute MySQL Split-Brain & Write Data Corruption (October 2018)',
    rootCause:
      'Maintenance on an optical network link between US-East and US-West datacenters caused brief 100ms packet loss. Orchestrator detected transient loss and initiated failover of the primary MySQL cluster to US-East. However, several internal services in US-West continued routing writes to the former primary before heartbeat timeouts elapsed, creating diverging split-brain transaction logs.',
    architecturalFix:
      'GitHub introduced Raft-based distributed consensus across database orchestrator nodes, deployed automated STONITH (Shoot The Other Node In The Head) fencing via IPMI/hardware cutoffs, and enforced strict semi-synchronous replication with lossless failover invariants.',
    impactSLA: '43 minutes complete outage, 24 hours 11 minutes read-only degradation',
  },
  'unit-3': {
    company: 'Discord',
    incident: 'Discord Cassandra-to-ScyllaDB Migration (4 Trillion Message Re-Architecture)',
    rootCause:
      'Discord originally stored messages across a 177-node Apache Cassandra cluster. As chat volume scaled past 4 trillion messages, JVM Stop-The-World garbage collection pauses caused 2-second P99 read spikes. Compaction strategies could not keep pace with write ingestion, causing tombstones to accumulate and hot partitions to choke read paths.',
    architecturalFix:
      'Discord migrated to ScyllaDB (a C++ rewrite of Cassandra utilizing the Seastar shared-nothing asynchronous framework), eliminated JVM GC stalls, and redesigned partitioning with consistent hashing tokens that isolate high-volume bot channels from standard user direct messages.',
    impactSLA: 'Reduced P99 read latencies from 2,000ms down to sub-15ms across 4+ trillion rows',
  },
  'unit-4': {
    company: 'Netflix',
    incident: 'The Celebrity Cache Avalanche & Stampede Incident (Dogpile Effect)',
    rootCause:
      'When high-profile media releases dropped, millions of clients requested identical movie metadata concurrently. When the Redis TTL expired, thousands of worker threads simultaneously missed the cache and hammered the origin PostgreSQL database, knocking the connection pool offline and cascading across the recommendation graph.',
    architecturalFix:
      'Implemented Probabilistic Early Expiration (XFetch algorithm) where keys are asynchronously refreshed before hard TTL expiration based on request density, combined with Distributed Singleflight Mutexes (only one backend query allowed per missing key; all other threads await the result).',
    impactSLA: 'Eliminated origin database spikes; sustained 99.999% cache hit ratio under 100x traffic surges',
  },
  'unit-5': {
    company: 'Cloudflare',
    incident: 'Global BGP Route Leak Incident (Allegheny Technologies / DQE Route Hijack)',
    rootCause:
      'A small regional ISP in Pennsylvania misconfigured BGP filters and erroneously advertised Cloudflare Anycast IP prefix routes to Verizon via intermediate provider DQE. Verizon accepted the unauthorized transit route, routing 15% of global Cloudflare traffic through a saturated regional link that immediately bottlenecked.',
    architecturalFix:
      'Cloudflare championed global RPKI (Resource Public Key Infrastructure) Route Origin Validation (ROV), ensuring autonomous systems cryptographically reject route advertisements not signed by legitimate prefix owners.',
    impactSLA: '15% global packet drop for 90 minutes; accelerated worldwide RPKI adoption',
  },
  'unit-6': {
    company: 'Uber',
    incident: '1.5 Million Event Kafka Consumer Group Rebalance Storm (Halloween Peak)',
    rootCause:
      'During Halloween peak dispatch, rider GPS ping bursts exceeded worker thread processing time (`max.poll.interval.ms`). The Kafka broker assumed slow consumers were dead and triggered partition rebalances. While rebalancing, consumers paused message consumption, causing queues to grow further and triggering an infinite cascading rebalance storm.',
    architecturalFix:
      'Decoupled consumer polling from processing threads using an in-process bounded ring buffer queue, tuned `max.poll.interval.ms` to 300,000ms, enabled Cooperative Sticky Assignor (KIP-429) to avoid Stop-The-World partition rebalances, and routed poisoned payloads to Dead Letter Queues (DLQ).',
    impactSLA: 'Prevented queue stalls across 250 billion daily events at sub-50ms processing latency',
  },
  'unit-7': {
    company: 'Google',
    incident: 'Google Spanner TrueTime Leap Second Anomaly & Clock Uncertainty Bounding',
    rootCause:
      'In distributed linearizable databases, transactions rely on monotonic timestamps. Traditional NTP servers introduce unbounded millisecond drift during atomic leap second insertions, which would violate Spanner\'s invariant that `commit_time(T1) < commit_time(T2)` whenever T2 begins after T1 commits.',
    architecturalFix:
      'Engineered TrueTime API backed by synchronized GPS receivers and Rubidium atomic clocks in every datacenter. TrueTime represents time as an interval `[t.earliest, t.latest]` with uncertainty `ε` (typically < 7ms). Spanner enforces "Commit Wait": a transaction sleeps for `2ε` before releasing locks, mathematically guaranteeing linearizability across all global datacenters.',
    impactSLA: 'Guaranteed strict serializability across planetary scales with 99.999% availability SLA',
  },
  'unit-8': {
    company: 'Stripe',
    incident: 'Payment Double-Charge Race Condition (Mobile Network Flapping)',
    rootCause:
      'Mobile devices with flaky 3G/4G connections transmitted payment authorizations, received TCP RST disconnects before reading HTTP 200 responses, and automatically re-transmitted charges. Under microsecond concurrent retry bursts, two worker processes read the pending balance before either committed the ledger debit.',
    architecturalFix:
      'Enforced mandatory UUIDv4 Idempotency Keys stored in Redis with atomic SETNX locking and 24-hour expiration. If a duplicate idempotency key is received while processing, the request waits; if already completed, the cached HTTP response is returned verbatim without touching the payment ledger.',
    impactSLA: 'Zero double-charge occurrences across $1+ trillion annualized transaction volume',
  },
}

export const UNIT_PRODUCTION_CONFIGS: Record<string, UnitProductionConfig> = {
  'unit-1': {
    title: 'Linux Kernel 100GbE High-Throughput Socket & TCP Buffer Tuning',
    filename: '/etc/sysctl.d/99-distributed-systems.conf',
    language: 'ini',
    content: `# Linux Kernel High-Concurrency Distributed Systems Tuning
# Prevents SYN floods, port exhaustion, and socket buffer starvation

# Max pending connection backlog for listen() sockets
net.core.somaxconn = 65535

# Increase maximum network socket receive/send buffer sizes (16MB)
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Enable TCP BBR Congestion Control (Google Bottleneck Bandwidth and RTT)
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# Reuse TIME_WAIT sockets for outgoing connections (safely handles high RPS)
net.ipv4.tcp_tw_reuse = 1

# Max syn backlog queue before SYN cookies trigger
net.ipv4.tcp_max_syn_backlog = 16384
net.ipv4.tcp_slow_start_after_idle = 0

# Ephemeral port range expansion (prevents source port exhaustion)
net.ipv4.ip_local_port_range = 1024 65535`,
    keyParameters: [
      { param: 'net.core.somaxconn = 65535', desc: 'Prevents listen queue overflows when handling bursty microservice connection spikes.' },
      { param: 'tcp_congestion_control = bbr', desc: 'Replaces loss-based Cubic with model-based BBR, yielding 2-4x throughput on packet-lossy links.' },
      { param: 'net.ipv4.tcp_tw_reuse = 1', desc: 'Allows safe recycling of TIME_WAIT sockets when querying backend microservices rapidly.' },
    ],
  },
  'unit-2': {
    title: 'PostgreSQL Enterprise Production MVCC & WAL Flush Hardening',
    filename: '/etc/postgresql/16/main/postgresql.conf',
    language: 'ini',
    content: `# High-Throughput ACID Production Tuning
shared_buffers = 16GB                  # 25% of total 64GB host RAM
work_mem = 64MB                       # Per-query sort/hash buffer
maintenance_work_mem = 2GB            # Accelerates VACUUM and CREATE INDEX
effective_cache_size = 48GB           # Guides query planner optimizer

# WAL (Write-Ahead Logging) & Durability
wal_level = replica                   # Supports streaming replication
max_wal_size = 16GB                   # Reduces frequency of aggressive checkpoints
checkpoint_completion_target = 0.9    # Smooths disk I/O over checkpoint duration
synchronous_commit = on               # Ensures zero-loss ACID durability on primary

# Aggressive Autovacuum (Prevents Transaction ID Wraparound & Table Bloat)
autovacuum = on
autovacuum_max_workers = 6
autovacuum_vacuum_scale_factor = 0.05 # Trigger vacuum at 5% row churn instead of 20%
autovacuum_vacuum_cost_limit = 2000   # Minimizes vacuum I/O throttling`,
    keyParameters: [
      { param: 'checkpoint_completion_target = 0.9', desc: 'Spreads WAL disk flushes over 90% of checkpoint interval to avoid sudden I/O spikes.' },
      { param: 'autovacuum_vacuum_scale_factor = 0.05', desc: 'Aggressively reclaims dead MVCC row versions before table bloat degrades index lookups.' },
      { param: 'shared_buffers = 16GB', desc: 'Dedicated database buffer cache to minimize NVMe SSD reads.' },
    ],
  },
  'unit-3': {
    title: 'RocksDB / ScyllaDB LSM-Tree Write Stall & Compaction Optimization',
    filename: '/etc/scylladb/scylla.yaml',
    language: 'yaml',
    content: `# ScyllaDB / Cassandra LSM-Tree High-Throughput Production Profile
cluster_name: 'production-distributed-core'
num_tokens: 256                       # Virtual nodes per physical host
authenticator: PasswordAuthenticator

# Seastar Asynchronous Reactor Threading
auto_bootstrap: true
commitlog_sync: periodic
commitlog_sync_period_in_ms: 10000

# LSM Compaction Strategy (SizeTiered for Writes, Leveled for Low Read Latency)
default_compaction_strategy: LeveledCompactionStrategy
sstable_size_in_mb: 160               # L1 SSTable target size
max_open_files: 1000000

# Memory Allocations
commitlog_total_space_in_mb: 8192
phi_convict_threshold: 12             # Accrual failure detector sensitivity`,
    keyParameters: [
      { param: 'default_compaction_strategy: LeveledCompactionStrategy', desc: 'Guarantees 90% of point reads hit at most 1 SSTable, keeping P99 reads sub-5ms.' },
      { param: 'phi_convict_threshold: 12', desc: 'Hayashibara accrual failure detector threshold that avoids premature node eviction on transient network blips.' },
    ],
  },
  'unit-4': {
    title: 'Redis Enterprise Cluster Memory & AOF Persistence Hardening',
    filename: '/etc/redis/redis.conf',
    language: 'ini',
    content: `# Redis Cluster High-Throughput Cache Configuration
bind 0.0.0.0
port 6379
protected-mode yes
timeout 0                             # Keepalive client connections open

# Memory Eviction Policies
maxmemory 32gb
maxmemory-policy allkeys-lru          # Evict least-recently-used keys when full
maxmemory-samples 10                  # High precision LRU sampling approximation

# Durability & Append-Only File (AOF)
appendonly yes
appendfsync everysec                  # Flushes to disk every 1 second (at most 1s data loss)
no-appendfsync-on-rewrite yes         # Avoids disk contention during background rewrite
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Cluster Gossip Topologies
cluster-enabled yes
cluster-config-file nodes-6379.conf
cluster-node-timeout 5000             # 5s failover trigger threshold
cluster-require-full-coverage no      # Allows serving reads even if 1 shard is recovering`,
    keyParameters: [
      { param: 'maxmemory-policy allkeys-lru', desc: 'Safely evicts stale items under high memory pressure without throwing out-of-memory errors.' },
      { param: 'appendfsync everysec', desc: 'Gold-standard balance between zero disk latency impact and maximum 1-second data loss SLA.' },
    ],
  },
  'unit-5': {
    title: 'Envoy Edge Proxy HTTP/2 Multiplexing & Outlier Detection Circuit Breaker',
    filename: '/etc/envoy/envoy.yaml',
    language: 'yaml',
    content: `# Production Envoy Proxy Edge Gateway Configuration
static_resources:
  listeners:
  - name: ingress_edge_listener
    address:
      socket_address: { address: 0.0.0.0, port_value: 443 }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          codec_type: AUTO            # Supports HTTP/1.1, HTTP/2 and HTTP/3 QUIC
          http2_protocol_options:
            max_concurrent_streams: 1000
            initial_stream_window_size: 65536
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend_services
              domains: ["*"]
              routes:
              - match: { prefix: "/api/" }
                route:
                  cluster: backend_cluster
                  timeout: 0.5s       # 500ms hard deadline
                  retry_policy:
                    retry_on: "5xx,connect-failure,refused-stream"
                    num_retries: 3
                    retry_back_off:
                      base_interval: 25ms
                      max_interval: 250ms`,
    keyParameters: [
      { param: 'timeout: 0.5s', desc: 'Enforces strict 500ms SLA, preventing slow backends from exhausting gateway connection pools.' },
      { param: 'retry_back_off (25ms - 250ms)', desc: 'Prevents thundering herd retries against failing upstream services with exponential jitter.' },
    ],
  },
  'unit-6': {
    title: 'Apache Kafka Production Broker Zero-Copy & Quorum Configuration',
    filename: '/opt/kafka/config/server.properties',
    language: 'ini',
    content: `# Production Apache Kafka 3.6 Broker Configuration
broker.id=1
listeners=PLAINTEXT://:9092
num.network.threads=8
num.io.threads=16

# Zero-Copy Disk Throughput
send.buffer.bytes=1048576
receive.buffer.bytes=1048576
socket.request.max.bytes=104857600

# High-Availability & Zero Data Loss Quorum Guarantees
default.replication.factor=3
min.insync.replicas=2                 # Minimum ISR required to accept a write
unclean.leader.election.enable=false  # Prohibits out-of-sync replicas from becoming leader
auto.create.topics.enable=false

# Log Retention & Segment Rolling
log.cleanup.policy=delete
log.retention.hours=168               # 7 days retention
log.segment.bytes=1073741824          # 1GB segment size
log.flush.interval.messages=10000`,
    keyParameters: [
      { param: 'min.insync.replicas=2', desc: 'When producers use acks=all, ensures message is written to at least 2 nodes before ACK.' },
      { param: 'unclean.leader.election.enable=false', desc: 'Strict consistency guarantee: never allows out-of-sync broker to become leader, avoiding message truncation.' },
    ],
  },
  'unit-7': {
    title: 'etcd 3.5 Raft Distributed Consensus High-Availability Tuning',
    filename: '/etc/etcd/etcd.yml',
    language: 'yaml',
    content: `# Production etcd Raft Coordination Cluster
name: 'etcd-node-01'
data-dir: '/var/lib/etcd'
listen-client-urls: 'https://0.0.0.0:2379'
listen-peer-urls: 'https://0.0.0.0:2380'

# Raft Heartbeat & Election Invariants
heartbeat-interval: 100               # 100ms leader heartbeat ping
election-timeout: 1000                # 1000ms election timeout (10x heartbeat)
snapshot-count: 10000                 # Trigger compact Raft snapshot every 10k transactions
max-request-bytes: 1572864            # 1.5MB max transactional payload

# Memory Quota & Disk Fsync Hardening
quota-backend-bytes: 8589934592       # 8GB storage quota
auto-compaction-retention: '1'        # Retain last 1 hour of MVCC revision history
auto-compaction-mode: periodic`,
    keyParameters: [
      { param: 'election-timeout: 1000', desc: '10x separation between heartbeat (100ms) and election (1000ms) prevents spurious split-brain elections during minor network jitter.' },
      { param: 'auto-compaction-retention: 1', desc: 'Automatically prunes dead MVCC transaction history to prevent etcd 8GB quota exhaustion.' },
    ],
  },
  'unit-8': {
    title: 'Go Production High-Throughput Token Bucket Rate Limiter with Mutex Lock',
    filename: 'pkg/limiter/token_bucket.go',
    language: 'go',
    content: `package limiter

import (
    "sync"
    "time"
)

// TokenBucket provides lock-optimized rate limiting for microservice endpoints
type TokenBucket struct {
    capacity   float64
    tokens     float64
    refillRate float64 // tokens per second
    lastRefill time.Time
    mu         sync.Mutex
}

func NewTokenBucket(capacity, refillRate float64) *TokenBucket {
    return &TokenBucket{
        capacity:   capacity,
        tokens:     capacity,
        refillRate: refillRate,
        lastRefill: time.Now(),
    }
}

// Allow atomically checks and consumes 1 token if available
func (tb *TokenBucket) Allow() bool {
    tb.mu.Lock()
    defer tb.mu.Unlock()

    now := time.Now()
    elapsed := now.Sub(tb.lastRefill).Seconds()
    tb.lastRefill = now

    // Refill tokens proportional to elapsed time
    tb.tokens += elapsed * tb.refillRate
    if tb.tokens > tb.capacity {
        tb.tokens = tb.capacity
    }

    if tb.tokens >= 1.0 {
        tb.tokens -= 1.0
        return true
    }
    return false
}`,
    keyParameters: [
      { param: 'tokens += elapsed * refillRate', desc: 'Lazy refill calculation avoids background timer goroutine overhead across millions of keys.' },
      { param: 'tb.mu.Lock()', desc: 'Guarantees thread-safe atomic access across concurrent goroutines executing on multiple CPU cores.' },
    ],
  },
}

export const UNIT_STAFF_QUIZZES: Record<string, StaffQuizQuestion[]> = {
  'unit-1': [
    {
      question:
        'In a geo-distributed architecture with nodes in San Francisco and London (~8,600 km fiber path), what is the irreducible physical latency floor for a single round-trip time (RTT)?',
      options: [
        'A. ~5 milliseconds (bounded by electrical voltage propagation)',
        'B. ~86 milliseconds (bounded by speed of light in fiber at ~200,000 km/s)',
        'C. ~1 millisecond (if using 100Gbps high-bandwidth undersea cables)',
        'D. ~250 milliseconds (bounded by GPS satellite synchronization)',
      ],
      answerIndex: 1,
      staffRationale:
        'Light travels through vacuum at ~300,000 km/s, but inside silica glass fiber optic cables it travels at c/n ≈ 200,000 km/s (5 µs per km). For a round trip of 2 * 8,600 km = 17,200 km, the minimum propagation delay is 17,200 * 0.005 ms ≈ 86 ms, regardless of bandwidth.',
    },
    {
      question:
        'Why does a network partition in a distributed system make it mathematically impossible to achieve both Linearizable Consistency and 100% Availability simultaneously?',
      options: [
        'A. Because TCP handshake frames are dropped by intermediate BGP routers.',
        'B. Because an isolated partition node cannot know if another partition has accepted a conflicting write without communicating, forcing it to either reject requests or serve stale data.',
        'C. Because CPU caches fail cache-coherency protocols (MESI) across disparate physical machines.',
        'D. Because atomic clocks drift by more than 1 second per minute under partition load.',
      ],
      answerIndex: 1,
      staffRationale:
        'According to Brewer\'s CAP Theorem and Gilbert & Lynch\'s formal proof, if partition G1 cannot communicate with G2, a write accepted on G1 will never be visible on G2. If G2 responds to reads, it violates linearizability; if it blocks or errors, it violates availability.',
    },
  ],
  'unit-2': [
    {
      question:
        'What specific anomaly differentiates Snapshot Isolation from Strict Serializability in modern relational databases like PostgreSQL and CockroachDB?',
      options: [
        'A. Dirty Reads (reading uncommitted rows)',
        'B. Non-Repeatable Reads (row changes between queries in same transaction)',
        'C. Write Skew (disjoint writes violating a global predicate invariant)',
        'D. Phantom Reads (new rows inserted into range query)',
      ],
      answerIndex: 2,
      staffRationale:
        'Snapshot Isolation prevents dirty reads, non-repeatable reads, and phantoms. However, it permits Write Skew: two concurrent transactions read disjoint sets of rows satisfying an invariant (e.g., "doctor on-call count >= 1"), and both write without overlapping row locks, violating the invariant upon commit.',
    },
    {
      question:
        'Why is the traditional Two-Phase Commit (2PC) protocol classified as a "blocking" distributed commit protocol?',
      options: [
        'A. Because worker nodes refuse to execute SQL statements without an exclusive row lock.',
        'B. If the Coordinator crashes after participants vote "PREPARED", participants are locked in uncertainty and cannot abort or commit unilaterally without violating atomicity.',
        'C. Because it requires 4 round-trips over the network for every SELECT statement.',
        'D. Because network switches block packets larger than the Maximum Transmission Unit (MTU).',
      ],
      answerIndex: 1,
      staffRationale:
        'In 2PC, once a participant votes "PREPARED", it surrenders autonomy. If the coordinator dies before issuing COMMIT or ROLLBACK, the participants must hold locks indefinitely because another participant might have already committed.',
    },
  ],
  'unit-3': [
    {
      question:
        'Why do LSM-Trees (Log-Structured Merge-Trees) dramatically outperform B+ Trees for write-heavy workloads at scale?',
      options: [
        'A. Because LSM-Trees do not require disk storage and store everything in RAM.',
        'B. Because LSM-Trees convert random writes into sequential disk append writes to a MemTable/WAL, deferring sorting to background asynchronous compaction.',
        'C. Because LSM-Trees eliminate the need for hash indexes and Bloom filters.',
        'D. Because B+ Trees cannot be partitioned across multiple servers.',
      ],
      answerIndex: 1,
      staffRationale:
        'B+ Trees require in-place page overwrites on random disk blocks, causing random I/O and write amplification. LSM-Trees append writes sequentially to a Write-Ahead Log and in-memory MemTable, achieving near-disk-bandwidth throughput.',
    },
  ],
  'unit-4': [
    {
      question:
        'How does the XFetch (Probabilistic Early Expiration) algorithm prevent Cache Stampedes without requiring distributed locks?',
      options: [
        'A. It forces all cache keys to have identical expiration timestamps.',
        'B. It deletes the cache key as soon as the first read occurs.',
        'C. A reading worker computes `time() - β * log(rand()) * compute_time > expiration_time`, probabilistically triggering background recomputation before hard TTL expiration.',
        'D. It routes all cache misses through a single serialized Master Redis node.',
      ],
      answerIndex: 2,
      staffRationale:
        'XFetch computes a probabilistic condition based on remaining TTL, request frequency, and backend compute duration. As expiration nears, the probability that any single reader regenerates the value approaches 1, ensuring the cache is refreshed seamlessly without thundering herds.',
    },
  ],
  'unit-5': [
    {
      question:
        'What major architectural problem in HTTP/2 does HTTP/3 (QUIC) solve at the transport layer?',
      options: [
        'A. Server push overhead',
        'B. Head-of-Line (HoL) blocking at the TCP transport layer when a single packet is dropped',
        'C. Header compression vulnerability (CRIME attack)',
        'D. Inability to send binary JSON payloads',
      ],
      answerIndex: 1,
      staffRationale:
        'In HTTP/2, all streams share a single TCP connection. If a single packet drops, the entire TCP window stalls until retransmission completes. HTTP/3 runs over UDP with independent QUIC stream state machines, so packet loss on one stream does not block unrelated concurrent streams.',
    },
  ],
  'unit-6': [
    {
      question:
        'How does Apache Kafka achieve zero-copy data transfer from broker disk to the network NIC buffer?',
      options: [
        'A. By running inside the Linux kernel as an eBPF program',
        'B. By utilizing the `sendfile()` Linux system call to transfer pagecache bytes directly to the socket buffer without copying into user-space memory',
        'C. By compressing messages with zstd inside the CPU L3 cache',
        'D. By maintaining all log segments in unallocated RAM buffers',
      ],
      answerIndex: 1,
      staffRationale:
        'Normal read-write transfers copy data from disk -> kernel pagecache -> user-space application -> kernel socket buffer -> NIC. Kafka invokes the `sendfile(2)` syscall, allowing the OS to copy pages directly from the pagecache to the network protocol engine, bypassing user space entirely.',
    },
  ],
  'unit-7': [
    {
      question:
        'In the Raft consensus algorithm, why must a candidate receive votes from a strict majority (Quorum = N/2 + 1) of cluster nodes to become Leader?',
      options: [
        'A. To ensure that two candidates can never win the election concurrently and that the new leader is guaranteed to contain all committed log entries.',
        'B. Because Raft requires an even number of servers in every deployment.',
        'C. To allow clients to send writes directly to follower nodes.',
        'D. To prevent nodes from consuming more than 50% CPU during elections.',
      ],
      answerIndex: 0,
      staffRationale:
        'Any two majorities of a cluster of size N must intersect by at least one node. Therefore, any quorum that elects a new leader must contain at least one node that approved the most recently committed entry, preventing split-brain states and log regressions.',
    },
  ],
  'unit-8': [
    {
      question:
        'Why does relying purely on distributed locks (like Redis Redlock) without fencing tokens fail to prevent concurrent writes under GC pauses?',
      options: [
        'A. Because Redis does not support TTLs on lock keys.',
        'B. A client holding a lock can experience a long Stop-The-World GC pause or network stall; its lock TTL expires and is re-acquired by client B, but client A awakens and writes stale data.',
        'C. Because distributed mutexes require two-phase commit over WebSocket channels.',
        'D. Because locks cannot be acquired across different Docker containers.',
      ],
      answerIndex: 1,
      staffRationale:
        'As Martin Kleppmann famously proved, a lock with a lease timeout cannot guarantee safety without a monotonically increasing Fencing Token verified by the storage layer, because client pauses (GC, page faults, CPU stalls) can exceed the lock lease duration.',
    },
  ],
}
