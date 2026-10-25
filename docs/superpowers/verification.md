# Verification log

Device: Moto G7 Power (`0060602164`, Android 10, 720x1520 @ 320 dpi). Original: `the original package` 4.4 from
the original APK (sha256 `a8549031…9831`). Clone: `dev.marcelo.mqttiot` (Expo dev build, arm64).
Brokers: `test.mosquitto.org:1883` (TCP) and `:8080` (WebSocket), public.

"ev_" ids are REA Evidence ids (`capture_adb_screen`, `start_adb_app`, `stop_adb_app`, `inspect_android_*`).
Screenshots live under the session scratchpad; the originals worth keeping are in `docs/superpowers/shots/original/`.

## 1. Static analysis of the original (REA / JADX / apktool)

| Question | Result | Evidence |
|---|---|---|
| Package, SDK, permissions | `the original package` 4.4 (69), minSdk 15, targetSdk 25, internet / wake lock / vibrate | `inspect_android_package` ev_5fb247c7… |
| Data model (Broker, six tile types) | field names, types and defaults copied 1:1 | `inspect_android_class` ev_0443c515…, ev_242bc960…, ev_300af1a6…, ev_43893c64…, ev_1b6460db…, ev_e901dacc… |
| Receive path, switch matching, range math, pending state, relative time | ported to `src/domain/metrics.ts` | `inspect_android_method` ev_cab6d258…, ev_880c2522…, ev_6671629f…, ev_aa45dd48…, ev_7496bb95…, ev_807fed16…, ev_b2fd0b83… |
| Tap flows, publish rules, routing, persistence format, grid columns, defaults | full-source read (jadx API, same engine) | see `fidelity-ledger.md` |
| Script API (`event`, `app`, `val`, `secs`) | matches the official docs pages the app links to (the original docs site/js) | fetched 2026-10-24 |

## 2. Runtime comparison with the original on the phone

| Check | Result | Evidence |
|---|---|---|
| Original accepts the clone's JSON (import over MQTT) | all six tiles rendered | ev_12a4cb76… |
| Clone accepts tiles exported in the original's format | imported over TCP from `test.mosquitto.org`, six tiles with data | clone-7 capture ev_963933b7… |
| Tile geometry (155x150 dp, 4 dp gaps, centered 2 columns) | identical positions (46/364 px, 169/477/785 px) | ev_12a4cb76… vs ev_963933b7… |
| Action bar buttons | `[416,61][512,157]`, `[512,61][608,157]`, `[608,61][720,157]` in both apps | uiautomator dumps |
| Type chooser | same width, item height 48 dp, 16 sp text, same item order | original `type-chooser.png` vs ev_ebe5b6ef… |
| Original crashes on duplicate/zero `longId` | reproduced; the clone renumbers ids on import | logcat FATAL EXCEPTION |

## 3. MQTT behavior, observed from a second client (`tools/watch.ts`)

Taps on the clone and what reached the broker:

| Action in the clone | Published |
|---|---|
| Tap Switch "Lamp" (was on) | `mqttiot/demo/lamp` = `0` |
| Text tile → Set new value `23.8` | `mqttiot/demo/temp` = `23.8` |
| Range tile → ring → Set | `mqttiot/demo/dim` = `17` |
| Multi choice → "Cool" | `mqttiot/demo/mode` = `c` |
| Color tile → picker → OK (hex format) | `mqttiot/demo/color` = `#A5927C` |
| Script tile with `app.publish` + `event.preventDefault` | only `mqttiot/demo/tapped` = `script ran` |

Integration tests against the real broker (`npm test`, `src/mqtt/mosquitto.integration.test.ts`): QoS 1 delivery with
UTF-8 payload and a retained message, over TCP (1883) and WebSocket (8080), plus an unreachable broker.

## 4. Scripts on device (Hermes)

On Display (`COLD` in red for payload 15), On Receive (`event.payload` rewritten to `HELLO!`), blink expression
(`val < 20`), On Tap (`preventDefault`), and an error overlay for a throwing script
(`ReferenceError: Property 'thisFunctionDoesNotExist' doesn't exist`). Capture ev_d4672d66….

## 5. Notification tile and background operation (additions requested by the user)

No Firebase: the installed package has no Firebase/FCM component (`dumpsys package` grep empty); notifications are
drawn locally by Notifee, and a foreground service (`dataSync`) keeps the MQTT connection alive.

1. Created a Notification tile "Alerts" on topic `mqttiot/demo/alert` through the UI.
2. `dumpsys activity services`: `app.notifee.core.ForegroundService … isForeground=true`, channel `mqtt-service`.
3. App sent to the background (`mCurrentFocus` = launcher), then
   `tsx tools/publish-message.ts test.mosquitto.org mqttiot/demo/alert "Door opened at 15:49:52"`.
4. `dumpsys notification --noredact`: a notification on channel `mqtt-events`, importance 4,
   `android.title=Alerts`, `android.text=Door opened at 15:49:52`.
5. Notification shade capture ev_f952e455…: the event notification plus the persistent "Listening for notifications:
   test.mosquitto.org". The tile in the app already showed the bell ringing with the new timestamp.
6. Tapping the notification brought `MainActivity` to the foreground.

## 6. Keyboard overlap on every screen with a text field

Method: for each screen the field is focused on the phone and `uiautomator` (field bounds) is compared with the
keyboard top from `dumpsys input_method` (`visibleTopInsets` + 53 px status bar). A field passes when its bottom edge is
at or above the keyboard top and below the action bar. Scripts: scratchpad `kbcheck.py` (walks every field of a
scrolling form) and `kbnow.py` (focused field of the current dialog).

| Screen | Fields checked | Overlaps |
|---|---|---|
| Broker form | 16 | 0 |
| Tile form: Text / Switch / Range / Multi choice / Image / Color / Notification | 6 / 8 / 9 / 6 / 7 / 6 / 7 | 0 |
| Import / export dialog (topic) | 1 | 0 |
| Text tile "Set new value" dialog | 1 | 0 |
| Range tile dialog (numeric field) | 1 | 0 |
| Multi choice "Add new option" dialog (payload, label) | 2 | 0 |
| Script editor (multiline) | 1 | 0 |

The window is a classic one (`adjustResize`, no edge-to-edge) so Android resizes it and scrolls the focused field into
view; the dialog field is focused explicitly because `autoFocus` inside a React Native Modal does not raise the keyboard.

## 7. Issues found on the device and fixed

- Keyboard covered fields and dialogs: Android 10 + edge-to-edge ignores `adjustResize`, and RN keyboard events do not
  fire with `adjustNothing`. Fixed with a classic window (`edgeToEdgeEnabled=false`, `adjustResize`, opaque black bars).
- The phone keyboard "corrected" a topic (`metrics` became `métrica`): technical fields now use a keyboard type that
  switches suggestions off.
- `Metro` file watcher misses edits in this environment; restart Metro before each device test.
- The original cannot hold an MQTT connection on this phone (connects, drops in < 1 s, repeats), so data-state
  screenshots of the original come from importing saved state (`lastPayload`/`lastActivity`) instead.

## 8. free-form move, palette and icon font (phone, debug build)

Analysis of `~/Downloads/the reference APK` is in `fidelity-ledger.md` (the reference app-inspired additions). Checks on the Moto G7 Power with
the demo tiles on `broker.emqx.io` (`test.mosquitto.org` did not answer from the phone at that moment):

| Check | Result |
|---|---|
| Untouched dashboard | same tile positions as before (46/364 px columns, 169/477/785 px rows) |
| Lock icon → rearrange mode | dashed cells appear, plus one empty row to drop into |
| Hold a tile, drag, release | tile lifts (scale, shadow, vibration), follows the finger, snaps to the cell (logged drop cell `{col:1,row:3}`), gap left behind |
| Drop on an occupied cell | the two tiles swap |
| Persistence | after force-stop and relaunch the arrangement, gaps included, is unchanged |
| Icon selector | the 198 the reference app glyphs (line style, from `icons.ttf`) follow the original set; picking "webhook" shows it in the Lamp tile in the tile color |
| Color dialog | ramps in the reference app's palette (brand `#24c48e` at step 6, etc.), the classic 27 colors, a hex field and a last-selected row |

Notes: `adb shell input draganddrop` stops short of the requested end point (about 80%), so drag distances in the
test were overshot. A duplicate React key in the color dialog (the reference app's `positive` ramp repeats `#8ad95d`) was found in the
dev overlay and fixed. `npx jest`: 24 suites / 229 tests pass; `npx tsc --noEmit` clean.

## 9. Release build, standalone (no Metro)

`./gradlew :app:assembleRelease` (arm64) installed on the phone and run without a dev server.

- First release build crashed at startup: R8 stripped Room's generated `WorkDatabase_Impl` that Notifee's WorkManager needs
  (`Failed to create an instance of class androidx.work.impl.WorkDatabase`). Fixed by `plugins/withProguardKeep.js`
  (keep rules for Room databases, `androidx.work`, `app.notifee`); rebuilt, no crash.
- Release app: brokers list, emqx dashboard with the saved rearranged layout, the reference app glyph in the Lamp tile and the image tile all render.
- Notification tile "RelAlerts" created in the release app; with the app in the background (launcher focused) the foreground
  service was `isForeground=true` (channel `mqtt-service`) and a message published to `broker.emqx.io` raised a notification on
  channel `mqtt-events`, importance 4.

## 10. Widget UI (phone, release build)

Spec: `specs/ui-reference.md`; plan: `plans/2026-10-24-widget-ui.md`. Moto G7 Power, `broker.emqx.io`, demo from
`tools/publish-demo.ts widgets broker.emqx.io` (one widget of every kind, retained values), imported through the
import/export dialog.

| Check | Result |
|---|---|
| Fonts, dark tokens, app bar, device cards, empty states, Widget Box sheet | render as in the spec |
| All 35 widgets render and take their values from the broker | yes (scrolled through the whole dashboard) |
| Edit mode | dot grid, selection outline, corner handle, drag moves and snaps, handle resizes |
| Taps published | Button `0`, Switch `0`, Slider drag `68`, Step H `30` (from 25), Step V `55` (from 50), seen from a second client |
| `npx jest` / `npx tsc --noEmit` | 28 suites, 246 tests / clean |

Not checked yet: light theme on the phone, landscape, Joystick / zeRGBa / Terminal / Time Input publishing, the chart over time.

## 11. Performance (phone, release build, 150 widgets)

Plan: `plans/2026-10-24-performance.md`, results: `perf-report.md`. Import no longer freezes, idle renders are 0, scroll
is 2.1% janky, a 20 msg/s burst costs about 45 renders per 5 s, edit mode opens in 349 ms. `npx jest` 28 suites, 253
tests; `npx tsc --noEmit` clean.
