# Performance Plan: many widgets, dragging and editing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax. Measure before and after every task; do not keep an optimization that does not move its number.

**Goal:** A dashboard with 150+ widgets scrolls, receives bursts of messages, and enters / drags / resizes in edit mode without visible jank (no sustained frame drops below 50 fps on the Moto G7 Power, the slowest target device).

**Architecture:** Cut the work per frame at its sources: (1) stop re-rendering every widget on every tick or message, (2) render only widgets near the viewport, (3) make drag and resize move native views instead of re-rendering React state, (4) replace the thousands of grid-dot elements with one shape.

**Tech Stack:** React Native 0.88 (Hermes), zustand, react-native-svg, `adb shell dumpsys gfxinfo`, React Profiler.

**Spec:** `docs/superpowers/specs/ui-reference.md` (the visuals must not change).

## Global Constraints

- No visual or behavioral change: same widgets, same publishing, same scripts; jest stays green.
- No new dependencies unless a task proves it is needed (candidates: `react-native-reanimated` or `react-native-gesture-handler` only if the built-in `Animated` + PanResponder cannot hold 60 fps).
- Code, comments, commits in English; commits plain (no trailers).
- Every task ends with a measured before / after row added to the table in Task 0's report file.

## Findings from reading the code (hypotheses to confirm with Task 0)

| # | Where | Problem | Expected cost |
|---|---|---|---|
| H1 | `DashboardScreen.useNowSec` | A 1 s timer re-renders the whole screen; `now` is a prop of every `WidgetHost`, so every widget runs `buildDisplay` and the `On Display` script (`runOnDisplay`, Hermes `eval`) each second. | O(n) work per second, constant, even when idle. |
| H2 | `useBrokerSession` -> `applyRuntime` | Every message creates a new `metrics` array (`map` over all metrics). All subscribers re-render and `WidgetGrid` recomputes `layoutWidgets`. | O(n) renders per message; bursts of 20 msg/s stall the UI. |
| H3 | `layoutWidgets` / `canPlace` | Each placement scans all rects: O(n^2) per call, called on every metrics change and on every drag frame (`preview`). | 150 widgets: ~22k overlap tests per call. |
| H4 | `WidgetGrid` edit dots | One `<Circle>` React element per grid point: 25 columns x (rows + 6) points, rebuilt when rows change. 100 rows = 2.6k elements. | Slow entering edit mode; memory. |
| H5 | `WidgetGrid` drag | `setG` on every move re-renders the grid and calls `renderWidget` for every widget (no memo). | Drag drops to a few fps with many widgets. |
| H6 | `WidgetHost` / `WidgetView` | Not memoized; props are fresh objects (`inner`, closures) each render. | Re-renders cannot be skipped. |
| H7 | `ScrollView` | All widgets are mounted, including those far off screen (gauges are SVG, charts, terminal with up to 200 `Text` rows, images). | Startup time and memory grow linearly. |
| H8 | `useTileRuntime` per widget | Selector returns a new object on `set`; every `runtimeStore.set` replaces `tiles`, notifying all widgets' selectors (cheap equality, but O(n) selector runs per update). | Minor; check with the profiler. |
| H9 | Persistence | `edit()` serializes and writes the full metrics list on every edit (`setWidgetRect`, `updateMetric`); `applyRuntime` is already lazy (10 s). | One write per gesture end: fine unless the list is large; measure. |
| H10 | Image widgets | Each reloads on its interval with a token key that remounts the view. | Network + decode jank with many images. |

## Review Focus

- Virtualized (unmounted) widgets must keep receiving data: the store keeps updating even when no view is mounted, and a widget scrolled back in shows the latest value, history (chart series, terminal log) included.
- Dragging a widget must still refuse overlaps and keep the snap-to-cell result identical.
- Throttling messages must never drop the last value of a topic (coalesce, do not discard) and must keep the order of messages of the same topic.
- Scripts (`On Receive`, `On Display`, blink) must still run for off-screen widgets where they affect published state; `On Display` only needs to run for mounted widgets.
- Rotating the device and the keyboard opening (text inputs) must not remount the whole grid.

---

### Task 0: Baseline harness and measurements

**Files:** Create `tools/stress-demo.ts` (generates N widgets of mixed kinds, topics `mqttiot/stress/<i>`, publishes them as the import payload, plus `burst` mode that publishes M msgs/s to random topics), `docs/superpowers/perf-report.md` (the before / after table). Create `src/ui/perf.ts`: dev-only `markRender(name)` counters behind `__DEV__`-independent flag stored in the metric `opts`-free `globalThis.__PERF__` so release builds can be profiled with logcat.

- [ ] Generate 40, 150 and 400 widgets; import into a broker on the phone (release build).
- [ ] For each, record with `adb shell dumpsys gfxinfo dev.marcelo.mqttiot reset` then `... framestats` after: (a) idle 30 s, (b) scroll top to bottom, (c) message burst 20 msg/s for 20 s, (d) enter edit mode, (e) drag one widget for 5 s, (f) resize for 5 s. Report janky frames %, 50/90/99th percentile frame time.
- [ ] Record cold start to first dashboard paint (`am start -W` TotalTime plus a logcat timestamp when the grid mounts) and `dumpsys meminfo` after each scenario.
- [ ] Count renders per widget per second with the counter (confirms H1, H2, H5, H6).
- [ ] Write the baseline table and rank H1..H10 by measured impact; adjust the order of Tasks 1-6 if the data disagrees.
- [ ] Commit the tools and the report.

### Task 1: Stop idle and per-message re-renders (H1, H2, H6, H8)

**Files:** `src/ui/DashboardScreen.tsx`, `src/ui/widgets/WidgetViews.tsx`, `src/store/appStore.ts`, `src/ui/runtime.ts`, tests in `src/store/appStore.test.ts`.

**Interfaces (produces):** `useMetric(brokerId, id): Metric | undefined` (zustand selector with identity equality per metric); `useMetricIds(brokerId): string[]` (shallow-equal, changes only on add/remove/reorder/rect change); `WidgetHost` takes `id` and subscribes to its own metric.

- [ ] Test: updating metric A through `applyRuntime` does not change the object identity of metric B; the id list identity is stable across `applyRuntime`.
- [ ] Make `applyRuntime` replace only the touched element and keep the other references (already true for `map`, but keep the array stable by index replace); add a per-metric subscription so widgets re-render only when their own metric changes.
- [ ] Move the 1 s clock out of the screen: a `useNowSec` hook used only by widgets that show relative time or have `On Display` / blink scripts (`needsClock(metric)`), others render without `now`.
- [ ] Wrap `WidgetView` and the bodies in `React.memo` with stable props (memoized `inner`, `useCallback` handlers keyed by id).
- [ ] Measure; commit.

### Task 2: Coalesce message bursts (H2)

**Files:** `src/ui/useBrokerSession.ts`, `src/store/appStore.ts`, tests.

**Interfaces (produces):** `applyRuntimeBatch(brokerId, list: Metric[])` applying many updates with one `set`; a receive queue flushed on `requestAnimationFrame` (or 50 ms) keeping only the newest payload per metric, preserving `lastActivity` order.

- [ ] Test: 100 messages to the same topic in one tick produce one store update with the last payload; messages to different topics are all applied; order of two messages to the same topic is respected when both are needed by `On Receive` scripts (scripts still run per message, only the store write is coalesced).
- [ ] Implement; keep `recordPublished` using the batch call.
- [ ] Measure the burst scenario; commit.

### Task 3: Faster layout (H3)

**Files:** `src/domain/widgets.ts`, `src/domain/widgets.test.ts`.

**Interfaces (produces):** `layoutWidgets` unchanged signature; `canPlace` backed by a row-bucket index (`Map<number, Rect[]>` by occupied rows) built once per call.

- [ ] Test: results identical to the current implementation on randomized inputs (property test with a fixed seed, 200 widgets), and `firstFree` for 400 widgets completes under 50 ms in jest.
- [ ] Cache `layoutWidgets` by the identity of the geometry-only projection of the list (`id, gx, gy, gw, gh, widget`) so message updates never recompute it.
- [ ] Measure; commit.

### Task 4: Grid dots as one shape (H4)

**Files:** `src/ui/WidgetGrid.tsx`.

- [ ] Replace the `Circle` array with a single `Path` made of tiny `h0` segments with round caps, or an SVG `<Pattern>` fill (one rect), restricted to the visible rows; build the path string once per (cell, offset, rows).
- [ ] Verify the same look on the phone (same spacing, radius 1 dp, `text5` color); measure time to enter edit mode; commit.

### Task 5: Cheap drag and resize (H5)

**Files:** `src/ui/WidgetGrid.tsx`, `src/ui/widgets/*` (memoization already from Task 1).

- [ ] Keep the gesture in an `Animated.ValueXY` (native driver): the dragged widget follows with `transform` and no React state per frame; the preview rectangle (snap target and refused state) updates only when the snapped cell changes (`setState` on change, not per move).
- [ ] Resize: render a lightweight outline (border-only `View`) sized by an `Animated.Value` during the gesture and apply the new size to the widget once on release; the widget content re-renders only then.
- [ ] Evaluate `react-native-gesture-handler` + `reanimated` only if the above still drops frames in the Task 0 harness; record the decision in the report.
- [ ] Test: snapped result equals the old `preview` for a table of (dx, dy) cases (extract `snapRect` as a pure function in `widgetLogic.ts` with unit tests); measure; commit.

### Task 6: Viewport windowing (H7, H10)

**Files:** `src/ui/WidgetGrid.tsx`, `src/ui/DashboardScreen.tsx`, `src/ui/widgets/useHistory.ts`.

**Interfaces (produces):** `visibleRange(scrollY, viewportH, cell, rects, buffer): string[]` (pure, tested).

- [ ] Track `scrollY` with `onScroll` (throttled 16 ms, stored in a ref plus a state updated only when the visible id set changes).
- [ ] Mount only widgets intersecting the viewport +/- 1 screen; others render nothing but keep their absolute slot so scroll height is unchanged.
- [ ] Move chart series and terminal log collection from component effects into the store-side receive path (bounded buffers per metric id) so unmounted widgets keep their history.
- [ ] Image widgets reload only while mounted; pause timers off screen.
- [ ] Test `visibleRange`; verify on the phone that a chart scrolled out and back shows continuous data; measure startup and memory; commit.

### Task 7: Terminal and chart internals (H7)

**Files:** `src/ui/widgets/DisplayViews.tsx`.

- [ ] Terminal: render the log with `FlatList` (inverted, `getItemLayout`, `windowSize` 5) instead of 200 `Text` children; cap line length.
- [ ] Chart: downsample to the pixel width (`min/max` per bucket) before building the path; memoize the path by the series identity.
- [ ] Measure with a 400 msg/s terminal burst; commit.

### Task 8: Persistence (H9)

**Files:** `src/store/appStore.ts`, `src/store/repo.ts`.

- [ ] Debounce `edit()` writes (300 ms, flush on background and on `flush()`), so rapid edits (nudging a step, duplicating) write once.
- [ ] Test: ten edits within the debounce window cause one `saveMetrics` call, and a forced `flush()` writes immediately; app-state change to background flushes.
- [ ] Measure the size of the serialized list for 400 widgets and the write time; commit.

### Task 9: Final verification

- [ ] Re-run the Task 0 matrix on release builds for 40, 150, 400 widgets; fill the "after" column; compare with the targets below.
- [ ] `npx tsc --noEmit`, `npx jest`, manual pass over every widget kind (scroll, tap, drag, resize, duplicate, delete, import) on the phone to confirm no visual or behavior change.
- [ ] Update `docs/superpowers/verification.md` with a performance section; commit.

## Targets (Moto G7 Power, release build)

| Scenario | 150 widgets target |
|---|---|
| Idle (no messages) | 0 renders / s on widgets without scripts or relative time |
| Scroll top to bottom | janky frames < 5 %, p90 frame < 16 ms |
| Burst 20 msg/s on random topics | janky frames < 10 %, no ANR, UI thread idle > 50 % |
| Enter edit mode | < 250 ms to the first painted frame |
| Drag / resize one widget | janky frames < 5 %, p90 frame < 16 ms |
| Cold start to dashboard | < 1.5 s |
| Resident memory after 400 widgets | < 400 MB |
