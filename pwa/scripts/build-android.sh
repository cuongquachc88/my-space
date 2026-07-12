#!/usr/bin/env bash
# Build Android APK with auto version bump, output to pwa/output/android/
set -e

# Use Java 21 (required by Capacitor Android / AGP)
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.9/libexec/openjdk.jdk/Contents/Home

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PWA_DIR="$(dirname "$SCRIPT_DIR")"
ANDROID_DIR="$PWA_DIR/android"
OUTPUT_DIR="$PWA_DIR/output/android"
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"

# ── 1. Bump versionCode and versionName in build.gradle ──────────────────────
CURRENT_CODE=$(grep 'versionCode ' "$BUILD_GRADLE" | head -1 | grep -o '[0-9]*')
CURRENT_NAME=$(grep 'versionName ' "$BUILD_GRADLE" | head -1 | grep -o '"[^"]*"' | tr -d '"')

NEW_CODE=$((CURRENT_CODE + 1))

# Bump patch version: 1.0 → 1.1, 1.9 → 1.10
MAJOR=$(echo "$CURRENT_NAME" | cut -d. -f1)
MINOR=$(echo "$CURRENT_NAME" | cut -d. -f2)
NEW_MINOR=$((MINOR + 1))
NEW_NAME="$MAJOR.$NEW_MINOR"

echo "▸ Bumping version: $CURRENT_NAME ($CURRENT_CODE) → $NEW_NAME ($NEW_CODE)"

sed -i '' "s/versionCode $CURRENT_CODE/versionCode $NEW_CODE/" "$BUILD_GRADLE"
sed -i '' "s/versionName \"$CURRENT_NAME\"/versionName \"$NEW_NAME\"/" "$BUILD_GRADLE"

# ── 2. Web build ─────────────────────────────────────────────────────────────
echo "▸ Building web assets..."
cd "$PWA_DIR"
npm run build

# ── 3. Capacitor sync ────────────────────────────────────────────────────────
echo "▸ Syncing Capacitor..."
npx cap sync android

# ── 4. Build debug APK ───────────────────────────────────────────────────────
echo "▸ Building Android APK (debug)..."
cd "$ANDROID_DIR"
./gradlew assembleDebug --quiet

# ── 5. Copy APK to output ────────────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"
APK_SRC="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
APK_DST="$OUTPUT_DIR/my-space-$NEW_NAME-$NEW_CODE.apk"
cp "$APK_SRC" "$APK_DST"

echo "✓ APK ready: $APK_DST"
echo "  versionCode: $NEW_CODE  |  versionName: $NEW_NAME"
