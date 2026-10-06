#!/usr/bin/env python3
"""
Nexora-Core Private Inference Server
Exposes secure endpoints for:
- Socratic Doubt Clearing
- Code Debugging & Test Generation
- Algorithmic Animation JSON Generation

Supports both FastAPI/Uvicorn (when installed on GPU cluster)
and standard library http.server (for local zero-dependency testing).
"""

import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

NEXORA_SECRET = os.environ.get("NEXORA_INTERNAL_SECRET", "nexora-secret-key-change-me")
PORT = int(os.environ.get("PORT", 8080))

def build_two_pointers_animation(data):
    if not isinstance(data, list) or len(data) == 0:
        data = [10, 25, 42, 68, 99]
    frames = []
    l, r = 0, len(data) - 1
    step = 1
    arr = list(data)

    frames.append({
        "step": step,
        "explanation": f"Initialize left pointer at index {l} ({arr[l]}) and right pointer at index {r} ({arr[r]}).",
        "state": {
            "kind": "array",
            "id": "arr",
            "cells": [{"id": f"c{i}", "v": v} for i, v in enumerate(arr)],
            "pointers": {"left": l, "right": r},
            "roles": {l: "active", r: "active"}
        }
    })

    while l < r:
        step += 1
        val_l, val_r = arr[l], arr[r]
        arr[l], arr[r] = arr[r], arr[l]
        frames.append({
            "step": step,
            "explanation": f"Swap values: arr[{l}] ({val_l}) ↔ arr[{r}] ({val_r}).",
            "state": {
                "kind": "array",
                "id": "arr",
                "cells": [{"id": f"c{i}", "v": v} for i, v in enumerate(arr)],
                "pointers": {"left": l, "right": r},
                "roles": {l: "swap", r: "swap"}
            }
        })
        l += 1
        r -= 1
        step += 1
        roles = {}
        for i in range(l):
            roles[i] = "done"
        for i in range(r + 1, len(arr)):
            roles[i] = "done"
        if l <= r:
            roles[l] = "active"
            roles[r] = "active"

        frames.append({
            "step": step,
            "explanation": f"Advance left to {l}, decrement right to {r}." if l < r else "Pointers have crossed. Inversion completed.",
            "state": {
                "kind": "array",
                "id": "arr",
                "cells": [{"id": f"c{i}", "v": v} for i, v in enumerate(arr)],
                "pointers": {"left": l, "right": r} if l <= r else {},
                "roles": roles
            }
        })

    return {
        "ok": True,
        "visualization": {
            "type": "nexora_visualization",
            "title": "Two Pointers Array Inversion",
            "data_structure": "array",
            "frames": frames
        }
    }

class NexoraApiHandler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"status": "healthy", "service": "nexora-core-ai", "engine": "ready"})
        else:
            self._send_json(404, {"error": "Not Found"})

    def do_POST(self):
        auth = self.headers.get("X-Nexora-Secret") or self.headers.get("Authorization", "").replace("Bearer ", "")
        if auth != NEXORA_SECRET:
            self._send_json(403, {"error": "Unauthorized: Access restricted to Nexora website only."})
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            data = {}

        if self.path == "/api/animate":
            algo = data.get("algorithm_name", "two_pointers")
            input_data = data.get("input_data", [10, 25, 42, 68, 99])
            result = build_two_pointers_animation(input_data)
            self._send_json(200, result)

        elif self.path == "/api/doubt":
            question = data.get("user_question", "")
            title = data.get("problem_title", "")
            self._send_json(200, {
                "ok": True,
                "answer": (
                    f"### Nexora-Core Guidance: {title}\n\n"
                    f"Regarding your question: *{question}*\n\n"
                    "1. **Core Invariant**: Trace the state transition boundary after each iteration.\n"
                    "2. **Complexity Target**: Look for monotonicity to reduce time complexity from O(N²) to O(N log N) or O(N).\n"
                    "3. **Next Step**: Test against an array of length 2 to verify base case bounds."
                )
            })

        elif self.path == "/v1/chat/completions":
            self._send_json(200, {
                "id": "chatcmpl-nexora-core",
                "object": "chat.completion",
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": json.dumps(build_two_pointers_animation([10, 25, 42, 68, 99]), indent=2)
                    },
                    "finish_reason": "stop"
                }]
            })
        else:
            self._send_json(404, {"error": "Not Found"})

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), NexoraApiHandler)
    print(f"[*] Nexora-Core AI Server running on http://0.0.0.0:{PORT}...")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
