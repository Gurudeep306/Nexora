import type { TheoryChapter } from '../../types'

export const UNIT_3_CHAPTERS: TheoryChapter[] = [
  {
    id: 'ch-15',
    unitId: 'unit-3',
    unitTitle: 'Storage Engines & Database Internals',
    chapterNumber: 15,
    title: 'B+ Tree Page Layout, Latch Crabbing & ARIES Recovery',
    readingTimeMin: 16,
    summary:
      'The engine behind PostgreSQL InnoDB and SQLite: Fixed-size page layout (4KB/16KB), slotted page structures, Latch Crabbing concurrency, and ARIES write-ahead log recovery.',
    coreConcepts: [
      'B+ Tree Invariants: Self-balancing M-way search tree. All keys in internal nodes serve as routing fences; all actual records/data pointers reside exclusively in leaf nodes.',
      'Leaf Node Linked List: Leaf pages form a bidirectional linked list, enabling O(log N) point search and O(K) sequential range scans.',
      'Slotted Page Structure: Page header + Slot array (pointers growing downward) + Tuple data (growing upward from bottom of page).',
      'Latch Crabbing (Coupling): To traverse the tree, acquire latch on child before releasing latch on parent. Write path uses pessimistic or optimistic latching.',
      'ARIES Recovery: Algorithms for Recovery and Isolation Exploiting Semantics. Analysis, Redo (repeating history), and Undo phases.',
    ],
    deepContentMarkdown: `### The Anatomy of a B+ Tree

Almost all traditional relational databases (PostgreSQL, MySQL InnoDB, Oracle, SQLite) use **B+ Trees** as their default index and storage structure.

Unlike a standard B-Tree, a **B+ Tree** enforces a strict structural distinction:
1. **Internal (Routing) Nodes:** Contain only keys and child page pointers. They store zero user payload data.
2. **Leaf Nodes:** Contain all key-value pairs (or pointers to heap tuples). Leaf nodes are linked together sequentially in a doubly linked list.

\`\`\`
                       [ 50 | 100 ]            <-- Root Page (16KB)
                      /      |     \\
            [ 20 | 35 ]  [ 70 | 85 ] [ 120 | 150 ] <-- Internal Routing Pages
            /     |         |
         [1..19]-[20..34]-[35..49]...          <-- Leaf Pages (Doubly Linked List)
\`\`\`

---

### Slotted Page Physical Architecture

Disk I/O occurs in blocks called **Pages** (typically 4KB in OS, 8KB in Postgres, 16KB in InnoDB). Inside a page:

\`\`\`
┌────────────────────────────────────────────────────────┐
│ Page Header (LSN, Free Space Pointer, Flags)           │
├────────────────────────────────────────────────────────┤
│ Slot Array: [Offset 0] [Offset 1] [Offset 2] ... ───┐  │
├─────────────────────────────────────────────────────┼──┤
│                FREE SPACE GAP                       │  │
├─────────────────────────────────────────────────────┼──┤
│                                   Tuple 2 ◄─────────┘  │
│                      Tuple 1 ◄─────────────────────────┤
│         Tuple 0 ◄──────────────────────────────────────┘
└────────────────────────────────────────────────────────┘
\`\`\`

* **Slot Array:** Grows from top to bottom. Each slot contains a byte offset pointing to a tuple.
* **Tuple Storage:** Grows from bottom to top.
* **Benefit:** When a tuple is modified or deleted, the page can be compacted without altering external row pointers (which reference \`Page_ID : Slot_Index\`).

---

### Concurrency: Latch Crabbing (Coupling)

Because multiple threads traverse and modify the B+ Tree concurrently, we must prevent race conditions without locking the entire tree:

#### Search (Read) Path:
1. Acquire **Shared (S) Latch** on Root.
2. Read child pointer. Acquire **S Latch** on Child.
3. Release **S Latch** on Root (parent).
4. Repeat down to the leaf node.

#### Insert / Delete (Write) Path (Pessimistic):
1. Acquire **Exclusive (X) Latch** on Root.
2. Acquire **X Latch** on Child.
3. Check if Child is **"Safe"** (will not split or merge):
   * An insert is safe if the child has space for another key.
   * If Child is Safe, release all X Latches on all ancestors!
4. Continue down to the leaf node.

---

### ARIES Crash Recovery (C. Mohan et al., 1992)

When a database crashes mid-transaction, ARIES restores consistency using the Write-Ahead Log (WAL):

1. **Analysis Phase:** Scans WAL forward from last checkpoint to identify active transactions (losers) and dirty pages in the buffer pool at the time of crash.
2. **Redo Phase (Repeating History):** Scans forward from the oldest unwritten page LSN, re-applying ALL logged changes (including aborted transactions) to restore the exact state prior to crash.
3. **Undo Phase:** Scans backward, undoing the changes of all active (uncommitted) loser transactions, writing Compensation Log Records (CLRs) to ensure crash during recovery is idempotent.`,
    equationsAndMath: [
      {
        name: 'B+ Tree Search Depth Bound',
        formula: 'h \\le \\log_{\\lceil M/2 \\rceil} \\left( \\frac{N+1}{2} \\right) + 1',
        explanation: 'For fanout M = 1,000, a B+ Tree with height 3 can index 1 Billion rows, requiring at most 3-4 page reads per lookup.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'B+ Tree Storage Engine',
        pros: ['Exceptional read latency O(log N)', 'Fast range scans via leaf linked list', 'Predictable query performance'],
        cons: ['High write amplification (overwriting full 16KB pages on disk)', 'Random write I/O on updates'],
        bestFor: 'Read-heavy relational workloads (PostgreSQL, MySQL, SQLite)',
      },
      {
        option: 'LSM-Tree Storage Engine',
        pros: ['Fast sequential writes', 'High write throughput', 'Dense compression'],
        cons: ['Higher read amplification', 'Compaction stalls and background CPU spikes'],
        bestFor: 'Write-heavy workloads, time-series, analytics (Cassandra, RocksDB)',
      },
    ],
    interviewKeypoints: [
      'Explain Slotted Page layouts: Slots grow downward, tuples grow upward, enabling internal fragmentation compaction without breaking external row IDs.',
      'Walk through ARIES three phases: Analysis, Redo (repeat history), and Undo (rollback losers).',
    ],
  },

  {
    id: 'ch-16',
    unitId: 'unit-3',
    unitTitle: 'Storage Engines & Database Internals',
    chapterNumber: 16,
    title: 'LSM-Trees: Memtable, SkipLists, WAL & SSTables',
    readingTimeMin: 16,
    summary:
      'The architecture of Log-Structured Merge-Trees (RocksDB, Cassandra, ScyllaDB): Sequential append-only I/O, lock-free SkipLists in RAM, immutable SSTables, and background compaction.',
    coreConcepts: [
      'The LSM Philosophy: Disk drives (and SSDs) perform sequential writes 10x-100x faster than random writes. Convert all updates and deletes into sequential appends.',
      'Write Path: Append to Write-Ahead Log (WAL) on disk -> Insert into in-memory Memtable (SkipList, O(log N)) -> Return ACK to client in microseconds.',
      'Flush Path: When Memtable fills up (~64MB), freeze it as immutable and flush sequentially to disk as a Level 0 SSTable.',
      'Read Path: Check active Memtable -> immutable Memtables -> Level 0 SSTables -> Level 1..L SSTables.',
      'Deletes & Tombstones: Deletions do not erase data in-place; they append a Tombstone marker that discards older versions during compaction.',
    ],
    deepContentMarkdown: `### The Rise of LSM-Trees (O'Neil et al., 1996)

Traditional B+ Trees suffer from **random write penalties**: modifying a single 50-byte record forces the database to write a full 16KB page to disk, causing high write amplification and I/O bottlenecks.

**Log-Structured Merge-Trees (LSM-Trees)** eliminate random writes entirely by treating all writes, updates, and deletes as **sequential append operations**.

---

### The Three Core Components

\`\`\`
[ WRITES ]
    │
    ├──(Sequential Append)──► [ Write-Ahead Log (WAL) on Disk ] (Crash Safety)
    │
    └──(In-Memory Insert)───► [ Memtable (Concurrent SkipList in RAM) ]
                                          │
                                          │ (When Memtable >= 64MB)
                                          ▼ (Flush: Sequential Disk Write)
                             [ Immutable SSTable on Disk ]
\`\`\`

#### 1. Write-Ahead Log (WAL)
* Sequential append-only file on disk.
* Ensures durability: if power fails, the in-memory Memtable can be reconstructed by replaying the WAL.

#### 2. Memtable (RAM)
* In-memory sorted buffer. Typically implemented as a **Concurrent SkipList** because SkipLists support $O(\\log N)$ insertions without global mutex locks (using Compare-And-Swap / CAS).
* When the active Memtable reaches its threshold (e.g. 64MB), it is marked immutable, a fresh active Memtable is created, and a background thread flushes the immutable Memtable to disk.

#### 3. Sorted String Table (SSTable)
An SSTable is an immutable disk file divided into:
* **Data Blocks:** Key-value pairs stored in strict sorted order, compressed (Zstandard/Snappy).
* **Index Block:** Sparse index mapping key samples to byte offsets (e.g. one index entry every 4KB).
* **Bloom Filter Block:** Bit array in memory allowing $O(1)$ verification of key non-existence.
* **Footer:** Fixed-size block containing byte offsets to the Index and Bloom filter blocks.

---

### The Read Path: Dealing with Read Amplification
Because updates do not overwrite older versions in-place, reading key $K$ requires inspecting multiple storage tiers:
1. Search active **Memtable** in RAM.
2. Search any **Immutable Memtables** in RAM awaiting flush.
3. Search **Level 0 SSTables** on disk (Level 0 can have overlapping key ranges).
4. Search **Level 1, Level 2... SSTables** using the sparse index.

**How LSM-Trees survive read amplification:**
* **Bloom Filters:** Before reading an SSTable from disk, the engine checks its Bloom filter. If the Bloom filter returns false, the engine skips the SSTable entirely with **zero disk I/O**!
* **Block Cache:** Uncompressed data blocks reside in an in-memory LRU cache.`,
    equationsAndMath: [
      {
        name: 'SkipList Insertion Complexity',
        formula: 'E[\\text{Steps}] = \\mathcal{O}(\\log N)',
        explanation: 'Probabilistic SkipLists deliver logarithmic search and insertion with lock-free CAS operations, outperforming red-black trees under multi-threaded concurrency.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'LSM-Tree Storage Engine',
        pros: ['Extremely high write throughput', 'Dense compression (no fragmentation)', 'Sequential disk I/O friendly'],
        cons: ['High read amplification', 'Compaction consumes CPU and disk bandwidth (write amplification)'],
        bestFor: 'High-write systems (RocksDB, Cassandra, InfluxDB, Kafka message stores)',
      },
    ],
    interviewKeypoints: [
      'LSM-Trees turn random writes into sequential disk writes by buffering in a Memtable and flushing immutable SSTables.',
      'Explain Tombstones: Deleting a record appends a tombstone marker; the old record is physically reclaimed only during background compaction.',
    ],
  },

  {
    id: 'ch-17',
    unitId: 'unit-3',
    unitTitle: 'Storage Engines & Database Internals',
    chapterNumber: 17,
    title: 'Bloom Filters: Optimal Bit Allocation & Hash Mathematics',
    readingTimeMin: 14,
    summary:
      'The mathematics of probabilistic set membership: Burton Bloom\'s 1970 data structure, bit array sizing formulas, optimal hash function count, and false positive tuning.',
    coreConcepts: [
      'Probabilistic Guarantees: A Bloom filter can return either "Possibly in set" or "Definitely NOT in set". False positives are possible; false negatives are mathematically impossible.',
      'Bit Array (m) and Hash Functions (k): Each inserted key is hashed by k independent hash functions to produce k bit positions in array m, setting those bits to 1.',
      'Query Algorithm: Hash key with all k functions. If ANY bit is 0, key is DEFINITELY not present.',
      'Formula for Optimal Bits: m = - (n * ln p) / (ln 2)^2.',
    ],
    deepContentMarkdown: `### Burton Bloom\'s Probabilistic Filter (1970)

In database storage engines like RocksDB and Cassandra, checking disk for a non-existent key is the most expensive operation possible (requires seeking through multiple SSTables on disk).

A **Bloom Filter** is a space-efficient probabilistic data structure that tests whether an element is a member of a set in $O(k)$ time using only a fraction of a byte per key.

---

### The Mathematical Guarantees
* **False Negatives:** **0% (Impossible).** If the key was inserted, all $k$ corresponding bits were set to 1. Therefore, if a lookup sees a 0 bit, the key is guaranteed to be absent.
* **False Positives:** **Controlled probability $p$.** Due to hash collisions, all $k$ bits might be 1 even though the key was never inserted.

---

### Mathematical Derivation of Optimal Size

Given:
* $n$: Number of keys to store.
* $p$: Desired false positive probability (e.g. 1% = 0.01).
* $m$: Size of the bit array in bits.
* $k$: Number of independent hash functions.

#### 1. Optimal Bit Array Size ($m$):
$$m = - \\frac{n \\cdot \\ln(p)}{(\\ln 2)^2} \\approx -1.4427 \\cdot n \\cdot \\log_2(p)$$

#### 2. Optimal Number of Hash Functions ($k$):
$$k = \\frac{m}{n} \\cdot \\ln 2 \\approx 0.693 \\cdot \\frac{m}{n}$$

---

### The "Rule of Thumb" Values

| Desired False Positive Rate ($p$) | Bits Per Key ($m/n$) | Optimal Hashes ($k$) |
| :--- | :--- | :--- |
| **10% (0.1)** | 4.8 bits | 3 |
| **1% (0.01)** | **9.6 bits (~1.2 bytes)** | **7** |
| **0.1% (0.001)** | 14.4 bits | 10 |
| **0.01% (0.0001)** | 19.2 bits | 13 |

For **1% false positive rate**, you only need **~10 bits per key in RAM**. Storing 100 million keys in a Bloom filter consumes less than **120 MB of memory**, while eliminating 99% of unnecessary disk I/O!`,
    equationsAndMath: [
      {
        name: 'False Positive Probability Formula',
        formula: 'p \\approx \\left( 1 - e^{-kn/m} \\right)^k',
        explanation: 'The probability that all k hash bits are set to 1 by other keys in the filter.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Standard Bloom Filter',
        pros: ['Tiny memory footprint', 'O(k) constant lookup time', 'Zero false negatives'],
        cons: ['Does not support deletion (clearing a bit might delete another key)'],
        bestFor: 'Immutable datasets (SSTables, static URL blacklists)',
      },
      {
        option: 'Counting Bloom Filter',
        pros: ['Supports deletions by replacing bits with 4-bit counters'],
        cons: ['3x-4x higher memory footprint'],
        bestFor: 'Dynamic sets requiring item removal (cache admission policies)',
      },
    ],
    interviewKeypoints: [
      'Remember the magic number: ~10 bits per key and 7 hash functions yields a 1% false positive rate.',
      'Explain that Bloom filters CANNOT produce false negatives—if it says "Not in set", it is 100% guaranteed.',
    ],
  },

  {
    id: 'ch-18',
    unitId: 'unit-3',
    unitTitle: 'Storage Engines & Database Internals',
    chapterNumber: 18,
    title: 'SSTable Compaction: Size-Tiered vs. Leveled Compaction',
    readingTimeMin: 15,
    summary:
      'Managing LSM-tree disk garbage collection: The mechanics of merge-sorting SSTables, reclaiming dead tombstones, and the fundamental trade-offs between STCS and LCS.',
    coreConcepts: [
      'Why Compaction is Necessary: Reclaims disk space occupied by overwritten versions and deleted tombstones; merges fragmented SSTables to reduce read amplification.',
      'Size-Tiered Compaction Strategy (STCS): Groups SSTables of similar sizes; merges when count reaches threshold. Low write amplification, high space amplification.',
      'Leveled Compaction Strategy (LCS): Organizes data into discrete levels (L0, L1, L2...). Each level is 10x larger than the previous. Low space amplification, high write amplification.',
      'The RUM Conjecture: Read, Update, and Memory overhead cannot be optimized simultaneously.',
    ],
    deepContentMarkdown: `### The Compaction Engine of LSM-Trees

Because SSTables are immutable on disk, updates and deletes produce duplicate records and tombstones scattered across multiple files. Without compaction:
1. Disk space would grow without bound.
2. Read queries would have to scan dozens of files, degrading read latency.

**Compaction** is the background merge-sort process that takes multiple SSTables, reads them sequentially, discards older versions and tombstones, and writes new consolidated SSTables.

---

### 1. Size-Tiered Compaction Strategy (STCS)
* **Mechanics:**
  * Collects SSTables of roughly equal size into tiers.
  * When a tier accumulates a threshold count of SSTables (typically 4), the engine merge-sorts them into a single larger SSTable in the next tier.
* **Pros:** Low write amplification (writes are merged in large batches).
* **Cons (The Space Trap):** High **Space Amplification**. Because an entire tier must be duplicated during compaction, the database requires up to **50% free disk space** as headroom.

---

### 2. Leveled Compaction Strategy (LCS - RocksDB / LevelDB)
* **Mechanics:**
  * Divides disk storage into discrete levels ($L_0, L_1, L_2, \\dots, L_k$).
  * $L_0$ contains flushed Memtables (can have overlapping key ranges).
  * $L_1$ has a max capacity (e.g. 10MB). Each subsequent level has **$10\\times$ the capacity** of the previous level ($L_2 = 100\\text{MB}, L_3 = 1\\text{GB}, L_4 = 10\\text{GB}$).
  * **Crucial Invariant:** In levels $1+$, key ranges are strictly partitioned and **non-overlapping**.
  * When Level $i$ exceeds its capacity, the engine picks one SSTable from $L_i$, finds all overlapping SSTables in $L_{i+1}$, and merge-sorts them.
* **Pros:**
  * **Low Space Amplification:** Requires only ~10% disk headroom.
  * **Fast Point Reads:** In levels $1+$, at most ONE SSTable per level can contain the target key!
* **Cons:** High **Write Amplification** ($10\\times - 30\\times$), as data is repeatedly rewritten during promotions across levels.`,
    equationsAndMath: [
      {
        name: 'Leveled Compaction Capacity Formula',
        formula: '\\text{Capacity}(L_i) = C_{base} \\times T^i',
        explanation: 'For base size 10MB and amplification factor T = 10, Level 4 holds 100GB of non-overlapping sorted data.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Size-Tiered Compaction (STCS)',
        pros: ['Fast writes', 'Low write amplification'],
        cons: ['50% disk space headroom required', 'Slower reads (must check multiple files per tier)'],
        bestFor: 'Write-heavy append-only time-series data (Cassandra default)',
      },
      {
        option: 'Leveled Compaction (LCS)',
        pros: ['Predictable disk usage (10% headroom)', 'Faster reads (at most 1 file per level)'],
        cons: ['High write amplification', 'Heavy background disk I/O on NVMe'],
        bestFor: 'Read-heavy or mixed read/write key-value workloads (RocksDB default)',
      },
    ],
    interviewKeypoints: [
      'Explain the RUM conjecture: Compaction balances Read Amplification, Update (Write) Amplification, and Memory (Space) Overhead.',
      'Contrast STCS (50% disk headroom needed, fast writes) with LCS (10% headroom needed, fast reads).',
    ],
  },

  {
    id: 'ch-19',
    unitId: 'unit-3',
    unitTitle: 'Storage Engines & Database Internals',
    chapterNumber: 19,
    title: 'Database Partitioning & Sharding Strategies',
    readingTimeMin: 15,
    summary:
      'Scaling beyond a single machine: Range-based partitioning, Hash-based partitioning, Directory-based routing, and cross-shard scatter-gather queries.',
    coreConcepts: [
      'The Need for Partitioning: A single database server has limits on RAM, CPU, and disk IOPS. Partitioning splits large tables into smaller independent subsets.',
      'Range Partitioning: Partitions based on contiguous key ranges (e.g. A-C, D-F). Supports fast range queries, but vulnerable to hot spots on monotonic keys (timestamps).',
      'Hash Partitioning: Applies a hash function (MurmurHash3) to the partition key modulo N. Distributes keys uniformly, but destroys sequential range query efficiency.',
      'Scatter-Gather Queries: Queries that do not include the partition key must be broadcast to ALL shards, increasing latency to the slowest shard.',
    ],
    deepContentMarkdown: `### The Fundamentals of Sharding

When a dataset exceeds the storage capacity of a single machine (or write IOPS saturate a single primary node), the database must be **partitioned (sharded)** across a distributed cluster.

---

### Partitioning Strategies

#### 1. Range Partitioning
* Divides data into contiguous key ranges (e.g., Shard 1 holds User IDs \`1..100,000\`, Shard 2 holds \`100,001..200,000\`).
* **Pros:** Highly efficient range scans. \`SELECT * FROM orders WHERE date BETWEEN '2024-01-01' AND '2024-01-31'\` targets a single shard.
* **The Hotspot Vulnerability:** If the partition key is monotonically increasing (like a timestamp or auto-incrementing ID), **100% of current writes target the single latest shard**, starving the cluster while other shards sit idle!

#### 2. Hash Partitioning
* Applies a cryptographic or non-cryptographic hash (e.g. MurmurHash3, MD5) to the partition key:
  $$\\text{Shard} = \\text{Hash}(\\text{Key}) \\pmod N$$
* **Pros:** Distributes writes uniformly across all nodes, completely eliminating monotonic hotspots.
* **Cons:** Destroys range scan performance. Range queries must be executed as **Scatter-Gather** queries across all $N$ shards.

#### 3. Directory-Based Partitioning
* A centralized lookup service maps partition keys to physical shards.
* Allows dynamic shard rebalancing and custom customer placement (e.g. enterprise tenants placed on dedicated high-performance hardware).

---

### The Cross-Shard Query Challenge (Scatter-Gather)
* **Targeted Query (With Shard Key):** \`SELECT * FROM users WHERE user_id = 9021\`. The router hashes \`user_id\` and routes directly to Shard 4. Latency: **5ms**.
* **Scatter-Gather Query (Without Shard Key):** \`SELECT * FROM users WHERE email = 'alice@example.com'\`. The router does not know which shard holds Alice. It must broadcast the query to all 64 shards in parallel, wait for all 64 responses, and merge results.
  * **Latency is governed by the 99th percentile slowest shard!**`,
    equationsAndMath: [
      {
        name: 'Scatter-Gather Tail Latency Bound',
        formula: 'P(\\text{Query Slower Than } T) = 1 - (1 - P(S_i > T))^N',
        explanation: 'As the shard count N grows, the probability of at least one shard hitting a tail latency spike approaches 100%.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Range Partitioning',
        pros: ['Fast sequential range scans'],
        cons: ['Severe write hot spots on timestamp/sequential keys'],
        bestFor: 'Non-sequential keys (e.g. alphabetical dictionary words)',
      },
      {
        option: 'Hash Partitioning',
        pros: ['Uniform write distribution', 'Eliminates hot spots'],
        cons: ['Range scans require scatter-gather across all shards'],
        bestFor: 'User profiles, session data, high-velocity transactional keys',
      },
    ],
    interviewKeypoints: [
      'Always choose a shard key that has high cardinality, uniform write distribution, and matches the primary query path.',
      'Explain why auto-incrementing IDs or timestamps are terrible shard keys in range-partitioned systems.',
    ],
  },

  {
    id: 'ch-20',
    unitId: 'unit-3',
    unitTitle: 'Storage Engines & Database Internals',
    chapterNumber: 20,
    title: 'Consistent Hashing: Mathematical Ring & Vnodes',
    readingTimeMin: 15,
    summary:
      'Eliminating the re-sharding disaster: Why modulo hashing fails, the circular identifier space [0, 2^32 - 1], virtual nodes (vnodes) load variance math, and minimal key migration.',
    coreConcepts: [
      'The Modulo Problem: Hash(key) % N forces almost all keys (N - 1)/N to remap when adding a node, triggering cascading cache wipeout.',
      'The Consistent Hash Ring: Maps both keys and physical nodes to a shared circular 32-bit or 128-bit ring.',
      'Key Assignment: A key belongs to the first node encountered moving clockwise on the ring.',
      'Virtual Nodes (Vnodes): Allocating 150-300 virtual tokens per physical node reduces load variance from O(1/N) down to near-uniform standard deviation.',
    ],
    deepContentMarkdown: `### The Failure of Modulo Hashing

In naive distributed caching:
$$\\text{Node} = \\text{Hash}(\\text{Key}) \\pmod N$$

When a cluster expands from $N = 9$ nodes to $N = 10$ nodes:
* Almost every key\'s modulo value changes:
  $$\\frac{N - 1}{N} = \\frac{9}{10} = 90\\% \\text{ of all cached keys are suddenly assigned to wrong nodes!}$$
* **Result:** A catastrophic cache stampede hits the backing database simultaneously, causing total system outage.

---

### The Consistent Hashing Ring (Karger et al., 1997)

Consistent Hashing maps both keys and servers onto the same mathematical ring:

\`\`\`
                     NodeA (Hash: 0x1A0F)
                    /                    \\
        NodeC (0xE4F1)                NodeB (0x4B2C)
             │                              │
             │        HASH RING SPACE       │
             │        [0 .. 2^32 - 1]       │
             │                              │
             └──────────────────────────────┘
\`\`\`

1. **Ring Space:** Typically a 32-bit integer circle $[0, 2^{32} - 1]$ or 128-bit MD5 circle.
2. **Node Placement:** Physical servers are hashed by their IP/hostname onto points on the ring.
3. **Key Lookup:** To find where key $K$ lives, compute $\\text{Hash}(K)$ and walk clockwise until encountering the first node.

#### The Magic of Node Additions/Removals:
When a new node joins, it only steals a slice of keys from its immediate clockwise successor. On average, only **$K / N$ keys are migrated**, leaving the remaining $(N-1)/N$ keys completely undisturbed!

---

### Virtual Nodes (Vnodes) and Variance Reduction

If we place only physical servers on the ring, partitions between servers will be highly uneven (non-uniform distribution).

**Solution: Virtual Nodes (Vnodes)**
* Each physical server is assigned $V$ virtual positions (e.g. \`ServerA#1\`, \`ServerA#2\`, \dots \`ServerA#200\`).
* Each virtual token is hashed independently across the ring.

#### The Mathematical Advantage:
* Without vnodes: Standard deviation of keys per node is high: $\\sigma = \\mathcal{O}(1/N)$.
* With $V$ vnodes: Standard deviation drops to $\\approx \\frac{1}{\\sqrt{V}}$.
* For $V = 200$, load variance across servers drops below **5%**, achieving near-perfect load balancing across heterogeneous hardware!`,
    equationsAndMath: [
      {
        name: 'Key Migration Ratio on Cluster Rebalance',
        formula: '\\text{Keys Migrated} = \\frac{K}{N + 1}',
        explanation: 'Adding a single node to an N-node cluster relocates only 1/(N+1) fraction of keys, compared to ~100% in modulo hashing.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Consistent Hashing with Vnodes',
        pros: ['Minimal key migration on node churn', 'Uniform load distribution across servers', 'Heterogeneous hardware weighting'],
        cons: ['Client routing driver must maintain ring table and execute binary search O(log V)'],
        bestFor: 'Distributed caches (Memcached), Dynamo-style databases (Cassandra, Riak)',
      },
    ],
    interviewKeypoints: [
      'Draw the circular ring on the whiteboard; show how adding a node only affects keys between the new node and its predecessor.',
      'Explain that Virtual Nodes prevent data hotspots and allow assigning more tokens to more powerful physical machines.',
    ],
  },

  {
    id: 'ch-21',
    unitId: 'unit-3',
    unitTitle: 'Storage Engines & Database Internals',
    chapterNumber: 21,
    title: 'Replication Topologies: Single-Leader to Dynamo Quorums',
    readingTimeMin: 16,
    summary:
      'Comparing distributed database replication models: Single-Leader (sync vs async), Multi-Leader conflict resolution (CRDTs), and Leaderless Dynamo Quorums (R + W > N, hinted handoff, Merkle trees).',
    coreConcepts: [
      'Single-Leader Replication: All writes route to primary; read replicas scale reads. Split-brain risk during failover.',
      'Multi-Leader Replication: Multiple datacenters accept writes. Requires conflict resolution (Last-Write-Wins vs CRDTs).',
      'Leaderless (Dynamo-Style): Clients write to N replicas directly. Configurable quorum parameters (N, W, R).',
      'Quorum Math: W + R > N guarantees read set and write set overlap by at least one replica.',
      'Anti-Entropy: Merkle trees detect data divergence between replicas using minimal network bandwidth.',
    ],
    deepContentMarkdown: `### The Three Replication Architectures

Replication copies data across multiple machines to guarantee fault tolerance and scale read throughput.

---

### 1. Single-Leader (Master-Replica)
* All write operations route strictly to the designated **Leader**.
* Replicas stream the replication log (binlog / WAL) from the leader and serve read queries.
* **Synchronous vs Asynchronous:**
  * **Sync Replication:** Leader waits for replica ACK before committing. Zero data loss, but write latency is slowed by the slowest replica.
  * **Async Replication:** Leader returns success immediately. High throughput, but if leader crashes, un-replicated writes are permanently lost.
  * **Semi-Synchronous (Best Practice):** Leader waits for at least ONE replica to acknowledge before returning success.

---

### 2. Multi-Leader (Active-Active)
* Used across multi-datacenter setups (e.g. US-East and EU-West both accept writes).
* **The Conflict Problem:** If User A changes email to \`a@foo.com\` in US-East while concurrently changing email to \`a@bar.com\` in EU-West, the database experiences a write-write conflict.
* **Resolution Strategies:**
  * **Last-Write-Wins (LWW):** Highest timestamp wins (vulnerable to clock drift).
  * **Conflict-Free Replicated Data Types (CRDTs):** Mathematically convergent structures (e.g. PN-Counters, LWW-Element-Sets).

---

### 3. Leaderless Replication (Dynamo / Cassandra)
* No leader node exists. Clients write directly to $N$ replica nodes.
* **Tunable Quorums:**
  * $N$: Total replication factor (typically 3).
  * $W$: Write quorum (number of nodes that must ACK write).
  * $R$: Read quorum (number of nodes that must respond to read).

#### The Strong Consistency Invariant:
$$W + R > N$$

If $N = 3$, setting $W = 2$ and $R = 2$ satisfies $2 + 2 = 4 > 3$.
**Pigeonhole Principle:** The read quorum and the write quorum must overlap by at least one node. The reader will always observe the latest version!

#### Self-Healing Mechanisms:
1. **Read Repair:** When a client reads from $R=2$ replicas and notices Replica B has an older version than Replica A, the client pushes the newer version back to Replica B.
2. **Sloppy Quorums & Hinted Handoff:** If a replica is temporarily offline during a write, another healthy node accepts a "hint" and delivers the write once the target replica recovers.
3. **Anti-Entropy with Merkle Trees:** Replicas periodically compare hierarchical cryptographic hash trees (Merkle trees) to identify divergent keys with minimal network transfer.`,
    equationsAndMath: [
      {
        name: 'Quorum Overlap Invariant',
        formula: 'W + R > N',
        explanation: 'When write quorum W plus read quorum R exceeds replication factor N, at least one node in the read set is guaranteed to hold the latest committed write.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Single-Leader Replication',
        pros: ['Simplest consistency model', 'Zero write-write conflicts'],
        cons: ['Single leader write bottleneck', 'Failover delay during leader crash'],
        bestFor: 'Relational databases (PostgreSQL, MySQL)',
      },
      {
        option: 'Leaderless Dynamo Quorums',
        pros: ['Extreme write availability', 'Tunable consistency per query', 'Zero single-point-of-failure'],
        cons: ['Eventual consistency under sloppy quorums', 'Vector clocks and read repair required'],
        bestFor: 'Global distributed key-value stores (Amazon Dynamo, Cassandra, ScyllaDB)',
      },
    ],
    interviewKeypoints: [
      'Write the quorum formula W + R > N and explain why the Pigeonhole Principle guarantees strong consistency.',
      'Explain Hinted Handoff and how Merkle trees synchronize divergent replicas efficiently.',
    ],
  },
]
