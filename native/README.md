# Native sources for the local broker

The app's local broker is [Eclipse Mosquitto](https://github.com/eclipse-mosquitto/mosquitto) built with the Android NDK.
Build it with `native/build-broker.sh <abi> <out-dir>` (needs `ANDROID_HOME`, NDK and CMake); the `withLocalBroker` Expo
config plugin runs it for `arm64-v8a` during `expo prebuild`. The output in `native/build` is git-ignored.

| Directory | Upstream | Version | Changes |
|---|---|---|---|
| `mosquitto` | https://github.com/eclipse-mosquitto/mosquitto (tag `v2.1.2`) | 2.1.2 | One patch, see below |
| `cjson` | https://github.com/DaveGamble/cJSON (tag `v1.7.18`) | 1.7.18 | None |

The sources were compared with the upstream release tarballs. Only the hidden repository files (`.git*`, `.github`,
`.editorconfig`, ...) that the tarballs leave out differ in `cjson`.

## Patch to Mosquitto

`mosquitto/libcommon/random_common.c`: when built without TLS for Android (`!WITH_TLS && __ANDROID__`), random bytes are
read from `/dev/urandom` instead of `getrandom()`, because Android's libc only provides `getrandom()` from API 28 and the
build targets API 24. The change is marked with a `Patch:` comment. Nothing else in Mosquitto is modified.

## Build configuration

TLS, TLS-PSK, WebSockets, the client tools, plugins, the control shell, SOCKS and the HTTP API are all switched off:
the broker listens on plain TCP only. Only the `mosquitto` executable is built, then stripped and packaged as
`libmosquitto_exec.so` so Android extracts it into the app's native library directory, where it can be executed.

## Licenses

Mosquitto is dual licensed under the Eclipse Public License 2.0 and the Eclipse Distribution License 1.0
(`mosquitto/LICENSE.txt`, `mosquitto/edl-v10`, `mosquitto/epl-v20`); cJSON is MIT (`cjson/LICENSE`). Both keep their
license files here. The broker runs as a separate process, not linked into the app, and is distributed in the APK next to it.
