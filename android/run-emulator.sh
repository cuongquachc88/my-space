#!/bin/zsh
# Run My SPACE on Android emulator
# Usage: ./run-emulator.sh

ANDROID_HOME=/Users/cuongquachc/Library/Android/sdk
ADB=$ANDROID_HOME/platform-tools/adb
EMULATOR=$ANDROID_HOME/emulator/emulator
AVD=MySpace35

# Check if emulator already running
if $ADB devices | grep -q "emulator"; then
  echo "✓ Emulator already running"
else
  echo "▶ Starting emulator $AVD..."
  ANDROID_HOME=$ANDROID_HOME $EMULATOR -avd $AVD -no-audio -no-boot-anim > /tmp/emulator.log 2>&1 &

  echo "⏳ Waiting for boot..."
  $ADB wait-for-device
  until [ "$($ADB shell getprop sys.boot_completed 2>/dev/null)" = "1" ]; do
    sleep 3
  done
  echo "✓ Emulator ready"
fi

echo "▶ Building & installing app..."
./gradlew installDebug

echo "▶ Launching app..."
$ADB shell am start -n com.myspace.app/.MainActivity

echo "✓ Done — My SPACE is running"
