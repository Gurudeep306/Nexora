import type { SystemDeepExploration } from '../systemDeepExplorationRegistry'

export const INFRA_DEEP_EXPLORATION: Record<string, SystemDeepExploration> = {
  'api-gateway': {
    systemId: 'api-gateway',
    executiveArchitectureSummary:
      'A high-performance L7 cloud API gateway and reverse proxy modeled on Envoy Proxy and Kong, delivering 250,000+ req/sec per instance with sub-1.5ms proxy overhead, non-blocking epoll event loops, local cryptographic JWT validation, and dynamic service discovery.',
    problemStatementAndWhyHard:
      'If each microservice handles its own TLS termination, CORS headers, rate limiting, and JWT validation, security policies desynchronize and latency multiplies. An API Gateway must act as the unified front door, validating security claims in < 0.2ms while avoiding becoming a single point of failure or bottleneck.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Public Client', action: 'Sends HTTPS POST /api/v1/orders with Authorization: Bearer <jwt>.', latencyEstimate: '1.2ms', protocol: 'HTTPS / TLS 1.3' },
      { stepNumber: 2, component: 'Envoy L7 Listener', action: 'Non-blocking epoll thread accepts TCP connection; terminates TLS using hardware AES-NI instructions.', latencyEstimate: '0.4ms', protocol: 'Linux epoll / OpenSSL' },
      { stepNumber: 3, component: 'JWT Cryptographic Filter', action: 'Validates RS256 token signature locally using cached JWKS public keys; verifies exp and scope claims in memory.', latencyEstimate: '0.15ms', protocol: 'In-Memory RSA Check' },
      { stepNumber: 4, component: 'Dynamic Route Matcher', action: 'Evaluates URL path against route table; selects upstream cluster (order-service).', latencyEstimate: '0.05ms', protocol: 'Trie Route Table' },
      { stepNumber: 5, component: 'Upstream gRPC Proxy', action: 'Multiplexes HTTP/2 or gRPC request to healthy backend pod with mTLS; streams response back to client.', latencyEstimate: '1.5ms', protocol: 'gRPC over HTTP/2' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Control Plane (xDS / Kubernetes)', action: 'New order-service pod is scheduled; registers IP with Kubernetes endpoint API.', latencyEstimate: '50ms', protocol: 'Kubernetes Controller' },
      { stepNumber: 2, component: 'Envoy Dynamic xDS Stream', action: 'Control plane pushes updated Endpoint Discovery Service (EDS) configuration to Envoy instances.', latencyEstimate: '5.0ms', protocol: 'gRPC xDS Stream' },
      { stepNumber: 3, component: 'Zero-Downtime Hot Reload', action: 'Envoy updates internal upstream host table atomically without restarting the process or dropping active connections.', latencyEstimate: '0.01ms', protocol: 'RCU Pointer Swap' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'In-Memory Configuration Trie & JWKS Cache',
        entity: 'Route Table & Keys',
        primaryKey: 'Route Pattern String',
        partitionKey: 'Domain / Host Header',
        schemaDefinition: 'struct RouteEntry { string prefix; Cluster* target_cluster; RateLimitPolicy* rate_limit; HeaderMutations headers; };',
        indexingRationale: 'Radix tree path matching enables O(K) URL resolution where K is the length of the path string, unaffected by the number of total routes.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Authentication: Call Auth Microservice vs Verify JWT Cryptographically at Gateway',
        chosenApproach: 'Verify JWT signature locally using cached JWKS public keys',
        rejectedAlternative: 'Make internal RPC call to Auth Service on every request',
        rationale: 'Calling an Auth service on every API call doubles internal network traffic and adds 5-10ms latency. Local RS256 signature verification takes 0.15ms with 0 network calls.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Upstream Microservice Brownout (Latency spikes to 10 seconds)',
        impact: 'Gateway worker threads risk becoming blocked waiting for slow responses.',
        detectionMechanism: 'Outlier Detection: Tracks 5xx error rate and P99 response time.',
        automatedRecovery: 'Circuit Breaker Ejection: Gateway automatically trips circuit breaker and temporarily removes failing pods from the load balancing pool; returns HTTP 503 instantly in < 1ms.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Gateway Instance Capacity', assumption: 'Modern 16-core cloud VM with 10Gbps NIC', calculation: 'Non-blocking event loop handles ~250,000 req/sec at < 2ms latency', finalRequirement: 'A fleet of 10 Envoy pods handles 2.5 Million aggregate QPS.' },
    ],
  },

  'cdn-network': {
    systemId: 'cdn-network',
    executiveArchitectureSummary:
      'A global edge Content Delivery Network (CDN) architecture modeled on Cloudflare and Fastly, delivering static assets, media, and dynamic API responses with sub-15ms edge latency using Anycast BGP routing, Tiered Origin Shields, and Stale-While-Revalidate caching.',
    problemStatementAndWhyHard:
      'Serving web assets directly from an origin datacenter forces global users in Tokyo, London, and Sydney to endure 200ms+ trans-oceanic network roundtrips. When a viral asset expires, millions of concurrent edge requests can simultaneously query the origin, causing catastrophic "Origin Stampedes" (Thundering Herds).',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Global Client Browser', action: 'Issues HTTP GET /bundle.js. Anycast BGP routes IP packets to the geographically closest Point of Presence (POP).', latencyEstimate: '4.5ms', protocol: 'BGP Anycast + QUIC' },
      { stepNumber: 2, component: 'Edge POP L1 RAM Cache', action: 'Edge proxy checks local in-memory RAM cache; serves in 0.5ms if hot.', latencyEstimate: '0.5ms', protocol: 'In-Memory Cache' },
      { stepNumber: 3, component: 'Edge POP L2 NVMe Cache', action: 'If L1 miss: checks high-speed local NVMe SSD cache; serves in 2.5ms.', latencyEstimate: '2.5ms', protocol: 'NVMe File Read' },
      { stepNumber: 4, component: 'Origin Shield POP Query', action: 'If POP miss: routes request to centralized Regional Origin Shield POP.', latencyEstimate: '15ms', protocol: 'Private Backbone TCP' },
      { stepNumber: 5, component: 'Single Origin Fetch & Collapse', action: 'Origin Shield collapses duplicate misses into 1 request to customer origin server; streams response back and warms edge caches.', latencyEstimate: '65ms', protocol: 'HTTPS Origin Fetch' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Customer Deployment Pipeline', action: 'New website bundle deployed: POST /api/v1/purge {urls: ["/bundle.js"]}.', latencyEstimate: '12ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Global Invalidation Broadcast', action: 'Purge message broadcasted over global fiber mesh to all 300+ edge POPs in under 150ms.', latencyEstimate: '120ms', protocol: 'Mesh Pub/Sub' },
      { stepNumber: 3, component: 'Edge Cache Eviction', action: 'Edge nodes mark URL cache entries as invalidated or stale.', latencyEstimate: '0.5ms', protocol: 'Atomic Flag Set' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Tiered NVMe SSD + RAM Cache',
        entity: 'Edge Cache Store',
        primaryKey: 'Cache Key: MD5(Host + URL + Vary Headers)',
        partitionKey: 'URL Path',
        schemaDefinition: 'struct CacheItem { string key; HTTPHeaders headers; int64 body_offset; int64 ttl; bool stale_while_revalidate; };',
        indexingRationale: 'Two-tier cache: RAM for top 5% hottest web assets; fast NVMe SSD for remaining 95% working set.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Routing Mechanism: Geo-DNS vs Anycast BGP',
        chosenApproach: 'Anycast BGP (same IP address announced from all global POPs)',
        rejectedAlternative: 'Geo-DNS routing based on client DNS resolver IP',
        rationale: 'Geo-DNS routes traffic based on the user\'s DNS server (e.g. Google 8.8.8.8) rather than their physical device, causing poor routing. BGP Anycast routes at the router level to the physically nearest datacenter.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Origin Datacenter Goes Completely Offline',
        impact: 'Origin fetches return HTTP 502 / 504 errors.',
        detectionMechanism: 'Edge proxy receives TCP connection refused from origin.',
        automatedRecovery: 'Stale-While-Revalidate: Edge POP serves stale cached version of the website to users while continuously probing origin health in background, delivering 100% uptime.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Global Cache Hit Ratio Target', assumption: 'Enterprise web traffic with standard static assets', calculation: 'Target 95% to 98% edge cache hit ratio', finalRequirement: 'Cuts customer origin server infrastructure costs by 95%.' },
    ],
  },

  'metrics-tsdb': {
    systemId: 'metrics-tsdb',
    executiveArchitectureSummary:
      'A high-throughput time-series database (TSDB) engine modeled on Prometheus and Facebook Gorilla, ingesting millions of metric data points/sec with 12x storage compression using delta-of-delta timestamp encoding and XOR floating-point compression.',
    problemStatementAndWhyHard:
      'Storing metric data points (Timestamp: 8 bytes, Value: 8 bytes = 16 bytes per sample) uncompressed requires hundreds of gigabytes per hour. Gorilla compression takes advantage of the fact that metrics arrive at predictable intervals and float values change slightly between samples, compressing 16 bytes down to an average of 1.37 bytes.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Grafana Dashboard / PromQL Client', action: 'Queries metric range: `rate(http_requests_total{status="500"}[5m])`.', latencyEstimate: '1.2ms', protocol: 'HTTP GET' },
      { stepNumber: 2, component: 'TSDB Inverted Index (Head Chunk)', action: 'Queries inverted label index to find metric series matching {__name__="http_requests_total", status="500"}.', latencyEstimate: '2.5ms', protocol: 'In-Memory Posting List' },
      { stepNumber: 3, component: 'Chunk Decompression & Vector Scan', action: 'Reads compressed 2-hour chunks; decompresses delta-of-delta timestamps and XOR floats via bitstream reader.', latencyEstimate: '4.8ms', protocol: 'Gorilla Bitstream' },
      { stepNumber: 4, component: 'Rate Aggregation & Return', action: 'Computes derivative rate across timestamps; returns JSON time-series matrix to Grafana in 18ms.', latencyEstimate: '3.5ms', protocol: 'HTTP Response' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Pull Scraper / Push Gateway', action: 'Scrapes /metrics endpoint from 10,000 application pods every 15 seconds.', latencyEstimate: '25ms', protocol: 'HTTP GET' },
      { stepNumber: 2, component: 'Head Chunk Ingestion', action: 'Locates in-memory active chunk for metric series; appends sample (t, v).', latencyEstimate: '0.02ms', protocol: 'In-Memory RAM' },
      { stepNumber: 3, component: 'Gorilla Compression Engine', action: 'Computes delta-of-delta timestamp: D = (t_now - t_prev) - (t_prev - t_prev2). If D=0: encodes 1 bit "0". Encodes float value via XOR with previous float.', latencyEstimate: '0.01ms', protocol: 'Bitwise ALU' },
      { stepNumber: 4, component: 'WAL (Write-Ahead Log) Append', action: 'Appends raw sample to memory-mapped sequential WAL on NVMe SSD for crash recovery.', latencyEstimate: '0.15ms', protocol: 'write(2)' },
      { stepNumber: 5, component: '2-Hour Block Cut & Compaction', action: 'Every 2 hours: freezes active head chunk, writes immutable compressed chunk to disk, truncates WAL.', latencyEstimate: '150ms', protocol: 'Async OS File Sync' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Gorilla Compressed Block Files (.chunk, .index)',
        entity: 'Time-Series Chunk',
        primaryKey: 'Series ID (Labels Hash) + MinTime',
        partitionKey: '2-Hour Time Window',
        schemaDefinition: 'struct MetricChunk { uint64_t series_id; uint64_t min_time; uint64_t max_time; uint8_t compressed_bytes[]; };',
        indexingRationale: 'Labels inverted index maps label pairs (e.g. env="prod") to series ID posting lists, allowing instantaneous multi-dimensional filtering.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Data Model: Relational Row per Sample vs Columnar Compressed Chunks',
        chosenApproach: 'Gorilla Compressed Columnar 2-Hour Chunks',
        rejectedAlternative: 'SQL table: (metric_name, timestamp, value)',
        rationale: 'Relational tables require 16 bytes per sample plus B+Tree index overhead. Gorilla compresses this to 1.37 bytes (12x reduction), allowing a single server to retain billions of samples in RAM.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Prometheus Server Process Crash / Power Loss',
        impact: 'Active un-flushed head chunks in RAM are lost.',
        detectionMechanism: 'Process restarts.',
        automatedRecovery: 'WAL Replay: On startup, engine replays the append-only Write-Ahead Log from NVMe SSD, restoring 100% of in-memory chunks without sample loss.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Ingestion Volume', assumption: '2,000,000 samples/sec ingested across fleet', calculation: '2,000,000 * 1.37 bytes/sample ≈ 2.74 MB/sec = ~9.8 GB/hour', finalRequirement: 'A single standard server stores 24 hours of 2M QPS metrics in ~235 GB disk space.' },
    ],
  },

  'job-scheduler': {
    systemId: 'job-scheduler',
    executiveArchitectureSummary:
      'A fault-tolerant distributed job and workflow scheduler modeled on Temporal and Quartz, managing millions of scheduled cron tasks and multi-step DAG workflows with distributed heartbeat leases, hierarchical time-wheels, and dead-letter queue (DLQ) retry policies.',
    problemStatementAndWhyHard:
      'Running cron jobs on a single server causes catastrophic duplicate executions or silent missed executions during machine reboots. In a distributed environment, ensuring that exactly one worker executes a scheduled task without race conditions or split-brain execution requires distributed leader leasing and state-machine persistence.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Admin Dashboard / CLI', action: 'Queries job execution status: GET /api/v1/jobs/{jobId}/runs.', latencyEstimate: '1.2ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Scheduler State Store', action: 'Fetches workflow execution history and event log from PostgreSQL / Cassandra.', latencyEstimate: '4.5ms', protocol: 'SQL over TCP' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Client API Ingestion', action: 'Schedules recurring cron job: POST /api/v1/jobs {schedule: "0 0 * * *", task: "generate_invoices"}.', latencyEstimate: '2.0ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Hierarchical Time-Wheel Enqueue', action: 'Scheduler evaluates next execution timestamp; inserts task token into in-memory Hierarchical Timing Wheel.', latencyEstimate: '0.05ms', protocol: 'In-Memory Ring' },
      { stepNumber: 3, component: 'Trigger & Worker Dispatch', action: 'When wheel ticks to target second: pops task; acquires distributed lease in Redis; dispatches task payload to Kafka worker topic.', latencyEstimate: '2.5ms', protocol: 'Kafka Producer' },
      { stepNumber: 4, component: 'Worker Heartbeat Execution', action: 'Worker claims task, emits heartbeat pings every 5s while processing; updates status to Completed upon success.', latencyEstimate: '500ms', protocol: 'gRPC Heartbeat' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Relational Database (PostgreSQL) + Redis Lease',
        entity: 'scheduled_jobs',
        primaryKey: 'job_id UUID',
        partitionKey: 'next_run_at TIMESTAMPTZ',
        schemaDefinition: 'CREATE TABLE scheduled_jobs (job_id UUID PRIMARY KEY, name VARCHAR(128) NOT NULL, cron_expression VARCHAR(64), payload JSONB, next_run_at TIMESTAMPTZ NOT NULL, status VARCHAR(32) NOT NULL, locked_until TIMESTAMPTZ, locked_by VARCHAR(64), INDEX idx_next_run (next_run_at, status));',
        indexingRationale: 'Compound index on (next_run_at, status) allows the scheduler poll thread to find upcoming tasks via fast index range scans.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Timer Implementation: Database Polling vs In-Memory Hierarchical Timing Wheel',
        chosenApproach: 'Hierarchical Timing Wheel (Kafka/Netty style)',
        rejectedAlternative: 'Polling SQL database `WHERE next_run_at <= NOW()` every second',
        rationale: 'Database polling causes heavy table lock contention and disk I/O when checking millions of timers. Timing wheels process timer expirations in O(1) constant time in RAM.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Worker Pod Dies mid-execution of a 30-minute task',
        impact: 'Task hangs in In-Progress state.',
        detectionMechanism: 'Heartbeat Lease Expiration: Worker fails to renew locked_until lease within 15 seconds.',
        automatedRecovery: 'Automatic Re-queue: Scheduler detects expired lease, resets task status to Pending, and dispatches it to a healthy worker pod.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Task Execution Volume', assumption: '10 million scheduled jobs executed per day', calculation: '10,000,000 / 86,400 ≈ 115 jobs/sec average (Peak: 1,500/sec)', finalRequirement: 'Easily coordinated by a cluster of 3 scheduler leaders and 50 worker pods.' },
    ],
  },

  'dns-resolver': {
    systemId: 'dns-resolver',
    executiveArchitectureSummary:
      'A high-performance recursive DNS resolver architecture modeled on Cloudflare 1.1.1.1 and Google 8.8.8.8, resolving domain names across Root, TLD, and Authoritative nameservers in under 10ms using Anycast BGP, in-memory TTL caching, and DNSSEC cryptographic validation.',
    problemStatementAndWhyHard:
      'DNS resolution is the foundational gateway of the internet. A full recursive lookup requires 3 consecutive network queries (Root DNS -> .com TLD -> example.com Authoritative server), taking 150ms+. Resolvers must cache millions of Resource Records (A, AAAA, CNAME) in RAM, validate DNSSEC cryptographic signatures, and handle UDP packet amplification attacks.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Client Operating System', action: 'Sends UDP DNS query: Question: example.com, Type: A, ID: 0x4f82 to Anycast IP 1.1.1.1:53.', latencyEstimate: '2.5ms', protocol: 'UDP Port 53' },
      { stepNumber: 2, component: 'In-Memory RR Cache Check', action: 'Resolver queries local memory cache. If record exists and TTL > 0: returns response immediately in 0.2ms.', latencyEstimate: '0.2ms', protocol: 'In-Memory Hash Table' },
      { stepNumber: 3, component: 'Root Nameserver Query (if miss)', action: 'Queries Root server (.) for .com NS delegation referral.', latencyEstimate: '12ms', protocol: 'UDP 53' },
      { stepNumber: 4, component: 'TLD Nameserver Query', action: 'Queries .com TLD nameserver for example.com authoritative NS delegation.', latencyEstimate: '14ms', protocol: 'UDP 53' },
      { stepNumber: 5, component: 'Authoritative Nameserver Query & Return', action: 'Queries Authoritative NS; validates DNSSEC signature chain; caches answer in memory with TTL; returns IP address 93.184.216.34 to client.', latencyEstimate: '18ms', protocol: 'UDP 53' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Domain Owner DNS Update', action: 'Owner updates A record in Cloudflare dashboard: 93.184.216.34 -> 93.184.216.35 with TTL=300.', latencyEstimate: '10ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Authoritative Zone File Reload', action: 'Authoritative servers update zone file; new IP served to recursive resolvers upon TTL expiry.', latencyEstimate: '1.5ms', protocol: 'Zone Transfer AXFR' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'In-Memory Lock-Free Trie (Cache)',
        entity: 'DNS Resource Record Cache',
        primaryKey: 'Domain Name FQDN + RRType',
        partitionKey: 'Domain Name',
        schemaDefinition: 'struct DNSRecord { string name; uint16_t type; uint32_t ttl; uint64_t expires_at; vector<uint8_t> rdata; };',
        indexingRationale: 'Radix tree domain hierarchy allows efficient suffix lookups and wildcard matches.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Transport Protocol: UDP Port 53 vs TCP Port 53 vs DNS-over-HTTPS (DoH)',
        chosenApproach: 'UDP Port 53 with DoH / DoT encrypted fallback',
        rejectedAlternative: 'TCP Port 53 for all queries',
        rationale: 'UDP incurs zero connection handshake overhead (single round trip). TCP adds 3-way handshake latency. DoH is provided for privacy-conscious clients.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Authoritative Nameserver Outage / Unreachable',
        impact: 'Domain resolution fails with SERVFAIL.',
        detectionMechanism: 'UDP packet timeout after 3 retries.',
        automatedRecovery: 'Serve Stale on Failure: If authoritative server is down, recursive resolver serves the expired cached record for up to 24 hours (RFC 8767), keeping websites accessible.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Query Ingestion Capacity', assumption: '100,000 DNS queries/sec per resolver node', calculation: '100,000 * 512 bytes UDP packet ≈ 51.2 MB/sec network ingress (410 Mbps)', finalRequirement: 'Easily sustained on standard Linux kernel with SO_REUSEPORT socket load balancing.' },
    ],
  },

  'webhook-engine': {
    systemId: 'webhook-engine',
    executiveArchitectureSummary:
      'An enterprise webhook ingestion and dispatch engine modeled on Stripe Webhooks and Svix, delivering millions of asynchronous external webhook notifications with HMAC-SHA256 cryptographic signatures, exponential backoff retries with jitter, and customer endpoint circuit breakers.',
    problemStatementAndWhyHard:
      'Customer webhook endpoints are notoriously unreliable: they crash, timeout, experience SSL certificate expirations, or become overloaded. A single slow customer endpoint must never block or delay notifications destined for thousands of other customers.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Customer Developer Portal', action: 'Queries webhook delivery attempt history: GET /api/v1/webhooks/{endpointId}/deliveries.', latencyEstimate: '1.2ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Delivery History Store', action: 'Fetches delivery logs, HTTP response status codes, and latency measurements from database.', latencyEstimate: '6.5ms', protocol: 'SQL over TCP' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Event Producer Microservice', action: 'Emits event: {event: "invoice.paid", customerId: "cus_9812", payload: {...}} to Kafka topic: webhooks-outbound.', latencyEstimate: '1.2ms', protocol: 'Kafka Producer' },
      { stepNumber: 2, component: 'Webhook Fanout Worker', action: 'Fetches registered endpoint URLs and secret keys for customer; computes HMAC-SHA256 signature header: Stripe-Signature: t=1712839,v1=9a8b7c....', latencyEstimate: '0.4ms', protocol: 'Crypto SHA256' },
      { stepNumber: 3, component: 'HTTP Dispatcher Pod', action: 'Sends HTTPS POST to customer endpoint with strict 5-second connection timeout.', latencyEstimate: '220ms', protocol: 'HTTPS POST' },
      { stepNumber: 4, component: 'Success vs Exponential Retry Queue', action: 'If customer returns 2xx: marks Delivered. If 5xx or Timeout: enqueues into delayed retry queue: Retries at 5m, 30m, 2h, 12h, 24h.', latencyEstimate: '2.5ms', protocol: 'Redis BullMQ / SQS' },
      { stepNumber: 5, component: 'Dead-Letter Queue (DLQ) Fallback', action: 'If 8 retry attempts fail over 72 hours: routes event to DLQ; disables endpoint and sends email notification.', latencyEstimate: '5.0ms', protocol: 'Kafka DLQ' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Relational Database (PostgreSQL / Aurora)',
        entity: 'webhook_deliveries',
        primaryKey: 'delivery_id UUID',
        partitionKey: 'endpoint_id',
        schemaDefinition: 'CREATE TABLE webhook_deliveries (delivery_id UUID PRIMARY KEY, endpoint_id UUID NOT NULL, event_id UUID NOT NULL, attempt_number INT NOT NULL, response_code INT, response_time_ms INT, status VARCHAR(32) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), INDEX idx_endpoint_created (endpoint_id, created_at DESC));',
        indexingRationale: 'Enables instant audit trail filtering for developers troubleshooting webhook integration bugs.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Dispatcher Concurrency: Synchronous HTTP Calls vs Isolated Worker Pools per Endpoint',
        chosenApproach: 'Isolated priority queues with per-endpoint concurrency caps (max 10 concurrent requests per customer)',
        rejectedAlternative: 'Global FIFO queue',
        rationale: 'If one customer\'s server is slow (5s timeouts), a global FIFO queue gets clogged with their failed requests, causing hours of delay for all other healthy customers.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Customer Endpoint Under Heavy Outage (Returns 500 on all calls)',
        impact: 'Thousands of retry tasks flood the scheduler.',
        detectionMechanism: 'Endpoint Circuit Breaker: Tracks consecutive failures (> 50 failures).',
        automatedRecovery: 'Automatic Endpoint Pause: Webhook engine trips circuit breaker, pauses deliveries to that URL for 1 hour, and notifies customer via email.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Dispatch Throughput', assumption: '50 million webhooks dispatched per day', calculation: '50,000,000 / 86,400 ≈ 580 dispatches/sec sustained (Peak: 3,000/sec)', finalRequirement: 'Cluster of 40 HTTP dispatcher workers using non-blocking async HTTP clients (aiohttp/Go fasthttp).' },
    ],
  },

  'game-server': {
    systemId: 'game-server',
    executiveArchitectureSummary:
      'A dedicated authoritative game server architecture for real-time multiplayer arenas (modeled on Unreal Engine and Valve dedicated servers), running a deterministic 60Hz physics tick loop, UDP binary packet synchronization, client-side prediction, and server reconciliation.',
    problemStatementAndWhyHard:
      'Using TCP for multiplayer gaming is fatal: TCP head-of-line blocking pauses all incoming packets if a single packet is dropped, causing massive visual freezing and rubber-banding. Fast-paced multiplayer games must run on UDP, executing server physics simulation at 60Hz while reconciling client lag with rollback hit registration.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Player Client (Player B)', action: 'Receives UDP Delta State Packet from game server: {tick: 1420, entities: [...]}.', latencyEstimate: '15ms', protocol: 'UDP Binary' },
      { stepNumber: 2, component: 'Client Interpolation Engine', action: 'Interpolates enemy character positions between tick 1418 and tick 1420 over 33ms buffer window.', latencyEstimate: '0.1ms', protocol: 'Unreal Game Loop' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Player Client (Player A)', action: 'Player presses Move Forward & Shoot; client executes local prediction immediately; transmits UDP input packet: {tick: 1420, inputs: [MOVE_F, SHOOT], viewAngle: 45.2}.', latencyEstimate: '0.1ms', protocol: 'UDP Packet' },
      { stepNumber: 2, component: 'Authoritative Game Server Pod', action: 'Dedicated C++ game server receives UDP packet into input ring buffer.', latencyEstimate: '15ms', protocol: 'UDP over Internet' },
      { stepNumber: 3, component: '60Hz Tick Simulation Loop', action: 'Runs every 16.6 milliseconds: processes inputs, updates physics collision meshes, validates shot legality.', latencyEstimate: '4.2ms', protocol: 'C++ PhysX Engine' },
      { stepNumber: 4, component: 'Lag Compensation (Time Rewind)', action: 'When processing player shot: rewinds enemy hitbox positions to the exact tick when Player A saw them (e.g. tick 1416); evaluates raycast hit.', latencyEstimate: '0.5ms', protocol: 'Spatial KD-Tree' },
      { stepNumber: 5, component: 'State Delta Broadcast', action: 'Broadcasts compressed delta snapshot of changed entities to all 100 players in match over UDP.', latencyEstimate: '2.5ms', protocol: 'UDP Broadcast' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'In-Memory State History Ring Buffer (C++ / Rust)',
        entity: 'Game World State Buffer',
        primaryKey: 'Tick Number (uint32)',
        partitionKey: 'Match ID / Arena ID',
        schemaDefinition: 'struct WorldSnapshot { uint32_t tick; EntityState entities[MAX_ENTITIES]; }; WorldSnapshot history[128]; // Ring buffer of last 2 seconds of gameplay.',
        indexingRationale: 'Enables instant O(1) historical hitbox rewinds during lag compensation raycasts.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Network Protocol: TCP vs UDP with Custom Reliability',
        chosenApproach: 'UDP with custom sequence numbers and bitfield ACKs',
        rejectedAlternative: 'Standard TCP sockets',
        rationale: 'TCP retransmission halts the entire stream if packet 5 is dropped while packets 6-10 arrive. In games, packet 6 makes packet 5 obsolete. UDP allows dropping stale state without head-of-line blocking.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Packet Loss Spike over WiFi / Mobile Network',
        impact: 'Client misses several consecutive server state packets.',
        detectionMechanism: 'Sequence gap in received UDP packet headers.',
        automatedRecovery: 'Client Reconciliation: Client snaps or smoothly blends its predicted local position to the latest confirmed server authoritative snapshot, eliminating permanent desync.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Network Bandwidth per Match', assumption: '100 players, 60 snapshots/sec, 500 bytes per delta snapshot', calculation: '100 * 60 * 500 bytes ≈ 3 Megabytes/sec (24 Mbps) per match server', finalRequirement: 'Requires high-bandwidth dedicated gaming servers with low jitter.' },
    ],
  },

  'notification-system': {
    systemId: 'notification-system',
    executiveArchitectureSummary:
      'A multi-channel real-time notification engine modeled on Twilio and Firebase Cloud Messaging (FCM), orchestrating billions of push notifications, SMS alerts, and emails with user preference evaluation, sliding-window deduplication, priority queues, and provider failover circuit breakers.',
    problemStatementAndWhyHard:
      'Blasting millions of notifications during a backend bug or marketing campaign can annoy users, burn through SMS budget ($0.01 per SMS = $100k accident), and crash downstream provider APIs (Apple APNs, Google FCM). The engine must enforce strict frequency caps, rate limiting, and deduplication.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Mobile App / Web Client', action: 'Fetches in-app notification center feed: GET /api/v1/notifications/inbox.', latencyEstimate: '1.2ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Notification Inbox DB', action: 'Queries unread notifications from ScyllaDB / PostgreSQL: `WHERE user_id = ? AND is_read = false`.', latencyEstimate: '4.5ms', protocol: 'SQL over TCP' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Triggering Microservice', action: 'Emits alert event: POST /api/v1/notify {userId: 9812, type: "ORDER_SHIPPED", data: {...}} to Kafka.', latencyEstimate: '1.2ms', protocol: 'Kafka Producer' },
      { stepNumber: 2, component: 'Deduplication & Frequency Cap Filter', action: 'Checks Redis sliding window: Has user received this notification in last 10 minutes? Is user at daily SMS cap (max 3/day)? If yes: drop or downgrade channel.', latencyEstimate: '1.5ms', protocol: 'Redis Lua Script' },
      { stepNumber: 3, component: 'User Preference Engine', action: 'Fetches user contact settings: Push: ENABLED, Email: ENABLED, SMS: DISABLED; queries active device tokens.', latencyEstimate: '2.5ms', protocol: 'Cassandra / Cache' },
      { stepNumber: 4, component: 'Priority Queue Dispatch (Kafka)', action: 'Routes to channel-specific Kafka topics: notif-push (P0), notif-email (P2).', latencyEstimate: '1.2ms', protocol: 'Kafka Producer' },
      { stepNumber: 5, component: 'Third-Party Delivery Worker Fleet', action: 'Pulls from queue; executes HTTPS call to Apple APNs (HTTP/2 multiplexing) or SendGrid.', latencyEstimate: '85ms', protocol: 'HTTP/2 to APNs / FCM' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Distributed Wide-Column Store (ScyllaDB / Cassandra)',
        entity: 'user_notifications',
        primaryKey: 'PRIMARY KEY ((user_id), created_at, notification_id)',
        partitionKey: 'user_id',
        schemaDefinition: 'CREATE TABLE user_notifications (user_id BIGINT, created_at TIMESTAMPTZ, notification_id UUID, channel VARCHAR(16), title TEXT, body TEXT, is_read BOOLEAN, PRIMARY KEY ((user_id), created_at, notification_id)) WITH CLUSTERING ORDER BY (created_at DESC);',
        indexingRationale: 'Partitioning by user_id co-locates all inbox alerts for a user on one storage node, enabling sub-5ms chronological inbox queries.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Channel Selection: Single Channel vs Smart Fallback Cascade',
        chosenApproach: 'Smart Cascade: Send Mobile Push first; if unread after 15 minutes, send Email alert',
        rejectedAlternative: 'Blasting all channels simultaneously',
        rationale: 'Simultaneous blasting causes notification fatigue and multiplies SMS and email delivery provider costs unnecessarily.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Apple APNs / Google FCM Gateway Outage',
        impact: 'Push notifications fail with HTTP 500 / 503 errors.',
        detectionMechanism: 'Provider Circuit Breaker: Error rate exceeds 20% on APNs worker pool.',
        automatedRecovery: 'Circuit Breaker Failover: Worker fleet trips breaker; diverts urgent transactional alerts to fallback SMS / Email channels until APNs recovers.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Daily Notification Volume', assumption: '1 billion notifications per day', calculation: '1,000,000,000 / 86,400 ≈ 11,500 notifications/sec average (Peak: 50,000/sec)', finalRequirement: 'Partitioned across Kafka topic clusters with separate priority queues.' },
    ],
  },
}
