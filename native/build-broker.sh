#!/usr/bin/env bash
# Builds the Mosquitto broker executable (and the cJSON it needs) for one Android ABI with the NDK and writes the
# stripped binary as <out-dir>/<abi>/libmosquitto_exec.so (the "lib*.so" name makes Gradle package it as a native
# library, so Android extracts it into the app's nativeLibraryDir where it can be executed).
#
# Usage: native/build-broker.sh <abi> <out-dir>      (env: ANDROID_HOME, optional ANDROID_NDK_HOME, MIN_API)
set -euo pipefail

ABI="${1:?abi (arm64-v8a, armeabi-v7a, x86_64, x86)}"
OUT="${2:?output dir}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
NDK="${ANDROID_NDK_HOME:-}"
if [ -z "$NDK" ]; then NDK="$(ls -d "$SDK"/ndk/* 2>/dev/null | sort -V | tail -1)"; fi
[ -f "$NDK/build/cmake/android.toolchain.cmake" ] || { echo "NDK not found (set ANDROID_NDK_HOME)"; exit 1; }
CMAKE="$(ls -d "$SDK"/cmake/*/bin 2>/dev/null | sort -V | tail -1)"
[ -x "$CMAKE/cmake" ] && export PATH="$CMAKE:$PATH"
API="${MIN_API:-24}"
B="$HERE/build/$ABI"
mkdir -p "$B" "$OUT/$ABI"

COMMON=(-G Ninja -DCMAKE_POLICY_VERSION_MINIMUM=3.5 -DCMAKE_TOOLCHAIN_FILE="$NDK/build/cmake/android.toolchain.cmake"
  -DANDROID_ABI="$ABI" -DANDROID_PLATFORM="android-$API" -DCMAKE_BUILD_TYPE=Release)

# cJSON (static)
cmake -S "$HERE/cjson" -B "$B/cjson" "${COMMON[@]}" -DCMAKE_INSTALL_PREFIX="$B/prefix" \
  -DENABLE_CJSON_TEST=OFF -DENABLE_CJSON_UTILS=OFF -DBUILD_SHARED_LIBS=OFF -DBUILD_SHARED_AND_STATIC_LIBS=OFF \
  -DENABLE_CJSON_VERSION_SO=OFF -DCMAKE_POSITION_INDEPENDENT_CODE=ON >/dev/null
cmake --build "$B/cjson" --target install >/dev/null

# Mosquitto broker only
cmake -S "$HERE/mosquitto" -B "$B/mosq" "${COMMON[@]}" -DCMAKE_PREFIX_PATH="$B/prefix" -DCMAKE_FIND_ROOT_PATH="$B/prefix" \
  -DWITH_TLS=OFF -DWITH_TLS_PSK=OFF -DWITH_WEBSOCKETS=OFF -DWITH_APPS=OFF -DWITH_CLIENTS=OFF -DWITH_PLUGINS=OFF \
  -DWITH_TESTS=OFF -DWITH_DOCS=OFF -DWITH_CTRL_SHELL=OFF -DWITH_SOCKS=OFF -DWITH_UNIX_SOCKETS=OFF -DWITH_LTO=OFF \
  -DWITH_HTTP_API=OFF >/dev/null
cmake --build "$B/mosq" --target mosquitto

STRIP="$(ls "$NDK"/toolchains/llvm/prebuilt/*/bin/llvm-strip | head -1)"
"$STRIP" -o "$OUT/$ABI/libmosquitto_exec.so" "$B/mosq/src/mosquitto"
ls -la "$OUT/$ABI/libmosquitto_exec.so"
