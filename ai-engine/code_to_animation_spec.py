"""
Nexora Universal Code-to-Animation Specification
Defines how raw code in C++, Python, Java, and JavaScript maps into
high-fidelity 3D kinetic state machines across all data structures in the world.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class KineticCell(BaseModel):
    id: str  # Persistent ID (e.g., 'c0', 'node-4', 'head')
    value: Any
    role: str = "idle"  # 'idle', 'active', 'swap', 'done', 'compare', 'pivot', 'evict'
    elevation_y: float = 0.0  # -38px for 3D parabolic hop
    scale: float = 1.0  # 1.18 for active elevation

class CodeFrame(BaseModel):
    frame_index: int
    active_code_line: int  # Line number in the student's code that triggered this state
    explanation: str  # Pedagogy describing exactly what the code line computed
    data_structure: str  # 'array', 'tree', 'heap', 'graph', 'linked_list', 'stack', 'grid', 'trie', 'hash_map'
    cells: List[KineticCell]
    pointers: Dict[str, Any]  # e.g., {'left': 0, 'right': 4, 'curr': 'c2'}
    sound_cue: Optional[str] = "step"  # 'step', 'swap', 'compare', 'done', 'alert'

class UniversalCodeAnimation(BaseModel):
    title: str
    language: str  # 'cpp', 'python', 'java', 'javascript'
    source_code: str
    detected_data_structure: str
    total_frames: int
    frames: List[CodeFrame]
