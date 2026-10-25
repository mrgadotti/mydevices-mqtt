# the original app clone (React Native + TypeScript) — Design

Clone of the Android app `the original package` v4.4 (versionCode 69), reverse engineered with REA
from the original APK (sha256 `a8549031cc1dc4409b73070cc95ea0287f6775d83cc974b50bf736702f5d9831`)
and observed running on a Moto G7 Power over adb. Validation broker: `test.mosquitto.org`.

Legend: **[obs]** observed in the shipped app (static decompilation or on-device UI), **[call]** my design call,
**[unk]** not established.

## Goal

A **faithful copy** of the original app: an Android-first React Native app where the user can define several MQTT brokers
(endpoints) and, per broker, add dashboard tiles ("metrics") on demand, with the same six tile types, screens, texts,
colors, dimensions, icons and behavior as the original. Fidelity is the acceptance bar; wherever the original can be
inspected (APK resources, decompiled code, the running app on the phone) the clone follows it instead of my taste.
Every visual or behavioral decision must trace to REA evidence (resource file, decompiled method or on-device capture).

## Non-goals

- Firebase/Fabric analytics, Google Play services, the rate-this-app dialog. [call]
- iOS builds (code stays portable, but only Android is built and verified). [call]
- Home-screen shortcuts per broker (original has them). [call]

## Observed behavior

### Brokers [obs: class `Broker`, screen BrokerSettings]
Fields: `name`, `address`, `port` (default 1883), `ssl`, `trust` (self-signed trusted), `user`, `password`,
`clientId` (default `mqttiot-<8 hex>`), `autoConnect`, `keepScreenOn`, `metricsEditable`,
`neverHideBrokerName`, `colsCount` (portrait, 0 = auto), `colsCountHorizontal` (landscape, 0 = auto),
tile size small/medium/large. Brokers list screen has About, Rearrange(lock) and Add actions.

### Tiles [obs: classes `MetricBasic`, `MetricBasicMqtt`, `Metric*`; screens Metric*Settings]
Common to all six types: `name`, `topic` (subscribe), `topicPub` (empty = same as subscribe), `enablePub`,
`updateLastPayloadOnPub`, `jsonPath`, `qos` 0/1/2, `retained`, `enableIntermediateState` +
`intermediateStateTimeout`, `blink`, and four script slots `jsOnReceive`, `jsOnDisplay`, `jsOnTap`,
`jsBlinkExpression`.

| Type (menu label) | Extra fields |
|---|---|
| Text | `prefix`, `postfix`, `textColor`, `mainTextSize` small/medium/large |
| Switch/button | `payloadOn`, `payloadOff`, `iconOn`, `iconOff`, `onColor`, `offColor` (same payload+icon on both = plain button) |
| Range/progress | `minValue` 0, `maxValue` 100, `decimalPrecision` 0, `prefix`, `postfix`, `progressColor`, `displayPayloadValue` |
| Multi choice | `items[] {label, payload}`, `mainTextSize`, `textColor` |
| Image | `kind` = static URL / URL in payload / binary data in payload, `imageUrl`, `reloadInterval` (default 5 s), `openUrl` |
| Color | `format` = HEX string / numeric string, `icon` |

Receive path [obs: `MetricBasicMqtt.messageReceived`, `MetricSwitch.messageReceived`]:
leave intermediate state; `lastPayloadChanged = payload != lastPayload`; record activity time; if changed, store
payload; if `jsonPath` is set, extract with JayWay JsonPath and store its `toString()` (null -> `"(null)"`, error ->
`""` + message "JSON path error"). Switch: the (extracted, else raw) value is compared with `payloadOn` /
`payloadOff`; only matching payloads update state.

Dashboard actions [obs]: Add, Import/Export, Rearrange(lock). Add shows "Choose type" with the six labels above.
Import/Export [obs]: publishes all tile definitions to a topic (default `metrics/exchange`), optionally retained, or
subscribes and replaces existing tiles with what arrives. The payload format is **[unk]**; mine is JSON (see plan).

## Design calls

- Stack [call]: Expo SDK (development build, not Expo Go), React Native, TypeScript, `react-navigation`,
  `zustand` + AsyncStorage for persistence.
- MQTT [call, revised]: an own MQTT 3.1.1 client (`src/mqtt`) over `react-native-tcp-socket` (TCP and TLS) and the
  global `WebSocket` (address starting with `ws://` or `wss://`). The transport sits behind a small interface so the
  same code is tested in Node against `test.mosquitto.org` and runs on the device.
- Scripting [call, revised]: hooks are JavaScript strings evaluated with Hermes' indirect `eval` and the documented
  `event` / `app` objects (matches the official docs of the original); every run is clean like Rhino's CLEAN mode.
- Tap behavior [call, unk]: tapping a Switch publishes the opposite of its current state; Multi choice publishes the
  chosen item's payload; Range publishes the slider value formatted to `decimalPrecision`; Text and Image tiles
  are read-only unless `enablePub`.
- Intermediate state [call, unk]: after a publish with `enableIntermediateState`, the tile shows a pending style until the
  next message arrives or `intermediateStateTimeout` seconds pass.

## Additions requested beyond the original

- **Notification tile** (7th type, `notification`) [call, requested by the user]: subscribes to a topic and raises a
  *local* Android notification for every received message (title = tile name, body = payload or JSON path value, optional
  on-receive script may rewrite or suppress it). No Firebase / FCM / push tokens anywhere.
- **Background operation** (like the reference app) [call, requested]: while at least one notification tile exists, the app runs an
  Android foreground service that keeps the MQTT connections of those brokers alive with the screen off, with a persistent
  "connected" notification. Notification permission (Android 13+) is requested on first use.
  Libraries (verify at install): `react-native-background-actions` for the service, `expo-notifications` for local notifications.

- **Default broker** [call, requested]: on the very first run the broker list contains `test.mosquitto.org:1883`
  (no credentials, no TLS), so the app is usable immediately. Deleting it is permanent. The original starts empty.

## Fidelity method

1. Decode the APK resources with apktool/REA: layouts, `colors.xml`, `dimens.xml`, `styles.xml`, drawables and mipmaps
   (including the icon set used by `IconSelectorActivity`), and every string in `strings.xml`.
2. Port colors, dimensions, text sizes, spacing and icons from those files into `src/ui/theme.ts` and `assets/`.
3. For behavior not visible statically, decompile the owning method (REA `inspect_android_method`) or capture it on
   the phone, and record the evidence id in `docs/superpowers/fidelity-ledger.md`.
4. At the end, compare side-by-side screenshots of every screen (original vs clone) and list each remaining difference.

## Success

1. Add two brokers, one on 1883 (TCP) and one on 8080 (`ws://`), both reaching `test.mosquitto.org`.
2. Add one tile of each type on a broker; a message published from another client (mosquitto_pub or the original app)
   updates it; interacting with it publishes to the right topic with the right QoS/retain.
3. Close and reopen the app: brokers and tiles are still there.
4. Unit tests for all pure logic pass; the integration test against `test.mosquitto.org` passes.
5. Every screen (brokers list, broker form, dashboard, each tile form, import/export, type chooser) has an
   original-vs-clone screenshot pair in the ledger and its differences are listed or fixed.
