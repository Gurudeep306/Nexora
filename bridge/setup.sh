#!/usr/bin/env bash
# Nexora Hive — always-on worker setup.
#
#   curl -fsSL https://nexoraguru.in/api/hive-bridge/setup.sh | bash -s -- --server https://nexoraguru.in --token hvm_… [--root ~/code] [--no-agents]
#
# Installs (when missing) Node.js 22, git, Claude Code and Codex, downloads the
# Hive bridge, and runs it as a service that starts on boot and restarts on
# failure. Re-running it is safe (it updates in place). It does not sign in to
# Claude or Codex for you — the last lines tell you how (once, from any device).
set -euo pipefail

SERVER=""
TOKEN=""
ROOT="$HOME/code"
AGENTS=1
while [ $# -gt 0 ]; do
  case "$1" in
    --server) SERVER="${2%/}"; shift 2 ;;
    --token) TOKEN="$2"; shift 2 ;;
    --root) ROOT="$2"; shift 2 ;;
    --no-agents) AGENTS=0; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done
if [ -z "$SERVER" ] || [ -z "$TOKEN" ]; then
  echo "Usage: setup.sh --server https://your-site --token hvm_… [--root ~/code]"
  exit 1
fi

say() { printf '\n\033[1;35m▸ %s\033[0m\n' "$1"; }
SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then SUDO="sudo"; fi

say "Checking Node.js"
NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"; fi
if [ "$NODE_MAJOR" -lt 18 ]; then
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash -
    $SUDO apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | $SUDO bash -
    $SUDO dnf install -y nodejs
  elif command -v brew >/dev/null 2>&1; then
    brew install node@22
  else
    echo "Install Node.js 18+ (https://nodejs.org) and run this again."; exit 1
  fi
fi
echo "node $(node -v)"

say "Checking git"
if ! command -v git >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then $SUDO apt-get install -y git;
  elif command -v dnf >/dev/null 2>&1; then $SUDO dnf install -y git;
  elif command -v brew >/dev/null 2>&1; then brew install git; fi
fi
git --version

NPM_PREFIX=""
if [ ! -w "$(npm prefix -g 2>/dev/null || echo /usr/local)/lib" ] && [ -z "$SUDO" ]; then
  NPM_PREFIX="$HOME/.npm-global"; mkdir -p "$NPM_PREFIX"; npm config set prefix "$NPM_PREFIX"
  export PATH="$NPM_PREFIX/bin:$PATH"
  grep -q npm-global "$HOME/.profile" 2>/dev/null || echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$HOME/.profile"
fi
npm_i() { if [ -n "$SUDO" ] && [ -z "$NPM_PREFIX" ]; then $SUDO npm install -g "$@"; else npm install -g "$@"; fi; }

if [ "$AGENTS" = "1" ]; then
  say "Installing / updating Claude Code and Codex"
  npm_i @anthropic-ai/claude-code@latest @openai/codex@latest || echo "(could not install the agent CLIs — you can install them later)"
fi

say "Downloading the Hive bridge"
mkdir -p "$HOME/.hive" "$ROOT"
curl -fsSL -H "Authorization: Bearer $TOKEN" "$SERVER/api/hive-bridge/script" -o "$HOME/.hive/hive-bridge.js"
chmod 600 "$HOME/.hive/hive-bridge.js"
umask 077
cat > "$HOME/.hive/bridge.env" <<EOF
HIVE_SERVER=$SERVER
HIVE_TOKEN=$TOKEN
HIVE_ROOT=$ROOT
EOF

NODE_BIN="$(command -v node)"
say "Running the bridge as a service"
if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
  UNIT_DIR="$HOME/.config/systemd/user"
  mkdir -p "$UNIT_DIR"
  cat > "$UNIT_DIR/hive-bridge.service" <<EOF
[Unit]
Description=Nexora Hive bridge
After=network-online.target

[Service]
EnvironmentFile=$HOME/.hive/bridge.env
Environment=PATH=$(dirname "$NODE_BIN"):${NPM_PREFIX:+$NPM_PREFIX/bin:}/usr/local/bin:/usr/bin:/bin
ExecStart=$NODE_BIN $HOME/.hive/hive-bridge.js --root $ROOT
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF
  loginctl enable-linger "$(id -un)" 2>/dev/null || $SUDO loginctl enable-linger "$(id -un)" 2>/dev/null || true
  systemctl --user daemon-reload
  systemctl --user enable --now hive-bridge.service
  systemctl --user restart hive-bridge.service
  sleep 2
  systemctl --user --no-pager status hive-bridge.service | head -5 || true
else
  npm_i pm2 >/dev/null 2>&1 || true
  set -a; . "$HOME/.hive/bridge.env"; set +a
  pm2 delete hive-bridge >/dev/null 2>&1 || true
  pm2 start "$HOME/.hive/hive-bridge.js" --name hive-bridge -- --root "$ROOT"
  pm2 save
  pm2 startup 2>/dev/null | tail -1 || true
fi

say "Done — this machine now shows as online in Hive → Machines."
cat <<'EOF'

Next (once): sign the agent CLIs in to your own plans.

  Claude Code:  claude setup-token     → paste the token in Hive (Keys → Subscription agents)
                (or: claude auth login)
  Codex:        codex login --device-auth   → open the link on your phone and approve

Then in Hive: Keys → Subscription agents → Connect, pick this machine.
Clone projects into the root folder from Hive → Machines → Folders & clone.
EOF
