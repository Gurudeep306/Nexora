"""
Nexora Omni-Visual DSL Specification
A universal declarative schema for rendering interactive, high-fidelity animations
across EVERY Computer Science domain:
1. System Design & Distributed Systems (Load Balancers, Kafka, Redis, Sharded DBs, Raft)
2. Web & Browser Engines (Event Loop, Call Stack, Microtasks, DOM/CSSOM/Layout/Paint)
3. App Dev & Mobile Runtimes (Thread Pools, Native Bridges, State Management)
4. AI / Machine Learning (Transformer Attention QKV, Backpropagation, CNN Convolutions)
5. Operating Systems (Virtual Memory Page Tables, TLB, CPU Pipelining, Thread Scheduling)
6. Computer Networks (TCP Handshakes, Sliding Windows, BGP Routing, OSI Stack)
7. Algorithms & Data Structures (Trees, Graphs, DP Tables, Arrays)
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class VisualNode(BaseModel):
    id: str
    label: str
    category: str  # e.g., 'client', 'load_balancer', 'microservice', 'cache', 'database', 'tensor', 'memory_page'
    status: Optional[str] = "idle"  # 'active', 'processing', 'failed', 'cached', 'highlight'
    metrics: Optional[Dict[str, Any]] = None  # e.g., {'qps': 14000, 'latency_ms': 4.2}
    x: Optional[float] = None
    y: Optional[float] = None

class VisualEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    protocol: Optional[str] = "HTTP/2"  # 'gRPC', 'TCP', 'WebSocket', 'SQL', 'Pulse'
    status: Optional[str] = "idle"  # 'in_transit', 'congested', 'dropped', 'acknowledged'
    payload: Optional[Dict[str, Any]] = None  # e.g., {'request_id': 'req-982', 'type': 'SYN'}

class VisualFrame(BaseModel):
    frame_index: int
    title: str
    narration: str  # Socratic, pedagogical explanation of what is physically occurring
    active_nodes: List[str] = Field(default_factory=list)
    active_edges: List[str] = Field(default_factory=list)
    state_updates: Dict[str, Any] = Field(default_factory=dict)
    event_log: Optional[List[str]] = Field(default_factory=list)

class OmniVisualization(BaseModel):
    domain: str  # 'system_design', 'web_engine', 'mobile_runtime', 'machine_learning', 'os_networks', 'dsa'
    topic: str
    architecture_overview: str
    nodes: List[VisualNode]
    edges: List[VisualEdge]
    frames: List[VisualFrame]
