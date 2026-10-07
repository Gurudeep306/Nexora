import type { TheoryChapter, TheoryUnit } from '../types'
import { UNIT_1_CHAPTERS } from './theory/unit1FoundationsData'
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

export { UNIT_1_CHAPTERS }

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
