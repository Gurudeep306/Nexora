import type { FromScratchGuide } from '../types'

export const ADDITIONAL_FROM_SCRATCH_GUIDES: Record<string, FromScratchGuide> = {
  'metrics-tsdb': {
    problemStatement:
      'Design a distributed time-series metrics database (like Prometheus and Gorilla) capable of ingesting 2,000,000+ metric data points per second with sub-50ms query latency and 12x storage compression.',
    naiveApproach: {
      description:
        'A single relational database table `CREATE TABLE metrics (metric_name VARCHAR(128), timestamp BIGINT, value DOUBLE PRECISION)`. Scraper pods insert batches of metrics via standard SQL INSERT queries.',
      whyItBreaks: [
        'Storage bloat: Each sample consumes 16 bytes raw + 32 bytes B+Tree index overhead. At 2M samples/sec, disk consumes 345 GB per hour.',
        'Write I/O saturation: Relational database write-ahead log (WAL) and B+Tree page splits saturate SSD IOPS within minutes.',
        'Slow range queries: Querying 24 hours of metrics requires scanning billions of rows, resulting in timeouts.',
        'Lack of columnar compression: Standard relational row-oriented storage cannot exploit delta-of-delta timestamp regularity.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Gorilla Delta-of-Delta Bitstream',
        purpose: 'Compresses timestamps from 64 bits to 1-2 bits using timestamp regularity.',
        timeComplexity: 'O(1) encode / decode',
        spaceComplexity: '1.37 bytes per (timestamp, float) pair',
        asciiDiagram: 'D = (t_now - t_prev) - (t_prev - t_prev2); if D==0 -> emit "0"; else variable-length bit packing',
      },
      {
        name: 'Inverted Label Index (Posting Lists)',
        purpose: 'Maps metric labels (e.g., job="api", status="500") to 64-bit series IDs.',
        timeComplexity: 'O(K) where K is number of matching series',
        spaceComplexity: 'O(S) where S is unique time-series count',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: The Gorilla Delta-of-Delta Timestamp Compressor',
        subtitle: 'Fitting 64-bit timestamps into variable bit lengths',
        concept:
          'Metrics are scraped at regular intervals (e.g. every 15s). The difference between successive deltas (D = delta_now - delta_prev) is almost always 0. A single bit "0" encodes zero change.',
        language: 'go',
        fileName: 'gorilla_timestamp.go',
        codeSnippet: `package main

import "math/bits"

type TimestampEncoder struct {
	t0, t1    int64
	deltaPrev int64
	bitStream []byte
	bitCount  int
}

func (enc *TimestampEncoder) Append(t int64) {
	if enc.t0 == 0 {
		enc.t0 = t
		return
	}
	if enc.t1 == 0 {
		enc.t1 = t
		enc.deltaPrev = enc.t1 - enc.t0
		return
	}
	delta := t - enc.t1
	dod := delta - enc.deltaPrev // delta-of-delta
	enc.deltaPrev = delta
	enc.t1 = t

	if dod == 0 {
		enc.writeBits(0, 1) // 1 bit: '0'
	} else if dod >= -63 && dod <= 64 {
		enc.writeBits(0x02, 2) // '10'
		enc.writeBits(uint64(dod+63), 7)
	} else {
		enc.writeBits(0x0F, 4) // '1111'
		enc.writeBits(uint64(dod), 32)
	}
}

func (enc *TimestampEncoder) writeBits(val uint64, count int) {
	// Packs bits into byte stream
}
`,
        explanation: 'Delta-of-delta compression achieves over 90% reduction in timestamp storage requirements.',
        keyTakeaway: 'Predictable time spacing enables near-lossless compression using single-bit indicators.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'High Cardinality Metric Blast (Pod names with random UUID tags)',
        impact: 'Millions of unique time-series created, exhausting in-memory posting lists.',
        mitigationCodeOrStrategy: 'Enforce strict metric label cardinality limits at ingestion gateway; drop unbound tags.',
      },
    ],
    faangInterviewTips: [
      'Mention Facebook Gorilla paper: 1.37 bytes per sample average.',
      'Explain 2-hour Head Chunk memory lifecycle before flushing immutable blocks to disk.',
    ],
  },

  'google-maps': {
    problemStatement:
      'Design a vector map tile and turn-by-turn routing engine (like Google Maps) serving millions of map tiles and computing shortest paths across 50M+ road intersections in under 10ms.',
    naiveApproach: {
      description:
        'Store road intersections in PostgreSQL PostGIS. When a user requests directions, execute Dijkstra’s algorithm by querying adjacent road segments directly from the database table.',
      whyItBreaks: [
        'Massive disk query latency: Exploring 100,000 road segments generates 100,000 separate SQL queries, taking 15+ seconds.',
        'CPU starvation on continental routes: Standard Dijkstra searches millions of irrelevant residential streets.',
        'Tile server bottleneck: Dynamically rendering PNG map tiles on demand maxes out server CPU cores.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Contraction Hierarchies Graph',
        purpose: 'Pre-computes shortcut edges across highway nodes to bypass local streets during routing.',
        timeComplexity: 'O(E + V log V) query complexity reduced by 99%',
        spaceComplexity: 'Contiguous flat array representation (forward star)',
        asciiDiagram: 'Residential Node -> [Shortcut Edge] -> Interstate Highway -> Destination',
      },
      {
        name: 'Slippy Map Tile QuadTree (Z/X/Y)',
        purpose: 'Decomposes globe into 256x256 pixel tiles across zoom levels 0-22.',
        timeComplexity: 'O(1) tile lookup via Anycast CDN',
        spaceComplexity: 'Vector Protobuf tiles (.mvt)',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Contraction Hierarchies Bidirectional Search',
        subtitle: 'Meeting in the middle using precomputed shortcuts',
        concept:
          'Contraction Hierarchies assign an importance rank to every intersection. Queries explore only upward edges from origin and destination, meeting in the middle at highway nodes in < 5ms.',
        language: 'go',
        fileName: 'routing_engine.go',
        codeSnippet: `package main

type GraphNode struct {
	ID        uint32
	Rank      uint32
	Edges     []GraphEdge
}

type GraphEdge struct {
	TargetNode uint32
	WeightMs   uint32
	Shortcut   bool
}

// BidirectionalUpwardSearch explores only edges to higher-rank nodes
func BidirectionalUpwardSearch(origin, dest uint32, nodes []GraphNode) []uint32 {
	// Explores upward from origin and dest simultaneously
	// Returns meeting node with minimal total weight
	return nil
}
`,
        explanation: 'Evaluates fewer than 500 nodes per cross-country query instead of millions.',
        keyTakeaway: 'Offline pre-computation transforms intractable graph problems into instant lookups.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Flash Flood Closes Major Highway Artery',
        impact: 'Pre-computed shortcuts become invalid, causing misrouted traffic.',
        mitigationCodeOrStrategy: 'Dynamic weight overlay graph applied on top of static base contracted graph.',
      },
    ],
    faangInterviewTips: [
      'Highlight Vector Map Tiles (.mvt) rendered client-side on GPU vs server-rendered PNGs.',
      'Explain A* heuristic with Euclidean distance vs Contraction Hierarchies.',
    ],
  },

  'job-scheduler': {
    problemStatement:
      'Design a distributed, highly available job and task scheduler (like Temporal or Quartz) executing millions of recurring cron tasks and DAG workflows with exactly-once semantics and heartbeat leases.',
    naiveApproach: {
      description:
        'A single cron server that polls a SQL database every second: `SELECT * FROM tasks WHERE run_at <= NOW() AND status = \'PENDING\' FOR UPDATE`.',
      whyItBreaks: [
        'Single point of failure: If the cron server crashes, all scheduled tasks across the company halt.',
        'Database lock saturation: Polling millions of tasks with `FOR UPDATE` serializes database threads.',
        'Duplicate executions: Network delays cause tasks to be claimed by multiple workers concurrently.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Hierarchical Timing Wheel',
        purpose: 'Maintains millions of pending timers in circular buckets; ticks in O(1) time.',
        timeComplexity: 'O(1) insert / expire',
        spaceComplexity: 'Fixed circular arrays for seconds, minutes, hours',
        asciiDiagram: '[Second Wheel (60)] -> [Minute Wheel (60)] -> [Hour Wheel (24)]',
      },
      {
        name: 'Distributed Heartbeat Lease Token',
        purpose: 'Grants temporary exclusive execution ownership to a worker pod with 5-second TTL.',
        timeComplexity: 'O(1) acquire / renew',
        spaceComplexity: 'Redis key with expiration',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: The In-Memory Timing Wheel Engine',
        subtitle: 'Replacing expensive database polling with circular tick wheels',
        concept:
          'Timing wheels arrange tasks in circular arrays indexed by current time modulo bucket count. Each tick pops only the tasks scheduled for that exact second.',
        language: 'go',
        fileName: 'timing_wheel.go',
        codeSnippet: `package main

import "sync"

type Task struct {
	ID       string
	ExecuteAt int64
	Payload  []byte
}

type TimingWheel struct {
	mu       sync.Mutex
	wheel    [60][]*Task
	current  int
}

func (tw *TimingWheel) AddTask(t *Task) {
	tw.mu.Lock()
	defer tw.mu.Unlock()
	idx := (tw.current + int(t.ExecuteAt % 60)) % 60
	tw.wheel[idx] = append(tw.wheel[idx], t)
}

func (tw *TimingWheel) Tick() []*Task {
	tw.mu.Lock()
	defer tw.mu.Unlock()
	tasks := tw.wheel[tw.current]
	tw.wheel[tw.current] = nil
	tw.current = (tw.current + 1) % 60
	return tasks
}
`,
        explanation: 'Enables O(1) timer dispatch without querying the relational database.',
        keyTakeaway: 'Decouple task storage from timer evaluation to protect databases from polling overload.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Worker Node OOM Panic Mid-Task',
        impact: 'Task hangs in active status indefinitely.',
        mitigationCodeOrStrategy: 'Heartbeat lease auto-expires in Redis; scheduler re-queues task to DLQ.',
      },
    ],
    faangInterviewTips: [
      'Emphasize that tasks must be idempotent because distributed systems cannot guarantee exactly-once network delivery.',
    ],
  },

  'dns-resolver': {
    problemStatement:
      'Design a high-speed recursive DNS resolver (like Cloudflare 1.1.1.1) resolving domain names in under 10ms with Anycast BGP, in-memory TTL caching, and DNSSEC validation.',
    naiveApproach: {
      description:
        'Every incoming DNS query triggers synchronous network calls to Root, TLD, and Authoritative nameservers sequentially over UDP without caching.',
      whyItBreaks: [
        'Excessive latency: 3 sequential network hops take 150-250ms per query.',
        'Root server rate limiting: Recursive queries overwhelm root nameserver infrastructure.',
        'Vulnerability to DNS amplification and cache poisoning without cryptographic validation.',
      ],
    },
    coreDataStructures: [
      {
        name: 'In-Memory Lock-Free Resource Record Trie',
        purpose: 'Caches A, AAAA, and CNAME records with expiration timestamps.',
        timeComplexity: 'O(L) where L is domain name string length',
        spaceComplexity: 'O(N) unique cached domains in RAM',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: The Lock-Free DNS Cache with Serve-Stale',
        subtitle: 'Resolving records in 0.2ms with RFC 8767 resiliency',
        concept:
          'If an authoritative nameserver is down, serving an expired cached record keeps internet browsing functional while logging upstream failures.',
        language: 'go',
        fileName: 'dns_cache.go',
        codeSnippet: `package main

import (
	"sync"
	"time"
)

type DNSRecord struct {
	IP        string
	ExpiresAt time.Time
}

type DNSCache struct {
	mu    sync.RWMutex
	cache map[string]DNSRecord
}

func (c *DNSCache) Get(domain string) (string, bool) {
	c.mu.RLock()
	rec, found := c.cache[domain]
	c.mu.RUnlock()
	if !found {
		return "", false
	}
	// Serve stale if less than 24h expired and upstream fails
	return rec.IP, true
}
`,
        explanation: 'Enables sub-millisecond cached resolution and fault tolerance against upstream outages.',
        keyTakeaway: 'Serve stale on failure preserves internet connectivity during third-party DNS outages.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Kaminsky DNS Cache Poisoning Attack',
        impact: 'Attacker injects fake IP address into resolver cache.',
        mitigationCodeOrStrategy: 'Source Port Randomization + 16-bit Transaction ID + DNSSEC cryptographic validation.',
      },
    ],
    faangInterviewTips: [
      'Explain BGP Anycast routing directing packets to physically closest POP.',
    ],
  },

  'webhook-engine': {
    problemStatement:
      'Design an enterprise webhook delivery platform (like Stripe Webhooks) delivering millions of HTTP notifications with HMAC-SHA256 signatures, exponential backoff retries, and customer circuit breakers.',
    naiveApproach: {
      description:
        'When an event occurs, backend microservice makes a synchronous HTTP POST directly to the customer’s webhook URL in the main request loop.',
      whyItBreaks: [
        'Cascading service stalls: Slow customer endpoints (5s timeout) tie up backend threads, exhausting connection pools.',
        'Lost events: If the customer endpoint returns HTTP 500, the event is permanently lost with no retry queue.',
        'Security vulnerability: Webhook payloads without cryptographic signatures can be spoofed by attackers.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Exponential Backoff Delayed Queue',
        purpose: 'Schedules retry attempts at 5m, 30m, 2h, 12h, 24h intervals with jitter.',
        timeComplexity: 'O(log N) delayed task enqueue',
        spaceComplexity: 'Redis ZSet (score = next_attempt_timestamp)',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: HMAC-SHA256 Cryptographic Payload Signer',
        subtitle: 'Allowing customers to verify authenticity and prevent replay attacks',
        concept:
          'Compute HMAC-SHA256 over timestamp + payload and include timestamp header to prevent replay attacks.',
        language: 'go',
        fileName: 'webhook_signer.go',
        codeSnippet: `package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

func GenerateWebhookSignature(payload []byte, secret string, timestamp int64) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(fmt.Sprintf("%d.", timestamp)))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}
`,
        explanation: 'Prevents tampering and allows recipients to reject stale or spoofed payloads.',
        keyTakeaway: 'Always include monotonic timestamp in HMAC payload to guard against replay attacks.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Customer Webhook URL Loops to Our Own API',
        impact: 'Infinite message amplification loop.',
        mitigationCodeOrStrategy: 'Hop-count headers and strict domain loopback IP filtering.',
      },
    ],
    faangInterviewTips: [
      'Explain per-customer queue isolation so one failing endpoint never blocks another.',
    ],
  },

  'api-gateway': {
    problemStatement:
      'Design a cloud API gateway and reverse proxy (like Envoy or Kong) handling 250,000+ req/sec per node with sub-1.5ms overhead, JWT validation, dynamic service discovery, and circuit breaking.',
    naiveApproach: {
      description:
        'A single Node.js Express / Python reverse proxy that calls an Auth Service on every request to validate user tokens before forwarding traffic.',
      whyItBreaks: [
        'Auth service saturation: Millions of internal RPC calls double internal network traffic and add 10ms latency.',
        'Thread blocking under upstream load: Single-threaded event loop blocks on slow microservices.',
        'Downtime during route configuration changes.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Radix Tree URL Route Matcher',
        purpose: 'Matches HTTP paths (/api/v1/users/:id) to upstream clusters in O(K) time.',
        timeComplexity: 'O(K) where K is path length',
        spaceComplexity: 'O(Routes count) in memory',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: In-Process Cryptographic JWT Validation Filter',
        subtitle: 'Eliminating the network hop to Auth microservice',
        concept:
          'Validate RS256 token signatures in memory using cached JWKS public keys without network roundtrips.',
        language: 'go',
        fileName: 'jwt_filter.go',
        codeSnippet: `package main

import "sync"

type GatewayFilter struct {
	mu       sync.RWMutex
	jwksKeys map[string][]byte
}

func (gf *GatewayFilter) ValidateToken(tokenString string) bool {
	// Parses RS256 token header, gets key ID (kid)
	// Validates signature using cached jwksKeys in < 0.15ms
	return true
}
`,
        explanation: 'Reduces authentication latency from 15ms down to 0.15ms.',
        keyTakeaway: 'Cryptographic claims allow stateless verification at the network edge.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Upstream Microservice Memory Leak Causing Cascading Gateway Death',
        impact: 'Gateway thread pool exhausted waiting for upstream responses.',
        mitigationCodeOrStrategy: 'Outlier detection circuit breaker immediately ejects failing pods.',
      },
    ],
    faangInterviewTips: [
      'Contrast Envoy C++ epoll event loop with traditional process-per-request servers.',
    ],
  },

  'cdn-network': {
    problemStatement:
      'Design an Anycast edge Content Delivery Network (like Cloudflare or Fastly) delivering web assets in under 15ms with Origin Shields and Stale-While-Revalidate caching.',
    naiveApproach: {
      description:
        'A single central web server with Geo-DNS directing users to its IP address.',
      whyItBreaks: [
        'Trans-oceanic latency: Global users experience 250ms roundtrip delay.',
        'Origin stampede: Simultaneous cache misses swamp origin database.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Tiered NVMe + RAM Cache Directory',
        purpose: 'Provides two-tier storage for millions of web assets.',
        timeComplexity: 'O(1) point lookup',
        spaceComplexity: 'Tiered storage across RAM and NVMe',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Origin Shield Request Collapser (Singleflight)',
        subtitle: 'Collapsing 10,000 cache misses into 1 origin request',
        concept:
          'When multiple requests arrive simultaneously for an uncached asset, collapse them into a single origin fetch.',
        language: 'go',
        fileName: 'request_collapser.go',
        codeSnippet: `package main

import "sync"

type SingleflightGroup struct {
	mu    sync.Mutex
	calls map[string]*call
}

type call struct {
	wg  sync.WaitGroup
	val []byte
	err error
}

func (g *SingleflightGroup) Do(key string, fn func() ([]byte, error)) ([]byte, error) {
	g.mu.Lock()
	if c, ok := g.calls[key]; ok {
		g.mu.Unlock()
		c.wg.Wait()
		return c.val, c.err
	}
	c := new(call)
	c.wg.Add(1)
	g.calls[key] = c
	g.mu.Unlock()

	c.val, c.err = fn()
	c.wg.Done()

	g.mu.Lock()
	delete(g.calls, key)
	g.mu.Unlock()
	return c.val, c.err
}
`,
        explanation: 'Prevents origin stampedes during viral content release.',
        keyTakeaway: 'Singleflight request collapsing protects backend origins from thundering herds.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Fiber Cut Between Origin and Edge POPs',
        impact: 'Edge cannot contact customer origin server.',
        mitigationCodeOrStrategy: 'Stale-While-Revalidate serves cached content with 100% uptime.',
      },
    ],
    faangInterviewTips: [
      'Explain BGP Anycast routing vs Geo-DNS routing tradeoffs.',
    ],
  },

  'game-server': {
    problemStatement:
      'Design a dedicated authoritative multiplayer game server (for FPS/MOBA games) running a 60Hz physics tick loop, UDP synchronization, client prediction, and lag compensation.',
    naiveApproach: {
      description:
        'A Node.js server using WebSockets / TCP that broadcasts player positions to all clients upon receiving every move packet.',
      whyItBreaks: [
        'TCP head-of-line blocking: Dropping 1 packet freezes all gameplay.',
        'Client-side authority allows hackers to teleport or shoot through walls.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Historical Hitbox Ring Buffer',
        purpose: 'Stores past 128 ticks (2 seconds) of world state for lag compensation.',
        timeComplexity: 'O(1) historical tick rewind',
        spaceComplexity: 'Contiguous memory array',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: The 60Hz Authoritative Tick Loop with Lag Compensation',
        subtitle: 'Rewinding server time to validate client hit registration',
        concept:
          'When processing a shot, rewind enemy hitboxes to the exact tick when the player fired to compensate for network latency.',
        language: 'go',
        fileName: 'tick_engine.go',
        codeSnippet: `package main

type EntityState struct {
	ID uint32
	X, Y, Z float32
}

type TickSnapshot struct {
	TickNum  uint32
	Entities []EntityState
}

type GameWorld struct {
	history [128]TickSnapshot
	current uint32
}

func (gw *GameWorld) RewindAndCheckHit(shooterTick uint32, rayOrigin, rayDir [3]float32) bool {
	// Rewinds target hitbox to shooterTick
	// Raycasts against historical mesh
	return true
}
`,
        explanation: 'Eliminates peeker’s advantage while maintaining 100% server authority.',
        keyTakeaway: 'Authoritative server with time-rewind lag compensation prevents cheating without rubber-banding.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Packet Loss Burst over Mobile Network',
        impact: 'Client misses multiple consecutive state updates.',
        mitigationCodeOrStrategy: 'Delta state compression + smooth position interpolation.',
      },
    ],
    faangInterviewTips: [
      'Contrast UDP with TCP head-of-line blocking in real-time gaming.',
    ],
  },

  'notification-system': {
    problemStatement:
      'Design a distributed real-time notification engine (like Twilio and FCM) delivering billions of push notifications, SMS alerts, and emails with deduplication and frequency capping.',
    naiveApproach: {
      description:
        'Backend services call Apple APNs or SendGrid synchronously whenever an event occurs in the application.',
      whyItBreaks: [
        'Accidental infinite trigger loops blast users with hundreds of duplicate SMS alerts.',
        'Third-party provider API rate limits drop critical transactional messages.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Sliding Window Deduplication Cache',
        purpose: 'Tracks recent notification hashes per user over a 10-minute window.',
        timeComplexity: 'O(1) Redis SET NX with TTL',
        spaceComplexity: 'Temporary memory keys',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Sliding Window Deduplication & Frequency Limiter',
        subtitle: 'Preventing duplicate alerts and runaway SMS costs',
        concept:
          'Compute hash of (userId + notificationType + entityId) and check Redis with TTL to suppress duplicates.',
        language: 'go',
        fileName: 'dedup_filter.go',
        codeSnippet: `package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

func ShouldDropDuplicate(userId int64, eventType, entityId string) bool {
	h := sha256.Sum256([]byte(fmt.Sprintf("%d:%s:%s", userId, eventType, entityId)))
	key := hex.EncodeToString(h[:])
	// SET key 1 NX EX 600 (returns false if already exists)
	_ = key
	return false
}
`,
        explanation: 'Protects users from notification storms caused by backend retries.',
        keyTakeaway: 'Idempotency and deduplication filters protect third-party API budgets.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'APNs Gateway Returns HTTP 503 Outage',
        impact: 'Push notifications fail globally.',
        mitigationCodeOrStrategy: 'Circuit breaker automatically diverts critical alerts to SMS / Email.',
      },
    ],
    faangInterviewTips: [
      'Explain separate priority queues for transactional alerts (OTP) vs marketing blasts.',
    ],
  },

  pastebin: {
    problemStatement:
      'Design a scalable text snippet sharing platform (like Pastebin or GitHub Gist) storing billions of pastes with Base62 IDs, automatic expiration, and sub-5ms lookups.',
    naiveApproach: {
      description:
        'Store multi-megabyte paste text bodies directly in PostgreSQL `TEXT` columns with auto-incrementing integer IDs.',
      whyItBreaks: [
        'PostgreSQL TOAST table bloat: Large text blobs exhaust buffer cache.',
        'Sequential ID enumeration allows attackers to scrape all private pastes.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Base62 Bijective Key Generator',
        purpose: 'Dispenses compact 7-character alphanumeric tokens.',
        timeComplexity: 'O(1) token generation',
        spaceComplexity: 'Pre-allocated in-memory buffer',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Polyglot Storage (S3 Text + SQL Metadata)',
        subtitle: 'Decoupling raw text bodies from relational metadata',
        concept:
          'Upload raw text directly to S3 object store; record metadata and S3 URL in PostgreSQL.',
        language: 'go',
        fileName: 'paste_service.go',
        codeSnippet: `package main

type PasteMetadata struct {
	ID        string
	S3Key     string
	SizeBytes int64
	ExpiresAt int64
}

// Stores text in S3 and metadata in database
func CreatePaste(id string, body []byte) error {
	// PUT to s3://pastes/{id}.txt
	// INSERT INTO pastes_meta (id, s3_key, size) VALUES (...)
	return nil
}
`,
        explanation: 'Keeps relational database indexes small while scaling text storage infinitely.',
        keyTakeaway: 'Never store large binary/text payloads in relational table columns.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Massive Expired Paste Deletion Locks Database',
        impact: 'High write lock contention during cron deletion.',
        mitigationCodeOrStrategy: 'Lazy expiration: check timestamp on read and delete asynchronously.',
      },
    ],
    faangInterviewTips: [
      'Compare S3 object storage pricing ($0.023/GB) with database SSD EBS volumes ($0.10/GB).',
    ],
  },

  'fraud-detection': {
    problemStatement:
      'Design a real-time fraud scoring and risk evaluation pipeline (like Stripe Radar) evaluating transactions in under 30ms using rule engines and ML feature stores.',
    naiveApproach: {
      description:
        'Query the primary transactional database synchronously to calculate user velocity (number of purchases in the last 24 hours) during checkout.',
      whyItBreaks: [
        'Heavy analytical SQL queries (`COUNT(*) WHERE created_at > NOW() - 24h`) pin database CPU.',
        'Checkout latency exceeds 500ms, causing users to abandon carts.',
      ],
    },
    coreDataStructures: [
      {
        name: 'In-Memory Sliding Window Feature Store',
        purpose: 'Tracks transaction counts and distinct credit card counts per user in Redis.',
        timeComplexity: 'O(1) feature retrieval',
        spaceComplexity: 'In-memory Redis hash structure',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Real-Time Feature Store Extraction',
        subtitle: 'Retrieving 50+ risk signals in under 4ms',
        concept:
          'Maintain pre-aggregated sliding window counters in Redis for instantaneous ML model scoring.',
        language: 'go',
        fileName: 'risk_scorer.go',
        codeSnippet: `package main

type RiskFeatures struct {
	TxCount1h       int
	DistinctCards24h int
	IsForeignCountry bool
}

func ComputeRiskScore(f RiskFeatures) int {
	score := 0
	if f.TxCount1h > 5 {
		score += 300
	}
	if f.DistinctCards24h > 3 {
		score += 400
	}
	if f.IsForeignCountry {
		score += 150
	}
	return score // 0-1000
}
`,
        explanation: 'Enables sub-30ms fraud evaluation before payment gateway authorization.',
        keyTakeaway: 'Separate online feature serving from offline model training.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'ML Model Inference Latency Spike (> 40ms)',
        impact: 'Risk evaluation exceeds payment gateway timeout.',
        mitigationCodeOrStrategy: 'Circuit breaker switches to static heuristic rules in < 2ms.',
      },
    ],
    faangInterviewTips: [
      'Highlight trade-off between false positives (annoying real customers) and false negatives (chargebacks).',
    ],
  },

  'object-storage': {
    problemStatement:
      'Design an exabyte-scale distributed cloud object storage engine (like Amazon S3 or Ceph) with 11 nines durability using Reed-Solomon Erasure Coding and CRUSH placement.',
    naiveApproach: {
      description:
        'Store 3 complete copies of every object on 3 different server drives (3-way replication).',
      whyItBreaks: [
        '300% storage overhead: Storing 100 PB customer data requires 300 PB raw hard drive capacity, doubling infrastructure costs.',
        'Centralized directory bottleneck: Single master server managing metadata cannot scale to billions of objects.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Reed-Solomon Galois Field Matrix (8+4)',
        purpose: 'Encodes 8 data shards into 4 parity shards; reconstructs object from ANY 8 surviving shards.',
        timeComplexity: 'O(N) with AVX-512 SIMD vector instructions',
        spaceComplexity: '1.5x storage overhead (vs 3.0x for replication)',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Reed-Solomon Erasure Coding Engine',
        subtitle: 'Higher durability at 50% lower hard drive cost',
        concept:
          'Split object bytes into 8 data shards and generate 4 parity shards using Galois Field matrix multiplication.',
        language: 'go',
        fileName: 'erasure_coder.go',
        codeSnippet: `package main

type ErasureCoder struct {
	dataShards   int // 8
	parityShards int // 4
}

func (ec *ErasureCoder) SplitAndEncode(data []byte) ([][]byte, error) {
	// Splits data into 8 equal slices
	// Computes 4 parity slices using SIMD Galois field matrix
	// Returns 12 total shards
	return nil, nil
}

func (ec *ErasureCoder) Reconstruct(shards [][]byte) ([]byte, error) {
	// If any 8 of 12 shards survive: restores original data perfectly
	return nil, nil
}
`,
        explanation: 'Achieves 11 nines statistical durability at 1.5x storage overhead.',
        keyTakeaway: 'Erasure coding replaces expensive hardware replication with pure CPU vector math.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Simultaneous Drive Failures in 4 Storage Nodes',
        impact: 'Data durability threatened.',
        mitigationCodeOrStrategy: '8+4 erasure coding reconstructs original data with zero loss from surviving 8 shards.',
      },
    ],
    faangInterviewTips: [
      'Explain Ceph CRUSH deterministic hashing avoiding central directory bottlenecks.',
    ],
  },
}
