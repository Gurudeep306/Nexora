#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  NexoraGuru's own voice server, on the free Oracle Cloud server.
#
#  HeadTTS (MIT) running Kokoro (Apache-2.0) on the CPU: natural Indian voices
#  (Kokoro's Hindi voices, which also speak English with an Indian accent),
#  with the exact mouth shapes for the virtual teacher's lips. Free, with no
#  company's API key and no GPL parts. Behind HTTPS and a password that this
#  script makes, which you paste into Admin → Voice recognition → Natural voice.
#
#  Made for the same Oracle "Always Free" Ampere VM as the coding model
#  (deploy/coder-model): both can run on one server and share its address.
#  Ubuntu 22.04 or 24.04.
#
#  Run it on the server:
#    curl -fsSL https://raw.githubusercontent.com/Gurudeep306/Nexora/main/deploy/voice-server/setup.sh -o voice.sh
#    sudo bash voice.sh
#  Safe to run again (to update or repair).
#
#  Settings (environment variables, all optional):
#    DOMAIN    hostname for HTTPS (default: <your-ip>.sslip.io, a free name for the IP)
#    THREADS   voice workers (default: 2; each uses about 1 GB of memory)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HEADTTS_VERSION=1.3.0
BASE=/opt/nexora-voice
PORT=8882
VOICES="hf_alpha hf_beta hm_omega hm_psi af_heart am_michael"
VOICE_URL=https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32m✓\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run as root:  sudo bash voice.sh"
# shellcheck disable=SC1091
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || die "This script is for Ubuntu (found: ${ID:-unknown})."
export DEBIAN_FRONTEND=noninteractive
mkdir -p "$BASE/voices" "$BASE/app"

# ── 1. Packages: Node.js 22 and Caddy ───────────────────────────────────────
log "Packages"
echo iptables-persistent iptables-persistent/autosave_v4 boolean false | debconf-set-selections
echo iptables-persistent iptables-persistent/autosave_v6 boolean false | debconf-set-selections
apt-get update -y
apt-get install -y --no-install-recommends ca-certificates curl gnupg openssl python3 \
  debian-keyring debian-archive-keyring apt-transport-https iptables iptables-persistent netfilter-persistent
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
if ! command -v caddy >/dev/null; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
ok "Node.js $(node -v) and Caddy installed"

# ── 2. HeadTTS (a pinned version) and the voices ────────────────────────────
log "HeadTTS $HEADTTS_VERSION"
cd "$BASE/app"
[[ -f package.json ]] || echo '{ "name": "nexora-voice", "private": true }' > package.json
npm install --omit=dev --no-audit --no-fund "@met4citizen/headtts@$HEADTTS_VERSION" >/dev/null
APP="$BASE/app/node_modules/@met4citizen/headtts"
mkdir -p "$BASE/app/node_modules/@huggingface/transformers/.cache"
for v in $VOICES; do
  [[ -s "$BASE/voices/$v.bin" ]] || curl -fL --retry 5 -o "$BASE/voices/$v.bin" "$VOICE_URL/$v.bin"
done
ok "voices: $VOICES"

# ── 3. Settings and the password (made once, kept) ─────────────────────────
if [[ ! -s "$BASE/api-key" ]]; then
  openssl rand -hex 24 > "$BASE/api-key"
  chmod 600 "$BASE/api-key"
fi
THREADS="${THREADS:-2}"
cat > "$BASE/headtts-node.json" <<JSON
{
  "server": { "port": $PORT, "websocket": false, "rest": true, "corsOrigin": null, "connectionTimeout": 20000 },
  "tts": {
    "threads": $THREADS,
    "device": "cpu",
    "dtype": "fp32",
    "dictionaryPath": "$APP/dictionaries",
    "voicePath": "$BASE/voices",
    "voices": ["hf_alpha", "hm_omega"],
    "defaults": { "voice": "hf_alpha", "language": "en-us", "speed": 1, "audioEncoding": "wav" }
  }
}
JSON

# ── 4. Run it as a service (starts at boot, restarts if it stops) ───────────
log "Service"
id -u nexora-voice >/dev/null 2>&1 || useradd --system --home "$BASE" --shell /usr/sbin/nologin nexora-voice
chown -R nexora-voice: "$BASE"
chown root: "$BASE/api-key"
cat > /etc/systemd/system/nexora-voice.service <<UNIT
[Unit]
Description=NexoraGuru voice server (HeadTTS + Kokoro)
After=network-online.target

[Service]
User=nexora-voice
WorkingDirectory=$APP
ExecStart=/usr/bin/node ./modules/headtts-node.mjs --config $BASE/headtts-node.json
Restart=always
RestartSec=3
Nice=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now nexora-voice >/dev/null
systemctl restart nexora-voice

# Only this machine may reach the voice port; the world comes in through HTTPS with the password.
iptables -C INPUT -p tcp --dport $PORT ! -s 127.0.0.1 -j DROP 2>/dev/null || iptables -I INPUT 1 -p tcp --dport $PORT ! -s 127.0.0.1 -j DROP
for p in 80 443; do
  iptables -C INPUT -p tcp --dport $p -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport $p -j ACCEPT
done
netfilter-persistent save >/dev/null 2>&1 || true

# ── 5. The first sentence (it downloads the model, about 330 MB, once) ─────
log "First sentence (downloading the voice model the first time, a few minutes)"
say() {
  curl -fs -m 600 "http://127.0.0.1:$PORT/v1/synthesize" -H 'Content-Type: application/json' \
    -d '{"input":"Namaste! I am your NexoraGuru teacher.","voice":"hf_alpha","language":"en-us","speed":1,"audioEncoding":"wav"}'
}
for i in $(seq 1 60); do curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 2; done
T0=$(date +%s.%N)
REPLY="$(say)" || die "The voice server did not answer: journalctl -u nexora-voice -n 50"
T1=$(date +%s.%N)
echo "$REPLY" | python3 -c 'import json,sys; j=json.load(sys.stdin); assert j.get("audio") and j.get("visemes"), j.get("error")' \
  || die "The voice server answered without audio: journalctl -u nexora-voice -n 50"
ok "spoke ($(python3 -c "print(round($T1-$T0,1))") s, including the model download)"

# ── 6. HTTPS (Caddy), shared with the coding model if it is here ────────────
IP="$(curl -fs https://api.ipify.org || curl -fs https://ifconfig.me)"
DOMAIN="${DOMAIN:-${IP//./-}.sslip.io}"
log "HTTPS for $DOMAIN"
KEY="$(cat "$BASE/api-key")"
mkdir -p /etc/caddy/nexora.d
cat > /etc/caddy/nexora.d/voice.caddy <<CADDY
# NexoraGuru voice server: only with its password.
@voice path /voice/*
handle @voice {
	@authed header Authorization "Bearer $KEY"
	handle @authed {
		uri strip_prefix /voice
		reverse_proxy 127.0.0.1:$PORT
	}
	handle {
		respond "Wrong or missing password" 401
	}
}
CADDY
chmod 640 /etc/caddy/nexora.d/voice.caddy
chgrp caddy /etc/caddy/nexora.d/voice.caddy 2>/dev/null || true
# The coding model's route, if it is installed on this server too.
if [[ -d /opt/nexora-coder ]] && [[ ! -f /etc/caddy/nexora.d/coder.caddy ]]; then
  cat > /etc/caddy/nexora.d/coder.caddy <<'CADDY'
# NexoraGuru coding model (its own password is checked by llama-server).
@coder path /v1/* /health
handle @coder {
	reverse_proxy 127.0.0.1:8081 {
		flush_interval -1
	}
}
CADDY
fi
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	encode zstd gzip
	import /etc/caddy/nexora.d/*.caddy
	handle {
		respond "NexoraGuru server" 200
	}
}
CADDY
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null || die "Caddy settings are wrong: caddy validate --config /etc/caddy/Caddyfile"
systemctl reload caddy || systemctl restart caddy
sleep 4
if curl -fs -m 120 "https://$DOMAIN/voice/v1/synthesize" -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"input":"Hello.","voice":"hm_omega","language":"en-us","speed":1,"audioEncoding":"wav"}' -o /dev/null; then
  ok "https://$DOMAIN answers"
else
  printf '    \033[33m!\033[0m https://%s did not answer yet (see the note below)\n' "$DOMAIN"
fi

cat <<DONE

$(printf '\033[1;32m')All done.$(printf '\033[0m') Put these in NexoraGuru → Admin → Voice recognition → Natural voice:

  Voice server address   https://$DOMAIN
  Password               $KEY

Then press Save, and Test in English / Test in Hindi.

If https://$DOMAIN doesn't open yet: in the Oracle console, open your VM's
subnet → Security List → Add Ingress Rules → source 0.0.0.0/0, TCP ports 80 and 443.
Then run this script again.
DONE
