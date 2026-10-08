import type { SystemDeepExploration } from '../systemDeepExplorationRegistry'

export const CORE_DEEP_EXPLORATION: Record<string, SystemDeepExploration> = {
  tinyurl: {
    systemId: 'tinyurl',
    executiveArchitectureSummary:
      'A globally distributed URL shortener service engineered for a 100:1 read-to-write ratio, sub-5ms P99 redirection latencies, and 100% collision-free alias generation using an offline Key Generation Service (KGS) and multi-tier caching.',
    problemStatementAndWhyHard:
      'While shortening a link appears straightforward, doing so at 100,000 QPS with 100 billion unique links presents severe distributed concurrency challenges: race conditions in alias assignment, write lock contention on the primary database, hot-spotting on viral celebrity links, and 301 vs 302 redirection trade-offs affecting analytics collection.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Edge DNS & Anycast Gateway', action: 'Client issues HTTP GET /{shortCode}. Geo-DNS routes packet to nearest edge POP.', latencyEstimate: '1.2ms', protocol: 'HTTPS / TLS 1.3' },
      { stepNumber: 2, component: 'L7 Load Balancer (Envoy)', action: 'Terminates TLS, extracts short code token, and checks local L1 in-process LRU cache.', latencyEstimate: '0.3ms', protocol: 'HTTP/2' },
      { stepNumber: 3, component: 'Distributed Cache (Redis Cluster)', action: 'Executes GET url:{shortCode}. Cache hit returns original destination URL immediately.', latencyEstimate: '1.5ms', protocol: 'Redis RESP' },
      { stepNumber: 4, component: 'Relational Sharded DB (Aurora / PostgreSQL)', action: 'On cache miss: queries SELECT long_url FROM url_mapping WHERE short_code = ? from read replica.', latencyEstimate: '4.8ms', protocol: 'SQL over TCP' },
      { stepNumber: 5, component: 'Asynchronous Click Counter (Kafka)', action: 'Emits click event {shortCode, ip, referrer, timestamp} to analytics Kafka topic; returns HTTP 302 to user.', latencyEstimate: '0.8ms', protocol: 'Kafka TCP' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'API Gateway & Rate Limiter', action: 'Ingests POST /api/v1/urls with longUrl. Checks sliding window token bucket in Redis (limit: 50 req/min per IP).', latencyEstimate: '2.1ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Shortening Microservice', action: 'Pulls pre-generated 7-character Base62 token from local in-memory KGS buffer without querying database.', latencyEstimate: '0.2ms', protocol: 'In-Process' },
      { stepNumber: 3, component: 'Primary Database Master', action: 'Executes INSERT INTO url_mapping (short_code, long_url, user_id, created_at, expires_at).', latencyEstimate: '8.5ms', protocol: 'SQL (ACID Commit)' },
      { stepNumber: 4, component: 'Redis Cache Hydration', action: 'Sets key url:{shortCode} = longUrl with 24-hour TTL (Cache-Aside pattern).', latencyEstimate: '1.2ms', protocol: 'Redis RESP' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Relational Database (PostgreSQL / CockroachDB)',
        entity: 'url_mapping',
        primaryKey: 'short_code VARCHAR(7) (Binary Collation)',
        partitionKey: 'MD5(short_code) % 16 (16 Physical Shards)',
        schemaDefinition: 'CREATE TABLE url_mapping (short_code VARCHAR(7) PRIMARY KEY, long_url VARCHAR(2048) NOT NULL, user_id BIGINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP NULL, INDEX idx_user_created (user_id, created_at));',
        indexingRationale: 'The primary key short_code uses a B+ Tree index for O(log N) point lookups. The compound index idx_user_created supports fast pagination of a user\'s links.',
      },
      {
        storageType: 'In-Memory Cache (Redis Cluster)',
        entity: 'url_cache',
        primaryKey: 'url:{short_code}',
        partitionKey: 'CRC16(short_code) % 16384 (Redis Hash Slot)',
        schemaDefinition: 'STRING: key = url:aZ81kLm -> value = "https://example.com/target"',
        indexingRationale: 'O(1) in-memory hash table lookup with allkeys-lru eviction policy for memory safety.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Base62 Token Generation: KGS vs MD5 Hash with Counter',
        chosenApproach: 'Offline Key Generation Service (KGS) reserving key ranges in memory',
        rejectedAlternative: 'Computing MD5(longUrl) and taking first 7 characters, resolving collisions by appending salt',
        rationale: 'Hashing requires DB queries to detect collisions (up to 3 round trips). KGS guarantees 0% collision with 0ms calculation overhead.',
      },
      {
        decision: 'HTTP Redirection Status: 301 Permanent vs 302 Temporary',
        chosenApproach: 'HTTP 302 Found (Temporary Redirect)',
        rejectedAlternative: 'HTTP 301 Moved Permanently',
        rationale: 'HTTP 301 is cached by browser indefinitely, preventing the server from recording click analytics. HTTP 302 forces browser to hit server on every click.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'KGS Server Crash during active token dispensing',
        impact: 'Tokens held in the crashed server\'s memory are discarded.',
        detectionMechanism: 'ZooKeeper / Raft heartbeat timeout (3000ms).',
        automatedRecovery: 'Standby KGS instance acquires lock and claims next disjoint range of 1,000,000 keys from DB.',
      },
      {
        failureScenario: 'Viral URL Cache Stampede (Thundering Herd)',
        impact: 'Millions of concurrent requests hit the database simultaneously when a popular link expires.',
        detectionMechanism: 'Surge in DB connection pool saturation and P99 latency.',
        automatedRecovery: 'Singleflight mutex pattern: only 1 worker queries DB while others wait on local promise, plus probabilistic early expiration (XFetch algorithm).',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Write Throughput', assumption: '100 million new URLs per month', calculation: '100,000,000 / (30 * 86,400) ≈ 40 writes/sec (Peak: 200 writes/sec)', finalRequirement: 'Sustained easily by single master database with async replicas.' },
      { metric: 'Read Throughput', assumption: '100:1 read-to-write ratio', calculation: '40 * 100 = 4,000 reads/sec (Peak: 20,000 reads/sec)', finalRequirement: 'Served 95% from Redis cache cluster; DB only handles ~200 QPS misses.' },
      { metric: 'Storage Footprint (5 Years)', assumption: '500 bytes per record; 5 years = 6 billion URLs', calculation: '6,000,000,000 * 500 bytes = 3 Terabytes', finalRequirement: '3 TB over 5 years fits on standard SSD EBS volumes without complex cold tiering.' },
    ],
  },

  'distributed-cache': {
    systemId: 'distributed-cache',
    executiveArchitectureSummary:
      'An ultra-low-latency in-memory key-value cache cluster delivering sub-millisecond reads and writes at 1,000,000+ QPS per cluster, leveraging non-blocking event-loop I/O, hash slot sharding, and O(1) LRU eviction.',
    problemStatementAndWhyHard:
      'Serving microsecond latencies requires bypassing OS context-switching overheads, avoiding heap memory fragmentation from frequent malloc/free calls, synchronizing state without distributed locks, and handling node failovers without cache invalidation storms.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Smart Cache Client Library', action: 'Computes CRC16(key) % 16384 to identify the exact shard master owning the hash slot.', latencyEstimate: '0.02ms', protocol: 'In-Memory Client' },
      { stepNumber: 2, component: 'Direct TCP Socket Connection', action: 'Sends binary RESP3 GET command directly to target Redis master without intermediate proxies.', latencyEstimate: '0.35ms', protocol: 'TCP / RESP3' },
      { stepNumber: 3, component: 'Single-Threaded epoll Event Loop', action: 'Processes query from I/O multiplexer queue without mutex acquisition or thread contention.', latencyEstimate: '0.05ms', protocol: 'Linux epoll' },
      { stepNumber: 4, component: 'Hash Table Lookup & LRU Touch', action: 'Locates dictEntry in bucket array; updates LRU clock timestamp on robj struct.', latencyEstimate: '0.03ms', protocol: 'In-Memory C Pointer' },
      { stepNumber: 5, component: 'RESP3 Serialized Wire Response', action: 'Writes byte buffer back to client socket descriptor.', latencyEstimate: '0.30ms', protocol: 'TCP / RESP3' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Smart Client Library', action: 'Hashes key to slot; dispatches SET key value EX 3600 to shard master.', latencyEstimate: '0.02ms', protocol: 'In-Memory Client' },
      { stepNumber: 2, component: 'Master Event Loop', action: 'Allocates memory via jemalloc, creates dictEntry, links into hash table.', latencyEstimate: '0.08ms', protocol: 'jemalloc' },
      { stepNumber: 3, component: 'Append-Only File (AOF) Buffer', action: 'Appends raw command to memory AOF buffer (flushed to NVMe SSD every second).', latencyEstimate: '0.04ms', protocol: 'File Descriptor Buffer' },
      { stepNumber: 4, component: 'Replication Stream Publish', action: 'Copies command bytes to circular replication ring buffer for connected read replicas.', latencyEstimate: '0.06ms', protocol: 'Asynchronous TCP' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'In-Memory RAM (jemalloc slab allocator)',
        entity: 'dictEntry & robj',
        primaryKey: 'sds (Simple Dynamic String) key',
        partitionKey: 'CRC16(key) % 16384',
        schemaDefinition: 'struct dictEntry { void *key; union { void *val; uint64_t u64; int64_t s64; double d; } v; struct dictEntry *next; };',
        indexingRationale: 'Dual hash tables (dict[0] and dict[1]) enable progressive rehashing: incremental bucket migration on each lookup eliminates latency spikes.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Concurrency Architecture: Single-Threaded Event Loop vs Multi-Threaded Locking',
        chosenApproach: 'Single-threaded event loop with I/O multiplexing (epoll/kqueue)',
        rejectedAlternative: 'Multi-threaded server with per-bucket mutex locks (Memcached style)',
        rationale: 'Locks incur high CPU context switching and cache invalidation overhead. A single core easily handles 100k+ ops/sec memory-bound with zero lock contention.',
      },
      {
        decision: 'Persistence Strategy: AOF (everysec) vs RDB Point-in-Time Snapshots',
        chosenApproach: 'Hybrid persistence: RDB snapshot + AOF incremental append',
        rejectedAlternative: 'Synchronous fsync on every write',
        rationale: 'Synchronous fsync caps throughput at ~1,000 IOPS on SSDs. AOF everysec limits data loss to 1 second while maintaining 100k+ QPS in RAM.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Master Node Hardware Crash / Kernel Panic',
        impact: 'Hash slots owned by failed master become temporarily unwritable.',
        detectionMechanism: 'Cluster Gossip protocol misses 3 consecutive heartbeats (NODE_FAIL state broadcast).',
        automatedRecovery: 'Replicas initiate Raft-style leader election; healthiest replica claims slots and takes over as master in < 2 seconds.',
      },
      {
        failureScenario: 'Memory Exhaustion under Heavy Ingestion',
        impact: 'Out-Of-Memory (OOM) killer halts process.',
        detectionMechanism: 'Memory high-water mark alert at 85% of maxmemory.',
        automatedRecovery: 'Active volatile-lru or allkeys-lru eviction kicks in; samples 5 random keys per tick and evicts oldest.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Throughput per Node', assumption: 'Modern 8-core CPU with 10Gbps NIC', calculation: '100,000 - 150,000 ops/sec per core', finalRequirement: '10-node cluster delivers 1.2M+ aggregate QPS.' },
      { metric: 'RAM Sizing for 100M Keys', assumption: 'Average key size 32 bytes, value size 500 bytes, dictEntry overhead 64 bytes', calculation: '100,000,000 * (32 + 500 + 64) bytes ≈ 59.6 GB * 1.3 jemalloc fragmentation buffer = 77.5 GB', finalRequirement: '3 master nodes with 32 GB RAM each + 3 standby replicas.' },
    ],
  },

  'kafka-broker': {
    systemId: 'kafka-broker',
    executiveArchitectureSummary:
      'A high-throughput distributed commit log architecture capable of ingesting 2,000,000+ events/sec, persisting ordered partitions to disk using Linux PageCache and zero-copy transfer (sendfile), with KRaft consensus.',
    problemStatementAndWhyHard:
      'Standard messaging brokers fail at high scale because random disk I/O, complex B-Tree indexes, and individual message acknowledgments overwhelm hardware. Kafka achieves petabyte-scale streaming by treating logs as append-only files and relying on sequential I/O.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Consumer Group Fetcher', action: 'Issues FetchRequest specifying Topic, Partition, and committed Offset index.', latencyEstimate: '0.4ms', protocol: 'Kafka TCP Wire' },
      { stepNumber: 2, component: 'Broker Partition Leader', action: 'Locates segment file offset via memory-mapped sparse index (.index file).', latencyEstimate: '0.05ms', protocol: 'In-Memory Binary Search' },
      { stepNumber: 3, component: 'Linux OS PageCache', action: 'Data segment is read directly from kernel PageCache without disk read head movement.', latencyEstimate: '0.12ms', protocol: 'OS Kernel Memory' },
      { stepNumber: 4, component: 'Zero-Copy sendfile() System Call', action: 'Transfers bytes directly from PageCache to network NIC socket buffer, bypassing user-space RAM.', latencyEstimate: '0.18ms', protocol: 'sendfile(2)' },
      { stepNumber: 5, component: 'Consumer Client Batch Ingestion', action: 'Consumer parses RecordBatch; commits new offset to __consumer_offsets topic.', latencyEstimate: '0.50ms', protocol: 'Kafka Protocol' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Kafka Producer RecordBatcher', action: 'Batches events in memory by partition key hash (RecordAccumulator 16KB batches).', latencyEstimate: '0.8ms', protocol: 'In-Memory Client' },
      { stepNumber: 2, component: 'Producer Network Client', action: 'Transmits batch to Partition Leader broker over persistent TCP socket.', latencyEstimate: '1.2ms', protocol: 'Kafka Binary Protocol' },
      { stepNumber: 3, component: 'Broker Sequential Append', action: 'Appends batch to active .log segment file on disk (sequential write at 600 MB/s).', latencyEstimate: '0.2ms', protocol: 'write(2) to PageCache' },
      { stepNumber: 4, component: 'In-Sync Replica (ISR) Sync', action: 'Follower brokers pull batch and append to local replicas. Leader waits for acks=all.', latencyEstimate: '3.5ms', protocol: 'Replication Fetch' },
      { stepNumber: 5, component: 'Producer Acknowledgment', action: 'Leader returns ProduceResponse with partition base offset to producer.', latencyEstimate: '0.3ms', protocol: 'Kafka TCP Wire' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Append-Only Log Segments (.log, .index, .timeindex)',
        entity: 'Partition Segment File',
        primaryKey: 'Monotonic 64-bit Offset',
        partitionKey: 'MurmurHash2(RecordKey) % PartitionCount',
        schemaDefinition: 'Binary Log Format: [Offset: 8B | Length: 4B | CRC: 4B | Magic: 1B | Attributes: 1B | Timestamp: 8B | KeyLen: 4B | Key | ValLen: 4B | Value]',
        indexingRationale: 'Sparse Memory-Mapped Index (.index): Stores an entry every 4KB of log data. Binary search locates byte offset in memory, requiring zero random disk seeks.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Disk Storage: Append-Only Commit Log vs Relational B-Tree Tables',
        chosenApproach: 'Sequential append-only log files segmenting every 1GB',
        rejectedAlternative: 'Storing messages in relational database tables with status flags',
        rationale: 'Sequential disk writes achieve 600+ MB/s on NVMe SSDs, whereas random disk I/O caps at ~10 MB/s. Append-only eliminates table locks and fragmentation.',
      },
      {
        decision: 'Network Transfer: Linux Zero-Copy (sendfile) vs User-Space Buffers',
        chosenApproach: 'sendfile(out_fd, in_fd, offset, count)',
        rejectedAlternative: 'read() into application memory and write() back to socket',
        rationale: 'sendfile eliminates 2 memory copies (kernel -> user -> kernel) and 4 context switches per packet, doubling network throughput.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Partition Leader Broker Crash',
        impact: 'Producers experience momentary write pause (LEADER_NOT_AVAILABLE).',
        detectionMechanism: 'KRaft Controller notices missed broker heartbeat within 3000ms.',
        automatedRecovery: 'KRaft Controller elects the highest-offset In-Sync Replica (ISR) as new Leader and broadcasts metadata update to all clients.',
      },
      {
        failureScenario: 'Consumer Group Member Dies mid-processing',
        impact: 'Unprocessed messages assigned to the failed consumer stall temporarily.',
        detectionMechanism: 'Heartbeat thread misses 3 consecutive intervals (session.timeout.ms = 10000ms).',
        automatedRecovery: 'Consumer Coordinator initiates group rebalance; partitions reassigned to healthy consumers without message loss.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Ingress Throughput', assumption: '1,000,000 events/sec at 1KB per event', calculation: '1,000,000 * 1 KB = 1 GB/sec network ingress (8 Gbps)', finalRequirement: 'Requires minimum of 4 broker nodes with 10Gbps NICs.' },
      { metric: 'Daily Storage with 3x Replication', assumption: '1 GB/sec sustained * 86,400 sec * 3 replicas', calculation: '86.4 TB/day raw * 3 = 259.2 TB/day', finalRequirement: '7-day retention requires 1.8 Petabytes NVMe storage array across broker cluster.' },
    ],
  },

  'distributed-lock': {
    systemId: 'distributed-lock',
    executiveArchitectureSummary:
      'A fault-tolerant distributed locking coordinator engineered for high concurrency, combining Redis quorum locks (Redlock) across 5 independent nodes with fencing tokens to guarantee mutual exclusion even during GC pauses and network partitions.',
    problemStatementAndWhyHard:
      'Single-node locks fail if the master crashes before replicating the lock to read replicas. Furthermore, client-side JVM/Node.js garbage collection pauses can freeze a worker while its lock lease expires, allowing another worker to acquire the lock concurrently (split-brain).',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Client Lock Probe', action: 'Queries current lock owner and remaining TTL for resource key.', latencyEstimate: '0.4ms', protocol: 'Redis RESP' },
      { stepNumber: 2, component: 'Redis Node TTL Inspection', action: 'Inspects key metadata and returns remaining milliseconds.', latencyEstimate: '0.05ms', protocol: 'In-Memory Lookup' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Client Redlock Initiator', action: 'Generates random UUID value and monotonic fencing counter; records start timestamp T1.', latencyEstimate: '0.01ms', protocol: 'Local CPU' },
      { stepNumber: 2, component: 'Parallel Quorum Dispatch', action: 'Dispatches SET resource_key uuid NX PX 10000 concurrently to 5 independent Redis instances.', latencyEstimate: '2.4ms', protocol: 'Parallel TCP RESP' },
      { stepNumber: 3, component: 'Quorum Evaluation', action: 'Verifies lock was acquired on >= 3 of 5 nodes AND elapsed time (T2 - T1) < lock validity TTL.', latencyEstimate: '0.02ms', protocol: 'In-Process Logic' },
      { stepNumber: 4, component: 'Fencing Token Generation', action: 'Issues incremented integer token (e.g., token=42) passed with all downstream storage writes.', latencyEstimate: '0.01ms', protocol: 'In-Process Logic' },
      { stepNumber: 5, component: 'Atomic Lock Release (Lua)', action: 'Releases lock using atomic script: if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) end.', latencyEstimate: '1.2ms', protocol: 'Redis Lua Script' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Redis In-Memory Key with Expiry',
        entity: 'Distributed Lock Record',
        primaryKey: 'lock:{resource_id}',
        partitionKey: 'resource_id',
        schemaDefinition: 'KEY: lock:order:10928 -> VALUE: "c82b9e11-8f3b-4c22-b9e1-2a90184b29c1:42" with TTL 10000ms',
        indexingRationale: 'NX ensures key is set only if it does not already exist. PX ensures automatic expiration to avoid deadlocks if the holder dies.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Lock Algorithm: Single Redis with Replica vs Redlock Quorum over 5 Independent Masters',
        chosenApproach: 'Redlock across 5 independent master nodes with no replication',
        rejectedAlternative: 'Single Redis master with asynchronous read replicas',
        rationale: 'Asynchronous replication loses lock state if master crashes immediately after confirming lock, granting the lock to two workers simultaneously.',
      },
      {
        decision: 'GC Pause Defense: Lease TTL vs Fencing Tokens',
        chosenApproach: 'Monotonically increasing fencing tokens checked at storage layer',
        rejectedAlternative: 'Relying solely on lease TTL expiration',
        rationale: 'A long stop-the-world GC pause can cause lease expiration. The storage layer must reject writes if a newer token has already been accepted.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Redis Node Crash & Immediate Restart without Persistence',
        impact: 'Node forgets lock state, potentially violating quorum.',
        detectionMechanism: 'Node uptime reset.',
        automatedRecovery: 'Delayed restart policy: Node delays accepting lock requests for maximum TTL duration (10s) until all previous locks naturally expire.',
      },
      {
        failureScenario: 'Network Partition isolating 2 of 5 Redis Nodes',
        impact: 'Two nodes become unreachable.',
        detectionMechanism: 'Socket connection timeout on minority nodes.',
        automatedRecovery: 'Quorum logic succeeds because 3 of 5 nodes remain reachable (majority rule preserved).',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Lock Acquisition QPS', assumption: '10,000 concurrent business operations requiring mutual exclusion', calculation: '10,000 locks/sec * 5 nodes = 50,000 Redis commands/sec', finalRequirement: '5 standalone Redis instances easily sustain 10k lock acquisitions/sec.' },
      { metric: 'Network Overhead', assumption: '50 bytes per SET packet * 5 nodes', calculation: '250 bytes per acquisition * 10,000 = 2.5 MB/sec', finalRequirement: 'Minimal network impact on 1Gbps interfaces.' },
    ],
  },

  'snowflake-id': {
    systemId: 'snowflake-id',
    executiveArchitectureSummary:
      'A decentralized, 64-bit unique ID generator producing 100,000+ roughly time-ordered IDs per second per node without database locks, network coordination, or coordination single points of failure.',
    problemStatementAndWhyHard:
      'UUIDv4 generates 128-bit strings that cause catastrophic B+Tree index fragmentation, doubling index sizes and hurting cache locality. Centralized auto-increment databases become write bottlenecks. Snowflake solves this with bit-packed 64-bit integers.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Application Microservice Thread', action: 'Calls NextId() on local in-process Snowflake generator struct.', latencyEstimate: '0.0002ms', protocol: 'In-Process Call' },
      { stepNumber: 2, component: 'Monotonic Clock Fetch', action: 'Queries OS high-resolution monotonic clock (timespec_get).', latencyEstimate: '0.00005ms', protocol: 'vDSO Kernel Bypass' },
      { stepNumber: 3, component: 'Atomic Sequence Increment', action: 'If timestamp == lastTimestamp: atomic increment sequence; if overflow (4096): spinlock until next millisecond.', latencyEstimate: '0.00008ms', protocol: 'Atomic CPU Instruction' },
      { stepNumber: 4, component: 'Bitwise Assembly', action: 'Bit-shifts [Timestamp << 22 | DataCenter << 17 | WorkerID << 12 | Sequence] into a uint64 integer.', latencyEstimate: '0.00003ms', protocol: 'ALU Bit Shift' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Worker Node Bootstrapping', action: 'Node starts up, registers with ZooKeeper / Consul to claim unique Worker ID (0-1023).', latencyEstimate: '15ms', protocol: 'Raft / Consul RPC' },
      { stepNumber: 2, component: 'Continuous NTP Clock Sync', action: 'Monitors NTP drift; if clock moves backward by > 5ms, halts ID generation to prevent duplicate IDs.', latencyEstimate: '1.0ms', protocol: 'NTP Slew Guard' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: '64-Bit Unsigned Integer (uint64)',
        entity: 'Snowflake ID Structure',
        primaryKey: 'id BIGINT UNSIGNED',
        partitionKey: 'None (Self-Contained)',
        schemaDefinition: 'Bit Layout: [1 Bit Unused (0) | 41 Bits Milliseconds Epoch | 5 Bits Datacenter ID | 5 Bits Worker Node ID | 12 Bits Sequence Number]',
        indexingRationale: 'Time-sorted nature preserves B+Tree sequential append pattern, avoiding expensive page splits in MySQL InnoDB and PostgreSQL.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'ID Architecture: 64-Bit Snowflake vs 128-Bit UUIDv4',
        chosenApproach: '64-Bit bit-packed integers',
        rejectedAlternative: '128-Bit randomly generated UUIDv4 strings',
        rationale: 'UUIDv4 inserts randomly across B-Trees, causing frequent disk paging and 2x larger indexes. Snowflake integers preserve chronological locality.',
      },
      {
        decision: 'Clock Rollback Strategy: Crash vs Busy-Wait Spinlock',
        chosenApproach: 'Busy-wait if clock drift < 5ms; throw exception / refuse requests if drift > 5ms',
        rejectedAlternative: 'Generating IDs with older timestamp',
        rationale: 'Reusing past timestamps risks generating identical IDs if sequence counters reset, causing database primary key collision exceptions.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'NTP Clock Moves Backward by 10ms',
        impact: 'Risk of generating duplicate IDs if sequence restarts.',
        detectionMechanism: 'Snowflake generator compares current timestamp against lastTimestamp.',
        automatedRecovery: 'Generator pauses or raises error until real-world time catches up past lastTimestamp.',
      },
      {
        failureScenario: 'Sequence Overflow within Same Millisecond (> 4096 IDs)',
        impact: '12-bit sequence counter saturates.',
        detectionMechanism: 'Sequence counter mask hits 4096.',
        automatedRecovery: 'Tight while-loop spins until clock ticks to the next millisecond, resetting sequence to 0.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Maximum Throughput per Node', assumption: '4096 IDs per millisecond', calculation: '4096 * 1000 ms = 4,096,000 IDs per second per machine', finalRequirement: 'Far exceeds needs of any individual microservice instance.' },
      { metric: 'Lifespan of 41-Bit Timestamp', assumption: '2^41 milliseconds from custom epoch (e.g., 2026)', calculation: '2,199,023,255,552 ms / (1000 * 86400 * 365) ≈ 69.7 Years', finalRequirement: 'Valid without epoch rollover until year 2095.' },
    ],
  },

  'consistent-hash': {
    systemId: 'consistent-hash',
    executiveArchitectureSummary:
      'A dynamic consistent hash ring with virtual nodes (vnodes) mapping keys to distributed server clusters, ensuring that node additions or removals relocate only K/N keys without cluster-wide re-hashing.',
    problemStatementAndWhyHard:
      'Traditional modulo hashing (hash(key) % N) relocates almost 100% of keys whenever a node joins or leaves, causing massive cache evictions and downstream database outages. Consistent hashing bounds churn to minimal necessary transfers.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Routing Proxy / Client', action: 'Calculates 32-bit hash of key: token = Murmur3(key).', latencyEstimate: '0.001ms', protocol: 'CPU In-Memory' },
      { stepNumber: 2, component: 'Ring Binary Search', action: 'Executes binary search (upper_bound) on sorted array of virtual node tokens to find first vnode >= token.', latencyEstimate: '0.003ms', protocol: 'O(log M) RAM Seek' },
      { stepNumber: 3, component: 'Physical Node Mapping', action: 'Maps virtual node token to physical server IP/Port.', latencyEstimate: '0.0005ms', protocol: 'Hash Map Lookup' },
      { stepNumber: 4, component: 'Dispatch Request', action: 'Routes HTTP/gRPC request to target physical node.', latencyEstimate: '0.40ms', protocol: 'TCP / gRPC' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Node Join / Commission', action: 'New physical node generates 256 virtual node tokens across the 2^32 circle.', latencyEstimate: '1.2ms', protocol: 'Ring Management' },
      { stepNumber: 2, component: 'Ring State Broadcast', action: 'Publishes updated ring token array to cluster via Gossip protocol / ZooKeeper.', latencyEstimate: '5.0ms', protocol: 'Gossip UDP' },
      { stepNumber: 3, component: 'Key Range Migration', action: 'New node streams keys belonging to its ownership ranges from predecessor nodes in background.', latencyEstimate: '1500ms', protocol: 'Background Async TCP' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'In-Memory Sorted Array & Map',
        entity: 'Hash Ring Structure',
        primaryKey: 'Token (uint32)',
        partitionKey: 'Continuous 2^32 Range',
        schemaDefinition: 'struct HashRing { ringTokens: []uint32, vnodeToNode: map[uint32]string }',
        indexingRationale: 'Sorted token slice enables O(log M) binary search where M = physical_nodes * vnodes_per_node.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Virtual Node Count: 10 vs 256 vnodes per physical node',
        chosenApproach: '256 virtual nodes per physical server',
        rejectedAlternative: '1 virtual node per physical server',
        rationale: 'With only 1 vnode, non-uniform hash distribution leads to severe load skew (up to 400% variance). 256 vnodes reduces variance to < 5%.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Physical Server Node Sudden Crash',
        impact: 'Keys assigned to the failed node are immediately routed to its successor node.',
        detectionMechanism: 'Heartbeat failure via Gossip protocol (SWIM protocol).',
        automatedRecovery: 'Successor nodes absorb incoming traffic; standby replica is promoted to rebuild lost partitions.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Memory for 1,000 Nodes with 256 Vnodes', assumption: '256,000 total tokens in ring', calculation: '256,000 * (4 bytes token + 8 bytes pointer) ≈ 3.1 MB RAM', finalRequirement: 'Fits comfortably in L3 CPU cache for ultra-fast lookup.' },
      { metric: 'Key Churn on Node Addition', assumption: '1,000,000 total keys across 10 nodes; add 1 node', calculation: 'K / (N + 1) = 1,000,000 / 11 ≈ 90,909 keys relocated (9.1% churn vs 100% in mod N)', finalRequirement: 'Minimal network rebalancing load.' },
    ],
  },

  'dynamo-kv': {
    systemId: 'dynamo-kv',
    executiveArchitectureSummary:
      'A decentralized, highly available distributed key-value store modeled on Amazon Dynamo, employing consistent hashing, vector clocks for conflict resolution, sloppy quorums (N=3, W=2, R=2), and Merkle tree anti-entropy.',
    problemStatementAndWhyHard:
      'During network partitions, traditional CP systems reject writes to maintain consistency, destroying availability. Dynamo guarantees 99.999% write availability (AP system) by accepting writes on any reachable node and resolving divergent versions asynchronously.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Client Request Coordinator', action: 'Client sends GET key to any random Dynamo node; node acts as Coordinator.', latencyEstimate: '0.8ms', protocol: 'gRPC' },
      { stepNumber: 2, component: 'Preference List Routing', action: 'Coordinator queries consistent hash ring to find N=3 healthy replica nodes.', latencyEstimate: '0.05ms', protocol: 'In-Memory Ring' },
      { stepNumber: 3, component: 'Quorum Read Dispatch', action: 'Dispatches read requests to all N nodes in parallel; waits for R=2 fastest responses.', latencyEstimate: '2.5ms', protocol: 'Internal TCP' },
      { stepNumber: 4, component: 'Version Vector Reconciliation', action: 'If values differ, compares Vector Clocks. If concurrent conflict exists, returns all siblings to client for resolution.', latencyEstimate: '0.2ms', protocol: 'Vector Clock Logic' },
      { stepNumber: 5, component: 'Read Repair Trigger', action: 'If one replica returned a stale version, asynchronously sends latest version to update it.', latencyEstimate: '1.2ms', protocol: 'Async Gossip' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Write Coordinator', action: 'Receives PUT key value with client vector clock context.', latencyEstimate: '0.8ms', protocol: 'gRPC' },
      { stepNumber: 2, component: 'Vector Clock Increment', action: 'Coordinator increments its own counter on the vector clock.', latencyEstimate: '0.02ms', protocol: 'In-Memory' },
      { stepNumber: 3, component: 'Quorum Write Dispatch', action: 'Sends write to top N=3 replica nodes; waits for W=2 acknowledgments.', latencyEstimate: '3.2ms', protocol: 'Internal TCP' },
      { stepNumber: 4, component: 'Local Storage Engine Commit', action: 'Nodes append write to local commit log and update in-memory LSM MemTable.', latencyEstimate: '0.8ms', protocol: 'NVMe WAL Append' },
      { stepNumber: 5, component: 'Success Response', action: 'Coordinator returns HTTP 200 OK once W=2 nodes have committed write.', latencyEstimate: '0.2ms', protocol: 'gRPC Response' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Log-Structured Merge-Tree (LSM Engine: RocksDB / Scylla)',
        entity: 'Dynamo KV Record',
        primaryKey: 'partition_key STRING',
        partitionKey: 'MD5(key)',
        schemaDefinition: 'struct Record { key: string, val: []byte, clock: VectorClock, timestamp: int64 }',
        indexingRationale: 'LSM MemTable absorbs writes in RAM and flushes to immutable SSTables on NVMe, delivering 100k+ writes/sec per node.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Consistency vs Availability: Strong Consistency (CP) vs Eventual Consistency (AP)',
        chosenApproach: 'AP (Available, Partition-Tolerant) with Sloppy Quorums and Hinted Handoff',
        rejectedAlternative: 'CP (Strict 2PC or Paxos linearizability)',
        rationale: 'Amazon shopping cart cannot drop customer items during partitions. Accepting writes and resolving conflicts later maximizes business revenue.',
      },
      {
        decision: 'Quorum Configuration: R=1, W=3 vs R=2, W=2 for N=3',
        chosenApproach: 'R=2, W=2 (Balanced read/write quorum where R + W > N)',
        rejectedAlternative: 'R=3, W=1',
        rationale: 'R + W > N ensures read and write quorums overlap by at least one node, guaranteeing read-your-writes consistency.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Replica Node Unreachable during Quorum Write',
        impact: 'Target replica does not receive write directly.',
        detectionMechanism: 'TCP socket timeout (2000ms).',
        automatedRecovery: 'Hinted Handoff: Coordinator writes to an alternate healthy node with metadata indicating intended destination, delivered once node recovers.',
      },
      {
        failureScenario: 'Silent Data Drift between Replicas',
        impact: 'Replicas diverge over time due to dropped network packets.',
        detectionMechanism: 'Background Merkle Tree hash comparison.',
        automatedRecovery: 'Anti-Entropy synchronization compares Merkle tree root hashes; only branches with differing hashes are synchronized over the network.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Cluster Throughput', assumption: '100 nodes, 10,000 IOPS per node', calculation: '100 * 10,000 = 1,000,000 operations/sec aggregate', finalRequirement: 'Horizontal scaling achieves linear capacity growth.' },
      { metric: 'Cross-Node Anti-Entropy Bandwidth', assumption: 'Merkle trees exchanged hourly', calculation: '64KB tree hash per partition * 10,000 partitions = 640 MB / hour', finalRequirement: 'Negligible bandwidth footprint (< 2 Mbps).' },
    ],
  },
}
