#!/usr/bin/env bash
# ==============================================================================
# Nexora Kronos-1: Launch Sovereign In-House AI Daemon
# 100% Offline · Zero External API Dependencies · Localhost Only
# ==============================================================================

set -euo pipefail

PORT="${PORT:-8000}"
SECRET="${KRONOS_SECRET:-kronos-sovereign-intelligence-2026}"

echo "============================================================"
echo "  [⚡] STARTING KRONOS-1 SOVEREIGN NEURAL DAEMON"
echo "  Port:      ${PORT}"
echo "  Isolation: Localhost (127.0.0.1) Only - No Data Leaks"
echo "  Status:    Active"
echo "============================================================"

export PORT="${PORT}"
export NEXORA_INTERNAL_SECRET="${SECRET}"

python3 ai-engine/serve_api.py
