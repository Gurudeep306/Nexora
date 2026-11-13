#!/usr/bin/env python3
"""Nexora model farm gateway — every model behind one address and one key.

Each model runs in its own vLLM server on a local port. This gateway is the
only thing exposed to the internet: it checks the bearer key, lists every
model at /v1/models, and forwards /v1/chat/completions, /v1/completions and
/v1/embeddings to the right server by the request's "model" (streaming
included). /health shows which models are up — no key needed, no secrets.

Standard library only, so it runs on any GPU image. Configuration comes from
the environment:
  FARM_KEY      the key Hive (or anyone) must send as "Authorization: Bearer …"
  FARM_ROUTES   JSON {"model-name": "http://127.0.0.1:PORT", …}  (farm.sh writes it)
  FARM_PORT     port to listen on (default 8000)
"""
import hmac
import http.client
import json
import os
import sys
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

KEY = os.environ.get("FARM_KEY", "")
ROUTES = json.loads(os.environ.get("FARM_ROUTES", "{}"))
PORT = int(os.environ.get("FARM_PORT", "8000"))
FORWARD = ("/v1/chat/completions", "/v1/completions", "/v1/embeddings")
MAX_BODY = 64 * 1024 * 1024
STARTED = time.time()


def upstream(model):
    url = ROUTES.get(model)
    if not url:
        # Accept "farm/<name>" or a Hugging Face id that maps to a served name.
        short = model.split("/")[-1].lower()
        url = next((u for n, u in ROUTES.items() if n.lower() == short), None)
    return urllib.parse.urlparse(url) if url else None


def probe(url, timeout=2.0):
    try:
        u = urllib.parse.urlparse(url)
        c = http.client.HTTPConnection(u.hostname, u.port, timeout=timeout)
        c.request("GET", "/v1/models")
        r = c.getresponse()
        r.read()
        return r.status == 200
    except Exception:
        return False


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "nexora-farm/1"

    def log_message(self, fmt, *args):  # one line per request, no bodies (no prompts in logs)
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    def send_json(self, status, obj):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def authed(self):
        if not KEY:
            return True
        got = self.headers.get("Authorization", "")
        token = got[7:] if got.lower().startswith("bearer ") else self.headers.get("x-api-key", "")
        return hmac.compare_digest(token.encode(), KEY.encode())

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/health":
            up = {name: probe(url) for name, url in ROUTES.items()}
            return self.send_json(200, {"ok": all(up.values()) if up else False, "models": up, "uptime_s": int(time.time() - STARTED)})
        if not self.authed():
            return self.send_json(401, {"error": {"message": "Missing or wrong farm key", "type": "auth"}})
        if path == "/v1/models":
            data = [{"id": name, "object": "model", "owned_by": "nexora-farm"} for name, url in ROUTES.items() if probe(url, 1.0)]
            return self.send_json(200, {"object": "list", "data": data})
        return self.send_json(404, {"error": {"message": "Not found"}})

    def do_POST(self):
        path = self.path.split("?")[0]
        if not self.authed():
            return self.send_json(401, {"error": {"message": "Missing or wrong farm key", "type": "auth"}})
        if path not in FORWARD:
            return self.send_json(404, {"error": {"message": "Not found"}})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self.send_json(400, {"error": {"message": "Bad request body"}})
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw)
        except ValueError:
            return self.send_json(400, {"error": {"message": "Body is not JSON"}})
        model = str(body.get("model") or "")
        u = upstream(model)
        if not u:
            return self.send_json(404, {"error": {"message": f"The model `{model}` does not exist on this farm. Served: {', '.join(ROUTES) or 'none'}", "type": "invalid_request_error", "code": "model_not_found"}})
        # vLLM knows the model by its served name.
        body["model"] = next((n for n, url in ROUTES.items() if urllib.parse.urlparse(url) == u), model)
        payload = json.dumps(body).encode()
        try:
            conn = http.client.HTTPConnection(u.hostname, u.port, timeout=600)
            conn.request("POST", path, body=payload, headers={"Content-Type": "application/json", "Accept": self.headers.get("Accept", "*/*")})
            resp = conn.getresponse()
        except Exception as e:
            return self.send_json(503, {"error": {"message": f"`{model}` is not answering (still loading or down): {e}", "type": "server_error"}})
        self.send_response(resp.status)
        ctype = resp.getheader("Content-Type", "application/json")
        self.send_header("Content-Type", ctype)
        streaming = "text/event-stream" in ctype
        if streaming:
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Transfer-Encoding", "chunked")
            self.end_headers()
            try:
                while True:
                    chunk = resp.read1(65536) if hasattr(resp, "read1") else resp.read(4096)
                    if not chunk:
                        break
                    self.wfile.write(b"%x\r\n%s\r\n" % (len(chunk), chunk))
                    self.wfile.flush()
                self.wfile.write(b"0\r\n\r\n")
            except (BrokenPipeError, ConnectionResetError):
                pass  # the caller went away; stop quietly
        else:
            data = resp.read()
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        conn.close()


def main():
    if not KEY:
        print("WARNING: FARM_KEY is empty — anyone who finds this address can use your GPUs.", file=sys.stderr)
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    srv.daemon_threads = True
    print(f"Nexora farm gateway on :{PORT} → {', '.join(ROUTES) or 'no models yet'}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
