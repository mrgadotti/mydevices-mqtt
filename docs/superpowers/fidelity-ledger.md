# Fidelity ledger

Evidence source: the original APK (sha256 `a8549031…9831`), decoded copy in a local apktool decode
(apktool 3.0.3), REA/JADX 0.7.1 decompilation. "ev_" ids are REA Evidence ids from this session.

## Visual constants (res/values, res/layout)
| Item | Value | Source |
|---|---|---|
| Window background | `#080808` | `values/colors.xml` windowBackground |
| Tile / broker row background | `#181818` | `colorTile` |
| Accent | `#40afff` | `colorAccent` |
| Action bar | black `#000000` | `colorPrimary` |
| Icon gray / dark gray / blink / progress bg | `#c0c0c0` / `#393939` / `#707070` / `#707070` | `light_gray_color`, `dark_gray_color`, `colorBlink`, `progress_bg_color` |
| Tile width small/medium/large | 105 / 155 / 205 dp | `dimen tile_width*` |
| Tile height | 150 dp | `layout/*_metric_layout.xml` |
| Tile name label | top, 38 dp high, 2 lines, small text, padding 10 dp | same |
| Tile bottom label | 20 dp high, 12 sp, `#474747`, shows "-" until activity (verify) | same |
| Text tile value | 35 sp (medium), 80 dp high, 3 lines | `text_metric_layout.xml` |
| Switch icon | 75×75 dp centered | `switch_metric_layout.xml` |
| Pending spinner | 115×115 dp indeterminate progress, centered | layouts |
| Error overlay | full-tile `logTextView` over `#181818` | layouts |
| Broker row | background `#181818`, margin-bottom 6 dp, text medium, padding 16/20 dp | `broker_layout.xml` |
| Icon set | ~440 vector drawables `ic_*.xml`, fill `light_gray_color` | `res/drawable` |

## Behavior (decompiled)
| Behavior | Evidence |
|---|---|
| Receive path, `lastPayloadChanged`, JSON path `toString()` | `MetricBasicMqtt.messageReceived` ev_cab6d258… |
| Switch accepts only on/off payloads | `MetricSwitch.messageReceived` ev_880c2522… |
| Range value `Float.parseFloat`, 0 on error | `MetricRange.getValue` ev_6671629f… |
| Range progress is 0..100, clamped | `MetricRange.getProgress` ev_aa45dd48… |
| Range label `%s%.Nf%s` of progress or value | `MetricRange.getStringValue` ev_7496bb95… |
| Intermediate state rule | `MetricBasicMqtt.isInIntermediateState` ev_807fed16… |
| "Last activity" = `DateUtils.getRelativeTimeSpanString(…, 1000)` | `MetricBasic.getLastActivityDateTimeString` ev_b2fd0b83… |
| Import/export is an MQTT topic (`metrics/exchange`) | on-device dialog |

## Runtime captures of the original (REA `capture_adb_screen`, device 0060602164, 720x1520 @ 320 dpi = 2 px/dp)
| Screenshot | Evidence | File |
|---|---|---|
| Brokers list (mosq, hive rows, #181818 rows, 6 dp gap) | ev_e0e680b3… | `docs/superpowers/shots/original/brokers-list.png` |
| Dashboard with all six tile types, no data yet | ev_12a4cb76… | `dashboard-six-tiles.png` |
| Broker form, type chooser, text form | adb screencap (pre-REA-capture) | `broker-form.png`, `type-chooser.png`, `form-text-1.png` |

Measured on `dashboard-six-tiles.png`: grid of 2 columns, tile 310x300 px (155x150 dp), 8 px (4 dp) gaps, grid centered
(46 px side margins); name label top-centered (small text, gray); Range shows a circular dial with the percentage in
its center; Image fills the tile width and shows the relative time ("Há N segundos", localized by the system) below it;
Switch/Color show a 150 px icon (gray when off); Text shows prefix+value+postfix in white at 70 px (35 sp).
Runtime facts: imported metrics JSON is accepted by the original (my serializer's output rendered all six tiles);
tiles with duplicate/zero `longId` crash it ("Two different ViewHolders have the same stable ID").
The original cannot hold an MQTT connection on this phone (connects, then "Conexão perdida" within 0.5 s, repeating),
so data-state screenshots could not be captured from it.

## Behavior from full-source decompilation
Source: jadx 0.7.1 API (same engine as REA's JADX provider) run directly on the same APK, output read from
`scratchpad/orig/jadx-src` — no REA evidence ids for these rows (REA exposes per-method views only).

| Behavior | Where |
|---|---|
| Metric type ids: 1 text, 2 switch, 3 range, 4 multi, 5 image, 6 color | `MetricBasic.METRIC_TYPE_*` |
| Real defaults: `enablePub`/`updateLastPayloadOnPub`/`enableIntermediateState` = true, timeout 0, qos 0, switch payloads "1"/"0", icons `ic_check_box_checked`/`ic_check_box_unchecked`, colors -1, text/multi size LARGE, range displayPayloadValue true, color icon `ic_radio_button_checked`, image kind 1 and reload 5 s | field initializers in `Metric*` |
| Broker defaults: port "1883", clientId `mqttiot-<uuid first segment>`, keepScreenOn true, metricsEditable true, tileWidth -1/0/1 | `Broker` |
| Persistence/export format = Gson JSON array of metric objects (Java field names, nulls omitted, transient fields excluded); stored per broker id | `MetricsListActivity.loadMetrics/saveMetrics` |
| Incoming message routing: exact topic string equality only (no wildcard matching); image kind 1 ignores messages | `MetricsListActivity.messageArrived` |
| onReceive script runs with `event` (payload, topic, data, metric, activity) and `app`; the (possibly edited) `event.payload` is then fed again to `messageReceived` | same |
| Publish: payload bytes of the string, QoS capped to 1 (`qos <= 1 ? qos : 1`), pub topic = `topicPub` if non-empty else `topic` | `publish(MetricBasicMqtt,…)` |
| After a successful publish every tile with the same pub topic enters the intermediate state (switches only when the payload equals on/off) and, if `updateLastPayloadOnPub`, takes the published payload as last payload | same |
| Tap flow: visible error overlay → alert dialog (not for color/image); ignore while pending; run `jsOnTap` (event.preventDefault); then per type below | `MetricClickHandler` |
| Text tap (enablePub): dialog "set new value" with text field → publish | same |
| Switch tap (enablePub): publish payloadOff if current == payloadOn else payloadOn (null current → payloadOn) | same |
| Range tap (enablePub): dialog with arc dial 0..100 + numeric field; displayPayloadValue → value must be within min..max, else percentage 0..100 mapped to min..max; formatted `%.<precision>f` | same |
| Multi tap (enablePub): single-choice dialog "set option", current item preselected, choosing publishes its payload | same |
| Image tap: `openUrl` set → open it; else full-screen image popup (tap to close) | same |
| Color tap (enablePub): color picker initialised with current color; publishes `#%06X` (hex format) or decimal RGB (int format) | same |
| Color display: numeric payload → `#%06X` of the int; else Android `Color.parseColor`; invalid → "invalid color" overlay | `MetricsAdapter.onBindViewHolder` |
| Text size sp for small/medium/large by tile size: small tile 12/22/32, medium 15/25/35, large 40/50/60 | same |
| Pressed tile background `#888888` when `enablePub`; blink toggles background `#181818`↔`#707070` every 500 ms | `onCreateViewHolder`, `MetricBasic.timer` |
| Display timer 100 ms; relative times refresh every 1 s; metrics saved every 10 s | `MetricsAdapter` |
| MQTT connect: keepalive 30 s, user/password only when non-blank after trim, trust-all TLS when `trust`; failure → toast "connection failed" and retry after 5 s; lost connection → reconnect | `MetricsListActivity.connect/reconnect` |
| Script scope objects: `event` (per hook), `app.openUri(uri[,action])`, `app.publish(topic,payload,retained,qos)`; blink expr gets `val` and `secs` | scriptable classes |
| Image kinds: 1 static URL, 2 URL in payload, 3 binary data in payload; reload when `secondsSinceLastActivity >= reloadInterval` | `MetricImage` |

## Still to verify (open)
- Visual layouts of range (SeekArc), multi, image, color tiles and every dialog (read `res/layout`).
- Broker list persistence format and long-press menu (BrokersListActivity).
- Strings for every label/toast (res/values/strings.xml).

## the reference app-inspired additions (user request, analysis of `~/Downloads/the reference APK`)

Target: the reference IoT app `the reference app` 1.17.0 (versionCode 187, targetSdk 34), analysed with REA (`inspect_android_package`
ev_8a9d8f64…, parent ev_1aa4da68…), apktool resources and a JADX dump. The code is obfuscated, so behavior that is not in
resources is marked [unk] and is this clone's own choice.

| Item | Source in the reference app | What the clone does |
|---|---|---|
| Move widgets | FTE strings: tap and hold, widget pops up, drag to a new position, widgets can sit anywhere on the canvas | `GridCanvas`: long-press (250 ms) lifts a tile (scale 1.06, shadow, short vibration), it follows the finger, release snaps to the nearest grid cell; dashed cell outlines while editing (rearrange mode) |
| Collision | [unk] (obfuscated) | the tile on the target cell takes the mover's old cell (swap) |
| Default look | n/a | tiles without a stored cell flow row by row into free cells, so an untouched dashboard equals the original's wrapping grid |
| Persistence | n/a | optional `gridX` / `gridY` on each tile (Gson ignores unknown fields, so the original still imports the JSON) |
| Not copied | resize handles, Duplicate and Recycle drop zones, drag onto a tab | tiles have one fixed cell size here; duplicate/delete stay in the tile menu |
| Palette | `res/values/colors.xml`: 10-step ramps brand `#24c48e` (step 6), complimentary1 `#5471d3`, complimentary2 `#01b8f7`, complimentary3 `#006ad9`, critical `#d3435c`, positive, warning `#ed9d00`, neutral, primary | `tools/extract-glyphs.py` → `src/ui/icons/palette.json`; the tile color dialog shows a "last selected" row, the ramps, the classic palette and a hex field |
| Icon format | icon font `res/font/icons.ttf` (family `glyph_icons`) plus `icon_<name>` strings holding the code point | font shipped by `plugins/withGlyphFont.js` as an Android asset; icons are addressed as `glyph:<name>` (198 glyphs) and appear after the original set in the icon selector |

The the reference app font and palette belong to the third-party vendor; they are used here for the user's private clone and should be replaced
before any public distribution.
