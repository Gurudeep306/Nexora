import type { SystemDeepExploration } from '../systemDeepExplorationRegistry'

export const FINTECH_DEEP_EXPLORATION: Record<string, SystemDeepExploration> = {
  'payment-ledger': {
    systemId: 'payment-ledger',
    executiveArchitectureSummary:
      'A mission-critical financial ledger architecture modeled on Stripe Payments and Modern Treasury, enforcing immutable double-entry bookkeeping (Debits must equal Credits), cryptographic idempotency keys, and distributed Saga compensation orchestrators with zero balance discrepancies.',
    problemStatementAndWhyHard:
      'In financial transactions, traditional single-column account balance updates (`UPDATE accounts SET balance = balance - 100`) lose audit history, risk concurrent race condition overdraws, and fail silently during multi-leg currency exchanges or cross-bank transfers. Double-entry bookkeeping guarantees mathematically that money cannot be created or destroyed.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Merchant Dashboard / API Client', action: 'Queries account balance: GET /api/v1/accounts/{accountId}/balance.', latencyEstimate: '1.2ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Balance Cache (Redis)', action: 'Queries cached materialized balance: GET balance:{accountId}.', latencyEstimate: '0.8ms', protocol: 'Redis RESP' },
      { stepNumber: 3, component: 'Ledger Aggregation Query (if cache miss)', action: 'Executes `SELECT SUM(amount) FROM entries WHERE account_id = ?` over partitioned ledger table.', latencyEstimate: '6.5ms', protocol: 'PostgreSQL Read Replica' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Payment Ingestion API', action: 'Ingests POST /api/v1/transfers with Idempotency-Key: idemp_98129812.', latencyEstimate: '1.5ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Idempotency Filter (Redis / DB)', action: 'Checks if idempotency key was already processed. If yes: returns saved response instantly. If no: acquires distributed lock on key.', latencyEstimate: '1.2ms', protocol: 'Redis SET NX' },
      { stepNumber: 3, component: 'Saga Orchestrator (Temporal)', action: 'Initializes distributed transaction state machine across: 1. Debit Source, 2. Process Gateway, 3. Credit Destination.', latencyEstimate: '2.5ms', protocol: 'Temporal gRPC' },
      { stepNumber: 4, component: 'Immutable Journal Entry Commit', action: 'Executes atomic ACID transaction: inserts 1 Journal record and 2 Entry lines (Debit Source Account, Credit Destination Account). Verifies Sum(Debits) == Sum(Credits).', latencyEstimate: '8.5ms', protocol: 'PostgreSQL WAL Commit' },
      { stepNumber: 5, component: 'Materialized Balance Cache Update', action: 'Asynchronously updates cached balances and returns HTTP 200 with transfer ID.', latencyEstimate: '1.2ms', protocol: 'Redis Pipeline' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Relational Database (PostgreSQL / Aurora with strict ACID)',
        entity: 'journals & entries',
        primaryKey: 'PRIMARY KEY (entry_id)',
        partitionKey: 'account_id',
        schemaDefinition: `CREATE TABLE journals (
    journal_id UUID PRIMARY KEY,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE entries (
    entry_id UUID PRIMARY KEY,
    journal_id UUID REFERENCES journals(journal_id),
    account_id UUID NOT NULL,
    direction VARCHAR(4) CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entries_account ON entries (account_id, created_at DESC);`,
        indexingRationale: 'Entries are append-only; rows are NEVER updated or deleted. Compound index on (account_id, created_at DESC) allows instant ledger replay for any historical timestamp.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Balance Representation: Mutable Balance Column vs Append-Only Immutable Journal Entries',
        chosenApproach: 'Append-Only Double-Entry Journal Entries',
        rejectedAlternative: 'Mutable balance column updated with SQL UPDATE',
        rationale: 'Updating a balance in place destroys audit history, prevents dispute resolution, and causes write lock contention. Append-only entries provide a 100% forensic audit trail.',
      },
      {
        decision: 'Multi-Step Transaction Protocol: Two-Phase Commit (2PC) vs Saga Orchestration',
        chosenApproach: 'Saga Orchestration with Compensating Transactions',
        rejectedAlternative: 'Two-Phase Commit (2PC) locking third-party bank APIs',
        rationale: '2PC holds database locks open across network calls to external payment gateways (Stripe, Visa), causing connection pool exhaustion during gateway brownouts.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Payment Gateway Fails after Source Account Was Debited',
        impact: 'Partial transaction state (money deducted but not delivered to destination).',
        detectionMechanism: 'Gateway returns HTTP 500 or timeout error.',
        automatedRecovery: 'Saga Compensating Transaction: Orchestrator triggers compensating workflow that automatically credits the source account back, creating an offset reversal entry.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Transaction Throughput', assumption: '5,000 payment transfers/sec peak during Black Friday', calculation: '5,000 transfers * 2 entry rows = 10,000 rows/sec', finalRequirement: 'Handled with PostgreSQL connection pooling (PgBouncer) and multi-shard schema.' },
      { metric: 'Storage Footprint', assumption: '1 billion ledger transactions per year', calculation: '1B * 200 bytes per journal/entry ≈ 200 GB/year', finalRequirement: 'Fits easily in high-performance NVMe cloud database storage with hot/cold partitioning.' },
    ],
  },

  'order-book': {
    systemId: 'order-book',
    executiveArchitectureSummary:
      'A high-frequency limit order book (LOB) matching engine modeled on NASDAQ and Coinbase Exchange, delivering sub-10 microsecond price-time priority order matching with zero garbage collection pauses using in-memory Bids/Asks depth ladders and LMAX Disruptor lock-free ring buffers.',
    problemStatementAndWhyHard:
      'Standard web architectures using HTTP, relational databases, and garbage-collected runtimes (Java/Python) suffer from 50ms latency spikes and thread lock contention. In financial trading, a 1-millisecond delay means millions of dollars in arbitrage losses. Order book matching engines must execute in pure RAM with zero memory allocations on the critical trading path.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Market Data Gateway', action: 'Streaming WebSocket / FIX protocol connection to institutional algorithmic traders.', latencyEstimate: '0.05ms', protocol: 'TCP FIX / WebSocket' },
      { stepNumber: 2, component: 'Level 2 (L2) Depth Broadcast', action: 'Matching engine emits price level updates (top 50 Bids and Asks) over UDP Multicast.', latencyEstimate: '0.005ms', protocol: 'UDP Multicast' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'FIX / Binary Protocol Gateway', action: 'Ingests Limit Order: NewOrderSingle(Symbol: BTC-USD, Side: BUY, Price: 68500, Qty: 2.5).', latencyEstimate: '0.04ms', protocol: 'Binary FIX over TCP' },
      { stepNumber: 2, component: 'Lock-Free Ring Buffer (Disruptor)', action: 'Pushes order packet into pre-allocated LMAX Disruptor ring buffer using single CPU memory barrier.', latencyEstimate: '0.002ms', protocol: 'Atomic CPU CAS' },
      { stepNumber: 3, component: 'Single-Threaded Core Matching Loop', action: 'Pulls from ring buffer on dedicated isolated CPU core (core pinning). Compares incoming Buy against lowest Ask price.', latencyEstimate: '0.008ms', protocol: 'In-Memory C++ / Rust' },
      { stepNumber: 4, component: 'Execution Match vs Book Placement', action: 'If Price >= Best Ask: matches orders, decrements quantities, generates Trade Execution event. If Price < Best Ask: inserts order node into Bids price ladder.', latencyEstimate: '0.006ms', protocol: 'Doubly-Linked List Pointer' },
      { stepNumber: 5, component: 'Asynchronous Journaling (NVMe WAL)', action: 'Emits execution event to background worker thread that writes to sequential NVMe WAL and publishes to market data feed.', latencyEstimate: '0.05ms', protocol: 'Lock-Free Queue' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'In-Memory Pre-Allocated Arrays & Trees (C++ / Rust / Go)',
        entity: 'LimitOrderBook',
        primaryKey: 'order_id uint64',
        partitionKey: 'Symbol (e.g. BTC-USD, AAPL)',
        schemaDefinition: 'struct Order { uint64_t id; uint64_t price; uint32_t qty; uint64_t timestamp; Order* next; Order* prev; }; struct PriceLevel { uint64_t price; uint64_t total_volume; Order* head; Order* tail; };',
        indexingRationale: 'AVL Tree / Red-Black Tree indexed by Price gives O(1) peek at Best Bid / Best Ask and O(log P) insertion of new price levels. Doubly-linked list at each price level guarantees O(1) FIFO time-priority matching.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Matching Engine Concurrency: Multi-Threaded Mutex Locking vs Single-Threaded Event Loop',
        chosenApproach: 'Single-Threaded execution per trading symbol on pinned CPU core',
        rejectedAlternative: 'Multi-threaded matching with mutex locks on price levels',
        rationale: 'Mutex locking incurs CPU cache line bouncing and OS context switches (5-10 microseconds overhead). A single thread without locks processes 1,000,000 orders/sec at sub-microsecond latency.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Matching Engine Process Crash during Trading Session',
        impact: 'In-memory order book state is lost.',
        detectionMechanism: 'Hardware watchdog timer heartbeat failure.',
        automatedRecovery: 'Hot Standby Takeover: Secondary matching engine ingests identical input ring buffer stream in lockstep; takes over active trading in < 5 milliseconds.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Order Ingestion Throughput', assumption: '500,000 order operations/sec (creates, cancels, amends)', calculation: '500,000 * 64 bytes binary order struct = 32 MB/sec network ingress', finalRequirement: 'Processed seamlessly on 10Gbps kernel-bypass (Solarflare EF_VI) network cards.' },
    ],
  },

  'rate-limiter': {
    systemId: 'rate-limiter',
    executiveArchitectureSummary:
      'A multi-tier distributed rate limiter service defending backend microservices from DDoS attacks, API abuse, and noisy neighbors, evaluating 250,000+ requests/sec using local in-memory token buckets, sliding window logs, and Redis cluster synchronization.',
    problemStatementAndWhyHard:
      'Centralized rate limiting in a single database introduces high network latency to every API call. Conversely, purely local in-memory limiting on gateway nodes fails because traffic is distributed across dozens of instances, allowing a malicious client to exceed limits by spraying requests across nodes.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Edge API Gateway Filter', action: 'Ingests request; extracts client IP and API key claims.', latencyEstimate: '0.1ms', protocol: 'Envoy L7 Filter' },
      { stepNumber: 2, component: 'Local L1 Memory Bucket', action: 'Checks local atomic token bucket cache; if tokens available, decrements immediately in 0.01ms.', latencyEstimate: '0.01ms', protocol: 'CPU Atomic' },
      { stepNumber: 3, component: 'Redis Cluster L2 Synchronization', action: 'Periodically batches token consumption to central Redis cluster via sliding window Lua script.', latencyEstimate: '0.8ms', protocol: 'Redis RESP' },
      { stepNumber: 4, component: 'Accept or Reject Decision', action: 'If tokens remaining: permits request to upstream service. If exhausted: returns HTTP 429 Too Many Requests with Retry-After header.', latencyEstimate: '0.1ms', protocol: 'HTTP Response' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Rate Limit Policy Configuration', action: 'Admin updates tier limits: POST /api/v1/limits {tier: "pro", limit: 1000, window: 60}.', latencyEstimate: '5.0ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Etcd / Consul Policy Broadcast', action: 'Broadcasts updated rules to all gateway instances in real time via watch streams.', latencyEstimate: '2.5ms', protocol: 'gRPC Watch' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'In-Memory Cache (Redis Cluster)',
        entity: 'Rate Limit Window',
        primaryKey: 'ratelimit:{client_id}:{window_timestamp}',
        partitionKey: 'client_id',
        schemaDefinition: 'REDIS HASH: HSET ratelimit:usr_9812 tokens 48 last_refill 1712839210000',
        indexingRationale: 'Atomic Lua scripts compute token replenishment mathematically: tokens = min(capacity, current + (now - last_refill) * rate), avoiding clock drift issues.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Algorithm Choice: Fixed Window Counter vs Sliding Window Log vs Token Bucket',
        chosenApproach: 'Token Bucket with Sliding Window Hybrid',
        rejectedAlternative: 'Fixed Window Counter',
        rationale: 'Fixed Window counters suffer from the "Boundary Burst Problem" where 2x the allowed limit can be sent in the 1 second across the window boundary (e.g. 59s and 00s). Token Bucket smooths traffic bursts cleanly.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Central Redis Cluster Becomes Unreachable',
        impact: 'Rate limiter cannot sync global token counters across gateway fleet.',
        detectionMechanism: 'Redis connection timeouts on gateway nodes.',
        automatedRecovery: 'Fail-Open with Local Caps: Gateway switches to local standalone token buckets with conservative limits, protecting backend while preventing 100% false-positive rejection.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Evaluation Latency Budget', assumption: 'Rate limiting is in the critical path of EVERY API request', calculation: 'Must add < 1.0ms to total request time', finalRequirement: 'L1 in-memory local cache achieves < 0.05ms P99 overhead.' },
    ],
  },

  'fraud-detection': {
    systemId: 'fraud-detection',
    executiveArchitectureSummary:
      'A real-time fraud scoring and risk evaluation pipeline modeled on Stripe Radar and PayPal, evaluating transaction risk in under 30ms using rule engines, behavioral feature stores, in-memory graph traversals, and low-latency ML scoring models.',
    problemStatementAndWhyHard:
      'Blocking fraud after money has left the bank is too late. The system must inspect 50+ behavioral features (velocity checks, device fingerprinting, card country mismatch, graph distance between user and known fraudsters) and return a Pass/Review/Block decision before the payment authorization gateway times out at 50ms.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Payment Gateway Hook', action: 'Calls Risk Engine: POST /api/v1/score-transaction with transaction payload and device fingerprint.', latencyEstimate: '1.2ms', protocol: 'Internal gRPC' },
      { stepNumber: 2, component: 'Parallel Feature Extraction', action: 'Fetches real-time features from Redis Feature Store: 1-hour transaction velocity, card country vs IP country, known chargebacks count.', latencyEstimate: '4.5ms', protocol: 'Redis MGET' },
      { stepNumber: 3, component: 'Device & IP Graph Check', action: 'Queries in-memory graph index to check if device fingerprint was linked to known fraudulent accounts.', latencyEstimate: '5.2ms', protocol: 'In-Memory Graph' },
      { stepNumber: 4, component: 'ML Model Inference (ONNX / TensorRT)', action: 'Evaluates LightGBM / XGBoost fraud scoring model; outputs Risk Score (0-1000).', latencyEstimate: '8.0ms', protocol: 'Local C++ Inference' },
      { stepNumber: 5, component: 'Rule Decision Engine', action: 'If Score < 200: PASS; If 200-750: REQUIRE 3DS (SMS OTP); If > 750: REJECT. Total time: 22ms.', latencyEstimate: '1.5ms', protocol: 'gRPC Response' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Transaction Event Ingestion', action: 'Emits full transaction payload to Kafka topic: payment-evaluations.', latencyEstimate: '1.2ms', protocol: 'Kafka Producer' },
      { stepNumber: 2, component: 'Streaming Velocity Aggregator (Apache Flink)', action: 'Updates sliding window counters: transactions per card in last 10m, transactions per IP in last 1h.', latencyEstimate: '3.5ms', protocol: 'Flink Stream Processing' },
      { stepNumber: 3, component: 'Feature Store Persistence', action: 'Writes updated aggregations to Redis Feature Store and Feast feature repository.', latencyEstimate: '2.1ms', protocol: 'Redis Pipeline' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'In-Memory Key-Value & Feature Store (Redis + Feast)',
        entity: 'risk_features',
        primaryKey: 'features:{user_id}',
        partitionKey: 'user_id',
        schemaDefinition: 'HASH: HSET features:usr_9812 tx_count_1h 4 distinct_cards_24h 2 last_country "US" risk_multiplier 1.0',
        indexingRationale: 'Sub-millisecond feature lookup enables ML model inference within strict 30ms latency budget.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Scoring Architecture: Real-Time Synchronous Inference vs Asynchronous Post-Auth Scoring',
        chosenApproach: 'Real-time synchronous scoring with strict 30ms timeout circuit breaker',
        rejectedAlternative: 'Scoring transactions asynchronously after authorization',
        rationale: 'Post-auth scoring leaves the merchant liable for chargeback fees and stolen merchandise. Real-time evaluation prevents fraudulent charges from completing.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'ML Scoring Service Timeout (> 35ms latency spike)',
        impact: 'Payment authorization risks timing out.',
        detectionMechanism: 'gRPC deadline exceeded (35ms timeout threshold).',
        automatedRecovery: 'Static Fallback Rules Engine: If ML model times out, system executes ultra-fast static heuristic rules (velocity checks and blacklisted cards) in < 2ms and permits low-value transactions.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Scoring Throughput', assumption: '10,000 transactions/sec peak evaluation load', calculation: '10,000 * 20ms execution time = 200 concurrent CPU worker threads', finalRequirement: 'Cluster of 16 inference nodes with CPU/GPU acceleration.' },
    ],
  },
}
