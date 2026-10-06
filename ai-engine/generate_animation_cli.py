#!/usr/bin/env python3
"""
Nexora Automatic Animation Generator CLI
Automates generating production-grade Algorithm visualizer files (.ts)
for client/src/learn/algorithms/ using the Nexora-Core AI engine.
"""

import argparse
import json
import os
import urllib.request
import urllib.error
import sys

API_URL = os.environ.get("NEXORA_CORE_URL", "http://localhost:8080/v1/chat/completions")
API_SECRET = os.environ.get("NEXORA_INTERNAL_SECRET", "nexora-secret-key-change-me")

ANIMATOR_SYSTEM_PROMPT = (
    "You are the Nexora Master Visualizer Engine. You write production-grade, executable "
    "TypeScript algorithms conforming to the Nexora Animation Engine ('../engine/tracer' and '../engine/types'). "
    "Every algorithm you generate includes polyglot code tabs (pseudo, cpp, java, python, js, c) "
    "synchronized with step tags (//@tag) and complete tracer execution logic."
)

def generate_visualizer(topic: str, output_path: str = None):
    print(f"[*] Synthesizing Nexora animation module for topic: '{topic}'...")

    prompt = (
        f"Generate a full, production-grade Nexora visualizer TypeScript module (.ts) for: '{topic}'.\n"
        f"Include inputs with defaults, randomizer, polyglot code tabs (pseudo, cpp, java, python, js, c) "
        f"with exact line tags (//@tag), and the full trace((t) => {{ ... }}) state machine.\n"
        f"Reply with the raw TypeScript code block only."
    )

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_SECRET}",
        "X-Nexora-Secret": API_SECRET,
    }

    payload = json.dumps({
        "model": "nexora-grand-32b",
        "messages": [
            {"role": "system", "content": ANIMATOR_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 3000
    }).encode("utf-8")

    req = urllib.request.Request(API_URL, data=payload, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            code = data["choices"][0]["message"]["content"]
            if "```typescript" in code:
                code = code.split("```typescript")[1].split("```")[0].strip()
            elif "```ts" in code:
                code = code.split("```ts")[1].split("```")[0].strip()
            elif "```" in code:
                code = code.split("```")[1].split("```")[0].strip()

            if output_path:
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(code + "\n")
                print(f"[✓] Successfully generated and wrote animation module to: {output_path}")
            else:
                print(code)
            return code
    except urllib.error.URLError as e:
        print(f"[!] Inference server error ({e}). Start server with: python ai-engine/serve_api.py")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automate Nexora Animation Generation")
    parser.add_argument("--topic", type=str, required=True, help="Algorithm or CS topic name (e.g. 'Binary Search Tree Insertion')")
    parser.add_argument("--output", type=str, default=None, help="Destination .ts file path (e.g. 'client/src/learn/algorithms/bst.ts')")
    args = parser.parse_args()
    generate_visualizer(args.topic, args.output)
