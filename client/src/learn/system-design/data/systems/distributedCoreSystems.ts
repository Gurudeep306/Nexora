import type { SystemDesignModel } from '../../types'

export const DISTRIBUTED_CORE_SYSTEMS: SystemDesignModel[] = [
  {
    id: 'tinyurl',
    name: 'Distributed URL Shortener (TinyURL)',
    category: 'Distributed Core',
    difficulty: 'Intermediate',
    tagline: 'High-availability URL shortening service with Base62 encoding, Key Generation Service (KGS), and distributed caching.',
    throughput: '1,000 writes/sec · 50,000 reads/sec (50:1 Read-to-Write Ratio)',
    latency: 'p99 Read < 10ms · p99 Write < 35ms',
    storageScale: '30 Billion URLs across 5 years · ~15 TB storage',
    overview:
      'A globally distributed URL shortening service capable of redirecting billions of clicks per month with single-digit millisecond latency. Employs a pre-allocated Key Generation Service (KGS) to eliminate write-time collision overhead, combined with distributed Redis caching to serve 99% of read redirects from memory.',
    functionalReqs: [
      'Given a long URL, generate a unique, short alias (7-character alphanumeric string).',
      'When a user visits a short URL, redirect them via HTTP 301 (Permanent) or HTTP 302 (Temporary) to the original long URL.',
      'Allow custom short aliases (e.g., /my-campaign) with collision detection.',
      'Support link expiration (default: 5 years, customizable TTL).',
      'Track real-time analytics (click count, referrer, geo-location, user-agent).',
    ],
    nonFunctionalReqs: [
      'Extremely high availability (99.999% uptime) — redirects must never fail.',
      'Sub-15ms redirect latency worldwide.',
      'Short URL strings must not be easily guessable (avoid sequential enumeration).',
      'Eventual consistency for analytics aggregation.',
    ],
    calculations: [
      {
        metric: 'Write Throughput',
        formula: '100M new URLs / month = 100M / (30 * 86,400) ≈ 38.6 writes/sec',
        result: '~40 writes/sec (Peak: ~1,000 writes/sec)',
      },
      {
        metric: 'Read Throughput',
        formula: '50:1 Read-to-Write ratio = 100M * 50 = 5 Billion reads/month',
        result: '~2,000 reads/sec (Peak: ~50,000 reads/sec)',
      },
      {
        metric: 'Storage Capacity (5 Years)',
        formula: '100M * 12 * 5 = 6B URLs. Average record = 500 bytes. 6B * 500 B = 3 TB',
        result: '3 TB raw data (~15 TB with 3x replication + indices)',
      },
      {
        metric: 'Memory for Cache (80/20 Rule)',
        formula: 'Daily read volume = 5B / 30 = 166M requests/day. 20% hot data = 33.3M URLs * 500 B',
        result: '~16.7 GB RAM in Redis cluster',
      },
      {
        metric: 'Base62 Key Space',
        formula: '62^7 = (26 lower + 26 upper + 10 digits)^7 ≈ 3.52 Trillion unique URLs',
        result: '3.52 Trillion combinations (Plenty for 6B URLs)',
      },
    ],
    services: [
      {
        id: 'client',
        name: 'Web Browser / Client',
        role: 'Initiates short link redirects or creates short URLs',
        type: 'client',
        x: 10,
        y: 50,
        icon: 'Globe',
        techStack: 'Any HTTP Client / Browser',
        details: 'Sends HTTP GET /s/{shortCode} or POST /api/v1/shorten',
      },
      {
        id: 'api-gateway',
        name: 'API Gateway & Rate Limiter',
        role: 'L7 Reverse Proxy, SSL termination, and rate limiting',
        type: 'gateway',
        x: 32,
        y: 50,
        icon: 'Shield',
        techStack: 'Envoy / Nginx / Cloudflare',
        details: 'Rate limits abusive clients (10 req/sec/IP), terminates TLS, routes by path',
      },
      {
        id: 'url-service',
        name: 'URL Shortener Service',
        role: 'Core business logic for encoding, decoding, and dispatching events',
        type: 'service',
        x: 55,
        y: 35,
        icon: 'Server',
        techStack: 'Go / Node.js (Stateless Container)',
        details: 'Consults Redis cache, falls back to DB, writes to Kafka for analytics',
      },
      {
        id: 'kgs',
        name: 'Key Generation Service (KGS)',
        role: 'Pre-generates and dispenses unique 7-character Base62 keys',
        type: 'worker',
        x: 55,
        y: 75,
        icon: 'Key',
        techStack: 'Go / ZooKeeper / RocksDB',
        details: 'Dispenses pre-generated random Base62 tokens in blocks of 10,000 to avoid locking',
      },
      {
        id: 'cache',
        name: 'Redis Distributed Cache',
        role: 'In-memory LRU cache storing hot ShortCode -> LongURL mappings',
        type: 'cache',
        x: 78,
        y: 20,
        icon: 'Zap',
        techStack: 'Redis Cluster (Master-Replica with Sentinels)',
        details: 'Stores key-value pairs with 7-day TTL and LRU eviction policy',
      },
      {
        id: 'db',
        name: 'Distributed Database',
        role: 'Persistent storage for URL metadata',
        type: 'database',
        x: 82,
        y: 50,
        icon: 'Database',
        techStack: 'PostgreSQL / CockroachDB (Sharded by short_code hash)',
        details: 'B-tree index on short_code. Read replicas in multiple availability zones',
      },
      {
        id: 'analytics-queue',
        name: 'Analytics Kafka Queue',
        role: 'Asynchronous event stream for click telemetry',
        type: 'queue',
        x: 78,
        y: 80,
        icon: 'Layers',
        techStack: 'Apache Kafka / Redpanda',
        details: 'Decouples redirect path from heavy analytics processing (ClickHouse pipeline)',
      },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'api-gateway', label: 'HTTP GET /s/aZ8k92Q', protocol: 'HTTPS' },
      { id: 'c2', from: 'api-gateway', to: 'url-service', label: 'Forward Request (L7)', protocol: 'gRPC' },
      { id: 'c3', from: 'url-service', to: 'cache', label: 'GET url:aZ8k92Q', protocol: 'Redis' },
      { id: 'c4', from: 'url-service', to: 'db', label: 'SELECT long_url WHERE code=...', protocol: 'SQL' },
      { id: 'c5', from: 'url-service', to: 'kgs', label: 'Acquire New Token Block', protocol: 'gRPC' },
      { id: 'c6', from: 'url-service', to: 'analytics-queue', label: 'Publish Click Event', protocol: 'Kafka' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Client Request Ingestion',
        description: 'User clicks on short link https://tiny.nexora.dev/s/aZ8k92Q. Request hits L7 API Gateway.',
        fromNode: 'client',
        toNode: 'api-gateway',
        protocol: 'HTTPS',
        payload: {
          method: 'GET',
          path: '/s/aZ8k92Q',
          headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120', 'CF-IPCountry': 'US' },
        },
        codeRef: {
          file: 'gateway.go',
          lineHighlight: '14-22',
          funcName: 'RouteAndRateLimit',
          codeExplanation: 'Checks client IP token bucket in Redis; validates /s/:shortCode route regex.',
        },
        stateChange: 'Gateway verifies client is under rate limit and dispatches to URL Service pool.',
      },
      {
        step: 2,
        title: 'Step 2: Service Receives Redirect Query',
        description: 'Gateway forwards request via internal high-throughput gRPC channel to URL Service.',
        fromNode: 'api-gateway',
        toNode: 'url-service',
        protocol: 'gRPC',
        payload: { shortCode: 'aZ8k92Q', timestamp: 1718029301000 },
        codeRef: {
          file: 'url_service.go',
          lineHighlight: '28-36',
          funcName: 'ResolveURL',
          codeExplanation: 'Extracts short code and prepares query for in-memory Redis cluster cache.',
        },
        stateChange: 'URL service initializes resolution context and read stopwatch.',
      },
      {
        step: 3,
        title: 'Step 3: In-Memory Cache Lookup',
        description: 'Service checks Redis cache for key "url:aZ8k92Q". Cache hit returns in sub-millisecond time.',
        fromNode: 'url-service',
        toNode: 'cache',
        protocol: 'Redis',
        payload: { command: 'GET', key: 'url:aZ8k92Q' },
        codeRef: {
          file: 'url_service.go',
          lineHighlight: '38-48',
          funcName: 'queryCache',
          codeExplanation: 'Executes non-blocking Redis GET. If present, returns long URL immediately.',
        },
        stateChange: 'Cache returns HIT with value "https://system-design.nexora.dev/distributed-systems".',
      },
      {
        step: 4,
        title: 'Step 4: Asynchronous Click Telemetry',
        description: 'While returning the redirect to client, service dispatches click event asynchronously to Kafka.',
        fromNode: 'url-service',
        toNode: 'analytics-queue',
        protocol: 'Kafka',
        payload: {
          topic: 'url-clicks',
          message: {
            shortCode: 'aZ8k92Q',
            ipHash: 'e3b0c44298fc1c149afbf4c8996fb924',
            country: 'US',
            userAgent: 'Chrome',
            timestamp: 1718029301002,
          },
        },
        codeRef: {
          file: 'analytics_producer.go',
          lineHighlight: '12-25',
          funcName: 'EmitClickEvent',
          codeExplanation: 'Non-blocking fire-and-forget publish to partitioned Kafka topic.',
        },
        stateChange: 'Kafka acknowledges message receipt to URL service; consumer pipelines will aggregate stats.',
      },
      {
        step: 5,
        title: 'Step 5: HTTP 302 Temporary Redirect',
        description: 'URL Service returns HTTP 302 Found response with Location header back to user browser.',
        fromNode: 'url-service',
        toNode: 'client',
        protocol: 'HTTPS',
        payload: {
          status: 302,
          headers: {
            Location: 'https://system-design.nexora.dev/distributed-systems',
            'Cache-Control': 'private, max-age=90',
          },
        },
        codeRef: {
          file: 'url_service.go',
          lineHighlight: '52-60',
          funcName: 'respondRedirect',
          codeExplanation: 'Returns HTTP 302 (Temporary Redirect) so subsequent clicks still hit server for analytics.',
        },
        stateChange: 'Browser receives 302 and navigates user instantly to destination URL. Total roundtrip: 7ms.',
      },
    ],
    codeFiles: [
      {
        name: 'url_service.go',
        language: 'go',
        role: 'Core URL Resolver & Redirect Controller',
        code: `package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/segmentio/kafka-go"
)

type URLService struct {
	db          *sql.DB
	rdb         *redis.Client
	kafkaWriter *kafka.Writer
	kgsClient   *KGSClient
}

// ResolveURL handles GET /s/:shortCode
func (s *URLService) ResolveURL(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	shortCode := r.URL.Path[len("/s/"):]

	if len(shortCode) == 0 {
		http.Error(w, "Invalid short code", http.StatusBadRequest)
		return
	}

	cacheKey := fmt.Sprintf("url:%s", shortCode)

	// 1. Check Redis Cache
	longURL, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil && longURL != "" {
		s.asyncTrackClick(shortCode, r)
		http.Redirect(w, r, longURL, http.StatusFound) // 302 Temporary Redirect
		return
	}

	// 2. Cache Miss: Fallback to Database
	var originalURL string
	var expiresAt time.Time
	query := "SELECT original_url, expires_at FROM short_urls WHERE short_code = $1"
	err = s.db.QueryRowContext(ctx, query, shortCode).Scan(&originalURL, &expiresAt)

	if err == sql.ErrNoRows {
		http.NotFound(w, r)
		return
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Check expiration
	if time.Now().After(expiresAt) {
		http.Error(w, "Short link expired", http.StatusGone)
		return
	}

	// 3. Populate Redis Cache (TTL: 7 days)
	s.rdb.Set(ctx, cacheKey, originalURL, 7*24*time.Hour)

	// 4. Emit Click Event asynchronously
	s.asyncTrackClick(shortCode, r)

	// 5. Send HTTP 302 Redirect
	http.Redirect(w, r, originalURL, http.StatusFound)
}

func (s *URLService) asyncTrackClick(code string, r *http.Request) {
	go func() {
		msg := kafka.Message{
			Key:   []byte(code),
			Value: []byte(fmt.Sprintf("{\"code\":\"%s\",\"ip\":\"%s\",\"ua\":\"%s\",\"ts\":%d}", 
				code, r.RemoteAddr, r.UserAgent(), time.Now().UnixMilli())),
		}
		_ = s.kafkaWriter.WriteMessages(context.Background(), msg)
	}()
}`,
      },
      {
        name: 'kgs_worker.go',
        language: 'go',
        role: 'Key Generation Service (KGS) Pre-Generator',
        code: `package main

import (
	"crypto/rand"
	"math/big"
	"sync"
)

const base62Chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

type KGSWorker struct {
	mu        sync.Mutex
	tokenPool []string
	batchSize int
}

func NewKGSWorker(batchSize int) *KGSWorker {
	k := &KGSWorker{batchSize: batchSize, tokenPool: make([]string, 0, batchSize)}
	k.refillPool()
	return k
}

// GenerateRandomBase62 generates a non-sequential 7-character string
func GenerateRandomBase62(length int) (string, error) {
	bytes := make([]byte, length)
	maxIndex := big.NewInt(int64(len(base62Chars)))

	for i := 0; i < length; i++ {
		num, err := rand.Int(rand.Reader, maxIndex)
		if err != nil {
			return "", err
		}
		bytes[i] = base62Chars[num.Int64()]
	}
	return string(bytes), nil
}

// GetToken acquires a pre-generated token with O(1) lock time
func (k *KGSWorker) GetToken() string {
	k.mu.Lock()
	defer k.mu.Unlock()

	if len(k.tokenPool) == 0 {
		k.refillPool()
	}

	token := k.tokenPool[len(k.tokenPool)-1]
	k.tokenPool = k.tokenPool[:len(k.tokenPool)-1]
	return token
}

func (k *KGSWorker) refillPool() {
	for i := 0; i < k.batchSize; i++ {
		t, _ := GenerateRandomBase62(7)
		k.tokenPool = append(k.tokenPool, t)
	}
}`,
      },
      {
        name: 'schema.sql',
        language: 'sql',
        role: 'Database Schema & Partitioning',
        code: `-- PostgreSQL Sharded Database Schema
CREATE TABLE short_urls (
    id BIGSERIAL,
    short_code VARCHAR(7) NOT NULL,
    original_url TEXT NOT NULL,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (short_code)
) PARTITION BY HASH (short_code);

-- Create 16 Hash Partitions for distributed scaling
CREATE TABLE short_urls_p0 PARTITION OF short_urls FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE short_urls_p1 PARTITION OF short_urls FOR VALUES WITH (MODULUS 16, REMAINDER 1);
-- ... p2 through p15 ...

CREATE INDEX idx_short_urls_expires ON short_urls (expires_at) WHERE is_active = TRUE;`,
      },
    ],
    deepDive: {
      architectureSummary:
        'To support 50,000+ reads/sec with sub-10ms latency, the URL shortener splits read and write workloads. Writes acquire unique keys in O(1) time from the Key Generation Service (KGS) and persist to sharded PostgreSQL. Reads hit a Redis caching layer holding hot URLs. Clicks asynchronously emit telemetry to Apache Kafka without stalling the HTTP 302 redirect path.',
      databaseSchema: `TABLE short_urls (
  short_code VARCHAR(7) PRIMARY KEY,
  original_url TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
INDEX ON short_urls (expires_at);`,
      apiEndpoints: [
        {
          method: 'POST',
          path: '/api/v1/shorten',
          desc: 'Creates a short URL from an original long URL',
          payload: '{\n  "originalUrl": "https://example.com/deep/page",\n  "customAlias": "my-promo",\n  "ttlSeconds": 2592000\n}',
        },
        {
          method: 'GET',
          path: '/s/:shortCode',
          desc: 'Redirects client to original destination via HTTP 302',
        },
        {
          method: 'GET',
          path: '/api/v1/analytics/:shortCode',
          desc: 'Returns aggregated click counts, geographic breakdown, and referrer logs',
        },
      ],
      bottlenecksAndTradeoffs: [
        '301 vs 302 Redirect Tradeoff: HTTP 301 is permanently cached by browser, reducing server load to zero for repeat clicks, but completely blinds server analytics. HTTP 302 forces client to query server on each click, enabling 100% accurate analytics tracking at the expense of server query load.',
        'KGS Single-Point-of-Failure: KGS runs two master-standby replicas coordinated via ZooKeeper. If active KGS dies, standby takes over instantly. Token blocks are dispensed in chunks of 10,000 to servers; if an app server crashes, unused tokens are abandoned without collision risk.',
        'Cache Stampede on Viral Links: If a celebrity tweet contains a short link, its cache expiration could trigger a thundering herd on Postgres. Solved by Probabilistic Early Expiration (XFetch algorithm) in Redis.',
      ],
    },
  },
  {
    id: 'distributed-cache',
    name: 'Distributed In-Memory Cache (Redis Cluster)',
    category: 'Distributed Core',
    difficulty: 'Advanced',
    tagline: 'High-throughput, sub-millisecond in-memory key-value cache featuring Consistent Hashing with 16,384 hash slots, Master-Replica failover, and LRU eviction.',
    throughput: '1,000,000 operations/sec across 10-node cluster',
    latency: 'p99 Read < 1ms · p99 Write < 1.5ms',
    storageScale: '500 GB RAM working set · Terabytes of disk persistence (RDB/AOF)',
    overview:
      'A distributed in-memory key-value cache designed to absorb extreme database read pressure. Partitions key space across 16,384 hash slots using CRC16 hashing. Features asynchronous replication to in-memory replicas, automated Sentinel failover via Raft consensus, and configurable LRU/LFU memory eviction policies.',
    functionalReqs: [
      'Store and retrieve arbitrary key-value byte arrays with O(1) average time complexity.',
      'Support atomic operations: GET, SET, SETNX, INCR, DECR, LPUSH, RPOP, and Lua script execution.',
      'Configurable Key TTL with proactive and reactive expiration mechanisms.',
      'Automated cluster sharding across arbitrary number of master nodes.',
      'Seamless failover: Promote replica to master if master node stops heartbeating.',
    ],
    nonFunctionalReqs: [
      'Ultra-low latency: Sub-millisecond response time for 99% of requests.',
      'Linear horizontal scalability: Adding nodes increases total cluster memory and IOPS proportionally.',
      'High partition tolerance: Cluster continues serving available slots during partial network splits.',
    ],
    calculations: [
      {
        metric: 'Single-Node Throughput',
        formula: 'Single-threaded event loop (epoll / kqueue) = ~100k ops/sec per physical core',
        result: '100,000 IOPS per single-threaded node',
      },
      {
        metric: 'Cluster IOPS (10 Masters)',
        formula: '10 master nodes * 100k IOPS = 1,000,000 ops/sec',
        result: '1,000,000 IOPS cluster-wide',
      },
      {
        metric: 'CRC16 Hash Slot Math',
        formula: 'HASH_SLOT = CRC16(key) mod 16384',
        result: '16,384 slots evenly distributed across masters',
      },
      {
        metric: 'Memory Overhead',
        formula: '50M keys * (key: 32B + val: 512B + dictEntry: 32B + robj: 16B) ≈ 30 GB',
        result: '30 GB RAM per node (60% headroom buffer)',
      },
    ],
    services: [
      {
        id: 'client',
        name: 'Application Client Driver',
        role: 'Smart Redis client that maintains cluster slot cache',
        type: 'client',
        x: 10,
        y: 50,
        icon: 'Cpu',
        techStack: 'Jedis / go-redis / ioredis',
        details: 'Caches cluster slot-to-node topology. Routes key directly to correct master',
      },
      {
        id: 'master-1',
        name: 'Redis Master Node 1',
        role: 'Owns Slots 0 - 5460. Handles reads and writes',
        type: 'cache',
        x: 45,
        y: 25,
        icon: 'Zap',
        techStack: 'Redis 7.2 (epoll event loop)',
        details: 'In-memory Dict + SkipList. Asynchronously replicates to Replica 1',
      },
      {
        id: 'master-2',
        name: 'Redis Master Node 2',
        role: 'Owns Slots 5461 - 10922. Handles reads and writes',
        type: 'cache',
        x: 45,
        y: 50,
        icon: 'Zap',
        techStack: 'Redis 7.2 (epoll event loop)',
        details: 'In-memory Dict + SkipList. Asynchronously replicates to Replica 2',
      },
      {
        id: 'master-3',
        name: 'Redis Master Node 3',
        role: 'Owns Slots 10923 - 16383. Handles reads and writes',
        type: 'cache',
        x: 45,
        y: 75,
        icon: 'Zap',
        techStack: 'Redis 7.2 (epoll event loop)',
        details: 'In-memory Dict + SkipList. Asynchronously replicates to Replica 3',
      },
      {
        id: 'replica-1',
        name: 'Redis Replica Node 1',
        role: 'Hot standby replica for Master 1',
        type: 'cache',
        x: 75,
        y: 25,
        icon: 'Copy',
        techStack: 'Redis 7.2',
        details: 'Receives replication stream offset. Promoted automatically upon master failure',
      },
      {
        id: 'replica-2',
        name: 'Redis Replica Node 2',
        role: 'Hot standby replica for Master 2',
        type: 'cache',
        x: 75,
        y: 50,
        icon: 'Copy',
        techStack: 'Redis 7.2',
        details: 'Receives replication stream offset. Promoted automatically upon master failure',
      },
      {
        id: 'replica-3',
        name: 'Redis Replica Node 3',
        role: 'Hot standby replica for Master 3',
        type: 'cache',
        x: 75,
        y: 75,
        icon: 'Copy',
        techStack: 'Redis 7.2',
        details: 'Receives replication stream offset. Promoted automatically upon master failure',
      },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'master-2', label: 'CRC16(key) mod 16384 = Slot 7800', protocol: 'TCP' },
      { id: 'c2', from: 'master-1', to: 'replica-1', label: 'Async Replication Stream', protocol: 'TCP' },
      { id: 'c3', from: 'master-2', to: 'replica-2', label: 'Async Replication Stream', protocol: 'TCP' },
      { id: 'c4', from: 'master-3', to: 'replica-3', label: 'Async Replication Stream', protocol: 'TCP' },
      { id: 'c5', from: 'master-1', to: 'master-2', label: 'Gossip Cluster Bus (Port 16379)', protocol: 'TCP' },
      { id: 'c6', from: 'master-2', to: 'master-3', label: 'Gossip Cluster Bus (Port 16379)', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Hash Slot Calculation by Client Driver',
        description: 'Client prepares operation SET user:98234 "active". Computes CRC16("user:98234") % 16384 = 8412.',
        fromNode: 'client',
        toNode: 'master-2',
        protocol: 'TCP',
        payload: { key: 'user:98234', value: 'active', calculatedSlot: 8412, targetNode: 'master-2' },
        codeRef: {
          file: 'cluster_router.ts',
          lineHighlight: '18-28',
          funcName: 'getSlotAndRoute',
          codeExplanation: 'Evaluates CRC16 checksum on key; inspects internal slot table to determine Master 2 is the owner.',
        },
        stateChange: 'Client establishes TCP socket connection directly to Master 2, avoiding extra proxy hops.',
      },
      {
        step: 2,
        title: 'Step 2: Master Node In-Memory Execution',
        description: 'Master 2 executes SET command inside its single-threaded event loop in ~20 microseconds.',
        fromNode: 'master-2',
        toNode: 'master-2',
        protocol: 'TCP',
        payload: { command: 'SET', slot: 8412, memoryUsageBytes: 64 },
        codeRef: {
          file: 'lru_cache.rs',
          lineHighlight: '35-50',
          funcName: 'insert',
          codeExplanation: 'Inserts node into hash table dict; updates LRU doubly linked list head pointer.',
        },
        stateChange: 'Key is committed into RAM. Master prepares replication buffer.',
      },
      {
        step: 3,
        title: 'Step 3: Asynchronous Replication to Replica',
        description: 'Master 2 streams the write command offset to Replica 2 over the replication backlog buffer.',
        fromNode: 'master-2',
        toNode: 'replica-2',
        protocol: 'TCP',
        payload: { replicationOffset: 1048590, commandBytes: '*3\\r\\n$3\\r\\nSET\\r\\n$10\\r\\nuser:98234\\r\\n$6\\r\\nactive\\r\\n' },
        codeRef: {
          file: 'replication.go',
          lineHighlight: '40-55',
          funcName: 'StreamReplicationChunk',
          codeExplanation: 'Appends command bytes to replication buffer and sends via non-blocking TCP socket to replica.',
        },
        stateChange: 'Replica 2 applies write to its local dictionary; replication lag is under 1 millisecond.',
      },
      {
        step: 4,
        title: 'Step 4: Acknowledgment Returned to Client',
        description: 'Master 2 returns "+OK\\r\\n" response to client. Entire round trip completes in 0.8ms.',
        fromNode: 'master-2',
        toNode: 'client',
        protocol: 'TCP',
        payload: { status: 'OK', latencyMs: 0.8 },
        codeRef: {
          file: 'cluster_router.ts',
          lineHighlight: '32-38',
          funcName: 'handleResponse',
          codeExplanation: 'Client deserializes RESP protocol string "+OK" and returns promise resolution to caller.',
        },
        stateChange: 'Client operation succeeds with zero blocking.',
      },
    ],
    codeFiles: [
      {
        name: 'lru_cache.rs',
        language: 'rust',
        role: 'High-Performance O(1) LRU Memory Eviction Engine',
        code: `use std::collections::HashMap;
use std::ptr::NonNull;

struct Node<K, V> {
    key: K,
    val: V,
    prev: Option<NonNull<Node<K, V>>>,
    next: Option<NonNull<Node<K, V>>>,
}

pub struct LRUCache<K: Eq + std::hash::Hash + Clone, V> {
    capacity: usize,
    map: HashMap<K, NonNull<Node<K, V>>>,
    head: Option<NonNull<Node<K, V>>>,
    tail: Option<NonNull<Node<K, V>>>,
}

impl<K: Eq + std::hash::Hash + Clone, V> LRUCache<K, V> {
    pub fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "Capacity must be greater than zero");
        LRUCache {
            capacity,
            map: HashMap::with_capacity(capacity),
            head: None,
            tail: None,
        }
    }

    pub fn get(&mut self, key: &K) -> Option<&V> {
        if let Some(&node_ptr) = self.map.get(key) {
            self.detach_and_move_to_head(node_ptr);
            unsafe { Some(&(*node_ptr.as_ptr()).val) }
        } else {
            None
        }
    }

    pub fn put(&mut self, key: K, val: V) {
        if let Some(&node_ptr) = self.map.get(&key) {
            unsafe {
                (*node_ptr.as_ptr()).val = val;
            }
            self.detach_and_move_to_head(node_ptr);
            return;
        }

        if self.map.len() >= self.capacity {
            self.evict_tail();
        }

        let new_node = Box::into_raw(Box::new(Node {
            key: key.clone(),
            val,
            prev: None,
            next: self.head,
        }));
        let node_ptr = NonNull::new(new_node).unwrap();

        if let Some(mut old_head) = self.head {
            unsafe { old_head.as_mut().prev = Some(node_ptr); }
        } else {
            self.tail = Some(node_ptr);
        }
        self.head = Some(node_ptr);
        self.map.insert(key, node_ptr);
    }

    fn detach_and_move_to_head(&mut self, mut node_ptr: NonNull<Node<K, V>>) {
        if self.head == Some(node_ptr) { return; }

        unsafe {
            let node = node_ptr.as_mut();
            if let Some(mut prev) = node.prev { prev.as_mut().next = node.next; }
            if let Some(mut next) = node.next { next.as_mut().prev = node.prev; }
            if self.tail == Some(node_ptr) { self.tail = node.prev; }

            node.prev = None;
            node.next = self.head;
            if let Some(mut old_head) = self.head { old_head.as_mut().prev = Some(node_ptr); }
            self.head = Some(node_ptr);
        }
    }

    fn evict_tail(&mut self) {
        if let Some(tail_ptr) = self.tail {
            unsafe {
                let tail = Box::from_raw(tail_ptr.as_ptr());
                self.map.remove(&tail.key);
                self.tail = tail.prev;
                if let Some(mut new_tail) = self.tail { new_tail.as_mut().next = None; }
                else { self.head = None; }
            }
        }
    }
}`,
      },
      {
        name: 'cluster_router.ts',
        language: 'typescript',
        role: 'Smart Redis Client Slot Calculator & Router',
        code: `// CRC16 Checksum Implementation for Redis Slot Mapping
const CRC16_TAB: number[] = [
  0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
  0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
]

export function crc16(buf: Buffer): number {
  let crc = 0
  for (let i = 0; i < buf.length; i++) {
    crc = ((crc << 4) & 0xffff) ^ CRC16_TAB[((crc >> 12) ^ (buf[i] >> 4)) & 0x0f]
    crc = ((crc << 4) & 0xffff) ^ CRC16_TAB[((crc >> 12) ^ (buf[i] & 0x0f)) & 0x0f]
  }
  return crc & 0xffff
}

export function getSlot(key: string): number {
  // Support Redis Hash Tags: {user:123}:profile -> hashes only "user:123"
  const start = key.indexOf('{')
  const end = key.indexOf('}')
  const hashKey = start !== -1 && end > start + 1 ? key.substring(start + 1, end) : key
  return crc16(Buffer.from(hashKey)) % 16384
}

export class RedisClusterClient {
  private slotsToNode: Map<number, string> = new Map()

  constructor(private clusterNodes: string[]) {}

  public async execute(cmd: string, key: string, ...args: string[]): Promise<string> {
    const slot = getSlot(key)
    const targetNode = this.slotsToNode.get(slot) || this.clusterNodes[0]

    try {
      return await this.sendTCP(targetNode, cmd, key, ...args)
    } catch (err: any) {
      if (err.message.startsWith('MOVED')) {
        // Handle MOVED redirection: "MOVED 8412 10.0.1.15:6379"
        const [, newSlot, newAddress] = err.message.split(' ')
        this.slotsToNode.set(Number(newSlot), newAddress)
        return await this.sendTCP(newAddress, cmd, key, ...args)
      }
      throw err
    }
  }

  private async sendTCP(node: string, ...payload: string[]): Promise<string> {
    // Simulated low-level TCP socket send
    return '+OK'
  }
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Redis Cluster partitions memory using 16,384 virtual hash slots. Keys are hashed via CRC16. Nodes exchange health heartbeats using an internal Gossip protocol over port 16379. If a master becomes unreachable for node_timeout milliseconds, majority quorum of surviving masters votes to promote its replica, guaranteeing continuous cluster operation without manual intervention.',
      databaseSchema: 'In-Memory Key-Value store with binary safe strings, hash maps, sets, and sorted sets.',
      apiEndpoints: [
        { method: 'GET', path: '/api/v1/cache/:key', desc: 'Fetches cached value by key' },
        { method: 'POST', path: '/api/v1/cache', desc: 'Sets key with optional TTL and NX flags' },
        { method: 'DELETE', path: '/api/v1/cache/:key', desc: 'Evicts key immediately' },
      ],
      bottlenecksAndTradeoffs: [
        'Multi-Key Operations Across Different Slots: Commands like MGET or transactions across multiple keys fail if keys hash to different slots. Solved via Redis Hash Tags ({user_12}:profile and {user_12}:orders both hash to the same slot).',
        'Asynchronous Replication Data Loss: Redis replicates asynchronously to achieve sub-millisecond write latency. If master crashes before replication packet reaches replica, the write is lost. If absolute zero data loss is required, WAIT command can enforce synchronous replication acknowledgments at the expense of latency.',
      ],
    },
  },
  {
    id: 'kafka-broker',
    name: 'Distributed Message Queue (Apache Kafka)',
    category: 'Distributed Core',
    difficulty: 'Expert',
    tagline: 'High-throughput append-only distributed commit log featuring zero-copy OS transfers, consumer group rebalancing, and exactly-once semantics.',
    throughput: '10,000,000 messages/sec · Multi-Gigabyte/sec wire bandwidth',
    latency: 'p99 Ingestion < 5ms · End-to-end delivery < 20ms',
    storageScale: 'Petabytes retained on NVMe drives across tiered storage',
    overview:
      'A horizontally scalable distributed event streaming platform built around partitioned, append-only disk commit logs. Utilizes sequential disk I/O, OS Page Cache warming, and Linux sendfile(2) zero-copy system calls to achieve network wire-speed performance while supporting millions of concurrent consumer reads.',
    functionalReqs: [
      'Publish and subscribe to streams of record events with high throughput.',
      'Partitioned topics allowing parallelized consumption across consumer groups.',
      'Configurable retention policies (time-based e.g., 7 days, or size-based e.g., 1 TB).',
      'Fault tolerance through leader-follower partition replication across brokers.',
      'Exactly-once processing semantics (EOS) via idempotent producers and transactional coordinators.',
    ],
    nonFunctionalReqs: [
      'Guaranteed message ordering within an individual partition.',
      'Zero message loss under N-1 broker failures (configurable min.insync.replicas).',
      'Predictable sub-10ms publish latency regardless of retained data volume.',
    ],
    calculations: [
      {
        metric: 'Cluster Ingestion Throughput',
        formula: '1M msgs/sec * 1 KB avg message size = 1 GB/sec raw ingestion bandwidth',
        result: '1 GB/sec network and disk write rate',
      },
      {
        metric: 'Zero-Copy OS Transfer Advantage',
        formula: 'sendfile(2) eliminates 2 CPU context switches and 2 memory copies per read',
        result: 'Transfers directly from Page Cache to NIC Buffer via DMA',
      },
      {
        metric: 'Daily Storage (3x Replication)',
        formula: '1 GB/sec * 86,400 sec/day = 86.4 TB raw * 3 replicas = 259.2 TB/day',
        result: '~260 TB disk storage required per day',
      },
    ],
    services: [
      {
        id: 'producer',
        name: 'Event Producers',
        role: 'Ingestion services publishing events with partition keys',
        type: 'client',
        x: 10,
        y: 50,
        icon: 'UploadCloud',
        techStack: 'Java / Go / Rust Kafka SDK',
        details: 'Batches messages into record accumulators. Hashes partition key',
      },
      {
        id: 'broker-1',
        name: 'Kafka Broker 1 (Leader P0)',
        role: 'Owns Partition 0 Leader. Writes to local commit log',
        type: 'queue',
        x: 45,
        y: 25,
        icon: 'Layers',
        techStack: 'Apache Kafka / KRaft Controller',
        details: 'Sequential append-only log file on NVMe. In-Sync Replicas (ISR) sync',
      },
      {
        id: 'broker-2',
        name: 'Kafka Broker 2 (Leader P1)',
        role: 'Owns Partition 1 Leader. Writes to local commit log',
        type: 'queue',
        x: 45,
        y: 50,
        icon: 'Layers',
        techStack: 'Apache Kafka / KRaft Controller',
        details: 'Sequential append-only log file on NVMe. In-Sync Replicas (ISR) sync',
      },
      {
        id: 'broker-3',
        name: 'Kafka Broker 3 (Leader P2)',
        role: 'Owns Partition 2 Leader. Writes to local commit log',
        type: 'queue',
        x: 45,
        y: 75,
        icon: 'Layers',
        techStack: 'Apache Kafka / KRaft Controller',
        details: 'Sequential append-only log file on NVMe. In-Sync Replicas (ISR) sync',
      },
      {
        id: 'consumer-a',
        name: 'Consumer Instance 1',
        role: 'Member of consumer group "analytics". Assigned Partition 0',
        type: 'worker',
        x: 82,
        y: 25,
        icon: 'Server',
        techStack: 'Flink / Spark / Go Worker',
        details: 'Pulls batches via zero-copy. Manages offset commits to __consumer_offsets',
      },
      {
        id: 'consumer-b',
        name: 'Consumer Instance 2',
        role: 'Member of consumer group "analytics". Assigned Partition 1 & 2',
        type: 'worker',
        x: 82,
        y: 65,
        icon: 'Server',
        techStack: 'Flink / Spark / Go Worker',
        details: 'Pulls batches via zero-copy. Manages offset commits to __consumer_offsets',
      },
    ],
    connections: [
      { id: 'c1', from: 'producer', to: 'broker-1', label: 'Batch Produce (acks=all)', protocol: 'TCP' },
      { id: 'c2', from: 'producer', to: 'broker-2', label: 'Batch Produce (acks=all)', protocol: 'TCP' },
      { id: 'c3', from: 'broker-1', to: 'broker-2', label: 'ISR Follower Sync Fetch', protocol: 'TCP' },
      { id: 'c4', from: 'consumer-a', to: 'broker-1', label: 'Fetch Request (Offset: 45290)', protocol: 'TCP' },
      { id: 'c5', from: 'consumer-b', to: 'broker-2', label: 'Fetch Request (Offset: 89100)', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Producer Batch Accumulation & Partition Hashing',
        description: 'Producer application writes event. Producer SDK hashes key "order_789" to Partition 0 and batches records.',
        fromNode: 'producer',
        toNode: 'broker-1',
        protocol: 'TCP',
        payload: { topic: 'orders', partition: 0, batchSize: 50, compressedBytes: 16384 },
        codeRef: {
          file: 'kafka_producer.rs',
          lineHighlight: '15-28',
          funcName: 'produce_batch',
          codeExplanation: 'Accumulates records up to linger.ms or batch.size; sends binary batch with CRC32 verification.',
        },
        stateChange: 'TCP batch sent to Broker 1 partition leader.',
      },
      {
        step: 2,
        title: 'Step 2: Broker Appends to Commit Log & OS PageCache',
        description: 'Broker 1 appends record batch sequentially to /data/orders-0/0000000000.log. OS PageCache absorbs write.',
        fromNode: 'broker-1',
        toNode: 'broker-1',
        protocol: 'TCP',
        payload: { file: '0000000000.log', physicalOffset: 1048576, assignedLogicalOffset: 45291 },
        codeRef: {
          file: 'commit_log.go',
          lineHighlight: '22-38',
          funcName: 'AppendRecordBatch',
          codeExplanation: 'Writes batch sequentially to end of segment file; adds sparse index entry every 4KB.',
        },
        stateChange: 'Record appended; Broker notifies In-Sync Replicas (ISR).',
      },
      {
        step: 3,
        title: 'Step 3: Zero-Copy Network Delivery to Consumer',
        description: 'Consumer requests next batch. Linux kernel executes sendfile(2), transmitting data directly from Page Cache to NIC.',
        fromNode: 'broker-1',
        toNode: 'consumer-a',
        protocol: 'TCP',
        payload: { command: 'FETCH', startingOffset: 45290, bytesTransferred: 32768, zeroCopy: true },
        codeRef: {
          file: 'commit_log.go',
          lineHighlight: '45-56',
          funcName: 'TransferToSocketZeroCopy',
          codeExplanation: 'Invokes Linux syscall sendfile(socketFd, fileFd, offset, count); avoids user-space copy.',
        },
        stateChange: 'Consumer receives batch at wire speed; processes records and commits offset.',
      },
    ],
    codeFiles: [
      {
        name: 'commit_log.go',
        language: 'go',
        role: 'Low-Level Partition Commit Log with Sequential Disk I/O',
        code: `package log

import (
	"encoding/binary"
	"fmt"
	"os"
	"sync"
	"syscall"
)

type PartitionLog struct {
	mu           sync.RWMutex
	dataFile     *os.File
	indexFile    *os.File
	baseOffset   int64
	nextOffset   int64
	currentBytes int64
}

func OpenPartition(dir string, baseOffset int64) (*PartitionLog, error) {
	dataPath := fmt.Sprintf("%s/%020d.log", dir, baseOffset)
	indexPath := fmt.Sprintf("%s/%020d.index", dir, baseOffset)

	df, err := os.OpenFile(dataPath, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0644)
	if err != nil { return nil, err }

	inf, err := os.OpenFile(indexPath, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0644)
	if err != nil { return nil, err }

	info, _ := df.Stat()

	return &PartitionLog{
		dataFile:     df,
		indexFile:    inf,
		baseOffset:   baseOffset,
		nextOffset:   baseOffset,
		currentBytes: info.Size(),
	}, nil
}

// AppendBatch writes a binary record batch sequentially
func (p *PartitionLog) AppendBatch(payload []byte) (int64, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	offset := p.nextOffset
	batchLen := uint32(len(payload))

	// Write 8-byte offset + 4-byte length + payload
	hdr := make([]byte, 12)
	binary.BigEndian.PutUint64(hdr[0:8], uint64(offset))
	binary.BigEndian.PutUint32(hdr[8:12], batchLen)

	if _, err := p.dataFile.Write(hdr); err != nil { return 0, err }
	if _, err := p.dataFile.Write(payload); err != nil { return 0, err }

	// Write sparse index entry (every ~4096 bytes)
	idxEntry := make([]byte, 12)
	binary.BigEndian.PutUint64(idxEntry[0:8], uint64(offset-p.baseOffset))
	binary.BigEndian.PutUint32(idxEntry[8:12], uint32(p.currentBytes))
	_, _ = p.indexFile.Write(idxEntry)

	p.currentBytes += int64(12 + batchLen)
	p.nextOffset++
	return offset, nil
}

// TransferZeroCopy streams data directly from disk page cache to TCP socket
func (p *PartitionLog) TransferZeroCopy(socketFd int, startPos int64, count int64) (int, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	fileFd := int(p.dataFile.Fd())
	// Linux sendfile(2) system call
	return syscall.Sendfile(socketFd, fileFd, &startPos, int(count))
}`,
      },
      {
        name: 'kafka_producer.rs',
        language: 'rust',
        role: 'High-Throughput Partition Hashing & Batch Producer',
        code: `use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;

pub struct KafkaProducer {
    num_partitions: usize,
}

impl KafkaProducer {
    pub fn new(num_partitions: usize) -> Self {
        KafkaProducer { num_partitions }
    }

    pub fn compute_partition<K: Hash>(&self, key: &Option<K>) -> usize {
        match key {
            Some(k) => {
                let mut hasher = DefaultHasher::new();
                k.hash(&mut hasher);
                (hasher.finish() as usize) % self.num_partitions
            }
            None => {
                // Round-Robin fallback when key is absent
                0
            }
        }
    }
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Apache Kafka organizes topics into ordered, immutable log partitions replicated across a broker cluster. Writes only append sequentially to the end of segment files, yielding multi-hundred MB/sec disk write throughput. Consumers pull batches at their own pace, reading sequentially from the OS page cache via zero-copy sendfile(2). Offset state is stored in the internal __consumer_offsets topic.',
      databaseSchema: 'Log segment binary file layout: 8-byte Offset + 4-byte MessageSize + 4-byte CRC32 + 1-byte Magic + 1-byte Attributes + Key + Value.',
      apiEndpoints: [
        { method: 'POST', path: '/produce', desc: 'Binary protocol: ProduceRequest' },
        { method: 'GET', path: '/fetch', desc: 'Binary protocol: FetchRequest with starting offset' },
        { method: 'POST', path: '/offset_commit', desc: 'Binary protocol: OffsetCommitRequest' },
      ],
      bottlenecksAndTradeoffs: [
        'Partition Count vs File Descriptor Limits: Each partition corresponds to 2-3 open file descriptors per broker. Creating tens of thousands of partitions per broker exhausts OS file handles and increases rebalance latency during leader elections.',
        'Zero-Copy and TLS Encryption Tradeoff: Standard sendfile(2) bypasses user space entirely. If TLS encryption is enabled in application space, data must be copied into user memory to encrypt before writing to socket, negating the zero-copy advantage unless Kernel-Level TLS (kTLS) is used.',
      ],
    },
  },
  {
    id: 'distributed-lock',
    name: 'Distributed Lock Manager (Redlock & ZooKeeper)',
    category: 'Distributed Core',
    difficulty: 'Advanced',
    tagline: 'Fault-tolerant distributed mutual exclusion using the Redlock algorithm, ZooKeeper ephemeral sequential nodes, and fencing tokens to prevent split-brain race conditions.',
    throughput: '50,000 lock acquisitions/sec',
    latency: 'p99 Lock Acquisition < 8ms',
    storageScale: 'Lightweight in-memory locks with millisecond leases',
    overview:
      'A resilient distributed locking system that coordinates mutual exclusion across microservices. Addresses asynchronous network pauses, GC pauses, and node crashes using the Redlock multi-instance algorithm paired with monotonically increasing fencing tokens to prevent out-of-order writes to storage.',
    functionalReqs: [
      'Mutual exclusion: Only one client can hold the lock for a given resource at any instant.',
      'Deadlock prevention: Locks automatically expire via TTL leases if client crashes.',
      'Fault tolerance: Lock acquisition succeeds as long as a majority of lock nodes are alive.',
      'Fencing token generation: Dispense strictly increasing monotonic integer tokens with every lock.',
    ],
    nonFunctionalReqs: [
      'Safety: Locks must never be granted to two competing clients simultaneously.',
      'Liveness: Release of lock must be immediately visible to waiting clients.',
    ],
    calculations: [
      {
        metric: 'Redlock Quorum Condition',
        formula: 'Quorum = floor(N / 2) + 1. For N = 5 nodes, Quorum = 3 nodes',
        result: 'Must acquire on 3 of 5 independent nodes',
      },
      {
        metric: 'Validity Time Formula',
        formula: 'ValidityTime = TTL - (TimeElapsed + ClockDriftMargin)',
        result: 'Lock valid only if ValidityTime > 0',
      },
    ],
    services: [
      { id: 'client-1', name: 'Worker Client 1', role: 'Competes for lock', type: 'client', x: 10, y: 35, icon: 'Cpu', techStack: 'Go / Python', details: 'Attempts lock acquisition' },
      { id: 'client-2', name: 'Worker Client 2', role: 'Competes for lock', type: 'client', x: 10, y: 65, icon: 'Cpu', techStack: 'Go / Python', details: 'Attempts lock acquisition' },
      { id: 'redis-1', name: 'Redis Node 1', role: 'Independent lock instance', type: 'cache', x: 50, y: 15, icon: 'Lock', techStack: 'Redis Standalone', details: 'Instance 1 of 5' },
      { id: 'redis-2', name: 'Redis Node 2', role: 'Independent lock instance', type: 'cache', x: 50, y: 32, icon: 'Lock', techStack: 'Redis Standalone', details: 'Instance 2 of 5' },
      { id: 'redis-3', name: 'Redis Node 3', role: 'Independent lock instance', type: 'cache', x: 50, y: 50, icon: 'Lock', techStack: 'Redis Standalone', details: 'Instance 3 of 5' },
      { id: 'redis-4', name: 'Redis Node 4', role: 'Independent lock instance', type: 'cache', x: 50, y: 68, icon: 'Lock', techStack: 'Redis Standalone', details: 'Instance 4 of 5' },
      { id: 'redis-5', name: 'Redis Node 5', role: 'Independent lock instance', type: 'cache', x: 50, y: 85, icon: 'Lock', techStack: 'Redis Standalone', details: 'Instance 5 of 5' },
      { id: 'storage', name: 'Shared Storage Service', role: 'Protected shared resource', type: 'database', x: 85, y: 50, icon: 'Database', techStack: 'Postgres / S3', details: 'Validates fencing token' },
    ],
    connections: [
      { id: 'c1', from: 'client-1', to: 'redis-1', label: 'SETNX resource UUID PX 10000', protocol: 'Redis' },
      { id: 'c2', from: 'client-1', to: 'redis-2', label: 'SETNX resource UUID PX 10000', protocol: 'Redis' },
      { id: 'c3', from: 'client-1', to: 'redis-3', label: 'SETNX resource UUID PX 10000', protocol: 'Redis' },
      { id: 'c4', from: 'client-1', to: 'storage', label: 'Write with Fencing Token #104', protocol: 'SQL' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Client 1 Initiates Quorum Lock Acquisition',
        description: 'Client 1 generates random UUID and requests lock on 5 independent Redis instances with a 10s TTL.',
        fromNode: 'client-1',
        toNode: 'redis-1',
        protocol: 'Redis',
        payload: { command: 'SET', key: 'lock:order_402', value: 'uuid_abc_123', px: 10000, nx: true },
        codeRef: { file: 'redlock.py', lineHighlight: '15-28', funcName: 'acquire_lock', codeExplanation: 'Fires concurrent SET NX PX commands across all 5 independent Redis instances.' },
        stateChange: 'Node 1 grants lock.',
      },
      {
        step: 2,
        title: 'Step 2: Quorum Achieved & Token Issued',
        description: 'Client 1 secures locks on 4 of 5 nodes within 12ms. Quorum satisfied (>= 3). Fencing token #104 generated.',
        fromNode: 'redis-3',
        toNode: 'client-1',
        protocol: 'Redis',
        payload: { successCount: 4, quorum: 3, validityRemainingMs: 9988, fencingToken: 104 },
        codeRef: { file: 'redlock.py', lineHighlight: '32-45', funcName: 'validate_quorum', codeExplanation: 'Calculates elapsed time; verifies remaining validity is strictly positive.' },
        stateChange: 'Client 1 holds valid distributed lock.',
      },
      {
        step: 3,
        title: 'Step 3: Fenced Mutation to Storage',
        description: 'Client 1 executes update on shared storage passing fencing token #104. Storage rejects any token < 104.',
        fromNode: 'client-1',
        toNode: 'storage',
        protocol: 'SQL',
        payload: { query: 'UPDATE inventory SET qty = qty - 1 WHERE id = 402 AND last_token < 104' },
        codeRef: { file: 'redlock.py', lineHighlight: '50-62', funcName: 'execute_guarded_write', codeExplanation: 'Applies optimistic fencing condition to eliminate GC-pause race conditions.' },
        stateChange: 'Storage transaction succeeds safely.',
      },
    ],
    codeFiles: [
      {
        name: 'redlock.py',
        language: 'python',
        role: 'Redlock Multi-Instance Distributed Locking Implementation',
        code: `import time
import uuid
import redis

class Redlock:
    def __init__(self, node_urls, quorum=None):
        self.nodes = [redis.from_url(url) for url in node_urls]
        self.quorum = quorum or (len(self.nodes) // 2 + 1)
        self.clock_drift_factor = 0.01

    def acquire(self, resource: str, ttl_ms: int):
        val = str(uuid.uuid4())
        start_time = time.time() * 1000
        n_acquired = 0

        for node in self.nodes:
            try:
                # Atomically set key if not exists with millisecond TTL
                if node.set(resource, val, nx=True, px=ttl_ms):
                    n_acquired += 1
            except redis.RedisError:
                pass

        elapsed_ms = (time.time() * 1000) - start_time
        drift = (ttl_ms * self.clock_drift_factor) + 2
        validity_time = ttl_ms - elapsed_ms - drift

        if n_acquired >= self.quorum and validity_time > 0:
            return {"resource": resource, "value": val, "validity": validity_time}
        else:
            # Failed to reach quorum in time: release all nodes
            self.release(resource, val)
            return None

    def release(self, resource: str, val: str):
        # Lua script ensures we only delete the key if value matches our UUID
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        for node in self.nodes:
            try:
                node.eval(lua_script, 1, resource, val)
            except redis.RedisError:
                pass`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Redlock acquires mutual exclusion without single-point-of-failure by reaching quorum consensus across N independent Redis masters. To protect against Martin Kleppmann\'s classic critique (GC pauses causing lease expiration mid-write), every acquired lock receives a monotonic fencing token from ZooKeeper/etcd or an atomic database sequence.',
      databaseSchema: 'Lock keys stored in Redis RAM: Key = resource_id, Value = UUID + Fencing Token.',
      apiEndpoints: [
        { method: 'POST', path: '/api/v1/locks/acquire', desc: 'Acquires distributed lease' },
        { method: 'POST', path: '/api/v1/locks/release', desc: 'Releases lease via atomic Lua script' },
      ],
      bottlenecksAndTradeoffs: [
        'Martin Kleppmann vs Salvatore Sanfilippo Debate: Without fencing tokens, a client that experiences an OS pause or Stop-The-World garbage collection will wake up believing it still owns the lock after TTL expired, writing stale data. Fencing tokens solve this invariant violation completely.',
      ],
    },
  },
  {
    id: 'snowflake-id',
    name: 'Distributed Unique ID Generator (Twitter Snowflake)',
    category: 'Distributed Core',
    difficulty: 'Intermediate',
    tagline: 'High-performance 64-bit globally unique, roughly time-sortable ID generator producing 4,096 unique IDs per millisecond per worker node.',
    throughput: '4,096,000 IDs/sec across 1,024 worker nodes',
    latency: 'Sub-microsecond (< 1µs) generation time per ID',
    storageScale: '64-bit integer (8 bytes per ID)',
    overview:
      'A decentralized ID generation system that generates unique 64-bit integer IDs without network coordination between worker nodes. Composed of a timestamp component, datacenter ID, machine ID, and sequence counter, ensuring IDs are naturally time-ordered and b-tree index friendly.',
    functionalReqs: [
      'Generate 64-bit unique IDs across 1,024 distributed machines without coordination.',
      'IDs must be roughly chronological / time-sortable.',
      'Support at least 4,000 IDs per millisecond per physical machine.',
      'Handle system clock backward rollbacks safely.',
    ],
    nonFunctionalReqs: [
      'High availability: ID generator must never block or wait on global locks.',
      'Zero collision guarantee.',
    ],
    calculations: [
      {
        metric: 'Bit Allocation (64 bits)',
        formula: '1 sign bit (0) + 41 timestamp bits + 5 datacenter bits + 5 worker bits + 12 sequence bits',
        result: '64 bits total',
      },
      {
        metric: 'Timestamp Lifespan (41 bits)',
        formula: '2^41 milliseconds = 2,199,023,255,552 ms ≈ 69.7 years from custom epoch',
        result: '~70 years lifespan',
      },
      {
        metric: 'Max Throughput per Worker',
        formula: '2^12 = 4,096 sequence numbers per millisecond',
        result: '4,096,000 IDs/sec per node',
      },
    ],
    services: [
      { id: 'client', name: 'Application Microservice', role: 'Calls Snowflake ID generator', type: 'client', x: 15, y: 50, icon: 'Cpu', techStack: 'Any Service', details: 'Requests batch of IDs' },
      { id: 'worker-1', name: 'Snowflake Worker 1', role: 'Datacenter 1, Machine 1', type: 'service', x: 50, y: 30, icon: 'Hash', techStack: 'Go / Rust', details: 'Maintains local sequence counter' },
      { id: 'worker-2', name: 'Snowflake Worker 2', role: 'Datacenter 1, Machine 2', type: 'service', x: 50, y: 70, icon: 'Hash', techStack: 'Go / Rust', details: 'Maintains local sequence counter' },
      { id: 'zk', name: 'ZooKeeper Coordination', role: 'Assigns unique Machine IDs at boot', type: 'database', x: 85, y: 50, icon: 'Server', techStack: 'Apache ZooKeeper', details: 'Guarantees no duplicate worker IDs' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'worker-1', label: 'NextID()', protocol: 'gRPC' },
      { id: 'c2', from: 'worker-1', to: 'zk', label: 'Acquire Worker ID 1', protocol: 'TCP' },
      { id: 'c3', from: 'worker-2', to: 'zk', label: 'Acquire Worker ID 2', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Application Requests New Unique ID',
        description: 'Microservice invokes NextID() on local Snowflake generator.',
        fromNode: 'client',
        toNode: 'worker-1',
        protocol: 'gRPC',
        payload: { method: 'NextID' },
        codeRef: { file: 'snowflake.go', lineHighlight: '25-38', funcName: 'NextID', codeExplanation: 'Fetches current system time in milliseconds; compares with last recorded timestamp.' },
        stateChange: 'Worker prepares bitwise concatenation.',
      },
      {
        step: 2,
        title: 'Step 2: Bitwise Composition & Sequence Increment',
        description: 'Worker shifts timestamp by 22 bits, worker ID by 12 bits, and appends incremented sequence.',
        fromNode: 'worker-1',
        toNode: 'worker-1',
        protocol: 'TCP',
        payload: { timestamp: 1718029301123, datacenterId: 1, workerId: 4, sequence: 0, generatedId: '7213894723984729344' },
        codeRef: { file: 'snowflake.go', lineHighlight: '42-55', funcName: 'NextID', codeExplanation: 'id = (time << 22) | (dc << 17) | (worker << 12) | sequence.' },
        stateChange: '64-bit integer computed in 40 nanoseconds without network latency.',
      },
      {
        step: 3,
        title: 'Step 3: Unique ID Returned to Application',
        description: 'Returned 64-bit ID is inserted into MySQL primary key column with perfect B+ tree index ordering.',
        fromNode: 'worker-1',
        toNode: 'client',
        protocol: 'gRPC',
        payload: { id: '7213894723984729344' },
        codeRef: { file: 'snowflake.go', lineHighlight: '58-62', funcName: 'NextID', codeExplanation: 'Returns int64 ID.' },
        stateChange: 'Application continues execution.',
      },
    ],
    codeFiles: [
      {
        name: 'snowflake.go',
        language: 'go',
        role: 'Twitter Snowflake 64-bit Generator Implementation',
        code: `package snowflake

import (
	"errors"
	"sync"
	"time"
)

const (
	epoch             = int64(1704067200000) // 2024-01-01 00:00:00 UTC
	workerIDBits      = uint(5)
	datacenterIDBits  = uint(5)
	sequenceBits      = uint(12)

	maxWorkerID       = int64(-1) ^ (int64(-1) << workerIDBits)
	maxDatacenterID   = int64(-1) ^ (int64(-1) << datacenterIDBits)
	maxSequence       = int64(-1) ^ (int64(-1) << sequenceBits)

	workerIDShift     = sequenceBits
	datacenterIDShift = sequenceBits + workerIDBits
	timestampShift    = sequenceBits + workerIDBits + datacenterIDBits
)

type Snowflake struct {
	mu           sync.Mutex
	lastTimestamp int64
	workerID     int64
	datacenterID int64
	sequence     int64
}

func NewSnowflake(datacenterID, workerID int64) (*Snowflake, error) {
	if workerID < 0 || workerID > maxWorkerID {
		return nil, errors.New("worker ID out of range")
	}
	if datacenterID < 0 || datacenterID > maxDatacenterID {
		return nil, errors.New("datacenter ID out of range")
	}
	return &Snowflake{
		workerID:     workerID,
		datacenterID: datacenterID,
	}, nil
}

func (s *Snowflake) NextID() (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UnixMilli()

	if now < s.lastTimestamp {
		return 0, errors.New("clock moved backwards! Refusing to generate ID")
	}

	if now == s.lastTimestamp {
		s.sequence = (s.sequence + 1) & maxSequence
		if s.sequence == 0 {
			// Sequence exhausted for this millisecond: busy wait for next ms
			for now <= s.lastTimestamp {
				now = time.Now().UnixMilli()
			}
		}
	} else {
		s.sequence = 0
	}

	s.lastTimestamp = now

	id := ((now - epoch) << timestampShift) |
		(s.datacenterID << datacenterIDShift) |
		(s.workerID << workerIDShift) |
		s.sequence

	return id, nil
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Twitter Snowflake delivers globally unique 64-bit integer IDs. Because the high 41 bits encode milliseconds, IDs sort chronologically, dramatically reducing B+ Tree page splits in relational databases compared to random UUIDv4.',
      databaseSchema: 'BIGINT UNSIGNED PRIMARY KEY in database tables.',
      apiEndpoints: [{ method: 'GET', path: '/id', desc: 'Returns generated 64-bit ID' }],
      bottlenecksAndTradeoffs: [
        'Clock Drift / NTP Skew: If the physical server clock rolls backwards due to NTP synchronization, generating an ID risks collisions. The implementation detects this condition and refuses to generate IDs or waits until the clock catches up.',
      ],
    },
  },
  {
    id: 'consistent-hash',
    name: 'Dynamic Consistent Hash Ring (Chord & Dynamo)',
    category: 'Distributed Core',
    difficulty: 'Advanced',
    tagline: 'Distributed key distribution ring featuring Virtual Nodes (vnodes) to achieve uniform load balancing and minimal key migration on node membership churn.',
    throughput: 'Sub-microsecond key lookup time O(log V)',
    latency: '< 1µs binary search on ring',
    storageScale: 'Supports thousands of nodes with millions of partition keys',
    overview:
      'A consistent hashing ring implementation that maps keys and physical nodes to a shared 32-bit or 128-bit hash ring. When nodes join or leave, only K/N keys are migrated, preventing the cascading cache wipeout associated with traditional modulo hashing.',
    functionalReqs: [
      'Map arbitrary keys to the closest clockwise node on the ring.',
      'Assign multiple virtual nodes (vnodes) per physical node to ensure uniform distribution.',
      'Support dynamic additions and removals of nodes with minimal key movement.',
    ],
    nonFunctionalReqs: [
      'Low memory footprint: Fast binary search on ordered slice.',
      'Deterministic mapping across all client drivers.',
    ],
    calculations: [
      {
        metric: 'Key Migration Ratio on Join',
        formula: 'K / (N + 1) keys relocated when a node joins a cluster of N nodes',
        result: 'Only ~1/Nth of keys remapped (vs 99% in modulo)',
      },
      {
        metric: 'Vnode Standard Deviation',
        formula: 'Standard deviation σ ≈ 1 / sqrt(V). For V = 200 vnodes, σ < 7%',
        result: 'Uniform load distribution across servers',
      },
    ],
    services: [
      { id: 'client', name: 'Routing Client Driver', role: 'Hashes key and locates target node', type: 'client', x: 15, y: 50, icon: 'Cpu', techStack: 'Go / Java SDK', details: 'Executes binary search on ring' },
      { id: 'node-a', name: 'Storage Node A (200 vnodes)', role: 'Owns partitions on ring', type: 'database', x: 55, y: 20, icon: 'Server', techStack: 'Cassandra / Dynamo', details: 'Handles assigned key ranges' },
      { id: 'node-b', name: 'Storage Node B (200 vnodes)', role: 'Owns partitions on ring', type: 'database', x: 80, y: 50, icon: 'Server', techStack: 'Cassandra / Dynamo', details: 'Handles assigned key ranges' },
      { id: 'node-c', name: 'Storage Node C (200 vnodes)', role: 'Owns partitions on ring', type: 'database', x: 55, y: 80, icon: 'Server', techStack: 'Cassandra / Dynamo', details: 'Handles assigned key ranges' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'node-b', label: 'Key "user_901" maps to Node B vnode', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Key Hashing onto 32-bit Identifier Ring',
        description: 'Client hashes key "order_3498" using MurmurHash3 to 32-bit unsigned integer 2,490,192,830.',
        fromNode: 'client',
        toNode: 'client',
        protocol: 'TCP',
        payload: { key: 'order_3498', hashInt: 2490192830 },
        codeRef: { file: 'consistent_hash.go', lineHighlight: '30-42', funcName: 'GetNode', codeExplanation: 'Computes hash; performs binary search sort.Search on ring slice.' },
        stateChange: 'Binary search identifies Node B virtual node #142 as first clockwise node.',
      },
      {
        step: 2,
        title: 'Step 2: Direct Request Dispatch',
        description: 'Client sends query directly to Node B IP address.',
        fromNode: 'client',
        toNode: 'node-b',
        protocol: 'TCP',
        payload: { command: 'READ', key: 'order_3498' },
        codeRef: { file: 'consistent_hash.go', lineHighlight: '45-50', funcName: 'Dispatch', codeExplanation: 'Routes request to physical address corresponding to vnode.' },
        stateChange: 'Node B processes read in 0.5ms.',
      },
    ],
    codeFiles: [
      {
        name: 'consistent_hash.go',
        language: 'go',
        role: 'Virtual Node Consistent Hashing Ring with Binary Search',
        code: `package hashring

import (
	"fmt"
	"hash/crc32"
	"sort"
	"strconv"
	"sync"
)

type HashRing struct {
	mu       sync.RWMutex
	vnodes   int               // Virtual nodes per physical node
	ring     []uint32          // Sorted slice of hash points
	nodeMap  map[uint32]string // Maps vnode hash -> physical node ID
}

func NewHashRing(vnodes int) *HashRing {
	return &HashRing{
		vnodes:  vnodes,
		ring:    make([]uint32, 0),
		nodeMap: make(map[uint32]string),
	}
}

func (h *HashRing) AddNode(node string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for i := 0; i < h.vnodes; i++ {
		vnodeKey := node + "#" + strconv.Itoa(i)
		hash := crc32.ChecksumIEEE([]byte(vnodeKey))
		h.ring = append(h.ring, hash)
		h.nodeMap[hash] = node
	}
	sort.Slice(h.ring, func(i, j int) bool { return h.ring[i] < h.ring[j] })
}

func (h *HashRing) GetNode(key string) (string, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if len(h.ring) == 0 {
		return "", fmt.Errorf("hash ring is empty")
	}

	hash := crc32.ChecksumIEEE([]byte(key))

	// Binary search for first vnode with hash >= key hash
	idx := sort.Search(len(h.ring), func(i int) bool {
		return h.ring[i] >= hash
	})

	// Wrap around to 0 if key exceeds highest ring position
	if idx == len(h.ring) {
		idx = 0
	}

	return h.nodeMap[h.ring[idx]], nil
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Consistent hashing maps both keys and servers to a circular namespace. Virtual nodes prevent hot spot imbalances on physical machines. Removing a node only shifts that node\'s keys to its immediate clockwise successors.',
      databaseSchema: 'Cluster routing table metadata.',
      apiEndpoints: [{ method: 'GET', path: '/ring/lookup', desc: 'Returns target node for key' }],
      bottlenecksAndTradeoffs: [
        'Vnode Memory vs Lookup Time: Increasing vnodes from 100 to 500 reduces variance in load from 10% down to 4%, but increases binary search overhead and memory usage for the ring structure in client drivers.',
      ],
    },
  },
  {
    id: 'dynamo-kv',
    name: 'Distributed Key-Value Store (Amazon Dynamo)',
    category: 'Distributed Core',
    difficulty: 'Expert',
    tagline: 'Leaderless distributed key-value store with tunable consistency (R + W > N), Sloppy Quorums, Hinted Handoff, and Merkle tree anti-entropy.',
    throughput: '500,000 writes/sec · 2,000,000 reads/sec',
    latency: 'p99 Read < 5ms · p99 Write < 10ms',
    storageScale: 'Petabytes across hundreds of commodity storage nodes',
    overview:
      'A masterless, highly available distributed key-value store designed for 99.999% uptime under hardware failures. Replaces single-leader bottlenecks with decentralized quorum replication. Solves temporary node outages with Hinted Handoff and reconciles data divergences using background Merkle tree anti-entropy exchanges.',
    functionalReqs: [
      'Put(key, value) and Get(key) operations with tunable consistency levels (R, W, N).',
      'Continuous availability for writes even during network partitions.',
      'Automatic self-healing via Read Repair and background anti-entropy.',
    ],
    nonFunctionalReqs: [
      'High partition tolerance (AP in CAP theorem).',
      'Decentralized topology: Zero single points of failure.',
    ],
    calculations: [
      {
        metric: 'Quorum Strong Consistency Condition',
        formula: 'W + R > N (e.g., N = 3, W = 2, R = 2)',
        result: 'Guarantees overlapping node in read and write sets',
      },
      {
        metric: 'Fast Write Performance',
        formula: 'W = 1 yields minimum write latency at the cost of eventual consistency',
        result: 'High-availability trade-off',
      },
    ],
    services: [
      { id: 'client', name: 'Application Client', role: 'Sends Read/Write request to coordinator', type: 'client', x: 10, y: 50, icon: 'Cpu', techStack: 'Dynamo SDK', details: 'Communicates with any coordinator' },
      { id: 'coord', name: 'Coordinator Node', role: 'Receives request and coordinates quorum', type: 'service', x: 40, y: 50, icon: 'Radio', techStack: 'Cassandra / Dynamo Node', details: 'Dispatches to N replica nodes' },
      { id: 'node-1', name: 'Replica Node 1', role: 'Stores replica of key', type: 'database', x: 75, y: 20, icon: 'Database', techStack: 'Storage Node (LSM-Tree)', details: 'Executes write' },
      { id: 'node-2', name: 'Replica Node 2', role: 'Stores replica of key', type: 'database', x: 75, y: 50, icon: 'Database', techStack: 'Storage Node (LSM-Tree)', details: 'Executes write' },
      { id: 'node-3', name: 'Replica Node 3', role: 'Stores replica of key', type: 'database', x: 75, y: 80, icon: 'Database', techStack: 'Storage Node (LSM-Tree)', details: 'Executes write' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'coord', label: 'PUT key, val (W=2, N=3)', protocol: 'TCP' },
      { id: 'c2', from: 'coord', to: 'node-1', label: 'Write Replica 1', protocol: 'TCP' },
      { id: 'c3', from: 'coord', to: 'node-2', label: 'Write Replica 2', protocol: 'TCP' },
      { id: 'c4', from: 'coord', to: 'node-3', label: 'Write Replica 3', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Client Issues Quorum Write to Coordinator',
        description: 'Client connects to Coordinator Node and issues PUT with write quorum W=2 and replication factor N=3.',
        fromNode: 'client',
        toNode: 'coord',
        protocol: 'TCP',
        payload: { command: 'PUT', key: 'cart:901', val: '{"items":[4,8]}', W: 2, N: 3 },
        codeRef: { file: 'dynamo_node.go', lineHighlight: '20-35', funcName: 'CoordinateWrite', codeExplanation: 'Determines N replica nodes on consistent hash ring; dispatches concurrent write requests.' },
        stateChange: 'Coordinator fires parallel writes to Replicas 1, 2, and 3.',
      },
      {
        step: 2,
        title: 'Step 2: Quorum Acknowledgment',
        description: 'Replicas 1 and 2 acknowledge write to local LSM-tree. Quorum W=2 is satisfied. Coordinator responds OK to client.',
        fromNode: 'node-1',
        toNode: 'coord',
        protocol: 'TCP',
        payload: { acksReceived: 2, quorumRequired: 2, status: 'SUCCESS' },
        codeRef: { file: 'dynamo_node.go', lineHighlight: '40-52', funcName: 'HandleAck', codeExplanation: 'Returns success to client as soon as W acknowledgments arrive, without waiting for the 3rd replica.' },
        stateChange: 'Client receives success response in 4ms.',
      },
    ],
    codeFiles: [
      {
        name: 'dynamo_node.go',
        language: 'go',
        role: 'Quorum Replication Coordinator with Vector Clocks',
        code: `package dynamo

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type QuorumCoordinator struct {
	nodes []string
}

func (q *QuorumCoordinator) Put(ctx context.Context, key string, val []byte, N, W int) error {
	replicas := q.nodes[:N]
	ackChan := make(chan bool, N)
	var wg sync.WaitGroup

	for _, node := range replicas {
		wg.Add(1)
		go func(target string) {
			defer wg.Done()
			// Simulate write to node LSM-tree
			time.Sleep(2 * time.Millisecond)
			ackChan <- true
		}(node)
	}

	acks := 0
	timeout := time.After(50 * time.Millisecond)

	for acks < W {
		select {
		case <-ackChan:
			acks++
			if acks >= W {
				return nil // Quorum met!
			}
		case <-timeout:
			return fmt.Errorf("write quorum timeout (acks: %d, required: %d)", acks, W)
		}
	}
	return nil
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Amazon Dynamo uses leaderless replication, consistent hashing with vnodes, and vector clocks to achieve high write availability. Hinted handoff allows nodes to temporarily store writes intended for offline peers.',
      databaseSchema: 'Key-Value store with vector clock metadata: key (bytes), value (bytes), vector_clock (map[node]counter).',
      apiEndpoints: [
        { method: 'POST', path: '/put', desc: 'Writes key with specified W quorum' },
        { method: 'GET', path: '/get', desc: 'Reads key with specified R quorum' },
      ],
      bottlenecksAndTradeoffs: [
        'Concurrent Conflicting Writes: Without locking or single leaders, concurrent writes to the same key generate sibling versions (branches in vector clocks). The client application must perform conflict resolution (e.g., merging shopping cart items).',
      ],
    },
  },
]
