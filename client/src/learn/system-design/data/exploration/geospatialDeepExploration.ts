import type { SystemDeepExploration } from '../systemDeepExplorationRegistry'

export const GEOSPATIAL_DEEP_EXPLORATION: Record<string, SystemDeepExploration> = {
  'uber-dispatch': {
    systemId: 'uber-dispatch',
    executiveArchitectureSummary:
      'A real-time geospatial ride dispatch and matchmaking engine modeled on Uber and Lyft, ingesting GPS coordinates from 500,000 active drivers every 4 seconds, indexing locations into Uber H3 hierarchical hexagonal spatial cells, and executing sub-100ms k-nearest driver searches.',
    problemStatementAndWhyHard:
      'Storing latitude and longitude coordinates in traditional SQL databases (`WHERE ST_DWithin(geom, point, 5000)`) triggers heavy disk I/O and spatial bounding box scans that collapse at 50,000 QPS. Furthermore, rectangular QuadTrees suffer from geometric corner distortion (diagonal cells are further away than adjacent ones). Uber H3 solves this with uniform hexagonal neighbor distances.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Rider Mobile App', action: 'Issues ride request: POST /api/v1/rides/match with pickup location {lat: 37.7749, lng: -122.4194}.', latencyEstimate: '1.5ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Dispatch Matchmaker Service', action: 'Converts rider GPS to Uber H3 Resolution 8 cell index: 8828308281fffff.', latencyEstimate: '0.05ms', protocol: 'In-Memory H3 C Library' },
      { stepNumber: 3, component: 'Hexagonal Ring Expansion', action: 'Calls h3.kRing(centerHex, k=2) to get the center hexagon plus 18 surrounding neighbor hexagons.', latencyEstimate: '0.02ms', protocol: 'Hexagonal Grid Math' },
      { stepNumber: 4, component: 'Geospatial In-Memory Driver Lookup', action: 'Queries Redis Geo / In-Memory Spatial Index for available drivers located inside these 19 hexagons.', latencyEstimate: '2.5ms', protocol: 'Redis MGET' },
      { stepNumber: 5, component: 'ETA Routing & Batch Auction', action: 'Queries Road Network Graph engine (OSRM/Valhalla) for driving ETAs; ranks top 3 candidate drivers; dispatches offer to nearest driver via WebSockets.', latencyEstimate: '15ms', protocol: 'Internal gRPC' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Driver Mobile App', action: 'Transmits GPS ping every 4 seconds over persistent duplex WebSocket: {driverId, lat, lng, heading, status}.', latencyEstimate: '1.2ms', protocol: 'WebSocket Frame' },
      { stepNumber: 2, component: 'Location Gateway Service', action: 'Ingests ping; pushes to Kafka partitioned topic: driver-telemetry (partitioned by city ID).', latencyEstimate: '2.0ms', protocol: 'Kafka Producer' },
      { stepNumber: 3, component: 'Streaming Location Processor', action: 'Computes current H3 cell; updates Driver Location Cache in Redis: SET driver:{id}:loc {h3_index, lat, lng, timestamp}.', latencyEstimate: '1.5ms', protocol: 'Redis Pipeline' },
      { stepNumber: 4, component: 'Hexagon Inverted Index Update', action: 'Adds driver ID to Redis Set of available drivers in that cell: SADD hex:{h3_cell} {driver_id}.', latencyEstimate: '0.8ms', protocol: 'Redis SADD' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'In-Memory Spatial Index (Redis Cluster / ScyllaDB)',
        entity: 'driver_locations',
        primaryKey: 'driver:{driver_id}',
        partitionKey: 'city_id',
        schemaDefinition: 'KEY: hex:8828308281fffff -> SET of driver_ids ["drv_102", "drv_948", "drv_312"]. Key TTL: 15 seconds (auto-evicts dead drivers).',
        indexingRationale: 'Hexagon cell keys act as pre-computed spatial buckets. Looking up drivers within 2km requires querying only 19 fixed set keys, transforming complex geometric geometry scans into O(1) in-memory set unions.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Spatial Indexing Strategy: Google S2 QuadTree vs Uber H3 Hexagonal Grid',
        chosenApproach: 'Uber H3 Hexagonal Hierarchical Grid',
        rejectedAlternative: 'Square QuadTree / GeoHash (S2 rectangular projection)',
        rationale: 'Square cells have two types of neighbors: 4 edge neighbors at distance 1.0, and 4 corner neighbors at distance 1.414. Hexagons have 6 neighbors that are all equidistant (distance 1.0), making radius proximity and ring expansion mathematically uniform.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Driver Disconnects or Loses Cellular Signal in Tunnel',
        impact: 'Driver appears online in system but cannot receive dispatch offers.',
        detectionMechanism: 'Heartbeat timeout: No GPS ping received for > 12 seconds (3 missed intervals).',
        automatedRecovery: 'Redis Key Expiration: Hexagon set membership automatically expires via Redis TTL; driver is removed from dispatch pool until reconnection.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Location Update Ingestion QPS', assumption: '500,000 active drivers pinging every 4 seconds', calculation: '500,000 / 4 = 125,000 location updates/sec', finalRequirement: 'Partitioned across 16 Kafka topics and 8 Redis cluster nodes.' },
      { metric: 'Network Ingress Bandwidth', assumption: '125,000 pings/sec * 64 bytes binary Protobuf packet', calculation: '125,000 * 64 B = 8 Megabytes/sec (64 Mbps)', finalRequirement: 'Extremely lightweight when using binary Protobuf instead of JSON.' },
    ],
  },

  'web-crawler': {
    systemId: 'web-crawler',
    executiveArchitectureSummary:
      'A distributed, high-speed web crawler architecture modeled on Googlebot and Apache Nutch, crawling 1+ billion web pages/month while enforcing robots.txt compliance, domain host politeness, Bloom filter URL deduplication, and SimHash near-duplicate content detection.',
    problemStatementAndWhyHard:
      'Uncontrolled crawlers can inadvertently DDoS small website servers by sending thousands of concurrent HTTP requests. Crawlers must maintain separate per-domain queue delays, avoid infinite spider traps (e.g. infinite calendar URLs), deduplicate billions of visited URLs without running out of RAM, and resolve millions of DNS queries efficiently.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Politeness Queue Dispatcher', action: 'Pulls target URL from Host Politeness Queue: Checks if last request to example.com was > 1000ms ago.', latencyEstimate: '0.1ms', protocol: 'In-Memory Heap' },
      { stepNumber: 2, component: 'Local DNS Cache (Unbound)', action: 'Resolves IP address from local memory cache; avoids querying external DNS root servers.', latencyEstimate: '0.5ms', protocol: 'UDP 53' },
      { stepNumber: 3, component: 'Robots.txt Cache Inspection', action: 'Checks cached robots.txt rules for target domain. If path is Disallow: drops URL immediately.', latencyEstimate: '0.2ms', protocol: 'In-Memory Trie' },
      { stepNumber: 4, component: 'HTTP Fetcher Worker', action: 'Sends HTTP GET with User-Agent: NexoraBot. Downloads HTML payload (capped at 5MB).', latencyEstimate: '180ms', protocol: 'HTTP/2 over TLS' },
      { stepNumber: 5, component: 'HTML Parser & Content Extractor', action: 'Extracts clean text, calculates 64-bit SimHash, and discovers all child <a href="..."> hyperlinks.', latencyEstimate: '15ms', protocol: 'HTML5 Parser' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'URL Normalization Engine', action: 'Lowercases URL, strips tracking query parameters (utm_source), resolves relative paths to absolute URLs.', latencyEstimate: '0.05ms', protocol: 'Regex / URL Parser' },
      { stepNumber: 2, component: 'Bloom Filter Deduplication', action: 'Checks Scalable Bloom Filter (1 billion entries). If URL bit exists: discard (already crawled). If new: set bits and proceed.', latencyEstimate: '0.01ms', protocol: 'In-Memory Bloom Filter' },
      { stepNumber: 3, component: 'URL Frontier Enqueue (Mercator)', action: 'Routes new URL to Priority Queue based on PageRank; maps to domain host politeness queue.', latencyEstimate: '1.2ms', protocol: 'Redis / Kafka' },
      { stepNumber: 4, component: 'Raw Document Storage (Warcs / S3)', action: 'Compresses HTML text; stores raw snapshot in S3 object store for search engine indexing.', latencyEstimate: '22ms', protocol: 'HTTPS S3 PUT' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'In-Memory Bloom Filter + S3 Object Storage',
        entity: 'crawled_urls_filter',
        primaryKey: 'MD5(normalized_url)',
        partitionKey: 'hash_prefix',
        schemaDefinition: 'Bloom Filter: 1,000,000,000 items with 0.1% false positive rate requires 1.8 Gigabytes RAM using 10 MurmurHash3 functions.',
        indexingRationale: 'Bloom filter answers "Has this URL been crawled?" in O(1) CPU time with zero disk reads, saving billions of database queries.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'URL Frontier Architecture: Single Centralized Queue vs Mercator Two-Tier Queues',
        chosenApproach: 'Mercator Two-Tier URL Frontier (Priority Queues + Politeness FIFO Queues)',
        rejectedAlternative: 'Single global FIFO queue',
        rationale: 'A single FIFO queue sprays requests randomly, hitting the same host with concurrent threads and causing web server outages. Mercator partitions queues strictly by host, with delays enforced between fetches.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Crawler Spider Trap (Web server generates infinite dynamic paths like /dir/dir/dir/...)',
        impact: 'Workers get stuck crawling useless infinite loops, consuming resources.',
        detectionMechanism: 'URL path depth heuristic (> 10 subdirectories) or URL length > 256 characters.',
        automatedRecovery: 'Trap Filter: URL Frontier automatically rejects URLs exceeding depth thresholds or showing repeating path patterns.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Monthly Page Crawl Target', assumption: '1 billion pages per month', calculation: '1,000,000,000 / (30 * 86,400) ≈ 385 pages/sec sustained crawl rate', finalRequirement: 'Cluster of 50 crawler worker nodes with 10 concurrent threads each.' },
      { metric: 'Storage for 1 Billion HTML Snapshots', assumption: 'Average 50KB compressed HTML per page', calculation: '1B * 50 KB = 50 Terabytes/month', finalRequirement: 'Stored in S3 Standard-IA / Glacier cold storage.' },
    ],
  },

  'search-engine': {
    systemId: 'search-engine',
    executiveArchitectureSummary:
      'A distributed full-text search engine modeled on Elasticsearch and Apache Lucene, indexing 50M+ documents and executing complex multi-keyword Boolean queries in under 25ms using inverted indexes, posting lists with skip pointers, and Okapi BM25 relevance scoring.',
    problemStatementAndWhyHard:
      'Searching text using SQL `LIKE %keyword%` forces full table scans that take tens of seconds on millions of rows. Full-text search requires reversing the relationship: building an inverted index mapping each individual word to an ordered list of document IDs containing it, and intersecting these lists using skip-list pointers.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Search Client (User / App)', action: 'Submits search query: GET /search?q="distributed+consensus"&page=1.', latencyEstimate: '1.2ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Query Parser & Analyzer', action: 'Tokenizes query string: lowercases, removes stop words, stems terms ("distributed" -> "distribut", "consensus" -> "consensus").', latencyEstimate: '0.5ms', protocol: 'In-Memory Analyzer' },
      { stepNumber: 3, component: 'Posting List Retrieval', action: 'Queries FST (Finite State Transducer) term dictionary in RAM; fetches posting lists for "distribut" and "consensus".', latencyEstimate: '1.2ms', protocol: 'Memory-Mapped FST' },
      { stepNumber: 4, component: 'Posting List Intersection (Skip List)', action: 'Intersects document ID arrays using skip pointers in O(N + M) time; identifies common documents.', latencyEstimate: '3.5ms', protocol: 'CPU Bitset / SkipList' },
      { stepNumber: 5, component: 'BM25 Scoring & Top-K Ranking', action: 'Computes Okapi BM25 relevance score based on Term Frequency (TF) and Inverse Document Frequency (IDF); returns top 20 results in 18ms.', latencyEstimate: '4.8ms', protocol: 'In-Memory Math' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Document Ingestion API', action: 'Receives POST /api/v1/documents {id: 9812, title: "Raft Consensus", content: "..."}.', latencyEstimate: '1.5ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Text Tokenization Pipeline', action: 'Passes text through StandardTokenizer, LowercaseFilter, and PorterStemmer.', latencyEstimate: '2.5ms', protocol: 'Lucene Pipeline' },
      { stepNumber: 3, component: 'In-Memory Index Buffer', action: 'Adds document tokens to in-memory Lucene indexing buffer (IndexWriter).', latencyEstimate: '0.8ms', protocol: 'In-Memory' },
      { stepNumber: 4, component: 'Translog (Write-Ahead Log) Append', action: 'Appends raw document to sequential transaction log on NVMe SSD for durability.', latencyEstimate: '1.2ms', protocol: 'File Write' },
      { stepNumber: 5, component: 'Segment Flush & Merge', action: 'Every 1 second: flushes memory buffer to new immutable Lucene index segment file on disk; background thread merges small segments.', latencyEstimate: '15ms', protocol: 'Async OS File Flush' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Immutable Lucene Segment Files (.doc, .pos, .tim)',
        entity: 'Inverted Index Posting List',
        primaryKey: 'Term (stemmed string)',
        partitionKey: 'Murmur3(doc_id) % ShardCount',
        schemaDefinition: 'Term -> PostingList [DocID: 10, Freq: 3, Positions: [2, 14, 98]] -> [DocID: 45, Freq: 1, Positions: [12]] with SkipPointers every 128 doc IDs.',
        indexingRationale: 'Skip pointers allow binary jumping over non-matching document ID ranges during multi-term AND queries, speeding up intersection by 10x.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Relevance Scoring: TF-IDF vs Okapi BM25',
        chosenApproach: 'Okapi BM25 (Best Matching 25)',
        rejectedAlternative: 'Standard TF-IDF',
        rationale: 'TF-IDF increases score linearly with keyword repetition, making it vulnerable to keyword stuffing. BM25 has a non-linear term saturation curve (k1 parameter), ensuring high-quality relevance.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Search Shard Node Hardware Crash',
        impact: 'One partition of the search index becomes unavailable.',
        detectionMechanism: 'Cluster Master node detects missed heartbeat within 3000ms.',
        automatedRecovery: 'Primary Shard Promotion: Master immediately promotes in-sync replica shard on another node to Primary; queries re-route seamlessly.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Index Storage Sizing', assumption: '50 million documents, average 5KB text per document', calculation: '50,000,000 * 5KB = 250 GB raw text. Inverted index overhead ≈ 30% = 75 GB index.', finalRequirement: '320 GB total storage easily fits on a 3-node cluster with NVMe SSDs.' },
    ],
  },

  'google-maps': {
    systemId: 'google-maps',
    executiveArchitectureSummary:
      'A global vector map tile and turn-by-turn routing engine modeled on Google Maps and Mapbox, serving billions of vector map tiles across zoom levels 0-22 and computing shortest driving paths in under 10ms using Contraction Hierarchies, A* search, and road network graph partitioning.',
    problemStatementAndWhyHard:
      'Running Dijkstra’s shortest path algorithm across the continental US road network (50 million intersections) requires exploring millions of nodes, taking 5+ seconds per query. Contraction Hierarchies pre-process the road network offline by adding shortcut edges between highways, enabling routing queries to run in < 5ms.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Map Mobile / Web Client', action: 'Requests vector map tile for viewport: GET /tiles/{z}/{x}/{y}.mvt (e.g. z=14, x=2624, y=6330).', latencyEstimate: '1.2ms', protocol: 'HTTPS Edge' },
      { stepNumber: 2, component: 'Edge CDN POP', action: 'Vector tiles are pre-rendered Protocol Buffer binaries (.mvt); served directly from edge cache in 5ms.', latencyEstimate: '0.8ms', protocol: 'HTTP/3 Edge' },
      { stepNumber: 3, component: 'Routing Direction Request', action: 'User requests directions: POST /api/v1/directions {origin: [lat1, lng1], destination: [lat2, lng2], profile: "driving"}.', latencyEstimate: '2.5ms', protocol: 'HTTPS' },
      { stepNumber: 4, component: 'Graph Node Snapping', action: 'Snaps GPS coordinates to nearest road network graph edges in memory using spatial R-Tree.', latencyEstimate: '0.8ms', protocol: 'In-Memory R-Tree' },
      { stepNumber: 5, component: 'Contraction Hierarchies Bi-Directional Search', action: 'Executes bidirectional Dijkstra on contracted graph with shortcut edges; meets in middle in < 5ms; reconstructs full turn-by-turn route geometry.', latencyEstimate: '4.2ms', protocol: 'C++ Graph Engine' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Live Traffic Ingestion', action: 'Ingests speed probe telemetry from millions of moving smartphones every 5 seconds.', latencyEstimate: '2.0ms', protocol: 'Kafka Streaming' },
      { stepNumber: 2, component: 'Real-Time Edge Weight Update', action: 'Updates road edge transit weights (traffic congestion) in dynamic overlay graph.', latencyEstimate: '3.5ms', protocol: 'In-Memory Overlay' },
      { stepNumber: 3, component: 'Offline Map Tile Pre-Generation', action: 'Nightly batch pipeline renders vector tiles from OpenStreetMap data into binary Mapbox Vector Tile (.mvt) format; stores in S3.', latencyEstimate: '2 hours', protocol: 'Batch K8s Pipeline' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Road Network Graph (In-Memory C++ / PostGIS)',
        entity: 'Road Network Graph',
        primaryKey: 'NodeID (uint32) & EdgeID (uint32)',
        partitionKey: 'Geographic Region (e.g. North America, Europe)',
        schemaDefinition: 'struct Node { float lat; float lon; uint32_t first_edge; }; struct Edge { uint32_t target_node; uint32_t weight_time_ms; uint32_t shortcut_target; };',
        indexingRationale: 'Forward star graph representation packs millions of road nodes into contiguous memory arrays for maximum CPU L1/L2 cache line hits during path exploration.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Map Tile Format: Raster PNG Tiles vs Vector Protobuf Tiles (.mvt)',
        chosenApproach: 'Vector Tiles (.mvt) rendered client-side on WebGL / Metal GPU',
        rejectedAlternative: 'Server-rendered 256x256 pixel PNG raster images',
        rationale: 'Vector tiles are 70% smaller in file size, scale smoothly at any retina display resolution, and allow dynamic client-side styling (dark mode) without re-downloading images.',
      },
      {
        decision: 'Routing Algorithm: Raw Dijkstra / A* vs Contraction Hierarchies (CH)',
        chosenApproach: 'Contraction Hierarchies with dynamic traffic overlay',
        rejectedAlternative: 'Standard A* search with Euclidean distance heuristic',
        rationale: 'A* still searches thousands of residential road segments during cross-country trips. Contraction Hierarchies explore only "upward" edges to highways, evaluating fewer than 500 nodes per query.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Road Network Graph Server Node Outage',
        impact: 'Routing query requests directed to that server fail.',
        detectionMechanism: 'gRPC health check failure.',
        automatedRecovery: 'Stateless Routing Pods: All routing servers keep the entire read-only contracted graph in memory (~8GB RAM for US). Traffic instantly re-routes to remaining healthy pods.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Memory for Continental Road Graph', assumption: '50 million road intersections, 120 million road segments', calculation: '50M nodes * 16B + 120M edges * 16B ≈ 2.7 Gigabytes RAM', finalRequirement: 'Entire US road network fits comfortably in RAM on a single standard cloud instance.' },
    ],
  },
}
