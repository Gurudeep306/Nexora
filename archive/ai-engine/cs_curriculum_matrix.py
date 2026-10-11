"""
Nexora Complete Computer Science Curriculum Matrix
The complete taxonomy across all CS verticals for automated dataset generation,
masterclass instruction, and high-fidelity visual state animation.
"""

CS_CURRICULUM = {
    "system_design": [
        {
            "id": "distributed_caching",
            "title": "Distributed Caching & Cache-Aside with Redis Cluster",
            "concepts": ["Cache-Aside", "Write-Through", "Cache Stampede", "Consistent Hashing", "TTL Invalidation"],
            "visual_type": "distributed_architecture"
        },
        {
            "id": "kafka_stream_log",
            "title": "Kafka Distributed Commit Log & Consumer Rebalancing",
            "concepts": ["Topic Partitions", "Log Offsets", "Consumer Groups", "Replication Factor", "Zero-Copy Disk I/O"],
            "visual_type": "distributed_architecture"
        },
        {
            "id": "raft_consensus",
            "title": "Raft Distributed Consensus: Leader Election & Log Replication",
            "concepts": ["Heartbeats", "Leader Election", "Log Term Matching", "Quorum Voting", "Split-Brain Prevention"],
            "visual_type": "distributed_architecture"
        },
        {
            "id": "lsm_vs_btree",
            "title": "Storage Engines: LSM Trees (MemTable, WAL, SSTables) vs B+ Trees",
            "concepts": ["Write-Ahead Logging", "MemTable", "SSTable Compaction", "Bloom Filters", "Write Amplification"],
            "visual_type": "storage_internals"
        },
        {
            "id": "consistent_hashing",
            "title": "Consistent Hashing with Virtual Nodes",
            "concepts": ["Hash Ring", "Virtual Nodes", "Hotspot Mitigation", "Node Add/Removal Rebalancing"],
            "visual_type": "ring_topology"
        }
    ],
    "web_dev_internals": [
        {
            "id": "browser_rendering_pipeline",
            "title": "Browser Critical Rendering Path: HTML to Pixels on Screen",
            "concepts": ["Tokenization", "DOM Construction", "CSSOM Tree", "Layout Calculation", "Paint", "GPU Compositing"],
            "visual_type": "pipeline"
        },
        {
            "id": "v8_event_loop",
            "title": "JavaScript Event Loop, Call Stack & Microtask Queues",
            "concepts": ["Call Stack", "Web APIs", "Microtask Queue (Promises)", "Macrotask Queue (setTimeout)", "Event Loop Tick"],
            "visual_type": "runtime_loop"
        },
        {
            "id": "react_fiber_reconciliation",
            "title": "React Fiber Architecture & Concurrent Reconciliation",
            "concepts": ["Fiber Tree", "WorkInProgress Tree", "Render Phase", "Commit Phase", "Time Slicing"],
            "visual_type": "tree_reconciliation"
        }
    ],
    "app_dev_internals": [
        {
            "id": "android_rendering_vsync",
            "title": "Android Choreographer, VSYNC & SurfaceFlinger 120Hz Pipeline",
            "concepts": ["Choreographer", "Triple Buffering", "SurfaceFlinger", "Jank Analysis", "Frame Dropping"],
            "visual_type": "buffer_pipeline"
        },
        {
            "id": "react_native_jsi_fabric",
            "title": "React Native JSI & Fabric Architecture (Bridgeless Runtime)",
            "concepts": ["C++ TurboModules", "Direct Memory Sharing", "Fabric Shadow Tree", "Synchronous UI Layout"],
            "visual_type": "bridge_architecture"
        }
    ],
    "ai_machine_learning": [
        {
            "id": "transformer_self_attention",
            "title": "Transformer Scaled Dot-Product Attention (Q, K, V Matrices)",
            "concepts": ["Embedding Vectors", "Query/Key Dot Product", "Scaling Factor", "Softmax Weights", "Value Aggregation"],
            "visual_type": "matrix_flow"
        },
        {
            "id": "backpropagation_computation_graph",
            "title": "Reverse-Mode Automatic Differentiation & Backpropagation",
            "concepts": ["Computational Graph", "Forward Activation", "Chain Rule", "Loss Gradient Flow", "Weight Updates"],
            "visual_type": "directed_graph"
        },
        {
            "id": "kv_cache_decoding",
            "title": "LLM Inference: KV-Caching and Autoregressive Decoding",
            "concepts": ["Prefill Stage", "Token Generation Stage", "KV-Cache Memory Footprint", "Attention Masking"],
            "visual_type": "cache_tensor"
        }
    ],
    "operating_systems": [
        {
            "id": "virtual_memory_paging",
            "title": "Multi-Level Paging, TLB Translation & Page Fault Handling",
            "concepts": ["CR3 Register", "PML4", "Page Directory", "TLB Hit/Miss", "Disk Page Swap"],
            "visual_type": "address_translation"
        },
        {
            "id": "cpu_pipelining_hazards",
            "title": "5-Stage CPU Pipeline: Data, Structural & Control Hazards",
            "concepts": ["IF/ID/EX/MEM/WB", "Data Forwarding", "Pipeline Stalls (Bubbles)", "Branch Prediction"],
            "visual_type": "pipeline"
        }
    ],
    "computer_networks": [
        {
            "id": "tcp_flow_congestion_control",
            "title": "TCP Congestion Control: Slow Start, Congestion Avoidance, Fast Retransmit",
            "concepts": ["Congestion Window (cwnd)", "Slow Start Threshold (ssthresh)", "Triple Duplicate ACK", "Packet Drops"],
            "visual_type": "sliding_window"
        },
        {
            "id": "quic_vs_tcp_handshake",
            "title": "HTTP/3 QUIC 0-RTT Connection Migration vs TCP+TLS 1.3",
            "concepts": ["UDP Transport", "Connection IDs", "HOL Blocking Elimination", "Zero Round-Trip Time"],
            "visual_type": "packet_exchange"
        }
    ],
    "gate_cse_theory": [
        {
            "id": "turing_decidability_rices_theorem",
            "title": "Turing Undecidability, Halting Problem & Rice's Theorem",
            "concepts": ["Language Hierarchy", "Reductions", "Semantic Properties", "Non-trivial Properties", "Post Correspondence"],
            "visual_type": "automata_hierarchy"
        },
        {
            "id": "b_plus_tree_indexing",
            "title": "B+ Tree Indexing: Node Splitting, Merging & Block Transfers",
            "concepts": ["Order of B+ Tree", "Leaf Linked List", "Fanout", "Disk Block I/O Optimization", "Root Splitting"],
            "visual_type": "tree_split"
        }
    ]
}
