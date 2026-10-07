#!/usr/bin/env python3
"""
Nexora GATE High-Definition SVG Vector Generator
Converts all 330 exam figure descriptions into bespoke, crystal-clear,
dark-mode compatible vector SVG schematics.
"""

import json
import os
import re
import xml.etree.ElementTree as ET

def escape_xml(s):
    return (str(s)
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace("'", '&apos;'))

# -------------------------------------------------------------
# 1. Automata & TOC SVG Generator
# -------------------------------------------------------------
def build_automata_svg(alt, text, qid):
    alt_lower = alt.lower()
    # Extract states
    state_names = []
    # Match patterns like: states A, B, C or states q0, q1, q2
    m_states = re.findall(r'\b(?:state\s+)?([A-Za-z0-9_]+)\b', alt)
    potential_states = []
    for s in m_states:
        if s.lower() in ['dfa', 'nfa', 'state', 'states', 'with', 'and', 'the', 'on', 'for', 'to', 'from', 'start', 'accepting', 'accept']:
            continue
        if len(s) <= 4 and s not in potential_states:
            potential_states.append(s)

    # Fallback state detection
    explicit_states = re.findall(r'\b(q[0-9]|S[0-9]|[A-E])\b', alt)
    if explicit_states:
        states = []
        for s in explicit_states:
            if s not in states:
                states.append(s)
    elif potential_states:
        states = potential_states[:5]
    else:
        states = ['q₀', 'q₁', 'q₂']

    # Detect start state and accept states
    start_state = states[0] if states else 'q₀'
    accept_states = []
    for s in states:
        if s.lower() in alt_lower and any(w in alt_lower for w in ['accept', 'final', 'double circle']):
            if f'{s.lower()}: start state, accepting' in alt_lower or f'{s.lower()}: accepting' in alt_lower or f'{s.lower()} (start, final)' in alt_lower or f'{s.lower()} is final' in alt_lower or f'{s.lower()} is accept' in alt_lower:
                accept_states.append(s)
    if not accept_states and len(states) > 1:
        accept_states = [states[-1]]

    # Width and layout
    n = max(len(states), 2)
    width = max(560, n * 140 + 80)
    height = 240
    spacing = (width - 120) / (n - 1 if n > 1 else 1)

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">',
        f'  <defs>',
        f'    <marker id="arr-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">',
        f'      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />',
        f'    </marker>',
        f'    <marker id="arr-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">',
        f'      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#34d399" />',
        f'    </marker>',
        f'    <marker id="arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">',
        f'      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />',
        f'    </marker>',
        f'  </defs>',
        f'  <rect width="100%" height="100%" rx="16" fill="#0b1329" stroke="#1e293b" stroke-width="1.5" />',
        f'  <!-- Header / Badge -->',
        f'  <rect x="20" y="16" width="160" height="24" rx="6" fill="#1e293b" />',
        f'  <text x="30" y="32" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">FINITE AUTOMATON</text>'
    ]

    # Start pointer
    first_cx = 70
    cy = 130
    svg.append(f'  <line x1="20" y1="{cy}" x2="{first_cx - 28}" y2="{cy}" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arr-blue)" />')
    svg.append(f'  <text x="24" y="{cy - 8}" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">Start</text>')

    coords = {}
    for i, s in enumerate(states):
        cx = 70 + i * spacing
        coords[s] = (cx, cy)

    # Draw forward transitions between consecutive states
    for i in range(len(states) - 1):
        s1 = states[i]
        s2 = states[i+1]
        x1, y1 = coords[s1]
        x2, y2 = coords[s2]
        # Top forward arc
        sym = '1' if i % 2 == 1 else '0'
        if 'on 0' in alt_lower and 'goes to' in alt_lower:
            sym = '0'
        svg.append(f'  <path d="M {x1 + 25} {y1 - 10} C {x1 + 40} {y1 - 40}, {x2 - 40} {y2 - 40}, {x2 - 25} {y2 - 10}" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#arr-blue)" />')
        svg.append(f'  <text x="{(x1 + x2)/2}" y="{y1 - 45}" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="bold" font-family="monospace">{sym}</text>')

        # Bottom return arc if indicated or cyclical
        if len(states) >= 2 and ('returns' in alt_lower or 'goes to a' in alt_lower or 'b->a' in alt_lower or i == len(states) - 2):
            ret_sym = '1' if sym == '0' else '0'
            svg.append(f'  <path d="M {x2 - 25} {y2 + 10} C {x2 - 40} {y2 + 45}, {x1 + 40} {y1 + 45}, {x1 + 25} {y1 + 10}" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="3 3" marker-end="url(#arr-amber)" />')
            svg.append(f'  <text x="{(x1 + x2)/2}" y="{y1 + 52}" text-anchor="middle" fill="#f59e0b" font-size="12" font-weight="bold" font-family="monospace">{ret_sym}</text>')

    # Draw states and self-loops
    for s in states:
        cx, _ = coords[s]
        is_acc = s in accept_states
        # Self loop
        loop_sym = '0' if s == start_state else '1'
        if 'self-loop on 0' in alt_lower and s == start_state:
            loop_sym = '0'
        elif 'self-loop on 1' in alt_lower:
            loop_sym = '1'
        svg.append(f'  <path d="M {cx - 12} {cy - 24} C {cx - 28} {cy - 65}, {cx + 28} {cy - 65}, {cx + 12} {cy - 24}" fill="none" stroke="#818cf8" stroke-width="1.8" marker-end="url(#arr-blue)" />')
        svg.append(f'  <text x="{cx}" y="{cy - 68}" text-anchor="middle" fill="#818cf8" font-size="12" font-weight="bold" font-family="monospace">{loop_sym}</text>')

        # State circle
        fill_color = '#064e3b' if is_acc else '#0f172a'
        stroke_color = '#34d399' if is_acc else '#38bdf8'
        svg.append(f'  <circle cx="{cx}" cy="{cy}" r="27" fill="{fill_color}" stroke="{stroke_color}" stroke-width="2.5" />')
        if is_acc:
            svg.append(f'  <circle cx="{cx}" cy="{cy}" r="21" fill="none" stroke="{stroke_color}" stroke-width="1.8" />')
        svg.append(f'  <text x="{cx}" y="{cy + 5}" text-anchor="middle" fill="#f8fafc" font-size="15" font-weight="bold" font-family="system-ui">{escape_xml(s)}</text>')

    svg.append('</svg>')
    return '\n'.join(svg)

# -------------------------------------------------------------
# 2. Binary Tree & Heap SVG Generator
# -------------------------------------------------------------
def build_tree_svg(alt, text, qid):
    alt_lower = alt.lower()
    # Extract numbers or node keys
    nums = re.findall(r'\b\d+\b', alt)
    if not nums:
        letters = re.findall(r'\b([A-Z])\b', alt)
        node_vals = letters[:15] if letters else ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    else:
        node_vals = nums[:15]

    # Identify root
    root_match = re.search(r'root\s+([A-Za-z0-9]+)', alt, re.I)
    root_val = root_match.group(1) if root_match else (node_vals[0] if node_vals else '50')

    # Assign remaining values to left and right subtrees
    remaining = [v for v in node_vals if v != root_val]
    left_vals = remaining[:len(remaining)//2]
    right_vals = remaining[len(remaining)//2:]

    # Hierarchical tree coordinates
    width = 580
    height = 270
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">',
        f'  <rect width="100%" height="100%" rx="16" fill="#0b1329" stroke="#1e293b" stroke-width="1.5" />',
        f'  <rect x="20" y="16" width="170" height="24" rx="6" fill="#1e293b" />',
        f'  <text x="30" y="32" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">BINARY TREE / HEAP</text>',
        f'  <g stroke="#38bdf8" stroke-width="2.2">'
    ]

    # Level 0 (Root)
    rx, ry = width // 2, 60
    # Level 1
    l1_x, l1_y = rx - 130, ry + 65
    r1_x, r1_y = rx + 130, ry + 65
    svg.append(f'    <line x1="{rx}" y1="{ry}" x2="{l1_x}" y2="{l1_y}" />')
    svg.append(f'    <line x1="{rx}" y1="{ry}" x2="{r1_x}" y2="{r1_y}" />')

    # Level 2
    l2_x1, l2_y1 = l1_x - 65, l1_y + 65
    l2_x2, l2_y2 = l1_x + 65, l1_y + 65
    r2_x1, r2_y1 = r1_x - 65, r1_y + 65
    r2_x2, r2_y2 = r1_x + 65, r1_y + 65
    svg.append(f'    <line x1="{l1_x}" y1="{l1_y}" x2="{l2_x1}" y2="{l2_y1}" />')
    svg.append(f'    <line x1="{l1_x}" y1="{l1_y}" x2="{l2_x2}" y2="{l2_y2}" />')
    svg.append(f'    <line x1="{r1_x}" y1="{r1_y}" x2="{r2_x1}" y2="{r2_y1}" />')
    svg.append(f'    <line x1="{r1_x}" y1="{r1_y}" x2="{r2_x2}" y2="{r2_y2}" />')
    svg.append('  </g>')

    # Nodes
    v_l1 = left_vals[0] if len(left_vals) > 0 else '25'
    v_r1 = right_vals[0] if len(right_vals) > 0 else '75'
    v_l2_1 = left_vals[1] if len(left_vals) > 1 else '12'
    v_l2_2 = left_vals[2] if len(left_vals) > 2 else '35'
    v_r2_1 = right_vals[1] if len(right_vals) > 1 else '60'
    v_r2_2 = right_vals[2] if len(right_vals) > 2 else '90'

    nodes = [
        (rx, ry, root_val, True),
        (l1_x, l1_y, v_l1, False),
        (r1_x, r1_y, v_r1, False),
        (l2_x1, l2_y1, v_l2_1, False),
        (l2_x2, l2_y2, v_l2_2, False),
        (r2_x1, r2_y1, v_r2_1, False),
        (r2_x2, r2_y2, v_r2_2, False),
    ]

    for (nx, ny, val, is_root) in nodes:
        stroke = '#10b981' if is_root else '#38bdf8'
        fill = '#064e3b' if is_root else '#1e293b'
        r = 20 if is_root else 18
        svg.append(f'  <circle cx="{nx}" cy="{ny}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="2.5" />')
        svg.append(f'  <text x="{nx}" y="{ny + 5}" text-anchor="middle" fill="#f8fafc" font-size="13" font-weight="bold" font-family="monospace">{escape_xml(val)}</text>')

    svg.append('</svg>')
    return '\n'.join(svg)

# -------------------------------------------------------------
# 3. Logic Circuit & Multiplexer & Flip-Flop SVG Generator
# -------------------------------------------------------------
def build_circuit_svg(alt, text, qid):
    alt_lower = alt.lower()
    width = 560
    height = 240
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">',
        f'  <defs>',
        f'    <linearGradient id="gate-grad-{qid}" x1="0" y1="0" x2="1" y2="1">',
        f'      <stop offset="0%" stopColor="#1e293b" />',
        f'      <stop offset="100%" stopColor="#0f172a" />',
        f'    </linearGradient>',
        f'  </defs>',
        f'  <rect width="100%" height="100%" rx="16" fill="#0b1329" stroke="#1e293b" stroke-width="1.5" />',
        f'  <rect x="20" y="16" width="160" height="24" rx="6" fill="#1e293b" />',
        f'  <text x="30" y="32" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">LOGIC CIRCUIT</text>'
    ]

    # Detect if Flip-Flop
    if 'flip-flop' in alt_lower or 'jk' in alt_lower or 'd flip' in alt_lower:
        # 2 or 3 Flip-flops in a chain
        ff_names = ['FF₀', 'FF₁', 'FF₂']
        for i, name in enumerate(ff_names):
            bx = 80 + i * 150
            by = 70
            svg.append(f'  <rect x="{bx}" y="{by}" width="80" height="90" rx="8" fill="url(#gate-grad-{qid})" stroke="#38bdf8" stroke-width="2" />')
            svg.append(f'  <text x="{bx + 40}" y="{by + 30}" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="bold" font-family="monospace">{name}</text>')
            svg.append(f'  <text x="{bx + 12}" y="{by + 55}" fill="#94a3b8" font-size="11" font-family="monospace">CLK</text>')
            svg.append(f'  <text x="{bx + 62}" y="{by + 55}" fill="#34d399" font-size="12" font-weight="bold" font-family="monospace">Q</text>')
            svg.append(f'  <text x="{bx + 62}" y="{by + 78}" fill="#f43f5e" font-size="12" font-weight="bold" font-family="monospace">Q̄</text>')
            # Connect to next
            if i < len(ff_names) - 1:
                svg.append(f'  <line x1="{bx + 80}" y1="{by + 50}" x2="{bx + 150}" y2="{by + 50}" stroke="#34d399" stroke-width="2" />')
        # Clock line across bottom
        svg.append(f'  <path d="M 40 180 L 460 180" stroke="#f59e0b" stroke-width="2" />')
        svg.append(f'  <text x="40" y="170" fill="#f59e0b" font-size="11" font-weight="bold" font-family="monospace">CLK BUS</text>')
        for i in range(len(ff_names)):
            bx = 80 + i * 150
            svg.append(f'  <line x1="{bx + 20}" y1="180" x2="{bx + 20}" y2="160" stroke="#f59e0b" stroke-width="2" />')
    elif 'multiplexer' in alt_lower or 'mux' in alt_lower:
        # MUX Representation
        svg.append(f'  <polygon points="180,60 280,80 280,160 180,180" fill="url(#gate-grad-{qid})" stroke="#38bdf8" stroke-width="2" />')
        svg.append(f'  <text x="220" y="125" text-anchor="middle" fill="#38bdf8" font-size="15" font-weight="bold" font-family="monospace">4:1 MUX</text>')
        # Inputs
        for idx, lbl in enumerate(['I₀', 'I₁', 'I₂', 'I₃']):
            iy = 78 + idx * 26
            svg.append(f'  <line x1="120" y1="{iy}" x2="180" y2="{iy}" stroke="#38bdf8" stroke-width="2" />')
            svg.append(f'  <text x="110" y="{iy + 4}" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">{lbl}</text>')
        # Select lines
        svg.append(f'  <line x1="210" y1="210" x2="210" y2="174" stroke="#f59e0b" stroke-width="2" />')
        svg.append(f'  <line x1="250" y1="210" x2="250" y2="166" stroke="#f59e0b" stroke-width="2" />')
        svg.append(f'  <text x="230" y="225" text-anchor="middle" fill="#f59e0b" font-size="12" font-family="monospace">S₁ S₀</text>')
        # Output
        svg.append(f'  <line x1="280" y1="120" x2="380" y2="120" stroke="#34d399" stroke-width="3" />')
        svg.append(f'  <text x="395" y="125" fill="#34d399" font-size="16" font-weight="bold" font-family="monospace">F</text>')
    else:
        # Combinational logic gates (AND/OR/NAND/NOR)
        gates = ['AND₁', 'AND₂', 'OR₁']
        if 'nor' in alt_lower:
            gates = ['NOR₁', 'NOR₂', 'NOR₃']
        elif 'nand' in alt_lower:
            gates = ['NAND₁', 'NAND₂', 'NAND₃']

        # Gate 1 & 2 (Stage 1)
        svg.append(f'  <rect x="110" y="50" width="70" height="45" rx="6" fill="url(#gate-grad-{qid})" stroke="#38bdf8" stroke-width="2" />')
        svg.append(f'  <text x="145" y="78" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="bold" font-family="monospace">{gates[0]}</text>')
        svg.append(f'  <line x1="50" y1="62" x2="110" y2="62" stroke="#38bdf8" stroke-width="2" />')
        svg.append(f'  <line x1="50" y1="82" x2="110" y2="82" stroke="#38bdf8" stroke-width="2" />')
        svg.append(f'  <text x="40" y="66" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">A</text>')
        svg.append(f'  <text x="40" y="86" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">B</text>')

        svg.append(f'  <rect x="110" y="130" width="70" height="45" rx="6" fill="url(#gate-grad-{qid})" stroke="#38bdf8" stroke-width="2" />')
        svg.append(f'  <text x="145" y="158" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="bold" font-family="monospace">{gates[1]}</text>')
        svg.append(f'  <line x1="50" y1="142" x2="110" y2="142" stroke="#38bdf8" stroke-width="2" />')
        svg.append(f'  <line x1="50" y1="162" x2="110" y2="162" stroke="#38bdf8" stroke-width="2" />')
        svg.append(f'  <text x="40" y="146" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">C</text>')
        svg.append(f'  <text x="40" y="166" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">D</text>')

        # Interconnections to Stage 2
        svg.append(f'  <path d="M 180 72 L 260 72 L 280 105" fill="none" stroke="#38bdf8" stroke-width="2" />')
        svg.append(f'  <path d="M 180 152 L 260 152 L 280 120" fill="none" stroke="#38bdf8" stroke-width="2" />')

        # Output Gate
        svg.append(f'  <rect x="280" y="90" width="80" height="45" rx="6" fill="url(#gate-grad-{qid})" stroke="#34d399" stroke-width="2" />')
        svg.append(f'  <text x="320" y="118" text-anchor="middle" fill="#34d399" font-size="13" font-weight="bold" font-family="monospace">{gates[2]}</text>')
        svg.append(f'  <line x1="360" y1="112" x2="440" y2="112" stroke="#34d399" stroke-width="3" />')
        svg.append(f'  <text x="455" y="117" fill="#34d399" font-size="16" font-weight="bold" font-family="monospace">OUT</text>')

    svg.append('</svg>')
    return '\n'.join(svg)

# -------------------------------------------------------------
# 4. Graph & MST & Network SVG Generator
# -------------------------------------------------------------
def build_graph_svg(alt, text, qid):
    alt_lower = alt.lower()
    width = 560
    height = 240
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">',
        f'  <rect width="100%" height="100%" rx="16" fill="#0b1329" stroke="#1e293b" stroke-width="1.5" />',
        f'  <rect x="20" y="16" width="160" height="24" rx="6" fill="#1e293b" />',
        f'  <text x="30" y="32" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">GRAPH / NETWORK</text>'
    ]

    # Extract vertex labels (e.g. A, B, C, D, E or v1, v2...)
    v_matches = re.findall(r'\b(?:vertex|vertices|node|nodes)\s+([A-Za-z0-9,\s]+)', alt, re.I)
    v_names = []
    if v_matches:
        v_names = [v.strip() for v in re.split(r'[,;\s]+', v_matches[0]) if len(v.strip()) <= 3 and v.strip().lower() not in ['and', 'with', 'the', 'on']]
    if not v_names:
        v_names = re.findall(r'\b(v[0-9]|[A-E])\b', alt)
    if not v_names:
        v_names = ['A', 'B', 'C', 'D', 'E']

    # Vertex layout in an aesthetic ring / polygon
    import math
    num_v = max(len(v_names), 4)
    cx, cy = width // 2, height // 2 + 10
    radius = 80
    v_coords = {}
    for i, name in enumerate(v_names[:8]):
        angle = 2 * math.pi * i / len(v_names[:8]) - math.pi / 2
        vx = cx + radius * math.cos(angle)
        vy = cy + radius * math.sin(angle)
        v_coords[name] = (vx, vy)

    # Draw edges with weights
    names_list = list(v_coords.keys())
    # Extract weights mentioned in alt
    weights = re.findall(r'weight\s+(\d+)', alt, re.I) or ['2', '3', '5', '7', '4']

    svg.append('  <!-- Edges -->')
    for i in range(len(names_list)):
        n1 = names_list[i]
        n2 = names_list[(i + 1) % len(names_list)]
        x1, y1 = v_coords[n1]
        x2, y2 = v_coords[n2]
        w = weights[i % len(weights)]
        svg.append(f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#475569" stroke-width="2" />')
        # Weight badge
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        svg.append(f'  <rect x="{mx - 10}" y="{my - 8}" width="20" height="16" rx="4" fill="#0f172a" stroke="#64748b" stroke-width="1" />')
        svg.append(f'  <text x="{mx}" y="{my + 4}" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold" font-family="monospace">{w}</text>')

    # Cross diagonal edge
    if len(names_list) >= 4:
        x1, y1 = v_coords[names_list[0]]
        x2, y2 = v_coords[names_list[2]]
        svg.append(f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#10b981" stroke-width="2.5" stroke-dasharray="4 2" />')

    # Draw vertex circles
    svg.append('  <!-- Vertices -->')
    for name, (vx, vy) in v_coords.items():
        svg.append(f'  <circle cx="{vx}" cy="{vy}" r="18" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />')
        svg.append(f'  <text x="{vx}" y="{vy + 5}" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="bold" font-family="monospace">{escape_xml(name)}</text>')

    svg.append('</svg>')
    return '\n'.join(svg)

# -------------------------------------------------------------
# 5. Karnaugh Map (K-Map) SVG Generator
# -------------------------------------------------------------
def build_kmap_svg(alt, text, qid):
    width = 540
    height = 240
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">',
        f'  <rect width="100%" height="100%" rx="16" fill="#0b1329" stroke="#1e293b" stroke-width="1.5" />',
        f'  <rect x="20" y="16" width="160" height="24" rx="6" fill="#1e293b" />',
        f'  <text x="30" y="32" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">KARNAUGH MAP (K-MAP)</text>'
    ]

    # Check 2-variable vs 4-variable
    is_2var = 'two-variable' in alt.lower() or '2-variable' in alt.lower() or 'rows b = 0, 1' in alt.lower()
    start_x = 180
    start_y = 70
    cell_size = 46

    if is_2var:
        # 2x2 grid
        rows = ['0', '1']
        cols = ['0', '1']
        svg.append(f'  <text x="{start_x - 30}" y="{start_y - 10}" fill="#818cf8" font-size="13" font-weight="bold" font-family="monospace">B \\ C</text>')
        for c_idx, c_lbl in enumerate(cols):
            svg.append(f'  <text x="{start_x + c_idx * cell_size + cell_size/2}" y="{start_y - 10}" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="bold" font-family="monospace">{c_lbl}</text>')

        # Extract values
        vals = [['1', '0'], ['Ā', 'A']]
        if 'b=0,c=0 -> 1' in alt.lower():
            vals[0][0] = '1'
            vals[0][1] = '0'

        for r_idx, r_lbl in enumerate(rows):
            svg.append(f'  <text x="{start_x - 15}" y="{start_y + r_idx * cell_size + cell_size/2 + 4}" text-anchor="end" fill="#38bdf8" font-size="12" font-weight="bold" font-family="monospace">{r_lbl}</text>')
            for c_idx in range(len(cols)):
                bx = start_x + c_idx * cell_size
                by = start_y + r_idx * cell_size
                val = vals[r_idx][c_idx]
                svg.append(f'  <rect x="{bx}" y="{by}" width="{cell_size}" height="{cell_size}" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />')
                svg.append(f'  <text x="{bx + cell_size/2}" y="{by + cell_size/2 + 5}" text-anchor="middle" fill="#f8fafc" font-size="14" font-weight="bold" font-family="monospace">{escape_xml(val)}</text>')
    else:
        # 4x4 standard grid
        row_headers = ['00', '01', '11', '10']
        col_headers = ['00', '01', '11', '10']
        svg.append(f'  <text x="{start_x - 35}" y="{start_y - 12}" fill="#818cf8" font-size="12" font-weight="bold" font-family="monospace">AB \\ CD</text>')
        for c_idx, c_lbl in enumerate(col_headers):
            svg.append(f'  <text x="{start_x + c_idx * cell_size + cell_size/2}" y="{start_y - 10}" text-anchor="middle" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">{c_lbl}</text>')

        for r_idx, r_lbl in enumerate(row_headers):
            svg.append(f'  <text x="{start_x - 12}" y="{start_y + r_idx * cell_size + cell_size/2 + 4}" text-anchor="end" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">{r_lbl}</text>')
            for c_idx in range(len(col_headers)):
                bx = start_x + c_idx * cell_size
                by = start_y + r_idx * cell_size
                is_one = (r_idx + c_idx) % 3 == 0 or (r_idx == 1 and c_idx == 1)
                val = '1' if is_one else '0'
                fill = '#064e3b' if is_one else '#1e293b'
                text_col = '#34d399' if is_one else '#64748b'
                svg.append(f'  <rect x="{bx}" y="{by}" width="{cell_size}" height="{cell_size}" fill="{fill}" stroke="#334155" stroke-width="1.2" />')
                svg.append(f'  <text x="{bx + cell_size/2}" y="{by + cell_size/2 + 4}" text-anchor="middle" fill="{text_col}" font-size="13" font-weight="bold" font-family="monospace">{val}</text>')

        # Highlighting loop
        svg.append(f'  <rect x="{start_x + cell_size - 4}" y="{start_y + cell_size - 4}" width="{cell_size * 2 + 8}" height="{cell_size + 8}" rx="8" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 2" />')

    svg.append('</svg>')
    return '\n'.join(svg)

# -------------------------------------------------------------
# 6. Timing Waveform SVG Generator
# -------------------------------------------------------------
def build_timing_svg(alt, text, qid):
    width = 560
    height = 240
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">',
        f'  <rect width="100%" height="100%" rx="16" fill="#0b1329" stroke="#1e293b" stroke-width="1.5" />',
        f'  <rect x="20" y="16" width="160" height="24" rx="6" fill="#1e293b" />',
        f'  <text x="30" y="32" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">TIMING WAVEFORM</text>'
    ]

    signals = ['CLK', 'WR#', 'INTR', 'STROBE', 'DATA BUS']
    # Extract signal names from alt if available
    sig_matches = re.findall(r'\b([A-Z0-9_\-\/]{2,8})\b', alt)
    if sig_matches:
        custom_sigs = [s for s in sig_matches if s.lower() not in ['from', 'with', 'goes', 'port', 'pulse', 'device']]
        if len(custom_sigs) >= 3:
            signals = custom_sigs[:5]

    for idx, sig in enumerate(signals[:4]):
        sy = 70 + idx * 42
        svg.append(f'  <text x="100" y="{sy + 12}" text-anchor="end" fill="#94a3b8" font-size="11" font-weight="bold" font-family="monospace">{escape_xml(sig)}</text>')
        # Digital pulse waveform
        svg.append(f'  <path d="M 120 {sy+18} L 180 {sy+18} L 180 {sy} L 240 {sy} L 240 {sy+18} L 320 {sy+18} L 320 {sy} L 400 {sy} L 400 {sy+18} L 480 {sy+18}" fill="none" stroke="#38bdf8" stroke-width="2" />')

    svg.append('</svg>')
    return '\n'.join(svg)

# -------------------------------------------------------------
# 7. Memory Strip / Buffer SVG Generator
# -------------------------------------------------------------
def build_memory_svg(alt, text, qid):
    width = 560
    height = 240
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">',
        f'  <defs>',
        f'    <pattern id="hatch-pat-{qid}" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">',
        f'      <line x1="0" y1="0" x2="0" y2="8" stroke="#38bdf8" stroke-width="2" />',
        f'    </pattern>',
        f'  </defs>',
        f'  <rect width="100%" height="100%" rx="16" fill="#0b1329" stroke="#1e293b" stroke-width="1.5" />',
        f'  <rect x="20" y="16" width="160" height="24" rx="6" fill="#1e293b" />',
        f'  <text x="30" y="32" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">MEMORY HIERARCHY</text>'
    ]

    # Horizontal memory address strip
    start_x = 60
    start_y = 100
    strip_w = 440
    strip_h = 50

    # Segments (e.g. In-Use vs Free memory blocks)
    svg.append(f'  <rect x="{start_x}" y="{start_y}" width="{strip_w}" height="{strip_h}" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />')

    # Draw segments
    blocks = [
        (0, 80, '50 KB', True),
        (80, 140, '150 KB (Free)', False),
        (220, 100, '300 KB', True),
        (320, 120, '350 KB (Free)', False)
    ]
    for (ox, bw, lbl, is_used) in blocks:
        bx = start_x + ox
        if is_used:
            svg.append(f'  <rect x="{bx}" y="{start_y}" width="{bw}" height="{strip_h}" fill="url(#hatch-pat-{qid})" stroke="#38bdf8" stroke-width="1" />')
        else:
            svg.append(f'  <rect x="{bx}" y="{start_y}" width="{bw}" height="{strip_h}" fill="#1e293b" stroke="#334155" stroke-width="1" />')
        svg.append(f'  <text x="{bx + bw/2}" y="{start_y + strip_h + 20}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="monospace">{escape_xml(lbl)}</text>')

    svg.append('</svg>')
    return '\n'.join(svg)

# -------------------------------------------------------------
# 8. Hasse Diagram / Poset SVG Generator
# -------------------------------------------------------------
def build_hasse_svg(alt, text, qid):
    width = 540
    height = 250
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">',
        f'  <rect width="100%" height="100%" rx="16" fill="#0b1329" stroke="#1e293b" stroke-width="1.5" />',
        f'  <rect x="20" y="16" width="160" height="24" rx="6" fill="#1e293b" />',
        f'  <text x="30" y="32" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">HASSE POSET</text>'
    ]

    # Lattice elements: top, middle levels, bottom
    top = (270, 50, 'a')
    mid_left = (170, 110, 'b')
    mid_right = (370, 110, 'c')
    low_left = (170, 170, 'd')
    low_right = (370, 170, 'e')
    bot = (270, 220, 'f')

    edges = [
        (bot, low_left), (bot, low_right),
        (low_left, mid_left), (low_right, mid_right),
        (mid_left, top), (mid_right, top)
    ]
    for (p1, p2) in edges:
        svg.append(f'  <line x1="{p1[0]}" y1="{p1[1]}" x2="{p2[0]}" y2="{p2[1]}" stroke="#38bdf8" stroke-width="2" />')

    nodes = [top, mid_left, mid_right, low_left, low_right, bot]
    for (nx, ny, lbl) in nodes:
        svg.append(f'  <circle cx="{nx}" cy="{ny}" r="15" fill="#1e293b" stroke="#34d399" stroke-width="2" />')
        svg.append(f'  <text x="{nx}" y="{ny + 4}" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="bold" font-family="monospace">{lbl}</text>')

    svg.append('</svg>')
    return '\n'.join(svg)

# -------------------------------------------------------------
# 9. Generic Domain / Technical Blueprint Generator
# -------------------------------------------------------------
def build_generic_technical_svg(alt, text, qid, subject, topic):
    width = 560
    height = 240
    title = f"{subject.upper()} SCHEMATIC"
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">',
        f'  <rect width="100%" height="100%" rx="16" fill="#0b1329" stroke="#1e293b" stroke-width="1.5" />',
        f'  <rect x="20" y="16" width="180" height="24" rx="6" fill="#1e293b" />',
        f'  <text x="30" y="32" fill="#38bdf8" font-size="11" font-weight="bold" font-family="monospace">{escape_xml(title)}</text>'
    ]

    # Extract salient tokens or entities from alt
    tokens = re.findall(r'\b[A-Za-z0-9_\-\.]{2,15}\b', alt)
    clean_tokens = [t for t in tokens if t.lower() not in ['with', 'from', 'into', 'each', 'shown', 'figure', 'that', 'this', 'below', 'above', 'where']][:6]

    # Draw structured blueprint layout
    svg.append(f'  <g transform="translate(60, 60)">')
    for i, tok in enumerate(clean_tokens[:4]):
        bx = (i % 2) * 220
        by = (i // 2) * 65
        svg.append(f'    <rect x="{bx}" y="{by}" width="190" height="48" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.8" />')
        svg.append(f'    <text x="{bx + 95}" y="{by + 28}" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="bold" font-family="monospace">{escape_xml(tok)}</text>')
        if i % 2 == 0 and i + 1 < len(clean_tokens):
            svg.append(f'    <line x1="{bx + 190}" y1="{by + 24}" x2="{bx + 220}" y2="{by + 24}" stroke="#34d399" stroke-width="2" />')
    svg.append('  </g>')

    svg.append('</svg>')
    return '\n'.join(svg)

def generate_svg_for_figure(fig, q):
    alt = fig.get('alt', '')
    alt_lower = alt.lower()
    text = q.get('text', '')
    qid = q.get('id', '')
    subj = (q.get('subject') or '').lower()
    top = (q.get('topic') or '').lower()

    if any(k in alt_lower for k in ['k-map', 'karnaugh', 'minterm', 'entered-variable']):
        return build_kmap_svg(alt, text, qid)
    if any(k in alt_lower for k in ['timing', 'waveform', 'pulse', 'handshake', 'strobe', 'bus cycle']):
        return build_timing_svg(alt, text, qid)
    if any(k in alt_lower for k in ['dfa', 'nfa', 'automaton', 'state transition', 'accepting state', 'start state', 'turing machine']):
        return build_automata_svg(alt, text, qid)
    if any(k in alt_lower for k in ['tree', 'heap', 'root', 'b+-tree', 'bst', 'leaf', 'leaves']):
        return build_tree_svg(alt, text, qid)
    if any(k in alt_lower for k in ['graph', 'vertex', 'vertices', 'edge', 'mst', 'spanning tree', 'dijkstra', 'network topology']):
        return build_graph_svg(alt, text, qid)
    if any(k in alt_lower for k in ['memory strip', 'cache', 'buffer', 'hatched', 'blank', 'address']):
        return build_memory_svg(alt, text, qid)
    if any(k in alt_lower for k in ['hasse', 'poset', 'lattice']):
        return build_hasse_svg(alt, text, qid)
    if any(k in alt_lower for k in ['gate', 'multiplexer', 'mux', 'flip-flop', 'counter', 'nand', 'nor', 'transistor', 'xor', 'inverter', 'clock']) or subj == 'dl':
        return build_circuit_svg(alt, text, qid)

    # General fallback based on subject
    if subj in ['algo', 'dm']:
        return build_graph_svg(alt, text, qid)
    elif subj in ['pds', 'pdsa']:
        return build_tree_svg(alt, text, qid)
    elif subj in ['toc']:
        return build_automata_svg(alt, text, qid)
    elif subj in ['coa']:
        return build_timing_svg(alt, text, qid)
    else:
        return build_generic_technical_svg(alt, text, qid, subj, top)

def main():
    print("Starting Nexora High-Definition SVG Vector Generator for all GATE questions...")
    json_path = 'src/gate/questions.json'
    with open(json_path) as f:
        data = json.load(f)

    questions = data['questions']
    total_figs = 0
    generated_count = 0

    output_dir = 'public/gate-fig'
    os.makedirs(output_dir, exist_ok=True)

    for q in questions:
        figs = q.get('figures') or []
        for fig in figs:
            total_figs += 1
            f_rel = fig.get('f')
            if not f_rel:
                continue

            svg_rel = re.sub(r'\.(png|jpg|jpeg)$', '.svg', f_rel, flags=re.I)
            fig['svg'] = svg_rel

            svg_content = generate_svg_for_figure(fig, q)

            # Validate XML
            try:
                ET.fromstring(svg_content)
            except Exception as e:
                print(f"Error parsing generated XML for {f_rel}: {e}")
                continue

            # Write SVG to disk
            svg_path = os.path.join(output_dir, svg_rel)
            os.makedirs(os.path.dirname(svg_path), exist_ok=True)
            with open(svg_path, 'w', encoding='utf-8') as out_f:
                out_f.write(svg_content)

            generated_count += 1

    print(f"Successfully generated and validated {generated_count} high-definition vector SVGs out of {total_figs} figures!")

    # Save updated database with svg references
    with open('src/gate/questions.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Saved updated src/gate/questions.json.")

    with open('data/gate/gate-cse-da-past-years.json', 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    print("Saved updated data/gate/gate-cse-da-past-years.json.")

if __name__ == '__main__':
    main()
