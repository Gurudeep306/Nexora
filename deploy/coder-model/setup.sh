#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  NexoraGuru's own coding model, on a free Oracle Cloud server.
#
#  One open model (Qwen2.5-Coder, Apache-2.0) served by llama.cpp on the CPU,
#  behind HTTPS, for the Solve page's AI tests and coding helper. No company's
#  API key: the only key is a password this script makes for your own server,
#  which you paste into Admin → AI models.
#
#  Made for an Oracle Cloud "Always Free" Ampere VM (VM.Standard.A1.Flex,
#  4 OCPUs, 24 GB RAM), Ubuntu 22.04 or 24.04. Works on any Ubuntu server.
#
#  Run it on the server (Oracle's Cloud Shell → ssh, or the VM's console):
#    curl -fsSL https://raw.githubusercontent.com/Gurudeep306/Nexora/main/deploy/coder-model/setup.sh -o setup.sh
#    sudo bash setup.sh
#  Safe to run again (to update, or to change the model).
#
#  Settings (environment variables, all optional):
#    MODEL      1.5b (default, fast) · 3b (smarter, ~2x slower) · 7b (smartest, slow on CPU)
#    DOMAIN     hostname for HTTPS (default: <your-ip>.sslip.io, a free name that points to the IP)
#    LLAMA_TAG  llama.cpp release to build (default below)
#    THREADS    CPU threads for the model (default: all)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MODEL="${MODEL:-1.5b}"
LLAMA_TAG="${LLAMA_TAG:-b12000}"
BASE=/opt/nexora-coder
PORT=8081
ALIAS=nexora-coder

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '    \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run as root:  sudo bash setup.sh"
# shellcheck disable=SC1091
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || die "This script is for Ubuntu (found: ${ID:-unknown})."

case "$MODEL" in
  1.5b) REPO=Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF; FILE=qwen2.5-coder-1.5b-instruct-q4_k_m.gguf ;;
  3b)   REPO=Qwen/Qwen2.5-Coder-3B-Instruct-GGUF;   FILE=qwen2.5-coder-3b-instruct-q4_k_m.gguf ;;
  7b)   REPO=Qwen/Qwen2.5-Coder-7B-Instruct-GGUF;   FILE=qwen2.5-coder-7b-instruct-q4_k_m.gguf ;;
  *) die "MODEL must be 1.5b, 3b or 7b (got: $MODEL)" ;;
esac

export DEBIAN_FRONTEND=noninteractive
mkdir -p "$BASE/models" "$BASE/bin"

# ── 1. Packages ──────────────────────────────────────────────────────────────
log "Packages"
echo iptables-persistent iptables-persistent/autosave_v4 boolean false | debconf-set-selections
echo iptables-persistent iptables-persistent/autosave_v6 boolean false | debconf-set-selections
apt-get update -y
apt-get install -y --no-install-recommends ca-certificates curl gnupg git cmake build-essential openssl \
  debian-keyring debian-archive-keyring apt-transport-https iptables iptables-persistent netfilter-persistent
if ! command -v caddy >/dev/null; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
ok "build tools and Caddy installed"

# ── 2. Swap (the build and the model like room to breathe) ───────────────────
if ! swapon --show | grep -q /swapfile; then
  log "Swap"
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "4 GB swap"
fi

# ── 3. llama.cpp (built for this CPU) ────────────────────────────────────────
if [[ ! -x "$BASE/bin/llama-server" || "$(cat "$BASE/bin/.tag" 2>/dev/null)" != "$LLAMA_TAG" ]]; then
  log "Building llama.cpp $LLAMA_TAG (about 10 minutes on 4 cores)"
  SRC="$BASE/llama.cpp-$LLAMA_TAG"
  [[ -d "$SRC" ]] || git clone --depth 1 --branch "$LLAMA_TAG" https://github.com/ggml-org/llama.cpp.git "$SRC"
  cmake -S "$SRC" -B "$SRC/build" -DCMAKE_BUILD_TYPE=Release -DLLAMA_CURL=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF >/dev/null
  cmake --build "$SRC/build" --target llama-server -j "$(nproc)"
  install -m 755 "$SRC/build/bin/llama-server" "$BASE/bin/llama-server"
  echo "$LLAMA_TAG" > "$BASE/bin/.tag"
fi
ok "llama-server $(cat "$BASE/bin/.tag")"

# ── 4. The model (public on Hugging Face, no account needed) ────────────────
if [[ ! -s "$BASE/models/$FILE" ]]; then
  log "Downloading $FILE"
  curl -fL --retry 5 -o "$BASE/models/$FILE.part" "https://huggingface.co/$REPO/resolve/main/$FILE"
  mv "$BASE/models/$FILE.part" "$BASE/models/$FILE"
fi
ok "model $FILE ($(du -h "$BASE/models/$FILE" | cut -f1))"

# ── 5. Your server's password (made once, kept) ─────────────────────────────
if [[ ! -s "$BASE/api-key" ]]; then
  openssl rand -hex 24 > "$BASE/api-key"
  chmod 600 "$BASE/api-key"
fi

# ── 6. Run it as a service (starts at boot, restarts if it stops) ───────────
log "Service"
id -u nexora-coder >/dev/null 2>&1 || useradd --system --home "$BASE" --shell /usr/sbin/nologin nexora-coder
chown -R nexora-coder: "$BASE"
THREADS="${THREADS:-$(nproc)}"
cat > /etc/systemd/system/nexora-coder.service <<UNIT
[Unit]
Description=NexoraGuru coding model (llama.cpp)
After=network-online.target

[Service]
User=nexora-coder
ExecStart=$BASE/bin/llama-server -m $BASE/models/$FILE --alias $ALIAS --host 127.0.0.1 --port $PORT \\
  --ctx-size 18432 --parallel 3 --threads $THREADS --flash-attn auto --cache-reuse 256 \\
  --api-key-file $BASE/api-key --no-webui
Restart=always
RestartSec=3
Nice=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now nexora-coder >/dev/null
systemctl restart nexora-coder
for i in $(seq 1 60); do curl -fs "http://127.0.0.1:$PORT/health" >/dev/null && break; sleep 2; done
curl -fs "http://127.0.0.1:$PORT/health" >/dev/null || die "The model did not start: journalctl -u nexora-coder -n 50"
ok "model serving on 127.0.0.1:$PORT"

# ── 7. HTTPS (Caddy gets a free certificate) ────────────────────────────────
IP="$(curl -fs https://api.ipify.org || curl -fs https://ifconfig.me)"
DOMAIN="${DOMAIN:-${IP//./-}.sslip.io}"
log "HTTPS for $DOMAIN"
# Oracle's Ubuntu images reject everything but SSH in iptables: open 80 and 443.
for p in 80 443; do
  iptables -C INPUT -p tcp --dport $p -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport $p -j ACCEPT
done
netfilter-persistent save >/dev/null 2>&1 || true
# Each NexoraGuru service adds its own route in /etc/caddy/nexora.d (the voice
# server, deploy/voice-server, can share this server and address).
mkdir -p /etc/caddy/nexora.d
cat > /etc/caddy/nexora.d/coder.caddy <<CADDY
# NexoraGuru coding model (its own password is checked by llama-server).
@coder path /v1/* /health
handle @coder {
	reverse_proxy 127.0.0.1:$PORT {
		flush_interval -1
	}
}
CADDY
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	encode zstd gzip
	import /etc/caddy/nexora.d/*.caddy
	handle {
		respond "NexoraGuru server" 200
	}
}
CADDY
systemctl reload caddy || systemctl restart caddy
sleep 3

# ── 8. A real answer, to prove it works ─────────────────────────────────────
log "Test"
KEY="$(cat "$BASE/api-key")"
T0=$(date +%s.%N)
REPLY=$(curl -fs "http://127.0.0.1:$PORT/v1/chat/completions" -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"model":"'"$ALIAS"'","messages":[{"role":"user","content":"Write a Python one-liner that prints the sum of 1..100."}],"max_tokens":60,"temperature":0}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["choices"][0]["message"]["content"].strip()[:200])')
T1=$(date +%s.%N)
ok "answered in $(python3 -c "print(round($T1-$T0,1))") s: $REPLY"

cat <<DONE

$(printf '\033[1;32m')All done.$(printf '\033[0m') Put these in NexoraGuru → Admin → AI models → Add a provider:

  Name      My coding model
  Base URL  https://$DOMAIN/v1
  API key   $KEY
  Model     $ALIAS

Then choose it for "Code coach, AI tests and analysis".

If https://$DOMAIN doesn't open yet: in the Oracle console, open your VM's
subnet → Security List → Add Ingress Rules → source 0.0.0.0/0, TCP ports 80 and 443.
Then run this script again.
DONE
