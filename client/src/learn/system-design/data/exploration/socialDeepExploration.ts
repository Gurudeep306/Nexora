import type { SystemDeepExploration } from '../systemDeepExplorationRegistry'

export const SOCIAL_DEEP_EXPLORATION: Record<string, SystemDeepExploration> = {
  'twitter-feed': {
    systemId: 'twitter-feed',
    executiveArchitectureSummary:
      'A real-time broadcast social timeline architecture handling 500 million posts/day and 300,000 timeline reads/sec, utilizing a Hybrid Fanout Engine (Fanout-on-Write for standard users, Fanout-on-Read for celebrities) and Redis in-memory timeline Sorted Sets.',
    problemStatementAndWhyHard:
      'The core challenge is the Fanout Bottleneck: when a celebrity with 50 million followers posts, pushing that tweet into 50 million follower inboxes via Fanout-on-Write takes 15+ minutes and overwhelms queue workers. Conversely, pure Fanout-on-Read on every query forces an O(N) multi-table SQL join across thousands of followed users, destroying sub-50ms read latency.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Client Mobile App', action: 'Issues GET /api/v2/timeline/home?count=20. Edge router authenticates user via OAuth 2.0.', latencyEstimate: '1.5ms', protocol: 'HTTP/2 over TLS' },
      { stepNumber: 2, component: 'Timeline Service', action: 'Fetches user\'s pre-computed timeline list from Redis Cluster via ZREVRANGEBYSCORE.', latencyEstimate: '2.8ms', protocol: 'Redis RESP' },
      { stepNumber: 3, component: 'Celebrity Influx Check', action: 'Queries followed celebrities who posted recently; fetches their latest tweets directly from Social Graph service.', latencyEstimate: '4.2ms', protocol: 'gRPC' },
      { stepNumber: 4, component: 'Merge & Rank Engine', action: 'K-way merges pre-computed timeline with celebrity tweets by timestamp; applies ranking ML model.', latencyEstimate: '3.1ms', protocol: 'In-Memory C++' },
      { stepNumber: 5, component: 'Hydration Service', action: 'Batch fetches full tweet text, media URLs, author avatars from Memcached; returns JSON to client.', latencyEstimate: '5.5ms', protocol: 'Internal RPC' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'API Gateway', action: 'Ingests POST /api/v2/tweets. Rate limits and passes to Tweet Ingestion Service.', latencyEstimate: '1.2ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Primary Tweet Store', action: 'Inserts tweet into Snowflake ID keyed database (CockroachDB / Cassandra) and writes to Kafka topic: tweet-created.', latencyEstimate: '8.5ms', protocol: 'SQL Commit' },
      { stepNumber: 3, component: 'Fanout Service (Worker Fleet)', action: 'Consumes event from Kafka. Checks author follower count in Social Graph database.', latencyEstimate: '1.4ms', protocol: 'Kafka Consumer' },
      { stepNumber: 4, component: 'Hybrid Routing Decision', action: 'If author < 25,000 followers: pushes TweetID into every follower\'s Redis timeline (ZADD key score tweet_id). If > 25,000 followers: marks author as celebrity; skips push.', latencyEstimate: '12.0ms', protocol: 'Redis Pipeline' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Relational / Distributed SQL (CockroachDB)',
        entity: 'tweets',
        primaryKey: 'tweet_id BIGINT (Snowflake ID)',
        partitionKey: 'user_id BIGINT',
        schemaDefinition: 'CREATE TABLE tweets (tweet_id BIGINT PRIMARY KEY, user_id BIGINT NOT NULL, content VARCHAR(280) NOT NULL, media_urls JSONB, created_at TIMESTAMPTZ NOT NULL, INDEX idx_user_tweets (user_id, created_at DESC));',
        indexingRationale: 'Primary key is chronological Snowflake ID ensuring fast index scans; secondary index on (user_id, created_at) powers user profile tabs.',
      },
      {
        storageType: 'In-Memory Cache (Redis Cluster)',
        entity: 'user_home_timeline',
        primaryKey: 'timeline:{user_id}',
        partitionKey: 'CRC16(user_id) % 16384',
        schemaDefinition: 'SORTED SET: ZADD timeline:1028 1712839210000 982172918271 (score=timestamp, member=tweet_id). Limited to 800 most recent tweets.',
        indexingRationale: 'ZREVRANGEBYSCORE provides O(log N + M) retrieval for instantaneous infinite-scroll pagination.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Timeline Assembly: Fanout-on-Write (Push) vs Fanout-on-Read (Pull)',
        chosenApproach: 'Hybrid Fanout (Push for normal users, Pull for celebrities > 25k followers)',
        rejectedAlternative: 'Pure Push or Pure Pull',
        rationale: 'Pure push causes write amplification for celebrities (50M writes per post). Pure pull causes read latency explosion on timeline refresh. Hybrid balances both perfectly.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Celebrity Live Event Outage (Millions of simultaneous tweets)',
        impact: 'Kafka consumer lag increases on fanout topics.',
        detectionMechanism: 'Consumer lag metric on Prometheus alerts when lag > 100,000 messages.',
        automatedRecovery: 'Dynamic follower threshold adjustment: lowers celebrity threshold from 25k to 5k followers, shifting write pressure to read path temporarily.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Write QPS', assumption: '500M tweets/day', calculation: '500,000,000 / 86,400 ≈ 5,800 tweets/sec (Peak: 20,000/sec)', finalRequirement: 'Sustained easily with partitioned Kafka ingestion.' },
      { metric: 'Read QPS', assumption: '300M Daily Active Users checking feed 5x/day', calculation: '1.5B feed reads / 86,400 ≈ 17,500 reads/sec (Peak: 100,000/sec)', finalRequirement: 'Must be served 98% from Redis in-memory timeline caches.' },
      { metric: 'Redis RAM for Active Timelines', assumption: '50M active users * 800 tweet IDs (8B) in Sorted Set * 3x metadata', calculation: '50,000,000 * 800 * 32 bytes ≈ 1.2 Terabytes RAM', finalRequirement: 'Cluster of 30 Redis nodes with 64GB RAM each.' },
    ],
  },

  'whatsapp-chat': {
    systemId: 'whatsapp-chat',
    executiveArchitectureSummary:
      'A real-time instant messaging engine maintaining millions of persistent duplex WebSocket / TCP connections, delivering end-to-end encrypted messages with sub-20ms latency and heartbeat presence tracking.',
    problemStatementAndWhyHard:
      'Maintaining 10+ million concurrent open TCP sockets requires massive Linux file descriptor tuning and kernel epoll optimization. The system must route messages between users on different physical gateway servers without central database bottlenecks and reliably deliver queued messages when offline recipients reconnect.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Recipient Gateway Connection', action: 'Recipient mobile device maintains open WebSocket connection to Gateway Server 4.', latencyEstimate: '0.0ms', protocol: 'Persistent TCP' },
      { stepNumber: 2, component: 'Message Delivery Push', action: 'Gateway Server 4 receives message via internal Redis Pub/Sub; serializes Protobuf payload down client socket.', latencyEstimate: '2.5ms', protocol: 'WebSocket Frame' },
      { stepNumber: 3, component: 'Delivery Acknowledgment (ACK)', action: 'Recipient client returns ACK packet: {msgId, status: "delivered", timestamp}.', latencyEstimate: '12.0ms', protocol: 'WebSocket' },
      { stepNumber: 4, component: 'Status Propagated to Sender', action: 'Gateway updates message state in database and pushes double-check mark status to sender.', latencyEstimate: '3.5ms', protocol: 'Internal RPC' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Sender Client', action: 'Encrypts message locally via Signal Protocol; sends packet over WebSocket to Gateway Server 1.', latencyEstimate: '1.2ms', protocol: 'WebSocket' },
      { stepNumber: 2, component: 'Gateway Server 1', action: 'Inspects header; queries in-memory User Session Directory (Redis) for recipient status.', latencyEstimate: '1.5ms', protocol: 'Redis GET session:{user_id}' },
      { stepNumber: 3, component: 'Online Routing vs Offline Queue', action: 'If Recipient Online: publishes to recipient\'s gateway node topic via Redis Pub/Sub. If Offline: appends message to Cassandra / ScyllaDB mailbox queue.', latencyEstimate: '3.8ms', protocol: 'Cassandra Write' },
      { stepNumber: 4, component: 'Sender ACK', action: 'Returns single check-mark (sent to server) acknowledgment to sender.', latencyEstimate: '0.8ms', protocol: 'WebSocket' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Wide-Column Distributed Store (ScyllaDB / Cassandra)',
        entity: 'offline_messages',
        primaryKey: 'PRIMARY KEY ((recipient_id), message_id)',
        partitionKey: 'recipient_id',
        schemaDefinition: 'CREATE TABLE offline_messages (recipient_id BIGINT, message_id TIMEUUID, sender_id BIGINT, encrypted_payload BLOB, created_at TIMESTAMP, PRIMARY KEY ((recipient_id), message_id)) WITH CLUSTERING ORDER BY (message_id ASC);',
        indexingRationale: 'Partitioning by recipient_id co-locates all queued messages for a user on one disk node, allowing single-seek sequential drain upon reconnect.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Connection Protocol: Long Polling vs WebSockets vs gRPC Streaming',
        chosenApproach: 'Persistent WebSockets with TLS termination at Envoy/Netty',
        rejectedAlternative: 'HTTP Long Polling',
        rationale: 'Long polling generates massive HTTP header overhead and repeated TCP handshakes. WebSockets maintain a 2-byte frame overhead for low-latency bidirectional communication.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Gateway Server Crash terminating 500,000 WebSocket connections',
        impact: 'Half a million clients immediately disconnect and attempt simultaneous reconnects.',
        detectionMechanism: 'TCP FIN/RST packet surge and gateway process health check failure.',
        automatedRecovery: 'Reconnection Jitter: Mobile clients apply exponential backoff with full randomized jitter (0-30s) to prevent thundering herd on surviving gateway nodes.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Concurrent Open Connections', assumption: '10 million active users concurrently online', calculation: '10,000,000 sockets / 100,000 per gateway = 100 Gateway Servers', finalRequirement: 'Requires 100 dedicated Linux gateway nodes with tuned ulimit -n 1000000.' },
      { metric: 'Daily Messages', assumption: '50 billion messages/day', calculation: '50,000,000,000 / 86,400 ≈ 580,000 messages/sec average (Peak: 2,000,000/sec)', finalRequirement: 'Requires sub-10ms distributed messaging bus.' },
    ],
  },

  'flash-sale': {
    systemId: 'flash-sale',
    executiveArchitectureSummary:
      'A high-concurrency e-commerce flash reservation engine handling 100,000+ checkout requests/sec for scarce inventory, eliminating database row locks and overselling using atomic in-memory Redis Lua scripts and asynchronous Kafka order reconciliation.',
    problemStatementAndWhyHard:
      'When 1,000 items are released to 500,000 buyers, executing `UPDATE inventory SET stock = stock - 1 WHERE id = 1 AND stock > 0` directly on a relational database causes massive row-level write lock contention, thread starvation, and deadlocks that freeze the database within seconds.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Edge CDN (Cloudflare)', action: 'Serves static product page, images, and pricing details from edge cache with 99% hit rate.', latencyEstimate: '1.2ms', protocol: 'HTTP/3 Edge' },
      { stepNumber: 2, component: 'Flash Inventory Cache (Redis)', action: 'Client checks remaining stock badge via lightweight polling: GET stock:{product_id}.', latencyEstimate: '0.8ms', protocol: 'Redis RESP' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Dynamic CAPTCHA & Rate Limiter', action: 'Ingests POST /api/v1/checkout. Validates CAPTCHA token; blocks bot scrapers at edge API gateway.', latencyEstimate: '4.5ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Atomic Inventory Decr (Redis Lua)', action: 'Executes atomic Lua script on Redis: checks stock > 0 and user hasn\'t already purchased; decrements stock and logs reservation token.', latencyEstimate: '1.1ms', protocol: 'Redis Lua' },
      { stepNumber: 3, component: 'Reservation Order Queue (Kafka)', action: 'On successful reservation: publishes order event {orderId, userId, productId, expireAt: 15m} to Kafka topic.', latencyEstimate: '1.8ms', protocol: 'Kafka Producer' },
      { stepNumber: 4, component: 'Order DB Processing Service', action: 'Asynchronous workers consume Kafka event and insert pending order into PostgreSQL master.', latencyEstimate: '6.5ms', protocol: 'SQL Commit' },
      { stepNumber: 5, component: 'Client Order Created Confirmation', action: 'Returns HTTP 200 with reservation token; user has 15 minutes to complete payment.', latencyEstimate: '0.4ms', protocol: 'HTTPS Response' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Relational Database (PostgreSQL / Aurora)',
        entity: 'orders & inventory',
        primaryKey: 'order_id UUID',
        partitionKey: 'product_id',
        schemaDefinition: 'CREATE TABLE flash_orders (order_id UUID PRIMARY KEY, user_id BIGINT NOT NULL, product_id BIGINT NOT NULL, status VARCHAR(32) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, product_id));',
        indexingRationale: 'Unique composite index on (user_id, product_id) prevents double-ordering at the database layer as a second line of defense.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Inventory Reservation: Relational DB Row Lock vs Redis Lua Atomic Decrement',
        chosenApproach: 'Redis Lua Script in-memory reservation',
        rejectedAlternative: 'SELECT stock FROM items WHERE id = ? FOR UPDATE in PostgreSQL',
        rationale: 'FOR UPDATE row locks serialize all 100k requests behind a single mutex, stalling the database. Redis executes single-threaded Lua in < 0.2ms, processing 50k+ reservations/sec in RAM.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'User Abandons Checkout without Paying',
        impact: 'Reserved inventory remains locked, preventing other buyers from purchasing.',
        detectionMechanism: 'Delayed TTL event in Redis or RabbitMQ delayed exchange at T+15 minutes.',
        automatedRecovery: 'Cancellation Worker releases inventory back into Redis: INCR stock:{product_id} and invalidates reservation token.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Peak Ingestion QPS', assumption: '500,000 users clicking "Buy Now" at the same second', calculation: 'Peak traffic: 150,000 QPS over 10-second burst window', finalRequirement: 'Filtered by API gateway rate limiters down to 50k QPS Redis operations.' },
      { metric: 'Database Write Throughput', assumption: 'Only 1,000 successful winners are written to SQL DB', calculation: '1,000 database writes over 15 minutes = ~1.1 writes/sec', finalRequirement: 'Complete insulation of relational database from flash spike.' },
    ],
  },

  'collab-docs': {
    systemId: 'collab-docs',
    executiveArchitectureSummary:
      'A real-time collaborative document editing architecture supporting hundreds of concurrent editors per document with sub-50ms latency, automatic conflict resolution, offline synchronization, and deterministic convergence using CRDTs and Operational Transformation.',
    problemStatementAndWhyHard:
      'When two users edit text at different positions simultaneously, simple character coordinate indices desynchronize. If Alice inserts "X" at index 3 while Bob deletes index 1, Bob\'s deletion shifts Alice\'s coordinate by -1. Without algebraic operational transformation or fractional indexing CRDTs, documents silently corrupt.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Client Document Load', action: 'Client sends GET /api/v1/documents/{docId}. Retrieves snapshot state and latest sequence version.', latencyEstimate: '15ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'WebSocket Session Establishment', action: 'Client upgrades connection to WebSocket; joins document room identified by docId.', latencyEstimate: '5.2ms', protocol: 'WebSocket Upgrade' },
      { stepNumber: 3, component: 'Operation Log Catchup', action: 'Server streams edit operations committed since the client\'s snapshot version.', latencyEstimate: '8.0ms', protocol: 'WebSocket Frame' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Local Optimistic Insertion', action: 'User types key. Client applies edit locally immediately with fractional index (e.g., position "1.5"); renders to canvas.', latencyEstimate: '0.1ms', protocol: 'Local DOM' },
      { stepNumber: 2, component: 'Operation Packet Transmission', action: 'Client sends operation {type: "insert", char: "a", id: [1.5, userId], baseRev: 42} over WebSocket.', latencyEstimate: '12.0ms', protocol: 'WebSocket' },
      { stepNumber: 3, component: 'Central Sequencer (OT/CRDT Engine)', action: 'Server verifies baseRev; transforms concurrent operations against history buffer; assigns global monotonic revision 43.', latencyEstimate: '0.8ms', protocol: 'In-Memory Go/Rust' },
      { stepNumber: 4, component: 'Append to Revision Log', action: 'Appends operation to document change log in Redis and PostgreSQL.', latencyEstimate: '3.5ms', protocol: 'Redis / SQL' },
      { stepNumber: 5, component: 'WebSocket Fanout Broadcast', action: 'Broadcasts transformed operation to all other connected collaborators in document room.', latencyEstimate: '2.5ms', protocol: 'WebSocket Broadcast' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Relational Database (PostgreSQL) + Append-Only Log',
        entity: 'document_operations',
        primaryKey: 'PRIMARY KEY (document_id, revision)',
        partitionKey: 'document_id',
        schemaDefinition: 'CREATE TABLE document_operations (document_id UUID, revision BIGINT, user_id BIGINT, operation_type VARCHAR(16), operation_data JSONB, created_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY (document_id, revision));',
        indexingRationale: 'Sequential revision numbers allow newly joined users to fetch delta logs via simple `WHERE document_id = ? AND revision > ?` query.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Conflict Resolution: Operational Transformation (OT) vs CRDT (Yjs/Automerge)',
        chosenApproach: 'State-based / Log-based CRDT with Fractional Indexing',
        rejectedAlternative: 'Centralized Operational Transformation requiring single sequencer',
        rationale: 'OT requires all operations to pass through a single centralized sequencer node for transformation. CRDTs enable decentralized peer-to-peer merging and robust offline editing.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Collaborator Network Disconnection (Offline Airplane Mode)',
        impact: 'User accumulates hundreds of local keystrokes while disconnected.',
        detectionMechanism: 'WebSocket heartbeat timeout.',
        automatedRecovery: 'Upon reconnection: Client transmits local vector clock state; server sends missing remote operations, and local CRDT engine deterministically merges concurrent edits.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Keystroke Throughput', assumption: '100,000 active documents * average 3 concurrent editors typing at 3 chars/sec', calculation: '100,000 * 3 * 3 = 900,000 keystroke operations/sec', finalRequirement: 'Must be handled in-memory by distributed room gateway pods with WebSocket multiplexing.' },
      { metric: 'Snapshot Compaction', assumption: 'Full document snapshot created every 500 operations', calculation: 'Reduces operational log history replay from 100k events to single snapshot + latest delta', finalRequirement: 'Compaction worker background job keeps document load times < 50ms.' },
    ],
  },
}
