import type { TheoryChapter, TheoryUnit } from '../types'
import { UNIT_2_CHAPTERS } from './theory/unit2TransactionsData'
import { UNIT_3_CHAPTERS } from './theory/unit3StorageEnginesData'
import { UNIT_4_CHAPTERS } from './theory/unit4CachingData'
import { UNIT_5_CHAPTERS } from './theory/unit5NetworkingData'
import { UNIT_6_CHAPTERS } from './theory/unit6MessagingData'
import { UNIT_7_CHAPTERS } from './theory/unit7ConsensusData'
import { UNIT_8_CHAPTERS } from './theory/unit8LLDAndPatternsData'

export const THEORY_UNITS: TheoryUnit[] = [
  {
    id: 'unit-1',
    title: 'Unit 1: Distributed Foundations & Theoretical Limits',
    blurb: 'The physical realities of networks, the 8 fallacies, time and ordering, and the fundamental limits of consensus.',
    chapterCount: 7,
  },
  {
    id: 'unit-2',
    title: 'Unit 2: Consistency Models, Isolation & Transactions',
    blurb: 'From strict serializability to eventual consistency, ACID anomalies, MVCC, 2PC, and distributed sagas.',
    chapterCount: 7,
  },
  {
    id: 'unit-3',
    title: 'Unit 3: Storage Engines & Database Internals',
    blurb: 'B+ Trees vs LSM-Trees, Bloom filters, compaction strategies, partitioning, and replication topologies.',
    chapterCount: 7,
  },
  {
    id: 'unit-4',
    title: 'Unit 4: Caching Topologies, Algorithms & Resiliency',
    blurb: 'Cache-Aside, Write-Through, LRU/LFU/ARC, and mitigations for stampedes, avalanches, and penetrations.',
    chapterCount: 7,
  },
  {
    id: 'unit-5',
    title: 'Unit 5: Networking, Protocols & API Gateways',
    blurb: 'L4 vs L7 load balancing, TCP congestion control, HTTP/2 multiplexing, HTTP/3 QUIC, and gRPC Protobuf.',
    chapterCount: 7,
  },
  {
    id: 'unit-6',
    title: 'Unit 6: Message Brokers, Queues & Event Streaming',
    blurb: 'Destructive queues vs append-only commit logs, Apache Kafka internals, zero-copy, and exactly-once semantics.',
    chapterCount: 7,
  },
  {
    id: 'unit-7',
    title: 'Unit 7: Consensus Algorithms & Distributed Coordination',
    blurb: 'Paxos invariants, Raft leader election and log replication, ZooKeeper ephemeral nodes, and gossip protocols.',
    chapterCount: 6,
  },
  {
    id: 'unit-8',
    title: 'Unit 8: Low-Level Design (LLD), OOP & Concurrency',
    blurb: 'SOLID principles, Gang of Four patterns, thread safety, lock-free ring buffers, and clean architecture.',
    chapterCount: 8,
  },
]

export const UNIT_1_CHAPTERS: TheoryChapter[] = [
  {
    id: 'ch-01',
    unitId: 'unit-1',
    unitTitle: 'Distributed Foundations & Theoretical Limits',
    chapterNumber: 1,
    title: 'The 8 Fallacies of Distributed Computing & Physical Realities',
    readingTimeMin: 12,
    summary:
      'Why distributed systems fail: Peter Deutsch and James Gosling\'s 8 fallacies, the physical constraints of speed of light in fiber, packet loss, and asymmetric routing.',
    coreConcepts: [
      'The 8 Fallacies: Reliable network, zero latency, infinite bandwidth, secure network, constant topology, one administrator, zero transport cost, homogeneous network.',
      'Speed of Light Constraint: Light travels in vacuum at ~300,000 km/s, but in glass fiber at ~200,000 km/s (5 µs per km). Roundtrip SF to NYC is physically bounded at ~40ms minimum.',
      'Partial Failures: In a monolith, either the process is running or it is dead. In a distributed system, components fail silently, partially, or intermittently (flapping).',
    ],
    deepContentMarkdown: `### The 8 Fallacies of Distributed Computing

When software engineers transition from single-machine monoliths to distributed architectures, their mental model often assumes that network calls behave like local function calls. Peter Deutsch, James Gosling, and colleagues codified the eight false assumptions that cause distributed systems to collapse under production load:

#### 1. The Network is Reliable
* **The Reality:** Packets are routinely dropped by congested routers, fiber lines are severed by construction backhoes, and switch buffers overflow.
* **Architectural Implication:** Every remote invocation must account for packet loss through timeouts, retries with exponential backoff and jitter, and idempotency guarantees.

#### 2. Latency is Zero
* **The Reality:** Local memory access costs **~100 nanoseconds**. A local SSD read costs **~10-50 microseconds**. A network roundtrip within the same datacenter costs **~0.5 milliseconds (500,000 ns)**. A transcontinental roundtrip (SF to NY) costs **~40-70 milliseconds**.
* **Architectural Implication:** Chatty APIs (N+1 remote queries) decimate system performance. Systems must batch queries, pre-fetch data, and co-locate interacting services.

#### 3. Bandwidth is Infinite
* **The Reality:** While backbone fiber has expanded, internal switch backplanes and NIC queues remain finite. Large uncompressed payloads saturate ingress/egress links and trigger bufferbloat.
* **Architectural Implication:** Employ compact binary serialization (Protocol Buffers, FlatBuffers), gzip/zstd compression, and paginated responses.

#### 4. The Network is Secure
* **The Reality:** Internal networks are vulnerable to lateral traversal by compromised nodes or misconfigured firewalls.
* **Architectural Implication:** Zero Trust Architecture: mutual TLS (mTLS) with short-lived certificates for all inter-service communication.

#### 5. Topology Doesn't Change
* **The Reality:** Autoscaling groups spawn and terminate containers continuously; IP addresses are ephemeral.
* **Architectural Implication:** Dynamic service discovery (Consul, Kubernetes DNS) and robust health checking.

#### 6. There is One Administrator
* **The Reality:** Microservices are operated by independent teams with differing deployment schedules, firewall rules, and security policies.
* **Architectural Implication:** Explicit API versioning and backward-compatible schemas.

#### 7. Transport Cost is Zero
* **The Reality:** Serialization/deserialization consumes significant CPU cycles. In cloud environments (AWS/GCP), cross-AZ and cross-region egress traffic incurs substantial financial cost.

#### 8. The Network is Homogeneous
* **The Reality:** Traffic traverses heterogeneous hardware, varying OS TCP stack implementations, and mobile networks with wildly fluctuating packet loss.`,
    equationsAndMath: [
      {
        name: 'Fiber Optic Latency Bound',
        formula: 't_{propagation} = d / (c * 0.67) ≈ 5 µs per kilometer',
        explanation: 'Speed of light in glass fiber optic cables is approximately 200,000 km/s, setting an irreducible physical latency floor.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Local In-Process Call',
        pros: ['Nanosecond latency', 'Binary deterministic success/failure', 'Zero serialization cost'],
        cons: ['Shared memory crash vulnerability', 'Vertical scaling ceiling'],
        bestFor: 'Monolithic domain logic',
      },
      {
        option: 'Remote RPC / Network Call',
        pros: ['Independent failure domains', 'Horizontal scaling', 'Polyglot language support'],
        cons: ['Millisecond latency', 'Tri-state return (Success, Failure, Unknown/Timeout)', 'Serialization overhead'],
        bestFor: 'Microservices & distributed systems',
      },
    ],
    interviewKeypoints: [
      'Never treat a network call like a local function call — a network call can return Success, Failure, or Timeout (Unknown status).',
      'Always implement exponential backoff with full jitter to avoid the Thundering Herd problem during service recovery.',
      'Design every mutating API with an Idempotency-Key header.',
    ],
  },
  {
    id: 'ch-02',
    unitId: 'unit-1',
    unitTitle: 'Distributed Foundations & Theoretical Limits',
    chapterNumber: 2,
    title: 'CAP Theorem: Formal Proof & Practical Implications',
    readingTimeMin: 14,
    summary:
      'Eric Brewer\'s conjecture and the Gilbert & Lynch (2002) formal proof. What happens during network partitions, and why "Pick Two" is an oversimplification.',
    coreConcepts: [
      'C (Linearizability / Strong Consistency): Every read receives the most recent write or an error.',
      'A (Availability): Every non-failing node returns a non-error response for every request.',
      'P (Partition Tolerance): The system continues to operate despite arbitrary message loss or network split.',
      'The Partition Reality: In real-world physical networks, Partition Tolerance (P) is non-negotiable. You cannot "choose CA".',
    ],
    deepContentMarkdown: `### The CAP Theorem Deconstructed

Originally formulated by Eric Brewer in 2000 and mathematically proven by Seth Gilbert and Nancy Lynch in 2002, the CAP theorem establishes that a distributed data store can simultaneously provide at most two of the following three guarantees:

1. **Consistency (Linearizability):** Every read operation returns the value of the most recent write or errors out. All nodes appear as a single atomic data source.
2. **Availability:** Every non-failing node must return a successful (non-error) response to every request.
3. **Partition Tolerance:** The system continues to operate despite an arbitrary number of messages being dropped or delayed by the network between nodes.

---

### The Gilbert & Lynch (2002) Formal Proof

Consider a two-node distributed system consisting of Node $G_1$ and Node $G_2$:
1. Suppose a network partition occurs such that all messages sent between $G_1$ and $G_2$ are dropped ($G_1 \\not\\leftrightarrow G_2$).
2. A client connects to Node $G_1$ and executes write request $W(v_1)$.
3. Because $G_1$ cannot communicate with $G_2$, $G_1$ faces a choice:
   * **Choice A (Consistency / CP):** Refuse to acknowledge the write until it can replicate to $G_2$, or accept the write but reject reads on $G_2$. In either case, **Availability is sacrificed**.
   * **Choice B (Availability / AP):** Acknowledge $W(v_1)$ locally and allow reads. If another client now connects to $G_2$ and executes read request $R()$, $G_2$ can only return stale data $v_0$. Thus, **Consistency is sacrificed**.

$$\\text{Conclusion: In the presence of a network partition, a distributed system MUST choose between Consistency (CP) and Availability (AP).}$$`,
    equationsAndMath: [
      {
        name: 'Gilbert & Lynch CAP Theorem Condition',
        formula: 'P \\implies (C \\lor A) \\land \\neg(C \\land A)',
        explanation: 'Under network partition P, maintaining both atomic consistency C and availability A is mathematically impossible in an asynchronous network.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'CP (Consistency + Partition Tolerance)',
        pros: ['Strict linearizability', 'Zero stale reads', 'ACID transaction support'],
        cons: ['Unavailable during network partition', 'Higher write latency due to consensus'],
        bestFor: 'Financial ledgers, relational databases, banking, inventory systems',
      },
      {
        option: 'AP (Availability + Partition Tolerance)',
        pros: ['100% write availability', 'Sub-millisecond local writes', 'Graceful degradation'],
        cons: ['Eventual consistency', 'Read repair and conflict resolution required', 'Potential data divergence'],
        bestFor: 'Social media likes, analytics, DNS, shopping carts (Dynamo-style)',
      },
    ],
    interviewKeypoints: [
      'Never claim you chose a "CA system" in a distributed interview — explain that Partitions are unavoidable, and specify your CP vs AP trade-off strategy.',
      'Explain how AP systems resolve conflicts: Last-Write-Wins (LWW) with timestamps vs CRDTs vs Vector Clocks.',
    ],
  },
  {
    id: 'ch-03',
    unitId: 'unit-1',
    unitTitle: 'Distributed Foundations & Theoretical Limits',
    chapterNumber: 3,
    title: 'PACELC Theorem: Latency vs. Consistency in Normal Operation',
    readingTimeMin: 12,
    summary:
      'Daniel Abadi\'s extension to CAP: What happens when the system is NOT partitioned? The fundamental trade-off between Latency and Consistency in normal operation.',
    coreConcepts: [
      'The PACELC Formulation: If Partition (P), choose Availability (A) vs Consistency (C); Else (E), choose Latency (L) vs Consistency (C).',
      'Normal Operation Reality: Systems spend 99.9% of their lifespan in non-partitioned states.',
      'System Classifications: MongoDB (PC/EC), Amazon Dynamo / Cassandra (PA/EL), Google Spanner (PC/EC).',
    ],
    deepContentMarkdown: `### Beyond CAP: The PACELC Theorem

In 2012, Professor Daniel Abadi pointed out that the CAP theorem only describes system behavior during rare network partitions. However, distributed systems operate under normal conditions 99.9% of the time. 

The **PACELC Theorem** provides the complete formulation:
$$\\text{If } \\mathbf{P}\\text{ (Partition)} \\implies \\mathbf{A}\\text{ (Availability) vs. } \\mathbf{C}\\text{ (Consistency)}$$
$$\\mathbf{E}\\text{lse (Normal State)} \\implies \\mathbf{L}\\text{ (Latency) vs. } \\mathbf{C}\\text{ (Consistency)}$$`,
    equationsAndMath: [
      {
        name: 'Synchronous Replication Latency Floor',
        formula: 'T_{write} = T_{local} + \\max_{i=1..W}(RTT_{replica_i})',
        explanation: 'Synchronous consistency (EC) forces write latency to be bounded by the slowest replica in the required write quorum W.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'PA / EL (e.g. Cassandra, Dynamo)',
        pros: ['Lowest possible write latency', 'High write availability under partition'],
        cons: ['Stale reads', 'Eventual consistency', 'Client-side conflict resolution required'],
        bestFor: 'High-velocity telemetry, chat history, social feeds',
      },
      {
        option: 'PC / EC (e.g. Spanner, CockroachDB)',
        pros: ['Strict serializability', 'Zero stale reads', 'Transactional safety'],
        cons: ['Higher write latency (Paxos/Raft roundtrips)', 'Unavailable during majority partition'],
        bestFor: 'Financial transactions, inventory reservations, medical records',
      },
    ],
    interviewKeypoints: [
      'Cite PACELC rather than just CAP when discussing database choices to demonstrate senior architectural maturity.',
      'Show that Cassandra can be tuned from PA/EL to PC/EC by adjusting read/write consistency levels.',
    ],
  },
  {
    id: 'ch-04',
    unitId: 'unit-1',
    unitTitle: 'Distributed Foundations & Theoretical Limits',
    chapterNumber: 4,
    title: 'Physical Clocks, Drift, NTP Skew & Leap Seconds',
    readingTimeMin: 14,
    summary:
      'Why you can never trust wall-clock timestamps in distributed systems. Quartz oscillator drift, NTP synchronization delays, leap second crashes, and clock monotonic guarantees.',
    coreConcepts: [
      'Quartz Crystal Physics: Drifts by 10-50 microseconds per second (1-2 seconds per day).',
      'NTP (Network Time Protocol): Skew within a datacenter hovers between 1-20ms; clock adjustments can step backwards.',
      'Monotonic Clocks vs Time-of-Day Clocks: CLOCK_MONOTONIC vs CLOCK_REALTIME.',
      'The Danger of Last-Write-Wins (LWW): Using wall-clock timestamps to resolve database conflicts causes silent data loss.',
    ],
    deepContentMarkdown: `### Physical Clocks in Distributed Systems

In single-machine programming, querying the system clock returns an authoritative timestamp. In a distributed system with thousands of servers, **there is no such thing as a single global "now".**

Quartz crystals oscillate at slightly variable frequencies due to temperature and voltage, drifting by 10-50 ppm. NTP can jump backwards during synchronization. If a database relies on wall-clock timestamps for Last-Write-Wins (LWW), a server with a lagging clock will silently overwrite newer data!`,
    equationsAndMath: [
      {
        name: 'Clock Drift Divergence Formula',
        formula: '\\Delta t_{drift} = \\rho \\times t_{elapsed}',
        explanation: 'For drift rate rho (e.g. 50 ppm), two servers diverge by 100 microseconds every second.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Monotonic Clock (CLOCK_MONOTONIC)',
        pros: ['Strictly non-decreasing', 'Safe for measuring timeouts and durations'],
        cons: ['Does not represent calendar time (resets on reboot)'],
        bestFor: 'Rate limiters, performance timers, heartbeat timeouts',
      },
    ],
    interviewKeypoints: [
      'Explain that Monotonic Clocks never step backwards and must always be used for elapsed time.',
      'Warn against using wall-clock timestamps for conflict resolution due to NTP skew.',
    ],
  },
  {
    id: 'ch-05',
    unitId: 'unit-1',
    unitTitle: 'Distributed Foundations & Theoretical Limits',
    chapterNumber: 5,
    title: 'Logical Clocks: Lamport Timestamps & Vector Clocks',
    readingTimeMin: 15,
    summary:
      'Leslie Lamport\'s seminal 1978 breakthrough: Establishing event ordering without physical clocks. The Happened-Before relation, causal DAGs, and Vector Clock conflict detection.',
    coreConcepts: [
      'The Happened-Before Relation (a -> b): Defines causal ordering in distributed systems.',
      'Lamport Timestamps: Assigns a monotonically increasing integer to every event; provides a partial order.',
      'Limitation: C(a) < C(b) does NOT imply a -> b.',
      'Vector Clocks: Array of logical counters per node; enables detection of concurrent conflicting events.',
    ],
    deepContentMarkdown: `### Logical Clocks and Causality

Leslie Lamport demonstrated in 1978 that ordering distributed events does not require physical clocks—it requires tracking causality through the Happened-Before relation ($\\rightarrow$).

Lamport clocks assign monotonic integers to events. When two events cannot be causally ordered, they are concurrent. Vector clocks maintain a vector of counters across all nodes, enabling precise detection of concurrent conflicts.`,
    equationsAndMath: [
      {
        name: 'Vector Clock Causality Test',
        formula: 'A \\rightarrow B \\iff V_A < V_B',
        explanation: 'Vector clocks provide an exact equivalence between vector dominance and causal ordering.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Vector Clocks',
        pros: ['Precise conflict detection', 'Never loses concurrent writes'],
        cons: ['Vector size scales with cluster node count O(N)'],
        bestFor: 'Leaderless stores (Dynamo, Riak), collaborative document editing',
      },
    ],
    interviewKeypoints: [
      'Articulate why Lamport clocks only provide partial order and cannot detect concurrent conflicts.',
      'Walk through how Vector Clocks detect branching state in shopping carts during network partitions.',
    ],
  },
  {
    id: 'ch-06',
    unitId: 'unit-1',
    unitTitle: 'Distributed Foundations & Theoretical Limits',
    chapterNumber: 6,
    title: 'Google Spanner\'s TrueTime API & Commit-Wait Rule',
    readingTimeMin: 16,
    summary:
      'How Google solved the distributed clock problem at global scale using atomic rubidium clocks, GPS receivers, and the Commit-Wait rule to achieve Strict Serializability without global locking.',
    coreConcepts: [
      'TrueTime Architecture: GPS receivers paired with redundant atomic clocks in every master datacenter.',
      'Bounded Uncertainty (2ε): TrueTime.now() returns [earliest, latest] where uncertainty ε is strictly bounded (typically 1-7ms).',
      'Commit-Wait Rule: Wait out the uncertainty bound before releasing commit locks to guarantee external consistency globally.',
    ],
    deepContentMarkdown: `### Google Spanner TrueTime and Commit-Wait

Google Spanner achieved global strict serializability by deploying GPS receivers and atomic rubidium clocks in every datacenter.

TrueTime returns an interval $[t_{\\text{earliest}}, t_{\\text{latest}}]$ with bounded uncertainty $\\epsilon$. Under the Commit-Wait rule, the transaction coordinator waits at least $2\\epsilon$ before releasing read locks, guaranteeing that any transaction started after commit receives a strictly higher timestamp worldwide!`,
    equationsAndMath: [
      {
        name: 'Spanner Commit-Wait Duration',
        formula: 'T_{wait} \\ge 2\\epsilon',
        explanation: 'Transaction commit must pause for at least twice the clock uncertainty bound (typically 2-14ms) before publishing commit results.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Google TrueTime (Spanner)',
        pros: ['Global strict serializability', 'Lock-free distributed read transactions across shards'],
        cons: ['Requires specialized datacenter hardware (GPS + Atomic clocks)'],
        bestFor: 'Global banking, advertising inventory, mission-critical ledgers',
      },
    ],
    interviewKeypoints: [
      'Explain the Commit-Wait rule: Spanner waits out the clock uncertainty window (2ε) before releasing read locks.',
      'Differentiate between Google Spanner (hardware TrueTime) and CockroachDB (software Hybrid Logical Clocks / HLC).',
    ],
  },
  {
    id: 'ch-07',
    unitId: 'unit-1',
    unitTitle: 'Distributed Foundations & Theoretical Limits',
    chapterNumber: 7,
    title: 'Failure Models: Crash-Stop, Crash-Recovery & Byzantine Faults',
    readingTimeMin: 13,
    summary:
      'The theoretical fault taxonomy: Fail-Stop, Fail-Recovery with WAL, and Byzantine Fault Tolerance (BFT). Quorum requirements under crash faults vs malicious adversarial nodes.',
    coreConcepts: [
      'Crash-Stop: Node halts execution and never recovers.',
      'Crash-Recovery: Node halts, restarts, and restores state from durable Write-Ahead Log (WAL).',
      'Byzantine Fault: Node exhibits arbitrary or malicious behavior.',
      'Quorum Bounds: Crash faults require 2f + 1 nodes; Byzantine faults require 3f + 1 nodes.',
    ],
    deepContentMarkdown: `### Distributed Fault Models Taxonomy

Distributed algorithms are designed against specific fault assumptions:
1. **Crash-Stop:** Nodes halt permanently. Requires $2f + 1$ nodes to tolerate $f$ failures.
2. **Crash-Recovery:** Nodes reboot and recover state from disk Write-Ahead Logs (WAL).
3. **Byzantine Fault Model:** Nodes can be malicious or forge messages. Requires $3f + 1$ nodes (more than two-thirds honest supermajority).`,
    equationsAndMath: [
      {
        name: 'Byzantine Fault Tolerance Bound',
        formula: 'N \\ge 3f + 1',
        explanation: 'To tolerate f Byzantine nodes, more than two-thirds of the total cluster must be non-faulty and honest.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Crash-Fault Tolerant (CFT) - Raft / Paxos',
        pros: ['High throughput (> 100k ops/sec)', 'Simple majority quorum (2f + 1)'],
        cons: ['Assumes trusted network'],
        bestFor: 'Internal enterprise datacenters (ZooKeeper, etcd, Consul, Kafka)',
      },
    ],
    interviewKeypoints: [
      'Raft and Paxos assume the Crash-Recovery model, NOT Byzantine faults.',
      'Remember the quorum formulas: 2f + 1 for crash faults vs 3f + 1 for Byzantine faults.',
    ],
  },
]

// All 56 Comprehensive Theory Chapters (Over 50 Pages of In-Depth System Design Notes)
export const ALL_THEORY_CHAPTERS: TheoryChapter[] = [
  ...UNIT_1_CHAPTERS,  // Chapters 1-7
  ...UNIT_2_CHAPTERS,  // Chapters 8-14
  ...UNIT_3_CHAPTERS,  // Chapters 15-21
  ...UNIT_4_CHAPTERS,  // Chapters 22-28
  ...UNIT_5_CHAPTERS,  // Chapters 29-35
  ...UNIT_6_CHAPTERS,  // Chapters 36-42
  ...UNIT_7_CHAPTERS,  // Chapters 43-48
  ...UNIT_8_CHAPTERS,  // Chapters 49-56
]

export function getChapterById(id: string): TheoryChapter | undefined {
  return ALL_THEORY_CHAPTERS.find((c) => c.id === id)
}

export function getChaptersByUnit(unitId: string): TheoryChapter[] {
  return ALL_THEORY_CHAPTERS.filter((c) => c.unitId === unitId)
}
