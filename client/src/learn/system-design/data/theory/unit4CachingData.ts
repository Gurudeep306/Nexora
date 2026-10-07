import type { TheoryChapter } from '../../types'

export const UNIT_4_CHAPTERS: TheoryChapter[] = [
  {
    id: 'ch-22',
    unitId: 'unit-4',
    unitTitle: 'Caching Topologies, Algorithms & Resiliency',
    chapterNumber: 22,
    title: 'Caching Topologies: Cache-Aside, Write-Through & Write-Behind',
    readingTimeMin: 14,
    summary:
      'The architectural patterns of caching: Cache-Aside (Lazy Loading), Read-Through, Write-Through, Write-Behind (Write-Back), and Refresh-Ahead. Failure modes and consistency guarantees.',
    coreConcepts: [
      'Cache-Aside (Lazy Loading): Application code coordinates between cache and database. Checks cache; on miss, fetches from DB and populates cache.',
      'Read-Through: Application treats cache as primary data source; cache library transparently fetches from DB on miss.',
      'Write-Through: Application writes to cache; cache synchronously writes to DB before acknowledging. High consistency, higher write latency.',
      'Write-Behind (Write-Back): Application writes to cache; cache acknowledges immediately and batches writes asynchronously to DB. Ultra-low latency, risk of data loss on cache crash.',
      'Refresh-Ahead: Cache automatically reloads hot keys before their TTL expires based on access patterns.',
    ],
    deepContentMarkdown: `### The Five Caching Topologies

Caching stores expensive computation or slow database queries in fast in-memory RAM (Redis, Memcached). Choosing the correct topology dictates your write latency and data loss risk:

---

### 1. Cache-Aside (Lazy Loading)
* **Read Path:**
  1. Application checks cache for key $K$.
  2. If Cache HIT: Return cached data.
  3. If Cache MISS: Query database, write result to cache with a TTL, and return data to client.
* **Write Path:**
  1. Application writes directly to the database.
  2. Application **invalidates (deletes)** the cache key (\`DEL key\`).
* **Why Delete instead of Update?** Updating the cache on write risks race conditions where concurrent writes overwrite cache with stale data. Invalidation is safe and idempotent.

---

### 2. Write-Through Caching
* Application writes data directly to the cache.
* The cache layer is responsible for synchronously writing to the backing database before returning an ACK to the application.
* **Pros:** Cache is never stale; newly written data is immediately warm.
* **Cons:** Every write incurs two network hops (app $\\to$ cache $\\to$ DB).

---

### 3. Write-Behind (Write-Back) Caching
* Application writes data to the cache.
* The cache acknowledges the write **immediately** in RAM (< 1ms).
* An asynchronous background thread batches writes and flushes them to the backing database (e.g. every 5 seconds).
* **Pros:** Ultra-high write throughput; coalesces duplicate writes (10 updates to the same row result in a single DB write).
* **Cons (The Danger):** If the cache node crashes before the queue flushes to disk, **data is permanently lost**.

---

### 4. Refresh-Ahead
* The cache tracks key access frequency.
* If a key is frequently accessed and has a TTL of 60 seconds, a background worker automatically re-queries the database at second 55, refreshing the TTL before it expires.
* Completely eliminates cache miss latency for hot keys.`,
    equationsAndMath: [
      {
        name: 'Effective Latency with Cache-Aside',
        formula: 'T_{eff} = H \\times T_{cache} + (1 - H) \\times (T_{cache} + T_{db})',
        explanation: 'For cache hit ratio H (e.g. 98%), T_cache (1ms), and T_db (50ms), effective latency is 1.98ms.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Cache-Aside (Lazy Loading)',
        pros: ['Only caches requested data', 'Resilient to cache crashes (falls back to DB)'],
        cons: ['Cache miss latency penalty on cold reads', 'Potential stale data if DB is updated directly'],
        bestFor: 'General web applications, user profiles, product catalogs',
      },
      {
        option: 'Write-Behind (Write-Back)',
        pros: ['Maximum write throughput', 'Coalesces write spikes'],
        cons: ['Risk of permanent data loss on power failure'],
        bestFor: 'Real-time analytics counters, game scoreboards, IoT telemetry',
      },
    ],
    interviewKeypoints: [
      'Always advocate for Cache Invalidation (DEL key) on database updates rather than cache replacement (SET key) to prevent concurrent race conditions.',
      'Highlight Write-Behind when designing ultra-high write systems like live video stream view counts.',
    ],
  },

  {
    id: 'ch-23',
    unitId: 'unit-4',
    unitTitle: 'Caching Topologies, Algorithms & Resiliency',
    chapterNumber: 23,
    title: 'Cache Eviction Algorithms: LRU, LFU, 2Q & ARC',
    readingTimeMin: 15,
    summary:
      'How caches reclaim memory under capacity constraints: Least Recently Used (LRU), Least Frequently Used (LFU), 2Q, and IBM\'s Adaptive Replacement Cache (ARC).',
    coreConcepts: [
      'The Need for Eviction: RAM is finite. When cache reaches maximum capacity, an eviction policy decides which keys to purge.',
      'LRU (Least Recently Used): Evicts the key that has not been accessed for the longest time. Implemented via HashMap + Doubly Linked List in O(1).',
      'LFU (Least Frequently Used): Evicts the key with the lowest access counter. Implemented via frequency buckets in O(1).',
      'ARC (Adaptive Replacement Cache): Dynamically tunes between recency and frequency using four separate ghost lists.',
    ],
    deepContentMarkdown: `### The Science of Cache Eviction

When in-memory caches reach capacity, they must evict items. A poor eviction policy purges hot data, destroying the cache hit ratio and overloading backing databases.

---

### 1. Least Recently Used (LRU)
* **Principle:** If data was accessed recently, it will likely be accessed again soon (temporal locality).
* **Data Structure:**
  * **Hash Map:** Maps Key $\\to$ Node Pointer for $O(1)$ lookups.
  * **Doubly Linked List:** Maintains recency order. Head = Most Recently Used; Tail = Least Recently Used.
* **Operations:**
  * \`get(key)\`: Locate node via Hash Map in $O(1)$, detach node from its current list position, and insert at Head. Return value.
  * \`put(key, val)\`: If key exists, update value and move to Head. If new and capacity full, remove node at Tail and delete from Hash Map. Insert new node at Head.
* **Flaw (Sequential Scan Pollution):** A batch job scanning 100,000 cold items wipes out the entire hot working set from the cache!

---

### 2. Least Frequently Used (LFU)
* **Principle:** Evicts the item with the lowest access count.
* **Flaw (Stale Frequency Accumulation):** An item that was viral yesterday (1,000,000 hits) remains in cache forever even if it is never accessed again today.
* **Mitigation:** Frequency aging (periodic decay of counters).

---

### 3. Adaptive Replacement Cache (ARC - Nimrod Megiddo, 2003)
* Invented at IBM to resolve the scan-pollution flaws of LRU and the stale counter flaws of LFU.
* Maintains two pairs of lists:
  1. $L_1$: Tracks items accessed **once** recently (Recency).
     * $T_1$: Recent items currently in cache.
     * $B_1$: Ghost list tracking recent keys that were evicted (metadata only).
  2. $L_2$: Tracks items accessed **at least twice** (Frequency).
     * $T_2$: Frequent items currently in cache.
     * $B_2$: Ghost list tracking frequent keys that were evicted.
* **Dynamic Self-Tuning:** If hits occur in the ghost list $B_1$, ARC automatically expands the size of $T_1$ (favoring recency). If hits occur in $B_2$, ARC expands $T_2$ (favoring frequency).
* **Result:** Completely immune to sequential scan pollution without manual tuning!`,
    equationsAndMath: [
      {
        name: 'LRU Algorithm Complexity',
        formula: 'T_{lookup} = \\mathcal{O}(1), \\quad T_{insert} = \\mathcal{O}(1), \\quad T_{evict} = \\mathcal{O}(1)',
        explanation: 'Combining a hash map with a doubly linked list delivers strict constant-time operations for all cache manipulations.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'LRU (Least Recently Used)',
        pros: ['Simple O(1) implementation', 'Adapts quickly to shifting access patterns'],
        cons: ['Vulnerable to cache wiping during full table scans'],
        bestFor: 'General web application caching (Redis maxmemory-policy allkeys-lru)',
      },
      {
        option: 'Adaptive Replacement Cache (ARC)',
        pros: ['Immune to scan pollution', 'Self-tuning between recency and frequency'],
        cons: ['Higher memory overhead (maintains ghost metadata lists)', 'Patented by IBM (historical adoption hurdle)'],
        bestFor: 'File systems (ZFS), high-end database buffer pools',
      },
    ],
    interviewKeypoints: [
      'Be prepared to code the O(1) LRU Cache (HashMap + Doubly Linked List) in any machine coding interview.',
      'Explain the sequential scan vulnerability of LRU and how ARC or 2Q mitigates it.',
    ],
  },

  {
    id: 'ch-24',
    unitId: 'unit-4',
    unitTitle: 'Caching Topologies, Algorithms & Resiliency',
    chapterNumber: 24,
    title: 'Cache Stampede (Dogpiling) & The XFetch Algorithm',
    readingTimeMin: 15,
    summary:
      'What happens when a viral cache key expires: The thundering herd effect, Mutex locking vs Probabilistic Early Expiration (the optimal XFetch algorithm).',
    coreConcepts: [
      'The Cache Stampede Problem: A hot key (10,000 req/sec) expires. 10,000 concurrent requests miss the cache simultaneously and hit the database at once, causing cascading outage.',
      'Mitigation 1 (Distributed Mutex): Only one thread acquires lock to recompute; others wait or return stale data.',
      'Mitigation 2 (Probabilistic Early Expiration / XFetch): Background reader probabilistically recomputes the cache value BEFORE hard expiration.',
    ],
    deepContentMarkdown: `### The Anatomy of a Cache Stampede

A **Cache Stampede (Dogpiling / Thundering Herd)** occurs when an extremely popular cached item expires:

1. Key \`product:iphone16\` serves **20,000 requests per second** from Redis.
2. The key\'s TTL reaches 0 and Redis purges it.
3. Over the next 100 milliseconds, **2,000 concurrent requests** experience a cache miss simultaneously.
4. All 2,000 threads query the backing PostgreSQL database with the exact same heavy SQL query.
5. The database connection pool exhausts, CPU spikes to 100%, and the database crashes!

---

### Solution 1: Distributed Mutex (Singleflight)
When a cache miss occurs, the application attempts to acquire a short-lived lock (e.g. \`SET lock:key UUID NX EX 5\`):
* **Thread 1:** Acquires lock, executes DB query, updates cache, and releases lock.
* **Threads 2..N:** Fail to acquire lock; they either sleep for 50ms and re-check cache, or return the stale value immediately.
* **In Go:** Implemented cleanly via \`golang.org/x/sync/singleflight\`.

---

### Solution 2: The Optimal XFetch Algorithm (Vattani et al., 2015)
Published in VLDB 2015 (*"Optimal Probabilistic Cache Stampede Prevention"*), the **XFetch algorithm** eliminates locks entirely by refreshing the cache **probabilistically before hard expiry**.

When a client reads a key from cache, it evaluates the condition:
$$-\\beta \\times \\delta \\times \\ln(U) > \\text{TTL}_{\\text{remaining}}$$

Where:
* $\\beta > 0$: Aggressiveness parameter (typically 1.0).
* $\\delta$: Asynchronous computation time required to query the database (in seconds).
* $U \\sim \\text{Uniform}(0, 1)$: Random float between 0 and 1.
* $\\text{TTL}_{\\text{remaining}} = \\text{ExpiryTime} - \\text{CurrentTime}$.

#### Why this works:
* As $\\text{TTL}_{\\text{remaining}}$ decreases toward 0, the probability of the condition being true approaches 1.
* Statistically, **exactly one concurrent reader** triggers early recomputation in the background, updating the cache seamlessly *before* the key ever expires!
* Zero dropped requests, zero mutex locks, and zero database spikes!`,
    equationsAndMath: [
      {
        name: 'XFetch Early Refresh Decision Rule',
        formula: '-\\beta \\cdot \\delta \\cdot \\ln(\\text{rand}()) > (T_{expire} - T_{now})',
        explanation: 'If the logarithmic random variable exceeds remaining TTL, the thread refreshes the cache asynchronously.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Distributed Mutex / Singleflight',
        pros: ['Guarantees exactly one database query on expiration'],
        cons: ['Waiting threads experience latency spikes while lock holder recomputes'],
        bestFor: 'Batch reports, scheduled analytics dashboards',
      },
      {
        option: 'XFetch Probabilistic Refresh',
        pros: ['Zero latency spikes for users', 'Zero distributed locking overhead'],
        cons: ['Requires storing computation delta alongside cached value'],
        bestFor: 'High-traffic e-commerce product pages, viral social posts',
      },
    ],
    interviewKeypoints: [
      'Proactively bring up Cache Stampede whenever an interviewer mentions a high-traffic key with a TTL.',
      'Explain the XFetch algorithm to demonstrate advanced systems engineering knowledge.',
    ],
  },

  {
    id: 'ch-25',
    unitId: 'unit-4',
    unitTitle: 'Caching Topologies, Algorithms & Resiliency',
    chapterNumber: 25,
    title: 'Cache Penetration & Null-Value Caching with Bloom Filters',
    readingTimeMin: 13,
    summary:
      'Defending against non-existent key attacks: How malicious scrapers bypass caches to DDoS databases, and how Bloom filters and short-TTL null caching mitigate penetration.',
    coreConcepts: [
      'Cache Penetration: Client queries keys that DO NOT EXIST in the database (e.g. user_id = -99999). Every request misses cache and hits DB directly.',
      'Mitigation 1 (Null-Value Caching): Cache the empty/null result with a short TTL (60s) to absorb repeat queries.',
      'Mitigation 2 (Bloom Filter Fronting): Place a Bloom filter in front of the cache to instantly reject non-existent keys in memory.',
    ],
    deepContentMarkdown: `### The Threat of Cache Penetration

**Cache Penetration** occurs when incoming requests query keys that do not exist in either the cache OR the database:

1. An attacker sends 50,000 requests per second querying random negative IDs: \`GET /users/-892143\`.
2. Redis checks the key: Cache MISS.
3. The application queries PostgreSQL: \`SELECT * FROM users WHERE id = -892143\`.
4. PostgreSQL returns \`NULL\` (empty row).
5. The application returns 404, but does NOT write anything to Redis.
6. **Result:** 100% of the attacker\'s traffic penetrates the cache entirely, saturating database IOPS!

---

### Defense 1: Cache Null Values with Short TTL
* When a database query returns \`NULL\`, write a special sentinel value to Redis:
  \`\`\`redis
  SET user:-892143 "NULL_SENTINEL" EX 60
  \`\`\`
* Subsequent queries for the same invalid ID return immediately from Redis in 0.5ms.
* **The Caveat:** If an attacker queries completely random unique IDs each time, null caching consumes massive Redis memory.

---

### Defense 2: Bloom Filter Guard
* Maintain an in-memory **Bloom Filter** containing all valid existing IDs in the database.
* When a request arrives:
  1. Check Bloom Filter.
  2. If Bloom Filter returns **False**: The key is **guaranteed to not exist**. Return **HTTP 404 immediately** with zero cache or DB queries!
  3. If Bloom Filter returns **True**: Proceed to check cache and database.`,
    equationsAndMath: [
      {
        name: 'Penetration Defense Reduction',
        formula: '\\text{DB Queries} = \\text{Total Requests} \\times P_{\\text{Bloom False Positive}}',
        explanation: 'A Bloom filter with 1% false positive rate blocks 99% of non-existent key penetration attempts before hitting cache or DB.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Null-Value Caching',
        pros: ['Extremely simple to implement in application code'],
        cons: ['Vulnerable to memory exhaustion if attacker generates millions of distinct random IDs'],
        bestFor: 'Accidental non-existent key lookups from regular users',
      },
      {
        option: 'Bloom Filter In Front of Cache',
        pros: ['Immune to randomized ID dictionary attacks', 'Minimal memory footprint (~10 bits per key)'],
        cons: ['Must update Bloom filter when new records are inserted in DB'],
        bestFor: 'Public-facing APIs vulnerable to scraping and DDoS attacks',
      },
    ],
    interviewKeypoints: [
      'Differentiate between Cache Penetration (key does not exist anywhere) and Cache Stampede (key exists but expired).',
      'Recommend combining a Bloom Filter with a 60-second Null Cache for defense in depth.',
    ],
  },

  {
    id: 'ch-26',
    unitId: 'unit-4',
    unitTitle: 'Caching Topologies, Algorithms & Resiliency',
    chapterNumber: 26,
    title: 'Cache Avalanche & Exponential TTL Jitter Formulations',
    readingTimeMin: 13,
    summary:
      'Preventing simultaneous cache expiration disasters: How identical TTLs trigger cascading failures, and the mathematics of adding uniform and exponential jitter.',
    coreConcepts: [
      'Cache Avalanche: Massive number of keys expire at the exact same moment (e.g. batch jobs loading data with uniform 1-hour TTL), causing sudden massive DB spikes.',
      'Cache Crash Avalanche: The entire Redis cluster crashes or restarts cold, exposing the database to 100% of production traffic.',
      'Jitter Formula: TTL_actual = TTL_base + random(0, JitterMax). Disperses expiration across a broad time window.',
    ],
    deepContentMarkdown: `### The Disaster of the Cache Avalanche

A **Cache Avalanche** happens when a significant portion of the cache expires simultaneously:

#### Scenario 1: Identical TTL Expiration
* At midnight, a nightly cron job pre-heats Redis with 1,000,000 product catalog records.
* Every record is written with an identical TTL: \`TTL = 86400\` (24 hours).
* Exactly 24 hours later at midnight, **all 1,000,000 records expire at the exact same second**.
* Production traffic instantly falls through to the database, causing immediate connection pool exhaustion and crash.

#### Scenario 2: Cache Cluster Outage
* A network partition or power glitch reboots the Redis cluster.
* When Redis restarts, its memory is empty (cold).
* 100% of web traffic hits the database, which cannot absorb the unmitigated load and crashes.

---

### Mitigation: Adding Randomized TTL Jitter

Never use static, identical TTLs for batch-loaded data! Always inject randomized **Jitter**:

$$\\text{TTL}_{\\text{actual}} = \\text{TTL}_{\\text{base}} + \\text{UniformRandom}(0, \\text{Jitter}_{\\text{max}})$$

* If base TTL is 24 hours (86,400s), set $\\text{Jitter}_{\\text{max}} = 7,200\\text{s}$ (2 hours).
* Expirations are smoothly dispersed across a 2-hour window, transforming an acute 1-second spike into an imperceptible background trickle.

---

### Cold Cache Warming & Circuit Breakers
To survive total cache reboots:
1. **Pre-Warming:** Before pointing traffic to a restarted Redis cluster, execute a warm-up script that populates the top 20% most popular keys.
2. **Circuit Breakers (Resilience4j / Envoy):** If database latency exceeds 500ms during a cache outage, the circuit breaker opens, returning degraded fallback responses (e.g. cached static landing page) rather than crashing the database.`,
    equationsAndMath: [
      {
        name: 'Uniform Jitter Formulation',
        formula: '\\text{TTL} = T_{base} + \\text{rand}() \\times (T_{max} - T_{base})',
        explanation: 'Randomizes key lifespan across a continuous interval to prevent synchronized expiration waves.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Fixed TTL (Anti-Pattern)',
        pros: ['Deterministic expiration time'],
        cons: ['Severe risk of Cache Avalanche'],
        bestFor: 'Never use for high-volume datasets',
      },
      {
        option: 'Jittered TTL (Production Best Practice)',
        pros: ['Completely eliminates synchronized expiration waves', 'Zero performance overhead'],
        cons: ['Slightly non-deterministic cache lifetime'],
        bestFor: 'All production caching systems',
      },
    ],
    interviewKeypoints: [
      'State clearly in any interview: "To prevent a Cache Avalanche, I will add a 10-15% randomized jitter to all cache TTLs."',
    ],
  },

  {
    id: 'ch-27',
    unitId: 'unit-4',
    unitTitle: 'Caching Topologies, Algorithms & Resiliency',
    chapterNumber: 27,
    title: 'Distributed Cache Concurrency: Redis Redlock & Lua Scripts',
    readingTimeMin: 15,
    summary:
      'Atomic execution in single-threaded event loops: Running transactional Lua scripts in Redis, EVALSHA optimization, and multi-instance Redlock distributed mutual exclusion.',
    coreConcepts: [
      'Redis Event Loop: Single-threaded execution of commands guarantees atomicity for individual commands and Lua scripts.',
      'Lua Script Atomicity: A Lua script runs from start to finish without any intervening commands from other clients.',
      'EVALSHA Optimization: Pre-loads Lua script bytecode into Redis cache, reducing network overhead to a 40-character SHA1 hash.',
    ],
    deepContentMarkdown: `### The Power of Redis Lua Scripting

Redis executes commands in a **single-threaded event loop** (using \`epoll\` on Linux or \`kqueue\` on macOS). While background threads handle I/O, all key mutations execute sequentially on the main thread.

This provides a superpowers: **Any Lua script executed via \`EVAL\` runs atomically.**

---

### Why Check-Then-Set Fails Without Lua
Consider releasing a distributed lock:
\`\`\`python
# DANGEROUS: Race condition between GET and DEL
if redis.get("lock:order") == my_uuid:
    # A GC pause happens HERE! Lock expires. Another client acquires it!
    redis.delete("lock:order") # Disastrously deletes another client's lock!
\`\`\`

#### The Atomic Lua Solution:
\`\`\`lua
-- Atomically compare and delete
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
\`\`\`

Because this executes atomically on the Redis thread, **no race condition is possible**.

---

### EVALSHA Optimization in Production
Sending raw Lua code over the network on every request wastes bandwidth. Production clients use **EVALSHA**:
1. At application boot, the script is loaded via \`SCRIPT LOAD "lua code..."\`.
2. Redis returns the SHA1 hash (e.g. \`6b1a2f...\`).
3. Subsequent requests execute \`EVALSHA 6b1a2f... 1 key arg\`, transmitting only 40 bytes over the wire!`,
    equationsAndMath: [
      {
        name: 'EVALSHA Bandwidth Savings',
        formula: '\\text{Bandwidth Reduction} = \\frac{\\text{Raw Script Size (bytes)} - 40}{\\text{Raw Script Size (bytes)}} \\times 100',
        explanation: 'Transmitting a 40-byte SHA1 hash instead of a 2KB Lua script saves over 95% network bandwidth at high throughput.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Redis Lua Scripts',
        pros: ['Strict atomicity without distributed locks', 'Sub-millisecond execution in RAM'],
        cons: ['Long-running scripts block all other Redis commands (slow scripts trigger latency spikes)'],
        bestFor: 'Rate limiting, inventory decrements, atomic lock release',
      },
    ],
    interviewKeypoints: [
      'Use Redis Lua scripts whenever you need atomic read-modify-write operations (like decrementing stock or sliding window rate limiting).',
      'Remind interviewers that Lua scripts must be fast (< 5ms) to avoid stalling the single-threaded Redis event loop.',
    ],
  },

  {
    id: 'ch-28',
    unitId: 'unit-4',
    unitTitle: 'Caching Topologies, Algorithms & Resiliency',
    chapterNumber: 28,
    title: 'Client-Side & HTTP Caching: ETag & Stale-While-Revalidate',
    readingTimeMin: 14,
    summary:
      'Browser and CDN edge caching standards: Cache-Control directives (max-age, no-cache, no-store), Conditional HTTP requests (If-None-Match, ETag), and RFC 5861 Stale-While-Revalidate.',
    coreConcepts: [
      'Cache-Control Directives: no-store (never cache), no-cache (cache but must revalidate), max-age=N (cache for N seconds).',
      'ETag & Conditional Validation: Server returns hash of content in ETag header. Client sends If-None-Match on next request; server returns HTTP 304 Not Modified with zero body bytes if unchanged.',
      'Stale-While-Revalidate: Return stale cached content instantly to the user while asynchronously fetching fresh content in the background.',
    ],
    deepContentMarkdown: `### The HTTP Caching Architecture

The fastest network request is the request that **never leaves the user\'s device**. HTTP caching protocols dictate how browsers, mobile clients, and CDN edge proxies store and revalidate content.

---

### 1. The Core Cache-Control Directives
* \`Cache-Control: no-store\`
  * The response must **never be cached anywhere** (not on browser disk, not on CDN). Mandatory for financial balances and personal health records.
* \`Cache-Control: no-cache\`
  * The response **may be cached**, but the client **must revalidate with the origin server** via an ETag before using it.
* \`Cache-Control: public, max-age=31536000, immutable\`
  * Cached for 1 year by browsers and CDNs. \`immutable\` instructs the browser to never even send a conditional revalidation request on page refresh. Used for content-hashed static assets (\`bundle.a8f92b.js\`).

---

### 2. Validation with ETags and HTTP 304
When content is dynamic but changes infrequently:
1. Server computes MD5 hash of response: \`ETag: "68c1d792"\`.
2. Browser stores response and ETag.
3. On next request, browser sends:
   \`\`\`http
   GET /api/v1/profile HTTP/1.1
   If-None-Match: "68c1d792"
   \`\`\`
4. If content has not changed:
   * Server returns **HTTP 304 Not Modified** with **ZERO response body**!
   * Saves 99% of bandwidth and avoids JSON serialization.

---

### 3. Stale-While-Revalidate (RFC 5861)
\`\`\`http
Cache-Control: max-age=60, stale-while-revalidate=300
\`\`\`
* For the first 60 seconds: Response is fresh; served directly from cache.
* Between seconds 60 and 360:
  * The browser serves the **stale cached response immediately** to the user in **0ms**!
  * In the background, the browser fires an asynchronous network request to fetch the fresh version for future use.
* Delivers instant UI responsiveness while guaranteeing background freshness!`,
    equationsAndMath: [
      {
        name: 'HTTP 304 Bandwidth Savings',
        formula: '\\text{Bandwidth Savings} = \\frac{\\text{Payload Size} - \\text{Header Size}}{\\text{Payload Size}} \\times 100',
        explanation: 'Returning HTTP 304 eliminates payload transmission, reducing a 50KB JSON response down to a 300-byte header packet.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Stale-While-Revalidate',
        pros: ['Instant 0ms UI render for user', 'Smooth background refresh'],
        cons: ['User briefly observes data that may be up to 5 minutes stale'],
        bestFor: 'News homepages, social media feeds, profile avatars',
      },
    ],
    interviewKeypoints: [
      'Differentiate between no-cache (must revalidate with server) and no-store (never save to disk).',
      'Explain how content-hashed assets (bundle.hash.js) paired with immutable headers achieve maximum caching performance.',
    ],
  },
]
