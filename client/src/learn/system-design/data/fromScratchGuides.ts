import type { FromScratchGuide } from '../types'

export const FROM_SCRATCH_GUIDES: Record<string, FromScratchGuide> = {
  tinyurl: {
    problemStatement:
      'Design a globally distributed URL shortening service (like TinyURL or Bitly) capable of generating compact 7-character aliases, handling 50,000+ redirect queries per second with sub-10ms latency, and storing billions of records for 5+ years.',
    naiveApproach: {
      description:
        'A single relational database (e.g. PostgreSQL) table with an auto-incrementing ID. When a user sends a long URL, run `INSERT INTO urls (long_url) VALUES (...)` and convert the serial `id` to Base62. When reading, execute `SELECT long_url FROM urls WHERE short_code = $1`.',
      whyItBreaks: [
        'Single point of write failure: Auto-increment primary key requires global sequential locking, capping writes at ~1,000 req/sec.',
        'Predictable URLs: Sequential IDs (e.g., /1, /2, /3) allow attackers to easily scrape and enumerate all private shortened links.',
        'Database read saturation: At 50,000 reads/sec, disk I/O and connection pool exhaustion crash the database within seconds.',
        'Global latency: Users across Asia, Europe, and America must route back to a single primary database datacenter, exceeding 250ms roundtrip latency.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Base62 Bijective Alphabet',
        purpose: 'Encodes 64-bit integer tokens into 7 compact alphanumeric characters ([0-9, a-z, A-Z]).',
        timeComplexity: 'O(1) encode / decode',
        spaceComplexity: 'O(1) memory',
        asciiDiagram: '62^7 = 3,521,614,606,208 (3.5 Trillion unique combinations)',
      },
      {
        name: 'Pre-Allocated Key Ring Buffer (KGS)',
        purpose: 'Dispenses pre-generated, cryptographically shuffled Base62 tokens in memory blocks without distributed locking.',
        timeComplexity: 'O(1) pop',
        spaceComplexity: 'O(B) where B is block size (e.g., 10,000 keys)',
      },
      {
        name: 'LRU Cache (Redis Cluster)',
        purpose: 'Keeps hot 20% of shortened URLs in memory using Doubly Linked List + Hash Map.',
        timeComplexity: 'O(1) get / set',
        spaceComplexity: 'O(N) keys in RAM (~16 GB for 33M hot URLs)',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: The Base62 Encoding Engine',
        subtitle: 'Converting large numeric IDs into short URL slugs',
        concept:
          'Base62 uses characters [0-9, a-z, A-Z] to maximize information density in URLs without needing URL-encoding escaping. 7 characters yield 62^7 ≈ 3.52 trillion combinations.',
        language: 'go',
        fileName: 'base62.go',
        codeSnippet: `package main

import (
	"errors"
	"strings"
)

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
const base = uint64(len(alphabet))

// Encode converts a 64-bit unsigned integer into a Base62 string.
func Encode(num uint64) string {
	if num == 0 {
		return string(alphabet[0])
	}
	var sb strings.Builder
	for num > 0 {
		rem := num % base
		sb.WriteByte(alphabet[rem])
		num = num / base
	}
	// Reverse the bytes so most significant digits come first
	runes := []byte(sb.String())
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	return string(runes)
}

// Decode converts a Base62 string back to a 64-bit integer.
func Decode(token string) (uint64, error) {
	var num uint64
	for i := 0; i < len(token); i++ {
		idx := strings.IndexByte(alphabet, token[i])
		if idx == -1 {
			return 0, errors.New("invalid character in token")
		}
		num = num*base + uint64(idx)
	}
	return num, nil
}`,
        explanation:
          'The function divides by 62 repeatedly, mapping remainders to the character set. For any unique integer, it deterministically outputs a short alphanumeric string.',
        keyTakeaway: 'Avoid MD5/SHA256 hashing for short URLs because truncating a hash leads to hash collisions that require expensive DB retry loops.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Key Generation Service (KGS)',
        subtitle: 'Pre-generating tokens to eliminate write-time collision checks',
        concept:
          'Instead of computing keys on the fly when users click "Shorten", a background service pre-generates billions of random Base62 keys in advance and stores them in DB. Application servers fetch batches (e.g. 10,000 keys) into memory.',
        language: 'go',
        fileName: 'kgs_pool.go',
        codeSnippet: `package main

import (
	"sync"
)

type TokenPool struct {
	mu     sync.Mutex
	tokens []string
	batchSize int
}

func NewTokenPool(batchSize int) *TokenPool {
	return &TokenPool{
		tokens: make([]string, 0, batchSize),
		batchSize: batchSize,
	}
}

// GetToken returns an unused token in O(1) time without DB coordination.
func (p *TokenPool) GetToken() (string, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if len(p.tokens) == 0 {
		return "", false // Triggers async refill from KGS database
	}

	token := p.tokens[len(p.tokens)-1]
	p.tokens = p.tokens[:len(p.tokens)-1]
	return token, true
}`,
        explanation:
          'Even if an application server crashes, the only loss is the unassigned tokens in its local batch, which is completely acceptable since 3.5 trillion keys are available.',
        keyTakeaway: 'Batch allocation decouples write performance from database locks. Write latency drops from 40ms to under 2ms.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Cache-Aside Redirect Pipeline',
        subtitle: 'Sub-millisecond reads with Redis and HTTP 302 vs 301',
        concept:
          'Read traffic is 50x heavier than write traffic. 80% of reads hit 20% of URLs. Redis stores `url:{shortCode}` with a 7-day sliding TTL. We return HTTP 302 (Found) instead of 301 (Moved Permanently) so all redirects pass through our servers for click telemetry.',
        language: 'go',
        fileName: 'redirect_handler.go',
        codeSnippet: `package main

import (
	"context"
	"net/http"
	"time"
	"github.com/go-redis/redis/v8"
)

func (svc *Server) HandleRedirect(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Path[len("/s/"):]
	ctx, cancel := context.WithTimeout(r.Context(), 50*time.Millisecond)
	defer cancel()

	// 1. Check Redis Cache
	cacheKey := "url:" + code
	longURL, err := svc.redisClient.Get(ctx, cacheKey).Result()
	if err == nil {
		svc.asyncClickLogger(code, r)
		http.Redirect(w, r, longURL, http.StatusFound) // HTTP 302
		return
	}

	// 2. Fallback to Primary DB on Cache Miss
	longURL, err = svc.queryDatabase(ctx, code)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	// 3. Write back to Redis with 7-day TTL
	_ = svc.redisClient.Set(ctx, cacheKey, longURL, 7*24*time.Hour)
	svc.asyncClickLogger(code, r)
	http.Redirect(w, r, longURL, http.StatusFound)
}`,
        explanation:
          'Cache miss triggers a fast single-row indexed DB query, populates Redis, and completes the redirect. Context timeouts ensure slow DB queries never hang client connections.',
        keyTakeaway: 'Never block the redirect response on analytics logging. Fire an asynchronous message to Kafka instead.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: Asynchronous Telemetry with Kafka',
        subtitle: 'Decoupling redirect latency from heavy analytics processing',
        concept:
          'Click analytics (geographic location, referrers, device types) require high write throughput. Writing directly to a relational DB would overwhelm it. We stream events into an Apache Kafka topic partitioned by shortCode hash.',
        language: 'go',
        fileName: 'telemetry_producer.go',
        codeSnippet: `package main

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
	"github.com/segmentio/kafka-go"
)

type ClickEvent struct {
	ShortCode string    \`json:"short_code"\`
	Timestamp time.Time \`json:"timestamp"\`
	IPAddress string    \`json:"ip"\`
	UserAgent string    \`json:"user_agent"\`
	Referrer  string    \`json:"referrer"\`
}

func (svc *Server) asyncClickLogger(code string, r *http.Request) {
	event := ClickEvent{
		ShortCode: code,
		Timestamp: time.Now().UTC(),
		IPAddress: r.RemoteAddr,
		UserAgent: r.UserAgent(),
		Referrer:  r.Referer(),
	}

	go func() {
		payload, _ := json.Marshal(event)
		_ = svc.kafkaWriter.WriteMessages(context.Background(), kafka.Message{
			Key:   []byte(code),
			Value: payload,
		})
	}()
}`,
        explanation:
          'Kafka consumers read the stream in batches and write aggregated hourly/daily counters into ClickHouse or PostgreSQL without impacting URL redirect times.',
        keyTakeaway: 'Fire-and-forget message streaming guarantees p99 redirect latency stays under 10ms regardless of analytics cluster health.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: Database Partitioning & Sharding',
        subtitle: 'Horizontal scale across 15+ Terabytes of storage',
        concept:
          '6 billion URLs over 5 years exceed a single database node capacity. We shard the database across 16 PostgreSQL shards using consistent hashing on the shortCode.',
        language: 'sql',
        fileName: 'schema.sql',
        codeSnippet: `-- Shard Schema for short_urls
CREATE TABLE short_urls (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(16) NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    click_count BIGINT DEFAULT 0
);

-- Unique B-Tree index for O(log N) lookups
CREATE UNIQUE INDEX idx_short_urls_code ON short_urls (short_code);
CREATE INDEX idx_short_urls_expires ON short_urls (expires_at);`,
        explanation:
          'The short_code index provides instantaneous lookup. An offline batch cron job queries `expires_at < NOW()` during off-peak hours to reclaim expired slugs.',
        keyTakeaway: 'Always shard by short_code hash rather than user_id so redirects only query a single deterministic shard without scatter-gather overhead.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Thundering Herd on Viral Tweet Link',
        impact: 'A celebrity tweets a short URL with 10M followers. Cache miss causes 50,000 simultaneous queries to hit PostgreSQL simultaneously.',
        mitigationCodeOrStrategy:
          'Implement Mutex Locking / Singleflight in the application server: only 1 goroutine executes the database query while the other 49,999 wait on the in-flight channel.',
      },
      {
        incident: 'KGS Server Outage / Network Partition',
        impact: 'Application servers cannot reach the Key Generation Service to fetch new token batches, blocking new URL creation.',
        mitigationCodeOrStrategy:
          'Local fallback: Every application node maintains a standby local MurmurHash3 fallback generator that prepends a node-specific machine ID byte.',
      },
    ],
    faangInterviewTips: [
      'Always clarify: HTTP 301 vs HTTP 302. Explain that 301 caches in the browser and bypasses analytics, while 302 always hits our gateway for tracking.',
      'Explain why MD5 truncation fails: First 7 chars of MD5 have high collision probability, requiring expensive DB duplicate retry checks.',
      'Highlight KGS batch pre-generation: It shifts random number generation and DB uniqueness checks completely out of the critical write path.',
    ],
  },

  'distributed-cache': {
    problemStatement:
      'Build a distributed in-memory key-value cache (like Redis Cluster or Memcached) providing sub-millisecond p99 GET/SET operations, master-replica replication, dynamic node failover, and automatic key sharding across 16,384 hash slots.',
    naiveApproach: {
      description:
        'A single Node.js or Python process with an in-memory dictionary `Map<string, string>`. Clients connect over TCP and send keys and values.',
      whyItBreaks: [
        'Single node memory limit: RAM is bounded by hardware (e.g. 64GB). Cannot store datasets exceeding a single box.',
        'Single CPU thread bottleneck: Epoll loop eventually saturates at ~100k QPS on a single core.',
        'Data loss on crash: Without replication or Write-Ahead Log (WAL), a process restart wipes 100% of cached data.',
        'No automatic failover: If the server dies, all downstream microservices face catastrophic cache stampedes.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Hash Slot Space (16,384 Slots)',
        purpose: 'Deterministic CRC16 partition space mapped across master nodes.',
        timeComplexity: 'O(1) slot calculation',
        spaceComplexity: '2 KB memory per node',
        asciiDiagram: 'Slot = CRC16(key) mod 16384 -> Node A (0-5460), Node B (5461-10922), Node C (10923-16383)',
      },
      {
        name: 'LRU Eviction (Doubly Linked List + Dict)',
        purpose: 'Evicts least recently used keys in constant time when max memory is reached.',
        timeComplexity: 'O(1) eviction & touch',
        spaceComplexity: '24 bytes per node pointer overhead',
      },
      {
        name: 'Gossip Cluster Protocol',
        purpose: 'Node heartbeats (MEET, PING, PONG) over cluster bus port to detect failure and elect replicas.',
        timeComplexity: 'O(1) per heartbeat packet',
        spaceComplexity: 'O(N) node state matrix',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: O(1) LRU Cache Memory Store',
        subtitle: 'Doubly Linked List paired with a Hash Map',
        concept:
          'When memory is exhausted, the cache must evict the least recently used element. A doubly linked list maintains access order, while a hash map maps keys to list nodes for O(1) lookups.',
        language: 'go',
        fileName: 'lru_cache.go',
        codeSnippet: `package main

import "sync"

type Node struct {
	key   string
	val   []byte
	prev  *Node
	next  *Node
}

type LRUCache struct {
	mu       sync.Mutex
	capacity int
	items    map[string]*Node
	head     *Node // Most Recently Used
	tail     *Node // Least Recently Used
}

func NewLRUCache(cap int) *LRUCache {
	head := &Node{}
	tail := &Node{}
	head.next = tail
	tail.prev = head
	return &LRUCache{
		capacity: cap,
		items:    make(map[string]*Node),
		head:     head,
		tail:     tail,
	}
}

func (c *LRUCache) Get(key string) ([]byte, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	node, exists := c.items[key]
	if !exists {
		return nil, false
	}
	c.moveToHead(node)
	return node.val, true
}

func (c *LRUCache) Set(key string, val []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if node, exists := c.items[key]; exists {
		node.val = val
		c.moveToHead(node)
		return
	}

	newNode := &Node{key: key, val: val}
	c.items[key] = newNode
	c.addNode(newNode)

	if len(c.items) > c.capacity {
		// Evict least recently used node
		lru := c.popTail()
		delete(c.items, lru.key)
	}
}

func (c *LRUCache) addNode(n *Node) {
	n.prev = c.head
	n.next = c.head.next
	c.head.next.prev = n
	c.head.next = n
}

func (c *LRUCache) removeNode(n *Node) {
	n.prev.next = n.next
	n.next.prev = n.prev
}

func (c *LRUCache) moveToHead(n *Node) {
	c.removeNode(n)
	c.addNode(n)
}

func (c *LRUCache) popTail() *Node {
	res := c.tail.prev
	c.removeNode(res)
	return res
}`,
        explanation:
          'Get and Set operations take constant time O(1). The pointer updates are lock-protected for thread safety.',
        keyTakeaway: 'Production caches like Redis use approximate LRU (sampling random keys) to avoid the pointer overhead of full linked lists.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: CRC16 Hash Slot Sharding',
        subtitle: 'Distributing keys across 16,384 virtual slots',
        concept:
          'Redis Cluster divides the entire key universe into 16,384 slots. Keys with hash tags `{user:123}.profile` only hash the contents inside `{}` so related keys land on the same master node for multi-key transactions.',
        language: 'go',
        fileName: 'hash_slot.go',
        codeSnippet: `package main

// CRC16 XMODEM lookup table for ultra-fast slot computation
var crc16tab = [256]uint16{
	0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
	0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
}

func ComputeSlot(key string) uint16 {
	// Check for hash tags {tag}
	s := key
	start := -1
	end := -1
	for i := 0; i < len(key); i++ {
		if key[i] == '{' && start == -1 {
			start = i
		} else if key[i] == '}' && start != -1 {
			end = i
			break
		}
	}
	if start != -1 && end != -1 && end > start+1 {
		s = key[start+1 : end]
	}

	var crc uint16 = 0
	for i := 0; i < len(s); i++ {
		crc = ((crc << 8) & 0xff00) ^ crc16tab[byte(crc>>8)^s[i]]
	}
	return crc % 16384
}`,
        explanation:
          'CRC16 distributes keys uniformly across slots. Masters manage ranges of slots (e.g. Master 1 handles 0-5460).',
        keyTakeaway: 'Hash tags ensure atomic multi-key Lua scripts execute on a single node without distributed locking.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: MOVED Redirection & Client Routing',
        subtitle: 'Decentralized topology routing without intermediary proxy bottlenecks',
        concept:
          'Clients connect directly to any cluster node. If the node does not own the requested slot, it responds with `-MOVED <slot> <target_ip:port>`. The client updates its internal slot table and retries directly.',
        language: 'go',
        fileName: 'cluster_router.go',
        codeSnippet: `package main

import (
	"fmt"
	"strings"
)

type ClusterRouter struct {
	slots [16384]string // slot -> node address
}

func (r *ClusterRouter) ExecuteCommand(key string, cmd string) (string, error) {
	slot := ComputeSlot(key)
	targetNode := r.slots[slot]

	resp, err := sendTCP(targetNode, fmt.Sprintf("%s %s", cmd, key))
	if err != nil {
		return "", err
	}

	// Handle MOVED redirection
	if strings.HasPrefix(resp, "-MOVED") {
		parts := strings.Split(resp, " ")
		newAddr := parts[2]
		// Cache updated slot owner locally
		r.slots[slot] = newAddr
		return sendTCP(newAddr, fmt.Sprintf("%s %s", cmd, key))
	}

	return resp, nil
}

func sendTCP(addr, cmd string) (string, error) {
	return "+OK", nil
}`,
        explanation:
          'Smart clients cache the 16,384 slot mappings in memory, routing 99.9% of queries directly to the correct master in a single network hop.',
        keyTakeaway: 'Eliminating the centralized load balancer cuts p99 cache latency from 3ms down to 0.4ms.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: Asynchronous Replication & Failover',
        subtitle: 'Gossip protocol and Sentinel automatic leader election',
        concept:
          'Every master has 1 or more read replicas. Masters replicate write commands asynchronously via a replication backlog buffer. If a master misses 5 consecutive gossip pings, replicas initiate an election using Raft-like epoch voting.',
        language: 'go',
        fileName: 'failover_election.go',
        codeSnippet: `package main

type ReplicaNode struct {
	id          string
	masterId    string
	currentEpoch uint64
	offset      int64
}

// RequestVote asks surviving master nodes for leader authorization
func (rn *ReplicaNode) RequestVote(masters []string) bool {
	votes := 0
	required := (len(masters) / 2) + 1

	for _, m := range masters {
		granted := sendVoteRequest(m, rn.id, rn.currentEpoch, rn.offset)
		if granted {
			votes++
		}
	}
	return votes >= required
}

func sendVoteRequest(masterAddr, candidateId string, epoch uint64, offset int64) bool {
	return true
}`,
        explanation:
          'The replica with the highest replication offset (most up-to-date data) wins the election and takes over the slot ranges of the dead master.',
        keyTakeaway: 'Because Redis replication is asynchronous, failover can lose a few milliseconds of recent writes (trade-off favoring high throughput over strict CP consistency).',
      },
      {
        stepNumber: 5,
        title: 'Step 5: Cache Invalidation Strategies',
        subtitle: 'Preventing stale data, cache stampedes, and dogpiling',
        concept:
          'Cache-Aside requires explicit invalidation on updates. To prevent the "Dogpiling / Thundering Herd" effect when a popular key expires, we use probabilistic early expiration (XFetch algorithm).',
        language: 'typescript',
        fileName: 'xfetch.ts',
        codeSnippet: `// Probabilistic Early Expiration (Optimal XFetch Algorithm)
interface CacheEntry {
  val: string
  delta: number // compute time in seconds
  expiry: number // unix epoch timestamp in seconds
}

export function shouldRecompute(entry: CacheEntry, beta = 1.0): boolean {
  const now = Date.now() / 1000
  // Formula: now - (delta * beta * ln(rand())) > expiry
  const rand = Math.random()
  const earlyCheck = now - entry.delta * beta * Math.log(rand)
  return earlyCheck > entry.expiry
}`,
        explanation:
          'As the key nears expiration, requests probabilistically trigger background recomputation before the key actually expires, guaranteeing zero cache miss spikes.',
        keyTakeaway: 'Probabilistic early expiration completely prevents 10,000 threads from simultaneously querying the database when a hot key expires.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Split-Brain During Network Partition',
        impact: 'A master is partitioned from the majority. Replicas elect a new master, while clients on the minority partition continue writing to the old master.',
        mitigationCodeOrStrategy:
          'Configure `min-replicas-to-write 1` and `min-replicas-max-lag 10`. The isolated master automatically rejects writes if it cannot contact at least 1 healthy replica.',
      },
      {
        incident: 'Hot Key CPU Saturation',
        impact: 'A single key (e.g. flash sale banner) receives 200,000 QPS, pinning one master core to 100% CPU while other nodes idle.',
        mitigationCodeOrStrategy:
          'Key Salting: Split the hot key into N keys `banner#1`, `banner#2` ... `banner#16` across different hash slots and have clients read random salts.',
      },
    ],
    faangInterviewTips: [
      'Know the difference between Redis and Memcached: Redis supports data structures, persistence (RDB/AOF), and native clustering; Memcached is pure multithreaded key-value.',
      'Explain CRC16 and Hash Slots: Why 16,384? Because gossip ping packets carry the slot bitmap (2KB). 65,536 would bloat heartbeat overhead to 8KB.',
      'Always discuss Eviction Policies: volatile-lru vs allkeys-lru vs noeviction. Explain why allkeys-lru is standard for caching layers.',
    ],
  },

  'kafka-broker': {
    problemStatement:
      'Design a distributed, horizontally scalable, durable event streaming platform (like Apache Kafka) capable of processing millions of messages per second with zero-copy disk I/O, partition-level ordered delivery, and exactly-once processing semantics.',
    naiveApproach: {
      description:
        'A RabbitMQ or ActiveMQ-style message broker storing messages in a relational database or memory queue. Messages are deleted immediately upon consumer acknowledgment.',
      whyItBreaks: [
        'Queue deletion locks: Random delete disk I/O degrades throughput to ~5,000 messages/sec.',
        'No replayability: Once a consumer acks a message, other downstream services (e.g., fraud analysis, audit) cannot replay historical data.',
        'Consumer speed coupling: Slow consumers cause broker memory bloat and backpressure that stalls fast producers.',
        'Context switching overhead: High-rate disk read/write system calls across kernel and user space saturate CPU.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Append-Only Commit Log',
        purpose: 'Sequential disk write buffer where new records are appended to the tail of segment files.',
        timeComplexity: 'O(1) append & sequential read',
        spaceComplexity: 'Sequential disk space (rotates at 1GB segments)',
        asciiDiagram: 'Partition Log: [Offset 0] -> [Offset 1] -> [Offset 2] ... -> [Offset N (Tail)]',
      },
      {
        name: 'Memory-Mapped Sparse Index (.index)',
        purpose: 'Maps message logical offsets to exact physical byte positions on disk.',
        timeComplexity: 'O(log M) binary search in OS page cache',
        spaceComplexity: '4 bytes per indexed entry (sampled every 4KB)',
      },
      {
        name: 'Consumer Offset Tracker (__consumer_offsets)',
        purpose: 'Internal compacted Kafka topic tracking each consumer group\'s last processed partition offset.',
        timeComplexity: 'O(1) commit & lookup',
        spaceComplexity: 'O(C * P) consumers x partitions',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Sequential Append-Only Commit Log',
        subtitle: 'Unlocking raw disk speeds faster than random RAM access',
        concept:
          'Sequential disk writes hit over 600 MB/sec on modern NVMe drives, avoiding the random seek overhead of B-Trees. Messages are immutable and assigned a monotonically increasing 64-bit offset.',
        language: 'go',
        fileName: 'commit_log.go',
        codeSnippet: `package main

import (
	"encoding/binary"
	"os"
	"sync"
)

type CommitLog struct {
	mu     sync.Mutex
	file   *os.File
	offset uint64
}

func OpenCommitLog(path string) (*CommitLog, error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}
	return &CommitLog{file: f, offset: 0}, nil
}

// Append writes record with format: [Size 4B][Offset 8B][Payload]
func (cl *CommitLog) Append(data []byte) (uint64, error) {
	cl.mu.Lock()
	defer cl.mu.Unlock()

	curOffset := cl.offset
	size := uint32(len(data))

	buf := make([]byte, 4+8)
	binary.BigEndian.PutUint32(buf[0:4], size)
	binary.BigEndian.PutUint64(buf[4:12], curOffset)

	if _, err := cl.file.Write(buf); err != nil {
		return 0, err
	}
	if _, err := cl.file.Write(data); err != nil {
		return 0, err
	}

	cl.offset++
	return curOffset, nil
}`,
        explanation:
          'Every record is framed with its length and offset. Disk writes are buffered directly in the operating system page cache.',
        keyTakeaway: 'Sequential disk I/O eliminates disk seek latency, allowing a single broker partition to saturate network cards.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Zero-Copy Network Transfer (sendfile syscall)',
        subtitle: 'Bypassing user space to stream directly from page cache to NIC',
        concept:
          'Traditional file transfer copies data 4 times (Disk -> OS Cache -> User Buffer -> Socket Buffer -> NIC). Kafka uses the `sendfile()` system call, allowing DMA to copy data directly from the OS page cache to the network card buffer.',
        language: 'go',
        fileName: 'zero_copy_fetch.go',
        codeSnippet: `package main

import (
	"net"
	"os"
	"syscall"
)

// ZeroCopyStream streams bytes from log file directly to TCP socket
func ZeroCopyStream(logFile *os.File, conn net.Conn, offset int64, length int64) (int64, error) {
	tcpConn, ok := conn.(*net.TCPConn)
	if !ok {
		return 0, syscall.EINVAL
	}

	rawConn, err := tcpConn.SyscallConn()
	if err != nil {
		return 0, err
	}

	var written int64
	var sysErr error

	err = rawConn.Control(func(fd uintptr) {
		// Linux sendfile(out_fd, in_fd, offset, count)
		// Transfers directly in kernel space without copying to user-space RAM
		written, sysErr = syscall.Sendfile(int(fd), int(logFile.Fd()), &offset, int(length))
	})

	if err != nil {
		return 0, err
	}
	return written, sysErr
}`,
        explanation:
          'Zero-copy eliminates CPU memory bus overhead and context switching, allowing consumers to read at line-rate network speeds (10 Gbps+).',
        keyTakeaway: 'Zero-copy ensures that multiple consumers reading the same topic do not duplicate memory in user space.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: In-Sync Replicas (ISR) & Quorum Ack',
        subtitle: 'High durability without sacrificing write latency',
        concept:
          'Each partition has 1 Leader broker and N-1 Follower replicas. Followers fetch logs from the leader. The leader maintains an In-Sync Replica (ISR) set. With `acks=all`, the leader responds only after all ISR nodes write to their logs.',
        language: 'go',
        fileName: 'isr_manager.go',
        codeSnippet: `package main

import "sync"

type PartitionLeader struct {
	mu          sync.RWMutex
	hw          int64           // High Watermark (safely committed offset)
	leo         int64           // Log End Offset
	isrNodes    map[string]int64 // brokerId -> follower offset
}

func (pl *PartitionLeader) UpdateFollowerOffset(brokerId string, offset int64) {
	pl.mu.Lock()
	defer pl.mu.Unlock()

	pl.isrNodes[brokerId] = offset

	// Compute new High Watermark: lowest offset across all ISR replicas
	minOffset := pl.leo
	for _, fOffset := range pl.isrNodes {
		if fOffset < minOffset {
			minOffset = fOffset
		}
	}

	if minOffset > pl.hw {
		pl.hw = minOffset // Consumers are now allowed to read up to this point
	}
}`,
        explanation:
          'The High Watermark (HW) acts as the barrier: consumers only read committed messages that all ISR nodes have written, preventing dirty reads.',
        keyTakeaway: 'If an ISR node falls behind due to network lag, it is dropped from the ISR set so slow followers never block producers.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: Consumer Groups & Dynamic Rebalancing',
        subtitle: 'Scaling out consumer parallel processing',
        concept:
          'A Consumer Group distributes partition reads among its instances. If there are 4 partitions and 2 consumers, each consumer processes 2 partitions. If a consumer dies, the group coordinator rebalances partitions to surviving nodes.',
        language: 'go',
        fileName: 'group_coordinator.go',
        codeSnippet: `package main

import "sort"

// AssignPartitions implements the RangeAssignor protocol
func AssignPartitions(consumers []string, partitions []int) map[string][]int {
	sort.Strings(consumers)
	sort.Ints(partitions)

	assignment := make(map[string][]int)
	numConsumers := len(consumers)
	if numConsumers == 0 {
		return assignment
	}

	for i, part := range partitions {
		consumer := consumers[i % numConsumers]
		assignment[consumer] = append(assignment[consumer], part)
	}
	return assignment
}`,
        explanation:
          'Heartbeats sent every 3 seconds keep the consumer alive. When a heartbeat times out, the Group Coordinator revokes partition assignments and triggers a rebalance.',
        keyTakeaway: 'The number of active consumers in a group cannot exceed the number of partitions. Excess consumers remain idle.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: Exactly-Once Processing (Idempotent Producer)',
        subtitle: 'Eliminating duplicate messages during network retries',
        concept:
          'When an ack packet drops over the network, producers retry, causing duplicate writes. Kafka solves this by assigning each producer a Producer ID (PID) and incrementing sequence numbers per partition.',
        language: 'go',
        fileName: 'idempotent_dedup.go',
        codeSnippet: `package main

import "errors"

type PartitionDeduplicator struct {
	lastSequence map[int64]uint32 // PID -> last seen sequence number
}

func (d *PartitionDeduplicator) VerifyAndAccept(pid int64, seq uint32) error {
	last, exists := d.lastSequence[pid]
	if !exists {
		d.lastSequence[pid] = seq
		return nil
	}

	if seq == last+1 {
		d.lastSequence[pid] = seq
		return nil // Success: Expected next message
	} else if seq <= last {
		return errors.New("duplicate message: already committed")
	} else {
		return errors.New("out of order sequence: messages lost")
	}
}`,
        explanation:
          'The broker silently ignores duplicate sequence numbers while returning an OK acknowledgment to the producer, guaranteeing exactly-once writes.',
        keyTakeaway: 'Idempotency paired with Kafka Transactions enables true end-to-end Exactly-Once Semantics (EOS).',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Broker Disk Full (100% Storage)',
        impact: 'A busy topic exhausts hard disk space, crashing the broker and corrupting the active segment index.',
        mitigationCodeOrStrategy:
          'Configure retention policies (`log.retention.hours=48` and `log.retention.bytes=50GB`). Segment cleaner runs in background to roll and truncate segments.',
      },
      {
        incident: 'Consumer Stop-the-World GC Causing Rebalance Storms',
        impact: 'Java JVM Garbage Collection pause exceeding `max.poll.interval.ms` triggers endless consumer group rebalances.',
        mitigationCodeOrStrategy:
          'Separate the heartbeat thread from the poll worker thread (Kafka 0.10.1+), and increase `max.poll.interval.ms` to 300,000ms.',
      },
    ],
    faangInterviewTips: [
      'Explain why Kafka is fast: (1) Sequential disk I/O, (2) OS Page Cache utilization, (3) Zero-copy sendfile, (4) Batching over the wire.',
      'Explain ISR and High Watermark: Differentiate LEO (Log End Offset) from HW (High Watermark).',
      'Describe partitioning tradeoffs: More partitions = higher concurrency, but also more open file handles and longer election times during broker crash.',
    ],
  },

  'uber-dispatch': {
    problemStatement:
      'Design a real-time geospatial ride dispatch engine (like Uber or Lyft) capable of tracking 1,000,000+ concurrent active drivers sending GPS pings every 4 seconds, matching riders within 1 second, and performing proximity searches with dynamic surge pricing.',
    naiveApproach: {
      description:
        'Store driver locations in a relational database with `latitude` and `longitude` float columns. On every ride request, run `SELECT driver_id FROM drivers WHERE (lat - $1)^2 + (lon - $2)^2 < radius^2 ORDER BY distance LIMIT 10`.',
      whyItBreaks: [
        'Geodetic bounding box CPU bottleneck: Full table scans on 1,000,000 rows at 250,000 GPS pings/sec causes 100% CPU lockup.',
        'QuadTree / R-Tree dynamic rebalance lock contention: Traditional R-Trees require global locks when moving points, choking on 250k location updates/sec.',
        'Earth curvature distortion: Naive Cartesian formulas fail completely near poles or international date lines.',
        'Driver ping write amplification: 250k pings/sec means 250k writes/sec to disk, destroying database IOPS.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Uber H3 Hexagonal Spatial Index',
        purpose: 'Partitions the globe into a discrete hierarchical hexagonal grid (Resolution 8 ≈ 460m radius).',
        timeComplexity: 'O(1) coordinate to H3 index, O(1) k-Ring neighbor lookup',
        spaceComplexity: '64-bit uint64 per cell identifier',
        asciiDiagram: 'Hexagon cell: 6 equidistant neighbors (unlike squares which have diagonal distortion).',
      },
      {
        name: 'Redis In-Memory Spatial Inverted Index',
        purpose: 'Maps H3 Hex Cell Index -> Set of active driver IDs with expiration TTL.',
        timeComplexity: 'O(1) add/remove/read driver',
        spaceComplexity: 'O(D) where D is active drivers (~50 MB RAM for 1M drivers)',
      },
      {
        name: 'Persistent WebSocket Connection Gateway',
        purpose: 'Maintains duplex TCP connections with mobile driver apps to ingest telemetry without HTTP handshake overhead.',
        timeComplexity: 'O(1) epoll event dispatch',
        spaceComplexity: '10 KB per socket in memory',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Uber H3 Hexagonal Indexing',
        subtitle: 'Why hexagons beat squares and lat/lon coordinate math',
        concept:
          'Hexagons have only 1 distance between the center and all 6 neighbor centers (unlike squares where diagonals are sqrt(2) longer). This makes radial proximity searches mathematically uniform.',
        language: 'go',
        fileName: 'h3_geo.go',
        codeSnippet: `package main

import (
	"fmt"
	"github.com/uber/h3-go/v3"
)

type LocationTracker struct {
	resolution int // Res 8 = ~460m edge length
}

func NewLocationTracker() *LocationTracker {
	return &LocationTracker{resolution: 8}
}

// LatLonToH3 converts GPS coordinates to a 64-bit integer H3 cell ID.
func (lt *LocationTracker) LatLonToH3(lat, lon float64) h3.Index {
	coord := h3.GeoCoord{Latitude: lat, Longitude: lon}
	return h3.FromGeo(coord, lt.resolution)
}

// GetNeighborCells returns the target cell plus all concentric hex rings within radius K.
func (lt *LocationTracker) GetNeighborCells(origin h3.Index, kRing int) []h3.Index {
	// k-Ring 1 = 7 cells (center + 6 neighbors)
	// k-Ring 2 = 19 cells
	return h3.KRing(origin, kRing)
}`,
        explanation:
          'Instead of calculating trigonometry formulas (Haversine) on every ping, the server converts latitude/longitude to a 64-bit integer once, reducing spatial lookups to simple hash table lookups.',
        keyTakeaway: 'Discrete global grid systems turn expensive trigonometric geometric queries into constant-time integer set operations.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Epoll WebSocket Ingestion Gateway',
        subtitle: 'Handling 250,000 pings/sec with minimal connection overhead',
        concept:
          '1,000,000 drivers sending pings every 4 seconds generates 250,000 updates/second. Mobile devices maintain persistent TLS WebSockets with a stateless gateway fleet.',
        language: 'go',
        fileName: 'driver_gateway.go',
        codeSnippet: `package main

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
	"github.com/gorilla/websocket"
)

type PingPayload struct {
	DriverID string  \`json:"driver_id"\`
	Lat      float64 \`json:"lat"\`
	Lon      float64 \`json:"lon"\`
	Heading  float64 \`json:"heading"\`
	Status   string  \`json:"status"\` // AVAILABLE, IN_TRANSIT, OFFLINE
}

func (gw *Gateway) HandleDriverSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := gw.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var ping PingPayload
		if err := json.Unmarshal(msg, &ping); err != nil {
			continue
		}

		if ping.Status == "AVAILABLE" {
			h3Index := gw.h3.LatLonToH3(ping.Lat, ping.Lon)
			gw.asyncUpdateDriverLocation(ping.DriverID, h3Index)
		}
	}
}`,
        explanation:
          'The gateway validates the driver session and passes the updated H3 cell directly to the in-memory spatial cache over internal UDP/gRPC channels.',
        keyTakeaway: 'Persistent WebSockets eliminate the 3-way TCP handshake and TLS renegotiation on every 4-second GPS ping.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: In-Memory Spatial Inverted Index in Redis',
        subtitle: 'Updating and reading driver positions in sub-millisecond time',
        concept:
          'Redis stores sets keyed by H3 Cell: `geo:hex:{cell_id}` containing member driver IDs. When a driver moves into a new cell, they are removed from the previous cell and added to the new one with an auto-expiring TTL.',
        language: 'go',
        fileName: 'redis_spatial.go',
        codeSnippet: `package main

import (
	"context"
	"fmt"
	"time"
	"github.com/go-redis/redis/v8"
)

type SpatialStore struct {
	rdb *redis.Client
}

func (s *SpatialStore) UpdateDriverCell(ctx context.Context, driverId string, oldCell, newCell uint64) error {
	pipe := s.rdb.Pipeline()

	// 1. Remove from old cell
	if oldCell != 0 && oldCell != newCell {
		pipe.SRem(ctx, fmt.Sprintf("geo:hex:%x", oldCell), driverId)
	}

	// 2. Add to new cell with 10-second TTL
	newKey := fmt.Sprintf("geo:hex:%x", newCell)
	pipe.SAdd(ctx, newKey, driverId)
	pipe.Expire(ctx, newKey, 10*time.Second)

	// 3. Track driver current cell
	pipe.Set(ctx, fmt.Sprintf("driver:cell:%s", driverId), newCell, 10*time.Second)

	_, err := pipe.Exec(ctx)
	return err
}

func (s *SpatialStore) FindNearbyDrivers(ctx context.Context, cells []uint64) ([]string, error) {
	pipe := s.rdb.Pipeline()
	for _, cell := range cells {
		pipe.SMembers(ctx, fmt.Sprintf("geo:hex:%x", cell))
	}
	cmds, err := pipe.Exec(ctx)
	if err != nil {
		return nil, err
	}

	var candidates []string
	for _, cmd := range cmds {
		members, _ := cmd.(*redis.StringSliceCmd).Result()
		candidates = append(candidates, members...)
	}
	return candidates, nil
}`,
        explanation:
          'Redis pipelining batches multi-hex reads into a single network roundtrip, returning all nearby candidates across 7 hex cells in under 2ms.',
        keyTakeaway: 'Driver records have a short TTL (10s); if a driver disconnects, their presence naturally evaporates from the spatial index without dirty cleanup jobs.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: Dispatch Matching & Lock-Free Offer Distribution',
        subtitle: 'Optimizing ETA and preventing race conditions where 2 riders get the same driver',
        concept:
          'When a rider requests a pickup, the Dispatch Service ranks nearby drivers by ETA (routing distance, not straight-line Euclidean distance) and dispatches a ride offer with a 15-second expiration timer.',
        language: 'go',
        fileName: 'dispatch_engine.go',
        codeSnippet: `package main

import (
	"context"
	"fmt"
	"time"
)

type DispatchEngine struct {
	spatial *SpatialStore
}

func (d *DispatchEngine) MatchRide(ctx context.Context, riderId string, pickupLat, pickupLon float64) (string, error) {
	riderCell := h3Tracker.LatLonToH3(pickupLat, pickupLon)
	neighborCells := h3Tracker.GetNeighborCells(riderCell, 1) // 7 cells radius

	candidates, err := d.spatial.FindNearbyDrivers(ctx, neighborCells)
	if err != nil || len(candidates) == 0 {
		return "", fmt.Errorf("no drivers available")
	}

	for _, driverId := range candidates {
		// Atomic reservation: only 1 ride request can lock this driver
		lockAcquired := d.tryLockDriver(ctx, driverId)
		if lockAcquired {
			go d.dispatchOfferToDriverSocket(driverId, riderId)
			return driverId, nil
		}
	}

	return "", fmt.Errorf("all nearby drivers currently busy")
}

func (d *DispatchEngine) tryLockDriver(ctx context.Context, driverId string) bool {
	lockKey := fmt.Sprintf("driver:lock:%s", driverId)
	success, _ := d.spatial.rdb.SetNX(ctx, lockKey, "locked", 15*time.Second).Result()
	return success
}`,
        explanation:
          'Redis `SetNX` atomically reserves the driver for 15 seconds. If the driver declines or times out, the lock expires and the next nearest driver is offered.',
        keyTakeaway: 'Distributed locks via `SetNX` eliminate race conditions where multiple riders are offered the same physical vehicle.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: Dynamic Surge Pricing Engine',
        subtitle: 'Supply vs Demand density matching per H3 cell',
        concept:
          'Surge pricing is calculated independently per H3 hexagonal cell every 15 seconds. If cell demand (ride requests) exceeds supply (available drivers), surge multiplier scales smoothly.',
        language: 'typescript',
        fileName: 'surge_engine.ts',
        codeSnippet: `export function calculateSurgeMultiplier(
  activeRequests: number,
  availableDrivers: number
): number {
  if (availableDrivers === 0) return 3.0 // Cap surge at 3.0x
  
  const ratio = activeRequests / availableDrivers
  if (ratio <= 1.0) return 1.0 // Normal baseline
  
  // Exponential surge curve with 3.0x hard ceiling
  const rawSurge = 1.0 + Math.pow(ratio - 1.0, 1.2) * 0.4
  return Math.min(3.0, Math.round(rawSurge * 10) / 10)
}`,
        explanation:
          'H3 hexagon granularity prevents sharp boundary cliffs: neighboring cells are smoothed using spatial convolution so riders cannot simply walk across the street to avoid surge.',
        keyTakeaway: 'Cellular spatial surge incentives drivers from adjacent surplus cells to navigate towards high-demand shortage cells.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Sudden Rainstorm Demand Spike (10x Ride Requests)',
        impact: 'Thousands of riders open the app simultaneously, saturating the dispatch matching queue and exhausting driver locks.',
        mitigationCodeOrStrategy:
          'Expand k-Ring radius dynamically: expand search from k-Ring 1 (7 cells) to k-Ring 2 (19 cells) and k-Ring 3 (37 cells), while increasing surge multiplier to dampen request velocity.',
      },
      {
        incident: 'Driver WebSocket Gateway Node Crash',
        impact: '50,000 driver connections terminate abruptly; reconnection wave threatens to overwhelm gateway authentication services.',
        mitigationCodeOrStrategy:
          'Mobile clients implement exponential backoff with full jitter on reconnect, and the gateway uses cached JWT session tickets to bypass database authentication checks.',
      },
    ],
    faangInterviewTips: [
      'Explain Uber H3 vs Google S2 vs Geohash: H3 uses hexagons (equidistant neighbors); S2 uses Hilbert space-filling curves on cube faces; Geohash uses rectangular bounding boxes with border distortion.',
      'Clarify Euclidean distance vs Road Network ETA: Euclidean distance is fast for candidate filtering, but final ranking MUST call the routing engine (OSRM/Valhalla) for actual road network drive times.',
      'Address the race condition: Explain why atomic reservation with Redis `SetNX` is required when offering a ride to a driver.',
    ],
  },

  'order-book': {
    problemStatement:
      'Design a high-frequency trading (HFT) limit order matching engine (like NASDAQ or Binance) processing 500,000+ orders/second with deterministic sub-50 microsecond execution latency, Price-Time Priority (FIFO), and zero data loss.',
    naiveApproach: {
      description:
        'A relational database with an `orders` table. For every buy order, run `SELECT * FROM orders WHERE type = "SELL" AND price <= $1 ORDER BY price ASC, created_at ASC FOR UPDATE`.',
      whyItBreaks: [
        'Row lock contention: Pessimistic locking blocks all concurrent trades for that asset, capping throughput at < 200 orders/sec.',
        'Network & disk I/O latency: Database transactions take 5-15 milliseconds, which is 1,000x too slow for algorithmic HFT trading.',
        'Garbage Collection pauses: In managed languages like standard Java or Go, GC pauses (10-100ms) cause catastrophic slippage and order queuing.',
        'Floating-point inaccuracy: Floating-point rounding errors lead to fractional penny discrepancies that violate financial compliance.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Price-Time Priority Limit Order Book',
        purpose: 'Red-Black Tree of price levels, each pointing to a Doubly-Linked List of limit orders (FIFO queue).',
        timeComplexity: 'O(1) best bid/ask lookup, O(1) order match, O(log P) new price insertion',
        spaceComplexity: 'O(N) active open orders (~50 MB RAM for 500k orders)',
        asciiDiagram: 'Bids (High to Low): [$100.50 -> [O1 -> O2]] -> [$100.40 -> [O3]] | Asks (Low to High): [$100.60 -> [O4]]',
      },
      {
        name: 'LMAX Disruptor Lock-Free Ring Buffer',
        purpose: 'Single-writer lock-free memory ring buffer executing on a dedicated CPU core pinned with cache-line padding.',
        timeComplexity: 'O(1) sequential lock-free read/write',
        spaceComplexity: 'Pre-allocated fixed power-of-two array (e.g. 1,048,576 slots)',
      },
      {
        name: 'Deterministic Write-Ahead Log (WAL)',
        purpose: 'Memory-mapped NVMe sequential append log capturing every raw inbound order before in-memory execution.',
        timeComplexity: 'O(1) append to NVMe',
        spaceComplexity: 'Sequential disk storage (replayed on restart for state recovery)',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Fixed-Point Arithmetic & Order Layout',
        subtitle: 'Never use floating-point numbers in financial systems',
        concept:
          'Floats (e.g., 0.1 + 0.2 = 0.30000000000000004) introduce catastrophic financial discrepancies. We represent prices and quantities as 64-bit unsigned integers in micro-units (e.g. $100.50 = 100500000).',
        language: 'rust',
        fileName: 'order_types.rs',
        codeSnippet: `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Side {
    Buy,
    Sell,
}

#[derive(Clone, Debug)]
pub struct Order {
    pub order_id: u64,
    pub trader_id: u64,
    pub side: Side,
    pub price: u64,       // Price scaled by 10^8 (e.g., Satoshi or Micro-cents)
    pub quantity: u64,    // Quantity scaled by 10^8
    pub timestamp_ns: u64, // Monotonic hardware timestamp in nanoseconds
}

#[derive(Clone, Debug)]
pub struct TradeExecution {
    pub maker_order_id: u64,
    pub taker_order_id: u64,
    pub price: u64,
    pub executed_qty: u64,
    pub timestamp_ns: u64,
}`,
        explanation:
          'Memory-aligned struct layout ensures cache-line friendliness (64-byte L1 cache line fits multiple order references without cache eviction).',
        keyTakeaway: 'Financial software must always use scaled integers (fixed-point math) to guarantee exact mathematical determinism.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Price-Time Priority Doubly Linked List',
        subtitle: 'O(1) matching and cancellation within a price bucket',
        concept:
          'All orders at the exact same price are executed in First-In-First-Out (FIFO) arrival order. A doubly linked list allows O(1) order cancellation by holding direct pointer references.',
        language: 'rust',
        fileName: 'price_level.rs',
        codeSnippet: `use std::collections::VecDeque;

pub struct PriceLevel {
    pub price: u64,
    pub total_volume: u64,
    pub orders: VecDeque<Order>, // FIFO queue for time-priority execution
}

impl PriceLevel {
    pub fn new(price: u64) -> Self {
        Self {
            price,
            total_volume: 0,
            orders: VecDeque::new(),
        }
    }

    pub fn add_order(&mut self, order: Order) {
        self.total_volume += order.quantity;
        self.orders.push_back(order);
    }

    pub fn fill_order(&mut self, requested_qty: u64) -> (u64, bool) {
        let mut filled = 0;
        while let Some(front) = self.orders.front_mut() {
            let needed = requested_qty - filled;
            if front.quantity <= needed {
                filled += front.quantity;
                self.total_volume -= front.quantity;
                self.orders.pop_front();
            } else {
                front.quantity -= needed;
                self.total_volume -= needed;
                filled += needed;
                break;
            }
            if filled >= requested_qty {
                break;
            }
        }
        let is_empty = self.orders.is_empty();
        (filled, is_empty)
    }
}`,
        explanation:
          'When an aggressive market taker arrives, it consumes orders from the front of the queue until either its quantity is exhausted or the price level is emptied.',
        keyTakeaway: 'Doubly linked lists combined with a hash map of order IDs allow O(1) execution and O(1) order cancellations.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Core Matching Engine Loop',
        subtitle: 'Cross-matching bids and asks in sub-microsecond time',
        concept:
          'Bids are sorted descending (highest buyer first). Asks are sorted ascending (lowest seller first). A trade occurs whenever `highest_bid >= lowest_ask`.',
        language: 'rust',
        fileName: 'matching_engine.rs',
        codeSnippet: `use std::collections::BTreeMap;

pub struct OrderBook {
    // Bids sorted highest first (Reverse order)
    pub bids: BTreeMap<std::cmp::Reverse<u64>, PriceLevel>,
    // Asks sorted lowest first
    pub asks: BTreeMap<u64, PriceLevel>,
}

impl OrderBook {
    pub fn new() -> Self {
        Self {
            bids: BTreeMap::new(),
            asks: BTreeMap::new(),
        }
    }

    pub fn place_limit_order(&mut self, mut order: Order) -> Vec<TradeExecution> {
        let mut trades = Vec::new();

        if order.side == Side::Buy {
            // Match against resting asks
            while order.quantity > 0 {
                if let Some(mut lowest_ask_entry) = self.asks.first_entry() {
                    let ask_price = *lowest_ask_entry.key();
                    if ask_price > order.price {
                        break; // Best ask is higher than our buy limit
                    }
                    let level = lowest_ask_entry.get_mut();
                    let (filled, is_empty) = level.fill_order(order.quantity);
                    order.quantity -= filled;
                    trades.push(TradeExecution {
                        maker_order_id: 0,
                        taker_order_id: order.order_id,
                        price: ask_price,
                        executed_qty: filled,
                        timestamp_ns: order.timestamp_ns,
                    });
                    if is_empty {
                        lowest_ask_entry.remove();
                    }
                } else {
                    break;
                }
            }
            // If remaining quantity exists, rest in bids
            if order.quantity > 0 {
                self.bids.entry(std::cmp::Reverse(order.price))
                    .or_insert_with(|| PriceLevel::new(order.price))
                    .add_order(order);
            }
        }
        trades
    }
}`,
        explanation:
          'BTreeMap maintains order in O(log P) time where P is the number of distinct price levels. In practice, P is under 1,000 active price levels.',
        keyTakeaway: 'The matching loop is completely CPU in-memory, completing matches in 15 to 45 nanoseconds.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: LMAX Disruptor Single-Writer Architecture',
        subtitle: 'Eliminating thread locks using CPU cache line padding',
        concept:
          'Lock contention between threads destroys latency. Modern exchanges use the LMAX Disruptor pattern: a single thread pinned to a dedicated CPU core handles all matching sequentially on a lock-free ring buffer.',
        language: 'rust',
        fileName: 'disruptor_ring.rs',
        codeSnippet: `use std::sync::atomic::{AtomicU64, Ordering};

pub struct RingBuffer<T> {
    buffer: Vec<T>,
    mask: usize,
    // Cache-line padded atomic sequence to prevent false sharing
    cursor: AtomicU64,
    _pad: [u8; 56], // 64 bytes cache line padding
}

impl<T: Default + Clone> RingBuffer<T> {
    pub fn new(capacity_power_of_two: usize) -> Self {
        assert!(capacity_power_of_two.is_power_of_two());
        Self {
            buffer: vec![T::default(); capacity_power_of_two],
            mask: capacity_power_of_two - 1,
            cursor: AtomicU64::new(0),
            _pad: [0; 56],
        }
    }

    pub fn next(&self) -> u64 {
        self.cursor.fetch_add(1, Ordering::SeqCst)
    }

    pub fn get(&self, sequence: u64) -> &T {
        &self.buffer[(sequence as usize) & self.mask]
    }
}`,
        explanation:
          'Cache-line padding prevents CPU "False Sharing" where writes to adjacent variables invalidate the entire L1/L2 cache line across cores.',
        keyTakeaway: 'A single pinned CPU core executing without lock contention can process over 6 million orders per second.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: Deterministic Replay & NVMe WAL Persistence',
        subtitle: 'Zero data loss with append-only kernel bypass logging',
        concept:
          'Before an order hits the matching core, it is written to an append-only NVMe Write-Ahead Log. Because the matching engine is a deterministic state machine, replaying the log from snapshot 0 recreates the exact state.',
        language: 'rust',
        fileName: 'wal_logger.rs',
        codeSnippet: `use std::fs::File;
use std::io::Write;

pub struct WALogger {
    file: File,
}

impl WALogger {
    pub fn append_raw_order(&mut self, raw_bytes: &[u8]) -> std::io::Result<()> {
        self.file.write_all(raw_bytes)?;
        // Direct write; batched io_uring or O_DIRECT on Linux bypasses page cache
        Ok(())
    }
}`,
        explanation:
          'Linux `io_uring` batches kernel disk writes asynchronously, allowing the matching engine to persist 500,000 orders/sec without blocking the hot loop.',
        keyTakeaway: 'Deterministic replay guarantees that even a total power outage results in zero lost trades upon reboot.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Order Book Crossing Inversion Bug',
        impact: 'Software bug causes a Buy order to be placed at a price higher than the lowest Sell without executing, causing arbitrage exploitation.',
        mitigationCodeOrStrategy:
          'Strict invariant assert in debug and release: `assert!(best_bid < best_ask)` after every match loop iteration; if violated, engine halts trading immediately.',
      },
      {
        incident: 'Flash Crash Cascade from Algorithmic Runaway Loop',
        impact: 'A malfunctioning market maker algorithm dumps 100,000 market sell orders in 50ms, wiping out all buy liquidity.',
        mitigationCodeOrStrategy:
          'Dynamic Circuit Breakers: If price moves by more than 5% within a 1-second rolling window, trading automatically halts for a 5-minute cooling auction.',
      },
    ],
    faangInterviewTips: [
      'Emphasize Price-Time Priority: Orders are matched first by best price, then by oldest timestamp (FIFO).',
      'Explain Single-Threaded Core vs Multi-Threaded: Why is a single thread faster? Because zero lock contention and hot L1/L2 CPU cache retention beats 16 threads fighting over mutexes.',
      'Always discuss Fixed-Point Math: Why 64-bit integers represent currency instead of IEEE-754 floats.',
    ],
  },

  'rate-limiter': {
    problemStatement:
      'Design a high-performance distributed rate limiter (like Cloudflare or Stripe) capable of evaluating 100,000+ API requests per second with sub-2ms latency, protecting backend services from DDoS and abuse across global edge locations.',
    naiveApproach: {
      description:
        'A single PostgreSQL table `rate_limits (ip_address, request_count, window_start)`. On every request: `UPDATE rate_limits SET request_count = request_count + 1 WHERE ...`.',
      whyItBreaks: [
        'Massive write lock contention: Every single incoming request requires a database write, exhausting DB connection pools at 500 req/sec.',
        'High latency overhead: 15-30ms database roundtrips double the latency of every API call.',
        'Burst vulnerabilities: Fixed window resets allow 2x the rate limit at window boundaries (e.g. 100 req at 00:59 and 100 req at 01:00).',
        'Clock drift in distributed servers: Different server clocks cause inconsistent window expirations.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Token Bucket',
        purpose: 'Smoothly refills tokens at a constant rate; requests consume tokens instantly.',
        timeComplexity: 'O(1) evaluate and consume',
        spaceComplexity: '8 bytes per client key in Redis',
        asciiDiagram: 'Tokens refill at R tokens/sec up to Capacity C. Request allowed if tokens >= 1.',
      },
      {
        name: 'Sliding Window Counter (Weighted Interpolation)',
        purpose: 'Blends request counts from the previous and current window to eliminate boundary burst spikes.',
        timeComplexity: 'O(1) memory lookup & math',
        spaceComplexity: '16 bytes per client in Redis',
      },
      {
        name: 'Redis Atomic Lua Script',
        purpose: 'Executes get-evaluate-update logic atomically on Redis server without network roundtrips.',
        timeComplexity: 'O(1) atomic execution',
        spaceComplexity: 'Zero state in client',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: The Token Bucket Algorithm',
        subtitle: 'The gold standard for API rate limiting with burst tolerance',
        concept:
          'A bucket holds up to `capacity` tokens. It refills at a steady rate of `refill_rate` tokens per second. When an API call arrives, if at least 1 token is available, the token is deducted and the call succeeds. Otherwise, HTTP 429 Too Many Requests is returned.',
        language: 'go',
        fileName: 'token_bucket.go',
        codeSnippet: `package main

import (
	"sync"
	"time"
)

type TokenBucket struct {
	mu         sync.Mutex
	capacity   float64
	tokens     float64
	refillRate float64 // Tokens added per second
	lastRefill time.Time
}

func NewTokenBucket(capacity, refillRate float64) *TokenBucket {
	return &TokenBucket{
		capacity:   capacity,
		tokens:     capacity,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

func (tb *TokenBucket) Allow() bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(tb.lastRefill).Seconds()
	tb.lastRefill = now

	// Lazily calculate refilled tokens without background tick timers
	tb.tokens = tb.tokens + elapsed*tb.refillRate
	if tb.tokens > tb.capacity {
		tb.tokens = tb.capacity
	}

	if tb.tokens >= 1.0 {
		tb.tokens -= 1.0
		return true
	}
	return false
}`,
        explanation:
          'Instead of running an expensive background timer to add tokens every millisecond, tokens are calculated lazily on-demand upon each request arrival.',
        keyTakeaway: 'Lazy token computation turns a timer-driven architecture into pure O(1) timestamp subtraction.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Atomic Redis Lua Rate Limiting',
        subtitle: 'Eliminating race conditions in distributed clusters',
        concept:
          'In a multi-server setup, reading tokens and updating them in two separate Redis commands creates a race condition. Redis Lua scripts run atomically in a single thread, preventing concurrency races.',
        language: 'lua',
        fileName: 'token_bucket.lua',
        codeSnippet: `-- KEYS[1]: client rate limit key (e.g., "ratelimit:usr_123")
-- ARGV[1]: capacity (e.g., 100)
-- ARGV[2]: refill_rate_per_sec (e.g., 10)
-- ARGV[3]: current_timestamp_sec
-- ARGV[4]: requested_tokens (default 1)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

-- Retrieve existing tokens and last update timestamp
local data = redis.call("HMGET", key, "tokens", "last_updated")
local tokens = tonumber(data[1])
local last_updated = tonumber(data[2])

if not tokens then
    tokens = capacity
    last_updated = now
else
    local elapsed = math.max(0, now - last_updated)
    tokens = math.min(capacity, tokens + elapsed * refill_rate)
    last_updated = now
end

if tokens >= requested then
    tokens = tokens - requested
    redis.call("HMSET", key, "tokens", tokens, "last_updated", last_updated)
    redis.call("EXPIRE", key, math.ceil(capacity / refill_rate) * 2)
    return {1, math.floor(tokens)} -- Allowed: true, remaining tokens
else
    return {0, math.floor(tokens)} -- Blocked: false
end`,
        explanation:
          'The script returns both the pass/fail boolean and the remaining token count in a single roundtrip, allowing the gateway to populate standard HTTP rate-limit headers.',
        keyTakeaway: 'Lua scripts run atomically without distributed locks, executing in under 0.5ms on Redis.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Sliding Window Counter Algorithm',
        subtitle: 'Eliminating boundary burst vulnerabilities',
        concept:
          'Fixed window counters allow 200 requests within 2 seconds if 100 requests arrive at 00:59 and 100 at 01:00. Sliding window weighted approximation blends the current and previous window to ensure strict rate guarantees.',
        language: 'typescript',
        fileName: 'sliding_window.ts',
        codeSnippet: `// Sliding Window Weighted Counter
export function isRateLimited(
  currentWindowCount: number,
  prevWindowCount: number,
  windowSizeSec: number,
  elapsedInCurrentWindowSec: number,
  limit: number
): { allowed: boolean; estimatedCount: number } {
  // Weight of previous window decreases as time elapses in current window
  const prevWeight = (windowSizeSec - elapsedInCurrentWindowSec) / windowSizeSec
  const estimatedCount = Math.floor(prevWindowCount * prevWeight + currentWindowCount)

  return {
    allowed: estimatedCount < limit,
    estimatedCount,
  }
}`,
        explanation:
          'This formula provides 99.9% accuracy with only 2 integer counters, completely eliminating the memory overhead of storing individual timestamps in sorted sets.',
        keyTakeaway: 'Weighted sliding window uses 99% less memory than Sliding Window Log while preventing boundary spikes.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: Standard RFC HTTP Response Headers',
        subtitle: 'Communicating quota status transparently to API consumers',
        concept:
          'API consumers need clear feedback about their quotas to implement client-side backoff instead of hammering the servers.',
        language: 'go',
        fileName: 'http_headers.go',
        codeSnippet: `package main

import (
	"fmt"
	"net/http"
	"strconv"
)

func ApplyRateLimitHeaders(w http.ResponseWriter, limit, remaining int, resetEpoch int64, allowed bool) {
	w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
	w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
	w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(resetEpoch, 10))

	if !allowed {
		w.Header().Set("Retry-After", fmt.Sprintf("%d", resetEpoch-timeNowSec()))
		http.Error(w, "429 Too Many Requests: Rate limit exceeded", http.StatusTooManyRequests)
	}
}

func timeNowSec() int64 {
	return 1718029300
}`,
        explanation:
          '`Retry-After` tells the client exactly how many seconds to wait before attempting another request.',
        keyTakeaway: 'Always return 429 Too Many Requests with standard RFC headers to enable graceful client backoff.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: Distributed Fail-Open Architecture',
        subtitle: 'The rate limiter must never become a single point of system failure',
        concept:
          'If the Redis cluster crashes or suffers network partition, should the gateway block all user traffic (Fail-Closed) or let requests through (Fail-Open)? In 99% of production systems, availability is prioritized: Fail-Open with local in-memory fallback.',
        language: 'go',
        fileName: 'resilient_limiter.go',
        codeSnippet: `package main

import (
	"context"
	"log"
	"time"
)

func (r *ResilientLimiter) CheckRateLimit(ctx context.Context, clientKey string) bool {
	ctxTimeout, cancel := context.WithTimeout(ctx, 5*time.Millisecond)
	defer cancel()

	allowed, err := r.evaluateRedis(ctxTimeout, clientKey)
	if err != nil {
		// Redis error or timeout: Fall back to local in-memory token bucket
		log.Printf("[WARN] Rate limiter fallback: %v", err)
		return r.localMemoryBucket.Allow()
	}

	return allowed
}`,
        explanation:
          'A strict 5ms context timeout ensures that a struggling Redis cluster never slows down public API traffic.',
        keyTakeaway: 'Rate limiters are protection layers, not primary business logic. They must fail open smoothly.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Redis Cluster Network Partition',
        impact: 'Edge gateways cannot connect to the central Redis rate limiter, risking total API paralysis.',
        mitigationCodeOrStrategy:
          'Fail-Open Policy: Edge gateways immediately fall back to local in-memory Token Buckets per edge instance with conservative quotas.',
      },
      {
        incident: 'Distributed DDoS from 500,000 Zombie Botnet IPs',
        impact: 'Each IP sends only 1 request per minute (bypassing per-IP limits), but aggregate backend traffic reaches 500,000 QPS.',
        mitigationCodeOrStrategy:
          'Tiered Hierarchy: Apply multi-level rate limits: (1) Per-IP rate limit, (2) Per-Account API Token limit, and (3) Global Service Gateway capacity ceiling.',
      },
    ],
    faangInterviewTips: [
      'Compare Algorithms: Token Bucket (bursts allowed), Leaky Bucket (smooth output rate), Sliding Window Log (high memory), Sliding Window Counter (optimal).',
      'Discuss Synchronization: Centralized Redis (consistent but network hop) vs Local in-memory sync via Gossip (eventual consistency).',
      'Fail-Open vs Fail-Closed: Always defend your architectural decision based on the business domain (e.g. Payments = Fail-Closed; Media Streaming = Fail-Open).',
    ],
  },
}

// Helper to retrieve or generate a rich FromScratchGuide for any of the 31 systems
export function getSystemFromScratchGuide(system: {
  id: string
  name: string
  tagline: string
  throughput: string
  latency: string
  overview: string
  functionalReqs: string[]
  nonFunctionalReqs: string[]
  calculations: { metric: string; formula: string; result: string }[]
  deepDive: {
    architectureSummary: string
    databaseSchema: string
    apiEndpoints: { method: string; path: string; desc: string }[]
    bottlenecksAndTradeoffs: string[]
  }
}): FromScratchGuide {
  if (FROM_SCRATCH_GUIDES[system.id]) {
    return FROM_SCRATCH_GUIDES[system.id]
  }

  // High-fidelity structured from-scratch engineering guide generated from the system specifications
  return {
    problemStatement: `Design and implement ${system.name} from scratch to satisfy production SLAs: ${system.throughput} at ${system.latency}. ${system.tagline}`,
    naiveApproach: {
      description: `A traditional monolithic single-node implementation relying on direct relational database queries and synchronous blocking RPC calls without caching, message queues, or distributed sharding.`,
      whyItBreaks: [
        `Single point of failure: Any hardware crash or network glitch takes down 100% of traffic.`,
        `Throughput saturation: Blocking I/O and synchronous thread pools choke when traffic exceeds ${system.throughput}.`,
        `Resource contention: Database connection pools and disk lock queues exhaust under concurrent spikes.`,
        `Geographic latency: Global clients experience massive roundtrip delays without edge ingress and distributed sharding.`,
      ],
    },
    coreDataStructures: [
      {
        name: 'Distributed Partition Key & Hash Ring',
        purpose: 'Uniformly distributes incoming state and requests across autonomous worker shards.',
        timeComplexity: 'O(1) hash mapping',
        spaceComplexity: 'O(N) partition mapping table',
        asciiDiagram: 'Key -> Hash(Key) mod N -> Shard Replica Set (Primary + Followers)',
      },
      {
        name: 'In-Memory State Buffer & Cache',
        purpose: 'Caches hot data paths to satisfy the strict latency target: ' + system.latency,
        timeComplexity: 'O(1) in-memory read',
        spaceComplexity: 'Bounded LRU memory pool',
      },
      {
        name: 'Asynchronous Event Pipeline',
        purpose: 'Decouples client request ingress from heavy background state mutations.',
        timeComplexity: 'O(1) non-blocking enqueue',
        spaceComplexity: 'Ring buffer / append-only commit log',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Domain Primitives & Core Invariants',
        subtitle: 'Defining the fundamental data types and constraints',
        concept:
          'Establish strict data contracts, memory layouts, and state machines before introducing distributed complexity.',
        language: 'go',
        fileName: 'domain_core.go',
        codeSnippet: `package main

import (
	"context"
	"time"
)

type CoreEntity struct {
	ID        string    \`json:"id"\`
	CreatedAt time.Time \`json:"created_at"\`
	Version   uint64    \`json:"version"\`
	Status    string    \`json:"status"\`
}

func ValidateEntity(e *CoreEntity) bool {
	return e.ID != "" && e.Version > 0
}`,
        explanation:
          'Enforces state validation and optimistic version tracking to detect concurrent write conflicts.',
        keyTakeaway: 'Always establish clean schema contracts and versioning before adding distributed replication.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: High-Performance In-Memory Execution Core',
        subtitle: 'Building the core algorithm in memory',
        concept:
          'Run the primary business logic in memory with thread-safe synchronization to achieve microsecond execution times.',
        language: 'go',
        fileName: 'engine_core.go',
        codeSnippet: `package main

import (
	"sync"
)

type ExecutionEngine struct {
	mu    sync.RWMutex
	state map[string]*CoreEntity
}

func NewExecutionEngine() *ExecutionEngine {
	return &ExecutionEngine{state: make(map[string]*CoreEntity)}
}

func (e *ExecutionEngine) Process(entity *CoreEntity) bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.state[entity.ID] = entity
	return true
}`,
        explanation:
          'Read/write mutexes protect the shared in-memory state map while allowing concurrent read queries.',
        keyTakeaway: 'Keep the critical path strictly in-memory; offload persistence to asynchronous background workers.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Horizontal Sharding & Distributed Topology',
        subtitle: 'Scaling out across multiple server nodes',
        concept:
          'Distribute data across N independent nodes using consistent hashing to avoid any single-node bottlenecks.',
        language: 'go',
        fileName: 'cluster_router.go',
        codeSnippet: `package main

import (
	"hash/fnv"
)

type ClusterRouter struct {
	nodes []string
}

func (cr *ClusterRouter) RouteKey(key string) string {
	h := fnv.New32a()
	h.Write([]byte(key))
	idx := h.Sum32() % uint32(len(cr.nodes))
	return cr.nodes[idx]
}`,
        explanation:
          'Deterministic hashing routes each key to its corresponding primary shard without coordination locks.',
        keyTakeaway: 'Consistent hashing minimizes key relocations when cluster nodes join or leave dynamically.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: Durable Storage & Write-Ahead Logging',
        subtitle: 'Durable persistence schema and replayability',
        concept: system.deepDive.architectureSummary,
        language: 'sql',
        fileName: 'schema.sql',
        codeSnippet: system.deepDive.databaseSchema,
        explanation:
          'The persistent database stores durable records with secondary indexes for query acceleration.',
        keyTakeaway: 'Separate the fast in-memory read cache from the durable write-ahead persistent store.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: API Contracts & High-Scale Ingress',
        subtitle: 'Exposing external endpoints with circuit breakers',
        concept:
          'Public API gateways terminate client TLS, validate auth tokens, and route to internal microservice clusters.',
        language: 'typescript',
        fileName: 'api_endpoints.ts',
        codeSnippet: system.deepDive.apiEndpoints
          .map((ep) => `// ${ep.method} ${ep.path}: ${ep.desc}`)
          .join('\n'),
        explanation:
          'Every endpoint implements rate limiting, timeout deadlines, and graceful error responses.',
        keyTakeaway: 'Always enforce strict timeout deadlines to prevent downstream latency from cascading backward.',
      },
    ],
    disasterScenarios: system.deepDive.bottlenecksAndTradeoffs.map((item, idx) => ({
      incident: `Production Bottleneck #${idx + 1}`,
      impact: item.split(':')[0] || 'High concurrency bottleneck',
      mitigationCodeOrStrategy: item.split(':')[1] || item,
    })),
    faangInterviewTips: [
      `Review capacity sizing: ${system.calculations.map((c) => `${c.metric}: ${c.result}`).join(' · ')}`,
      `Explain trade-offs between consistency and availability under CAP theorem for this architecture.`,
      `Highlight how backpressure, circuit breaking, and dead letter queues prevent cascading system outages.`,
    ],
  }
}

