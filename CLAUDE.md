# myDevice MQTT

React Native (Expo, dev client) + TypeScript MQTT dashboard for Android. Package `dev.marcelo.mqttiot`.

## Commands

- `npx tsc --noEmit` - typecheck.
- `npx jest --testPathIgnorePatterns mosquitto.integration` - unit tests. The integration test needs a reachable public broker, so skip it offline.
- `npx tsx tools/publish-demo.ts widgets broker.emqx.io` - publish the demo dashboard (import topic `mqttiot/demo/widgets`) and retained widget values. The `history` mode publishes a noisy sine every 5 s for 5 minutes to feed the `historyChart` widget.
- `npx expo install --check` - keep the Expo packages on the versions the SDK expects. A mismatch (e.g. `expo` older than `expo-modules-core`) broke `expo-sqlite` in release builds ("Shared class NativeDatabase is not registered"); R8 was not the cause.
- Android build (the `android/` folder is generated and git-ignored):
  - `export JAVA_HOME=~/android-studio/jbr ANDROID_HOME=~/Android/Sdk`
  - `cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`
  - The release keystore (the same one stored in the GitHub secret `KEYSTORE_BASE64`) lives in `secrets/mydevice-mqtt-release.jks`, which is git-ignored. `~/.gradle/gradle.properties` holds `MYDEVICE_STORE_FILE` (pointing to it), `MYDEVICE_STORE_PASSWORD`, `MYDEVICE_KEY_ALIAS` (`mydevice`) and `MYDEVICE_KEY_PASSWORD`. Never commit the keystore or its passwords.
  - Without `MYDEVICE_STORE_FILE` the release falls back to the debug keystore; a build signed differently from the installed one needs `adb uninstall dev.marcelo.mqttiot` first (this wipes app data).

## Layout

- `src/domain` - data model, tile and widget logic, JSONPath, import/export JSON. Pure, fully unit tested.
- `src/mqtt` - MQTT 3.1.1 client built on MQTT.js (`mqtt` package, `MqttClient.ts`), reconnecting connection, and the TCP/TLS and WebSocket transports it runs over (`transportStream.ts` adapts them to a stream). `fakeBroker.ts` is the in-memory broker used by the tests.
- `src/scripting` - the `event` / `app` JavaScript hook API.
- `src/history` - SQLite history (`expo-sqlite`, `history.db`, table `samples(metric_id, ts, value)`): `HistoryDb` interface with an in-memory fake for tests, the recorder (honors `minInterval`, prunes by the widget window), downsampling and chart axis helpers. Recording happens at connection level (dashboard session and foreground service), not in the UI.
- `src/store`, `src/background` - persistence, Zustand store (`replaceAll` backs the configuration import), notification foreground service.
- `src/ui` - screens, widgets, dialogs, skin/theme. Icons are inline SVG paths in `src/ui/icons/Icon.tsx` (Material Design paths for action icons); fonts are the system ones.
- `src/i18n` - English texts in `en.ts`, widget UI texts in `ui.ts` / `extra.ts`, translations in `locales/` (`pt-BR`, `es`, `de`).
- `plugins` - Expo config plugins (classic window, foreground service, R8 keep rules, release signing).

## Conventions

- Code, comments, identifiers and commit messages are in English.
- Every user-visible string goes through `src/i18n` and needs entries in all four languages (`i18n.test.ts` checks this).
- The default broker seeded on first run is `broker.emqx.io:1883` (`src/store/repo.ts`).
- Settings has Export configuration (JSON, `src/domain/backup.ts`, broker passwords as `passwordBase64`), Export history (the `.db` file) and Import configuration (replaces everything after a confirmation). Importing the history `.db` is not implemented.
- Native modules (Skia, reanimated, worklets, gesture-handler, expo-sqlite, expo-sharing, expo-file-system, expo-document-picker) need a full `assembleRelease`; an OTA or JS-only rebuild is not enough.
- Release: bump the version in `app.json`, `package.json` and both version fields of `package-lock.json` in a "Version X.Y.Z" commit, push, then push a tag named `X.Y.Z`. The CI builds the signed APK and attaches it to the release (older tags like `1.07` predate this naming).
- Do not add third-party assets (icons, fonts, palettes) without a license that allows redistribution.
- README screenshots in `docs/screenshots` come from a release build on a phone: dark theme, app language set to English.
