#!/bin/bash
# One-shot: put the CI/backup/Codespaces files in place and upload Nexora to GitHub.
# Run from Terminal:  bash ~/Desktop/Projects/nexora/deploy-setup/ship.sh
set -e
cd "$(dirname "$0")/.."
echo "▶ Nexora → GitHub"

command -v git >/dev/null 2>&1 || { echo "✗ git is missing. Run: xcode-select --install  (then re-run this script)"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "✗ Node/npm is missing. Install Node 22+ first."; exit 1; }

# 1) Files Claude wasn't allowed to write directly
mkdir -p .github/workflows .devcontainer
[ -f deploy-setup/ci.yml ] && mv -f deploy-setup/ci.yml deploy-setup/backup.yml .github/workflows/
[ -f deploy-setup/devcontainer.json ] && mv -f deploy-setup/devcontainer.json .devcontainer/
echo "✓ workflows in .github/, Codespaces config in .devcontainer/"

# 2) Install exactly what the lockfile says (adds @libsql/client; doesn't rewrite the lockfile)
PUPPETEER_SKIP_DOWNLOAD=1 npm ci --no-audit --no-fund >/dev/null
echo "✓ dependencies installed"

# 3) Git identity (only asked once, if missing)
if [ -z "$(git config user.name)" ]; then read -rp "Your name for git commits: " n; git config --global user.name "$n"; fi
if [ -z "$(git config user.email)" ]; then read -rp "Your GitHub email: " e; git config --global user.email "$e"; fi

# 4) Safety: never upload secrets or the database
for f in .env tracker.db; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then git rm --cached -q "$f"; fi
done

# 5) Commit + push (main = live site, staging = test site)
git add -A
git reset -q deploy-setup 2>/dev/null || true
git commit -q -m "Deploy-ready: new React client, Turso cloud DB, Render blueprint, CI/CD" || echo "(nothing new to commit)"
echo "▶ Uploading… (if asked for a password, paste a GitHub token — see below)"
if git push -u origin main && git push origin main:staging; then
  echo ""
  echo "✅ Uploaded to https://github.com/Gurudeep306/Nexora (branches: main, staging)"
  echo "   Next: tell Claude \"pushed\" — it will walk you through Turso + Render."
else
  echo ""
  echo "✗ Push was refused. Easiest fix:"
  echo "  1. Open https://github.com/settings/tokens/new?scopes=repo,workflow&description=nexora-mac"
  echo "  2. Generate token → copy it"
  echo "  3. Re-run this script; when git asks: Username = Gurudeep306, Password = paste the token"
fi
