#!/usr/bin/env zsh
# Run My SPACE on Android emulator, or run tests.
# Usage:
#   ./run-emulator.sh            — boot emulator and install debug build
#   ./run-emulator.sh --unit     — run JVM unit tests (no emulator needed)
#   ./run-emulator.sh --test     — boot emulator, run instrumented tests, exit with result code

set -euo pipefail

ANDROID_HOME=/Users/cuongquachc/Library/Android/sdk
ADB=$ANDROID_HOME/platform-tools/adb
EMULATOR=$ANDROID_HOME/emulator/emulator
AVD=MySpace35

# ── Helpers ───────────────────────────────────────────────────────────────────

boot_emulator() {
  if $ADB devices | grep -q "emulator"; then
    echo "✓ Emulator already running"
    return
  fi
  echo "▶ Starting emulator $AVD..."
  ANDROID_HOME=$ANDROID_HOME $EMULATOR -avd $AVD -no-audio -no-boot-anim > /tmp/emulator.log 2>&1 &
  $ADB wait-for-device
  local waited=0
  until [ "$($ADB shell getprop sys.boot_completed 2>/dev/null)" = "1" ]; do
    sleep 3
    waited=$((waited + 3))
    if [ $waited -ge 120 ]; then
      echo "ERROR: Emulator boot timed out after 120 s" >&2; exit 1
    fi
  done
  echo "✓ Emulator ready"
}

# ── Mode dispatch ──────────────────────────────────────────────────────────────

MODE="${1:-run}"

case "$MODE" in
  --unit)
    echo "▶ Running JVM unit tests..."
    ./gradlew test
    REPORT="app/build/reports/tests/testDebugUnitTest/index.html"
    [ -f "$REPORT" ] && echo "Report: $(pwd)/$REPORT"
    ;;
  --test)
    boot_emulator
    echo "▶ Running instrumented tests..."
    ./gradlew connectedAndroidTest
    REPORT="app/build/reports/androidTests/connected/index.html"
    [ -f "$REPORT" ] && echo "Report: $(pwd)/$REPORT"
    ;;
  run|*)
    boot_emulator
    echo "▶ Building & installing app..."
    ./gradlew installDebug
    echo "▶ Launching app..."
    $ADB shell am start -n com.myspace.app/.MainActivity
    echo "✓ Done — My SPACE is running"
    ;;
esac
