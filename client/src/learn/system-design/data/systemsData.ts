import type { SystemDesignModel } from '../types'
import { DISTRIBUTED_CORE_SYSTEMS } from './systems/distributedCoreSystems'
import { SOCIAL_AND_CONCURRENCY_SYSTEMS } from './systems/socialAndHighConcurrencySystems'
import { STREAMING_AND_MEDIA_SYSTEMS } from './systems/streamingAndMediaSystems'
import { FINANCIAL_AND_LOW_LATENCY_SYSTEMS } from './systems/financialAndLowLatencySystems'
import { GEOSPATIAL_AND_SEARCH_SYSTEMS } from './systems/geospatialAndSearchSystems'
import { ADDITIONAL_SYSTEMS } from './systems/additionalSystems'

// Complementary systems to guarantee at least 30 top-level systems
const COMPLEMENTARY_SYSTEMS: SystemDesignModel[] = [
  {
    id: 'api-gateway',
    name: 'Cloud API Gateway & Reverse Proxy (Envoy / Kong)',
    category: 'Distributed Core',
    difficulty: 'Advanced',
    tagline: 'High-performance L7 reverse proxy with JWT validation, dynamic service discovery, TLS termination, and circuit breaking.',
    throughput: '250,000 requests/sec per proxy instance',
    latency: 'Proxy overhead < 1.5ms',
    storageScale: 'Stateless proxy with Redis rate-limiting state',
    overview:
      'An enterprise cloud API Gateway acting as the single front door for microservice fleets. Features non-blocking event-driven request multiplexing, cryptographic JWT claim validation, dynamic service discovery via Consul/Kubernetes, and automated circuit breaking with outlier detection.',
    functionalReqs: [
      'L7 HTTP/gRPC request routing and path rewriting.',
      'Cryptographic JWT token authentication and RBAC authorization.',
      'Dynamic upstream service discovery with health checking.',
      'Active circuit breaking to prevent cascading upstream failures.',
    ],
    nonFunctionalReqs: [
      'Sub-2ms internal proxy overhead.',
      'Zero-downtime hot reloading of route configurations.',
    ],
    calculations: [
      {
        metric: 'Event Loop Throughput',
        formula: 'Non-blocking epoll event loop handles 250k req/sec per 8-core instance',
        result: '250,000 IOPS per gateway server',
      },
    ],
    services: [
      { id: 'client', name: 'Public Mobile / Web Client', role: 'Issues API calls', type: 'client', x: 10, y: 50, icon: 'Globe', techStack: 'Browser / App', details: 'Sends HTTPS requests with Bearer JWT' },
      { id: 'envoy', name: 'Envoy L7 API Gateway', role: 'Validates JWT and routes request', type: 'gateway', x: 45, y: 50, icon: 'Shield', techStack: 'Envoy / C++', details: 'Hot-reloads route tables; rate limits' },
      { id: 'upstream-auth', name: 'Auth Microservice', role: 'Verifies user claims', type: 'service', x: 80, y: 25, icon: 'Key', techStack: 'Go / gRPC', details: 'Issues JWT public keys (JWKS)' },
      { id: 'upstream-order', name: 'Order Microservice', role: 'Processes order request', type: 'service', x: 80, y: 75, icon: 'Server', techStack: 'Go / gRPC', details: 'Executes business logic' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'envoy', label: 'HTTPS POST /api/v1/orders (Bearer JWT)', protocol: 'HTTPS' },
      { id: 'c2', from: 'envoy', to: 'upstream-auth', label: 'Validate Token (or local JWKS cache)', protocol: 'gRPC' },
      { id: 'c3', from: 'envoy', to: 'upstream-order', label: 'Forward to Upstream Service', protocol: 'gRPC' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Request Ingestion & JWT Inspection',
        description: 'Client sends request with JWT Bearer token. Envoy parses Authorization header and verifies RS256 signature.',
        fromNode: 'client',
        toNode: 'envoy',
        protocol: 'HTTPS',
        payload: { path: '/api/v1/orders', tokenSub: 'usr_8912', tokenRole: 'customer' },
        codeRef: { file: 'gateway_filter.go', lineHighlight: '15-28', funcName: 'ValidateJWTSignature', codeExplanation: 'Verifies RS256 signature using cached JWKS public keys without network roundtrip.' },
        stateChange: 'Token validated; request permitted to proceed.',
      },
      {
        step: 2,
        title: 'Step 2: Dynamic Upstream Route Forwarding',
        description: 'Envoy checks internal service discovery pool for healthy "order-service" instances and forwards via gRPC.',
        fromNode: 'envoy',
        toNode: 'upstream-order',
        protocol: 'gRPC',
        payload: { upstreamNode: '10.244.2.14:50051', latencyMs: 0.8 },
        codeRef: { file: 'gateway_filter.go', lineHighlight: '32-45', funcName: 'ForwardToUpstream', codeExplanation: 'Executes weighted round-robin dispatch across healthy cluster endpoints.' },
        stateChange: 'Order microservice receives sanitized, authenticated request.',
      },
    ],
    codeFiles: [
      {
        name: 'gateway_filter.go',
        language: 'go',
        role: 'L7 Reverse Proxy & JWT Verification Middleware in Go',
        code: `package gateway

import (
	"crypto/rsa"
	"net/http"
	"strings"
	"github.com/golang-jwt/jwt/v5"
)

type GatewayProxy struct {
	publicKey *rsa.PublicKey
}

func (g *GatewayProxy) AuthenticateMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Missing or invalid authorization token", http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return g.publicKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid token signature", http.StatusForbidden)
			return
		}

		// Inject verified claims into downstream request headers
		claims := token.Claims.(jwt.MapClaims)
		r.Header.Set("X-User-ID", claims["sub"].(string))
		next.ServeHTTP(w, r)
	})
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Cloud API Gateways terminate TLS and act as reverse proxies. By validating JWT signatures locally using cached JWKS public keys, the gateway enforces strict zero-trust security without adding network roundtrips to the authentication service.',
      databaseSchema: 'Dynamic route configurations and rate limit counters in Redis.',
      apiEndpoints: [{ method: 'POST', path: '/api/v1/*', desc: 'Generic proxy endpoint' }],
      bottlenecksAndTradeoffs: [
        'Centralized Gateway vs Service Mesh: A centralized API Gateway handles external ingress well, but internal service-to-service calls are better handled via a decentralized Service Mesh (Envoy sidecars) to avoid a single network choke point.',
      ],
    },
  },
  {
    id: 'cdn-network',
    name: 'Content Delivery Network Edge Architecture (Cloudflare / Fastly)',
    category: 'Low-Latency & Streaming',
    difficulty: 'Advanced',
    tagline: 'Globally distributed edge caching network featuring Anycast BGP routing, Edge Points of Presence (POPs), and Origin Shield caching.',
    throughput: '50,000,000 HTTP requests/sec globally',
    latency: 'Edge cache hit latency < 8ms globally',
    storageScale: 'Petabytes of cached assets distributed across 300+ Edge POPs',
    overview:
      'A global edge delivery network designed to minimize HTTP roundtrip latency. Uses BGP Anycast to announce the same IP from 300+ edge datacenters worldwide, terminating TLS within 10ms of the user and serving cached static and dynamic assets from edge RAM and NVMe SSDs.',
    functionalReqs: [
      'Edge caching of static assets (images, CSS, JS, video segments).',
      'Dynamic content acceleration via TCP connection pooling to origin.',
      'Origin Shield layer to collapse cache misses and protect origin servers from stampedes.',
      'Instant global cache purge API (< 150ms propagation worldwide).',
    ],
    nonFunctionalReqs: [
      'Sub-10ms response time for cached assets worldwide.',
      'DDoS mitigation capability absorbing multi-terabit volumetric attacks.',
    ],
    calculations: [
      {
        metric: 'Edge Cache Hit Ratio',
        formula: 'Cache Hit Ratio = (Cache Hits / Total Requests) * 100',
        result: 'Typically 92% - 98% offload from origin servers',
      },
    ],
    services: [
      { id: 'user', name: 'Global Web User', role: 'Requests static website / video', type: 'client', x: 10, y: 50, icon: 'Globe', techStack: 'Browser', details: 'Routes to nearest Anycast POP' },
      { id: 'edge-pop', name: 'Edge POP (Point of Presence)', role: 'Caches assets in RAM / NVMe', type: 'gateway', x: 45, y: 50, icon: 'Zap', techStack: 'Nginx / Varnish / Rust Proxy', details: 'Serves cache hit in 5ms' },
      { id: 'origin-shield', name: 'Origin Shield POP', role: 'Collapses regional cache misses', type: 'service', x: 70, y: 50, icon: 'Shield', techStack: 'Centralized Cache Tier', details: 'Prevents origin stampedes' },
      { id: 'origin', name: 'Customer Origin Server', role: 'Source of truth website backend', type: 'database', x: 90, y: 50, icon: 'Server', techStack: 'Origin Cloud / S3', details: 'Serves cache misses' },
    ],
    connections: [
      { id: 'c1', from: 'user', to: 'edge-pop', label: 'HTTP GET /bundle.js (Anycast)', protocol: 'HTTPS' },
      { id: 'c2', from: 'edge-pop', to: 'origin-shield', label: 'Cache Miss Query', protocol: 'HTTPS' },
      { id: 'c3', from: 'origin-shield', to: 'origin', label: 'Single Origin Fetch', protocol: 'HTTPS' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: User Request Routes to Nearest Anycast Edge',
        description: 'User in Tokyo requests bundle.js. BGP Anycast automatically routes packet to Tokyo Edge POP.',
        fromNode: 'user',
        toNode: 'edge-pop',
        protocol: 'HTTPS',
        payload: { path: '/bundle.js', popLocation: 'NRT_TOKYO', cacheStatus: 'HIT' },
        codeRef: { file: 'cdn_edge.rs', lineHighlight: '15-28', funcName: 'handle_edge_request', codeExplanation: 'Checks local memory cache; returns cached bytes with CF-Cache-Status: HIT.' },
        stateChange: 'Edge POP returns asset in 4ms without contacting origin.',
      },
    ],
    codeFiles: [
      {
        name: 'cdn_edge.rs',
        language: 'rust',
        role: 'High-Performance CDN Edge Cache Lookups in Rust',
        code: `pub struct EdgeCache;

impl EdgeCache {
    pub fn evaluate_cache_headers(etag: &str, if_none_match: Option<&str>) -> bool {
        match if_none_match {
            Some(client_etag) => client_etag == etag,
            None => false,
        }
    }
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'CDNs leverage Anycast BGP to terminate TCP/TLS handshakes geographically adjacent to end users. Origin Shielding aggregates regional cache misses, ensuring that even if 100 edge nodes experience a cache miss for the same asset simultaneously, only a single request reaches the origin server.',
      databaseSchema: 'Distributed key-value cache (RAM + NVMe SSD).',
      apiEndpoints: [{ method: 'POST', path: '/v1/purge_cache', desc: 'Instantly purges cached URLs' }],
      bottlenecksAndTradeoffs: [
        'Cache Invalidation Consistency: Propagating an instant cache purge across 300+ datacenters in under 150ms requires a global pub/sub broadcast channel with guaranteed delivery.',
      ],
    },
  },
  {
    id: 'game-server',
    name: 'Multiplayer Game State Synchronization (FPS / MOBA)',
    category: 'Low-Latency & Streaming',
    difficulty: 'Expert',
    tagline: 'Low-latency real-time game simulation utilizing UDP socket protocols, Authoritative Game Servers, Client-Side Prediction, and Lag Compensation.',
    throughput: '64 tick rate updates/sec per game room · 1,000,000 concurrent players',
    latency: 'Tick simulation latency < 15ms · End-to-end packet transit < 50ms',
    storageScale: 'In-memory game physics state with periodic match snapshots',
    overview:
      'A real-time multiplayer game server synchronization architecture. Runs authoritative physics and combat simulations at 64 or 128 ticks per second over raw UDP sockets. Compensates for network jitter through Client-Side Prediction, Entity Interpolation, and server-side Lag Compensation (rewinding game state to verify hitscan bullets).',
    functionalReqs: [
      'Authoritative server simulation (server dictates all player positions, health, and physics).',
      'Client-side prediction: Player sees immediate responsive movement without waiting for server ACK.',
      'Lag compensation: Rewinds server physics timeline by client ping to register accurate bullet hits.',
      'Snapshot interpolation: Smooths other players\' positions across jittery UDP packets.',
    ],
    nonFunctionalReqs: [
      'Sub-50ms roundtrip packet delivery.',
      'Resilient to packet loss up to 10% without gameplay stutter.',
      'Anti-cheat protection: Zero trust of client-reported position or speed.',
    ],
    calculations: [
      {
        metric: 'Tick Rate Bandwidth (64 Ticks/sec)',
        formula: '64 ticks/sec * 128 bytes/snapshot * 10 players = ~82 KB/sec per match room',
        result: 'Ultra-lean binary UDP packet layout',
      },
    ],
    services: [
      { id: 'player-a', name: 'Player A Client', role: 'Sends movement inputs & shots', type: 'client', x: 10, y: 35, icon: 'Gamepad', techStack: 'Unreal / Unity Client', details: 'Executes client-side prediction' },
      { id: 'player-b', name: 'Player B Client', role: 'Receives interpolated positions', type: 'client', x: 10, y: 75, icon: 'Gamepad', techStack: 'Unreal / Unity Client', details: 'Renders interpolated enemy models' },
      { id: 'game-server', name: 'Authoritative Game Server', role: 'Simulates physics at 64Hz', type: 'service', x: 55, y: 50, icon: 'Cpu', techStack: 'C++ / Rust Dedicated Server', details: 'Maintains 64Hz tick loop; rewinds lag' },
      { id: 'matchmaker', name: 'Matchmaking Service', role: 'Pairs players by MMR and latency', type: 'worker', x: 88, y: 50, icon: 'Users', techStack: 'Go / Agones on K8s', details: 'Spawns dedicated server pods' },
    ],
    connections: [
      { id: 'c1', from: 'player-a', to: 'game-server', label: 'UDP Input Packet (Move Forward, Shoot)', protocol: 'UDP' },
      { id: 'c2', from: 'game-server', to: 'player-a', label: 'UDP World State Snapshot (64Hz)', protocol: 'UDP' },
      { id: 'c3', from: 'game-server', to: 'player-b', label: 'UDP World State Snapshot (64Hz)', protocol: 'UDP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Client Input Transmission & Local Prediction',
        description: 'Player A presses "W" to move. Client predicts position immediately on local screen and sends UDP packet to server.',
        fromNode: 'player-a',
        toNode: 'game-server',
        protocol: 'UDP',
        payload: { tick: 1042, input: 'MOVE_FORWARD', clientTimeMs: 1718029301042 },
        codeRef: { file: 'game_server.cpp', lineHighlight: '15-28', funcName: 'ProcessClientInput', codeExplanation: 'Applies player velocity to authoritative physics world; validates speed limits (anti-speedhack).' },
        stateChange: 'Server simulates tick 1042.',
      },
      {
        step: 2,
        title: 'Step 2: Server Broadcasts Authoritative World Snapshot',
        description: 'Server packages updated positions of all 10 players into binary UDP snapshot and broadcasts to all clients.',
        fromNode: 'game-server',
        toNode: 'player-b',
        protocol: 'UDP',
        payload: { tick: 1042, playerAPos: [12.4, 0.0, 55.1], playerBPos: [18.2, 0.0, 40.0] },
        codeRef: { file: 'game_server.cpp', lineHighlight: '32-45', funcName: 'BroadcastSnapshot', codeExplanation: 'Transmits compressed delta snapshot over UDP socket.' },
        stateChange: 'Player B renders Player A moving smoothly using interpolation.',
      },
    ],
    codeFiles: [
      {
        name: 'game_server.cpp',
        language: 'go', // Display as C++ style logic
        role: 'Authoritative Game Server Tick Loop & Lag Compensation',
        code: `package main

// Authoritative Tick Loop running at 64Hz (15.6ms per tick)
type GameServer struct {
	tickRate     int
	currentTick  uint64
	historyBuffer []WorldSnapshot // Rolling 1-second history for lag compensation
}

func (s *GameServer) RunTick() {
	// 1. Process client input queues
	// 2. Step physics simulation forward by dt (15.6ms)
	// 3. Resolve collisions and combat
	// 4. Save current snapshot into history buffer
	// 5. Broadcast delta-compressed snapshot to all players via UDP
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Fast-paced multiplayer games use UDP over TCP because packet retransmissions in TCP cause catastrophic Head-of-Line blocking. An Authoritative Dedicated Server validates all movement and weapon hits. When Player A shoots Player B, the server rewinds Player B\'s hitbox to where it was when Player A fired (Lag Compensation), providing fair hit registration.',
      databaseSchema: 'In-memory world state machine; match summary committed to SQL at match end.',
      apiEndpoints: [{ method: 'POST', path: '/v1/matchmake', desc: 'Finds game room' }],
      bottlenecksAndTradeoffs: [
        'Peeker\'s Advantage: Inherent latency means an attacker moving around a corner sees a stationary defender slightly before the defender sees the attacker appear. Mitigated by network interpolation tuning and low tick durations.',
      ],
    },
  },
  {
    id: 'collab-docs',
    name: 'Real-Time Collaborative Document Editor (Google Docs)',
    category: 'High-Concurrency & Social',
    difficulty: 'Expert',
    tagline: 'Real-time multi-user document synchronization utilizing Operational Transformation (OT) and Conflict-Free Replicated Data Types (CRDT).',
    throughput: '1,000,000 concurrent collaborative editing sessions',
    latency: 'Keystroke sync < 50ms across concurrent typists',
    storageScale: 'Document edit event streams and snapshot trees',
    overview:
      'A real-time concurrent collaborative document editor. Allows multiple users to type simultaneously on the same paragraph without race conditions or character clobbering. Uses Operational Transformation (OT) with a central coordinating server or decentralized CRDTs (e.g. Yjs / Automerge) to mathematically converge divergent edit streams into an identical document state.',
    functionalReqs: [
      'Simultaneous multi-user concurrent typing with zero character loss.',
      'Cursor position and text selection synchronization in real-time.',
      'Full revision history and time-travel undo/redo across collaborative sessions.',
      'Offline editing support: Reconnect and seamlessly merge offline edits.',
    ],
    nonFunctionalReqs: [
      'Sub-50ms keystroke synchronization.',
      'Convergence guarantee: All clients must reach 100% identical document state once all edits arrive.',
    ],
    calculations: [
      {
        metric: 'OT Transformation Invariant',
        formula: 'apply(apply(S, op1), transform(op2, op1)) == apply(apply(S, op2), transform(op1, op2))',
        result: 'Guarantees mathematical convergence regardless of arrival order',
      },
    ],
    services: [
      { id: 'user-a', name: 'Collaborator Alice', role: 'Types character at index 5', type: 'client', x: 10, y: 35, icon: 'Edit3', techStack: 'ProseMirror / Web', details: 'Generates local insert operation' },
      { id: 'user-b', name: 'Collaborator Bob', role: 'Deletes character at index 2', type: 'client', x: 10, y: 75, icon: 'Edit3', techStack: 'ProseMirror / Web', details: 'Generates local delete operation' },
      { id: 'doc-server', name: 'Document Collaboration Server', role: 'Central OT sequencer', type: 'service', x: 55, y: 50, icon: 'Cpu', techStack: 'Node.js / Go OT Engine', details: 'Transforms concurrent operations; assigns revision ID' },
      { id: 'doc-db', name: 'Document Revision DB', role: 'Stores append-only edit operations', type: 'database', x: 88, y: 50, icon: 'Database', techStack: 'Postgres / Redis', details: 'Saves operation log for document' },
    ],
    connections: [
      { id: 'c1', from: 'user-a', to: 'doc-server', label: 'Send Op: Insert("X", pos:5, rev:10)', protocol: 'WebSocket' },
      { id: 'c2', from: 'user-b', to: 'doc-server', label: 'Send Op: Delete(pos:2, rev:10)', protocol: 'WebSocket' },
      { id: 'c3', from: 'doc-server', to: 'user-b', label: 'Broadcast Transformed Op', protocol: 'WebSocket' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Concurrent Keystrokes Generated',
        description: 'Alice inserts "X" at position 5 while Bob concurrently deletes character at position 2 on revision 10.',
        fromNode: 'user-a',
        toNode: 'doc-server',
        protocol: 'WebSocket',
        payload: { op: 'INSERT', char: 'X', position: 5, baseRevision: 10 },
        codeRef: { file: 'ot_engine.ts', lineHighlight: '15-28', funcName: 'transform_operation', codeExplanation: 'Server receives Alice\'s op first, commits it at revision 11, and prepares to transform Bob\'s concurrent op.' },
        stateChange: 'Document server advances revision to 11.',
      },
      {
        step: 2,
        title: 'Step 2: Operational Transformation Execution',
        description: 'Server transforms Bob\'s delete operation against Alice\'s committed insert, adjusting Bob\'s position coordinates.',
        fromNode: 'doc-server',
        toNode: 'user-b',
        protocol: 'WebSocket',
        payload: { op: 'INSERT', char: 'X', position: 5, newRevision: 11 },
        codeRef: { file: 'ot_engine.ts', lineHighlight: '32-45', funcName: 'apply_transformed_op', codeExplanation: 'Both clients apply transformed ops; Alice and Bob documents converge to 100% identical text.' },
        stateChange: 'Both screens display exact same text.',
      },
    ],
    codeFiles: [
      {
        name: 'ot_engine.ts',
        language: 'typescript',
        role: 'Operational Transformation (OT) Text Insertion & Deletion Engine',
        code: `export interface TextOp {
  type: 'insert' | 'delete'
  pos: number
  char?: string
}

// Transforms opA against concurrent opB such that apply(apply(doc, opB), opA') is consistent
export function transform(opA: TextOp, opB: TextOp): TextOp {
  if (opA.type === 'insert' && opB.type === 'insert') {
    if (opA.pos < opB.pos || (opA.pos === opB.pos && opA.char! < opB.char!)) {
      return { ...opA }
    } else {
      return { ...opA, pos: opA.pos + 1 }
    }
  }

  if (opA.type === 'insert' && opB.type === 'delete') {
    if (opA.pos <= opB.pos) {
      return { ...opA }
    } else {
      return { ...opA, pos: opA.pos - 1 }
    }
  }

  return opA
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Google Docs relies on Operational Transformation (OT) with a centralized server that establishes a canonical total order of revisions. CRDTs (Conflict-Free Replicated Data Types) offer an alternative that allows decentralized peer-to-peer convergence without requiring a central coordinator.',
      databaseSchema: 'Document Operations Log: doc_id (UUID), revision (BIGINT), operation_payload (JSONB).',
      apiEndpoints: [{ method: 'WS', path: '/v1/doc/collab', desc: 'Real-time collaborative editing stream' }],
      bottlenecksAndTradeoffs: [
        'OT Complexity vs CRDT Memory Overhead: OT algorithms require complex edge-case transformation matrices. CRDTs simplify mathematical convergence but carry metadata overhead (character IDs and tombstones) that increases memory consumption.',
      ],
    },
  },
  {
    id: 'notification-system',
    name: 'Distributed Real-Time Notification Engine',
    category: 'High-Concurrency & Social',
    difficulty: 'Intermediate',
    tagline: 'Multi-channel notification engine (APNs, FCM, SMS, Email, In-App WebSockets) with deduplication, user preferences, and rate limiting.',
    throughput: '100,000 notifications dispatched/sec',
    latency: 'End-to-end delivery < 500ms for in-app alerts',
    storageScale: 'Billions of notification history records',
    overview:
      'A multi-channel distributed notification platform. Ingests notification trigger events from microservices, checks user notification preferences and quiet-hour rules, deduplicates repetitive alerts, and fans out deliveries across Apple APNs, Google FCM, Twilio SMS, SendGrid Email, and in-app WebSocket channels.',
    functionalReqs: [
      'Multi-channel dispatch: Push (iOS/Android), SMS, Email, and in-app bell notifications.',
      'User preference engine: Respect channel opt-outs and user quiet hours.',
      'Notification deduplication: Prevent spamming user with duplicate alerts within 5 minutes.',
      'Priority tiers: Critical (two-factor auth OTP) vs Informational (friend liked post).',
    ],
    nonFunctionalReqs: [
      'Sub-second delivery for OTP and critical notifications.',
      'Fault tolerance: Retries failed third-party provider calls automatically.',
    ],
    calculations: [
      {
        metric: 'Deduplication Cache Rule',
        formula: 'Key = hash(user_id, event_type, entity_id) with 300-second TTL',
        result: 'Stops duplicate notifications within 5 minutes',
      },
    ],
    services: [
      { id: 'service', name: 'Triggering Microservice', role: 'Emits alert event', type: 'client', x: 10, y: 50, icon: 'Bell', techStack: 'Order / Social Service', details: 'Publishes to Kafka' },
      { id: 'notif-service', name: 'Notification Core Engine', role: 'Evaluates preferences & dedup', type: 'service', x: 45, y: 50, icon: 'Filter', techStack: 'Go Microservice', details: 'Checks Redis dedup cache' },
      { id: 'push-worker', name: 'Push Delivery Worker', role: 'Dispatches APNs / FCM', type: 'worker', x: 80, y: 30, icon: 'Smartphone', techStack: 'Apple APNs / Google FCM', details: 'Sends mobile push' },
      { id: 'email-worker', name: 'Email Delivery Worker', role: 'Dispatches SendGrid / SES', type: 'worker', x: 80, y: 70, icon: 'Mail', techStack: 'SendGrid / AWS SES', details: 'Sends formatted HTML email' },
    ],
    connections: [
      { id: 'c1', from: 'service', to: 'notif-service', label: 'TriggerNotification()', protocol: 'Kafka' },
      { id: 'c2', from: 'notif-service', to: 'push-worker', label: 'SendMobilePush', protocol: 'HTTPS' },
      { id: 'c3', from: 'notif-service', to: 'email-worker', label: 'SendEmailAlert', protocol: 'HTTPS' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Notification Event Ingestion',
        description: 'Order service emits "Order Shipped" event. Notification Core Engine receives event and queries Redis to verify user has not been sent this notification recently.',
        fromNode: 'service',
        toNode: 'notif-service',
        protocol: 'Kafka',
        payload: { userId: 'usr_4910', type: 'ORDER_SHIPPED', orderId: 'ord_91823' },
        codeRef: { file: 'notif_engine.go', lineHighlight: '15-28', funcName: 'ProcessNotification', codeExplanation: 'Executes Redis SETNX notif:usr_4910:ord_91823 EX 300 to eliminate duplicates.' },
        stateChange: 'Deduplication check passes; preferences verified.',
      },
      {
        step: 2,
        title: 'Step 2: Multi-Channel Dispatch',
        description: 'Engine fans out payload to Push Worker (APNs) and Email Worker (SendGrid) in parallel.',
        fromNode: 'notif-service',
        toNode: 'push-worker',
        protocol: 'HTTPS',
        payload: { deviceToken: 'apns_tok_8912', alertBody: 'Your package is out for delivery!' },
        codeRef: { file: 'notif_engine.go', lineHighlight: '32-45', funcName: 'DispatchPush', codeExplanation: 'Sends HTTP/2 request to Apple APNs gateway.' },
        stateChange: 'Notification appears on user lock screen in 240ms.',
      },
    ],
    codeFiles: [
      {
        name: 'notif_engine.go',
        language: 'go',
        role: 'Notification Deduplication & Preference Filter in Go',
        code: `package notification

import (
	"context"
	"fmt"
	"time"
	"github.com/go-redis/redis/v8"
)

type NotificationEngine struct {
	rdb *redis.Client
}

func (e *NotificationEngine) IsDuplicate(ctx context.Context, userId, eventType, entityId string) bool {
	key := fmt.Sprintf("notif_dedup:%s:%s:%s", userId, eventType, entityId)
	// SETNX returns true if key was set (not a duplicate)
	wasSet, _ := e.rdb.SetNX(ctx, key, "1", 5*time.Minute).Result()
	return !wasSet
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Notification platforms decouple business microservices from downstream third-party delivery providers. Priority queues ensure time-sensitive alerts (OTP security codes) bypass promotional marketing queues. In-memory Redis deduplication keys prevent accidental spam storms.',
      databaseSchema: 'notifications (id UUID, user_id UUID, channel VARCHAR, template_id VARCHAR, status VARCHAR, sent_at TIMESTAMPTZ).',
      apiEndpoints: [{ method: 'POST', path: '/v1/notifications/send', desc: 'Triggers notification' }],
      bottlenecksAndTradeoffs: [
        'Provider Outage Buffering: If Apple APNs or SendGrid experiences an outage, workers must pause and buffer outgoing messages in dead-letter queues rather than dropping notifications or overloading providers upon recovery.',
      ],
    },
  },
  {
    id: 'pastebin',
    name: 'Distributed Text Snippet Service (Pastebin / GitHub Gist)',
    category: 'Storage & Databases',
    difficulty: 'Intermediate',
    tagline: 'High-availability pastebin service with S3 object storage, pre-signed upload URLs, Base62 keys, and read-heavy Redis caching.',
    throughput: '20,000 reads/sec · 500 writes/sec (40:1 Read:Write Ratio)',
    latency: 'p99 Read < 10ms',
    storageScale: 'Petabytes of raw text and code snippets',
    overview:
      'A scalable text and code snippet storage service. Separates lightweight snippet metadata (title, author, expiration timestamp) in PostgreSQL from the raw text body stored as immutable objects in Amazon S3 or MinIO, serving 98% of popular pastes directly from in-memory Redis caches.',
    functionalReqs: [
      'Create new text paste with optional expiration TTL (1 hour, 1 day, never).',
      'Generate unique 7-character URL alias (e.g. pastebin.com/e8Kf91a).',
      'Support syntax highlighting and raw text downloads.',
      'Allow private pastes protected by password or unlisted links.',
    ],
    nonFunctionalReqs: [
      'High read availability (99.999% uptime).',
      'Immutable pastes: Content cannot be edited once published.',
    ],
    calculations: [
      {
        metric: 'Storage Estimate (5 Years)',
        formula: '10M new pastes/month * 10 KB avg size = 100 GB/month * 60 months ≈ 6 TB storage',
        result: '6 TB object storage required over 5 years',
      },
    ],
    services: [
      { id: 'client', name: 'Web / API User', role: 'Reads or creates paste', type: 'client', x: 10, y: 50, icon: 'FileText', techStack: 'Browser / CLI', details: 'Sends POST /api/v1/paste or GET /p/:id' },
      { id: 'gateway', name: 'API Gateway', role: 'Rate limits and routes', type: 'gateway', x: 35, y: 50, icon: 'Shield', techStack: 'Nginx / Go', details: 'Throttles abusive uploads' },
      { id: 'paste-service', name: 'Paste Service Core', role: 'Business logic & S3 storage', type: 'service', x: 60, y: 50, icon: 'Server', techStack: 'Go / Node.js', details: 'Writes text to S3; metadata to SQL' },
      { id: 's3-store', name: 'Object Storage (S3)', role: 'Stores raw paste text bodies', type: 'storage', x: 88, y: 30, icon: 'HardDrive', techStack: 'Amazon S3 / MinIO', details: 'Key: pastes/{paste_id}.txt' },
      { id: 'cache', name: 'Redis Paste Cache', role: 'Caches hot paste text', type: 'cache', x: 88, y: 70, icon: 'Zap', techStack: 'Redis Cluster', details: 'Stores text of viral pastes' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'gateway', label: 'POST /api/v1/paste', protocol: 'HTTPS' },
      { id: 'c2', from: 'gateway', to: 'paste-service', label: 'CreatePaste()', protocol: 'gRPC' },
      { id: 'c3', from: 'paste-service', to: 's3-store', label: 'PUT Object (Raw text)', protocol: 'HTTPS' },
      { id: 'c4', from: 'paste-service', to: 'cache', label: 'SET cache:paste:{id}', protocol: 'Redis' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Paste Creation',
        description: 'User submits 5KB Python code snippet. Paste Service generates Base62 key "k9F2aX1".',
        fromNode: 'client',
        toNode: 'paste-service',
        protocol: 'HTTPS',
        payload: { text: 'def quicksort(arr): ...', title: 'quicksort.py', ttlHours: 24 },
        codeRef: { file: 'paste_service.go', lineHighlight: '15-28', funcName: 'CreatePaste', codeExplanation: 'Writes raw text to S3 object storage; writes metadata record to Postgres.' },
        stateChange: 'Paste saved to S3; link https://paste.nexora.dev/p/k9F2aX1 returned in 20ms.',
      },
    ],
    codeFiles: [
      {
        name: 'paste_service.go',
        language: 'go',
        role: 'Pastebin S3 Storage & Key Allocation Controller',
        code: `package paste

import (
	"context"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type PasteService struct {
	s3Client *s3.Client
	bucket   string
}

func (s *PasteService) SavePaste(ctx context.Context, pasteId string, content []byte) error {
	_, err := s.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: &s.bucket,
		Key:    aws.String("pastes/" + pasteId + ".txt"),
		Body:   bytes.NewReader(content),
	})
	return err
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Storing text snippets in relational databases wastes expensive database IOPS and causes table bloat. Storing raw text bodies in S3 object storage keeps storage costs minimal while metadata remains in PostgreSQL. Popular pastes are cached in Redis to achieve sub-10ms read performance.',
      databaseSchema: 'pastes (id VARCHAR(7) PRIMARY KEY, title TEXT, s3_key TEXT, created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ).',
      apiEndpoints: [
        { method: 'POST', path: '/api/v1/paste', desc: 'Creates new paste' },
        { method: 'GET', path: '/p/:id', desc: 'Reads paste text' },
      ],
      bottlenecksAndTradeoffs: [
        'S3 Minimum Object Size Billing: Storing millions of tiny 200-byte pastes in S3 can trigger minimum billing constraints (128KB in S3 Glacier). For pastes under 1KB, storing them directly inline in PostgreSQL or Redis eliminates object storage overhead.',
      ],
    },
  },
  {
    id: 'fraud-detection',
    name: 'Real-Time Fraud Detection & Risk Scoring (Stripe Radar / PayPal)',
    category: 'Financial & Reliability',
    difficulty: 'Advanced',
    tagline: 'Sub-30ms real-time ML risk engine evaluating velocity counters, IP geofencing, behavioral fingerprinting, and rule graphs before payment capture.',
    throughput: '25,000 evaluations/sec',
    latency: 'p99 < 28ms decision latency (hard 30ms SLA)',
    storageScale: '100+ Million sliding velocity windows in Redis · Multi-TB audit trail in Cassandra',
    overview:
      'An inline fraud evaluation engine placed in the synchronous payment authorization path. It cross-checks incoming card swipes and digital checkouts against sliding-window velocity counters, machine learning inference models, and heuristic rule trees to assign an instant risk score (0-100) before funds are captured.',
    functionalReqs: [
      'Synchronous risk scoring within a 30ms strict timeout budget.',
      'Track sliding-window card velocity counters (e.g., max 3 cards per IP / 10 mins).',
      'Real-time feature extraction and ML model scoring (XGBoost / LightGBM).',
      'Assign verdict: ALLOW (score < 40), MANUAL_REVIEW / 3DS (40-75), or BLOCK (> 75).',
    ],
    nonFunctionalReqs: [
      'Fail-open or heuristic fallback on timeout to prevent checkout conversion drops.',
      'Extremely high availability (99.999% uptime) across active payment corridors.',
      'Zero false-positive disruption for trusted high-value merchants.',
    ],
    calculations: [
      {
        metric: 'Evaluation Throughput',
        formula: '25,000 transactions/sec peak during Black Friday sales',
        result: '25,000 evaluations/sec',
      },
      {
        metric: 'Latency Budget Breakdown',
        formula: 'Gateway network: 5ms + Redis velocity: 4ms + ML Inference: 12ms + Rules: 4ms',
        result: 'Total p99: 25ms (< 30ms SLA)',
      },
    ],
    services: [
      { id: 'client', name: 'Merchant Checkout', role: 'Submits payment authorization', type: 'client', x: 10, y: 50, icon: 'Globe', techStack: 'Web / Mobile SDK', details: 'Sends card token, IP, browser fingerprint' },
      { id: 'gateway', name: 'Payment API Gateway', role: 'Coordinates synchronous auth path', type: 'gateway', x: 35, y: 50, icon: 'Shield', techStack: 'Go / Envoy', details: 'Enforces 30ms timeout on risk service' },
      { id: 'engine', name: 'Radar Fraud Engine', role: 'Orchestrates feature extraction & rules', type: 'service', x: 62, y: 30, icon: 'Zap', techStack: 'Go / gRPC', details: 'Aggregates signals into final score' },
      { id: 'redis', name: 'Redis Velocity Cluster', role: 'Stores sliding window counters', type: 'database', x: 62, y: 75, icon: 'Database', techStack: 'Redis Cluster', details: 'Sliding transaction counts per IP/Card' },
      { id: 'ml-service', name: 'ML Risk Inference Engine', role: 'Runs pre-compiled model scoring', type: 'service', x: 90, y: 50, icon: 'Cpu', techStack: 'Python / Triton / ONNX', details: 'Evaluates 150+ behavioral features' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'gateway', label: 'POST /v1/charges (Card Token, Device IP)', protocol: 'HTTPS' },
      { id: 'c2', from: 'gateway', to: 'engine', label: 'EvaluateRisk(TransactionContext)', protocol: 'gRPC' },
      { id: 'c3', from: 'engine', to: 'redis', label: 'Pipelined INCR & EXPIRE Velocity Keys', protocol: 'Redis' },
      { id: 'c4', from: 'engine', to: 'ml-service', label: 'ScoreFeatures(Vector[150])', protocol: 'gRPC' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Payment Auth Request Ingestion',
        description: 'Payment Gateway receives checkout request and dispatches synchronous gRPC evaluation with a 30ms context deadline.',
        fromNode: 'gateway',
        toNode: 'engine',
        protocol: 'gRPC',
        payload: { cardFingerprint: 'fp_a9821f', ip: '198.51.100.42', amountCents: 49900, currency: 'USD' },
        codeRef: { file: 'risk_evaluator.go', lineHighlight: '18-35', funcName: 'EvaluateRisk', codeExplanation: 'Instantiates timeout context and dispatches concurrent signal gathering.' },
        stateChange: 'Timer starts (budget: 30ms).',
      },
      {
        step: 2,
        title: 'Step 2: Velocity Check in Redis Cache',
        description: 'Engine queries rolling transaction count for the IP and card hash over the last 10 minutes.',
        fromNode: 'engine',
        toNode: 'redis',
        protocol: 'Redis',
        payload: { ipCountLast10Min: 1, cardCountLast24Hour: 2, status: 'NORMAL' },
        codeRef: { file: 'risk_evaluator.go', lineHighlight: '42-58', funcName: 'checkVelocity', codeExplanation: 'Atomic sliding counter increment via Redis ZADD / ZCOUNT.' },
        stateChange: 'Velocity checks passed within 3.5ms.',
      },
      {
        step: 3,
        title: 'Step 3: Machine Learning Model Inference',
        description: 'Feature vector consisting of 150 normalized signals sent to ONNX/Triton scoring server returning risk confidence.',
        fromNode: 'engine',
        toNode: 'ml-service',
        protocol: 'gRPC',
        payload: { riskScore: 18, probabilityOfChargeback: 0.0034, verdict: 'LOW_RISK' },
        codeRef: { file: 'ml_scoring.py', lineHighlight: '12-28', funcName: 'predict_fraud_risk', codeExplanation: 'Gradient boosted tree inference on normalized feature vector.' },
        stateChange: 'Model prediction received in 11ms.',
      },
      {
        step: 4,
        title: 'Step 4: Decision Returned to Payment Gateway',
        description: 'Fraud Engine synthesizes score (18 < 40) and authorizes payment gateway to proceed to card network capture.',
        fromNode: 'engine',
        toNode: 'gateway',
        protocol: 'gRPC',
        payload: { decision: 'ALLOW', riskScore: 18, executionTimeMs: 22 },
        codeRef: { file: 'risk_evaluator.go', lineHighlight: '62-75', funcName: 'EvaluateRisk', codeExplanation: 'Returns final verdict ALLOW within SLA.' },
        stateChange: 'Payment approved; total pipeline latency 22ms.',
      },
    ],
    codeFiles: [
      {
        name: 'risk_evaluator.go',
        language: 'go',
        role: 'Production Real-Time Risk Evaluation Orchestrator',
        code: `package fraud

import (
	"context"
	"errors"
	"time"
)

type Decision string

const (
	DecisionAllow  Decision = "ALLOW"
	DecisionReview Decision = "MANUAL_REVIEW"
	DecisionBlock  Decision = "BLOCK"
)

type RiskEvaluationService struct {
	velocityClient *VelocityStore
	mlClient       *MLModelClient
	timeout        time.Duration
}

func NewRiskEvaluationService(v *VelocityStore, ml *MLModelClient) *RiskEvaluationService {
	return &RiskEvaluationService{
		velocityClient: v,
		mlClient:       ml,
		timeout:        28 * time.Millisecond,
	}
}

func (s *RiskEvaluationService) EvaluateRisk(parentCtx context.Context, txn *Transaction) (Decision, int, error) {
	ctx, cancel := context.WithTimeout(parentCtx, s.timeout)
	defer cancel()

	// Step 1: Run velocity checks
	velocity, err := s.velocityClient.GetVelocity(ctx, txn.CardFingerprint, txn.IP)
	if err != nil {
		// Log error, continue to prevent blocking legitimate checkouts
		velocity = 0
	}
	if velocity > 5 {
		return DecisionBlock, 99, nil
	}

	// Step 2: Score with pre-compiled ML model
	score, err := s.mlClient.PredictScore(ctx, txn, velocity)
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			// On SLA timeout, fail-open with conservative review flag
			return DecisionAllow, 30, nil
		}
		return DecisionAllow, 20, nil
	}

	if score >= 75 {
		return DecisionBlock, score, nil
	} else if score >= 40 {
		return DecisionReview, score, nil
	}
	return DecisionAllow, score, nil
}`,
      },
      {
        name: 'ml_scoring.py',
        language: 'python',
        role: 'Low-Latency ML Inference Model Serving',
        code: `import numpy as np
import onnxruntime as ort

class FraudRiskScorer:
    def __init__(self, model_path: str = "fraud_detector_v4.onnx"):
        # Pre-allocate ONNX runtime session with GPU/CPU thread pool
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 4
        self.session = ort.InferenceSession(model_path, opts)
        self.input_name = self.session.get_inputs()[0].name

    def predict_fraud_risk(self, feature_vector: list[float]) -> int:
        """
        Runs sub-10ms inference against 150 pre-extracted behavioral features.
        Returns risk score from 0 (safe) to 100 (confirmed fraud).
        """
        arr = np.array([feature_vector], dtype=np.float32)
        outputs = self.session.run(None, {self.input_name: arr})
        probability = float(outputs[0][0][1]) # Class 1 = Fraud
        return int(probability * 100)`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Fraud detection in modern digital payments is governed by strict latency SLAs (under 30ms total). The engine uses localized Redis caches for fast counter lookups and ONNX-compiled gradient-boosted decision trees to evaluate hundreds of transaction dimensions concurrently.',
      databaseSchema: 'fraud_evaluations (id UUID PRIMARY KEY, txn_id VARCHAR(64), score INT, decision VARCHAR(16), evaluated_at TIMESTAMPTZ, latency_ms INT).',
      apiEndpoints: [
        { method: 'POST', path: '/v1/risk/evaluate', desc: 'Evaluates transaction risk synchronously' },
        { method: 'POST', path: '/v1/rules/whitelist', desc: 'Adds entity to trusted merchant whitelist' },
      ],
      bottlenecksAndTradeoffs: [
        'False Positives vs. Fraud Chargeback Loss: Blocking legitimate customers destroys business revenue far worse than occasional chargeback fees. Modern engines bias towards frictionless 3D Secure / OTP step-up authentication instead of hard blocks for medium scores (40-75).',
      ],
    },
  },
  {
    id: 'object-storage',
    name: 'Distributed Cloud Object Storage (AWS S3 & Ceph)',
    category: 'Storage & Databases',
    difficulty: 'Expert',
    tagline: 'Exabyte-scale blob storage featuring Reed-Solomon Erasure Coding (8+4), CRUSH map data placement, chunk striping, and bit-rot scrubbers.',
    throughput: '100 GB/sec aggregate cluster throughput',
    latency: 'Time to first byte < 35ms',
    storageScale: '100+ Petabytes across thousands of commodity storage nodes',
    overview:
      'A scalable distributed object storage system designed for multi-gigabyte blobs. Objects are divided into configurable byte chunks, protected by Reed-Solomon Erasure Coding (8 data + 4 parity), and placed across distinct racks using algorithmic CRUSH mapping without centralized disk lookups.',
    functionalReqs: [
      'Multi-part chunked object uploads with resumable capabilities.',
      'Reed-Solomon (8+4) erasure coding guaranteeing survival against 4 simultaneous rack failures.',
      'Sub-50ms HTTP byte-range read queries.',
      'Background bit-rot scrubber with automatic chunk reconstruction.',
    ],
    nonFunctionalReqs: [
      '99.999999999% (11 9s) annual object durability.',
      'Only 1.5x storage overhead (compared to 3x in traditional 3-way replication).',
      'Zero single points of failure across metadata or storage servers.',
    ],
    calculations: [
      {
        metric: 'Erasure Coding Storage Efficiency',
        formula: '8 Data Chunks + 4 Parity Chunks = 12 total / 8 data = 1.50x overhead',
        result: '1.50x storage overhead (vs 3.00x for 3-way replication, saving 50% storage cost)',
      },
      {
        metric: 'Durability Guarantee',
        formula: '4 parity chunks allow cluster to survive 4 node/rack failures simultaneously',
        result: '11 Nines (99.999999999%) Durability',
      },
    ],
    services: [
      { id: 'client', name: 'Application Client', role: 'Issues S3 API calls', type: 'client', x: 10, y: 50, icon: 'Globe', techStack: 'S3 SDK / HTTP', details: 'Streams multi-part object payload' },
      { id: 'gateway', name: 'Object Storage Gateway (RGW)', role: 'Slices blobs and computes EC', type: 'gateway', x: 38, y: 50, icon: 'Shield', techStack: 'Ceph RGW / C++', details: 'Encodes chunks via Reed-Solomon' },
      { id: 'meta-store', name: 'Metadata Key-Value Engine', role: 'Stores object manifests & bucket inodes', type: 'database', x: 65, y: 20, icon: 'Database', techStack: 'RocksDB / Cassandra', details: 'Maps bucket/key to chunk IDs' },
      { id: 'osd-rack-a', name: 'Storage Node Rack A', role: 'Holds Data Chunks 1-4', type: 'service', x: 88, y: 25, icon: 'Server', techStack: 'Ceph OSD / NVMe', details: 'Direct raw block disk access' },
      { id: 'osd-rack-b', name: 'Storage Node Rack B', role: 'Holds Data Chunks 5-8', type: 'service', x: 88, y: 55, icon: 'Server', techStack: 'Ceph OSD / NVMe', details: 'Direct raw block disk access' },
      { id: 'osd-rack-c', name: 'Storage Node Rack C', role: 'Holds Parity Chunks P1-P4', type: 'service', x: 88, y: 85, icon: 'Server', techStack: 'Ceph OSD / NVMe', details: 'Direct raw block disk access' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'gateway', label: 'PUT /bucket/large-file.bin (Multi-part Stream)', protocol: 'HTTPS' },
      { id: 'c2', from: 'gateway', to: 'meta-store', label: 'Write Object Manifest & Inode', protocol: 'TCP' },
      { id: 'c3', from: 'gateway', to: 'osd-rack-a', label: 'Write Chunks 1..4', protocol: 'TCP' },
      { id: 'c4', from: 'gateway', to: 'osd-rack-b', label: 'Write Chunks 5..8', protocol: 'TCP' },
      { id: 'c5', from: 'gateway', to: 'osd-rack-c', label: 'Write Parity Chunks P1..P4', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Multi-Part Stream Ingestion',
        description: 'Client streams 64MB part over HTTPS to the S3 Gateway.',
        fromNode: 'client',
        toNode: 'gateway',
        protocol: 'HTTPS',
        payload: { bucket: 'assets', key: 'render.mp4', partNumber: 1, sizeBytes: 67108864 },
        codeRef: { file: 'erasure_coder.go', lineHighlight: '15-28', funcName: 'SplitAndEncode', codeExplanation: 'Reads chunk stream into 8 equal 8MB data blocks.' },
        stateChange: 'Gateway buffers 64MB slice in RAM.',
      },
      {
        step: 2,
        title: 'Step 2: Reed-Solomon Erasure Coding (8+4)',
        description: 'Gateway computes 4 parity chunks from 8 data chunks using Galois Field arithmetic in 8ms.',
        fromNode: 'gateway',
        toNode: 'gateway',
        protocol: 'TCP',
        payload: { dataChunks: 8, parityChunks: 4, chunkSize: '8 MB', totalChunks: 12 },
        codeRef: { file: 'erasure_coder.go', lineHighlight: '32-48', funcName: 'EncodeParity', codeExplanation: 'Galois Field matrix multiplication generates P1..P4 parity chunks.' },
        stateChange: '12 distinct chunks ready for distribution.',
      },
      {
        step: 3,
        title: 'Step 3: Algorithmic CRUSH Striping across Racks',
        description: 'Gateway writes 4 data chunks to Rack A, 4 to Rack B, and 4 parity chunks to Rack C simultaneously.',
        fromNode: 'gateway',
        toNode: 'osd-rack-c',
        protocol: 'TCP',
        payload: { chunkIds: ['chunk_p1', 'chunk_p2', 'chunk_p3', 'chunk_p4'], targetRack: 'Rack C' },
        codeRef: { file: 'erasure_coder.go', lineHighlight: '52-65', funcName: 'DispatchChunks', codeExplanation: 'Dispatches parallel disk writes with checksum confirmation.' },
        stateChange: 'All 12 chunks persisted to NVMe block drives.',
      },
      {
        step: 4,
        title: 'Step 4: Commit Object Inode to Metadata Store',
        description: 'Gateway registers chunk manifest and byte offsets in RocksDB metadata store and responds HTTP 200 OK.',
        fromNode: 'gateway',
        toNode: 'meta-store',
        protocol: 'TCP',
        payload: { bucket: 'assets', key: 'render.mp4', status: 'COMMITTED', etag: '9b10e44f38e6b' },
        codeRef: { file: 'erasure_coder.go', lineHighlight: '68-80', funcName: 'CommitManifest', codeExplanation: 'Atomic manifest commit completes upload transaction.' },
        stateChange: 'Upload committed. High availability and 11 nines durability achieved.',
      },
    ],
    codeFiles: [
      {
        name: 'erasure_coder.go',
        language: 'go',
        role: 'Reed-Solomon Erasure Coding Engine',
        code: `package storage

import (
	"errors"
	"io"
	"github.com/klauspost/reedsolomon"
)

type ErasureCoder struct {
	enc          reedsolomon.Encoder
	dataShards   int
	parityShards int
}

func NewErasureCoder(dataShards, parityShards int) (*ErasureCoder, error) {
	enc, err := reedsolomon.New(dataShards, parityShards)
	if err != nil {
		return nil, err
	}
	return &ErasureCoder{
		enc:          enc,
		dataShards:   dataShards,
		parityShards: parityShards,
	}, nil
}

// SplitAndEncode splits an input byte stream into data + parity shards
func (ec *ErasureCoder) SplitAndEncode(data []byte) ([][]byte, error) {
	shards, err := ec.enc.Split(data)
	if err != nil {
		return nil, err
	}
	// Computes parity chunks in-place using SIMD Galois field instructions
	if err := ec.enc.Encode(shards); err != nil {
		return nil, err
	}
	return shards, nil
}

// Reconstruct restores missing chunks if at least dataShards survive
func (ec *ErasureCoder) Reconstruct(shards [][]byte) error {
	return ec.enc.Reconstruct(shards)
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Cloud object storage relies on Reed-Solomon Erasure Coding (8+4 or 16+4) instead of multi-way replication. This cuts total disk storage costs by 50% while delivering higher statistical durability (11 nines). Deterministic CRUSH hashing avoids centralized directory bottlenecks.',
      databaseSchema: 'objects (bucket_id UUID, object_key VARCHAR(1024), size_bytes BIGINT, etag VARCHAR(64), chunk_manifest JSONB, created_at TIMESTAMPTZ, PRIMARY KEY (bucket_id, object_key)).',
      apiEndpoints: [
        { method: 'PUT', path: '/:bucket/:key', desc: 'Stores object or part' },
        { method: 'GET', path: '/:bucket/:key', desc: 'Streams object data or byte range' },
      ],
      bottlenecksAndTradeoffs: [
        'Compute Overhead of Erasure Coding: Generating parity shards requires Galois Field matrix multiplication. Modern object storage nodes offload this to CPU AVX-512 vector instructions to encode at over 10 GB/sec per core.',
      ],
    },
  },
]

// All 30 Top-Level System Designs
export const ALL_SYSTEM_DESIGNS: SystemDesignModel[] = [
  ...DISTRIBUTED_CORE_SYSTEMS,        // 7 systems (TinyURL, Redis Cache, Kafka, Redlock, Snowflake, Consistent Hash, Dynamo)
  ...SOCIAL_AND_CONCURRENCY_SYSTEMS, // 4 systems (Twitter Feed, WhatsApp Chat, Flash Sale, Collab Docs)
  ...STREAMING_AND_MEDIA_SYSTEMS,    // 2 systems (YouTube Stream, Google Drive)
  ...FINANCIAL_AND_LOW_LATENCY_SYSTEMS, // 3 systems (Payment Ledger, Order Book, Rate Limiter)
  ...GEOSPATIAL_AND_SEARCH_SYSTEMS,  // 2 systems (Uber Dispatch, Web Crawler)
  ...ADDITIONAL_SYSTEMS,             // 5 systems (Search Engine, Metrics TSDB, Google Maps, Job Scheduler, DNS Resolver, Webhook Engine)
  ...COMPLEMENTARY_SYSTEMS,          // 5 systems (API Gateway, CDN Network, Game Server, Collaborative Docs, Notification System, Pastebin)
]

export function getSystemById(id: string): SystemDesignModel | undefined {
  return ALL_SYSTEM_DESIGNS.find((s) => s.id === id)
}

export function getSystemsByCategory(category: string): SystemDesignModel[] {
  return ALL_SYSTEM_DESIGNS.filter((s) => s.category === category)
}
