#!/usr/bin/env bash
# Signs and builds the release AAB for My SPACE Android.
# Usage:
#   KEYSTORE_PATH=keys/myspace-release.jks \
#   STORE_PASSWORD=... \
#   KEY_ALIAS=myspace \
#   KEY_PASSWORD=... \
#   ./android/build-release.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROPS_FILE="$SCRIPT_DIR/keystore.properties"

# ── Validate required env vars ────────────────────────────────────────────────
for var in KEYSTORE_PATH STORE_PASSWORD KEY_ALIAS KEY_PASSWORD; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: $var is not set" >&2
    exit 1
  fi
done

if [[ ! -f "$REPO_ROOT/$KEYSTORE_PATH" ]] && [[ ! -f "$KEYSTORE_PATH" ]]; then
  echo "ERROR: Keystore not found at $KEYSTORE_PATH" >&2
  exit 1
fi

KEYSTORE_ABS="$(cd "$(dirname "$KEYSTORE_PATH")" && pwd)/$(basename "$KEYSTORE_PATH")"

# ── Write keystore.properties (cleaned up on exit) ───────────────────────────
cleanup() { rm -f "$PROPS_FILE"; }
trap cleanup EXIT

# Create owner-only before writing secrets (prevents other users reading it during the build window)
( umask 077 && : > "$PROPS_FILE" )
cat > "$PROPS_FILE" <<EOF
storeFile=$KEYSTORE_ABS
storePassword=$STORE_PASSWORD
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASSWORD
EOF

# ── Build ─────────────────────────────────────────────────────────────────────
echo "▶ Building release AAB..."
cd "$SCRIPT_DIR"
./gradlew bundleRelease

# ── Copy output ───────────────────────────────────────────────────────────────
VERSION=$(grep 'versionName' "$SCRIPT_DIR/app/build.gradle.kts" | head -1 | grep -oP '"[^"]+"' | tr -d '"')
OUTDIR="$SCRIPT_DIR/output"
mkdir -p "$OUTDIR"
AAB_SRC="$SCRIPT_DIR/app/build/outputs/bundle/release/app-release.aab"
AAB_DST="$OUTDIR/myspace-$VERSION.aab"
cp "$AAB_SRC" "$AAB_DST"

echo "✓ AAB: $AAB_DST"
echo "SHA-256: $(shasum -a 256 "$AAB_DST" | awk '{print $1}')"
