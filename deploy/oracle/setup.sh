#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  One-shot (and re-runnable) setup of the API server on an Oracle Cloud
#  Always Free ARM VM (VM.Standard.A1.Flex), Ubuntu 22.04 / 24.04.
#
#  Installs: swap · Node 22 + pm2 · Docker + Piston (code runner) · Caddy
#  (HTTPS) · firewall rules for 80/443 · a `deploy` user · the app in
#  /opt/nexora, started by pm2 at boot.
#
#  Run it on the VM:
#    curl -fsSL https://raw.githubusercontent.com/Gurudeep306/Nexora/main/deploy/oracle/setup.sh -o setup.sh
#    sudo bash setup.sh
#  It is safe to run again (after filling in /opt/nexora/.env, or to update).
#
#  Settings (environment variables, all optional):
#    REPO_URL     git URL of the app           (default: https://github.com/Gurudeep306/Nexora.git)
#    BRANCH       branch to deploy             (default: main)
#    API_DOMAIN   hostname Caddy serves        (default: api.nexoraguru.in)
#    SWAP_SIZE    swap file size               (default: 4G)
#    ENABLE_PISTON=0  skip Docker/Piston (the app then uses JUDGE_MODE=remote)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Gurudeep306/Nexora.git}"
BRANCH="${BRANCH:-main}"
API_DOMAIN="${API_DOMAIN:-api.nexoraguru.in}"
SWAP_SIZE="${SWAP_SIZE:-4G}"
ENABLE_PISTON="${ENABLE_PISTON:-1}"
APP_DIR=/opt/nexora
DEPLOY_USER=deploy
PISTON_DIR=/opt/piston
NODE_MAJOR=22

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '    \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
as_deploy() { sudo -u "$DEPLOY_USER" -H env PUPPETEER_SKIP_DOWNLOAD=1 "$@"; }

[[ $EUID -eq 0 ]] || die "Run as root:  sudo bash setup.sh"
# shellcheck disable=SC1091
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || die "This script is for Ubuntu (found: ${ID:-unknown})."
ARCH="$(dpkg --print-architecture)"
log "Ubuntu ${VERSION_ID} on ${ARCH} — deploying ${REPO_URL} (${BRANCH}) for ${API_DOMAIN}"

export DEBIAN_FRONTEND=noninteractive

# ── 1. Base packages ─────────────────────────────────────────────────────────
log "Base packages"
# Keep the existing iptables rules file when iptables-persistent installs.
echo iptables-persistent iptables-persistent/autosave_v4 boolean false | debconf-set-selections
echo iptables-persistent iptables-persistent/autosave_v6 boolean false | debconf-set-selections
apt-get update -y
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg git jq openssl build-essential python3 \
  debian-keyring debian-archive-keyring apt-transport-https \
  iptables iptables-persistent netfilter-persistent
ok "base packages installed"

# ── 2. Swap (the build of native modules and Piston compiles like headroom) ──
log "Swap"
if swapon --show=NAME --noheadings | grep -q '^/swapfile$'; then
  ok "swap already on"
else
  [[ -f /swapfile ]] || fallocate -l "$SWAP_SIZE" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "swap ${SWAP_SIZE} enabled"
fi
sysctl -qw vm.swappiness=10
echo 'vm.swappiness=10' > /etc/sysctl.d/99-nexora-swap.conf

# ── 3. Firewall: open 80/443 in iptables (Oracle images REJECT everything else) ─
# Oracle's Ubuntu images ship /etc/iptables/rules.v4 with a final
# "-A INPUT -j REJECT". ufw is NOT used (Oracle advises against it on these
# images). We add ACCEPT rules before that REJECT both in the saved file (for
# reboots) and live — without `netfilter-persistent save`, which would also
# freeze Docker's own rules into the file.
log "Firewall (iptables) — allow 80/443"
RULES=/etc/iptables/rules.v4
mkdir -p /etc/iptables
[[ -f "$RULES" ]] || iptables-save > "$RULES"
for port in 80 443; do
  rule="-A INPUT -p tcp -m state --state NEW -m tcp --dport ${port} -j ACCEPT"
  if ! grep -qF -- "$rule" "$RULES"; then
    if grep -qE '^-A INPUT -j REJECT' "$RULES"; then
      # Insert before the first INPUT REJECT line.
      awk -v r="$rule" '!done && /^-A INPUT -j REJECT/ { print r; done=1 } { print }' "$RULES" > "$RULES.tmp"
    else
      # No REJECT rule: put it right before COMMIT of the *filter table.
      awk -v r="$rule" '/^\*filter/ { f=1 } f && /^COMMIT/ && !done { print r; done=1 } { print }' "$RULES" > "$RULES.tmp"
    fi
    mv "$RULES.tmp" "$RULES"
  fi
  if ! iptables -C INPUT -p tcp -m state --state NEW -m tcp --dport "$port" -j ACCEPT 2>/dev/null; then
    pos="$(iptables -L INPUT --line-numbers -n | awk '$2=="REJECT" { print $1; exit }')"
    if [[ -n "$pos" ]]; then
      iptables -I INPUT "$pos" -p tcp -m state --state NEW -m tcp --dport "$port" -j ACCEPT
    else
      iptables -A INPUT -p tcp -m state --state NEW -m tcp --dport "$port" -j ACCEPT
    fi
  fi
done
systemctl enable netfilter-persistent >/dev/null 2>&1 || true
ok "ports 80 and 443 open (also open them in the Oracle VCN security list — see the runbook)"

# ── 4. Node.js 22 + pm2 ──────────────────────────────────────────────────────
log "Node.js ${NODE_MAJOR} + pm2"
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
ok "node $(node -v)"
if ! command -v pm2 >/dev/null; then
  npm install -g pm2@latest --no-audit --no-fund
fi
ok "pm2 $(pm2 -v 2>/dev/null | tail -1)"

# ── 5. deploy user ───────────────────────────────────────────────────────────
log "User '${DEPLOY_USER}'"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
fi
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh"
touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
ok "user ready — GitHub Actions' public key goes in /home/${DEPLOY_USER}/.ssh/authorized_keys"

# ── 6. Docker + Piston ───────────────────────────────────────────────────────
if [[ "$ENABLE_PISTON" == "1" ]]; then
  log "Docker"
  if ! command -v docker >/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
      > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
  systemctl enable --now docker >/dev/null
  ok "$(docker --version)"
fi

# ── 7. The app ───────────────────────────────────────────────────────────────
log "App in ${APP_DIR}"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  as_deploy git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
  as_deploy git -C "$APP_DIR" checkout --quiet "$BRANCH"
  as_deploy git -C "$APP_DIR" merge --ff-only --quiet "origin/$BRANCH"
  ok "updated to $(as_deploy git -C "$APP_DIR" rev-parse --short HEAD)"
else
  if ! as_deploy git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR"; then
    KEY="/home/${DEPLOY_USER}/.ssh/id_ed25519"
    [[ -f "$KEY" ]] || as_deploy ssh-keygen -q -t ed25519 -N '' -C "nexora-vm-deploy-key" -f "$KEY"
    echo
    warn "Could not clone ${REPO_URL}. If the repository is private:"
    warn "  1. GitHub → repo → Settings → Deploy keys → Add deploy key (read-only), paste:"
    cat "${KEY}.pub"
    warn "  2. Re-run with the SSH URL:"
    warn "     sudo REPO_URL=git@github.com:Gurudeep306/Nexora.git bash setup.sh"
    exit 1
  fi
  ok "cloned"
fi
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/logs"
(cd "$APP_DIR" && as_deploy npm ci --omit=dev --no-audit --no-fund)
ok "dependencies installed"

ENV_FILE="$APP_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$APP_DIR/deploy/oracle/.env.example" "$ENV_FILE"
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" "$ENV_FILE"
  sed -i "s|^STUDIO_PASSWORD=.*|STUDIO_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=')|" "$ENV_FILE"
  [[ "$ENABLE_PISTON" == "1" ]] || sed -i 's|^JUDGE_MODE=.*|JUDGE_MODE=remote|' "$ENV_FILE"
  ok "created ${ENV_FILE} (random SESSION_SECRET and STUDIO_PASSWORD generated)"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"

# ── 8. Piston container + language runtimes ─────────────────────────────────
if [[ "$ENABLE_PISTON" == "1" ]]; then
  log "Piston"
  install -d "$PISTON_DIR/packages"
  IMAGE=ghcr.io/engineer-man/piston
  if [[ "$ARCH" != "amd64" ]] && ! docker manifest inspect "$IMAGE" 2>/dev/null | grep -q "\"architecture\": *\"${ARCH}\""; then
    # No official image for this CPU: build the API image from source.
    IMAGE=nexora/piston:local
    if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
      if [[ -d "$PISTON_DIR/src/.git" ]]; then
        git -C "$PISTON_DIR/src" pull --quiet --ff-only || true
      else
        git clone --quiet --depth 1 https://github.com/engineer-man/piston "$PISTON_DIR/src"
      fi
      docker build -t "$IMAGE" "$PISTON_DIR/src/api"
    fi
    ok "using locally built ${IMAGE} (${ARCH})"
  fi
  echo "PISTON_IMAGE=${IMAGE}" > "$PISTON_DIR/compose.env"
  docker compose --env-file "$PISTON_DIR/compose.env" -f "$APP_DIR/deploy/oracle/piston-compose.yml" up -d
  for _ in $(seq 1 60); do
    curl -fsS http://127.0.0.1:2000/api/v2/runtimes >/dev/null 2>&1 && break
    sleep 2
  done
  curl -fsS http://127.0.0.1:2000/api/v2/runtimes >/dev/null || die "Piston did not start: docker logs piston"
  ok "Piston API up on 127.0.0.1:2000"

  PACKAGES="$(cd "$APP_DIR" && node -p "require('./src/piston').PISTON_PACKAGES.join(' ')")"
  INDEX="$(curl -fsS http://127.0.0.1:2000/api/v2/packages || echo '[]')"
  for pkg in $PACKAGES; do
    if [[ "$(jq -r --arg n "$pkg" '[.[] | select(.language==$n and .installed)] | length' <<<"$INDEX")" != "0" ]]; then
      ok "$pkg already installed"; continue
    fi
    ver="$(jq -r --arg n "$pkg" '[.[] | select(.language==$n) | .language_version] | .[]' <<<"$INDEX" | sort -V | tail -1)"
    if [[ -z "$ver" ]]; then warn "$pkg: not in the Piston package index"; continue; fi
    if curl -fsS -m 900 -X POST http://127.0.0.1:2000/api/v2/packages \
         -H 'Content-Type: application/json' \
         -d "{\"language\":\"${pkg}\",\"version\":\"${ver}\"}" >/dev/null; then
      ok "$pkg $ver installed"
    else
      warn "$pkg $ver failed to install"
    fi
  done

  log "Piston smoke test (decides which languages run on Piston)"
  (cd "$APP_DIR" && as_deploy node deploy/oracle/piston-smoke.js --write-env) || warn "smoke test failed — check: docker logs piston"
fi

# ── 9. Caddy (HTTPS) ─────────────────────────────────────────────────────────
log "Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
install -d -o caddy -g caddy /var/log/caddy
sed "s/api\.nexoraguru\.in {/${API_DOMAIN} {/" "$APP_DIR/deploy/oracle/Caddyfile" > /etc/caddy/Caddyfile.new
if caddy validate --config /etc/caddy/Caddyfile.new --adapter caddyfile >/dev/null 2>&1; then
  mv /etc/caddy/Caddyfile.new /etc/caddy/Caddyfile
else
  caddy validate --config /etc/caddy/Caddyfile.new --adapter caddyfile || true
  die "Caddyfile is invalid (kept the old one)"
fi
systemctl enable --now caddy >/dev/null
systemctl reload caddy
ok "$(caddy version | cut -d' ' -f1) serving https://${API_DOMAIN}"

# ── 10. Start the API with pm2 (and at every boot) ──────────────────────────
log "pm2"
if ! grep -qE '^TURSO_DATABASE_URL=.+' "$ENV_FILE"; then
  warn "TURSO_DATABASE_URL is empty in ${ENV_FILE} — not starting the API yet"
  warn "(it would otherwise run on an empty local database)."
  warn "Fill in ${ENV_FILE}, then run this script again:  sudo bash setup.sh"
  exit 0
fi
if as_deploy pm2 describe nexora >/dev/null 2>&1; then
  (cd "$APP_DIR" && as_deploy pm2 reload deploy/oracle/ecosystem.config.cjs --update-env)
else
  (cd "$APP_DIR" && as_deploy pm2 start deploy/oracle/ecosystem.config.cjs)
fi
as_deploy pm2 save >/dev/null
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/${DEPLOY_USER}" >/dev/null
as_deploy pm2 install pm2-logrotate >/dev/null 2>&1 || true
ok "pm2 runs 'nexora' and starts it at boot"

for _ in $(seq 1 30); do
  curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1 && break
  sleep 2
done
if curl -fsS http://127.0.0.1:3000/api/health; then
  echo
  ok "API healthy on 127.0.0.1:3000"
else
  die "API is not answering — see: sudo -u ${DEPLOY_USER} pm2 logs nexora"
fi

log "Done"
echo "  Public check (after DNS points here):  curl https://${API_DOMAIN}/api/health"
echo "  Logs:      sudo -u ${DEPLOY_USER} pm2 logs nexora"
echo "  Config:    sudo -u ${DEPLOY_USER} nano ${ENV_FILE}   then   sudo -u ${DEPLOY_USER} pm2 reload nexora --update-env"
