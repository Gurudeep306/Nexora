import type { TheoryChapter } from '../../types'

export const UNIT_2_CHAPTERS: TheoryChapter[] = [
  {
    id: 'ch-08',
    unitId: 'unit-2',
    unitTitle: 'Consistency Models, Isolation & Transactions',
    chapterNumber: 8,
    title: 'The Consistency Hierarchy: Strict Serializability to Eventual Consistency',
    readingTimeMin: 15,
    summary:
      'A rigorous deconstruction of the distributed consistency spectrum: Strict Serializability, Linearizability, Sequential Consistency, Causal Consistency, Read-Your-Writes, Monotonic Reads, and Eventual Consistency.',
    coreConcepts: [
      'Strict Serializability: The gold standard. Combines Serializability (transactions appear serial) with Linearizability (real-time order preserved).',
      'Linearizability (Strong Consistency): Single-operation, real-time guarantee. Once a write finishes at t1, all reads at t2 > t1 must observe that write.',
      'Sequential Consistency: Operations appear in some global sequential order that respects the program order of each individual process, but not necessarily real-time wall-clock order.',
      'Causal Consistency: Causally related events appear in the same order on all replicas; concurrent events can appear in differing orders.',
      'Eventual Consistency: If no new updates are made, all replicas will eventually converge to the same value.',
    ],
    deepContentMarkdown: `### The Full Consistency Hierarchy

Consistency in distributed systems is not a binary switch (strong vs. eventual); it is a rigorous spectrum of formal mathematical models:

\`\`\`
                  [ STRICT SERIALIZABILITY ]
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
     [ SERIALIZABILITY ]               [ LINEARIZABILITY ]
             │                                 │
             ▼                                 ▼
   [ REPEATABLE READ ]               [ CAUSAL CONSISTENCY ]
             │                                 │
             ▼                                 ▼
    [ READ COMMITTED ]               [ READ-YOUR-WRITES ]
             │                                 │
             ▼                                 ▼
   [ READ UNCOMMITTED ]              [ MONOTONIC READS ]
                                               │
                                               ▼
                                     [ EVENTUAL CONSISTENCY ]
\`\`\`

---

### 1. Strict Serializability (External Consistency)
* Combines **Serializability** (multi-operation ACID transactional safety) with **Linearizability** (real-time wall-clock ordering).
* **Guarantees:** Transactions execute as if one after another in a single-threaded queue, AND if transaction $T_2$ is invoked in real time after $T_1$ returns a success response to the client, $T_2$ is guaranteed to be ordered strictly after $T_1$.
* **Implementations:** Google Spanner, CockroachDB (with serializable isolation enabled), FoundationDB.

---

### 2. Linearizability (Single-Operation)
* Formulated by Maurice Herlihy and Jeannette Wing in 1990.
* Defines a register where every read and write takes effect instantaneously at a linearization point between its invocation and its response.
* If Client A writes \`x = 5\` and receives ACK at $12:00:00.100$, any Client B issuing a read at $12:00:00.101$ **must** observe \`x = 5\` or a newer value.
* **Implementations:** ZooKeeper (with \`sync\`), etcd, Raft state machines.

---

### 3. Causal Consistency
* The strongest consistency model achievable in an entirely partition-tolerant (AP) system.
* Preserves Lamport\'s happened-before causal graph:
  * If Question $A$ causes Answer $B$ ($A \\rightarrow B$), all readers will see $A$ before $B$.
  * If Event $C$ and Event $D$ are concurrent and causally independent ($C \\parallel D$), different nodes may observe $C$ before $D$ or $D$ before $C$.

---

### 4. Client-Centric Consistency Models
For systems that cannot afford global synchronization, client-centric models preserve user sanity:
* **Read-Your-Writes:** A client that writes value $V$ will always observe value $V$ on subsequent reads, even if redirected to another replica.
* **Monotonic Reads:** If a client reads state at time $t_1$, it will never subsequently read an older state from a lagging replica (no time travel backwards).
* **Monotonic Writes:** A client\'s writes are applied in the order they were submitted.`,
    equationsAndMath: [
      {
        name: 'Linearizability Invariant',
        formula: '\\forall op_1, op_2: \\text{resp}(op_1) <_{\\text{real}} \\text{inv}(op_2) \\implies op_1 <_{\\text{order}} op_2',
        explanation: 'If operation 1 completes before operation 2 begins in real time, operation 1 must precede operation 2 in the linear order.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Linearizability / Strict Serializability',
        pros: ['Simplest mental model for application developers', 'Prevents race conditions and phantom reads'],
        cons: ['Highest latency', 'Unavailable during network partitions'],
        bestFor: 'Financial balances, unique constraints (username registration), locks',
      },
      {
        option: 'Eventual Consistency',
        pros: ['Maximum write throughput', '100% availability during network splits', 'Sub-millisecond responses'],
        cons: ['Stale reads', 'Temporary data anomalies', 'Complex conflict resolution required'],
        bestFor: 'Social media view counts, product reviews, analytics counters',
      },
    ],
    interviewKeypoints: [
      'Do not confuse Serializability (transactional isolation) with Linearizability (real-time single-key recency).',
      'Explain how a system can be Serializable without being Linearizable, and vice versa.',
    ],
  },

  {
    id: 'ch-09',
    unitId: 'unit-2',
    unitTitle: 'Consistency Models, Isolation & Transactions',
    chapterNumber: 9,
    title: 'Transactional Anomalies: From Dirty Reads to Write Skew',
    readingTimeMin: 16,
    summary:
      'The flaws in the 1992 ANSI SQL isolation definitions, Berenson et al.\'s 1995 critique, and the exact anatomy of Dirty Reads, Non-Repeatable Reads, Phantoms, Read Skew, and Write Skew.',
    coreConcepts: [
      'ANSI SQL Flaws: The 1992 ANSI standard defined isolation levels only in terms of locking anomalies, missing Snapshot Isolation and Write Skew.',
      'Dirty Read (G1a): Reading uncommitted data that is subsequently rolled back.',
      'Non-Repeatable / Fuzzy Read (G1b): Re-reading a row within a transaction and seeing modified values.',
      'Phantom Read (A3): Re-executing a range predicate query and finding newly inserted rows.',
      'Write Skew (A5B): Concurrent transactions read overlapping datasets, make disjoint updates based on local invariants, and violate global constraints.',
    ],
    deepContentMarkdown: `### The ANSI SQL Isolation Flaw (Berenson et al., 1995)

In 1992, the ANSI SQL standard defined four transaction isolation levels based on three phenomenon:
1. **Read Uncommitted** (permits Dirty Reads)
2. **Read Committed** (prevents Dirty Reads)
3. **Repeatable Read** (prevents Dirty Reads and Fuzzy Reads)
4. **Serializable** (prevents all anomalies including Phantoms)

In 1995, Hal Berenson, Jim Gray, and colleagues published *"A Critique of ANSI SQL Isolation Levels"*, demonstrating that the ANSI definitions were incomplete, ambiguous, and failed to account for multi-version concurrency control (MVCC) and modern anomalies like **Write Skew**.

---

### The Anatomy of Concurrency Anomalies

#### 1. Dirty Read ($G1a$)
* Transaction $T_1$ modifies row $R$ (\`UPDATE accounts SET balance = balance - 100 WHERE id = 1\`).
* Transaction $T_2$ reads row $R$ and sees the reduced balance.
* Transaction $T_1$ encounters an error and rolls back (\`ROLLBACK\`).
* **Result:** $T_2$ executed logic based on phantom data that never committed to the database.

#### 2. Non-Repeatable / Fuzzy Read ($G1b$)
* Transaction $T_1$ reads row $R$ and sees balance = $500.
* Transaction $T_2$ modifies row $R$ to balance = $400 and commits.
* Transaction $T_1$ re-reads row $R$ and sees balance = $400.
* **Result:** $T_1$ observed differing data within the same transaction scope.

#### 3. Phantom Read ($A3$)
* Transaction $T_1$ reads all users where \`status = 'ACTIVE'\` (returns 5 rows).
* Concurrently, Transaction $T_2$ inserts a new active user (\`INSERT INTO users VALUES ('alice', 'ACTIVE')\`) and commits.
* Transaction $T_1$ re-executes the query and now receives 6 rows.
* **Result:** The range predicate returned phantom rows that did not exist during the initial read.

#### 4. Write Skew ($A5B$) - The Snapshot Isolation Blindspot
Under **Snapshot Isolation** (the default in PostgreSQL and Oracle), each transaction reads from a private snapshot of the database taken at transaction start. Write-write conflicts on the *same row* are detected via "First-Committer-Wins".

**However, Snapshot Isolation does NOT prevent Write Skew when transactions modify *different rows* based on overlapping predicate reads:**

* **The Hospital On-Call Invariant:** At least one doctor must be on call at all times.
* Currently, Doctor Alice and Doctor Bob are both on call (count = 2).
* **Transaction 1 (Alice):**
  1. Checks count: \`SELECT COUNT(*) FROM doctors WHERE on_call = true\` (returns 2).
  2. Invariant is satisfied (2 > 1), so Alice goes off call: \`UPDATE doctors SET on_call = false WHERE name = 'Alice'\`.
* **Transaction 2 (Bob, Concurrent):**
  1. Checks count: \`SELECT COUNT(*) FROM doctors WHERE on_call = true\` (reads its snapshot, returns 2).
  2. Invariant is satisfied (2 > 1), so Bob goes off call: \`UPDATE doctors SET on_call = false WHERE name = 'Bob'\`.
* **The Disaster:**
  Both transactions commit successfully under Snapshot Isolation because Alice modified Alice's row and Bob modified Bob's row—there was zero row-level write conflict!
  **Invariant violated: 0 doctors are now on call.**

* **Mitigation:** Requires **Serializable Isolation** (via Serializable Snapshot Isolation / SSI) or explicit pessimistic range locking (\`SELECT ... FOR UPDATE\`).`,
    equationsAndMath: [
      {
        name: 'Write Skew Phenomenon Condition',
        formula: 'R_1(S) \\cap R_2(S) \\neq \\emptyset \\quad \\land \\quad W_1(S_1) \\cap W_2(S_2) = \\emptyset \\quad \\land \\quad \\text{Invariant}(S_1 \\cup S_2) = \\text{False}',
        explanation: 'Write skew occurs when two concurrent transactions read overlapping sets S but modify disjoint rows S1 and S2, resulting in an invariant violation when both commit.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Snapshot Isolation (Repeatable Read)',
        pros: ['Readers never block writers; writers never block readers', 'High concurrency', 'Prevents dirty & fuzzy reads'],
        cons: ['Vulnerable to Write Skew anomalies'],
        bestFor: 'General application workloads where cross-row invariants are minimal',
      },
      {
        option: 'Serializable Isolation (SSI)',
        pros: ['Guaranteed immunity from Write Skew and all anomalies', 'Strict correctness'],
        cons: ['Transaction abort/retry overhead under write contention'],
        bestFor: 'Financial accounting, shift scheduling, ticket seating reservations',
      },
    ],
    interviewKeypoints: [
      'Give the Hospital On-Call or Meeting Room Double-Booking example when asked to explain Write Skew.',
      'Explain why Snapshot Isolation fails to catch Write Skew: because the transactions modify different rows, neither row conflict triggers.',
    ],
  },

  {
    id: 'ch-10',
    unitId: 'unit-2',
    unitTitle: 'Consistency Models, Isolation & Transactions',
    chapterNumber: 10,
    title: 'Multi-Version Concurrency Control (MVCC) Internals',
    readingTimeMin: 14,
    summary:
      'How PostgreSQL and MySQL InnoDB implement MVCC: xmin/xmax transaction visibility, undo logs, vacuuming, and lock-free snapshot reads.',
    coreConcepts: [
      'MVCC Core Principle: Readers never block writers; writers never block readers.',
      'Row Version Metadata: In PostgreSQL, each tuple contains hidden header fields xmin (creating transaction) and xmax (deleting/overwriting transaction).',
      'Snapshot Visibility Rule: A row is visible to transaction T if xmin committed before T started and xmax is either not set, aborted, or committed after T started.',
      'Vacuuming & Garbage Collection: Dead tuples must be periodically cleaned up (PostgreSQL VACUUM vs MySQL Undo Log purge).',
    ],
    deepContentMarkdown: `### The Architecture of MVCC

Multi-Version Concurrency Control (MVCC) is the engine powering modern relational databases. Instead of locking data rows during read queries, the storage engine maintains multiple concurrent versions of every modified row.

---

### Row Version Anatomy (PostgreSQL Model)

In PostgreSQL, every disk tuple contains hidden system headers:
* \`xmin\`: The Transaction ID (XID) that inserted this version.
* \`xmax\`: The Transaction ID that deleted or updated this version (initially 0).

When an \`UPDATE\` occurs:
1. The old tuple is NOT overwritten in place. Its \`xmax\` is set to the current transaction ID.
2. A new tuple is inserted onto disk with \`xmin\` set to the current transaction ID and \`xmax = 0\`.

\`\`\`
Tuple v1: [xmin: 100, xmax: 105, data: "Alice: $500"]  <-- Deleted by Tx 105
Tuple v2: [xmin: 105, xmax: 0,   data: "Alice: $400"]  <-- Active version
\`\`\`

---

### Snapshot Visibility Algorithm

When Transaction $T_{\\text{curr}}$ with ID 108 starts under Snapshot Isolation, the database captures a snapshot of the active transaction state:
* \`snapshot.xmin\`: Lowest active transaction ID at start.
* \`snapshot.xmax\`: Highest committed transaction ID at start.
* \`snapshot.xip_list\`: List of active, in-progress transaction IDs at start.

A tuple is visible to $T_{\\text{curr}}$ if:
1. Tuple\'s \`xmin\` is committed AND $\\text{xmin} < \\text{snapshot.xmax}$ AND $\\text{xmin} \\notin \\text{snapshot.xip_list}$.
2. Tuple\'s \`xmax\` is either:
   * 0 (not deleted).
   * Aborted / rolled back.
   * Greater than $\\text{snapshot.xmax}$ (deleted in the future).
   * Active in $\\text{snapshot.xip_list}$ at snapshot creation time.

---

### The Cost of MVCC: Bloat and Vacuuming
Because old tuple versions are left on disk, high-write databases accumulate **dead tuples**.
* **PostgreSQL:** Background **Auto-Vacuum** workers periodically scan pages, reclaim dead tuple space, and freeze old Transaction IDs to prevent 32-bit transaction wraparound.
* **MySQL InnoDB:** Uses an in-place modification model with an **Undo Log** chain; old versions are reconstructed dynamically from the undo log and purged once older read views complete.`,
    equationsAndMath: [
      {
        name: 'Transaction ID Wraparound Limit',
        formula: '2^{32} \\approx 4.29 \\times 10^9 \\text{ transactions}',
        explanation: '32-bit transaction IDs in PostgreSQL require periodic aggressive vacuum freezing; failure to freeze triggers emergency database read-only shutdown.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Append-Only MVCC (Postgres)',
        pros: ['Fast writes (appends new row versions)', 'Simple crash recovery'],
        cons: ['Table bloat requires vacuuming', 'Write amplification on indexed tables (HOT optimization helps)'],
        bestFor: 'Analytical reads mixed with moderate transactional writes',
      },
      {
        option: 'Rollback Segment / Undo Log MVCC (MySQL InnoDB)',
        pros: ['Zero table bloat on disk', 'Fast index lookups'],
        cons: ['Long-running transactions cause Undo Log to balloon, slowing down older reads'],
        bestFor: 'Heavy transaction processing with short-lived queries',
      },
    ],
    interviewKeypoints: [
      'Memorize the mantra: "Readers never block writers, and writers never block readers."',
      'Explain how PostgreSQL uses xmin/xmax headers while MySQL InnoDB uses an Undo Log pointer chain.',
    ],
  },

  {
    id: 'ch-11',
    unitId: 'unit-2',
    unitTitle: 'Consistency Models, Isolation & Transactions',
    chapterNumber: 11,
    title: 'Two-Phase Commit (2PC) & Three-Phase Commit (3PC)',
    readingTimeMin: 15,
    summary:
      'Atomic distributed transaction coordination across heterogeneous databases: The Prepare and Commit phases, the blocking coordinator flaw, and why Three-Phase Commit fails in practice.',
    coreConcepts: [
      'Two-Phase Commit (2PC): Phase 1 (Prepare / Voting) and Phase 2 (Commit / Abort).',
      'The Blocking Coordinator Flaw: If the coordinator crashes after nodes vote "YES", participants are blocked indefinitely holding locks.',
      'Three-Phase Commit (3PC): Adds PreCommit phase and timeouts to make protocol non-blocking under network partitions, but fails in asynchronous networks.',
      'X/Open XA standard: Enterprise protocol for distributed 2PC transactions.',
    ],
    deepContentMarkdown: `### The Two-Phase Commit Protocol (2PC)

When a transaction spans multiple independent database shards or services (e.g. updating an order in Postgres and updating points in MongoDB), local ACID transactions cannot guarantee global atomicity.

**Two-Phase Commit (2PC)** is the classic consensus protocol designed to ensure that either all participants commit the transaction, or all participants abort.

---

### Phase 1: Prepare (Voting Phase)
1. **Coordinator** sends \`PREPARE\` message to all participating database nodes.
2. Each participant checks constraints, acquires local locks, writes changes to its local Write-Ahead Log (WAL), and votes:
   * **Vote YES:** Participant guarantees it is fully prepared to commit if ordered.
   * **Vote NO:** Participant aborts locally and releases locks.

---

### Phase 2: Commit (Decision Phase)
1. If **ALL** participants voted YES:
   * Coordinator writes \`COMMIT\` to its transaction log.
   * Coordinator sends \`COMMIT\` message to all participants.
   * Participants commit changes, release locks, and return \`ACK\`.
2. If **ANY** participant voted NO or timed out:
   * Coordinator writes \`ABORT\` to its log and sends \`ROLLBACK\` to all participants.

\`\`\`
Coordinator                Participant 1           Participant 2
    │                           │                       │
    ├────── PREPARE ───────────►│                       │
    ├────── PREPARE ───────────────────────────────────►│
    │◄───── VOTE YES ───────────┤                       │
    │◄───── VOTE YES ───────────────────────────────────┤
    │ (Coordinator logs COMMIT) │                       │
    ├────── COMMIT ────────────►│                       │
    ├────── COMMIT ────────────────────────────────────►│
    │◄───── ACK ────────────────┤                       │
    │◄───── ACK ────────────────────────────────────────┤
\`\`\`

---

### The Fatal Flaw of 2PC: The Blocking Problem

2PC is a **blocking protocol**:
* Suppose all participants vote YES in Phase 1.
* Immediately after collecting votes, the **coordinator crashes** before sending the Commit command.
* **The participants are now frozen:**
  * They cannot commit unilaterally, because the coordinator might have decided to abort.
  * They cannot abort unilaterally, because another participant might have committed.
  * Participants must hold their row locks open indefinitely until the coordinator recovers.
  * In a high-throughput system, this lock accumulation causes cascading deadlocks across the entire microservice fleet.

---

### Why Three-Phase Commit (3PC) Fails in Practice
3PC introduces a third phase (\`Can-Commit\` $\\to$ \`Pre-Commit\` $\\to$ \`Do-Commit\`) paired with timeouts to make the protocol non-blocking.
**However, 3PC only works under synchronous networks with bounded message delays.** In real-world asynchronous networks with partitions, 3PC can split-brain, causing one partition to commit while another aborts. For this reason, 3PC is rarely used in production.`,
    equationsAndMath: [
      {
        name: '2PC Latency Bound',
        formula: 'T_{2PC} = 2 \\times \\max(RTT) + 2 \\times T_{disk\\_sync}',
        explanation: '2PC requires two sequential roundtrips and two synchronous disk fsync flushes per transaction.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Two-Phase Commit (2PC / XA)',
        pros: ['Strict atomic consistency across shards', 'Standardized across relational databases'],
        cons: ['Blocking coordinator vulnerability', 'Extreme latency penalty', 'Locks hold resources for duration of 2 RTTs'],
        bestFor: 'Internal database sharding within the same datacenter (e.g. Vitess, CockroachDB)',
      },
      {
        option: 'Saga Pattern (Compensating Transactions)',
        pros: ['Completely non-blocking', 'High throughput', 'Cross-service microservice friendly'],
        cons: ['Eventual consistency (intermediate state visible)', 'Requires complex compensating logic'],
        bestFor: 'E-commerce checkout, travel booking, cross-organization workflows',
      },
    ],
    interviewKeypoints: [
      'Describe the blocking coordinator failure mode of 2PC in detail.',
      'Explain why modern microservice architectures replace 2PC with the Saga pattern to preserve scalability.',
    ],
  },

  {
    id: 'ch-12',
    unitId: 'unit-2',
    unitTitle: 'Consistency Models, Isolation & Transactions',
    chapterNumber: 12,
    title: 'The Saga Pattern: Choreography vs. Orchestration',
    readingTimeMin: 15,
    summary:
      'Managing distributed transactions across microservices without distributed locks: Forward transactions, compensating transactions, Choreography (event-driven) vs Orchestration (state machine).',
    coreConcepts: [
      'The Saga Core Concept: Breaks a distributed transaction into a sequence of local transactions T1, T2, ... Tn.',
      'Compensating Transactions: If step Ti fails, execute compensating actions C(i-1), C(i-2), ... C1 in reverse order to rollback state.',
      'Choreography: Decentralized event pub/sub. Services listen to domain events and emit follow-on events.',
      'Orchestration: Centralized state machine (e.g. Temporal, AWS Step Functions) that explicitly commands each service to act.',
    ],
    deepContentMarkdown: `### The Saga Pattern (Hector Garcia-Molina, 1987)

Because Two-Phase Commit (2PC) holds database row locks across remote services and blocks on coordinator failure, modern microservices manage long-running distributed transactions using **Sagas**.

A Saga decomposes a distributed workflow into a sequence of local transactions:
$$T_1, T_2, T_3, \\dots, T_n$$

Each local transaction commits immediately within its local database, updating local state and releasing locks.

---

### The Compensating Transaction Mechanism
If local transaction $T_k$ fails (e.g. payment rejected or inventory out of stock), the Saga must undo the effects of all preceding successful transactions:
$$C_{k-1}, C_{k-2}, \\dots, C_1$$

* A **compensating transaction** ($C_i$) is an explicit semantic undo operation.
* *Example:* If $T_1$ was "Deduct $100 from customer balance", $C_1$ is "Credit $100 refund to customer balance".
* **Crucial Rule:** Compensating transactions must be **strictly idempotent** and must never fail!

---

### Choreography vs Orchestration

\`\`\`
CHOREOGRAPHY (Event-Driven / Decentralized):
[ Order Service ] ──(OrderCreated)──► [ Payment Service ] ──(PaymentSuccess)──► [ Inventory Service ]

ORCHESTRATION (Centralized State Machine):
                      ┌───────────────────────────────┐
                      │    Saga Orchestrator Engine   │
                      └───────┬───────────────┬───────┘
                              │ 1. Charge     │ 2. Reserve
                              ▼               ▼
                      [ Payment Service ] [ Inventory Service ]
\`\`\`

#### 1. Choreography (Decentralized Pub/Sub)
* Services publish domain events to Kafka or RabbitMQ.
* Downstream services listen to events, execute local transactions, and emit follow-on events.
* **Pros:** Loose coupling, no centralized coordinator bottleneck.
* **Cons:** "Pinball machine" architecture: tracing workflows across dozens of event listeners becomes difficult; cyclic dependencies and deadlocks are hard to detect.

#### 2. Orchestration (Centralized State Machine)
* A dedicated orchestrator (e.g., **Temporal.io**, **AWS Step Functions**, or a custom state machine) manages the workflow definition.
* The orchestrator issues commands to microservices via gRPC/REST and awaits status responses.
* **Pros:** Workflow state, retries, and timeouts are centralized in a single visible state machine; easy to audit.
* **Cons:** Orchestrator represents an additional infrastructure component to manage.`,
    equationsAndMath: [
      {
        name: 'Saga Forward and Rollback Path',
        formula: '\\text{Success Path: } T_1 \\to T_2 \\to \\dots \\to T_n \\quad \\mid \\quad \\text{Rollback Path: } T_1 \\to \\dots \\to T_k(\\text{FAIL}) \\to C_{k-1} \\to \\dots \\to C_1',
        explanation: 'A saga either completes all forward transactions Tn or executes compensating transactions in reverse order back to C1.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Saga Choreography',
        pros: ['Zero coordinator overhead', 'Ideal for simple 2-3 step workflows'],
        cons: ['Hard to trace and debug', 'Risk of cyclic event loops'],
        bestFor: 'Simple notifications, user signup onboarding',
      },
      {
        option: 'Saga Orchestration (e.g. Temporal)',
        pros: ['Explicit state machine visibility', 'Built-in retries, timeouts, and compensation graphs'],
        cons: ['Requires orchestrator infrastructure'],
        bestFor: 'E-commerce order fulfillment, hotel/flight booking, payment processing',
      },
    ],
    interviewKeypoints: [
      'Explain that Sagas sacrifice Isolation (intermediate states are visible to other transactions) in exchange for high availability.',
      'Highlight Temporal.io or AWS Step Functions as production-grade implementations of Saga Orchestrators.',
    ],
  },

  {
    id: 'ch-13',
    unitId: 'unit-2',
    unitTitle: 'Consistency Models, Isolation & Transactions',
    chapterNumber: 13,
    title: 'Transactional Outbox & Change Data Capture (CDC)',
    readingTimeMin: 14,
    summary:
      'Solving the Dual-Write problem in event-driven systems: The Transactional Outbox pattern, polling publishers, and Log-Based Change Data Capture using Debezium.',
    coreConcepts: [
      'The Dual-Write Problem: Updating a database and publishing an event to Kafka in a single operation cannot be atomic without 2PC.',
      'The Outbox Pattern: Insert the domain entity AND the outbound event into the SAME relational database within a single local ACID transaction.',
      'Log-Based CDC (Debezium): Tail the database Write-Ahead Log (WAL) to stream outbox records directly to Kafka with zero polling overhead.',
    ],
    deepContentMarkdown: `### The Dual-Write Problem

In event-driven microservices, a common requirement is to persist state to a database and notify other services via Kafka:

\`\`\`go
// ANTI-PATTERN: The Dual-Write Disaster
func CreateOrder(order Order) error {
    db.Save(order)               // Step 1: Write to DB
    kafka.Publish("orders", order) // Step 2: Publish event
    return nil
}
\`\`\`

#### Why this breaks in production:
1. If the database write succeeds, but the application crashes or network fails before publishing to Kafka, **Kafka never receives the event**. Downstream services never process the order.
2. If we reverse the order (publish to Kafka first, then save to DB), the Kafka event is consumed by downstream workers before the database transaction fails and rolls back, **generating ghost orders**.

---

### The Transactional Outbox Pattern

To achieve atomicity without distributed locks, we leverage the **local ACID transaction** of the database:

1. Create an \`outbox\` table in the same database where the domain entities reside.
2. Within a single local transaction, insert the entity into \`orders\` AND insert the event payload into \`outbox\`:

\`\`\`sql
BEGIN;
INSERT INTO orders (id, customer_id, total) VALUES ('ord_123', 'cust_456', 99.50);
INSERT INTO outbox (id, aggregate_type, aggregate_id, payload) 
VALUES ('evt_789', 'Order', 'ord_123', '{"total": 99.50}');
COMMIT;
\`\`\`

Because both operations occur within the same database transaction, either **both succeed or both roll back**.

---

### Publishing Outbox Events to Kafka

Once records reside in the \`outbox\` table, an independent process streams them to Kafka:

#### 1. Polling Publisher (Naive)
A background thread executes:
\`\`\`sql
SELECT * FROM outbox WHERE published = false ORDER BY created_at LIMIT 100 FOR UPDATE;
\`\`\`
* **Drawbacks:** Constant database CPU load; polling delay increases event latency.

#### 2. Log-Based Change Data Capture (CDC with Debezium)
* Debezium connects directly to the database replication stream (e.g. PostgreSQL logical decoding / WAL or MySQL binlog).
* When the database commits the transaction, the WAL writer emits the outbox record to disk.
* Debezium reads the WAL stream in real-time and streams the event to Kafka in **under 10 milliseconds** with **zero query load** on the database tables!`,
    equationsAndMath: [
      {
        name: 'Dual-Write Inconsistency Probability',
        formula: 'P(\\text{Inconsistency}) = 1 - P(\\text{DB Success}) \\times P(\\text{Kafka Success})',
        explanation: 'In the presence of network blips, uncoordinated dual writes will inevitably desynchronize database state from event queues.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Polling Publisher Outbox',
        pros: ['Simple to build in code without extra infrastructure'],
        cons: ['Polling latency', 'High database query overhead on large tables'],
        bestFor: 'Low-throughput systems (< 10 events/sec)',
      },
      {
        option: 'Log-Based CDC (Debezium + Kafka Connect)',
        pros: ['Near zero database query load', 'Sub-10ms event publishing latency', 'Guaranteed at-least-once streaming'],
        cons: ['Requires managing Kafka Connect and database replication slots'],
        bestFor: 'High-throughput production microservices',
      },
    ],
    interviewKeypoints: [
      'Identify the Dual-Write trap immediately whenever an interviewer asks to "save to database and publish to message broker".',
      'Explain how Transactional Outbox + Debezium CDC completely eliminates the dual-write problem.',
    ],
  },

  {
    id: 'ch-14',
    unitId: 'unit-2',
    unitTitle: 'Consistency Models, Isolation & Transactions',
    chapterNumber: 14,
    title: 'Idempotency Keys & Deduplication in Distributed APIs',
    readingTimeMin: 13,
    summary:
      'Designing safe mutating APIs: Stripe-style Idempotency-Key headers, Redis atomic reservation locks, and database uniqueness constraints to eliminate duplicate payments.',
    coreConcepts: [
      'Idempotency Definition: f(f(x)) = f(x). Invoking an operation multiple times produces the exact same outcome as a single execution.',
      'Idempotency-Key Header: Client attaches a unique UUID to mutating requests (POST /v1/charges).',
      'Atomic Idempotency Locking: SET idempotency_key NX EX 86400 in Redis prevents concurrent in-flight duplicate executions.',
    ],
    deepContentMarkdown: `### The Necessity of Idempotency in Distributed Systems

Due to the fundamental nature of packet networks, network calls can fail in three ways:
1. Request dropped on the way to the server (operation never ran).
2. Server executed the operation, but response dropped on the return path.
3. Server is running the operation slowly, and client times out.

If the client retries a payment request (\`POST /v1/charges\`), how do we guarantee that the user is not charged twice?

---

### The Stripe Idempotency Key Architecture

Stripe popularized the standard pattern for financial APIs:
The client generates a unique UUIDv4 and attaches it as an HTTP header:
\`\`\`http
POST /v1/charges HTTP/1.1
Host: api.stripe.com
Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
Content-Type: application/json

{"amount": 5000, "currency": "usd"}
\`\`\`

---

### Server-Side Idempotency Workflow

1. **Step 1: Check Idempotency Record in Redis**
   The server attempts an atomic Redis lock:
   \`\`\`redis
   SET idempotency:9b1deb4d... "IN_PROGRESS" NX EX 120
   \`\`\`
   * If the key already exists with status \`"IN_PROGRESS"\`, another thread is currently processing the request. Return **HTTP 409 Conflict** or wait.
   * If the key already exists with a **saved response body**, return the **exact cached response immediately** without re-executing any business logic!

2. **Step 2: Execute Business Logic**
   If the lock was acquired, execute the financial transaction within the database.

3. **Step 3: Save Final Response**
   Once the payment succeeds, update the Redis key:
   \`\`\`redis
   SET idempotency:9b1deb4d... '{"chargeId": "ch_123", "status": "succeeded"}' XX EX 86400
   \`\`\`
   Retain the response for 24 hours. Any retry over the next 24 hours receives the identical response safely.`,
    equationsAndMath: [
      {
        name: 'Idempotency Mathematical Invariant',
        formula: 'f(f(x)) = f(x)',
        explanation: 'Applying the function f multiple times produces the exact same side-effect and result as applying it once.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Redis In-Memory Idempotency Store',
        pros: ['Sub-millisecond lookup latency', 'Automatic expiration via TTL'],
        cons: ['Risk of key loss on Redis node restart without persistence'],
        bestFor: 'High-throughput API rate limits and standard webhooks',
      },
    ],
    interviewKeypoints: [
      'Every mutating API in a system design interview (POST /charge, POST /transfer) must include an Idempotency-Key header.',
      'Explain the three states of an idempotency record: In-Progress, Succeeded (with cached response), and Failed.',
    ],
  },
]
