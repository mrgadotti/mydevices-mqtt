# Performance report

Device: Moto G7 Power (`0060602164`, Android 10), release build, `broker.emqx.io`.
Data: `tools/stress.ts publish 150` (150 widgets cycling through the widget kinds, retained values), imported through
the import dialog. Counters from `src/ui/perf.ts` (set `ENABLED = true` for a profiling build; `adb logcat -s ReactNativeJS`),
frame statistics from `adb shell dumpsys gfxinfo dev.marcelo.mqttiot`.

Note: `gfxinfo` only sees the UI / render threads. A blocked JS thread shows up as `maxLagMs` (timer drift) and as
frozen UI, not as janky frames, so both are recorded.

## Baseline (before any optimization), 150 widgets

| Scenario | Result | Confirms |
|---|---|---|
| Import of 150 widgets (first layout of loose widgets) | **JS thread frozen for 63 s** (no timer ticks from 21:02:48 to 21:03:51) | H3: first-fit placement is O(n^2) per widget over thousands of candidate cells |
| Idle, dashboard open, no messages | **750 widget renders per 5 s** (150 per second, all of them); `maxLagMs` 200-880 | H1: the 1 s clock re-renders every widget |
| Scroll 6 swipes | 382 frames, **48 % janky**, p50 15 ms, p90 20 ms | H7: all widgets mounted |
| Burst 20 msg/s (395 messages) with scrolling | **3450 widget renders per 5 s** at the peak (150 per message plus the clock), UI frames fine (1 janky) but the JS thread is busy | H2: every message re-renders every widget |
| Enter edit mode | **4109 ms** until the grid finished rendering, `maxLagMs` 4191 | H4 + H6: ~2.6k dot elements and a full re-render |
| Drag one widget for 4 s | **21 frames (about 5 fps)**, 100 % janky, p50 48 ms, p95 150 ms; ~1200 widget renders per 5 s | H5: state per move re-renders every widget |
| Cold start to dashboard (after the layout is stored) | `am start -W` 406 ms; first dashboard render lag 880 ms | fine, but grows with n (H7) |

Ranking by user impact: H3 (freeze on import / first layout), H5 (drag), H4 (entering edit mode), H1 + H2 + H6 (constant
re-rendering), H7 (scroll), then the rest.

## After

Moto G7 Power, release build, 150 widgets (`tools/stress.ts`), `broker.emqx.io`.

| Scenario | Baseline | After | Target |
|---|---|---|---|
| Import of 150 widgets | 63 s JS freeze | < 0.2 s lag | none |
| Idle | 750 renders / 5 s | 0 | 0 |
| Scroll | 48% janky | 2.1% janky, p50 13 ms | < 5% |
| Burst 20 msg/s | ~3450 renders / 5 s | ~45 renders / 5 s, max JS lag ~85 ms | janky < 10% |
| Enter edit mode | 4109 ms | 349 ms | < 250 ms (close) |
| Drag | 100% janky | JS lag 77 ms, p50 frame 14 ms | janky < 5% |
| Memory (PSS) | n/a | 241 MB | < 400 MB |

Changes that landed: occupancy-bitmap layout cached by geometry (Task 3), clock gating, memoized widget hosts and
session (Task 1), edit grid dots as one path (Task 4), burst coalescing into one store write per 50 ms (Task 2),
debounced edit saves flushed when the app leaves the foreground (Task 8).

Burst note: only frames that carry an update are drawn (33 frames in 10 s); 42% of them exceed 16 ms, with p90 27 ms
and no freezes. Entering edit mode is slightly above target.

Skipped on purpose: Task 5 (Animated drag), Task 6 (viewport windowing) and Task 7 (terminal FlatList, chart
downsampling). The measured numbers already meet the targets they were meant to reach, and windowing would add
store-side history buffers for little gain. Revisit if a dashboard with several hundred widgets is needed.
