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

  'whatsapp-chat': {
    problemStatement:
      'Design a globally distributed real-time messaging system (like WhatsApp or Telegram) supporting 2 billion active users, delivering 100 billion messages per day with sub-100ms end-to-end latency, real-time message statuses (Sent, Delivered, Read), persistent WebSocket connections, offline delivery, and End-to-End Encryption (E2EE).',
    naiveApproach: {
      description:
        'Clients poll the server via HTTP GET /messages every 1 second. Messages are stored in a relational database table with sender_id, recipient_id, and body columns.',
      whyItBreaks: [
        'Polling network saturation: 2 billion users polling every second generates 2 billion HTTP requests/sec, burning through server CPU and TLS handshakes.',
        'High delivery latency: Polling every 1-2 seconds means messages are delayed by an average of 500-1000ms, ruining real-time conversation feel.',
        'Database connection pool exhaustion: Simultaneous read queries on a relational table exhaust all DB connection pools within seconds.',
        'Massive bandwidth waste: 99.9% of polling queries return empty results (`[]`), consuming petabytes of idle mobile cellular bandwidth.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Persistent Duplex WebSocket Map',
        purpose: 'Maintains open TCP sockets with mobile clients using non-blocking epoll event loops.',
        timeComplexity: 'O(1) socket write',
        spaceComplexity: '10 KB RAM per active connection (~10 GB per 1M concurrent sockets)',
        asciiDiagram: 'Sender App <==WebSocket==> Gateway Node A <==gRPC==> Message Router <==WebSocket==> Recipient App',
      },
      {
        name: 'Distributed User Session Store (Redis / Mnesia)',
        purpose: 'Tracks which gateway server IP currently holds the active socket for user_id.',
        timeComplexity: 'O(1) lookup & heartbeat update',
        spaceComplexity: '64 bytes per user session (~128 MB for 2M active sessions)',
      },
      {
        name: 'Offline Message Mailbox (Cassandra / ScyllaDB)',
        purpose: 'LSM-tree partitioned store holding pending messages for disconnected users.',
        timeComplexity: 'O(1) append to partition, O(K) sequential range fetch on reconnect',
        spaceComplexity: 'Clustering key: recipient_id + message_id',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Epoll WebSocket Duplex Gateway',
        subtitle: 'Replacing expensive HTTP polling with persistent bi-directional sockets',
        concept:
          'Mobile clients establish a single persistent TLS WebSocket connection with an edge gateway. The connection stays idle with lightweight 30-second TCP keepalive pings.',
        language: 'go',
        fileName: 'chat_gateway.go',
        codeSnippet: `package main

import (
	"context"
	"net/http"
	"sync"
	"github.com/gorilla/websocket"
)

type ClientManager struct {
	mu      sync.RWMutex
	clients map[string]*websocket.Conn // userID -> active socket
}

func (m *ClientManager) Register(userId string, conn *websocket.Conn) {
	m.mu.Lock()
	m.clients[userId] = conn
	m.mu.Unlock()
	// Update global Redis session: userId is connected to gateway server IP
	sessionStore.Set(context.Background(), "session:"+userId, localGatewayIP, 60*time.Second)
}

func (m *ClientManager) Unregister(userId string) {
	m.mu.Lock()
	delete(m.clients, userId)
	m.mu.Unlock()
	sessionStore.Del(context.Background(), "session:"+userId)
}`,
        explanation:
          'When a user connects, their socket is kept in memory and their location (gateway server IP) is registered in the global session store.',
        keyTakeaway: 'Persistent WebSockets eliminate 99.9% of polling traffic and allow servers to push messages instantly without client polling.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Message Delivery State Machine',
        subtitle: 'Tracking Sent (✓), Delivered (✓✓), and Read (✓✓ Blue) statuses',
        concept:
          'Every message transitions through a strict status machine. Acknowledgments flow back along the reverse path to notify the sender in real-time.',
        language: 'go',
        fileName: 'message_router.go',
        codeSnippet: `package main

type MessageStatus string

const (
	StatusSent      MessageStatus = "SENT"      // Stored on server (Single Check)
	StatusDelivered MessageStatus = "DELIVERED" // Delivered to recipient device (Double Check)
	StatusRead      MessageStatus = "READ"      // Recipient opened conversation (Blue Double Check)
)

type ChatMessage struct {
	MessageID   string        \`json:"msg_id"\`
	SenderID    string        \`json:"sender_id"\`
	RecipientID string        \`json:"recipient_id"\`
	Payload     []byte        \`json:"payload"\` // Encrypted ciphertext
	Status      MessageStatus \`json:"status"\`
	Timestamp   int64         \`json:"timestamp"\`
}

func (r *Router) RouteMessage(msg *ChatMessage) {
	// 1. Persist to sender write log
	msg.Status = StatusSent
	r.sendAckToUser(msg.SenderID, msg.MessageID, StatusSent)

	// 2. Locate recipient gateway
	gatewayIP, online := r.sessionStore.GetGateway(msg.RecipientID)
	if online {
		// Deliver via internal gRPC to recipient gateway
		r.grpcClient.Deliver(gatewayIP, msg)
	} else {
		// Recipient is offline: store in Cassandra mailbox & trigger push notification
		r.offlineStore.SavePending(msg)
		r.pushService.SendAPNS(msg.RecipientID, "New message received")
	}
}`,
        explanation:
          'If the recipient is connected, the message bypasses disk and flows directly memory-to-memory. If offline, it lands safely in the offline mailbox.',
        keyTakeaway: 'Decoupling the online path (in-memory routing) from the offline path (durable Cassandra store) guarantees sub-50ms message delivery.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Durable Offline Mailbox in Cassandra',
        subtitle: 'Fast sequential writes for offline message queuing',
        concept:
          'When a recipient is offline, messages accumulate in a durable LSM-tree store. When the recipient reconnects, pending messages are pulled sequentially in a single batch.',
        language: 'sql',
        fileName: 'cassandra_mailbox.cql',
        codeSnippet: `-- Cassandra CQL Schema for Offline Messages
CREATE KEYSPACE whatsapp_chat 
WITH replication = {'class': 'NetworkTopologyStrategy', 'us-east': 3, 'eu-west': 3};

CREATE TABLE offline_messages (
    recipient_id uuid,
    message_id timeuuid,
    sender_id uuid,
    encrypted_payload blob,
    created_at timestamp,
    PRIMARY KEY (recipient_id, message_id)
) WITH CLUSTERING ORDER BY (message_id ASC);

-- On reconnect: fetch all unread messages sequentially
SELECT * FROM offline_messages WHERE recipient_id = ?;

-- Once delivered, batch delete from offline mailbox
DELETE FROM offline_messages WHERE recipient_id = ? AND message_id <= ?;`,
        explanation:
          'Clustering by `message_id ASC` guarantees that messages are read in chronological order without sorting overhead.',
        keyTakeaway: 'Once a message is delivered to the recipient device, it is deleted from the server. WhatsApp does not retain chat history on servers, preserving privacy and minimizing storage.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: End-to-End Encryption (Signal Double Ratchet)',
        subtitle: 'Zero server-side plaintext access using forward-secret ephemeral keys',
        concept:
          'The chat server never sees message contents. Clients negotiate keys using Diffie-Hellman Key Exchange (X3DH) and advance symmetric keys on every single message using the Double Ratchet Algorithm.',
        language: 'typescript',
        fileName: 'double_ratchet.ts',
        codeSnippet: `// Signal Double Ratchet Key Derivation (Conceptual)
import crypto from 'crypto'

export class RatchetSession {
  private rootKey: Buffer
  private sendingChainKey: Buffer
  private receivingChainKey: Buffer

  constructor(sharedSecret: Buffer) {
    this.rootKey = sharedSecret
    this.sendingChainKey = sharedSecret
    this.receivingChainKey = sharedSecret
  }

  // Ratchet forward: produces a single-use ephemeral message key
  public stepSendingKey(): Buffer {
    // HKDF advances chain key
    const hmac = crypto.createHmac('sha256', this.sendingChainKey)
    hmac.update('MESSAGE_KEY_SEED')
    const messageKey = hmac.digest()

    // Advance the chain key for the next message
    const advanceHmac = crypto.createHmac('sha256', this.sendingChainKey)
    advanceHmac.update('CHAIN_KEY_ADVANCE')
    this.sendingChainKey = advanceHmac.digest()

    return messageKey
  }
}`,
        explanation:
          'Because the key ratchets forward on every message, compromising one message key never compromises previous or future messages (Forward Secrecy).',
        keyTakeaway: 'E2EE eliminates server-side compliance liability and protects user messages even if the server database is breached.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: Group Chat Fanout & Sender Keys',
        subtitle: 'Scaling groups up to 1,024 members without quadratic bandwidth explosions',
        concept:
          'Naive group messaging encrypts the message N times for N recipients. WhatsApp uses "Sender Keys": the sender encrypts the message once with a symmetric key and sends it to the server, which fans out identical encrypted packets to all group members.',
        language: 'go',
        fileName: 'group_fanout.go',
        codeSnippet: `package main

func (r *Router) BroadcastGroupMessage(groupId string, msg *ChatMessage) {
	// 1. Fetch group member IDs from in-memory cache
	members := r.groupCache.GetMembers(groupId)

	// 2. Scatter fanout over internal broker stream
	for _, memberId := range members {
		if memberId == msg.SenderID {
			continue
		}
		r.asyncDeliver(memberId, msg)
	}
}`,
        explanation:
          'Sender Keys reduce client upload bandwidth from $O(N)$ to $O(1)$. The server handles the fanout over high-speed datacenter fiber.',
        keyTakeaway: 'Group message fanout must happen in the cloud gateway layer, not on the sender mobile device.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'New Year\'s Eve Midnight Reconnection Spike',
        impact: 'Millions of users send messages at 12:00:00 AM simultaneously, causing 500,000 WebSocket reconnect attempts per second and crashing gateways.',
        mitigationCodeOrStrategy:
          'Rate-limit connection handshakes with exponential backoff and randomized jitter on the mobile app, and prioritize message delivery over presence/typing indicators.',
      },
      {
        incident: 'Gateway Node Crash Severing 100,000 Sockets',
        impact: 'One server machine crashes, disconnecting 100k users. Unread messages routing to this machine get dropped.',
        mitigationCodeOrStrategy:
          'Session heartbeat TTL in Redis: when the gateway fails to ping within 10 seconds, sessions automatically expire and incoming messages route to the offline Cassandra mailbox.',
      },
    ],
    faangInterviewTips: [
      'Explain Polling vs Long-Polling vs WebSockets vs gRPC: WebSockets provide lowest latency duplex streaming with minimal header overhead.',
      'Clarify server storage: Point out that WhatsApp is a store-and-forward system; messages are deleted from servers as soon as they reach the recipient device.',
      'Explain End-to-End Encryption: Be ready to explain the difference between transport encryption (TLS) and application E2EE (Signal Protocol).',
    ],
  },

  'twitter-feed': {
    problemStatement:
      'Design a social media news feed system (like Twitter / X or Instagram) serving 500 million daily active users, handling 500,000 timeline reads/sec with sub-50ms latency, and managing massive celebrity fanout (e.g. accounts with 100M+ followers).',
    naiveApproach: {
      description:
        'A single relational database with `users`, `follows`, and `tweets` tables. When a user requests their home timeline, run `SELECT * FROM tweets JOIN follows ON tweets.user_id = follows.followee_id WHERE follows.follower_id = $1 ORDER BY tweets.created_at DESC LIMIT 20`.',
      whyItBreaks: [
        'Disastrous SQL JOIN performance: Joining millions of rows on every user page load takes 5-15 seconds and locks database tables.',
        'Read throughput exhaustion: 500,000 reads/sec completely crashes relational database clusters.',
        'High database CPU: Sorting and merging hundreds of user timelines dynamically burns endless CPU cores.',
        'Celebrity tweet deadlock: When a celebrity tweets, updating millions of follower records sequentially blocks database writes for minutes.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Redis Sorted Set (ZSET) Timeline Cache',
        purpose: 'Stores pre-computed user home timelines in memory where Score = Timestamp and Member = TweetID.',
        timeComplexity: 'O(log N + M) range query for top 20 tweets (sub-millisecond)',
        spaceComplexity: '800 tweet IDs per active user (~8 KB RAM per user)',
        asciiDiagram: 'User Timeline ZSET: [TweetID: 9812 (Score: 1718029300)] -> [TweetID: 9811 (Score: 1718029250)]',
      },
      {
        name: 'Hybrid Fanout Pipeline (Push vs Pull)',
        purpose: 'Fanout-on-Write for regular users (< 20,000 followers) and Fanout-on-Read for celebrities (> 20,000 followers).',
        timeComplexity: 'O(1) push fanout worker, O(C) celebrity merge on read',
        spaceComplexity: 'Decoupled memory usage',
      },
      {
        name: 'Distributed Snowflake 64-bit Tweet ID',
        purpose: 'Monotonically increasing 64-bit ID allowing chronological sorting without querying timestamps.',
        timeComplexity: 'O(1) generation in microsecond time',
        spaceComplexity: '8 bytes per tweet ID',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Tweet Ingestion & 64-bit Snowflake ID',
        subtitle: 'Generating time-ordered IDs for instant chronological sorting',
        concept:
          'Tweets are assigned a 64-bit Snowflake ID where the first 41 bits encode milliseconds since custom epoch. Sorting by Tweet ID automatically sorts chronologically without date parsing.',
        language: 'go',
        fileName: 'tweet_service.go',
        codeSnippet: `package main

import (
	"context"
	"time"
)

type Tweet struct {
	ID        uint64    \`json:"id"\` // Snowflake ID
	UserID    uint64    \`json:"user_id"\`
	Content   string    \`json:"content"\`
	MediaURLs []string  \`json:"media_urls"\`
	CreatedAt time.Time \`json:"created_at"\`
}

func (s *TweetService) PostTweet(ctx context.Context, userId uint64, content string) (*Tweet, error) {
	tweetId := s.snowflakeGen.NextID()
	tweet := &Tweet{
		ID:        tweetId,
		UserID:    userId,
		Content:   content,
		CreatedAt: time.Now().UTC(),
	}

	// 1. Persist tweet body to Cassandra / ScyllaDB
	if err := s.tweetStore.Insert(ctx, tweet); err != nil {
		return nil, err
	}

	// 2. Dispatch to async Fanout Kafka stream
	s.kafkaProducer.Publish("tweet-fanout-topic", tweet)
	return tweet, nil
}`,
        explanation:
          'Writing the tweet takes < 15ms because timeline distribution is offloaded completely to asynchronous Kafka background workers.',
        keyTakeaway: 'Never compute follower timeline distribution inside the HTTP POST request. Publish an event and return 200 OK immediately.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Fanout-on-Write for Normal Users (Push Model)',
        subtitle: 'Pre-computing timelines so reads are instant O(1) in-memory fetches',
        concept:
          'For users with a regular follower count (< 20,000), background workers fetch their follower list and push the new Tweet ID into each follower\'s Redis timeline.',
        language: 'go',
        fileName: 'fanout_worker.go',
        codeSnippet: `package main

import (
	"context"
	"fmt"
	"github.com/go-redis/redis/v8"
)

func (w *FanoutWorker) ProcessFanout(tweet *Tweet) {
	// Fetch all follower IDs of the author
	followers := w.graphService.GetFollowers(tweet.UserID)

	// Push Tweet ID to each follower's Redis Sorted Set
	pipe := w.rdb.Pipeline()
	for _, followerId := range followers {
		key := fmt.Sprintf("timeline:%d", followerId)
		// ZADD timeline:<id> <timestamp> <tweet_id>
		pipe.ZAdd(context.Background(), key, &redis.Z{
			Score:  float64(tweet.ID), // Monotonic ID serves as score
			Member: tweet.ID,
		})
		// Trim timeline to top 800 most recent tweets
		pipe.ZRemRangeByRank(context.Background(), key, 0, -801)
	}
	_, _ = pipe.Exec(context.Background())
}`,
        explanation:
          'Keeping only the top 800 tweets per user bounds Redis RAM usage while satisfying 99% of user browsing depth.',
        keyTakeaway: 'Pre-computing timelines on write makes feed retrieval a simple $O(1)$ memory lookup, achieving sub-10ms read latency.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: The Celebrity Problem & Hybrid Pull Model',
        subtitle: 'Why pure push models break when a celebrity tweets',
        concept:
          'If an account with 100M followers tweets, pure push fanout would generate 100,000,000 Redis writes, causing massive backlog queues and memory bloat. For celebrities, we do NOT fan out on write.',
        language: 'go',
        fileName: 'hybrid_feed.go',
        codeSnippet: `package main

const CelebrityThreshold = 25000 // Followers threshold

func (s *TimelineService) GetHomeTimeline(userId uint64, page int) ([]*Tweet, error) {
	// 1. Fetch pre-computed timeline from Redis (from normal followees)
	normalTweetIDs := s.rdb.ZRevRange(ctx, fmt.Sprintf("timeline:%d", userId), 0, 50).Val()

	// 2. Fetch recent tweets from celebrities this user follows (Pull Model)
	celebrityIDs := s.graphService.GetFollowedCelebrities(userId)
	var celebrityTweetIDs []uint64
	for _, celebId := range celebrityIDs {
		recent := s.tweetStore.GetRecentTweetIDs(celebId, 10)
		celebrityTweetIDs = append(celebrityTweetIDs, recent...)
	}

	// 3. In-memory k-way merge sort by TweetID descending
	mergedIDs := mergeSortDescending(normalTweetIDs, celebrityTweetIDs, 20)

	// 4. Hydrate tweet contents from Redis/Memcached tweet cache
	return s.hydrateTweets(mergedIDs), nil
}`,
        explanation:
          'Normal followees are pushed on write, while celebrity tweets are merged on read. This hybrid architecture eliminates write storms while keeping reads sub-30ms.',
        keyTakeaway: 'The Hybrid Push-Pull architecture is the standard design used by Twitter, Instagram, and LinkedIn to solve the hot-key celebrity problem.',
      },
      {
        stepNumber: 4,
        title: 'Step 5: Tweet Hydration & Caching Hierarchy',
        subtitle: 'Separating tweet IDs from tweet text and media metadata',
        concept:
          'Timelines only store 64-bit Tweet IDs. Tweet content (text, author, media, likes) is stored in a shared Memcached cluster keyed by `tweet:{id}`.',
        language: 'typescript',
        fileName: 'hydration.ts',
        codeSnippet: `// Hydrates tweet IDs from high-speed cache
export async function hydrateTweets(tweetIds: string[]): Promise<Tweet[]> {
  const cacheKeys = tweetIds.map(id => \`tweet:\${id}\`)
  const cachedTweets = await memcached.getMulti(cacheKeys)
  
  const missingIds = tweetIds.filter(id => !cachedTweets[\`tweet:\${id}\`])
  if (missingIds.length > 0) {
    // Batch fetch missing tweets from primary Cassandra store
    const dbTweets = await cassandra.batchFetch(missingIds)
    await memcached.setMulti(dbTweets, 3600) // Cache 1 hour
    Object.assign(cachedTweets, dbTweets)
  }

  return tweetIds.map(id => cachedTweets[\`tweet:\${id}\`])
}`,
        explanation:
          'If 1,000 followers see the same tweet, the tweet text is fetched from memory once and shared across all 1,000 timeline renderings.',
        keyTakeaway: 'Storing only IDs in timelines reduces timeline cache size by 95% and avoids data duplication.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Celebrity Account Breaks the Internet (100M Followers)',
        impact: 'A celebrity posts a viral announcement; naive fanout queues back up for hours, delaying regular users\' tweets.',
        mitigationCodeOrStrategy:
          'Strict Hybrid Model: Any account exceeding 25,000 followers is flagged as CELEBRITY and excluded from write-fanout queues.',
      },
      {
        incident: 'Redis Cluster Node Eviction Stampede',
        impact: 'A Redis node storing 5 million user timelines runs out of memory, evicting active user feeds.',
        mitigationCodeOrStrategy:
          'Passive rebuilding: If a user\'s timeline is missing in Redis, rebuild it on-demand by querying their followees\' recent tweets and re-populating Redis.',
      },
    ],
    faangInterviewTips: [
      'Contrast Fanout-on-Write (Push) vs Fanout-on-Read (Pull): Push optimizes for fast reads (O(1)), Pull optimizes for fast writes (O(1)).',
      'Explain why the Hybrid Model is mandatory: Normal users use push; celebrities (>25k followers) use pull.',
      'Highlight Snowflake IDs: Explaining that 64-bit IDs encode timestamps and eliminate secondary database index sorting proves Senior/Staff engineering depth.',
    ],
  },

  'payment-ledger': {
    problemStatement:
      'Design an enterprise-grade distributed payment gateway and double-entry bookkeeping ledger (like Stripe, PayPal, or Modern Treasury) capable of executing financial transactions with exactly-once idempotency, 100% mathematical balance invariants (sum of debits == sum of credits), and zero lost funds during network failure.',
    naiveApproach: {
      description:
        'A single relational table `users (id, balance)`. When a payment of $10 occurs, run: `UPDATE users SET balance = balance - 10 WHERE id = sender_id; UPDATE users SET balance = balance + 10 WHERE id = recipient_id;`.',
      whyItBreaks: [
        'Race conditions and lost updates: Concurrent payments read stale balances and overwrite each other, causing negative balances or vanished money.',
        'Zero audit trail: Modifying a single `balance` number makes it impossible to prove where money came from or audit past transactions.',
        'Network retry duplicate charges: If the client times out on a slow network and retries, the user is charged twice.',
        'Non-atomic split: If the second `UPDATE` fails due to a network glitch, money disappears into thin air.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Immutable Double-Entry Ledger',
        purpose: 'Every transaction consists of at least two balanced entries (Debit and Credit) where total debits equal total credits.',
        timeComplexity: 'O(1) append-only insert',
        spaceComplexity: 'Append-only historical records (never UPDATED or DELETED)',
        asciiDiagram: 'Transaction #101: [Debit: Customer Cash Account -$50.00] <==Balances==> [Credit: Merchant Revenue +$50.00]',
      },
      {
        name: 'Distributed Idempotency Key Filter',
        purpose: 'Deduplicates retried client requests using unique client-provided UUID keys in Redis/PostgreSQL.',
        timeComplexity: 'O(1) lookup & reservation',
        spaceComplexity: 'Stored with 24-hour expiration TTL',
      },
      {
        name: 'Distributed Saga Orchestrator',
        purpose: 'Coordinates multi-step financial workflows (Hold -> Card Authorization -> Settle -> Ledger Post) with automated compensation.',
        timeComplexity: 'O(1) state transitions',
        spaceComplexity: 'PostgreSQL durable state machine log',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Immutable Double-Entry Ledger Schema',
        subtitle: 'The 500-year-old accounting principle powering global finance',
        concept:
          'Never use a mutable `balance` column. A user\'s balance is the sum of all their past immutable ledger entries. Every transaction MUST have equal debits and credits.',
        language: 'sql',
        fileName: 'double_entry_ledger.sql',
        codeSnippet: `-- Double-Entry Accounting Schema
CREATE TABLE ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES ledger_transactions(id),
    account_id UUID NOT NULL,
    direction VARCHAR(8) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invariant Check: Sum(Debits) MUST equal Sum(Credits) for every transaction
CREATE OR REPLACE FUNCTION verify_transaction_balance() RETURNS TRIGGER AS $$
DECLARE
    debit_sum BIGINT;
    credit_sum BIGINT;
BEGIN
    SELECT COALESCE(SUM(amount_cents), 0) INTO debit_sum FROM ledger_entries WHERE transaction_id = NEW.transaction_id AND direction = 'DEBIT';
    SELECT COALESCE(SUM(amount_cents), 0) INTO credit_sum FROM ledger_entries WHERE transaction_id = NEW.transaction_id AND direction = 'CREDIT';
    
    IF debit_sum <> credit_sum THEN
        RAISE EXCEPTION 'Financial invariant violated: Debits (%) do not equal Credits (%)', debit_sum, credit_sum;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`,
        explanation:
          'Financial audits can verify the entire company\'s books at any historical timestamp simply by summing immutable ledger entries.',
        keyTakeaway: 'Balances are never mutated in place; they are computed by aggregating immutable append-only ledger entries.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Idempotency Key Gateway Filter',
        subtitle: 'Preventing duplicate charges on network timeouts',
        concept:
          'Clients supply a unique `Idempotency-Key` header with payment requests. If the network drops and the client retries, the server recognizes the key and returns the exact same cached response without charging twice.',
        language: 'go',
        fileName: 'idempotency_filter.go',
        codeSnippet: `package main

import (
	"context"
	"net/http"
	"time"
)

func (gw *PaymentGateway) IdempotentExecute(w http.ResponseWriter, r *http.Request) {
	idempKey := r.Header.Get("Idempotency-Key")
	if idempKey == "" {
		http.Error(w, "Idempotency-Key header required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	lockKey := "idemp:" + idempKey

	// 1. Try to acquire atomic lock in Redis
	success, err := gw.rdb.SetNX(ctx, lockKey, "IN_PROGRESS", 2*time.Minute).Result()
	if !success {
		// Key exists: Check if transaction has already completed
		cachedResponse, _ := gw.db.GetIdempotentResponse(ctx, idempKey)
		if cachedResponse != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(cachedResponse.StatusCode)
			w.Write(cachedResponse.Body)
			return
		}
		// Still in progress: Ask client to wait
		http.Error(w, "Conflict: Transaction already processing", http.StatusConflict)
		return
	}

	// 2. Execute payment workflow
	resp, err := gw.processCharge(ctx, r)
	
	// 3. Store response payload linked to idempotency key
	gw.db.SaveIdempotentResponse(ctx, idempKey, resp)
}`,
        explanation:
          'SetNX acts as a distributed lock while the payment processes, and subsequent duplicate calls receive the cached response directly.',
        keyTakeaway: 'Idempotency keys are mandatory for all non-safe HTTP methods in banking and fintech APIs.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Distributed Saga Payment Orchestration',
        subtitle: 'Coordinating multi-service transactions with compensating actions',
        concept:
          'Payments span multiple independent systems (User Account -> Visa/Mastercard Acquirer -> Fraud Engine -> Merchant Ledger). We use the Saga Pattern to orchestrate steps with automated compensating rollbacks if any step fails.',
        language: 'go',
        fileName: 'saga_orchestrator.go',
        codeSnippet: `package main

type PaymentSaga struct {
	PaymentID string
	Amount    int64
	State     string
}

func (s *PaymentSaga) Execute() error {
	// Step 1: Place Hold on Customer Account
	if err := accountService.HoldFunds(s.PaymentID, s.Amount); err != nil {
		s.State = "FAILED"
		return err
	}

	// Step 2: Authorize with Bank Card Acquirer (Stripe / Visa)
	authCode, err := bankAcquirer.AuthorizeCard(s.PaymentID, s.Amount)
	if err != nil {
		// Compensation: Release customer hold
		accountService.ReleaseHold(s.PaymentID)
		s.State = "CARD_DECLINED"
		return err
	}

	// Step 3: Record Immutable Ledger Entries
	if err := ledgerService.RecordDoubleEntry(s.PaymentID, s.Amount); err != nil {
		// Compensation: Refund card transaction
		bankAcquirer.Refund(authCode)
		accountService.ReleaseHold(s.PaymentID)
		s.State = "LEDGER_FAILED"
		return err
	}

	s.State = "SETTLED"
	return nil
}`,
        explanation:
          'If the ledger write fails after card authorization, the orchestrator triggers the compensating refund step to ensure zero orphaned charges.',
        keyTakeaway: 'Two-Phase Commit (2PC) does not work across third-party banking APIs. Sagas with compensating actions are the gold standard.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Banking Network Timeout During Card Authorization',
        impact: 'Server sends $500 charge to Visa, but the connection drops before receiving the response. Did Visa process the charge or not?',
        mitigationCodeOrStrategy:
          'Never retry blindly! Send a status inquiry query using the original payment reference. If still ambiguous, trigger automatic void/reversal before notifying the user.',
      },
      {
        incident: 'Split-Brain Concurrency Race on User Balance',
        impact: 'Two requests arrive in the exact same millisecond trying to spend the same $100.',
        mitigationCodeOrStrategy:
          'Optimistic Locking with version checks in PostgreSQL: `WHERE id = $1 AND version = $2` or row-level `SELECT ... FOR UPDATE` during the funds check.',
      },
    ],
    faangInterviewTips: [
      'Emphasize Double-Entry Bookkeeping: Never use a single balance column; money cannot be created or destroyed, only moved between accounts.',
      'Explain Idempotency Keys: Explain how Redis `SetNX` prevents race conditions when clients retry after network drops.',
    ],
  },

  'snowflake-id': {
    problemStatement:
      'Design a distributed unique ID generator (like Twitter Snowflake) capable of generating 100,000+ unique, 64-bit, monotonically increasing, roughly time-sorted integer IDs per second across hundreds of independent worker machines without central database coordination.',
    naiveApproach: {
      description:
        'A centralized MySQL database table with an `AUTO_INCREMENT` column or a single Redis instance with `INCR id`. Every microservice makes an RPC call to fetch the next sequential ID.',
      whyItBreaks: [
        'Single point of failure: If the database or Redis server goes down, all microservices across the company are blocked from creating records.',
        'Network latency bottleneck: Fetching an ID requires a network roundtrip (2-5ms), making it impossible to generate millions of IDs per second.',
        'Throughput ceiling: A single database server caps at ~5,000-10,000 auto-increment writes/second.',
        'UUIDv4 fragmentation: Using random 128-bit UUIDs (e.g. `c7b94998-...`) ruins B-Tree database indexing performance due to random page splits.',
      ],
    },
    coreDataStructures: [
      {
        name: '64-bit Bitfield Layout',
        purpose: 'Combines timestamp, worker ID, and per-millisecond sequence into a single 64-bit integer.',
        timeComplexity: 'O(1) bitwise shift and OR operations (sub-microsecond)',
        spaceComplexity: '8 bytes per ID',
        asciiDiagram: '[1b Unused 0] | [41b Timestamp (ms)] | [10b Worker Machine ID] | [12b Sequence Counter]',
      },
      {
        name: 'Atomic Compare-And-Swap (CAS) Mutex',
        purpose: 'Synchronizes concurrent goroutines/threads on the same physical machine.',
        timeComplexity: 'O(1) memory barrier',
        spaceComplexity: 'Zero heap allocations',
      },
      {
        name: 'ZooKeeper / Etcd Dynamic Worker Lease',
        purpose: 'Allocates unique 10-bit worker IDs (0 to 1,023) to server instances on boot to prevent collisions.',
        timeComplexity: 'O(1) on startup',
        spaceComplexity: 'Ephemeral sequential node in ZooKeeper',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: 64-bit Bitfield Bit-Shift Math',
        subtitle: 'Packing timestamp, machine ID, and sequence into 64 bits',
        concept:
          'A 64-bit integer (`uint64`) is divided into 4 segments: 1 unused sign bit (always 0), 41 bits of millisecond timestamp (gives 69 years of life from custom epoch), 10 bits of worker ID (supports 1,024 worker nodes), and 12 bits of sequence (allows 4,096 unique IDs per millisecond per worker).',
        language: 'go',
        fileName: 'snowflake.go',
        codeSnippet: `package main

import (
	"errors"
	"sync"
	"time"
)

const (
	epoch             = int64(1704067200000) // Custom epoch: 2024-01-01 00:00:00 UTC
	workerBits        = uint(10)             // Max 1024 workers (0-1023)
	sequenceBits      = uint(12)             // Max 4096 IDs per ms (0-4095)
	workerShift       = sequenceBits         // 12
	timestampShift    = sequenceBits + workerBits // 22
	maxWorkerId       = int64(-1 ^ (-1 << workerBits))
	maxSequence       = int64(-1 ^ (-1 << sequenceBits))
)

type SnowflakeGenerator struct {
	mu           sync.Mutex
	workerId     int64
	lastTimestamp int64
	sequence     int64
}

func NewSnowflakeGenerator(workerId int64) (*SnowflakeGenerator, error) {
	if workerId < 0 || workerId > maxWorkerId {
		return nil, errors.New("worker ID out of range (0-1023)")
	}
	return &SnowflakeGenerator{workerId: workerId}, nil
}`,
        explanation:
          'Bit shifts are executed at CPU register speed with zero allocations, generating an ID in under 15 nanoseconds.',
        keyTakeaway: 'The 41-bit timestamp prefix guarantees that IDs are roughly monotonically increasing, which keeps database B-Tree index insertions purely sequential.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Sequence Increment & Millisecond Overflow Handling',
        subtitle: 'Generating up to 4,096 IDs within the exact same millisecond',
        concept:
          'If multiple requests arrive in the exact same millisecond, the 12-bit sequence counter increments. If the sequence exhausts its 4,096 capacity within 1 millisecond, the generator spins until the clock advances.',
        language: 'go',
        fileName: 'next_id.go',
        codeSnippet: `package main

func (g *SnowflakeGenerator) NextID() (int64, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	now := time.Now().UnixMilli()

	// Clock rollback check
	if now < g.lastTimestamp {
		return 0, errors.New("clock moved backwards: refusing to generate ID")
	}

	if now == g.lastTimestamp {
		// Same millisecond: increment sequence
		g.sequence = (g.sequence + 1) & maxSequence
		if g.sequence == 0 {
			// Sequence exhausted (4096 IDs in 1 ms): spin wait for next millisecond
			for now <= g.lastTimestamp {
				now = time.Now().UnixMilli()
			}
		}
	} else {
		// New millisecond: reset sequence counter to 0
		g.sequence = 0
	}

	g.lastTimestamp = now

	// Pack bits: (timestamp << 22) | (workerId << 12) | sequence
	id := ((now - epoch) << timestampShift) | (g.workerId << workerShift) | g.sequence
	return id, nil
}`,
        explanation:
          'The bitwise OR operation merges the 3 numbers into a single 64-bit integer that fits cleanly into a standard SQL `BIGINT`.',
        keyTakeaway: 'A single worker node can generate up to 4,096,000 IDs per second without any network hops.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: NTP Clock Drift & Rollback Protection',
        subtitle: 'Handling server time adjustments without generating duplicate IDs',
        concept:
          'Network Time Protocol (NTP) periodically adjusts server clocks. If the clock jumps backwards, naive generators generate duplicate IDs.',
        language: 'go',
        fileName: 'clock_guard.go',
        codeSnippet: `package main

import "time"

func (g *SnowflakeGenerator) safeGetTimestamp(now int64) (int64, error) {
	if now < g.lastTimestamp {
		offset := g.lastTimestamp - now
		if offset <= 5 {
			// Small drift (<= 5ms): sleep for 2x the offset to catch up
			time.Sleep(time.Duration(offset*2) * time.Millisecond)
			now = time.Now().UnixMilli()
		} else {
			// Severe clock rollback: refuse generation and raise alert
			return 0, errors.New("severe NTP clock skew detected")
		}
	}
	return now, nil
}`,
        explanation:
          'Sleeping briefly allows minor clock synchronization jitters to pass without throwing errors to clients.',
        keyTakeaway: 'Always configure production servers with slewing NTP (`chrony` with `makestep 0`) so clocks are smoothly throttled rather than jumping backwards.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Duplicate Worker ID Assigned to Two Machines',
        impact: 'Due to a configuration bug, two worker servers share Worker ID #42, causing identical IDs to be generated concurrently.',
        mitigationCodeOrStrategy:
          'Use ZooKeeper or Consul Ephemeral Nodes: on boot, each server acquires a sequential ephemeral node lock `workers/{id}` that automatically releases on machine crash.',
      },
      {
        incident: 'Leap Second Clock Jump',
        impact: 'Operating system inserts a leap second, repeating the previous 1,000 milliseconds.',
        mitigationCodeOrStrategy:
          'Clock drift guard detects `now < lastTimestamp` and spin-waits until the leap second interval passes.',
      },
    ],
    faangInterviewTips: [
      'Compare Snowflake vs UUIDv4: UUIDv4 is 128 bits and completely random, destroying B-Tree index caching; Snowflake is 64 bits and time-sorted.',
      'Explain the Bit Allocation: 1 bit sign, 41 bits timestamp ($2^{41} \\approx 69$ years), 10 bits worker (1024 nodes), 12 bits sequence (4096 IDs/ms).',
      'Explain Clock Rollback: Mentioning NTP clock skew and how to handle it proves production seniority.',
    ],
  },

  'consistent-hash': {
    problemStatement:
      'Design a dynamic Consistent Hashing Ring with Virtual Nodes (like Chord, Apache Cassandra, or Amazon Dynamo) that maps millions of keys across hundreds of storage nodes, achieves uniform distribution (standard deviation < 5%), and relocates only K/N keys when nodes join or leave.',
    naiveApproach: {
      description:
        'Modulo hashing: `target_node = hash(key) % N` where N is the number of active server nodes.',
      whyItBreaks: [
        'Massive cache wipeout: When 1 node is added or removed, N changes to N+1 or N-1. Almost 100% of keys are remapped to different servers.',
        'Database meltdown: Losing 1 cache node wipes out 99% of the cache, causing all traffic to hit the primary database at once.',
        'Non-uniform distribution: Basic physical nodes on a hash circle create massive clustering hot spots where 1 node receives 80% of all traffic.',
      ],
    },
    coreDataStructures: [
      {
        name: '32-bit Identifier Hash Ring',
        purpose: 'Maps both server nodes and data keys to a circular 0 to 2^32-1 integer ring.',
        timeComplexity: 'O(log V) binary search to find target node',
        spaceComplexity: 'Sorted slice of 32-bit integers',
        asciiDiagram: 'Ring [0 ... 2^32-1]: Node A (vnode#1) -> Node B (vnode#1) -> Node A (vnode#2) -> Node C (vnode#1)',
      },
      {
        name: 'Virtual Nodes (vnodes)',
        purpose: 'Assigns 100-256 virtual positions on the ring per physical node to ensure uniform statistical distribution.',
        timeComplexity: 'O(1) memory lookup',
        spaceComplexity: '200 uint32 entries per physical node',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Hash Ring Memory Layout & Virtual Nodes',
        subtitle: 'Why virtual nodes eliminate load imbalance',
        concept:
          'Without virtual nodes, servers end up spaced unevenly on the circle. By assigning 200 virtual nodes (e.g. `node-A#0`, `node-A#1` ... `node-A#199`) per physical machine, key distribution follows the Central Limit Theorem with standard deviation < 5%.',
        language: 'go',
        fileName: 'hash_ring.go',
        codeSnippet: `package main

import (
	"fmt"
	"hash/crc32"
	"sort"
	"strconv"
	"sync"
)

type ConsistentHashRing struct {
	mu       sync.RWMutex
	vnodes   int               // Virtual nodes per physical server (e.g. 200)
	ring     []uint32          // Sorted array of hash positions
	nodeMap  map[uint32]string // Maps vnode hash position -> physical node ID
}

func NewConsistentHashRing(vnodes int) *ConsistentHashRing {
	return &ConsistentHashRing{
		vnodes:  vnodes,
		ring:    make([]uint32, 0),
		nodeMap: make(map[uint32]string),
	}
}

func (h *ConsistentHashRing) AddNode(nodeId string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for i := 0; i < h.vnodes; i++ {
		vnodeName := nodeId + "#" + strconv.Itoa(i)
		hash := crc32.ChecksumIEEE([]byte(vnodeName))
		h.ring = append(h.ring, hash)
		h.nodeMap[hash] = nodeId
	}
	// Sort ring positions for binary search
	sort.Slice(h.ring, func(i, j int) bool { return h.ring[i] < h.ring[j] })
}`,
        explanation:
          'Virtual nodes interleave physical servers smoothly around the 32-bit ring circumference.',
        keyTakeaway: 'The central limit theorem proves that standard deviation $\\sigma \\approx 1 / \\sqrt{V}$. For $V=200$ vnodes, load disparity between nodes is under 7%.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Binary Search Clockwise Node Traversal',
        subtitle: 'Locating the target storage node in O(log V) microsecond time',
        concept:
          'To locate which server owns a key, hash the key to a 32-bit integer and search for the first node position greater than or equal to the key hash (clockwise traversal). If the key hash is greater than all positions, wrap around to index 0.',
        language: 'go',
        fileName: 'lookup.go',
        codeSnippet: `package main

func (h *ConsistentHashRing) GetNode(key string) string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if len(h.ring) == 0 {
		return ""
	}

	keyHash := crc32.ChecksumIEEE([]byte(key))

	// Binary search for first node >= keyHash
	idx := sort.Search(len(h.ring), func(i int) bool {
		return h.ring[i] >= keyHash
	})

	// Wrap around to index 0 if keyHash is past the last vnode
	if idx == len(h.ring) {
		idx = 0
	}

	return h.nodeMap[h.ring[idx]]
}`,
        explanation:
          'Binary search on 2,000 vnodes takes ~11 iterations, locating the target server in under 0.5 microseconds.',
        keyTakeaway: 'When a new physical node joins, only $K / (N + 1)$ keys relocate, while all other keys remain unaffected.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Multi-Node Replication (N-Way Overlap)',
        subtitle: 'High availability: replicating keys to the next N unique physical nodes',
        concept:
          'In production systems like Dynamo or Cassandra, data is replicated to N distinct physical servers. The coordinator traverses clockwise and collects the first N distinct physical nodes.',
        language: 'go',
        fileName: 'replicas.go',
        codeSnippet: `package main

func (h *ConsistentHashRing) GetReplicationNodes(key string, n int) []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	keyHash := crc32.ChecksumIEEE([]byte(key))
	idx := sort.Search(len(h.ring), func(i int) bool { return h.ring[i] >= keyHash })

	nodes := make([]string, 0, n)
	seen := make(map[string]bool)

	for i := 0; i < len(h.ring) && len(nodes) < n; i++ {
		curIdx := (idx + i) % len(h.ring)
		physicalNode := h.nodeMap[h.ring[curIdx]]
		if !seen[physicalNode] {
			seen[physicalNode] = true
			nodes = append(nodes, physicalNode)
		}
	}
	return nodes
}`,
        explanation:
          'Ensures replicas are placed on distinct physical machines, surviving individual server crashes without data loss.',
        keyTakeaway: 'Traversing the ring clockwise collects the preference list of physical nodes for quorum replication.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Cascading Cache Overload on Node Failure',
        impact: 'A node crashes; in naive modulo hashing, all keys remap and the entire cache is invalidated simultaneously.',
        mitigationCodeOrStrategy:
          'Consistent Hashing guarantees that only the keys owned by the crashed node relocate to its clockwise neighbor; 100% of other cached keys remain intact.',
      },
      {
        incident: 'Virtual Node Hash Collision',
        impact: 'Two different vnodes hash to the exact same 32-bit integer on the ring.',
        mitigationCodeOrStrategy:
          'Collision resolution: Use 64-bit or 128-bit MurmurHash3 / MD5, or detect duplicate hash values and increment by 1.',
      },
    ],
    faangInterviewTips: [
      'Contrast Modulo Hashing vs Consistent Hashing: Modulo invalidates $O(K)$ keys on node churn; Consistent Hashing invalidates only $K / N$ keys.',
      'Explain Virtual Nodes: Why are they necessary? Without vnodes, physical nodes are distributed unevenly, creating severe hot spots.',
      'Explain the Binary Search: Time complexity is $O(\\log V)$ where $V = N \\times vnodes$.',
    ],
  },

  'dynamo-kv': {
    problemStatement:
      'Design an eventually consistent, highly available distributed key-value store (like Amazon Dynamo or Apache Cassandra) that guarantees sub-5ms write latency, survives datacenter network partitions, and resolves concurrent write conflicts.',
    naiveApproach: {
      description:
        'A master-replica key-value store with synchronous 2-Phase Commit (2PC) or strict Raft consensus. Every write must be acknowledged by all replicas before returning OK.',
      whyItBreaks: [
        'Availability collapse: Under CAP theorem, CP systems block all writes during network partitions. Amazon calculated that blocking checkout writes costs millions per second.',
        'High p99 write latency: Synchronous consensus waits for the slowest replica, causing latency spikes when one disk or network is congested.',
        'Single master bottleneck: All writes must serialize through a single leader node.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Configurable Sloppy Quorum (N, R, W)',
        purpose: 'Parameters where N = replica count, R = read quorum, W = write quorum. Setting R + W > N guarantees overlap.',
        timeComplexity: 'O(1) quorum collection',
        spaceComplexity: 'N copies across ring nodes',
        asciiDiagram: 'Client Write -> Coordinator -> (Node 1 OK, Node 2 OK) -> W=2 reached! Respond OK to Client.',
      },
      {
        name: 'Vector Clocks',
        purpose: 'Tracks causal history across distributed nodes to detect concurrent branching conflicts.',
        timeComplexity: 'O(V) comparison where V is number of active nodes',
        spaceComplexity: 'Map<nodeId, counter> stored with object metadata',
      },
      {
        name: 'Merkle Tree (Hash Tree)',
        purpose: 'Binary tree of cryptographic hashes used for fast background anti-entropy synchronization.',
        timeComplexity: 'O(log M) branch comparison',
        spaceComplexity: 'Compact tree representation per key range',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Sloppy Quorum Write Pipeline',
        subtitle: 'Why R + W > N guarantees strong eventual consistency',
        concept:
          'For $N=3$ replicas, we set $W=2$ and $R=2$. Because $R + W = 4 > 3$, at least one node in any read quorum is guaranteed to contain the latest write by the Pigeonhole Principle.',
        language: 'go',
        fileName: 'quorum_coordinator.go',
        codeSnippet: `package main

import (
	"context"
	"errors"
	"sync"
	"time"
)

type QuorumCoordinator struct {
	N int // Total replicas (e.g. 3)
	W int // Write quorum (e.g. 2)
	R int // Read quorum (e.g. 2)
}

func (q *QuorumCoordinator) Put(ctx context.Context, key string, val []byte) error {
	replicas := ring.GetReplicationNodes(key, q.N)

	var wg sync.WaitGroup
	successChan := make(chan bool, q.N)

	for _, node := range replicas {
		wg.Add(1)
		go func(nodeAddr string) {
			defer wg.Done()
			err := sendRPCWrite(nodeAddr, key, val)
			if err == nil {
				successChan <- true
			}
		}(node)
	}

	// Collect W successful acks
	acks := 0
	timeout := time.After(50 * time.Millisecond)

	for acks < q.W {
		select {
		case <-successChan:
			acks++
		case <-timeout:
			return errors.New("write quorum timeout (W not reached)")
		}
	}
	return nil // Write succeeded
}`,
        explanation:
          'The client receives success as soon as 2 out of 3 replicas respond, masking the latency of any single lagging node.',
        keyTakeaway: 'Sloppy quorums allow Dynamo to meet strict sub-5ms write SLAs even during hardware hiccups.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Vector Clocks & Conflict Detection',
        subtitle: 'Detecting causal ordering vs concurrent conflict branches',
        concept:
          'Because network partitions allow concurrent writes on different nodes, vector clocks capture the lineage of every update. If neither clock dominates the other, a conflict exists (e.g. shopping cart branching).',
        language: 'go',
        fileName: 'vector_clock.go',
        codeSnippet: `package main

type VectorClock map[string]uint64 // nodeId -> sequence counter

// Compare returns 1 if v dominates w, -1 if w dominates v, 0 if concurrent conflict
func (v VectorClock) Compare(w VectorClock) int {
	vGreater := false
	wGreater := false

	allKeys := make(map[string]bool)
	for k := range v { allKeys[k] = true }
	for k := range w { allKeys[k] = true }

	for k := range allKeys {
		vCount := v[k]
		wCount := w[k]
		if vCount > wCount { vGreater = true }
		if wCount > vCount { wGreater = true }
	}

	if vGreater && !wGreater { return 1 }  // v is descendant of w
	if wGreater && !vGreater { return -1 } // w is descendant of v
	return 0 // Concurrent conflict! Both versions must be returned as siblings
}`,
        explanation:
          'When conflict occurs (return 0), the system preserves both versions as "siblings" and lets client application logic merge them (e.g. union of shopping cart items).',
        keyTakeaway: 'Never silently overwrite data with Last-Write-Wins (LWW) based on wall-clock timestamps; clocks drift and lose data.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Hinted Handoff for Partitioned Nodes',
        subtitle: 'Writing to temporary surrogate nodes during network outages',
        concept:
          'If primary node Node A is unreachable during a write, the coordinator writes the record to surrogate Node D with a hint: "Deliver to Node A when it revives".',
        language: 'go',
        fileName: 'hinted_handoff.go',
        codeSnippet: `package main

type HintedMessage struct {
	TargetNode string
	Key        string
	Value      []byte
	Clock      VectorClock
}

func (s *SurrogateNode) StoreHint(hint HintedMessage) {
	// Store locally in temporary hinted handoff directory
	s.localQueue.Append(hint)
}

func (s *SurrogateNode) BackgroundHandoffWorker() {
	for hint := range s.localQueue.Poll() {
		if pingNode(hint.TargetNode) {
			// Target node is back online: deliver data and delete local hint
			sendRPCWrite(hint.TargetNode, hint.Key, hint.Value)
			s.localQueue.Delete(hint)
		}
	}
}`,
        explanation:
          'Hinted handoff keeps the system 100% available for writes even when primary storage servers are temporarily down.',
        keyTakeaway: 'Hinted handoff guarantees high write availability (AP system) at the cost of temporary read lag.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Datacenter Split-Brain Network Partition',
        impact: 'East Coast and West Coast nodes cannot communicate; users on both coasts write to the same key simultaneously.',
        mitigationCodeOrStrategy:
          'Vector Clocks record concurrent lineages; upon reconnection, anti-entropy sync merges histories and returns both versions as siblings for application reconciliation.',
      },
      {
        incident: 'Hinted Handoff Buffer Disk Saturation',
        impact: 'A dead node stays down for 3 days; surviving nodes accumulate gigabytes of hints until local disks fill up.',
        mitigationCodeOrStrategy:
          'Set a strict hinted handoff retention limit (e.g. 3 hours). After 3 hours, hints are dropped and the node relies on Merkle Tree background sync when it revives.',
      },
    ],
    faangInterviewTips: [
      'Explain the Tradeoff: Dynamo chose AP (Availability & Partition Tolerance) over CP (Consistency) to guarantee shopping carts never fail.',
      'Explain $R + W > N$: Why does this formula guarantee you read the latest value? Pigeonhole Principle overlap.',
      'Explain Vector Clocks: How they detect concurrent writes and why Last-Write-Wins (LWW) is unsafe with wall clocks.',
    ],
  },

  'flash-sale': {
    problemStatement:
      'Design an e-commerce high-concurrency flash sale and inventory reservation system (like Amazon Prime Day, Taobao, or Ticketmaster) capable of selling 1,000 limited inventory items to 1,000,000 concurrent users at 10:00:00.000 AM with zero overselling, zero phantom reservations, and sub-50ms user responses.',
    naiveApproach: {
      description:
        'When a user clicks "Buy Now", run: `SELECT stock FROM products WHERE id = 1;` followed by `UPDATE products SET stock = stock - 1 WHERE id = 1;` in a relational database transaction.',
      whyItBreaks: [
        'Catastrophic overselling: 10,000 concurrent requests read `stock = 1` simultaneously, all 10,000 decrement it, resulting in negative stock (-9,999) and massive financial liability.',
        'Row lock deadlock: Even with `SELECT FOR UPDATE`, 1,000,000 threads queue up on a single database row, creating thread pool exhaustion and total database crash.',
        'Network bandwidth collapse: 1,000,000 simultaneous page refreshes flood the web server and crash SSL termination layers.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Redis In-Memory Atomic Stock Counter (DECR)',
        purpose: 'Executes atomic stock reservation in sub-millisecond time without database locking.',
        timeComplexity: 'O(1) atomic decrement',
        spaceComplexity: '8 bytes per product in RAM',
        asciiDiagram: '1,000,000 Users -> [Token Bucket Admission Gate] -> [Redis Lua Atomic DECR] -> 1,000 Winners -> [Kafka Order Queue]',
      },
      {
        name: 'Token Bucket Admission Gatekeeper',
        purpose: 'Drops 99% of excess incoming traffic at the edge before it touches the core inventory cluster.',
        timeComplexity: 'O(1) filter',
        spaceComplexity: 'Zero state',
      },
      {
        name: 'Asynchronous Order Creation Kafka Queue',
        purpose: 'Buffers successful stock reservations for slow database settlement.',
        timeComplexity: 'O(1) append',
        spaceComplexity: 'Bounded Kafka topic backlog',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Inventory Pre-Warming in Memory',
        subtitle: 'Decoupling the flash sale critical path from the relational database',
        concept:
          '10 minutes before the sale starts, inventory is loaded from PostgreSQL into a Redis cluster. During the sale, 0 database queries are executed for stock deduction.',
        language: 'go',
        fileName: 'prewarm.go',
        codeSnippet: `package main

import (
	"context"
	"fmt"
	"time"
)

func (s *FlashSaleService) PreWarmInventory(productId string, stock int) error {
	ctx := context.Background()
	// Set initial stock in Redis
	stockKey := fmt.Sprintf("flash:stock:%s", productId)
	if err := s.rdb.Set(ctx, stockKey, stock, 24*time.Hour).Err(); err != nil {
		return err
	}

	// Create user reservation set to enforce 1 item per user
	usersKey := fmt.Sprintf("flash:users:%s", productId)
	s.rdb.Del(ctx, usersKey)
	return nil
}`,
        explanation:
          'Pre-warming shifts all inventory contention from slow disk I/O into in-memory operations executing at 150,000 ops/second per core.',
        keyTakeaway: 'The primary relational database should only record settled orders, never handle the live flash sale reservation traffic.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Atomic Lua Stock Deduction Script',
        subtitle: 'Enforcing single-purchase limits and zero overselling in 1 atomic roundtrip',
        concept:
          'A single Redis Lua script verifies user eligibility, checks stock > 0, reserves 1 item, and records the user ID atomically.',
        language: 'lua',
        fileName: 'reserve_stock.lua',
        codeSnippet: `-- KEYS[1]: stock key (e.g. "flash:stock:item_101")
-- KEYS[2]: users set (e.g. "flash:users:item_101")
-- ARGV[1]: user_id

local stock_key = KEYS[1]
local users_key = KEYS[2]
local user_id = ARGV[1]

-- 1. Check if user already purchased (limit 1 per customer)
if redis.call("SISMEMBER", users_key, user_id) == 1 then
    return -1 -- Error: User already purchased
end

-- 2. Check remaining stock
local current_stock = tonumber(redis.call("GET", stock_key))
if not current_stock or current_stock <= 0 then
    return 0 -- Error: Sold out!
end

-- 3. Atomically decrement stock and record buyer
redis.call("DECR", stock_key)
redis.call("SADD", users_key, user_id)
return 1 -- Success: Reserved successfully!`,
        explanation:
          'Because Redis executes Lua scripts in a single thread, race conditions are mathematically impossible. Exactly 1,000 reservations succeed.',
        keyTakeaway: 'Redis Lua eliminates the need for expensive distributed locks (Redlock) while guaranteeing zero overselling.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Asynchronous Kafka Order Settlement',
        subtitle: 'Decoupling user instant confirmation from slow payment processing',
        concept:
          'The 1,000 successful users receive an instant "Item Reserved! Complete payment in 15 minutes" confirmation. An order message is published to Kafka for async database creation.',
        language: 'go',
        fileName: 'order_producer.go',
        codeSnippet: `package main

type OrderReserveMessage struct {
	ProductID string \`json:"product_id"\`
	UserID    string \`json:"user_id"\`
	ReserveAt int64  \`json:"reserve_at"\`
	ExpiresAt int64  \`json:"expires_at"\`
}

func (s *FlashSaleService) ProcessReservation(userId, productId string) (bool, string) {
	res, _ := s.rdb.Eval(ctx, luaScript, []string{stockKey, usersKey}, userId).Int()
	if res == -1 {
		return false, "You have already participated in this sale."
	}
	if res == 0 {
		return false, "Sale ended: All items sold out!"
	}

	// Publish to Kafka: order worker will create DB record and invoice
	s.kafkaWriter.WriteMessages(ctx, kafka.Message{
		Key:   []byte(userId),
		Value: serialize(OrderReserveMessage{ProductID: productId, UserID: userId}),
	})
	return true, "Reservation successful! Please proceed to checkout."
}`,
        explanation:
          'Consumers pull from Kafka at a smooth, controlled rate of 200 orders/sec, inserting into PostgreSQL without overwhelming database connection limits.',
        keyTakeaway: 'Kafka buffers the write peak, flattening a 50,000 QPS flash spike into a smooth 200 QPS database ingestion pipeline.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'User Abandons Cart / Fails to Pay within 15 Minutes',
        impact: 'Reserved inventory is locked up by abandoned carts, preventing genuine buyers from purchasing remaining stock.',
        mitigationCodeOrStrategy:
          'Delayed Message / Redis TTL Expiration: A 15-minute delayed job checks payment status; if unpaid, it atomically increments Redis stock (`INCR`) and removes user from the reservation set.',
      },
      {
        incident: 'Flash Sale Botnet Attack (Scripted Clicks)',
        impact: 'Automated scraping bots click "Buy" at microsecond speed, buying out all inventory before humans can click.',
        mitigationCodeOrStrategy:
          'Dynamic CAPTCHA and Dynamic URL Hashing: The checkout endpoint URL is obfuscated with a one-time cryptographic hash generated 5 seconds before the sale starts.',
      },
    ],
    faangInterviewTips: [
      'Explain why database transactions fail: Emphasize that row-level locking on a single record causes queue serialization that crashes connection pools.',
      'Explain Redis Lua scripts: Why Lua over Redis transactions (MULTI/EXEC)? Lua supports conditional branches (`if stock <= 0 then return 0`) in a single roundtrip.',
      'Explain Asynchronous Order Settlement: Instant reservation in Redis + deferred durable persistence via Kafka.',
    ],
  },

  'youtube-stream': {
    problemStatement:
      'Design a global video streaming platform (like YouTube or Netflix) capable of ingesting raw multi-gigabyte video uploads, encoding them across multiple resolutions (1080p, 720p, 480p, 360p) with H.264/AV1 codecs, segmenting them into 4-second HLS/DASH TS chunks, and delivering them with sub-100ms startup latency via CDN edge caches.',
    naiveApproach: {
      description:
        'Store the original raw MP4 file on a single web server or monolithic S3 bucket. Have viewer web browsers download the raw 2GB MP4 directly using basic HTTP Range headers.',
      whyItBreaks: [
        'Massive buffering and bandwidth waste: Mobile clients choke downloading 1080p raw bitstreams on fluctuating networks without adaptive bitrate switching.',
        'Origin bandwidth saturation: 10,000 concurrent viewers streaming a 2GB file simultaneously demand 20 Terabits/sec egress, immediately collapsing origin servers.',
        'Encoding queue starvation: Transcoding a 2-hour 4K video serially on a single CPU takes 6+ hours, blocking other creators from publishing.',
        'No adaptive bitrate switching: When a user network drops from 4G to 3G, the video freezes instead of seamlessly downgrading from 1080p to 720p mid-stream.',
      ],
    },
    coreDataStructures: [
      {
        name: 'HLS Master M3U8 Playlist Index',
        purpose: 'Maps video bitrates and resolutions to child media playlists for dynamic client player switching.',
        timeComplexity: 'O(1) playlist fetch',
        spaceComplexity: 'O(R) where R is count of resolution tiers (~1 KB per video)',
        asciiDiagram: 'Master M3U8 -> [1080p.m3u8, 720p.m3u8, 480p.m3u8] -> 4s Segments (.ts)',
      },
      {
        name: 'DAG Video Chunk Task Graph',
        purpose: 'Splits raw video into GOP (Group of Pictures) keyframe segments for distributed parallel worker encoding.',
        timeComplexity: 'O(1) per task dispatch',
        spaceComplexity: 'O(S) where S is segment count',
      },
      {
        name: 'CDN Edge Byte-Range Segment Cache',
        purpose: 'Caches hot 4-second video segments in RAM/NVMe at Point-of-Presence (POP) edge locations.',
        timeComplexity: 'O(1) edge retrieval',
        spaceComplexity: 'Bounded LRU memory pool (~100 TB across global POPs)',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Resumable Multipart Video Ingestion',
        subtitle: 'Uploading gigabytes reliably over unreliable networks',
        concept:
          'Mobile creators frequently lose connection. The Tus.io protocol breaks large videos into 8MB chunks, tracking byte offsets in Redis so uploads resume without re-sending completed bytes.',
        language: 'go',
        fileName: 'resumable_ingest.go',
        codeSnippet: `package main

import (
	"crypto/sha256"
	"fmt"
	"io"
)

type VideoUploadSession struct {
	UploadID    string
	TotalBytes  int64
	Offset      int64
	PartsCount  int
	Fingerprint string
}

func (s *VideoUploadSession) AppendChunk(chunk io.Reader, size int64, chunkHash string) error {
	hasher := sha256.New()
	tee := io.TeeReader(chunk, hasher)

	// Stream directly to temporary S3 staging multipart part
	err := uploadPartToS3(s.UploadID, s.PartsCount+1, tee, size)
	if err != nil {
		return fmt.Errorf("failed to upload S3 part: %w", err)
	}

	actualHash := fmt.Sprintf("%x", hasher.Sum(nil))
	if actualHash != chunkHash {
		return fmt.Errorf("checksum mismatch: expected %s, got %s", chunkHash, actualHash)
	}

	s.Offset += size
	s.PartsCount++
	return nil
}`,
        explanation:
          'Each 8MB chunk is streamed directly to object storage with SHA-256 verification and atomic offset tracking in Redis.',
        keyTakeaway: 'Never buffer full multi-gigabyte uploads in API server RAM; stream directly to object storage multipart upload endpoints.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Keyframe GOP Video Splitter',
        subtitle: 'Splitting video at I-frames for independent parallel transcoding',
        concept:
          'Videos cannot be split at arbitrary bytes. They must be split on I-Frames (Keyframes) where a full picture is stored. Parallel worker nodes can then transcode different segments simultaneously.',
        language: 'go',
        fileName: 'gop_splitter.go',
        codeSnippet: `package main

type VideoSegment struct {
	SegmentIndex int
	StartPTS     int64 // Presentation Timestamp
	DurationSec  float64
	S3InputKey   string
}

func PlanTranscodeDAG(totalDurationSec float64, targetChunkSec float64) []VideoSegment {
	var segments []VideoSegment
	chunkCount := int(totalDurationSec / targetChunkSec)
	for i := 0; i < chunkCount; i++ {
		segments = append(segments, VideoSegment{
			SegmentIndex: i,
			StartPTS:     int64(float64(i) * targetChunkSec * 90000), // 90kHz clock
			DurationSec:  targetChunkSec,
			S3InputKey:   fmt.Sprintf("raw/video_102/seg_%04d.ts", i),
		})
	}
	return segments
}`,
        explanation:
          'Generates a DAG of parallel tasks. A 2-hour movie is divided into 1,800 independent 4-second segments, allowing 100 Kubernetes workers to transcode the entire video in under 2 minutes.',
        keyTakeaway: 'Always align chunk boundaries with video I-frames (Keyframes) to prevent decoding glitches and visual distortion.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Distributed FFmpeg Transcoding Pipeline',
        subtitle: 'Encoding segments into 1080p, 720p, 480p with H.264 & AV1',
        concept:
          'Each worker runs FFmpeg with tuned CRF (Constant Rate Factor) and bitrate limits, generating .ts chunk files for each resolution profile.',
        language: 'typescript',
        fileName: 'transcodeWorker.ts',
        codeSnippet: `import { spawn } from 'child_process'

interface TranscodeProfile {
  name: string
  resolution: string
  videoBitrate: string
  audioBitrate: string
}

export const PROFILES: TranscodeProfile[] = [
  { name: '1080p', resolution: '1920x1080', videoBitrate: '4500k', audioBitrate: '192k' },
  { name: '720p',  resolution: '1280x720',  videoBitrate: '2200k', audioBitrate: '128k' },
  { name: '480p',  resolution: '854x480',   videoBitrate: '800k',  audioBitrate: '96k' },
]

export function buildFFmpegArgs(inputPath: string, profile: TranscodeProfile, outputPath: string): string[] {
  return [
    '-i', inputPath,
    '-vf', \`scale=\${profile.resolution}\`,
    '-c:v', 'libx264',
    '-b:v', profile.videoBitrate,
    '-maxrate', profile.videoBitrate,
    '-bufsize', '2M',
    '-c:a', 'aac',
    '-b:a', profile.audioBitrate,
    '-f', 'hls',
    '-hls_time', '4',
    '-hls_playlist_type', 'vod',
    outputPath
  ]
}`,
        explanation:
          'The worker scales the video to target resolutions, applies strict maximum bitrates, and outputs standards-compliant HLS segments.',
        keyTakeaway: 'Strictly constrain -maxrate and -bufsize to prevent mobile client buffers from overflowing or underflowing.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: Generating Master M3U8 Playlists',
        subtitle: 'The adaptive manifest that enables dynamic player switching',
        concept:
          'The player requests master.m3u8 first. As network speed changes, the player seamlessly jumps between child playlists without interrupting audio playback.',
        language: 'typescript',
        fileName: 'generateMasterPlaylist.ts',
        codeSnippet: `export function generateMasterM3U8(videoId: string): string {
  return [
    '#EXTM3U',
    '#EXT-X-VERSION:6',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    '',
    '# 1080p Full HD',
    '#EXT-X-STREAM-INF:BANDWIDTH=4800000,AVERAGE-BANDWIDTH=4500000,RESOLUTION=1920x1080,FRAME-RATE=60.000,CODECS="avc1.64002a,mp4a.40.2"',
    \`https://cdn.nexora.com/\${videoId}/1080p/index.m3u8\`,
    '',
    '# 720p HD',
    '#EXT-X-STREAM-INF:BANDWIDTH=2400000,AVERAGE-BANDWIDTH=2200000,RESOLUTION=1280x720,FRAME-RATE=30.000,CODECS="avc1.4d401f,mp4a.40.2"',
    \`https://cdn.nexora.com/\${videoId}/720p/index.m3u8\`,
    '',
    '# 480p SD',
    '#EXT-X-STREAM-INF:BANDWIDTH=900000,AVERAGE-BANDWIDTH=800000,RESOLUTION=854x480,FRAME-RATE=30.000,CODECS="avc1.4d401e,mp4a.40.2"',
    \`https://cdn.nexora.com/\${videoId}/480p/index.m3u8\`,
  ].join('\\n')
}`,
        explanation:
          'Declares bandwidth and codec requirements for each resolution stream, enabling browser video engines (Hls.js / Video.js) to switch streams automatically.',
        keyTakeaway: 'Always include #EXT-X-INDEPENDENT-SEGMENTS so modern video decoders can instantly switch bitrates mid-playback without visual tearing.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: CDN Origin Shield & Byte-Range Delivery',
        subtitle: 'Preventing origin collapse when a video goes viral',
        concept:
          'When 5 million viewers watch a video simultaneously, CDN edge Point of Presence (POP) caches absorb 99.2% of segment requests. An intermediate Origin Shield layer collapses edge cache misses into a single origin request.',
        language: 'go',
        fileName: 'cdn_shield.go',
        codeSnippet: `package main

import (
	"sync"
)

type OriginShield struct {
	mu        sync.Mutex
	inFlight  map[string]*sync.WaitGroup
}

// RequestCollapsing ensures only 1 worker fetches an uncached segment from S3
func (os *OriginShield) FetchSegment(segmentKey string) ([]byte, error) {
	os.mu.Lock()
	if wg, exists := os.inFlight[segmentKey]; exists {
		os.mu.Unlock()
		wg.Wait() // Wait for first caller to finish fetching
		return os.getFromCache(segmentKey)
	}

	wg := &sync.WaitGroup{}
	wg.Add(1)
	os.inFlight[segmentKey] = wg
	os.mu.Unlock()

	defer func() {
		os.mu.Lock()
		delete(os.inFlight, segmentKey)
		os.mu.Unlock()
		wg.Done()
	}()

	data, err := os.readFromS3(segmentKey)
	if err == nil {
		os.saveToCache(segmentKey, data)
	}
	return data, err
}`,
        explanation:
          'Request collapsing (singleflight) ensures that if 10,000 edge servers miss on a brand new video segment at the same millisecond, exactly 1 request hits S3, preventing origin denial-of-service.',
        keyTakeaway: 'Always implement Request Collapsing (SingleFlight) on CDN origin shields to avoid thundering herds on new video releases.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Viral Video Release Thundering Herd on Origin S3',
        impact: 'Millions of concurrent clients request segment_001.ts within 500ms, triggering S3 503 SlowDown rate limits.',
        mitigationCodeOrStrategy:
          'CDN Request Collapsing & Origin Shield: Cloudflare/Fastly Origin Shield holds duplicate requests in a mutex waitgroup and returns cached response from the single primary fetch.',
      },
      {
        incident: 'Worker Node OOM Panic During 4K AV1 Transcode',
        impact: 'Heavy video encoding consumes 16GB+ RAM, killing the container and leaving video stuck in "Processing" state.',
        mitigationCodeOrStrategy:
          'Temporal DAG State Machine: Each 4-second segment transcode is an idempotent task with a heartbeat lease. If a worker dies, Temporal automatically re-routes the task to a larger 32GB worker node.',
      },
    ],
    faangInterviewTips: [
      'Explain Adaptive Bitrate Streaming (HLS vs DASH): Describe how client video players measure network buffer levels every 4 seconds to adjust playback resolution dynamically.',
      'Explain I-Frame (GOP) Alignment: Emphasize that all resolution streams must have identical keyframe timestamps so switching streams is frame-accurate without audio glitches.',
      'Highlight CDN Edge Caching: 99%+ of video egress must be served from CDN edge caches; direct S3 egress costs 10x more and will bankrupt video startups.',
    ],
  },

  'google-drive': {
    problemStatement:
      'Design a cloud file synchronization service (like Google Drive or Dropbox) that syncs files across desktop, web, and mobile clients with sub-second change detection, minimizes bandwidth via Content-Defined Chunking (FastCDC), deduplicates blocks globally, and resolves offline merge conflicts without data loss.',
    naiveApproach: {
      description:
        'Whenever a user edits a file (e.g. modifying 1 slide in a 500MB PowerPoint presentation), the desktop client re-uploads the entire 500MB file to an S3 bucket with a timestamp.',
      whyItBreaks: [
        'Extreme bandwidth waste: A 1-word edit in a 1GB file costs 1GB upload and 1GB download on every synced device across the company.',
        'Loss of offline edits: If two users edit a file while disconnected, the last write blindly overwrites the first, destroying hours of team work.',
        'Storage cost explosion: Storing 100 historical versions of a 100MB file consumes 10GB of cloud storage instead of the ~105MB needed with block deduplication.',
        'Mobile battery drain: Re-uploading huge files repeatedly over cellular connections drains phone batteries and causes frequent upload timeout failures.',
      ],
    },
    coreDataStructures: [
      {
        name: 'FastCDC Content-Defined Chunker',
        purpose: 'Uses a rolling hash over sliding byte windows to generate chunk boundaries that remain stable even when bytes are inserted at the start of a file.',
        timeComplexity: 'O(N) single-pass byte scan',
        spaceComplexity: 'O(1) sliding window state',
        asciiDiagram: 'Byte Stream -> Rolling Hash(window) & Mask == 0 -> Cut Chunk Boundary [Avg 4MB]',
      },
      {
        name: 'Merkle Tree File Directory Tree',
        purpose: 'Hierarchical cryptographic hash tree allowing two devices to identify differing blocks in O(log N) comparisons.',
        timeComplexity: 'O(log N) tree diffing',
        spaceComplexity: 'O(N) tree nodes',
      },
      {
        name: 'Global Chunk Deduplication Index',
        purpose: 'Global key-value mapping SHA-256(chunk) -> Object_Store_ID ensuring identical chunks uploaded anywhere on earth are stored only once.',
        timeComplexity: 'O(1) hash lookup',
        spaceComplexity: 'O(C) unique chunk signatures',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Content-Defined Chunking Engine (FastCDC)',
        subtitle: 'Generating stable chunk boundaries that survive byte insertions',
        concept:
          'Fixed-size chunking (e.g. split every 4MB) fails completely when 1 byte is inserted at line 1, because all subsequent 4MB boundaries shift. Content-Defined Chunking calculates a rolling hash over a sliding window; when the hash matches a pattern (e.g. lowest 13 bits are zero), it cuts a chunk boundary.',
        language: 'go',
        fileName: 'fast_cdc.go',
        codeSnippet: `package main

import (
	"crypto/sha256"
	"fmt"
)

const (
	MinChunkSize = 1024 * 1024       // 1 MB
	AvgChunkSize = 4 * 1024 * 1024   // 4 MB
	MaxChunkSize = 8 * 1024 * 1024   // 8 MB
	MaskGear     = 0x0000000000001FFF // 13 bits match avg 8KB window
)

type FileChunk struct {
	Offset   int64
	Length   int
	Checksum string // SHA-256
}

// FastCDC splits a byte stream into content-defined variable chunks
func FastCDC(data []byte) []FileChunk {
	var chunks []FileChunk
	n := len(data)
	offset := 0

	for offset < n {
		remaining := n - offset
		if remaining <= MinChunkSize {
			chunks = append(chunks, createChunk(data, offset, remaining))
			break
		}

		cutLen := MinChunkSize
		maxLen := MaxChunkSize
		if remaining < maxLen {
			maxLen = remaining
		}

		var rollingHash uint64
		for i := MinChunkSize; i < maxLen; i++ {
			// Gear-based rolling hash update
			rollingHash = (rollingHash << 1) + uint64(data[offset+i])
			if (rollingHash & MaskGear) == 0 {
				cutLen = i + 1
				break
			}
		}

		chunks = append(chunks, createChunk(data, offset, cutLen))
		offset += cutLen
	}
	return chunks
}

func createChunk(data []byte, offset, length int) FileChunk {
	h := sha256.Sum256(data[offset : offset+length])
	return FileChunk{
		Offset:   int64(offset),
		Length:   length,
		Checksum: fmt.Sprintf("%x", h),
	}
}`,
        explanation:
          'FastCDC slides across bytes. If a user inserts 5 characters at the beginning of a 100MB file, only the first chunk changes; all subsequent chunks maintain their identical boundary hashes.',
        keyTakeaway: 'Always use Content-Defined Chunking instead of fixed-size slicing so that byte insertions only invalidate a single block.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Cloud Block Deduplication Verification',
        subtitle: 'Checking which chunks already exist before transmitting any bytes',
        concept:
          'The client computes the list of SHA-256 hashes for all file chunks and sends a lightweight JSON array to the server. The server checks its global metadata database and tells the client: "Chunks 1, 3, and 4 are already in S3! Upload only chunk 2."',
        language: 'go',
        fileName: 'dedup_checker.go',
        codeSnippet: `package main

type VerifyHashesRequest struct {
	FileID   string   \`json:"file_id"\`
	Checksums []string \`json:"checksums"\`
}

type VerifyHashesResponse struct {
	MissingChecksums []string \`json:"missing_checksums"\`
	PresignedUploadURLs map[string]string \`json:"upload_urls"\`
}

func (s *SyncGateway) VerifyHashes(req VerifyHashesRequest) (*VerifyHashesResponse, error) {
	// Query Redis Bloom Filter / Postgres chunk store
	existing, err := s.chunkRepo.FindExistingHashes(req.Checksums)
	if err != nil {
		return nil, err
	}

	resp := &VerifyHashesResponse{
		MissingChecksums:   make([]string, 0),
		PresignedUploadURLs: make(map[string]string),
	}

	for _, hash := range req.Checksums {
		if !existing[hash] {
			resp.MissingChecksums = append(resp.MissingChecksums, hash)
			// Generate S3 PUT presigned URL for direct upload
			resp.PresignedUploadURLs[hash] = s.s3.GeneratePresignedPutURL("chunks/" + hash)
		}
	}
	return resp, nil
}`,
        explanation:
          'Transmits only missing blocks. If another user in the company already uploaded an identical operating system ISO or slide deck, upload time is 0 milliseconds (100% deduplication).',
        keyTakeaway: 'Never upload blocks without first running a checksum verification pre-flight query.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Hierarchical Merkle Tree Directory Diffing',
        subtitle: 'Detecting changed files in nested directories in O(log N)',
        concept:
          'A user folder contains 50,000 files across hundreds of subdirectories. Re-checking all 50,000 files on every sync burns disk I/O. A Merkle Tree aggregates child directory hashes into a single root hash.',
        language: 'typescript',
        fileName: 'merkleSync.ts',
        codeSnippet: `import { createHash } from 'crypto'

export interface MerkleNode {
  name: string
  isDir: boolean
  hash: string
  children?: MerkleNode[]
}

export function computeDirectoryMerkle(node: MerkleNode): string {
  if (!node.isDir) {
    return node.hash // File SHA-256
  }
  const hasher = createHash('sha256')
  for (const child of (node.children || []).sort((a, b) => a.name.localeCompare(b.name))) {
    hasher.update(child.name + ':' + computeDirectoryMerkle(child))
  }
  node.hash = hasher.digest('hex')
  return node.hash
}

// Diff two directory trees: only traverses branches whose hashes differ
export function findDiffs(local: MerkleNode, remote: MerkleNode, diffs: string[] = []): string[] {
  if (local.hash === remote.hash) {
    return diffs // Subtrees are 100% identical! Skip entire branch!
  }
  if (!local.isDir || !remote.isDir) {
    diffs.push(local.name)
    return diffs
  }
  // Traverse only modified folders
  for (const child of local.children || []) {
    const remoteChild = remote.children?.find(c => c.name === child.name)
    if (!remoteChild) diffs.push(child.name)
    else findDiffs(child, remoteChild, diffs)
  }
  return diffs
}`,
        explanation:
          'If the local directory root hash matches the remote root hash, 50,000 files are verified in 1 comparison. When a change occurs, only the modified subtree path is traversed.',
        keyTakeaway: 'Merkle trees reduce directory sync verification from O(N) to O(log N), sparing mobile client CPU and battery life.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: Committing File Version Tree in PostgreSQL',
        subtitle: 'Atomic metadata update with optimistic concurrency control',
        concept:
          'Once missing chunks are saved in S3, the client commits a new revision record in the metadata database mapping the file path to its ordered list of chunk IDs.',
        language: 'sql',
        fileName: 'schema.sql',
        codeSnippet: `CREATE TABLE file_metadata (
    file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_folder_id UUID REFERENCES file_metadata(file_id),
    name VARCHAR(255) NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE file_chunks (
    file_id UUID NOT NULL REFERENCES file_metadata(file_id),
    chunk_index INT NOT NULL,
    chunk_hash CHAR(64) NOT NULL,
    size_bytes INT NOT NULL,
    PRIMARY KEY (file_id, chunk_index)
);

-- Atomic version commit with optimistic locking
UPDATE file_metadata
SET version = version + 1, updated_at = NOW()
WHERE file_id = $1 AND version = $2;`,
        explanation:
          'Files and chunks are modeled separately. Updating a file simply updates the chunk manifest references without duplicating chunk data rows.',
        keyTakeaway: 'Always use optimistic locking on file revisions to detect concurrent offline edits from multiple devices.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: Real-Time Sync Notification Hub',
        subtitle: 'Broadcasting changes to user laptops and phones in real-time',
        concept:
          'When a file is updated on desktop, a Redis Pub/Sub event notifies the WebSocket gateway, which immediately signals the user’s mobile app and secondary laptop to pull the diff.',
        language: 'go',
        fileName: 'sync_notifier.go',
        codeSnippet: `package main

type SyncEvent struct {
	UserID     string \`json:"user_id"\`
	FileID     string \`json:"file_id"\`
	NewVersion int64  \`json:"new_version"\`
	Action     string \`json:"action"\` // CREATE, UPDATE, DELETE
}

func (h *NotificationHub) BroadcastSync(event SyncEvent) {
	channel := "user_sync:" + event.UserID
	payload := serialize(event)
	// Publish to Redis cluster
	h.redisClient.Publish(ctx, channel, payload)
}`,
        explanation:
          'Long-lived WebSocket connections on user devices receive instant push notifications instead of wasting battery on periodic HTTP polling.',
        keyTakeaway: 'Use WebSockets or Server-Sent Events for push notifications to achieve instant sync and eliminate wasteful polling.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Simultaneous Offline Edits on Same Document',
        impact: 'Alice edits 10 pages on an airplane; Bob edits 5 pages at home. When Alice reconnects, saving blindly would erase Bob’s work.',
        mitigationCodeOrStrategy:
          'Automatic Forking into Conflicted Copy: Server detects version conflict and saves Alice’s version as "Report (Conflicted Copy from Alice’s MacBook Pro).docx" while keeping Bob’s changes untouched.',
      },
      {
        incident: 'Object Store Chunk Corruption or Bit Rot',
        impact: 'Disk degradation on S3 corrupts a 4MB chunk, rendering the user’s file unreadable upon download.',
        mitigationCodeOrStrategy:
          'End-to-End Cryptographic Checksum Verification: The client verifies SHA-256 upon download; if invalid, server immediately falls back to geographic replica or parity erasure coding block.',
      },
    ],
    faangInterviewTips: [
      'Compare Fixed vs Content-Defined Chunking (CDC): Explain in detail why fixed 4MB chunks fail on byte insertions (boundary shift problem) and how FastCDC solves it.',
      'Explain Merkle Trees: Detail how Merkle trees minimize bandwidth when comparing file system directory state between client and server.',
      'Explain Client-to-S3 Direct Uploads: Avoid proxying video/file gigabytes through API servers; generate presigned S3 URLs so clients upload directly to object storage.',
    ],
  },

  'search-engine': {
    problemStatement:
      'Design a distributed full-text search engine (like Elasticsearch or Google Search) capable of indexing 50+ million documents, answering complex multi-keyword search queries with BM25 relevance ranking in under 25ms, and scaling horizontally across sharded inverted index clusters.',
    naiveApproach: {
      description:
        'Execute relational database queries using `SELECT * FROM articles WHERE content LIKE "%distributed%systems%" ORDER BY created_at DESC`.',
      whyItBreaks: [
        'Full table scans: `LIKE "%...%"` cannot use B-Tree indexes, forcing disk scans across every gigabyte row and taking 15+ seconds per query.',
        'Zero relevance ranking: SQL wildcard matching cannot score documents by term frequency, document length, or word rarity.',
        'No linguistic analysis: Fails to match plurals, synonyms, or stemmed words (e.g., "running" does not match "runs").',
        'Unbearable CPU load: Concurrently scanning text across 50M rows burns 100% CPU on the database server, crashing all app traffic.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Inverted Index Posting List',
        purpose: 'Maps each unique token to an ordered list of (DocID, TermFrequency, Positions) for lightning-fast lookups.',
        timeComplexity: 'O(1) dictionary lookup + O(P) posting scan',
        spaceComplexity: 'Compressed variable-byte byte stream',
        asciiDiagram: 'Token: "sharding" -> Postings: [Doc 1 (tf:3), Doc 4 (tf:1), Doc 12 (tf:8)]',
      },
      {
        name: 'FST (Finite State Transducer) Term Dictionary',
        purpose: 'Memory-compressed dictionary mapping prefix strings to posting list file pointers in O(length).',
        timeComplexity: 'O(word_length) lookup',
        spaceComplexity: 'Highly compressed acyclic graph in RAM (~50 MB for 1M words)',
      },
      {
        name: 'Skip Lists in Posting Lists',
        purpose: 'Accelerates Boolean intersection (AND queries) by skipping irrelevant document ranges without inspecting every Doc ID.',
        timeComplexity: 'O(N + M/skip)',
        spaceComplexity: 'O(N/8) skip pointers',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Text Analysis Pipeline',
        subtitle: 'Tokenization, Lowercasing, Stopword Removal, and Stemming',
        concept:
          'Raw text cannot be indexed directly. It must pass through an analyzer: 1) Character filter, 2) Tokenizer (split on whitespace/punctuation), 3) Token filters (lowercase, strip stopwords like "the", apply Porter Stemmer so "running" becomes "run").',
        language: 'go',
        fileName: 'analyzer.go',
        codeSnippet: `package main

import (
	"strings"
	"unicode"
)

var stopWords = map[string]bool{
	"a": true, "an": true, "and": true, "are": true, "as": true, "at": true,
	"be": true, "by": true, "for": true, "from": true, "has": true, "he": true,
	"in": true, "is": true, "it": true, "its": true, "of": true, "on": true,
	"that": true, "the": true, "to": true, "was": true, "were": true, "with": true,
}

func AnalyzeText(text string) []string {
	// 1. Tokenize on non-alphanumeric characters
	rawTokens := strings.FieldsFunc(text, func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsNumber(r)
	})

	var tokens []string
	for _, tok := range rawTokens {
		// 2. Lowercase
		clean := strings.ToLower(tok)
		// 3. Filter Stopwords
		if stopWords[clean] || len(clean) < 2 {
			continue
		}
		// 4. Basic stemmer rule
		clean = simpleStem(clean)
		tokens = append(tokens, clean)
	}
	return tokens
}

func simpleStem(w string) string {
	if strings.HasSuffix(w, "ing") && len(w) > 5 {
		return strings.TrimSuffix(w, "ing")
	}
	if strings.HasSuffix(w, "s") && len(w) > 3 {
		return strings.TrimSuffix(w, "s")
	}
	return w
}`,
        explanation:
          'Normalizes document text into canonical token representations so user queries match documents regardless of pluralization or capitalization.',
        keyTakeaway: 'Always apply identical analysis pipelines to both indexing documents and incoming user search queries.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Building the Inverted Index & Posting Lists',
        subtitle: 'Mapping tokens to sorted document lists',
        concept:
          'An inverted index reverses the document-to-word relationship into a word-to-documents index. Each entry is a posting containing Document ID, Term Frequency (TF), and word positions.',
        language: 'go',
        fileName: 'inverted_index.go',
        codeSnippet: `package main

type Posting struct {
	DocID int
	TF    int // Term Frequency in this doc
}

type InvertedIndex struct {
	Dictionary map[string][]Posting // term -> postings list
	DocLengths map[int]int          // docId -> total words
	TotalDocs  int
	AvgDocLen  float64
}

func (idx *InvertedIndex) AddDocument(docId int, text string) {
	tokens := AnalyzeText(text)
	idx.DocLengths[docId] = len(tokens)
	idx.TotalDocs++

	// Count term frequencies
	tfMap := make(map[string]int)
	for _, t := range tokens {
		tfMap[t]++
	}

	for term, count := range tfMap {
		idx.Dictionary[term] = append(idx.Dictionary[term], Posting{
			DocID: docId,
			TF:    count,
		})
	}
}`,
        explanation:
          'Posting lists are maintained in strictly ascending DocID order, enabling linear merge-sort intersections during multi-keyword queries.',
        keyTakeaway: 'Keep posting lists sorted by DocID to enable fast two-pointer intersection algorithms.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Okapi BM25 Relevance Scoring Engine',
        subtitle: 'The gold-standard probabilistic information retrieval formula',
        concept:
          'BM25 improves on classical TF-IDF by adding term frequency saturation (repeating a word 50 times does not make it 50x more relevant) and document length normalization (long documents are penalized).',
        language: 'go',
        fileName: 'bm25.go',
        codeSnippet: `package main

import (
	"math"
)

const (
	k1 = 1.2  // Term frequency saturation parameter
	b  = 0.75 // Document length normalization parameter
)

func (idx *InvertedIndex) ScoreBM25(term string, p Posting) float64 {
	// 1. Calculate Inverse Document Frequency (IDF)
	docFreq := float64(len(idx.Dictionary[term]))
	N := float64(idx.TotalDocs)
	idf := math.Log(1.0 + (N - docFreq + 0.5)/(docFreq + 0.5))

	// 2. Length normalization factor
	docLen := float64(idx.DocLengths[p.DocID])
	avgLen := idx.AvgDocLen
	tf := float64(p.TF)

	num := tf * (k1 + 1.0)
	denom := tf + k1*(1.0 - b + b*(docLen/avgLen))

	return idf * (num / denom)
}`,
        explanation:
          'Computes the exact mathematical BM25 score. Rare terms (high IDF) contribute more score, while term saturation prevents keyword stuffing abuse.',
        keyTakeaway: 'BM25 saturates term frequency, ensuring that document quality and relevance outweigh keyword repetition.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: Boolean Query Intersection with Skip Lists',
        subtitle: 'Answering AND / OR queries in microseconds',
        concept:
          'When a user searches for "distributed AND consensus", the engine intersects the posting list for "distributed" (1M docs) with "consensus" (10k docs). Instead of comparing every item, skip lists jump past large spans.',
        language: 'typescript',
        fileName: 'postingIntersect.ts',
        codeSnippet: `export function intersectPostings(listA: number[], listB: number[]): number[] {
  const result: number[] = []
  let i = 0
  let j = 0

  while (i < listA.length && j < listB.length) {
    if (listA[i] === listB[j]) {
      result.push(listA[i])
      i++
      j++
    } else if (listA[i] < listB[j]) {
      // If skip pointer exists and target is <= listB[j], jump!
      i++
    } else {
      j++
    }
  }
  return result
}`,
        explanation:
          'Two-pointer intersection advances both lists simultaneously in O(N + M) time. Skip lists reduce this even further for sparse lists.',
        keyTakeaway: 'Always intersect the shortest posting list first in multi-term queries to prune search space exponentially.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: Distributed Sharding & Scatter-Gather Search',
        subtitle: 'Scaling across 100 search nodes with coordinator routing',
        concept:
          'The document corpus is sharded across N nodes (e.g. 10 shards with 5M documents each). A search coordinator broadcasts the query to all shards, collects top-K results, merges them, and fetches document source.',
        language: 'go',
        fileName: 'scatter_gather.go',
        codeSnippet: `package main

import (
	"container/heap"
	"sync"
)

type ShardResult struct {
	DocID float64
	Score float64
}

func (coord *Coordinator) ScatterGatherSearch(query string, topK int) []ShardResult {
	var wg sync.WaitGroup
	resultsChan := make(chan []ShardResult, len(coord.shards))

	for _, shard := range coord.shards {
		wg.Add(1)
		go func(s *ShardNode) {
			defer wg.Done()
			resultsChan <- s.QueryLocal(query, topK)
		}(shard)
	}

	wg.Wait()
	close(resultsChan)

	// Merge-sort Top-K results across all shards
	h := &ResultMinHeap{}
	heap.Init(h)
	for shardRes := range resultsChan {
		for _, item := range shardRes {
			if h.Len() < topK {
				heap.Push(h, item)
			} else if item.Score > (*h)[0].Score {
				heap.Pop(h)
				heap.Push(h, item)
			}
		}
	}
	return h.ToSortedList()
}`,
        explanation:
          'Two-phase query execution: Phase 1 (Query) collects only DocIDs and scores from shards. Phase 2 (Fetch) retrieves document source bodies only for the final Top-10 winners.',
        keyTakeaway: 'Never return full document bodies during the scatter phase; transfer only DocID + Score to conserve internal network bandwidth.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'High-Frequency Stopword Explosion ("the", "is", "at")',
        impact: 'Querying common terms yields posting lists with 40+ million entries, stalling query execution and causing high latency.',
        mitigationCodeOrStrategy:
          'Block-Max WAND (Weak AND) Algorithm: Divides posting lists into blocks of 128 doc IDs with max score metadata. If block max cannot beat current Top-K score, skip all 128 doc IDs instantly without decoding.',
      },
      {
        incident: 'Lucene Segment Merge Disk I/O Saturation',
        impact: 'Background segment merging consumes 100% disk write IOPS, starving foreground real-time search queries.',
        mitigationCodeOrStrategy:
          'Tiered Merge Policy with I/O Throttling: Enforce rate limits on merge threads (e.g., max 50 MB/sec) so foreground read queries maintain sub-25ms response times.',
      },
    ],
    faangInterviewTips: [
      'Explain the BM25 formula components: IDF term penalty, TF saturation ($k_1$), and document length normalization ($b$).',
      'Explain Two-Phase Scatter-Gather: Differentiate between Query Phase (DocID + Score) and Fetch Phase (Full Document Content).',
      'Describe Inverted Index Compression: Explain Frame-of-Reference (FoR) and Variable Byte encoding used to compress billions of integers in RAM.',
    ],
  },

  'web-crawler': {
    problemStatement:
      'Design a distributed web crawler (like Googlebot) capable of crawling 1+ billion web pages per month, respecting domain politeness and robots.txt, deduplicating URLs with memory-efficient Bloom filters, and handling dynamic DNS resolutions with high fault tolerance.',
    naiveApproach: {
      description:
        'A single multithreaded Python script with a BFS queue `urls = [seed_url]`. Pop URL, execute `requests.get()`, extract `<a>` tags via regex, append to queue, and insert raw HTML into MySQL.',
      whyItBreaks: [
        'Denial of Service on target sites: Crawling 1,000 pages per second on a personal blog crashes the target server and gets your crawler IP blacklisted.',
        'Spider traps & infinite loops: Dynamic URL parameters (e.g. `/calendar?year=2099&month=12`) trap the crawler in infinite crawling loops.',
        'DNS resolution bottleneck: Performing synchronous DNS lookups for every URL consumes 50-100ms per page, bottlenecking throughput.',
        'Memory exhaustion: Storing billions of crawled URLs in a Python memory set triggers an Out-Of-Memory (OOM) crash within hours.',
      ],
    },
    coreDataStructures: [
      {
        name: 'Two-Tier Mercator URL Frontier',
        purpose: 'Separates Priority Queues (importance ranking) from Politeness Queues (per-host rate limiting and delay heaps).',
        timeComplexity: 'O(log H) heap dispatch where H is host count',
        spaceComplexity: 'Buffered queue on disk/RocksDB',
        asciiDiagram: 'Incoming URLs -> Priority Queues (F1..Fn) -> Host Queues (B1..Bm) -> Fetch Workers',
      },
      {
        name: 'Counting Bloom Filter for URL Deduplication',
        purpose: 'Probabilistic bit array verifying if a URL was already visited in O(1) time and 10 bits per URL.',
        timeComplexity: 'O(K) hash operations (K=7)',
        spaceComplexity: '~1.2 GB RAM for 1 Billion URLs (vs 64 GB for raw strings)',
      },
      {
        name: 'SimHash 64-Bit Document Fingerprint',
        purpose: 'Detects near-duplicate and mirrored web pages by computing Hamming distance between token hashes.',
        timeComplexity: 'O(words) fingerprint calculation',
        spaceComplexity: '8 bytes per document',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Two-Tier Mercator URL Frontier',
        subtitle: 'Enforcing domain politeness and crawl priority',
        concept:
          'The Mercator URL Frontier uses two sets of queues: Front Queues (F1..Fn) organize URLs by PageRank/priority; Back Queues (B1..Bm) map to specific hostnames. A min-heap tracks the earliest time each host can be queried next (e.g. 500ms delay).',
        language: 'go',
        fileName: 'frontier.go',
        codeSnippet: `package main

import (
	"container/heap"
	"net/url"
	"time"
)

type HostQueue struct {
	HostName    string
	NextCrawlAt time.Time
	URLs        []string
	Index       int
}

type PolitenessHeap []*HostQueue

func (h PolitenessHeap) Len() int           { return len(h) }
func (h PolitenessHeap) Less(i, j int) bool { return h[i].NextCrawlAt.Before(h[j].NextCrawlAt) }
func (h PolitenessHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i]; h[i].Index = i; h[j].Index = j }
func (h *PolitenessHeap) Push(x any)        { *h = append(*h, x.(*HostQueue)) }
func (h *PolitenessHeap) Pop() any {
	old := *h
	n := len(old)
	item := old[n-1]
	*h = old[0 : n-1]
	return item
}

type Frontier struct {
	heap     PolitenessHeap
	delay    time.Duration
}

func (f *Frontier) GetNextURL() string {
	now := time.Now()
	hq := heap.Pop(&f.heap).(*HostQueue)

	if hq.NextCrawlAt.After(now) {
		time.Sleep(hq.NextCrawlAt.Sub(now))
	}

	targetURL := hq.URLs[0]
	hq.URLs = hq.URLs[1:]
	hq.NextCrawlAt = time.Now().Add(f.delay)
	heap.Push(&f.heap, hq)

	return targetURL
}`,
        explanation:
          'The politeness heap guarantees that no single web server receives requests faster than the polite delay threshold (e.g. 1 request per 500ms).',
        keyTakeaway: 'Never query a single external host concurrently with multiple threads; partition workers strictly by hostname.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Memory-Efficient Bloom Filter',
        subtitle: 'URL deduplication at 1 billion scale in RAM',
        concept:
          'Storing 1 billion 64-byte URLs in a hash set requires over 64GB of RAM. A Bloom filter uses 10 bits per entry, fitting 1 billion URLs into only 1.2GB of RAM with a 1% false positive rate.',
        language: 'go',
        fileName: 'bloom_filter.go',
        codeSnippet: `package main

import (
	"hash/fnv"
)

type BloomFilter struct {
	bitset []uint64
	size   uint64
	k      uint32 // number of hash functions
}

func NewBloomFilter(expectedItems uint64, fpRate float64) *BloomFilter {
	// m = -n * ln(p) / (ln(2)^2)
	sizeBits := uint64(float64(expectedItems) * 10)
	words := (sizeBits + 63) / 64
	return &BloomFilter{
		bitset: make([]uint64, words),
		size:   sizeBits,
		k:      7,
	}
}

func (bf *BloomFilter) Add(item string) {
	h1, h2 := hashMurmur(item)
	for i := uint32(0); i < bf.k; i++ {
		combined := (h1 + uint64(i)*h2) % bf.size
		bf.bitset[combined/64] |= (1 << (combined % 64))
	}
}

func (bf *BloomFilter) Contains(item string) bool {
	h1, h2 := hashMurmur(item)
	for i := uint32(0); i < bf.k; i++ {
		combined := (h1 + uint64(i)*h2) % bf.size
		if (bf.bitset[combined/64] & (1 << (combined % 64))) == 0 {
			return false // Guaranteed: Definitely not seen!
		}
	}
	return true // Probably seen (<= 1% false positive)
}`,
        explanation:
          'If any bit is 0, the URL is definitely unvisited and must be crawled. If all bits are 1, it is skipped, preventing crawl loops.',
        keyTakeaway: 'Use Bloom filters for URL deduplication to reduce RAM requirements by over 95%.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: High-Speed DNS Resolver Cache',
        subtitle: 'Eliminating the 50ms DNS lookup latency bottleneck',
        concept:
          'Performing regular OS DNS lookups stalls workers. A dedicated asynchronous DNS caching layer pre-resolves domain IP addresses with background TTL refreshes.',
        language: 'go',
        fileName: 'dns_cache.go',
        codeSnippet: `package main

import (
	"net"
	"sync"
	"time"
)

type DNSEntry struct {
	IPs       []net.IP
	ExpiresAt time.Time
}

type DNSCache struct {
	mu    sync.RWMutex
	cache map[string]DNSEntry
}

func (c *DNSCache) Resolve(host string) (net.IP, error) {
	c.mu.RLock()
	entry, found := c.cache[host]
	c.mu.RUnlock()

	if found && time.Now().Before(entry.ExpiresAt) {
		return entry.IPs[0], nil
	}

	ips, err := net.LookupIP(host)
	if err != nil {
		return nil, err
	}

	c.mu.Lock()
	c.cache[host] = DNSEntry{
		IPs:       ips,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	c.mu.Unlock()
	return ips[0], nil
}`,
        explanation:
          'Caches resolved IP addresses for 1 hour, cutting per-request network latency from 60ms to 0.1ms.',
        keyTakeaway: 'Always implement an asynchronous custom DNS cache to prevent external DNS servers from becoming your crawler bottleneck.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: SimHash Content Deduplication',
        subtitle: 'Detecting mirrored web pages and scraper clones',
        concept:
          'Many sites mirror other websites or wrap articles with different sidebars. SimHash generates a 64-bit fingerprint of the document text. Near-duplicate pages have a Hamming distance <= 3.',
        language: 'typescript',
        fileName: 'simhash.ts',
        codeSnippet: `import { createHash } from 'crypto'

export function computeSimHash(tokens: string[]): bigint {
  const v = new Array(64).fill(0)

  for (const token of tokens) {
    const hash = BigInt('0x' + createHash('md5').update(token).digest('hex').slice(0, 16))
    for (let i = 0; i < 64; i++) {
      const bit = (hash >> BigInt(i)) & 1n
      v[i] += bit === 1n ? 1 : -1
    }
  }

  let fingerprint = 0n
  for (let i = 0; i < 64; i++) {
    if (v[i] > 0) {
      fingerprint |= (1n << BigInt(i))
    }
  }
  return fingerprint
}

export function hammingDistance(h1: bigint, h2: bigint): number {
  let xor = h1 ^ h2
  let distance = 0
  while (xor > 0n) {
    if (xor & 1n) distance++
    xor >>= 1n
  }
  return distance
}`,
        explanation:
          'If two web pages differ by only a few words (e.g. copyright year or advertisements), their SimHash Hamming distance is tiny (<= 3 bits), allowing instant duplicate detection.',
        keyTakeaway: 'Use SimHash rather than exact cryptographic hashing (SHA-256) to identify near-duplicate content across the web.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: Distributed Checkpoint & Partitioning',
        subtitle: 'Surviving crawler worker restarts without re-crawling',
        concept:
          'Crawler workers stream crawled documents to distributed blob storage (S3/HDFS) and persist URL frontier state in RocksDB checkpoints every 5 minutes.',
        language: 'sql',
        fileName: 'schema.sql',
        codeSnippet: `CREATE TABLE crawled_documents (
    doc_id BIGSERIAL PRIMARY KEY,
    url_hash CHAR(64) UNIQUE NOT NULL,
    url TEXT NOT NULL,
    http_status INT NOT NULL,
    simhash BIGINT NOT NULL,
    storage_s3_key VARCHAR(255) NOT NULL,
    crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crawled_simhash ON crawled_documents(simhash);`,
        explanation:
          'Saves indexed page metadata and object storage keys for subsequent indexers and PageRank calculation jobs.',
        keyTakeaway: 'Separate the crawler ingestion cluster from downstream indexing and ranking pipelines.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Spider Trap (Dynamic Calendar URL Generation)',
        impact: 'A website produces endless URLs like `/event?day=1&month=1&year=2026`, filling the frontier with millions of useless pages.',
        mitigationCodeOrStrategy:
          'Strict Crawl Limits: Cap maximum URLs crawled per domain (e.g., max 10,000 pages per domain), strip common session query parameters, and cap directory path depth at 5 levels.',
      },
      {
        incident: 'Crawler IP Blacklisted by Cloudflare / Akamai CDN',
        impact: 'Target edge CDN flags automated crawler user agent, returning HTTP 403 Forbidden on all requests.',
        mitigationCodeOrStrategy:
          'Strict Robots.txt Adherence & Egress IP Pool Rotation: Honor `crawl-delay`, send contact email in User-Agent header, and distribute crawling egress across a large pool of residential/datacenter IPs.',
      },
    ],
    faangInterviewTips: [
      'Detail the Mercator URL Frontier: Explain the exact separation between Front Priority Queues and Back Politeness Queues.',
      'Explain Bloom Filter sizing formula: Derive $m$ and $k$ to prove how 1 billion URLs fit in 1.2GB of memory.',
      'Contrast SimHash vs MinHash: SimHash for near-duplicate text detection; MinHash / LSH for set overlap (Jaccard similarity).',
    ],
  },

  'collaborative-editor': {
    problemStatement:
      'Design a real-time collaborative document editor (like Google Docs or Notion) allowing hundreds of concurrent users to edit the same rich-text document simultaneously with sub-50ms latency, automatic conflict resolution, offline editing sync, and full revision undo/redo history.',
    naiveApproach: {
      description:
        'Whenever a user types a keystroke, send the entire document string or simple cursor index `{pos: 5, char: "a"}` to a Node.js server. The server overwrites its document copy and broadcasts the new text to all connected WebSocket clients.',
      whyItBreaks: [
        'Lost keystrokes and race conditions: If User A and User B type at the same millisecond, User B overwrites User A’s edits without knowing.',
        'Index shift desynchronization: If Alice types at position 0 while Bob types at position 10, Bob’s insertion position becomes invalid because Alice’s insertion shifted all character offsets by +1.',
        'Network partition chaos: If a user goes offline on an airplane, types 3 paragraphs, and reconnects, simple overwriting wipes out everything other users wrote in the interim.',
        'Locking freezes the UI: Pessimistic locking (locking a paragraph while someone is typing) completely ruins the fluid real-time collaborative user experience.',
      ],
    },
    coreDataStructures: [
      {
        name: 'CRDT (Conflict-Free Replicated Data Type) / RGA',
        purpose: 'Assigns every character a globally unique fractional identifier and Lamport timestamp so concurrent insertions order deterministically without coordination.',
        timeComplexity: 'O(log N) character insertion / deletion',
        spaceComplexity: 'O(N) character node tree in memory',
        asciiDiagram: 'Char("H", id: [1, Alice]) -> Char("i", id: [2, Bob]) -> Converged State across all peers',
      },
      {
        name: 'Vector Clock & State Vector',
        purpose: 'Tracks the highest contiguous sequence number observed from every peer to detect causal ordering.',
        timeComplexity: 'O(P) where P is active peers count',
        spaceComplexity: 'O(P) integer clock map',
      },
      {
        name: 'Tombstone Delete Markers',
        purpose: 'Marks deleted characters without removing them from memory, preserving stable positional anchors for concurrent peer edits.',
        timeComplexity: 'O(1) mark deletion',
        spaceComplexity: 'Preserved until GC sweep after client acks',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Character CRDT Primitives with Fractional Indexing',
        subtitle: 'Giving every character an immutable mathematical position',
        concept:
          'Instead of integer array indexes (0, 1, 2), characters receive fractional identifiers between 0.0 and 1.0. If Alice inserts between index 0.2 and 0.3, she generates 0.25. If Bob also generates 0.25 concurrently, Peer ID breaks the tie deterministically.',
        language: 'typescript',
        fileName: 'crdtChar.ts',
        codeSnippet: `export interface CharID {
  position: number[] // Fractional path: e.g. [3, 5] means 0.35
  peerId: string
  clock: number
}

export interface CRDTChar {
  id: CharID
  value: string
  deleted: boolean
}

export function compareCharIDs(a: CharID, b: CharID): number {
  const minLen = Math.min(a.position.length, b.position.length)
  for (let i = 0; i < minLen; i++) {
    if (a.position[i] !== b.position[i]) {
      return a.position[i] - b.position[i]
    }
  }
  if (a.position.length !== b.position.length) {
    return a.position.length - b.position.length
  }
  // Deterministic tie-breaker: Peer ID string comparison
  return a.peerId.localeCompare(b.peerId)
}`,
        explanation:
          'Because fractional identifiers never change, concurrent insertions by other peers cannot shift or invalidate existing character IDs.',
        keyTakeaway: 'Use immutable fractional identifiers and Peer ID tie-breaking to eliminate the index shift problem in concurrent text editing.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Vector Clocks & Causal Ordering',
        subtitle: 'Tracking who saw what before typing',
        concept:
          'A Vector Clock is an array of integer counters, one per peer. It mathematically proves whether Event A happened before Event B, or if they occurred concurrently.',
        language: 'go',
        fileName: 'vector_clock.go',
        codeSnippet: `package main

type VectorClock map[string]uint64

func (vc VectorClock) Increment(peerID string) {
	vc[peerID]++
}

// HappensBefore returns true if vc <= other across all peers and < in at least one
func (vc VectorClock) HappensBefore(other VectorClock) bool {
	hasStrictlyLess := false
	for peer, clock := range vc {
		if clock > other[peer] {
			return false
		}
		if clock < other[peer] {
			hasStrictlyLess = true
		}
	}
	return hasStrictlyLess
}`,
        explanation:
          'Vector clocks detect causality. If an incoming edit references an operation the client hasn’t received yet, the edit is buffered until dependencies arrive.',
        keyTakeaway: 'Vector clocks guarantee that causal edits (like typing a question and then typing the answer) never display in reverse order.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Conflict-Free Deterministic Merge Engine',
        subtitle: 'Guaranteeing all devices converge to the exact same text',
        concept:
          'When two peers make concurrent edits, each applies them locally and broadcasts the operation. When the remote operation arrives, binary search locates its exact fractional position.',
        language: 'typescript',
        fileName: 'crdtDoc.ts',
        codeSnippet: `import { CRDTChar, compareCharIDs } from './crdtChar'

export class CRDTDocument {
  private chars: CRDTChar[] = []

  public insert(char: CRDTChar): void {
    // Binary search for insertion point
    let low = 0
    let high = this.chars.length
    while (low < high) {
      const mid = Math.floor((low + high) / 2)
      if (compareCharIDs(this.chars[mid].id, char.id) < 0) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    this.chars.splice(low, 0, char)
  }

  public delete(id: CRDTChar['id']): void {
    const target = this.chars.find(c => compareCharIDs(c.id, id) === 0)
    if (target) {
      target.deleted = true // Tombstone
    }
  }

  public toString(): string {
    return this.chars.filter(c => !c.deleted).map(c => c.value).join('')
  }
}`,
        explanation:
          'The document array is always sorted by fractional ID. No matter what order network packets arrive in, every peer converges to the identical string representation.',
        keyTakeaway: 'Mathematical convergence (Strong Eventual Consistency) guarantees that zero centralized locks or consensus coordinators are needed.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: WebSocket Room Synchronization Gateway',
        subtitle: 'Sub-50ms delta broadcasting with Redis Pub/Sub',
        concept:
          'Clients connect via WebSockets to room gateways. Gateways batch incoming character operations into 10ms micro-windows and broadcast compressed binary updates to room subscribers.',
        language: 'go',
        fileName: 'room_hub.go',
        codeSnippet: `package main

type RoomMessage struct {
	DocID string \`json:"doc_id"\`
	Delta []byte \`json:"delta"\`
}

func (h *RoomHub) HandleClientUpdate(client *Client, delta []byte) {
	// Persist to append-only document change log in Postgres
	h.logRepo.AppendDelta(client.DocID, delta)

	// Broadcast to all active peers in document room
	h.redisPubSub.Publish(ctx, "room:"+client.DocID, delta)
}`,
        explanation:
          'Batching character deltas into 10ms micro-windows reduces network packet overhead by 80% during rapid typing bursts.',
        keyTakeaway: 'Micro-batch keystrokes over WebSocket streams to prevent packet header overhead from overwhelming network buffers.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: Offline Local Storage & Reconnection Sync',
        subtitle: 'Seamless offline editing in IndexedDB and instant sync',
        concept:
          'When offline, all edits are recorded in client IndexedDB. Upon reconnecting, the client sends its current State Vector; the server returns only missing operations.',
        language: 'typescript',
        fileName: 'offlineSync.ts',
        codeSnippet: `export async function syncOnReconnect(docId: string, localStateVector: Record<string, number>) {
  const response = await fetch(\`/api/v1/docs/\${docId}/sync\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stateVector: localStateVector })
  })
  const missingDeltas = await response.json()
  for (const delta of missingDeltas) {
    applyRemoteDelta(delta)
  }
}`,
        explanation:
          'Transfers only the minimal delta changeset needed to catch up the returning peer, minimizing reconnection delay.',
        keyTakeaway: 'Use State Vector exchange to make offline reconnection synchronization bandwidth-efficient.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Tombstone Memory Bloat in Long-Lived Documents',
        impact: 'Deleting 500,000 characters over 2 years keeps 500,000 tombstones in memory, causing browser tabs to consume 2GB+ RAM.',
        mitigationCodeOrStrategy:
          'Garbage Collection with Stable Vector Clocks: When all active peers have confirmed receipt past clock $T$, deleted tombstones before $T$ are safely pruned from the array.',
      },
      {
        incident: 'Interleaving Conflict on Simultaneous Typing',
        impact: 'Alice types "CAT" and Bob types "DOG" at the exact same location, resulting in scrambled text like "CDAOTG".',
        mitigationCodeOrStrategy:
          'RGA Tree Hierarchy & Block-Level Chunking: Group consecutive keystrokes by the same user into atomic runs, preventing character-by-character interleaving.',
      },
    ],
    faangInterviewTips: [
      'Contrast Operational Transformation (OT) vs CRDT: OT requires a central server to linearize operations; CRDT is peer-to-peer, mathematically convergent, and natively handles offline partitions.',
      'Explain Fractional Indexing: Detail how generating numbers between existing floats eliminates array shifting during concurrent insertions.',
      'Explain Tombstones & Garbage Collection: Why characters cannot simply be deleted from arrays, and how state vectors enable safe tombstone pruning.',
    ],
  },

  'distributed-lock': {
    problemStatement:
      'Design a fault-tolerant distributed locking system (like Redlock or Google Chubby) that coordinates exclusive access to shared resources across microservices, survives master crashes without split-brain, and prevents stale writes from delayed clients.',
    naiveApproach: {
      description:
        'Run `SETNX resource_key 1` in a single Redis instance. When finished, run `DEL resource_key`.',
      whyItBreaks: [
        'Deadlock on worker crash: If the client crashes before deleting the key, the lock is held forever, halting all other microservices.',
        'Premature TTL expiry and double execution: If a GC pause or slow query delays Client A past the TTL, Redis auto-deletes the key. Client B acquires the lock. Client A then wakes up and modifies the resource concurrently with Client B.',
        'Replication lag split-brain: Client A acquires lock on Master. Master crashes before replicating to Replica. Replica is promoted to Master. Client B acquires the same lock! Both clients believe they have exclusive access.',
        'Accidental release by another client: Client A runs slow, lock expires. Client B acquires lock. Client A finishes and runs `DEL resource_key`, deleting Client B’s lock!',
      ],
    },
    coreDataStructures: [
      {
        name: 'Fencing Token Monotonic Counter',
        purpose: 'An auto-incrementing integer issued with every lock lease that storage systems check to reject stale writes from paused clients.',
        timeComplexity: 'O(1) atomic increment',
        spaceComplexity: '8 bytes per token',
        asciiDiagram: 'Lock Lease -> Token #34 -> Storage validates Token >= 34 -> Stale #33 Rejected!',
      },
      {
        name: 'Redlock Quorum Voting Protocol',
        purpose: 'Requests locks across N (e.g. 5) independent master nodes; acquired only if >= floor(N/2) + 1 nodes grant it within drift timeout.',
        timeComplexity: 'O(N) parallel network pings',
        spaceComplexity: 'O(1) memory',
      },
      {
        name: 'Lease Watchdog Heartbeat Coroutine',
        purpose: 'Background coroutine extending TTL only while the client process is actively alive and healthy.',
        timeComplexity: 'O(1) periodic renewal',
        spaceComplexity: '1 timer per active lock',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Safe Single-Instance Lock with UUID & Atomic Lua Release',
        subtitle: 'Fixing accidental lock deletion with cryptographically unique tokens',
        concept:
          'To acquire the lock, store a unique random UUID with an expiration TTL: `SET resource_key uuid NX PX 10000`. To release, use a Lua script that checks if the value matches the caller’s UUID before deleting.',
        language: 'go',
        fileName: 'single_lock.go',
        codeSnippet: `package main

import (
	"context"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"time"
)

const releaseLuaScript = \`
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
\`

type SafeLock struct {
	rdb       *redis.Client
	key       string
	token     string
	ttl       time.Duration
}

func (l *SafeLock) Acquire(ctx context.Context) (bool, error) {
	l.token = uuid.NewString()
	// SET key token NX PX ttl
	ok, err := l.rdb.SetNX(ctx, l.key, l.token, l.ttl).Result()
	return ok, err
}

func (l *SafeLock) Release(ctx context.Context) (bool, error) {
	res, err := l.rdb.Eval(ctx, releaseLuaScript, []string{l.key}, l.token).Int()
	return res == 1, err
}`,
        explanation:
          'The Lua script executes atomically on the Redis thread. Client A can never accidentally delete Client B’s lock because the tokens do not match.',
        keyTakeaway: 'Always generate a unique cryptographic token per lock acquisition and release atomically via Lua scripts.',
      },
      {
        stepNumber: 2,
        title: 'Step 2: Fencing Token Storage Invariant',
        subtitle: 'Defending against GC pauses and clock drift with monotonic sequence numbers',
        concept:
          'Even with safe TTLs, a client might experience a 15-second Stop-The-World JVM GC pause. Its lock expires, Client B acquires the lock, and Client A wakes up and executes. A fencing token passed to storage solves this.',
        language: 'sql',
        fileName: 'fencing_schema.sql',
        codeSnippet: `CREATE TABLE shared_bank_accounts (
    account_id UUID PRIMARY KEY,
    balance NUMERIC(15, 2) NOT NULL,
    last_fencing_token BIGINT NOT NULL DEFAULT 0
);

-- Storage layer rejects writes with stale fencing tokens!
UPDATE shared_bank_accounts
SET balance = balance - 100, last_fencing_token = $1
WHERE account_id = $2 AND last_fencing_token < $1;`,
        explanation:
          'When Client A attempts to write with token 33, the database checks `WHERE last_fencing_token < 33`. Since Client B already wrote with token 34, Client A’s write affects 0 rows and is rejected!',
        keyTakeaway: 'Distributed locks cannot guarantee correctness on their own; storage layers MUST enforce monotonic fencing tokens.',
      },
      {
        stepNumber: 3,
        title: 'Step 3: Redlock Multi-Master Quorum Algorithm',
        subtitle: 'Surviving master hardware crashes without split-brain',
        concept:
          'Instead of 1 Redis master with async replicas, Redlock uses 5 independent Redis masters (no replication). A client requests the lock on all 5 in parallel. If it acquires on >= 3 masters within validity time minus drift, the lock is held.',
        language: 'go',
        fileName: 'redlock.go',
        codeSnippet: `package main

import (
	"time"
)

type Redlock struct {
	clients   []*redis.Client // 5 independent Redis masters
	quorum    int             // 3
	driftFact float64         // 0.01 for clock drift margin
}

func (rl *Redlock) Lock(resource string, ttl time.Duration) (string, bool) {
	token := uuid.NewString()
	startTime := time.Now()
	n := 0

	for _, client := range rl.clients {
		ok, _ := client.SetNX(ctx, resource, token, ttl).Result()
		if ok {
			n++
		}
	}

	elapsed := time.Since(startTime)
	drift := time.Duration(float64(ttl) * rl.driftFact) + 2*time.Millisecond
	validityTime := ttl - elapsed - drift

	// Acquired only if majority voted YES and validity time remains
	if n >= rl.quorum && validityTime > 0 {
		return token, true
	}

	// Failed: Unlock all instances
	rl.Unlock(resource, token)
	return "", false
}`,
        explanation:
          'Even if 2 out of 5 Redis instances crash simultaneously, the remaining 3 masters prevent any other client from acquiring the lock.',
        keyTakeaway: 'Redlock uses quorum voting ($N=5$, Quorum=3) across independent nodes to tolerate up to $\\lfloor N/2 \\rfloor$ node failures.',
      },
      {
        stepNumber: 4,
        title: 'Step 4: Watchdog Heartbeat Auto-Renewal Coroutine',
        subtitle: 'Extending TTL automatically while work is running',
        concept:
          'Instead of guessing a safe TTL (e.g. 60 seconds), set a 10-second TTL and spawn a background watchdog timer that extends the lock every 3 seconds as long as the worker goroutine is actively making progress.',
        language: 'go',
        fileName: 'watchdog.go',
        codeSnippet: `package main

func (l *SafeLock) StartWatchdog(ctx context.Context, done <-chan struct{}) {
	ticker := time.NewTicker(l.ttl / 3)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return // Job finished, exit renewal loop
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Extend TTL atomically
			l.rdb.Expire(ctx, l.key, l.ttl)
		}
	}
}`,
        explanation:
          'If the worker crashes, the watchdog dies with it, allowing the lock to expire in 10 seconds. If the worker runs for 2 hours, the lock is safely renewed without timing out.',
        keyTakeaway: 'Use short TTLs paired with active watchdog renewals to balance quick deadlock recovery with long task execution.',
      },
      {
        stepNumber: 5,
        title: 'Step 5: High-Availability Failover & Graceful Degradation',
        subtitle: 'Circuit breaking lock acquisition on cluster partitions',
        concept:
          'If network partitions isolate Redis nodes, lock requests must fail fast with exponential backoff and jitter to prevent hammering remaining nodes.',
        language: 'go',
        fileName: 'lock_manager.go',
        codeSnippet: `package main

import (
	"math/rand"
	"time"
)

func (rl *Redlock) LockWithRetry(resource string, maxRetries int) (string, bool) {
	for i := 0; i < maxRetries; i++ {
		token, ok := rl.Lock(resource, 10*time.Second)
		if ok {
			return token, true
		}
		// Random backoff jitter between 50ms and 200ms
		jitter := time.Duration(rand.Intn(150)+50) * time.Millisecond
		time.Sleep(jitter)
	}
	return "", false
}`,
        explanation:
          'Random jitter ensures that multiple competing clients retry at different offsets, preventing synchronized collision retry storms.',
        keyTakeaway: 'Always add randomized jitter to lock retry intervals to avoid harmonic resonance retry storms.',
      },
    ],
    disasterScenarios: [
      {
        incident: 'Redis Clock Jump / NTP Step Skew',
        impact: 'System administrator or NTP sync steps the local server clock forward by 10 seconds, causing Redis to immediately expire an active lock.',
        mitigationCodeOrStrategy:
          'Use Monotonic Clocks & NTP Slew: Configure NTP servers to slew (gradually drift) rather than step clocks; Redlock deducts maximum drift tolerance ($\Delta$) from calculated validity time.',
      },
      {
        incident: 'Client Process Frozen by Stop-The-World GC Pause',
        impact: 'Client holds lock, enters 30-second GC pause. Lock expires. Second client acquires lock. First client wakes up and commits stale write.',
        mitigationCodeOrStrategy:
          'Mandatory Fencing Tokens: Every lock grant returns an auto-incrementing integer fencing token; underlying databases check `WHERE fencing_token > last_seen_token` to discard stale writes.',
      },
    ],
    faangInterviewTips: [
      'Martin Kleppmann vs Salvatore Sanfilippo (Antirez) Debate: Cite the famous distributed systems debate on whether Redlock is safe without fencing tokens (it is NOT without storage validation).',
      'Differentiate Locks for Efficiency vs Locks for Correctness: If duplicate execution causes catastrophic monetary loss, you need consensus (Raft/Paxos) + fencing tokens.',
      'Explain Atomic Lua Release: Why `DEL` is a fatal rookie mistake and how `if redis.call("get") == token then redis.call("del")` prevents deleting another client’s lock.',
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

