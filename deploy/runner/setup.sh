#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Turn one Ubuntu machine (22.04 / 24.04, x86 or ARM) into a Nexora code
#  runner: Docker + Piston + every judge language, behind Caddy (HTTPS) that
#  only lets in requests carrying the runner's password.
#
#  Works the same on Oracle Always Free, Hetzner and AWS. Run several of these
#  and list them all in PISTON_URL — each one backs up the others, and the free
#  public sandboxes stay behind them (docs/ops/fast-judge.md).
#
#  Run it on the machine:
#    curl -fsSL https://raw.githubusercontent.com/Gurudeep306/Nexora/main/deploy/runner/setup.sh -o setup.sh
#    sudo bash setup.sh
#  Safe to run again (it keeps the password and adds missing languages).
#
#  Settings (environment variables, all optional):
#    RUNNER_DOMAIN  hostname to serve   (default: <public-ip>.sslip.io — free,
#                                         no DNS setup; Caddy gets the HTTPS
#                                         certificate by itself)
#    SWAP_SIZE      swap file size      (default: 4G; small machines need it)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SWAP_SIZE="${SWAP_SIZE:-4G}"
PISTON_DIR=/opt/piston
RAW=https://raw.githubusercontent.com/Gurudeep306/Nexora/main

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '    \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run as root:  sudo bash setup.sh"
# shellcheck disable=SC1091
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || die "This script is for Ubuntu (found: ${ID:-unknown})."
ARCH="$(dpkg --print-architecture)"
export DEBIAN_FRONTEND=noninteractive

# ── 1. Base packages ─────────────────────────────────────────────────────────
log "Base packages (Ubuntu ${VERSION_ID}, ${ARCH})"
echo iptables-persistent iptables-persistent/autosave_v4 boolean false | debconf-set-selections
echo iptables-persistent iptables-persistent/autosave_v6 boolean false | debconf-set-selections
apt-get update -y
apt-get install -y --no-install-recommends ca-certificates curl gnupg git jq openssl \
  debian-keyring debian-archive-keyring apt-transport-https iptables iptables-persistent
ok "installed"

# ── 2. Swap: compilers on a 1–4 GB machine need headroom ─────────────────────
log "Swap"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l "$SWAP_SIZE" /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
ok "$(swapon --show --noheadings | awk '{print $3}' | head -1) swap"

# ── 3. Firewall: open 80/443 (Oracle images reject everything else) ──────────
log "Firewall — allow 80 and 443"
RULES=/etc/iptables/rules.v4
mkdir -p /etc/iptables
[[ -f "$RULES" ]] || iptables-save > "$RULES"
for port in 80 443; do
  rule="-A INPUT -p tcp -m state --state NEW -m tcp --dport ${port} -j ACCEPT"
  if ! grep -qF -- "$rule" "$RULES" && grep -qE '^-A INPUT -j REJECT' "$RULES"; then
    awk -v r="$rule" '!done && /^-A INPUT -j REJECT/ { print r; done=1 } { print }' "$RULES" > "$RULES.tmp" && mv "$RULES.tmp" "$RULES"
  fi
  if ! iptables -C INPUT -p tcp -m state --state NEW -m tcp --dport "$port" -j ACCEPT 2>/dev/null; then
    pos="$(iptables -L INPUT --line-numbers -n | awk '$2=="REJECT" { print $1; exit }')"
    if [[ -n "$pos" ]]; then iptables -I INPUT "$pos" -p tcp -m state --state NEW -m tcp --dport "$port" -j ACCEPT; fi
  fi
done
ok "open here (also allow 80 and 443 in your cloud's firewall / security group)"

# ── 4. Docker ────────────────────────────────────────────────────────────────
log "Docker"
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
systemctl enable --now docker >/dev/null 2>&1 || true
ok "$(docker --version)"

# ── 5. Piston ────────────────────────────────────────────────────────────────
log "Piston"
install -d "$PISTON_DIR/packages"
curl -fsSL "$RAW/deploy/oracle/piston-compose.yml" -o "$PISTON_DIR/piston-compose.yml"
IMAGE=ghcr.io/engineer-man/piston
if [[ "$ARCH" != "amd64" ]] && ! docker manifest inspect "$IMAGE" 2>/dev/null | grep -q "\"architecture\": *\"${ARCH}\""; then
  # No official image for this CPU: build the API image from source.
  IMAGE=nexora/piston:local
  if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    [[ -d "$PISTON_DIR/src/.git" ]] || git clone --quiet --depth 1 https://github.com/engineer-man/piston "$PISTON_DIR/src"
    docker build -t "$IMAGE" "$PISTON_DIR/src/api"
  fi
  ok "using locally built ${IMAGE} (${ARCH})"
fi
echo "PISTON_IMAGE=${IMAGE}" > "$PISTON_DIR/compose.env"
docker compose --env-file "$PISTON_DIR/compose.env" -f "$PISTON_DIR/piston-compose.yml" up -d
for _ in $(seq 1 60); do curl -fsS http://127.0.0.1:2000/api/v2/runtimes >/dev/null 2>&1 && break; sleep 2; done
curl -fsS http://127.0.0.1:2000/api/v2/runtimes >/dev/null || die "Piston did not start: docker logs piston"
ok "Piston up on 127.0.0.1:2000 (not reachable from outside)"

# ── 6. Languages (the same list as src/piston.js PISTON_PACKAGES) ────────────
log "Languages (this takes 10–30 minutes the first time)"
PACKAGES="gcc python java node typescript mono go rust kotlin ruby php perl lua bash rscript scala swift dart pwsh julia dotnet clojure freepascal elixir haskell ocaml dmd nim zig crystal groovy sbcl"
INDEX="$(curl -fsS http://127.0.0.1:2000/api/v2/packages || echo '[]')"
for pkg in $PACKAGES; do
  if [[ "$(jq -r --arg n "$pkg" '[.[] | select(.language==$n and .installed)] | length' <<<"$INDEX")" != "0" ]]; then
    ok "$pkg already installed"; continue
  fi
  ver="$(jq -r --arg n "$pkg" '[.[] | select(.language==$n) | .language_version] | .[]' <<<"$INDEX" | sort -V | tail -1)"
  if [[ -z "$ver" ]]; then warn "$pkg: not offered by Piston"; continue; fi
  if curl -fsS -m 900 -X POST http://127.0.0.1:2000/api/v2/packages -H 'Content-Type: application/json' \
       -d "{\"language\":\"${pkg}\",\"version\":\"${ver}\"}" >/dev/null; then
    ok "$pkg $ver"
  else
    warn "$pkg $ver failed to install"
  fi
done

# ── 7. Password + Caddy (HTTPS, password check) ──────────────────────────────
log "Password and HTTPS"
[[ -s "$PISTON_DIR/token" ]] || openssl rand -hex 32 > "$PISTON_DIR/token"
chmod 600 "$PISTON_DIR/token"
TOKEN="$(cat "$PISTON_DIR/token")"
if [[ -z "${RUNNER_DOMAIN:-}" ]]; then
  IP="$(curl -4 -fsS https://checkip.amazonaws.com | tr -d '[:space:]')" || die "Could not find this machine's public IP; set RUNNER_DOMAIN"
  RUNNER_DOMAIN="${IP//./-}.sslip.io"
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi
cat > /etc/caddy/Caddyfile <<EOF
# Nexora code runner. Only requests with the runner's password get through.
${RUNNER_DOMAIN} {
	@ok header Authorization "Bearer ${TOKEN}"
	handle @ok {
		reverse_proxy 127.0.0.1:2000
	}
	respond 401
}
EOF
chmod 640 /etc/caddy/Caddyfile && chown root:caddy /etc/caddy/Caddyfile
systemctl enable caddy >/dev/null 2>&1 || true
systemctl reload caddy 2>/dev/null || systemctl restart caddy
ok "serving https://${RUNNER_DOMAIN}"

# ── 8. Check it from outside, the way Nexora will call it ────────────────────
log "Checking"
sleep 5
code="$(curl -s -o /dev/null -w '%{http_code}' -m 60 "https://${RUNNER_DOMAIN}/api/v2/runtimes" -H "Authorization: Bearer ${TOKEN}" || true)"
if [[ "$code" == "200" ]]; then ok "reachable over HTTPS with the password"
else warn "HTTPS answered '${code}'. Open ports 80 and 443 in the cloud firewall, wait a minute, then run this script again."; fi
deny="$(curl -s -o /dev/null -w '%{http_code}' -m 30 "https://${RUNNER_DOMAIN}/api/v2/runtimes" || true)"
[[ "$deny" == "401" ]] && ok "refuses anyone without the password"
echo "    languages ready: $(curl -fsS http://127.0.0.1:2000/api/v2/runtimes | jq -r '[.[].language] | unique | join(", ")')"

cat <<EOF

────────────────────────────────────────────────────────────────────────
 Done. Put these in Render → nexora → Environment:

   PISTON_URL    https://${RUNNER_DOMAIN}
   PISTON_TOKEN  ${TOKEN}

 With several runners, join them with commas in the same order, e.g.
   PISTON_URL    https://a.sslip.io,https://b.sslip.io
   PISTON_TOKEN  tokenA,tokenB
 and set JUDGE_MODE to piston. Show the password again any time:
   sudo cat ${PISTON_DIR}/token
────────────────────────────────────────────────────────────────────────
EOF
