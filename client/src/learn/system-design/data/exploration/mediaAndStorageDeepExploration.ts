import type { SystemDeepExploration } from '../systemDeepExplorationRegistry'

export const MEDIA_STORAGE_DEEP_EXPLORATION: Record<string, SystemDeepExploration> = {
  'youtube-stream': {
    systemId: 'youtube-stream',
    executiveArchitectureSummary:
      'A global video streaming architecture handling petabytes of daily video uploads, parallel adaptive bitrate (ABR) transcoding across resolutions (1080p, 720p, 480p), segment chunking via HLS/DASH, and multi-tier edge CDN streaming with Origin Shields.',
    problemStatementAndWhyHard:
      'Raw video files are tens of gigabytes in size. Ingesting raw video, transcoding it into dozens of codec formats (H.264, VP9, AV1) without blocking CPU cores, and streaming uninterrupted 4K video over unstable mobile 4G/5G connections requires distributed chunking, CDN caching, and adaptive bitrate algorithms.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Video Player Client', action: 'Requests master playlist manifest: GET /videos/{videoId}/master.m3u8.', latencyEstimate: '1.2ms', protocol: 'HTTPS over Anycast CDN' },
      { stepNumber: 2, component: 'Edge CDN POP', action: 'Serves cached master.m3u8 containing sub-playlists for 1080p (5Mbps), 720p (2.5Mbps), 480p (1Mbps).', latencyEstimate: '0.8ms', protocol: 'HTTP/3 Edge' },
      { stepNumber: 3, component: 'Player Bandwidth Heuristic', action: 'Player measures network throughput; requests first 4-second video chunk: GET /1080p/segment_001.ts.', latencyEstimate: '0.2ms', protocol: 'Client Player Logic' },
      { stepNumber: 4, component: 'Edge Cache Hit vs Miss', action: 'If chunk cached on edge NVMe SSD: streams chunk immediately in 15ms. If miss: queries Regional Origin Shield.', latencyEstimate: '12ms', protocol: 'HTTPS' },
      { stepNumber: 5, component: 'Seamless Bitrate Switching', action: 'If network drops below 3Mbps, player dynamically requests next chunk from 720p playlist without video freeze.', latencyEstimate: '0.1ms', protocol: 'HLS Client Buffer' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Uploader Web / Mobile Client', action: 'Requests presigned multipart upload URL from API Gateway: POST /api/v1/videos/upload-token.', latencyEstimate: '15ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Direct Object Storage Ingestion', action: 'Uploads raw video in 10MB chunks directly to Amazon S3 / Ceph, bypassing backend application servers.', latencyEstimate: '120ms', protocol: 'HTTPS PUT Multipart' },
      { stepNumber: 3, component: 'S3 Event Notification', action: 'S3 emits ObjectCreated event to Kafka topic: raw-video-uploaded.', latencyEstimate: '5.0ms', protocol: 'Kafka Producer' },
      { stepNumber: 4, component: 'DAG Transcoding Engine (Temporal / K8s)', action: 'Spawns worker pool to split video into 4s chunks and transcode concurrently via FFmpeg/GPU nodes.', latencyEstimate: '180s', protocol: 'Worker Distributed GPU' },
      { stepNumber: 5, component: 'Manifest Assembly & CDN Warm', action: 'Generates .m3u8 manifests; uploads chunks to S3; pre-warms top edge CDN locations.', latencyEstimate: '850ms', protocol: 'CDN Invalidation/Pre-warm' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Relational Database (PostgreSQL / Spanner)',
        entity: 'video_metadata',
        primaryKey: 'video_id VARCHAR(16)',
        partitionKey: 'user_id BIGINT',
        schemaDefinition: 'CREATE TABLE videos (video_id VARCHAR(16) PRIMARY KEY, uploader_id BIGINT NOT NULL, title VARCHAR(255) NOT NULL, duration_seconds INT NOT NULL, manifest_url VARCHAR(1024) NOT NULL, status VARCHAR(32) NOT NULL, views_count BIGINT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());',
        indexingRationale: 'B+Tree index on video_id for instant player lookup; index on (uploader_id, created_at DESC) for creator studio dashboard.',
      },
      {
        storageType: 'Cloud Object Storage (S3 / Ceph)',
        entity: 'video_chunks',
        primaryKey: 's3://videos/{video_id}/{resolution}/chunk_{index}.ts',
        partitionKey: 'video_id',
        schemaDefinition: 'Object Storage Key: videos/v_9812/1080p/seg_001.ts (Immutable 4-second MPEG-TS / fMP4 chunks)',
        indexingRationale: 'Predictable naming paths allow CDN edge servers to cache chunks with permanent immutable cache headers (Cache-Control: public, max-age=31536000).',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Video Streaming Protocol: HLS (HTTP Live Streaming) vs RTMP / WebSockets',
        chosenApproach: 'HLS / MPEG-DASH chunked over standard HTTP/2 & HTTP/3',
        rejectedAlternative: 'Stateful RTMP or raw WebSockets streaming',
        rationale: 'HLS runs over standard HTTP, allowing global CDNs (Cloudflare, Fastly) to cache video chunks at the edge without expensive stateful streaming servers.',
      },
      {
        decision: 'Transcoding Architecture: Monolithic Sequential Transcoding vs Chunked DAG',
        chosenApproach: 'Chunk-based parallel transcoding (DAG orchestration)',
        rejectedAlternative: 'Transcoding the entire 60-minute file sequentially on one machine',
        rationale: 'Sequential transcoding takes 45+ minutes. Splitting the raw file into 1-minute blocks allows 60 parallel worker pods to finish transcoding in under 2 minutes.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Viral Video Release (Millions of simultaneous requests for segment_001.ts)',
        impact: 'Risk of Origin Shield collapse (Thundering Herd).',
        detectionMechanism: 'Origin server request rate spike and 504 Gateway Timeouts.',
        automatedRecovery: 'Request Collapsing at CDN Edge: When 5,000 requests arrive simultaneously for an uncached chunk, only 1 request is forwarded to the origin while 4,999 wait on the local edge socket.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Daily Video Upload Ingestion', assumption: '500 hours of video uploaded every minute; average bitrate 10 Mbps', calculation: '500 * 60 min * 60s * (10 Mbps / 8) ≈ 2.25 TB/minute (3.2 Petabytes/day raw)', finalRequirement: 'Direct-to-S3 multipart upload bypasses API gateway bottlenecks.' },
      { metric: 'Streaming Egress Bandwidth', assumption: '1 billion hours watched/day at average 3 Mbps', calculation: '1B * 3600s * 3 Mbps = 10.8 Exabits/day ≈ 125 Terabits/sec egress', finalRequirement: '99% of bandwidth must be served from CDN edge caches.' },
    ],
  },

  'google-drive': {
    systemId: 'google-drive',
    executiveArchitectureSummary:
      'A cloud file storage and cross-device synchronization engine supporting petabyte scale, utilizing Content-Defined Chunking (FastCDC), SHA-256 block deduplication, local Merkle tree directory diffing, and delta synchronization.',
    problemStatementAndWhyHard:
      'Uploading entire multi-gigabyte files whenever a user edits a few lines of text exhausts network bandwidth. Fixed-size chunking (e.g. 4MB blocks) breaks if a user inserts a single byte at the beginning of a file, shifting all boundary offsets. Google Drive uses rolling hash content-defined chunking to sync only modified blocks.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Desktop Sync Client', action: 'Queries Metadata Service for latest file version: GET /api/v1/files/{fileId}/revisions.', latencyEstimate: '18ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Block Manifest Comparison', action: 'Client compares local block SHA-256 hashes against remote block manifest (Merkle Tree diff).', latencyEstimate: '2.5ms', protocol: 'Local CPU Merkle Diff' },
      { stepNumber: 3, component: 'Parallel Chunk Fetch', action: 'Downloads only missing SHA-256 chunks via parallel S3 presigned URLs.', latencyEstimate: '65ms', protocol: 'HTTPS S3 GET' },
      { stepNumber: 4, component: 'Local File Reassembly', action: 'Reconstructs file on local filesystem from downloaded block cache.', latencyEstimate: '8.0ms', protocol: 'Local File I/O' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Local File Watcher (inotify)', action: 'Detects file modification on user\'s computer.', latencyEstimate: '0.1ms', protocol: 'OS Kernel inotify' },
      { stepNumber: 2, component: 'FastCDC Rolling Chunking', action: 'Scans file with Rabin rolling hash; cuts chunks at variable content-defined boundaries (avg 4MB).', latencyEstimate: '25ms', protocol: 'Local CPU FastCDC' },
      { stepNumber: 3, component: 'Block Deduplication Query', action: 'Computes SHA-256 hash for each chunk; sends hash list to server: POST /api/v1/blocks/exists.', latencyEstimate: '12ms', protocol: 'HTTPS' },
      { stepNumber: 4, component: 'Upload Missing Blocks Only', action: 'If block SHA-256 already exists in global storage: skip upload! Only upload genuinely new blocks to S3.', latencyEstimate: '45ms', protocol: 'HTTPS PUT to S3' },
      { stepNumber: 5, component: 'Commit File Version', action: 'Server commits new file revision with block pointers; broadcasts update to other devices via WebSockets.', latencyEstimate: '8.5ms', protocol: 'SQL Commit + WebSockets' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Relational Database (PostgreSQL / CockroachDB)',
        entity: 'files & file_blocks',
        primaryKey: 'PRIMARY KEY (file_id, block_order)',
        partitionKey: 'user_id',
        schemaDefinition: 'CREATE TABLE file_blocks (file_id UUID, version INT, block_order INT, block_hash VARCHAR(64) NOT NULL, block_size INT NOT NULL, PRIMARY KEY (file_id, version, block_order));',
        indexingRationale: 'Maps a file version to an ordered list of immutable SHA-256 block hashes, enabling instant deduplication across multiple users sharing identical files.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Chunking Strategy: Fixed-Size (4MB) vs Content-Defined Chunking (FastCDC)',
        chosenApproach: 'FastCDC (Content-Defined Chunking using rolling Rabin hash)',
        rejectedAlternative: 'Fixed 4MB block chunking',
        rationale: 'Inserting 1 byte at the top of a file invalidates every single 4MB chunk under fixed-size chunking. FastCDC detects boundaries based on byte content patterns, invalidating only 1 block.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Simultaneous Concurrent Edits on Two Devices (Offline Conflict)',
        impact: 'Two devices upload conflicting block manifests for the same file version.',
        detectionMechanism: 'Optimistic Concurrency Control (OCC) version check failure on SQL commit.',
        automatedRecovery: 'Fork and Preserve: Server commits the first device\'s edit as version N+1; creates a "Conflicted Copy (Bob\'s MacBook)" for the second device to prevent data loss.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Deduplication Storage Savings', assumption: '1 billion users storing common files (OS installers, shared PDFs)', calculation: 'SHA-256 global deduplication eliminates ~40% of duplicate raw storage', finalRequirement: 'Saves hundreds of petabytes in global object storage costs.' },
      { metric: 'Metadata Growth', assumption: '100 billion files, average 10 chunks per file', calculation: '1 trillion block rows * 100 bytes = 100 Terabytes database metadata', finalRequirement: 'Partitioned across CockroachDB cluster by user_id.' },
    ],
  },

  'object-storage': {
    systemId: 'object-storage',
    executiveArchitectureSummary:
      'An exabyte-scale distributed object storage engine modeled on Amazon S3 and Ceph, delivering 99.999999999% (11 nines) durability using Reed-Solomon Erasure Coding (8+4 or 16+4), deterministic CRUSH topology mapping, and SIMD Galois field vector instructions.',
    problemStatementAndWhyHard:
      'Storing petabytes using standard 3x replication triples hardware costs (300% storage overhead). Scaling central metadata directories to billions of objects causes database locks and master bottleneck failures. Object storage replaces replication with erasure coding and replaces directory lookups with deterministic algorithmic hashing.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Client S3 SDK', action: 'Issues HTTP GET /my-bucket/dataset.tar.gz. Edge reverse proxy authenticates AWS Signature v4.', latencyEstimate: '1.5ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Metadata Storage Tier', action: 'Queries CockroachDB metadata index for bucket and key; retrieves chunk manifest and node locations.', latencyEstimate: '3.2ms', protocol: 'Internal SQL / gRPC' },
      { stepNumber: 3, component: 'Parallel Storage Node Read', action: 'Storage Gateway connects in parallel to the first 8 data shard nodes (in 8+4 scheme).', latencyEstimate: '8.5ms', protocol: 'Direct TCP' },
      { stepNumber: 4, component: 'Erasure Code Reconstruction (if needed)', action: 'If all 8 data shards respond: streams bytes immediately. If 1-4 nodes fail: reads parity shards and reconstructs missing bytes via Galois field math.', latencyEstimate: '2.1ms', protocol: 'AVX-512 SIMD' },
      { stepNumber: 5, component: 'HTTP Chunked Stream to Client', action: 'Streams object bytes directly to client with ETag validation.', latencyEstimate: '20ms', protocol: 'HTTP/1.1 Chunked Transfer' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Client S3 SDK', action: 'Issues HTTP PUT /my-bucket/dataset.tar.gz with 100MB body.', latencyEstimate: '2.0ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Storage Gateway Buffer', action: 'Ingests stream into 16MB memory buffer.', latencyEstimate: '8.0ms', protocol: 'In-Memory Buffer' },
      { stepNumber: 3, component: 'Reed-Solomon Erasure Coding', action: 'Splits 16MB chunk into 8 data shards (2MB each) and generates 4 parity shards (2MB each) using SIMD CPU instructions.', latencyEstimate: '1.2ms', protocol: 'AVX-512 Galois Field' },
      { stepNumber: 4, component: 'CRUSH Placement & Shard Dispatch', action: 'Calculates target storage node IDs across 12 distinct failure domains (separate server racks and power supplies); writes shards concurrently.', latencyEstimate: '25ms', protocol: 'Parallel TCP Writes' },
      { stepNumber: 5, component: 'Commit Metadata & Return 200 OK', action: 'Commits object metadata to database; returns HTTP 200 with MD5/SHA256 ETag.', latencyEstimate: '4.5ms', protocol: 'HTTPS 200 OK' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Distributed Metadata DB (CockroachDB / FoundationDB)',
        entity: 'objects',
        primaryKey: 'PRIMARY KEY (bucket_id, object_key)',
        partitionKey: 'bucket_id',
        schemaDefinition: 'CREATE TABLE objects (bucket_id UUID, object_key VARCHAR(1024), size_bytes BIGINT, etag VARCHAR(64), chunk_manifest JSONB, created_at TIMESTAMPTZ, PRIMARY KEY (bucket_id, object_key));',
        indexingRationale: 'B+Tree ordered primary key supports high-speed prefix range scans (e.g. ListObjectsV2 where prefix = "photos/2026/").',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Durability Architecture: 3-Way Replication vs Reed-Solomon Erasure Coding (8+4)',
        chosenApproach: 'Reed-Solomon Erasure Coding (8 data + 4 parity shards)',
        rejectedAlternative: '3-way replication (storing 3 complete copies of every object)',
        rationale: 'Erasure coding reduces storage overhead from 300% down to 150% (50% disk cost savings) while surviving the simultaneous failure of any 4 storage drives (11 nines durability).',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Simultaneous Drive Failures on 3 Storage Nodes in Same Rack',
        impact: '3 shards out of 12 become temporarily unavailable.',
        detectionMechanism: 'Heartbeat failure alerts on storage cluster monitor.',
        automatedRecovery: 'Zero Data Loss: 8+4 erasure coding tolerates up to 4 lost shards. Background scrub workers read remaining 9 shards, reconstruct missing 3 shards, and rewrite them to healthy spare nodes.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Storage Efficiency Savings', assumption: '100 Petabytes of customer data stored', calculation: '3x replication requires 300 PB raw. 8+4 erasure coding requires 150 PB raw. 150 PB saved * $0.015/GB/mo ≈ $2.25 Million/year savings.', finalRequirement: 'Halves capital expenditure on hard drives.' },
    ],
  },

  pastebin: {
    systemId: 'pastebin',
    executiveArchitectureSummary:
      'A scalable text snippet sharing platform (modeled on Pastebin and GitHub Gist) supporting multi-megabyte code snippets, automatic expiration TTLs, syntax highlighting caching, and sub-5ms lookups using Base62 IDs, S3 object storage for text bodies, and Redis caching.',
    problemStatementAndWhyHard:
      'Storing massive raw text snippets directly inside relational database rows leads to severe table bloat, slow B+Tree index updates, and memory exhaustion. Storing text bodies in Object Storage while keeping metadata in SQL decouples read/write pipelines cleanly.',
    readPathLifecycle: [
      { stepNumber: 1, component: 'Client Web Browser', action: 'Issues HTTP GET /p/{pasteId}.', latencyEstimate: '1.2ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Edge API Gateway', action: 'Checks Redis Cluster for cached paste text: GET paste:{pasteId}.', latencyEstimate: '0.8ms', protocol: 'Redis RESP' },
      { stepNumber: 3, component: 'Object Storage Fallback (S3)', action: 'On cache miss: fetches text body from S3 bucket: GET pastes/{pasteId}.txt; hydrates Redis cache with TTL.', latencyEstimate: '18ms', protocol: 'HTTPS S3' },
      { stepNumber: 4, component: 'Render HTML / Raw Text', action: 'Returns formatted HTML with syntax highlighting or raw plain text.', latencyEstimate: '1.5ms', protocol: 'HTTP 200' },
    ],
    writePathLifecycle: [
      { stepNumber: 1, component: 'Client Web UI / CLI', action: 'Issues POST /api/v1/pastes with raw text, title, language, and expiration.', latencyEstimate: '2.5ms', protocol: 'HTTPS' },
      { stepNumber: 2, component: 'Short ID Allocation', action: 'Pulls pre-allocated 7-character Base62 token from in-memory KGS ring buffer.', latencyEstimate: '0.05ms', protocol: 'In-Process' },
      { stepNumber: 3, component: 'Object Storage Write', action: 'Uploads raw text body directly to S3: PUT pastes/{pasteId}.txt.', latencyEstimate: '22ms', protocol: 'HTTPS S3' },
      { stepNumber: 4, component: 'Metadata Commit', action: 'Inserts metadata row into PostgreSQL: paste_id, author_id, size, created_at, expires_at.', latencyEstimate: '6.0ms', protocol: 'SQL Commit' },
      { stepNumber: 5, component: 'Warm Redis Cache', action: 'Writes paste text to Redis for immediate hot read access.', latencyEstimate: '1.2ms', protocol: 'Redis SET' },
    ],
    dataStorageAndSchemaDesign: [
      {
        storageType: 'Relational Database (PostgreSQL) + Object Store (S3)',
        entity: 'pastes',
        primaryKey: 'paste_id VARCHAR(8)',
        partitionKey: 'paste_id',
        schemaDefinition: 'CREATE TABLE pastes (paste_id VARCHAR(8) PRIMARY KEY, user_id BIGINT, s3_key VARCHAR(255) NOT NULL, language VARCHAR(32), size_bytes INT, created_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ, INDEX idx_expires (expires_at));',
        indexingRationale: 'Index on expires_at allows background cleanup cron jobs to purge expired pastes efficiently.',
      },
    ],
    keyTradeoffsAndDecisions: [
      {
        decision: 'Storage Architecture: Text in Database TEXT Column vs S3 Object Storage',
        chosenApproach: 'S3 for text bodies, SQL for metadata',
        rejectedAlternative: 'Storing multi-megabyte text directly in PostgreSQL TEXT/BLOB column',
        rationale: 'Large text columns cause PostgreSQL TOAST table fragmentation and bloat backup sizes. S3 is 10x cheaper per GB and scales infinitely without DB locks.',
      },
    ],
    failureModesAndRecovery: [
      {
        failureScenario: 'Expired Paste Garbage Collection Storm',
        impact: 'Millions of pastes expiring simultaneously causing DB query spikes.',
        detectionMechanism: 'High query queue depth on DELETE queries.',
        automatedRecovery: 'Lazy Expiration: When a user reads an expired paste, the server checks expires_at > NOW(), returns 404, and queues background deletion asynchronously.',
      },
    ],
    capacityCalculationsDeepDive: [
      { metric: 'Storage Footprint (5 Years)', assumption: '10 million new pastes/month, average 10KB per paste', calculation: '10,000,000 * 10KB = 100 GB/month * 60 months = 6 Terabytes', finalRequirement: 'Easily stored on S3 at under $150/month storage cost.' },
    ],
  },
}
