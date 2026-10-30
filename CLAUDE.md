# myDevice MQTT

React Native (Expo, dev client) + TypeScript MQTT dashboard for Android. Package `dev.marcelo.mqttiot`.

## Commands

- `npx tsc --noEmit` - typecheck.
- `npx jest --testPathIgnorePatterns mosquitto.integration` - unit tests. The integration test needs a reachable public broker, so skip it offline.
- `npx tsx tools/publish-demo.ts widgets broker.emqx.io` - publish the demo dashboard (import topic `mqttiot/demo/widgets`) and retained widget values.
- Android build (the `android/` folder is generated and git-ignored):
  - `export JAVA_HOME=~/android-studio/jbr ANDROID_HOME=~/Android/Sdk`
  - `cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`
  - The release keystore (the same one stored in the GitHub secret `KEYSTORE_BASE64`) lives in `secrets/mydevice-mqtt-release.jks`, which is git-ignored. `~/.gradle/gradle.properties` holds `MYDEVICE_STORE_FILE` (pointing to it), `MYDEVICE_STORE_PASSWORD`, `MYDEVICE_KEY_ALIAS` (`mydevice`) and `MYDEVICE_KEY_PASSWORD`. Never commit the keystore or its passwords.
  - Without `MYDEVICE_STORE_FILE` the release falls back to the debug keystore; a build signed differently from the installed one needs `adb uninstall dev.marcelo.mqttiot` first (this wipes app data).

## Layout

- `src/domain` - data model, tile and widget logic, JSONPath, import/export JSON. Pure, fully unit tested.
- `src/mqtt` - MQTT 3.1.1 client built on MQTT.js (`mqtt` package, `MqttClient.ts`), reconnecting connection, and the TCP/TLS and WebSocket transports it runs over (`transportStream.ts` adapts them to a stream). `fakeBroker.ts` is the in-memory broker used by the tests.
- `src/scripting` - the `event` / `app` JavaScript hook API.
- `src/store`, `src/background` - persistence, Zustand store, notification foreground service.
- `src/ui` - screens, widgets, dialogs, skin/theme. Icons are inline SVG paths in `src/ui/icons/Icon.tsx` (Material Design paths for action icons); fonts are the system ones.
- `src/i18n` - English texts in `en.ts`, widget UI texts in `ui.ts` / `extra.ts`, translations in `locales/` (`pt-BR`, `es`, `de`).
- `plugins` - Expo config plugins (classic window, foreground service, R8 keep rules, release signing).

## Conventions

- Code, comments, identifiers and commit messages are in English.
- Every user-visible string goes through `src/i18n` and needs entries in all four languages (`i18n.test.ts` checks this).
- The default broker seeded on first run is `broker.emqx.io:1883` (`src/store/repo.ts`).
- Do not add third-party assets (icons, fonts, palettes) without a license that allows redistribution.
- README screenshots in `docs/screenshots` come from a release build on a phone: dark theme, app language set to English.
