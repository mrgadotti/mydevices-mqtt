# JavaScript in widget events

Every widget can run small JavaScript snippets at four moments. They are set in the widget's edit form (Edit mode, select the widget, the sliders button): the **Blink expression** field and the **On Receive**, **On Display** and **On Tap** buttons. Each button opens a monospace editor.

| Hook | Runs | What it can do |
|---|---|---|
| Blink expression | Each time the widget is drawn | Make the widget blink |
| On Receive | When a message arrives for the widget's topic | Rewrite the payload, publish, keep state |
| On Display | Each time the widget is drawn (new data, or the "last activity" time changed) | Change name, text, colors, progress, image URL, blink |
| On Tap | When the widget is tapped | Publish, open a link, replace the default tap action |

The scripts run on the phone, in Hermes, synchronously. They are plain JavaScript (ES2015+), meant for short synchronous work: no `import`, no DOM.

## What a widget is, for scripts

A widget is stored as a *metric* of one of seven types. The type decides which `event` fields On Display has.

| Type | Widgets |
|---|---|
| Text | Value Display, Labeled Value, LCD, Terminal, Log, Joystick, Text, Text / Numeric / Time Input |
| Switch | Button, Styled Button, Icon Button, Switch, LED, Icon |
| Range | Slider, Vertical Slider, Step sliders, Step H/V, Level Slider, Gauge, Radial and Enhanced Gauge, Level H/V, SimpleChart |
| Multi choice | Segmented Switch, Menu |
| Image | Image |
| Color | Color Picker, zeRGBa |
| Notification | Notification |

## Blink expression

A single JavaScript **expression** that must evaluate to true or false. The widget blinks while it is true.

Constants:

- `val`: the received payload as a string (or the value extracted by the JSON path, if one is set). It is `null` before any message.
- `secs`: seconds since the last activity (last message received or image downloaded).

```js
val < 10 || val > 90          // temperature out of range
```

```js
Number(val) > 30              // `val` is a string: convert before comparing numbers
```

```js
secs > 300                    // no data for 5 minutes
```

```js
val === 'ALARM' || val === 'OPEN'
```

```js
val !== null && JSON.parse(val).battery < 15   // payload is JSON
```

An error in the expression shows on the widget as a message.

## On Receive

Runs when a message arrives for the widget's topic, after the JSON path has been applied. The script can **replace the payload** the widget will store and show by assigning `event.payload`.

| Name | Description |
|---|---|
| `event.payload` | The payload as a string. Assign a new value to change it. |
| `event.topic` | The topic the message arrived on. |
| `event.data` | Your own value, kept per widget while the app runs. Not saved. Shared by the three hooks. |
| `event.metric` | A copy of the widget's settings (`name`, `topic`, ...). Its `lastPayload` already holds the **new** payload: to remember the previous one, use `event.data`. |
| `app` | See [the `app` object](#the-app-object). |

If the script throws, the original payload is kept and the error shows on the widget.

Convert units:

```js
// Celsius to Fahrenheit, one decimal
event.payload = (Number(event.payload) * 9 / 5 + 32).toFixed(1);
```

Round or scale:

```js
event.payload = String(Math.round(Number(event.payload) * 10) / 10);
```

```js
// 0..1023 from an ADC to a 0..100 percentage
event.payload = String(Math.round(Number(event.payload) / 1023 * 100));
```

Turn codes into words:

```js
var names = { '0': 'Closed', '1': 'Open', '2': 'Ajar' };
event.payload = names[event.payload] || event.payload;
```

Read a field of a JSON payload (alternative to the JSON path field):

```js
var o = JSON.parse(event.payload);
event.payload = o.sensors.temp.toFixed(1) + ' / ' + o.sensors.hum + '%';
```

Ignore a bad reading and keep the previous good value:

```js
var v = Number(event.payload);
if (v < -50 || v > 120) {
  event.payload = event.data !== undefined ? event.data : '0';
} else {
  event.data = event.payload;
}
```

Publish an alert when a limit is crossed:

```js
if (Number(event.payload) > 80) {
  app.publish('alerts/overheat', 'Temperature ' + event.payload, false, 1);
}
```

Keep state between messages, here the minimum and maximum seen since the app started:

```js
var v = Number(event.payload);
var d = event.data || { min: Infinity, max: -Infinity };
d.min = Math.min(d.min, v);
d.max = Math.max(d.max, v);
event.data = d;
event.payload = event.payload + '  (min ' + d.min + ', max ' + d.max + ')';
```

Do something at most once a minute:

```js
var d = event.data || { last: 0 };
var now = Date.now();
if (Number(event.payload) > 80 && now - d.last > 60000) {
  app.publish('alerts/overheat', event.payload, false, 1);
  d.last = now;
}
event.data = d;
```

Notice that `event.data` must be assigned back at the end when you create it in the script.

## On Display

Runs every time the widget is drawn. The script edits values **before** they are drawn; nothing is stored. Do not publish from here: it runs often.

Fields available for every widget:

| Name | Description |
|---|---|
| `event.name` | The title. Assign to change it. |
| `event.lastActivityString` | The time elapsed since the last message, as text. The widgets do not draw it, so changing it has no visible effect. |
| `event.blink` | Whether the widget blinks. Assign a boolean. |
| `event.secondsSinceLastActivity` | Seconds since the last activity. Also `event.getSecondsSinceLastActivity()`. |
| `event.lastPayload` | The last payload as a string, empty before any. Also `event.getLastPayload()`. |
| `event.data` | Your own value, shared with the other hooks of the widget. |
| `event.metric` | A copy of the widget's settings. |
| `app` | See [the `app` object](#the-app-object). |

Extra fields by type, and which widgets draw them:

| Type | Fields (read and write) | Drawn by |
|---|---|---|
| Text, Multi choice | `event.text` | Value Display, Labeled Value, LCD, Text, Menu, Segmented Switch |
| Text, Multi choice | `event.textColor` | Nothing: the widgets draw text in the theme color |
| Switch | `event.on` | Switch, Button, LED, Icon |
| Switch | `event.iconColor` | LED and Icon (the Switch and the buttons use the theme colors) |
| Range | `event.text`, `event.progress` (0..100) | Sliders, gauges, level bars |
| Range | `event.progressColor` | The same widgets: track, arc, ring or bar color |
| Image | `event.url` | Image |
| Color | `event.color` | Color Picker, zeRGBa |

Colors are strings: `#RRGGBB`, `#AARRGGBB` or a name such as `red`, `green`, `yellow`, `cyan`. An invalid color shows "Invalid color format" on the widget.

Text by value (Text type):

```js
var t = Number(event.getLastPayload());
if (t < 18) event.text = event.text + ' (cold)';
else if (t > 28) event.text = event.text + ' (hot)';
```

Show that the data is stale: blink and mark the title.

```js
if (event.getSecondsSinceLastActivity() > 600) {
  event.name = event.name + ' (offline)';
  event.blink = true;
}
```

Put the age in the title:

```js
event.name = event.name + ' (' + event.secondsSinceLastActivity + ' s)';
```

LED (Switch type), green when on and red when off:

```js
event.iconColor = event.on ? '#00e676' : '#ff5252';
```

Range, progress color by level, and a custom label:

```js
event.progressColor = event.progress > 80 ? '#ff5252' : event.progress > 50 ? '#ffb300' : '#00e676';
event.text = Math.round(event.progress) + ' %';
```

Image, pick the picture from the last payload (here a payload of `2` shows `.../2.png`):

```js
event.url = 'https://www.gstatic.com/webp/gallery/' + event.getLastPayload() + '.png';
```

Do not make `event.url` change on every run (for example with `Date.now()`): On Display runs every time the widget is drawn, so the image would reload forever.

Color tile:

```js
event.color = '#ff9800';
```

Blink from On Display, instead of the blink expression:

```js
event.blink = Number(event.getLastPayload()) > 30;
```

## On Tap

Runs when the widget is tapped, before the widget's own action (toggle a switch, open the value dialog, ...).

| Name | Description |
|---|---|
| `event.preventDefault` | Assign `true` to cancel the widget's own tap action. |
| `event.data` | Your own value, shared with the other hooks of the widget. |
| `event.metric` | A copy of the widget's settings. |
| `app` | See [the `app` object](#the-app-object). |

Publish a command and skip the default action:

```js
app.publish('home/livingroom/light', 'toggle', false, 0);
event.preventDefault = true;
```

Open a link:

```js
app.openUri('https://example.com/dashboard');
```

```js
app.openUri('geo:-23.55,-46.63');
```

Count taps and publish the counter, retained:

```js
event.data = (event.data || 0) + 1;
app.publish('counters/taps', String(event.data), true, 1);
```

Do nothing until the widget has received data:

```js
if (event.metric.lastActivity === 0) event.preventDefault = true;
```

## The `app` object

| Call | Description |
|---|---|
| `app.publish(topic, payload, retained, qos)` | Publishes a message on the widget's broker. `payload` is converted to a string, `qos` is 0, 1 or 2 (anything else becomes 0). |
| `app.openUri(uri)` | Opens the address with the matching app (web page, `tel:`, `geo:`, `mailto:`...). |
| `app.openUri(action, uri)` | Same; only the second argument is used. |

## Rules and limits

- A script runs to the end before the screen updates, so keep it short. A synchronous infinite loop cannot be stopped; the obvious `while (true)` and `for (;;)` forms are refused with "Unbounded loop".
- Every run starts clean: variables you declare with `var`, `let` or by assignment do not survive to the next run. Use `event.data` to keep a value.
- `event.data` lives in memory only and is lost when the app is closed. It is shared by the On Receive, On Display and On Tap scripts of the same widget.
- Errors do not stop the app. A failing On Receive keeps the original payload; a failing On Display or Blink expression shows the error on the widget; a failing On Tap shows it and still runs the default action.
- The fields `event.tile` and `event.activity` exist for compatibility and are always `null`.
- On Receive also runs for widgets watched in the background (notification widgets), where `app.publish` publishes on that background connection. On Display and On Tap run only while the dashboard is open.
- The **Log** widget shows raw traffic and ignores On Receive rewriting: it records what the broker delivered.
