#!/bin/bash
set -euo pipefail

echo "🚀 SemaSlim Mobile Build Script"
echo "================================"
echo ""

build_web() {
  echo "📦 Building web application..."
  npm run build
  echo "✅ Build completed successfully"
}

sync_capacitor() {
  echo "🔄 Syncing with Capacitor..."
  npx cap sync
}

add_ios() {
  echo "🍎 Adding iOS platform..."
  npx cap add ios
}

add_android() {
  echo "🤖 Adding Android platform..."
  npx cap add android
}

open_ios() {
  echo "🍎 Opening iOS project in Xcode..."
  npx cap open ios
}

open_android() {
  echo "🤖 Opening Android project in Android Studio..."
  npx cap open android
}

case "$1" in
  "sync")
    build_web
    sync_capacitor
    ;;
  "ios")
    if [ ! -d "ios" ]; then
      add_ios
    fi
    open_ios
    ;;
  "android")
    if [ ! -d "android" ]; then
      add_android
    fi
    open_android
    ;;
  "add-ios")
    add_ios
    ;;
  "add-android")
    add_android
    ;;
  *)
    echo "Usage: ./mobile-build.sh [command]"
    echo ""
    echo "Commands:"
    echo "  sync         - Build web app and sync to mobile platforms"
    echo "  ios          - Open iOS project (adds platform if needed)"
    echo "  android      - Open Android project (adds platform if needed)"
    echo "  add-ios      - Add iOS platform only"
    echo "  add-android  - Add Android platform only"
    echo ""
    echo "Examples:"
    echo "  ./mobile-build.sh sync"
    echo "  ./mobile-build.sh ios"
    echo "  ./mobile-build.sh android"
    ;;
esac
