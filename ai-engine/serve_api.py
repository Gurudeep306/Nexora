#!/usr/bin/env python3
"""
Kronos-1 local inference server.

Runs the GGUF model in ai-engine/models/ on this machine through llama.cpp and
exposes an OpenAI-compatible API on 127.0.0.1 only. Every response is generated
by the model. There are no canned answers and no template animations here: if
the model cannot load, the server says so instead of faking a reply.
"""

import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(HERE, "models")
SECRET = os.environ.get("NEXORA_INTERNAL_SECRET", "kronos-sovereign-intelligence-2026")
PORT = int(os.environ.get("PORT", 8000))
N_CTX = int(os.environ.get("KRONOS_CTX", 4096))
PREFERRED = [os.environ.get("KRONOS_MODEL_FILE", ""), "kronos-coder-1.5b.gguf", "kronos-coder-0.5b.gguf"]

_llm = None
_llm_lock = threading.Lock()   # one llama.cpp context -> serialise generation
_load_error = None


def find_model():
    for name in PREFERRED:
        if name and os.path.exists(os.path.join(MODELS_DIR, name)):
            return os.path.join(MODELS_DIR, name)
    if os.path.isdir(MODELS_DIR):
        for f in sorted(os.listdir(MODELS_DIR)):
            if f.endswith(".gguf"):
                return os.path.join(MODELS_DIR, f)
    return None


def load_model():
    global _llm, _load_error
    path = find_model()
    if not path:
        _load_error = "no .gguf file in ai-engine/models (run: npm run model:bootstrap)"
        return
    try:
        from llama_cpp import Llama
        print(f"[kronos] loading {path}", flush=True)
        _llm = Llama(
            model_path=path,
            n_ctx=N_CTX,
            n_threads=max(2, (os.cpu_count() or 4) - 2),
            n_gpu_layers=-1,      # Metal on Apple Silicon, CPU elsewhere
            verbose=False,
        )
        print("[kronos] model ready", flush=True)
    except Exception as e:  # noqa: BLE001
        _load_error = f"{type(e).__name__}: {e}"
        print(f"[kronos] FAILED to load model: {_load_error}", flush=True)


class Handler(BaseHTTPRequestHandler):
    server_version = "Kronos/1"

    def log_message(self, fmt, *args):
        pass

    def _send(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self):
        got = self.headers.get("X-Nexora-Secret") or self.headers.get("Authorization", "").replace("Bearer ", "")
        return got == SECRET

    def do_GET(self):
        if self.path == "/health":
            path = find_model()
            self._send(200, {
                "status": "ready" if _llm else "unavailable",
                "model": os.path.basename(path) if path else None,
                "error": _load_error,
            })
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        if not self._authorized():
            return self._send(403, {"error": "unauthorized"})
        if _llm is None:
            return self._send(503, {"error": f"model not loaded: {_load_error}"})

        try:
            n = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(n).decode("utf-8")) if n else {}
        except Exception:  # noqa: BLE001
            return self._send(400, {"error": "invalid json"})

        max_tokens = int(data.get("max_tokens") or 1024)
        temperature = float(data.get("temperature") if data.get("temperature") is not None else 0.3)

        try:
            with _llm_lock:
                if self.path == "/v1/chat/completions":
                    kwargs = dict(
                        messages=data.get("messages", []),
                        max_tokens=max_tokens,
                        temperature=temperature,
                    )
                    if data.get("response_format"):
                        kwargs["response_format"] = data["response_format"]
                    if data.get("stop"):
                        kwargs["stop"] = data["stop"]
                    out = _llm.create_chat_completion(**kwargs)
                elif self.path == "/v1/completions":
                    out = _llm.create_completion(
                        prompt=data.get("prompt", ""),
                        max_tokens=max_tokens,
                        temperature=temperature,
                        stop=data.get("stop"),
                    )
                else:
                    return self._send(404, {"error": "not found"})
            self._send(200, out)
        except Exception as e:  # noqa: BLE001
            self._send(500, {"error": f"{type(e).__name__}: {e}"})


if __name__ == "__main__":
    load_model()
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"[kronos] listening on http://127.0.0.1:{PORT}", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
