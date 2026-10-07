import type { TheoryChapter } from '../../types'

export const UNIT_5_CHAPTERS: TheoryChapter[] = [
  {
    id: 'ch-29',
    unitId: 'unit-5',
    unitTitle: 'Networking, Protocols & API Gateways',
    chapterNumber: 29,
    title: 'OSI Layer 4 vs. Layer 7 Load Balancing',
    readingTimeMin: 14,
    summary:
      'The architecture of high-scale traffic distribution: Transport-layer (L4) packet forwarding vs Application-layer (L7) content-aware routing, Direct Server Return (DSR), and reverse proxies.',
    coreConcepts: [
      'Layer 4 Load Balancing (Transport): Operates on IP address and TCP/UDP port. Forward packets at line speed without inspecting HTTP payload.',
      'Layer 7 Load Balancing (Application): Terminates TCP connection, inspects HTTP headers, URLs, cookies, and JSON payloads. Enables path routing, rate limiting, and SSL termination.',
      'Direct Server Return (DSR): L4 technique where responses bypass the load balancer and return directly from backend servers to clients, eliminating egress bandwidth bottlenecks.',
    ],
    deepContentMarkdown: `### The Load Balancing Spectrum

Load balancers distribute incoming network traffic across backend server pools to prevent server saturation and ensure high availability.

---

### Layer 4 (Transport Layer) Load Balancing
* **Operates at:** OSI Layer 4 (TCP/UDP, IP addresses, ports).
* **How it works:**
  * Modifies packet headers using **Network Address Translation (NAT)** or **IP-in-IP encapsulation**.
  * Does **NOT** terminate the TCP connection; it routes raw IP packets directly to backend servers.
  * **Completely unaware of application payload:** It cannot inspect HTTP headers, cookies, or URL paths.
* **Throughput:** Massive line-rate performance (millions of packets/sec).
* **Implementations:** Linux IPVS, AWS Network Load Balancer (NLB), Maglev (Google), Katran (Meta).

#### Direct Server Return (DSR) in L4:
In standard setups, response traffic must travel back through the load balancer. Because internet traffic is highly asymmetric (request is 1KB; response video/image is 10MB), the load balancer\'s egress link becomes saturated.
* **With DSR:** The client sends request to Load Balancer VIP. The load balancer forwards the packet to Backend Server without changing the source IP.
* The backend server responds **directly to the client IP**, completely bypassing the load balancer on the return path!

---

### Layer 7 (Application Layer) Load Balancing
* **Operates at:** OSI Layer 7 (HTTP, HTTPS, gRPC, WebSockets).
* **How it works:**
  * **Terminates the TCP and TLS connection** with the client.
  * Reads the full HTTP request (Method, Path, Headers, Cookies, Body).
  * Opens a separate upstream connection to backend microservices.
* **Capabilities:**
  * **Path-based routing:** \`/api/v1/payments\` $\\to$ Payment Service; \`/static/*\` $\\to$ S3 CDN.
  * **Cookie-based sticky sessions.**
  * **TLS termination:** Decrypts HTTPS at the edge so backend services run lightweight plain HTTP.
  * **Security & Auth:** Rate limiting, JWT verification, Web Application Firewall (WAF) rule inspection.
* **Implementations:** Envoy Proxy, Nginx, HAProxy, AWS Application Load Balancer (ALB).`,
    equationsAndMath: [
      {
        name: 'DSR Bandwidth Multiplier',
        formula: '\\text{Throughput Gain} \\approx \\frac{\\text{Response Size}}{\\text{Request Size}} \\approx 10\\times - 100\\times',
        explanation: 'Bypassing the load balancer on the return path increases total system throughput capacity by up to two orders of magnitude.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Layer 4 (NLB / IPVS)',
        pros: ['Extremely low latency (< 1ms)', 'Millions of connections per instance', 'Low CPU usage'],
        cons: ['No path routing', 'No TLS termination', 'No header/cookie inspection'],
        bestFor: 'Entry-point edge traffic, gaming UDP packets, DNS, database connection proxying',
      },
      {
        option: 'Layer 7 (ALB / Envoy / Nginx)',
        pros: ['Rich path routing', 'TLS termination', 'JWT validation', 'Dynamic gRPC multiplexing'],
        cons: ['Higher CPU and memory overhead', 'Slight latency increase (1-2ms per hop)'],
        bestFor: 'Microservice API gateways, web application routing',
      },
    ],
    interviewKeypoints: [
      'In a high-scale architecture, place an L4 load balancer (AWS NLB) at the front edge to distribute raw TCP traffic to a tier of L7 Envoy API gateways.',
      'Explain Direct Server Return (DSR) to solve load balancer egress bandwidth bottlenecks.',
    ],
  },

  {
    id: 'ch-30',
    unitId: 'unit-5',
    unitTitle: 'Networking, Protocols & API Gateways',
    chapterNumber: 30,
    title: 'TCP Internals: Handshake, Flow Control & Congestion',
    readingTimeMin: 15,
    summary:
      'The foundation of internet transport: The 3-way handshake (SYN, SYN-ACK, ACK), Flow Control via Sliding Windows, and Congestion Control algorithms (Slow Start, Cubic, BBR).',
    coreConcepts: [
      '3-Way Handshake: SYN -> SYN-ACK -> ACK. Establishes sequence numbers and socket state before payload transmission.',
      'Flow Control (rwnd): Prevents the sender from overwhelming the receiver\'s socket buffer using dynamic TCP Receive Window advertising.',
      'Congestion Control (cwnd): Prevents the sender from overwhelming the intermediate network routers (Slow Start, Congestion Avoidance, Fast Retransmit).',
      'Modern Congestion Algorithms: Loss-based (Cubic) vs Delay/Bottleneck-based (Google BBR).',
    ],
    deepContentMarkdown: `### The Transport Control Protocol (TCP)

TCP provides a reliable, ordered, error-checked stream of octets over an unreliable IP packet network.

---

### The 3-Way Handshake

Before any application data can be sent, the client and server must establish sequence numbers:

\`\`\`
Client                                    Server
  │                                         │
  ├────────── SYN (seq = x) ───────────────►│  (1 RTT elapsed)
  │                                         │
  │◄───────── SYN-ACK (seq = y, ack = x+1) ─┤
  │                                         │
  ├────────── ACK (seq = x+1, ack = y+1) ──►│  (Data can now be attached)
\`\`\`

* **Latency Cost:** 1 full Round-Trip Time (RTT) is consumed before the client can transmit its HTTP request.
* **TCP SYN Flood Attack:** An attacker sends millions of SYN packets with spoofed source IPs, exhausting the server\'s half-open connection backlog table.
  * **Mitigation: SYN Cookies** (encodes connection state cryptographically into the initial sequence number $y$, avoiding memory allocation until the final ACK arrives).

---

### Flow Control vs Congestion Control

* **Flow Control (End-to-End):**
  * Protects the **receiver\'s buffer**.
  * The receiver advertises its available buffer space via the **Receive Window (\`rwnd\`)** field in every TCP header.
  * The sender is mathematically forbidden from transmitting more than \`rwnd\` unacknowledged bytes.

* **Congestion Control (Network-Wide):**
  * Protects the **intermediate network routers**.
  * The sender maintains an internal **Congestion Window (\`cwnd\`)**.
  * The actual amount of data the sender can have in flight is:
    $$\\text{FlightSize} = \\min(\\text{rwnd}, \\text{cwnd})$$

---

### Congestion Control Evolution: Cubic vs BBR

1. **Slow Start:**
   * Starts with $\\text{cwnd} = 10$ packets.
   * Doubles $\\text{cwnd}$ for every RTT until hitting Slow Start Threshold ($ssthresh$).
2. **TCP Cubic (Loss-Based):**
   * Traditional default in Linux. Assumes packet loss = network congestion.
   * Probes window size using a cubic function. When packet loss occurs, it halves $\\text{cwnd}$.
   * **Flaw:** High packet loss on mobile/Wi-Fi causes drastic, unnecessary throughput collapse.
3. **Google BBR (Bottleneck Bandwidth and RTT):**
   * Revolutionary modern algorithm. Ignores packet loss.
   * Continuously measures maximum delivery rate and minimum round-trip time.
   * Operates at the optimal operating point: maximizes bandwidth while keeping queues empty, dramatically reducing bufferbloat latency!`,
    equationsAndMath: [
      {
        name: 'Bandwidth-Delay Product (BDP)',
        formula: '\\text{BDP} = \\text{Bandwidth (bits/sec)} \\times \\text{RTT (sec)}',
        explanation: 'The volume of data in flight necessary to completely saturate the network pipe. The TCP window must be at least BDP for maximum wire speed.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'TCP Cubic',
        pros: ['Stable on high-speed fiber wired connections', 'Fair to other TCP flows'],
        cons: ['Severe performance drops on lossy mobile networks'],
        bestFor: 'Internal datacenter links',
      },
      {
        option: 'Google BBR',
        pros: ['Maintains wire speed even under 5-10% packet loss', 'Significantly lower queueing latency'],
        cons: ['Can be aggressive towards legacy loss-based flows'],
        bestFor: 'Public internet edge, YouTube video streaming, mobile APIs',
      },
    ],
    interviewKeypoints: [
      'Explain the Bandwidth-Delay Product (BDP) when discussing high-throughput distributed file transfers.',
      'Cite Google BBR as the modern standard for public-facing TCP traffic.',
    ],
  },

  {
    id: 'ch-31',
    unitId: 'unit-5',
    unitTitle: 'Networking, Protocols & API Gateways',
    chapterNumber: 31,
    title: 'HTTP/1.1 vs. HTTP/2 vs. HTTP/3 (QUIC over UDP)',
    readingTimeMin: 16,
    summary:
      'The evolution of web transport: Head-of-Line blocking in HTTP/1.1, binary framing and multiplexing in HTTP/2, and eliminating transport HoL blocking via HTTP/3 and QUIC over UDP.',
    coreConcepts: [
      'HTTP/1.1 Flaws: Text-based headers, uncompressed headers, Head-of-Line (HoL) blocking on individual TCP connections (requires domain sharding).',
      'HTTP/2 Breakthroughs: Binary framing layer, stream multiplexing over a single TCP connection, HPACK header compression, server push.',
      'HTTP/2 Flaw (TCP HoL Blocking): If a single TCP packet is dropped, the entire TCP connection stalls, freezing ALL multiplexed streams.',
      'HTTP/3 (QUIC over UDP): Independent streams at transport layer. Packet loss on Stream A does NOT stall Stream B. 0-RTT connection resumption.',
    ],
    deepContentMarkdown: `### The Evolution of the Hypertext Transfer Protocol

\`\`\`
HTTP/1.1:
[ TCP Handshake ] ──► [ TLS Handshake ] ──► [ Request 1 ][ Response 1 ] ──► [ Request 2 ][ Response 2 ]
* Serial execution. Head-of-Line blocking.

HTTP/2:
[ TCP Handshake ] ──► [ TLS Handshake ] ──► ┌─ Stream 1: [Frame A][Frame B] ──┐ Multiplexed over
                                            └─ Stream 2: [Frame C][Frame D] ──┘ 1 TCP connection
* Flaw: If 1 TCP packet is dropped, ALL streams stall at the OS kernel buffer.

HTTP/3 (QUIC over UDP):
[ 1-RTT Combined QUIC + TLS 1.3 Handshake ] ──► Stream 1 (Independent)
                                            ──► Stream 2 (Independent)
* Packet loss on Stream 1 NEVER blocks Stream 2. True end-to-end independence!
\`\`\`

---

### HTTP/1.1: Head-of-Line Blocking
In HTTP/1.1, a TCP connection can only process one request-response cycle at a time. If Request 1 is a slow database query, Request 2 must wait in line.
* **Workaround:** Browsers opened 6 parallel TCP connections per domain ("Domain Sharding").
* **Cost:** 6 separate TCP 3-way handshakes and 6 TLS handshakes, exhausting server memory and slow-starting repeatedly.

---

### HTTP/2: Binary Framing & Multiplexing (RFC 7540)
HTTP/2 introduced the **Binary Framing Layer**:
1. Replaces plain text with binary frames (HEADERS, DATA, SETTINGS, RST_STREAM).
2. **Stream Multiplexing:** Multiple bidirectional streams interleave frames across a **single persistent TCP connection**.
3. **HPACK:** State-based header compression. Compresses repetitive headers (\`User-Agent\`, \`Cookie\`) by up to 85%.

#### The Hidden Flaw of HTTP/2: TCP Head-of-Line Blocking
Because HTTP/2 runs over a single TCP connection, the Linux kernel TCP stack guarantees in-order byte delivery.
If a single packet belonging to **Stream 1** is dropped in transit:
* The kernel halts delivery of all subsequent packets.
* **Stream 2, Stream 3, and Stream 4 are completely frozen** in the kernel buffer until the lost packet for Stream 1 is retransmitted!
* Under high packet loss (2-5% on cellular networks), HTTP/2 performs *worse* than HTTP/1.1 with multiple connections!

---

### HTTP/3 & QUIC (RFC 9000): Built Over UDP

HTTP/3 replaces TCP entirely with **QUIC (Quick UDP Internet Connections)** running over user-space UDP:

1. **Independent Streams:** Streams are first-class primitives inside QUIC. Packet loss on Stream 1 only delays Stream 1. Stream 2 continues rendering with **zero head-of-line blocking**.
2. **0-RTT Connection Resumption:** Combines transport handshake and TLS 1.3 cryptographic handshake into a single flight. Returning clients can send application data in **zero roundtrips (0-RTT)**!
3. **Connection Migration:** QUIC identifies connections via a 64-bit **Connection ID**, not by IP address. When a user walks out of their house and their phone switches from Wi-Fi to 5G cellular (IP address changes), the active connection and video download continue **without reconnecting**!`,
    equationsAndMath: [
      {
        name: 'Handshake Roundtrip Comparison',
        formula: '\\text{HTTP/1.1: } 3\\text{ RTT} \\quad \\mid \\quad \\text{HTTP/2: } 2\\text{ RTT} \\quad \\mid \\quad \\text{HTTP/3: } 0-1\\text{ RTT}',
        explanation: 'QUIC merges transport and cryptographic handshakes, reducing initial connection latency from 3 roundtrips to 1 roundtrip (or 0-RTT on resumption).',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'HTTP/2',
        pros: ['Standardized, supported by all proxies and load balancers', 'Multiplexed over TCP'],
        cons: ['TCP-level Head-of-Line blocking under packet loss'],
        bestFor: 'Internal microservice communications, gRPC backends',
      },
      {
        option: 'HTTP/3 (QUIC)',
        pros: ['Zero HoL blocking', 'Connection migration across Wi-Fi/5G', '0-RTT resumption'],
        cons: ['UDP can be blocked by corporate firewalls (fallback to TCP needed)', 'Higher CPU usage for user-space UDP handling'],
        bestFor: 'Public mobile apps, YouTube/Netflix streaming, global web browsing',
      },
    ],
    interviewKeypoints: [
      'Explain TCP Head-of-Line blocking in HTTP/2: dropping 1 packet freezes all multiplexed streams in the OS buffer.',
      'Highlight QUIC Connection ID: explains how mobile devices switch from Wi-Fi to cellular without dropping connections.',
    ],
  },

  {
    id: 'ch-32',
    unitId: 'unit-5',
    unitTitle: 'Networking, Protocols & API Gateways',
    chapterNumber: 32,
    title: 'gRPC & Protocol Buffers: Varints & Binary Packing',
    readingTimeMin: 15,
    summary:
      'High-performance inter-service RPC: Why JSON is inefficient, Protocol Buffers binary serialization mechanics (Tag-Length-Value, Varints, ZigZag encoding), and gRPC streaming.',
    coreConcepts: [
      'The JSON Bottleneck: Text-based, repetitive field names in every message, slow CPU parsing overhead.',
      'Protocol Buffers (Protobuf): Strongly typed, contract-first Interface Definition Language (IDL). Compiles to binary wire format.',
      'Varints (Variable-Length Quantities): Uses 7 bits per byte for integer payload and 1 bit as a continuation marker. Small numbers occupy 1 byte instead of 4 or 8 bytes.',
      'ZigZag Encoding: Maps signed integers to unsigned integers so negative numbers do not expand to 10 bytes.',
      'gRPC Modes: Unary RPC, Server Streaming, Client Streaming, Bidirectional Streaming over HTTP/2.',
    ],
    deepContentMarkdown: `### Why Microservices Abandoned REST & JSON

In monolithic architectures, JSON over HTTP/1.1 is acceptable. In a microservice ecosystem where a single user action triggers 50 inter-service RPC calls, **JSON becomes an architectural liability**:
1. **Inefficient Payload Size:** Field names (e.g. \`"customer_billing_address_street"\`) are repeated in every single payload.
2. **CPU-Intensive Parsing:** Parsing text strings into floating-point numbers and objects requires expensive CPU lexical analysis.
3. **No Strict Typing:** Breaking schema changes are discovered at runtime in production.

---

### Protocol Buffers Binary Packing Internals

Google Protocol Buffers (Protobuf) serializes data into a binary stream using **Tag-Length-Value (TLV)** encoding:

$$\\text{Field Tag Key} = (\\text{Field Number} \\ll 3) \\mid \\text{Wire Type}$$

Instead of transmitting the string field name \`"user_id"\`, Protobuf transmits a single byte containing the integer field tag (e.g. \`1\`) and its wire type!

---

### 1. Varints (Variable-Length Integers)
Standard integers consume 4 bytes (32-bit) or 8 bytes (64-bit), even for small numbers like \`1\`.
**Varints** encode integers using variable byte lengths:
* Each byte uses the **Most Significant Bit (MSB)** as a **Continuation Bit**:
  * \`MSB = 1\`: More bytes follow.
  * \`MSB = 0\`: Final byte of the number.
* The remaining 7 bits store the payload.
* **Example:** Number \`1\` is encoded as \`00000001\` (1 byte instead of 8 bytes).

---

### 2. ZigZag Encoding for Negative Numbers
In standard two\'s complement, negative integer \`-1\` has all 32 or 64 bits set to 1 (\`0xFFFFFFFF\`). Under standard Varints, this would require **10 bytes** to transmit!
**ZigZag Encoding** "zig-zags" back and forth across positive and negative integers:
$$\\text{ZigZag}(n) = (n \\ll 1) \\oplus (n \\gg 31)$$

* $0 \\to 0$
* $-1 \\to 1$
* $1 \\to 2$
* $-2 \\to 3$
* **Result:** Small negative numbers (like \`-1\` or \`-5\`) are mapped to small positive integers and consume only **1 byte**!`,
    equationsAndMath: [
      {
        name: 'Protobuf Tag Encoding Formula',
        formula: '\\text{Tag} = (\\text{field\\_id} \\ll 3) \\mid \\text{wire\\_type}',
        explanation: 'Combines the integer field ID and wire type into a single compact varint byte.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'REST with JSON',
        pros: ['Human-readable', 'Easy to test via browser and curl', 'Ubiquitous tooling'],
        cons: ['Large payload size', 'High CPU parsing overhead', 'No compile-time contract enforcement'],
        bestFor: 'Public-facing external client APIs',
      },
      {
        option: 'gRPC with Protocol Buffers',
        pros: ['7x-10x faster serialization', '50-80% smaller payloads', 'Bidirectional streaming', 'Compile-time type safety'],
        cons: ['Binary payload requires reflection tooling to inspect (grpcurl)', 'Browser support requires gRPC-Web proxy'],
        bestFor: 'Internal inter-service microservice communication',
      },
    ],
    interviewKeypoints: [
      'Explain Varints and ZigZag encoding to demonstrate deep computer science knowledge of binary serialization.',
      'Always advocate for gRPC over internal microservice links while keeping REST/GraphQL for public client ingress.',
    ],
  },

  {
    id: 'ch-33',
    unitId: 'unit-5',
    unitTitle: 'Networking, Protocols & API Gateways',
    chapterNumber: 33,
    title: 'Real-Time Transport: WebSockets vs. SSE vs. Polling',
    readingTimeMin: 14,
    summary:
      'Choosing the right real-time mechanism: Short Polling, Long Polling (Comet), Server-Sent Events (SSE), and bidirectional full-duplex WebSockets.',
    coreConcepts: [
      'Short Polling: Client sends repeated HTTP requests on a timer. Massive server overhead; poor latency.',
      'Long Polling: Server holds HTTP request open until data is available, then responds and closes connection.',
      'Server-Sent Events (SSE): Unidirectional text stream over HTTP. Ideal for live stock tickers, AI chat token streaming (ChatGPT).',
      'WebSockets: Full-duplex bidirectional TCP socket over port 80/443. Ideal for chat applications and multiplayer gaming.',
    ],
    deepContentMarkdown: `### Real-Time Communication Paradigms

Traditional HTTP is a client-initiated request-response protocol: the server cannot push data to the client unilaterally. Four architectures enable real-time updates:

---

### 1. Short Polling (Anti-Pattern)
* Client sends \`GET /notifications\` every 2 seconds.
* **Flaws:** 99% of requests return empty responses, wasting bandwidth and mobile battery. High server connection churn.

---

### 2. Long Polling
* Client sends \`GET /notifications\`.
* If no new data exists, the server **holds the connection open** (e.g. for 30 seconds).
* As soon as an event occurs, the server responds and closes the connection.
* Client immediately re-opens a new long poll request.
* **Flaws:** Header overhead on every reconnect; stateful server threads.

---

### 3. Server-Sent Events (SSE - RFC 6202)
* Built directly on standard HTTP/1.1 or HTTP/2 (\`Content-Type: text/event-stream\`).
* **Unidirectional (Server $\\to$ Client only).**
* Persistent, streaming HTTP response. The server pushes \`data: { ... }\\n\\n\` chunks indefinitely.
* **Native Browser Features:** Automatic reconnection with \`Last-Event-ID\` header; built-in \`EventSource\` API.
* **Application:** ChatGPT streaming text completions, stock price tickers, live sports scores.

---

### 4. WebSockets (RFC 6455)
* Upgrades an initial HTTP connection via handshake (\`Upgrade: websocket\`) to a **full-duplex, bidirectional TCP socket**.
* Operates over standard ports 80 (WS) and 443 (WSS).
* Minimal frame overhead: only **2 to 6 bytes** of framing per message!
* Both client and server can transmit binary or text messages independently at any time.
* **Application:** 1-on-1 chat (WhatsApp), multiplayer games, collaborative document editing (Google Docs).`,
    equationsAndMath: [
      {
        name: 'WebSocket Header Overhead Reduction',
        formula: '\\text{Overhead: } \\text{HTTP} \\approx 500-1000 \\text{ bytes} \\quad \\mid \\quad \\text{WebSocket} = 2-6 \\text{ bytes}',
        explanation: 'WebSockets eliminate recurring HTTP header transmissions, reducing per-message framing overhead by up to 99%.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Server-Sent Events (SSE)',
        pros: ['Runs over standard HTTP (bypasses firewalls seamlessly)', 'Built-in browser auto-reconnect', 'Multiplexed over HTTP/2'],
        cons: ['Unidirectional (client cannot send data over the stream)'],
        bestFor: 'LLM token streaming (ChatGPT), live dashboards, notification feeds',
      },
      {
        option: 'WebSockets',
        pros: ['True full-duplex bidirectional streaming', 'Ultra-low 2-byte framing overhead', 'Binary support'],
        cons: ['Requires stateful connection management', 'Load balancer sticky sessions or Redis pub/sub backplane required'],
        bestFor: 'Chat apps, interactive gaming, real-time whiteboards',
      },
    ],
    interviewKeypoints: [
      'Choose SSE over WebSockets if the communication is strictly server-to-client (e.g. streaming LLM responses).',
      'Explain how WebSockets require a distributed backplane (like Redis Pub/Sub) to route messages between users connected to different gateway servers.',
    ],
  },

  {
    id: 'ch-34',
    unitId: 'unit-5',
    unitTitle: 'Networking, Protocols & API Gateways',
    chapterNumber: 34,
    title: 'API Gateway Architecture: Auth, Rate Limiting & Routing',
    readingTimeMin: 14,
    summary:
      'Designing the unified entry point for microservices: Envoy and Kong architectures, token bucket rate limiters, JWT validation, and upstream circuit breaking.',
    coreConcepts: [
      'The API Gateway Pattern: Single entry point insulating internal microservices from external clients.',
      'Cross-Cutting Concerns: SSL termination, authentication/authorization, rate limiting, request tracing (OpenTelemetry), and response caching.',
      'Stateless JWT Validation: Verify RS256 signature locally using cached JWKS public keys without calling Auth service.',
    ],
    deepContentMarkdown: `### The API Gateway Pattern

In a microservice ecosystem with dozens of internal services, exposing individual microservices directly to the internet is an anti-pattern:
* Clients become tightly coupled to internal service boundaries.
* Each microservice would have to independently implement TLS, authentication, CORS, and rate limiting.

An **API Gateway** acts as the single reverse proxy front door.

---

### Core Responsibilities

1. **Routing & Path Rewriting:** Maps external URLs (\`/v1/orders\`) to internal gRPC endpoints (\`order-service.internal:50051\`).
2. **Stateless Authentication:**
   * Validates client JSON Web Tokens (JWT).
   * Checks the cryptographic RS256 signature using cached JWKS (JSON Web Key Set) public keys.
   * Injects sanitized user context headers (\`X-User-ID: 1234\`, \`X-User-Role: admin\`) for downstream services.
3. **Distributed Rate Limiting:** Throttles abusive clients using Redis Token Bucket or Sliding Window algorithms.
4. **Protocol Translation:** Transcodes external HTTP/JSON requests into internal high-performance gRPC binary streams.
5. **Circuit Breaking:** Detects failing upstream instances and fails fast, protecting healthy services.`,
    equationsAndMath: [
      {
        name: 'Token Bucket Refill Rate',
        formula: 'Tokens_{available} = \\min(C, \\text{Tokens}_{prev} + (t_{now} - t_{prev}) \\times r)',
        explanation: 'Refills tokens at rate r up to maximum bucket burst capacity C.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Centralized API Gateway',
        pros: ['Unified security enforcement', 'Centralized observability and metrics', 'Shields internal microservice topology'],
        cons: ['Potential single point of failure and bottleneck if misconfigured'],
        bestFor: 'All internet-facing public microservice architectures',
      },
    ],
    interviewKeypoints: [
      'Always place an API Gateway in front of microservice architectures.',
      'Explain that the gateway validates JWTs locally via public key crypto rather than making a synchronous network call to the Auth service on every request.',
    ],
  },

  {
    id: 'ch-35',
    unitId: 'unit-5',
    unitTitle: 'Networking, Protocols & API Gateways',
    chapterNumber: 35,
    title: 'Service Mesh: Envoy Sidecars, mTLS & Traffic Shifting',
    readingTimeMin: 15,
    summary:
      'Decoupling networking from application code: Istio and Envoy sidecar proxies, mutual TLS (mTLS) Zero Trust security, canary deployments, and distributed tracing.',
    coreConcepts: [
      'The Service Mesh Concept: Dedicated infrastructure layer managing service-to-service communication via sidecar proxies.',
      'Data Plane (Envoy): High-performance C++ proxy running alongside each application container, intercepting all inbound and outbound traffic.',
      'Control Plane (Istio): Translates declarative routing policies and issues cryptographic certificates to the data plane.',
      'Mutual TLS (mTLS): Authenticates and encrypts all internal traffic with automatic certificate rotation.',
      'Canary Traffic Shifting: Dynamically route 10% of traffic to v2 without modifying application code.',
    ],
    deepContentMarkdown: `### The Problem: Networking Logic Polluting Business Code

When microservices manage their own networking logic, every development team must implement retries, timeouts, circuit breakers, mutual TLS, and tracing inside their application code (in Go, Java, Node, Python).

A **Service Mesh** extracts all networking concerns out of the application into an independent **Sidecar Proxy**.

---

### The Architecture: Data Plane vs Control Plane

\`\`\`
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│ POD A                                │     │ POD B                                │
│ ┌────────────────┐                   │     │ ┌────────────────┐                   │
│ │ Service App A  │                   │     │ │ Service App B  │                   │
│ └───────┬────────┘                   │     │ └────────▲───────┘                   │
│         │ (localhost)                │     │          │ (localhost)               │
│ ┌───────▼────────┐                   │     │ ┌────────┴───────┐                   │
│ │ Envoy Sidecar  ├────(mTLS Wire)────┼────►│ │ Envoy Sidecar  │                   │
│ └───────▲────────┘                   │     │ └────────▲───────┘                   │
└─────────┼────────────────────────────┘     └──────────┼───────────────────────────┘
          │                                             │
          └──────────────────┬──────────────────────────┘
                             ▼
              [ Control Plane (Istio / Linkerd) ]
\`\`\`

#### 1. Data Plane (Envoy Proxy)
* An Envoy proxy container runs inside the same Kubernetes Pod as the application.
* Using Linux \`iptables\` rules, all incoming and outgoing network packets are transparently intercepted by the Envoy sidecar.
* The application simply talks to \`http://localhost:8080\`; Envoy handles load balancing, health checks, retries, and encryption!

#### 2. Control Plane (Istio)
* Manages configuration and issues short-lived X.509 certificates to each Envoy proxy.
* Rotates certificates automatically every 24 hours, enforcing **Zero Trust mTLS**.

---

### Advanced Capabilities

1. **Canary Deployments:**
   * Split traffic: 90% to \`v1.0\` and 10% to \`v2.0\` at the proxy layer.
2. **Chaos Engineering (Fault Injection):**
   * Inject 500ms artificial latency or 5% HTTP 500 errors into specific routes to test system resilience.
3. **Distributed Tracing (OpenTelemetry):**
   * Sidecars inject and propagate \`traceparent\` and \`B3\` headers automatically, generating flame graphs across the entire microservice call graph.`,
    equationsAndMath: [
      {
        name: 'Service Mesh Latency Overhead',
        formula: 'T_{overhead} = 2 \\times T_{sidecar\\_proxy} \\approx 1.5 - 3 \\text{ ms}',
        explanation: 'Each service hop traverses two Envoy proxies (outbound sidecar on caller, inbound sidecar on receiver).',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Application-Level Libraries (e.g. Finagle, Netflix Ribbon)',
        pros: ['Zero sidecar proxy latency overhead', 'Simpler infrastructure deployment'],
        cons: ['Must be re-implemented in every programming language', 'Requires recompilation to update network policies'],
        bestFor: 'Homogeneous single-language monoliths',
      },
      {
        option: 'Service Mesh Sidecars (Istio / Envoy)',
        pros: ['Language-agnostic', 'Zero Trust mTLS out of the box', 'Centralized dynamic traffic management'],
        cons: ['Adds 1-3ms latency per network hop', 'Consumes additional CPU and memory per pod'],
        bestFor: 'Large polyglot Kubernetes microservice clusters (> 20 services)',
      },
    ],
    interviewKeypoints: [
      'Explain that the sidecar intercepts traffic via Linux iptables rules.',
      'Acknowledge the trade-off: Service meshes provide immense observability and security, but introduce memory overhead and 1-3ms latency per RPC hop.',
    ],
  },
]
