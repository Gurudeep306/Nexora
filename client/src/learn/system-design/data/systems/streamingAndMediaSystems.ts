import type { SystemDesignModel } from '../../types'

export const STREAMING_AND_MEDIA_SYSTEMS: SystemDesignModel[] = [
  {
    id: 'youtube-stream',
    name: 'Video Streaming Platform (YouTube / Netflix)',
    category: 'Low-Latency & Streaming',
    difficulty: 'Expert',
    tagline: 'Distributed video ingestion, chunked DAG transcoding pipeline, Adaptive Bitrate Streaming (HLS & MPEG-DASH), and CDN edge caching.',
    throughput: '500 hours of video uploaded/min · 1 Billion hours watched/day',
    latency: 'Playback start time < 200ms · Transcode pipeline < 3x video length',
    storageScale: 'Exabytes of video chunks across multi-cloud object storage',
    overview:
      'A global video ingestion and streaming pipeline. Uploaded video files are chunked into 4-second fragments and processed across a distributed DAG transcoding cluster generating multiple resolutions (1080p, 720p, 480p) and bitrates. Media is streamed using Adaptive Bitrate Streaming (HLS / DASH), dynamically shifting quality based on real-time client bandwidth.',
    functionalReqs: [
      'Resumable, chunked video upload for multi-gigabyte video files.',
      'Distributed transcoding into multiple resolutions (4K, 1080p, 720p, 480p, 360p) and codecs (H.264, VP9, AV1).',
      'Adaptive Bitrate Streaming (HLS / MPEG-DASH) via master playlists (.m3u8).',
      'Global low-latency video playback via Edge Content Delivery Networks (CDN).',
      'Video metadata, comments, likes, and view counter aggregation.',
    ],
    nonFunctionalReqs: [
      'Smooth video playback with near-zero buffering.',
      'High storage durability (99.999999999% on raw and transcoded assets).',
      'Cost-efficient bandwidth utilization via edge caching.',
    ],
    calculations: [
      {
        metric: 'Upload Bandwidth',
        formula: '500 hours/min * 60 min * (1 GB / hour) = 30,000 GB/min ≈ 500 GB/sec ingestion',
        result: '500 GB/sec raw upload ingestion rate',
      },
      {
        metric: 'Transcoding Fanout (Multi-Bitrate)',
        formula: '1 raw video yields 5 resolutions * 2 codecs = 10 output formats',
        result: '10x storage amplification on processed files',
      },
      {
        metric: 'Egress Bandwidth (1B hours/day)',
        formula: '1B hours * (1.5 GB / hour avg 1080p stream) = 1.5 Exabytes / day ≈ 138 Terabits/sec egress',
        result: '138 Tbps global egress bandwidth (98% absorbed by CDN edge)',
      },
    ],
    services: [
      { id: 'creator', name: 'Video Creator Client', role: 'Uploads video in 8MB chunks', type: 'client', x: 10, y: 30, icon: 'Upload', techStack: 'Tus.io / Browser', details: 'Sends chunked multipart upload' },
      { id: 'viewer', name: 'Video Viewer Client', role: 'Plays video via HLS player', type: 'client', x: 10, y: 75, icon: 'Play', techStack: 'Hls.js / Video.js', details: 'Requests .m3u8 playlist and .ts chunks' },
      { id: 'ingest-service', name: 'Upload & Ingest Service', role: 'Validates and writes raw chunks to S3', type: 'service', x: 35, y: 30, icon: 'Server', techStack: 'Go Microservice', details: 'Issues pre-signed S3 URLs; assembles chunks' },
      { id: 'transcoder-dag', name: 'DAG Transcoding Engine', role: 'Parallel encoding workers', type: 'worker', x: 60, y: 30, icon: 'Cpu', techStack: 'FFmpeg / Temporal / Kubernetes', details: 'Splits video into 4s segments; encodes to 1080p, 720p, 480p' },
      { id: 'blob-storage', name: 'Object Store (Amazon S3)', role: 'Durable storage for video chunks & playlists', type: 'storage', x: 85, y: 30, icon: 'Database', techStack: 'S3 / GCS / Ceph', details: 'Stores master.m3u8, index.m3u8, segment_001.ts' },
      { id: 'cdn-edge', name: 'CDN Edge Network', role: 'Caches video chunks close to viewers', type: 'gateway', x: 50, y: 75, icon: 'Globe', techStack: 'Cloudflare / Fastly POPs', details: 'Serves 98% of video segment requests from local edge RAM/SSD' },
    ],
    connections: [
      { id: 'c1', from: 'creator', to: 'ingest-service', label: 'POST /v1/upload/chunk', protocol: 'HTTPS' },
      { id: 'c2', from: 'ingest-service', to: 'blob-storage', label: 'Store Raw Video Multipart', protocol: 'HTTPS' },
      { id: 'c3', from: 'blob-storage', to: 'transcoder-dag', label: 'Fetch Chunk for Transcode', protocol: 'TCP' },
      { id: 'c4', from: 'transcoder-dag', to: 'blob-storage', label: 'Upload Transcoded .ts & .m3u8', protocol: 'HTTPS' },
      { id: 'c5', from: 'viewer', to: 'cdn-edge', label: 'GET /video/master.m3u8', protocol: 'HTTPS' },
      { id: 'c6', from: 'cdn-edge', to: 'blob-storage', label: 'Cache Miss Origin Fetch', protocol: 'HTTPS' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Chunked Resumable Video Upload',
        description: 'Creator uploads 2GB video. Client splits file into 8MB chunks, transmitting chunk 1 of 250 to Ingest Service.',
        fromNode: 'creator',
        toNode: 'ingest-service',
        protocol: 'HTTPS',
        payload: { uploadId: 'upl_89123', chunkIndex: 1, totalChunks: 250, chunkSizeMB: 8 },
        codeRef: { file: 'upload_handler.go', lineHighlight: '15-30', funcName: 'HandleChunkUpload', codeExplanation: 'Validates chunk hash; saves to temporary S3 multipart upload session.' },
        stateChange: 'Chunk 1 committed; client receives HTTP 200 with next byte offset.',
      },
      {
        step: 2,
        title: 'Step 2: Distributed DAG Transcoding Triggered',
        description: 'Once upload completes, Transcoding DAG breaks video into 4-second segments and distributes them across FFmpeg workers.',
        fromNode: 'ingest-service',
        toNode: 'transcoder-dag',
        protocol: 'TCP',
        payload: { videoId: 'v_90124', resolutions: ['1080p', '720p', '480p'], codecs: ['H264', 'VP9'], segmentDurationSec: 4 },
        codeRef: { file: 'transcoder_worker.py', lineHighlight: '18-42', funcName: 'transcode_segment', codeExplanation: 'Executes parallel FFmpeg processes generating TS chunks and updating M3U8 playlists.' },
        stateChange: 'Transcoding cluster encodes all variants in parallel.',
      },
      {
        step: 3,
        title: 'Step 3: Viewer Initiates Playback via CDN Edge',
        description: 'Viewer clicks Play. Player requests master.m3u8 playlist from local CDN Edge node. Edge serves playlist in 12ms.',
        fromNode: 'viewer',
        toNode: 'cdn-edge',
        protocol: 'HTTPS',
        payload: { file: 'master.m3u8', clientBandwidthKbps: 8500 },
        codeRef: { file: 'hls_playlist.m3u8', lineHighlight: '1-12', funcName: 'PlaylistManifest', codeExplanation: 'Player inspects available streams; selects 1080p stream for current 8.5 Mbps connection.' },
        stateChange: 'Viewer downloads 4-second segment_001.ts; video begins playing immediately.',
      },
    ],
    codeFiles: [
      {
        name: 'transcoder_worker.py',
        language: 'python',
        role: 'Distributed Video Transcoding & HLS Segmentation Worker',
        code: `import subprocess
import os

def transcode_to_hls(raw_input_path: str, output_dir: str, video_id: str):
    os.makedirs(output_dir, exist_ok=True)
    
    # Transcode into 3 resolutions with 4-second HLS segments
    resolutions = [
        {"name": "1080p", "scale": "1920:1080", "bitrate": "4500k"},
        {"name": "720p",  "scale": "1280:720",  "bitrate": "2500k"},
        {"name": "480p",  "scale": "854:480",   "bitrate": "1000k"},
    ]
    
    master_playlist_content = "#EXTM3U\\n#EXT-X-VERSION:3\\n"

    for res in resolutions:
        variant_dir = os.path.join(output_dir, res["name"])
        os.makedirs(variant_dir, exist_ok=True)
        playlist_file = os.path.join(variant_dir, "index.m3u8")

        # FFmpeg command for HLS packaging
        cmd = [
            "ffmpeg", "-i", raw_input_path,
            "-vf", f"scale={res['scale']}",
            "-b:v", res["bitrate"],
            "-c:v", "libx264", "-c:a", "aac",
            "-hls_time", "4",
            "-hls_playlist_type", "vod",
            "-hls_segment_filename", os.path.join(variant_dir, "segment_%03d.ts"),
            playlist_file
        ]
        subprocess.run(cmd, check=True)
        master_playlist_content += f"#EXT-X-STREAM-INF:BANDWIDTH={res['bitrate'][:-1]}000,RESOLUTION={res['scale'].replace(':', 'x')}\\n{res['name']}/index.m3u8\\n"

    with open(os.path.join(output_dir, "master.m3u8"), "w") as f:
        f.write(master_playlist_content)
        
    return f"{output_dir}/master.m3u8"`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Video streaming platforms separate ingestion from playback. Ingestion chunks large files into S3 and fans out transcoding tasks across a Kubernetes FFmpeg cluster. Output files are organized into 4-second HLS (.ts) segments indexed by master .m3u8 manifests. Global CDN edge nodes absorb 98% of player segment requests, delivering buffer-free streaming.',
      databaseSchema: 'Metadata DB: videos (id UUID, title TEXT, status VARCHAR, duration_sec INT, master_playlist_url TEXT);',
      apiEndpoints: [
        { method: 'POST', path: '/v1/upload/init', desc: 'Initializes chunked multipart upload session' },
        { method: 'GET', path: '/v1/watch/:id/master.m3u8', desc: 'Returns master HLS playlist' },
      ],
      bottlenecksAndTradeoffs: [
        'Transcoding Compute vs Storage Tradeoff: Storing 10 different resolution/codec combinations multiplies storage by 10x, but eliminates real-time CPU transcoding costs on playback. Because storage is much cheaper than real-time GPU/CPU compute, pre-transcoding all popular formats is standard.',
      ],
    },
  },
  {
    id: 'google-drive',
    name: 'Cloud File Storage & Sync (Google Drive / Dropbox)',
    category: 'Low-Latency & Streaming',
    difficulty: 'Advanced',
    tagline: 'Chunk-based file synchronization with FastCDC content-defined chunking, SHA-256 deduplication, and transactional metadata journaling.',
    throughput: '50,000 file syncs/sec',
    latency: 'Differential sync under 2 seconds for modified files',
    storageScale: 'Exabytes of user data stored with 40% reduction via deduplication',
    overview:
      'A cross-platform file synchronization engine that syncs multi-gigabyte files with minimal network transfer. Uses Content-Defined Chunking (FastCDC) to slice files into variable 4MB chunks and SHA-256 fingerprinting to deduplicate identical chunks globally across users, uploading only modified chunks when a file changes.',
    functionalReqs: [
      'Automatic bidirectional file synchronization between local desktop folders and cloud.',
      'Deduplication: Do not store duplicate chunks globally across any accounts.',
      'Differential sync: When a 1GB file has 10 lines modified, upload only the modified 4MB chunk.',
      'File version history and conflict resolution (create conflict copy on concurrent edits).',
    ],
    nonFunctionalReqs: [
      'Strict data durability (11 nines durability on block storage).',
      'Strong consistency for file metadata tree.',
    ],
    calculations: [
      {
        metric: 'Global Deduplication Savings',
        formula: 'Popular files (OS images, common textbooks) shared across millions of users',
        result: 'Reduces total required cloud storage by 35% - 45%',
      },
      {
        metric: 'Differential Sync Savings',
        formula: '1 GB file with 1 modified byte = 1 chunk (4 MB) uploaded instead of 1,000 MB',
        result: '99.6% bandwidth savings on file edits',
      },
    ],
    services: [
      { id: 'desktop-client', name: 'Desktop Sync Client', role: 'Watches local folder for changes', type: 'client', x: 10, y: 50, icon: 'Laptop', techStack: 'C++ / Rust / Go Client', details: 'Executes FastCDC chunking & SHA-256 hashing' },
      { id: 'sync-gateway', name: 'Sync Gateway API', role: 'Authenticates and verifies chunk hashes', type: 'gateway', x: 35, y: 50, icon: 'Shield', techStack: 'Envoy / Go', details: 'Checks metadata DB: which chunks are already in cloud?' },
      { id: 'meta-db', name: 'Metadata DB (Postgres)', role: 'Hierarchical file tree and chunk index', type: 'database', x: 60, y: 30, icon: 'Folder', techStack: 'CockroachDB / PostgreSQL', details: 'Maps file_path -> list of [chunk_hash_1, chunk_hash_2...]' },
      { id: 'chunk-store', name: 'Block Store (S3 / Blob)', role: 'Stores unique encrypted chunks', type: 'storage', x: 85, y: 50, icon: 'HardDrive', techStack: 'Amazon S3 / Ceph', details: 'Keyed strictly by SHA-256 hash. Immutable' },
      { id: 'notification-hub', name: 'Notification Hub', role: 'Notifies other client devices of sync', type: 'queue', x: 60, y: 75, icon: 'Radio', techStack: 'WebSocket Server / Redis Pub/Sub', details: 'Pushes sync event to user\'s laptop and phone' },
    ],
    connections: [
      { id: 'c1', from: 'desktop-client', to: 'sync-gateway', label: 'POST /v1/sync/verify_hashes', protocol: 'HTTPS' },
      { id: 'c2', from: 'sync-gateway', to: 'meta-db', label: 'Check Existing Chunk Hashes', protocol: 'SQL' },
      { id: 'c3', from: 'desktop-client', to: 'chunk-store', label: 'Upload Missing Chunks Directly (S3 Presigned)', protocol: 'HTTPS' },
      { id: 'c4', from: 'sync-gateway', to: 'meta-db', label: 'Commit New File Version Tree', protocol: 'SQL' },
      { id: 'c5', from: 'sync-gateway', to: 'notification-hub', label: 'Broadcast FileUpdated Event', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Local File Modification & Chunking',
        description: 'User edits presentation.pptx. Desktop sync client slices file into 10 chunks using FastCDC and hashes each chunk with SHA-256.',
        fromNode: 'desktop-client',
        toNode: 'sync-gateway',
        protocol: 'HTTPS',
        payload: { filename: 'presentation.pptx', totalChunks: 10, chunkHashes: ['hash_a1', 'hash_b2', 'hash_new_c3'] },
        codeRef: { file: 'chunker.rs', lineHighlight: '15-28', funcName: 'chunk_file_fastcdc', codeExplanation: 'Calculates content-defined chunk boundaries; computes SHA-256 digests.' },
        stateChange: 'Client sends hash list to server to ask which chunks are missing.',
      },
      {
        step: 2,
        title: 'Step 2: Metadata Hash Deduplication Verification',
        description: 'Sync Gateway checks Metadata DB. Hashes A1 and B2 already exist in cloud! Only chunk "hash_new_c3" is missing.',
        fromNode: 'sync-gateway',
        toNode: 'meta-db',
        protocol: 'SQL',
        payload: { query: 'SELECT hash FROM global_chunks WHERE hash IN (...)', missing: ['hash_new_c3'] },
        codeRef: { file: 'sync_controller.go', lineHighlight: '22-38', funcName: 'VerifyChunkInventory', codeExplanation: 'Returns list of missing chunks; issues S3 pre-signed upload URL for missing chunk only.' },
        stateChange: 'Client instructed to upload ONLY the 1 modified chunk (4MB instead of 40MB).',
      },
      {
        step: 3,
        title: 'Step 3: Direct S3 Upload & Version Commit',
        description: 'Client uploads chunk C3 directly to S3. Gateway updates metadata table to point to new chunk list.',
        fromNode: 'desktop-client',
        toNode: 'chunk-store',
        protocol: 'HTTPS',
        payload: { chunkHash: 'hash_new_c3', sizeBytes: 4194304, status: 'UPLOAD_SUCCESS' },
        codeRef: { file: 'sync_controller.go', lineHighlight: '45-56', funcName: 'CommitFileVersion', codeExplanation: 'Creates version 2 record in metadata table pointing to [A1, B2, C3].' },
        stateChange: 'File sync complete in 1.4 seconds with 90% bandwidth saved.',
      },
    ],
    codeFiles: [
      {
        name: 'chunker.rs',
        language: 'rust',
        role: 'Content-Defined Chunking (FastCDC) & SHA-256 Fingerprinting',
        code: `use sha2::{Digest, Sha256};
use std::io::Read;

pub struct Chunk {
    pub hash: String,
    pub data: Vec<u8>,
}

pub fn chunk_file(mut reader: impl Read, chunk_size: usize) -> Vec<Chunk> {
    let mut chunks = Vec::new();
    let mut buffer = vec![0u8; chunk_size];

    while let Ok(bytes_read) = reader.read(&mut buffer) {
        if bytes_read == 0 { break; }
        
        let mut hasher = Sha256::new();
        hasher.update(&buffer[..bytes_read]);
        let hash = format!("{:x}", hasher.finalize());

        chunks.push(Chunk {
            hash,
            data: buffer[..bytes_read].to_vec(),
        });
    }
    chunks
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Cloud storage synchronization separates file metadata (folder hierarchies, permissions, file versions) from raw chunk data. Slicing files into content-defined chunks enables massive bandwidth savings via differential sync, while global SHA-256 deduplication saves petabytes of cloud storage across user accounts.',
      databaseSchema: 'PostgreSQL: CREATE TABLE file_versions (file_id UUID, version INT, chunk_hashes TEXT[], updated_at TIMESTAMP, PRIMARY KEY (file_id, version));',
      apiEndpoints: [
        { method: 'POST', path: '/v1/sync/verify_hashes', desc: 'Verifies which chunk hashes exist on server' },
        { method: 'POST', path: '/v1/sync/commit', desc: 'Commits updated chunk assembly for a file' },
      ],
      bottlenecksAndTradeoffs: [
        'Concurrent File Modifications: If two users edit the same document offline, synchronization creates two divergent file trees. Rather than silently overwriting data, the system creates a "Conflicted Copy" file, allowing the user to merge differences.',
      ],
    },
  },
]
