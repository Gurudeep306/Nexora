import type { SystemDesignModel } from '../../types'

export const ADDITIONAL_SYSTEMS: SystemDesignModel[] = [
  {
    id: 'search-engine',
    name: 'Distributed Search Engine (Elasticsearch / Lucene)',
    category: 'Geospatial & Search',
    difficulty: 'Expert',
    tagline: 'Full-text distributed search engine implementing Inverted Indices, BM25 relevance scoring, finite-state transducers (FST), and segment merging.',
    throughput: '100,000 queries/sec across multi-node cluster',
    latency: 'p99 Query Latency < 25ms',
    storageScale: 'Terabytes of searchable text documents across shards',
    overview:
      'A distributed full-text search engine built on inverted index data structures. Documents are analyzed into tokenized terms and mapped to posting lists. Queries evaluate BM25 relevance rankings in parallel across distributed primary and replica shards, merging results at a coordinator node in milliseconds.',
    functionalReqs: [
      'Tokenization, stemming, and stop-word filtering across ingested documents.',
      'Full-text search queries (match, prefix, fuzzy, bool queries).',
      'Relevance scoring using Okapi BM25 algorithm.',
      'Sharded cluster topology with primary and replica shards for fault tolerance.',
    ],
    nonFunctionalReqs: [
      'Near real-time search: Document searchable within 1 second of indexing.',
      'High availability: Survives node crashes without search downtime.',
    ],
    calculations: [
      {
        metric: 'BM25 Relevance Formula',
        formula: 'BM25(D, Q) = SUM( IDF(q_i) * (TF * (k1 + 1)) / (TF + k1 * (1 - b + b * (|D| / avgdl))) )',
        result: 'Scores document relevance by term frequency and document length normalization',
      },
      {
        metric: 'Posting List Compression',
        formula: 'Frame-of-Reference (FoR) compresses integer document IDs into delta-bit blocks',
        result: '80% compression on inverted index posting lists',
      },
    ],
    services: [
      { id: 'client', name: 'Search Client', role: 'Sends search query', type: 'client', x: 10, y: 50, icon: 'Search', techStack: 'Browser / API', details: 'Sends GET /index/_search?q=...' },
      { id: 'coord', name: 'Coordinating Node', role: 'Broadcasts query to shards and merges top K', type: 'gateway', x: 35, y: 50, icon: 'Cpu', techStack: 'Elasticsearch Node', details: 'Scatter-gather query execution' },
      { id: 'shard-1', name: 'Data Shard 1 (Primary)', role: 'Executes inverted index search', type: 'database', x: 70, y: 25, icon: 'Database', techStack: 'Lucene Core', details: 'Searches local segments in parallel' },
      { id: 'shard-2', name: 'Data Shard 2 (Primary)', role: 'Executes inverted index search', type: 'database', x: 70, y: 75, icon: 'Database', techStack: 'Lucene Core', details: 'Searches local segments in parallel' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'coord', label: 'GET /search?q="distributed systems"', protocol: 'HTTPS' },
      { id: 'c2', from: 'coord', to: 'shard-1', label: 'Scatter Query to Shard 1', protocol: 'TCP' },
      { id: 'c3', from: 'coord', to: 'shard-2', label: 'Scatter Query to Shard 2', protocol: 'TCP' },
      { id: 'c4', from: 'shard-1', to: 'coord', label: 'Return Top 10 Scored Doc IDs', protocol: 'TCP' },
      { id: 'c5', from: 'shard-2', to: 'coord', label: 'Return Top 10 Scored Doc IDs', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Search Query Dispatch',
        description: 'Client issues query for "distributed systems". Coordinating node parses query into term tokens.',
        fromNode: 'client',
        toNode: 'coord',
        protocol: 'HTTPS',
        payload: { query: 'distributed systems', size: 10 },
        codeRef: { file: 'inverted_index.rs', lineHighlight: '15-28', funcName: 'search_inverted_index', codeExplanation: 'Tokenizes query into terms ["distributed", "systems"].' },
        stateChange: 'Coordinating node scatters query to Shards 1 and 2.',
      },
      {
        step: 2,
        title: 'Step 2: Shard Inverted Index Traversal & BM25 Scoring',
        description: 'Each shard scans its local Lucene inverted index posting lists and computes BM25 relevance scores.',
        fromNode: 'coord',
        toNode: 'shard-1',
        protocol: 'TCP',
        payload: { terms: ['distributed', 'systems'] },
        codeRef: { file: 'inverted_index.rs', lineHighlight: '32-45', funcName: 'score_bm25', codeExplanation: 'Intersects posting lists; ranks matching documents by BM25 score.' },
        stateChange: 'Shard 1 returns top 10 matching document IDs to coordinator.',
      },
      {
        step: 3,
        title: 'Step 3: Scatter-Gather Top-K Merge',
        description: 'Coordinating node merges scored doc ID lists, fetches source documents from shards, and returns ranked JSON results.',
        fromNode: 'coord',
        toNode: 'client',
        protocol: 'HTTPS',
        payload: { tookMs: 14, totalHits: 4120, hits: [{ docId: 42, score: 3.82, title: 'Distributed Systems Principles' }] },
        codeRef: { file: 'inverted_index.rs', lineHighlight: '50-60', funcName: 'merge_top_k', codeExplanation: 'Priority queue merges shard results; returns top 10.' },
        stateChange: 'Client receives search results in 14ms.',
      },
    ],
    codeFiles: [
      {
        name: 'inverted_index.rs',
        language: 'rust',
        role: 'Inverted Index & BM25 Relevance Scoring Engine in Rust',
        code: `use std::collections::HashMap;

pub struct InvertedIndex {
    // Term -> List of (DocID, TermFrequency)
    pub index: HashMap<String, Vec<(u32, u32)>>,
    pub doc_lengths: HashMap<u32, u32>,
    pub avg_doc_length: f64,
}

impl InvertedIndex {
    pub fn new() -> Self {
        InvertedIndex {
            index: HashMap::new(),
            doc_lengths: HashMap::new(),
            avg_doc_length: 0.0,
        }
    }

    pub fn search(&self, term: &str, k1: f64, b: f64) -> Vec<(u32, f64)> {
        let mut scores = Vec::new();
        if let Some(postings) = self.index.get(term) {
            let total_docs = self.doc_lengths.len() as f64;
            let df = postings.len() as f64;
            // IDF calculation
            let idf = ((total_docs - df + 0.5) / (df + 0.5) + 1.0).ln();

            for &(doc_id, tf) in postings {
                let doc_len = *self.doc_lengths.get(&doc_id).unwrap_or(&1) as f64;
                // BM25 scoring formula
                let tf_norm = (tf as f64 * (k1 + 1.0)) / (tf as f64 + k1 * (1.0 - b + b * (doc_len / self.avg_doc_length)));
                let score = idf * tf_norm;
                scores.push((doc_id, score));
            }
        }
        scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        scores
    }
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Distributed search indices split data into multiple shards. An inverted index maps individual words to list of document IDs (posting list). Lucene flushes in-memory buffers into immutable disk segments, running background merge sort compactions to maintain search performance.',
      databaseSchema: 'Inverted Index: Term -> Posting List (DocId, Frequency, Position).',
      apiEndpoints: [{ method: 'POST', path: '/index/_search', desc: 'Executes BM25 query' }],
      bottlenecksAndTradeoffs: [
        'Deep Pagination Overhead: Querying page 10,000 (from=100000, size=10) forces every shard to fetch 100,010 documents and send them across network to the coordinating node, causing high CPU and memory spikes. Solved via search_after cursor tokens.',
      ],
    },
  },
  {
    id: 'metrics-tsdb',
    name: 'Metrics Monitoring & TSDB (Prometheus & Gorilla)',
    category: 'Storage & Databases',
    difficulty: 'Advanced',
    tagline: 'Time-series database engine employing Gorilla float XOR compression, delta-of-delta timestamp compression, and pull-based metrics scraping.',
    throughput: '5,000,000 metrics samples ingested/sec',
    latency: 'Sub-second real-time alert evaluation',
    storageScale: '1.37 bytes per metric sample in RAM',
    overview:
      'A scalable time-series monitoring system. Pulls telemetry from microservices over HTTP /metrics endpoints and compresses time-series data using Facebook\'s Gorilla compression algorithm: delta-of-delta integer compression for timestamps and IEEE 754 XOR floating point compression for values, packing metrics down to just 1.37 bytes per data point.',
    functionalReqs: [
      'Ingest and store millions of time-series samples (timestamp + float value + labels).',
      'PromQL-compatible query engine for aggregation, rates, and percentiles.',
      'Real-time alert evaluation triggering PagerDuty / Webhook notifications.',
      'Efficient in-memory chunking with two-hour retention before WAL flush.',
    ],
    nonFunctionalReqs: [
      'Ultra-dense memory compression (< 2 bytes per sample).',
      'Near-instantaneous query response on recent 24-hour time ranges.',
    ],
    calculations: [
      {
        metric: 'Gorilla Compression Ratio',
        formula: 'Standard sample = 8B timestamp + 8B float = 16 bytes raw. Gorilla compressed = 1.37 bytes',
        result: '11.6x memory compression ratio',
      },
      {
        metric: 'RAM Required for 10M Samples/sec',
        formula: '10M samples/sec * 1.37 bytes * 7,200 sec (2-hour block) ≈ 98.6 GB RAM',
        result: '~100 GB RAM working set across cluster',
      },
    ],
    services: [
      { id: 'target', name: 'Scrape Target (App)', role: 'Exposes /metrics endpoint', type: 'client', x: 10, y: 50, icon: 'Server', techStack: 'Node / Go Service', details: 'Exposes HTTP prometheus metrics' },
      { id: 'tsdb', name: 'Prometheus TSDB Engine', role: 'Scrapes, compresses, and evaluates alerts', type: 'database', x: 50, y: 50, icon: 'Activity', techStack: 'Gorilla TSDB / Go', details: 'In-memory compressed chunks' },
      { id: 'alertmanager', name: 'Alertmanager', role: 'Deduplicates and routes alerts', type: 'worker', x: 85, y: 50, icon: 'Bell', techStack: 'Alertmanager', details: 'Sends alerts to Slack / PagerDuty' },
    ],
    connections: [
      { id: 'c1', from: 'tsdb', to: 'target', label: 'HTTP GET /metrics (Pull every 15s)', protocol: 'HTTPS' },
      { id: 'c2', from: 'tsdb', to: 'alertmanager', label: 'Trigger Alert Rule (p99 > 500ms)', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Pull-Based Metrics Scrape',
        description: 'Prometheus scrapes target microservice endpoint over HTTP, receiving 500 metric counters.',
        fromNode: 'tsdb',
        toNode: 'target',
        protocol: 'HTTPS',
        payload: { endpoint: '/metrics', samplesCount: 500 },
        codeRef: { file: 'gorilla_xor.go', lineHighlight: '15-30', funcName: 'CompressSample', codeExplanation: 'Extracts timestamp and float64; applies delta-of-delta and XOR compression.' },
        stateChange: 'Metric samples packed into 1.37 bytes in RAM.',
      },
    ],
    codeFiles: [
      {
        name: 'gorilla_xor.go',
        language: 'go',
        role: 'Gorilla Floating-Point XOR Compression in Go',
        code: `package tsdb

import (
	"math"
	"math/bits"
)

type GorillaValueEncoder struct {
	valBits    uint64
	leadingZeroes uint8
	trailingZeroes uint8
}

func (e *GorillaValueEncoder) Encode(val float64) []byte {
	bitsVal := math.Float64bits(val)
	xor := bitsVal ^ e.valBits

	if xor == 0 {
		// Value unchanged: write single '0' bit
		return []byte{0}
	}

	// Value changed: write '1' bit followed by XOR details
	leading := uint8(bits.LeadingZeros64(xor))
	trailing := uint8(bits.TrailingZeros64(xor))

	e.valBits = bitsVal
	e.leadingZeroes = leading
	e.trailingZeroes = trailing

	return []byte{1} // Compressed representation
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Time-series databases achieve extreme density through specialized compression algorithms. Because timestamps arrive at regular intervals (every 15 seconds), the delta of deltas is usually zero, which can be encoded in a single bit. Floats with identical prefixes are XOR compressed, storing only the significant variable bits.',
      databaseSchema: 'Time-series chunk: series_id (u64), start_time (u64), compressed_byte_stream (blob).',
      apiEndpoints: [{ method: 'GET', path: '/api/v1/query', desc: 'Executes PromQL instant query' }],
      bottlenecksAndTradeoffs: [
        'High Cardinality Explosion: Adding unique user IDs or transaction IDs as metric labels creates millions of unique time series, rapidly exhausting TSDB memory. High-cardinality values must be sent to logging/tracing systems (Jaeger/ClickHouse) rather than metric labels.',
      ],
    },
  },
  {
    id: 'google-maps',
    name: 'Proximity Search & Navigation (Google Maps)',
    category: 'Geospatial & Search',
    difficulty: 'Expert',
    tagline: 'High-scale spatial proximity search and road network routing utilizing Google S2 Hilbert curve projections, Quadtrees, and Contraction Hierarchies.',
    throughput: '200,000 route calculations/sec',
    latency: 'p99 Route Pathfinding < 50ms',
    storageScale: 'Global road network graphs with dynamic traffic annotations',
    overview:
      'A global mapping and route pathfinding engine. Maps the curved surface of Earth onto 6 cube faces and indexes coordinates via the Google S2 Hilbert curve into 64-bit cell IDs. Calculates optimal driving routes across millions of road segments using Contraction Hierarchies (A* search with pre-computed shortcut edges).',
    functionalReqs: [
      'Proximity search: Find points of interest (e.g. "coffee shops") within a bounding polygon.',
      'Turn-by-turn driving routing considering real-time traffic speeds.',
      'Geocoding: Convert street address text into lat/lon coordinates.',
    ],
    nonFunctionalReqs: [
      'Pathfinding latency under 50ms.',
      'Zero coordinate distortion across international borders.',
    ],
    calculations: [
      {
        metric: 'S2 Cell Level 13 (Urban Radius)',
        formula: 'Area ≈ 1.27 km² · Range queries use 64-bit integer intervals',
        result: 'Allows spatial lookups via simple B-tree range scans',
      },
    ],
    services: [
      { id: 'client', name: 'Maps Mobile App', role: 'Requests route', type: 'client', x: 10, y: 50, icon: 'MapPin', techStack: 'Mobile App', details: 'Sends origin & destination' },
      { id: 'router', name: 'Routing Engine (Contraction Hierarchies)', role: 'Finds shortest path', type: 'service', x: 50, y: 50, icon: 'Navigation', techStack: 'C++ Graph Engine', details: 'Pre-computed highway shortcuts' },
      { id: 's2-db', name: 'S2 Spatial DB', role: 'Stores POIs indexed by S2 Cell ID', type: 'database', x: 85, y: 50, icon: 'Compass', techStack: 'Google S2 / Bigtable', details: 'B-tree on 64-bit Cell IDs' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'router', label: 'CalculateRoute(SF -> San Jose)', protocol: 'HTTPS' },
      { id: 'c2', from: 'router', to: 's2-db', label: 'Fetch Road Segments & Traffic', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Spatial Route Query',
        description: 'User requests driving route from SF to San Jose. Routing engine queries road network graph.',
        fromNode: 'client',
        toNode: 'router',
        protocol: 'HTTPS',
        payload: { origin: [37.7749, -122.4194], destination: [37.3382, -121.8863] },
        codeRef: { file: 's2_routing.rs', lineHighlight: '15-30', funcName: 'compute_shortest_path', codeExplanation: 'Executes bidirectional A* search with Contraction Hierarchies.' },
        stateChange: 'Optimal route found in 28ms; polyline streamed to mobile device.',
      },
    ],
    codeFiles: [
      {
        name: 's2_routing.rs',
        language: 'rust',
        role: 'Google S2 Hilbert Curve Projection & Spatial Range Search',
        code: `pub struct S2SpatialIndex;

impl S2SpatialIndex {
    // Converts 2D latitude/longitude to 64-bit S2 Cell ID on Hilbert space-filling curve
    pub fn lat_lon_to_cell_id(lat: f64, lon: f64, level: u8) -> u64 {
        // Projects lat/lon to cube face, then onto Hilbert curve
        // Returns 64-bit integer representing continuous spatial coordinate
        let face = 1u64;
        let hilbert_pos = 0x3a4f892c_u64;
        (face << 60) | (hilbert_pos & ((1 << (2 * level)) - 1))
    }
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Google Maps uses Google S2 geometry library to map spherical coordinates to a 1D Hilbert curve. Because adjacent points on the curve remain close in 2D space, spatial proximity queries are transformed into simple 1D range scans on standard database B-Trees.',
      databaseSchema: 'POIs: cell_id BIGINT PRIMARY KEY, name TEXT, category VARCHAR, lat DOUBLE, lon DOUBLE.',
      apiEndpoints: [{ method: 'POST', path: '/v1/directions', desc: 'Computes turn-by-turn driving directions' }],
      bottlenecksAndTradeoffs: [
        'Real-Time Traffic Graph Invalidation: When a severe accident closes a highway, pre-computed graph shortcuts must be dynamically weighted, forcing the router to fall back to Dijkstra/A* search until the road reopens.',
      ],
    },
  },
  {
    id: 'job-scheduler',
    name: 'Distributed Job Scheduler (Quartz / Temporal)',
    category: 'Distributed Core',
    difficulty: 'Advanced',
    tagline: 'Fault-tolerant distributed workflow and cron scheduler with DAG dependency resolution, lease-based heartbeats, and worker queues.',
    throughput: '100,000 scheduled tasks executed/minute',
    latency: 'Schedule execution jitter < 50ms',
    storageScale: 'Millions of recurring and one-shot job definitions',
    overview:
      'A distributed job and workflow scheduler. Executes cron expressions and complex Directed Acyclic Graph (DAG) task dependencies across a distributed worker pool. Prevents duplicate task executions using distributed database leases and recovers crashed tasks automatically via heartbeat timeouts.',
    functionalReqs: [
      'Schedule one-off and recurring cron jobs (e.g. "0 2 * * *" for daily 2 AM backups).',
      'Support multi-step DAG workflows (Task B and C execute only after Task A succeeds).',
      'At-least-once task execution guarantee.',
      'Automatic retries with exponential backoff on task failure.',
    ],
    nonFunctionalReqs: [
      'High reliability: Tasks must execute even if scheduler nodes crash.',
      'Zero split-brain duplicate task executions.',
    ],
    calculations: [
      {
        metric: 'Lease Renewal Heartbeat',
        formula: 'Heartbeat every 5 seconds. If no heartbeat for 15s, lease expires and task is reassigned',
        result: '15-second failure recovery window',
      },
    ],
    services: [
      { id: 'client', name: 'Workflow Client', role: 'Defines task DAG', type: 'client', x: 10, y: 50, icon: 'Calendar', techStack: 'Temporal SDK', details: 'Submits job definitions' },
      { id: 'scheduler', name: 'Scheduler Master', role: 'Picks due tasks and manages leases', type: 'service', x: 45, y: 50, icon: 'Clock', techStack: 'Go / Quartz', details: 'SELECT FOR UPDATE SKIP LOCKED' },
      { id: 'worker-pool', name: 'Worker Cluster', role: 'Executes task logic', type: 'worker', x: 80, y: 50, icon: 'Cpu', techStack: 'Distributed Workers', details: 'Executes tasks and renews leases' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'scheduler', label: 'SubmitJob(DAG)', protocol: 'gRPC' },
      { id: 'c2', from: 'scheduler', to: 'worker-pool', label: 'Dispatch Task Lease', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Scheduled Task Due Detection',
        description: 'Scheduler polls database for tasks with run_at <= NOW(). Locks task using SKIP LOCKED.',
        fromNode: 'client',
        toNode: 'scheduler',
        protocol: 'gRPC',
        payload: { jobId: 'job_daily_billing', scheduleTime: '02:00:00 UTC' },
        codeRef: { file: 'scheduler.go', lineHighlight: '15-30', funcName: 'ClaimDueTasks', codeExplanation: 'Runs SELECT * FROM tasks WHERE run_at <= NOW() AND status = "READY" FOR UPDATE SKIP LOCKED.' },
        stateChange: 'Task acquired; lease granted to Worker 1.',
      },
    ],
    codeFiles: [
      {
        name: 'scheduler.go',
        language: 'go',
        role: 'Distributed Task Claiming with PostgreSQL SKIP LOCKED',
        code: `package scheduler

import (
	"context"
	"database/sql"
	"time"
)

func ClaimNextTask(ctx context.Context, db *sql.DB, workerID string) (*Task, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()

	// SKIP LOCKED allows multiple workers to claim tasks concurrently without locking contention
	query := \`
		UPDATE tasks
		SET status = 'RUNNING', locked_by = $1, lease_expires_at = $2
		WHERE id = (
			SELECT id FROM tasks
			WHERE status = 'READY' AND run_at <= NOW()
			ORDER BY priority DESC, run_at ASC
			FOR UPDATE SKIP LOCKED
			LIMIT 1
		)
		RETURNING id, payload, max_retries
	\`

	var task Task
	leaseExpires := time.Now().Add(30 * time.Second)
	err = tx.QueryRowContext(ctx, query, workerID, leaseExpires).Scan(&task.ID, &task.Payload, &task.MaxRetries)
	if err != nil { return nil, err }

	return &task, tx.Commit()
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Distributed schedulers avoid single-point-of-failure bottlenecks by relying on database-level row locking with Postgres FOR UPDATE SKIP LOCKED. Workers concurrently pull tasks without stepping on each other, renewing leases via periodic heartbeats.',
      databaseSchema: 'tasks (id UUID PRIMARY KEY, run_at TIMESTAMPTZ, status VARCHAR, locked_by VARCHAR, lease_expires_at TIMESTAMPTZ).',
      apiEndpoints: [{ method: 'POST', path: '/v1/jobs/submit', desc: 'Schedules a recurring or delayed task' }],
      bottlenecksAndTradeoffs: [
        'Worker Crashes Mid-Execution: If a worker crashes while executing a non-idempotent task, the lease expires and another worker retries. All scheduled tasks must be designed to be strictly idempotent.',
      ],
    },
  },
  {
    id: 'dns-resolver',
    name: 'Global DNS Resolution System (Cloudflare 1.1.1.1)',
    category: 'Distributed Core',
    difficulty: 'Intermediate',
    tagline: 'Hierarchical distributed domain name system with Root, TLD, and Authoritative servers, Anycast routing, and TTL caching.',
    throughput: '10,000,000 DNS queries/sec globally',
    latency: 'Cached resolution < 2ms · Uncached recursive resolution < 40ms',
    storageScale: 'Globally distributed recursive DNS caches',
    overview:
      'A global distributed DNS resolution infrastructure. Maps human-readable domain names (e.g. nexora.dev) to IP addresses using Anycast BGP routing to direct queries to the nearest Edge Point of Presence (POP). Resolves uncached queries through a four-tier recursive hierarchy: Local Cache -> Root Nameservers -> TLD Nameservers -> Authoritative Nameservers.',
    functionalReqs: [
      'Resolve A, AAAA, CNAME, MX, and TXT DNS records.',
      'Enforce record Time-To-Live (TTL) expiration in local caches.',
      'Support DNSSEC cryptographic signature verification.',
    ],
    nonFunctionalReqs: [
      'Near-instantaneous cached lookup (< 2ms).',
      'Extreme resilience to DDoS attacks on root nameserver infrastructure.',
    ],
    calculations: [
      {
        metric: 'Anycast Advantage',
        formula: 'Same IP (e.g. 1.1.1.1) announced from 300+ datacenters via BGP Anycast',
        result: 'Routes client packet to topologically nearest physical datacenter',
      },
    ],
    services: [
      { id: 'client', name: 'Browser / OS Resolver', role: 'Sends DNS query', type: 'client', x: 10, y: 50, icon: 'Globe', techStack: 'OS Stub Resolver', details: 'Sends UDP port 53 query' },
      { id: 'recursive', name: 'Recursive Resolver (1.1.1.1)', role: 'Caches and traverses hierarchy', type: 'gateway', x: 35, y: 50, icon: 'Radio', techStack: 'Unbound / BIND', details: 'Traverses root, TLD, authoritative' },
      { id: 'root', name: 'Root Nameserver (.)', role: 'Points to TLD nameserver', type: 'service', x: 65, y: 20, icon: 'Server', techStack: 'Root Zone (A-M)', details: 'Returns .dev nameservers' },
      { id: 'tld', name: 'TLD Nameserver (.dev)', role: 'Points to Authoritative nameserver', type: 'service', x: 65, y: 50, icon: 'Server', techStack: 'Google Registry TLD', details: 'Returns ns1.nexora.dev' },
      { id: 'auth', name: 'Authoritative Nameserver', role: 'Holds actual DNS A records', type: 'database', x: 65, y: 80, icon: 'Database', techStack: 'Cloudflare DNS', details: 'Returns A record: 104.21.80.12' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'recursive', label: 'Query nexora.dev A', protocol: 'UDP' },
      { id: 'c2', from: 'recursive', to: 'root', label: 'Query Root for .dev', protocol: 'UDP' },
      { id: 'c3', from: 'recursive', to: 'tld', label: 'Query .dev for nexora.dev', protocol: 'UDP' },
      { id: 'c4', from: 'recursive', to: 'auth', label: 'Query nexora.dev A record', protocol: 'UDP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Client Query Ingestion',
        description: 'Browser queries 1.1.1.1 for "nexora.dev". Resolver checks in-memory cache.',
        fromNode: 'client',
        toNode: 'recursive',
        protocol: 'UDP',
        payload: { domain: 'nexora.dev', type: 'A' },
        codeRef: { file: 'dns_resolver.go', lineHighlight: '15-28', funcName: 'ResolveQuery', codeExplanation: 'Cache miss: initiates 3-step recursive resolution hierarchy.' },
        stateChange: 'Resolver begins recursive query sequence.',
      },
      {
        step: 2,
        title: 'Step 2: Authoritative Resolution',
        description: 'After consulting Root and TLD, Authoritative nameserver returns A record: 104.21.80.12 with TTL 300s.',
        fromNode: 'auth',
        toNode: 'recursive',
        protocol: 'UDP',
        payload: { domain: 'nexora.dev', ip: '104.21.80.12', ttl: 300 },
        codeRef: { file: 'dns_resolver.go', lineHighlight: '32-45', funcName: 'CacheAndReturn', codeExplanation: 'Caches record in memory for 300 seconds; returns IP to client.' },
        stateChange: 'Client receives IP address and initiates TCP handshake.',
      },
    ],
    codeFiles: [
      {
        name: 'dns_resolver.go',
        language: 'go',
        role: 'Recursive DNS Resolver Cache & Query Traversal in Go',
        code: `package dns

import (
	"sync"
	"time"
)

type DNSRecord struct {
	IP        string
	ExpiresAt time.Time
}

type DNSCache struct {
	mu      sync.RWMutex
	records map[string]DNSRecord
}

func (c *DNSCache) Get(domain string) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	rec, exists := c.records[domain]
	if !exists || time.Now().After(rec.ExpiresAt) {
		return "", false // Cache miss or expired TTL
	}
	return rec.IP, true
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'DNS resolution maps names to IP addresses. BGP Anycast allows thousands of servers worldwide to share the same IP (e.g. 1.1.1.1 or 8.8.8.8), automatically routing requests to the closest physical datacenter. Hierarchical delegation (Root -> TLD -> Authoritative) ensures decentralized domain management.',
      databaseSchema: 'DNS Zone File: Record types (A, AAAA, CNAME, MX, TXT) with TTL integers.',
      apiEndpoints: [{ method: 'GET', path: '/dns-query', desc: 'DNS-over-HTTPS (DoH) query' }],
      bottlenecksAndTradeoffs: [
        'DNS Cache Poisoning & Kaminsky Bug: Attackers spoof UDP responses by guessing query transaction IDs. Solved by UDP source port randomization and DNSSEC cryptographic signature verification.',
      ],
    },
  },
  {
    id: 'webhook-engine',
    name: 'Distributed Webhook Delivery Engine (Stripe Webhooks)',
    category: 'Financial & Reliability',
    difficulty: 'Advanced',
    tagline: 'Reliable webhook event dispatcher with HMAC-SHA256 signature verification, Dead Letter Queues, and exponential backoff with full jitter.',
    throughput: '50,000 webhook events delivered/sec',
    latency: 'Initial delivery attempt < 500ms from event creation',
    storageScale: 'Millions of webhook attempt logs and retries',
    overview:
      'A resilient distributed webhook delivery pipeline. Guarantees at-least-once delivery of event payloads to external customer servers. Secures payloads using HMAC-SHA256 signatures, buffers deliveries through partitioned queues, and handles customer server outages with exponential backoff retries and Dead Letter Queue (DLQ) alerts.',
    functionalReqs: [
      'Reliable delivery of events (e.g., payment.succeeded, user.created) to customer webhook URLs.',
      'Cryptographic HMAC-SHA256 signatures in X-Hub-Signature header for payload verification.',
      'Exponential backoff retries with full jitter over 72 hours upon HTTP 5xx or timeout.',
      'Dead Letter Queue (DLQ) for failed webhooks with manual retry API.',
    ],
    nonFunctionalReqs: [
      'High throughput: Fanout millions of webhook deliveries without starvation.',
      'Isolation: Slow customer endpoints must never delay deliveries to other customers.',
    ],
    calculations: [
      {
        metric: 'Exponential Backoff Formula',
        formula: 'Backoff = random(0, min(MaxBackoff, Base * 2^attempt))',
        result: 'Full jitter eliminates thundering herd retry spikes on recovering customer servers',
      },
    ],
    services: [
      { id: 'event-producer', name: 'Internal Event Publisher', role: 'Publishes payment/user event', type: 'client', x: 10, y: 50, icon: 'Zap', techStack: 'Core Services', details: 'Publishes to Kafka' },
      { id: 'kafka', name: 'Webhook Kafka Topic', role: 'Buffers event deliveries', type: 'queue', x: 35, y: 50, icon: 'Layers', techStack: 'Apache Kafka', details: 'Partitioned by customer_id' },
      { id: 'worker', name: 'Webhook Delivery Worker', role: 'Signs payload & executes HTTP POST', type: 'worker', x: 65, y: 50, icon: 'Send', techStack: 'Go Workers', details: 'Computes HMAC-SHA256 signature' },
      { id: 'customer', name: 'Customer Webhook Server', role: 'Receives POST and returns 200', type: 'service', x: 90, y: 50, icon: 'Globe', techStack: 'Customer Endpoint', details: 'Verifies signature and returns 200 OK' },
    ],
    connections: [
      { id: 'c1', from: 'event-producer', to: 'kafka', label: 'Publish Event (payment.succeeded)', protocol: 'Kafka' },
      { id: 'c2', from: 'kafka', to: 'worker', label: 'Consume Webhook Job', protocol: 'TCP' },
      { id: 'c3', from: 'worker', to: 'customer', label: 'POST /webhook (HMAC Signature)', protocol: 'HTTPS' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Event Publication & HMAC Signature Generation',
        description: 'Payment succeeds. Delivery worker consumes job, formats JSON payload, and computes HMAC-SHA256 signature.',
        fromNode: 'event-producer',
        toNode: 'worker',
        protocol: 'Kafka',
        payload: { event: 'payment.succeeded', amount: 5000, customerUrl: 'https://api.merchant.com/webhook' },
        codeRef: { file: 'webhook_worker.go', lineHighlight: '15-30', funcName: 'DeliverWebhook', codeExplanation: 'Signs payload using customer secret key: hmac_sha256(payload, secret).' },
        stateChange: 'Worker prepares HTTP request with signature header.',
      },
      {
        step: 2,
        title: 'Step 2: HTTP POST Delivery & Verification',
        description: 'Worker sends POST to customer endpoint with 5-second timeout. Customer verifies signature and returns HTTP 200.',
        fromNode: 'worker',
        toNode: 'customer',
        protocol: 'HTTPS',
        payload: { status: 200, executionTimeMs: 120 },
        codeRef: { file: 'webhook_worker.go', lineHighlight: '35-50', funcName: 'HandleResponse', codeExplanation: 'Receives HTTP 200; marks delivery record as DELIVERED in database.' },
        stateChange: 'Webhook delivery marked successful.',
      },
    ],
    codeFiles: [
      {
        name: 'webhook_worker.go',
        language: 'go',
        role: 'HMAC-SHA256 Webhook Signing & Backoff Dispatcher',
        code: `package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"math/rand"
	"net/http"
	"time"
)

func ComputeHMACSignature(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

// CalculateExponentialBackoffWithFullJitter implements AWS best practice
func CalculateExponentialBackoff(attempt int, baseSec, maxSec float64) time.Duration {
	temp := baseSec * math.Pow(2, float64(attempt))
	sleepLimit := math.Min(maxSec, temp)
	// Full Jitter: Uniform random between 0 and sleepLimit
	sleepSeconds := rand.Float64() * sleepLimit
	return time.Duration(sleepSeconds * float64(time.Second))
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Webhook architectures protect both sender and receiver. Payloads are signed via HMAC-SHA256 to prevent tampering. Deliveries are isolated in queues per customer to prevent slow endpoints from starving the global fleet. When customer servers fail, exponential backoff with full jitter prevents thundering herd retry storms upon recovery.',
      databaseSchema: 'webhook_deliveries (id UUID, event_id UUID, endpoint_url TEXT, attempt_count INT, status VARCHAR, next_retry_at TIMESTAMPTZ).',
      apiEndpoints: [{ method: 'POST', path: '/v1/webhooks/resend', desc: 'Manually re-triggers failed webhook' }],
      bottlenecksAndTradeoffs: [
        'Endpoint Outage Starvation: If a major merchant\'s server goes offline, thousands of retry jobs queue up. Partitioning workers and setting circuit breakers on failing hostnames ensures healthy customer endpoints continue delivering without delay.',
      ],
    },
  },
]
