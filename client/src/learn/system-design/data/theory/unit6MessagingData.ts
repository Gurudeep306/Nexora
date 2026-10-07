import type { TheoryChapter } from '../../types'

export const UNIT_6_CHAPTERS: TheoryChapter[] = [
  {
    id: 'ch-36',
    unitId: 'unit-6',
    unitTitle: 'Message Brokers, Queues & Event Streaming',
    chapterNumber: 36,
    title: 'Destructive Queues vs. Append-Only Commit Logs',
    readingTimeMin: 15,
    summary:
      'Comparing asynchronous messaging paradigms: Traditional destructive queues (RabbitMQ, SQS) vs partitioned append-only event streaming logs (Apache Kafka, Redpanda).',
    coreConcepts: [
      'Destructive Queue (Push-Based): Message is delivered to one consumer and deleted upon acknowledgment (ACK). Queue size scales with unconsumed backlog.',
      'Append-Only Commit Log (Pull-Based): Messages are sequentially appended to an immutable disk log and retained regardless of consumption. Multiple independent consumer groups replay log at their own pace.',
      'Retention Model: Queues retain messages until acknowledged; event logs retain messages by time (e.g. 7 days) or size (e.g. 1 TB).',
    ],
    deepContentMarkdown: `### The Two Paradigms of Asynchronous Messaging

Asynchronous message brokers decouple producers from consumers, smoothing peak traffic loads. However, they fall into two fundamentally distinct architectural categories:

\`\`\`
DESTRUCTIVE QUEUE (RabbitMQ / SQS):
[ Producer ] ──► [ Queue ] ──(Push)──► [ Consumer ] ──(ACK)──► [ Message Deleted ]
* Ephemeral: Messages disappear once processed.

APPEND-ONLY COMMIT LOG (Kafka / Redpanda):
[ Producer ] ──► [ Immutable Partition Commit Log on Disk ]
                        │               │
                        ▼ (Offset: 12)  ▼ (Offset: 45)
                 [ Consumer Group A ] [ Consumer Group B ]
* Durable: Messages retained for days. Consumers independently read at their own speed.
\`\`\`

---

### 1. Destructive Message Queues (RabbitMQ, SQS, ActiveMQ)
* **Delivery Model:** **Push-based.** The broker pushes messages to connected worker sockets.
* **State Management:** The **broker** tracks which message is delivered to which consumer and handles timeouts.
* **Destructive Lifecycle:** Once a consumer acknowledges a message (\`basic.ack\`), the broker deletes it from memory/disk.
* **Best Used For:** Discrete, independent job dispatching (e.g. "Generate PDF report", "Send welcome email").

---

### 2. Append-Only Distributed Commit Logs (Apache Kafka, Redpanda)
* **Delivery Model:** **Pull-based.** Consumers poll batches from the broker at their own pace.
* **State Management:** The **consumer** tracks its progress via a simple integer **Offset**. The broker does zero per-message tracking.
* **Non-Destructive Lifecycle:** Messages are **never deleted upon consumption**. They are retained for days, months, or indefinitely.
* **Replayability:** A new analytics microservice deployed today can replay the last 30 days of events from offset 0!
* **Best Used For:** High-throughput event streaming, event sourcing, real-time analytics pipelines.`,
    equationsAndMath: [
      {
        name: 'Broker State Complexity',
        formula: '\\text{Queue Complexity: } \\mathcal{O}(M_{\\text{unacked}}) \\quad \\mid \\quad \\text{Log Complexity: } \\mathcal{O}(C_{\\text{groups}})',
        explanation: 'RabbitMQ memory scales with the count of in-flight unacknowledged messages M. Kafka memory overhead is constant per consumer group offset.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Destructive Queues (RabbitMQ / SQS)',
        pros: ['Flexible routing (topic exchanges, direct, fanout)', 'Complex routing topologies', 'Priority queues'],
        cons: ['Lower throughput (~50k msgs/sec)', 'Cannot replay history', 'Queue degradation under heavy backlog'],
        bestFor: 'Task workers, background job queues, transactional workflows',
      },
      {
        option: 'Append-Only Commit Logs (Kafka)',
        pros: ['Massive throughput (millions of msgs/sec)', 'Replayability from any historical offset', 'Strict ordering per partition'],
        cons: ['Cannot route individual messages to individual consumers', 'Partitions must be pre-planned'],
        bestFor: 'Data pipelines, change data capture, event sourcing, clickstream telemetry',
      },
    ],
    interviewKeypoints: [
      'Choose RabbitMQ when you need complex routing, message priority, and discrete job processing.',
      'Choose Kafka when you need high throughput (> 100k msgs/sec), replayability, and multiple independent consumer groups processing the same event stream.',
    ],
  },

  {
    id: 'ch-37',
    unitId: 'unit-6',
    unitTitle: 'Message Brokers, Queues & Event Streaming',
    chapterNumber: 37,
    title: 'Apache Kafka Internals: Zero-Copy & Storage Architecture',
    readingTimeMin: 16,
    summary:
      'Under the hood of Apache Kafka: Topic partition segment files (.log, .index, .timeindex), memory-mapped files (mmap), and the Linux sendfile(2) zero-copy system call.',
    coreConcepts: [
      'Topic Partition Layout: A partition is a physical directory on disk containing rolling segment files (default 1GB each).',
      'Sparse Indexing: Maps logical message offsets to physical byte positions in the .log file every 4KB, keeping index memory constant.',
      'Zero-Copy I/O: sendfile(2) transfers data directly from the OS Page Cache to the Network Interface Card (NIC) without CPU copying into user space.',
    ],
    deepContentMarkdown: `### The Storage Architecture of Apache Kafka

Many developers assume Apache Kafka is fast because it is written in Java and uses RAM. In reality, **Kafka achieves wire-speed performance because of sequential disk access and OS Page Cache exploitation.**

---

### 1. Partition Storage Hierarchy on Disk

Every Kafka topic is divided into partitions. On disk, a partition is a simple directory:
\`\`\`
/var/lib/kafka/data/orders-0/
  ├── 00000000000000000000.log      (Raw binary message batches)
  ├── 00000000000000000000.index    (Offset-to-physical-byte sparse index)
  └── 00000000000000000000.timeindex(Timestamp-to-offset index)
\`\`\`

* **Segment Rolling:** When a \`.log\` file reaches 1GB (or reaches \`segment.ms\`), Kafka freezes it as read-only and opens a new segment.
* **Sparse Index:** Instead of indexing every single message, Kafka records an entry in the \`.index\` file every 4KB of data. A binary search in the index identifies the approximate block, followed by a short sequential scan on disk.

---

### 2. The Linux sendfile(2) Zero-Copy Mechanism

In a traditional web application, transferring data from a file to a network socket requires **4 context switches and 3 memory copies**:

\`\`\`
Standard File-to-Socket Flow:
[ Disk ] ──(DMA)──► [ Kernel Page Cache ] ──(CPU Copy)──► [ User Space JVM ]
                                                                 │
[ NIC ]  ◄──(DMA)── [ Socket Buffer ]     ◄──(CPU Copy)──────────┘
* Total: 4 Context Switches + 2 expensive CPU data copies!
\`\`\`

#### Kafka Zero-Copy via sendfile(2):
\`\`\`
Linux sendfile(2) Zero-Copy:
[ Disk ] ──(DMA)──► [ Kernel Page Cache ] ──────────────────────► [ NIC Buffer (DMA) ]
                                     \──(Socket Descriptor Ref)
* Total: 2 Context Switches + ZERO CPU data copies!
\`\`\`

Kafka invokes the Linux \`sendfile(2)\` system call:
1. Data is transferred via Direct Memory Access (DMA) from disk to the OS Page Cache.
2. The kernel passes socket descriptors directly from Page Cache to the Network Interface Card (NIC) buffer via DMA.
3. The CPU performs **zero byte copying** between kernel and user space!
4. Even if 100 consumers read the same partition simultaneously, data is read from the Page Cache in memory at wire speed with near-zero CPU load!`,
    equationsAndMath: [
      {
        name: 'Sequential vs Random Disk I/O',
        formula: '\\text{Sequential I/O} \\approx 600 \\text{ MB/sec (SATA)} \\quad \\mid \\quad \\text{Random I/O} \\approx 1-5 \\text{ MB/sec}',
        explanation: 'Sequential disk access matches or exceeds random memory access speeds on modern hardware.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'OS Page Cache with Zero-Copy (Kafka)',
        pros: ['Near wire-speed network egress', 'Zero JVM garbage collection pressure on message data', 'Survives application restarts'],
        cons: ['Tightly coupled to OS page cache performance'],
        bestFor: 'High-throughput event logs',
      },
    ],
    interviewKeypoints: [
      'Explain sendfile(2) zero-copy: Data travels directly from OS Page Cache to the NIC buffer via DMA, bypassing user-space JVM memory entirely.',
      'Explain that Kafka partitions are append-only sequential log segments paired with sparse memory-mapped indices.',
    ],
  },

  {
    id: 'ch-38',
    unitId: 'unit-6',
    unitTitle: 'Message Brokers, Queues & Event Streaming',
    chapterNumber: 38,
    title: 'Consumer Groups, Rebalancing & Offset Management',
    readingTimeMin: 15,
    summary:
      'Scaling event consumption: Consumer group partition assignment strategies (Range, RoundRobin, Cooperative Sticky), rebalance storms, and the __consumer_offsets topic.',
    coreConcepts: [
      'Consumer Group Concept: A set of consumers that cooperate to consume data from a topic. Each partition is assigned to exactly one consumer within the group.',
      'Partition Ceiling: If a topic has 10 partitions and a consumer group has 15 consumer instances, 5 consumers sit completely idle!',
      'Rebalance Protocols: Eager rebalancing (stops the world) vs Cooperative Sticky rebalancing (incremental partition migration).',
      'Offset Committing: Consumers periodically write their processed offsets to the internal __consumer_offsets topic.',
    ],
    deepContentMarkdown: `### The Scaling Model of Consumer Groups

To scale consumption horizontally, Kafka groups consumer instances into a **Consumer Group**:

\`\`\`
Topic: "orders" (4 Partitions)
  [ Partition 0 ] ─────────────► [ Consumer 1 ]
  [ Partition 1 ] ─────────────► [ Consumer 1 ]
  [ Partition 2 ] ─────────────► [ Consumer 2 ]
  [ Partition 3 ] ─────────────► [ Consumer 3 ]
\`\`\`

#### The Golden Invariant of Kafka Consumer Groups:
$$\\text{An individual partition can be consumed by at most ONE consumer instance within a group.}$$

* If Partitions > Consumers: A single consumer is assigned multiple partitions.
* If Partitions == Consumers: Perfect 1-to-1 mapping.
* If Partitions < Consumers: Excess consumers are **idle** and receive zero data!

---

### Consumer Rebalancing Protocols

When a consumer crashes, leaves, or joins the group, the Group Coordinator broker triggers a **Rebalance** to redistribute partitions.

#### 1. Eager Rebalance (Legacy / Anti-Pattern)
* **Stop-the-World:** All consumers revoke all their assigned partitions and stop processing immediately.
* Consumers rejoin the group and wait for the coordinator to assign new partitions.
* **The Rebalance Storm:** In large clusters, eager rebalances can pause stream processing for minutes, triggering cascading timeouts.

#### 2. Cooperative Sticky Rebalance (Modern Default)
* Introduced in Kafka 2.4.
* **Incremental migration:** Consumers continue processing healthy, unaffected partitions.
* Only the specific partitions that need to be relocated are revoked and reassigned in a second lightweight phase.
* Reduces rebalance downtime from minutes to milliseconds!

---

### Offset Management: The \`__consumer_offsets\` Topic
* Consumers commit their progress by publishing messages to an internal compacted topic: \`__consumer_offsets\`.
* **Commit Strategies:**
  * **Auto-Commit (\`enable.auto.commit = true\`):** Commits offsets periodically (e.g. every 5s). Risk of data loss if consumer crashes after offset commit but before processing completes.
  * **Manual Synchronous Commit (\`commitSync\`):** Commits offset after business processing completes. High reliability, but pauses consumer loop.
  * **Manual Asynchronous Commit with Sync on Close:** Production best practice.`,
    equationsAndMath: [
      {
        name: 'Maximum Consumer Parallelism Bound',
        formula: '\\text{Max Active Consumers} = \\text{Number of Partitions}',
        explanation: 'You cannot scale active consumers beyond the partition count of the topic.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Eager Rebalance Protocol',
        pros: ['Simple deterministic partition assignment'],
        cons: ['Stop-the-world pauses, high latency spikes during consumer churn'],
        bestFor: 'Legacy systems',
      },
      {
        option: 'Cooperative Sticky Rebalance',
        pros: ['Zero stop-the-world pauses', 'Incremental partition handoff'],
        cons: ['Slightly more complex protocol handshake'],
        bestFor: 'All modern Kafka production deployments',
      },
    ],
    interviewKeypoints: [
      'Remind interviewers that you cannot scale consumers past the number of partitions—partitions are the unit of parallelism in Kafka.',
      'Explain Cooperative Sticky Rebalancing to prevent stop-the-world consumer pauses.',
    ],
  },

  {
    id: 'ch-39',
    unitId: 'unit-6',
    unitTitle: 'Message Brokers, Queues & Event Streaming',
    chapterNumber: 39,
    title: 'Delivery Guarantees: At-Most-Once to Exactly-Once (EOS)',
    readingTimeMin: 16,
    summary:
      'The reality of messaging semantics: At-Most-Once (dropped messages), At-Least-Once (duplicates on retry), and Kafka Exactly-Once Semantics (idempotent producers and transactional coordinators).',
    coreConcepts: [
      'At-Most-Once: Messages may be lost, but are never duplicated. Offsets committed BEFORE processing.',
      'At-Least-Once: Messages are never lost, but may be duplicated on network retry. Offsets committed AFTER processing. Consumers must be idempotent.',
      'Exactly-Once Semantics (EOS): Each message is processed exactly once, even during producer, broker, or consumer crashes.',
      'Kafka EOS Mechanics: Idempotent Producer (Producer ID + Monotonic Sequence Number) + Transaction Coordinator (__transaction_state).',
    ],
    deepContentMarkdown: `### The Three Delivery Guarantees

In distributed systems subject to network timeouts and machine crashes, message delivery semantics define the contract between producer, broker, and consumer:

---

### 1. At-Most-Once Delivery
* **How it happens:**
  * Producer sends with \`acks=0\` (fire-and-forget). If packet drops, message is lost.
  * Consumer reads message, **commits offset to broker immediately**, and then executes business logic.
* **If consumer crashes:** The message was never processed, but the offset was already committed! When the consumer restarts, it skips the failed message.
* **Result:** Zero duplicates, but **data loss is possible**. Acceptable only for loss-tolerant telemetry metrics.

---

### 2. At-Least-Once Delivery (Industry Standard)
* **How it happens:**
  * Producer sends with \`acks=all\`. If ACK times out, producer retries.
  * Consumer reads message, **executes business logic**, and **commits offset to broker only after success**.
* **If consumer crashes:** The consumer executed business logic, but crashed before committing the offset. When it restarts, it re-reads and re-executes the message.
* **Result:** **Zero data loss**, but **duplicate messages will occur**.
* **Mandatory Rule:** **Consumers MUST be made idempotent** using unique transaction IDs or idempotency tables!

---

### 3. Exactly-Once Semantics (EOS) in Kafka

Can a distributed system deliver true **Exactly-Once Semantics**? Yes, within an end-to-end Kafka-to-Kafka pipeline (e.g. Kafka Streams or Flink).

#### 1. The Idempotent Producer
* Producer is assigned a 64-bit **Producer ID (PID)** by the broker.
* Each message sent to a partition receives a monotonically increasing **Sequence Number** (0, 1, 2...).
* The broker stores the highest sequence number received per PID:
  * If producer retries sending message #5 due to a network timeout, the broker sees sequence #5 is already committed and **silently drops the duplicate byte batch**, returning success!

#### 2. Transactional Coordinator (Read-Process-Write)
In a stream processing loop:
1. Consumer reads from Topic A.
2. Worker transforms data.
3. Producer writes to Topic B AND writes consumer offset to \`__consumer_offsets\`.
* Using **Two-Phase Commit** coordinated by Kafka\'s \`TransactionCoordinator\` over the \`__transaction_state\` topic, the write to Topic B and the consumer offset commit are **committed atomically as a single transaction**. Either both become visible, or both abort!`,
    equationsAndMath: [
      {
        name: 'Idempotent Producer Deduplication Rule',
        formula: '\\text{Broker Accept Condition: } \\text{Seq}_{\\text{incoming}} = \\text{Seq}_{\\text{last}} + 1',
        explanation: 'Brokers reject sequence numbers <= Seq_last as duplicates, and reject sequence numbers > Seq_last + 1 as out-of-order gaps.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'At-Least-Once with Idempotent Consumer',
        pros: ['High throughput', 'Resilient to crashes', 'Simpler infrastructure'],
        cons: ['Application code must implement deduplication state'],
        bestFor: 'General microservices, payment processing, email notifications',
      },
      {
        option: 'Kafka Exactly-Once Semantics (EOS)',
        pros: ['Strict end-to-end exactly-once stream processing', 'Zero duplicate state in downstream topics'],
        cons: ['Slight throughput reduction (~10-15%) due to transaction coordinator commits'],
        bestFor: 'Financial balance streaming, stream processing (Flink, Kafka Streams)',
      },
    ],
    interviewKeypoints: [
      'Explain that Exactly-Once in Kafka requires two components: Idempotent Producers (PID + sequence numbers) and Transactional Coordinators.',
      'Emphasize that outside a closed Kafka pipeline (e.g. writing to an external database or third-party API), At-Least-Once with an Idempotent Consumer is the only practical solution.',
    ],
  },

  {
    id: 'ch-40',
    unitId: 'unit-6',
    unitTitle: 'Message Brokers, Queues & Event Streaming',
    chapterNumber: 40,
    title: 'RabbitMQ Internals: AMQP, Exchanges & Dead Letters',
    readingTimeMin: 14,
    summary:
      'The Advanced Message Queuing Protocol (AMQP 0-9-1): Direct, Fanout, Topic, and Headers exchanges, consumer acknowledgments, and Dead-Letter Exchanges (DLX) for failed messages.',
    coreConcepts: [
      'AMQP Core Model: Producers publish to Exchanges; Exchanges route to Queues via Bindings; Consumers subscribe to Queues.',
      'Exchange Types: Direct (exact routing key match), Fanout (broadcast to all bound queues), Topic (wildcard routing key matching e.g. "audit.*.eu"), Headers (metadata attribute matching).',
      'Dead-Letter Exchange (DLX): Automatically routes messages that are rejected (basic.reject/nack), expired (TTL), or overflow queue limits to a dead-letter queue for forensic debugging.',
    ],
    deepContentMarkdown: `### The AMQP Architecture of RabbitMQ

Unlike Kafka, where producers write directly to partition logs, RabbitMQ decouples message ingestion through the **AMQP 0-9-1 Model**:

\`\`\`
[ Producer ] ──► [ Exchange ] ──(Binding Key)──► [ Queue ] ──► [ Consumer ]
\`\`\`

Producers **never publish directly to a queue**. They publish to an **Exchange**, which inspects routing keys and routes copies of the message into zero, one, or multiple bound queues.

---

### The Four Exchange Types

1. **Direct Exchange:**
   * Routes messages to queues whose **Binding Key exactly matches** the message\'s **Routing Key**.
   * *Example:* \`routing_key = "pdf_convert"\` routes exclusively to \`pdf_queue\`.
2. **Fanout Exchange:**
   * Ignores routing keys completely.
   * Copies and broadcasts incoming messages to **every single queue bound to the exchange**.
   * *Example:* \`OrderCreated\` event broadcast simultaneously to Inventory, Shipping, and Analytics queues.
3. **Topic Exchange (Wildcard Routing):**
   * Matches routing keys using dot-separated tokens with wildcards:
     * \`*\` (asterisk): Matches exactly one word.
     * \`#\` (hash): Matches zero or more words.
   * *Example:* Binding key \`"log.*.error"\` matches \`"log.payment.error"\` and \`"log.auth.error"\`.
4. **Headers Exchange:**
   * Routes based on AMQP header attributes instead of string routing keys.

---

### Dead-Letter Exchanges (DLX)
When a message cannot be processed, dropping it silently is dangerous. RabbitMQ provides **Dead-Letter Exchanges (DLX)**:

A message is dead-lettered when:
1. It is rejected with requeue=false: \`basic.reject(requeue=false)\` or \`basic.nack\`.
2. The message TTL expires in the queue.
3. The queue reaches its maximum length limit.

RabbitMQ automatically re-publishes the rejected message to the designated DLX, which deposits it into a \`dead_letter_queue\` where operations teams can inspect payloads and trigger manual retries.`,
    equationsAndMath: [
      {
        name: 'RabbitMQ Prefetch Buffer Limit',
        formula: '\\text{Max In-Flight Messages} = \\text{Consumer Count} \\times \\text{basic.qos(prefetch\\_count)}',
        explanation: 'Setting a strict prefetch limit (e.g. prefetch=10) prevents a fast producer from overwhelming a single consumer\'s memory buffer.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'RabbitMQ (Erlang BEAM)',
        pros: ['Rich routing topologies', 'Per-message TTL and dead-lettering', 'Native consumer push model'],
        cons: ['Memory overhead scales with queue backlog', 'Clustering requires careful partition tuning'],
        bestFor: 'Task execution, complex routing workflows, enterprise integration',
      },
    ],
    interviewKeypoints: [
      'Explain that RabbitMQ producers publish to Exchanges, not queues.',
      'Configure a Dead-Letter Exchange (DLX) to handle poison pill messages that crash worker consumers.',
    ],
  },

  {
    id: 'ch-41',
    unitId: 'unit-6',
    unitTitle: 'Message Brokers, Queues & Event Streaming',
    chapterNumber: 41,
    title: 'Event Sourcing & CQRS Architectural Patterns',
    readingTimeMin: 15,
    summary:
      'Replacing CRUD with immutable append-only event streams: Greg Young\'s Event Sourcing, command/query responsibility segregation (CQRS), projections, and temporal snapshots.',
    coreConcepts: [
      'Event Sourcing: Store the state of an application not as current values, but as an append-only sequence of immutable domain events (e.g. AccountCreated, MoneyDeposited, MoneyWithdrawn).',
      'Current State as a Fold/Reduce: State = reduce(events, initial_state). Current balance is computed by replaying events.',
      'CQRS: Split the system into a Write Model (Commands) optimized for transactional integrity and a Read Model (Queries) optimized for fast denormalized lookups.',
      'Projections: Background workers consume events and project them into read-optimized databases (Elasticsearch, Redis, Postgres).',
    ],
    deepContentMarkdown: `### The Limits of Traditional CRUD

In standard CRUD applications:
\`\`\`sql
UPDATE bank_accounts SET balance = 500 WHERE id = 123;
\`\`\`
The database discards previous state. We know the balance is $500, but we have lost the history of *how* it became $500 (was it five $100 deposits, or a $1,000 deposit followed by a $500 withdrawal?).

---

### Event Sourcing Core Architecture

In **Event Sourcing**, state mutations are modeled as an immutable log of past-tense facts (**Events**):

\`\`\`
Event 1: AccountOpened(id=123, owner="Alice")
Event 2: MoneyDeposited(id=123, amount=$1000)
Event 3: MoneyWithdrawn(id=123, amount=$500)
\`\`\`

* **The Event Store:** Append-only database (e.g. EventStoreDB, Kafka, or an append-only Postgres table). Events are **never modified or deleted**.
* **State Derivation:** Current state is reconstructed by replaying the event stream:
  $$\\text{Current State} = \\text{fold}(\\text{ApplyEvent}, \\text{InitialState}, \\text{Events})$$
* **Performance Optimization (Snapshots):** To avoid replaying 100,000 events on every read, the system writes a periodic **Snapshot** every 1,000 events. Replay starts from the latest snapshot!

---

### CQRS (Command Query Responsibility Segregation)

Event stores are terrible at complex queries (e.g. \`SELECT * FROM users WHERE age > 30 AND country = 'FR'\`).

**CQRS** separates the Write path from the Read path:

\`\`\`
[ Client ]
    │
    ├──(Command: "Withdraw $100")──► [ Command Handler ] ──► [ Event Store (Write Model) ]
    │                                                                   │
    │                                                      (Publish Event: "MoneyWithdrawn")
    │                                                                   ▼
    │                                                        [ Projection Worker ]
    │                                                                   │
    │                                                      (Update Denormalized Read View)
    │                                                                   ▼
    └──(Query: "Get Account Details") ────────────────────────► [ Read DB (Postgres/Redis) ]
\`\`\`

1. **Write Model (Commands):**
   * Validates business invariants.
   * Appends events to the Event Store.
2. **Read Model (Queries):**
   * Workers consume events and build **Projections** in databases tailored for queries:
     * Full-text search projected into **Elasticsearch**.
     * User profiles projected into **Redis**.
     * Relational reports projected into **PostgreSQL**.`,
    equationsAndMath: [
      {
        name: 'Event Sourcing State Function',
        formula: 'S_t = \\sum_{i=1}^t \\Delta E_i',
        explanation: 'State at time t is the cumulative deterministic aggregation of all events E up to time t.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Event Sourcing + CQRS',
        pros: ['100% complete audit trail', 'Time travel debugging (replay state at any historical moment)', 'Independent read/write scaling'],
        cons: ['High architectural complexity', 'Eventual consistency on read views (projection lag)', 'Schema evolution of events is difficult'],
        bestFor: 'Financial systems, insurance claims, order management, medical histories',
      },
    ],
    interviewKeypoints: [
      'Explain that Event Sourcing provides an infallible audit log, and CQRS enables independently scaling reads and writes.',
      'Acknowledge the eventual consistency trade-off: Read projections lag behind the write model by milliseconds.',
    ],
  },

  {
    id: 'ch-42',
    unitId: 'unit-6',
    unitTitle: 'Message Brokers, Queues & Event Streaming',
    chapterNumber: 42,
    title: 'Stream Processing: Windows, Watermarks & Triggers',
    readingTimeMin: 15,
    summary:
      'Real-time continuous stream analytics: Tumbling, Hopping, and Sliding windows, dealing with out-of-order data using Watermarks, and stateful stream processing in Apache Flink.',
    coreConcepts: [
      'Event Time vs Processing Time: Event Time is when the event occurred on the client device; Processing Time is when the stream processor encounters the event.',
      'Window Types: Tumbling (fixed, non-overlapping), Hopping/Sliding (fixed length, overlapping interval), Session (gap-based inactivity boundaries).',
      'Watermarks: A heuristic clock metric declaring: "We assume all events with Event Time <= W have been received."',
      'Late-Arriving Data: Handled via allowed lateness windows, side outputs, or state updates.',
    ],
    deepContentMarkdown: `### The Fundamentals of Stream Processing

Unlike batch processing (Hadoop, MapReduce) which processes bounded datasets on a schedule, **Stream Processing** (Apache Flink, Spark Streaming) processes unbounded, infinite data streams in real time with sub-second latency.

---

### Event Time vs. Processing Time
* **Processing Time:** The local clock of the machine executing the stream processor when it handles the event.
  * Simple, but incorrect if network delays or mobile offline mode cause events to arrive out of order.
* **Event Time:** The timestamp embedded inside the event when it physically occurred on the user\'s mobile phone.
  * Essential for correct business logic (e.g. fraud detection during flight mode).

---

### The Three Windowing Models

\`\`\`
1. TUMBLING WINDOWS (Fixed, Non-Overlapping):
[ 12:00 - 12:05 ] [ 12:05 - 12:10 ] [ 12:10 - 12:15 ]

2. HOPPING / SLIDING WINDOWS (Fixed Length, Overlapping Intervals):
[ 12:00 ── 12:05 ]
      [ 12:01 ── 12:06 ]
            [ 12:02 ── 12:07 ]

3. SESSION WINDOWS (Dynamic Gap Inactivity):
[ User Actions ] ── (30 min inactivity gap) ──► Window Closes!
\`\`\`

---

### Watermarks: Solving Out-of-Order Data
Because mobile networks have variable latency, an event from $12:02$ might arrive *after* an event from $12:05$.
How does a stream processor know when a window (e.g. $12:00 - 12:05$) is safe to close and output results?

**Watermarks:**
* A Watermark $W(t)$ is a control event flowing through the data stream asserting that **no further events with event time $\\le t$ will arrive**.
* **Bounded Out-of-Orderness:** A common heuristic generates $W(t) = \\max(\\text{EventTime}) - 5\\text{ seconds}$.
* When Watermark $W(12:05:00)$ arrives, the $12:00 - 12:05$ window fires its computation and emits aggregated results!

---

### Late-Arriving Data
If an event arrives with timestamp $12:03$ *after* Watermark $W(12:05)$ has already passed:
1. **Drop:** Silently discard the late event.
2. **Allowed Lateness:** Re-fire and update the historical window computation.
3. **Side Output:** Route late events to a Dead-Letter Kafka topic for manual review.`,
    equationsAndMath: [
      {
        name: 'Bounded Out-of-Order Watermark Formula',
        formula: 'W = \\max_{i}(t_{\\text{event}, i}) - \\Delta_{\\text{delay}}',
        explanation: 'Generates a watermark that trails the maximum observed event timestamp by a fixed buffer delay Delta.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Small Watermark Delay (e.g. 1 second)',
        pros: ['Low latency output results'],
        cons: ['Higher volume of late-arriving data dropped'],
        bestFor: 'Real-time monitoring dashboards',
      },
      {
        option: 'Large Watermark Delay (e.g. 60 seconds)',
        pros: ['Captures 99.9% of out-of-order mobile events'],
        cons: ['Output latency delayed by 60 seconds'],
        bestFor: 'Billing and financial ad click aggregations',
      },
    ],
    interviewKeypoints: [
      'Differentiate between Event Time (client timestamp) and Processing Time (server timestamp).',
      'Explain how Watermarks balance latency against completeness when aggregating out-of-order event streams.',
    ],
  },
]
