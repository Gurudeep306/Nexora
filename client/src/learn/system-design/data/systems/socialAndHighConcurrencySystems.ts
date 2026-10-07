import type { SystemDesignModel } from '../../types'

export const SOCIAL_AND_CONCURRENCY_SYSTEMS: SystemDesignModel[] = [
  {
    id: 'twitter-feed',
    name: 'Social Media News Feed (Twitter / X Timeline)',
    category: 'High-Concurrency & Social',
    difficulty: 'Advanced',
    tagline: 'High-scale social timeline aggregation combining Fanout-on-Write for normal users and Fanout-on-Read for celebrities to eliminate write amplification.',
    throughput: '30,000 tweets/sec · 300,000 timeline reads/sec',
    latency: 'p99 Read < 25ms · p99 Write < 50ms',
    storageScale: 'Billions of tweets, 500M Daily Active Users (DAU)',
    overview:
      'A real-time social timeline generation architecture. Employs a hybrid fanout model: standard tweets are pushed (Fanout-on-Write) directly into followers’ Redis timeline lists, while celebrity accounts with millions of followers (e.g. >25,000 followers) bypass the push pipeline to prevent catastrophic write amplification and are merged on-the-fly when followers query their feeds (Fanout-on-Read).',
    functionalReqs: [
      'Post new tweets (text, media URLs, mentions) with immediate visibility.',
      'Generate a personalized Home Timeline of tweets from followed users, sorted chronologically.',
      'Support user profile timelines (tweets posted by a single user).',
      'Follow and unfollow relationships.',
      'Handle celebrity accounts with tens of millions of followers seamlessly.',
    ],
    nonFunctionalReqs: [
      'Home Timeline generation latency under 50ms.',
      'High availability (eventual consistency acceptable for timeline updates).',
      'Scalable to 500 million Daily Active Users (DAU).',
    ],
    calculations: [
      {
        metric: 'Write Throughput',
        formula: '500M DAU * 2 tweets/day = 1B tweets/day ≈ 11,500 tweets/sec (Peak: 30,000/sec)',
        result: '30,000 tweets/sec peak write load',
      },
      {
        metric: 'Read Throughput',
        formula: '500M DAU * 5 visits/day = 2.5B timeline queries/day ≈ 29,000 reads/sec (Peak: 300,000/sec)',
        result: '300,000 timeline requests/sec',
      },
      {
        metric: 'Celebrity Fanout Explosion (The Problem)',
        formula: '1 tweet by a celebrity with 50M followers = 50M writes to Redis timeline lists',
        result: '50,000,000 cache writes per tweet (Eliminated via Hybrid model)',
      },
      {
        metric: 'Timeline Cache Memory',
        formula: '500M DAU * 800 tweets in list * 8 bytes (Tweet ID) ≈ 3.2 TB RAM in Redis',
        result: '3.2 TB Redis RAM across cluster',
      },
    ],
    services: [
      { id: 'client', name: 'User Mobile / Web App', role: 'Posts tweet or loads timeline', type: 'client', x: 10, y: 50, icon: 'Smartphone', techStack: 'React Native / Web', details: 'Sends POST /v1/tweets or GET /v1/timeline' },
      { id: 'gateway', name: 'API Gateway', role: 'Auth, SSL termination, and routing', type: 'gateway', x: 30, y: 50, icon: 'Shield', techStack: 'Envoy Proxy', details: 'Validates JWT token and rate limits' },
      { id: 'tweet-service', name: 'Tweet Post Service', role: 'Persists tweet and initiates fanout', type: 'service', x: 50, y: 30, icon: 'Send', techStack: 'Go / gRPC', details: 'Writes tweet to DB; evaluates follower count' },
      { id: 'timeline-service', name: 'Timeline Query Service', role: 'Serves user home timeline', type: 'service', x: 50, y: 70, icon: 'List', techStack: 'Go / gRPC', details: 'Reads from Redis; merges celebrity tweets' },
      { id: 'fanout-queue', name: 'Fanout Kafka Stream', role: 'Asynchronous fanout message queue', type: 'queue', x: 70, y: 20, icon: 'Layers', techStack: 'Apache Kafka', details: 'Decouples tweet posting from heavy fanout' },
      { id: 'fanout-workers', name: 'Fanout Worker Pool', role: 'Pushes tweet ID into follower caches', type: 'worker', x: 88, y: 20, icon: 'Users', techStack: 'Go Workers', details: 'Fetches followers; writes to Redis lists' },
      { id: 'timeline-cache', name: 'Redis Timeline Cache', role: 'Stores user timeline tweet ID lists', type: 'cache', x: 75, y: 50, icon: 'Zap', techStack: 'Redis Cluster', details: 'LPUSH tweet_id with LTRIM to 800 items' },
      { id: 'tweet-db', name: 'Tweet Store (Cassandra)', role: 'Persistent storage of tweet contents', type: 'database', x: 88, y: 70, icon: 'Database', techStack: 'Apache Cassandra / ScyllaDB', details: 'Clustered by user_id and tweet_id' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'gateway', label: 'POST /v1/tweets', protocol: 'HTTPS' },
      { id: 'c2', from: 'gateway', to: 'tweet-service', label: 'gRPC PostTweet()', protocol: 'gRPC' },
      { id: 'c3', from: 'tweet-service', to: 'tweet-db', label: 'INSERT tweet', protocol: 'TCP' },
      { id: 'c4', from: 'tweet-service', to: 'fanout-queue', label: 'Publish FanoutJob', protocol: 'Kafka' },
      { id: 'c5', from: 'fanout-queue', to: 'fanout-workers', label: 'Consume FanoutJob', protocol: 'TCP' },
      { id: 'c6', from: 'fanout-workers', to: 'timeline-cache', label: 'LPUSH timeline:{follower_id}', protocol: 'Redis' },
      { id: 'c7', from: 'gateway', to: 'timeline-service', label: 'GET /v1/timeline', protocol: 'HTTPS' },
      { id: 'c8', from: 'timeline-service', to: 'timeline-cache', label: 'LRANGE timeline:{user_id} 0 20', protocol: 'Redis' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: User Submits New Tweet',
        description: 'User Alice posts: "Excited to launch our new distributed database!" Request arrives at API Gateway.',
        fromNode: 'client',
        toNode: 'gateway',
        protocol: 'HTTPS',
        payload: { text: 'Excited to launch our new distributed database!', media: [] },
        codeRef: { file: 'tweet_service.go', lineHighlight: '18-28', funcName: 'PostTweet', codeExplanation: 'Authenticates user Alice; assigns Snowflake 64-bit ID to new tweet.' },
        stateChange: 'Gateway routes request to Tweet Post Service.',
      },
      {
        step: 2,
        title: 'Step 2: Database Persistence & Celebrity Evaluation',
        description: 'Tweet Post Service inserts tweet into Cassandra and checks Alice\'s follower count (1,200 followers).',
        fromNode: 'tweet-service',
        toNode: 'tweet-db',
        protocol: 'TCP',
        payload: { tweetId: '7213894723984729344', authorId: 'alice_12', followerCount: 1200 },
        codeRef: { file: 'tweet_service.go', lineHighlight: '32-45', funcName: 'PostTweet', codeExplanation: 'Follower count is < 25,000 threshold. Service triggers Fanout-on-Write via Kafka.' },
        stateChange: 'Tweet safely committed to disk.',
      },
      {
        step: 3,
        title: 'Step 3: Asynchronous Fanout Job Published',
        description: 'Tweet Post Service pushes fanout message to Kafka topic "fanout-jobs" and returns HTTP 201 to Alice in 15ms.',
        fromNode: 'tweet-service',
        toNode: 'fanout-queue',
        protocol: 'Kafka',
        payload: { tweetId: '7213894723984729344', authorId: 'alice_12', action: 'FANOUT_PUSH' },
        codeRef: { file: 'tweet_service.go', lineHighlight: '48-55', funcName: 'PublishFanout', codeExplanation: 'Fires event to Kafka partition; releases client HTTP response without waiting for fanout.' },
        stateChange: 'Client receives tweet publication confirmation.',
      },
      {
        step: 4,
        title: 'Step 4: Fanout Workers Push to Follower Timeline Caches',
        description: 'Worker pool consumes job, queries follower graph for Alice\'s 1,200 followers, and executes pipelined Redis LPUSH.',
        fromNode: 'fanout-workers',
        toNode: 'timeline-cache',
        protocol: 'Redis',
        payload: { command: 'LPUSH', key: 'timeline:bob_34', tweetId: '7213894723984729344', trimLimit: 800 },
        codeRef: { file: 'fanout_worker.go', lineHighlight: '25-42', funcName: 'FanoutToFollowers', codeExplanation: 'Batches Redis LPUSH commands into pipelines of 100 to maximize cache throughput.' },
        stateChange: 'Bob\'s timeline in Redis now contains Alice\'s new tweet at index 0.',
      },
      {
        step: 5,
        title: 'Step 5: Follower Reads Home Timeline',
        description: 'Follower Bob refreshes timeline. Timeline Service queries Redis, merges tweets from followed celebrities, and returns rendered feed.',
        fromNode: 'gateway',
        toNode: 'timeline-service',
        protocol: 'HTTPS',
        payload: { userId: 'bob_34', count: 20 },
        codeRef: { file: 'timeline_service.go', lineHighlight: '15-35', funcName: 'GetHomeTimeline', codeExplanation: 'Retrieves Redis tweet IDs, executes multi-get on Cassandra for tweet details, returns feed in 18ms.' },
        stateChange: 'Bob views personalized timeline instantly.',
      },
    ],
    codeFiles: [
      {
        name: 'tweet_service.go',
        language: 'go',
        role: 'Tweet Ingestion & Hybrid Fanout Evaluator',
        code: `package main

import (
	"context"
	"net/http"
	"time"
)

const CelebrityFollowerThreshold = 25000

type TweetService struct {
	db          CassandraClient
	kafka       KafkaProducer
	graphClient SocialGraphClient
	snowflake   SnowflakeGenerator
}

func (s *TweetService) PostTweet(w http.ResponseWriter, r *http.Request) {
	userId := r.Header.Get("X-User-ID")
	text := r.FormValue("text")

	tweetId := s.snowflake.NextID()
	createdAt := time.Now()

	// 1. Persist tweet in Cassandra
	err := s.db.InsertTweet(tweetId, userId, text, createdAt)
	if err != nil {
		http.Error(w, "Failed to save tweet", http.StatusInternalServerError)
		return
	}

	// 2. Check follower count for hybrid fanout routing
	followerCount := s.graphClient.GetFollowerCount(userId)

	if followerCount > CelebrityFollowerThreshold {
		// CELEBRITY: Do NOT fanout to millions of lists!
		// Followers will pull this tweet dynamically upon timeline query (Fanout-on-Read).
		s.kafka.Publish("celebrity-tweets", userId, tweetId)
	} else {
		// REGULAR USER: Push to followers' Redis timeline lists (Fanout-on-Write)
		s.kafka.Publish("fanout-jobs", userId, tweetId)
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(fmt.Sprintf(\`{"tweetId":"%d","status":"published"}\`, tweetId)))
}`,
      },
      {
        name: 'timeline_service.go',
        language: 'go',
        role: 'Timeline Aggregator with Hybrid Celebrity Merge',
        code: `package main

import (
	"sort"
	"github.com/go-redis/redis/v8"
)

type TimelineService struct {
	rdb         *redis.Client
	db          CassandraClient
	graphClient SocialGraphClient
}

func (s *TimelineService) GetHomeTimeline(ctx context.Context, userId string, limit int) ([]Tweet, error) {
	// 1. Fetch pre-computed tweet IDs from user's Redis timeline list
	cachedTweetIds, _ := s.rdb.LRange(ctx, "timeline:"+userId, 0, int64(limit*2)).Result()

	// 2. Fetch recent tweets from followed celebrities (Fanout-on-Read)
	followedCelebrities := s.graphClient.GetFollowedCelebrities(userId)
	var celebrityTweetIds []string

	for _, celebId := range followedCelebrities {
		recentIds, _ := s.rdb.LRange(ctx, "user_tweets:"+celebId, 0, 5).Result()
		celebrityTweetIds = append(celebrityTweetIds, recentIds...)
	}

	// 3. Merge & Sort by Tweet ID (Snowflake IDs are chronologically sorted)
	allIds := append(cachedTweetIds, celebrityTweetIds...)
	sort.Slice(allIds, func(i, j int) bool {
		return allIds[i] > allIds[j] // Descending order (newest first)
	})

	if len(allIds) > limit {
		allIds = allIds[:limit]
	}

	// 4. Multi-Get full tweet metadata from Cassandra / Memcached
	return s.db.GetTweetsBatch(allIds)
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'The Twitter architecture solves the classic fanout dilemma by segmenting users: normal user tweets are pushed into followers\' Redis timeline lists asynchronously via Kafka workers. Celebrity tweets (users with >25k followers) bypass the push pipeline and are pulled and merged into the timeline on-the-fly upon query time.',
      databaseSchema: 'Cassandra: CREATE TABLE tweets (user_id UUID, tweet_id BIGINT, text TEXT, created_at TIMESTAMP, PRIMARY KEY (user_id, tweet_id)) WITH CLUSTERING ORDER BY (tweet_id DESC);',
      apiEndpoints: [
        { method: 'POST', path: '/v1/tweets', desc: 'Posts a tweet' },
        { method: 'GET', path: '/v1/timeline', desc: 'Retrieves chronological home timeline' },
      ],
      bottlenecksAndTradeoffs: [
        'Inactive Users Incurring Memory Cost: Fanning out tweets to users who haven\'t logged in for 30 days wastes Redis RAM. Mitigated by only fanning out to active users; when an inactive user logs back in, their timeline is rebuilt on-demand.',
      ],
    },
  },
  {
    id: 'whatsapp-chat',
    name: 'Real-Time Messaging & Chat (WhatsApp / Telegram)',
    category: 'High-Concurrency & Social',
    difficulty: 'Expert',
    tagline: 'End-to-end encrypted messaging engine supporting 2 Billion users with persistent WebSocket/TCP gateways, Erlang/Go connection managers, and offline message storage.',
    throughput: '100 Billion messages/day ≈ 1.2M messages/sec',
    latency: 'End-to-end delivery latency < 100ms globally',
    storageScale: 'Petabytes of encrypted message queues and media blob storage',
    overview:
      'A globally distributed real-time messaging architecture. Maintains millions of concurrent persistent WebSocket and TCP connections across an Erlang/Go gateway layer. Employs distributed session registries (Redis / Cassandra) to route messages directly to active recipient sockets or park them in durable offline mailboxes for deferred delivery.',
    functionalReqs: [
      '1-on-1 and Group Chat (up to 1,024 members) with end-to-end encryption.',
      'Message status receipts: Sent (single check), Delivered (double check), Read (blue check).',
      'Presence indicators (Online / Offline / Typing status).',
      'Offline message queueing: Deliver unread messages immediately when recipient reconnects.',
    ],
    nonFunctionalReqs: [
      'Sub-100ms message delivery for online users.',
      'Zero message loss: Every message must reach the recipient eventually.',
      'Battery and mobile data efficiency on client devices.',
    ],
    calculations: [
      {
        metric: 'Peak Message Throughput',
        formula: '100B messages / 86,400 sec ≈ 1,157,000 msgs/sec (Peak: 3M msgs/sec)',
        result: '3,000,000 messages/sec',
      },
      {
        metric: 'Concurrent TCP Connections',
        formula: '500M concurrent online users connected via long-lived sockets',
        result: '500,000,000 open TCP sockets (requires tuning Linux ephemeral ports & file descriptors)',
      },
      {
        metric: 'Gateway Node Count',
        formula: '500M connections / 100,000 connections per gateway server = 5,000 servers',
        result: '5,000 Gateway instances globally',
      },
    ],
    services: [
      { id: 'sender', name: 'Sender Client', role: 'Sends encrypted message', type: 'client', x: 10, y: 35, icon: 'Send', techStack: 'Mobile App (iOS/Android)', details: 'Holds TLS / WebSocket connection to Gateway' },
      { id: 'recipient', name: 'Recipient Client', role: 'Receives encrypted message', type: 'client', x: 10, y: 70, icon: 'Smartphone', techStack: 'Mobile App (iOS/Android)', details: 'Holds TLS / WebSocket connection to Gateway' },
      { id: 'gateway-1', name: 'Chat Gateway 1', role: 'Maintains open socket with Sender', type: 'gateway', x: 38, y: 35, icon: 'Radio', techStack: 'Go / Erlang BEAM', details: 'Holds 100k persistent WebSocket connections' },
      { id: 'gateway-2', name: 'Chat Gateway 2', role: 'Maintains open socket with Recipient', type: 'gateway', x: 38, y: 70, icon: 'Radio', techStack: 'Go / Erlang BEAM', details: 'Holds 100k persistent WebSocket connections' },
      { id: 'session-store', name: 'User Session Store', role: 'Maps user_id -> Gateway IP', type: 'cache', x: 62, y: 50, icon: 'Compass', techStack: 'Redis Cluster', details: 'Maintains active socket locator with 60s TTL heartbeats' },
      { id: 'msg-service', name: 'Message Dispatcher Service', role: 'Coordinates message routing & receipts', type: 'service', x: 62, y: 20, icon: 'Server', techStack: 'Go Microservice', details: 'Routes messages between gateways or queues offline' },
      { id: 'offline-db', name: 'Offline Message Store', role: 'Stores messages for disconnected users', type: 'database', x: 88, y: 35, icon: 'Inbox', techStack: 'Cassandra / ScyllaDB', details: 'Queues messages until recipient socket connects' },
      { id: 'push-service', name: 'Push Notification Engine', role: 'Triggers APNs / FCM for backgrounded apps', type: 'worker', x: 88, y: 70, icon: 'Bell', techStack: 'Apple APNs / Google FCM', details: 'Wakes up mobile client if socket is dead' },
    ],
    connections: [
      { id: 'c1', from: 'sender', to: 'gateway-1', label: 'Send Message (Encrypted payload)', protocol: 'WebSocket' },
      { id: 'c2', from: 'gateway-1', to: 'msg-service', label: 'RouteMessage(to: Bob)', protocol: 'gRPC' },
      { id: 'c3', from: 'msg-service', to: 'session-store', label: 'Lookup Bob Session', protocol: 'Redis' },
      { id: 'c4', from: 'msg-service', to: 'gateway-2', label: 'DeliverToSocket(Bob)', protocol: 'gRPC' },
      { id: 'c5', from: 'gateway-2', to: 'recipient', label: 'Push Message over open socket', protocol: 'WebSocket' },
      { id: 'c6', from: 'msg-service', to: 'offline-db', label: 'Save Offline Message (if offline)', protocol: 'TCP' },
      { id: 'c7', from: 'msg-service', to: 'push-service', label: 'Trigger Mobile Wakeup Push', protocol: 'HTTPS' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Message Dispatched Over Persistent WebSocket',
        description: 'Alice sends message to Bob. Message is transmitted through Alice\'s established TLS WebSocket connection to Gateway 1.',
        fromNode: 'sender',
        toNode: 'gateway-1',
        protocol: 'WebSocket',
        payload: { from: 'alice_12', to: 'bob_34', msgId: 'm_908123', encryptedBytes: 'cipher_9a8f...', timestamp: 1718029301000 },
        codeRef: { file: 'chat_gateway.go', lineHighlight: '22-35', funcName: 'HandleIncomingMessage', codeExplanation: 'Reads binary frame from WebSocket; assigns server timestamp; returns ACK (single check).' },
        stateChange: 'Alice receives "SENT" acknowledgment immediately.',
      },
      {
        step: 2,
        title: 'Step 2: Session Registry Lookup',
        description: 'Message Dispatcher queries Redis User Session Store to find which Gateway server Bob is currently connected to.',
        fromNode: 'msg-service',
        toNode: 'session-store',
        protocol: 'Redis',
        payload: { command: 'GET', key: 'session:bob_34' },
        codeRef: { file: 'session_router.go', lineHighlight: '15-28', funcName: 'LocateRecipientGateway', codeExplanation: 'Retrieves Gateway IP address where Bob\'s socket resides (e.g. 10.0.4.12).' },
        stateChange: 'Session found: Bob is connected to Gateway 2.',
      },
      {
        step: 3,
        title: 'Step 3: Direct Inter-Gateway gRPC Delivery',
        description: 'Message Dispatcher forwards payload directly to Gateway 2 via low-latency internal gRPC.',
        fromNode: 'msg-service',
        toNode: 'gateway-2',
        protocol: 'gRPC',
        payload: { recipientId: 'bob_34', msgId: 'm_908123', encryptedBytes: 'cipher_9a8f...' },
        codeRef: { file: 'chat_gateway.go', lineHighlight: '42-55', funcName: 'DeliverToLocalSocket', codeExplanation: 'Looks up Bob\'s socket descriptor in local connection map; writes binary frame to socket.' },
        stateChange: 'Gateway 2 prepares socket write.',
      },
      {
        step: 4,
        title: 'Step 4: Push to Recipient Device & Delivery Receipt',
        description: 'Gateway 2 pushes message down Bob\'s open WebSocket connection. Bob\'s phone emits "DELIVERED" receipt back to Alice.',
        fromNode: 'gateway-2',
        toNode: 'recipient',
        protocol: 'WebSocket',
        payload: { msgId: 'm_908123', status: 'DELIVERED' },
        codeRef: { file: 'chat_gateway.go', lineHighlight: '60-72', funcName: 'HandleDeliveryReceipt', codeExplanation: 'Routes double check delivery receipt back to Alice\'s gateway.' },
        stateChange: 'Bob receives message; Alice\'s UI updates to double check (Delivered). Total time: 42ms.',
      },
    ],
    codeFiles: [
      {
        name: 'chat_gateway.go',
        language: 'go',
        role: 'Persistent WebSocket Connection Manager & Socket Router',
        code: `package main

import (
	"context"
	"sync"
	"github.com/gorilla/websocket"
)

type GatewayServer struct {
	mu           sync.RWMutex
	connections  map[string]*websocket.Conn // user_id -> open socket
	sessionStore RedisClient
	dispatcher   DispatcherClient
}

func (g *GatewayServer) HandleSocketConnect(userId string, conn *websocket.Conn) {
	g.mu.Lock()
	g.connections[userId] = conn
	g.mu.Unlock()

	// Register current Gateway IP in Redis session store (TTL: 60s)
	g.sessionStore.Set("session:"+userId, GetLocalServerIP(), 60*time.Second)

	defer func() {
		g.mu.Lock()
		delete(g.connections, userId)
		g.mu.Unlock()
		g.sessionStore.Del("session:" + userId)
		conn.Close()
	}()

	// Read loop for messages from this client
	for {
		_, msgBytes, err := conn.ReadMessage()
		if err != nil { break }

		// Dispatch message to recipient router
		go g.dispatcher.RouteMessage(context.Background(), userId, msgBytes)
	}
}

// DeliverToLocalSocket called via gRPC from other gateways
func (g *GatewayServer) DeliverToLocalSocket(recipientId string, msg []byte) bool {
	g.mu.RLock()
	conn, exists := g.connections[recipientId]
	g.mu.RUnlock()

	if !exists { return false }

	err := conn.WriteMessage(websocket.BinaryMessage, msg)
	return err == nil
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'WhatsApp architecture keeps persistent TCP/WebSocket connections open on stateful Gateway nodes. An in-memory distributed registry tracks which node holds each user\'s socket. If the recipient is offline, messages enter a durable Cassandra mailbox and APNs/FCM triggers a background push notification.',
      databaseSchema: 'Cassandra mailbox: CREATE TABLE offline_messages (recipient_id UUID, message_id TIMEUUID, sender_id UUID, payload BLOB, PRIMARY KEY (recipient_id, message_id));',
      apiEndpoints: [
        { method: 'WS', path: '/v1/chat/connect', desc: 'Persistent bidirectional WebSocket connection' },
      ],
      bottlenecksAndTradeoffs: [
        'Connection State During Server Restarts: If a gateway node holding 100,000 connections crashes, all 100,000 devices reconnect simultaneously, creating a thundering herd on the API gateway and auth service. Mitigated via exponential backoff with full jitter on client reconnect logic.',
      ],
    },
  },
  {
    id: 'flash-sale',
    name: 'E-Commerce Flash Sale & Inventory Reservation',
    category: 'High-Concurrency & Social',
    difficulty: 'Advanced',
    tagline: 'Zero-overselling flash sale architecture utilizing Redis atomic Lua scripts, optimistic database locking, and asynchronous Kafka order reconciliation.',
    throughput: '100,000 purchase attempts/sec during 10-second flash sale spikes',
    latency: 'p99 Checkout Reservation < 15ms',
    storageScale: 'Strict transactional integrity on stock levels',
    overview:
      'An ultra-high concurrency inventory reservation architecture designed to prevent overselling during flash sale spikes. Isolates high-frequency stock decrements in Redis using atomic Lua scripts (DECRBY with negative guard), issuing a time-limited 15-minute reservation token before queuing orders into Kafka for asynchronous database fulfillment.',
    functionalReqs: [
      'Strictly guarantee zero overselling: Exactly N inventory units sold, never N+1.',
      'Provide immediate reservation feedback to users in under 20ms.',
      '15-minute payment window: Release reserved stock automatically if payment is not completed.',
      'Prevent duplicate checkout attempts via idempotency keys.',
    ],
    nonFunctionalReqs: [
      'High throughput: Absorb 100k requests/sec without crashing relational database.',
      'Strong ACID consistency on inventory transactions.',
    ],
    calculations: [
      {
        metric: 'Inventory Contention Problem',
        formula: '1,000 items in stock vs 1,000,000 concurrent checkout clicks',
        result: 'Relational DB row lock contention causes deadlock & DB meltdown',
      },
      {
        metric: 'Redis Atomic Lua Throughput',
        formula: 'Single Redis key decrement via in-memory Lua script = ~80,000 ops/sec',
        result: '80,000 reservations/sec per Redis instance',
      },
    ],
    services: [
      { id: 'client', name: 'Buyer Mobile / Web', role: 'Clicks "Buy Now" during flash sale', type: 'client', x: 10, y: 50, icon: 'ShoppingBag', techStack: 'React / Native', details: 'Sends POST /v1/checkout with Idempotency Key' },
      { id: 'gateway', name: 'Rate Limiter & Gateway', role: 'Filters bot traffic & throttles', type: 'gateway', x: 32, y: 50, icon: 'Shield', techStack: 'Envoy / Redis', details: 'Blocks duplicate requests within 1 second window' },
      { id: 'sale-service', name: 'Flash Sale Service', role: 'Executes atomic stock decrement', type: 'service', x: 55, y: 35, icon: 'Zap', techStack: 'Go / Java', details: 'Runs Redis Lua script for O(1) stock reservation' },
      { id: 'redis-stock', name: 'Redis Stock Cache', role: 'In-memory atomic stock counter', type: 'cache', x: 55, y: 75, icon: 'Database', techStack: 'Redis Cluster', details: 'Holds stock:item_1234. Executes atomic Lua script' },
      { id: 'order-queue', name: 'Order Kafka Queue', role: 'Asynchronous buffer for orders', type: 'queue', x: 78, y: 35, icon: 'Layers', techStack: 'Apache Kafka', details: 'Smooths traffic spike for relational database' },
      { id: 'order-db', name: 'Postgres Order DB', role: 'Permanent financial order record', type: 'database', x: 78, y: 75, icon: 'CheckCircle', techStack: 'PostgreSQL Sharded', details: 'Writes order record and decrements persistent stock' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'gateway', label: 'POST /v1/checkout', protocol: 'HTTPS' },
      { id: 'c2', from: 'gateway', to: 'sale-service', label: 'ReserveInventory()', protocol: 'gRPC' },
      { id: 'c3', from: 'sale-service', to: 'redis-stock', label: 'EVALSHA decr_stock.lua', protocol: 'Redis' },
      { id: 'c4', from: 'sale-service', to: 'order-queue', label: 'Produce OrderCreated Event', protocol: 'Kafka' },
      { id: 'c5', from: 'order-queue', to: 'order-db', label: 'Commit Order & Payment Token', protocol: 'SQL' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Flash Sale Ingestion & Bot Scrubbing',
        description: 'Customer clicks Buy Now. Gateway verifies captcha token and rate limits requests from the same user ID.',
        fromNode: 'client',
        toNode: 'gateway',
        protocol: 'HTTPS',
        payload: { itemId: 'item_iphone16_99', qty: 1, idempotencyKey: 'idemp_8192a_90' },
        codeRef: { file: 'flash_sale.go', lineHighlight: '15-25', funcName: 'HandlePurchase', codeExplanation: 'Verifies idempotency token in Redis; forward to Flash Sale Service.' },
        stateChange: 'Request validated; enters reservation engine.',
      },
      {
        step: 2,
        title: 'Step 2: Atomic In-Memory Stock Decrement (Lua)',
        description: 'Sale Service invokes atomic Lua script on Redis. If stock > 0, decrement by 1 and return reservation token.',
        fromNode: 'sale-service',
        toNode: 'redis-stock',
        protocol: 'Redis',
        payload: { script: 'decr_stock.lua', key: 'stock:item_iphone16_99', qty: 1 },
        codeRef: { file: 'decr_stock.lua', lineHighlight: '1-15', funcName: 'decr_stock', codeExplanation: 'Atomically checks if stock >= requested; decrements and returns 1. If stock < requested, returns 0 (Sold Out).' },
        stateChange: 'Redis stock decremented from 1,000 to 999. In-memory reservation confirmed in 0.9ms.',
      },
      {
        step: 3,
        title: 'Step 3: Asynchronous Order Queuing',
        description: 'Reservation succeeded! Sale Service publishes order event to Kafka topic "flash-orders".',
        fromNode: 'sale-service',
        toNode: 'order-queue',
        protocol: 'Kafka',
        payload: { orderId: 'ord_918231', userId: 'usr_891', itemId: 'item_iphone16_99', status: 'PENDING_PAYMENT' },
        codeRef: { file: 'flash_sale.go', lineHighlight: '35-48', funcName: 'PublishOrder', codeExplanation: 'Emits event to Kafka; consumer worker will persist order to Postgres at controlled pace.' },
        stateChange: 'User receives HTTP 200 "Reserved! Please pay within 15 minutes".',
      },
    ],
    codeFiles: [
      {
        name: 'decr_stock.lua',
        language: 'lua',
        role: 'Atomic Inventory Decrement with Zero-Overselling Guard',
        code: `-- KEYS[1]: Item Stock Key (e.g. stock:item_123)
-- ARGV[1]: Requested Quantity (e.g. 1)
-- Returns: 1 (Reserved), 0 (Sold Out / Insufficient Stock)

local stock = tonumber(redis.call('get', KEYS[1]))

if stock == nil then
    return -1 -- Key does not exist
end

local requested = tonumber(ARGV[1])

if stock >= requested then
    redis.call('decrby', KEYS[1], requested)
    return 1 -- Success! Stock reserved atomically
else
    return 0 -- Sold out! Zero overselling guarantee
end`,
      },
      {
        name: 'flash_sale.go',
        language: 'go',
        role: 'Flash Sale Reservation Service Controller',
        code: `package main

import (
	"context"
	"net/http"
	"github.com/go-redis/redis/v8"
)

type FlashSaleService struct {
	rdb         *redis.Client
	kafkaWriter KafkaWriter
	luaSha      string
}

func (s *FlashSaleService) ReserveItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	itemId := r.FormValue("itemId")
	userId := r.Header.Get("X-User-ID")

	stockKey := "stock:" + itemId

	// 1. Run atomic Lua script
	res, err := s.rdb.EvalSha(ctx, s.luaSha, []string{stockKey}, 1).Int()
	if err != nil || res != 1 {
		http.Error(w, "Sorry, this item is sold out!", http.StatusConflict)
		return
	}

	// 2. Publish order reservation to Kafka
	orderId := GenerateUUID()
	s.kafkaWriter.Publish("flash-orders", orderId, userId, itemId)

	// 3. Return success with 15-minute payment window
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf(\`{"orderId":"%s","status":"RESERVED","ttlMinutes":15}\`, orderId)))
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'To shield relational databases from catastrophic locking during flash sales, the architecture decouples checkout reservation from database writes. Inventory is held in Redis RAM and decremented using single-threaded atomic Lua scripts. Successfully reserved orders flow through Kafka into PostgreSQL, where background workers process payments and fulfill shipments.',
      databaseSchema: 'PostgreSQL: CREATE TABLE inventory (item_id VARCHAR(64) PRIMARY KEY, total_stock INT NOT NULL, reserved_stock INT NOT NULL, version INT NOT NULL);',
      apiEndpoints: [
        { method: 'POST', path: '/v1/checkout/reserve', desc: 'Atomically decrements stock and issues reservation' },
      ],
      bottlenecksAndTradeoffs: [
        'Redis Crashes and Inventory Inconsistency: If Redis crashes before a write is synced to disk, reservations could diverge from Postgres. Solved by pre-loading Redis with inventory from Postgres, and running Redis in Master-Replica pairs with Sentinel failover.',
      ],
    },
  },
]
