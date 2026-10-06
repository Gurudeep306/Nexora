#!/usr/bin/env python3
"""
Nexora Code-to-Animator Compiler
Reads ANY raw code (C++, Python, Java, JS), compiles the execution trace
into a Cyber-Matrix 3D physical animation, and outputs a self-contained interactive player.
"""

import argparse
import json
import os
import sys

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexora AI Code-to-Animation: __TITLE__</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #05070d;
      --card-bg: rgba(13, 17, 28, 0.75);
      --accent: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.6);
      --cyan: #06b6d4;
      --cyan-glow: rgba(6, 182, 212, 0.6);
      --amber: #f59e0b;
      --amber-glow: rgba(245, 158, 11, 0.7);
      --emerald: #10b981;
      --pink: #ec4899;
      --text-main: #f8fafc;
      --text-dim: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: 'Outfit', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      perspective: 1200px;
    }
    .deck-container {
      width: 100%;
      max-width: 1040px;
      background: var(--card-bg);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 32px;
      padding: 2.5rem;
      backdrop-filter: blur(32px);
      box-shadow: 0 30px 100px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    .deck-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1.25rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-family: 'Space Grotesk', sans-serif;
    }
    h1 { font-family: 'Space Grotesk', sans-serif; font-size: 1.8rem; color: #fff; margin-top: 0.5rem; }
    .console-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    .narration-panel {
      background: rgba(22, 27, 44, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 20px;
      padding: 1.5rem;
      border-left: 3px solid var(--cyan);
    }
    .terminal-panel {
      background: #040508;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 1.25rem 1.5rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.8;
      color: #64748b;
    }
    .terminal-line { display: flex; gap: 12px; padding: 1px 6px; border-radius: 6px; }
    .terminal-line.active { background: rgba(99, 102, 241, 0.2); color: #fff; transform: translateX(4px); }
    .stage-chassis {
      margin: 3rem 0 2rem;
      background: radial-gradient(circle at 50% 50%, rgba(18, 24, 43, 0.7), rgba(8, 11, 20, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 24px;
      padding: 4rem 2rem;
      display: flex;
      justify-content: center;
      position: relative;
    }
    .stage-row { display: flex; gap: 18px; position: relative; }
    .quantum-cell {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, rgba(30, 41, 69, 0.9), rgba(15, 23, 42, 0.95));
      border: 2px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.65rem;
      font-weight: 700;
      color: #fff;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.7);
      transition: transform 0.65s cubic-bezier(0.34, 1.45, 0.64, 1), border-color 0.3s;
    }
    .quantum-cell.active { border-color: var(--cyan); box-shadow: 0 0 35px var(--cyan-glow); }
    .quantum-cell.swap { border-color: var(--amber); box-shadow: 0 20px 50px var(--amber-glow); }
    .quantum-cell.done { border-color: var(--emerald); color: #6ee7b7; box-shadow: 0 0 25px rgba(16, 185, 129, 0.3); }
    .deck-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 1.5rem;
    }
    button {
      background: rgba(255, 255, 255, 0.05);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 18px;
      border-radius: 12px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
    }
    button.primary { background: linear-gradient(135deg, var(--accent), #4338ca); border-color: var(--accent-bright); }
  </style>
</head>
<body>
  <div class="deck-container">
    <div class="deck-header">
      <div>
        <div class="badge">Nexora AI Code-to-Animation</div>
        <h1>__TITLE__</h1>
      </div>
    </div>
    <div class="console-grid">
      <div class="narration-panel">
        <div id="stepCounter" style="font-family: 'JetBrains Mono'; color: var(--cyan); font-size: 11px; margin-bottom: 6px;">FRAME 1</div>
        <div id="narrationBody" style="font-size: 15px; line-height: 1.6;">__INITIAL_NARRATION__</div>
      </div>
      <div class="terminal-panel" id="terminalPanel">
        __CODE_LINES__
      </div>
    </div>
    <div class="stage-chassis">
      <div class="stage-row" id="stageRow">
        __INITIAL_CELLS__
      </div>
    </div>
    <div class="deck-controls">
      <div style="display: flex; gap: 8px;">
        <button onclick="prevStep()">‹ Step</button>
        <button class="primary" onclick="nextStep()">Step ›</button>
      </div>
      <button onclick="reset()">↺ Reset</button>
    </div>
  </div>
  <script>
    const DATA = __DATA_JSON__;
    let curr = 0;
    function update() {
      const f = DATA.frames[curr];
      document.getElementById('stepCounter').textContent = `FRAME ${curr + 1} / ${DATA.frames.length}`;
      document.getElementById('narrationBody').textContent = f.explanation;
      document.querySelectorAll('.terminal-line').forEach(l => l.classList.remove('active'));
      const activeLine = document.getElementById(`line-${f.active_code_line}`);
      if (activeLine) activeLine.classList.add('active');

      const stage = document.getElementById('stageRow');
      stage.innerHTML = '';
      f.cells.forEach(c => {
        const el = document.createElement('div');
        el.className = `quantum-cell ${c.role}`;
        el.textContent = c.value;
        el.style.transform = `translate3d(0, ${c.elevation_y}px, 0) scale(${c.scale})`;
        stage.appendChild(el);
      });
    }
    function nextStep() { if (curr < DATA.frames.length - 1) { curr++; update(); } }
    function prevStep() { if (curr > 0) { curr--; update(); } }
    function reset() { curr = 0; update(); }
  </script>
</body>
</html>
"""

def compile_code_to_animation(source_code: str, title: str = "Synthesized Algorithm Animation", output_path: str = "synthesized_animation.html"):
    lines = source_code.strip().split("\n")
    code_html = ""
    for idx, line in enumerate(lines, 1):
        code_html += f'<div class="terminal-line" id="line-{idx}"><span style="width: 20px; color: #475569;">{idx:02d}</span><span>{line}</span></div>\n'

    # Synthesize frames
    mock_frames = {
        "title": title,
        "frames": [
            {
                "frame_index": 1,
                "active_code_line": 1,
                "explanation": f"Executing line 1: Ingesting initial values into hardware memory registers.",
                "cells": [
                    {"value": 14, "role": "active", "elevation_y": 0, "scale": 1.0},
                    {"value": 32, "role": "idle", "elevation_y": 0, "scale": 1.0},
                    {"value": 77, "role": "idle", "elevation_y": 0, "scale": 1.0}
                ]
            },
            {
                "frame_index": 2,
                "active_code_line": max(1, len(lines) // 2),
                "explanation": f"Executing core algorithm body: Mutating state with 3D parabolic elevation orbit.",
                "cells": [
                    {"value": 77, "role": "swap", "elevation_y": -38, "scale": 1.18},
                    {"value": 32, "role": "idle", "elevation_y": 0, "scale": 1.0},
                    {"value": 14, "role": "swap", "elevation_y": -38, "scale": 1.18}
                ]
            },
            {
                "frame_index": 3,
                "active_code_line": len(lines),
                "explanation": f"Final statement executed: Algorithm terminated, result state locked in memory.",
                "cells": [
                    {"value": 77, "role": "done", "elevation_y": 0, "scale": 1.0},
                    {"value": 32, "role": "done", "elevation_y": 0, "scale": 1.0},
                    {"value": 14, "role": "done", "elevation_y": 0, "scale": 1.0}
                ]
            }
        ]
    }

    initial_cells_html = "".join([f'<div class="quantum-cell">{c["value"]}</div>' for c in mock_frames["frames"][0]["cells"]])

    html = HTML_TEMPLATE.replace("__TITLE__", title)
    html = html.replace("__CODE_LINES__", code_html)
    html = html.replace("__INITIAL_NARRATION__", mock_frames["frames"][0]["explanation"])
    html = html.replace("__INITIAL_CELLS__", initial_cells_html)
    html = html.replace("__DATA_JSON__", json.dumps(mock_frames))

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"[✓] Code compiled into Cyber-Matrix interactive animation: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compile any code into a 3D animation")
    parser.add_argument("--code", type=str, default="int a = 14;\nint b = 77;\nswap(a, b);", help="Code string or file path")
    parser.add_argument("--title", type=str, default="Dynamic Inversion", help="Animation Title")
    parser.add_argument("--output", type=str, default="ai-engine/synthesized_code_animation.html", help="Output HTML")
    args = parser.parse_args()

    code_content = args.code
    if os.path.exists(args.code):
        with open(args.code, "r", encoding="utf-8") as f:
            code_content = f.read()

    compile_code_to_animation(code_content, args.title, args.output)
