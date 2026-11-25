#!/usr/bin/env bash
# Copy HeadTTS's in-browser files (MIT licence) into client/public/headtts at a
# pinned version, so its Web Worker loads from our own address (the site's
# CSP allows workers from 'self' only). Run again to update the version.
#   bash scripts/teacher/vendor-headtts.sh [version]
set -euo pipefail
VERSION="${1:-1.3.0}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/client/public/headtts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
( cd "$TMP" && npm pack --silent "@met4citizen/headtts@$VERSION" >/dev/null && tar xzf ./*.tgz )
rm -rf "$DEST"
mkdir -p "$DEST/modules" "$DEST/dictionaries"
# Only what the browser needs: the client, its worker, the English language module and helpers.
for f in headtts.mjs worker-tts.mjs language.mjs language-en-us.mjs utils.mjs; do
  cp "$TMP/package/modules/$f" "$DEST/modules/$f"
done
cp "$TMP/package/dictionaries/en-us.txt" "$DEST/dictionaries/en-us.txt"
cp "$TMP/package/LICENSE" "$DEST/LICENSE"
echo "$VERSION" > "$DEST/VERSION"
echo "HeadTTS $VERSION copied to client/public/headtts"
