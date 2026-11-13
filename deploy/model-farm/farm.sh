#!/usr/bin/env bash
# Nexora model farm — one command on a GPU machine (RunPod, Vast.ai, AMD
# Developer Cloud, any Linux box with an NVIDIA or AMD GPU):
#
#   FARM_KEY=$(openssl rand -hex 24) FARM_PROFILE=budget bash farm.sh
#
# Installs vLLM if needed, downloads the profile's models (cached in
# $HF_HOME, so restarts are quick), starts them and the gateway on port 8000.
# Connect it in Hive: Keys → Add → "Your GPU farm", address
# https://<this machine>:8000/v1 and the same FARM_KEY.
set -euo pipefail
cd "$(dirname "$0")"

if [ -z "${FARM_KEY:-}" ] && [ "${FARM_ALLOW_OPEN:-}" != "1" ]; then
  echo "Set FARM_KEY first, e.g.:  export FARM_KEY=\$(openssl rand -hex 24)   (save it — Hive needs it)"
  exit 1
fi

# Keep downloads on the persistent volume when there is one (RunPod: /workspace).
if [ -z "${HF_HOME:-}" ]; then
  if [ -d /workspace ]; then export HF_HOME=/workspace/hf; else export HF_HOME="$HOME/.cache/huggingface"; fi
fi
mkdir -p "$HF_HOME"
export HF_HUB_ENABLE_HF_TRANSFER=1

if ! command -v vllm >/dev/null 2>&1; then
  echo "[farm] installing vLLM (a few minutes, once)…"
  python3 -m pip install -q --upgrade pip
  python3 -m pip install -q vllm huggingface_hub hf_transfer
fi
python3 -c "import huggingface_hub" 2>/dev/null || python3 -m pip install -q huggingface_hub hf_transfer

nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null | sed 's/^/[farm] GPU: /' || true
exec python3 launch.py
