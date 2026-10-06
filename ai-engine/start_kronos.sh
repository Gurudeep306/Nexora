#!/usr/bin/env bash
# Start the local Kronos-1 model server (127.0.0.1 only, no external calls).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PORT="${PORT:-8000}"
export NEXORA_INTERNAL_SECRET="${KRONOS_SECRET:-kronos-sovereign-intelligence-2026}"

if [ -x "$ROOT/ai-engine/.venv/bin/python" ]; then
  PY="$ROOT/ai-engine/.venv/bin/python"
else
  PY="python3"
fi

exec "$PY" "$ROOT/ai-engine/serve_api.py"
