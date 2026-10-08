import { ALL_SYSTEM_DESIGNS, getSystemById } from './systemsData'
import { FROM_SCRATCH_GUIDES } from './fromScratchGuides'
import { SYSTEM_DEEP_EXPLORATION_REGISTRY } from './systemDeepExplorationRegistry'
import { SYSTEM_METADATA_REGISTRY } from './systemMetadataRegistry'
import type { SystemDesignModel } from '../types'

export interface DossierContentSection {
  heading: string
  description: string
  bulletPoints?: string[]
  callout?: {
    type: 'tip' | 'warning' | 'deep-dive' | 'faang-insight'
    title: string
    message: string
  }
  codeBlock?: {
    language: string
    filename: string
    code: string
    explanation?: string
  }
  diagramAsciiOrSvg?: string
  table?: {
    headers: string[]
    rows: string[][]
  }
}

export interface DossierChapter {
  chapterNumber: number
  id: string
  title: string
  subtitle: string
  estimatedMinutes: number
  badge: string
  summary: string
  keyTakeaways: string[]
  contentSections: DossierContentSection[]
  interactiveModuleType?: 'capacity-calculator' | 'packet-flow' | 'code-sandbox' | 'chaos-simulator' | 'schema-viewer'
}

export interface SystemDossier {
  system: SystemDesignModel
  executiveSummary: string
  totalChapters: number
  totalReadingTimeMinutes: number
  heroBannerImage?: string
  chapters: DossierChapter[]
}

/**
 * Builds an exhaustive, textbook-grade 10-Chapter System Design Analysis Dossier
 * for any system in Nexora.
 */
export function getSystemDossier(systemId: string): SystemDossier | null {
  const sys = getSystemById(systemId)
  if (!sys) return null

  const guide = FROM_SCRATCH_GUIDES[systemId]
  const deep = SYSTEM_DEEP_EXPLORATION_REGISTRY[systemId]
  const meta = SYSTEM_METADATA_REGISTRY[systemId]

  // Chapter 1: Problem Anatomy & SLAs
  const chapter1: DossierChapter = {
    chapterNumber: 1,
    id: 'problem-scope-sla',
    title: 'Chapter 1: Problem Anatomy, User Stories & Engineering SLAs',
    subtitle: 'Deconstructing requirements, scope boundaries, and latency budgets from scratch',
    estimatedMinutes: 12,
    badge: 'Requirements & Scope',
    summary: `Complete problem formulation for ${sys.name}. Analyzing real-world archetypes, functional invariants, and strict P99 latency & availability Service Level Objectives.`,
    keyTakeaways: [
      `High-availability target: ${sys.category === 'Financial & Reliability' ? '99.999% (Five Nines)' : '99.99% (Four Nines)'}.`,
      `P99 latency threshold: ${sys.latency}.`,
      `Design operates at scale: ${sys.throughput} with ${sys.storageScale}.`,
      'Rigorous separation of core functional needs from out-of-scope enterprise features.',
    ],
    contentSections: [
      {
        heading: '1.1 System Mission & Real-World Archetype',
        description: `${sys.overview} In production engineering, this architecture powers platforms modeled on ${meta?.realWorldArchetype || sys.name}.`,
        callout: {
          type: 'faang-insight',
          title: 'Staff+ Interview Perspective',
          message:
            'When interviewing for Staff / Principal Engineer roles, the opening 5 minutes determine the trajectory. Never jump straight to drawing boxes. Anchor the conversation on scale parameters, read-to-write ratios, and consistency guarantees (strong vs eventual).',
        },
      },
      {
        heading: '1.2 Functional Requirements (P0 Must-Haves)',
        description: 'The core business capabilities the system must deliver unconditionally:',
        bulletPoints: sys.functionalReqs.map((req, idx) => `P0.${idx + 1} - ${req}`),
      },
      {
        heading: '1.3 Non-Functional Requirements & Engineering SLAs',
        description: 'The operational constraints and quality attributes required under peak stress:',
        bulletPoints: [
          ...sys.nonFunctionalReqs,
          `Throughput Scale: Minimum sustained capacity of ${sys.throughput}.`,
          `Latency SLO: P50 < ${parseInt(sys.latency) || 5}ms, P99 < ${sys.latency}.`,
          `Durability: ${sys.category === 'Storage & Databases' ? '11 Nines (99.999999999%) object durability via Reed-Solomon Erasure Coding' : 'Zero uncommitted data loss with Write-Ahead Logging (WAL) and synchronous replication.'}`,
        ],
        table: {
          headers: ['Metric / SLO', 'Target Threshold', 'Mitigation Strategy'],
          rows: [
            ['Availability', '99.99% (Max 52m downtime/year)', 'Multi-AZ active-active deployment with automated failover'],
            ['P99 Latency', sys.latency, 'Multi-tier cache hierarchy (L1 in-memory + L2 distributed Redis)'],
            ['Fault Tolerance', 'N+2 Redundancy across racks', 'Quorum consensus and partitioned sharding'],
            ['Read:Write Ratio', sys.category === 'High-Concurrency & Social' ? '100:1 (Heavy Reads)' : '10:1 (Balanced)', 'Read replicas and distributed caching pools'],
          ],
        },
      },
      {
        heading: '1.4 Out-of-Scope Boundaries',
        description: 'To maintain laser focus on core distributed systems scaling, explicit non-goals include:',
        bulletPoints: [
          'Billing, invoice rendering, and payment gateway account reconciliation (handled by dedicated ERP).',
          'User identity registration and OAuth2 provider federation (delegated to external IAM / Keycloak).',
          'Complex ad-hoc analytic aggregations (delegated to an asynchronous ETL pipeline into Snowflake/ClickHouse).',
        ],
      },
    ],
  }

  // Chapter 2: Capacity Estimations
  const chapter2: DossierChapter = {
    chapterNumber: 2,
    id: 'capacity-estimation',
    title: 'Chapter 2: Back-of-the-Envelope Capacity Estimations & Math Proofs',
    subtitle: 'Deriving QPS, network bandwidth, memory tiers, and 5-year storage growth',
    estimatedMinutes: 15,
    badge: 'Scale Math & Sizing',
    interactiveModuleType: 'capacity-calculator',
    summary: `Mathematical derivation of all hardware, network, and disk resources required to sustain ${sys.name} over a 5-year production horizon.`,
    keyTakeaways: [
      `Sustained Throughput: ${sys.throughput}.`,
      `Storage Footprint: ${sys.storageScale}.`,
      '80/20 Pareto rule applied to size RAM caching tier for sub-millisecond hot lookups.',
      'Peak load multiplier factor of 5x accounted for flash traffic surges.',
    ],
    contentSections: [
      {
        heading: '2.1 Traffic & QPS Estimations',
        description:
          'Estimating both average and peak Queries Per Second (QPS) prevents catastrophic server queue congestion during flash surges.',
        table: {
          headers: ['Metric', 'Formula / Derivation', 'Estimated Value'],
          rows: sys.calculations.map((c) => [c.metric, c.formula, c.result]),
        },
      },
      {
        heading: '2.2 Memory Tier Sizing (Pareto 80/20 Caching)',
        description:
          'In large-scale distributed architectures, 80% of read requests target the top 20% of active records. Sizing the Redis caching cluster to hold this working set in RAM ensures hit rates exceed 95%.',
        callout: {
          type: 'deep-dive',
          title: 'Memory Formula Proof',
          message:
            'Cache RAM = (Total Daily Reads × 20% Hot Set) × (Average Record Size in Bytes + 64 bytes Redis metadata overhead) × 1.3 (30% safety buffer for jemalloc memory fragmentation).',
        },
      },
      {
        heading: '2.3 Ingress & Egress Bandwidth Sizing',
        description:
          'Network saturation is often the invisible bottleneck before CPU or disk limits are reached. Sizing 10Gbps and 40Gbps network interfaces across gateway fleets ensures no packet drop.',
        bulletPoints: [
          `Inbound Ingress Bandwidth: Sized for incoming request payloads with SSL/TLS overhead.`,
          `Outbound Egress Bandwidth: Direct streaming or JSON payloads multiplexed over HTTP/2 connections.`,
          `Cross-Region Replication Traffic: Asynchronous delta sync streams provisioned over dedicated private VPC fiber links.`,
        ],
      },
    ],
  }

  // Chapter 3: Naive Architecture & Failure Modes
  const chapter3: DossierChapter = {
    chapterNumber: 3,
    id: 'naive-breakdown',
    title: 'Chapter 3: The Naive Monolith & Why It Breaks at Scale',
    subtitle: 'Investigating single-point-of-failure bottlenecks, connection exhaustion, and deadlocks',
    estimatedMinutes: 10,
    badge: 'Failure Analysis',
    summary: `Critical autopsy of the standard starting architecture: single relational database, synchronous request loops, and monolithic deployment. Explaining precisely why it collapses under load.`,
    keyTakeaways: [
      'Single database primary becomes an insurmountable write bottleneck.',
      'Connection pool exhaustion freezes all downstream HTTP request threads.',
      'Predictable identifiers and sequential counters introduce race conditions and scraping vectors.',
      'Lack of backpressure causes cascading service death under load spikes.',
    ],
    contentSections: [
      {
        heading: '3.1 The Naive Architecture Starting Point',
        description:
          guide?.naiveApproach.description ||
          `A single monolithic backend server communicating directly with a single centralized database instance (e.g. PostgreSQL or MySQL). Requests are handled synchronously inside the application thread pool.`,
        callout: {
          type: 'warning',
          title: 'The "Works on My Machine" Fallacy',
          message:
            'A naive implementation functions cleanly in development with 10 concurrent users. However, distributed systems fail at the seams: file descriptor exhaustion, thread starvation, row lock contention, and garbage collection pauses.',
        },
      },
      {
        heading: '3.2 Catastrophic Failure Points Under Load',
        description: 'Why this architecture will crash during production traffic surges:',
        bulletPoints:
          guide?.naiveApproach.whyItBreaks || [
            'Database connection pool exhaustion when concurrent incoming requests exceed max_connections.',
            'Global row-level lock contention causing query queue lengths to spiral exponentially.',
            'Single point of failure (SPOF): Hardware fault or kernel panic on the primary node halts the entire company.',
            'Cross-datacenter latency: Global users endure 250ms+ round trips over trans-oceanic public internet.',
          ],
      },
    ],
  }

  // Chapter 4: High-Level Architecture (HLD)
  const chapter4: DossierChapter = {
    chapterNumber: 4,
    id: 'hld-blueprint',
    title: 'Chapter 4: High-Level Design (HLD) & Distributed Topology',
    subtitle: 'Global Anycast DNS, Edge Proxies, Microservice fleet, and Multi-Tier persistence',
    estimatedMinutes: 20,
    badge: 'System Topology',
    interactiveModuleType: 'packet-flow',
    summary: `Complete architectural blueprint of ${sys.name}. Inspecting every edge POP, API gateway filter, microservice responsibility, and communication protocol.`,
    keyTakeaways: [
      `Tiered topology with ${sys.services.length} discrete microservices and data tiers.`,
      `Protocol matrix leveraging HTTPS at the edge, gRPC internally, and asynchronous Kafka for ingestion.`,
      'Stateless service layer enabling linear horizontal auto-scaling on Kubernetes.',
      'Separation of low-latency read path from high-throughput write pipeline.',
    ],
    contentSections: [
      {
        heading: '4.1 End-to-End Architectural Nodes',
        description:
          'Every component has a strictly isolated responsibility, preventing blast radiuses from expanding during localized outages:',
        table: {
          headers: ['Node / Tier', 'Role & Responsibility', 'Technology Stack', 'Scale / Redundancy'],
          rows: sys.services.map((s) => [
            s.name,
            s.role,
            s.techStack,
            s.type === 'gateway' ? 'Active-Active Edge' : s.type === 'cache' ? 'Sharded Cluster' : 'Horizontally Scaled',
          ]),
        },
      },
      {
        heading: '4.2 Wire Protocols & Inter-Service Connections',
        description:
          'Network boundaries are strictly governed by protocol contracts. High-volume inter-service hops utilize binary gRPC with Protobuf to cut serialization latency by 60% compared to JSON.',
        bulletPoints: sys.connections.map(
          (c) => `${c.label} (${c.protocol}): Connecting ${c.from} ➔ ${c.to}`
        ),
      },
    ],
  }

  // Chapter 5: Polyglot Schemas & Storage Tier
  const chapter5: DossierChapter = {
    chapterNumber: 5,
    id: 'schemas-storage-tier',
    title: 'Chapter 5: Polyglot Schemas, Storage Engines & Data Access Patterns',
    subtitle: 'Relational tables, NoSQL wide-column stores, in-memory structures, and indexing strategies',
    estimatedMinutes: 18,
    badge: 'Database Design',
    interactiveModuleType: 'schema-viewer',
    summary: `Physical database schema design, partition key strategy, secondary indexes, and storage engine selection (B-Tree vs LSM Tree) for ${sys.name}.`,
    keyTakeaways: [
      'Partition keys designed to guarantee uniform distribution across shards without hot-spotting.',
      'LSM-Tree storage engines prioritized for append-only high write workloads.',
      'B+Tree storage engines selected for low-latency range-query lookups.',
      'Database schemas normalized for transactional safety, denormalized for high-speed read views.',
    ],
    contentSections: [
      {
        heading: '5.1 Physical Database Schema Definition',
        description:
          'The exact relational and document structures engineered for zero-lock reads and idempotent writes:',
        codeBlock: {
          language: 'sql',
          filename: 'schema.sql',
          code:
            sys.deepDive?.databaseSchema ||
            `-- Production Database Schema
CREATE TABLE IF NOT EXISTS records (
    id VARCHAR(64) PRIMARY KEY,
    partition_key VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_records_partition ON records (partition_key, created_at DESC);`,
          explanation:
            'Compound index on (partition_key, created_at DESC) allows the database to locate all records for a partition with a single index seek without scanning the underlying table.',
        },
      },
      {
        heading: '5.2 Polyglot Storage Strategy & Selection Rationale',
        description:
          'No single database solves all distributed needs. Storage tiers are selected based on workload access patterns:',
        table: {
          headers: ['Storage Layer', 'Engine Chosen', 'Workload Profile', 'Access Latency'],
          rows: [
            ['L1 Hot Cache', 'Redis Cluster (In-Memory)', 'Key-value lookups for top 20% working set', '< 0.5ms'],
            ['L2 Primary Store', sys.category === 'Financial & Reliability' ? 'PostgreSQL (ACID WAL)' : 'Cassandra / ScyllaDB (LSM)', 'Authoritative persistent record store', '2ms - 8ms'],
            ['L3 Blob / Media Store', 'AWS S3 / Ceph (Object Store)', 'Immutable objects, chunked binaries, images/video', '20ms - 50ms'],
            ['L4 Search & Analytics', 'Elasticsearch / ClickHouse', 'Full-text token search and analytical rollups', '15ms - 40ms'],
          ],
        },
      },
    ],
  }

  // Chapter 6: Low-Level Design (LLD) & Algorithms
  const chapter6: DossierChapter = {
    chapterNumber: 6,
    id: 'lld-core-algorithms',
    title: 'Chapter 6: Low-Level Design (LLD), Object Modeling & Code from Scratch',
    subtitle: 'Data structures, concurrency primitives, and production-grade code implementation',
    estimatedMinutes: 25,
    badge: 'Code from Scratch',
    interactiveModuleType: 'code-sandbox',
    summary: `Exhaustive low-level software architecture for ${sys.name}. Object-oriented domain models, core algorithmic invariants, and real working code written from scratch.`,
    keyTakeaways: [
      'Clean domain abstractions isolating business invariants from network/storage drivers.',
      'Lock-free or atomic concurrency primitives to maximize multicore processor throughput.',
      'Algorithmic time complexity bounded to O(1) or O(log N) on critical request paths.',
      'Full working code implementation with idiomatic error handling and unit testability.',
    ],
    contentSections: [
      {
        heading: '6.1 Core Data Structures & Complexity Matrix',
        description:
          'The in-memory data structures driving the algorithmic core of the system:',
        table: {
          headers: ['Data Structure', 'Role & Invariant', 'Time Complexity', 'Space Complexity'],
          rows:
            guide?.coreDataStructures.map((ds) => [
              ds.name,
              ds.purpose,
              ds.timeComplexity,
              ds.spaceComplexity,
            ]) || [
              ['Lock-Free Concurrent Ring Buffer', 'Ingests burst requests without mutex contention', 'O(1) push/pop', 'O(N) ring capacity'],
              ['LRU Hash-Map + Doubly Linked List', 'Evicts least recently used cache items in constant time', 'O(1) get/put', 'O(N) cached keys'],
              ['SkipList / In-Memory Index', 'Maintains sorted key ranges with concurrent hazard pointers', 'O(log N) lookup', 'O(N) keys'],
            ],
        },
      },
      {
        heading: '6.2 Production Code Implementation',
        description:
          'Production-tested implementation demonstrating the algorithmic mechanics:',
        codeBlock: {
          language: sys.codeFiles[0]?.language || 'go',
          filename: sys.codeFiles[0]?.name || 'core_engine.go',
          code:
            sys.codeFiles[0]?.code ||
            (guide?.steps[0]?.codeSnippet ??
              `// Production Engine Core\npackage main\n\nimport "sync"\n\ntype Engine struct {\n    mu sync.RWMutex\n    data map[string]string\n}\n\nfunc NewEngine() *Engine {\n    return &Engine{data: make(map[string]string)}\n}`),
          explanation:
            sys.codeFiles[0]?.role ||
            guide?.steps[0]?.explanation ||
            'Core algorithm handling atomic state mutations and zero-copy packet serialization.',
        },
      },
    ],
  }

  // Chapter 7: Request Lifecycle & Packet Tracer
  const chapter7: DossierChapter = {
    chapterNumber: 7,
    id: 'request-lifecycle',
    title: 'Chapter 7: Millisecond-by-Millisecond Request Lifecycle & Packet Tracer',
    subtitle: 'Following packet paths from Edge POPs through caches, services, and databases',
    estimatedMinutes: 15,
    badge: 'Request Flow',
    interactiveModuleType: 'packet-flow',
    summary: `Detailed trace of every network hop across both Read and Write lifecycles for ${sys.name}. Analyzing headers, payloads, caching branch decisions, and latency budgets.`,
    keyTakeaways: [
      `End-to-end trace decomposed across ${sys.animationSteps.length} discrete network steps.`,
      'Read path optimized for immediate L1/L2 cache termination.',
      'Write path guarantees durability with transactional WAL before acknowledging the client.',
      'Real-time packet inspection of headers, token claims, and binary payloads.',
    ],
    contentSections: [
      {
        heading: '7.1 Step-by-Step Request Timeline',
        description:
          'The chronological sequence of network transmissions and computational state transformations:',
        bulletPoints: sys.animationSteps.map(
          (step) =>
            `Step ${step.step}: ${step.title} (${step.protocol}) - From [${step.fromNode}] to [${step.toNode}]. ${step.description}`
        ),
      },
      {
        heading: '7.2 Latency Waterfall Budget',
        description:
          'Breakdown of where milliseconds are spent across the entire round-trip lifecycle:',
        table: {
          headers: ['Lifecycle Stage', 'Sub-System Involved', 'Protocol', 'Target Latency'],
          rows: [
            ['1. Edge DNS & TLS Termination', 'Cloudflare Anycast / Edge Envoy', 'HTTPS / TLS 1.3', '1ms - 3ms'],
            ['2. Gateway Authentication & Rate Limiting', 'Kong / Envoy API Gateway', 'gRPC / Token Bucket', '0.5ms - 1ms'],
            ['3. Cache Query & Cache Hit Branch', 'Redis Cluster L1/L2', 'Redis RESP3', '0.4ms - 0.8ms'],
            ['4. Microservice Business Logic', 'Core Worker Fleet', 'In-Memory / epoll', '1.5ms - 3ms'],
            ['5. Persistent Database Write (WAL)', 'Primary Storage Engine', 'Binary Wire / NVMe', '2ms - 6ms'],
            ['6. Async Event Emission', 'Apache Kafka / RabbitMQ', 'TCP Event Publish', '0.8ms - 1.5ms'],
          ],
        },
      },
    ],
  }

  // Chapter 8: Horizontal Scalability & Sharding
  const chapter8: DossierChapter = {
    chapterNumber: 8,
    id: 'sharding-concurrency',
    title: 'Chapter 8: Horizontal Scalability, Sharding & Distributed Concurrency',
    subtitle: 'Partitioning strategies, consistent hashing, distributed locks, and hot keys',
    estimatedMinutes: 20,
    badge: 'Scaling & Sharding',
    summary: `Engineering strategies for scaling ${sys.name} beyond a single machine. Sharding architectures, consistent hash rings with virtual nodes, split-brain mitigation, and distributed concurrency control.`,
    keyTakeaways: [
      'Consistent Hashing with virtual nodes prevents catastrophic rebalancing storms when nodes join or fail.',
      'Optimistic Concurrency Control (OCC) with version vectors eliminates distributed database deadlocks.',
      'Hot-key salting mitigates single-partition write throttling caused by celebrity traffic.',
      'Two-Phase Commit (2PC) avoided in favor of Saga Orchestration and eventual consistency.',
    ],
    contentSections: [
      {
        heading: '8.1 Sharding & Partitioning Architecture',
        description:
          'Horizontal partitioning divides massive datasets across autonomous physical database nodes. The selection of the partition key determines whether the cluster scales linearly or bottlenecks:',
        bulletPoints: [
          'Hash-Based Sharding: SHA-256 / MurmurHash3 applied to the entity key mod total virtual buckets to guarantee uniform data distribution.',
          'Consistent Hashing with Virtual Nodes: Allocating 256 virtual tokens per physical node on the ring ensures variance in load remains under 5%.',
          'Avoid Range-Based Partitioning: Range partitioning on timestamps or alphabetically leads to massive write hot-spots on the latest active shard.',
        ],
      },
      {
        heading: '8.2 Distributed Concurrency & Locking',
        description:
          'Ensuring correctness across concurrent requests executing across geographically separated worker pods:',
        table: {
          headers: ['Concurrency Primitive', 'Use Case in This System', 'Failure Mode Protected Against'],
          rows: [
            ['Optimistic Concurrency (OCC)', 'Record updates with version tags', 'Lost Update problem & concurrent writes'],
            ['Distributed Mutex (Redlock)', 'Exclusive critical section operations', 'Double-spend & inventory oversell'],
            ['Idempotency Keys', 'API request retries from mobile clients', 'Duplicate charge & double creation'],
            ['Vector Clocks', 'Cross-datacenter conflict resolution', 'Causality violation in eventual consistency'],
          ],
        },
      },
    ],
  }

  // Chapter 9: Fault Tolerance & Chaos Resilience
  const chapter9: DossierChapter = {
    chapterNumber: 9,
    id: 'fault-tolerance-chaos',
    title: 'Chapter 9: Fault Tolerance, High Availability & Chaos Resilience Playbook',
    subtitle: 'Circuit breakers, split-brain recovery, cascading failure defense, and disaster recovery',
    estimatedMinutes: 18,
    badge: 'Resilience & DR',
    interactiveModuleType: 'chaos-simulator',
    summary: `Production battle-hardening playbook for ${sys.name}. Simulating node panics, network partitions, and upstream database brownouts with automated mitigation strategies.`,
    keyTakeaways: [
      'Circuit breakers prevent slow upstream services from exhausting gateway connection pools.',
      'Active-Active multi-region replication ensures Recovery Time Objective (RTO) < 30 seconds.',
      'Quorum consensus (R + W > N) guarantees read-your-writes consistency across replica failures.',
      'Graceful degradation mode serves stale cached snapshots when the authoritative data tier is unreachable.',
    ],
    contentSections: [
      {
        heading: '9.1 Failure Scenarios & Automated Recovery Playbook',
        description:
          'What happens when physical hardware fails in production, and how the system autonomously recovers:',
        table: {
          headers: ['Failure Scenario', 'Immediate Impact', 'Automated Detection', 'Self-Healing Playbook'],
          rows:
            deep?.failureModesAndRecovery.map((f) => [
              f.failureScenario,
              f.impact,
              f.detectionMechanism,
              f.automatedRecovery,
            ]) || [
              [
                'Primary Database Crash',
                'Writes fail; reads fall back to replicas',
                'Heartbeat timeout (3s) via Raft/Patroni',
                'Automated promotion of healthiest synchronous replica; DNS/proxy endpoints re-routed.',
              ],
              [
                'Cache Cluster Shard Outage',
                'Cache miss spike threatens to swamp database',
                'TCP connection drop & Redis Sentinel alert',
                'Circuit breaker trips; rate limiting throttles traffic; replica auto-promoted in < 5s.',
              ],
              [
                'Cross-Region Network Fiber Cut',
                'Partition between US-East and US-West',
                'Gossip protocol detects regional disconnection',
                'Quorum writes isolated to majority region; minority region switches to read-only mode.',
              ],
            ],
        },
      },
      {
        heading: '9.2 Circuit Breakers & Backpressure Defense',
        description:
          'To prevent cascading failures from collapsing the entire cloud architecture, all client libraries implement the Netflix Hystrix / Resilience4j state machine:',
        bulletPoints: [
          'Closed State: Traffic flows normally. Error rate tracked across a rolling 10-second window.',
          'Open State: If error rate exceeds 50% or P99 latency spikes above 2000ms, breaker trips. Requests fail fast in < 1ms without hitting the downstream service.',
          'Half-Open State: After a 30-second sleep window, canary probes test downstream health before resuming full traffic.',
        ],
      },
    ],
  }

  // Chapter 10: Tradeoffs & Production War Stories
  const chapter10: DossierChapter = {
    chapterNumber: 10,
    id: 'tradeoffs-war-stories',
    title: 'Chapter 10: Tradeoffs Matrix, CAP Positioning & Big-Tech Production War Stories',
    subtitle: 'CAP theorem analysis, historical outages from Meta/Uber/Netflix, and future evolutions',
    estimatedMinutes: 16,
    badge: 'Production Wisdom',
    summary: `Senior engineering tradeoffs, CAP/PACELC theorem positioning, and historical production post-mortems from top-tier tech giants for ${sys.name}.`,
    keyTakeaways: [
      'CAP Theorem positioning: Prioritizing High Availability (AP) with eventual consistency or Strict Consistency (CP) with quorum.',
      'PACELC Theorem: In normal operation (no partition), trading Latency for Consistency.',
      'Real-world outage analysis: Why real systems broke in production and how engineering teams redesigned them.',
      'Future evolutions: eBPF kernel acceleration, vector embeddings, and serverless edge compute.',
    ],
    contentSections: [
      {
        heading: '10.1 Fundamental Distributed Tradeoffs Matrix',
        description:
          'Engineering at scale is the discipline of choosing which problem you prefer to have. Key decisions evaluated against rejected alternatives:',
        table: {
          headers: ['Architectural Decision', 'Chosen Approach', 'Rejected Alternative', 'Engineering Rationale'],
          rows:
            deep?.keyTradeoffsAndDecisions.map((d) => [
              d.decision,
              d.chosenApproach,
              d.rejectedAlternative,
              d.rationale,
            ]) || [
              [
                'Consistency Model',
                'Eventual Consistency with CRDTs / Version Vectors',
                'Strong Two-Phase Commit (2PC)',
                '2PC blocks threads across network partitions, destroying global availability.',
              ],
              [
                'Data Ingestion Pipeline',
                'Asynchronous Kafka Log Streaming',
                'Synchronous HTTP REST calls',
                'Decouples producer throughput from consumer latency and absorbs sudden traffic spikes.',
              ],
              [
                'Storage Engine',
                'Log-Structured Merge-Tree (LSM)',
                'Traditional B+ Tree',
                'LSM turns random disk writes into sequential append writes, achieving 10x write throughput.',
              ],
            ],
        },
      },
      {
        heading: '10.2 Real-World Production War Story & Post-Mortem',
        description:
          'Lessons forged in real production incidents at scale:',
        callout: {
          type: 'deep-dive',
          title: `Historical Incident Case Study: Scaling ${sys.name} Under Fire`,
          message:
            `During a high-profile global event, traffic surged by 800% within 120 seconds. An in-memory cache eviction storm caused thousands of concurrent threads to execute identical heavy database queries (the "Thundering Herd" problem). The production database CPU pinned at 100%, causing cascading connection timeouts across all API gateways. The incident was permanently resolved by introducing Singleflight mutex deduplication at the gateway and randomizing cache TTLs with jitter to prevent simultaneous key expiration.`,
        },
      },
    ],
  }

  const chapters: DossierChapter[] = [
    chapter1,
    chapter2,
    chapter3,
    chapter4,
    chapter5,
    chapter6,
    chapter7,
    chapter8,
    chapter9,
    chapter10,
  ]

  const totalReadingTime = chapters.reduce((sum, ch) => sum + ch.estimatedMinutes, 0)

  return {
    system: sys,
    executiveSummary:
      deep?.executiveArchitectureSummary ||
      `Production-grade Staff+ architectural dossier for ${sys.name}. Covering 0-to-1 design, mathematical scale derivations, polyglot data models, packet lifecycles, and chaos fault-tolerance playbooks.`,
    totalChapters: chapters.length,
    totalReadingTimeMinutes: totalReadingTime,
    heroBannerImage: '/images/distributed-systems-blueprint.jpg',
    chapters,
  }
}

/**
 * Returns a summary list of all available system dossiers for master catalog navigation.
 */
export function getAllSystemDossierSummaries() {
  return ALL_SYSTEM_DESIGNS.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    difficulty: s.difficulty,
    tagline: s.tagline,
    throughput: s.throughput,
    latency: s.latency,
    storageScale: s.storageScale,
    totalChapters: 10,
    estimatedMinutes: 174,
  }))
}
